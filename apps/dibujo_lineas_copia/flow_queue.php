<?php
// flow_queue.php — API JSON cerrada de la cola de generación de imágenes (Flow queue).
// Solo acciones internas: request, status, poll, complete, fail.
// Sin shell_exec, sin claves externas, sin URLs arbitrarias. Siempre responde JSON.
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Token compartido con el worker de PC (comparación en tiempo constante).
const FQ_TOKEN = 'fq8-Kx3mT9wQ2rL5vB7n';

const FQ_ID_RE     = '/^fq_[0-9]+_[a-z0-9]{6}$/';
const FQ_RATIOS    = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const FQ_MAX_PROMPT = 4000;
const FQ_MAX_PENDING = 20;
const FQ_PREFIX    = 'data:image/jpeg;base64,';

$FQ_DIR = __DIR__ . '/flow_queue';
$FQ_RES = $FQ_DIR . '/results';

/**
 * Devuelve una respuesta JSON y termina. Nunca expone rutas internas ni trazas.
 */
function fq_out(array $data, int $http = 200): void
{
    http_response_code($http);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Asegura que existen los directorios de jobs y resultados. */
function fq_dirs(string $dir, string $res): void
{
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    if (!is_dir($res)) { @mkdir($res, 0775, true); }
}

/** Largo en caracteres UTF-8 (compatible con o sin mbstring). */
function fq_len(string $s): int
{
    if (function_exists('mb_strlen')) { return mb_strlen($s, 'UTF-8'); }
    $n = preg_match_all('/./us', $s, $m);
    return $n === false ? strlen($s) : $n;
}

/** Trunca a N caracteres UTF-8 (compatible con o sin mbstring). */
function fq_substr(string $s, int $n): string
{
    if (function_exists('mb_substr')) { return mb_substr($s, 0, $n, 'UTF-8'); }
    $parts = preg_split('//u', $s, $n + 1, PREG_SPLIT_NO_EMPTY);
    return is_array($parts) ? implode('', array_slice($parts, 0, $n)) : substr($s, 0, $n);
}

/** Comprueba el token con hash_equals. */
function fq_check_token(mixed $token): bool
{
    return is_string($token) && hash_equals(FQ_TOKEN, $token);
}

/** Valida el formato de id de job. */
function fq_valid_id(mixed $id): bool
{
    return is_string($id) && preg_match(FQ_ID_RE, $id) === 1;
}

/** Lee un job del disco o null si no existe / está corrupto. */
function fq_load_job(string $file): ?array
{
    if (!is_file($file)) { return null; }
    $raw = @file_get_contents($file);
    if ($raw === false) { return null; }
    $job = json_decode($raw, true);
    return is_array($job) ? $job : null;
}

/** Guarda un job en disco (escritura atómica simple). */
function fq_save_job(string $file, array $job): void
{
    @file_put_contents($file, json_encode($job, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// ---------------------------------------------------------------------------
// Lectura de la petición: POST con body JSON (fallback a $_POST).
// ---------------------------------------------------------------------------
$rawBody = file_get_contents('php://input');
$in = json_decode((string)$rawBody, true);
if (!is_array($in)) {
    $in = $_POST;
}
if (!is_array($in)) {
    fq_out(['ok' => false, 'error' => 'denegado'], 400);
}

$action = isset($in['action']) && is_string($in['action']) ? $in['action'] : '';

fq_dirs($FQ_DIR, $FQ_RES);

// ---------------------------------------------------------------------------
// Acciones del worker (requieren token).
// ---------------------------------------------------------------------------
if ($action === 'poll' || $action === 'complete' || $action === 'fail') {
    if (!fq_check_token($in['token'] ?? null)) {
        fq_out(['ok' => false, 'error' => 'denegado'], 403);
    }

    if ($action === 'poll') {
        // Reclama el pending más antiguo: lo pasa a "processing" y lo devuelve.
        $files = glob($FQ_DIR . '/fq_*.json') ?: [];
        sort($files); // los ids llevan epoch: el orden lexicográfico es cronológico
        foreach ($files as $file) {
            $job = fq_load_job($file);
            if ($job === null) { continue; }
            if (($job['status'] ?? '') === 'pending') {
                $job['status'] = 'processing';
                fq_save_job($file, $job);
                fq_out(['ok' => true, 'job' => [
                    'id'       => $job['id'],
                    'prompt'   => $job['prompt'],
                    'ratio'    => $job['ratio'],
                    'hasImage' => !empty($job['hasImage']),
                ]]);
            }
        }
        fq_out(['ok' => true, 'job' => null]);
    }

    // complete / fail: ambos exigen un id válido.
    $id = $in['id'] ?? null;
    if (!fq_valid_id($id)) {
        fq_out(['ok' => false, 'error' => 'denegado'], 400);
    }
    $file = $FQ_DIR . '/' . $id . '.json';
    $job = fq_load_job($file);
    if ($job === null) {
        fq_out(['ok' => false, 'error' => 'denegado'], 400);
    }

    if ($action === 'complete') {
        $imageData = $in['imageData'] ?? null;
        if (!is_string($imageData) || strncmp($imageData, FQ_PREFIX, strlen(FQ_PREFIX)) !== 0) {
            fq_out(['ok' => false, 'error' => 'denegado'], 400);
        }
        $b64 = substr($imageData, strlen(FQ_PREFIX));
        if ($b64 === '' || strlen($b64) > (int)(2.5 * 1024 * 1024)) {
            fq_out(['ok' => false, 'error' => 'denegado'], 400);
        }
        $bin = base64_decode($b64, true);
        if ($bin === false || $bin === '') {
            fq_out(['ok' => false, 'error' => 'denegado'], 400);
        }
        fq_dirs($FQ_DIR, $FQ_RES);
        if (@file_put_contents($FQ_RES . '/' . $id . '.jpg', $bin) === false) {
            fq_out(['ok' => false, 'error' => 'denegado'], 400);
        }
        $job['status'] = 'done';
        $job['error'] = null;
        fq_save_job($file, $job);
        fq_out(['ok' => true]);
    }

    // fail
    $err = $in['error'] ?? 'error generico';
    if (!is_string($err) || $err === '') { $err = 'error generico'; }
    if (fq_len($err) > 200) { $err = fq_substr($err, 200); }
    $job['status'] = 'error';
    $job['error'] = $err;
    fq_save_job($file, $job);
    fq_out(['ok' => true]);
}

// ---------------------------------------------------------------------------
// Acciones públicas de la app: request y status (sin token).
// ---------------------------------------------------------------------------
if ($action === 'request') {
    $prompt = $in['prompt'] ?? null;
    $ratio  = $in['ratio'] ?? null;

    if (!is_string($prompt) || trim($prompt) === '' || fq_len($prompt) > FQ_MAX_PROMPT) {
        fq_out(['ok' => false, 'error' => 'prompt invalido'], 400);
    }
    if (!is_string($ratio) || !in_array($ratio, FQ_RATIOS, true)) {
        fq_out(['ok' => false, 'error' => 'ratio invalido'], 400);
    }

    // Imagen de referencia opcional (la app convierte imagen → líneas).
    $image = $in['image'] ?? null;
    $imgBin = null;
    if ($image !== null) {
        if (!is_string($image) || strncmp($image, 'data:image/', 11) !== 0) {
            fq_out(['ok' => false, 'error' => 'imagen invalida'], 400);
        }
        $pos = strpos($image, ';base64,');
        if ($pos === false) {
            fq_out(['ok' => false, 'error' => 'imagen invalida'], 400);
        }
        $b64img = substr($image, $pos + 8);
        if (strlen($b64img) > 3500000) {
            fq_out(['ok' => false, 'error' => 'imagen muy grande'], 400);
        }
        $imgBin = base64_decode($b64img, true);
        if ($imgBin === false || strlen($imgBin) < 100) {
            fq_out(['ok' => false, 'error' => 'imagen invalida'], 400);
        }
    }

    // Rate simple: máximo 1 request por IP por minuto.
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $rateFile = $FQ_DIR . '/_rate_' . md5($ip) . '.json';
    $now = time();
    $last = 0;
    if (is_file($rateFile)) {
        $rate = json_decode((string)@file_get_contents($rateFile), true);
        if (is_array($rate) && isset($rate['last']) && is_int($rate['last'])) {
            $last = $rate['last'];
        }
    }
    if ($last > 0 && ($now - $last) < 60) {
        fq_out(['ok' => false, 'error' => 'espera un minuto'], 400);
    }

    // Máximo 20 jobs pendientes en cola.
    $pending = 0;
    foreach ((glob($FQ_DIR . '/fq_*.json') ?: []) as $file) {
        $job = fq_load_job($file);
        if ($job !== null && ($job['status'] ?? '') === 'pending') { $pending++; }
    }
    if ($pending >= FQ_MAX_PENDING) {
        fq_out(['ok' => false, 'error' => 'cola llena'], 400);
    }

    // Crea el job.
    $id = 'fq_' . $now . '_' . substr(bin2hex(random_bytes(8)), 0, 6);
    $job = [
        'id'        => $id,
        'status'    => 'pending',
        'prompt'    => $prompt,
        'ratio'     => $ratio,
        'hasImage'  => $imgBin !== null,
        'createdAt' => $now,
    ];
    fq_dirs($FQ_DIR, $FQ_RES);
    if ($imgBin !== null) {
        @file_put_contents($FQ_DIR . '/' . $id . '.img.jpg', $imgBin);
    }
    fq_save_job($FQ_DIR . '/' . $id . '.json', $job);
    @file_put_contents($rateFile, json_encode(['last' => $now]), LOCK_EX);

    fq_out(['ok' => true, 'id' => $id]);
}

if ($action === 'status') {
    $id = $in['id'] ?? null;
    if (!fq_valid_id($id)) {
        fq_out(['ok' => false, 'error' => 'denegado'], 400);
    }
    $job = fq_load_job($FQ_DIR . '/' . $id . '.json');
    if ($job === null) {
        fq_out(['ok' => false, 'error' => 'denegado'], 400);
    }
    $status = in_array($job['status'] ?? '', ['pending', 'processing', 'done', 'error'], true)
        ? $job['status'] : 'error';
    fq_out([
        'ok'        => true,
        'id'        => $job['id'],
        'status'    => $status,
        'image'     => 'flow_queue/results/' . $job['id'] . '.jpg', // solo informativo
        'error'     => $status === 'error' ? ($job['error'] ?? 'error generico') : null,
        'createdAt' => $job['createdAt'] ?? null,
    ]);
}

// Acción desconocida.
fq_out(['ok' => false, 'error' => 'denegado'], 400);