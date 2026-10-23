<?php
declare(strict_types=1);

/**
 * proxy.php — punto de entrada del proveedor de imágenes.
 *
 * Mantiene el contrato canónico del proyecto (lib/canonical-image-model.php).
 * La app envía los trabajos por api.php?action=job.create, que registra el
 * trabajo, comprueba el presupuesto y reutiliza este mismo contrato. Este
 * endpoint queda para diagnóstico y para integraciones externas autorizadas.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(180);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/lib/canonical-image-model.php';

function proxy_env(string ...$names): string
{
    foreach ($names as $name) {
        foreach ([
            getenv($name), getenv('REDIRECT_' . $name),
            $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
            $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
        ] as $value) {
            if (is_string($value) && trim($value) !== '') return trim($value);
        }
    }
    return '';
}

function proxy_respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($method === 'GET') {
    proxy_respond(200, [
        'success' => true,
        'service' => 'unified-image-studio-proxy',
        'configured' => [
            'openai' => proxy_env('OPENAI_API_KEY', 'O') !== '',
            'openrouter' => proxy_env('R') !== '',
        ],
        'models' => array_keys(ag_image_catalog()),
    ]);
}

if ($method !== 'POST') proxy_respond(405, ['success' => false, 'error' => 'Método no permitido.']);

if (!function_exists('curl_init')) {
    proxy_respond(500, ['success' => false, 'error' => 'cURL no está disponible en este servidor.']);
}

if (strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) !== 'xmlhttprequest') {
    proxy_respond(403, ['success' => false, 'error' => 'Solicitud no reconocida.']);
}

// Sesión autorizada obligatoria: el proxy gasta dinero y no debe quedar abierto.
require_once __DIR__ . '/lib/bootstrap.php';
uis_session_start();
if (!uis_authenticated()) {
    proxy_respond(401, ['success' => false, 'error' => 'Sesión no autorizada.']);
}

$raw = file_get_contents('php://input');
$request = json_decode($raw ?: '', true);
if (!is_array($request)) proxy_respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON válido.']);

$action = strtolower(trim((string)($request['action'] ?? 'generate')));
if ($action === 'health') {
    proxy_respond(200, [
        'success' => true,
        'configured' => [
            'openai' => proxy_env('OPENAI_API_KEY', 'O') !== '',
            'openrouter' => proxy_env('R') !== '',
        ],
    ]);
}
if ($action !== 'generate') proxy_respond(400, ['success' => false, 'error' => 'Acción no permitida.']);

ag_image_response($request, __DIR__);
