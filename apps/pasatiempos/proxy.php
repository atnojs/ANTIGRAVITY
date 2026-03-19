<?php
// Configuración de cabeceras para permitir CORS (Cross-Origin Resource Sharing)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', 0);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido. Usa POST.', 405);
    }

    $apiKey = 'AIzaSyBIp4OxnGdSMTwRkGZbZKcLxanZkXLmobc';

    if (!$apiKey || $apiKey === 'TU_CLAVE_API_DE_GEMINI_AQUI') {
        throw new Exception('Error de configuración: Falta la API Key en proxy.php', 500);
    }

    $input = file_get_contents('php://input');
    $json = json_decode($input, true);
    
    if (!is_array($json)) {
        throw new Exception('JSON inválido o cuerpo vacío', 400);
    }

    $prompt = (string)($json['prompt'] ?? '');
    if (empty($prompt)) {
        throw new Exception('El campo "prompt" es obligatorio.', 400);
    }

    // CORREGIDO: Usar modelo Gemini-2.0-flash que existe
    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);

    $body = [
        'contents' => [
            [ 
                'role' => 'user', 
                'parts' => [[ 'text' => $prompt ]] 
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'responseMimeType' => 'application/json'
        ]
    ];

    $ch = curl_init($modelUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new Exception('Error conexión cURL: ' . $curlErr, 502);
    }

    $data = json_decode($response, true);
    
    if ($httpCode >= 400) {
        $msg = $data['error']['message'] ?? 'Error desconocido de la API de Google';
        throw new Exception('Gemini API Error: ' . $msg, $httpCode);
    }

    $generatedText = '';
    if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        $generatedText = $data['candidates'][0]['content']['parts'][0]['text'];
    }

    $decodedText = json_decode($generatedText, true);

    if ($decodedText === null && json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('La IA no devolvió un JSON válido: ' . substr($generatedText, 0, 100) . '...', 500);
    }

    echo $generatedText;

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>

