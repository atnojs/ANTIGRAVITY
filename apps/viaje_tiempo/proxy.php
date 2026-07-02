<?php
header('Content-Type: application/json');

// ===== API KEY: config.php + cascade (patrón dibujo_lineas) =====
$API_KEY = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $API_KEY = defined('A') ? A : '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('REDIRECT_A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['REDIRECT_A'] ?? '';
}

if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Method not allowed']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    } else {
        header('Access-Control-Allow-Headers: Content-Type, Authorization, x-goog-api-key, x-goog-api-client');
    }
    http_response_code(204);
    exit;
}

// Extract path, e.g., /v1alpha/models/...
$pathInfo = $_GET['path'] ?? '/';

// The new SDK uses either v1beta or v1alpha
$apiUrl = "https://generativelanguage.googleapis.com" . $pathInfo . "?key=" . $API_KEY;

$requestBody = file_get_contents('php://input');

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($requestBody)
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Set CORS if needed
header('Access-Control-Allow-Origin: *');
http_response_code($httpcode);
echo $response;
?>
