<?php
header('Content-Type: application/json');

$apiKey = '';

// Si no está en .htaccess raiz, buscar en variables de entorno (incluyendo prefijos de redirección FastCGI)
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_A'] ?? '';
}

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

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

// ===== Clave OpenRouter: R (QWEN Image 3 Pro) — mismo cascadeo que las demás =====
$orKey = '';
foreach ([getenv('R'), getenv('REDIRECT_R'), $_SERVER['R'] ?? '', $_SERVER['REDIRECT_R'] ?? '', $_ENV['R'] ?? '', $_ENV['REDIRECT_R'] ?? ''] as $v) {
    if (!empty($v)) { $orKey = (string)$v; break; }
}

function imageAspectLabel(int $width, int $height): string {
    if ($width <= 0 || $height <= 0) return '1:1';
    $a = abs($width); $b = abs($height);
    while ($b !== 0) { $tmp = $a % $b; $a = $b; $b = $tmp; }
    $g = $a > 0 ? $a : 1;
    return intdiv($width, $g) . ':' . intdiv($height, $g);
}

function openAiOutputSize(int $sourceWidth, int $sourceHeight): string {
    if ($sourceWidth <= 0 || $sourceHeight <= 0) return '1024x1024';
    $ratio = max(1 / 3, min(3, $sourceWidth / $sourceHeight));
    $targetPixels = 1048576;
    $width = (int)(round(sqrt($targetPixels * $ratio) / 16) * 16);
    $height = (int)(round(sqrt($targetPixels / $ratio) / 16) * 16);
    $width = max(16, $width);
    $height = max(16, $height);
    while ($width / $height > 3) $height += 16;
    while ($height / $width > 3) $width += 16;
    return $width . 'x' . $height;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

// --- SEGURIDAD: Control de tamaño de imagen ---
$imgBinary = base64_decode($imageB64);
if (strlen($imgBinary) > 2500000) { // Límite ~2.5MB
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

$prompt   = (string)($req['prompt'] ?? "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page.\n\nStyle Conversion: Convert all visual elements from the input image (people, objects, backgrounds, text, etc.) into consistent, smooth, and distinct black outlines using clean, uniform lines.\n\nTonal Removal: Completely eliminate all colors, gradients, shading, textures, and gray fills. The resulting image must consist purely of black lines on a pure white background.\n\nClarity and Space: Simplify complex shapes when necessary to create distinct, clear areas of white space that invite and are easy to color. Ensure that the outlines of key objects are prominent.\n\nDetail & Context Preservation: Maintain the original composition, perspective, and key elements of the input image. If the input image contains text, render it as clear, simple, colorable outlines. If there are intricate details, reduce them to essential lines without losing the object's identity (e.g., ship rigging details or basic facial features).\n\nCleanliness: The final drawing must be sharp, without artifacts, smudges, or extraneous lines. Do not add additional background textures or decorative frames unless they were present in the original image or specifically requested.\n\nThe final output should appear ready to be printed and hand-colored.");

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen']]);
    exit;
}

// ===== Seleccion de modelo (lista blanca exacta, lista cerrada) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
    'qwen-pro'            => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro'],
];
$reqModel = strtolower((string)($req['model'] ?? 'openai-medium'));
if (!isset($modelCatalog[$reqModel])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
$selected = $modelCatalog[$reqModel];

$imageInfo = @getimagesizefromstring($imgBinary);
$openaiSize = openAiOutputSize((int)($imageInfo[0] ?? 0), (int)($imageInfo[1] ?? 0));

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2.5 (Images API, edicion sincrona)
// ====================================================================
if ($selected['backend'] === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
        exit;
    }
    $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
    if ($tmpPath === false || file_put_contents($tmpPath, $imgBinary) === false) {
        if ($tmpPath !== false) @unlink($tmpPath);
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
        exit;
    }
    $uploadName = 'referencia.' . (stripos($mimeType, 'png') !== false ? 'png' : (stripos($mimeType, 'webp') !== false ? 'webp' : 'jpg'));
    $oaiPayload = [
        'model'   => $selected['model'],
        'prompt'  => $prompt,
        'quality' => $selected['quality'],
        'size'    => $openaiSize,
        'image[]' => new CURLFile($tmpPath, $mimeType, $uploadName),
    ];
    $ch = curl_init('https://api.openai.com/v1/images/edits');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $oaiPayload,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $openaiKey],
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlerr = curl_error($ch);
    curl_close($ch);
    @unlink($tmpPath);

    if ($curlerr) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexion con OpenAI: ' . $curlerr]]);
        exit;
    }
    $data = json_decode($response, true);
    if ($httpcode >= 400 || isset($data['error'])) {
        $msg = $data['error']['message'] ?? ('HTTP ' . $httpcode);
        if (is_array($msg)) $msg = json_encode($msg);
        http_response_code($httpcode >= 400 ? $httpcode : 502);
        echo json_encode(['error' => ['message' => 'OpenAI: ' . $msg]]);
        exit;
    }
    $imageData = $data['data'][0]['b64_json'] ?? '';
    $mimeOut = 'image/png';
    if ($imageData === '' && !empty($data['data'][0]['url'])) {
        $imageUrl = (string)$data['data'][0]['url'];
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $download = curl_exec($ch);
        $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if (is_string($download) && $download !== '') {
            $imageData = base64_encode($download);
            if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
        }
    }
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'OpenAI no devolvio ninguna imagen.']]);
        exit;
    }
    $outInfo = @getimagesizefromstring(base64_decode($imageData));
    echo json_encode([
        'image' => $imageData,
        'mimeType' => $mimeOut,
        'width' => (int)($outInfo[0] ?? 0),
        'height' => (int)($outInfo[1] ?? 0),
        'aspectRatio' => imageAspectLabel((int)($outInfo[0] ?? 0), (int)($outInfo[1] ?? 0)),
    ]);
    exit;
}

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API) — keepalive + cache
// ====================================================================
if ($selected['backend'] === 'qwen') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada en el servidor.']]);
        exit;
    }

    // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
    // a la imagen fuente (nunca se finge una proporcion inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $sourceW = (int)($imageInfo[0] ?? 0);
    $sourceH = (int)($imageInfo[1] ?? 0);
    $targetRatio = ($sourceW > 0 && $sourceH > 0) ? $sourceW / $sourceH : 1.0;
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $qwenPayload = [
        'model'         => $selected['model'],
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
        'input_references' => [[
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64],
        ]],
    ];

    // Qwen Image 3 Pro puede tardar mas que el timeout de nginx (~55s):
    // un worker genera y guarda el resultado (ignore_user_abort), y los
    // reintentos del frontend recogen el cache o esperan con 'processing'.
    // El cache va en carpeta de la app: sys_get_temp_dir() NO persiste
    // entre peticiones en Hostinger.
    $cacheKey = hash('sha256', $selected['model'] . '|' . $prompt . '|' . $imageB64 . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            $outInfo = @getimagesizefromstring(base64_decode($cached['b64']));
            echo json_encode([
                'image' => $cached['b64'],
                'mimeType' => 'image/png',
                'width' => (int)($outInfo[0] ?? 0),
                'height' => (int)($outInfo[1] ?? 0),
                'aspectRatio' => imageAspectLabel((int)($outInfo[0] ?? 0), (int)($outInfo[1] ?? 0)),
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
        // Si la generacion termino sin guardar cache, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexion con nginx (corta a ~55s sin trafico): la
    // generacion puede tardar mas; se emiten espacios periodicos que no
    // invalidan el JSON final (el parser tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT        => 180,
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
    $response = (string)curl_multi_getcontent($ch);
    $httpcode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlerr  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($curlerr) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $curlerr]]);
        exit;
    }
    $data = json_decode($response, true);
    if ($httpcode >= 400 || isset($data['error'])) {
        $msg = $data['error']['message'] ?? $data['error'] ?? ('HTTP ' . $httpcode);
        if (is_array($msg)) $msg = json_encode($msg);
        http_response_code($httpcode >= 400 ? $httpcode : 502);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $msg]]);
        exit;
    }
    $imageData = $data['data'][0]['b64_json'] ?? '';
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvio ninguna imagen.']]);
        exit;
    }
    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    $outInfo = @getimagesizefromstring(base64_decode($imageData));
    echo json_encode([
        'image' => $imageData,
        'mimeType' => 'image/png',
        'width' => (int)($outInfo[0] ?? 0),
        'height' => (int)($outInfo[1] ?? 0),
        'aspectRatio' => imageAspectLabel((int)($outInfo[0] ?? 0), (int)($outInfo[1] ?? 0)),
    ]);
    exit;
}

// ====================================================================
// BACKEND: GEMINI (Google directo, clave A) — conservado tal cual
// ====================================================================
$model = $selected['model'];
$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $prompt],
            ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]]
        ]
    ]],
    'generationConfig' => [
        'responseModalities' => ['IMAGE', 'TEXT'],
        'imageConfig' => [
            'imageSize' => '1K'
        ]
    ]
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error cURL: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => $msg]]);
    exit;
}

$candidates = $data['candidates'] ?? [];
$imageData = '';
$mimeOut = 'image/png';
$texts = [];

foreach ($candidates as $cand) {
    foreach ($cand['content']['parts'] ?? [] as $part) {
        if (isset($part['inlineData'])) {
            $imageData = $part['inlineData']['data'] ?? '';
            $mimeOut = $part['inlineData']['mimeType'] ?? 'image/png';
        }
        if (isset($part['text']) && !empty($part['text'])) {
            $texts[] = $part['text'];
        }
    }
}

if ($imageData === '') {
    echo json_encode([
        'text' => implode("\n", $texts) ?: 'El modelo no genero imagen ni texto.'
    ]);
    exit;
}

echo json_encode([
    'image' => $imageData,
    'mimeType' => $mimeOut
]);
