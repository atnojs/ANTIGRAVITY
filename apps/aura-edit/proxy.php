<?php
// ============================================================
// PROXY UNIFICADO — OpenAI Image 2.5 (5 calidades) + Gemini
// (Google directo, clave A por entorno).
// Selector: openai-medium / openai-high / openai-xhigh /
// openai-max-flare / openai-max-sunburst / gemini-flash /
// gemini-pro. Otros modelos rechazados (400 "Modelo no soportado").
// Respuesta SIEMPRE en formato Gemini (candidates) para no
// tocar los frontends existentes.
// Claves: SOLO entorno (getenv/REDIRECT_/$_SERVER/$_ENV).
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST.']]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// ===== Claves SOLO por entorno (patrón .htaccess de Hostinger) =====
function getKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$API_KEY = getKey('A'); // Gemini directo (Google AI)
$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');

// ===== Catálogo canónico de modelos (lista blanca exacta) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
];

// ===== Entrada =====
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

// ===== Selección de modelo (lista blanca) =====
$requested = strtolower(trim((string)($req['model'] ?? 'openai-medium')));
// Alias legacy de IDs completos de Google (flujos antiguos conservados).
if ($requested === 'gemini-3.1-flash-image-preview' || $requested === 'gemini-3.1-flash-image') $requested = 'gemini-flash';
if ($requested === 'gemini-3-pro-image-preview' || $requested === 'gemini-3-pro-image' || $requested === 'gemini-3-pro') $requested = 'gemini-pro';
// Modelo de TEXTO/VISIÓN (spec §6): xiaomi/mimo-v2.6-pro vía OpenRouter.
$textModel = '';
if ($requested === 'google/gemini-3.8-flash' || $requested === 'gemini-3.8-flash') $textModel = 'gemini-3.8-flash';

if ($textModel === '' && !isset($modelCatalog[$requested])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}

// ===== Utilidades =====
function normalizeImage(string $data): array
{
    $mime = 'image/jpeg';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $data, $m) === 1) {
        $mime = strtolower($m[1]);
        $data = substr($data, strpos($data, ',') + 1);
    }
    $binary = base64_decode($data, true);
    if ($binary === false || $binary === '') throw new InvalidArgumentException('Imagen base64 inválida.');
    if (strlen($binary) > 2500000) throw new LengthException('Imagen demasiado grande (máximo 2.5MB).');
    return [$binary, $mime];
}

function openAiSize(string $ratio): string
{
    $parts = explode(':', trim($ratio));
    $rw = max(1, (int)($parts[0] ?? 1));
    $rh = max(1, (int)($parts[1] ?? 1));
    $targetPixels = 1048576;
    $r = max(1 / 3, min(3, $rw / $rh));
    $width = max(16, (int)(round(sqrt($targetPixels * $r) / 16) * 16));
    $height = max(16, (int)(round(sqrt($targetPixels / $r) / 16) * 16));
    return $width . 'x' . $height;
}

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

function sendGeminiStyleImage(string $binary, string $mimeType = 'image/png'): void
{
    echo json_encode([
        'candidates' => [[
            'content' => ['parts' => [['inlineData' => ['data' => base64_encode($binary), 'mimeType' => $mimeType]]]],
        ]],
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// ===== Extracción de prompt e imágenes (varios formatos de frontend) =====
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
$legacyImage = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
if ($legacyImage !== '' && $images === []) {
    $images[] = ['data' => $legacyImage, 'mimeType' => (string)($req['mimeType'] ?? 'image/jpeg')];
}

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2.5 (Images API)
// ====================================================================
if (isset($modelCatalog[$requested]) && $modelCatalog[$requested]['backend'] === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']]);
        exit;
    }
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $selected = $modelCatalog[$requested];
    $aspect = (string)($req['generationConfig']['imageConfig']['aspectRatio'] ?? $req['aspectRatio'] ?? '1:1');
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $fields = ['model' => $selected['model'], 'prompt' => $prompt, 'quality' => $selected['quality'], 'size' => openAiSize($aspect)];
    $headers = ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmpPath = null;

    if ($images !== []) {
        try {
            $binaries = [];
            $mime = 'image/jpeg';
            foreach ($images as $img) {
                [$binary, $imgMime] = normalizeImage($img['data']);
                $binaries[] = $binary;
                $mime = $imgMime;
            }
            $reference = mergeImagesSideBySide($binaries);
            if ($reference === null) throw new RuntimeException('No se pudo preparar la imagen de referencia.');
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => $e->getMessage()]]);
            exit;
        }
        $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmpPath === false || file_put_contents($tmpPath, $reference) === false) {
            if ($tmpPath !== false) @unlink($tmpPath);
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
            exit;
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
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($tmpPath !== null) @unlink($tmpPath);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión con OpenAI: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode((string)$resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'OpenAI: ' . $em]]);
        exit;
    }

    $jr = json_decode((string)$resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';

    // Algunos proveedores devuelven una URL en vez de b64_json.
    if ($imageData === '' && !empty($jr['data'][0]['url'])) {
        $imageUrl = (string)$jr['data'][0]['url'];
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
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
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'OpenAI no devolvió ninguna imagen.']]);
        exit;
    }

    sendGeminiStyleImage(base64_decode($imageData), $mimeOut);
}

// ====================================================================
// BACKEND: GEMINI (Google directo, passthrough SIN cambios)
// ====================================================================

// ════════════════════════════════════════════════════════════════════════
// TEXTO/VISIÓN → OpenRouter xiaomi/mimo-v2.6-pro (clave R).
// Devuelve [$httpcode, $response] con $response en FORMA GEMINI (candidates)
// para mantener el contrato con los frontends existentes.
// ════════════════════════════════════════════════════════════════════════
$mimoTextCall = function (array $req, array $genCfg) {
    // ── Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    $orKey = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $orKey = (string)R; }
    if ($orKey === '') { $orKey = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        return [500, json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']])];
    }

    // ── system
    $systemText = '';
    if (isset($req['system']) && is_string($req['system'])) {
        $systemText = trim($req['system']);
    } else {
        $sysParts = $req['systemInstruction']['parts'] ?? $req['system_instruction']['parts'] ?? $req['payload']['systemInstruction']['parts'] ?? null;
        if (is_array($sysParts)) {
            foreach ($sysParts as $p) { if (!empty($p['text'])) { $systemText .= (string)$p['text'] . "\n"; } }
            $systemText = trim($systemText);
        }
    }

    // ── contents (formato Google) → messages (formato OpenRouter)
    $contents = null;
    if (isset($req['contents']) && is_array($req['contents'])) { $contents = $req['contents']; }
    elseif (isset($req['payload']['contents']) && is_array($req['payload']['contents'])) { $contents = $req['payload']['contents']; }

    $messages = [];
    if ($systemText !== '') { $messages[] = ['role' => 'system', 'content' => $systemText]; }

    if ($contents !== null) {
        foreach ($contents as $c) {
            if (!is_array($c)) { continue; }
            $role = (($c['role'] ?? 'user') === 'model') ? 'assistant' : 'user';
            $parts = (isset($c['parts']) && is_array($c['parts'])) ? $c['parts'] : [$c];
            $content = [];
            foreach ($parts as $p) {
                if (!empty($p['text'])) {
                    $content[] = ['type' => 'text', 'text' => (string)$p['text']];
                } elseif (!empty($p['inlineData']['data']) || !empty($p['inline_data']['data'])) {
                    $mime = (string)($p['inlineData']['mimeType'] ?? $p['inline_data']['mime_type'] ?? 'image/jpeg');
                    $data = (string)($p['inlineData']['data'] ?? $p['inline_data']['data']);
                    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $data]];
                }
            }
            if (!$content) { continue; }
            $messages[] = ['role' => $role, 'content' => (count($content) === 1 && $content[0]['type'] === 'text') ? $content[0]['text'] : $content];
        }
    } else {
        $prompt = (string)($req['prompt'] ?? '');
        if ($prompt === '') { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }
        $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
        if ($imageB64 !== '') {
            $b64 = $imageB64;
            if (strpos($b64, ',') !== false) { $b64 = substr($b64, strpos($b64, ',') + 1); }
            $mime = (string)($req['mimeType'] ?? 'image/jpeg');
            if (strpos($imageB64, 'data:image/png') === 0) { $mime = 'image/png'; }
            elseif (strpos($imageB64, 'data:image/webp') === 0) { $mime = 'image/webp'; }
            $messages[] = ['role' => 'user', 'content' => [
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
                ['type' => 'text', 'text' => $prompt],
            ]];
        } else {
            $messages[] = ['role' => 'user', 'content' => $prompt];
        }
    }

    $hasUser = false;
    foreach ($messages as $m) { if ($m['role'] === 'user' || $m['role'] === 'assistant') { $hasUser = true; break; } }
    if (!$hasUser) { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }

    // ── payload OpenRouter
    $payload = ['model' => 'xiaomi/mimo-v2.6-pro', 'messages' => $messages, 'stream' => false];
    if (isset($genCfg['temperature']) && is_numeric($genCfg['temperature'])) {
        $t = (float)$genCfg['temperature'];
        if ($t >= 0.0 && $t <= 2.0) { $payload['temperature'] = $t; }
    }
    if (isset($genCfg['maxOutputTokens']) && is_numeric($genCfg['maxOutputTokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$genCfg['maxOutputTokens']));
    }
    if (isset($genCfg['responseMimeType']) && $genCfg['responseMimeType'] === 'application/json') {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    // ── llamada OpenRouter
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => ['Content-Type: ' . 'application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) { return [500, json_encode(['error' => ['message' => 'Error cURL: ' . $err]])]; }

    $orData = json_decode($raw, true);
    if ($code >= 400 || isset($orData['error'])) {
        $msg = 'Error HTTP ' . $code;
        if (isset($orData['error']) && is_array($orData['error'])) { $msg = (string)($orData['error']['message'] ?? $msg); }
        elseif (isset($orData['error'])) { $msg = (string)$orData['error']; }
        return [$code ?: 500, json_encode(['error' => ['message' => $msg]])];
    }

    $text = '';
    if (isset($orData['choices'][0]['message']['content'])) {
        $ct = $orData['choices'][0]['message']['content'];
        $text = is_string($ct) ? $ct : json_encode($ct, JSON_UNESCAPED_UNICODE);
    }

    // ── respuesta con forma Gemini (contrato intacto)
    $gem = [
        'candidates' => [[
            'content' => ['role' => 'model', 'parts' => [['text' => $text]]],
            'finishReason' => 'STOP',
            'index' => 0,
        ]],
        'modelVersion' => 'xiaomi/mimo-v2.6-pro',
    ];
    return [200, json_encode($gem, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
};

// Detección texto vs imagen (kit §2).
$genCfg = [];
if (isset($req['generationConfig']) && is_array($req['generationConfig'])) { $genCfg = $req['generationConfig']; }
elseif (isset($req['payload']['generationConfig']) && is_array($req['payload']['generationConfig'])) { $genCfg = $req['payload']['generationConfig']; }
$reqModelName = (string)($req['model'] ?? ($req['payload']['model'] ?? ''));
$wantsImageOut = (stripos($reqModelName, 'image') !== false)
    || (isset($genCfg['responseModalities']) && is_array($genCfg['responseModalities'])
        && in_array('IMAGE', array_map('strtoupper', $genCfg['responseModalities']), true));

// Modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R).
// Solo la ruta de texto/visión usa el helper; la ruta de imagen
// (clave A / OpenAI) queda exactamente igual.
if ($textModel !== '' && !$wantsImageOut) {
    [$httpcode, $response] = $mimoTextCall($req, $genCfg);
    http_response_code((int)$httpcode);
    echo $response;
    exit;
}

if ($API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

$model = $textModel !== '' ? $textModel : $modelCatalog[$requested]['model'];
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

// Construir payload — soporte passthrough + formato sencillo
if (isset($req['contents'])) {
    $payload = ['contents' => $req['contents']];
    if (isset($req['generationConfig']) && is_array($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
} elseif (isset($req['payload']) && is_array($req['payload'])) {
    $payload = $req['payload'];
} else {
    $payloadPrompt = (string)($req['prompt'] ?? '');
    $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($payloadPrompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Control de tamaño de imagen (heredado de dibujo_lineas)
    if ($imageB64 !== '') {
        $imgBinary = base64_decode($imageB64);
        if ($imgBinary === false || strlen($imgBinary) > 2500000) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
            exit;
        }
    }

    $parts = [];
    if ($imageB64 !== '') {
        $parts[] = ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]];
    }
    $parts[] = ['text' => $payloadPrompt];

    $payload = [
        'contents' => [['parts' => $parts]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT'],
            'imageConfig' => ['imageSize' => '1K']
        ]
    ];
}

// Llamada a la API
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error cURL: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => $msg]]);
    exit;
}

// Respuesta — passthrough raw Gemini (compatible con frontends existentes)
http_response_code((int)$httpcode);
echo $response;
