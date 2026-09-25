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

$targetDir = __DIR__ . '/gallery_data';
if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
    echo json_encode(['success' => false, 'error' => 'No se pudo preparar el almacenamiento permanente.']);
    exit;
}

$protectionPath = $targetDir . '/.htaccess';
if (!is_file($protectionPath)) {
    @file_put_contents($protectionPath, "Require all denied\nOptions -Indexes\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
}

$path = $targetDir . '/estado_codigos.json';
$lock = fopen($targetDir . '/estado_codigos.lock', 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) {
    if ($lock !== false) {
        fclose($lock);
    }
    echo json_encode(['success' => false, 'error' => 'No se pudo bloquear el archivo de datos.']);
    exit;
}

$json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$saved = $json !== false && file_put_contents($path, $json, LOCK_EX) !== false;
flock($lock, LOCK_UN);
fclose($lock);

if ($saved === false) {
    echo json_encode(['success' => false, 'error' => 'No se pudo escribir el archivo JSON.']);
    exit;
}

echo json_encode(['success' => true, 'updatedAt' => $state['updatedAt'], 'updatedLabel' => $state['ultima_actualizacion']]);
?>
