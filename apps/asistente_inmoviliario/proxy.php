<?php
// proxy.php

// 1. Obtener la API Key desde una variable de entorno
$apiKey = getenv('D');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key no configurada en el servidor.']);
    exit;
}

// 2. Leer el cuerpo de la solicitud (payload) enviado desde el frontend
$requestBody = file_get_contents('php://input');
$requestData = json_decode($requestBody, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Cuerpo de la solicitud JSON inválido.']);
    exit;
}

// Validar que el payload del frontend tiene la estructura esperada
if (!isset($requestData['model']) || !isset($requestData['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'El payload debe contener "model" y "data".']);
    exit;
}

$model = $requestData['model'];
$payload = $requestData['data'];

// 3. Construir la URL de la API de Google
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

// 4. Inicializar cURL para hacer la solicitud al servidor de Google
$ch = curl_init($apiUrl);

// 5. Configurar las opciones de cURL
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Es importante mantener la verificación SSL

// 6. Ejecutar la solicitud y obtener la respuesta
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// 7. Manejar errores de cURL
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la solicitud cURL: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// 8. Devolver la respuesta de la API de Google al frontend
http_response_code($httpcode);
header('Content-Type: application/json');
echo $response;

?>
