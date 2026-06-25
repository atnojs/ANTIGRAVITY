<?php
header('Content-Type: application/json; charset=utf-8');

// 1) API Key cascade — patrón estándar (A)
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

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// 2) Método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

// 3) Entrada
$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacío.']);
    exit;
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido.']);
    exit;
}

// 4) Modelo
$model = $req['model'] ?? 'gemini-2.5-flash-image';
unset($req['model']); // No enviar en el body a Gemini

$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

// 5) cURL
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($req),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error cURL: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}
curl_close($ch);

http_response_code($httpcode ?: 502);
echo $response;
