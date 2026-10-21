<?php
/**
 * Contraseña de ACCESO para abrir un enlace privado (centralizada).
 *
 * El valor NO está escrito aquí: vive en el `.htaccess` raíz del servidor
 * (PW_ACCESS / PW_ACCESS_SHA256). Ver auth/lib.php.
 */
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/auth/lib.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

$password = au_password_recibida();
$ok = au_comprobar('acceso', $password);
if ($ok) {
    au_marcar('acceso');
}
au_json(200, ['success' => $ok]);
