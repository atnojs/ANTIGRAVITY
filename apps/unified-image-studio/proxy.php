<?php
declare(strict_types=1);

/**
 * proxy.php — punto de entrada del proveedor de imágenes.
 *
 * No habla directamente con el proveedor: pasa por el mismo pipeline que
 * api.php?action=job.create, de modo que TODO gasto registra trabajo, comprueba
 * presupuesto, es idempotente y queda en el libro de costes.
 * Mantiene el formato de respuesta del contrato canónico del proyecto.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(200);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/jobs.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!function_exists('curl_init')) {
    uis_json(500, ['success' => false, 'error' => 'cURL no está disponible en este servidor.']);
}

// El proxy gasta dinero: nunca responde sin sesión autorizada.
uis_require_auth();
$db = uis_db();

$configured = [
    'openai' => uis_env('OPENAI_API_KEY', 'O') !== '',
    'openrouter' => uis_env('R') !== '',
];

if ($method === 'GET') {
    uis_json(200, [
        'success' => true,
        'service' => 'unified-image-studio-proxy',
        'configured' => $configured,
        'models' => array_keys(ag_image_catalog()),
    ]);
}

if ($method !== 'POST') {
    uis_json(405, ['success' => false, 'error' => 'Método no permitido.']);
}

if (strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) !== 'xmlhttprequest') {
    uis_json(403, ['success' => false, 'error' => 'Solicitud no reconocida.']);
}

$request = uis_read_json();
$action = strtolower(trim((string)($request['action'] ?? 'generate')));

if ($action === 'health') {
    uis_json(200, ['success' => true, 'configured' => $configured]);
}
if ($action !== 'generate') {
    uis_json(400, ['success' => false, 'error' => 'Acción no permitida.']);
}

/* Compatibilidad con los llamadores del contrato canónico. */
$images = [];
foreach (['image', 'imagen', 'imageData', 'subject', 'referenceImage'] as $field) {
    if (isset($request[$field]) && is_string($request[$field]) && trim($request[$field]) !== '') {
        $images[] = $request[$field];
    }
}
if (isset($request['images']) && is_array($request['images'])) {
    foreach ($request['images'] as $image) {
        if (is_string($image) && trim($image) !== '') $images[] = $image;
    }
}

$body = [
    'model' => (string)($request['model'] ?? 'openai-image-2-low'),
    'prompt' => (string)($request['prompt'] ?? ''),
    'aspectRatio' => (string)($request['aspectRatio'] ?? '1:1'),
    'resolution' => (int)($request['resolution'] ?? 1024),
    'images' => array_slice($images, 0, 8),
    'mask' => isset($request['mask']) && is_string($request['mask']) ? $request['mask'] : null,
    'kind' => (string)($request['kind'] ?? 'generate'),
    'projectId' => $request['projectId'] ?? null,
    'docId' => $request['docId'] ?? null,
    'docVersion' => (int)($request['docVersion'] ?? 0),
];

/* Clave de idempotencia: la del cliente o una derivada del contenido, para que
   un reintento idéntico devuelva el mismo trabajo en lugar de pagar dos veces. */
$key = (string)($request['idempotencyKey'] ?? '');
if (!uis_safe_id($key)) {
    $key = 'job_proxy_' . substr(hash('sha256', json_encode($body) . '|' . (int)floor(time() / 30)), 0, 32);
}

try {
    $job = uis_job_create($db, $body, $key);
} catch (UisHttpError $error) {
    uis_json($error->getCode(), ['success' => false, 'error' => $error->getMessage()]);
}

$payload = ['success' => true, 'job' => $job, 'model' => $body['model'], 'provider' => $job['provider'] ?? null];
if (!empty($job['image'])) {
    $payload['image'] = $job['image'];
    $payload['mimeType'] = $job['mimeType'] ?? 'image/png';
    $payload['dataUrl'] = 'data:' . $payload['mimeType'] . ';base64,' . $job['image'];
    $payload['imageUrl'] = $payload['dataUrl'];
}
uis_json(200, $payload);
