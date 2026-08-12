<?php
// ============================================================
// PROXY PHP - Decorador de Estancias
//  · RAMA FLUX (clave F): redecora imagen->imagen (submit+poll async).
//  · RAMA GEMINI 2.5-flash (clave G): visión->texto (descripción + objetos).
//    [Excepción explícita del usuario: FLUX no hace visión->texto.]
// Las claves viven en SetEnv F "bfl_..." y SetEnv G "AIza..." del
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
// (Sin config.php: las claves NUNCA se guardan en un archivo del repo.)
function readKey(string $letter): string {
    $k = getenv($letter) ?: '';
    if (!$k) { $k = getenv('REDIRECT_' . $letter) ?: ''; }
    if (!$k) { $k = $_SERVER[$letter] ?? ''; }
    if (!$k) { $k = $_SERVER['REDIRECT_' . $letter] ?? ''; }
    if (!$k) { $k = $_ENV[$letter] ?? ''; }
    if (!$k) { $k = $_ENV['REDIRECT_' . $letter] ?? ''; }
    return (string)$k;
}

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
//  RAMA GEMINI 2.5-flash (visión->texto): describir / detectar
// ============================================================
if ($action === 'analyze' || $action === 'detect') {
    $apiKey = readKey('G');
    if (!$apiKey) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de Gemini (G) no configurada.']]);
        exit;
    }

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

    $model = 'gemini-2.5-flash';
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

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

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexion con Gemini: ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

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
//  Activa cuando el frontend envía model con "gemini" (3.1FLASH / 3 PRO).
// ============================================================
$reqModel = strtolower((string)($req['model'] ?? ''));
if (strpos($reqModel, 'gemini') !== false) {
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
}

// ============================================================
//  RAMA FLUX (imagen->imagen): redecorar la estancia
// ============================================================
$apiKey = readKey('F');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de FLUX (F) no configurada.']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');
$quality  = (string)($req['quality'] ?? 'pro');

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen de la estancia.']]);
    exit;
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el prompt de decoracion.']]);
    exit;
}

// --- SEGURIDAD: control de tamano de la imagen de entrada ---
$imgBinary = base64_decode($imageB64, true);
if ($imgBinary === false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen en base64 invalida.']]);
    exit;
}
if (strlen($imgBinary) > 2500000) { // ~2.5MB
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (maximo 2.5MB). Reduce la foto e intentalo de nuevo.']]);
    exit;
}

// ===== Dimensiones de salida: respetan el AR de la foto (las calcula el cliente) =====
// CLAMP 4MP OBLIGATORIO: FLUX 2 rechaza (HTTP 422) resoluciones > 4.194.304 px.
$MAX_PIXELS = 4194304; // 4 MP
$width  = (int)($req['width'] ?? 0);
$height = (int)($req['height'] ?? 0);

$roundTo32 = function (int $v): int {
    $r = (int)(round($v / 32.0) * 32);
    return max(32, $r);
};

$useDims = ($width >= 32 && $height >= 32);
if ($useDims) {
    $width  = $roundTo32($width);
    $height = $roundTo32($height);
    $pixels = $width * $height;
    if ($pixels > $MAX_PIXELS) {
        $scale  = sqrt($MAX_PIXELS / $pixels);
        $width  = $roundTo32((int)floor($width * $scale));
        $height = $roundTo32((int)floor($height * $scale));
        while ($width * $height > $MAX_PIXELS) {
            if ($width >= $height) { $width -= 32; } else { $height -= 32; }
        }
        $width  = max(32, $width);
        $height = max(32, $height);
    }
}

// ===== MODELO FLUX: PRO (equilibrado) vs MAX (maxima fidelidad) =====
$endpoint = ($quality === 'max') ? 'flux-2-max' : 'flux-2-pro';

// FLUX espera la imagen de referencia en base64 PURO (sin prefijo data:)
$payload = [
    'prompt'      => $prompt,
    'input_image' => $imageB64,
];
if ($useDims) {
    $payload['width']  = $width;
    $payload['height'] = $height;
}

// ===== 1) ENVIAR TAREA =====
$submitUrl = 'https://api.bfl.ai/v1/' . $endpoint;
$ch = curl_init($submitUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'accept: application/json',
        'x-key: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$submitResp = curl_exec($ch);
$submitCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if (curl_errno($ch)) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexion con FLUX: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}
curl_close($ch);

if ($submitCode >= 400) {
    $eb = json_decode($submitResp, true);
    $em = $eb['detail'] ?? ('HTTP ' . $submitCode);
    if (is_array($em)) $em = json_encode($em);
    http_response_code($submitCode);
    echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
    exit;
}

$submit = json_decode($submitResp, true);
$pollUrl = $submit['polling_url'] ?? '';
if ($pollUrl === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'FLUX no devolvio polling_url.']]);
    exit;
}

// ===== 2) POLLING hasta Ready (max ~90s) =====
$imageUrl = '';
for ($i = 0; $i < 60; $i++) {
    usleep(1500000); // 1.5s
    $ch = curl_init($pollUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $apiKey],
        CURLOPT_TIMEOUT => 20,
    ]);
    $pollResp = curl_exec($ch);
    $pollCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($pollCode !== 200) continue;
    $pr = json_decode($pollResp, true);
    $status = $pr['status'] ?? '';
    if ($status === 'Ready') {
        $imageUrl = $pr['result']['sample'] ?? '';
        break;
    }
    if (in_array($status, ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
        http_response_code(422);
        echo json_encode(['error' => ['message' => 'FLUX rechazo la tarea: ' . $status]]);
        exit;
    }
}

if ($imageUrl === '') {
    http_response_code(504);
    echo json_encode(['error' => ['message' => 'FLUX tardo demasiado. Intentalo de nuevo.']]);
    exit;
}

// ===== 3) Descargar la imagen y devolverla como base64 (contrato {image, mimeType}) =====
$ch = curl_init($imageUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
]);
$imgBin = curl_exec($ch);
$imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
$imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
curl_close($ch);

if (!$imgOk || $imgBin === false || $imgBin === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'No se pudo descargar la imagen de FLUX.']]);
    exit;
}

echo json_encode([
    'image'    => base64_encode($imgBin),
    'mimeType' => $imgType,
    'width'    => $useDims ? $width : null,
    'height'   => $useDims ? $height : null,
]);
