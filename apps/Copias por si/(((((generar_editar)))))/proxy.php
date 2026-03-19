<?php
/**
 * Unified Proxy for Unified Studio
 * Maneja peticiones para AI Lab, Edit Studio y Pro Effects.
 * Compatible con Hostinger (PHP 8+, cURL).
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST')
        throw new Exception('Método no permitido', 405);

    // Prioridad de API Keys: Entorno > Server Params
    $apiKey = getenv('GEMINI_KEY_COLOR')
        ?: ($_SERVER['GEMINI_KEY_COLOR'] ?? $_SERVER['REDIRECT_GEMINI_KEY_COLOR'] ?? null);

    $replicateKey = getenv('REPLICATE_API_TOKEN')
        ?: ($_SERVER['REPLICATE_API_TOKEN'] ?? $_SERVER['REDIRECT_REPLICATE_API_TOKEN'] ?? null);

    $input = file_get_contents('php://input');
    $json = json_decode($input, true);
    if (!is_array($json))
        throw new Exception('JSON inválido', 400);

    $task = $json['task'] ?? 'generateContent';
    $model = $json['model'] ?? 'gemini-3.1-flash-image-preview';

    // Función auxiliar para cURL
    $callApi = function ($url, $body, $headers) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_TIMEOUT => 120,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        $resp = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($resp === false)
            throw new Exception('Error cURL: ' . $err, 502);

        $data = json_decode($resp, true);
        if ($status < 200 || $status >= 300) {
            throw new Exception($data['error']['message'] ?? 'API Error ' . $status, $status);
        }
        return $data;
    };

    // --- LÓGICA POR TAREAS ---

    // 1. Mejora de Prompt
    if ($task === 'enhancePrompt') {
        $sysPrompt = "Eres un experto en prompts de arte IA. Genera 4 versiones mejoradas del prompt en ESPAÑOL. Separa con '|||'.";
        $prompt = $json['prompt'] ?? '';

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;
        $body = [
            'contents' => [['parts' => [['text' => $sysPrompt . "\n\nPROMPT: " . $prompt]]]],
            'generationConfig' => ['responseModalities' => ['TEXT'], 'temperature' => 0.7]
        ];

        $data = $callApi($url, $body, ['Content-Type: application/json']);
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $options = array_values(array_filter(array_map('trim', explode('|||', $text))));
        echo json_encode(['options' => $options]);
        exit;
    }

    // 2. Inpainting / Edición con Máscara (Optimizado)
    if ($task === 'inpainting' || $task === 'editWithMask') {
        $provider = $json['provider'] ?? 'gemini'; // 'gemini' | 'seadreams'

        if ($provider === 'seadreams') {
            // Ejemplo de endpoint para Seadreams 4.0
            $url = "https://api.seadreams.io/v4/edit";
            $headers = [
                "Authorization: Bearer " . ($json['seadreamsKey'] ?? getenv('SEADREAMS_KEY')),
                "Content-Type: application/json"
            ];
            // ... Adaptación de Seadreams 4.0 ...
            // Por ahora mandamos un error explicativo si no hay llave
            if (!$headers[0])
                throw new Exception('Falta la API Key de Seadreams 4.0', 400);

            $body = [
                'image' => $json['image'],
                'mask' => $json['mask'],
                'prompt' => $json['prompt']
            ];
            $data = $callApi($url, $body, $headers);
            echo json_encode($data);
            exit;
        }

        // Default Gemini Inpainting
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;
        $parts = [
            ['text' => "Edita esta imagen basándote en la máscara proporcionada. Instrucción: " . $json['prompt']],
            ['inlineData' => ['data' => $json['image'], 'mimeType' => 'image/png']], // Imagen Original
            ['inlineData' => ['data' => $json['mask'], 'mimeType' => 'image/png']]  // Máscara (B&W)
        ];

        $body = [
            'contents' => [['parts' => $parts]],
            'generationConfig' => [
                'responseModalities' => ['IMAGE'],
                'temperature' => 0.4
            ]
        ];

        $data = $callApi($url, $body, ['Content-Type: application/json']);
        echo json_encode($data);
        exit;
    }

    // 2.5 Aplicación de Estilos Artísticos (SIN MÁSCARA)
    if ($task === 'applyStyle') {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;

        $parts = [
            ['text' => $json['prompt'] ?? 'Apply artistic style'],
            ['inlineData' => ['data' => $json['image'], 'mimeType' => 'image/png']]
        ];

        $body = [
            'contents' => [['parts' => $parts]],
            'generationConfig' => [
                'responseModalities' => ['IMAGE'],
                'temperature' => 0.5
            ]
        ];

        $data = $callApi($url, $body, ['Content-Type: application/json']);
        echo json_encode($data);
        exit;
    }

    // 3. AI Upscale (Real-ESRGAN / SwinIR via Replicate)
    if ($task === 'upscale') {
        if (!$replicateKey)
            throw new Exception('Falta Token de Replicate para Upscaling', 500);

        $url = "https://api.replicate.com/v1/predictions";
        $body = [
            'version' => "da8c39a8a65737a2c054dba898393959b3b4754739e672740bc7938380e30305", // Real-ESRGAN
            'input' => [
                'image' => $json['image'], // Base64 o URL
                'upscale' => (int) ($json['scale'] ?? 2),
                'face_enhance' => true
            ]
        ];

        $headers = [
            "Authorization: Bearer $replicateKey",
            "Content-Type: application/json",
            "Prefer: wait"
        ];

        $data = $callApi($url, $body, $headers);
        echo json_encode(['image' => $data['output'] ?? null]);
        exit;
    }

    // 4. Generación de Imagen (Modo Passthrough para flexibilidad)
    if ($task === 'generateImage' || $task === 'generateContent') {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;

        // Si viene un payload directo de Gemini, lo usamos
        if (isset($json['contents'])) {
            $body = [
                'contents' => $json['contents'],
                'generationConfig' => $json['generationConfig'] ?? null
            ];
        } else {
            // Formato simplificado compatible con apps anteriores
            $parts = [];
            if (!empty($json['images'])) {
                foreach ($json['images'] as $img) {
                    $parts[] = ['inlineData' => ['data' => $img['data'], 'mimeType' => $img['mimeType']]];
                }
            }
            if (!empty($json['maskImage'])) {
                $parts[] = ['inlineData' => ['data' => $json['maskImage']['data'], 'mimeType' => $json['maskImage']['mimeType']]];
            }
            $parts[] = ['text' => $json['prompt'] ?? ''];

            $body = [
                'contents' => [['parts' => $parts]],
                'generationConfig' => [
                    'responseModalities' => $json['modalities'] ?? ['IMAGE', 'TEXT'],
                    'imageConfig' => ['aspectRatio' => $json['aspectRatio'] ?? '1:1']
                ]
            ];
        }

        $data = $callApi($url, $body, ['Content-Type: application/json']);
        echo json_encode($data);
        exit;
    }

    throw new Exception('Tarea no reconocida', 400);

} catch (Throwable $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['error' => $e->getMessage()]);
}

