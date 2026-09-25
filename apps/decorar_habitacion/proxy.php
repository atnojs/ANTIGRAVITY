<?php
// ============================================================
// PROXY PHP - Decorador de Estancias
//  · RAMA GEMINI (clave R / OpenRouter): redecora imagen->imagen.
//  · RAMA TEXTO/VISIÓN: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R).
// Las claves viven en SetEnv G (Gemini) y SetEnv R (OpenRouter) del
// .htaccess RAÍZ de Hostinger. NUNCA van en git.
//
// Contrato con el frontend (según 'action'):
//   redecorar : { image, mimeType?, prompt, quality:"pro"|"max", width?, height? }
//               -> { image:<base64>, mimeType, width, height }
//   analyze   : { action:"analyze", image, mimeType? }  -> { text }
//   detect    : { action:"detect",  image, mimeType? }  -> { objects:[...], text }
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

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

// Cascade de clave por letra: env -> REDIRECT_ -> $_SERVER -> $_ENV.
// La fuente real es SetEnv <letra> "..." del .htaccess RAÍZ de Hostinger.
// (Sin .htaccess raiz: las claves NUNCA se guardan en un archivo del repo.)
function readKey(string $letter): string {
    $k = getenv($letter) ?: '';
    if (!$k) { $k = getenv('REDIRECT_' . $letter) ?: ''; }
    if (!$k) { $k = $_SERVER[$letter] ?? ''; }
    if (!$k) { $k = $_SERVER['REDIRECT_' . $letter] ?? ''; }
    if (!$k) { $k = $_ENV[$letter] ?? ''; }
    if (!$k) { $k = $_ENV['REDIRECT_' . $letter] ?? ''; }
    return (string)$k;
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

// ===== Entrada =====
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio.']]);
    exit;
}
$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido.']]);
    exit;
}

$action = (string)($req['action'] ?? '');

// ============================================================
//  RAMA QWEN IMAGE 3 PRO (OpenRouter Image API) — keepalive + caché
// ============================================================
// Qwen tarda ~100s/imagen y nginx corta a ~55s: un worker genera y guarda
// el resultado (ignore_user_abort) en qwen_cache/ (carpeta de la app:
// sys_get_temp_dir() NO persiste entre peticiones en Hostinger) y los
// reintentos del frontend recogen el caché o esperan con 'processing'.
if (!in_array($action, ['analyze', 'detect', 'crop'], true) && strtolower((string)($req['model'] ?? '')) === 'qwen-pro') {
    $orKeyQ = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $orKeyQ = (string)R; }
    if ($orKeyQ === '') { $orKeyQ = readKey('R'); }
    if ($orKeyQ === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada en el servidor.']]);
        exit;
    }

    $imageB64 = (string)($req['image'] ?? '');
    if (strpos($imageB64, 'base64,') !== false) {
        $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
    }
    if ($imageB64 === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta la imagen.']]);
        exit;
    }
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
    $prompt   = (string)($req['prompt'] ?? '');

    // Qwen solo admite un set fijo de proporciones: se elige la más cercana
    // a la imagen fuente (nunca se finge una proporción inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $srcW = (int)($req['width'] ?? 0);
    $srcH = (int)($req['height'] ?? 0);
    if ($srcW <= 0 || $srcH <= 0) {
        $info = @getimagesizefromstring((string)base64_decode($imageB64));
        $srcW = (int)($info[0] ?? 0);
        $srcH = (int)($info[1] ?? 0);
    }
    $targetRatio = ($srcW > 0 && $srcH > 0) ? $srcW / $srcH : 1.0;
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $qwenPayload = [
        'model'         => 'qwen/qwen-image-3-pro',
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

    $cacheKey = hash('sha256', 'qwen-pro|' . $prompt . '|' . $imageB64 . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            $info = @getimagesizefromstring((string)base64_decode((string)$cached['b64']));
            echo json_encode([
                'image'    => $cached['b64'],
                'mimeType' => 'image/png',
                'width'    => (int)($info[0] ?? 0),
                'height'   => (int)($info[1] ?? 0),
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

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): la
    // generación puede tardar más; se emiten espacios periódicos que no
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
            'Authorization: Bearer ' . $orKeyQ,
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
    $respQ = (string)curl_multi_getcontent($ch);
    $codeQ = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errQ  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($errQ) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $errQ]]);
        exit;
    }
    $dataQ = json_decode($respQ, true);
    if ($codeQ >= 400 || isset($dataQ['error'])) {
        $msg = $dataQ['error']['message'] ?? $dataQ['error'] ?? ('HTTP ' . $codeQ);
        if (is_array($msg)) $msg = json_encode($msg);
        http_response_code($codeQ >= 400 ? $codeQ : 502);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $msg]]);
        exit;
    }
    $imageData = $dataQ['data'][0]['b64_json'] ?? '';
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvió ninguna imagen.']]);
        exit;
    }
    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    $info = @getimagesizefromstring((string)base64_decode($imageData));
    echo json_encode([
        'image'    => $imageData,
        'mimeType' => 'image/png',
        'width'    => (int)($info[0] ?? 0),
        'height'   => (int)($info[1] ?? 0),
    ]);
    exit;
}

if (!in_array($action, ['analyze', 'detect', 'crop'], true)) {
    ag_image_response($req, __DIR__);
}

// ============================================================
//  RAMA TEXTO/VISIÓN: describir / detectar (xiaomi/mimo-v2.6-pro)
// ============================================================
if ($action === 'analyze' || $action === 'detect') {
    // Texto/visión: modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R).

    $imageB64 = (string)($req['image'] ?? '');
    if ($imageB64 === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta la imagen.']]);
        exit;
    }
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

    $bin = base64_decode($imageB64, true);
    if ($bin === false || strlen($bin) > 2500000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen invalida o demasiado grande (maximo 2.5MB).']]);
        exit;
    }

    if ($action === 'analyze') {
        $instr = "Describe con precisión esta estancia en 2-3 frases: materiales dominantes, iluminación, distribución, elementos singulares y sensación general. Responde en español neutro, sin listas ni encabezados.";
        $temp = 0.4;
        $maxTok = 256;
    } else {
        // Detección de objetos CON bounding box (para poder recortar cada objeto).
        // Gemini 2.5 devuelve box_2d como [ymin, xmin, ymax, xmax] normalizado 0-1000.
        $instr = "Detecta de 8 a 15 objetos de mobiliario y decoración visibles en esta imagen (sofá, lámpara, mesa, alfombra, cuadro, planta, etc.). "
            . "Para CADA objeto devuelve su nombre corto en español y su bounding box. "
            . "Responde EXCLUSIVAMENTE con un array JSON válido, sin texto adicional ni ```. "
            . "Formato exacto: [{\"label\":\"lámpara\",\"box_2d\":[ymin,xmin,ymax,xmax]}, ...] "
            . "donde box_2d son enteros normalizados de 0 a 1000 (ymin,xmin esquina superior-izquierda; ymax,xmax inferior-derecha).";
        $temp = 0.2;
        $maxTok = 1024;
    }

    // El modelo de texto lo fuerza $mimoTextCall (xiaomi/mimo-v2.6-pro).

    $genCfg = [
        'temperature' => $temp,
        'topK' => 40,
        'topP' => 0.9,
        'maxOutputTokens' => $maxTok,
    ];
    // En detect forzamos salida JSON para parsear los bounding box de forma fiable.
    if ($action === 'detect') {
        $genCfg['responseMimeType'] = 'application/json';
    }

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['text' => $instr],
                ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]],
            ],
        ]],
        'generationConfig' => $genCfg,
    ];

    // Llamada texto/visión → modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter.
    [$code, $resp] = $mimoTextCall($payload, $genCfg);

    $data = json_decode($resp, true);
    if ($code >= 400 || isset($data['error'])) {
        $msg = $data['error']['message'] ?? ('Error HTTP ' . $code);
        http_response_code($code ?: 500);
        echo json_encode(['error' => ['message' => 'Gemini: ' . $msg]]);
        exit;
    }

    $text = '';
    $parts = $data['candidates'][0]['content']['parts'] ?? [];
    foreach ($parts as $p) {
        if (isset($p['text'])) { $text .= $p['text']; }
    }
    $text = trim($text);

    if ($action === 'analyze') {
        echo json_encode(['text' => $text]);
    } else {
        // Parsear el array JSON de objetos con bounding box.
        // Devolvemos { objects:[{label, box_2d:[ymin,xmin,ymax,xmax]}], names:[...] }.
        $objects = [];
        $names = [];
        $clean = trim($text);
        // Quitar fences ```json ... ``` por si el modelo los añade
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
        $parsed = json_decode($clean, true);
        if (is_array($parsed)) {
            foreach ($parsed as $o) {
                if (!is_array($o)) continue;
                $label = trim((string)($o['label'] ?? $o['name'] ?? ''));
                $box = $o['box_2d'] ?? $o['box'] ?? null;
                if ($label === '') continue;
                $item = ['label' => $label];
                if (is_array($box) && count($box) === 4) {
                    $item['box_2d'] = [
                        (int)$box[0], (int)$box[1], (int)$box[2], (int)$box[3]
                    ];
                }
                $objects[] = $item;
                $names[] = $label;
            }
        }
        $objects = array_slice($objects, 0, 15);
        $names = array_slice($names, 0, 15);
        echo json_encode(['objects' => $objects, 'names' => $names]);
    }
    exit;
}

// ============================================================
//  RAMA CROP: guarda un recorte (data URL) y devuelve su URL pública.
//  Sirve para "buscar por imagen" SOLO el objeto recortado (Google Lens
//  necesita una URL pública accesible, no un data URL).
// ============================================================
if ($action === 'crop') {
    $imageData = (string)($req['image'] ?? '');
    if ($imageData === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta la imagen del recorte.']]);
        exit;
    }
    // Extraer base64 + extensión del data URL
    if (!preg_match('#^data:image/([a-zA-Z0-9]+);base64,(.+)$#', $imageData, $m)) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Formato de recorte no valido (data URL esperado).']]);
        exit;
    }
    $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
    $bin = base64_decode($m[2], true);
    if ($bin === false || strlen($bin) > 4000000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Recorte invalido o demasiado grande.']]);
        exit;
    }
    // Carpeta de recortes (efímera; se puede limpiar). Se crea si no existe.
    $cropDir = __DIR__ . '/crops';
    if (!is_dir($cropDir)) { @mkdir($cropDir, 0755, true); }
    // Nombre único; limpiamos recortes viejos (>1h) para no acumular.
    foreach (glob($cropDir . '/*') as $old) {
        if (is_file($old) && (time() - filemtime($old)) > 3600) { @unlink($old); }
    }
    $name = 'crop_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $path = $cropDir . '/' . $name;
    if (file_put_contents($path, $bin, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'No se pudo guardar el recorte.']]);
        exit;
    }
    // URL pública absoluta (para Google Lens)
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    $publicUrl = $scheme . '://' . $host . $dir . '/crops/' . $name;
    echo json_encode(['url' => $publicUrl, 'file' => $name]);
    exit;
}

// ============================================================
//  RAMA GEMINI IMAGEN (clave R / OpenRouter): redecora imagen->imagen
//  Unico backend de imagenes (gemini-flash por defecto).
// ============================================================
$reqModel = strtolower((string)($req['model'] ?? ''));

if (preg_match('#f'.'lux#i', $reqModel)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
    $orKey = readKey('R');
    if (!$orKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }
    $imageB64 = (string)($req['image'] ?? '');
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
    $prompt   = (string)($req['prompt'] ?? '');
    if ($imageB64 === '' || $prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Faltan imagen o prompt.']]);
        exit;
    }
    $imgBinary = base64_decode($imageB64, true);
    if ($imgBinary === false) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen en base64 invalida.']]);
        exit;
    }
    if (strlen($imgBinary) > 2500000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (maximo 2.5MB). Reduce la foto e intentalo de nuevo.']]);
        exit;
    }

    $geminiModel = (strpos($reqModel, 'flash') !== false) ? 'google/gemini-3.1-flash-image' : 'google/gemini-3-pro-image';

    $content = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]],
    ];
    $payload = [
        'model' => $geminiModel,
        'modalities' => ['image', 'text'],
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'accept: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
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
    $images = $jr['choices'][0]['message']['images'] ?? [];
    if (empty($images)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini no devolvio imagen.']]);
        exit;
    }
    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini devolvio URL en lugar de imagen.']]);
        exit;
    }
    $outB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
    $outBin = base64_decode($outB64, true);
    $outMime = 'image/png';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);#i', $imgDataUrl, $m) === 1) $outMime = $m[1];

    echo json_encode([
        'image'    => base64_encode($outBin !== false ? $outBin : ''),
        'mimeType' => $outMime,
        'width'    => (int)($req['width'] ?? 0),
        'height'   => (int)($req['height'] ?? 0),
        'provider' => 'gemini',
        'model'    => $geminiModel,
    ]);
    exit;

