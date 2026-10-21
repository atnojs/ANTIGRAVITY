<?php
require_once dirname(__DIR__, 4) . '/auth/lib.php';

header('Content-Type: application/json');

// IMPORTANTE: Cambia esta contraseña por una segura

$password = $_POST['password'] ?? '';

if (au_autorizado('edicion', $password)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
?>

