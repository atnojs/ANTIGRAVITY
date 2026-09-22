<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

$target_dir = "uploads/videos/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "error" => "Solo POST"]);
    exit;
}

// Receive via FormData (file + command_id)
if (!isset($_FILES["video"]) || !isset($_POST["command_id"])) {
    echo json_encode(["success" => false, "error" => "Faltan datos: video y command_id"]);
    exit;
}

if ($_FILES["video"]["error"] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "error" => "Error de subida código: " . $_FILES["video"]["error"]]);
    exit;
}

$file_extension = strtolower(pathinfo($_FILES["video"]["name"], PATHINFO_EXTENSION));
$allowed_types = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'gif'];

if (!in_array($file_extension, $allowed_types)) {
    echo json_encode(["success" => false, "error" => "Formato no permitido. Usa: mp4, webm, mov, avi, mkv, gif"]);
    exit;
}

$command_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["command_id"]);
$new_filename = $command_id . '_' . uniqid() . '.' . $file_extension;
$target_file = $target_dir . $new_filename;

if (move_uploaded_file($_FILES["video"]["tmp_name"], $target_file)) {
    echo json_encode([
        "success" => true,
        "filename" => $new_filename,
        "url" => $target_dir . $new_filename
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Error al mover el archivo"]);
}
?>