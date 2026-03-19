<?php
// Evitar problemas de CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Recibir datos
$data = json_decode(file_get_contents('php://input'), true);

// Contraseña para enlaces privados - CÁMBIALA POR TU CONTRASEÑA DESEADA
$correctPassword = "00";

// Verificar contraseña
$result = array(
    'success' => $data['password'] === $correctPassword
);

// Devolver resultado
echo json_encode($result);
?>