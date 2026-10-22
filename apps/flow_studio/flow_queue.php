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
const MAX_PROMPT = 1200;
const MAX_QUEUE = 12;
const STALE_RUNNING = 7200;     // 2 h: una generación lenta ya no se reencola
const WORKER_FRESH = 600;       // 10 min sin señales = worker desconectado

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$store = __DIR__ . '/flow_store';
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

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// --- imagen pública por id ------------------------------------------------
if ($method === 'GET' && $action === 'img') {
    $id = preg_replace('/[^a-f0-9]/', '', strtolower((string) ($_GET['id'] ?? '')));
    if ($id === '' || strlen($id) !== 16) {
        respond(['ok' => false, 'error' => 'id no válido'], 400);
    }
    $matches = glob($imgDir . '/' . $id . '.*') ?: [];
    if (!$matches) {
        respond(['ok' => false, 'error' => 'imagen no encontrada'], 404);
    }
    $path = $matches[0];
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . (string) filesize($path));
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($path);
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
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(['ok' => false, 'error' => 'JSON no válido'], 400);
}
$reqAction = (string) ($body['action'] ?? $action);
$token = (string) ($body['token'] ?? ($_SERVER['HTTP_X_QUEUE_TOKEN'] ?? ''));

// --- request: encolar N imágenes -----------------------------------------
if ($reqAction === 'request') {
    $prompt = trim((string) ($body['prompt'] ?? ''));
    if ($prompt === '') {
        respond(['ok' => false, 'error' => 'El prompt está vacío'], 400);
    }
    if (text_len($prompt) > MAX_PROMPT) {
        $prompt = text_cut($prompt, MAX_PROMPT);
    }
    $ratio = (string) ($body['ratio'] ?? '1:1');
    if (!in_array($ratio, ['1:1', '16:9', '9:16', '4:3', '3:4'], true)) {
        $ratio = '1:1';
    }
    $model = (string) ($body['model'] ?? 'Nano Banana 2');
    if (!in_array($model, ['Nano Banana 2', 'Nano Banana Pro', 'Nano Banana 2 Lite'], true)) {
        $model = 'Nano Banana 2';
    }
    $count = (int) ($body['count'] ?? 1);
    $count = max(1, min(4, $count));

    $result = with_lock(function () use ($queueFile, $prompt, $ratio, $model, $count) {
        $q = read_queue($queueFile);
        $pending = 0;
        foreach ($q['jobs'] as $j) {
            if (in_array($j['status'] ?? '', ['queued', 'running'], true)) {
                $pending++;
            }
        }
        if ($pending + $count > MAX_QUEUE) {
            return ['ok' => false, 'error' => 'La cola está llena (' . $pending . ' pendientes). Espera un poco.'];
        }
        $ids = [];
        for ($i = 0; $i < $count; $i++) {
            $id = bin2hex(random_bytes(8));
            $q['jobs'][] = [
                'id' => $id,
                'prompt' => $prompt,
                'ratio' => $ratio,
                'model' => $model,
                'status' => 'queued',
                'created' => time(),
                'started' => 0,
                'finished' => 0,
                'error' => '',
                'file' => '',
            ];
            $ids[] = $id;
        }
        // Retención: fuera los terminados de más de 3 días.
        $cut = time() - 3 * 86400;
        $q['jobs'] = array_values(array_filter($q['jobs'], function ($j) use ($cut) {
            $st = $j['status'] ?? '';
            return !($st === 'done' && ((int) ($j['finished'] ?? 0)) < $cut);
        }));
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
        $item = ['status' => $j['status'], 'error' => $j['error'] ?? ''];
        if ($j['status'] === 'done' && !empty($j['file'])) {
            $item['url'] = 'flow_queue.php?action=img&id=' . $j['id'];
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
    $result = with_lock(function () use ($queueFile) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        $now = time();
        foreach ($q['jobs'] as &$j) {
            if ($j['status'] === 'running' && $now - (int) $j['started'] > STALE_RUNNING) {
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
                $job = ['id' => $j['id'], 'prompt' => $j['prompt'], 'ratio' => $j['ratio'], 'model' => $j['model']];
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
    $image = (string) ($body['image'] ?? '');
    if ($id === '' || strlen($id) !== 16 || $image === '') {
        respond(['ok' => false, 'error' => 'Parámetros incompletos'], 400);
    }
    if (str_starts_with($image, 'data:')) {
        $image = substr($image, (int) strpos($image, ',') + 1);
    }
    $bytes = base64_decode($image, true);
    if ($bytes === false) {
        respond(['ok' => false, 'error' => 'Base64 no válido'], 400);
    }
    $ext = sniff_ext($bytes);
    if ($ext === null) {
        respond(['ok' => false, 'error' => 'El archivo no es una imagen'], 400);
    }
    if (strlen($bytes) > 8 * 1024 * 1024) {
        respond(['ok' => false, 'error' => 'Imagen demasiado grande'], 400);
    }
    $path = $imgDir . '/' . $id . '.' . $ext;
    if (file_put_contents($path, $bytes) === false) {
        respond(['ok' => false, 'error' => 'No se pudo guardar la imagen'], 500);
    }
    $result = with_lock(function () use ($queueFile, $id, $ext) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        foreach ($q['jobs'] as &$j) {
            if ($j['id'] === $id) {
                $j['status'] = 'done';
                $j['file'] = $id . '.' . $ext;
                $j['finished'] = time();
                $j['error'] = '';
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
    $result = with_lock(function () use ($queueFile, $id, $error) {
        $q = read_queue($queueFile);
        $q['worker_seen'] = time();
        foreach ($q['jobs'] as &$j) {
            if ($j['id'] === $id) {
                $j['status'] = 'error';
                $j['error'] = $error;
                $j['finished'] = time();
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
