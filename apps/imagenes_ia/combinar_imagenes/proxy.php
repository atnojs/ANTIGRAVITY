<?php
/**
 * ============================================
 * PROXY UNIFICADO — Combinar Imágenes
 * ============================================
 * Dual backend: FLUX (BFL API) + Gemini (Google AI)
 * DeepSeek para mejorar prompts (texto)
 *
 * Claves de entorno:
 *   F  — FLUX API key (BFL, generación de imágenes)
 *   R  — OpenRouter (Gemini imagen, vía el .htaccess raíz)
 *   D / B / DEEPSEEK_API_KEY  — DeepSeek (para enhancePrompt)
 *
 * Endpoints:
 *   POST { task: 'enhancePrompt', prompt, images[]?, hasBackground }
 *        → DeepSeek genera 4 opciones de prompt mejorado
 *   POST { task: 'combineImages', images[], backgroundImage?, prompt, aspectRatio, model, targetPx }
 *        → FLUX o Gemini según el campo 'model'
 * ============================================
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Método no permitido']]);
    exit;
}

/**
 * Helper de claves en cascada (skill maestra):
 * config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
 */
function getSecret(string $name): string {
    $config = __DIR__ . '/config.php';
    if (is_file($config)) {
        include_once $config;
        if (defined($name) && is_string(constant($name)) && constant($name) !== '') {
            return trim((string)constant($name));
        }
    }
    $values = [
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ];
    foreach ($values as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
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
    $apiKey = getSecret('D') ?: getSecret('B') ?: getSecret('DEEPSEEK_API_KEY');
    if (!$apiKey) {
        echo json_encode(['error' => ['message' => 'API key DeepSeek (D/B) no configurada']]);
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
    $model = strtolower((string)($input['model'] ?? 'gemini-pro'));
    $prompt = $input['prompt'] ?? '';
    $aspectRatio = $input['aspectRatio'] ?? '1:1';
    $targetPx = $input['targetPx'] ?? 1024;
    $images = $input['images'] ?? [];
    $backgroundImage = $input['backgroundImage'] ?? null;

    if (empty($images)) {
        echo json_encode(['error' => ['message' => 'Se requieren al menos 2 imágenes para combinar']]);
        exit;
    }

    // ── Mapeo canónico skill maestra (4 modelos) ──
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-pro';
    $geminiModelId = 'google/gemini-3.1-flash-image';

    if (strpos($model, 'max') !== false) {
        $backend = 'flux';
        $fluxEndpoint = 'flux-2-max';
    } elseif (strpos($model, 'gemini') !== false && strpos($model, 'pro') !== false) {
        $backend = 'gemini';
        $geminiModelId = 'google/gemini-3-pro-image';
    } elseif (strpos($model, 'flash') !== false) {
        $backend = 'gemini';
        $geminiModelId = 'google/gemini-3.1-flash-image';
    }

    if ($backend === 'gemini') {
        $apiKey = getSecret('R'); // OpenRouter
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada']]);
            exit;
        }
        $result = callGemini($apiKey, $geminiModelId, $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
    } else {
        $apiKey = getSecret('F'); // FLUX / BFL
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key FLUX (F) no configurada']]);
            exit;
        }
        $result = callFlux($apiKey, $fluxEndpoint, $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
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
 * Endpoints canónicos (skill maestra): flux-2-pro / flux-2-max
 */
function callFlux(string $apiKey, string $fluxEndpoint, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {

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

    $url = 'https://api.bfl.ml/v1/' . $fluxEndpoint;

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
 * Llamar a Gemini (vía OpenRouter, clave R) para generar imagen combinada.
 * Modelos canónicos (skill maestra): google/gemini-3.1-flash-image / google/gemini-3-pro-image
 */
function callGemini(string $apiKey, string $geminiModelId, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    // Construir contenido (texto primero, luego fondo y resto de imágenes como data URLs)
    $content = [];
    $content[] = ['type' => 'text', 'text' => $prompt];

    // Imagen de fondo primero
    if ($background && !empty($background['data'])) {
        $content[] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . ($background['mimeType'] ?? 'image/jpeg') . ';base64,' . $background['data']]
        ];
    }

    // Imágenes adicionales
    foreach ($images as $img) {
        $content[] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . ($img['mimeType'] ?? 'image/jpeg') . ';base64,' . $img['data']]
        ];
    }

    $url = 'https://openrouter.ai/api/v1/chat/completions';

    $body = json_encode([
        'model' => $geminiModelId,
        'modalities' => ['image', 'text'],
        'messages' => [
            ['role' => 'user', 'content' => $content]
        ],
        'max_tokens' => 8000
    ]);

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'accept: application/json'
    ];

    $response = httpPost($url, $headers, $body);

    if (isset($response['error'])) {
        return $response;
    }

    // Extraer imagen de la respuesta de OpenRouter (choices[0].message.images[])
    $images_out = [];
    $msgImages = $response['choices'][0]['message']['images'] ?? [];
    foreach ($msgImages as $img) {
        $dataUrl = $img['image_url']['url'] ?? '';
        if ($dataUrl !== '' && strpos($dataUrl, 'data:') === 0) {
            $comma = strpos($dataUrl, ',');
            $b64 = $comma !== false ? substr($dataUrl, $comma + 1) : $dataUrl;
            $mime = 'image/png';
            if (preg_match('/^data:image\/([a-z0-9.+-]+)/i', $dataUrl, $m)) {
                $mime = 'image/' . strtolower($m[1]);
            }
            $images_out[] = [
                'data' => $b64,
                'mimeType' => $mime
            ];
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
