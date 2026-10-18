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
/** Carpeta de descarga del PC: la actual, la pedida y el error si fallo. */
const DIR_FILE       = 'data/dir.json';
const BUSQUEDAS_FILE = 'data/busquedas.json';
const BUSQUEDAS_LOCK = 'data/busquedas.lock';
const MAX_RESULTADOS = 12;
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
/**
 * Lo que un fichero vive en el servidor antes de borrarse solo. Antonio lo
 * queria corto: la idea es bajarlo al movil y que no se acumule.
 */
const RETENTION_HOURS  = 48;
const STALE_RUNNING_S  = 900;   // 15 min sin senales => el trabajo se puede reclamar
const MAX_AUTO_REINTENTOS = 3;  // reintentos automaticos antes de darse por vencido
const ESPERAS_REINTENTO = [30, 120, 300]; // segundos entre reintentos
const CLEANUP_EVERY_S  = 300;

const APP_NAME     = 'descargas';
const APP_VERSION  = '1.1.0';

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

/**
 * Recorta sin depender de mbstring.
 *
 * `mbstring` es una extension OPCIONAL: en un hosting compartido puede no
 * estar. Si falta, `mb_substr` revienta con un fatal y se cae la peticion
 * entera (paso de verdad en el banco de pruebas local). Sin ella se corta por
 * bytes y se quita el caracter UTF-8 que haya quedado partido.
 */
function recortarUtf8(string $texto, int $max): string {
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $max);
    }
    $corte = substr($texto, 0, $max);
    $corte = preg_replace('/[\x80-\xBF]+$/', '', $corte) ?? $corte;
    $corte = preg_replace('/[\xC0-\xFF]$/', '', $corte) ?? $corte;
    return $corte;
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
    $longitud = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
    if ($longitud > 150) {
        $extension = pathinfo($name, PATHINFO_EXTENSION);
        $base = pathinfo($name, PATHINFO_FILENAME);
        $name = recortarUtf8($base, 130) . ($extension !== '' ? '.' . $extension : '');
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

/* ── Origen del trabajo: en casa o fuera ────────────────────────────────── */

/** IP real del cliente (Hostinger sirve detras de proxy). */
function clientIp(): string {
    $forwarded = (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
    if ($forwarded !== '') {
        $primera = trim(explode(',', $forwarded)[0]);
        if ($primera !== '') {
            return $primera;
        }
    }
    return (string)($_SERVER['REMOTE_ADDR'] ?? '');
}

/**
 * ¿Este trabajo se ha pedido desde la misma conexion que el PC?
 *
 * Se compara la IP del navegador con la del ultimo latido del worker: si
 * coinciden, Antonio esta en casa y NO hace falta subir el fichero (se queda en
 * su carpeta, como la .bat). Sin datos del worker se asume "fuera", que sube:
 * perder una descarga pedida desde el movil es peor que subir de mas.
 */
/**
 * Normaliza una IP para poder comparar dos visitas de la MISMA conexion.
 *
 * El mismo abonado puede salir por IPv4 o por IPv6 segun el navegador, y una
 * IPv4 puede llegar mapeada como `::ffff:1.2.3.4`. Para IPv6 se compara el
 * prefijo /64, que es lo que asigna el operador a una linea.
 */
function normalizaIp(string $ip): string {
    $ip = strtolower(trim($ip));
    if ($ip === '') {
        return '';
    }
    if (strpos($ip, '::ffff:') === 0) {
        $ip = substr($ip, 7);
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $partes = explode(':', $ip);
        return implode(':', array_slice($partes, 0, 4));
    }
    return $ip;
}
function origenDelTrabajo(): string {
    $worker = readJsonFile(WORKER_FILE, []);
    $ipWorker = (string)($worker['ip'] ?? '');
    $ipCliente = clientIp();
    if ($ipWorker === '' || $ipCliente === '') {
        return 'fuera';
    }
    return normalizaIp($ipWorker) === normalizaIp($ipCliente) ? 'casa' : 'fuera';
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
    $job['fuente'] = (string)($job['fuente'] ?? 'youtube');
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
                'id'         => $item['id'] ?? '',
                'title'      => $item['title'] ?? '',
                'filename'   => $item['filename'] ?? '',
                'bytes'      => (int)($item['bytes'] ?? 0),
                'ext'        => $item['ext'] ?? '',
                // Un fichero "local" no esta en el servidor: vive en el PC y no
                // se puede descargar desde la web.
                'local'      => !empty($item['local']),
                'ruta_local' => (string)($item['ruta_local'] ?? ''),
                'subir_pedido' => !empty($item['subir_pedido']),
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
            'local'    => !empty($item['local']),
            // Sin copia en el servidor no hay enlace de descarga: el fichero
            // esta en el PC de Antonio y ahi se queda.
            'fileUrl'  => !empty($item['local'])
                ? ''
                : './api.php?action=download&item=' . rawurlencode((string)($item['id'] ?? '')),
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

/** Borra ficheros y trabajos mas viejos que RETENTION_HOURS (con freno). */
function cleanupExpired(array &$queue): bool {
    $stamp = __DIR__ . '/' . CLEANUP_STAMP;
    $last = is_file($stamp) ? (int)@file_get_contents($stamp) : 0;
    if (time() - $last < CLEANUP_EVERY_S) {
        return false;
    }
    @file_put_contents($stamp, (string)time(), LOCK_EX);

    $limit = time() - RETENTION_HOURS * 3600;
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

/** IP enmascarada: para diagnosticar sin publicar la IP entera. */
function maskIp(string $ip): string {
    if ($ip === '') {
        return '';
    }
    if (strpos($ip, ':') !== false) {
        $partes = explode(':', $ip);
        return $partes[0] . ':' . ($partes[1] ?? '') . ':xxxx';
    }
    $partes = explode('.', $ip);
    if (count($partes) === 4) {
        return $partes[0] . '.' . $partes[1] . '.x.x';
    }
    return 'rara';
}

/**
 * Elementos que viven solo en el PC y el usuario ha pedido traer a la web.
 * El worker los sube cuando pregunta por trabajo.
 */
function subidasPendientes(array $queue): array {
    $pendientes = [];
    foreach ($queue['jobs'] as $job) {
        foreach ((array)($job['items'] ?? []) as $indice => $item) {
            if (empty($item['subir_pedido']) || empty($item['local'])) {
                continue;
            }
            $pendientes[] = [
                'job_id'      => (string)($job['id'] ?? ''),
                'item_id'     => (string)($item['id'] ?? ''),
                'item_index'  => (int)$indice + 1,
                'ruta_local'  => (string)($item['ruta_local'] ?? ''),
                'filename'    => (string)($item['filename'] ?? ''),
                'title'       => (string)($item['title'] ?? ''),
                'ext'         => (string)($item['ext'] ?? ''),
                'duration'    => (float)($item['duration'] ?? 0),
            ];
            if (count($pendientes) >= 3) {
                return $pendientes;
            }
        }
    }
    return $pendientes;
}

/** Al traer un fichero a la web hay que arreglar su ficha del historial. */
function marcarHistorialEnWeb(string $itemId, int $bytes): void {
    $file = __DIR__ . '/' . HISTORY_FILE;
    if (!is_file($file)) {
        return;
    }
    $lock = fopen(__DIR__ . '/' . HISTORY_LOCK, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if ($lock !== false) { fclose($lock); }
        return;
    }
    $history = json_decode((string)@file_get_contents($file), true);
    if (is_array($history)) {
        $cambiado = false;
        foreach ($history as $i => $entrada) {
            if ((string)($entrada['data']['itemId'] ?? '') !== $itemId) {
                continue;
            }
            $history[$i]['data']['local'] = false;
            $history[$i]['data']['bytes'] = $bytes;
            $history[$i]['data']['fileUrl'] = './api.php?action=download&item=' . rawurlencode($itemId);
            $cambiado = true;
        }
        if ($cambiado) {
            @file_put_contents($file, json_encode(array_values($history), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
    }
    flock($lock, LOCK_UN);
    fclose($lock);
}

/**
 * Reclama el pedido de abrir el explorador de carpetas. Es de un solo uso: se
 * atiende desde el sondeo (cada 5 s) o desde el latido, el que llegue antes,
 * para que el dialogo salga rapido al pulsar el boton.
 */
function reclamarDialogo(): bool {
    $estado = readJsonFile(DIR_FILE, []);
    if (empty($estado['dialog_pending'])) {
        return false;
    }
    $estado['dialog_pending'] = false;
    $estado['dialog_at'] = time();
    writeJsonFile(DIR_FILE, $estado);
    return true;
}

/**
 * Cierra trabajos que se quedaron en "running" sin dar senales (el worker se
 * reinicio, se apago el PC, se corto la luz...). Sin esto se quedan colgados
 * para siempre y el usuario no puede ni cancelarlos.
 */
function cerrarTrabajosColgados(array &$queue): int {
    $cerrados = 0;
    $limite = time() - 900; // 15 minutos sin progreso
    foreach ($queue['jobs'] as $i => $job) {
        if (($job['status'] ?? '') !== 'running') {
            continue;
        }
        $marca = (string)($job['updated_at'] ?? ($job['started_at'] ?? ''));
        $ts = $marca !== '' ? strtotime($marca) : false;
        if ($ts === false || $ts > $limite) {
            continue;
        }
        $queue['jobs'][$i]['status'] = 'error';
        $queue['jobs'][$i]['error'] = 'Se interrumpio (se reinicio el PC o el worker). Vuelve a pedirlo.';
        $queue['jobs'][$i]['finished_at'] = nowIso();
        $queue['jobs'][$i]['updated_at'] = nowIso();
        $cerrados++;
    }
    return $cerrados;
}

/* ── Buscar en YouTube (lo hace el worker con yt-dlp) ───────────────────── */

/**
 * La busqueda la ejecuta el PC, no el hosting: yt-dlp ya sabe buscar en YouTube
 * (`ytsearch10:consulta`) y no hace falta clave de API ni proxy que se lie con
 * los bloqueos de YouTube a las IPs de hosting compartido.
 */
function leerBusquedas(): array {
    $datos = readJsonFile(BUSQUEDAS_FILE, []);
    if (!is_array($datos) || !isset($datos['peticiones']) || !is_array($datos['peticiones'])) {
        return ['peticiones' => []];
    }
    // Caducan a los 10 minutos y no se guardan mas de 20.
    $ahora = time();
    $datos['peticiones'] = array_values(array_filter($datos['peticiones'], static function (array $p) use ($ahora): bool {
        return ($ahora - (int)($p['creada'] ?? 0)) < 600;
    }));
    if (count($datos['peticiones']) > 20) {
        $datos['peticiones'] = array_slice($datos['peticiones'], -20);
    }
    return $datos;
}

function guardarBusquedas(array $datos): void {
    writeJsonFile(BUSQUEDAS_FILE, $datos);
}

/** El worker pide las busquedas pendientes (y se marcan como en curso). */
function reclamarBusquedas(): array {
    $lock = lockFile(BUSQUEDAS_LOCK);
    if (!flock($lock, LOCK_EX)) {
        return [];
    }
    $datos = leerBusquedas();
    $pendientes = [];
    foreach ($datos['peticiones'] as $i => $peticion) {
        if (($peticion['estado'] ?? '') !== 'pendiente') {
            continue;
        }
        $datos['peticiones'][$i]['estado'] = 'en_curso';
        $pendientes[] = ['id' => (string)$peticion['id'], 'q' => (string)$peticion['q']];
        if (count($pendientes) >= 2) {
            break;
        }
    }
    if ($pendientes) {
        guardarBusquedas($datos);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    return $pendientes;
}

/** Carpeta de descarga del PC, tal y como la cuenta el worker. */
function dirInfo(): array {
    $worker = readJsonFile(WORKER_FILE, []);
    $estado = readJsonFile(DIR_FILE, []);
    return [
        'actual'    => (string)($worker['dir'] ?? ''),
        'unidades'  => is_array($worker['unidades'] ?? null) ? $worker['unidades'] : [],
        'pendiente' => (string)($estado['pending'] ?? ''),
        'error'     => (string)($estado['error'] ?? ''),
        // Hay un explorador de carpetas pedido y el worker aun no ha contestado.
        'dialogo'   => (int)($estado['dialog_at'] ?? 0) > 0
            && (time() - (int)$estado['dialog_at']) < 300,
    ];
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
                respond(404, ['success' => false, 'error' => 'El fichero ya no esta disponible (caduca a las ' . RETENTION_HOURS . ' horas).']);
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
        'retention_hours' => RETENTION_HOURS,
        'dir'        => dirInfo(),
        // Para poder responder a "¿por que cree que estoy fuera de casa?".
        'deteccion'  => [
            'worker'      => maskIp((string)(readJsonFile(WORKER_FILE, [])['ip'] ?? '')),
            'cliente'     => maskIp(clientIp()),
            'coinciden'   => origenDelTrabajo() === 'casa',
            'cabeceras'   => [
                'xff'         => isset($_SERVER['HTTP_X_FORWARDED_FOR']),
                'x_real_ip'   => isset($_SERVER['HTTP_X_REAL_IP']),
                'cf'          => isset($_SERVER['HTTP_CF_CONNECTING_IP']),
                'forwarded'   => isset($_SERVER['HTTP_FORWARDED']),
            ],
        ],
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

/* ── Aviso por WhatsApp (API oficial de Meta) ───────────────────────────── */

/**
 * Cuando una descarga termina, avisar al movil por WhatsApp.
 *
 * Se usa la Cloud API oficial de Meta (graph.facebook.com). El numero de prueba
 * gratuito sirve para mandarte mensajes a ti mismo; el texto libre solo llega
 * dentro de las 24 h siguientes a un mensaje tuyo al bot, asi que para que llegue
 * siempre hay que crear una plantilla ("utility") con una variable y poner su
 * nombre aqui. Los pasos estan en tools/descargador/whatsapp-LEEME.md.
 *
 * La configuracion vive en data/whatsapp.json (en el servidor, fuera de git).
 */
function configWhatsapp(): array {
    $ruta = __DIR__ . '/data/whatsapp.json';
    if (!is_file($ruta)) {
        return [];
    }
    $datos = json_decode((string)@file_get_contents($ruta), true);
    return is_array($datos) ? $datos : [];
}

function registrarLogWhatsapp(string $linea): void {
    $ruta = __DIR__ . '/data/whatsapp.log';
    @file_put_contents($ruta, '[' . nowIso() . '] ' . substr($linea, 0, 600) . "\n", FILE_APPEND | LOCK_EX);
    if (@filesize($ruta) > 131072) {
        @file_put_contents($ruta, '');
    }
}

/** Manda un WhatsApp al numero configurado. Devuelve ['ok'=>bool,'error'=>texto]. */
function enviarWhatsapp(string $texto): array {
    $cfg = configWhatsapp();
    if (empty($cfg['activo'])) {
        return ['ok' => false, 'error' => 'Los avisos por WhatsApp estan desactivados.'];
    }
    if (empty($cfg['token']) || empty($cfg['phone_number_id']) || empty($cfg['destinatario'])) {
        return ['ok' => false, 'error' => 'Falta el token, el phone_number_id o tu numero.'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'Este PHP no tiene cURL.'];
    }

    $destino = preg_replace('/[^0-9]/', '', (string)$cfg['destinatario']);
    $texto = substr($texto, 0, 900);
    if (!empty($cfg['plantilla'])) {
        $cuerpo = [
            'messaging_product' => 'whatsapp',
            'to'                => $destino,
            'type'              => 'template',
            'template'          => [
                'name'       => (string)$cfg['plantilla'],
                'language'   => ['code' => (string)($cfg['idioma_plantilla'] ?? 'es')],
                'components' => [[
                    'type'       => 'body',
                    'parameters' => [['type' => 'text', 'text' => $texto]],
                ]],
            ],
        ];
    } else {
        $cuerpo = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $destino,
            'type'              => 'text',
            'text'              => ['body' => $texto],
        ];
    }

    $url = 'https://graph.facebook.com/v23.0/' . rawurlencode((string)$cfg['phone_number_id']) . '/messages';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_POSTFIELDS     => json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . (string)$cfg['token'],
            'Content-Type: application/json',
        ],
    ]);
    $respuesta = (string)curl_exec($ch);
    $codigo = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errorCurl = curl_error($ch);
    curl_close($ch);

    if ($errorCurl !== '') {
        registrarLogWhatsapp('cURL: ' . $errorCurl);
        return ['ok' => false, 'error' => 'No se pudo conectar con Meta: ' . $errorCurl];
    }
    if ($codigo >= 200 && $codigo < 300) {
        registrarLogWhatsapp('OK ' . $codigo . ' ' . substr($respuesta, 0, 200));
        return ['ok' => true, 'error' => ''];
    }
    $detalle = substr($respuesta, 0, 400);
    registrarLogWhatsapp('HTTP ' . $codigo . ' ' . $detalle);
    $pista = '';
    if (strpos($respuesta, '131047') !== false) {
        $pista = ' (ha pasado mas de 24 h desde tu ultimo mensaje al bot: hace falta una plantilla aprobada; lee whatsapp-LEEME.md)';
    } elseif ($codigo === 401) {
        $pista = ' (token caducado o incorrecto: genera uno permanente con un System User)';
    }
    return ['ok' => false, 'error' => 'Meta respondio HTTP ' . $codigo . $pista . ' ' . $detalle];
}

/** Aviso al terminar un trabajo (solo si esta activado). Nunca rompe la cola. */
function avisarTrabajoTerminado(array $job): void {
    try {
        $cfg = configWhatsapp();
        if (empty($cfg['activo'])) {
            return;
        }
        $estado = (string)($job['status'] ?? '');
        if ($estado === 'done' && empty($cfg['avisar_fin'])) {
            return;
        }
        if ($estado !== 'done' && empty($cfg['avisar_errores'])) {
            return;
        }
        $titulo = (string)($job['title'] ?? '');
        if ($titulo === '') {
            $titulo = (string)($job['url'] ?? 'Descarga');
        }
        $titulo = recortarUtf8($titulo, 120);
        if ($estado === 'done') {
            $eraLocal = empty($job['subir']);
            $texto = $eraLocal
                ? 'Descarga lista en el PC: ' . $titulo
                : 'Descarga lista: ' . $titulo . ' — ya puedes bajarla desde la web';
        } else {
            $texto = 'No se pudo bajar: ' . $titulo . '. ' . recortarUtf8((string)($job['error'] ?? ''), 200);
        }
        enviarWhatsapp($texto);
    } catch (Throwable $e) {
        registrarLogWhatsapp('Excepcion: ' . $e->getMessage());
    }
}
/* ── Acciones del worker (multipart o JSON) ─────────────────────────────── */

$workerActions = ['next', 'progress', 'upload_chunk', 'search_results', 'item_done', 'item_local', 'finish', 'fail', 'heartbeat', 'dir_applied'];
if (in_array($action, $workerActions, true)) {
    requireWorker();
    $lock = lockFile(QUEUE_LOCK);
    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo acceder a la cola.']);
    }
    $queue = loadQueue();
    cleanupExpired($queue);
    if (cerrarTrabajosColgados($queue) > 0) {
        writeJsonFile(QUEUE_FILE, $queue);
    }
    $body = $action === 'upload_chunk' ? $_POST : readJsonBody();

    if ($action === 'heartbeat') {
        $unidades = [];
        if (is_array($body['unidades'] ?? null)) {
            foreach (array_slice($body['unidades'], 0, 26) as $u) {
                $unidades[] = substr((string)$u, 0, 8);
            }
        }
        writeJsonFile(WORKER_FILE, [
            'time'      => time(),
            'last_seen' => nowIso(),
            'version'   => substr((string)($body['version'] ?? ''), 0, 32),
            'ytdlp'     => substr((string)($body['ytdlp'] ?? ''), 0, 32),
            'worker'    => substr((string)($body['worker'] ?? ''), 0, 64),
            // La IP del PC sirve para saber si una peticion viene de casa.
            'ip'        => clientIp(),
            'dir'       => substr((string)($body['download_dir'] ?? ''), 0, 260),
            'unidades'  => $unidades,
        ]);
        $estadoDir = readJsonFile(DIR_FILE, []);
        $respuesta = ['success' => true];
        // El usuario ha pulsado «elegir carpeta»: el worker abre el explorador de
        // Windows. Se manda una sola vez (si el PC estaba apagado se descarta a
        // los 5 minutos, que es lo que mira dirInfo).
        if (reclamarDialogo()) {
            $respuesta['abrir_dialogo'] = true;
        }
        if (!empty($estadoDir['pending'])) {
            // El worker aplica el cambio y confirma con `dir_applied`.
            $respuesta['cambiar_dir'] = (string)$estadoDir['pending'];
        }
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, $respuesta);
    }

    if ($action === 'search_results') {
        $idBusqueda = cleanId((string)($body['id'] ?? ''));
        $resultados = [];
        foreach ((array)($body['resultados'] ?? []) as $r) {
            if (!is_array($r)) {
                continue;
            }
            $resultados[] = [
                'id'        => substr((string)($r['id'] ?? ''), 0, 24),
                'title'     => substr((string)($r['title'] ?? ''), 0, 200),
                'url'       => substr((string)($r['url'] ?? ''), 0, 300),
                'duration'  => (int)($r['duration'] ?? 0),
                'channel'   => substr((string)($r['channel'] ?? ''), 0, 120),
                'thumbnail' => substr((string)($r['thumbnail'] ?? ''), 0, 400),
            ];
            if (count($resultados) >= MAX_RESULTADOS) {
                break;
            }
        }
        $lockB = lockFile(BUSQUEDAS_LOCK);
        if (flock($lockB, LOCK_EX)) {
            $datos = leerBusquedas();
            foreach ($datos['peticiones'] as $i => $peticion) {
                if ((string)($peticion['id'] ?? '') !== $idBusqueda) {
                    continue;
                }
                $datos['peticiones'][$i]['estado'] = 'lista';
                $datos['peticiones'][$i]['resultados'] = $resultados;
                $datos['peticiones'][$i]['error'] = substr((string)($body['error'] ?? ''), 0, 300);
            }
            guardarBusquedas($datos);
            flock($lockB, LOCK_UN);
        }
        fclose($lockB);
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(200, ['success' => true]);
    }

    if ($action === 'dir_applied') {
        $estadoDir = readJsonFile(DIR_FILE, []);
        if (!empty($body['ok'])) {
            $rutaNueva = substr((string)($body['ruta'] ?? ''), 0, 260);
            $estadoDir['actual'] = $rutaNueva;
            $estadoDir['error'] = '';
            // Se refleja tambien en el latido para que la web muestre la carpeta
            // nueva al instante, sin esperar al siguiente heartbeat.
            $worker = readJsonFile(WORKER_FILE, []);
            if (is_array($worker)) {
                $worker['dir'] = $rutaNueva;
                writeJsonFile(WORKER_FILE, $worker);
            }
        } else {
            $estadoDir['error'] = substr((string)($body['error'] ?? 'No se pudo cambiar la carpeta.'), 0, 300);
        }
        $estadoDir['pending'] = '';
        $estadoDir['dialog_pending'] = false;
        unset($estadoDir['dialog_at']);
        $estadoDir['at'] = nowIso();
        writeJsonFile(DIR_FILE, $estadoDir);
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
                // Reintento automatico: hasta que no pase la espera no se vuelve a coger.
                $reintentoEn = (int)strtotime((string)($job['retry_at'] ?? ''));
                if ($reintentoEn > $now) {
                    continue;
                }
                $chosen = $index;
                break;
            }
        }
        if ($chosen === null) {
            // Sin trabajo que dar, pero puede haber «traer a la web» pendientes:
            // si no se devuelven aqui, el worker no se entera nunca (una cola
            // vacia es justo el caso normal).
            $subidas = subidasPendientes($queue);
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(200, ['success' => true, 'job' => null, 'subidas' => $subidas, 'abrir_dialogo' => reclamarDialogo(), 'busquedas' => reclamarBusquedas()]);
        }
        $queue['jobs'][$chosen]['status'] = 'running';
        $queue['jobs'][$chosen]['claimed_at'] = nowIso();
        $queue['jobs'][$chosen]['started_at'] = (string)($queue['jobs'][$chosen]['started_at'] ?? '') ?: nowIso();
        $queue['jobs'][$chosen]['updated_at'] = nowIso();
        $queue['jobs'][$chosen]['attempts'] = (int)($queue['jobs'][$chosen]['attempts'] ?? 0) + 1;
        unset($queue['jobs'][$chosen]['retry_at']);
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
                // Si es false, el worker se queda el fichero en el PC y NO lo sube.
                'subir'     => (bool)($job['subir'] ?? true),
                'origen'    => (string)($job['origen'] ?? 'fuera'),
            ],
            // Elementos que el usuario ha pedido traer a la web desde el PC.
            'subidas' => subidasPendientes($queue),
            // Y si toca abrir el explorador de carpetas, que salga ya (sondeo 5 s).
            'abrir_dialogo' => reclamarDialogo(),
            'busquedas' => reclamarBusquedas(),
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

    /**
     * Fichero que se queda SOLO en el PC: no hay copia en el servidor, asi que
     * no se sube nada. Se registra igual para que salga en la cola y en el
     * historial, con su ruta local, y para que el usuario sepa donde esta.
     */
    if ($action === 'item_local') {
        $item = [
            'id'         => 'i_' . bin2hex(random_bytes(8)),
            'title'      => substr((string)($body['title'] ?? pathinfo((string)($body['filename'] ?? ''), PATHINFO_FILENAME)), 0, 200),
            'filename'   => safeFilename((string)($body['filename'] ?? 'descarga')),
            'bytes'      => (int)($body['bytes'] ?? 0),
            'ext'        => substr((string)($body['ext'] ?? ''), 0, 10),
            'duration'   => (float)($body['duration'] ?? 0),
            'file'       => '',
            'local'      => true,
            'ruta_local' => substr((string)($body['ruta_local'] ?? ''), 0, 260),
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
        respond(200, ['success' => true, 'item_id' => $item['id']]);
    }

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

        // Si viene `item_id`, no es una descarga nueva: es un fichero que ya
        // estaba en el PC y el usuario ha pedido traer a la web. Se ACTUALIZA su
        // ficha en vez de crear otra, para no duplicar la entrada del historial.
        $itemIdExistente = cleanId((string)($body['item_id'] ?? ''));
        if ($itemIdExistente !== '') {
            $items = is_array($queue['jobs'][$index]['items'] ?? null) ? $queue['jobs'][$index]['items'] : [];
            $encontrado = false;
            foreach ($items as $k => $it) {
                if ((string)($it['id'] ?? '') !== $itemIdExistente) {
                    continue;
                }
                $items[$k]['file'] = $relative;
                $items[$k]['bytes'] = $written;
                $items[$k]['ext'] = substr((string)($body['ext'] ?? $it['ext'] ?? ''), 0, 10);
                $items[$k]['duration'] = (float)($body['duration'] ?? $it['duration'] ?? 0);
                $items[$k]['filename'] = $filename;
                $items[$k]['local'] = false;
                $items[$k]['subir_pedido'] = false;
                $encontrado = true;
                break;
            }
            if (!$encontrado) {
                @unlink(__DIR__ . '/' . $relative);
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(404, ['success' => false, 'error' => 'Ese elemento ya no existe en la cola.']);
            }
            $queue['jobs'][$index]['items'] = $items;
            $queue['jobs'][$index]['updated_at'] = nowIso();
            writeJsonFile(QUEUE_FILE, $queue);
            marcarHistorialEnWeb($itemIdExistente, $written);
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(200, ['success' => true, 'item_id' => $itemIdExistente, 'bytes' => $written, 'actualizado' => true]);
        }

        // Si viene `item_id`, no es una descarga nueva: es un fichero que ya
        // estaba en el PC y el usuario ha pedido traer a la web. Se ACTUALIZA su
        // ficha en vez de crear otra, para no duplicar la entrada del historial.
        $itemIdExistente = cleanId((string)($body['item_id'] ?? ''));
        if ($itemIdExistente !== '') {
            $items = is_array($queue['jobs'][$index]['items'] ?? null) ? $queue['jobs'][$index]['items'] : [];
            $encontrado = false;
            foreach ($items as $k => $it) {
                if ((string)($it['id'] ?? '') !== $itemIdExistente) {
                    continue;
                }
                $items[$k]['file'] = $relative;
                $items[$k]['bytes'] = $written;
                $items[$k]['ext'] = substr((string)($body['ext'] ?? $it['ext'] ?? ''), 0, 10);
                $items[$k]['duration'] = (float)($body['duration'] ?? $it['duration'] ?? 0);
                $items[$k]['filename'] = $filename;
                $items[$k]['local'] = false;
                $items[$k]['subir_pedido'] = false;
                $encontrado = true;
                break;
            }
            if (!$encontrado) {
                @unlink(__DIR__ . '/' . $relative);
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(404, ['success' => false, 'error' => 'Ese elemento ya no existe en la cola.']);
            }
            $queue['jobs'][$index]['items'] = $items;
            $queue['jobs'][$index]['updated_at'] = nowIso();
            writeJsonFile(QUEUE_FILE, $queue);
            marcarHistorialEnWeb($itemIdExistente, $written);
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(200, ['success' => true, 'item_id' => $itemIdExistente, 'bytes' => $written, 'actualizado' => true]);
        }

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
        $trabajoTerminado = $queue['jobs'][$index];
        flock($lock, LOCK_UN);
        fclose($lock);
        avisarTrabajoTerminado($trabajoTerminado);
        respond(200, ['success' => true]);
    }

    if ($action === 'fail') {
        $mensaje = substr((string)($body['error'] ?? 'Error desconocido.'), 0, 500);
        $intentos = (int)($queue['jobs'][$index]['attempts'] ?? 0);
        $temporal = !empty($body['reintentar']) && !$cancelRequested;
        if ($temporal && $intentos < MAX_AUTO_REINTENTOS) {
            // Reintento automatico con espera creciente: un 403 puntual o un corte
            // de red se arreglan solos en medio minuto sin que el usuario haga nada.
            $espera = ESPERAS_REINTENTO[min(max($intentos - 1, 0), count(ESPERAS_REINTENTO) - 1)];
            $queue['jobs'][$index]['status'] = 'queued';
            $queue['jobs'][$index]['error'] = $mensaje;
            $queue['jobs'][$index]['stage'] = 'reintentando';
            $queue['jobs'][$index]['retry_at'] = date('c', time() + (int)$espera);
            $queue['jobs'][$index]['finished_at'] = '';
            $queue['jobs'][$index]['updated_at'] = nowIso();
            $queue['jobs'][$index]['log_tail'] = substr((string)($body['log_tail'] ?? ''), -2000);
            writeJsonFile(QUEUE_FILE, $queue);
            removeJobFiles($jobId);
            flock($lock, LOCK_UN);
            fclose($lock);
            respond(200, ['success' => true, 'reintento' => $intentos + 1, 'espera' => $espera]);
        }
        $queue['jobs'][$index]['status'] = $cancelRequested ? 'cancelled' : 'error';
        $queue['jobs'][$index]['error'] = $mensaje;
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

    // De que red viene: se mira el dominio (asi da igual el boton que se pulse) y,
    // si no se reconoce, se usa el boton que haya elegido el usuario.
    $hostEnlace = strtolower((string)($parts['host'] ?? ''));
    if (preg_match('/(^|\.)instagram\.com$|(^|\.)instagr\.am$/', $hostEnlace)) {
        $fuente = 'instagram';
    } elseif (preg_match('/(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$/', $hostEnlace)) {
        $fuente = 'tiktok';
    } else {
        $pedida = strtolower((string)($body['fuente'] ?? 'youtube'));
        $fuente = in_array($pedida, ['youtube', 'instagram', 'tiktok'], true) ? $pedida : 'youtube';
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

    // En casa el fichero se queda en el PC (como la .bat) salvo que se pida lo
    // contrario; desde fuera se sube siempre, que es la razon de la app.
    // Si la pagina ha comprobado que se abre en el propio PC (hablandole al
    // worker por su puerto local), eso manda: es una senal directa, no una IP.
    // Dos senales independientes, y basta con que una diga 'casa':
    //  1) el navegador comprobo que se abre en el propio PC (puerto local).
    //  2) su IP coincide con la del worker (misma conexion).
    // El puerto local es mas fiable, pero Chrome 155 exige permiso al usuario
    // para que una pagina publica hable con 127.0.0.1, asi que la IP sigue
    // haciendo falta como red de seguridad.
    $origen = (!empty($body['en_casa']) || origenDelTrabajo() === 'casa') ? 'casa' : 'fuera';
    $subir = $origen === 'fuera' || !empty($body['subir_web']);

    $job = [
        'id'               => 'j_' . bin2hex(random_bytes(8)),
        'url'              => $url,
        'mode'             => $mode,
        'quality'          => $quality,
        'format'           => $format,
        'fuente'           => $fuente,
        'playlist'         => !empty($body['playlist']),
        // De donde se pidio y si hay que subirlo a la web o dejarlo en el PC.
        'origen'           => $origen,
        'subir'            => $subir,
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
        'dir'         => dirInfo(),
    ]);
}

/**
 * Cambia la carpeta donde el PC guarda las descargas (por ejemplo a un USB).
 * Aqui solo se deja apuntada la peticion: quien la aplica es el worker, que es
 * el unico que ve el sistema de ficheros del PC, y confirma con `dir_applied`.
 */
if ($action === 'set_dir') {
    $ruta = trim((string)($body['ruta'] ?? ''));
    if ($ruta === '' || strlen($ruta) > 240) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'Escribe una carpeta valida.']);
    }
    $esRutaWindows = preg_match('#^[A-Za-z]:[\\\\/]#', $ruta) === 1;
    $esUNC = strpos($ruta, '\\\\') === 0;
    if (!$esRutaWindows && !$esUNC) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'La carpeta tiene que ser una ruta completa del PC, por ejemplo D:\\Vídeos o F:\\']);
    }
    $estado = readJsonFile(DIR_FILE, []);
    $estado['pending'] = $ruta;
    $estado['error'] = '';
    $estado['at'] = nowIso();
    writeJsonFile(DIR_FILE, $estado);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'pendiente' => $ruta]);
}

$jobId = cleanId((string)($body['job_id'] ?? $_GET['job_id'] ?? ''));

/**
 * «Traer a la web»: marca un fichero que esta en el PC para que el worker lo
 * suba en la siguiente vuelta. Hoy, si se quedo en casa, no habia forma de
 * bajarlo desde el movil sin volver a pegar el enlace.
 */
/**
 * «Elegir carpeta»: pide al worker que abra el explorador de Windows para que
 * el usuario escoja la carpeta con el raton. El navegador no puede dar una ruta
 * real del PC, asi que el dialogo lo abre el worker.
 */
/**
 * Reintentar un trabajo que fallo o se cancelo. No hay que volver a pegar el
 * enlace: la URL, la calidad y el formato ya estan guardados en el propio trabajo.
 */
/**
 * Buscar en YouTube. La peticion se deja en una cola aparte y la resuelve el PC
 * con yt-dlp; el navegador pregunta hasta que hay resultados.
 */
if ($action === 'search') {
    $consulta = trim((string)($body['q'] ?? ''));
    if ($consulta === '' || strlen($consulta) > 120) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'Escribe que quieres buscar.']);
    }
    $idBusqueda = 'b_' . bin2hex(random_bytes(6));
    $lockB = lockFile(BUSQUEDAS_LOCK);
    if (flock($lockB, LOCK_EX)) {
        $datos = leerBusquedas();
        $datos['peticiones'][] = [
            'id'     => $idBusqueda,
            'q'      => $consulta,
            'estado' => 'pendiente',
            'creada' => time(),
        ];
        guardarBusquedas($datos);
        flock($lockB, LOCK_UN);
    }
    fclose($lockB);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $idBusqueda]);
}

if ($action === 'search_status') {
    $idBusqueda = cleanId((string)($body['id'] ?? ''));
    $lockB = lockFile(BUSQUEDAS_LOCK);
    $peticion = null;
    if (flock($lockB, LOCK_SH)) {
        $datos = leerBusquedas();
        foreach ($datos['peticiones'] as $p) {
            if ((string)($p['id'] ?? '') === $idBusqueda) {
                $peticion = $p;
                break;
            }
        }
        flock($lockB, LOCK_UN);
    }
    fclose($lockB);
    flock($lock, LOCK_UN);
    fclose($lock);
    if ($peticion === null) {
        respond(404, ['success' => false, 'error' => 'Busqueda no encontrada o caducada.']);
    }
    respond(200, [
        'success'    => true,
        'estado'     => (string)($peticion['estado'] ?? 'pendiente'),
        'resultados' => is_array($peticion['resultados'] ?? null) ? $peticion['resultados'] : [],
        'error'      => (string)($peticion['error'] ?? ''),
    ]);
}

/* ── Avisos por WhatsApp: estado, configuracion y prueba ─────────────────── */

if ($action === 'whatsapp_estado') {
    $cfg = configWhatsapp();
    $log = '';
    $rutaLog = __DIR__ . '/data/whatsapp.log';
    if (is_file($rutaLog)) {
        $log = (string)@file_get_contents($rutaLog);
        $log = implode("\n", array_slice(explode("\n", $log), -8));
    }
    $token = (string)($cfg['token'] ?? '');
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, [
        'success'          => true,
        'activo'           => !empty($cfg['activo']),
        'phone_number_id'  => (string)($cfg['phone_number_id'] ?? ''),
        'destinatario'     => (string)($cfg['destinatario'] ?? ''),
        'plantilla'        => (string)($cfg['plantilla'] ?? ''),
        'idioma_plantilla' => (string)($cfg['idioma_plantilla'] ?? 'es'),
        'avisar_fin'       => !isset($cfg['avisar_fin']) || !empty($cfg['avisar_fin']),
        'avisar_errores'   => !empty($cfg['avisar_errores']),
        // El token no se devuelve nunca: solo si hay uno guardado.
        'token_guardado'   => $token !== '',
        'token_pista'      => $token !== '' ? substr($token, 0, 6) . '…' . substr($token, -4) : '',
        'ultimo_log'       => trim($log),
    ]);
}

if ($action === 'whatsapp_config') {
    $cfg = configWhatsapp();
    $tokenNuevo = trim((string)($body['token'] ?? ''));
    if (!empty($body['borrar_token'])) {
        unset($cfg['token']);   // para poder borrarlo de verdad desde el panel
    } elseif ($tokenNuevo !== '') {
        $cfg['token'] = $tokenNuevo;
    }
    $cfg['phone_number_id']  = substr(trim((string)($body['phone_number_id'] ?? '')), 0, 60);
    $cfg['destinatario']     = substr(trim((string)($body['destinatario'] ?? '')), 0, 25);
    $cfg['plantilla']        = substr(trim((string)($body['plantilla'] ?? '')), 0, 60);
    $cfg['idioma_plantilla'] = substr(trim((string)($body['idioma_plantilla'] ?? 'es')), 0, 10) ?: 'es';
    $cfg['activo']           = !empty($body['activo']);
    $cfg['avisar_fin']       = !empty($body['avisar_fin']);
    $cfg['avisar_errores']   = !empty($body['avisar_errores']);
    $cfg['actualizado']      = nowIso();
    writeJsonFile('data/whatsapp.json', $cfg);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true]);
}

if ($action === 'whatsapp_test') {
    $resultado = enviarWhatsapp('Prueba de avisos de la app de descargas ✅');
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => $resultado['ok'], 'error' => $resultado['error']]);
}

if ($action === 'retry') {
    $jobId = cleanId((string)($body['job_id'] ?? ''));
    $index = $jobId !== '' ? findJob($queue, $jobId) : null;
    if ($index === null) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(404, ['success' => false, 'error' => 'Trabajo no encontrado.']);
    }
    $estado = (string)($queue['jobs'][$index]['status'] ?? '');
    if (!in_array($estado, ['error', 'cancelled'], true)) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(409, ['success' => false, 'error' => 'Ese trabajo no ha fallado; no hay que reintentarlo.']);
    }
    $queue['jobs'][$index]['status'] = 'queued';
    $queue['jobs'][$index]['error'] = '';
    $queue['jobs'][$index]['stage'] = 'en cola';
    $queue['jobs'][$index]['percent'] = 0;
    $queue['jobs'][$index]['speed'] = '';
    $queue['jobs'][$index]['eta'] = '';
    $queue['jobs'][$index]['attempts'] = 0;       // cuenta nueva
    $queue['jobs'][$index]['retry_at'] = '';
    $queue['jobs'][$index]['cancel_requested'] = false;
    $queue['jobs'][$index]['started_at'] = '';
    $queue['jobs'][$index]['claimed_at'] = '';
    $queue['jobs'][$index]['finished_at'] = '';
    $queue['jobs'][$index]['updated_at'] = nowIso();
    writeJsonFile(QUEUE_FILE, $queue);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'reintentado' => $jobId]);
}

if ($action === 'elegir_carpeta') {
    $estadoDir = readJsonFile(DIR_FILE, []);
    $estadoDir['dialog_pending'] = true;
    $estadoDir['dialog_at'] = 0;
    $estadoDir['error'] = '';
    writeJsonFile(DIR_FILE, $estadoDir);
    respond(200, ['success' => true]);
}

if ($action === 'subir_item') {
    $itemId = cleanId((string)($body['item_id'] ?? ''));
    $hecho = false;
    foreach ($queue['jobs'] as $j => $trabajo) {
        foreach ((array)($trabajo['items'] ?? []) as $k => $elemento) {
            if ((string)($elemento['id'] ?? '') !== $itemId) {
                continue;
            }
            if (empty($elemento['local']) || !empty($elemento['file'])) {
                flock($lock, LOCK_UN);
                fclose($lock);
                respond(409, ['success' => false, 'error' => 'Ese fichero ya esta en la web.']);
            }
            $queue['jobs'][$j]['items'][$k]['subir_pedido'] = true;
            $queue['jobs'][$j]['updated_at'] = nowIso();
            $hecho = true;
            break 2;
        }
    }
    if (!$hecho) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(404, ['success' => false, 'error' => 'Fichero no encontrado.']);
    }
    writeJsonFile(QUEUE_FILE, $queue);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'pedido' => $itemId]);
}

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
    'validActions' => ['health', 'add', 'list', 'status', 'cancel', 'delete', 'download', 'set_dir', 'subir_item', 'elegir_carpeta', 'retry', 'search', 'search_status', 'whatsapp_estado', 'whatsapp_config', 'whatsapp_test',
                       'next', 'progress', 'upload_chunk', 'search_results', 'item_done', 'item_local', 'finish', 'fail',
                       'heartbeat', 'dir_applied'],
]);
