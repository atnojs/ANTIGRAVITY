<?php
// Script de prueba para comparar generación entre modelo actual y DALL-E 3
// Requiere OPENAI_API_KEY en el entorno.

function generate_image_test($model, $prompt) {
    $apiKey = getenv('OPENAI_API_KEY');
    $url = 'https://api.openai.com/v1/images/generations';
    
    $data = [
        'model' => $model,
        'prompt' => $prompt,
        'n' => 1,
        'size' => '1024x1024',
        'quality' => 'standard' // 'hd' para DALL-E 3 tiene costo adicional
    ];

    $start = microtime(true);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 60
    ]);

    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $duration = microtime(true) - $start;

    return [
        'model' => $model,
        'status' => $status,
        'duration' => $duration,
        'response' => json_decode($raw, true),
        'error' => $error
    ];
}

$prompt = "Un paisaje futurista estilo cian y verde neón con elementos de glassmorphism.";

// Probamos con modelos conocidos de OpenAI
echo "Probando 'dall-e-2' (Referencia antigua)...\n";
$res1 = generate_image_test('dall-e-2', $prompt);
print_r($res1);

echo "\nProbando 'dall-e-3' (Nuevo estándar)...\n";
$res2 = generate_image_test('dall-e-3', $prompt);
print_r($res2);
?>
