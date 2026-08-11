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
 * Llamar a FLUX (BFL API v2) para generar imagen combinada.
 * Endpoints canónicos (skill maestra): flux-2-pro / flux-2-max
 * API: https://api.bfl.ai/v1/{model} → {id, polling_url} → GET polling_url
 */
function callFlux(string $apiKey, string $fluxEndpoint, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    // Dimensiones según aspect ratio (múltiplos de 32, máx 4 MP)
    $dims = aspectRatioToDims($aspectRatio, min($targetPx, 2048));

    // Imágenes de entrada: fondo primero, luego el resto (hasta 8)
    $inputs = [];
    if ($background && !empty($background['data'])) {
        $inputs[] = ['data' => $background['data'], 'mimeType' => $background['mimeType'] ?? 'image/jpeg'];
    }
    foreach ($images as $img) {
        $inputs[] = ['data' => $img['data'], 'mimeType' => $img['mimeType'] ?? 'image/jpeg'];
    }
    if (count($inputs) > 8) {
        return ['error' => ['message' => 'FLUX admite máximo 8 imágenes por combinación']];
    }

    $payload = [
        'prompt' => $prompt,
        'width' => $dims['w'],
        'height' => $dims['h'],
        'steps' => 50,
        'prompt_upsampling' => false,
        'seed' => random_int(0, 999999),
        'safety_tolerance' => 5,
        'output_format' => 'jpeg'
    ];

    // Enviar imágenes como input_image, input_image_2, ...
    $hasInput = false;
    foreach ($inputs as $i => $img) {
        $data = $img['data'];
        if (strpos($data, 'data:') === 0) {
            $data = substr($data, strpos($data, ',') + 1);
        }
        $payload[$i === 0 ? 'input_image' : 'input_image_' . ($i + 1)] = $data;
        $hasInput = true;
    }

    $url = 'https://api.bfl.ai/v1/' . $fluxEndpoint;
    $headers = [
        'Content-Type: application/json',
        'accept: application/json',
        'x-key: ' . $apiKey
    ];

    [$submitStatus, $submit] = bflJson($url, 'POST', $headers, $payload);

    if ($submitStatus < 200 || $submitStatus >= 300 || isset($submit['error'])) {
        $detail = $submit['detail'] ?? $submit['error'] ?? $submit['message'] ?? ('HTTP ' . $submitStatus);
        return ['error' => ['message' => 'FLUX rechazó la solicitud: ' . $detail]];
    }

    // API v2: respuesta { id, polling_url }
    $pollUrl = (string)($submit['polling_url'] ?? '');
    $host = strtolower((string)parse_url($pollUrl, PHP_URL_HOST));
    if ($pollUrl === '' || preg_match('/(^|\.)bfl\.ai$/', $host) !== 1) {
        return ['error' => ['message' => 'URL de seguimiento FLUX no válida']];
    }

    // Polling (máx ~90 s)
    $resultUrl = '';
    $last = 'Pending';
    for ($i = 0; $i < 90; $i++) {
        usleep(1000000);
        [$pollStatus, $poll] = bflJson($pollUrl, 'GET', $headers, null);
        if ($pollStatus !== 200 || isset($poll['error'])) continue;
        $last = (string)($poll['status'] ?? 'Pending');
        if ($last === 'Ready') {
            $resultUrl = (string)($poll['result']['sample'] ?? '');
            break;
        }
        if (in_array($last, ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
            return ['error' => ['message' => 'FLUX no pudo completar la tarea: ' . $last]];
        }
    }

    if ($resultUrl === '' || parse_url($resultUrl, PHP_URL_SCHEME) !== 'https') {
        return ['error' => ['message' => 'FLUX tardó demasiado (estado: ' . $last . ')']];
    }

    // Descargar la imagen resultante
    $ch = curl_init($resultUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
    ]);
    $binary = curl_exec($ch);
    $downloadStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($binary === false || $binary === '' || $downloadStatus !== 200) {
        return ['error' => ['message' => 'No se pudo descargar el resultado de FLUX']];
    }

    return [
        'images' => [[
            'data' => base64_encode($binary),
            'mimeType' => 'image/jpeg'
        ]]
    ];
}

/**
 * Petición JSON a BFL devolviendo [status, body].
 */
function bflJson(string $url, string $method, array $headers, ?array $body = null, int $timeout = 60): array {
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = json_encode($body);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $raw === '') {
        return [$status, ['error' => ['message' => $error !== '' ? $error : 'Respuesta vacía de BFL']]];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [$status, ['error' => ['message' => 'Respuesta no JSON de BFL (HTTP ' . $status . ')']]];
    }
    return [$status, $data];
}

/**
 * Llamar a Gemini (vía OpenRouter, clave R) para generar imagen combinada.
 * Modelos canónicos (skill maestra): google/gemini-3.1-flash-image / google/gemini-3-pro-image
 */
function callGemini(string $apiKey, string $geminiModelId, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    // Instrucción de proporción (Gemini controla el AR por prompt)
    $ratioHint = [
        '1:1'  => 'Genera la imagen en formato cuadrado 1:1.',
        '3:2'  => 'Genera la imagen en formato horizontal 3:2.',
        '4:5'  => 'Genera la imagen en formato vertical 4:5.',
        '16:9' => 'Genera la imagen en formato horizontal panorámico 16:9.',
        '21:9' => 'Genera la imagen en formato ultra panorámico 21:9.',
        '9:16' => 'Genera la imagen en formato vertical 9:16.',
    ];
    $ratioText = $ratioHint[$aspectRatio] ?? $ratioHint['1:1'];

    // Construir contenido (texto con la proporción, luego fondo y resto de imágenes)
    $content = [];
    $content[] = ['type' => 'text', 'text' => $ratioText . ' ' . $prompt];

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

    // Redondear a múltiplos de 32 (requisito de BFL flux-2)
    if ($w >= $h) {
        return ['w' => round32($maxSide), 'h' => round32($maxSide * $h / $w)];
    } else {
        return ['h' => round32($maxSide), 'w' => round32($maxSide * $w / $h)];
    }
}

function round32(float $value): int {
    return max(32, (int) round($value / 32) * 32);
}
