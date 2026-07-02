<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/contenido.json';

if (!file_exists($ruta_archivo)) {
    echo json_encode(new stdClass());
    exit;
}

$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo leer el archivo contenido.json']);
    exit;
}

if (empty(trim($contenido))) {
    echo json_encode(new stdClass());
    exit;
}

$datos = json_decode($contenido, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode(['error' => 'JSON inválido', 'json_error_message' => json_last_error_msg()]);
    exit;
}

echo json_encode($datos);
