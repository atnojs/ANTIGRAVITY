<?php
declare(strict_types=1);

/**
 * Pipeline único de trabajos: registro, presupuesto, idempotencia, proveedor y coste.
 * Lo usan api.php (job.create) y proxy.php, para que ningún camino pueda gastar
 * dinero sin pasar por el presupuesto ni quedar sin registro.
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/canonical-image-model.php';

final class UisHttpError extends RuntimeException
{
    public array $details = [];

    public function __construct(string $message, int $status = 500, array $details = [])
    {
        parent::__construct($message, $status);
        $this->details = $details;
    }
}

function uis_job_pricing(?string $modelId): ?float
{
    if ($modelId === null || $modelId === '') return null;
    $pricing = uis_pricing();
    if (!isset($pricing[$modelId]['unit']) || !is_numeric($pricing[$modelId]['unit'])) return null;
    return (float)$pricing[$modelId]['unit'];
}

function uis_jobs_last_minute(PDO $db): int
{
    $stmt = $db->prepare('SELECT COUNT(*) FROM jobs WHERE created_at > ?');
    $stmt->execute([time() - 60]);
    return (int)$stmt->fetchColumn();
}

/** Cierra trabajos que el proveedor nunca resolvió para no contar presupuesto fantasma. */
function uis_jobs_sweep(PDO $db, int $maxAgeSeconds = 900): int
{
    $stmt = $db->prepare(
        "UPDATE jobs SET status = 'failed', error = 'Sin respuesta del proveedor: tiempo agotado.',
            updated_at = ?, completed_at = ?
         WHERE status IN ('queued','running') AND updated_at < ?"
    );
    $stmt->execute([time(), time(), time() - $maxAgeSeconds]);
    return $stmt->rowCount();
}

/**
 * Crea (y ejecuta) un trabajo. Devuelve el trabajo público.
 * Lanza UisHttpError con el código HTTP adecuado.
 */
function uis_job_create(PDO $db, array $body, string $key): array
{
    if (!uis_safe_id($key)) throw new UisHttpError('Falta la clave de idempotencia del trabajo.', 400);
    if (uis_jobs_last_minute($db) >= UIS_MAX_JOBS_PER_MINUTE) {
        throw new UisHttpError('Demasiados trabajos en un minuto. Espera antes de volver a generar.', 429);
    }

    $modelId = (string)($body['model'] ?? '');
    $catalog = ag_image_catalog();
    if (!isset($catalog[$modelId])) throw new UisHttpError('Modelo no soportado.', 400);

    $prompt = trim((string)($body['prompt'] ?? ''));
    if ($prompt === '') throw new UisHttpError('Falta el prompt.', 400);
    if (mb_strlen($prompt) > 11800) throw new UisHttpError('El prompt supera 12.000 caracteres.', 413);
    if (!str_contains(mb_strtolower($prompt), 'español')) {
        $prompt .= "\n\nTodo texto o audio generado debe estar obligatoriamente en español.";
    }
    if (mb_strlen($prompt) > 12000) throw new UisHttpError('El prompt supera 12.000 caracteres.', 413);

    // Idempotencia: mismo identificador devuelve el trabajo existente, sin volver a pagar.
    $stmt = $db->prepare('SELECT * FROM jobs WHERE idempotency_key = ?');
    $stmt->execute([$key]);
    $existing = $stmt->fetch();
    if ($existing) return uis_public_job($existing) + ['deduplicated' => true];

    $estimate = uis_job_pricing($modelId);
    $budget = uis_check_budget($db, $body['projectId'] ?? null, $estimate);
    if (isset($budget['ok']) && $budget['ok'] === false) {
        throw new UisHttpError((string)($budget['message'] ?? 'Presupuesto insuficiente.'), 402, ['budget' => $budget]);
    }

    $images = [];
    if (isset($body['images']) && is_array($body['images'])) {
        $images = array_slice(array_values(array_filter($body['images'], 'is_string')), 0, 8);
    }
    $mask = isset($body['mask']) && is_string($body['mask']) ? $body['mask'] : null;

    $jobId = 'job_' . bin2hex(random_bytes(12));
    $now = time();
    $stmt = $db->prepare(
        'INSERT INTO jobs (id, idempotency_key, project_id, doc_id, doc_version, kind, model, prompt, status,
            cost_estimate, currency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    try {
        $stmt->execute([
            $jobId, $key, $body['projectId'] ?? null, $body['docId'] ?? null, (int)($body['docVersion'] ?? 0),
            (string)($body['kind'] ?? 'generate'), $modelId, $prompt, 'running',
            $estimate, 'EUR', $now, $now,
        ]);
    } catch (PDOException $error) {
        // Carrera con otra petición idéntica: devuelve el trabajo que ganó.
        $stmt = $db->prepare('SELECT * FROM jobs WHERE idempotency_key = ?');
        $stmt->execute([$key]);
        $winner = $stmt->fetch();
        if ($winner) return uis_public_job($winner) + ['deduplicated' => true];
        throw new UisHttpError('No se pudo registrar el trabajo.', 500);
    }

    $request = [
        'model' => $modelId,
        'prompt' => $prompt,
        'aspectRatio' => (string)($body['aspectRatio'] ?? '1:1'),
        'resolution' => (int)($body['resolution'] ?? 1024),
    ];
    if ($images !== []) $request['images'] = $images;
    if ($mask !== null) $request['mask'] = $mask;

    try {
        set_time_limit(200);
        $result = ag_image_generate($request, uis_root());
        $binary = base64_decode((string)($result['image'] ?? ''), true);
        if ($binary === false || $binary === '') {
            throw new RuntimeException('El proveedor no devolvió una imagen válida.', 502);
        }
        $filename = $jobId . '.png';
        uis_write_file(uis_resource_dir() . '/' . $filename, $binary);

        $db->beginTransaction();
        $stmt = $db->prepare('UPDATE jobs SET status = ?, result_file = ?, provider = ?, provider_ref = ?, updated_at = ?, completed_at = ? WHERE id = ?');
        $stmt->execute(['succeeded', $filename, (string)($result['provider'] ?? ''), (string)($result['model'] ?? ''), time(), time(), $jobId]);
        if ($estimate !== null) {
            $stmt = $db->prepare('INSERT INTO ledger (job_id, project_id, kind, amount, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$jobId, $body['projectId'] ?? null, 'estimate', $estimate, 'EUR', time()]);
        }
        $db->commit();

        $stmt = $db->prepare('SELECT * FROM jobs WHERE id = ?');
        $stmt->execute([$jobId]);
        return uis_public_job($stmt->fetch());
    } catch (Throwable $error) {
        $status = (int)$error->getCode();
        $message = $error->getMessage();
        $stmt = $db->prepare('UPDATE jobs SET status = ?, error = ?, updated_at = ?, completed_at = ? WHERE id = ?');
        $stmt->execute(['failed', mb_substr($message, 0, 500), time(), time(), $jobId]);
        if ($status < 400 || $status > 599) $status = 502;
        throw new UisHttpError('El proveedor no pudo completar la generación: ' . $message, $status);
    }
}
