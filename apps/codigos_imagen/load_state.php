<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$path = __DIR__ . '/estado_codigos.json';

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
