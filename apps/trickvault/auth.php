<?php
/**
 * TrickVault — contraseña de edición.
 *
 * Lo usan DOS cosas:
 *   1. `index.html` (`AUTH_URL = 'auth.php'`): al pulsar el candado, manda la
 *      contraseña aquí y solo entra en modo edición si recibe `success: true`.
 *   2. `publicar.php`: valida la contraseña de cada publicación contra este
 *      mismo endpoint antes de mandar nada a GitHub.
 *
 * POST multipart/form-data  password=…
 *     → 200 {"success":true}
 *     → 403 {"success":false,"error":"Contraseña incorrecta."}
 *     → 405 {"success":false,"error":"Método no permitido."}   si no es POST
 *
 * El hash es el mismo que usa video-vault, así que una sola contraseña vale
 * para las dos apps.
 *
 * CENTRALIZADO (2026-10-21): la contraseña ya NO vive en este fichero. Se
 * comprueba con `auth/lib.php`, que lee los valores del `.htaccess` raíz del
 * servidor (PW_EDIT / PW_EDIT_SHA256), igual que las claves de API. Cambiarla
 * es editar una línea del `.htaccess`, sin tocar ninguna app ni desplegar.
 *
 * HISTORIA (2026-10-16): este fichero vivía SOLO en el servidor, sin estar en
 * git: no se podía rotar desde el repositorio y no había forma de verlo. Se
 * trajo aquí para que el despliegue lo mantenga.
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
if (!au_comprobar('edicion', $password)) {
    usleep(250000);
    respond(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
}

session_regenerate_id(true);
$_SESSION['trickvault_edit'] = true;
$_SESSION['trickvault_edit_at'] = time();
respond(200, ['success' => true]);
