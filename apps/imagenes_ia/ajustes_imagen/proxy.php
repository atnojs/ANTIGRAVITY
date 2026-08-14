<?php
// ============================================================
// PROXY PHP — Edición de imágenes con FLUX (Black Forest Labs)
// Bloque "IA FLUX — 10 Herramientas" de la app ajustes_imagen.
// Migrado de Gemini a FLUX (BFL). Edición imagen→imagen con flux-2-pro.
// Clave FLUX en variable de entorno 'F' del .htaccess raíz (SetEnv F "bfl_...").
// BFL es ASÍNCRONO: este proxy hace submit + polling del lado servidor.
// Contrato con el frontend: recibe {image (base64), mimeType, prompt}
//                           responde {image (base64), mimeType}
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
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

// ===== CLAVE FLUX (variable 'F'): cascade config.php → env → REDIRECT_ → $_SERVER → $_ENV =====
// (Mismo patrón que 'A' para Gemini. La clave va en SetEnv F "bfl_..." del .htaccess raíz.)
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('F') ? F : '';
}
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['REDIRECT_F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['REDIRECT_F'] ?? ''; }

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de FLUX (F) no configurada.']]);
    exit;
}

$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');
$quality  = (string)($req['quality'] ?? 'pro'); // 'pro' o 'max', elegido por el usuario
$reqModel = strtolower((string)($req['model'] ?? ''));
if ($reqModel === '') { $reqModel = ($quality === 'max') ? 'flux-max' : 'flux-pro'; }
$reqH     = (int)($req['height'] ?? 0);          // alto pedido (px), 0 = por defecto

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen a editar']]);
    exit;
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la instrucción de edición']]);
    exit;
}

// La imagen puede llegar como data URL o base64 puro; FLUX espera base64 PURO (sin prefijo data:)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// --- SEGURIDAD: control de tamaño (~2.5MB) ---
$imgBinary = base64_decode($imageB64, true);
if ($imgBinary === false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen base64 inválida']]);
    exit;
}
if (strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

// ===== SELECCION MODELO (skill_maestra: 3.1FLASH / 3 PRO / FLUX PRO / FLUX MAX) =====
$backend = 'flux';
$geminiModelId = 'google/gemini-3.1-flash-image';
$fluxEndpoint = 'flux-2-pro';
if (strpos($reqModel, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif ((strpos($reqModel, 'pro') !== false && strpos($reqModel, 'gemini') !== false) || $reqModel === 'google/gemini-3-pro-image' || $reqModel === 'gemini-pro') {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3-pro-image';
} elseif (strpos($reqModel, 'flash') !== false || $reqModel === 'google/gemini-3.1-flash-image' || $reqModel === 'gemini-flash') {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3.1-flash-image';
}
$endpoint = $fluxEndpoint;
$endpoint = ($quality === 'max') ? 'flux-2-max' : 'flux-2-pro';

// ===== DIMENSIONES pedidas, con CLAMP al límite de FLUX 2 (4 MP = 4.194.304 px) =====
// FLUX 2 (pro/max) rechaza (HTTP 422) resoluciones > 4MP. Si el usuario pide más
// (p.ej. 4096x4096 = 16MP), reducimos manteniendo el aspect ratio al máximo nativo
// soportado; el escalado a la resolución final la hace el cliente (upscale canvas).
$MAX_PIXELS = 4194304; // 4 MP
$payload = [
    'prompt'      => $prompt,
    'input_image' => $imageB64,
];
if ($reqW > 0 && $reqH > 0) {
    $reqW = max(256, min($reqW, 4096));
    $reqH = max(256, min($reqH, 4096));
    $pixels = $reqW * $reqH;
    if ($pixels > $MAX_PIXELS) {
        $scale = sqrt($MAX_PIXELS / $pixels);
        $reqW = (int)floor(($reqW * $scale) / 32) * 32; // múltiplos de 32 (requisito FLUX)
        $reqH = (int)floor(($reqH * $scale) / 32) * 32;
    }
    $payload['width']  = $reqW;
    $payload['height'] = $reqH;
}



// ===== RAMA GEMINI (OpenRouter chat/completions, usa la imagen de referencia) =====
if ($backend === 'gemini') {
    // Clave OpenRouter (R): cascade config.php / env / server
    $orKey = '';
    if (file_exists(__DIR__ . '/config.php')) {
        include __DIR__ . '/config.php';
        if (defined('R') && constant('R') !== '') { $orKey = (string)constant('R'); }
    }
    if ($orKey === '') { $orKey = (string)getenv('R'); }
    if ($orKey === '') { $orKey = (string)getenv('REDIRECT_R'); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada.']]);
        exit;
    }
    $content = [['type' => 'text', 'text' => $prompt]];
    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]];
    $gPayload = [
        'model' => $geminiModelId,
        'modalities' => ['image', 'text'],
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $orKey, 'Content-Type: application/json', 'accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($gPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error OpenRouter: ' . $err]]);
        exit;
    }
    $jr = json_decode($resp, true);
    if ($code >= 400 || !is_array($jr)) {
        $message = $jr['error']['message'] ?? ($jr['error'] ?? ('HTTP ' . $code));
        if (is_array($message)) { $message = json_encode($message); }
        http_response_code($code >= 400 ? $code : 502);
        echo json_encode(['error' => ['message' => 'Gemini: ' . $message]]);
        exit;
    }
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
    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
    $gMime = 'image/png';
    if (strpos($imgDataUrl, 'data:image/jpeg') === 0) { $gMime = 'image/jpeg'; }
    elseif (strpos($imgDataUrl, 'data:image/webp') === 0) { $gMime = 'image/webp'; }
    echo json_encode([
        'image' => $imgB64,
        'mimeType' => $gMime,
        'width' => $reqW ?: null,
        'height' => $reqH ?: null,
        'model' => $geminiModelId,
    ]);
    exit;
}

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
    echo json_encode(['error' => ['message' => 'Error de conexión con FLUX: ' . curl_error($ch)]]);
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
    echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url']]);
    exit;
}

// ===== 2) POLLING hasta Ready (máx ~90s) =====
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
        echo json_encode(['error' => ['message' => 'FLUX rechazó la tarea: ' . $status]]);
        exit;
    }
}

if ($imageUrl === '') {
    http_response_code(504);
    echo json_encode(['error' => ['message' => 'FLUX tardó demasiado. Inténtalo de nuevo.']]);
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
    'width'    => $payload['width'] ?? null,
    'height'   => $payload['height'] ?? null,
]);
