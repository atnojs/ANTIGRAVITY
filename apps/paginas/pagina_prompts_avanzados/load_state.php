<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/estado_sitio.json';

if (!file_exists($ruta_archivo)) {
    // Si no existe, devolvemos un JSON con estructura básica
    echo json_encode([
        'background' => '',
        'mainTitle'  => 'TEXTO PRINCIPAL',
        'blockNavTitle' => 'LISTA DE BLOQUES',
        'blocks'     => [],
        'appsData'   => [],
        'folders'    => []
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

// Devolvemos el contenido del JSON tal cual
echo json_encode($datos);
