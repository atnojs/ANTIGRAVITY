<?php
// Script de prueba para comparar generación (latencia y respuesta) entre los modelos
// vigentes del proyecto: OpenAI image 2 y image 2.5.
// Requiere OPENAI_API_KEY en el entorno. No se despliega: tools/ está denegado por web.

function generate_image_test($model, $prompt, $quality = 'medium') {
    $apiKey = getenv('OPENAI_API_KEY');
    $url = 'https://api.openai.com/v1/images/generations';

    $data = [
        'model' => $model,
        'prompt' => $prompt,
        'n' => 1,
        'size' => '1024x1024',
        'quality' => $quality
        // La API actual no admite el parámetro 'response_format' (devuelve b64_json).
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

// Modelos vigentes del proyecto (ver skills/POLITICA_modelos-imagen.md).
$casos = [
    ['gpt-image-2', 'medium', 'image 2 · medium (modelo por defecto)'],
    ['gpt-image-2', 'high', 'image 2 · high'],
    ['gpt-image-2.5-flare', 'medium', 'image 2.5 flare · medium'],
    ['gpt-image-2.5-sunburst', 'xhigh', 'image 2.5 sunburst · xhigh'],
];

foreach ($casos as [$modelo, $calidad, $etiqueta]) {
    echo "Probando $etiqueta ($modelo / $calidad)...\n";
    $res = generate_image_test($modelo, $prompt, $calidad);
    printf(
        "  HTTP %s | %.2fs | %s\n\n",
        $res['status'],
        $res['duration'],
        $res['status'] === 200 ? 'imagen recibida' : ($res['response']['error']['message'] ?? $res['error'] ?: 'error desconocido')
    );
}
