<?php
// ============================================================
// PROXY PHP — Edicion de imagenes con Gemini 3 Pro (OpenRouter)
// Bloque "IA GEMINI — 10 Herramientas" de la app ajustes_imagen.
// Migrado de FLUX a Gemini via OpenRouter. Imagen→imagen.
// Clave OpenRouter en variable 'R' del .htaccess raiz (SetEnv R "sk-or-...").
// SINCRONO: llamada unica, sin polling.
// Contrato: recibe {image (base64), mimeType, prompt, quality?, width?, height?}
//           responde {image (base64), mimeType}
// ============================================================
header('Content-Type: application/json');

// ===== CLAVE OpenRouter (variable 'R'): cascade .htaccess / entorno =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('R') ? R : '';
}
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('R'); }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_R'); }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['REDIRECT_R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['REDIRECT_R'] ?? ''; }

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada en .htaccess raiz.']]);
    exit;
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
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');
// Campos aceptados por compatibilidad (Gemini no los usa, pero el frontend los manda)
// $quality, $reqW, $reqH — ignorados, Gemini decide resolucion

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen a editar']]);
    exit;
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la instruccion de edicion']]);
    exit;
}

// Asegurar base64 puro (quitar prefijo data: si viene)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// ===== GEMINI 3 PRO via OpenRouter (sincrono, sin polling) =====
$model = 'google/gemini-3-pro-image';

$content = [
    ['type' => 'text', 'text' => $prompt],
    ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]],
];

$payload = [
    'model'      => $model,
    'modalities' => ['image', 'text'],
    'messages'   => [['role' => 'user', 'content' => $content]],
    'max_tokens' => 8000,
];

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if (curl_errno($ch)) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexion con OpenRouter: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}
curl_close($ch);

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
    echo json_encode(['error' => ['message' => 'Gemini devolvio URL en lugar de imagen base64.']]);
    exit;
}

$imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
$imgBin = base64_decode($imgB64);
$imgType = 'image/png';

echo json_encode([
    'image'    => base64_encode($imgBin),
    'mimeType' => $imgType,
]);
