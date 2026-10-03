<?php
/**
 * PROXY PHP — Generador/Editor unificado (OpenAI GPT Image 2.5 + Gemini)
 * Delega en canonical-image-model.php (ag_image_response):
 *   openai-medium / openai-high / openai-max-flare → gpt-image-2.5-flare
 *   openai-xhigh / openai-max-sunburst           → gpt-image-2.5-sunburst
 *   openai-image-2-low (low) / openai-image-2 (medium) / openai-image-2-high (high) → gpt-image-2
 *   gemini-2 → google/gemini-2.5-flash-image, gemini-flash → google/gemini-3.1-flash-image
 *   gemini-pro → google/gemini-3-pro-image, qwen-pro → qwen/qwen-image-3-pro
 * (lista cerrada) (400 "Modelo no soportado").
 * Este es el proxy PRINCIPAL de imágenes de la app (proxy.php solo conserva la
 * ruta de texto/visión y la de Qwen con keepalive + caché).
 * Backend de imágenes: OpenAI (gpt-image-2 / 2.5), Gemini y Qwen vía el contrato compartido.
 * Contrato: recibe {prompt, imagen?, model?}
 *           responde  {success:true, imageUrl, model}
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';
$agBody = json_decode(file_get_contents('php://input') ?: '', true);
$agAction = strtolower(trim((string)(is_array($agBody) ? ($agBody['action'] ?? '') : '')));

// Catálogo vigente del selector (identificadores -> modelo real). Fuente única:
// ag_image_catalog() del contrato compartido (canonical-image-model.php). Nunca
// se construye el modelo interpretando el texto que llega del cliente.
function proxyModelCatalog(): array {
    $catalog = function_exists('ag_image_catalog') ? ag_image_catalog() : [];
    $out = [];
    foreach ($catalog as $id => $entry) {
        $out[$id] = ['backend' => $entry['provider'], 'model' => $entry['model']];
        if (isset($entry['quality'])) $out[$id]['quality'] = $entry['quality'];
    }
    return $out;
}

function proxyKey(string $name): string {
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function proxyOpenAiKey(): string {
    $key = proxyKey('OPENAI_API_KEY');
    if ($key === '') $key = proxyKey('O');
    return $key;
}

// Diagnóstico (no gasta API): qué modelos de IMAGEN ofrece la cuenta de OpenAI.
function proxyOpenAiImageModels(): array {
    $key = proxyOpenAiKey();
    if ($key === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
        exit;
    }
    $cacheDir = __DIR__ . '/qwen_cache';
    $cacheFile = $cacheDir . '/openai_models.json';
    $cached = is_file($cacheFile) ? json_decode((string)@file_get_contents($cacheFile), true) : null;
    if (is_array($cached) && (time() - (int)($cached['at'] ?? 0)) < 600 && !empty($cached['ids'])) {
        return (array)$cached['ids'];
    }
    $ch = curl_init('https://api.openai.com/v1/models');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $key],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string)$raw, true);
    if ($code >= 400 || !is_array($data)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'No se pudo consultar la lista de modelos (HTTP ' . $code . ').']]);
        exit;
    }
    $ids = [];
    foreach (($data['data'] ?? []) as $model) {
        $id = (string)($model['id'] ?? '');
        if ($id !== '' && preg_match('/image/i', $id) === 1) $ids[] = $id;
    }
    sort($ids);
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    @file_put_contents($cacheFile, json_encode(['at' => time(), 'ids' => $ids], JSON_UNESCAPED_SLASHES));
    return $ids;
}

// Descubrimiento (GET): catálogo y acciones. Nunca devuelve claves.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode([
        'success'    => true,
        'service'    => 'antigravity-ai-proxy',
        'configured' => ['openai' => proxyOpenAiKey() !== '', 'openrouter' => proxyKey('R') !== ''],
        'actions'    => ['generate', 'health', 'models'],
        'models'     => proxyModelCatalog(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Salud (no gasta API): nunca devuelve claves, solo si están configuradas.
if ($agAction === 'health') {
    http_response_code(200);
    echo json_encode([
        'success'    => true,
        'configured' => ['openai' => proxyOpenAiKey() !== '', 'openrouter' => proxyKey('R') !== ''],
        'models'     => array_keys(proxyModelCatalog()),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Diagnóstico de modelos reales de la cuenta de OpenAI (filtra ids con "image").
if ($agAction === 'models') {
    http_response_code(200);
    echo json_encode(['success' => true, 'imageModels' => proxyOpenAiImageModels()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (is_array($agBody)) ag_image_response($agBody, __DIR__);

// ===== Claves =====
function getKey(string $name): string {
    foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name]??'', $_SERVER['REDIRECT_'.$name]??'', $_ENV[$name]??'', $_ENV['REDIRECT_'.$name]??''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$orKey   = getKey('R');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>['message'=>'Solo POST']]);
    exit;
}

$body = is_array($agBody) ? json_encode($agBody) : file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Cuerpo vacio']]);
    exit;
}

$data = json_decode($body, true);
if (json_last_error()!==JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'JSON invalido']]);
    exit;
}

$prompt = trim((string)($data['prompt'] ?? ''));
// Si prompt viene vacío, extraerlo de contents (formato Gemini que usa React)
if ($prompt === '' && isset($data['contents'][0]['parts'])) {
    foreach ($data['contents'][0]['parts'] as $part) {
        if (!empty($part['text'])) { $prompt = trim((string)$part['text']); break; }
    }
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Falta el campo "prompt".']]);
    exit;
}

$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';
// Si imagen viene vacía, extraerla de contents[0].parts (inlineData)
if ($imagenEntrada === '' && isset($data['contents'][0]['parts'])) {
    foreach ($data['contents'][0]['parts'] as $part) {
        if (!empty($part['inlineData']['data'])) {
            $imagenEntrada = (string)$part['inlineData']['data'];
            break;
        }
    }
}
$calidad = (string)($data['calidad'] ?? 'pro');

$aspect = (string)($data['aspectRatio'] ?? '1:1');
$allowedAspects = ['1:1','3:4','4:3','16:9','9:16','21:9'];
if (!in_array($aspect, $allowedAspects, true)) $aspect = '1:1';
$targetPx = (int)($data['targetPx'] ?? 1024);
$targetPx = max(256, min(2048, $targetPx));
$resolution = strtoupper((string)($data['resolution'] ?? '1K'));
if (!in_array($resolution, ['512','1K','2K','4K'], true)) $resolution = '1K';

$ratioParts = explode(':', $aspect);
$ratioW = max(1.0, (float)($ratioParts[0] ?? 1));
$ratioH = max(1.0, (float)($ratioParts[1] ?? 1));
if ($ratioW >= $ratioH) { $width = $targetPx; $height = $targetPx * $ratioH / $ratioW; }
else { $height = $targetPx; $width = $targetPx * $ratioW / $ratioH; }
$maxPixels = 4194304;
if ($width * $height > $maxPixels) {
    $scale = sqrt($maxPixels / ($width * $height));
    $width *= $scale; $height *= $scale;
}
$width = max(256, (int)(round($width / 32) * 32));
$height = max(256, (int)(round($height / 32) * 32));
while ($width * $height > $maxPixels) {
    if ($width >= $height) $width -= 32; else $height -= 32;
}

// ===== Seleccion de modelo (solo Gemini) =====
$reqModel = strtolower((string)($data['model'] ?? 'gemini-flash'));
if (strpos($reqModel, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Modelo no soportado.']]);
    exit;
}
$geminiModelId = 'google/gemini-3.1-flash-image';
if (strpos($reqModel, 'pro') !== false || $reqModel === 'google/gemini-3-pro-image') {
    $geminiModelId = 'google/gemini-3-pro-image';
}


// ====================================================================
// BACKEND: GEMINI mediante OpenRouter Images API
// ====================================================================
if ($orKey === '') {
    http_response_code(500);
    echo json_encode(['error'=>['message'=>'Clave OpenRouter (R) no configurada.']]);
    exit;
}

$payload = [
    'model' => $geminiModelId,
    'prompt' => $prompt,
    'aspect_ratio' => $aspect,
    'resolution' => $resolution,
    'output_format' => 'png'
];
if ($imagenEntrada !== '') {
    $imageDataUrl = $imagenEntrada;
    if (strpos($imageDataUrl, 'data:image/') !== 0) {
        $imageDataUrl = 'data:image/jpeg;base64,' . $imageDataUrl;
    }
    $payload['input_references'] = [[
        'type' => 'image_url',
        'image_url' => ['url' => $imageDataUrl]
    ]];
}

$ch = curl_init('https://openrouter.ai/api/v1/images');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey],
    CURLOPT_TIMEOUT => 180,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);
if ($err) {
    http_response_code(502);
    echo json_encode(['error'=>['message'=>'Error OpenRouter: ' . $err]]);
    exit;
}
$jr = json_decode($resp, true);
if ($code >= 400 || !is_array($jr)) {
    $message = $jr['error']['message'] ?? $jr['error'] ?? ('HTTP ' . $code);
    if (is_array($message)) $message = json_encode($message);
    http_response_code($code >= 400 ? $code : 502);
    echo json_encode(['error'=>['message'=>'OpenRouter: ' . $message]]);
    exit;
}
$imageBase64 = (string)($jr['data'][0]['b64_json'] ?? '');
$mediaType = (string)($jr['data'][0]['media_type'] ?? 'image/png');
if ($imageBase64 === '') {
    http_response_code(502);
    echo json_encode(['error'=>['message'=>'Gemini no devolvió imagen.']]);
    exit;
}
echo json_encode([
    'success' => true,
    'imageUrl' => 'data:' . $mediaType . ';base64,' . $imageBase64,
    'model' => $geminiModelId
]);
