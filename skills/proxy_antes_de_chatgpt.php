<?php
/**
 * Proxy de referencia Antigravity anterior a la integración de ChatGPT.
 * Actualizado al bloque de modelos de apps/dibujo_lineas_copia.
 * O = OpenAI Images directo, R = OpenRouter para Gemini y texto.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(240);
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

function gcdInt(int $a, int $b): int {
    $a = abs($a);
    $b = abs($b);
    while ($b !== 0) {
        $next = $a % $b;
        $a = $b;
        $b = $next;
    }
    return $a > 0 ? $a : 1;
}

function imageAspectLabel(int $width, int $height): string {
    if ($width <= 0 || $height <= 0) return '1:1';
    $gcd = gcdInt($width, $height);
    return intdiv($width, $gcd) . ':' . intdiv($height, $gcd);
}

function nearestGeminiRatio(int $width, int $height, string $fallback = '1:1'): string {
    $allowed = [
        '1:1'=>1.0, '2:3'=>2/3, '3:2'=>3/2, '3:4'=>3/4, '4:3'=>4/3,
        '4:5'=>4/5, '5:4'=>5/4, '9:16'=>9/16, '16:9'=>16/9, '21:9'=>21/9,
    ];
    if ($width <= 0 || $height <= 0) return isset($allowed[$fallback]) ? $fallback : '1:1';
    $ratio = $width / $height;
    $best = '1:1';
    $distance = PHP_FLOAT_MAX;
    foreach ($allowed as $label => $value) {
        $current = abs($ratio - $value);
        if ($current < $distance) {
            $best = $label;
            $distance = $current;
        }
    }
    return $best;
}

function openAiOutputSize(int $width, int $height): string {
    if ($width <= 0 || $height <= 0) return '1024x1024';
    $ratio = max(1 / 3, min(3, $width / $height));
    $targetPixels = 1048576;
    $outWidth = max(16, (int)(round(sqrt($targetPixels * $ratio) / 16) * 16));
    $outHeight = max(16, (int)(round(sqrt($targetPixels / $ratio) / 16) * 16));
    while ($outWidth / $outHeight > 3) $outHeight += 16;
    while ($outHeight / $outWidth > 3) $outWidth += 16;
    return $outWidth . 'x' . $outHeight;
}

function respondImage(string $binary, string $mime, array $meta): void {
    $info = @getimagesizefromstring($binary);
    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    $base64 = base64_encode($binary);
    respond(200, $meta + [
        'success'=>true, 'width'=>$width, 'height'=>$height,
        'aspectRatio'=>imageAspectLabel($width, $height),
        'mimeType'=>$mime, 'image'=>$base64,
        'dataUrl'=>'data:' . $mime . ';base64,' . $base64,
    ]);
}

function handleImage(array $request): void {
    $models = [
        'openai-medium'=>['provider'=>'openai', 'model'=>'gpt-image-2', 'quality'=>'medium'],
        'openai-high'=>['provider'=>'openai', 'model'=>'gpt-image-2', 'quality'=>'high'],
        'gemini-flash'=>['provider'=>'openrouter', 'model'=>'google/gemini-3.1-flash-image'],
        'gemini-pro'=>['provider'=>'openrouter', 'model'=>'google/gemini-3-pro-image'],
    ];
    $requestedModel = strtolower(trim((string)($request['model'] ?? 'openai-medium')));
    if (!isset($models[$requestedModel])) respond(400, ['success'=>false, 'error'=>'Modelo de imagen no permitido.']);
    $selected = $models[$requestedModel];

    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') respond(400, ['success'=>false, 'error'=>'Falta el prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success'=>false, 'error'=>'El prompt es demasiado largo.']);

    $input = '';
    if (isset($request['image']) && is_string($request['image'])) $input = trim($request['image']);
    if ($input === '' && isset($request['images'][0]) && is_string($request['images'][0])) $input = trim($request['images'][0]);
    $inputBase64 = $input === '' ? '' : base64Image($input);
    $inputBinary = $inputBase64 === '' ? '' : (string)base64_decode($inputBase64, true);
    $mimeType = strtolower(trim((string)($request['mimeType'] ?? 'image/jpeg')));
    if (!in_array($mimeType, ['image/png','image/jpeg','image/webp'], true)) $mimeType = 'image/jpeg';

    $sourceInfo = $inputBinary === '' ? false : @getimagesizefromstring($inputBinary);
    $sourceWidth = (int)($sourceInfo[0] ?? 0);
    $sourceHeight = (int)($sourceInfo[1] ?? 0);
    if ($sourceWidth <= 0 || $sourceHeight <= 0) {
        [$sourceWidth, $sourceHeight] = dimensions($request);
    }
    $outputSize = openAiOutputSize($sourceWidth, $sourceHeight);
    $geminiRatio = nearestGeminiRatio($sourceWidth, $sourceHeight, (string)($request['aspectRatio'] ?? '1:1'));

    if ($selected['provider'] === 'openrouter') {
        $key = getSecret('R');
        if ($key === '') respond(500, ['success'=>false, 'error'=>'La clave de OpenRouter no está configurada.']);
        $content = [['type'=>'text', 'text'=>$prompt]];
        if ($inputBase64 !== '') {
            $content[] = ['type'=>'image_url', 'image_url'=>['url'=>'data:' . $mimeType . ';base64,' . $inputBase64]];
        }
        [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
            'Authorization: Bearer ' . $key, 'Content-Type: application/json', 'accept: application/json'
        ], [
            'model'=>$selected['model'], 'modalities'=>['image','text'],
            'messages'=>[['role'=>'user', 'content'=>$content]], 'max_tokens'=>8000,
            'image_config'=>['aspect_ratio'=>$geminiRatio],
        ], 120);
        if ($status < 200 || $status >= 300 || isset($response['error'])) {
            $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
            respond($status >= 400 && $status < 600 ? $status : 502, ['success'=>false, 'error'=>'OpenRouter no pudo generar la imagen.', 'detail'=>$detail]);
        }
        $dataUrl = (string)($response['choices'][0]['message']['images'][0]['image_url']['url'] ?? '');
        if (preg_match('#^data:(image/(?:png|jpeg|webp));base64,(.+)$#s', $dataUrl, $match) !== 1) {
            respond(502, ['success'=>false, 'error'=>'Gemini no devolvió una imagen válida.']);
        }
        $binary = base64_decode($match[2], true);
        if ($binary === false || $binary === '') respond(502, ['success'=>false, 'error'=>'La imagen devuelta por Gemini no se pudo decodificar.']);
        respondImage($binary, $match[1], ['provider'=>'openrouter', 'model'=>$selected['model']]);
    }

    $key = getSecret('O');
    if ($key === '') $key = getSecret('OPENAI_API_KEY');
    if ($key === '') respond(500, ['success'=>false, 'error'=>'La clave de OpenAI no está configurada.']);

    if ($inputBinary !== '') {
        $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmpPath === false || file_put_contents($tmpPath, $inputBinary) === false) {
            if ($tmpPath !== false) @unlink($tmpPath);
            respond(500, ['success'=>false, 'error'=>'No se pudo preparar la imagen de referencia.']);
        }
        $extension = $mimeType === 'image/png' ? 'png' : ($mimeType === 'image/webp' ? 'webp' : 'jpg');
        $payload = [
            'model'=>$selected['model'], 'prompt'=>$prompt, 'quality'=>$selected['quality'],
            'size'=>$outputSize, 'image[]'=>new CURLFile($tmpPath, $mimeType, 'referencia.' . $extension),
        ];
        $ch = curl_init('https://api.openai.com/v1/images/edits');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$payload,
            CURLOPT_HTTPHEADER=>['Authorization: Bearer ' . $key],
            CURLOPT_CONNECTTIMEOUT=>20, CURLOPT_TIMEOUT=>180,
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        @unlink($tmpPath);
        if ($raw === false) respond(502, ['success'=>false, 'error'=>'Error conectando con OpenAI.', 'detail'=>$error]);
        $response = json_decode($raw, true);
        if (!is_array($response)) respond(502, ['success'=>false, 'error'=>'OpenAI devolvió una respuesta no válida.']);
    } else {
        [$status, $response] = requestJson('https://api.openai.com/v1/images/generations', 'POST', [
            'Authorization: Bearer ' . $key, 'Content-Type: application/json', 'accept: application/json'
        ], [
            'model'=>$selected['model'], 'prompt'=>$prompt, 'quality'=>$selected['quality'],
            'size'=>$outputSize, 'output_format'=>'png',
        ], 180);
    }

    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success'=>false, 'error'=>'OpenAI no pudo generar la imagen.', 'detail'=>$detail]);
    }
    $outputBase64 = (string)($response['data'][0]['b64_json'] ?? '');
    $binary = base64_decode($outputBase64, true);
    if ($binary === false || $binary === '') respond(502, ['success'=>false, 'error'=>'OpenAI no devolvió una imagen válida.']);
    respondImage($binary, 'image/png', [
        'provider'=>'openai', 'model'=>$selected['model'], 'quality'=>$selected['quality'],
    ]);
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success'=>true, 'service'=>'antigravity-ai-proxy',
    'configured'=>['openai'=>getSecret('O') !== '' || getSecret('OPENAI_API_KEY') !== '', 'openrouter'=>getSecret('R') !== ''],
    'actions'=>['generate','openrouter','text','health'],
    'imageModels'=>[
        'openai-medium'=>['model'=>'gpt-image-2', 'quality'=>'medium'],
        'openai-high'=>['model'=>'gpt-image-2', 'quality'=>'high'],
        'gemini-flash'=>['model'=>'google/gemini-3.1-flash-image'],
        'gemini-pro'=>['model'=>'google/gemini-3-pro-image'],
    ],
]);
if ($method !== 'POST') respond(405, ['success'=>false, 'error'=>'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success'=>false, 'error'=>'cURL no está disponible.']);
$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? 'generate'));
if ($action === 'health') respond(200, ['success'=>true, 'configured'=>['openai'=>getSecret('O') !== '' || getSecret('OPENAI_API_KEY') !== '', 'openrouter'=>getSecret('R') !== '']]);
if (in_array($action, ['openrouter','text'], true)) handleOpenRouter($request);
if ($action === 'generate') handleImage($request);
respond(400, ['success'=>false, 'error'=>'Acción no permitida.']);
