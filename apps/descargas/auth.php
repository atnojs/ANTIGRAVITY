<?php
/**
 * Login de la app Descargas.
 *
 * La app queda publica en internet: sin esto, cualquiera que encuentre la URL
 * podria encolar descargas en el PC de Antonio.
 *
 * CONTRASENA PROPIA (2026-10-17): ya NO comparte el hash de TrickVault /
 * video-vault / json, asi que `tools/rotar-password.ps1` no la toca. Si se
 * quiere cambiar, se recalcula su sha256 y se sustituye $expectedHash (abajo).
 * El valor en claro lo guarda Antonio; no se escribe en el repositorio.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$cookiePath = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/') . '/';
session_name('descargas_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => $cookiePath,
    'secure'   => $secure,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    respond(200, [
        'success' => true,
        'auth'    => !empty($_SESSION['descargas_ok']),
    ]);
}

if ($method !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$action = strtolower((string)($_POST['action'] ?? 'login'));

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
    respond(200, ['success' => true, 'auth' => false]);
}

$password = (string)($_POST['password'] ?? '');
$expectedHash = 'c97550ce8213ef5cf6ed4ba48790c137df3ef6a5da20b48961001a634b6cead2';

// Freno a la fuerza bruta: 1 s por intento fallido. La contraseña son 20
// caracteres aleatorios; con esto el ataque por fuerza bruta deja de ser barato.
if (!hash_equals($expectedHash, hash('sha256', $password))) {
    sleep(1);
    respond(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
}

session_regenerate_id(true);
$_SESSION['descargas_ok'] = true;
$_SESSION['descargas_ok_at'] = time();
respond(200, ['success' => true, 'auth' => true]);
