<?php
require_once dirname(__DIR__, 3) . '/auth/lib.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// CAMBIA ESTA CONTRASEÑA POR LA QUE QUIERAS

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['password'])) {
        throw new Exception('Contraseña no proporcionada');
    }
    
    $valid = au_autorizado('edicion', (string) ($data['password'] ?? ''));
    
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