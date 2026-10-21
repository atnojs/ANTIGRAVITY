<?php
/**
 * Antigravity — endpoint central de contraseñas.
 *
 * Un único sitio al que puede apuntar cualquier app/web nueva:
 *
 *   GET   /auth/validar.php                  → estado (sin revelar valores)
 *   POST  /auth/validar.php  password=…&tipo=edicion|acceso
 *         200 {"success":true,"tipo":"edicion"}  + cookie de sesión
 *         403 {"success":false,"error":"Contraseña incorrecta."}
 *   POST  /auth/validar.php  action=logout&tipo=…
 *         200 {"success":true}
 *
 * Los valores se leen del `.htaccess` raíz del servidor (`PW_EDIT`,
 * `PW_ACCESS`), igual que las claves de API. Este fichero no guarda ninguna
 * contraseña.
 */
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$metodo = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($metodo === 'GET') {
    au_json(200, [
        'success' => true,
        'configurado' => [
            'edicion' => au_configurada('edicion'),
            'acceso' => au_configurada('acceso'),
        ],
        'sesion' => [
            'edicion' => au_sesion_ok('edicion'),
            'acceso' => au_sesion_ok('acceso'),
        ],
    ]);
}

if ($metodo !== 'POST') {
    au_json(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$datos = [];
$crudo = file_get_contents('php://input');
if (is_string($crudo) && $crudo !== '' && stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== false) {
    $json = json_decode($crudo, true);
    if (is_array($json)) {
        $datos = $json;
    }
}
$datos += $_POST;

$tipo = strtolower(trim((string) ($datos['tipo'] ?? 'edicion')));
if ($tipo !== 'edicion' && $tipo !== 'acceso') {
    au_json(400, ['success' => false, 'error' => 'Tipo no válido.']);
}

if (strtolower(trim((string) ($datos['action'] ?? ''))) === 'logout') {
    au_cerrar_sesion($tipo);
    au_json(200, ['success' => true, 'tipo' => $tipo]);
}

$password = (string) ($datos['password'] ?? '');
if (!au_comprobar($tipo, $password)) {
    usleep(250000);
    au_json(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
}

au_marcar($tipo);
au_json(200, ['success' => true, 'tipo' => $tipo]);
