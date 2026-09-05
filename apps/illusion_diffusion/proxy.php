<?php
// Establece la cabecera de la respuesta a JSON.
header('Content-Type: application/json');

// ===== API KEY: config.php + cascade (patrón dibujo_lineas) =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('A') ? A : '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_A'] ?? '';
}

if ($apiKey === false || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// --- MODELO ACTUALIZADO ---
// Modelo de Google AI a utilizar. Cambiado al modelo más reciente.
$model = 'gemini-3.1-flash-image-preview'; 

// URL del punto de enlace (endpoint) del API de Google AI.
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

// --- LÓGICA DEL PROXY (Esta parte no cambia) ---

// 1. Solo permite peticiones POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Método no permitido. Solo se aceptan peticiones POST.']]);
    exit;
}

// 2. Obtiene el cuerpo de la petición (JSON) enviado desde el JavaScript.
$requestBody = file_get_contents('php://input');

if (empty($requestBody)) {
    http_response_code(400); // 400 Bad Request
    echo json_encode(['error' => ['message' => 'Cuerpo de la petición vacío.']]);
    exit;
}

// 3. Prepara y ejecuta la petición cURL hacia el API de Google.
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($requestBody)
]);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error de cURL: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}

curl_close($ch);

http_response_code($httpcode);
echo $response;
?>
