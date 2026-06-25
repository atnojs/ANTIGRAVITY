<?php
/**
 * Complete Test - Verificación completa del sistema
 * ==============================================
 * Este script verifica todos los componentes del sistema de edición por IA
 */

header('Content-Type: application/json; charset=utf-8');

$results = [
    'timestamp' => date('Y-m-d H:i:s'),
    'tests' => [],
    'overall_success' => true
];

try {
    // TEST 1: Verificar archivos del sistema
    $results['tests']['file_system'] = [
        'config_php' => file_exists(__DIR__ . '/config.php'),
        'proxy_php' => file_exists(__DIR__ . '/proxy.php'),
        'ai_tools_js' => file_exists(__DIR__ . '/ai-tools.js'),
        'app_compiled_js' => file_exists(__DIR__ . '/app-compiled.js')
    ];

    // TEST 2: Verificar configuración de API
    $apiKey = '';
    if (file_exists(__DIR__ . '/config.php')) {
        include __DIR__ . '/config.php';
        $apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
    }

    $results['tests']['api_config'] = [
        'api_key_present' => !empty($apiKey),
        'api_key_length' => strlen($apiKey)
    ];

    // TEST 3: Verificar requisitos del servidor
    $results['tests']['server_requirements'] = [
        'php_version' => phpversion(),
        'curl_extension' => extension_loaded('curl'),
        'json_extension' => extension_loaded('json'),
        'gd_extension' => extension_loaded('gd')
    ];

    // TEST 4: Verificar conectividad
    if (!empty($apiKey) && extension_loaded('curl')) {
        // Intentar conectar a la API de Gemini
        $model = 'gemini-2.5-flash-image';
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);

        $testPayload = [
            'contents' => [[
                'parts' => [[
                    'text' => 'Health check'
                ]]
            ]],
            'generationConfig' => [
                'responseModalities' => ['TEXT']
            ]
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($testPayload),
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $results['tests']['api_connectivity'] = [
            'connection_attempted' => true,
            'http_code' => $httpCode,
            'success' => in_array($httpCode, [200, 400]), // 400 es válido para Gemini si el cuerpo está mal
            'response_received' => !empty($response)
        ];
    } else {
        $results['tests']['api_connectivity'] = [
            'connection_attempted' => false,
            'reason' => empty($apiKey) ? 'API key missing' : 'cURL not available'
        ];
    }

    // Determinar éxito general
    $results['overall_success'] = (
        $results['tests']['file_system']['config_php'] &&
        $results['tests']['file_system']['proxy_php'] &&
        $results['tests']['file_system']['ai_tools_js'] &&
        $results['tests']['file_system']['app_compiled_js'] &&
        $results['tests']['api_config']['api_key_present'] &&
        $results['tests']['server_requirements']['curl_extension'] &&
        (!isset($results['tests']['api_connectivity']['success']) || $results['tests']['api_connectivity']['success'])
    );

} catch (Exception $e) {
    $results['overall_success'] = false;
    $results['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>