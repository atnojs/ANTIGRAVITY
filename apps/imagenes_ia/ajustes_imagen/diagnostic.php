<?php
// diagnostic.php - Herramienta de diagnóstico para la app de ajustes de imagen
header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Verificar configuración PHP
    $diagnostic = [
        'php_version' => phpversion(),
        'extensions' => [
            'curl' => extension_loaded('curl'),
            'json' => extension_loaded('json'),
            'gd' => extension_loaded('gd')
        ],
        'config_files' => [],
        'api_keys' => [],
        'errors' => []
    ];

    // 2. Verificar archivos de configuración
    $configFile = __DIR__ . '/config.php';
    $diagnostic['config_files']['config.php'] = file_exists($configFile);

    if (file_exists($configFile)) {
        include $configFile;
        $diagnostic['api_keys']['GEMINI_API_KEY'] = defined('GEMINI_API_KEY') ?
            (strlen(GEMINI_API_KEY) > 0 ? 'Configurada (' . strlen(GEMINI_API_KEY) . ' caracteres)' : 'Vacía') :
            'No definida';
    }

    // 3. Verificar variables de entorno
    $envKeys = ['GEMINI_API_KEY', 'REDIRECT_GEMINI_API_KEY'];
    foreach ($envKeys as $key) {
        $value = getenv($key);
        $diagnostic['api_keys']['ENV_' . $key] = $value ?
            'Configurada (' . strlen($value) . ' caracteres)' :
            'No encontrada';
    }

    // 4. Verificar proxy.php
    $proxyFile = __DIR__ . '/proxy.php';
    $diagnostic['config_files']['proxy.php'] = file_exists($proxyFile);

    if (file_exists($proxyFile)) {
        // Verificar si el proxy puede ejecutarse
        $proxyContent = file_get_contents($proxyFile);
        $diagnostic['proxy_analysis'] = [
            'contains_gemini_url' => strpos($proxyContent, 'generativelanguage.googleapis.com') !== false,
            'contains_curl' => strpos($proxyContent, 'curl_exec') !== false,
            'contains_api_key' => strpos($proxyContent, 'GEMINI_API_KEY') !== false
        ];
    }

    // 5. Probar conexión básica a la API de Gemini
    if (defined('GEMINI_API_KEY') && !empty(GEMINI_API_KEY)) {
        $testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' . urlencode(GEMINI_API_KEY);

        $ch = curl_init($testUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode([
                'contents' => [[
                    'parts' => [[
                        'text' => 'Test connection'
                    ]]
                ]],
                'generationConfig' => [
                    'responseModalities' => ['TEXT']
                ]
            ]),
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $diagnostic['api_test'] = [
            'http_code' => $httpCode,
            'success' => $httpCode === 400 || $httpCode === 200, // 400 es válido para Gemini si el cuerpo está mal
            'error' => $error ?: null,
            'response_preview' => substr($response, 0, 200) . (strlen($response) > 200 ? '...' : '')
        ];
    } else {
        $diagnostic['api_test'] = [
            'skipped' => 'API key no disponible'
        ];
    }

    echo json_encode($diagnostic, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}