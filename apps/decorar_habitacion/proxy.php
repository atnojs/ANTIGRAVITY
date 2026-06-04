<?php
declare(strict_types=1); // <--- IMPORTANTE: Esto debe ir en la primera lÃ­nea

// DECORAR HABITACION - PROXY CORREGIDO
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ConfiguraciÃ³n de errores (para depuraciÃ³n, puedes cambiar a 0 en producciÃ³n)
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'MÃ©todo no permitido. Usa POST.']);
    exit;
}

// 2) Procesar Entrada
$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacÃ­o.']);
    exit;
}

$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON invÃ¡lido.']);
    exit;
}

// 3) Configurar Modelo y Endpoint
// Recibimos el modelo desde el JS (serÃ¡ flash para texto o gemini-3 para imÃ¡genes)
$model = $req['model'] ?? 'gemini-3.1-flash-image-preview';
$action = $req['action'] ?? 'generate';

// Endpoint estÃ¡ndar de Google Gemini
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

// 4) Construir Payload limpio
$payload = [];

if (isset($req['contents'])) {
    $payload['contents'] = $req['contents'];
    if (isset($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
}

// IMPORTANTE: Solo forzamos la respuesta de IMAGEN si la acciÃ³n es 'generate'
// Para 'analyze' o 'detect', dejamos que devuelva TEXTO normalmente.
if ($action === 'generate') {
    $payload['generationConfig']['responseModalities'] = ['IMAGE'];
}

// 5) Ejecutar cURL
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 90,
]);

$response = curl_exec($ch);

if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error de comunicaciÃ³n con Google', 'details' => $err]);
    exit;
}

$code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 500;
curl_close($ch);

// Devolver respuesta tal cual
http_response_code($code);
echo $response;
?>

