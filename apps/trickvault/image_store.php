<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$cookiePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/') . '/';
session_name('trickvault_edit_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookiePath,
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 12 * 1024 * 1024;

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
    return ensureDirectory('image_data', 'No se pudo preparar el registro de imágenes.');
}

function uploadsDir(): string {
    return ensureDirectory('uploads', 'No se pudo preparar la carpeta de imágenes.');
}

function mappingFile(): string {
    return dataDir() . '/images.json';
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

function loadImages(): array {
    $path = mappingFile();
    if (!is_file($path)) return [];
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function saveImages(array $images): void {
    $json = json_encode($images, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(mappingFile(), $json, LOCK_EX) === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo actualizar el registro de imágenes.']);
    }
}

function localImagePath(string $url): ?string {
    if (preg_match('#^uploads/([a-zA-Z0-9_.-]+)$#', $url, $matches) !== 1) return null;
    return uploadsDir() . '/' . $matches[1];
}

function compressToTarget(string $binary, int $targetBytes): array {
    // Devuelve [binary, extension] con la imagen recomprimida a <= targetBytes.
    // Si GD no está disponible o la imagen no se puede procesar, devuelve [null, null]
    // para guardar la original sin romper el flujo.
    if (!function_exists('imagecreatefromstring')) return [null, null];

    $img = @imagecreatefromstring($binary);
    if ($img === false) return [null, null];

    $width = imagesx($img);
    $height = imagesy($img);
    if ($width < 1 || $height < 1) { imagedestroy($img); return [null, null]; }

    // Guarda de memoria: no decodificar imágenes enormes.
    if (($width * $height * 4) > 48000000) { imagedestroy($img); return [null, null]; }

    $webpAvailable = function_exists('imagewebp');
    $ext = $webpAvailable ? 'webp' : 'jpg';
    $candidates = [];

    $encode = function ($im, int $quality) use ($webpAvailable): string {
        ob_start();
        if ($webpAvailable) { imagewebp($im, null, $quality); } else { imagejpeg($im, null, $quality); }
        $data = (string)ob_get_clean();
        return $data;
    };

    $tries = [
        [1200, [78, 70, 62, 55, 48, 42, 36]],
        [960,  [52, 45, 38, 32]],
        [768,  [45, 38, 32, 28]],
        [614,  [38, 32, 28, 24]],
    ];

    foreach ($tries as [$maxSide, $qualities]) {
        $scale = min(1, $maxSide / max($width, $height));
        $nw = max(1, (int)round($width * $scale));
        $nh = max(1, (int)round($height * $scale));
        $resized = imagecreatetruecolor($nw, $nh);
        if ($resized === false) continue;
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $width, $height);
        $width = $nw; $height = $nh;
        imagedestroy($img);
        $img = $resized;
        foreach ($qualities as $quality) {
            $data = $encode($img, $quality);
            if ($data === '') continue;
            if (strlen($data) <= $targetBytes) {
                imagedestroy($img);
                return [$data, $ext];
            }
            $candidates[] = $data;
        }
    }

    imagedestroy($img);

    // Mejor esfuerzo: devolver el candidato más ligero aunque supere el objetivo.
    $best = null;
    foreach ($candidates as $data) {
        if ($best === null || strlen($data) < strlen($best)) $best = $data;
    }
    return $best !== null ? [$best, $ext] : [null, null];
}

function requireEditSession(): void {
    $authenticated = ($_SESSION['trickvault_edit'] ?? false) === true;
    $authenticatedAt = (int)($_SESSION['trickvault_edit_at'] ?? 0);
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
    $lock = fopen(dataDir() . '/images.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_SH)) {
        if ($lock !== false) fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo consultar el registro de imágenes.']);
    }
    $images = loadImages();
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'images' => (object)$images]);
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

$lock = fopen(dataDir() . '/images.lock', 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) {
    if ($lock !== false) fclose($lock);
    respond(500, ['success' => false, 'error' => 'No se pudo bloquear el registro de imágenes.']);
}

$images = loadImages();

if ($action === 'save') {
    $dataUrl = (string)($_POST['imageData'] ?? '');
    if ($dataUrl === '' || strlen($dataUrl) > MAX_DATA_URL_CHARS) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(413, ['success' => false, 'error' => 'La imagen está vacía o supera el tamaño permitido.']);
    }
    if (preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#is', $dataUrl, $matches) !== 1) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'El archivo no contiene una imagen válida.']);
    }

    $binary = base64_decode($matches[2], true);
    $imageInfo = $binary !== false ? @getimagesizefromstring($binary) : false;
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    $mime = is_array($imageInfo) ? (string)($imageInfo['mime'] ?? '') : '';
    if ($binary === false || strlen($binary) > MAX_IMAGE_BYTES || !isset($allowed[$mime])) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(415, ['success' => false, 'error' => 'La imagen no es válida o supera los 8 MB.']);
    }

    $compressed = compressToTarget($binary, 60 * 1024);
    $extension = $allowed[$mime];
    if ($compressed[0] !== null) {
        $binary = $compressed[0];
        $extension = $compressed[1];
    }

    $filename = 'example_' . $trickId . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
    $path = uploadsDir() . '/' . $filename;
    if (file_put_contents($path, $binary, LOCK_EX) === false) {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(500, ['success' => false, 'error' => 'No se pudo guardar la imagen en Hostinger.']);
    }

    $previousPath = isset($images[$trickId]) ? localImagePath((string)$images[$trickId]) : null;
    $url = 'uploads/' . $filename;
    $images[$trickId] = $url;
    saveImages($images);
    if ($previousPath !== null && $previousPath !== $path && is_file($previousPath)) {
        @unlink($previousPath);
    }

    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $trickId, 'url' => $url]);
}

if ($action === 'delete') {
    $previousPath = isset($images[$trickId]) ? localImagePath((string)$images[$trickId]) : null;
    unset($images[$trickId]);
    saveImages($images);
    if ($previousPath !== null && is_file($previousPath)) {
        @unlink($previousPath);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'id' => $trickId]);
}

flock($lock, LOCK_UN);
fclose($lock);
respond(400, ['success' => false, 'error' => 'Acción no válida.']);
