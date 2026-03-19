<?php
// Proxy para Google Gemini — PHP 8+, cURL habilitado.
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// CORS básico
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
        echo json_encode(['error' => 'Fallo interno en PHP', 'details' => $e['message']]);
    }
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no está habilitado en el servidor.']);
    exit;
}

// API Key desde variable de entorno (.htaccess -> SetEnv)
$API_KEY = getenv('GEMINI_KEY_FLASH_IMAGE');
if (!$API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta la API key. Configura GEMINI_KEY_FLASH_IMAGE en .htaccess.']);
    exit;
}

// Entrada
$raw = file_get_contents('php://input') ?: '';
$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido o vacío.']);
    exit;
}

// Modelo y payload
$model = (string)($req['model'] ?? 'gemini-2.0-flash-exp-image-generation');
if ($model === '' || stripos($model, 'flah') !== false) {
    $model = 'gemini-2.0-flash-exp-image-generation';
}

$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

if (isset($req['contents'])) {
    // Passthrough completo en formato Gemini
    $payload = ['contents' => $req['contents']];
    if (isset($req['generationConfig']) && is_array($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
} elseif (isset($req['payload']) && is_array($req['payload'])) {
    // Passthrough vía 'payload'
    $payload = $req['payload'];
} else {
    // Formato sencillo: prompt + base64ImageData + mimeType
    $prompt   = trim((string)($req['prompt'] ?? ''));
    $imageB64 = (string)($req['base64ImageData'] ?? '');
    $mime     = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($prompt === '' || $imageB64 === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan campos: prompt o base64ImageData.']);
        exit;
    }

    $payload = [
        'contents' => [[
            'parts' => [
                ['text' => $prompt],
                ['inlineData' => [
                    'mimeType' => $mime,
                    'data' => $imageB64
                ]]
            ]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE']
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
]);

$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error de comunicación con Google', 'details' => $err]);
    exit;
}

$code = (int)(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
curl_close($ch);

http_response_code($code);
echo $response;
