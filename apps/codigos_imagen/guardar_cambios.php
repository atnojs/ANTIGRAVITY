<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$password = isset($input['password']) ? trim((string) $input['password']) : '';
$state = isset($input['state']) && is_array($input['state']) ? $input['state'] : null;

if (!hash_equals(ADMIN_PASSWORD, $password)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta.']);
    exit;
}

if (!$state || !isset($state['models']) || !is_array($state['models'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos de biblioteca no válidos.']);
    exit;
}

$safeState = [
    'version' => 1,
    'models' => $state['models'],
    'ultima_actualizacion' => date('Y-m-d H:i:s')
];

$path = __DIR__ . '/estado_codigos.json';
$json = json_encode($safeState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$saved = file_put_contents($path, $json, LOCK_EX);

if ($saved === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'No se pudo escribir la biblioteca.']);
    exit;
}

echo json_encode(['success' => true, 'updatedAt' => $safeState['ultima_actualizacion']]);
?>
