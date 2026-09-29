<?php
// ============================================================
// PROXY — FusionAI Studio (transferir_estilo)
// Catálogo canónico de generación de imágenes:
//   OpenAI GPT Image 2.5: openai-medium / openai-high / openai-xhigh /
//     openai-max-flare / openai-max-sunburst
//   OpenAI image 2 (gpt-image-2): openai-image-2 (medium) / openai-image-2-high (high)
//   Gemini 2 vía OpenRouter: gemini-2 → google/gemini-2.5-flash-image
//   Gemini 3 vía OpenRouter: gemini-flash (3.1 Flash) / gemini-pro (3 Pro)
//   Qwen Image 3 Pro vía OpenRouter Image API: qwen-pro
// Modelo por defecto: openai-image-2.
//
// Contrato con el frontend (index.html / app.tsx):
//   recibe  { model?, prompt?, contents: [ { inlineData: { mimeType, data } }, ... ] }
//   responde { image: <base64 sin prefijo>, mimeType, width, height, aspectRatio }
//   El frontend hace `result.image` y monta él mismo el data URL.
//   También se acepta la forma canónica { model, prompt, contents:[{ parts:[...] }] }
//   y { image | base64ImageData }.
//
// Acciones de diagnóstico: {"action":"health"} y {"action":"models"}.
// Claves: SOLO entorno (getenv / REDIRECT_ / $_SERVER / $_ENV), con las claves
// protegidas en el .htaccess raíz de Hostinger (SetEnv R / SetEnv OPENAI_API_KEY).
// NUNCA se leen ficheros locales de configuración.
// Este fichero faltaba en el repositorio aunque el frontend ya lo llamaba.
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== Claves SOLO por entorno (patrón .htaccess de Hostinger) =====
function getKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (is_string($v) && trim($v) !== '') return trim($v);
    }
    return '';
}

$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');
$orKey = getKey('R');

// ===== Catálogo canónico (lista blanca exacta) =====
function agImageCatalog(): array
{
    return [
        'openai-medium'       => ['provider' => 'openai',     'model' => 'gpt-image-2.5-flare',    'quality' => 'medium'],
        'openai-high'         => ['provider' => 'openai',     'model' => 'gpt-image-2.5-flare',    'quality' => 'high'],
        'openai-xhigh'        => ['provider' => 'openai',     'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
        'openai-max-flare'    => ['provider' => 'openai',     'model' => 'gpt-image-2.5-flare',    'quality' => 'max'],
        'openai-max-sunburst' => ['provider' => 'openai',     'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
        'openai-image-2'      => ['provider' => 'openai',     'model' => 'gpt-image-2',            'quality' => 'medium'],
        'openai-image-2-high' => ['provider' => 'openai',     'model' => 'gpt-image-2',            'quality' => 'high'],
        'gemini-2'            => ['provider' => 'openrouter', 'model' => 'google/gemini-2.5-flash-image'],
        'gemini-flash'        => ['provider' => 'openrouter', 'model' => 'google/gemini-3.1-flash-image'],
        'gemini-pro'          => ['provider' => 'openrouter', 'model' => 'google/gemini-3-pro-image'],
        'qwen-pro'            => ['provider' => 'qwen',       'model' => 'qwen/qwen-image-3-pro'],
    ];
}

function respondJson(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendImageResponse(string $binary, string $mimeType = 'image/png'): never
{
    $info = @getimagesizefromstring($binary);
    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    respondJson(200, [
        'success'     => true,
        'image'       => base64_encode($binary),
        'mimeType'    => $mimeType,
        'width'       => $width,
        'height'      => $height,
        'aspectRatio' => ($width > 0 && $height > 0) ? ($width . ':' . $height) : null,
    ]);
}

function openAiOutputSize(string $ratio): string
{
    $parts = explode(':', trim($ratio));
    $rw = max(1, (int)($parts[0] ?? 1));
    $rh = max(1, (int)($parts[1] ?? 1));
    // GPT Image 2 admite tamaños arbitrarios en múltiplos de 16 (~1 MP): se
    // conserva la proporción sin disparar el coste.
    $targetPixels = 1048576;
    $r = max(1 / 3, min(3, $rw / $rh));
    $width = max(16, (int)(round(sqrt($targetPixels * $r) / 16) * 16));
    $height = max(16, (int)(round(sqrt($targetPixels / $r) / 16) * 16));
    return $width . 'x' . $height;
}

function decodeImageInput(string $value): array
{
    $value = trim($value);
    $mime = 'image/jpeg';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $value, $m) === 1) {
        $mime = strtolower($m[1]);
        $value = substr($value, strpos($value, ',') + 1);
    }
    $binary = base64_decode($value, true);
    if ($binary === false || $binary === '') throw new InvalidArgumentException('Imagen base64 inválida.');
    if (strlen($binary) > 20 * 1024 * 1024) throw new LengthException('La imagen supera 20 MB.');
    return [$binary, $mime];
}

// Une varias imágenes de referencia en una sola (la API de edición de OpenAI
// recibe una única imagen de entrada y este proxy no usa máscara).
function mergeImagesSideBySide(array $binaries): ?string
{
    if (count($binaries) === 0) return null;
    if (count($binaries) === 1) return $binaries[0];
    if (!function_exists('imagecreatefromstring')) return null;
    $imgs = [];
    foreach ($binaries as $binary) {
        $im = @imagecreatefromstring($binary);
        if ($im === false) return null;
        $imgs[] = $im;
    }
    $width = 0;
    $height = 1;
    foreach ($imgs as $im) {
        $width += imagesx($im);
        $height = max($height, imagesy($im));
    }
    $canvas = imagecreatetruecolor($width, $height);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledrectangle($canvas, 0, 0, $width, $height, $white);
    $x = 0;
    foreach ($imgs as $im) {
        imagecopy($canvas, $im, $x, 0, 0, 0, imagesx($im), imagesy($im));
        $x += imagesx($im);
        imagedestroy($im);
    }
    ob_start();
    imagejpeg($canvas, null, 92);
    $out = ob_get_clean();
    imagedestroy($canvas);
    return is_string($out) && $out !== '' ? $out : null;
}

// ===== Entrada (JSON o formulario) =====
$requestMethod = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$rawBody = ($requestMethod === 'POST') ? (string)file_get_contents('php://input') : '';
$req = [];
if ($rawBody !== '') {
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $req = $decoded;
    } else {
        parse_str($rawBody, $formData);
        $req = is_array($formData) ? $formData : [];
    }
}

$action = strtolower(trim((string)(($req['action'] ?? '') ?: ($_GET['action'] ?? ''))));
$catalog = agImageCatalog();

// ===== Acciones de diagnóstico (no gastan cuota) =====
// health: también responde a GET sin acción. NUNCA devuelve claves.
if ($action === 'health' || ($action === '' && $requestMethod === 'GET')) {
    respondJson(200, [
        'success'    => true,
        'status'     => 'ok',
        'configured' => ['openai' => $openaiKey !== '', 'openrouter' => $orKey !== ''],
        'actions'    => ['generate', 'health', 'models'],
        'models'     => array_keys($catalog),
    ]);
}

// models: lista REAL de modelos de imagen de la API de OpenAI (nunca la clave).
if ($action === 'models') {
    if ($openaiKey === '') {
        respondJson(500, ['success' => false, 'error' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']);
    }
    if (!function_exists('curl_init')) {
        respondJson(500, ['success' => false, 'error' => 'cURL no habilitado.']);
    }
    $modelsCache = __DIR__ . '/qwen_cache/openai_models.json';
    $ids = null;
    $cached = is_file($modelsCache) ? json_decode((string)@file_get_contents($modelsCache), true) : null;
    if (is_array($cached) && (time() - (int)($cached['at'] ?? 0)) < 600 && !empty($cached['ids'])) {
        $ids = (array)$cached['ids'];
    } else {
        $ch = curl_init('https://api.openai.com/v1/models');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $openaiKey],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 15,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string)$resp, true);
        if ($code >= 400 || !is_array($data)) {
            respondJson(502, ['success' => false, 'error' => 'No se pudo consultar la lista de modelos (HTTP ' . $code . ').']);
        }
        $ids = [];
        foreach (($data['data'] ?? []) as $model) {
            $id = (string)($model['id'] ?? '');
            if ($id !== '' && preg_match('/image/i', $id) === 1) $ids[] = $id;
        }
        sort($ids);
        $dir = dirname($modelsCache);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        @file_put_contents($modelsCache, json_encode(['at' => time(), 'ids' => $ids], JSON_UNESCAPED_SLASHES));
    }
    respondJson(200, ['success' => true, 'imageModels' => $ids]);
}

if ($requestMethod !== 'POST') {
    respondJson(405, ['success' => false, 'error' => 'Solo POST (o GET con action=health|models).']);
}
if (!function_exists('curl_init')) {
    respondJson(500, ['success' => false, 'error' => 'cURL no habilitado.']);
}

// ===== Selección de modelo (lista blanca) =====
$requested = strtolower(trim((string)($req['model'] ?? 'openai-image-2')));
// Alias legacy de ids completos (flujos antiguos conservados).
if ($requested === 'gemini-3.1-flash-image-preview' || $requested === 'gemini-3.1-flash-image') $requested = 'gemini-flash';
if ($requested === 'gemini-3-pro-image-preview' || $requested === 'gemini-3-pro-image' || $requested === 'gemini-3-pro') $requested = 'gemini-pro';
if ($requested === 'gemini-2.5-flash-image' || $requested === 'google/gemini-2.5-flash-image') $requested = 'gemini-2';
if (!isset($catalog[$requested])) {
    respondJson(400, ['success' => false, 'error' => 'Modelo no soportado.', 'models' => array_keys($catalog)]);
}
$selected = $catalog[$requested];

// ===== Prompt e imágenes de entrada (varias formas de frontend) =====
$prompt = trim((string)($req['prompt'] ?? ''));
$images = [];
if (isset($req['contents'][0]['parts']) && is_array($req['contents'][0]['parts'])) {
    foreach ($req['contents'][0]['parts'] as $part) {
        if (!is_array($part)) continue;
        if ($prompt === '' && !empty($part['text'])) $prompt = trim((string)$part['text']);
        if (!empty($part['inlineData']['data'])) {
            $images[] = ['data' => (string)$part['inlineData']['data'], 'mimeType' => (string)($part['inlineData']['mimeType'] ?? 'image/jpeg')];
        }
    }
}
// Forma que envía este frontend: contents: [ { inlineData }, { inlineData } ].
foreach ((array)($req['contents'] ?? []) as $contentPart) {
    if (!is_array($contentPart)) continue;
    if (!empty($contentPart['inlineData']['data'])) {
        $images[] = ['data' => (string)$contentPart['inlineData']['data'], 'mimeType' => (string)($contentPart['inlineData']['mimeType'] ?? 'image/jpeg')];
    } elseif (!empty($contentPart['parts']) && is_array($contentPart['parts'])) {
        foreach ($contentPart['parts'] as $part) {
            if (!is_array($part)) continue;
            if (!empty($part['inlineData']['data'])) {
                $images[] = ['data' => (string)$part['inlineData']['data'], 'mimeType' => (string)($part['inlineData']['mimeType'] ?? 'image/jpeg')];
            }
        }
    }
}
$legacyImage = (string)($req['image'] ?? $req['imagen'] ?? $req['base64ImageData'] ?? '');
if ($legacyImage !== '') {
    $images[] = ['data' => $legacyImage, 'mimeType' => (string)($req['mimeType'] ?? 'image/jpeg')];
}
$images = array_slice($images, 0, 8);

$aspect = (string)($req['generationConfig']['imageConfig']['aspectRatio'] ?? $req['aspectRatio'] ?? '1:1');
if ($prompt === '' && $images !== []) {
    $prompt = 'Fusiona de forma natural y coherente todas las imágenes de referencia en una sola imagen final de alta calidad: '
        . 'conserva la identidad, los sujetos y la composición de cada referencia integrándolos sin costuras, '
        . 'con iluminación y estilo consistentes y sin añadir elementos que no aparezcan en las referencias.';
}
if ($prompt === '') {
    respondJson(400, ['success' => false, 'error' => 'Falta el prompt.']);
}
if (strlen($prompt) > 12000) {
    respondJson(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);
}

// ====================================================================
// BACKEND: OPENAI (GPT Image 2.5 / image 2). Sin referencia → generations;
// con referencia → edits (multipart/form-data).
// ====================================================================
if ($selected['provider'] === 'openai') {
    if ($openaiKey === '') {
        respondJson(500, ['success' => false, 'error' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']);
    }
    $fields = [
        'model'   => $selected['model'],
        'prompt'  => $prompt,
        'quality' => $selected['quality'],
        'size'    => openAiOutputSize($aspect),
    ];
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $headers = ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmpPath = null;

    if ($images !== []) {
        try {
            $binaries = [];
            $mime = 'image/jpeg';
            foreach ($images as $img) {
                [$binary, $imgMime] = decodeImageInput((string)$img['data']);
                $binaries[] = $binary;
                $mime = $imgMime;
            }
            $reference = mergeImagesSideBySide($binaries);
            if ($reference === null) throw new RuntimeException('No se pudo preparar la imagen de referencia.');
        } catch (Throwable $e) {
            respondJson(400, ['success' => false, 'error' => $e->getMessage()]);
        }
        $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmpPath === false || file_put_contents($tmpPath, $reference) === false) {
            if ($tmpPath !== false) @unlink($tmpPath);
            respondJson(500, ['success' => false, 'error' => 'No se pudo preparar la imagen para OpenAI.']);
        }
        $ext = str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg');
        $fields['image[]'] = new CURLFile($tmpPath, $mime, 'referencia.' . $ext);
        $endpoint = 'https://api.openai.com/v1/images/edits';
        $headers = ['Authorization: Bearer ' . $openaiKey];
        $postFields = $fields;
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $postFields,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($tmpPath !== null) @unlink($tmpPath);

    if ($err) {
        respondJson(502, ['success' => false, 'error' => 'Error de conexión con OpenAI: ' . $err]);
    }
    $jr = json_decode((string)$resp, true);
    if ($code >= 400 || !is_array($jr)) {
        $em = is_array($jr) ? ($jr['error']['message'] ?? ('HTTP ' . $code)) : ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        respondJson($code >= 400 ? $code : 502, ['success' => false, 'error' => 'OpenAI: ' . $em]);
    }
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';

    // Algunos proveedores devuelven una URL en vez de b64_json.
    if ($imageData === '' && !empty($jr['data'][0]['url'])) {
        $imageUrl = (string)$jr['data'][0]['url'];
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 60,
        ]);
        $download = curl_exec($ch);
        $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if (is_string($download) && $download !== '') {
            $imageData = base64_encode($download);
            if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
        }
    }
    if ($imageData === '') {
        respondJson(502, ['success' => false, 'error' => 'OpenAI no devolvió ninguna imagen.']);
    }
    sendImageResponse(base64_decode($imageData), $mimeOut);
}

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API)
// ====================================================================
if ($selected['provider'] === 'qwen') {
    if ($orKey === '') {
        respondJson(500, ['success' => false, 'error' => 'Clave OpenRouter (R) no configurada.']);
    }
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qwenParts = explode(':', $aspect);
    $qwenTarget = max(1, (int)($qwenParts[0] ?? 1)) / max(1, (int)($qwenParts[1] ?? 1));
    $qwenRatio = '1:1';
    $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($qwenTarget - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }
    $qwenPayload = [
        'model'         => $selected['model'],
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    foreach ($images as $img) {
        [$binary, $mime] = decodeImageInput((string)$img['data']);
        $qwenPayload['input_references'][] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . base64_encode($binary)]];
    }

    // Qwen puede tardar más que el timeout de nginx (~55s): caché + lock en la
    // carpeta de la app, y los reintentos del frontend recogen el resultado.
    $qwenCacheKey = hash('sha256', $selected['model'] . '|' . $prompt . '|' . json_encode($qwenPayload['input_references'] ?? []) . '|' . $qwenRatio);
    $qwenCacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($qwenCacheDir)) @mkdir($qwenCacheDir, 0755, true);
    $qwenCacheFile = $qwenCacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $qwenCacheKey . '.json';
    $qwenLockFile = $qwenCacheFile . '.lock';
    if (is_file($qwenCacheFile)) {
        $cached = json_decode((string)@file_get_contents($qwenCacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            sendImageResponse(base64_decode((string)$cached['b64']), 'image/png');
        }
    }
    if (is_file($qwenLockFile) && (time() - (int)@filemtime($qwenLockFile)) < 300) {
        respondJson(202, ['success' => false, 'status' => 'processing']);
    }
    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($qwenLockFile, (string)time());
    register_shutdown_function(static function () use ($qwenLockFile, $qwenCacheFile) {
        if (is_file($qwenLockFile) && !is_file($qwenCacheFile)) @unlink($qwenLockFile);
    });
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey],
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

    if ($err) {
        respondJson(502, ['success' => false, 'error' => 'Error conexión OpenRouter: ' . $err]);
    }
    $jr = json_decode($resp, true);
    if ($code >= 400 || !is_array($jr)) {
        $em = is_array($jr) ? ($jr['error']['message'] ?? ('HTTP ' . $code)) : ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        respondJson($code >= 400 ? $code : 502, ['success' => false, 'error' => 'OpenRouter: ' . $em]);
    }
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') {
        respondJson(502, ['success' => false, 'error' => 'Qwen no devolvió imagen.']);
    }
    @file_put_contents($qwenCacheFile, json_encode(['b64' => $imageData]));
    @unlink($qwenLockFile);
    sendImageResponse(base64_decode($imageData), 'image/png');
}

// ====================================================================
// BACKEND: GEMINI vía OpenRouter (gemini-2 / gemini-flash / gemini-pro).
// El catálogo guarda el id completo del proveedor (google/…).
// ====================================================================
if ($orKey === '') {
    respondJson(500, ['success' => false, 'error' => 'Clave OpenRouter (R) no configurada.']);
}
$geminiContent = [['type' => 'text', 'text' => $prompt]];
foreach ($images as $img) {
    try {
        [$binary, $mime] = decodeImageInput((string)$img['data']);
    } catch (Throwable $e) {
        respondJson(400, ['success' => false, 'error' => $e->getMessage()]);
    }
    $geminiContent[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . base64_encode($binary)]];
}

$geminiPayload = [
    'model'        => $selected['model'],
    'modalities'   => ['image', 'text'],
    'messages'     => [['role' => 'user', 'content' => $geminiContent]],
    'max_tokens'   => 8000,
    // OpenRouter reenvía esta configuración al proveedor Gemini.
    'image_config' => ['aspect_ratio' => $aspect],
];
$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($geminiPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey],
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    respondJson(502, ['success' => false, 'error' => 'Error conexión OpenRouter: ' . $err]);
}
$jr = json_decode((string)$resp, true);
if ($code >= 400 || !is_array($jr) || isset($jr['error'])) {
    $em = is_array($jr) ? ($jr['error']['message'] ?? ('HTTP ' . $code)) : ('HTTP ' . $code);
    if (is_array($em)) $em = json_encode($em);
    respondJson($code >= 400 ? $code : 502, ['success' => false, 'error' => 'OpenRouter: ' . $em]);
}
$dataUrl = (string)($jr['choices'][0]['message']['images'][0]['image_url']['url'] ?? '');
if ($dataUrl === '' || strpos($dataUrl, 'data:') !== 0) {
    respondJson(502, ['success' => false, 'error' => 'Gemini no devolvió imagen.']);
}
$mimeOut = 'image/png';
if (preg_match('#^data:(image/[^;]+);#i', $dataUrl, $m) === 1) $mimeOut = strtolower($m[1]);
sendImageResponse(base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1)), $mimeOut);
