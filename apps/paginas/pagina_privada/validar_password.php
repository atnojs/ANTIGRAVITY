<?php
session_start(); // ¡DEBE SER LA PRIMERA LÍNEA DEL ARCHIVO!
ini_set('display_errors', 1); // Muestra errores PHP si los hay
error_reporting(E_ALL);

header('Content-Type: application/json'); // Enviar esto pronto

$correctPassword = '0'; // La contraseña que esperas para entrar al modo edición
$response_data = [
    'success' => false,
    'message_debug' => 'Inicio de la validación',
    'password_recibida_debug' => 'NO SE RECIBIO/PROCESO',
    'comparacion_debug' => 'NO REALIZADA',
    'session_status_debug' => session_status(), // Estado de la sesión PHP
    'session_variable_establecida_debug' => 'NO (por defecto)'
];

// Leer el JSON enviado por JavaScript
$input_json = file_get_contents('php://input');
if ($input_json === false || empty($input_json)) {
    $response_data['message_debug'] = 'Error: No se recibió payload (php://input vacío o error al leer).';
    echo json_encode($response_data);
    exit;
}

$input_data = json_decode($input_json, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    $response_data['message_debug'] = 'Error: JSON inválido recibido. Mensaje: ' . json_last_error_msg();
    $response_data['raw_input_debug'] = $input_json; // Muestra lo que se recibió si no es JSON válido
    echo json_encode($response_data);
    exit;
}

$password_recibida = $input_data['password'] ?? null;
$response_data['password_recibida_debug'] = $password_recibida; // Muestra la contraseña que PHP vio

if ($password_recibida === $correctPassword) {
    $response_data['success'] = true;
    $response_data['message_debug'] = 'Contraseña correcta.';
    $response_data['comparacion_debug'] = "'{$password_recibida}' === '{$correctPassword}' (TRUE)";
    $_SESSION['modo_edicion_activo'] = true; // Establece la variable de sesión
    $response_data['session_variable_establecida_debug'] = (isset($_SESSION['modo_edicion_activo']) && $_SESSION['modo_edicion_activo']) ? 'TRUE' : 'FALLO AL ESTABLECER/VERIFICAR';
} else {
    $response_data['message_debug'] = 'Contraseña incorrecta o faltante.';
    $response_data['comparacion_debug'] = ($password_recibida === null ? 'NULL' : "'{$password_recibida}'") . " !== '{$correctPassword}' (FALSE)";
}

echo json_encode($response_data);
exit;
?>