<?php
// ============================================================
// PROXY PHP - Generador / Editor de imágenes con IA (OpenRouter)
// Oculta la clave OPENROUTER_API_KEY del frontend.
// Compatible Hostinger (cascade de 7 fuentes de clave).
// Catálogo 2.5 vía canonical-image-model.php: openai-medium/high
// (gpt-image-2.5-flare), openai-xhigh (gpt-image-2.5-sunburst),
// openai-max-flare (gpt-image-2.5-flare/max), openai-max-sunburst
// (gpt-image-2.5-sunburst/max) + gemini-flash/pro (OpenRouter R).
// La llamada OpenAI (generations/edits) la ejecuta
// ag_image_generate() de canonical-image-model.php.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
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

// Resolución de la clave R con la MISMA cascada que el resto de claves del
// proxy (constante + getenv/REDIRECT_/$_SERVER/$_ENV). No usa ag_image_key()
// de canonical-image-model.php: esa función referencia una variable $config
// indefinida y lanza TypeError bajo strict_types (defecto del fichero
// compartido, fuera del alcance de este encargo).
function ag_qwen_key(string $name): string
{
    if (defined($name) && is_string(constant($name)) && trim((string)constant($name)) !== '') return trim((string)constant($name));
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API) con keepalive + caché.
// Qwen tarda ~100s/imagen y nginx corta a ~55s: se mantiene viva la
// conexión con pings (curl_multi + espacios + flush) y el resultado se
// guarda en qwen_cache/ de la carpeta de la app (sys_get_temp_dir() NO
// persiste entre peticiones en Hostinger). Los reintentos del frontend
// recogen el caché o esperan con 'processing' mientras el worker termina.
// ====================================================================
function ag_qwen_generate(array $request, string $configDir = ''): array
{
    $selected = ag_image_selected((string)($request['model'] ?? ''));
    if (($selected['provider'] ?? '') !== 'qwen') {
        throw new InvalidArgumentException('Modelo no soportado.', 400);
    }
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '' && isset($request['contents'][0]['parts'])) {
        foreach ($request['contents'][0]['parts'] as $part) {
            if (!empty($part['text'])) { $prompt = trim((string)$part['text']); break; }
        }
    }
    if ($prompt === '') throw new InvalidArgumentException('Falta el prompt.', 400);
    if (strlen($prompt) > 12000) throw new LengthException('El prompt es demasiado largo.', 413);

    $images = [];
    foreach (['image', 'imagen', 'imageData', 'subject', 'referenceImage'] as $srcKey) {
        if (isset($request[$srcKey]) && is_string($request[$srcKey]) && trim($request[$srcKey]) !== '') $images[] = $request[$srcKey];
    }
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) {
            if (is_string($image) && trim($image) !== '') $images[] = $image;
            elseif (is_array($image) && !empty($image['data'])) $images[] = 'data:' . ($image['mimeType'] ?? 'image/jpeg') . ';base64,' . $image['data'];
        }
    }
    if (isset($request['contents'][0]['parts']) && is_array($request['contents'][0]['parts'])) {
        foreach ($request['contents'][0]['parts'] as $part) {
            if (!empty($part['inlineData']['data'])) $images[] = 'data:' . ($part['inlineData']['mimeType'] ?? 'image/jpeg') . ';base64,' . $part['inlineData']['data'];
        }
    }
    $images = array_slice($images, 0, 4);

    // Proporciones REALES de Qwen (set fijo): la más cercana a la imagen
    // fuente (o a la proporción pedida si no hay referencia).
    $qwenAllowed = ['1:1'=>1.0, '1:2'=>1/2, '1:4'=>1/4, '2:1'=>2.0, '2:3'=>2/3, '3:2'=>3/2, '3:4'=>3/4, '4:1'=>4.0, '4:3'=>4/3, '4:5'=>4/5, '5:4'=>5/4, '9:16'=>9/16, '16:9'=>16/9];
    $targetRatio = 0.0;
    if ($images !== []) {
        $probe = base64_decode((string)preg_replace('#^data:[^;]+;base64,#i', '', trim($images[0])), true);
        $probeInfo = ($probe === false || $probe === '') ? false : @getimagesizefromstring($probe);
        if (is_array($probeInfo) && (int)$probeInfo[0] > 0 && (int)$probeInfo[1] > 0) $targetRatio = (int)$probeInfo[0] / (int)$probeInfo[1];
    }
    if ($targetRatio <= 0) {
        $ratioParts = explode(':', ag_image_aspect((string)($request['aspectRatio'] ?? '1:1')));
        $targetRatio = max(1, (int)$ratioParts[0]) / max(1, (int)$ratioParts[1]);
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $payload = [
        'model'         => $selected['model'],
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    $pures = [];
    foreach ($images as $image) {
        [, $mime] = ag_image_input($image);
        $pure = (string)preg_replace('#^data:[^;]+;base64,#i', '', trim($image));
        $payload['input_references'][] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure]];
        $pures[] = $pure;
    }

    // Caché + candado en carpeta de la app (sys_get_temp_dir() no persiste
    // entre peticiones en Hostinger).
    $cacheKey = hash('sha256', $selected['model'] . '|' . $prompt . '|' . implode('|', $pures) . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            return ag_image_result((string)$cached['b64'], 'image/png', $selected, 'qwen');
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    // La clave solo hace falta para llamar a la API: el caché y el candado
    // se resuelven antes (un resultado cacheado no necesita clave).
    $orKey = ag_qwen_key('R');
    if ($orKey === '') throw new RuntimeException('La clave de OpenRouter no está configurada.', 500);

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): se
    // emiten espacios periódicos que no invalidan el JSON final (el parser
    // tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err !== '') throw new RuntimeException('Error conexion OpenRouter: ' . $err, 502);
    $data = json_decode($resp, true);
    if (!is_array($data)) throw new RuntimeException('Respuesta no válida del proveedor.', 502);
    if ($code >= 400 || isset($data['error'])) {
        $em = $data['error']['message'] ?? $data['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        throw new RuntimeException('OpenRouter: ' . (string)$em, $code >= 400 ? $code : 502);
    }
    $b64 = (string)($data['data'][0]['b64_json'] ?? '');
    if ($b64 === '') throw new RuntimeException('Qwen no devolvio ninguna imagen.', 502);

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $b64]));
    @unlink($lockFile);
    return ag_image_result($b64, 'image/png', $selected, 'qwen');
}

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);
if (is_array($canonicalBody)) {
    try {
        $result = (strtolower((string)($canonicalBody['model'] ?? '')) === 'qwen-pro')
            ? ag_qwen_generate($canonicalBody, __DIR__)
            : ag_image_generate($canonicalBody, __DIR__);
        echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    } catch (Throwable $error) {
        $status = (int)$error->getCode();
        if ($status < 400 || $status > 599) $status = 500;
        http_response_code($status);
        echo json_encode(['error'=>['message'=>$error->getMessage()]], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
    exit;
}

// ===== CLAVE API: cascade de fuentes (Hostinger) =====
$apiKey = '';

// 1. Config file local (máxima prioridad)

// 2-7. Variables de entorno / superglobales
if (empty($apiKey)) $apiKey = getenv('OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_OPENROUTER_API_KEY'] ?? '';

if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key no configurada. Crea .htaccess raiz con define("OPENROUTER_API_KEY", "tu-key");']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['prompt']) || trim((string)$data['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$prompt = (string)$data['prompt'];

// Presets de calidad -> modelo real de OpenRouter (mismos que el script original)
$MODELOS = [
    'barato' => 'google/gemini-3.1-flash-lite-image',
    'normal' => 'google/gemini-3.1-flash-image',
    'pro'    => 'google/gemini-3-pro-image',
];
$calidad = $data['calidad'] ?? 'normal';
$model = $MODELOS[$calidad] ?? $MODELOS['normal'];

// Imagen de entrada opcional (data URL) para EDITAR
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

// ===== CONSTRUIR CONTENIDO =====
if ($imagenEntrada !== '') {
    $content = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => $imagenEntrada]],
    ];
} else {
    $content = $prompt;
}

$payload = json_encode([
    'model' => $model,
    'messages' => [['role' => 'user', 'content' => $content]],
    'modalities' => ['image', 'text'],
]);

// ===== LLAMADA A OPENROUTER =====
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://openrouter.ai/api/v1/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        'X-Title: Generador de Imagenes IA',
    ],
    CURLOPT_TIMEOUT => 180,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $curlError]]);
    exit;
}

if ($httpCode !== 200) {
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? ('HTTP ' . $httpCode);
    http_response_code($httpCode);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
    exit;
}

// ===== EXTRAER IMAGEN + COSTE =====
$parsed = json_decode($response, true);
$msg = $parsed['choices'][0]['message'] ?? [];
$imgs = $msg['images'] ?? [];

if (empty($imgs) || empty($imgs[0]['image_url']['url'])) {
    http_response_code(502);
    $texto = is_string($msg['content'] ?? null) ? substr($msg['content'], 0, 300) : '';
    echo json_encode(['error' => ['message' => 'El modelo no devolvió imagen. ' . $texto]]);
    exit;
}

$imageUrl = $imgs[0]['image_url']['url']; // data:image/...;base64,....
$coste = (float)($parsed['usage']['cost'] ?? 0.0);

echo json_encode([
    'success'  => true,
    'imageUrl' => $imageUrl,
    'coste'    => $coste,
    'modelo'   => $model,
    'calidad'  => $calidad,
]);
