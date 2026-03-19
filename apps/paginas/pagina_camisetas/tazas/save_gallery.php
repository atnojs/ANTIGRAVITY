<?php
// Habilitar reporte detallado de errores (útil durante el desarrollo)
// Considera desactivarlo en producción por seguridad
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// --- IMPORTANTE: Cambia esta contraseña (debe ser la misma que en validar_password.php) ---
$correctPassword = '1';
// ---------------------------------------------------------------------------------------

$ruta_archivo = __DIR__ . '/contenido_tazas.json';

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
// if (!isset($data['password']) || $data['password'] !== $correctPassword) {
   // http_response_code(403); // Forbidden
    //echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta']);
    //exit;
//}



// Verificar contraseña (¡IMPORTANTE HACERLO AQUÍ TAMBIÉN!)
// if (!isset($data['password']) || $data['password'] !== $correctPassword) {
//     http_response_code(403); // Forbidden
//     echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta']);
//     exit;
// }





// Validar estructura de datos esperada (solo necesitamos la parte 'content')
if (!isset($data['content']) || !is_array($data['content'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'Estructura de datos incorrecta. Se esperaba la clave "content" con un objeto.']);
    exit;
}

// Preparar el contenido para guardar (solo la parte 'content')
$contentToSave = $data['content'];

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
        // Intentar obtener más detalles del error si es posible
        $errorInfo = error_get_last();
        $errorMessage = "Error al escribir en el archivo '$ruta_archivo'";
        if ($errorInfo !== null) {
            $errorMessage .= " - " . $errorInfo['message'];
        }
        // Verificar permisos como posible causa
        if (file_exists($ruta_archivo) && !is_writable($ruta_archivo)) {
             $errorMessage .= ". El archivo existe pero no tiene permisos de escritura.";
        } elseif (!file_exists(dirname($ruta_archivo)) || !is_writable(dirname($ruta_archivo))) {
             $errorMessage .= ". El directorio no existe o no tiene permisos de escritura.";
        }
        throw new Exception($errorMessage);
    }

    // Intentar ajustar permisos (puede fallar dependiendo de la configuración del servidor)
    // Comentado por defecto, descomentar si es estrictamente necesario y se entiende el riesgo
    // @chmod($ruta_archivo, 0666);

    // Éxito
    echo json_encode([
        'success' => true,
        'message' => 'Contenido guardado correctamente en el servidor.',
        'bytes_written' => $bytes
    ]);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor al guardar.',
        'details' => $e->getMessage() // Mensaje detallado de la excepción
    ]);
}

exit;
?>
