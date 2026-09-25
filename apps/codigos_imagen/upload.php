<?php
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');

$maxBytes = 20 * 1024 * 1024;
$allowedMime = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];
$targetDir = __DIR__ . '/uploads';

if (!isset($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No se recibió ninguna imagen.']);
    exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Error al subir la imagen.']);
    exit;
}
if ($file['size'] > $maxBytes) {
    http_response_code(413);
    echo json_encode(['success' => false, 'error' => 'La imagen supera los 20 MB.']);
    exit;
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!isset($allowedMime[$mime])) {
    http_response_code(415);
    echo json_encode(['success' => false, 'error' => 'Formato de imagen no permitido.']);
    exit;
}

if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo preparar la carpeta de imágenes.']);
    exit;
}

$filename = 'prompt_' . bin2hex(random_bytes(8)) . '.' . $allowedMime[$mime];
$targetPath = $targetDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo guardar la imagen.']);
    exit;
}

echo json_encode(['success' => true, 'url' => 'uploads/' . $filename]);
?>
