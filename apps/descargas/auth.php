<?php
/**
 * Login de la app Descargas — contraseña de ACCESO (centralizada).
 *
 * La app queda pública en internet: sin esto, cualquiera que encuentre la URL
 * podría encolar descargas en el PC de Antonio.
 *
 * La contraseña ya NO vive aquí: se comprueba con `auth/lib.php`, que lee los
 * valores del `.htaccess` raíz del servidor (PW_ACCESS / PW_ACCESS_SHA256),
 * igual que las claves de API. Cambiarla es editar una línea del `.htaccess`.
 */
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth/lib.php';

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

// Freno a la fuerza bruta: 1 s por intento fallido.
if (!au_comprobar('acceso', $password)) {
    sleep(1);
    respond(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
}

session_regenerate_id(true);
$_SESSION['descargas_ok'] = true;
$_SESSION['descargas_ok_at'] = time();
respond(200, ['success' => true, 'auth' => true]);
