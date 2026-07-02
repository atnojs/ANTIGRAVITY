<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// --- IMPORTANTE: Cambia esta contraseña ---
$correctPassword = '0';
// -----------------------------------------

$inputPassword = '';

if (isset($_POST['password'])) {
    $inputPassword = $_POST['password'];
} else {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['password'])) {
        $inputPassword = $data['password'];
    }
}

$isValid = ($inputPassword === $correctPassword);
echo json_encode(['success' => $isValid]);
exit;
