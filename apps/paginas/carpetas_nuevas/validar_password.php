<?php
ini_set('display_errors', 1); // Para ver errores PHP
error_reporting(E_ALL);

$correctPassword = '0'; // Asegúrate de que esto es EXACTAMENTE '0503' sin espacios ni caracteres raros.
$inputPassword = $_POST['password'] ?? '---PASSWORD_NO_LLEGO_A_POST---'; // Un default para saber si llegó

$isValid = ($inputPassword === $correctPassword);

// Prepara un array con información de depuración
$debugData = [
    'input_password_received' => $inputPassword,
    'expected_password_in_php' => $correctPassword,
    'passwords_match_result' => $isValid,
    'length_input_password' => strlen($inputPassword), // Longitud de la contraseña recibida
    'length_expected_password' => strlen($correctPassword), // Longitud de la contraseña esperada
    'raw_POST_array' => $_POST
];

header('Content-Type: application/json');
// Envía la información de depuración junto con el resultado del success
echo json_encode(['success' => $isValid, 'debug_info' => $debugData]);
exit;
?>