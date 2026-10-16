<?php
/**
 * API de la app Descargas.
 *
 * Cola de trabajos que ejecuta el worker del PC de Antonio (yt-dlp + ffmpeg) y
 * que el navegador controla desde cualquier sitio.
 *
 *   Usuario (sesion iniciada en auth.php): add, list, status, cancel, delete, download
 *   Worker (cabecera X-Worker-Token):      next, progress, upload_chunk, item_done, finish, fail, heartbeat
 *   Publico (diagnostico):                 health
 *
 * La accion puede venir en la query string (`?action=list`), en el POST
 * (`action=list`) o DENTRO DEL JSON (`{"action":"next"}`). Las tres formas se
 * aceptan: el worker manda la accion en el cuerpo y el navegador en la query.
 *
 * Los datos viven en `data/` (fuera de git y DENEGADO por web: se sirve solo a
 * traves de este fichero, y solo con sesion).
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const DATA_DIR       = 'data';
const FILES_DIR      = 'data/files';
const PARTS_DIR      = 'data/parts';
const QUEUE_FILE     = 'data/queue.json';
/**
 * El bloqueo va en un fichero APARTE, nunca en queue.json.
 * En Windows `flock(LOCK_EX)` sobre un fichero y leerlo despues con otro handle
 * (file_get_contents) se queda colgado esperando el lock: la peticion no
 * termina nunca y, como el servidor va de una en una, bloquea toda la app.
 * Por eso se bloquea `queue.lock` y se lee/escribe `queue.json`.
 */
const QUEUE_LOCK     = 'data/queue.lock';
const WORKER_FILE    = 'data/worker.json';
const CLEANUP_STAMP  = 'data/.cleanup';
const HISTORY_DIR    = 'history_store';
const HISTORY_FILE   = 'history_store/history.json';
const HISTORY_LOCK   = 'history_store/history.lock';

const MAX_JOBS         = 200;
const MAX_HISTORY      = 200;
const MAX_URL_LEN      = 2048;
/**
 * Tope de un trozo de subida. Va EMPAREJADO con `chunk_mb` de la configuracion
 * del worker: si el worker manda trozos mas grandes que este tope, la API
 * responde 413 y la descarga se pierde despues de haberse bajado entera.
 * El servidor admite mucho mas (upload_max_filesize = 2 GB); este limite es
 * nuestro, para no aceptar un cuerpo absurdo. Hay holgura a proposito.
 */
const MAX_CHUNK_BYTES  = 24 * 1024 * 1024;
const MAX_ITEM_BYTES   = 4 * 1024 * 1024 * 1024;
const RETENTION_DAYS   = 7;
const STALE_RUNNING_S  = 900;   // 15 min sin señales => el trabajo se puede reclamar
const CLEANUP_EVERY_S  = 300;

const APP_NAME     = 'descargas';
const APP_VERSION  = '1.0.2';

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function nowIso(): string {
    return date(DATE_ATOM);
}

function ensureDirs(): void {
    foreach ([DATA_DIR, FILES_DIR, PARTS_DIR] as $dir) {
        $path = __DIR__ . '/' . $dir;
        if (!is_dir($path) && !mkdir($path, 0755, true) && !is_dir($path)) {
            respond(500, ['success' => false, 'error' => 'No se pudo preparar el almacenamiento.']);
        }
    }
    // El almacen de ficheros jamas debe servirse directamente: son descargas
    // privadas y se entregan solo por `download` con sesion.
    $htaccess = __DIR__ . '/' . DATA_DIR . '/.htaccess';
    if (!is_file($htaccess)) {
        @file_put_contents(
            $htaccess,
            "Require all denied\n<IfModule mod_autoindex.c>\n    Options -Indexes\n</IfModule>\n",
            LOCK_EX
        );
    }
}

function lockFile(string $relative) {
    $handle = fopen(__DIR__ . '/' . $relative, 'c+');
    if ($handle === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo bloquear el almacen.']);
    }
    return $handle;
}

function readJsonFile(string $relative, $fallback) {
    $path = __DIR__ . '/' . $relative;
    if (!is_file($path)) {
        return $fallback;
    }
    $raw = (string)@file_get_contents($path);
    if ($raw === '') {
        return $fallback;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function writeJsonFile(string $relative, array $data): void {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || @file_put_contents(__DIR__ . '/' . $relative, $json, LOCK_EX) === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo guardar el estado.']);
    }
}

function cleanId(string $value): string {
    return substr(preg_replace('/[^a-zA-Z0-9_-]/', '', $value) ?? '', 0, 64);
}

/** Nombre de fichero seguro: conserva acentos y espacios, prohibe rutas. */
function safeFilename(string $name): string {
    $name = str_replace(['\\', '/', "\0"], '_', $name);
    $name = preg_replace('/[\x00-\x1F<>:"|?*]/u', '', $name) ?? $name;
    $name = preg_replace('/\.{2,}/', '.', $name) ?? $name;
    $name = trim($name, " .\t");
    if ($name === '') {
        $name = 'descarga';
    }
    if (mb_strlen($name) > 150) {
        $extension = pathinfo($name, PATHINFO_EXTENSION);
        $base = pathinfo($name, PATHINFO_FILENAME);
        $name = mb_substr($base, 0, 130) . ($extension !== '' ? '.' . $extension : '');
    }
    return $name;
}

/* ── Cuerpo de la peticion ──────────────────────────────────────────────── */

/** Cuerpo leido UNA sola vez (php://input no siempre es releible). */
function rawBody(): string {
    static $raw = null;
    if ($raw === null) {
        $raw = (string)file_get_contents('php://input');
    }
    return $raw;
}

/**
 * JSON de la peticion, o null si no es JSON valido.
 * Un cuerpo vacio se trata como objeto vacio: hay acciones legitimas que no
 * mandan nada.
 */
function jsonBody(): ?array {
    static $decoded = false;
    if ($decoded === false) {
        $raw = rawBody();
        if ($raw === '') {
            $decoded = [];
        } else {
            $parsed = json_decode($raw, true);
            $decoded = is_array($parsed) ? $parsed : null;
        }
    }
    return $decoded;
}

function readJsonBody(): array {
    $body = jsonBody();
    if ($body === null) {
        respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON valido.']);
    }
    return $body;
}

/* ── Sesion del usuario ─────────────────────────────────────────────────── */

function startSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $cookiePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/') . '/';
    session_name('descargas_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => $cookiePath,
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function requireUser(): void {
    startSession();
    if (empty($_SESSION['descargas_ok'])) {
        respond(401, ['success' => false, 'error' => 'Sesion no iniciada.', 'auth' => false]);
    }
}

/* ── Token del worker ───────────────────────────────────────────────────── */

function requireWorker(): void {
    $keyFile = __DIR__ . '/worker_key.php';
    if (!is_file($keyFile)) {
        respond(500, ['success' => false, 'error' => 'Falta worker_key.php.']);
    }
    $config = require $keyFile;
    $expected = is_array($config) ? (string)($config['sha256'] ?? '') : '';
    if (!preg_match('/^[0-9a-f]{64}$/', $expected)) {
        respond(500, ['success' => false, 'error' => 'worker_key.php no tiene un hash valido.']);
    }
    $token = (string)($_SERVER['HTTP_X_WORKER_TOKEN'] ?? ($_POST['token'] ?? ''));
    if ($token === '' || !hash_equals($expected, hash('sha256', $token))) {
        usleep(200000);
        respond(403, ['success' => false, 'error' => 'Token de worker invalido.']);
    }
}

/* ── Cola ───────────────────────────────────────────────────────────────── */

function loadQueue(): array {
    $queue = readJsonFile(QUEUE_FILE, ['jobs' => []]);
    if (!isset($queue['jobs']) || !is_array($queue['jobs'])) {
        $queue['jobs'] = [];
    }
    return $queue;
}

function findJob(array &$queue, string $jobId): ?int {
    foreach ($queue['jobs'] as $index => $job) {
        if (($job['id'] ?? '') === $jobId) {
            return $index;
        }
    }
    return null;
}

function publicJob(array $job): array {
    unset($job['_internal']);
    return $job;
}

/** Respuesta de la cola al navegador: sin datos internos y ordenada. */
function jobsForClient(array $jobs): array {
    $jobs = array_values(array_filter($jobs, static fn($job): bool => is_array($job)));
    usort($jobs, static function (array $a, array $b): int {
        return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
    });
    return array_map(static function (array $job): array {
        $job['files'] = array_map(static function (array $item): array {
            return [
                'id'       => $item['id'] ?? '',
                'title'    => $item['title'] ?? '',
                'filename' => $item['filename'] ?? '',
                'bytes'    => (int)($item['bytes'] ?? 0),
                'ext'      => $item['ext'] ?? '',
            ];
        }, is_array($job['items'] ?? null) ? $job['items'] : []);
        unset($job['items']);
        return $job;
    }, $jobs);
}

/* ── Historial canonico ─────────────────────────────────────────────────── */

/**
 * Añade una entrada al historial canonico SIN pasar por history.php.
 *
 * Se hace aqui a proposito: el trabajo lo termina el worker, no el navegador,
 * asi que si el historial dependiera del frontend se perderia con la pestaña
 * cerrada. El formato es identico al de `history.php` (mismo fichero y mismo
 * bloqueo), para que HistoryManager lo lea y lo borre con normalidad.
 */
function appendHistory(array $job, array $item): void {
    $dir = __DIR__ . '/' . HISTORY_DIR;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        return;
    }
    $lock = fopen(__DIR__ . '/' . HISTORY_LOCK, 'c+');
    if ($lock === false) {
        return;
    }
    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        return;
    }

    $file = __DIR__ . '/' . HISTORY_FILE;
    $history = [];
    if (is_file($file)) {
        $decoded = json_decode((string)@file_get_contents($file), true);
        if (is_array($decoded)) {
            $history = $decoded;
        }
    }

    $entry = [
        'id'        => 'h_' . ($item['id'] ?? bin2hex(random_bytes(8))),
        'app'       => APP_NAME,
        'type'      => ($job['mode'] ?? 'video') === 'audio' ? 'audio' : 'video',
        'model'     => '',
        'data'      => [
            'title'    => (string)($item['title'] ?? $item['filename'] ?? ''),
            'url'      => (string)($job['url'] ?? ''),
            'mode'     => (string)($job['mode'] ?? ''),
            'quality'  => (string)($job['quality'] ?? ''),
            'format'   => (string)($job['format'] ?? ''),
            'ext'      => (string)($item['ext'] ?? ''),
            'bytes'    => (int)($item['bytes'] ?? 0),
            'jobId'    => (string)($job['id'] ?? ''),
            'itemId'   => (string)($item['id'] ?? ''),
            'fileUrl'  => './api.php?action=download&item=' . rawurlencode((string)($item['id'] ?? '')),
        ],
        'createdAt' => nowIso(),
    ];

    $history = array_values(array_filter($history, static fn($existing): bool => ($existing['id'] ?? '') !== $entry['id']));
    array_unshift($history, $entry);
    while (count($history) > MAX_HISTORY) {
        array_pop($history);
    }
    @file_put_contents(
        $file,
        json_encode(array_values($history), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );

    flock($lock, LOCK_UN);
    fclose($lock);
}

/* ── Limpieza por caducidad ─────────────────────────────────────────────── */

function removeJobFiles(string $jobId): void {
    foreach ([FILES_DIR . '/' . $jobId, PARTS_DIR . '/' . $jobId] as $relative) {
        $dir = __DIR__ . '/' . $relative;
        if (!is_dir($dir)) {
            continue;
        }
        foreach ((array)@scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . '/' . $entry;
            if (is_dir($path)) {
                foreach ((array)@scandir($path) as $inner) {
                    if ($inner !== '.' && $inner !== '..') {
                        @unlink($path . '/' . $inner);
                    }
                }
                @rmdir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}

/** Borra ficheros y trabajos mas viejos que RETENTION_DAYS (con freno). */
function cleanupExpired(array &$queue): bool {
    $stamp = __DIR__ . '/' . CLEANUP_STAMP;
    $last = is_file($stamp) ? (int)@file_get_contents($stamp) : 0;
    if (time() - $last < CLEANUP_EVERY_S) {
        return false;
    }
    @file_put_contents($stamp, (string)time(), LOCK_EX);

    $limit = time() - RETENTION_DAYS * 86400;
    $kept = [];
    $changed = false;
    foreach ($queue['jobs'] as $job) {
        if (!is_array($job)) {
            continue;
        }
        $finished = (string)($job['finished_at'] ?? '');
        $stampTime = $finished !== '' ? (int)strtotime($finished) : (int)strtotime((string)($job['created_at'] ?? ''));
        $isFinal = in_array((string)($job['status'] ?? ''), ['done', 'error', 'cancelled'], true);
        if ($isFinal && $stampTime > 0 && $stampTime < $limit) {
            removeJobFiles((string)($job['id'] ?? ''));
            $changed = true;
            continue;
        }
        $kept[] = $job;
    }
    if ($changed) {
        $queue['jobs'] = $kept;
    }
    return $changed;
}

function humanBytes(int $bytes): string {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $value = (float)$bytes;
    $index = 0;
    while ($value >= 1024 && $index < count($units) - 1) {
        $value /= 1024;
        $index++;
    }
    return round($value, $index === 0 ? 0 : 1) . ' ' . $units[$index];
}

/* ── Arranque ───────────────────────────────────────────────────────────── */

ensureDirs();

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower((string)($_GET['action'] ?? ($_POST['action'] ?? '')));

// La accion tambien puede viajar dentro del JSON: es como la manda el worker.
if ($action === '') {
    $json = jsonBody();
    if (is_array($json) && isset($json['action'])) {
        $action = strtolower((string)$json['action']);
    }
}

if ($method === 'GET' && $action === 'download') {
    requireUser();
    $itemId = cleanId((string)($_GET['item'] ?? ''));
    if ($itemId === '') {
        respond(400, ['success' => false, 'error' => 'Falta el identificador del fichero.']);
    }
    $lock = lockFile(QUEUE_LOCK);
    flock($lock, LOCK_SH);
    $queue = loadQueue();
    flock($lock, LOCK_UN);
    fclose($lock);

    foreach ($queue['jobs'] as $job) {
        foreach ((array)($job['items'] ?? []) as $item) {
            if (($item['id'] ?? '') !== $itemId) {
                continue;
            }
            $path = __DIR__ . '/' . (string)($item['file'] ?? '');
            $real = realpath($path);
            $base = realpath(__DIR__ . '/' . FILES_DIR);
            if ($real === false || $base === false || strncmp($real, $base, strlen($base)) !== 0 || !is_file($real)) {
                respond(404, ['success' => false, 'error' => 'El fichero ya no esta disponible (caduca a los ' . RETENTION_DAYS . ' dias).']);
            }
            $filename = (string)($item['filename'] ?? basename($real));
            header('Content-Type: application/octet-stream');
            header('Content-Length: ' . (string)filesize($real));
            header('Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
            header('X-Content-Type-Options: nosniff');
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            readfile($real);
            exit;
        }
    }
    respond(404, ['success' => false, 'error' => 'Fichero no encontrado.']);
}

if ($method === 'GET' && $action === 'health') {
    $queue = loadQueue();
    $jobs = $queue['jobs'];
    $counts = ['queued' => 0, 'running' => 0, 'done' => 0, 'error' => 0, 'cancelled' => 0];
    foreach ($jobs as $job) {
        $status = (string)($job['status'] ?? 'queued');
        if (isset($counts[$status])) {
            $counts[$status]++;
        }
    }
    $worker = readJsonFile(WORKER_FILE, []);
    $free = @disk_free_space(__DIR__);
    respond(200, [
        'success'    => true,
        'app'        => APP_NAME,
        'version'    => APP_VERSION,
        'php'        => PHP_VERSION,
        'limits'     => [
            'upload_max_filesize' => (string)ini_get('upload_max_filesize'),
            'post_max_size'       => (string)ini_get('post_max_size'),
            'memory_limit'        => (string)ini_get('memory_limit'),
            'max_execution_time'  => (string)ini_get('max_execution_time'),
        ],
        'disk'       => [
            'free_bytes' => $free === false ? null : (int)$free,
            'free_human' => $free === false ? 'desconocido' : humanBytes((int)$free),
        ],
        'jobs'       => count($jobs),
        'counts'     => $counts,
        'retention_days' => RETENTION_DAYS,
        'worker'     => [
            'last_seen'   => (string)($worker['last_seen'] ?? ''),
            'seconds_ago' => isset($worker['time']) ? max(0, time() - (int)$worker['time']) : null,
            'version'     => (string)($worker['version'] ?? ''),
            'ytdlp'       => (string)($worker['ytdlp'] ?? ''),
        ],
    ]);
}

if ($method !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Metodo no permitido.']);
}

/* ── Acciones del worker (multipart o JSON) ─────────────────────────────── */

$workerActions = ['next', 'progress', 'upload_chunk', 'item_done', 'finish', 'fail', 'heartbeat'];
if (in_array($action, $workerActions, true)) {
    requireWorker();
    $lock = lockFile(QUEUE_LOCK);
    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo acceder a la cola.']);
    }
    $queue = loadQueue();
    cleanupExpired($queue);
    $body = $action === 'upload_chunk' ? $_POST : readJsonBody();

    if ($action === 'heartbeat') {
        writeJsonFile(WORKER_FILE, [
            'time'      => time(),
            'last_seen' => nowIso(),
            'version'   => substr((string)($body['version'] ?? ''), 0, 32),
            'ytdlp'     => substr((string)($body['ytdlp'] ?? ''), 0, 32),
            'worker'    => substr((string)($body['worker'] ?? ''), 0, 64),
        ]);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true]);
    }

    if ($action === 'next') {
        $now = time();
        $chosen = null;
        foreach ($queue['jobs'] as $index => $job) {
            $status = (string)($job['status'] ?? 'queued');
            $claimable = false;
            if ($status === 'queued') {
                $claimable = true;
            } elseif ($status === 'running') {
                $claimedAt = (int)strtotime((string)($job['claimed_at'] ?? ''));
                if ($claimedAt > 0 && $now - $claimedAt > STALE_RUNNING_S) {
                    $claimable = true; // el worker anterior murio: se reintenta
                }
            }
            if ($claimable && empty($job['cancel_requested'])) {
                $chosen = $index;
                break;
            }
        }
        if ($chosen === null) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(200, ['success' => true, 'job' => null]);
        }
        $queue['jobs'][$chosen]['status'] = 'running';
        $queue['jobs'][$chosen]['claimed_at'] = nowIso();
        $queue['jobs'][$chosen]['started_at'] = (string)($queue['jobs'][$chosen]['started_at'] ?? '') ?: nowIso();
        $queue['jobs'][$chosen]['updated_at'] = nowIso();
        $queue['jobs'][$chosen]['attempts'] = (int)($queue['jobs'][$chosen]['attempts'] ?? 0) + 1;
        $job = $queue['jobs'][$chosen];
        writeJsonFile(QUEUE_FILE, $queue);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, [
            'success' => true,
            'job'     => [
                'id'        => $job['id'],
                'url'       => $job['url'] ?? '',
                'mode'      => $job['mode'] ?? 'video',
                'quality'   => $job['quality'] ?? 'best',
                'format'    => $job['format'] ?? 'mp4',
                'playlist'  => (bool)($job['playlist'] ?? false),
                'attempts'  => (int)($job['attempts'] ?? 0),
            ],
        ]);
    }

    $jobId = cleanId((string)($body['job_id'] ?? ''));
    $index = $jobId !== '' ? findJob($queue, $jobId) : null;
    if ($index === null) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(404, ['success' => false, 'error' => 'Trabajo no encontrado.']);
    }
    $job = $queue['jobs'][$index];
    $cancelRequested = !empty($job['cancel_requested']);

    if ($action === 'progress') {
        $queue['jobs'][$index]['percent']    = max(0.0, min(100.0, (float)($body['percent'] ?? 0)));
        $queue['jobs'][$index]['speed']      = substr((string)($body['speed'] ?? ''), 0, 32);
        $queue['jobs'][$index]['eta']        = substr((string)($body['eta'] ?? ''), 0, 32);
        $queue['jobs'][$index]['stage']      = substr((string)($body['stage'] ?? ''), 0, 64);
        $queue['jobs'][$index]['title']      = substr((string)($body['title'] ?? ''), 0, 200);
        $queue['jobs'][$index]['item_index'] = (int)($body['item_index'] ?? 0);
        $queue['jobs'][$index]['item_count'] = (int)($body['item_count'] ?? 0);
        $queue['jobs'][$index]['updated_at'] = nowIso();
        writeJsonFile(QUEUE_FILE, $queue);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true, 'cancel' => $cancelRequested]);
    }

    if ($action === 'upload_chunk') {
        $itemIndex = (int)($body['item_index'] ?? 0);
        $chunkIndex = (int)($body['chunk_index'] ?? 0);
        $totalChunks = (int)($body['total_chunks'] ?? 1);
        if ($itemIndex < 0 || $itemIndex > 999 || $chunkIndex < 0 || $totalChunks < 1 || $chunkIndex >= $totalChunks) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(400, ['success' => false, 'error' => 'Numeracion de trozos invalida.']);
        }
        if (!isset($_FILES['chunk']) || !is_array($_FILES['chunk']) || ($_FILES['chunk']['error'] ?? 1) !== UPLOAD_ERR_OK) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(400, ['success' => false, 'error' => 'Falta el trozo o llego incompleto.']);
        }
        $size = (int)($_FILES['chunk']['size'] ?? 0);
        if ($size <= 0 || $size > MAX_CHUNK_BYTES) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(413, [
                'success' => false,
                'error'   => 'El trozo pesa ' . humanBytes($size) . ' y el maximo es '
                             . humanBytes(MAX_CHUNK_BYTES) . '. Baja "chunk_mb" en la configuracion del worker.',
            ]);
        }
        $dir = __DIR__ . '/' . PARTS_DIR . '/' . $jobId . '/' . $itemIndex;
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(500, ['success' => false, 'error' => 'No se pudo preparar el trozo.']);
        }
        $target = $dir . '/' . str_pad((string)$chunkIndex, 6, '0', STR_PAD_LEFT) . '.part';
        if (!move_uploaded_file((string)$_FILES['chunk']['tmp_name'], $target)) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(500, ['success' => false, 'error' => 'No se pudo guardar el trozo.']);
        }
        // El nombre y el total viajan en cada trozo para poder ensamblar sin estado.
        @file_put_contents($dir . '/_meta.json', json_encode([
            'filename'     => safeFilename((string)($body['filename'] ?? 'descarga')),
            'total_chunks' => $totalChunks,
        ], JSON_UNESCAPED_UNICODE), LOCK_EX);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true, 'chunk' => $chunkIndex]);
    }

    if ($action === 'item_done') {
        $itemIndex = (int)($body['item_index'] ?? 0);
        $dir = __DIR__ . '/' . PARTS_DIR . '/' . $jobId . '/' . $itemIndex;
        if (!is_dir($dir)) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(404, ['success' => false, 'error' => 'No hay trozos para ese elemento.']);
        }
        $meta = readJsonFile(PARTS_DIR . '/' . $jobId . '/' . $itemIndex . '/_meta.json', []);
        $filename = safeFilename((string)($body['filename'] ?? ($meta['filename'] ?? 'descarga')));
        $totalChunks = (int)($meta['total_chunks'] ?? 1);

        $itemId = 'i_' . bin2hex(random_bytes(8));
        $destDir = __DIR__ . '/' . FILES_DIR . '/' . $jobId;
        if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(500, ['success' => false, 'error' => 'No se pudo preparar el destino.']);
        }
        $relative = FILES_DIR . '/' . $jobId . '/' . $itemId . '_' . $filename;
        $out = fopen(__DIR__ . '/' . $relative, 'wb');
        if ($out === false) {
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(500, ['success' => false, 'error' => 'No se pudo crear el fichero final.']);
        }
        $written = 0;
        for ($i = 0; $i < $totalChunks; $i++) {
            $part = $dir . '/' . str_pad((string)$i, 6, '0', STR_PAD_LEFT) . '.part';
            if (!is_file($part)) {
                fclose($out);
                @unlink(__DIR__ . '/' . $relative);
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(409, ['success' => false, 'error' => 'Falta el trozo ' . $i . ' de ' . $totalChunks . '.']);
            }
            $in = fopen($part, 'rb');
            if ($in !== false) {
                $written += (int)stream_copy_to_stream($in, $out);
                fclose($in);
            }
        }
        fclose($out);

        if ($written > MAX_ITEM_BYTES) {
            @unlink(__DIR__ . '/' . $relative);
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(413, ['success' => false, 'error' => 'El fichero supera el maximo permitido.']);
        }

        // Limpieza de trozos ya ensamblados.
        foreach ((array)@scandir($dir) as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                @unlink($dir . '/' . $entry);
            }
        }
        @rmdir($dir);

        $item = [
            'id'         => $itemId,
            'title'      => substr((string)($body['title'] ?? pathinfo($filename, PATHINFO_FILENAME)), 0, 200),
            'filename'   => $filename,
            'bytes'      => $written,
            'ext'        => substr((string)($body['ext'] ?? pathinfo($filename, PATHINFO_EXTENSION)), 0, 10),
            'duration'   => (float)($body['duration'] ?? 0),
            'file'       => $relative,
            'created_at' => nowIso(),
        ];
        $items = is_array($queue['jobs'][$index]['items'] ?? null) ? $queue['jobs'][$index]['items'] : [];
        $items[] = $item;
        $queue['jobs'][$index]['items'] = $items;
        $queue['jobs'][$index]['updated_at'] = nowIso();
        writeJsonFile(QUEUE_FILE, $queue);
        appendHistory($job, $item);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true, 'item_id' => $itemId, 'bytes' => $written]);
    }

    if ($action === 'finish') {
        $items = is_array($job['items'] ?? null) ? $job['items'] : [];
        if ($items === []) {
            $queue['jobs'][$index]['status'] = 'error';
            $queue['jobs'][$index]['error'] = 'El worker termino sin subir ningun fichero.';
        } else {
            $queue['jobs'][$index]['status'] = 'done';
            $queue['jobs'][$index]['percent'] = 100.0;
            $queue['jobs'][$index]['stage'] = 'completado';
            $queue['jobs'][$index]['error'] = '';
        }
        $queue['jobs'][$index]['finished_at'] = nowIso();
        $queue['jobs'][$index]['updated_at'] = nowIso();
        $queue['jobs'][$index]['log_tail'] = substr((string)($body['log_tail'] ?? ''), -2000);
        writeJsonFile(QUEUE_FILE, $queue);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true]);
    }

    if ($action === 'fail') {
        $queue['jobs'][$index]['status'] = $cancelRequested ? 'cancelled' : 'error';
        $queue['jobs'][$index]['error'] = substr((string)($body['error'] ?? 'Error desconocido.'), 0, 500);
        $queue['jobs'][$index]['stage'] = '';
        $queue['jobs'][$index]['finished_at'] = nowIso();
        $queue['jobs'][$index]['updated_at'] = nowIso();
        $queue['jobs'][$index]['log_tail'] = substr((string)($body['log_tail'] ?? ''), -2000);
        writeJsonFile(QUEUE_FILE, $queue);
        removeJobFiles($jobId);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true]);
    }
}

/* ── Acciones del usuario ───────────────────────────────────────────────── */

requireUser();
$lock = lockFile(QUEUE_LOCK);
if (!flock($lock, LOCK_EX)) {
    fclose($lock);
    respond(500, ['success' => false, 'error' => 'No se pudo acceder a la cola.']);
}
$queue = loadQueue();
cleanupExpired($queue);
$body = readJsonBody();

if ($action === 'add') {
    $url = trim((string)($body['url'] ?? ''));
    if ($url === '' || strlen($url) > MAX_URL_LEN) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'Pega una direccion valida.']);
    }
    $parts = parse_url($url);
    if (!is_array($parts) || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http', 'https'], true) || empty($parts['host'])) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'La direccion debe empezar por http:// o https://']);
    }

    $mode = strtolower((string)($body['mode'] ?? 'video'));
    $mode = in_array($mode, ['video', 'audio'], true) ? $mode : 'video';

    $quality = strtolower((string)($body['quality'] ?? 'best'));
    $qualities = $mode === 'audio' ? ['best'] : ['best', '2160', '1440', '1080', '720', '480', '360'];
    if (!in_array($quality, $qualities, true)) {
        $quality = 'best';
    }

    $format = strtolower((string)($body['format'] ?? ($mode === 'audio' ? 'mp3' : 'mp4')));
    $formats = $mode === 'audio' ? ['mp3', 'm4a'] : ['mp4', 'mkv', 'webm'];
    if (!in_array($format, $formats, true)) {
        $format = $mode === 'audio' ? 'mp3' : 'mp4';
    }

    $pending = 0;
    foreach ($queue['jobs'] as $job) {
        if (in_array((string)($job['status'] ?? ''), ['queued', 'running'], true)) {
            $pending++;
        }
    }
    if ($pending >= 20) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(429, ['success' => false, 'error' => 'Hay 20 descargas en cola: espera a que terminen.']);
    }

    $job = [
        'id'               => 'j_' . bin2hex(random_bytes(8)),
        'url'              => $url,
        'mode'             => $mode,
        'quality'          => $quality,
        'format'           => $format,
        'playlist'         => !empty($body['playlist']),
        'status'           => 'queued',
        'percent'          => 0.0,
        'speed'            => '',
        'eta'              => '',
        'stage'            => 'en cola',
        'title'            => '',
        'item_index'       => 0,
        'item_count'       => 0,
        'items'            => [],
        'error'            => '',
        'cancel_requested' => false,
        'attempts'         => 0,
        'created_at'       => nowIso(),
        'updated_at'       => nowIso(),
        'started_at'       => '',
        'finished_at'      => '',
    ];
    array_unshift($queue['jobs'], $job);
    while (count($queue['jobs']) > MAX_JOBS) {
        array_pop($queue['jobs']);
    }
    writeJsonFile(QUEUE_FILE, $queue);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'job' => publicJob($job)]);
}

if ($action === 'list') {
    $jobs = jobsForClient($queue['jobs']);
    if (cleanupExpired($queue)) {
        writeJsonFile(QUEUE_FILE, $queue);
    }
    $free = @disk_free_space(__DIR__);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, [
        'success'     => true,
        'jobs'        => $jobs,
        'server_time' => nowIso(),
        'disk_free'   => $free === false ? '' : humanBytes((int)$free),
    ]);
}

$jobId = cleanId((string)($body['job_id'] ?? $_GET['job_id'] ?? ''));

if ($action === 'status') {
    $index = $jobId !== '' ? findJob($queue, $jobId) : null;
    flock($lock, LOCK_UN);
    fclose($lock);
    if ($index === null) {
        respond(404, ['success' => false, 'error' => 'Trabajo no encontrado.']);
    }
    respond(200, ['success' => true, 'job' => jobsForClient([$queue['jobs'][$index]])[0]]);
}

if ($action === 'cancel') {
    $index = $jobId !== '' ? findJob($queue, $jobId) : null;
    if ($index === null) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(404, ['success' => false, 'error' => 'Trabajo no encontrado.']);
    }
    $queue['jobs'][$index]['cancel_requested'] = true;
    if (($queue['jobs'][$index]['status'] ?? '') === 'queued') {
        $queue['jobs'][$index]['status'] = 'cancelled';
        $queue['jobs'][$index]['finished_at'] = nowIso();
    }
    $queue['jobs'][$index]['updated_at'] = nowIso();
    writeJsonFile(QUEUE_FILE, $queue);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true]);
}

if ($action === 'delete') {
    $index = $jobId !== '' ? findJob($queue, $jobId) : null;
    if ($index === null) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(404, ['success' => false, 'error' => 'Trabajo no encontrado.']);
    }
    $status = (string)($queue['jobs'][$index]['status'] ?? '');
    if ($status === 'running') {
        $queue['jobs'][$index]['cancel_requested'] = true;
        writeJsonFile(QUEUE_FILE, $queue);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(409, ['success' => false, 'error' => 'Se esta descargando: se ha pedido cancelar. Borralo cuando pare.']);
    }
    $jobs = $queue['jobs'];
    unset($jobs[$index]);
    $queue['jobs'] = array_values($jobs);
    writeJsonFile(QUEUE_FILE, $queue);
    removeJobFiles($jobId);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true]);
}

flock($lock, LOCK_UN);
fclose($lock);
respond(400, [
    'success' => false,
    'error'   => 'Accion no valida.',
    'validActions' => ['health', 'add', 'list', 'status', 'cancel', 'delete', 'download',
                       'next', 'progress', 'upload_chunk', 'item_done', 'finish', 'fail', 'heartbeat'],
]);
