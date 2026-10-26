<?php
declare(strict_types=1);

/**
 * flow-engine.php — motor Google Flow dentro del estudio.
 *
 * El navegador nunca habla con el PC: encola trabajos en este servidor
 * (SQLite) y el agente instalado en el PC los reclama con su propia credencial.
 * Así la app funciona desde móvil y desde cualquier ordenador, siempre que el
 * PC con Flow esté encendido.
 *
 * Reglas:
 *  - El token del agente NUNCA procede de una constante versionada: solo del
 *    entorno del servidor (UIS_FLOW_AGENT_TOKEN) o de storage/flow-agent.json,
 *    que no está en git.
 *  - Claim, complete y fail exigen la credencial del agente: conocer la URL de
 *    la cola no permite usar la cuenta de Flow de nadie.
 *  - La autenticación de la persona (sesión del estudio) es independiente de
 *    la del agente.
 */

require_once __DIR__ . '/bootstrap.php';

// Fichero interno: si se pide por HTTP directamente, no se sirve.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath((string)$_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    http_response_code(404);
    exit;
}

const UIS_FLOW_MAX_PROMPT = 1500;
const UIS_FLOW_QUEUE_MAX = 12;
const UIS_FLOW_VIDEO_QUEUE_MAX = 2;
const UIS_FLOW_REFS_MAX = 2;
const UIS_FLOW_REF_BYTES = 6 * 1024 * 1024;
const UIS_FLOW_IMAGE_BYTES = 8 * 1024 * 1024;
const UIS_FLOW_VIDEO_BYTES = 32 * 1024 * 1024;
const UIS_FLOW_AGENT_FRESH = 900;      // 15 min sin señales = PC desconectado
const UIS_FLOW_AGENT_LEASE = 3 * 3600; // un trabajo 'running' sin señales caduca
const UIS_FLOW_RETENTION = 7 * 86400;

/** Modelos de imagen de Flow: etiqueta pública => nombre exacto del menú de Flow. */
function uis_flow_image_models(): array
{
    return [
        'flow-nano-banana-2'      => ['label' => 'NANO BANANA 2', 'flow' => 'Nano Banana 2'],
        'flow-nano-banana-pro'    => ['label' => 'NANO BANANA PRO', 'flow' => 'Nano Banana Pro'],
        'flow-nano-banana-2-lite' => ['label' => 'NANO BANANA 2 LITE', 'flow' => 'Nano Banana 2 Lite'],
    ];
}

function uis_flow_video_models(): array
{
    return [
        'veo-3.1-lite'    => 'Veo 3.1 - Lite',
        'veo-3.1-fast'    => 'Veo 3.1 - Fast',
        'veo-3.1-quality' => 'Veo 3.1 - Quality',
        'omni-flash'      => 'Omni Flash',
    ];
}

/** Modelo inicial al empezar un trabajo nuevo: Nano Banana 2. */
const UIS_FLOW_DEFAULT_IMAGE_MODEL = 'flow-nano-banana-2';
const UIS_FLOW_DEFAULT_VIDEO_MODEL = 'veo-3.1-lite';

function uis_flow_image_ratios(): array
{
    return ['1:1', '16:9', '4:3', '3:4', '9:16'];
}

function uis_flow_video_ratios(): array
{
    return ['16:9', '9:16'];
}

/**
 * Credencial del agente del PC. Fuente única: entorno del servidor o el
 * fichero privado storage/flow-agent.json (nunca versionado).
 * El fichero puede guardar el valor en claro (`token`) o su sha256; el
 * sha256 es lo recomendado porque el valor no se puede leer del disco.
 */
function uis_flow_agent_file(): array
{
    $file = uis_storage() . '/flow-agent.json';
    if (!is_file($file)) {
        return [];
    }
    $raw = (string)file_get_contents($file);
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** ¿Hay credencial de agente configurada, en cualquiera de sus dos formatos? */
function uis_flow_agent_configured(): bool
{
    if (uis_env('UIS_FLOW_AGENT_TOKEN') !== '') {
        return true;
    }
    $data = uis_flow_agent_file();
    $plain = isset($data['token']) && is_string($data['token']) ? trim($data['token']) : '';
    $hash = isset($data['sha256']) && is_string($data['sha256']) ? strtolower(trim($data['sha256'])) : '';
    return $plain !== '' || preg_match('/^[0-9a-f]{64}$/', $hash) === 1;
}

/** Token en claro, solo si está configurado así (para comparar con `hash_equals`). */
function uis_flow_agent_token(): string
{
    $env = uis_env('UIS_FLOW_AGENT_TOKEN');
    if ($env !== '') {
        return $env;
    }
    $plain = uis_flow_agent_file()['token'] ?? '';
    return is_string($plain) ? trim($plain) : '';
}

function uis_flow_agent_token_matches(string $candidate): bool
{
    if ($candidate === '') {
        return false;
    }
    $env = uis_env('UIS_FLOW_AGENT_TOKEN');
    if ($env !== '') {
        return hash_equals($env, $candidate);
    }
    $data = uis_flow_agent_file();
    $plain = isset($data['token']) && is_string($data['token']) ? trim($data['token']) : '';
    if ($plain !== '') {
        return hash_equals($plain, $candidate);
    }
    $hash = isset($data['sha256']) && is_string($data['sha256']) ? strtolower(trim($data['sha256'])) : '';
    return preg_match('/^[0-9a-f]{64}$/', $hash) === 1 && hash_equals($hash, hash('sha256', $candidate));
}

/**
 * Autentica al agente por cabecera. Devuelve true si es válido; si no,
 * responde 401 y termina.
 */
function uis_flow_require_agent(): void
{
    $candidate = (string)($_SERVER['HTTP_X_UIS_AGENT'] ?? '');
    if (!uis_flow_agent_token_matches($candidate)) {
        uis_fail(401, 'Credencial del agente no válida.');
    }
}

/* ── Cola en SQLite ── */

function uis_flow_public_row(array $row): array
{
    $job = [
        'id'            => (string)$row['id'],
        'type'          => (string)$row['type'],
        'status'        => (string)$row['status'],
        'model'         => (string)$row['model'],
        'ratio'         => (string)$row['ratio'],
        'prompt'        => (string)$row['prompt'],
        'mode'          => (string)($row['mode'] ?? 'generate'),
        'attempts'      => (int)($row['attempts'] ?? 0),
        'createdAt'     => (int)$row['created_at'],
        'startedAt'     => (int)($row['started_at'] ?? 0),
        'finishedAt'    => (int)($row['finished_at'] ?? 0),
        'workerSeen'    => (int)($row['worker_seen'] ?? 0),
        'error'         => (string)($row['error'] ?? ''),
    ];
    if (($row['status'] ?? '') === 'done' && !empty($row['file'])) {
        $job['url'] = 'api.php?action=flow.file&id=' . rawurlencode((string)$row['id']);
        $job['mime'] = (string)($row['mime'] ?? '');
        $job['bytes'] = (int)($row['bytes'] ?? 0);
        $job['width'] = (int)($row['width'] ?? 0);
        $job['height'] = (int)($row['height'] ?? 0);
    }
    return $job;
}

/**
 * Campos que dependen del tiempo (no se guardan): `planned` = el trabajo
 * llegó a salir hacia el PC, `leaseExpired` = el agente dejó de dar señales
 * a mitad. El prompt se conserva para no perder ningún encargo.
 */
function uis_flow_decorate_timing(array $job, int $workerSeen): array
{
    $now = time();
    $lease = $job['startedAt'] > 0 && $now - $job['startedAt'] > UIS_FLOW_AGENT_LEASE;
    $stale = $job['workerSeen'] > 0 && $now - $job['workerSeen'] > UIS_FLOW_AGENT_FRESH;
    $job['workerOnline'] = !$stale && $workerSeen > 0;
    $job['planned'] = in_array($job['status'], ['running', 'succeeded', 'failed'], true);
    $job['leaseExpired'] = $job['status'] === 'running' && $lease;
    return $job;
}

/** Rutas privadas de la cola de Flow (storage/ está fuera de git y sin servicio directo). */
function uis_flow_dir(string $sub): string
{
    $path = uis_storage() . '/flow/' . $sub;
    if (!is_dir($path)) @mkdir($path, 0770, true);
    return $path;
}

function uis_flow_ref_dir(): string { return uis_flow_dir('refs'); }
function uis_flow_result_dir(): string { return uis_flow_dir('results'); }

/**
 * Encola un trabajo de imagen o vídeo con Flow. Devuelve la fila pública.
 */
function uis_flow_create(PDO $db, array $body): array
{
    $type = ((string)($body['type'] ?? 'image')) === 'video' ? 'video' : 'image';
    $prompt = trim((string)($body['prompt'] ?? ''));
    if ($prompt === '') throw new InvalidArgumentException('El prompt está vacío.', 400);
    if (mb_strlen($prompt) > UIS_FLOW_MAX_PROMPT) {
        $prompt = mb_substr($prompt, 0, UIS_FLOW_MAX_PROMPT);
    }

    $refs = [];
    if (isset($body['images']) && is_array($body['images'])) {
        $refs = array_slice(array_values(array_filter($body['images'], 'is_string')), 0, UIS_FLOW_REFS_MAX);
    }
    foreach ($refs as $position => $value) {
        $probe = uis_decode_image($value);
        if (strlen($probe['binary']) > UIS_FLOW_REF_BYTES) {
            throw new LengthException('Cada referencia debe pesar menos de 6 MB.', 413);
        }
        unset($refs[$position]);
        $refs[$position] = $value;
    }

    if ($type === 'video') {
        $models = uis_flow_video_models();
        $modelKey = (string)($body['model'] ?? UIS_FLOW_DEFAULT_VIDEO_MODEL);
        if (!isset($models[$modelKey])) $modelKey = UIS_FLOW_DEFAULT_VIDEO_MODEL;
        // Se guarda el nombre EXACTO del menú de Flow: el agente lo pasa tal cual
        // a `flow.py --model`, que rechaza los identificadores internos.
        $model = $models[$modelKey];
        $ratio = (string)($body['ratio'] ?? '16:9');
        if (!in_array($ratio, uis_flow_video_ratios(), true)) $ratio = '16:9';
        $mode = $refs !== [] ? 'frames' : 'text';
        $count = 1;
    } else {
        $models = uis_flow_image_models();
        $modelKey = (string)($body['model'] ?? UIS_FLOW_DEFAULT_IMAGE_MODEL);
        if (!isset($models[$modelKey])) $modelKey = UIS_FLOW_DEFAULT_IMAGE_MODEL;
        // Igual que en vídeo: se guarda «Nano Banana 2», no «flow-nano-banana-2».
        $model = $models[$modelKey]['flow'];
        $ratio = (string)($body['ratio'] ?? '1:1');
        if (!in_array($ratio, uis_flow_image_ratios(), true)) $ratio = '1:1';
        $mode = ((string)($body['mode'] ?? 'generate')) === 'edit' ? 'edit' : 'generate';
        $count = (int)($body['count'] ?? 1);
        $count = max(1, min(4, $count));
        if ($mode === 'edit') {
            if ($refs === []) throw new InvalidArgumentException('Necesito la imagen que quieres editar.', 400);
            $count = 1;
        }
        if ($mode === 'generate' && count($refs) > UIS_FLOW_REFS_MAX) {
            $refs = array_slice($refs, 0, UIS_FLOW_REFS_MAX);
        }
    }

    // Capacidad: la cola es finita y un encolado puede pedir hasta 4 imágenes.
    // La comprobación vive aquí para que ningún camino pueda saltársela.
    $pending = (int)$db->query("SELECT COUNT(*) FROM flow_jobs WHERE status IN ('queued','running')")->fetchColumn();
    if ($pending + $count > UIS_FLOW_QUEUE_MAX) {
        throw new InvalidArgumentException(sprintf(
            'No caben %d imágenes: hay %d trabajos pendientes y el máximo de la cola es %d. Espera a que termine alguno.',
            $count,
            $pending,
            UIS_FLOW_QUEUE_MAX
        ), 429);
    }

    $jobIds = [];
    foreach (range(1, $count) as $_) {
        $id = bin2hex(random_bytes(8));
        $stored = [];
        foreach ($refs as $position => $value) {
            $image = uis_decode_image($value);
            $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$image['mime']] ?? 'bin';
            $name = $id . '_' . ($position + 1) . '.' . $ext;
            uis_write_file(uis_flow_ref_dir() . '/' . $name, $image['binary']);
            $stored[] = ['file' => $name, 'mime' => $image['mime']];
        }
        $db->beginTransaction();
        try {
            $stmt = $db->prepare(
                'INSERT INTO flow_jobs (id, type, status, model, ratio, prompt, mode, refs, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$id, $type, 'queued', $model, $ratio, $prompt, $mode, json_encode($stored), time()]);
            $db->commit();
        } catch (Throwable $error) {
            $db->rollBack();
            foreach ($stored as $item) @unlink(uis_flow_ref_dir() . '/' . $item['file']);
            throw $error;
        }
        $jobIds[] = $id;
    }

    $jobs = [];
    foreach ($jobIds as $id) {
        $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
        $stmt->execute([$id]);
        $jobs[] = uis_flow_public_row($stmt->fetch());
    }
    return ['jobs' => $jobs, 'ids' => $jobIds, 'count' => count($jobs)];
}

function uis_flow_state(PDO $db): array
{
    $stmt = $db->query('SELECT COUNT(*) FROM flow_jobs WHERE status IN (\'queued\',\'running\')');
    $pending = (int)$stmt->fetchColumn();
    $seen = uis_flow_worker_seen($db);
    $online = $seen > 0 && (time() - $seen) < UIS_FLOW_AGENT_FRESH;
    $imageModels = [];
    foreach (uis_flow_image_models() as $id => $model) {
        $imageModels[] = ['id' => $id, 'label' => $model['label'], 'flow' => $model['flow']];
    }
    return [
        'ok' => true,
        'workerOnline' => $online,
        'workerSeen' => $seen,
        'pending' => $pending,
        'queueMax' => UIS_FLOW_QUEUE_MAX,
        'videoQueueMax' => UIS_FLOW_VIDEO_QUEUE_MAX,
        'agentConfigured' => uis_flow_agent_configured(),
        'imageModels' => $imageModels,
        'videoModels' => uis_flow_video_models(),
        'imageRatios' => uis_flow_image_ratios(),
        'videoRatios' => uis_flow_video_ratios(),
        'defaultImageModel' => UIS_FLOW_DEFAULT_IMAGE_MODEL,
        'defaultVideoModel' => UIS_FLOW_DEFAULT_VIDEO_MODEL,
    ];
}

/** Última señal de vida del agente, aunque la cola esté vacía. */
function uis_flow_worker_seen(PDO $db): int
{
    $row = $db->query("SELECT value FROM flow_meta WHERE key = 'worker_seen'")->fetch();
    return $row ? (int)$row['value'] : 0;
}

function uis_flow_touch(PDO $db): void
{
    $now = time();
    $db->prepare(
        "INSERT INTO flow_meta (key, value) VALUES ('worker_seen', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )->execute([(string)$now]);
    // El trabajo en curso también guarda la señal: permite saber cuándo se
    // quedó mudo sin inventar si la generación llegó a terminar.
    $db->prepare("UPDATE flow_jobs SET worker_seen = ? WHERE status = 'running'")->execute([$now]);
}

/**
 * Repara los trabajos 'running' cuyo agente dejó de dar señales. No borra
 * nada: se marcan como pendientes de comprobación para no reenviar a ciegas.
 * Devuelve cuántos tocó.
 */
function uis_flow_expire(PDO $db): int
{
    $limit = time() - UIS_FLOW_AGENT_LEASE;
    $stmt = $db->prepare(
        "UPDATE flow_jobs SET status = 'unknown',
            error = 'El PC dejó de responder mientras generaba. Comprueba en Flow si la generación terminó antes de reenviarla.',
            updated_at = ?
         WHERE status = 'running' AND started_at > 0 AND started_at < ?"
    );
    $stmt->execute([time(), $limit]);
    return $stmt->rowCount();
}

function uis_flow_sweep(PDO $db): void
{
    $cut = time() - UIS_FLOW_RETENTION;
    $stmt = $db->prepare("SELECT * FROM flow_jobs WHERE status IN ('done','failed','unknown') AND updated_at < ?");
    $stmt->execute([$cut]);
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['file'])) {
            @unlink(uis_flow_result_dir() . '/' . basename((string)$row['file']));
        }
        foreach ((array)json_decode((string)($row['refs'] ?: '[]'), true) as $ref) {
            $name = basename((string)($ref['file'] ?? ''));
            if ($name !== '') @unlink(uis_flow_ref_dir() . '/' . $name);
        }
        $db->prepare('DELETE FROM flow_jobs WHERE id = ?')->execute([(string)$row['id']]);
    }
}

/* ── Endpoints del agente (credencial propia) ── */

function uis_flow_claim(PDO $db): ?array
{
    uis_flow_expire($db);
    uis_flow_touch($db);
    $db->beginTransaction();
    try {
        $row = null;
        // Prioridad: primero lo que ya está en curso o esperando turno, y los
        // vídeos ya EN EJECUCIÓN no bloquean a los que están en cola (si no, la
        // cola se atasca: nunca se llega a bajar del límite).
        $runningVideos = (int)$db->query("SELECT COUNT(*) FROM flow_jobs WHERE type = 'video' AND status = 'running'")->fetchColumn();
        if ($runningVideos < UIS_FLOW_VIDEO_QUEUE_MAX) {
            $stmt = $db->prepare("SELECT * FROM flow_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1");
        } else {
            $stmt = $db->prepare("SELECT * FROM flow_jobs WHERE status = 'queued' AND type = 'image' ORDER BY created_at ASC LIMIT 1");
        }
        $stmt->execute();
        $row = $stmt->fetch();
        if (!$row) {
            $db->commit();
            return null;
        }
        $now = time();
        $update = $db->prepare('UPDATE flow_jobs SET status = ?, started_at = ?, worker_seen = ?, attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = ?');
        $update->execute(['running', $now, $now, $now, (string)$row['id'], 'queued']);
        if ($update->rowCount() !== 1) {
            // Otro agente reclamó el mismo trabajo entre el SELECT y el UPDATE:
            // no se devuelve nada para que no lo generen dos veces.
            $db->rollBack();
            return null;
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }

    $refs = [];
    foreach ((array)json_decode((string)($row['refs'] ?: '[]'), true) as $ref) {
        $name = basename((string)($ref['file'] ?? ''));
        $path = uis_flow_ref_dir() . '/' . $name;
        if ($name === '' || !is_file($path)) continue;
        $bytes = (string)file_get_contents($path);
        if ($bytes === '') continue;
        $refs[] = ['mime' => (string)($ref['mime'] ?? 'image/jpeg'), 'data' => base64_encode($bytes)];
    }

    $job = uis_flow_public_row($row);
    $job['status'] = 'running';
    $job['refs'] = $refs;
    return $job;
}

function uis_flow_finish(PDO $db, string $id, array $body): array
{
    $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw new InvalidArgumentException('El trabajo no existe.', 404);
    if ((string)$row['status'] === 'done') {
        // Repetición del mismo complete (red inestable): no duplicar el archivo.
        return uis_flow_public_row($row);
    }

    $payload = (string)($body['video'] ?? '');
    $isVideo = $payload !== '';
    if (!$isVideo) $payload = (string)($body['image'] ?? '');
    if ($payload === '') throw new InvalidArgumentException('Falta el archivo generado.', 400);
    if (str_starts_with($payload, 'data:')) {
        $comma = strpos($payload, ',');
        if ($comma === false) throw new InvalidArgumentException('Archivo dañado.', 400);
        $payload = substr($payload, $comma + 1);
    }
    // Multipart: el agente puede enviar los bytes crudos (vídeo grande).
    $isRaw = (bool)($body['raw'] ?? false);
    $bytes = $isRaw ? $payload : base64_decode($payload, true);
    if ($bytes === false || $bytes === '') throw new InvalidArgumentException('Archivo no válido.', 400);

    $limit = $isVideo ? UIS_FLOW_VIDEO_BYTES : UIS_FLOW_IMAGE_BYTES;
    if (strlen($bytes) > $limit) {
        throw new LengthException($isVideo ? 'El vídeo supera 32 MB.' : 'La imagen supera 8 MB.', 413);
    }
    if (($row['type'] === 'video') !== $isVideo) {
        throw new InvalidArgumentException('El archivo no corresponde al tipo del trabajo.', 400);
    }

    $info = @getimagesizefromstring($bytes);
    $width = is_array($info) ? (int)$info[0] : 0;
    $height = is_array($info) ? (int)$info[1] : 0;
    if ($isVideo) {
        if (strlen($bytes) < 16 || substr($bytes, 4, 4) !== 'ftyp') {
            throw new InvalidArgumentException('El archivo no es un vídeo MP4.', 400);
        }
        $mime = 'video/mp4';
        $ext = 'mp4';
    } else {
        $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
        $ext = match (true) {
            $mime === 'image/png' => 'png',
            $mime === 'image/jpeg' => 'jpg',
            $mime === 'image/webp' => 'webp',
            default => '',
        };
        if ($ext === '' || $width < 1) throw new InvalidArgumentException('El archivo no es una imagen válida.', 400);
    }

    $filename = $id . '.' . $ext;
    uis_write_file(uis_flow_result_dir() . '/' . $filename, $bytes);

    $db->prepare(
        "UPDATE flow_jobs SET status = 'done', file = ?, mime = ?, bytes = ?, width = ?, height = ?,
            error = '', finished_at = ?, updated_at = ?, worker_seen = ? WHERE id = ?"
    )->execute([$filename, $mime, strlen($bytes), $width, $height, time(), time(), time(), $id]);
    uis_flow_touch($db);

    foreach ((array)json_decode((string)($row['refs'] ?: '[]'), true) as $ref) {
        $name = basename((string)($ref['file'] ?? ''));
        if ($name !== '') @unlink(uis_flow_ref_dir() . '/' . $name);
    }
    $db->prepare('UPDATE flow_jobs SET refs = ? WHERE id = ?')->execute(['[]', $id]);

    $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
    $stmt->execute([$id]);
    return uis_flow_public_row($stmt->fetch());
}

function uis_flow_fail(PDO $db, string $id, string $message): array
{
    if (!uis_safe_id($id)) throw new InvalidArgumentException('Identificador no válido.', 400);
    $message = mb_substr(trim($message) !== '' ? trim($message) : 'Error desconocido', 0, 400);
    $stmt = $db->prepare("UPDATE flow_jobs SET status = 'failed', error = ?, finished_at = ?, updated_at = ?, worker_seen = ? WHERE id = ? AND status IN ('queued','running')");
    $stmt->execute([$message, time(), time(), time(), $id]);
    uis_flow_touch($db);
    return ['ok' => true, 'id' => $id];
}

function uis_flow_heartbeat(PDO $db, string $note = ''): array
{
    uis_flow_touch($db);
    $pending = (int)$db->query("SELECT COUNT(*) FROM flow_jobs WHERE status IN ('queued','running')")->fetchColumn();
    return [
        'ok' => true,
        'seen' => time(),
        'note' => mb_substr($note, 0, 120),
        'pending' => $pending,
    ];
}

function uis_flow_schedule(PDO $db, string $id): array{
    if (!uis_safe_id($id)) throw new InvalidArgumentException('Identificador no válido.', 400);
    $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw new InvalidArgumentException('El trabajo no existe.', 404);
    if ((string)$row['status'] !== 'unknown') {
        throw new InvalidArgumentException('Solo se puede reprogramar un trabajo pendiente de comprobación.', 409);
    }
    $db->prepare("UPDATE flow_jobs SET status = 'queued', started_at = 0, error = '', updated_at = ? WHERE id = ?")
        ->execute([time(), $id]);
    $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
    $stmt->execute([$id]);
    return uis_flow_public_row($stmt->fetch());
}

function uis_flow_delete(PDO $db, string $id): array
{
    if (!uis_safe_id($id)) throw new InvalidArgumentException('Identificador no válido.', 400);
    $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) throw new InvalidArgumentException('El trabajo no existe.', 404);
    if (in_array((string)$row['status'], ['queued', 'running'], true)) {
        throw new InvalidArgumentException('No se puede borrar un trabajo en curso.', 409);
    }
    if (!empty($row['file'])) @unlink(uis_flow_result_dir() . '/' . basename((string)$row['file']));
    $db->prepare('DELETE FROM flow_jobs WHERE id = ?')->execute([$id]);
    return ['ok' => true];
}
