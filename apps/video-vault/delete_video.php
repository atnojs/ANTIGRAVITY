<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "error" => "Solo POST"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$filename = $input['filename'] ?? '';

if (!$filename) {
    echo json_encode(["success" => false, "error" => "Falta filename"]);
    exit;
}

// Security: prevent path traversal
$filename = basename($filename);
$filepath = "uploads/videos/" . $filename;

if (file_exists($filepath)) {
    unlink($filepath);
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => "Archivo no encontrado"]);
}
?>