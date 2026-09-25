<?php
declare(strict_types=1);
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
/**
 * Proxy canónico Antigravity.
 * Imágenes: OpenAI 2.5 y Gemini vía bloque canónico. R = OpenRouter (texto/modelos compatibles).
 */

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

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API)
// Catálogo: 'qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']
// El bloque canónico compartido es síncrono: Qwen tarda ~100s/imagen y
// nginx corta a ~55s, así que esta ruta va con keepalive (curl_multi +
// espacios + flush) y caché/lock en la carpeta de la app (qwen_cache/):
// los reintentos del frontend recogen el resultado aunque nginx corte.
// ====================================================================
function handleQwenImage(array $request): void {
    $qwenCatalog = ['qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']];
    $requested = strtolower(trim((string)($request['model'] ?? 'qwen-pro')));
    if ($requested === 'qwen/qwen-image-3-pro') $requested = 'qwen-pro';
    $qwenModel = $qwenCatalog[$requested]['model'];

    // Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    $orKey = getSecret('R');
    if ($orKey === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter (R) no está configurada.']);
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') respond(400, ['success' => false, 'error' => 'Falta el prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);

    // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
    // a la imagen fuente (nunca se finge una proporción inexistente).
    $qwenAllowed = ['1:1'=>1.0,'1:2'=>1/2,'1:4'=>1/4,'2:1'=>2.0,'2:3'=>2/3,'3:2'=>3/2,'3:4'=>3/4,'4:1'=>4.0,'4:3'=>4/3,'4:5'=>4/5,'5:4'=>5/4,'9:16'=>9/16,'16:9'=>16/9];
    $ar = explode(':', trim((string)($request['aspectRatio'] ?? '1:1')));
    $rw = max(1, (int)($ar[0] ?? 1));
    $rh = max(1, (int)($ar[1] ?? 1));
    $targetRatio = $rw / $rh;
    $qwenRatio = '1:1';
    $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $qwenPayload = [
        'model'         => $qwenModel,
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    $images = [];
    if (isset($request['image']) && is_string($request['image']) && trim($request['image']) !== '') $images[] = $request['image'];
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) {
            if (is_string($image) && trim($image) !== '') $images[] = $image;
        }
    }
    foreach (array_slice($images, 0, 4) as $image) {
        $mime = 'image/jpeg';
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', (string)$image, $m) === 1) $mime = strtolower($m[1]);
        $pure = (string)preg_replace('#^data:[^;]+;base64,#i', '', trim((string)$image));
        $qwenPayload['input_references'][] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure],
        ];
    }

    // Qwen Image 3 Pro puede tardar más que el timeout de nginx (~55s):
    // un worker genera y guarda el resultado (ignore_user_abort), y los
    // reintentos del frontend recogen el caché o esperan con 'processing'.
    $cacheKey = hash('sha256', $qwenModel . '|' . $prompt . '|' . $qwenRatio . '|' . implode('|', $images));
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            respond(200, ag_image_result((string)$cached['b64'], 'image/png', ['id' => 'qwen-pro'], 'qwen'));
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        respond(202, ['status' => 'processing']);
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): la
    // generación puede tardar más; se emiten espacios periódicos que no
    // invalidan el JSON final (el parser tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $mh = curl_multi_init();
    curl_multi_add_handle($mh, $ch);
    do {
        $mhStatus = curl_multi_exec($mh, $active);
        if ($active) {
            curl_multi_select($mh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($active && $mhStatus === CURLM_OK);
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err) respond(502, ['success' => false, 'error' => 'Error conectando con OpenRouter.', 'detail' => $err]);
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        respond($code >= 400 && $code < 600 ? $code : 502, ['success' => false, 'error' => 'OpenRouter no pudo completar la solicitud.', 'detail' => (string)$em]);
    }

    $jr = json_decode($resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') respond(502, ['success' => false, 'error' => 'Qwen no devolvió ninguna imagen.']);

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    respond(200, ag_image_result($imageData, 'image/png', ['id' => 'qwen-pro'], 'qwen'));
}

function handleGenerate(array $request): void {
    $qwenReqModel = strtolower(trim((string)($request['model'] ?? '')));
    if ($qwenReqModel === 'qwen-pro' || $qwenReqModel === 'qwen/qwen-image-3-pro') {
        handleQwenImage($request);
        return;
    }
    ag_image_response($request, __DIR__);
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') respond(400, ['success' => false, 'error' => 'Falta el prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);

        // Ruta única: Gemini imagen vía OpenRouter (bloque canónico).
    $reqModel = strtolower((string)($request['model'] ?? $request['quality'] ?? 'gemini-flash'));
    if (strpos($reqModel, 'f' . 'lux') !== false) {
        respond(400, ['success' => false, 'error' => 'Modelo no soportado.']);
    }
    $geminiModelId = 'google/gemini-3.1-flash-image';
    if ((strpos($reqModel, 'pro') !== false && strpos($reqModel, 'gemini') !== false) || $reqModel === 'google/gemini-3-pro-image' || $reqModel === 'gemini-pro') {
        $geminiModelId = 'google/gemini-3-pro-image';
    }
    handleGeminiImage($request, $prompt, $geminiModelId);
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
        'Authorization: Bearer ' . $orKey, 'Content-Type: application/json', 'accept: application/json'
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

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success'=>true, 'service'=>'antigravity-ai-proxy',
    'configured'=>['openrouter'=>getSecret('R') !== ''],
    'actions'=>['generate','openrouter','text','health'],
    'models'=>[
        'openai-medium'       => 'gpt-image-2.5-flare',
        'openai-high'         => 'gpt-image-2.5-flare',
        'openai-xhigh'        => 'gpt-image-2.5-sunburst',
        'openai-max-flare'    => 'gpt-image-2.5-flare',
        'openai-max-sunburst' => 'gpt-image-2.5-sunburst',
        'gemini-flash'        => 'google/gemini-3.1-flash-image',
        'gemini-pro'          => 'google/gemini-3-pro-image',
        'qwen-pro'            => 'qwen/qwen-image-3-pro',
    ],
]);
if ($method !== 'POST') respond(405, ['success'=>false, 'error'=>'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success'=>false, 'error'=>'cURL no está disponible.']);
$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? 'generate'));
if ($action === 'health') respond(200, ['success'=>true, 'configured'=>['openrouter'=>getSecret('R') !== '']]);
if (in_array($action, ['openrouter','text'], true)) handleOpenRouter($request);
if ($action === 'generate') handleGenerate($request);
respond(400, ['success'=>false, 'error'=>'Acción no permitida.']);
