<?php
session_start();
$correctPassword = '0'; // Cambiar por tu contraseña real

$data = json_decode(file_get_contents('php://input'), true);
$input = $_POST['password'] ?? '';

header('Content-Type: application/json');
echo json_encode(['success' => $input === $correctPassword]);
exit;