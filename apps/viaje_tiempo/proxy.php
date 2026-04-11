<?php
/**
 * CHRONOS BOOTH - Gemini Proxy
 * Versión segura: La API Key se lee del entorno (.htaccess)
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// Configuración de seguridad: Encabezados CORS (Ajustar según necesidad)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

// 1. Obtención de la API KEY desde .htaccess (SetEnv GEMINI_API_KEY)
$API_KEY = getenv('GEMINI_API_KEY');

// Fallback por si getenv() no funciona en algunos entornos de Hostinger
if (!$API_KEY && isset($_SERVER['GEMINI_API_KEY'])) {
    $API_KEY = $_SERVER['GEMINI_API_KEY'];
}

if (!$API_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuración incompleta. Falta GEMINI_API_KEY en el servidor.']);
    exit;
}

// 2. Lectura del cuerpo de la petición
$inputJson = file_get_contents('php://input');
$requestData = json_decode($inputJson, true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido o vacío.']);
    exit;
}

// 3. Determinar el modelo y el endpoint
$model = $requestData['model'] ?? 'gemini-1.5-flash';
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

// 4. Preparar la llamada a Google
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $inputJson,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_SSL_VERIFYPEER => true // Asegurar conexión segura
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Error de conexión con la IA', 'details' => $curlError]);
    exit;
}

// 5. Devolver la respuesta de Google tal cual
http_response_code($httpCode);
echo $response;
