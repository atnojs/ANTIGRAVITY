<?php
// ==========================================================
// PROXY CambioOutfit (image-to-image)
// 4 modelos: Gemini Flash/Pro (clave G) + FLUX Pro/Max (clave F)
// También maneja texto (DeepSeek, clave B) y visión (Gemini, clave G).
// ===========================================================
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
    $modelInput = (string)($req['quality'] ?? 'gemini-pro');

    // Gemini Flash / Pro
    if ($modelInput === 'gemini-flash' || $modelInput === 'gemini-pro') {
        handleGeminiImage($req, $modelInput);
        return;
    }

    // FLUX Pro / Max
    if ($modelInput === 'flux-pro' || $modelInput === 'flux-max') {
        handleFluxImage($req, $modelInput);
        return;
    }

    // Fallback: FLUX
    handleFluxImage($req, 'flux-pro');
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
        echo json_encode(['error' => ['message' => 'Gemini no devolvio imagen. Intenta con FLUX.']]);
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

// FLUX IMAGE-TO-IMAGE (clave F, Black Forest Labs)
// ===========================================================
function handleFluxImage(array $req, string $modelInput): void {
    $apiKey = getKey('F');
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key FLUX (F) no configurada.']]);
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
    if ($imgBinary === false || strlen($imgBinary) > 2500000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (maximo 2.5MB).']]);
        exit;
    }

    // Clamp 4MP
    $pixels = $width * $height;
    if ($pixels > 4194304) {
        $scale  = sqrt(4194304 / $pixels);
        $width  = (int)(round($width  * $scale / 32) * 32);
        $height = (int)(round($height * $scale / 32) * 32);
        if ($width  < 32) $width  = 32;
        if ($height < 32) $height = 32;
    }

    // Endpoint segun modelo
    $endpoint = ($modelInput === 'flux-max') ? 'flux-2-max' : 'flux-2-pro';

    // ===== 1) SUBMIT =====
    $submitUrl = 'https://api.bfl.ai/v1/' . $endpoint;
    $payload = [
        'prompt'      => $prompt,
        'input_image' => $imageB64,
        'width'       => $width,
        'height'      => $height,
    ];

    $ch = curl_init($submitUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'accept: application/json',
            'x-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $submitResp = curl_exec($ch);
    $submitCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexion con FLUX: ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

    if ($submitCode >= 400) {
        $eb = json_decode($submitResp, true);
        $em = $eb['detail'] ?? ('HTTP ' . $submitCode);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($submitCode);
        echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
        exit;
    }

    $submit  = json_decode($submitResp, true);
    if (empty($submit['polling_url'])) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'FLUX no devolvio polling_url']]);
        exit;
    }
    $pollUrl = $submit['polling_url'];

    // ===== 2) POLLING (max ~90s) =====
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) {
        usleep(1500000);
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['accept: application/json', 'x-key: ' . $apiKey],
            CURLOPT_TIMEOUT        => 20,
        ]);
        $pollResp = curl_exec($ch);
        $pollCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($pollCode !== 200) continue;
        $pr     = json_decode($pollResp, true);
        $status = $pr['status'] ?? '';
        if ($status === 'Ready') {
            $imageUrl = $pr['result']['sample'] ?? '';
            break;
        }
        if (in_array($status, ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
            http_response_code(422);
            echo json_encode(['error' => ['message' => 'FLUX rechazo la tarea: ' . $status]]);
            exit;
        }
    }

    if ($imageUrl === '') {
        http_response_code(504);
        echo json_encode(['error' => ['message' => 'FLUX tardo demasiado. Intentalo de nuevo.']]);
        exit;
    }

    // ===== 3) DESCARGAR IMAGEN =====
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $imgBin  = curl_exec($ch);
    $imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
    $imgOk   = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
    curl_close($ch);

    if (!$imgOk || $imgBin === false || $imgBin === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'No se pudo descargar la imagen de FLUX.']]);
        exit;
    }

    echo json_encode([
        'success'  => true,
        'image'    => base64_encode($imgBin),
        'mimeType' => $imgType,
        'width'    => $width,
        'height'   => $height,
    ]);
}

// ===========================================================
// TEXTO (DeepSeek - clave B)
// ===========================================================
function handleText(array $req): void {
    $apiKey = getKey('B');
    if (!$apiKey) {
        $apiKey = getenv('DEEPSEEK_API_KEY') ?: '';
    }
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key DeepSeek (B) no configurada.']]);
        exit;
    }

    $prompt = (string)($req['prompt'] ?? '');
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $payload = [
        'model'       => 'deepseek-chat',
        'messages'    => [
            ['role' => 'user', 'content' => $prompt]
        ],
        'max_tokens'  => 1024,
        'temperature' => 0.7,
    ];

    $ch = curl_init('https://api.deepseek.com/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error DeepSeek: ' . curl_error($ch)]]);
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
// VISION (Gemini - clave G)
// ===========================================================
function handleVision(array $req): void {
    $apiKey = getKey('G');
    if (!$apiKey) {
        $apiKey = getKey('A');
    }
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key Gemini (G o A) no configurada.']]);
        exit;
    }

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

    $model    = 'gemini-3.1-flash-image';
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

    $payload = [
        'contents' => [[
            'parts' => [
                ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]],
                ['text' => $prompt],
            ]
        ]],
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error Gemini: ' . curl_error($ch)]]);
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
