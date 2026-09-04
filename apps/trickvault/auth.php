<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$cookiePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/') . '/';
session_name('trickvault_edit_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookiePath,
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$password = (string)($_POST['password'] ?? '');
$expectedHash = '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9';
if (!hash_equals($expectedHash, hash('sha256', $password))) {
    usleep(250000);
    respond(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
}

session_regenerate_id(true);
$_SESSION['trickvault_edit'] = true;
$_SESSION['trickvault_edit_at'] = time();
respond(200, ['success' => true]);
