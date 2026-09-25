<?php
/**
 * ============================================
 * PROXY UNIFICADO — Combinar Imágenes
 * ============================================
 * Backends: OpenAI GPT Image 2.5 (directo, clave OPENAI_API_KEY/O) + Gemini (OpenRouter, clave R)
 * + QWEN 3 PRO (OpenRouter Images API, clave R; con keepalive + qwen_cache/lock
 *   porque tarda ~100s/imagen y nginx corta a ~55s).
 * DeepSeek para mejorar prompts (texto, clave D/B/DEEPSEEK_API_KEY)
 * (lista cerrada) (400 "Modelo no soportado").
 *
 * Claves de entorno (resueltas por entorno: getenv/REDIRECT_/$_SERVER/$_ENV):
 *   OPENAI_API_KEY / O — OpenAI Images (gpt-image-2.5-flare / gpt-image-2.5-sunburst)
 *   R  — OpenRouter (Gemini imagen)
 *   D / B / DEEPSEEK_API_KEY  — DeepSeek (para enhancePrompt)
 *
 * Endpoints:
 *   POST { task: 'enhancePrompt', prompt, images[]?, hasBackground }
 *        → DeepSeek genera 4 opciones de prompt mejorado
 *   POST { task: 'combineImages', images[], backgroundImage?, prompt, aspectRatio, model, targetPx }
 *        → OpenAI 2.5 o Gemini según el campo 'model'
 * ============================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';

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
 * .htaccess raiz → getenv → REDIRECT_ → $_SERVER → $_ENV
 */
function getSecret(string $name): string {
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
    $apiKey = getSecret('R');
    if (!$apiKey) {
        echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada']]);
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

// ─── COMBINE IMAGES → OpenAI 2.5 o Gemini ──────────────────
if ($task === 'combineImages') {
    $model = strtolower((string)($input['model'] ?? 'openai-medium'));
    $prompt = $input['prompt'] ?? '';
    $aspectRatio = $input['aspectRatio'] ?? '1:1';
    $targetPx = $input['targetPx'] ?? 1024;
    $images = $input['images'] ?? [];
    $backgroundImage = $input['backgroundImage'] ?? null;

    if (empty($images)) {
        echo json_encode(['error' => ['message' => 'Se requieren al menos 2 imágenes para combinar']]);
        exit;
    }

    // ── Catálogo canónico (2026-09-25): OpenAI 2.5 (5 calidades) + Gemini + QWEN 3 PRO. (lista cerrada) ──
    $modelCatalog = [
        'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
        'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
        'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
        'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
        'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
        'gemini-flash'        => ['backend' => 'gemini', 'model' => 'google/gemini-3.1-flash-image'],
        'gemini-pro'          => ['backend' => 'gemini', 'model' => 'google/gemini-3-pro-image'],
        'qwen-pro'            => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro'],
    ];
    if (!isset($modelCatalog[$model])) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
        exit;
    }
    $selected = $modelCatalog[$model];
    $backend = $selected['backend'];

    if ($backend === 'gemini') {
        $apiKey = getSecret('R'); // OpenRouter
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada']]);
            exit;
        }
        $result = callGemini($apiKey, $selected['model'], $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
    } elseif ($backend === 'qwen') {
        // QWEN IMAGE 3 PRO (OpenRouter Images API). La llamada puede superar el
        // timeout de nginx (~55s): callQwen gestiona keepalive + caché/lock,
        // emite la respuesta JSON final y sale.
        $apiKey = getSecret('R'); // OpenRouter
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key OpenRouter (R) no configurada']]);
            exit;
        }
        callQwen($apiKey, $selected['model'], $prompt, $images, $backgroundImage, $aspectRatio);
        exit;
    } else {
        $apiKey = getSecret('OPENAI_API_KEY') ?: getSecret('O');
        if (!$apiKey) {
            echo json_encode(['error' => ['message' => 'API key OpenAI (OPENAI_API_KEY/O) no configurada']]);
            exit;
        }
        $result = callOpenAI($apiKey, $selected, $prompt, $images, $backgroundImage, $aspectRatio, $targetPx);
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
    $url = 'https://openrouter.ai/api/v1/chat/completions';

    $body = json_encode([
        'model' => 'xiaomi/mimo-v2.6-pro',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userMessage]
        ],
        'temperature' => 0.9,
        'max_tokens' => 2000
    ]);

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];

    $response = httpPost($url, $headers, $body);
    return $response;
}

/**
 * Llamar a OpenAI GPT Image 2.5 (Images API) para generar la imagen combinada.
 * Con imagen de referencia → /v1/images/edits (multipart); sin referencia → generations.
 * Referencia única: el fondo si existe, si no la primera imagen.
 */
function callOpenAI(string $apiKey, array $selected, string $prompt, array $images, ?array $background, string $aspectRatio, int $targetPx): array {
    $ref = null;
    if ($background && !empty($background['data'])) {
        $ref = ['data' => $background['data'], 'mimeType' => $background['mimeType'] ?? 'image/jpeg'];
    } elseif (!empty($images[0]['data'])) {
        $ref = $images[0];
    }

    // Tamaño WxH válido para la API Images (múltiplos de 16, presupuesto >= 1MP).
    $size = ag_image_size(['aspectRatio' => $aspectRatio, 'targetPx' => $targetPx]);

    $fields = [
        'model'   => $selected['model'],
        'prompt'  => $prompt,
        'quality' => $selected['quality'],
        'size'    => $size,
    ];
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $headers = ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmp = null;

    if ($ref !== null) {
        $data = $ref['data'];
        if (strpos($data, 'data:') === 0) {
            $data = substr($data, strpos($data, ',') + 1);
        }
        $binary = base64_decode($data, true);
        if ($binary === false || $binary === '') {
            return ['error' => ['message' => 'Imagen de referencia no válida']];
        }
        $tmp = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmp === false || file_put_contents($tmp, $binary) === false) {
            if ($tmp !== false) @unlink($tmp);
            return ['error' => ['message' => 'No se pudo preparar la imagen para OpenAI']];
        }
        $mime = $ref['mimeType'] ?? 'image/jpeg';
        $ext = strpos($mime, 'png') !== false ? 'png' : (strpos($mime, 'webp') !== false ? 'webp' : 'jpg');
        $fields['image[]'] = new CURLFile($tmp, $mime, 'referencia.' . $ext);
        $endpoint = 'https://api.openai.com/v1/images/edits';
        $headers = ['Authorization: Bearer ' . $apiKey];
        $postFields = $fields;
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 180,
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($tmp !== null) @unlink($tmp);

    if ($raw === false) {
        return ['error' => ['message' => 'Error conectando con OpenAI: ' . $error]];
    }
    $jr = json_decode((string)$raw, true);
    if (!is_array($jr) || $status < 200 || $status >= 300) {
        $message = is_array($jr) ? (string)($jr['error']['message'] ?? 'OpenAI no pudo completar la solicitud.') : 'OpenAI no pudo completar la solicitud.';
        return ['error' => ['message' => $message]];
    }

    $b64 = (string)($jr['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';
    if ($b64 === '' && !empty($jr['data'][0]['url'])) {
        $ch = curl_init((string)$jr['data'][0]['url']);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $download = curl_exec($ch);
        $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if (is_string($download) && $download !== '') {
            $b64 = base64_encode($download);
            if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
        }
    }
    if ($b64 === '') {
        return ['error' => ['message' => 'OpenAI no devolvió ninguna imagen']];
    }

    return ['images' => [['data' => $b64, 'mimeType' => $mimeOut]]];
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

/**
 * Llamar a QWEN IMAGE 3 PRO (OpenRouter Images API, clave R).
 * Qwen tarda ~100s/imagen y nginx corta la conexión a ~55s sin tráfico:
 *  - keepalive: se emiten espacios periódicos (curl_multi) que no invalidan
 *    el JSON final (el parser tolera espacio en blanco inicial);
 *  - caché/lock en carpeta de la app (qwen_cache/): sys_get_temp_dir() NO
 *    persiste entre peticiones en Hostinger. Un worker guarda el resultado y
 *    los reintentos del frontend lo recogen o esperan con 'processing'.
 * Emite la respuesta final con la MISMA forma JSON que el resto de rutas
 * ({images: [{data, mimeType}]}) y SALE.
 */
function callQwen(string $apiKey, string $qwenModelId, string $prompt, array $images, ?array $background, string $aspectRatio): void {
    // Proporciones REALES de Qwen: se elige la más cercana a la composición.
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $parts = explode(':', trim((string)$aspectRatio));
    $target = max(1, (int)($parts[0] ?? 1)) / max(1, (int)($parts[1] ?? 1));
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($target - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $payload = [
        'model'         => $qwenModelId,
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];

    // Referencias: el fondo primero (si existe) y hasta 4 imágenes en total.
    $refs = [];
    if ($background && !empty($background['data'])) {
        $refs[] = ['data' => (string)$background['data'], 'mimeType' => (string)($background['mimeType'] ?? 'image/jpeg')];
    }
    foreach ($images as $img) {
        if (!empty($img['data'])) { $refs[] = ['data' => (string)$img['data'], 'mimeType' => (string)($img['mimeType'] ?? 'image/jpeg')]; }
    }
    foreach (array_slice($refs, 0, 4) as $ref) {
        $data = $ref['data'];
        if (strpos($data, 'data:') === 0) { $data = substr($data, strpos($data, ',') + 1); }
        $payload['input_references'][] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $ref['mimeType'] . ';base64,' . $data],
        ];
    }

    // Caché + candado en carpeta de la app (Hostinger no persiste /tmp).
    $cacheKey = hash('sha256', $qwenModelId . '|' . $prompt . '|' . json_encode($payload['input_references'] ?? []) . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            echo json_encode(['images' => [['data' => $cached['b64'], 'mimeType' => 'image/png']]]);
            exit;
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): se
    // emiten espacios periódicos que no invalidan el JSON final.
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $mh = curl_multi_init();
    curl_multi_add_handle($mh, $ch);
    do {
        $status = curl_multi_exec($mh, $active);
        if ($active) {
            curl_multi_select($mh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($active && $status === CURLM_OK);
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $em]]);
        exit;
    }

    $jr = json_decode($resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvio imagen.']]);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    echo json_encode(['images' => [['data' => $imageData, 'mimeType' => 'image/png']]]);
    exit;
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

    // Redondear a múltiplos de 32 (requisito de los modelos de imagen)
    if ($w >= $h) {
        return ['w' => round32($maxSide), 'h' => round32($maxSide * $h / $w)];
    } else {
        return ['h' => round32($maxSide), 'w' => round32($maxSide * $w / $h)];
    }
}

function round32(float $value): int {
    return max(32, (int) round($value / 32) * 32);
}
