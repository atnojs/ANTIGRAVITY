<?php
// ============================================================
// PROXY PHP — Estudio de Imágenes IA (OpenRouter)
// Hostinger-compatible · 7 fuentes de API Key
// Acciones:
//   - generar : text-to-image
//   - editar  : image-to-image (con imagen de entrada)
//   - mejorar : mejora un prompt (modelo de texto barato)
// La clave viaja SIEMPRE server-side, nunca al frontend.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

// ===== 7 FUENTES DE API KEY (Hostinger) =====
$apiKey = '';

if (empty($apiKey)) $apiKey = getenv('OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_OPENROUTER_API_KEY'] ?? '';

// La clave "AQUI_TU_API_KEY" del placeholder no es válida
if (empty($apiKey) || $apiKey === 'AQUI_TU_API_KEY') {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key no configurada. Crea .htaccess raiz con define("OPENROUTER_API_KEY", "tu-key");']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$accion = $data['action'] ?? 'generar';
$prompt = trim((string)$data['prompt']);

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'El prompt está vacío']]);
    exit;
}

// Modelos permitidos (whitelist server-side — el frontend NO elige libremente)
$MODELOS_IMG = [
    'barato' => 'google/gemini-3.1-flash-lite-image',
    'normal' => 'google/gemini-3.1-flash-image',
    'pro'    => 'google/gemini-3-pro-image',
];
$MODELO_TEXTO = 'xiaomi/mimo-v2.6-pro';

// ===== Clave OpenAI: SOLO entorno (getenv → REDIRECT_ → $_SERVER → $_ENV) =====
$openaiKey = '';
foreach ([getenv('OPENAI_API_KEY'), getenv('REDIRECT_OPENAI_API_KEY'), $_SERVER['OPENAI_API_KEY'] ?? '', $_SERVER['REDIRECT_OPENAI_API_KEY'] ?? '', $_ENV['OPENAI_API_KEY'] ?? '', $_ENV['REDIRECT_OPENAI_API_KEY'] ?? ''] as $v) {
    if (!empty($v)) { $openaiKey = (string)$v; break; }
}
if ($openaiKey === '') {
    foreach ([getenv('O'), getenv('REDIRECT_O'), $_SERVER['O'] ?? '', $_SERVER['REDIRECT_O'] ?? '', $_ENV['O'] ?? '', $_ENV['REDIRECT_O'] ?? ''] as $v) {
        if (!empty($v)) { $openaiKey = (string)$v; break; }
    }
}

$openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// Helper: llamada a OpenRouter
// ============================================================
function llamarOpenRouter($url, $payload, $apiKey) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
            'X-Title: Estudio de Imagenes IA'
        ],
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    return [$response, $httpCode, $curlError];
}

// ============================================================
// ACCIÓN: mejorar prompt (texto)
// ============================================================
if ($accion === 'mejorar') {
    $sistema = 'Eres un experto en prompts para modelos de imagen. Reescribe la idea del usuario '
        . 'como un prompt en INGLÉS, detallado y visual, para generar una imagen de alta calidad. '
        . 'Incluye sujeto, composición, iluminación, estilo, ambiente y calidad. '
        . 'Si el usuario indica un número exacto de objetos, recálcalo de forma explícita para que el modelo lo respete. '
        . 'Devuelve ÚNICAMENTE el prompt mejorado, sin explicaciones, sin comillas, sin prefijos.';

    $payload = [
        'model' => $MODELO_TEXTO,
        'messages' => [
            ['role' => 'system', 'content' => $sistema],
            ['role' => 'user', 'content' => $prompt],
        ],
    ];

    list($response, $httpCode, $curlError) = llamarOpenRouter($openRouterUrl, $payload, $apiKey);

    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión: ' . $curlError]]);
        exit;
    }
    if ($httpCode !== 200) {
        $errBody = json_decode($response, true);
        $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
        if (is_array($errMsg)) $errMsg = json_encode($errMsg);
        http_response_code($httpCode);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
        exit;
    }

    $r = json_decode($response, true);
    $texto = $r['choices'][0]['message']['content'] ?? '';
    $cost = $r['usage']['cost'] ?? 0;
    echo json_encode(['success' => true, 'prompt' => trim($texto), 'cost' => $cost]);
    exit;
}

// ============================================================
// ACCIÓN: generar / editar imagen
// ============================================================
$calidad = $data['calidad'] ?? 'normal';

// ===== Lista blanca exacta de modelos (lista cerrada) =====
$CATALOGO = [
    'openai-medium'       => ['provider' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
    'openai-high'         => ['provider' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
    'openai-xhigh'        => ['provider' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['provider' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
    'openai-max-sunburst' => ['provider' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['provider' => 'gemini', 'model' => 'google/gemini-3.1-flash-image'],
    'gemini-pro'          => ['provider' => 'gemini', 'model' => 'google/gemini-3-pro-image'],
    'qwen-pro'            => ['provider' => 'qwen',   'model' => 'qwen/qwen-image-3-pro'],
];
$reqModel = strtolower((string)($data['model'] ?? ''));
if ($reqModel !== '' && !isset($CATALOGO[$reqModel])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
$usarCatalogo = isset($CATALOGO[$reqModel]);
$model = $usarCatalogo ? $CATALOGO[$reqModel]['model'] : ($MODELOS_IMG[$calidad] ?? $MODELOS_IMG['normal']);

// Construir el contenido del mensaje
if ($accion === 'editar') {
    $imagenEntrada = $data['imageData'] ?? '';  // data URL base64
    if (empty($imagenEntrada)) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Para editar hace falta una imagen de entrada (imageData)']]);
        exit;
    }
    $contenido = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => $imagenEntrada]],
    ];
} else {
    // generar desde texto
    $contenido = [
        ['type' => 'text', 'text' => $prompt],
    ];
}

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2.5 (Images API) — solo modelos openai-*
// ====================================================================
if ($usarCatalogo && $CATALOGO[$reqModel]['provider'] === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
        exit;
    }
    $fields = [
        'model'   => $CATALOGO[$reqModel]['model'],
        'prompt'  => $prompt,
        'quality' => $CATALOGO[$reqModel]['quality'],
        'size'    => '1024x1024',
    ];
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $headers = ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmp = null;
    if ($accion === 'editar') {
        $pure = preg_replace('#^data:[^;]+;base64,#i', '', $imagenEntrada);
        $mime = 'image/jpeg';
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $imagenEntrada, $m) === 1) $mime = strtolower($m[1]);
        $binary = base64_decode($pure, true);
        if ($binary === false || $binary === '') {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen de entrada no válida.']]);
            exit;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmp === false || file_put_contents($tmp, $binary) === false) {
            if ($tmp !== false) @unlink($tmp);
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
            exit;
        }
        $ext = stripos($mime, 'png') !== false ? 'png' : (stripos($mime, 'webp') !== false ? 'webp' : 'jpg');
        $fields['image[]'] = new CURLFile($tmp, $mime, 'referencia.' . $ext);
        $endpoint = 'https://api.openai.com/v1/images/edits';
        $headers = ['Authorization: Bearer ' . $openaiKey];
        $postFields = $fields;
    }
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($tmp !== null) @unlink($tmp);
    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión: ' . $curlError]]);
        exit;
    }
    if ($httpCode !== 200) {
        $errBody = json_decode($response, true);
        $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
        if (is_array($errMsg)) $errMsg = json_encode($errMsg);
        http_response_code($httpCode);
        echo json_encode(['error' => ['message' => 'OpenAI: ' . $errMsg]]);
        exit;
    }
    $r = json_decode($response, true);
    $b64 = (string)($r['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';
    if ($b64 === '' && !empty($r['data'][0]['url'])) {
        $ch = curl_init((string)$r['data'][0]['url']);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
        $download = curl_exec($ch);
        $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if (is_string($download) && $download !== '') {
            $b64 = base64_encode($download);
            if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
        }
    }
    if ($b64 === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'OpenAI no devolvió ninguna imagen.']]);
        exit;
    }
    echo json_encode([
        'success' => true,
        'image'   => 'data:' . $mimeOut . ';base64,' . $b64,
        'cost'    => 0,
        'model'   => $CATALOGO[$reqModel]['model'],
    ]);
    exit;
}

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API) — keepalive + caché
// Qwen tarda ~100s/imagen y nginx corta a ~55s: worker con caché/lock en
// la carpeta de la app (qwen_cache/) y pings de espacios para mantener
// viva la conexión. sys_get_temp_dir() NO persiste entre peticiones.
// ====================================================================
if ($usarCatalogo && $CATALOGO[$reqModel]['provider'] === 'qwen') {
    // Qwen solo admite un set fijo de proporciones: se elige la más cercana
    // a la imagen fuente (nunca se finge una proporción inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qwenPure = '';
    $qwenMime = 'image/jpeg';
    $srcW = 0;
    $srcH = 0;
    if ($accion === 'editar' && !empty($imagenEntrada)) {
        $qwenPure = (string)$imagenEntrada;
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $qwenPure, $qm) === 1) {
            $qwenMime = strtolower($qm[1]);
            $qwenPure = substr($qwenPure, strpos($qwenPure, ',') + 1);
        }
        $qwenBin = base64_decode($qwenPure, true);
        $qwenInfo = $qwenBin !== false ? @getimagesizefromstring($qwenBin) : false;
        if (is_array($qwenInfo)) { $srcW = (int)$qwenInfo[0]; $srcH = (int)$qwenInfo[1]; }
    }
    $targetRatio = ($srcW > 0 && $srcH > 0) ? $srcW / $srcH : 1.0;
    $qwenRatio = '1:1';
    $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $payload = [
        'model'         => $CATALOGO[$reqModel]['model'],
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    if ($qwenPure !== '') {
        $payload['input_references'] = [[
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $qwenMime . ';base64,' . $qwenPure],
        ]];
    }

    // Caché/lock en la carpeta de la app: los reintentos del frontend
    // recogen el resultado aunque nginx haya cortado la respuesta.
    $cacheKey = hash('sha256', $payload['model'] . '|' . $prompt . '|' . $qwenPure . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            echo json_encode([
                'success' => true,
                'image'   => 'data:image/png;base64,' . $cached['b64'],
                'cost'    => 0,
                'model'   => $payload['model'],
            ]);
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

    // Keepalive: espacios periódicos que no invalidan el JSON final
    // (el parser tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            // Token Authorization partido en dos literales: evita que copias
            // enmascaradas del entorno se cuelen en el código.
            'Authorization: Bea' . 'rer ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
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
    $response = (string)curl_multi_getcontent($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $curlError]]);
        exit;
    }
    if ($httpCode !== 200) {
        $errBody = json_decode($response, true);
        $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
        if (is_array($errMsg)) $errMsg = json_encode($errMsg);
        http_response_code($httpCode);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
        exit;
    }
    $r = json_decode($response, true);
    $b64 = (string)($r['data'][0]['b64_json'] ?? '');
    if ($b64 === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvió ninguna imagen.']]);
        exit;
    }
    // Guarda el resultado: los reintentos lo recogen aunque nginx haya cortado.
    @file_put_contents($cacheFile, json_encode(['b64' => $b64]));
    @unlink($lockFile);
    echo json_encode([
        'success' => true,
        'image'   => 'data:image/png;base64,' . $b64,
        'cost'    => 0,
        'model'   => $payload['model'],
    ]);
    exit;
}

$payload = [
    'model' => $model,
    'messages' => [
        ['role' => 'user', 'content' => $contenido],
    ],
    'modalities' => ['image', 'text'],
];

list($response, $httpCode, $curlError) = llamarOpenRouter($openRouterUrl, $payload, $apiKey);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $curlError]]);
    exit;
}

if ($httpCode !== 200) {
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
    if (is_array($errMsg)) $errMsg = json_encode($errMsg);
    http_response_code($httpCode);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
    exit;
}

// Extraer la imagen de la respuesta de OpenRouter
$r = json_decode($response, true);
$msg = $r['choices'][0]['message'] ?? [];
$imagenUrl = '';

if (!empty($msg['images']) && is_array($msg['images'])) {
    $imagenUrl = $msg['images'][0]['image_url']['url'] ?? '';
}

if (empty($imagenUrl)) {
    $texto = is_string($msg['content'] ?? null) ? $msg['content'] : '';
    http_response_code(422);
    echo json_encode(['error' => ['message' => 'El modelo no devolvió imagen. ' . mb_substr($texto, 0, 200)]]);
    exit;
}

$cost = $r['usage']['cost'] ?? 0;

echo json_encode([
    'success' => true,
    'image'   => $imagenUrl,   // data URL base64
    'cost'    => $cost,
    'model'   => $model,
]);
