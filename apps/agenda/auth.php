<?php
declare(strict_types=1);

/**
 * auth.php — sesión privada de la agenda (un único usuario).
 *
 * Comparte el hash de la contraseña de edición del proyecto (el mismo de
 * TrickVault / video-vault / descargas). Se puede sobreescribir con
 * AGENDA_PASSWORD_HASH en el .htaccess raíz de Hostinger.
 *
 * GET  -> { ok, auth, csrf }
 * POST -> action=login {password} | action=logout
 */

require_once __DIR__ . '/lib.php';
agenda_session_start();

$method = agenda_request_method();
$payload = agenda_request_payload();
$action = strtolower(trim((string)($payload['action'] ?? $_GET['action'] ?? 'status')));

if ($method === 'GET') {
    $authenticated = agenda_is_authenticated();
    agenda_send_json(200, [
        'ok'      => true,
        'auth'    => $authenticated,
        'csrf'    => $authenticated ? agenda_csrf_token() : null,
        'app'     => AGENDA_APP,
        'version' => AGENDA_VERSION,
    ]);
}

if ($method !== 'POST') {
    agenda_send_json(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'] ?? '',
            (bool)$params['secure'],
            (bool)$params['httponly']
        );
    }
    session_destroy();
    agenda_send_json(200, ['ok' => true, 'auth' => false]);
}

if ($action !== 'login') {
    agenda_send_json(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
}

$password = (string)($payload['password'] ?? '');
if ($password === '') {
    agenda_send_json(400, ['ok' => false, 'error' => 'Escribe la contraseña.']);
}

$attempts = (int)($_SESSION['agenda_attempts'] ?? 0);
if (!hash_equals(agenda_password_hash(), hash('sha256', $password))) {
    $_SESSION['agenda_attempts'] = $attempts + 1;
    // Freno a la fuerza bruta.
    sleep(1);
    agenda_send_json(403, ['ok' => false, 'error' => 'Contraseña incorrecta.']);
}

session_regenerate_id(true);
$_SESSION['agenda_auth']    = true;
$_SESSION['agenda_auth_at'] = time();
unset($_SESSION['agenda_attempts']);
$_SESSION['agenda_csrf'] = bin2hex(random_bytes(32));

agenda_send_json(200, [
    'ok'   => true,
    'auth' => true,
    'csrf' => $_SESSION['agenda_csrf'],
]);
