<?php
header('Content-Type: application/json');

// --- IMPORTANTE: Cambia esta contraseña (debe ser la misma que en validar_password.php) ---
$correctPassword = '1';
// ---------------------------------------------------------------------------------------

// Directorio donde se guardarán los JSON de los carruseles
$dataDir = __DIR__ . '/carrusel_data/';

// Recibir datos JSON del cuerpo de la solicitud POST
$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
    exit;
}

// Decodificar los datos JSON
$data = json_decode($input, true); // true para obtener un array asociativo
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'JSON inválido recibido: ' . json_last_error_msg()]);
    exit;
}

// Verificar contraseña (¡IMPORTANTE HACERLO AQUÍ TAMBIÉN!)
// Se espera que el frontend envíe la contraseña en la estructura JSON
// if (!isset($data['password']) || $data['password'] !== $correctPassword) {
//     http_response_code(403); // Forbidden
//     echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta']);
//     exit;
// }

// Validar estructura de datos esperada
if (!isset($data['content']) || !is_array($data['content'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'Estructura de datos incorrecta. Se esperaba la clave "content" con un objeto.']);
    exit;
}

$contentToSave = $data['content'];
$designName = isset($data['designName']) ? basename($data['designName']) : null; // Obtener nombre del diseño para saber qué archivo usar

if (!$designName) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'Nombre de diseño no especificado para guardar.']);
    exit;
}

// Crear el directorio de datos si no existe
if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0755, true)) {
        http_response_code(500); // Internal Server Error
        echo json_encode(['success' => false, 'error' => "No se pudo crear el directorio de datos: $dataDir"]);
        exit;
    }
}

// Construir la ruta del archivo JSON
$ruta_archivo = $dataDir . $designName . '_carrusel.json';

// Guardar en archivo
try {
    // Codificar solo el contenido a JSON, con formato legible
    $contenidoJson = json_encode($contentToSave, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($contenidoJson === false) {
        throw new Exception('Error al codificar los datos a JSON: ' . json_last_error_msg());
    }

    // Escribir el contenido en el archivo (sobrescribe el archivo)
    $bytes = file_put_contents($ruta_archivo, $contenidoJson);

    if ($bytes === false) {
        $errorInfo = error_get_last();
        $errorMessage = "Error al escribir en el archivo '$ruta_archivo'";
        if ($errorInfo !== null) {
            $errorMessage .= " - " . $errorInfo['message'];
        }
        if (file_exists($ruta_archivo) && !is_writable($ruta_archivo)) {
            $errorMessage .= ". El archivo existe pero no tiene permisos de escritura.";
        } elseif (!file_exists(dirname($ruta_archivo)) || !is_writable(dirname($ruta_archivo))) {
            $errorMessage .= ". El directorio no existe o no tiene permisos de escritura.";
        }
        throw new Exception($errorMessage);
    }

    // Éxito
    echo json_encode([
        'success' => true,
        'message' => 'Contenido del carrusel guardado correctamente.',
        'bytes_written' => $bytes
    ]);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor al guardar el carrusel.',
        'details' => $e->getMessage() // Mensaje detallado de la excepción
    ]);
}

exit;
?>