<?php
/**
 * Bóveda Privada — API de almacenamiento server-side (Hostinger / PHP 8+)
 *
 * MODELO ZERO-KNOWLEDGE:
 *  - El servidor SOLO guarda datos cifrados (blobs) + un JSON de metadatos que
 *    contiene las claves ENVUELTAS (wrapped) y el índice de carpetas/archivos
 *    también cifrado. Nunca ve contraseñas ni contenido en claro.
 *  - La autorización de escritura se hace con `dekHash` (SHA-256 de la clave de
 *    datos DEK). Solo quien conoce una contraseña válida puede derivar la DEK y,
 *    por tanto, producir el hash correcto. Así nadie ajeno puede borrar/sobrescribir.
 *  - Los blobs viven en vault_data/blobs/ con un .htaccess "deny all": no son
 *    accesibles por URL directa; solo este proxy los sirve.
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_out(array $arr, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function dataDir(): string {
    $d = __DIR__ . '/vault_data';
    if (!is_dir($d)) { mkdir($d, 0755, true); }
    // Blindaje de la carpeta de datos (oculta ante acceso directo por URL)
    $h = $d . '/.htaccess';
    if (!file_exists($h)) {
        @file_put_contents($h, "Require all denied\nOptions -Indexes\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    }
    return $d;
}

function blobDir(): string {
    $d = dataDir() . '/blobs';
    if (!is_dir($d)) { mkdir($d, 0755, true); }
    return $d;
}

function metaFile(): string { return dataDir() . '/vault.json'; }

function loadMeta(): ?array {
    $f = metaFile();
    if (!file_exists($f)) return null;
    $d = json_decode((string)file_get_contents($f), true);
    return is_array($d) ? $d : null;
}

function saveMeta(array $m): void {
    file_put_contents(metaFile(), json_encode($m, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function sanitizeId(string $id): string {
    return preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
}

function requireAuth(?array $meta, string $auth): void {
    if ($meta === null) { json_out(['success' => false, 'error' => 'La bóveda no está inicializada.'], 400); }
    $stored = (string)($meta['dekHash'] ?? '');
    if ($stored === '' || !hash_equals($stored, $auth)) {
        json_out(['success' => false, 'error' => 'No autorizado.'], 401);
    }
}

function bytesFromIni(string $v): int {
    $v = trim($v);
    if ($v === '') return 0;
    $unit = strtolower(substr($v, -1));
    $num = (float)$v;
    switch ($unit) {
        case 'g': $num *= 1024 * 1024 * 1024; break;
        case 'm': $num *= 1024 * 1024; break;
        case 'k': $num *= 1024; break;
    }
    return (int)$num;
}

function effectiveLimit(): array {
    $up = bytesFromIni((string)ini_get('upload_max_filesize'));
    $post = bytesFromIni((string)ini_get('post_max_size'));
    $cands = array_filter([$up, $post], fn($x) => $x > 0);
    $eff = $cands ? min($cands) : 0;
    return ['upload' => $up, 'post' => $post, 'effective' => $eff];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = (string)($_GET['action'] ?? '');
$body = null;

if ($method === 'POST') {
    $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($ctype, 'application/json') !== false) {
        $raw = file_get_contents('php://input') ?: '';
        $body = json_decode($raw, true);
        if (is_array($body) && isset($body['action'])) { $action = (string)$body['action']; }
    } else {
        $action = (string)($_POST['action'] ?? $action);
    }
}

/* ---------- GET: metadatos de la bóveda + límites ---------- */
if ($method === 'GET' && $action === 'meta') {
    $meta = loadMeta();
    $limits = effectiveLimit();
    if ($meta === null) {
        json_out(['success' => true, 'exists' => false, 'limits' => $limits]);
    }
    json_out(['success' => true, 'exists' => true, 'meta' => $meta, 'limits' => $limits]);
}

/* ---------- GET: descargar blob cifrado (solo con auth) ---------- */
if ($method === 'GET' && $action === 'blob') {
    $meta = loadMeta();
    requireAuth($meta, (string)($_GET['auth'] ?? ''));
    $id = sanitizeId((string)($_GET['id'] ?? ''));
    $path = blobDir() . '/' . $id . '.bin';
    if ($id === '' || !is_file($path)) { json_out(['success' => false, 'error' => 'Archivo no encontrado.'], 404); }
    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: no-store');
    readfile($path);
    exit;
}

/* ---------- POST setup: crear la bóveda por primera vez ---------- */
if ($method === 'POST' && $action === 'setup') {
    if (loadMeta() !== null) { json_out(['success' => false, 'error' => 'La bóveda ya existe.'], 409); }
    $meta = $body['meta'] ?? null;
    if (!is_array($meta) || empty($meta['dekHash'])) { json_out(['success' => false, 'error' => 'Datos de bóveda inválidos.'], 400); }
    blobDir(); // crea carpeta + .htaccess
    saveMeta($meta);
    json_out(['success' => true]);
}

/* ---------- POST save_meta: actualizar índice cifrado ---------- */
if ($method === 'POST' && $action === 'save_meta') {
    $meta = loadMeta();
    requireAuth($meta, (string)($body['auth'] ?? ''));
    $new = $body['meta'] ?? null;
    if (!is_array($new) || empty($new['dekHash'])) { json_out(['success' => false, 'error' => 'Datos inválidos.'], 400); }
    // La DEK (y por tanto su hash) no puede cambiar por esta vía: protege el acceso.
    if (!hash_equals((string)$meta['dekHash'], (string)$new['dekHash'])) {
        json_out(['success' => false, 'error' => 'No se permite alterar las claves de acceso.'], 403);
    }
    saveMeta($new);
    json_out(['success' => true]);
}

/* ---------- POST put_blob: subir blob cifrado (multipart) ---------- */
if ($method === 'POST' && $action === 'put_blob') {
    $meta = loadMeta();
    requireAuth($meta, (string)($_POST['auth'] ?? ''));
    $id = sanitizeId((string)($_POST['id'] ?? ''));
    if ($id === '') { json_out(['success' => false, 'error' => 'Falta el identificador.'], 400); }
    if (!isset($_FILES['blob'])) { json_out(['success' => false, 'error' => 'No se recibió el archivo (¿supera el límite del servidor?).'], 400); }
    $f = $_FILES['blob'];
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $msg = $f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE
            ? 'El archivo supera el tamaño máximo permitido por el servidor.'
            : 'Error de subida (código ' . (int)$f['error'] . ').';
        json_out(['success' => false, 'error' => $msg], 400);
    }
    $dest = blobDir() . '/' . $id . '.bin';
    if (!move_uploaded_file($f['tmp_name'], $dest)) { json_out(['success' => false, 'error' => 'No se pudo guardar el archivo.'], 500); }
    json_out(['success' => true, 'size' => filesize($dest)]);
}

/* ---------- POST delete_blob: borrar un blob ---------- */
if ($method === 'POST' && $action === 'delete_blob') {
    $meta = loadMeta();
    requireAuth($meta, (string)($body['auth'] ?? ''));
    $id = sanitizeId((string)($body['id'] ?? ''));
    $path = blobDir() . '/' . $id . '.bin';
    if ($id !== '' && is_file($path)) { @unlink($path); }
    json_out(['success' => true]);
}

/* ---------- POST reset: destruir la bóveda completa ---------- */
if ($method === 'POST' && $action === 'reset') {
    $meta = loadMeta();
    requireAuth($meta, (string)($body['auth'] ?? ''));
    foreach (glob(blobDir() . '/*.bin') ?: [] as $b) { @unlink($b); }
    if (is_file(metaFile())) { @unlink(metaFile()); }
    json_out(['success' => true]);
}

json_out(['success' => false, 'error' => 'Acción no válida.'], 400);
