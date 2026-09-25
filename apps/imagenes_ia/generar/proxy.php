<?php
// Proxy Gemini (texto/visión, clave A). §6: modelo de texto gemini-3.8-flash
// (documentación: el texto real va por xiaomi/mimo-v2.6-pro vía OpenRouter;
//  gemini-3.8-flash solo queda como modelo por defecto de la ruta de IMAGEN
//  Google directa, que se conserva byte-idéntica).
// La generación de imágenes va por proxy_models.php (canonical-image-model.php:
// OpenAI 2.5 + Gemini, Otros modelos rechazados).
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

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

// API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
$API_KEY = '';
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('REDIRECT_A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// Entrada
$requestBody = file_get_contents('php://input');
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

// ══════════════════════════════════════════════════════════════════════
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API, sincrono)
// Catálogo: 'qwen-pro' => ['backend'=>'qwen', 'model'=>'qwen/qwen-image-3-pro']
// Qwen tarda ~100s/imagen y nginx corta la conexion a los ~55s: se
// mantiene viva con pings (curl_multi + espacios + flush) y se guarda
// el resultado en qwen_cache/ (carpeta de la app: sys_get_temp_dir()
// NO persiste entre peticiones en Hostinger).
// ══════════════════════════════════════════════════════════════════════
$qwenCatalog = ['qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']];
$qwenReqModel = strtolower((string)($req['model'] ?? ''));
if (isset($qwenCatalog[$qwenReqModel])) {
    $qwenKey = getKey('R');
    if ($qwenKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }

    $qwenPrompt = trim((string)($req['prompt'] ?? ''));
    if ($qwenPrompt === '' && isset($req['contents'][0]['parts'])) {
        foreach ($req['contents'][0]['parts'] as $qwenPart) {
            if (!empty($qwenPart['text'])) { $qwenPrompt = trim((string)$qwenPart['text']); break; }
        }
    }
    if ($qwenPrompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $qwenImagen = isset($req['imagen']) ? (string)$req['imagen'] : '';
    if ($qwenImagen === '' && isset($req['contents'][0]['parts'])) {
        foreach ($req['contents'][0]['parts'] as $qwenPart) {
            if (!empty($qwenPart['inlineData']['data'])) { $qwenImagen = (string)$qwenPart['inlineData']['data']; break; }
        }
    }
    $qwenMime = 'image/jpeg';
    $qwenB64 = $qwenImagen;
    if (strpos($qwenB64, 'data:') === 0 && strpos($qwenB64, ',') !== false) {
        if (preg_match('#^data:(image/[a-z0-9.+-]+);#i', $qwenB64, $qwenM)) { $qwenMime = strtolower($qwenM[1]); }
        $qwenB64 = substr($qwenB64, strpos($qwenB64, ',') + 1);
    }

    // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
    // a la imagen fuente (nunca se finge una proporcion inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qwenTarget = 1.0;
    $qwenInfo = $qwenB64 !== '' ? @getimagesizefromstring((string)base64_decode($qwenB64)) : false;
    if (is_array($qwenInfo) && $qwenInfo[0] > 0 && $qwenInfo[1] > 0) {
        $qwenTarget = $qwenInfo[0] / $qwenInfo[1];
    } else {
        $qwenParts = explode(':', (string)($req['aspectRatio'] ?? '1:1'));
        $qwenRW = max(1.0, (float)($qwenParts[0] ?? 1));
        $qwenRH = max(1.0, (float)($qwenParts[1] ?? 1));
        $qwenTarget = $qwenRW / $qwenRH;
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $qwenLabel => $qwenValue) {
        $qwenCurrent = abs($qwenTarget - $qwenValue);
        if ($qwenCurrent < $qwenDistance) { $qwenDistance = $qwenCurrent; $qwenRatio = $qwenLabel; }
    }

    $qwenPayload = [
        'model'         => $qwenCatalog[$qwenReqModel]['model'],
        'prompt'        => $qwenPrompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    if ($qwenB64 !== '') {
        $qwenPayload['input_references'] = [[
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $qwenMime . ';base64,' . $qwenB64],
        ]];
    }

    $qwenCacheKey = hash('sha256', $qwenPayload['model'] . '|' . $qwenPrompt . '|' . $qwenB64 . '|' . $qwenRatio);
    $qwenCacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($qwenCacheDir)) @mkdir($qwenCacheDir, 0755, true);
    $qwenCacheFile = $qwenCacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $qwenCacheKey . '.json';
    $qwenLockFile = $qwenCacheFile . '.lock';

    if (is_file($qwenCacheFile)) {
        $qwenCached = json_decode((string)@file_get_contents($qwenCacheFile), true);
        if (is_array($qwenCached) && !empty($qwenCached['b64'])) {
            echo json_encode(['success' => true, 'imageUrl' => 'data:image/png;base64,' . $qwenCached['b64'], 'model' => 'qwen-pro', 'modelo' => 'qwen-pro']);
            exit;
        }
    }
    if (is_file($qwenLockFile) && (time() - (int)@filemtime($qwenLockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($qwenLockFile, (string)time());
    register_shutdown_function(static function () use ($qwenLockFile, $qwenCacheFile) {
        // Si la generacion termino sin guardar cache, libera el candado.
        if (is_file($qwenLockFile) && !is_file($qwenCacheFile)) @unlink($qwenLockFile);
    });

    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $qwenCh = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($qwenCh, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $qwenKey,
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $qwenMh = curl_multi_init();
    curl_multi_add_handle($qwenMh, $qwenCh);
    do {
        $qwenMStatus = curl_multi_exec($qwenMh, $qwenActive);
        if ($qwenActive) {
            curl_multi_select($qwenMh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($qwenActive && $qwenMStatus === CURLM_OK);
    $qwenResp = (string)curl_multi_getcontent($qwenCh);
    $qwenCode = (int)curl_getinfo($qwenCh, CURLINFO_HTTP_CODE);
    $qwenErr  = curl_error($qwenCh);
    curl_multi_remove_handle($qwenMh, $qwenCh);
    curl_multi_close($qwenMh);
    curl_close($qwenCh);

    if ($qwenErr) {
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $qwenErr]]);
        exit;
    }
    $qwenJson = json_decode($qwenResp, true);
    if ($qwenCode >= 400) {
        $qwenMsg = is_array($qwenJson) ? ($qwenJson['error']['message'] ?? $qwenJson['error'] ?? ('HTTP ' . $qwenCode)) : ('HTTP ' . $qwenCode);
        if (is_array($qwenMsg)) $qwenMsg = json_encode($qwenMsg);
        echo json_encode(['error' => ['message' => 'OpenRouter Qwen: ' . $qwenMsg]]);
        exit;
    }
    $qwenImage = is_array($qwenJson) ? (string)($qwenJson['data'][0]['b64_json'] ?? '') : '';
    if ($qwenImage === '') {
        echo json_encode(['error' => ['message' => 'Qwen no devolvio imagen.']]);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($qwenCacheFile, json_encode(['b64' => $qwenImage]));
    @unlink($qwenLockFile);
    echo json_encode(['success' => true, 'imageUrl' => 'data:image/png;base64,' . $qwenImage, 'model' => 'qwen-pro', 'modelo' => 'qwen-pro']);
    exit;
}

// ── Detección texto vs imagen — el texto va por xiaomi/mimo-v2.6-pro vía OpenRouter ──
$genCfg = [];
if (isset($req['generationConfig']) && is_array($req['generationConfig'])) { $genCfg = $req['generationConfig']; }
elseif (isset($req['payload']['generationConfig']) && is_array($req['payload']['generationConfig'])) { $genCfg = $req['payload']['generationConfig']; }
$reqModelName = (string)($req['model'] ?? ($req['payload']['model'] ?? ''));
$wantsImageOut = (stripos($reqModelName, 'image') !== false)
    || (isset($genCfg['responseModalities']) && is_array($genCfg['responseModalities'])
        && in_array('IMAGE', array_map('strtoupper', $genCfg['responseModalities']), true));
// La rama simple ('prompt') pide responseModalities IMAGE+TEXT → también es salida IMAGE.
if (!$wantsImageOut && !isset($req['contents']) && !isset($req['payload']) && isset($req['prompt'])) {
    $wantsImageOut = true;
}

// Modelo (el default solo aplica a la ruta de IMAGEN Google directa, intacta)
$model = (string)($req['model'] ?? 'gemini-3.8-flash');
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

// Construir payload — soporte passthrough + formato sencillo
if (isset($req['contents'])) {
    $payload = ['contents' => $req['contents']];
    if (isset($req['generationConfig']) && is_array($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
} elseif (isset($req['payload']) && is_array($req['payload'])) {
    $payload = $req['payload'];
} else {
    $prompt   = (string)($req['prompt'] ?? '');
    $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Control de tamaño de imagen (heredado de dibujo_lineas)
    if ($imageB64 !== '') {
        $imgBinary = base64_decode($imageB64);
        if ($imgBinary === false || strlen($imgBinary) > 2500000) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
            exit;
        }
    }

    $parts = [];
    if ($imageB64 !== '') {
        $parts[] = ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]];
    }
    $parts[] = ['text' => $prompt];

    $payload = [
        'contents' => [['parts' => $parts]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT'],
            'imageConfig' => ['imageSize' => '1K']
        ]
    ];
}

// Llamada a la API — texto/visión por mimo; salida de imagen por Google (intacta)
if (!$wantsImageOut) {
    // Modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (devuelve forma Gemini)
    [$httpcode, $response] = $mimoTextCall($req, $genCfg);
} else {
// Llamada original a Google (salida de imagen) — intacta
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
}

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => $msg]]);
    exit;
}

// Respuesta — passthrough raw Gemini (compatible con frontends existentes)
http_response_code((int)$httpcode);
echo $response;
