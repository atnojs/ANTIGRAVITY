<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$cookiePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/') . '/';
session_name('videovault_edit_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookiePath,
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sanitizeId(string $value): string {
    $clean = preg_replace('/[^a-zA-Z0-9_-]/', '', $value) ?? '';
    return substr($clean, 0, 120);
}

function ensureDirectory(string $name, string $error): string {
    $directory = __DIR__ . '/' . $name;
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        respond(500, ['success' => false, 'error' => $error]);
    }
    return $directory;
}

function dataDir(): string {
    return ensureDirectory('video_data', 'No se pudo preparar el registro de vídeos.');
}

function uploadsDir(): string {
    return ensureDirectory('uploads/videos', 'No se pudo preparar la carpeta de vídeos.');
}

function mappingFile(): string {
    return dataDir() . '/videos.json';
}

function favoritesFile(): string {
    return dataDir() . '/favorites.json';
}

function loadFavorites(): array {
    $path = favoritesFile();
    if (!is_file($path)) return [];
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
}

function loadVideos(): array {
    $path = mappingFile();
    if (!is_file($path)) return [];
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function saveVideos(array $videos): void {
    $json = json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(mappingFile(), $json, LOCK_EX) === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo actualizar el registro de vídeos.']);
    }
}

function localVideoPath(string $url): ?string {
    if (preg_match('#^uploads/videos/([a-zA-Z0-9_.-]+)$#', $url, $matches) !== 1) return null;
    return uploadsDir() . '/' . $matches[1];
}

/**
 * Migración automática de subidas legacy (upload_video.php):
 * archivos con formato <command_id>_<hash>.<ext> en uploads/videos/
 * que aún no estén registrados en videos.json.
 */
function scanLegacyVideos(array $videos): array {
    $dir = uploadsDir();
    if (!is_dir($dir)) return $videos;
    $entries = scandir($dir);
    if ($entries === false) return $videos;
    $changed = false;
    foreach ($entries as $file) {
        if ($file === '.' || $file === '..') continue;
        // Los archivos del sistema nuevo ('example_<id>_<hash>.ext') no son legacy.
        if (strpos($file, 'example_') === 0) continue;
        if (preg_match('/^([a-zA-Z0-9_-]+)_[0-9a-f]+\.(mp4|webm|mov|avi|mkv|ogv|gif)$/i', $file, $matches) === 1) {
            $id = $matches[1];
            if (!isset($videos[$id])) {
                $videos[$id] = 'uploads/videos/' . $file;
                $changed = true;
            }
        }
    }
    if ($changed) saveVideos($videos);
    return $videos;
}

function requireEditSession(): void {
    $authenticated = ($_SESSION['videovault_edit'] ?? false) === true;
    $authenticatedAt = (int)($_SESSION['videovault_edit_at'] ?? 0);
    if (!$authenticated || $authenticatedAt < time() - 7200) {
        $_SESSION = [];
        respond(403, ['success' => false, 'error' => 'La sesión de edición ha caducado.']);
    }
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = strtolower((string)($_GET['action'] ?? ($method === 'GET' ? 'list' : '')));

if ($method === 'GET' && $action === 'list') {
    $lock = fopen(dataDir() . '/videos.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_SH)) {
        if ($lock !== false) fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo consultar el registro de vídeos.']);
    }
    $videos = loadVideos();
    $videos = scanLegacyVideos($videos);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'videos' => (object)$videos]);
}

// Favoritos: lectura pública y guardado sin sesión (lista saneada de ids).
if ($method === 'POST' && $action === 'fav_delete') {
    $path = favoritesFile();
    if (is_file($path)) @unlink($path);
    respond(200, ['success' => true, 'exists' => false]);
}

if ($method === 'GET' && $action === 'fav_list') {
    $ids = loadFavorites();
    respond(200, ['success' => true, 'exists' => is_file(favoritesFile()), 'ids' => $ids]);
}

if ($method === 'POST' && $action === 'fav_save') {
    $raw = (string)($_POST['ids'] ?? '');
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        respond(400, ['success' => false, 'error' => 'Lista de favoritos no válida.']);
    }
    $clean = [];
    foreach ($decoded as $id) {
        if (!is_string($id)) continue;
        $safe = sanitizeId($id);
        if ($safe === '' || in_array($safe, $clean, true) || count($clean) >= 500) continue;
        $clean[] = $safe;
    }
    $lock = fopen(dataDir() . '/favorites.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if ($lock !== false) fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo bloquear el registro de favoritos.']);
    }
    $written = file_put_contents(favoritesFile(), json_encode($clean, JSON_UNESCAPED_UNICODE), LOCK_EX);
    flock($lock, LOCK_UN);
    fclose($lock);
    if ($written === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo guardar la lista de favoritos.']);
    }
    respond(200, ['success' => true, 'ids' => $clean]);
}

if ($method !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

requireEditSession();
$trickId = sanitizeId((string)($_POST['trickId'] ?? ''));
if ($trickId === '') {
    respond(400, ['success' => false, 'error' => 'Falta el identificador de la tarjeta.']);
}

$lock = fopen(dataDir() . '/videos.lock', 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) {
    if ($lock !== false) fclose($lock);
    respond(500, ['success' => false, 'error' => 'No se pudo bloquear el registro de vídeos.']);
}

$videos = loadVideos();

if ($action === 'save') {
    $file = $_FILES['video'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'El vídeo está vacío o no se recibió correctamente.']);
    }
    if ((int)($file['size'] ?? 0) > MAX_VIDEO_BYTES) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(413, ['success' => false, 'error' => 'El vídeo supera los 100 MB.']);
    }

    // Tipos MIME admitidos: vídeos comunes + GIF animado (como la app anterior).
    $allowed = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
        'video/x-msvideo' => 'avi',
        'video/x-matroska' => 'mkv',
        'video/ogg' => 'ogv',
        'image/gif' => 'gif',
    ];

    $mime = '';
    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath !== '' && is_file($tmpPath) && function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $mime = (string)finfo_file($finfo, $tmpPath);
            finfo_close($finfo);
        }
    }
    if ($mime === '' && function_exists('mime_content_type')) {
        $mime = (string)@mime_content_type($tmpPath);
    }
    if ($mime === '' || $mime === 'application/octet-stream') {
        $extension = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
        $byExtension = ['mp4' => 'video/mp4', 'webm' => 'video/webm', 'mov' => 'video/quicktime', 'avi' => 'video/x-msvideo', 'mkv' => 'video/x-matroska', 'ogv' => 'video/ogg', 'gif' => 'image/gif'];
        $mime = $byExtension[$extension] ?? '';
    }

    if (!isset($allowed[$mime])) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(415, ['success' => false, 'error' => 'El archivo no es un vídeo válido o supera los 100 MB.']);
    }

    $extension = $allowed[$mime];
    $filename = 'example_' . $trickId . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
    $path = uploadsDir() . '/' . $filename;
    if (!move_uploaded_file($tmpPath, $path)) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo guardar el vídeo en Hostinger.']);
    }

    $previousPath = isset($videos[$trickId]) ? localVideoPath((string)$videos[$trickId]) : null;
    $url = 'uploads/videos/' . $filename;
    $videos[$trickId] = $url;
    saveVideos($videos);
    if ($previousPath !== null && $previousPath !== $path && is_file($previousPath)) {
        @unlink($previousPath);
    }

    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $trickId, 'url' => $url]);
}

if ($action === 'delete') {
    $previousPath = isset($videos[$trickId]) ? localVideoPath((string)$videos[$trickId]) : null;
    unset($videos[$trickId]);
    saveVideos($videos);
    if ($previousPath !== null && is_file($previousPath)) {
        @unlink($previousPath);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $trickId]);
}

// Quita SOLO la entrada del registro (sin borrar el archivo). Útil para
// limpiar claves duplicadas/ruido que compartan archivo con una tarjeta real.
if ($action === 'clean_key') {
    unset($videos[$trickId]);
    saveVideos($videos);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $trickId]);
}

flock($lock, LOCK_UN);
fclose($lock);
respond(400, ['success' => false, 'error' => 'Acción no válida.']);
