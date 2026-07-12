<?php
// ============================================================
// PROXY PHP - Generador de Imágenes con FLUX (Black Forest Labs)
// Aplica el estilo de un prompt a la imagen base subida (image-to-image).
// Clave FLUX en variable de entorno 'F' del .htaccess raíz de Hostinger.
// BFL es ASÍNCRONO: este proxy hace submit + polling del lado servidor
// y devuelve la imagen ya descargada como data URL (frontend síncrono).
// ============================================================
header('Content-Type: application/json; charset=utf-8');

// ===== CLAVE FLUX (variable 'F'): cascade entorno (.htaccess raíz) =====
$apiKey = '';
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['REDIRECT_F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['F'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['REDIRECT_F'] ?? ''; }

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de FLUX (F) no configurada en el servidor.']]);
    exit;
}

// ===== Método =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Método no permitido. Usa POST.']]);
    exit;
}

// ===== Entrada =====
$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Body vacío.']]);
    exit;
}
$req = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

$prompt   = trim((string)($req['prompt'] ?? ''));
$imageB64 = (string)($req['image'] ?? '');   // base64 PURO (sin prefijo data:)
$quality  = (string)($req['quality'] ?? 'pro');

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt".']]);
    exit;
}

// La imagen base es opcional (permite texto→imagen), pero si viene la validamos.
$hasImage = ($imageB64 !== '');
if ($hasImage) {
    // Aceptar tanto data URL como base64 puro; normalizar a base64 puro.
    if (strpos($imageB64, 'base64,') !== false) {
        $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
    }
    $imgBinary = base64_decode($imageB64, true);
    if ($imgBinary === false) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen base64 inválida.']]);
        exit;
    }
    if (strlen($imgBinary) > 4000000) { // ~4MB
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 4MB).']]);
        exit;
    }
}

// ===== MODELO FLUX: selector PRO / MAX =====
$endpoint = ($quality === 'max') ? 'flux-2-max' : 'flux-2-pro';

// ===== Dimensiones con CLAMP 4MP (FLUX 2 rechaza >4.194.304 px con HTTP 422) =====
$width  = (int)($req['width']  ?? 1024);
$height = (int)($req['height'] ?? 1024);
if ($width  < 256) { $width  = 1024; }
if ($height < 256) { $height = 1024; }
$MAXPX = 4194304;
if ($width * $height > $MAXPX) {
    $scale  = sqrt($MAXPX / ($width * $height));
    $width  = (int)floor(($width  * $scale) / 32) * 32;
    $height = (int)floor(($height * $scale) / 32) * 32;
}
// Redondear a múltiplos de 32 (requisito FLUX)
$width  = max(256, (int)round($width  / 32) * 32);
$height = max(256, (int)round($height / 32) * 32);

// ===== Payload a BFL =====
$payload = [
    'prompt' => $prompt,
    'width'  => $width,
    'height' => $height,
];
if ($hasImage) {
    // FLUX espera la imagen de referencia en base64 PURO (sin prefijo data:)
    $payload['input_image'] = $imageB64;
}

// ===== 1) ENVIAR TAREA (submit) =====
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
    if (is_array($em)) { $em = json_encode($em); }
    http_response_code($submitCode);
    echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
    exit;
}

$submit  = json_decode($submitResp, true);
$pollUrl = $submit['polling_url'] ?? '';
$cost    = (float)($submit['cost'] ?? 0);
if ($pollUrl === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url.']]);
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

    if ($pollCode !== 200) { continue; }
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

// ===== 3) Descargar la imagen (result.sample caduca) y devolverla como data URL =====
$ch = curl_init($imageUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_FOLLOWLOCATION => true,
]);
$imgBin  = curl_exec($ch);
$imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
$imgOk   = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
curl_close($ch);

if (!$imgOk || $imgBin === false || $imgBin === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'No se pudo descargar la imagen de FLUX.']]);
    exit;
}

$dataUrl = 'data:' . $imgType . ';base64,' . base64_encode($imgBin);

echo json_encode([
    'success'  => true,
    'imageUrl' => $dataUrl,
    'coste'    => round($cost * 0.01, 4), // créditos → USD
    'modelo'   => $endpoint,
    'calidad'  => $quality,
    'width'    => $width,
    'height'   => $height,
]);
