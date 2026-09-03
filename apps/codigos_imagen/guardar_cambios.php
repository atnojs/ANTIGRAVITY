<?php
header('Content-Type: application/json; charset=utf-8');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['state']['models']) || !is_array($data['state']['models'])) {
    echo json_encode(['success' => false, 'error' => 'No hay datos válidos.']);
    exit;
}

$password = isset($data['password']) ? (string) $data['password'] : '';
if ($password !== '0') {
    echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta.']);
    exit;
}

$state = [
    'version' => 1,
    'models' => $data['state']['models'],
    'ultima_actualizacion' => date('Y-m-d H:i:s')
];

$path = __DIR__ . '/estado_codigos.json';
$saved = file_put_contents($path, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($saved === false) {
    echo json_encode(['success' => false, 'error' => 'No se pudo escribir el archivo JSON.']);
    exit;
}

echo json_encode(['success' => true, 'updatedAt' => $state['ultima_actualizacion']]);
?>
