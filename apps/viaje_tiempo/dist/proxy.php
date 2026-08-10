<?php
/**
 * CHRONOS BOOTH - Gemini Proxy
 * VersiÃ³n segura: La API Key se lee del entorno (.htaccess)
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// ConfiguraciÃ³n de seguridad: Encabezados CORS (Ajustar segÃºn necesidad)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 0. Si viene por GET con un pollinationsUrl, hacemos de puente para evitar el CSP del navegador
if (isset($_GET['pollinationsUrl'])) {
    $url = $_GET['pollinationsUrl'];
    
    // Antispam / Security Check: Solo permitir fetch a pollinations.ai (evita SSRF)
    if (strpos($url, 'https://image.pollinations.ai/') !== 0) {
        http_response_code(403);
        exit('Forbidden target.');
    }
    
    // Hostinger a veces restringe file_get_contents en URLs, mejor usar cURL puro
    header('Content-Type: image/jpeg');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_exec($ch);
    curl_close($ch);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'MÃ©todo no permitido. Usa POST, excepto para el puente GET de Pollinations.']);
    exit;
}

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

// 2. Lectura del cuerpo de la peticiÃ³n
$inputJson = file_get_contents('php://input');
$requestData = json_decode($inputJson, true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON invÃ¡lido o vacÃ­o.']);
    exit;
}

// 3. Determinar el modelo, el endpoint y los datos extras
$model = $requestData['model'] ?? 'gemini-2.5-flash-image';
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

// 4. Preparar payload
$payload = [
    'contents' => $requestData['contents'] ?? []
];

if (isset($requestData['generationConfig'])) {
    $payload['generationConfig'] = $requestData['generationConfig'];
}

// 5. Preparar la llamada a Google
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Error de conexiÃ³n con la IA', 'details' => $curlError]);
    exit;
}

// 5. Devolver la respuesta de Google tal cual
http_response_code($httpCode);
echo $response;

