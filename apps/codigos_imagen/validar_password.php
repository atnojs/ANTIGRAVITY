<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$password = isset($_POST['password']) ? (string) $_POST['password'] : '';

if (hash_equals(ADMIN_PASSWORD, $password)) {
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(401);
echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta.']);
?>
