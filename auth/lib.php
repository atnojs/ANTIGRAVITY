<?php
/**
 * Antigravity — contraseñas centralizadas (edición y acceso).
 *
 * MISMO SISTEMA QUE LAS CLAVES DE API: los valores NO viven en el repositorio,
 * sino en el `.htaccess` raíz de Hostinger (fuera de git, servido solo por
 * Apache). Ninguna app guarda ya una contraseña: todas incluyen este fichero y
 * llaman a las funciones `au_*`.
 *
 * Líneas que deben estar en el `.htaccess` raíz (ejemplo, no versionar):
 *
 *     SetEnv PW_EDIT "0"
 *     SetEnv PW_ACCESS "[ELIMINADO]"
 *
 * Opcional, si se prefiere guardar solo el hash sha256 (64 hex):
 *
 *     SetEnv PW_EDIT_SHA256 "…"
 *     SetEnv PW_ACCESS_SHA256 "…"
 *
 * Si hay hash configurado manda el hash; si no, el valor en claro. Cambiar una
 * contraseña es editar UNA línea del `.htaccess`: no hay que tocar ninguna app
 * ni esperar al despliegue.
 *
 * Uso desde un endpoint:
 *
 *     require_once dirname(__DIR__, 2) . '/auth/lib.php';
 *     if (!au_autorizado('edicion', (string) ($datos['password'] ?? ''))) { … }
 *
 * Y para un `validar_password.php` simple:
 *
 *     require_once dirname(__DIR__, N) . '/auth/lib.php';
 *     au_endpoint('edicion');
 *
 * Tipos:
 *   - 'edicion' → desbloquea el modo edición / permite guardar cambios.
 *   - 'acceso'  → login de entrada (Descargas, agenda, publicación en GitHub).
 */
declare(strict_types=1);

if (defined('AU_LIB')) {
    return;
}
define('AU_LIB', true);

/**
 * Compatibilidad temporal: mientras las variables no estén en el `.htaccess`
 * se siguen aceptando las contraseñas que había antes, para que ninguna app se
 * quede sin acceso entre el despliegue del código y el pegado de las líneas.
 *
 * ⚠️ Poner en false (o borrar el bloque `au_comprobar_antigua`) en cuanto la
 * verificación en producción esté hecha: si no, la contraseña vieja sigue
 * valiendo para siempre.
 */
const AU_PERMITIR_ANTIGUAS = true;

/* ──────────────────────────────────────────────────────────────────────────
   Valores
   ────────────────────────────────────────────────────────────────────────── */

/** Lee una variable del entorno con la misma cascada que usan los proxies. */
function au_env(string $nombre): string
{
    $candidatos = [
        getenv($nombre),
        getenv('REDIRECT_' . $nombre),
        $_SERVER[$nombre] ?? '',
        $_SERVER['REDIRECT_' . $nombre] ?? '',
        $_ENV[$nombre] ?? '',
        $_ENV['REDIRECT_' . $nombre] ?? '',
    ];
    foreach ($candidatos as $valor) {
        if (is_string($valor) && trim($valor) !== '') {
            return trim($valor);
        }
    }
    return '';
}

/** El `.htaccess` puede traer el valor en claro o solo su sha256. */
function au_hash_esperado(string $tipo): string
{
    $nombre = $tipo === 'acceso' ? 'PW_ACCESS_SHA256' : 'PW_EDIT_SHA256';
    $hash = strtolower(au_env($nombre));
    return preg_match('/^[0-9a-f]{64}$/', $hash) ? $hash : '';
}

function au_valor_esperado(string $tipo): string
{
    return au_env($tipo === 'acceso' ? 'PW_ACCESS' : 'PW_EDIT');
}

/** ¿Ya hay contraseña configurada en el entorno del servidor? */
function au_configurada(string $tipo): bool
{
    return au_hash_esperado($tipo) !== '' || au_valor_esperado($tipo) !== '';
}

/* ──────────────────────────────────────────────────────────────────────────
   Comprobación
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Contraseñas que había antes del sistema central, SOLO para la transición.
 * Edición: la aleatoria de 20 caracteres de TrickVault / video-vault / json /
 * agenda. Acceso: la agenda usaba esa misma y Descargas la suya propia.
 */
function au_comprobar_antigua(string $tipo, string $password): bool
{
    if ($password === '') {
        return false;
    }
    $hash = hash('sha256', $password);
    if (hash_equals('0c79272e8c147c95bedd7450abfd42cb3377947341694276c5835caeb9f435ee', $hash)) {
        return true;
    }
    if ($tipo === 'acceso'
        && hash_equals('ae4cd6ac3271e966a3eed8adc9401329e994a4588bf99b6510d851ffb58ff5d6', $hash)) {
        return true;
    }
    return false;
}

/** ¿La contraseña es la correcta para ese tipo? */
function au_comprobar(string $tipo, string $password): bool
{
    if ($password === '') {
        return false;
    }

    $hash = au_hash_esperado($tipo);
    if ($hash !== '') {
        return hash_equals($hash, hash('sha256', $password));
    }

    $valor = au_valor_esperado($tipo);
    if ($valor !== '') {
        return hash_equals($valor, $password);
    }

    // Sin configurar en el entorno: modo transición o rechazo (fail closed).
    return AU_PERMITIR_ANTIGUAS && au_comprobar_antigua($tipo, $password);
}

/* ──────────────────────────────────────────────────────────────────────────
   Sesión común (cookie en la raíz del dominio: vale para todas las apps)
   ────────────────────────────────────────────────────────────────────────── */

function au_sesion(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return; // una app ya abrió su propio session; se reutiliza
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443);
    session_name('antigravity_auth');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    @session_start();
}

function au_clave(string $tipo): string
{
    return $tipo === 'acceso' ? 'au_acceso' : 'au_edicion';
}

/** ¿Hay sesión abierta para ese tipo y no ha caducado? */
function au_sesion_ok(string $tipo, int $maxSegundos = 43200): bool
{
    au_sesion();
    $clave = au_clave($tipo);
    if (empty($_SESSION[$clave])) {
        return false;
    }
    $hora = (int) ($_SESSION[$clave . '_at'] ?? 0);
    if ($hora > 0 && (time() - $hora) > $maxSegundos) {
        unset($_SESSION[$clave], $_SESSION[$clave . '_at']);
        return false;
    }
    return true;
}

function au_marcar(string $tipo): void
{
    au_sesion();
    $clave = au_clave($tipo);
    $_SESSION[$clave] = true;
    $_SESSION[$clave . '_at'] = time();
}

function au_cerrar_sesion(string $tipo): void
{
    au_sesion();
    $clave = au_clave($tipo);
    unset($_SESSION[$clave], $_SESSION[$clave . '_at']);
}

/** Autorizado por contraseña correcta O por sesión ya abierta. */
function au_autorizado(string $tipo, string $password): bool
{
    if (au_sesion_ok($tipo)) {
        return true;
    }
    $ok = au_comprobar($tipo, $password);
    if ($ok) {
        au_marcar($tipo);
    }
    return $ok;
}

/* ──────────────────────────────────────────────────────────────────────────
   Endpoint genérico (sustituye a los validar_password.php sueltos)
   ────────────────────────────────────────────────────────────────────────── */

function au_json(int $estado, array $carga): never
{
    http_response_code($estado);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
    }
    echo json_encode($carga, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Saca la contraseña del POST de formulario o de un cuerpo JSON. */
function au_password_recibida(): string
{
    if (isset($_POST['password'])) {
        return (string) $_POST['password'];
    }
    $crudo = file_get_contents('php://input');
    if (is_string($crudo) && $crudo !== '') {
        $datos = json_decode($crudo, true);
        if (is_array($datos) && isset($datos['password'])) {
            return (string) $datos['password'];
        }
    }
    return '';
}

/**
 * Endpoint estándar `{success: bool}` para un tipo. Marca la sesión al acertar.
 * Sustituye el contenido de todos los `validar_password.php` del proyecto.
 */
function au_endpoint(string $tipo): never
{
    $metodo = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($metodo !== 'POST') {
        au_json(405, ['success' => false, 'error' => 'Método no permitido.']);
    }
    $password = au_password_recibida();
    if (!au_comprobar($tipo, $password)) {
        usleep(250000);
        au_json(403, ['success' => false, 'error' => 'Contraseña incorrecta.']);
    }
    au_marcar($tipo);
    au_json(200, ['success' => true]);
}

/* Directo por HTTP no se sirve: este fichero solo se incluye. */
if (PHP_SAPI !== 'cli') {
    $script = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? ''));
    if ($script !== false && $script === realpath(__FILE__)) {
        http_response_code(404);
        exit;
    }
}
