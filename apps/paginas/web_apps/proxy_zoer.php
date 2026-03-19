<?php
// proxy_zoer.php
// Este archivo actúa de intermediario entre tu web y Zoer para evitar problemas de CORS.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Configuración: Pega aquí tu URL base de Zoer EXACTA (sin barra al final)
define('ZOER_API_BASE', 'https://app20251105035219xtdbdgidke.online.zoer.ai/next_api');

// --- NO TOQUES NADA DEBAJO DE ESTA LÍNEA ---

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0); // Maneja la solicitud preliminar de CORS
}

// Determinar qué endpoint de Zoer se está solicitando
$path = $_GET['path'] ?? '';
if (!$path) {
    http_response_code(400);
    echo json_encode(['error' => 'No path provided']);
    exit;
}

$url = ZOER_API_BASE . '/' . ltrim($path, '/');

// Inicializar cURL
$ch = curl_init($url);
$method = $_SERVER['REQUEST_METHOD'];
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Pasar cabeceras importantes (como el Token de autorización si existe)
$headers = ['Content-Type: application/json'];
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Pasar el cuerpo de la solicitud (para POST)
if ($method === 'POST') {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

// Ejecutar y devolver la respuesta tal cual
$response = curl_exec($ch);
file_put_contents('debug_zoer_response.txt', "URL: $url\nResponse: " . $response . "\nError: " . curl_error($ch));
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy error: ' . curl_error($ch)]);
} else {
    http_response_code($httpCode);
    echo $response;
}
curl_close($ch);
?>