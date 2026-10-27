<?php
declare(strict_types=1);
/**
 * flow_queue.php — cola de generación para Flow Studio.
 *
 * El frontend pide imágenes (action=request) y consulta el estado (action=status).
 * El worker del PC (E:\herramientas\google-flow\flow_studio_worker.py) reclama
 * trabajos con action=claim, ejecuta Google Flow y devuelve el JPEG con
 * action=complete (o action=fail).
 *
 * Las imágenes quedan en flow_store/ (protegido por .htaccess) y se sirven
 * solo a través de ?action=img&id=... para no exponer el directorio.
 */

const QUEUE_TOKEN = 'fs7-Qm4xV2tP9kR6wL1z';
// 1500: el modo edición añade una instrucción delante del texto del usuario
// (máx. 1200 en el editor) sin que la cola recorte el final de su petición.
const MAX_PROMPT = 1500;
const MAX_QUEUE = 12;
const MAX_REFS = 2;                 // imágenes de referencia por trabajo
const MAX_REF_BYTES = 6 * 1024 * 1024;  // 6 MB por referencia ya decodificada
const MAX_VIDEO_BYTES = 32 * 1024 * 1024;  // 32 MB por vídeo ya decodificado
const MAX_VIDEO_QUEUE = 2;          // vídeos pendientes a la vez (cada uno gasta puntos)
const VIDEO_MODELS = ['Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality', 'Omni Flash'];
const VIDEO_RATIOS = ['16:9', '9:16'];  // la UI de Flow solo ofrece estos dos en vídeo
// Identificadores canónicos del proyecto (los mismos que usa la compuerta de
// modelos) → nombre literal que espera el menú de Google Flow. La interfaz
// manda el id; el worker del PC sigue recibiendo el nombre de siempre.
const IMAGE_MODEL_ALIASES = [
    'flow-nano-banana-2' => 'Nano Banana 2',
    'flow-nano-banana-pro' => 'Nano Banana Pro',
    'flow-nano-banana-2-lite' => 'Nano Banana 2 Lite',
];
const VIDEO_MODEL_ALIASES = [
    'veo-3.1-lite' => 'Veo 3.1 - Lite',
    'veo-3.1-fast' => 'Veo 3.1 - Fast',
    'veo-3.1-quality' => 'Veo 3.1 - Quality',
    'omni-flash' => 'Omni Flash',
];
const STALE_RUNNING = 0;        // 0 = nunca reencolar: sin límite de tiempo (2026-10-22)
const WORKER_FRESH = 600;       // 10 min sin señales = worker desconectado

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Cola compartida con la app original: el worker que ya corre en el PC sondea
// siempre /apps/flow_studio/flow_queue.php, así que esta copia escribe y lee en
// el mismo flow_store. Sin esto, los trabajos enviados desde la copia quedarían
// en su propia cola sin ningún worker que los recoja.
$store = __DIR__ . '/../flow_studio/flow_store';
if (!is_dir($store) && !@mkdir($store, 0775, true) && !is_dir($store)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo crear flow_store']);
    exit;
}
$queueFile = $store . '/queue.json';
$imgDir = $store . '/img';
if (!is_dir($imgDir)) {
    @mkdir($imgDir, 0775, true);
}
$refsDir = $store . '/ref';
if (!is_dir($refsDir)) {
    @mkdir($refsDir, 0775, true);
}

// Migración única: los trabajos que quedaron en la cola propia de esta copia
// antes de compartirla se pasan a la cola compartida, con sus referencias. Así
// las tarjetas que ya estaban «En cola…» no se pierden al cambiar la ruta.
$legacyQueue = __DIR__ . '/flow_store/queue.json';
if (is_file($legacyQueue)) {
    with_lock(function () use ($legacyQueue, $queueFile, $refsDir) {
        if (!is_file($legacyQueue)) {
            return;
        }
        $legacy = read_queue($legacyQueue);
        $shared = read_queue($queueFile);
        $moved = 0;
        foreach ($legacy['jobs'] as $job) {
            if (!in_array($job['status'] ?? '', ['queued', 'running'], true)) {
                continue;
            }
            foreach ($job['refs'] ?? [] as $ref) {
                $name = basename((string) ($ref['file'] ?? ''));
                $from = __DIR__ . '/flow_store/ref/' . $name;
                if ($name !== '' && is_file($from)) {
                    @copy($from, $refsDir . '/' . $name);
                }
            }
            $job['status'] = 'queued';
            $job['started'] = 0;
            $shared['jobs'][] = $job;
            $moved++;
        }
        if ($moved > 0) {
            write_queue($queueFile, $shared);
        }
        @rename($legacyQueue, $legacyQueue . '.merged');
    });
}

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Longitud en caracteres sin depender de mbstring (Hostinger lo tiene, local no siempre). */
function text_len(string $text): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }
    $count = preg_match_all('/./us', $text);
    return $count === false ? strlen($text) : $count;
}

function text_cut(string $text, int $max): string
{
    if (text_len($text) <= $max) {
        return $text;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $max, 'UTF-8');
    }
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    return $chars === false ? substr($text, 0, $max) : implode('', array_slice($chars, 0, $max));
}

function read_queue(string $file): array
{
    if (!is_file($file)) {
        return ['jobs' => [], 'worker_seen' => 0];
    }
    $raw = file_get_contents($file);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        return ['jobs' => [], 'worker_seen' => 0];
    }
    if (!isset($data['jobs']) || !is_array($data['jobs'])) {
        $data['jobs'] = [];
    }
    if (!isset($data['worker_seen'])) {
        $data['worker_seen'] = 0;
    }
    return $data;
}

function write_queue(string $file, array $data): void
{
    $tmp = $file . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    rename($tmp, $file);
}

function with_lock(callable $fn)
{
    global $store;
    $lh = fopen($store . '/queue.lock', 'c');
    if ($lh === false) {
        respond(['ok' => false, 'error' => 'No se pudo bloquear la cola'], 500);
    }
    flock($lh, LOCK_EX);
    try {
        return $fn();
    } finally {
        flock($lh, LOCK_UN);
        fclose($lh);
    }
}

function sniff_ext(string $bytes): ?string
{
    if (str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) {
        return 'png';
    }
    if (str_starts_with($bytes, "\xff\xd8\xff")) {
        return 'jpg';
    }
    if (str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBP') {
        return 'webp';
    }
    if (str_starts_with($bytes, 'GIF8')) {
        return 'gif';
    }
    return null;
}

function sniff_video(string $bytes): ?string
{
    // MP4/MOV: caja 'ftyp' en el byte 4 (el tipo concreto va dentro).
    if (strlen($bytes) > 12 && substr($bytes, 4, 4) === 'ftyp') {
        return 'mp4';
    }
    if (str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBM') {
        return 'webm';
    }
    return null;
}

/**
 * Valida las referencias que llegan del navegador (data URL o base64 puro).
 * Devuelve ['refs' => [['bytes' => ..., 'ext' => ...]], 'error' => ''].
 */
function parse_refs($raw): array
{
    if (!is_array($raw)) {
        return ['refs' => [], 'error' => ''];
    }
    $out = [];
    foreach (array_slice(array_values($raw), 0, MAX_REFS) as $item) {
        if (!is_string($item) || trim($item) === '') {
            continue;
        }
        $b64 = trim($item);
        $type = '';
        if (str_starts_with($b64, 'data:')) {
            $comma = strpos($b64, ',');
            if ($comma === false) {
                return ['refs' => [], 'error' => 'Una referencia llegó dañada'];
            }
            $header = substr($b64, 5, $comma - 5);
            $semi = strpos($header, ';');
            $type = strtolower($semi === false ? $header : substr($header, 0, $semi));
            $b64 = substr($b64, $comma + 1);
        }
        if ($type !== '' && !in_array($type, ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'], true)) {
            return ['refs' => [], 'error' => 'Formato de referencia no admitido'];
        }
        if (strlen($b64) > MAX_REF_BYTES * 2) {
            return ['refs' => [], 'error' => 'Cada referencia debe pesar menos de 6 MB'];
        }
        $bytes = base64_decode($b64, true);
        if ($bytes === false || $bytes === '') {
            return ['refs' => [], 'error' => 'Una referencia llegó dañada'];
        }
        if (strlen($bytes) > MAX_REF_BYTES) {
            return ['refs' => [], 'error' => 'Cada referencia debe pesar menos de 6 MB'];
        }
        $ext = sniff_ext($bytes);
        if ($ext === null) {
            return ['refs' => [], 'error' => 'Las referencias deben ser PNG, JPG, WEBP o GIF'];
        }
        $out[] = ['bytes' => $bytes, 'ext' => $ext];
    }
    return ['refs' => $out, 'error' => ''];
}

/** Borra del disco las referencias de un trabajo que ya no se necesita. */
function purge_refs(string $refsDir, array $refs): void
{
    foreach ($refs as $ref) {
        $name = basename((string) ($ref['file'] ?? ''));
        if ($name !== '' && is_file($refsDir . '/' . $name)) {
            @unlink($refsDir . '/' . $name);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// --- archivo público por id (imagen o vídeo) ------------------------------
if ($method === 'GET' && ($action === 'img' || $action === 'file')) {
    $id = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($_GET['id'] ?? '')));
    if ($id === '' || strlen($id) !== 16) {
        respond(['ok' => false, 'error' => 'id no válido'], 400);
    }
    $matches = glob($imgDir . '/' . $id . '.*') ?: [];
    if (!$matches) {
        respond(['ok' => false, 'error' => 'archivo no encontrado'], 404);
    }
    $path = $matches[0];
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $types = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'webp' => 'image/webp', 'gif' => 'image/gif',
        'mp4' => 'video/mp4', 'webm' => 'video/webm',
    ];
    $size = (int) filesize($path);
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Content-Disposition: inline; filename="' . $id . '.' . $ext . '"');
    header('Accept-Ranges: bytes');

    // Los vídeos necesitan rangos para que el navegador pueda avanzar y
    // rebobinar sin descargar el archivo entero otra vez.
    $start = 0;
    $end = $size - 1;
    $range = (string) ($_SERVER['HTTP_RANGE'] ?? '');
    if ($range !== '' && preg_match('/bytes=(\d*)-(\d*)/', $range, $m)) {
        if ($m[1] === '' && $m[2] !== '') {
            $start = max(0, $size - (int) $m[2]);
            $end = $size - 1;
        } else {
            $start = $m[1] === '' ? 0 : (int) $m[1];
            $end = $m[2] === '' ? $size - 1 : min((int) $m[2], $size - 1);
        }
        if ($start > $end || $start >= $size) {
            header('Content-Range: bytes */' . $size);
            http_response_code(416);
            exit;
        }
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    }
    header('Content-Length: ' . (string) ($end - $start + 1));

    $handle = fopen($path, 'rb');
    if ($handle !== false) {
        fseek($handle, $start);
        $left = $end - $start + 1;
        while ($left > 0 && !feof($handle)) {
            $chunk = fread($handle, (int) min(262144, $left));
            if ($chunk === false || $chunk === '') {
                break;
            }
            echo $chunk;
            $left -= strlen($chunk);
        }
        fclose($handle);
    }
    exit;
}

// --- ping -----------------------------------------------------------------
if ($method === 'GET' && $action === 'ping') {
    $q = read_queue($queueFile);
    $seen = (int) $q['worker_seen'];
    $pending = 0;
    foreach ($q['jobs'] as $j) {
        if (in_array($j['status'] ?? '', ['queued', 'running'], true)) {
            $pending++;
        }
    }
    respond([
        'ok' => true,
        'worker' => $seen > 0 && (time() - $seen) < WORKER_FRESH,
        'lastSeen' => $seen,
        'pending' => $pending,
    ]);
}

if ($method !== 'POST') {
    respond(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$raw = file_get_contents('php://input') ?: '';
if ($raw === '' && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    // PHP descarta el cuerpo cuando supera post_max_size: mejor decirlo claro.
    respond(['ok' => false, 'error' => 'La petición es demasiado grande. Usa referencias más ligeras.'], 413);
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(['ok' => false, 'error' => 'JSON no válido'], 400);
}
$reqAction = (string) ($body['action'] ?? $action);
$token = (string) ($body['token'] ?? ($_SERVER['HTTP_X_QUEUE_TOKEN'] ?? ''));

// --- request: encolar imágenes o vídeos -----------------------------------
if ($reqAction === 'request') {
    $prompt = trim((string) ($body['prompt'] ?? ''));
    if ($prompt === '') {
        respond(['ok' => false, 'error' => 'El prompt está vacío'], 400);
    }
    if (text_len($prompt) > MAX_PROMPT) {
        $prompt = text_cut($prompt, MAX_PROMPT);
    }
    $type = ((string) ($body['type'] ?? 'image')) === 'video' ? 'video' : 'image';
    if ($type === 'video') {
        // Vídeo con Flow (Veo): solo 16:9 o 9:16 y un clip por petición.
        $ratio = (string) ($body['ratio'] ?? '16:9');
        if (!in_array($ratio, VIDEO_RATIOS, true)) {
            $ratio = '16:9';
        }
        $model = (string) ($body['model'] ?? 'Veo 3.1 - Lite');
        $model = VIDEO_MODEL_ALIASES[$model] ?? $model;
        if (!in_array($model, VIDEO_MODELS, true)) {
            $model = 'Veo 3.1 - Lite';
        }
        $count = 1;
        $mode = 'video';
    } else {
        $ratio = (string) ($body['ratio'] ?? '1:1');
        if (!in_array($ratio, ['1:1', '16:9', '9:16', '4:3', '3:4'], true)) {
            $ratio = '1:1';
        }
        $model = (string) ($body['model'] ?? 'Nano Banana 2');
        $model = IMAGE_MODEL_ALIASES[$model] ?? $model;
        if (!in_array($model, ['Nano Banana 2', 'Nano Banana Pro', 'Nano Banana 2 Lite'], true)) {
            $model = 'Nano Banana 2';
        }
        $count = (int) ($body['count'] ?? 1);
        $count = max(1, min(4, $count));
        // mode=edit: la primera referencia es la imagen que se edita. La edición
        // reutiliza el canal de referencias del worker, así que no hace falta
        // desplegar de nuevo el worker del PC para que funcione.
        $mode = ((string) ($body['mode'] ?? 'generate')) === 'edit' ? 'edit' : 'generate';
        if ($mode === 'edit') {
            $count = 1;
        }
    }

    // Referencias de imagen: se validan y decodifican ANTES de tocar la cola.
    // En vídeo son los fotogramas: la primera es el inicial y la segunda el final.
    $parsedRefs = parse_refs($body['refs'] ?? []);
    if ($parsedRefs['error'] !== '') {
        respond(['ok' => false, 'error' => $parsedRefs['error']], 400);
    }
    $refsIn = $parsedRefs['refs'];
    if ($mode === 'edit' && count($refsIn) === 0) {
        respond(['ok' => false, 'error' => 'Falta la imagen que quieres editar'], 400);
    }

    $result = with_lock(function () use ($queueFile, $prompt, $ratio, $model, $count, $mode, $type, $refsIn, $refsDir) {
        $q = read_queue($queueFile);
        $pending = 0;
        $pendingVideos = 0;
        foreach ($q['jobs'] as $j) {
            if (in_array($j['status'] ?? '', ['queued', 'running'], true)) {
                $pending++;
                if (($j['type'] ?? 'image') === 'video') {
                    $pendingVideos++;
                }
            }
        }
        if ($type === 'video' && $pendingVideos >= MAX_VIDEO_QUEUE) {
            return ['ok' => false, 'error' => 'Ya hay ' . $pendingVideos . ' vídeos en cola. Espera a que termine alguno antes de encargar otro.'];
        }
        if ($pending + $count > MAX_QUEUE) {
            return ['ok' => false, 'error' => 'La cola está llena (' . $pending . ' pendientes). Espera un poco.'];
        }
        $ids = [];
        for ($i = 0; $i < $count; $i++) {
            $id = bin2hex(random_bytes(8));
            // Cada trabajo guarda su propia copia: el worker las descarga al reclamar.
            $refsMeta = [];
            foreach ($refsIn as $n => $ref) {
                $refFile = $id . '_' . ($n + 1) . '.' . $ref['ext'];
                if (file_put_contents($refsDir . '/' . $refFile, $ref['bytes']) === false) {
                    return ['ok' => false, 'error' => 'No se pudieron guardar las referencias'];
                }
                $refsMeta[] = [
                    'file' => $refFile,
                    'mime' => $ref['ext'] === 'jpg' ? 'image/jpeg' : 'image/' . $ref['ext'],
                ];
            }
            $q['jobs'][] = [
                'id' => $id,
                'type' => $type,
                'prompt' => $prompt,
                'ratio' => $ratio,
                'model' => $model,
                'mode' => $mode,
                'status' => 'queued',
                'created' => time(),
                'started' => 0,
                'finished' => 0,
                'error' => '',
                'file' => '',
                'refs' => $refsMeta,
            ];
            $ids[] = $id;
        }
        // Retención: fuera los terminados de más de 3 días (y sus referencias).
        $cut = time() - 3 * 86400;
        $keep = [];
        foreach ($q['jobs'] as $j) {
            if (($j['status'] ?? '') === 'done' && ((int) ($j['finished'] ?? 0)) < $cut) {
                purge_refs($refsDir, $j['refs'] ?? []);
                continue;
            }
            $keep[] = $j;
        }
        $q['jobs'] = $keep;
        write_queue($queueFile, $q);
        return ['ok' => true, 'ids' => $ids];
    });
    respond($result);
}

// --- status: consulta de ids ---------------------------------------------
if ($reqAction === 'status') {
    $ids = $body['ids'] ?? [];
    if (!is_array($ids)) {
        respond(['ok' => false, 'error' => 'ids no válidos'], 400);
    }
    $ids = array_slice(array_values(array_filter($ids, 'is_string')), 0, 12);
    $q = read_queue($queueFile);
    $out = [];
    foreach ($ids as $id) {
        $out[$id] = ['status' => 'missing'];
    }
    foreach ($q['jobs'] as $j) {
        if (!in_array($j['id'], $ids, true)) {
            continue;
        }
        $item = [
            'status' => $j['status'],
            'type' => $j['type'] ?? 'image',
            'error' => $j['error'] ?? '',
            'mode' => $j['mode'] ?? 'generate',
        ];
        if ($j['status'] === 'done' && !empty($j['file'])) {
            $urlAction = ($j['type'] ?? 'image') === 'video' ? 'file' : 'img';
            $item['url'] = 'flow_queue.php?action=' . $urlAction . '&id=' . $j['id'];
            $item['ratio'] = $j['ratio'];
            $item['model'] = $j['model'];
            $item['prompt'] = $j['prompt'];
        }
        $out[$j['id']] = $item;
    }
    respond([
        'ok' => true,
        'jobs' => $out,
        'worker' => ((int) ($q['worker_seen'] ?? 0)) > 0 && (time() - (int) $q['worker_seen']) < WORKER_FRESH,
        'pending' => count(array_filter($q['jobs'], fn($j) => in_array($j['status'], ['queued', 'running'], true))),
    ]);
}

// --- claim: el worker pide trabajo ---------------------------------------
if ($reqAction === 'claim') {
    if (!hash_equals(QUEUE_TOKEN, $token)) {
        respond(['ok' => false, 'error' => 'Token no válido'], 403);
    }
    $result = with_lock(function () use ($queueFile, $refsDir) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        $now = time();
        foreach ($q['jobs'] as &$j) {
            if (STALE_RUNNING > 0 && $j['status'] === 'running' && $now - (int) $j['started'] > STALE_RUNNING) {
                $j['status'] = 'queued';
                $j['started'] = 0;
            }
        }
        unset($j);
        $job = null;
        foreach ($q['jobs'] as &$j) {
            if ($j['status'] === 'queued') {
                $j['status'] = 'running';
                $j['started'] = $now;
                // Las referencias viajan en la respuesta (base64) para que el
                // worker no necesite otro endpoint ni exponerlas por URL.
                $refs = [];
                foreach ($j['refs'] ?? [] as $ref) {
                    $name = basename((string) ($ref['file'] ?? ''));
                    $path = $refsDir . '/' . $name;
                    if ($name === '' || !is_file($path)) {
                        continue;
                    }
                    $bytes = file_get_contents($path);
                    if ($bytes === false || $bytes === '') {
                        continue;
                    }
                    $refs[] = [
                        'mime' => (string) ($ref['mime'] ?? 'image/jpeg'),
                        'ext' => strtolower((string) pathinfo($name, PATHINFO_EXTENSION)),
                        'data' => base64_encode($bytes),
                    ];
                }
                $job = [
                    'id' => $j['id'],
                    'type' => $j['type'] ?? 'image',
                    'prompt' => $j['prompt'],
                    'ratio' => $j['ratio'],
                    'model' => $j['model'],
                    'mode' => $j['mode'] ?? 'generate',
                    'refs' => $refs,
                ];
                break;
            }
        }
        unset($j);
        write_queue($queueFile, $q);
        return ['ok' => true, 'job' => $job];
    });
    respond($result);
}

// --- complete: el worker sube el resultado --------------------------------
if ($reqAction === 'complete') {
    if (!hash_equals(QUEUE_TOKEN, $token)) {
        respond(['ok' => false, 'error' => 'Token no válido'], 403);
    }
    $id = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($body['id'] ?? '')));
    $payload = (string) ($body['video'] ?? '');
    $isVideo = $payload !== '';
    if (!$isVideo) {
        $payload = (string) ($body['image'] ?? '');
    }
    if ($id === '' || strlen($id) !== 16 || $payload === '') {
        respond(['ok' => false, 'error' => 'Parámetros incompletos'], 400);
    }
    if (str_starts_with($payload, 'data:')) {
        $payload = substr($payload, (int) strpos($payload, ',') + 1);
    }
    $bytes = base64_decode($payload, true);
    if ($bytes === false) {
        respond(['ok' => false, 'error' => 'Base64 no válido'], 400);
    }
    if ($isVideo) {
        $ext = sniff_video($bytes);
        if ($ext === null) {
            respond(['ok' => false, 'error' => 'El archivo no es un vídeo MP4'], 400);
        }
        if (strlen($bytes) > MAX_VIDEO_BYTES) {
            respond(['ok' => false, 'error' => 'Vídeo demasiado grande (máximo 32 MB)'], 400);
        }
    } else {
        $ext = sniff_ext($bytes);
        if ($ext === null) {
            respond(['ok' => false, 'error' => 'El archivo no es una imagen'], 400);
        }
        if (strlen($bytes) > 8 * 1024 * 1024) {
            respond(['ok' => false, 'error' => 'Imagen demasiado grande'], 400);
        }
    }
    $path = $imgDir . '/' . $id . '.' . $ext;
    if (file_put_contents($path, $bytes) === false) {
        respond(['ok' => false, 'error' => 'No se pudo guardar el resultado'], 500);
    }
    $result = with_lock(function () use ($queueFile, $id, $ext, $isVideo, $refsDir, $path) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        foreach ($q['jobs'] as &$j) {
            if ($j['id'] === $id) {
                if ((($j['type'] ?? 'image') === 'video') !== $isVideo) {
                    unset($j);
                    @unlink($path);
                    return ['ok' => false, 'error' => 'El archivo no corresponde al tipo del trabajo'];
                }
                $j['status'] = 'done';
                $j['file'] = $id . '.' . $ext;
                $j['finished'] = time();
                $j['error'] = '';
                purge_refs($refsDir, $j['refs'] ?? []);
                $j['refs'] = [];
                break;
            }
        }
        unset($j);
        write_queue($queueFile, $q);
        return ['ok' => true, 'id' => $id];
    });
    respond($result);
}

// --- fail ---------------------------------------------------------------
if ($reqAction === 'fail') {
    if (!hash_equals(QUEUE_TOKEN, $token)) {
        respond(['ok' => false, 'error' => 'Token no válido'], 403);
    }
    $id = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($body['id'] ?? '')));
    $error = text_cut((string) ($body['error'] ?? 'Error desconocido'), 300);
    $result = with_lock(function () use ($queueFile, $id, $error, $refsDir) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        foreach ($q['jobs'] as &$j) {
            if ($j['id'] === $id) {
                $j['status'] = 'error';
                $j['error'] = $error;
                $j['finished'] = time();
                purge_refs($refsDir, $j['refs'] ?? []);
                $j['refs'] = [];
                break;
            }
        }
        unset($j);
        write_queue($queueFile, $q);
        return ['ok' => true];
    });
    respond($result);
}

respond(['ok' => false, 'error' => 'Acción desconocida: ' . $reqAction], 400);
