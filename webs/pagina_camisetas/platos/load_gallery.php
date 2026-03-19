<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/contenido_platos.json';

// Si el archivo no existe, devolver un objeto JSON vacío
if (!file_exists($ruta_archivo)) {
    echo json_encode(new stdClass()); // Devuelve {} en lugar de [] o null
    exit;
}

// Leer el contenido del archivo
$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'No se pudo leer el archivo contenido_tazas.json']);
    exit;
}

// Si el archivo está vacío, devolver un objeto JSON vacío
if (empty(trim($contenido))) {
     echo json_encode(new stdClass()); // Devuelve {}
     exit;
}

// Decodificar el JSON
$datos = json_decode($contenido, true); // true para obtener un array asociativo

// Comprobar si hubo error en la decodificación
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'error' => 'JSON inválido en contenido_web.json',
        'json_error_message' => json_last_error_msg()
    ]);
    exit;
}

// Devolver los datos decodificados
echo json_encode($datos);
?>
