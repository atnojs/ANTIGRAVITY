<?php
/**
 * Restauración puntual de la contraseña de ACCESO (`PW_ACCESS`) — 2026-10-24.
 *
 * FICHERO TEMPORAL. Solo escribe en el `.htaccess` raíz del servidor el
 * SHA-256 recibido, sin tocar nada más. Actúa únicamente con una petición POST
 * firmada con la clave privada local (RSA-SHA256); no contiene ningún secreto.
 * Tras una ejecución válida se borra a sí mismo y se retira del repositorio.
 */
declare(strict_types=1);

const PURGA_PUB = <<<'PEM'
-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEArKddNu2KNWspf2cVR72a
GgvPILqrzYkVXN4HBGyrE3DrkNp5b3WPN3h0RuHBCxJ+mIMb9tPoZUPWSLEBTl5A
M6EWO3UeOGleh2dk2u62nWpQVJRPqd0BMpvhPi/XrXjwJEj8i2kUr+WFsWyCFtgl
5tf7r60z3Fj/vMrY4YXcZKfwOKIHtBicvi2bSCsLiisRdYYHReTVyQyfY9RbvG2w
wXsedZeMS8kT20uTyV39wF/XiZ+bWMnl6tZqv/Z/nlhFljtvEFlZ+H6g5/jiy82E
8X6SirAaF3dPTjtl/xr/wZ/xr1gxsYcrWgQIxk6h1C/geNboShANrcsHkox422Rw
lCbY6juyuhJmLY2OgMIvHtxH+sJvJ+UqyeAa7SBM65W0c1j39ZTI2/6+zgb6Hjue
lES1cUhluwDyZs97LhghFQ7oVV8AwXdPPDDccEXVGx/YBHG+FFpk+BqOzxY0Rzwx
RXLbExyc7RTQRqkFRA1yymXUz80elOB5Dn/abMXY8gM1AgMBAAE=
-----END PUBLIC KEY-----
PEM;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
@set_time_limit(60);

function purga_out(int $codigo, array $datos): never
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (PHP_SAPI !== 'cli' && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    purga_out(405, ['ok' => false, 'error' => 'metodo']);
}

$crudo = file_get_contents('php://input');
$peticion = is_string($crudo) ? json_decode($crudo, true) : null;
if (!is_array($peticion) || !isset($peticion['payload'], $peticion['signature'])) {
    purga_out(400, ['ok' => false, 'error' => 'peticion']);
}
$carga = base64_decode((string) $peticion['payload'], true);
$firma = base64_decode((string) $peticion['signature'], true);
if ($carga === false || $firma === false) {
    purga_out(400, ['ok' => false, 'error' => 'base64']);
}
if (openssl_verify($carga, $firma, PURGA_PUB, OPENSSL_ALGO_SHA256) !== 1) {
    purga_out(403, ['ok' => false, 'error' => 'firma']);
}

$datos = json_decode($carga, true);
if (!is_array($datos)) {
    purga_out(400, ['ok' => false, 'error' => 'carga']);
}
if (time() > (int) ($datos['exp'] ?? 0)) {
    purga_out(403, ['ok' => false, 'error' => 'caducado']);
}

$hash = strtolower((string) ($datos['nuevo_hash'] ?? ''));
if (!preg_match('/^[0-9a-f]{64}$/', $hash)) {
    purga_out(400, ['ok' => false, 'error' => 'hash']);
}

$raiz = dirname(__DIR__);
$htaccess = $raiz . '/.htaccess';
if (!is_file($htaccess) || !is_writable($htaccess)) {
    purga_out(500, ['ok' => false, 'error' => 'htaccess']);
}
$original = file_get_contents($htaccess);
if (!is_string($original) || $original === '') {
    purga_out(500, ['ok' => false, 'error' => 'lectura']);
}

$eol = strpos($original, "\r\n") !== false ? "\r\n" : "\n";
$lineas = preg_split('/\R/', $original);
if (!is_array($lineas)) {
    purga_out(500, ['ok' => false, 'error' => 'split']);
}
$lineaNueva = 'SetEnv PW_ACCESS_SHA256 "' . $hash . '"';
$insertada = false;
$salida = [];
foreach ($lineas as $linea) {
    if (preg_match('/^\s*SetEnv\s+PW_ACCESS(?:_SHA256)?\s/i', $linea)) {
        if (!$insertada) {
            $salida[] = $lineaNueva;
            $insertada = true;
        }
        continue;
    }
    $salida[] = $linea;
}
if (!$insertada) {
    $salida[] = $lineaNueva;
}
$texto = implode($eol, $salida);
$tmp = $htaccess . '.tmp-' . bin2hex(random_bytes(8));
if (@file_put_contents($tmp, $texto, LOCK_EX) === false) {
    purga_out(500, ['ok' => false, 'error' => 'temporal']);
}
if (!@rename($tmp, $htaccess)) {
    @unlink($tmp);
    purga_out(500, ['ok' => false, 'error' => 'rename']);
}
clearstatcache(true, $htaccess);
$verificado = @file_get_contents($htaccess);
$ok = is_string($verificado) && strpos($verificado, $hash) !== false;

register_shutdown_function(static function (): void {
    @unlink(__FILE__);
});

purga_out(200, ['ok' => $ok, 'htaccess_actualizado' => $ok]);
