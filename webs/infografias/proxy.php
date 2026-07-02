<?php
header('Content-Type: application/json');

// ===== 1) API KEY: config.php + cascade (patrón dibujo_lineas) =====
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

// ===== 2) Validar método =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

// ===== 3) Leer entrada =====
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido']]);
    exit;
}

$prompt = trim((string)($req['prompt'] ?? ''));
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt"']]);
    exit;
}

// ===== 4) Llamada a Gemini =====
$model = 'gemini-2.5-flash-image';
$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $prompt]
        ]
    ]],
    'generationConfig' => [
        'responseModalities' => ['IMAGE', 'TEXT']
    ]
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
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

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => $msg]]);
    exit;
}

// ===== 5) Extraer imagen generada =====
$candidates = $data['candidates'] ?? [];
$imageData = '';
$mimeOut = 'image/png';

foreach ($candidates as $cand) {
    foreach ($cand['content']['parts'] ?? [] as $part) {
        if (isset($part['inlineData'])) {
            $imageData = $part['inlineData']['data'] ?? '';
            $mimeOut = $part['inlineData']['mimeType'] ?? 'image/png';
        }
    }
}

if ($imageData === '') {
    echo json_encode([
        'text' => 'El modelo no generó imagen.'
    ]);
    exit;
}

echo json_encode([
    'candidates' => [[
        'content' => [
            'parts' => [[
                'inlineData' => [
                    'mimeType' => $mimeOut,
                    'data' => $imageData
                ]
            ]]
        ]
    ]]
]);
