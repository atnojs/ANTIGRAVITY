<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$runtimePath = __DIR__ . '/uploads/estado_codigos.json';
$seedPath = __DIR__ . '/estado_codigos.json';
$path = is_file($runtimePath) ? $runtimePath : $seedPath;

if (!is_file($path)) {
    echo json_encode(['version' => 1, 'models' => []], JSON_UNESCAPED_UNICODE);
    exit;
}

$contents = file_get_contents($path);
$decoded = json_decode($contents, true);

if (!is_array($decoded)) {
    echo json_encode(['version' => 1, 'models' => []], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($decoded, JSON_UNESCAPED_UNICODE);
?>
