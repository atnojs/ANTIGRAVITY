<?php
declare(strict_types=1);

// Configuración de errores
ini_set('display_errors', '0');
error_reporting(E_ALL);

// CORS Headers - MUY IMPORTANTE
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validación POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Solo POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no habilitado']);
    exit;
}

// API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
$apiKey = '';
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
    echo json_encode(['error' => ['message' => 'API key no configurada.']]);
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

// Input validation
$requestBody = file_get_contents('php://input');
if (!$requestBody) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacío']);
    exit;
}

$requestData = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !isset($requestData['prompt']) || trim($requestData['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt requerido']);
    exit;
}

$prompt = $requestData['prompt'];

// ===== Lista blanca exacta de modelos (lista cerrada) =====
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

// ====================================================================
// ACCIÓN TEXTO (mejorar prompts) — modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter
// ====================================================================
if (($requestData['action'] ?? '') === 'mejorar') {
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R)
    $mimoReq = [
        'contents' => [[
            'parts' => [['text' => $prompt]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT'],
            'temperature' => 0.4,
        ]
    ];
    [$httpcode, $response] = $mimoTextCall($mimoReq, $mimoReq['generationConfig']);
} else {
    $reqModel = strtolower((string)($requestData['model'] ?? 'openai-medium'));
    if (!isset($modelCatalog[$reqModel])) {
        http_response_code(400);
        echo json_encode(['error' => 'Modelo no soportado.']);
        exit;
    }
    $selected = $modelCatalog[$reqModel];

    // ====================================================================
    // BACKEND: OPENAI GPT IMAGE 2.5 (Images API, generación desde texto)
    // ====================================================================
    if ($selected['backend'] === 'openai') {
        if ($openaiKey === '') {
            http_response_code(500);
            echo json_encode(['error' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']);
            exit;
        }
        $oaiPayload = [
            'model'   => $selected['model'],
            'prompt'  => $prompt,
            'quality' => $selected['quality'],
            'size'    => '1024x1024',
        ];
        $ch = curl_init('https://api.openai.com/v1/images/generations');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($oaiPayload),
            CURLOPT_TIMEOUT => 180,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            $error = curl_error($ch);
            curl_close($ch);
            http_response_code(502);
            echo json_encode(['error' => 'Error cURL', 'details' => $error]);
            exit;
        }
        curl_close($ch);
        if ($httpcode >= 400) {
            $errorData = json_decode($response, true);
            $msg = $errorData['error']['message'] ?? 'Error desconocido de OpenAI';
            if (is_array($msg)) $msg = json_encode($msg);
            http_response_code($httpcode);
            echo json_encode(['error' => 'Error OpenAI API', 'details' => $msg]);
            exit;
        }
        $data = json_decode($response, true);
        $imageData = $data['data'][0]['b64_json'] ?? '';
        $mimeOut = 'image/png';
        if ($imageData === '' && !empty($data['data'][0]['url'])) {
            $ch = curl_init((string)$data['data'][0]['url']);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
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
            echo json_encode(['error' => 'OpenAI no devolvió ninguna imagen.']);
            exit;
        }
        echo json_encode(['image' => $imageData, 'mimeType' => $mimeOut]);
        exit;
    }

    // ====================================================================
    // BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API, con keepalive anti-504)
    // Qwen tarda ~100s/imagen y nginx corta a ~55s: se mantiene viva la
    // conexion con pings (curl_multi + espacios + flush) y se cachea el
    // resultado en qwen_cache/ (carpeta de la app: sys_get_temp_dir() NO
    // persiste entre peticiones en Hostinger).
    // ====================================================================
    if ($selected['backend'] === 'qwen') {
        $orKey = '';
        foreach ([getenv('R'), getenv('REDIRECT_R'), $_SERVER['R'] ?? '', $_SERVER['REDIRECT_R'] ?? '', $_ENV['R'] ?? '', $_ENV['REDIRECT_R'] ?? ''] as $v) {
            if (!empty($v)) { $orKey = (string)$v; break; }
        }
        if ($orKey === '') {
            http_response_code(500);
            echo json_encode(['error' => 'Clave OpenRouter (R) no configurada.']);
            exit;
        }

        $imageB64 = ''; $qwenMime = 'image/png';
        $imageIn = (string)($requestData['image'] ?? '');
        if ($imageIn !== '') {
            if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $imageIn, $qm) === 1) {
                $qwenMime = strtolower($qm[1]);
                $imageIn = substr($imageIn, strpos($imageIn, ',') + 1);
            }
            $imageB64 = trim($imageIn);
        }

        // Qwen solo admite un set fijo de proporciones: se elige la mas
        // cercana a la imagen fuente (nunca se finge una proporcion inexistente).
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
            $parts = explode(':', (string)($requestData['aspectRatio'] ?? '1:1'));
            $rw = max(1, (int)($parts[0] ?? 1));
            $rh = max(1, (int)($parts[1] ?? 1));
            $targetRatio = $rw / $rh;
        }
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
        ];
        if ($imageB64 !== '') {
            $qwenPayload['input_references'] = [[
                'type' => 'image_url',
                'image_url' => ['url' => 'data:' . $qwenMime . ';base64,' . $imageB64],
            ]];
        }

        $cacheKey = hash('sha256', $selected['model'] . '|' . $prompt . '|' . $imageB64 . '|' . $qwenRatio);
        $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
        if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
        $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
        $lockFile = $cacheFile . '.lock';

        if (is_file($cacheFile)) {
            $cached = json_decode((string)@file_get_contents($cacheFile), true);
            if (is_array($cached) && !empty($cached['b64'])) {
                echo json_encode(['image' => (string)$cached['b64'], 'mimeType' => 'image/png']);
                exit;
            }
        }
        if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
            // Otra peticion genera esta misma imagen: se espera el cacheo
            // manteniendo viva la conexion con espacios (mismo contrato JSON).
            $deadline = time() + 135;
            while (time() < $deadline) {
                echo str_repeat(' ', 64) . "\n";
                @flush();
                sleep(3);
                clearstatcache(true, $cacheFile);
                if (is_file($cacheFile)) {
                    $cached = json_decode((string)@file_get_contents($cacheFile), true);
                    if (is_array($cached) && !empty($cached['b64'])) {
                        echo json_encode(['image' => (string)$cached['b64'], 'mimeType' => 'image/png']);
                        exit;
                    }
                }
                if (!is_file($lockFile)) break;
            }
            http_response_code(502);
            echo json_encode(['error' => 'Qwen sigue generando la imagen; reintenta en unos segundos.']);
            exit;
        }

        ignore_user_abort(true);
        set_time_limit(180);
        @file_put_contents($lockFile, (string)time());
        register_shutdown_function(static function () use ($lockFile, $cacheFile) {
            // Si la generacion termino sin guardar cache, libera el candado.
            if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
        });

        // Mantener viva la conexion con nginx (corta a ~55s sin trafico): se
        // emiten espacios periodicos que no invalidan el JSON final (el
        // parser tolera espacio en blanco inicial).
        while (ob_get_level() > 0) { @ob_end_flush(); }
        @ob_implicit_flush(true);

        $ch = curl_init('https://openrouter.ai/api/v1/images');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer '.$orKey,
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
            echo json_encode(['error' => 'Error conexion OpenRouter: ' . $err]);
            exit;
        }
        if ($code >= 400) {
            $eb = json_decode($resp, true);
            $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
            if (is_array($em)) $em = json_encode($em);
            http_response_code($code >= 400 && $code < 600 ? $code : 502);
            echo json_encode(['error' => 'OpenRouter: ' . (string)$em]);
            exit;
        }

        $jr = json_decode($resp, true);
        $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
        if ($imageData === '') {
            http_response_code(502);
            echo json_encode(['error' => 'Qwen no devolvio imagen.']);
            exit;
        }
        // Guarda el resultado: los reintentos del frontend lo recogen aunque
        // nginx haya cortado la respuesta original por timeout.
        @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
        @unlink($lockFile);
        echo json_encode(['image' => $imageData, 'mimeType' => 'image/png']);
        exit;
    }

    // ====================================================================
    // BACKEND: GEMINI (Google directo, clave A) — conservado tal cual
    // ====================================================================
    $model = $selected['model'];
    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    $payload = json_encode([
        'contents' => [[
            'parts' => [['text' => $prompt]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.4,
        ]
    ]);
}

// La ruta de texto ('mejorar') ya quedó resuelta arriba por $mimoTextCall
// ($response/$httpcode con forma Gemini); el curl solo se ejecuta en imagen.
if (($requestData['action'] ?? '') !== 'mejorar') {
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        http_response_code(502);
        echo json_encode(['error' => 'Error cURL', 'details' => $error]);
        exit;
    }

    curl_close($ch);
}

// Si la API devuelve error, reenviarlo
if ($httpcode >= 400) {
    $errorData = json_decode($response, true);
    $msg = $errorData['error']['message'] ?? 'Error desconocido de Gemini';
    http_response_code($httpcode);
    echo json_encode(['error' => 'Error Gemini API', 'details' => $msg]);
    exit;
}

// Verificar respuesta válida
$data = json_decode($response, true);
if (!$data || !isset($data['candidates'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Respuesta inválida', 'details' => substr($response, 0, 200)]);
    exit;
}

http_response_code($httpcode);
echo $response;
?>
