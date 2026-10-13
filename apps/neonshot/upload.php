<?php
declare(strict_types=1);

/**
 * NeonShot — recepción de capturas.
 * Guarda la imagen en uploads/ (carpeta no versionada, protegida) y devuelve su URL pública.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_BYTES = 12 * 1024 * 1024;

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$dir = __DIR__ . '/uploads';
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    respond(500, ['ok' => false, 'error' => 'No se ha podido preparar la carpeta de subidas.']);
}

$guard = $dir . '/.htaccess';
if (!is_file($guard)) {
    @file_put_contents(
        $guard,
        "Options -Indexes -ExecCGI\n"
        . "AddType text/plain .php .phtml .phar .cgi .pl .py .sh\n"
        . "<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py|sh|html?)$\">\n  Require all denied\n</FilesMatch>\n"
    );
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Método no permitido. Usa POST con el campo «image».']);
}

$file = $_FILES['image'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    respond(400, ['ok' => false, 'error' => 'No se ha recibido ninguna imagen válida.']);
}

$size = (int) ($file['size'] ?? 0);
if ($size <= 0) {
    respond(400, ['ok' => false, 'error' => 'La imagen está vacía.']);
}
if ($size > MAX_BYTES) {
    respond(413, ['ok' => false, 'error' => 'La imagen supera el límite de 12 MB.']);
}

$info = @getimagesize($file['tmp_name']);
$allowed = [IMAGETYPE_PNG => 'png', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_WEBP => 'webp'];
if (!is_array($info) || !isset($allowed[$info[2]])) {
    respond(415, ['ok' => false, 'error' => 'Formato no admitido. Solo PNG, JPG o WEBP.']);
}

$ext = $allowed[$info[2]];
$name = date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
$dest = $dir . '/' . $name;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    respond(500, ['ok' => false, 'error' => 'No se ha podido guardar la imagen en el servidor.']);
}
@chmod($dest, 0644);

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$scheme = $isHttps ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');

respond(200, [
    'ok' => true,
    'url' => $scheme . '://' . $host . $base . '/uploads/' . $name,
    'file' => $name,
    'width' => (int) $info[0],
    'height' => (int) $info[1],
    'bytes' => $size,
    'format' => $ext,
]);
