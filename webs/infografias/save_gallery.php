<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$ruta_archivo = __DIR__ . '/contenido.json';

$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
    exit;
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido']);
    exit;
}

if (!isset($data['content']) || !is_array($data['content'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Estructura incorrecta. Se esperaba "content".']);
    exit;
}

$contentToSave = $data['content'];

try {
    $contenidoJson = json_encode($contentToSave, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($contenidoJson === false) {
        throw new Exception('Error al codificar JSON: ' . json_last_error_msg());
    }

    $bytes = file_put_contents($ruta_archivo, $contenidoJson);
    if ($bytes === false) {
        throw new Exception("Error al escribir en '$ruta_archivo'");
    }

    echo json_encode(['success' => true, 'message' => 'Guardado correctamente.', 'bytes_written' => $bytes]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
exit;
