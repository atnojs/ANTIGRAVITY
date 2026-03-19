<?php
session_start();
$correctPassword = '1'; // Cambia este valor por la contraseña real que desees

// Leer los datos enviados en formato JSON
$data = json_decode(file_get_contents('php://input'), true);
$input = isset($data['password']) ? $data['password'] : '';

header('Content-Type: application/json');
echo json_encode(['success' => $input === $correctPassword]);
exit;
?>
