<?php
header('Content-Type: application/json');
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'No hay datos']);
    exit;
}

if ($data['password'] === '0') {
    $ruta = __DIR__ . '/estado_galeria.json';
    $resultado = file_put_contents($ruta, json_encode([
        'background' => $data['background'],
        'columns' => $data['columns'],
        'ultima_actualizacion' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT));
    
    if ($resultado !== false) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo escribir el archivo JSON']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Password incorrecto']);
}
?>