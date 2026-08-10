<?php
/**
 * Proxy canónico Antigravity.
 * F = FLUX (imágenes), R = OpenRouter (texto/modelos compatibles).
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(130);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_BYTES = 12000;
const MAX_OUTPUT_PIXELS = 4194304;

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getSecret(string $name): string {
    $config = __DIR__ . '/config.php';
    if (is_file($config)) {
        include_once $config;
        if (defined($name) && is_string(constant($name)) && constant($name) !== '') {
            return trim((string)constant($name));
        }
    }
    $values = [
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ];
    foreach ($values as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function readJsonBody(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
        respond(413, ['success' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
    }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON válido.']);
    }
    return $data;
}

function requestJson(string $url, string $method, array $headers, ?array $body = null, int $timeout = 45): array {
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($body !== null) {
        $encoded = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) respond(500, ['success' => false, 'error' => 'No se pudo preparar la solicitud.']);
        $options[CURLOPT_POSTFIELDS] = $encoded;
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false) respond(502, ['success' => false, 'error' => 'Error conectando con el proveedor.', 'detail' => $error]);
    $json = json_decode($raw, true);
    if (!is_array($json)) respond(502, ['success' => false, 'error' => 'El proveedor devolvió una respuesta no válida.']);
    return [$status, $json];
}

function round32(float $value): int {
    return max(256, (int)(round($value / 32) * 32));
}

function dimensions(array $request): array {
    $allowed = [512, 1024, 2048, 4096];
    $resolution = (int)($request['resolution'] ?? 1024);
    if (!in_array($resolution, $allowed, true)) $resolution = 1024;
    $ratios = ['1:1'=>[1,1], '16:9'=>[16,9], '9:16'=>[9,16], '4:3'=>[4,3], '3:4'=>[3,4], '3:2'=>[3,2], '2:3'=>[2,3]];
    $ratio = (string)($request['aspectRatio'] ?? '1:1');
    [$rw, $rh] = $ratios[$ratio] ?? $ratios['1:1'];
    if (isset($request['width'], $request['height'])) {
        $width = round32((float)$request['width']);
        $height = round32((float)$request['height']);
    } elseif ($rw >= $rh) {
        $width = $resolution;
        $height = round32($resolution * $rh / $rw);
    } else {
        $height = $resolution;
        $width = round32($resolution * $rw / $rh);
    }
    $adjusted = false;
    if ($width * $height > MAX_OUTPUT_PIXELS) {
        $scale = sqrt(MAX_OUTPUT_PIXELS / ($width * $height));
        $width = round32($width * $scale);
        $height = round32($height * $scale);
        while ($width * $height > MAX_OUTPUT_PIXELS) {
            if ($width >= $height) $width -= 32; else $height -= 32;
        }
        $adjusted = true;
    }
    return [$width, $height, $ratio, $resolution, $adjusted];
}

function base64Image(string $value): string {
    $value = trim($value);
    if (preg_match('#^data:image/(?:png|jpe?g|webp);base64,#i', $value) === 1) {
        $value = substr($value, strpos($value, ',') + 1);
    }
    $binary = base64_decode($value, true);
    if ($binary === false) respond(400, ['success' => false, 'error' => 'Una imagen no contiene base64 válido.']);
    if (strlen($binary) > MAX_IMAGE_BYTES) respond(413, ['success' => false, 'error' => 'Una imagen supera 20 MB.']);
    return $value;
}

function handleOpenRouter(array $request): void {
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter no está configurada.']);
    $messages = $request['messages'] ?? null;
    if (!is_array($messages) || $messages === []) {
        $prompt = trim((string)($request['prompt'] ?? ''));
        if ($prompt === '') respond(400, ['success' => false, 'error' => 'Faltan messages o prompt.']);
        if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);
        $messages = [];
        $system = trim((string)($request['system'] ?? ''));
        if ($system !== '') $messages[] = ['role' => 'system', 'content' => $system];
        $messages[] = ['role' => 'user', 'content' => $prompt];
    }
    if (count($messages) > 100) respond(400, ['success' => false, 'error' => 'Demasiados mensajes.']);
    foreach ($messages as $message) {
        if (!is_array($message) || !in_array((string)($message['role'] ?? ''), ['system','user','assistant','tool'], true) || !array_key_exists('content', $message)) {
            respond(400, ['success' => false, 'error' => 'La estructura de messages no es válida.']);
        }
    }
    $payload = ['messages' => array_values($messages), 'stream' => false];
    $model = trim((string)($request['model'] ?? ''));
    if ($model !== '') {
        if (strlen($model) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $model) !== 1) respond(400, ['success' => false, 'error' => 'Modelo no válido.']);
        $payload['model'] = $model;
    }
    if (isset($request['temperature']) && is_numeric($request['temperature'])) $payload['temperature'] = max(0.0, min(2.0, (float)$request['temperature']));
    if (isset($request['max_tokens']) && is_numeric($request['max_tokens'])) $payload['max_tokens'] = max(1, min(32768, (int)$request['max_tokens']));
    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key, 'Content-Type: application/json', 'accept: application/json'
    ], $payload, 120);
    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success'=>false, 'error'=>'OpenRouter no pudo completar la solicitud.', 'detail'=>$detail]);
    }
    respond(200, [
        'success'=>true, 'provider'=>'openrouter', 'model'=>(string)($response['model'] ?? $model),
        'text'=>(string)($response['choices'][0]['message']['content'] ?? ''),
        'usage'=>$response['usage'] ?? null, 'response'=>$response,
    ]);
}

function handleGenerate(array $request): void {
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') respond(400, ['success' => false, 'error' => 'Falta el prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);

    // Determinar backend según modelo (skill_maestra: 4 modelos)
    $reqModel = strtolower((string)($request['model'] ?? $request['quality'] ?? 'gemini-pro'));
    $backend = 'flux';
    $geminiModelId = 'google/gemini-3.1-flash-image';
    $fluxEndpoint = 'flux-2-pro';

    if (strpos($reqModel, 'max') !== false) {
        $backend = 'flux';
        $fluxEndpoint = 'flux-2-max';
    } elseif ((strpos($reqModel, 'pro') !== false && strpos($reqModel, 'gemini') !== false) || $reqModel === 'google/gemini-3-pro-image' || $reqModel === 'gemini-pro') {
        $backend = 'gemini';
        $geminiModelId = 'google/gemini-3-pro-image';
    } elseif (strpos($reqModel, 'flash') !== false || $reqModel === 'google/gemini-3.1-flash-image' || $reqModel === 'gemini-flash') {
        $backend = 'gemini';
        $geminiModelId = 'google/gemini-3.1-flash-image';
    }

    if ($backend === 'gemini') {
        handleGeminiImage($request, $prompt, $geminiModelId);
        return;
    }
    handleFluxGenerate($request, $prompt, $fluxEndpoint);
}

function handleGeminiImage(array $request, string $prompt, string $geminiModelId): void {
    $orKey = getSecret('R');
    if ($orKey === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter (R) no está configurada.']);

    $images = [];
    if (isset($request['image']) && is_string($request['image']) && trim($request['image']) !== '') $images[] = $request['image'];
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) if (is_string($image) && trim($image) !== '') $images[] = $image;
    }
    if (count($images) > 8) respond(400, ['success' => false, 'error' => 'Máximo ocho imágenes de referencia.']);

    $content = [];
    $content[] = ['type' => 'text', 'text' => $prompt];
    foreach ($images as $image) {
        $mime = 'image/jpeg';
        if (strpos($image, 'data:image/png') === 0) $mime = 'image/png';
        elseif (strpos($image, 'data:image/webp') === 0) $mime = 'image/webp';
        $b64 = strpos($image, ',') !== false ? substr($image, strpos($image, ',') + 1) : $image;
        $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]];
    }

    $payload = [
        'model' => $geminiModelId,
        'modalities' => ['image', 'text'],
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];

    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: *** ' . $orKey, 'Content-Type: application/json', 'accept: application/json'
    ], $payload, 120);

    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success' => false, 'error' => 'Gemini no pudo completar la solicitud.', 'detail' => $detail]);
    }

    $images = $response['choices'][0]['message']['images'] ?? [];
    if (empty($images)) respond(502, ['success' => false, 'error' => 'Gemini no devolvió imagen.']);
    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) respond(502, ['success' => false, 'error' => 'Gemini devolvió URL en lugar de imagen.']);
    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);

    respond(200, [
        'success' => true, 'provider' => 'gemini', 'model' => $geminiModelId,
        'mimeType' => 'image/png', 'image' => $imgB64,
        'dataUrl' => 'data:image/png;base64,' . $imgB64,
    ]);
}

function handleFluxGenerate(array $request, string $prompt, string $fluxEndpoint): void {
    $key = getSecret('F');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave FLUX no está configurada.']);
    $format = strtolower((string)($request['output_format'] ?? 'png'));
    if (!in_array($format, ['png','jpeg','webp'], true)) respond(400, ['success' => false, 'error' => 'Formato no permitido.']);
    [$width, $height, $ratio, $requested, $adjusted] = dimensions($request);
    $payload = ['prompt'=>$prompt, 'width'=>$width, 'height'=>$height, 'output_format'=>$format];
    $images = [];
    if (isset($request['image']) && is_string($request['image']) && trim($request['image']) !== '') $images[] = $request['image'];
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) if (is_string($image) && trim($image) !== '') $images[] = $image;
    }
    if (count($images) > 8) respond(400, ['success' => false, 'error' => 'Máximo ocho imágenes de referencia.']);
    foreach ($images as $i => $image) $payload[$i === 0 ? 'input_image' : 'input_image_' . ($i + 1)] = base64Image($image);
    if (isset($request['seed']) && is_numeric($request['seed'])) $payload['seed'] = (int)$request['seed'];
    $headers = ['accept: application/json', 'Content-Type: application/json', 'x-key: ' . $key];
    [$status, $submit] = requestJson('https://api.bfl.ai/v1/' . $models[$quality], 'POST', $headers, $payload);
    if ($status < 200 || $status >= 300) respond($status ?: 502, ['success'=>false, 'error'=>'FLUX rechazó la solicitud.', 'detail'=>$submit['detail'] ?? $submit]);
    $pollUrl = (string)($submit['polling_url'] ?? '');
    $host = strtolower((string)parse_url($pollUrl, PHP_URL_HOST));
    if ($pollUrl === '' || preg_match('/(^|\.)bfl\.ai$/', $host) !== 1) respond(502, ['success'=>false, 'error'=>'URL de seguimiento FLUX no válida.']);
    $resultUrl = '';
    $last = 'Pending';
    for ($i = 0; $i < 90; $i++) {
        usleep(1000000);
        [$pollStatus, $poll] = requestJson($pollUrl, 'GET', ['accept: application/json', 'x-key: ' . $key], null, 20);
        if ($pollStatus !== 200) continue;
        $last = (string)($poll['status'] ?? 'Pending');
        if ($last === 'Ready') { $resultUrl = (string)($poll['result']['sample'] ?? ''); break; }
        if (in_array($last, ['Error','Failed','Request Moderated','Content Moderated'], true)) respond(422, ['success'=>false, 'error'=>'FLUX no pudo completar la tarea.', 'status'=>$last]);
    }
    if ($resultUrl === '' || parse_url($resultUrl, PHP_URL_SCHEME) !== 'https') respond(504, ['success'=>false, 'error'=>'FLUX tardó demasiado.', 'status'=>$last]);
    $ch = curl_init($resultUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>15, CURLOPT_TIMEOUT=>60, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_MAXREDIRS=>3]);
    $binary = curl_exec($ch);
    $downloadStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $mime = (string)(curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png');
    curl_close($ch);
    if ($binary === false || $binary === '' || $downloadStatus !== 200) respond(502, ['success'=>false, 'error'=>'No se pudo descargar el resultado.']);
    $base64 = base64_encode($binary);
    respond(200, [
        'success'=>true, 'provider'=>'flux', 'model'=>$models[$quality], 'quality'=>$quality,
        'width'=>$width, 'height'=>$height, 'aspectRatio'=>$ratio,
        'requestedResolution'=>$requested, 'resolutionAdjusted'=>$adjusted,
        'mimeType'=>$mime, 'image'=>$base64, 'dataUrl'=>'data:' . $mime . ';base64,' . $base64,
    ]);
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success'=>true, 'service'=>'antigravity-ai-proxy',
    'configured'=>['flux'=>getSecret('F') !== '', 'openrouter'=>getSecret('R') !== ''],
    'actions'=>['generate','openrouter','text','health'],
    'models'=>[
        'gemini-flash' => 'google/gemini-3.1-flash-image',
        'gemini-pro'   => 'google/gemini-3-pro-image',
        'flux-pro'     => 'flux-2-pro',
        'flux-max'     => 'flux-2-max',
    ],
]);
if ($method !== 'POST') respond(405, ['success'=>false, 'error'=>'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success'=>false, 'error'=>'cURL no está disponible.']);
$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? 'generate'));
if ($action === 'health') respond(200, ['success'=>true, 'configured'=>['flux'=>getSecret('F') !== '', 'openrouter'=>getSecret('R') !== '']]);
if (in_array($action, ['openrouter','text'], true)) handleOpenRouter($request);
if ($action === 'generate') handleGenerate($request);
respond(400, ['success'=>false, 'error'=>'Acción no permitida.']);
