<?php
declare(strict_types=1);

/**
 * Unified Image Studio — núcleo del servidor.
 *
 * Rutas privadas: storage/ (base de datos, originales, derivados y copias).
 * Claves: solo desde el entorno (SetEnv del .htaccess raíz de Hostinger).
 * No se leen ficheros de claves: si algo falla con 401, revisa el .htaccess.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

// Fichero interno: si se pide por HTTP directamente, no se sirve.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    http_response_code(404);
    exit;
}

const UIS_VERSION = '2.0.0-hoola';
const UIS_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UIS_MAX_JSON_BYTES = 32 * 1024 * 1024;
const UIS_MAX_DIMENSION = 8192;
const UIS_MAX_JOBS_PER_MINUTE = 12;

/* ── Respuestas ── */
function uis_json(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function uis_fail(int $status, string $message, array $extra = []): void
{
    uis_json($status, ['ok' => false, 'error' => $message] + $extra);
}

function uis_read_json(): array
{
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > UIS_MAX_JSON_BYTES) uis_fail(413, 'La solicitud supera el tamaño permitido.');
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) uis_fail(400, 'El cuerpo no contiene JSON válido.');
    return $data;
}

/* ── Entorno y claves ── */
function uis_env(string ...$names): string
{
    foreach ($names as $name) {
        foreach ([
            getenv($name), getenv('REDIRECT_' . $name),
            $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
            $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
        ] as $value) {
            if (is_string($value) && trim($value) !== '') return trim($value);
        }
    }
    return '';
}

/* ── Rutas ── */
function uis_root(): string
{
    return dirname(__DIR__);
}

function uis_storage(): string
{
    $custom = uis_env('UIS_STORAGE_DIR');
    $path = $custom !== '' ? $custom : uis_root() . '/storage';
    if (!is_dir($path)) {
        @mkdir($path, 0770, true);
    }
    return $path;
}

function uis_resource_dir(): string
{
    $path = uis_storage() . '/resources';
    if (!is_dir($path)) @mkdir($path, 0770, true);
    return $path;
}

/* ── Base de datos (SQLite) ── */
function uis_db(): PDO
{
    static $db = null;
    if ($db instanceof PDO) return $db;
    if (!extension_loaded('pdo_sqlite')) {
        uis_fail(503, 'SQLite no está disponible en este servidor. Activa pdo_sqlite o usa un almacenamiento compatible.');
    }
    $file = uis_storage() . '/studio.sqlite';
    $fresh = !is_file($file);
    try {
        $db = new PDO('sqlite:' . $file, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 15,
        ]);
    } catch (Throwable $error) {
        uis_fail(503, 'No se pudo abrir la base de datos. Revisa permisos de storage/.');
    }
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA foreign_keys = ON');
    if ($fresh) {
        uis_migrate($db);
        @chmod($file, 0660);
    } elseif ((int)$db->query('PRAGMA user_version')->fetchColumn() < 1) {
        uis_migrate($db);
    }
    return $db;
}

function uis_migrate(PDO $db): void
{
    $db->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_project ON versions(project_id);
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    filename TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    project_id TEXT,
    doc_id TEXT,
    doc_version INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT,
    provider_ref TEXT,
    result_file TEXT,
    error TEXT,
    cost_estimate REAL,
    cost_confirmed REAL,
    currency TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    project_id TEXT,
    kind TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_project ON ledger(project_id);
CREATE TABLE IF NOT EXISTS budgets (
    scope TEXT PRIMARY KEY,
    limit_amount REAL NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
SQL);
    $db->exec('PRAGMA user_version = 1');
}

/* ── Autenticación ──
   Usa el sistema centralizado del proyecto (`auth/lib.php`): la contraseña vive
   en el `.htaccess` raíz como PW_ACCESS / PW_EDIT (o sus *_SHA256), igual que
   las claves de API, y la sesión (`antigravity_auth`) es común a todas las apps. */
function uis_auth_lib(): bool
{
    static $ok = null;
    if ($ok !== null) return $ok;
    $lib = dirname(__DIR__, 3) . '/auth/lib.php';
    if (is_file($lib)) require_once $lib;
    $ok = function_exists('au_comprobar');
    return $ok;
}

function uis_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    // El hosting puede dejar session.save_path vacío o sin permisos de escritura:
    // sin una ruta escribible no hay sesión y todo responde 401.
    $current = (string)ini_get('session.save_path');
    if ($current === '' || !is_dir($current) || !is_writable($current)) {
        $candidates = [sys_get_temp_dir(), uis_storage() . '/sessions'];
        foreach ($candidates as $candidate) {
            if ($candidate === '') continue;
            if (!is_dir($candidate)) @mkdir($candidate, 0770, true);
            if (is_dir($candidate) && is_writable($candidate)) {
                @ini_set('session.save_path', $candidate);
                break;
            }
        }
    }

    // Con la librería común manda su cookie (antigravity_auth), compartida con
    // el resto de apps: entrar en una es entrar en todas.
    if (uis_auth_lib()) {
        au_sesion();
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
    session_name('UISSESSID');
    @session_start();
}

/** ¿Hay contraseña configurada en el servidor (PW_ACCESS/PW_EDIT o UIS_*)? */
function uis_password_configured(): bool
{
    if (uis_auth_lib() && (au_configurada('acceso') || au_configurada('edicion'))) {
        return true;
    }
    return uis_env('UIS_PASSWORD_HASH', 'UIS_PASSWORD') !== '';
}

/** Tipo de contraseña que manda para entrar: PW_ACCESS y, si no existe, PW_EDIT. */
function uis_auth_tipo(): string
{
    if (!uis_auth_lib()) return '';
    return au_configurada('acceso') ? 'acceso' : (au_configurada('edicion') ? 'edicion' : '');
}

/** Acepta la contraseña de acceso del proyecto (o la de edición si no hay PW_ACCESS). */
function uis_check_password(string $password): bool
{
    if ($password === '') return false;

    if (uis_auth_lib()) {
        $tipo = uis_auth_tipo();
        if ($tipo !== '' && au_comprobar($tipo, $password)) {
            return true;
        }
    }

    // Alternativa para instalaciones sueltas, sin la librería del proyecto.
    $hash = uis_env('UIS_PASSWORD_HASH');
    if ($hash !== '') {
        if (str_starts_with($hash, '$2') || str_starts_with($hash, '$argon')) {
            return password_verify($password, $hash);
        }
        return hash_equals($hash, $password);
    }
    $plain = uis_env('UIS_PASSWORD');
    return $plain !== '' && hash_equals($plain, $password);
}

function uis_authenticated(): bool
{
    uis_session_start();

    $tipo = uis_auth_lib() ? uis_auth_tipo() : '';
    if ($tipo !== '' && au_sesion_ok($tipo)) {
        return true;
    }

    // Sesión propia (instalación sin la librería común).
    if (empty($_SESSION['uis_auth'])) return false;
    $seen = (int)($_SESSION['uis_seen'] ?? 0);
    if ($seen > 0 && (time() - $seen) > 60 * 60 * 12) {
        $_SESSION = [];
        session_destroy();
        return false;
    }
    $_SESSION['uis_seen'] = time();
    return true;
}

/** Marca la sesión al acertar: la común del proyecto si hay PW_*, si no la local. */
function uis_mark_authenticated(): void
{
    uis_session_start();
    $tipo = uis_auth_lib() ? uis_auth_tipo() : '';
    if ($tipo !== '') {
        au_marcar($tipo);
        return;
    }
    $_SESSION['uis_auth'] = true;
    $_SESSION['uis_seen'] = time();
}

function uis_logout(): void
{
    uis_session_start();
    if (uis_auth_lib()) {
        au_cerrar_sesion('acceso');
        au_cerrar_sesion('edicion');
    }
    $_SESSION = [];
    session_destroy();
}

function uis_require_auth(): void
{
    if (uis_authenticated()) return;
    uis_fail(401, 'Sesión no autorizada. Inicia sesión para continuar.', ['needsLogin' => true]);
}

function uis_client_ip(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function uis_rate_limited(PDO $db, string $scope = 'auth'): bool
{
    $ip = uis_client_ip();
    if ($scope === 'auth') {
        $count = (int)$db->query(
            'SELECT COUNT(*) FROM auth_failures WHERE ip = ' . $db->quote($ip) . ' AND created_at > ' . (time() - 600)
        )->fetchColumn();
        return $count >= 8;
    }
    return false;
}

function uis_register_failure(PDO $db): void
{
    $stmt = $db->prepare('INSERT INTO auth_failures (ip, created_at) VALUES (?, ?)');
    $stmt->execute([uis_client_ip(), time()]);
    $db->exec('DELETE FROM auth_failures WHERE created_at < ' . (time() - 86400));
}

/* ── Verificación de imágenes ── */
function uis_decode_image(string $value): array
{
    $value = trim($value);
    if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $value, $match) === 1) {
        $value = substr($value, strpos($value, ',') + 1);
    }
    $binary = base64_decode($value, true);
    if ($binary === false || $binary === '') {
        throw new InvalidArgumentException('La imagen no contiene base64 válido.', 400);
    }
    if (strlen($binary) > UIS_MAX_UPLOAD_BYTES) {
        throw new LengthException('La imagen supera 20 MB.', 413);
    }
    $info = @getimagesizefromstring($binary);
    if (!is_array($info)) {
        throw new InvalidArgumentException('El archivo no es una imagen válida.', 400);
    }
    $mime = match (true) {
        str_contains((string)($info['mime'] ?? ''), 'png') => 'image/png',
        str_contains((string)($info['mime'] ?? ''), 'jpeg') => 'image/jpeg',
        str_contains((string)($info['mime'] ?? ''), 'webp') => 'image/webp',
        default => (string)($info['mime'] ?? ''),
    };
    if (!in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
        throw new InvalidArgumentException('Solo se admiten PNG, JPG y WebP.', 400);
    }
    if ((int)$info[0] > UIS_MAX_DIMENSION || (int)$info[1] > UIS_MAX_DIMENSION) {
        throw new LengthException('La imagen supera 8192 px de lado.', 413);
    }
    return ['binary' => $binary, 'mime' => $mime, 'width' => (int)$info[0], 'height' => (int)$info[1]];
}

function uis_safe_id(string $id): bool
{
    return preg_match('/^[A-Za-z0-9_-]{6,80}$/', $id) === 1;
}

/** Convierte "8M"/"512K"/"1G" del php.ini a bytes (0 = sin límite). */
function uis_ini_bytes(string $value): int
{
    $value = trim($value);
    if ($value === '' || $value === '-1') return 0;
    $unit = strtolower(substr($value, -1));
    $number = (float)$value;
    return match ($unit) {
        'g' => (int)($number * 1024 * 1024 * 1024),
        'm' => (int)($number * 1024 * 1024),
        'k' => (int)($number * 1024),
        default => (int)$number,
    };
}

/** Tamaño máximo de imagen que el servidor acepta, descontando el base64 del JSON. */
function uis_max_image_bytes(): int
{
    $post = uis_ini_bytes((string)ini_get('post_max_size'));
    $hard = UIS_MAX_UPLOAD_BYTES;
    $limit = $post > 0 ? min($post, $hard) : $hard;
    // El JSON viaja en base64: ~1,37 veces el tamaño real + cabeceras.
    return max(262144, (int)floor($limit / 1.4));
}

function uis_write_file(string $path, string $binary): void
{
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $binary) === false) {
        throw new RuntimeException('No se pudo escribir el archivo en storage/.', 500);
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('No se pudo guardar el archivo en storage/.', 500);
    }
}

/* ── Precios y catálogo ── */
function uis_pricing(): array
{
    $json = uis_env('UIS_PRICING_JSON');
    $data = [];
    if ($json !== '') {
        $decoded = json_decode($json, true);
        if (is_array($decoded)) $data = $decoded;
    } else {
        $file = uis_storage() . '/pricing.json';
        if (is_file($file)) {
            $raw = (string)file_get_contents($file);
            // El BOM de algunos editores rompe json_decode.
            $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $data = $decoded;
        }
    }
    return $data;
}

function uis_catalog(): array
{
    if (!function_exists('ag_image_catalog')) {
        $file = uis_root() . '/lib/canonical-image-model.php';
        if (is_file($file)) require_once $file;
    }
    return function_exists('ag_image_catalog') ? ag_image_catalog() : [];
}

/* ── Comprobación de presupuesto en servidor ── */
function uis_spent(PDO $db, ?string $projectId): array
{
    // project_id IS ? compara también con NULL (project_id = NULL nunca casa).
    $stmt = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM ledger WHERE project_id IS ?');
    $stmt->execute([$projectId]);
    $project = (float)$stmt->fetchColumn();

    // Ventana de 24 h: la app es de un solo administrador, no hay sesiones concurrentes.
    $stmt = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM ledger WHERE created_at >= ?');
    $stmt->execute([time() - 86400]);
    $session = (float)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COALESCE(SUM(cost_estimate),0) FROM jobs WHERE status IN ('queued','running') AND project_id IS ?");
    $stmt->execute([$projectId]);
    $pending = (float)$stmt->fetchColumn();

    return ['project' => $project, 'session' => $session, 'pending' => $pending];
}

function uis_budget(PDO $db, string $scope, float $default): float
{
    $stmt = $db->prepare('SELECT limit_amount FROM budgets WHERE scope = ?');
    $stmt->execute([$scope]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : (float)$value;
}

function uis_check_budget(PDO $db, ?string $projectId, ?float $estimate): array
{
    if ($estimate === null) {
        return ['known' => false];
    }
    $spent = uis_spent($db, $projectId);
    $sessionLimit = uis_budget($db, 'session', 5.0);
    $projectLimit = uis_budget($db, 'project:' . ($projectId ?? 'null'), 20.0);
    $operationLimit = uis_budget($db, 'operation', 1.5);

    if ($estimate > $operationLimit) {
        return ['ok' => false, 'reason' => 'operation', 'message' => sprintf('La operación cuesta más que el límite por operación (%.2f €).', $operationLimit)];
    }
    if (($spent['session'] + $spent['pending'] + $estimate) > $sessionLimit) {
        return ['ok' => false, 'reason' => 'session', 'message' => sprintf('Se superaría el presupuesto de la sesión (%.2f €).', $sessionLimit)];
    }
    if (($spent['project'] + $spent['pending'] + $estimate) > $projectLimit) {
        return ['ok' => false, 'reason' => 'project', 'message' => sprintf('Se superaría el presupuesto del proyecto (%.2f €).', $projectLimit)];
    }
    return ['ok' => true, 'sessionSpent' => $spent['session'], 'sessionLimit' => $sessionLimit, 'projectSpent' => $spent['project'], 'projectLimit' => $projectLimit];
}

function uis_public_job(array $row): array
{
    $job = [
        'id' => $row['id'],
        'status' => $row['status'],
        'kind' => $row['kind'],
        'model' => $row['model'],
        'provider' => $row['provider'],
        'createdAt' => (int)$row['created_at'],
        'updatedAt' => (int)$row['updated_at'],
        'cost' => $row['cost_confirmed'] !== null ? (float)$row['cost_confirmed'] : null,
        'costEstimate' => $row['cost_estimate'] !== null ? (float)$row['cost_estimate'] : null,
        'costKind' => $row['cost_confirmed'] !== null ? 'confirmado' : 'estimado',
    ];
    if ($row['error'] !== null && $row['error'] !== '') $job['error'] = (string)$row['error'];
    if (($row['status'] ?? '') === 'succeeded' && !empty($row['result_file'])) {
        $path = uis_resource_dir() . '/' . basename((string)$row['result_file']);
        if (is_file($path)) {
            $job['image'] = base64_encode((string)file_get_contents($path));
            $job['mimeType'] = 'image/png';
        }
    }
    return $job;
}
