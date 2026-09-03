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
    'updatedAt' => isset($data['state']['updatedAt']) ? (int) $data['state']['updatedAt'] : (int) round(microtime(true) * 1000),
    'ultima_actualizacion' => date('Y-m-d H:i:s')
];

$targetDir = __DIR__ . '/uploads';
if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
    echo json_encode(['success' => false, 'error' => 'No se pudo preparar el almacenamiento permanente.']);
    exit;
}

$path = $targetDir . '/estado_codigos.json';
$temporaryPath = tempnam($targetDir, 'state_');
$json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$saved = $temporaryPath !== false && file_put_contents($temporaryPath, $json, LOCK_EX) !== false && rename($temporaryPath, $path);

if ($saved === false) {
    if ($temporaryPath !== false && is_file($temporaryPath)) {
        unlink($temporaryPath);
    }
    echo json_encode(['success' => false, 'error' => 'No se pudo escribir el archivo JSON.']);
    exit;
}

echo json_encode(['success' => true, 'updatedAt' => $state['updatedAt'], 'updatedLabel' => $state['ultima_actualizacion']]);
?>
