<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$jsonFile = 'web_data.json';

try {
    if (!file_exists($jsonFile)) {
        throw new Exception('Archivo no encontrado');
    }
    
    $content = file_get_contents($jsonFile);
    
    if ($content === false) {
        throw new Exception('Error al leer el archivo');
    }
    
    $data = json_decode($content, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido en el archivo');
    }
    
    echo json_encode($data);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}
?>