<?php
// Proxy para Gemini - Generación de infografías
// PHP 8+, cURL habilitado. API Key vía .htaccess (SetEnv)
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        echo json_encode(['error' => 'Fallo interno en PHP', 'details' => $e['message']]);
    }
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no está habilitado en el servidor.']);
    exit;
}

// 1) API Key desde .htaccess
$API_KEY = getenv('GEMINI_KEY_ANGULOS');
if (!$API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta la API key. Configura SetEnv GEMINI_KEY_ANGULOS en .htaccess.']);
    exit;
}

// 2) Leer entrada
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

$prompt = trim((string)($req['prompt'] ?? ''));
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Falta el campo "prompt".']);
    exit;
}

// 3) Modelo Gemini con capacidad de generación de imágenes
$model = $req['model'] ?? 'gemini-2.5-flash-image';
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

// 4) Construir payload - generar infografía como imagen
$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $prompt]
        ]
    ]],
    'generationConfig' => [
        'responseModalities' => ['TEXT', 'IMAGE']
    ]
];

// 5) cURL
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
    echo json_encode(['error' => 'Error de comunicación con Google', 'details' => $err]);
    exit;
}
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502;
curl_close($ch);

// Si hay error, devolver mensaje limpio
if ($code !== 200) {
    $errData = json_decode($response, true);
    $errMsg = 'Error de Gemini (HTTP ' . $code . ')';
    if (is_array($errData) && isset($errData['error'])) {
        if (is_array($errData['error']) && isset($errData['error']['message'])) {
            $errMsg = $errData['error']['message'];
        } elseif (is_string($errData['error'])) {
            $errMsg = $errData['error'];
        }
    }
    http_response_code($code);
    echo json_encode(['error' => $errMsg]);
    exit;
}

http_response_code($code);
echo $response;
