<?php
/**
 * ============================================
 * PROXY UNIFICADO — Combinar Imágenes
 * ============================================
 * Dual backend: FLUX (BFL API) + Gemini (Google AI)
 * DeepSeek para mejorar prompts (texto)
 *
 * Claves de entorno:
 *   F  — FLUX API key (BFL / replicate)
 *   A  — Gemini API key (Google AI Studio)
 *   D  — DeepSeek API key (para enhancePrompt)
 *
 * Endpoints:
 *   POST { task: 'enhancePrompt', prompt, images[]?, hasBackground }
 *        → DeepSeek genera 4 opciones de prompt mejorado
 *   POST { task: 'combineImages', images[], backgroundImage?, prompt, aspectRatio, model, targetPx }
 *        → FLUX o Gemini según el campo 'model'
 * ============================================
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Método no permitido']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['task'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Body JSON inválido o falta el campo task']]);
    exit;
}

$task = $input['task'];

// ─── ENHANCE PROMPT → DeepSeek ───────────────────────────────
if ($task === 'enhancePrompt') {
    $apiKey = getenv('D');
    if (!$apiKey) {
        echo json_encode(['error' => ['message' => 'API key DeepSeek (D) no configurada']]);
        exit;
    }

    $prompt = $input['prompt'] ?? '';
    $hasBackground = $input['hasBackground'] ?? false;
    $images = $input['images'] ?? [];

    // Construir sistema prompt para generar 4 opciones
    $imageCount = count($images);
    $bgNote = $hasBackground ? 'Hay una imagen de fondo que debe mantenerse como base de la composición.' : '';

    $systemPrompt = <<<PROMPT
Eres un experto en generación de imágenes con IA. Tu tarea es mejorar prompts para
un sistema que combina múltiples imágenes en una sola composición.

Reglas:
- El usuario subió {$imageCount} imagen(es) para combinar.
- {$bgNote}
- El prompt de entrada puede ser vago o simple; debes expandirlo con detalles visuales ricos.
- La salida debe ser EXACTAMENTE 4 opciones de prompt, una por línea.
- Cada prompt debe estar en español, ser descriptivo, y no exceder 200 palabras.
- Responde ÚNICAMENTE con los 4 prompts, cada uno en una línea separada, sin numeración ni viñetas.
PROMPT;

    $userMessage = $prompt ?: "Combina estas imágenes de forma creativa y espectacular";

    $deepseekResponse = callDeepSeek($apiKey, $systemPrompt, $userMessage);

    if (isset($deepseekResponse['error'])) {
        echo json_encode(['error' => $deepseekResponse['error']]);
        exit;
    }

    // Parsear respuesta: separar por líneas y limpiar
    $content = $deepseekResponse['choices'][0]['message']['content'] ?? '';
    $lines = array_values(array_filter(
        array_map('trim', explode("\n", $content)),
        fn($l) => strlen($l) > 10
    ));

    // Tomar hasta 4 opciones
    $options = array_slice($lines, 0, 4);
    // Si no hay suficientes, rellenar con variaciones
    while (count($options) < 4) {
        $options[] = $prompt ?: "Combinar imágenes con estilo cinematográfico, iluminación dramática y composición equilibrada";
    }

    echo json_encode(['options' => $options]);
    exit;
}

// ─── COMBINE IMAGES → FLUX o Gemini ──────────────────────────
if ($task === 'combineImages') {
    $model = $input['model'] ?? 'flux-pro';
    $prompt = $input['prompt'] ?? '';
    $aspectRatio = $input['aspectRatio'] ?? '1:1';
    $targetPx = $input['targetPx'] ?? 1024;
    $images = $input['images'] ?? [];
    $backgroundImage = $input['backgroundImage'] ?? null;

    if (empty($images)) {
        echo json_encode(['error' => ['message' => 'Se requieren al menos 2 imágenes para combinar']]);
        exit;
    }

    // Determinar backend según modelo
    if (strpos($model, 'gemini') !== false) {
        $apiKey = getenv('A');
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key Gemini (A) no configurada']]);
            exit;
        }
        $result = callGemini($apiKey, $model, $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
    } else {
        $apiKey = getenv('F');
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key FLUX (F) no configurada']]);
            exit;
        }
        $result = callFlux($apiKey, $model, $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
    }

    echo json_encode($result);
    exit;
}

// Tarea desconocida
http_response_code(400);
echo json_encode(['error' => ['message' => "Tarea '$task' no reconocida"]]);
exit;

// ═══════════════════════════════════════════════════════════════
// LLAMADAS A API
// ═══════════════════════════════════════════════════════════════

/**
 * Llamar a DeepSeek (Chat Completions API) para mejorar prompts.
 */
function callDeepSeek(string $apiKey, string $systemPrompt, string $userMessage): array {
    $url = 'https://api.deepseek.com/v1/chat/completions';

    $body = json_encode([
        'model' => 'deepseek-chat',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userMessage]
        ],
        'temperature' => 0.9,
        'max_tokens' => 2000,
        'stream' => false
    ]);

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];

    $response = httpPost($url, $headers, $body);
    return $response;
}

/**
 * Llamar a FLUX (BFL API) para generar imagen combinada.
 * Modelos: flux-pro, flux-max
 */
function callFlux(string $apiKey, string $model, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    // Mapear modelo a endpoint de BFL
    $modelMap = [
        'flux-pro' => 'flux-pro',
        'flux-max' => 'flux-max'
    ];
    $bflModel = $modelMap[$model] ?? 'flux-pro';

    // Construir payload con imágenes en base64
    $imageContents = [];
    foreach ($images as $img) {
        $imageContents[] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . ($img['mimeType'] ?? 'image/jpeg') . ';base64,' . $img['data']]
        ];
    }

    // Imagen de fondo (si hay)
    if ($background && !empty($background['data'])) {
        array_unshift($imageContents, [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . ($background['mimeType'] ?? 'image/jpeg') . ';base64,' . $background['data']]
        ]);
    }

    $messages = [[
        'role' => 'user',
        'content' => array_merge(
            [['type' => 'text', 'text' => $prompt]],
            $imageContents
        )
    ]];

    // Dimensiones según aspect ratio
    $dims = aspectRatioToDims($aspectRatio, min($targetPx, 2048));

    $url = 'https://api.bfl.ml/v1/' . $bflModel;

    $body = json_encode([
        'prompt' => $prompt,
        'width' => $dims['w'],
        'height' => $dims['h'],
        'steps' => 50,
        'prompt_upsampling' => false,
        'seed' => random_int(0, 999999),
        'safety_tolerance' => 5,
        'output_format' => 'jpeg'
    ]);

    $headers = [
        'Content-Type: application/json',
        'X-Key: ' . $apiKey
    ];

    $response = httpPost($url, $headers, $body);

    if (isset($response['error'])) {
        return $response;
    }

    // BFL devuelve { id: "..." }, hay que esperar y hacer polling
    $taskId = $response['id'] ?? null;
    if (!$taskId) {
        return ['error' => ['message' => 'No se recibió ID de tarea de FLUX']];
    }

    // Polling (máx 120 segundos)
    $result = pollBflResult($apiKey, $taskId);
    return $result;
}

/**
 * Polling del resultado de BFL.
 */
function pollBflResult(string $apiKey, string $taskId): array {
    $maxAttempts = 60; // ~120 segundos
    $headers = ['X-Key: ' . $apiKey];

    for ($i = 0; $i < $maxAttempts; $i++) {
        sleep(2);
        $result = httpGet("https://api.bfl.ml/v1/get_result?id={$taskId}", $headers);

        if (isset($result['status']) && $result['status'] === 'Ready') {
            $imageUrl = $result['result']['sample'] ?? null;
            if ($imageUrl) {
                $imageData = @file_get_contents($imageUrl);
                if ($imageData) {
                    return [
                        'images' => [[
                            'data' => base64_encode($imageData),
                            'mimeType' => 'image/jpeg'
                        ]]
                    ];
                }
            }
            return ['error' => ['message' => 'Imagen generada pero no se pudo descargar']];
        }

        if (isset($result['status']) && $result['status'] === 'Failed') {
            return ['error' => ['message' => 'FLUX falló: ' . ($result['result']['error'] ?? 'Error desconocido')]];
        }
    }

    return ['error' => ['message' => 'Timeout esperando resultado de FLUX']];
}

/**
 * Llamar a Gemini (Google AI) para generar imagen.
 * Modelos: gemini-flash (gemini-2.0-flash-exp), gemini-pro (gemini-2.5-pro-exp)
 */
function callGemini(string $apiKey, string $model, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    // Mapear modelo a ID de Gemini
    $modelMap = [
        'gemini-flash' => 'gemini-2.0-flash-exp-image-generation',
        'gemini-pro' => 'gemini-2.5-pro-exp-03-25'
    ];
    $geminiModel = $modelMap[$model] ?? 'gemini-2.0-flash-exp-image-generation';

    // Construir contenido del mensaje (partes)
    $parts = [];

    // Imagen de fondo primero
    if ($background && !empty($background['data'])) {
        $parts[] = [
            'inlineData' => [
                'mimeType' => $background['mimeType'] ?? 'image/jpeg',
                'data' => $background['data']
            ]
        ];
    }

    // Imágenes adicionales
    foreach ($images as $img) {
        $parts[] = [
            'inlineData' => [
                'mimeType' => $img['mimeType'] ?? 'image/jpeg',
                'data' => $img['data']
            ]
        ];
    }

    // Prompt de texto
    $parts[] = ['text' => $prompt];

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $geminiModel . ':generateContent?key=' . urlencode($apiKey);

    $body = json_encode([
        'contents' => [[
            'parts' => $parts
        ]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT']
        ]
    ]);

    $headers = ['Content-Type: application/json'];

    $response = httpPost($url, $headers, $body);

    if (isset($response['error'])) {
        return $response;
    }

    // Extraer imagen de la respuesta de Gemini
    $candidates = $response['candidates'] ?? [];
    $images_out = [];

    foreach ($candidates as $candidate) {
        foreach (($candidate['content']['parts'] ?? []) as $part) {
            if (isset($part['inlineData'])) {
                $images_out[] = [
                    'data' => $part['inlineData']['data'] ?? '',
                    'mimeType' => $part['inlineData']['mimeType'] ?? 'image/jpeg'
                ];
            }
        }
    }

    if (empty($images_out)) {
        return ['error' => ['message' => 'Gemini no generó ninguna imagen']];
    }

    return ['images' => $images_out];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS HTTP
// ═══════════════════════════════════════════════════════════════

function httpPost(string $url, array $headers, string $body): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => ['message' => "Error HTTP: $error"]];
    }

    $data = json_decode($response, true);
    if (!$data) {
        return ['error' => ['message' => "Respuesta inválida (HTTP $httpCode): " . substr($response, 0, 500)]];
    }

    if ($httpCode >= 400) {
        return ['error' => [
            'message' => $data['error']['message'] ?? $data['error'] ?? "Error HTTP $httpCode",
            'code' => $httpCode
        ]];
    }

    return $data;
}

function httpGet(string $url, array $headers = []): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => ['message' => "Error HTTP: $error"]];
    }

    $data = json_decode($response, true);
    return $data ?: ['error' => ['message' => "Respuesta inválida (HTTP $httpCode)"]];
}

/**
 * Calcular dimensiones a partir de aspect ratio.
 */
function aspectRatioToDims(string $ar, int $maxSide): array {
    $map = [
        '1:1'  => [1, 1],
        '3:2'  => [3, 2],
        '4:5'  => [4, 5],
        '16:9' => [16, 9],
        '21:9' => [21, 9],
        '9:16' => [9, 16],
    ];

    [$w, $h] = $map[$ar] ?? [1, 1];

    if ($w >= $h) {
        return ['w' => $maxSide, 'h' => (int) round($maxSide * $h / $w)];
    } else {
        return ['h' => $maxSide, 'w' => (int) round($maxSide * $w / $h)];
    }
}
