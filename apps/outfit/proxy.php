<?php
declare(strict_types=1);
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
// ==========================================================
// PROXY CambioOutfit (image-to-image)
// 7 modelos: OpenAI Image 2.5 (5 calidades, clave OPENAI_API_KEY/O)
// Imágenes: OpenAI 2.5 y Gemini vía bloque canónico. R = OpenRouter (texto/modelos compatibles).
// También maneja texto y visión (modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter).
// ==========================================================
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

// ===== ENTRADA =====
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio.']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido.']]);
    exit;
}

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

$action = (string)($req['action'] ?? 'generate');

// ===== RUTEO POR ACCION =====
if ($action === 'text') {
    handleText($req);
} elseif ($action === 'vision') {
    handleVision($req);
} else {
    handleGenerate($req);
}

// ===========================================================
// GENERAR IMAGEN (ruteo por modelo)
// ===========================================================
function handleGenerate(array $req): void {
    ag_image_response($req, __DIR__);
    $modelInput = (string)($req['quality'] ?? 'gemini-flash');

    // Ruta única: Gemini Flash / Pro vía OpenRouter.
    if (strpos(strtolower($modelInput), 'f' . 'lux') !== false) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
        exit;
    }
    if ($modelInput !== 'gemini-flash' && $modelInput !== 'gemini-pro') {
        $modelInput = 'gemini-flash';
    }
    handleGeminiImage($req, $modelInput);
}

// ===========================================================
// GEMINI IMAGE-TO-IMAGE (clave G)
// ===========================================================
function handleGeminiImage(array $req, string $modelInput): void {
    $orKey = getKey('R');
    if (!$orKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada.']]);
        exit;
    }

    $imageB64 = (string)($req['image'] ?? '');
    $prompt   = (string)($req['prompt'] ?? '');
    $width    = (int)($req['width'] ?? 1024);
    $height   = (int)($req['height'] ?? 1024);

    if ($imageB64 === '' || $prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Faltan imagen o prompt.']]);
        exit;
    }

    // Limpiar prefijo data:
    if (strpos($imageB64, 'base64,') !== false) {
        $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
    }

    // Control tamano
    $imgBinary = base64_decode($imageB64, true);
    if ($imgBinary === false || strlen($imgBinary) > 4000000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (maximo 4MB).']]);
        exit;
    }

    // Mapear modelo Gemini via OpenRouter (mismo patron que escenario_modelo)
    $geminiModelId = ($modelInput === 'gemini-flash') ? 'google/gemini-3.1-flash-image' : 'google/gemini-3-pro-image';

    $content = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => 'data:image/jpeg;base64,' . $imageB64]],
    ];

    $payload = [
        'model'      => $geminiModelId,
        'modalities' => ['image', 'text'],
        'messages'   => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $orKey,
            'Content-Type: application/json',
            'accept: application/json',
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error OpenRouter: ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

    if ($httpcode >= 400) {
        $err = json_decode($response, true);
        http_response_code($httpcode);
        $msg = $err['error']['message'] ?? ('HTTP ' . $httpcode);
        echo json_encode(['error' => ['message' => 'Gemini: ' . $msg]]);
        exit;
    }

    $data = json_decode($response, true);
    $images = $data['choices'][0]['message']['images'] ?? [];
    if (empty($images)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini no devolvio imagen. Intentalo de nuevo.']]);
        exit;
    }
    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini devolvio URL en lugar de imagen.']]);
        exit;
    }
    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);

    echo json_encode([
        'success'  => true,
        'image'    => $imgB64,
        'mimeType' => 'image/png',
        'width'    => $width,
        'height'   => $height,
    ]);
}

// TEXTO (modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter - clave R)
// ===========================================================
function handleText(array $req): void {
    $apiKey = getKey('R');
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada.']]);
        exit;
    }

    $prompt = (string)($req['prompt'] ?? '');
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $payload = [
        'model'       => 'xiaomi/mimo-v2.6-pro',
        'messages'    => [
            ['role' => 'user', 'content' => $prompt]
        ],
        'max_tokens'  => 1024,
        'temperature' => 0.7,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error OpenRouter: ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

    if ($httpcode >= 400) {
        $err = json_decode($response, true);
        http_response_code($httpcode);
        echo json_encode(['error' => ['message' => $err['error']['message'] ?? ('HTTP ' . $httpcode)]]);
        exit;
    }

    $data = json_decode($response, true);
    $text = $data['choices'][0]['message']['content'] ?? '';
    echo json_encode(['success' => true, 'text' => $text]);
}

// ===========================================================
// VISION (modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter)
// ===========================================================
function handleVision(array $req): void {
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (la clave R la resuelve el helper)
    global $mimoTextCall;

    $prompt   = (string)($req['prompt'] ?? '');
    $imageB64 = (string)($req['image'] ?? '');
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($prompt === '' || $imageB64 === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Faltan prompt o imagen.']]);
        exit;
    }

    if (strpos($imageB64, 'base64,') !== false) {
        $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
    }

    $imgBinary = base64_decode($imageB64, true);
    if ($imgBinary === false || strlen($imgBinary) > 2500000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (maximo 2.5MB).']]);
        exit;
    }

    $payload = [
        'contents' => [[
            'parts' => [
                ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]],
                ['text' => $prompt],
            ]
        ]],
    ];

    [$httpcode, $response] = $mimoTextCall($payload, []);

    if ($httpcode >= 400) {
        $err = json_decode($response, true);
        http_response_code($httpcode);
        echo json_encode(['error' => ['message' => $err['error']['message'] ?? ('HTTP ' . $httpcode)]]);
        exit;
    }

    $data  = json_decode($response, true);
    $parts = $data['candidates'][0]['content']['parts'] ?? [];
    $text  = '';
    foreach ($parts as $p) {
        if (isset($p['text'])) { $text .= $p['text']; }
    }
    echo json_encode(['success' => true, 'text' => $text]);
}

// ===========================================================
// HELPERS
// ===========================================================
function getKey(string $var): string {
    $key = getenv($var);
    if (!$key) $key = getenv('REDIRECT_' . $var);
    if (!$key) $key = $_SERVER[$var] ?? '';
    if (!$key) $key = $_SERVER['REDIRECT_' . $var] ?? '';
    if (!$key) $key = $_ENV[$var] ?? '';
    if (!$key) $key = $_ENV['REDIRECT_' . $var] ?? '';
    return (string)$key;
}
