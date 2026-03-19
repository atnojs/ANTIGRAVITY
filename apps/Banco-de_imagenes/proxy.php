<?php
declare(strict_types=1);

// Configuración de errores
ini_set('display_errors', '0');
error_reporting(E_ALL);

// CORS Headers - MUY IMPORTANTE
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validación POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Solo POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no habilitado']);
    exit;
}

// CORRECCIÓN CRÍTICA: Intenta GEMINI_API_KEY primero, luego C (como fallback)
$apiKey = getenv('GEMINI_API_KEY') ?: getenv('A') ?: $_SERVER['GEMINI_API_KEY'] ?? $_SERVER['C'] ?? false;

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key no configurada. Usar SetEnv GEMINI_API_KEY o SetEnv C en .htaccess']);
    exit;
}

// Input validation
$requestBody = file_get_contents('php://input');
if (!$requestBody) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacío']);
    exit;
}

$requestData = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !isset($requestData['prompt']) || trim($requestData['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt requerido']);
    exit;
}

$prompt = $requestData['prompt'];

// Usar modelo correcto
$model = 'gemini-3.1-flash-image-preview';
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

$payload = json_encode([
    'contents' => [[
        'parts' => [['text' => $prompt]]
    ]],
    'generationConfig' => [
        'responseModalities' => ['Text', 'Image'],
        'temperature' => 0.4,
    ]
]);

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error cURL', 'details' => $error]);
    exit;
}

curl_close($ch);

// Si la API devuelve error, reenviarlo
if ($httpcode >= 400) {
    $errorData = json_decode($response, true);
    $msg = $errorData['error']['message'] ?? 'Error desconocido de Gemini';
    http_response_code($httpcode);
    echo json_encode(['error' => 'Error Gemini API', 'details' => $msg]);
    exit;
}

// Verificar respuesta válida
$data = json_decode($response, true);
if (!$data || !isset($data['candidates'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Respuesta inválida', 'details' => substr($response, 0, 200)]);
    exit;
}

http_response_code($httpcode);
echo $response;
?>
