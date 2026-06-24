<?php
/**
 * Test Script - Diagnóstico de conexión a la API de Gemini
 * ======================================================
 * Este script prueba la conexión directa a la API de Gemini
 */

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Verificar si existe el archivo de configuración
    $configFile = __DIR__ . '/config.php';
    $hasConfig = file_exists($configFile);

    if (!$hasConfig) {
        throw new Exception('Archivo config.php no encontrado');
    }

    // 2. Cargar la clave API
    include $configFile;
    $apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';

    if (empty($apiKey)) {
        throw new Exception('Clave API de Gemini no configurada');
    }

    // 3. Verificar extensión cURL
    if (!extension_loaded('curl')) {
        throw new Exception('Extensión cURL no disponible en PHP');
    }

    // 4. Preparar solicitud de prueba
    $model = 'gemini-3.1-flash-image-preview';
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);

    $testPayload = [
        'contents' => [[
            'parts' => [[
                'text' => 'Test connection to Gemini API'
            ]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT']
        ]
    ];

    // 5. Realizar solicitud de prueba
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($testPayload),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HEADER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $error = curl_error($ch);
    curl_close($ch);

    // 6. Procesar respuesta
    if ($response === false) {
        throw new Exception("Error en cURL: {$error}");
    }

    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    // 7. Devolver resultados
    echo json_encode([
        'success' => true,
        'config_file_exists' => $hasConfig,
        'api_key_configured' => !empty($apiKey),
        'curl_available' => extension_loaded('curl'),
        'http_code' => $httpCode,
        'response_headers' => $headers,
        'response_body_preview' => substr($body, 0, 200) . (strlen($body) > 200 ? '...' : ''),
        'full_response_length' => strlen($body)
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'config_file_exists' => file_exists(__DIR__ . '/config.php')
    ], JSON_PRETTY_PRINT);
}
?>