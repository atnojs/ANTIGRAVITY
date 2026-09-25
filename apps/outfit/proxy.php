<?php
declare(strict_types=1);
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
// ==========================================================
// PROXY CambioOutfit (image-to-image)
// 7 modelos: OpenAI Image 2.5 (5 calidades, clave OPENAI_API_KEY/O)
// Imágenes: OpenAI 2.5 y Gemini vía bloque canónico. R = OpenRouter (texto/modelos compatibles).
// También maneja texto y visión (Gemini 3.8 Flash).
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

// TEXTO (Gemini 3.8 Flash via OpenRouter - clave R)
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
        'model'       => 'google/gemini-3.8-flash',
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
// VISION (Gemini 3.8 Flash directo - clave G o A)
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

    $model    = 'gemini-3.8-flash';
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
