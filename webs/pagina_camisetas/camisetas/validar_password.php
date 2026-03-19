<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// --- IMPORTANTE: Cambia esta contraseña ---
$correctPassword = '0';
// -----------------------------------------

$inputPassword = '';

// Comprobar si la contraseña viene de un POST de formulario URL-encoded
if (isset($_POST['password'])) {
    $inputPassword = $_POST['password'];
}
// Comprobar si viene como JSON raw (menos común para una simple validación, pero posible)
else {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['password'])) {
        $inputPassword = $data['password'];
    }
}

$isValid = ($inputPassword === $correctPassword);

// Devolver siempre una respuesta JSON
echo json_encode(['success' => $isValid]);

exit;
?>
