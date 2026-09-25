<?php
header('Content-Type: application/json');

// ===== API KEY: .htaccess raiz + cascade (patrón dibujo_lineas) =====
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Method not allowed']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    } else {
        header('Access-Control-Allow-Headers: Content-Type, Authorization, x-goog-api-key, x-goog-api-client');
    }
    http_response_code(204);
    exit;
}

// Extract path, e.g., /v1alpha/models/...
$pathInfo = $_GET['path'] ?? '/';

// The new SDK uses either v1beta or v1alpha
$apiUrl = "https://generativelanguage.googleapis.com" . $pathInfo . "?key=" . $API_KEY;

$requestBody = file_get_contents('php://input');

// ===== Migración OpenAI 2.5 (2026-09-13): interceptar openai-*, rechazar modelos legacy =====
$openaiCatalog = [
    'openai-medium'       => ['model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
    'openai-high'         => ['model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
    'openai-xhigh'        => ['model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
    'openai-max-sunburst' => ['model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
];
if (preg_match('#f'.'lux#i', $pathInfo) === 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Modelo no soportado.']);
    exit;
}
if (preg_match('#models/(openai-[a-z-]+):generateContent#i', $pathInfo, $m) === 1) {
    $reqModel = strtolower($m[1]);
    if (!isset($openaiCatalog[$reqModel])) {
        http_response_code(400);
        echo json_encode(['error' => 'Modelo no soportado.']);
        exit;
    }
    // Clave OpenAI: SOLO entorno
    $openaiKey = '';
    foreach ([getenv('OPENAI_API_KEY'), getenv('REDIRECT_OPENAI_API_KEY'), $_SERVER['OPENAI_API_KEY'] ?? '', $_SERVER['REDIRECT_OPENAI_API_KEY'] ?? '', $_ENV['OPENAI_API_KEY'] ?? '', $_ENV['REDIRECT_OPENAI_API_KEY'] ?? ''] as $v) {
        if (!empty($v)) { $openaiKey = (string)$v; break; }
    }
    if ($openaiKey === '') {
        foreach ([getenv('O'), getenv('REDIRECT_O'), $_SERVER['O'] ?? '', $_SERVER['REDIRECT_O'] ?? '', $_ENV['O'] ?? '', $_ENV['REDIRECT_O'] ?? ''] as $v) {
            if (!empty($v)) { $openaiKey = (string)$v; break; }
        }
    }
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']);
        exit;
    }
    $body = json_decode($requestBody ?: '[]', true);
    if (!is_array($body)) $body = [];
    $prompt = '';
    $imageB64 = '';
    $mime = 'image/jpeg';
    foreach (($body['contents']['parts'] ?? []) as $part) {
        if (!empty($part['text']) && $prompt === '') $prompt = (string)$part['text'];
        if (!empty($part['inlineData']['data'])) {
            $imageB64 = (string)$part['inlineData']['data'];
            $mime = (string)($part['inlineData']['mimeType'] ?? 'image/jpeg');
        }
    }
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el prompt.']);
        exit;
    }
    $ar = (string)($body['config']['imageConfig']['aspectRatio'] ?? '1:1');
    $ratios = ['1:1' => [1, 1], '3:4' => [3, 4], '4:3' => [4, 3], '9:16' => [9, 16], '16:9' => [16, 9]];
    [$rw, $rh] = $ratios[$ar] ?? [1, 1];
    $width = $rw >= $rh ? 1024 : max(16, (int)(round(1024 * $rw / $rh / 16) * 16));
    $height = $rw >= $rh ? max(16, (int)(round(1024 * $rh / $rw / 16) * 16)) : 1024;
    while ($width * $height < 1048576) { $width += 16; }
    $fields = ['model' => $openaiCatalog[$reqModel]['model'], 'prompt' => $prompt, 'quality' => $openaiCatalog[$reqModel]['quality'], 'size' => $width . 'x' . $height];
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $headers = ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields);
    $tmp = null;
    if ($imageB64 !== '') {
        $binary = base64_decode($imageB64, true);
        if ($binary === false || $binary === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Imagen de referencia no válida.']);
            exit;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmp === false || file_put_contents($tmp, $binary) === false) {
            if ($tmp !== false) @unlink($tmp);
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo preparar la imagen para OpenAI.']);
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
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlerr = curl_error($ch);
    curl_close($ch);
    if ($tmp !== null) @unlink($tmp);
    if ($curlerr) {
        http_response_code(502);
        echo json_encode(['error' => 'Error de conexión con OpenAI: ' . $curlerr]);
        exit;
    }
    $data = json_decode($response, true);
    if ($httpcode >= 400 || isset($data['error'])) {
        $msg = $data['error']['message'] ?? ('HTTP ' . $httpcode);
        if (is_array($msg)) $msg = json_encode($msg);
        http_response_code($httpcode >= 400 ? $httpcode : 502);
        echo json_encode(['error' => 'OpenAI: ' . $msg]);
        exit;
    }
    $b64 = (string)($data['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';
    if ($b64 === '' && !empty($data['data'][0]['url'])) {
        $ch = curl_init((string)$data['data'][0]['url']);
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
        echo json_encode(['error' => 'OpenAI no devolvió ninguna imagen.']);
        exit;
    }
    // Respuesta con forma Gemini generateContent para que el frontend la entienda igual
    echo json_encode([
        'candidates' => [[
            'content' => [
                'parts' => [[
                    'inlineData' => ['mimeType' => $mimeOut, 'data' => $b64],
                ]],
            ],
        ]],
    ]);
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

// ── Detectar si el modelo pedido es de imagen o de texto/visión (kit §2) ──
$req = json_decode((string)($requestBody ?: '[]'), true);
if (!is_array($req)) { $req = []; }
// Si contents viene como objeto único (no lista), normalizarlo a lista para el helper
if (isset($req['contents']['parts'])) { $req['contents'] = [$req['contents']]; }
$genCfg = [];
if (isset($req['generationConfig']) && is_array($req['generationConfig'])) { $genCfg = $req['generationConfig']; }
elseif (isset($req['payload']['generationConfig']) && is_array($req['payload']['generationConfig'])) { $genCfg = $req['payload']['generationConfig']; }
$reqModelName = (string)($req['model'] ?? ($req['payload']['model'] ?? ''));
if ($reqModelName === '' && preg_match('#/models/([^:/]+)#', $pathInfo, $mTxt)) {
    // En este proxy el modelo viaja en la ruta: /v1beta/models/<modelo>:generateContent
    $reqModelName = $mTxt[1];
}
$wantsImageOut = (stripos($reqModelName, 'image') !== false)
    || (isset($genCfg['responseModalities']) && is_array($genCfg['responseModalities'])
        && in_array('IMAGE', array_map('strtoupper', $genCfg['responseModalities']), true));

if (!$wantsImageOut) {
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (respuesta con forma Gemini)
    [$httpcode, $response] = $mimoTextCall($req, $genCfg);
} else {
    // Modelo de imagen: passthrough a Google, intacto
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($requestBody)
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

// Set CORS if needed
header('Access-Control-Allow-Origin: *');
http_response_code($httpcode);
echo $response;
?>
