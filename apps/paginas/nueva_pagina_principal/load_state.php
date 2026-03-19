<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/estado_sitio.json';

if (!file_exists($ruta_archivo)) {
    echo json_encode([
        'background' => '',
        'columns' => []
    ]);
    exit;
}

$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo leer el archivo']);
    exit;
}

$datos = json_decode($contenido, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'error' => 'JSON inválido en estado_sitio.json',
        'detalles' => json_last_error_msg()
    ]);
    exit;
}

echo json_encode($datos);
?>