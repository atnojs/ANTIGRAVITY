<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// CAMBIA ESTA CONTRASEÑA POR LA QUE QUIERAS
$ADMIN_PASSWORD = '0';

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['password'])) {
        throw new Exception('Contraseña no proporcionada');
    }
    
    $valid = ($data['password'] === $ADMIN_PASSWORD);
    
    echo json_encode([
        'valid' => $valid
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'valid' => false,
        'message' => $e->getMessage()
    ]);
}
?>