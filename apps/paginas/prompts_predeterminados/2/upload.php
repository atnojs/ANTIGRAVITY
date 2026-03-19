<?php
// Desactivar cualquier salida de errores que pueda romper el JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');

$target_dir = "uploads/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if (isset($_FILES["image"])) {
    // Verificar si hubo error en la subida (ej. archivo demasiado grande)
    if ($_FILES["image"]["error"] !== UPLOAD_ERR_OK) {
        echo json_encode(["success" => false, "error" => "Error de subida código: " . $_FILES["image"]["error"]]);
        exit;
    }

    $file_extension = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array($file_extension, $allowed_types)) {
        echo json_encode(["success" => false, "error" => "Formato no permitido"]);
        exit;
    }

    $new_filename = "art_" . uniqid() . '.' . $file_extension;
    $target_file = $target_dir . $new_filename;

    if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
        // Devolvemos la URL limpia
        echo json_encode([
            "success" => true, 
            "url" => $target_file
        ]);
    } else {
        echo json_encode(["success" => false, "error" => "No se pudo guardar el archivo en el servidor."]);
    }
} else {
    echo json_encode(["success" => false, "error" => "No se recibió ninguna imagen."]);
}
?>