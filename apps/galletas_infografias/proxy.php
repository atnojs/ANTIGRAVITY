<?php
declare(strict_types=1);
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
/**
 * Proxy canónico Antigravity.
 * OPENAI_API_KEY/O = OpenAI Image 2.5, R = OpenRouter (Gemini imagen y texto 3.8 Flash).
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
    if ($model === '') $model = 'xiaomi/mimo-v2.6-pro';
    if (strlen($model) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $model) !== 1) respond(400, ['success' => false, 'error' => 'Modelo no válido.']);
    $payload['model'] = $model;
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

function handleTranslate(array $request): void {
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter no está configurada.']);
    $text = trim((string)($request['text'] ?? ''));
    if ($text === '') respond(400, ['success' => false, 'error' => 'Falta el texto a traducir.']);
    if (strlen($text) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El texto es demasiado largo.']);
    $target = trim((string)($request['target'] ?? 'en'));
    if (!in_array($target, ['en','es','fr','de','pt','it'], true)) $target = 'en';
    $systemPrompt = 'You are a professional translator. Translate the following text from Spanish to English. Return ONLY the translated text, nothing else. Do not add explanations, notes, or markdown. Keep the same formatting, line breaks, and style.';
    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $text]
    ];
    $payload = ['messages' => $messages, 'stream' => false, 'model' => 'xiaomi/mimo-v2.6-pro', 'temperature' => 0.2, 'max_tokens' => 4096];
    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key, 'Content-Type: application/json', 'accept: application/json'
    ], $payload, 120);
    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success'=>false, 'error'=>'Error al traducir.', 'detail'=>$detail]);
    }
    $translated = trim((string)($response['choices'][0]['message']['content'] ?? ''));
    if ($translated === '') respond(502, ['success' => false, 'error' => 'La traducción devolvió un resultado vacío.']);
    respond(200, [
        'success' => true, 'translated' => $translated,
        'original' => $text, 'target' => $target, 'model' => (string)($response['model'] ?? 'xiaomi/mimo-v2.6-pro')
    ]);
}

// Resolución de la clave R con la MISMA cascada que el resto de claves del
// proxy (constante + getenv/REDIRECT_/$_SERVER/$_ENV). No usa ag_image_key()
// de canonical-image-model.php: esa función referencia una variable $config
// indefinida y lanza TypeError bajo strict_types (defecto del fichero
// compartido, fuera del alcance de este encargo).
function ag_qwen_key(string $name): string
{
    if (defined($name) && is_string(constant($name)) && trim((string)constant($name)) !== '') return trim((string)constant($name));
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API) con keepalive + caché.
// Qwen tarda ~100s/imagen y nginx corta a ~55s: se mantiene viva la
// conexión con pings (curl_multi + espacios + flush) y el resultado se
// guarda en qwen_cache/ de la carpeta de la app (sys_get_temp_dir() NO
// persiste entre peticiones en Hostinger). Los reintentos del frontend
// recogen el caché o esperan con 'processing' mientras el worker termina.
// ====================================================================
function ag_qwen_generate(array $request, string $configDir = ''): array
{
    $selected = ag_image_selected((string)($request['model'] ?? ''));
    if (($selected['provider'] ?? '') !== 'qwen') {
        throw new InvalidArgumentException('Modelo no soportado.', 400);
    }
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '' && isset($request['contents'][0]['parts'])) {
        foreach ($request['contents'][0]['parts'] as $part) {
            if (!empty($part['text'])) { $prompt = trim((string)$part['text']); break; }
        }
    }
    if ($prompt === '') throw new InvalidArgumentException('Falta el prompt.', 400);
    if (strlen($prompt) > 12000) throw new LengthException('El prompt es demasiado largo.', 413);

    $images = [];
    foreach (['image', 'imagen', 'imageData', 'subject', 'referenceImage'] as $srcKey) {
        if (isset($request[$srcKey]) && is_string($request[$srcKey]) && trim($request[$srcKey]) !== '') $images[] = $request[$srcKey];
    }
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) {
            if (is_string($image) && trim($image) !== '') $images[] = $image;
            elseif (is_array($image) && !empty($image['data'])) $images[] = 'data:' . ($image['mimeType'] ?? 'image/jpeg') . ';base64,' . $image['data'];
        }
    }
    if (isset($request['contents'][0]['parts']) && is_array($request['contents'][0]['parts'])) {
        foreach ($request['contents'][0]['parts'] as $part) {
            if (!empty($part['inlineData']['data'])) $images[] = 'data:' . ($part['inlineData']['mimeType'] ?? 'image/jpeg') . ';base64,' . $part['inlineData']['data'];
        }
    }
    $images = array_slice($images, 0, 4);

    // Proporciones REALES de Qwen (set fijo): la más cercana a la imagen
    // fuente (o a la proporción pedida si no hay referencia).
    $qwenAllowed = ['1:1'=>1.0, '1:2'=>1/2, '1:4'=>1/4, '2:1'=>2.0, '2:3'=>2/3, '3:2'=>3/2, '3:4'=>3/4, '4:1'=>4.0, '4:3'=>4/3, '4:5'=>4/5, '5:4'=>5/4, '9:16'=>9/16, '16:9'=>16/9];
    $targetRatio = 0.0;
    if ($images !== []) {
        $probe = base64_decode((string)preg_replace('#^data:[^;]+;base64,#i', '', trim($images[0])), true);
        $probeInfo = ($probe === false || $probe === '') ? false : @getimagesizefromstring($probe);
        if (is_array($probeInfo) && (int)$probeInfo[0] > 0 && (int)$probeInfo[1] > 0) $targetRatio = (int)$probeInfo[0] / (int)$probeInfo[1];
    }
    if ($targetRatio <= 0) {
        $ratioParts = explode(':', ag_image_aspect((string)($request['aspectRatio'] ?? '1:1')));
        $targetRatio = max(1, (int)$ratioParts[0]) / max(1, (int)$ratioParts[1]);
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $payload = [
        'model'         => $selected['model'],
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    $pures = [];
    foreach ($images as $image) {
        [, $mime] = ag_image_input($image);
        $pure = (string)preg_replace('#^data:[^;]+;base64,#i', '', trim($image));
        $payload['input_references'][] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure]];
        $pures[] = $pure;
    }

    // Caché + candado en carpeta de la app (sys_get_temp_dir() no persiste
    // entre peticiones en Hostinger).
    $cacheKey = hash('sha256', $selected['model'] . '|' . $prompt . '|' . implode('|', $pures) . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            return ag_image_result((string)$cached['b64'], 'image/png', $selected, 'qwen');
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    // La clave solo hace falta para llamar a la API: el caché y el candado
    // se resuelven antes (un resultado cacheado no necesita clave).
    $orKey = ag_qwen_key('R');
    if ($orKey === '') throw new RuntimeException('La clave de OpenRouter no está configurada.', 500);

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): se
    // emiten espacios periódicos que no invalidan el JSON final (el parser
    // tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
        $status = curl_multi_exec($mh, $active);
        if ($active) {
            curl_multi_select($mh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($active && $status === CURLM_OK);
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err !== '') throw new RuntimeException('Error conexion OpenRouter: ' . $err, 502);
    $data = json_decode($resp, true);
    if (!is_array($data)) throw new RuntimeException('Respuesta no válida del proveedor.', 502);
    if ($code >= 400 || isset($data['error'])) {
        $em = $data['error']['message'] ?? $data['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        throw new RuntimeException('OpenRouter: ' . (string)$em, $code >= 400 ? $code : 502);
    }
    $b64 = (string)($data['data'][0]['b64_json'] ?? '');
    if ($b64 === '') throw new RuntimeException('Qwen no devolvio ninguna imagen.', 502);

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $b64]));
    @unlink($lockFile);
    return ag_image_result($b64, 'image/png', $selected, 'qwen');
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success'=>true, 'service'=>'antigravity-ai-proxy',
    'configured'=>['openai'=>getSecret('OPENAI_API_KEY') !== '' || getSecret('O') !== '', 'openrouter'=>getSecret('R') !== ''],
    'actions'=>['generate','openrouter','text','health'],
    'models'=>[
        'openai-medium'       => 'gpt-image-2.5-flare (medium)',
        'openai-high'         => 'gpt-image-2.5-flare (high)',
        'openai-xhigh'        => 'gpt-image-2.5-sunburst (xhigh)',
        'openai-max-flare'    => 'gpt-image-2.5-flare (max)',
        'openai-max-sunburst' => 'gpt-image-2.5-sunburst (max)',
        'gemini-flash'        => 'google/gemini-3.1-flash-image',
        'gemini-pro'          => 'google/gemini-3-pro-image',
        'qwen-pro'            => 'qwen/qwen-image-3-pro',
    ],
]);
if ($method !== 'POST') respond(405, ['success'=>false, 'error'=>'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success'=>false, 'error'=>'cURL no está disponible.']);
$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? $request['service'] ?? 'generate'));
if ($action === 'health') respond(200, ['success'=>true, 'configured'=>['openai'=>getSecret('OPENAI_API_KEY') !== '' || getSecret('O') !== '', 'openrouter'=>getSecret('R') !== '']]);
if (in_array($action, ['openrouter','text'], true)) handleOpenRouter($request);
if ($action === 'generate') {
    if (strtolower((string)($request['model'] ?? '')) === 'qwen-pro') {
        try {
            $result = ag_qwen_generate($request, __DIR__);
            respond(200, $result);
        } catch (Throwable $error) {
            $status = (int)$error->getCode();
            if ($status < 400 || $status > 599) $status = 500;
            respond($status, ['success' => false, 'error' => $error->getMessage()]);
        }
    }
    ag_image_response($request, __DIR__);
}
if ($action === 'translate') handleTranslate($request);
respond(400, ['success'=>false, 'error'=>'Acción no permitida.']);
