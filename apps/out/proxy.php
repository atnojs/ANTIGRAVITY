<?php
// proxy.php — Cascadeo robusto (config.php → env → REDIRECT_ → $_SERVER → $_ENV)
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(E_ALL);

// API Key — cascadeo robusto
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('GEMINI_API_KEY');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_GEMINI_API_KEY');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_GEMINI_API_KEY'] ?? '';
}
// Fallback: la vieja variable 'A'
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('A') ?: '';
}
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'La clave de API no está configurada en el servidor.']);
    exit();
}

// Obtener los datos POST
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['targetUrl']) || !isset($data['payload'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de la solicitud no válidos.', 'data' => $data]);
    exit();
}

$targetUrl = $data['targetUrl'];
$payload = $data['payload'];

// Construir la URL final con la clave
$finalApiUrl = $targetUrl . '?key=' . urlencode($apiKey);

// cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $finalApiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => false,
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de cURL: ' . curl_error($ch)]);
    curl_close($ch);
    exit();
}
curl_close($ch);

// Reenviar el código de estado y la respuesta
http_response_code($httpcode);

if ($httpcode >= 400) {
    echo json_encode([
        'error' => 'Error en la API de Google',
        'status' => $httpcode,
        'response' => json_decode($response),
        'url' => $finalApiUrl
    ]);
} else {
    echo $response;
}
