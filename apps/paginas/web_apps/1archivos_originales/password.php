<?php
header('Content-Type: application/json');

// IMPORTANTE: Cambia esta contraseña por una segura
$correctPassword = '0';

$password = $_POST['password'] ?? '';

if ($password === $correctPassword) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
?>

