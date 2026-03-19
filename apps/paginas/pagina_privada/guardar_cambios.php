<?php
session_start(); // ¡PRIMERA LÍNEA!
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json'); // Establecer una sola vez al principio

$response_array = ['success' => false, 'error' => 'Error desconocido en el guardado']; // Respuesta por defecto

// 1. VERIFICAR AUTORIZACIÓN POR SESIÓN
if (!isset($_SESSION['modo_edicion_activo']) || $_SESSION['modo_edicion_activo'] !== true) {
    $response_array['error'] = 'No autorizado para guardar o sesión expirada';
    echo json_encode($response_array);
    exit;
}

// 2. RECIBIR Y DECODIFICAR DATOS JSON
$input_json = file_get_contents('php://input');
if (empty($input_json)) {
    $response_array['error'] = 'No se recibieron datos para guardar';
    echo json_encode($response_array);
    exit;
}

$data = json_decode($input_json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $response_array['error'] = 'JSON inválido recibido para guardar: ' . json_last_error_msg();
    echo json_encode($response_array);
    exit;
}

// 3. VALIDAR ESTRUCTURA DE DATOS (puedes añadir más validaciones si es necesario)
if (!isset($data['background']) || !isset($data['columns'])) {
    $response_array['error'] = 'Estructura de datos incorrecta recibida';
    echo json_encode($response_array);
    exit;
}

// 4. LÓGICA PARA GUARDAR EN EL ARCHIVO
try {
    // Ruta corregida para guardar 'contenido_web.json' en la misma carpeta que este script
    $ruta_archivo = __DIR__ . '/contenido_web.json'; 

    $contenido_para_json_archivo = [
        'background' => $data['background'],
        'columns' => $data['columns'],
        'ultima_actualizacion' => date('Y-m-d H:i:s')
    ];
    
    $json_string_para_archivo = json_encode($contenido_para_json_archivo, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    if ($json_string_para_archivo === false) {
        throw new Exception("Error al codificar los datos a JSON para el archivo: " . json_last_error_msg());
    }
    
    $bytes_escritos = file_put_contents($ruta_archivo, $json_string_para_archivo);
    
    if ($bytes_escritos === false) {
        // Intenta obtener más detalles del error si file_put_contents falla
        $error_php = error_get_last();
        $mensaje_error_escritura = "Error al escribir en el archivo.";
        if ($error_php !== null) {
            $mensaje_error_escritura .= " Detalles PHP: " . $error_php['message'];
        }
        throw new Exception($mensaje_error_escritura);
    }
    
    // Opcional: Forzar permisos si es estrictamente necesario y estás seguro.
    // A menudo es mejor configurar los permisos del directorio correctamente en el servidor.
    // chmod($ruta_archivo, 0666); 
    
    // Si todo fue bien:
    $response_array = [
        'success' => true,
        'message' => 'Cambios guardados exitosamente en el servidor.',
        'detalles' => [
            'ruta_confirmada' => $ruta_archivo, // Confirma la ruta que usó
            'tamano_escrito' => $bytes_escritos
        ]
    ];

} catch (Exception $e) {
    $response_array['success'] = false; // Asegúrate que success sea false en el catch
    $response_array['error'] = 'Excepción durante el guardado: ' . $e->getMessage();
    // Puedes añadir más detalles técnicos si es útil para ti
    // $response_array['detalles_tecnicos'] = [ ... ];
}

// 5. ENVIAR RESPUESTA FINAL
echo json_encode($response_array);
exit;
?>