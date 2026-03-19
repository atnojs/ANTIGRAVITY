<?php
header('Content-Type: application/json');

// IMPORTANTE: Cambia esta contraseña por una segura
$correctPassword = '0';
$dataFile = 'apps_data.json';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid data received.']);
    exit;
}

// Validación de la contraseña
if (!isset($data['password']) || $data['password'] !== $correctPassword) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Authentication failed.']);
    exit;
}

// Eliminar la contraseña del array antes de guardar
unset($data['password']);

// Guardar los datos en el archivo JSON
if (file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write to data file.']);
}
?>
