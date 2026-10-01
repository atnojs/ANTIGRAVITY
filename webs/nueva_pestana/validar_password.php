<?php
// Valida la contraseña del modo edición. La clave NO vive aquí: se lee de la
// variable de entorno NUEVA_PESTANA_PASSWORD (SetEnv del .htaccess raíz) desde
// clave_panel.php.
require __DIR__ . '/clave_panel.php';

header('Content-Type: application/json');

$input = '';

// El cliente la manda como FormData (histórico) o como JSON.
if (isset($_POST['password'])) {
    $input = (string) $_POST['password'];
}

$cuerpo = json_decode(file_get_contents('php://input'), true);
if (is_array($cuerpo) && isset($cuerpo['password'])) {
    $input = (string) $cuerpo['password'];
}

echo json_encode([
    'success' => clave_panel_valida($input)
]);
