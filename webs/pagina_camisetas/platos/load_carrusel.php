<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Directorio donde se guardarán los JSON de los carruseles
$dataDir = __DIR__ . '/carrusel_data/';

// Obtener el nombre del diseño de la URL
$designName = isset($_GET['diseno']) ? basename($_GET['diseno']) : null; // Usar basename para seguridad

if (!$designName) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Nombre de diseño no especificado.']);
    exit;
}

// Construir la ruta del archivo JSON
$ruta_archivo = $dataDir . $designName . '_carrusel.json';

// Si el archivo no existe, devolver un objeto JSON vacío
if (!file_exists($ruta_archivo)) {
    // Creamos el directorio si no existe (importante para el primer guardado)
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0755, true)) {
            http_response_code(500); // Internal Server Error
            echo json_encode(['error' => "No se pudo crear el directorio de datos: $dataDir"]);
            exit;
        }
    }
    // Devolver un JSON vacío si el archivo no existe aún
    echo json_encode(new stdClass()); // Devuelve {}
    exit;
}

// Leer el contenido del archivo
$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => "No se pudo leer el archivo: $ruta_archivo"]);
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
        'error' => 'JSON inválido en el archivo del carrusel.',
        'json_error_message' => json_last_error_msg()
    ]);
    exit;
}

// Devolver los datos decodificados
echo json_encode($datos);
?>