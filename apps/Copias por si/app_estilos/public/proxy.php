<?php
// Proxy para Gemini. PHP 8+, cURL habilitado.
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

// 1) API Key
// Opción A: Variable de entorno (Recomendado)
$API_KEY = getenv('GEMINI_API_KEY');

// Opción B: Hardcodear la clave si A falla (Solo para pruebas locales o Hosting compartido)
if (!$API_KEY) {
    // Clave insertada para Hostinger
    $API_KEY = 'AIzaSyDgvw713T-ffzKfAFg5zib8mwXjzUVCZ48';
}

// Validación básica
if (!$API_KEY || $API_KEY === 'C') { // 'C' no es una clave válida
    http_response_code(500);
    echo json_encode(['error' => 'Falta la API Key válida. Configura GEMINI_API_KEY en tu .htaccess o edita proxy.php con tu clave real.']);
    exit;
}

// 2) Entrada
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

// 3) Construir Endpoint
$model = $req['model'] ?? 'gemini-3.1-flash-image-preview'; // Modelo por defecto si no se especifica
// Si el frontend envía 'contents', hacemos pass-through directo
if (isset($req['contents'])) {
    $payload = $req;
} else {
    // Si queremos soportar formato simplificado (aunque el frontend actualizado usará 'contents')
    http_response_code(400);
    echo json_encode(['error' => 'Formato no soportado. Envía la estructura completa de "contents".']);
    exit;
}

// Endpoint de la API
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

// 4) cURL
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 120, // Timeout generoso para generación de imágenes
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

http_response_code($code);
echo $response;

