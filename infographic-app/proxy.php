<?php
// ============================================================
// PROXY PHP para generación de infografías vía API
// Hostinger-compatible - 7 fuentes de API Key
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

// ===== 7 FUENTES DE API KEY (Hostinger) =====
$apiKey = '';

// 1. Config file local
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
}

// 2-7. Cascade de fuentes
if (empty($apiKey)) $apiKey = getenv('OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_OPENROUTER_API_KEY'] ?? '';

if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key no configurada. Crea config.php con define("OPENROUTER_API_KEY", "tu-key");']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$prompt = $data['prompt'];
$model = $data['model'] ?? 'black-forest-labs/flux-1.1-pro';
$aspectRatio = $data['aspect_ratio'] ?? '16:9';

// ===== LLAMADA A OPENROUTER =====
$openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

$payload = json_encode([
    'model' => $model,
    'messages' => [
        [
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => "Generate an infographic as an image. Output ONLY the image, no text wrapper.\n\n" . $prompt]
            ]
        ]
    ],
    'response_format' => ['type' => 'image']
]);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $openRouterUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        'X-Title: Infographic Generator'
    ],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $curlError]]);
    exit;
}

if ($httpCode !== 200) {
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
    http_response_code($httpCode);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
    exit;
}

// Devolver la respuesta de OpenRouter tal cual
echo $response;
