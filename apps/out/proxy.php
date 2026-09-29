<?php
// proxy.php — Puente a la API de imagen de Google.
//
// SEGURIDAD (2026-09-29): este fichero era un passthrough genérico: aceptaba
// cualquier `targetUrl` del cliente, le pegaba la clave del proyecto, desactivaba la
// verificación TLS y, en los errores >= 400, devolvía al cliente la URL completa CON
// LA CLAVE. Se ha cerrado con una lista blanca exacta de destino (la app solo usa
// gemini-2.5-flash-image:generateContent), TLS verificado y errores sin URL ni eco del
// cuerpo de entrada. Si algún día hace falta otro endpoint, se añade aquí a mano.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Unicos destinos permitidos (host + ruta exactos).
const DESTINOS_PERMITIDOS = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
];

// API Key — cascadeo robusto (solo entorno; nunca se devuelve al cliente)
$apiKey = '';
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
if ($apiKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'La clave de API no está configurada en el servidor.']);
    exit();
}

// Obtener los datos POST
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['targetUrl']) || !isset($data['payload'])) {
    http_response_code(400);
    // Sin eco del cuerpo recibido: no se reenvía lo que manda el cliente.
    echo json_encode(['error' => 'Datos de la solicitud no válidos.']);
    exit();
}

$targetUrl = (string)$data['targetUrl'];
$payload = $data['payload'];

// Lista blanca: comparación exacta (sin normalizar, para que no cuele nada raro como
// userinfo `https://host@otro-host/`, parámetros añadidos o barras extra).
if (!in_array($targetUrl, DESTINOS_PERMITIDOS, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Destino no permitido.']);
    exit();
}

// Construir la URL final con la clave (nunca se devuelve ni se registra)
$finalApiUrl = $targetUrl . '?key=' . urlencode($apiKey);

// cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $finalApiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    // Sin el mensaje crudo de cURL (puede incluir la URL con la clave).
    echo json_encode(['error' => 'Error de conexión con el proveedor.']);
    curl_close($ch);
    exit();
}
curl_close($ch);

// Reenviar el código de estado y la respuesta
http_response_code($httpcode);

if ($httpcode >= 400) {
    // Solo el mensaje del proveedor: ni la URL, ni el payload, ni la clave.
    $cuerpo = json_decode((string)$response, true);
    $mensaje = 'Error en la API de Google';
    if (is_array($cuerpo) && isset($cuerpo['error']['message'])) {
        $mensaje = (string)$cuerpo['error']['message'];
    }
    echo json_encode(['error' => $mensaje, 'status' => $httpcode]);
} else {
    echo $response;
}
