<?php
// ============================================================
// PROXY PHP — Copiar Estilo (OpenAI GPT Image 2.5 + Gemini)
// Catálogo canónico (canonical-image-model.php):
//   openai-medium / openai-high / openai-max-flare → gpt-image-2.5-flare
//   openai-xhigh / openai-max-sunburst           → gpt-image-2.5-sunburst
//   gemini-flash → google/gemini-3.1-flash-image, gemini-pro → google/gemini-3-pro-image
// (lista cerrada) (400 "Modelo no soportado").
// Backend de imágenes: solo Gemini (OpenRouter).
// Análisis de texto/visión: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R, respuesta forma Gemini).
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (catálogo: 'qwen-pro' => qwen/qwen-image-3-pro)
// OpenRouter Image API (POST https://openrouter.ai/api/v1/images), síncrono.
// Qwen tarda ~100s/imagen y nginx corta la conexión a los ~55s: se
// mantiene viva con pings (curl_multi + espacios + flush) y se guarda
// el resultado en qwen_cache/ (carpeta de la app: sys_get_temp_dir()
// NO persiste entre peticiones en Hostinger).
// ====================================================================
function qwenImageResult(string $imageData): array {
    $info = @getimagesizefromstring((string)base64_decode($imageData));
    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    $url = 'data:image/png;base64,' . $imageData;
    return [
        'success' => true, 'type' => 'image', 'provider' => 'qwen', 'model' => 'qwen-pro',
        'mimeType' => 'image/png', 'image' => $imageData, 'dataUrl' => $url, 'imageUrl' => $url,
        'width' => $width, 'height' => $height,
        'aspectRatio' => $width > 0 && $height > 0 ? $width . ':' . $height : null,
    ];
}

function handleQwenImage(array $request): void {
    // ── Clave R (OpenRouter): config.php → defined('R') → getenv → REDIRECT_ → $_SERVER → $_ENV
    $key = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $key = (string)R; }
    if ($key === '') { $key = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
    if ($key === '') { $key = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
    if ($key === '') { $key = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
    if ($key === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]); exit;
    }

    // ── prompt + imagen de referencia (formato simple o contents)
    $prompt = trim((string)($request['prompt'] ?? ''));
    $imageIn = (string)($request['image'] ?? $request['imagen'] ?? $request['base64ImageData'] ?? '');
    if ($imageIn === '' && isset($request['images'][0]) && is_string($request['images'][0])) $imageIn = $request['images'][0];
    if (isset($request['contents'][0]['parts']) && is_array($request['contents'][0]['parts'])) {
        foreach ($request['contents'][0]['parts'] as $part) {
            if ($prompt === '' && !empty($part['text'])) { $prompt = trim((string)$part['text']); }
            if ($imageIn === '' && !empty($part['inlineData']['data'])) {
                $imageIn = 'data:' . (string)($part['inlineData']['mimeType'] ?? 'image/jpeg') . ';base64,' . (string)$part['inlineData']['data'];
            }
        }
    }
    if ($prompt === '') { http_response_code(400); echo json_encode(['error' => ['message' => 'Falta el prompt.']]); exit; }

    $mime = (string)($request['mimeType'] ?? 'image/jpeg');
    $imageB64 = '';
    if ($imageIn !== '') {
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $imageIn, $m) === 1) {
            $mime = strtolower($m[1]);
            $imageIn = substr($imageIn, strpos($imageIn, ',') + 1);
        }
        $imageB64 = trim($imageIn);
    }

    // Qwen solo admite un set fijo de proporciones: se elige la más
    // cercana a la imagen fuente (nunca se finge una proporción inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $targetRatio = 0.0;
    if ($imageB64 !== '') {
        $srcInfo = @getimagesizefromstring((string)base64_decode($imageB64));
        if (is_array($srcInfo) && (int)$srcInfo[0] > 0 && (int)$srcInfo[1] > 0) $targetRatio = (int)$srcInfo[0] / (int)$srcInfo[1];
    }
    if ($targetRatio <= 0) {
        $ratioReq = (string)($request['aspectRatio'] ?? ($request['generationConfig']['imageConfig']['aspectRatio'] ?? '1:1'));
        $parts = explode(':', $ratioReq);
        $rw = max(1, (int)($parts[0] ?? 1));
        $rh = max(1, (int)($parts[1] ?? 1));
        $targetRatio = $rw / $rh;
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $payload = [
        'model'         => 'qwen/qwen-image-3-pro',
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    if ($imageB64 !== '') {
        $payload['input_references'] = [[
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $mime . ';base64,' . $imageB64],
        ]];
    }

    $cacheKey = hash('sha256', 'qwen/qwen-image-3-pro|' . $prompt . '|' . $imageB64 . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            echo json_encode(qwenImageResult((string)$cached['b64'])); exit;
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        // Otra petición genera esta misma imagen: se espera el cacheo
        // manteniendo viva la conexión con espacios (mismo contrato JSON).
        $deadline = time() + 135;
        while (time() < $deadline) {
            echo str_repeat(' ', 64) . "\n";
            @flush();
            sleep(3);
            clearstatcache(true, $cacheFile);
            if (is_file($cacheFile)) {
                $cached = json_decode((string)@file_get_contents($cacheFile), true);
                if (is_array($cached) && !empty($cached['b64'])) { echo json_encode(qwenImageResult((string)$cached['b64'])); exit; }
            }
            if (!is_file($lockFile)) break;
        }
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen sigue generando la imagen; reintenta en unos segundos.']]); exit;
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar cache, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): se
    // emiten espacios periódicos que no invalidan el JSON final (el
    // parser tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
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

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexión OpenRouter: ' . $err]]); exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code >= 400 && $code < 600 ? $code : 502);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . (string)$em]]); exit;
    }

    $jr = json_decode($resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvió imagen.']]); exit;
    }
    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    echo json_encode(qwenImageResult($imageData)); exit;
}

$agBody = json_decode(file_get_contents('php://input') ?: '', true);
// QWEN IMAGE 3 PRO: ruta propia con keepalive + cache en la app
// (el contrato compartido no mantiene viva la conexión y nginx
// cortaría a los ~55s). Ver bloque BACKEND: QWEN IMAGE 3 PRO.
if (is_array($agBody) && strtolower((string)($agBody['model'] ?? '')) === 'qwen-pro') { handleQwenImage($agBody); exit; }
if (is_array($agBody)) {
    $agModalities = $agBody['generationConfig']['responseModalities'] ?? [];
    $agIsTextOnly = isset($agBody['contents']) && !in_array('IMAGE', $agModalities, true);
    if (!$agIsTextOnly) ag_image_response($agBody, __DIR__);
}

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST.']]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// ===== Resolución de claves: R (OpenRouter) y A (Gemini directa, legacy) =====
function resolveKey(string $name): string {
    foreach ([
        getenv($name),
        getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '',
        $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '',
        $_ENV['REDIRECT_' . $name] ?? ''
    ] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$orKey   = resolveKey('R');
$geminiDirectKey = resolveKey('A'); // legacy Gemini directa (para análisis texto)

// ===== Entrada =====
$requestBody = is_array($agBody) ? json_encode($agBody) : file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

// ════════════════════════════════════════════════════════════════════════
// TEXTO/VISIÓN → OpenRouter xiaomi/mimo-v2.6-pro (clave R).
// Devuelve [$httpcode, $response] con $response en FORMA GEMINI (candidates)
// para mantener el contrato con los frontends existentes.
// ════════════════════════════════════════════════════════════════════════
$mimoTextCall = function (array $req, array $genCfg) {
    // ── Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    $orKey = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $orKey = (string)R; }
    if ($orKey === '') { $orKey = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        return [500, json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']])];
    }

    // ── system
    $systemText = '';
    if (isset($req['system']) && is_string($req['system'])) {
        $systemText = trim($req['system']);
    } else {
        $sysParts = $req['systemInstruction']['parts'] ?? $req['system_instruction']['parts'] ?? $req['payload']['systemInstruction']['parts'] ?? null;
        if (is_array($sysParts)) {
            foreach ($sysParts as $p) { if (!empty($p['text'])) { $systemText .= (string)$p['text'] . "\n"; } }
            $systemText = trim($systemText);
        }
    }

    // ── contents (formato Google) → messages (formato OpenRouter)
    $contents = null;
    if (isset($req['contents']) && is_array($req['contents'])) { $contents = $req['contents']; }
    elseif (isset($req['payload']['contents']) && is_array($req['payload']['contents'])) { $contents = $req['payload']['contents']; }

    $messages = [];
    if ($systemText !== '') { $messages[] = ['role' => 'system', 'content' => $systemText]; }

    if ($contents !== null) {
        foreach ($contents as $c) {
            if (!is_array($c)) { continue; }
            $role = (($c['role'] ?? 'user') === 'model') ? 'assistant' : 'user';
            $parts = (isset($c['parts']) && is_array($c['parts'])) ? $c['parts'] : [$c];
            $content = [];
            foreach ($parts as $p) {
                if (!empty($p['text'])) {
                    $content[] = ['type' => 'text', 'text' => (string)$p['text']];
                } elseif (!empty($p['inlineData']['data']) || !empty($p['inline_data']['data'])) {
                    $mime = (string)($p['inlineData']['mimeType'] ?? $p['inline_data']['mime_type'] ?? 'image/jpeg');
                    $data = (string)($p['inlineData']['data'] ?? $p['inline_data']['data']);
                    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $data]];
                }
            }
            if (!$content) { continue; }
            $messages[] = ['role' => $role, 'content' => (count($content) === 1 && $content[0]['type'] === 'text') ? $content[0]['text'] : $content];
        }
    } else {
        $prompt = (string)($req['prompt'] ?? '');
        if ($prompt === '') { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }
        $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
        if ($imageB64 !== '') {
            $b64 = $imageB64;
            if (strpos($b64, ',') !== false) { $b64 = substr($b64, strpos($b64, ',') + 1); }
            $mime = (string)($req['mimeType'] ?? 'image/jpeg');
            if (strpos($imageB64, 'data:image/png') === 0) { $mime = 'image/png'; }
            elseif (strpos($imageB64, 'data:image/webp') === 0) { $mime = 'image/webp'; }
            $messages[] = ['role' => 'user', 'content' => [
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
                ['type' => 'text', 'text' => $prompt],
            ]];
        } else {
            $messages[] = ['role' => 'user', 'content' => $prompt];
        }
    }

    $hasUser = false;
    foreach ($messages as $m) { if ($m['role'] === 'user' || $m['role'] === 'assistant') { $hasUser = true; break; } }
    if (!$hasUser) { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }

    // ── payload OpenRouter
    $payload = ['model' => 'xiaomi/mimo-v2.6-pro', 'messages' => $messages, 'stream' => false];
    if (isset($genCfg['temperature']) && is_numeric($genCfg['temperature'])) {
        $t = (float)$genCfg['temperature'];
        if ($t >= 0.0 && $t <= 2.0) { $payload['temperature'] = $t; }
    }
    if (isset($genCfg['maxOutputTokens']) && is_numeric($genCfg['maxOutputTokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$genCfg['maxOutputTokens']));
    }
    if (isset($genCfg['responseMimeType']) && $genCfg['responseMimeType'] === 'application/json') {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    // ── llamada OpenRouter
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => ['Content-Type: ' . 'application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) { return [500, json_encode(['error' => ['message' => 'Error cURL: ' . $err]])]; }

    $orData = json_decode($raw, true);
    if ($code >= 400 || isset($orData['error'])) {
        $msg = 'Error HTTP ' . $code;
        if (isset($orData['error']) && is_array($orData['error'])) { $msg = (string)($orData['error']['message'] ?? $msg); }
        elseif (isset($orData['error'])) { $msg = (string)$orData['error']; }
        return [$code ?: 500, json_encode(['error' => ['message' => $msg]])];
    }

    $text = '';
    if (isset($orData['choices'][0]['message']['content'])) {
        $ct = $orData['choices'][0]['message']['content'];
        $text = is_string($ct) ? $ct : json_encode($ct, JSON_UNESCAPED_UNICODE);
    }

    // ── respuesta con forma Gemini (contrato intacto)
    $gem = [
        'candidates' => [[
            'content' => ['role' => 'model', 'parts' => [['text' => $text]]],
            'finishReason' => 'STOP',
            'index' => 0,
        ]],
        'modelVersion' => 'xiaomi/mimo-v2.6-pro',
    ];
    return [200, json_encode($gem, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
};

// ===== MODO PASSTHROUGH: análisis de texto (modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter) =====
// Si viene con 'contents' y responseModalities es solo TEXT, usar el helper mimo (OpenRouter).
if (isset($req['contents'])) {
    $genConfig = $req['generationConfig'] ?? [];
    $modalities = $genConfig['responseModalities'] ?? [];
    $isTextOnly = !in_array('IMAGE', $modalities, true);

    if ($isTextOnly) {
        // Modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (texto/visión; imágenes intactas).
        [$httpcode, $response] = $mimoTextCall($req, is_array($genConfig) ? $genConfig : []);
        http_response_code((int)$httpcode);
        echo $response;
        exit;
    }
    // Si viene con IMAGE en modalities, cae al nuevo flujo dual-backend
}

// ===== MODO IMAGEN: Gemini =====
// Contrato: {model, image, mimeType, prompt?}
$imageB64 = (string)($req['image'] ?? $req['base64ImageData'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');

// Si viene en formato contents (con IMAGE), extraer imagen y prompt
if (isset($req['contents']) && $imageB64 === '') {
    $parts = $req['contents'][0]['parts'] ?? [];
    foreach ($parts as $part) {
        if (isset($part['inlineData']['data'])) {
            $imageB64 = $part['inlineData']['data'];
            $mimeType = $part['inlineData']['mimeType'] ?? 'image/jpeg';
        }
        if (isset($part['text'])) {
            $prompt = $part['text'];
        }
    }
}

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen.']]);
    exit;
}

// Validación tamaño
$imgBinary = base64_decode($imageB64);
if ($imgBinary === false || strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

// Preparar base64 puro (sin prefijo data:)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// ===== Selección de modelo (solo Gemini) =====
$reqModel = strtolower((string)($req['model'] ?? 'gemini-flash'));
$backend = 'gemini';
$geminiModel = 'google/gemini-3.1-flash-image';
if (strpos($reqModel, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
if (strpos($reqModel, 'pro') !== false || $reqModel === 'google/gemini-3-pro-image') {
    $geminiModel = 'google/gemini-3-pro-image';
}
// Cualquier otro valor -> Gemini 3.1 Flash (fallback seguro)



// ====================================================================
// BACKEND: GEMINI (OpenRouter sync)
// ====================================================================
if ($backend === 'gemini') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }

    $content = [
        ['type' => 'text', 'text' => $prompt !== '' ? $prompt : 'Apply the style of the reference image to the subject image.'],
        ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]],
    ];

    $payload = [
        'model'      => $geminiModel,
        'modalities' => ['image', 'text'],
        'messages'   => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexión OpenRouter: ' . $err]]);
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
    $images = $jr['choices'][0]['message']['images'] ?? [];
    if (empty($images)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini no devolvió imagen.']]);
        exit;
    }

    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini devolvió URL en lugar de imagen.']]);
        exit;
    }

    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);

    echo json_encode([
        'image'    => base64_encode(base64_decode($imgB64)),
        'mimeType' => 'image/png',
    ]);
    exit;
}

// Modelo no reconocido
http_response_code(400);
echo json_encode(['error' => ['message' => 'Modelo no soportado. Usa gemini-flash o gemini-pro.']]);
