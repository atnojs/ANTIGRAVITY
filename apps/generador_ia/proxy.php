<?php
// ============================================================
// PROXY PHP - Generador / Editor de imágenes con IA (OpenRouter)
// Oculta la clave OPENROUTER_API_KEY del frontend.
// Compatible Hostinger (cascade de 7 fuentes de clave).
// ============================================================

header('Content-Type: application/json; charset=utf-8');
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

// ===== CLAVE API: cascade de fuentes (Hostinger) =====
$apiKey = '';

// 1. Config file local (máxima prioridad)
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
}

// 2-7. Variables de entorno / superglobales
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

if (!$data || !isset($data['prompt']) || trim((string)$data['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$prompt = (string)$data['prompt'];

// Presets de calidad -> modelo real de OpenRouter (mismos que el script original)
$MODELOS = [
    'barato' => 'google/gemini-3.1-flash-lite-image',
    'normal' => 'google/gemini-2.5-flash-image',
    'pro'    => 'google/gemini-3-pro-image',
];
$calidad = $data['calidad'] ?? 'normal';
$model = $MODELOS[$calidad] ?? $MODELOS['normal'];

// Imagen de entrada opcional (data URL) para EDITAR
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

// ===== CONSTRUIR CONTENIDO =====
if ($imagenEntrada !== '') {
    $content = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => $imagenEntrada]],
    ];
} else {
    $content = $prompt;
}

$payload = json_encode([
    'model' => $model,
    'messages' => [['role' => 'user', 'content' => $content]],
    'modalities' => ['image', 'text'],
]);

// ===== LLAMADA A OPENROUTER =====
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://openrouter.ai/api/v1/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        'X-Title: Generador de Imagenes IA',
    ],
    CURLOPT_TIMEOUT => 180,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
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
    $errMsg = $errBody['error']['message'] ?? ('HTTP ' . $httpCode);
    http_response_code($httpCode);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
    exit;
}

// ===== EXTRAER IMAGEN + COSTE =====
$parsed = json_decode($response, true);
$msg = $parsed['choices'][0]['message'] ?? [];
$imgs = $msg['images'] ?? [];

if (empty($imgs) || empty($imgs[0]['image_url']['url'])) {
    http_response_code(502);
    $texto = is_string($msg['content'] ?? null) ? substr($msg['content'], 0, 300) : '';
    echo json_encode(['error' => ['message' => 'El modelo no devolvió imagen. ' . $texto]]);
    exit;
}

$imageUrl = $imgs[0]['image_url']['url']; // data:image/...;base64,....
$coste = (float)($parsed['usage']['cost'] ?? 0.0);

echo json_encode([
    'success'  => true,
    'imageUrl' => $imageUrl,
    'coste'    => $coste,
    'modelo'   => $model,
    'calidad'  => $calidad,
]);
