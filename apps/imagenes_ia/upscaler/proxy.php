<?php
// Proxy Gemini — PHP 8+, cURL habilitado.
// Upscaler Pro: enhance + passthrough. Basado en el patrón robusto de dibujo_lineas.
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

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Fallo interno en PHP', 'details' => $e['message']]]);
    }
});

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

// 1) API Key — cascadeo robusto (config.php → env → REDIRECT_ → $_SERVER → $_ENV)
$API_KEY = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $API_KEY = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('GEMINI_API_KEY');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('REDIRECT_GEMINI_API_KEY');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['GEMINI_API_KEY'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['REDIRECT_GEMINI_API_KEY'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['GEMINI_API_KEY'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['REDIRECT_GEMINI_API_KEY'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key no configurada.']]);
    exit;
}

// 2) Entrada
$raw = file_get_contents('php://input') ?: '';
if (empty($raw)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}
$req = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

// Validación de tamaño de imágenes (patrón dibujo_lineas)
$imageFields = ['imageData', 'base64ImageData', 'image'];
foreach ($imageFields as $field) {
    $imgData = (string)($req[$field] ?? '');
    if ($imgData !== '') {
        $decoded = base64_decode($imgData);
        if ($decoded === false || strlen($decoded) > 2500000) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
            exit;
        }
        break;
    }
}

$task = $req['task'] ?? '';

// --- TAREA: ENHANCE (ediciÃ³n fiel de imagen, NO generaciÃ³n) ---
if ($task === 'enhance') {
    $imageData = $req['imageData'] ?? '';
    $mimeType  = $req['mimeType'] ?? 'image/jpeg';
    $prompt    = $req['prompt'] ?? '';

    if (empty($imageData) || empty($prompt)) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Faltan campos: imageData o prompt.']]);
        exit;
    }

    // Usar gemini-2.0-flash-exp o el modelo de ediciÃ³n mÃ¡s fiel disponible
    $model = 'gemini-2.5-flash-image';
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['inlineData' => ['data' => $imageData, 'mimeType' => $mimeType]],
                ['text' => $prompt]
            ]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.0
        ]
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);

    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error cURL: ' . $err]]);
        exit;
    }

    $code = (int)(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
    curl_close($ch);

    // Extraer imagen de la respuesta
    $data = json_decode($response, true);

    if ($code < 200 || $code >= 300) {
        http_response_code($code);
        $msg = $data['error']['message'] ?? 'Error HTTP ' . $code;
        echo json_encode(['error' => ['message' => 'API Error: ' . $msg]]);
        exit;
    }

    $imageB64 = null;
    $mime = 'image/png';
    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $p) {
            if (isset($p['inlineData']['data'])) {
                $imageB64 = $p['inlineData']['data'];
                $mime = $p['inlineData']['mimeType'] ?? 'image/png';
                break;
            }
        }
    }

    if ($imageB64) {
        echo json_encode(['image' => $imageB64, 'mimeType' => $mime, 'type' => 'image']);
    } else {
        // No devolviÃ³ imagen, puede haber devuelto texto explicativo
        $textResponse = '';
        if (isset($data['candidates'][0]['content']['parts'])) {
            foreach ($data['candidates'][0]['content']['parts'] as $p) {
                if (isset($p['text'])) $textResponse .= $p['text'];
            }
        }
        http_response_code(422);
        echo json_encode([
            'error' => ['message' => 'Gemini no devolvió imagen mejorada.'],
            'text' => $textResponse,
            'reason' => $data['candidates'][0]['finishReason'] ?? 'unknown'
        ]);
    }
    exit;
}

// --- PASSTHROUGH GENÃ‰RICO (compatibilidad con el formato anterior) ---
$model = (string)($req['model'] ?? 'gemini-2.5-flash-image');
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

if (isset($req['contents'])) {
    $payload = ['contents' => $req['contents']];
    if (isset($req['generationConfig']) && is_array($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
} elseif (isset($req['payload']) && is_array($req['payload'])) {
    $payload = $req['payload'];
} else {
    $prompt   = trim((string)($req['prompt'] ?? ''));
    $imageB64 = (string)($req['base64ImageData'] ?? '');
    $mime     = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($prompt === '' || $imageB64 === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Faltan campos: prompt o base64ImageData.']]);
        exit;
    }

    $payload = [
        'contents' => [[
            'parts' => [
                ['text' => $prompt],
                ['inlineData' => ['mimeType' => $mime, 'data' => $imageB64]]
            ]
        ]],
        'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']]
    ];
}

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error cURL: ' . $err]]);
    exit;
}
$code = (int)(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
curl_close($ch);

http_response_code($code);
echo $response;

