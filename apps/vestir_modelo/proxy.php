<?php
// ============================================================
// PROXY PHP - Vestir Modelo con FLUX (Black Forest Labs)
// Oculta la clave BFL del frontend. Submit + polling del lado servidor.
// Clave FLUX en variable de entorno 'F' del .htaccess raíz.
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// ===== CLAVE FLUX (variable 'F'): cascada .htaccess raíz / entorno =====
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

// ===== LEER BODY =====
$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}

$req = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

$prompt = (string)($req['prompt'] ?? '');
$imageB64 = (string)($req['image'] ?? ''); // modelo (data URL o base64 puro)

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
    exit;
}

// ===== MODELO FLUX según calidad (PRO vs MAX) =====
$quality = (string)($req['quality'] ?? 'pro');
$endpoint = ($quality === 'max') ? 'flux-2-max' : 'flux-2-pro';

// ===== DIMENSIONES (máximo 4MP) =====
$width  = (int)($req['width']  ?? 1024);
$height = (int)($req['height'] ?? 1024);

// Validar y clamp a múltiplos de 32
$width  = max(256, min(2048, $width));
$height = max(256, min(2048, $height));
$width  = (int)(round($width  / 32) * 32);
$height = (int)(round($height / 32) * 32);

// Clamp 4MP (4,194,304 px): FLUX 2 rechaza >4MP con HTTP 422
$pixels = $width * $height;
if ($pixels > 4194304) {
    $scale = sqrt(4194304.0 / $pixels);
    $width  = (int)(round(($width  * $scale) / 32) * 32);
    $height = (int)(round(($height * $scale) / 32) * 32);
}

// ===== CONSTRUIR PAYLOAD =====
$payload = [
    'prompt' => $prompt,
    'width'  => $width,
    'height' => $height,
];

// Imagen de entrada: modelo (base64 puro, sin prefijo data:)
if ($imageB64 !== '') {
    $b64 = $imageB64;
    // Quitar prefijo data URL si viene con él
    if (strpos($b64, ',') !== false) {
        $b64 = substr($b64, strpos($b64, ',') + 1);
    }
    // Control de tamaño
    $imgBinary = base64_decode($b64);
    if ($imgBinary === false || strlen($imgBinary) > 2500000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
        exit;
    }
    $payload['input_image'] = $b64;
}

// ===== 1) ENVIAR TAREA A FLUX =====
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
    CURLOPT_SSL_VERIFYPEER => true,
]);
$submitResp = curl_exec($ch);
$submitCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$submitErr  = curl_error($ch);
curl_close($ch);

if ($submitErr) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con FLUX: ' . $submitErr]]);
    exit;
}
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
$costCreditos = (float)($submit['cost'] ?? 0);
$cost = $costCreditos * 0.01; // 1 crédito BFL = $0.01 USD

if ($pollUrl === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url']]);
    exit;
}

// ===== 2) POLLING hasta Ready (máx ~90s) =====
$imageUrl = '';
$maxIntentos = 60;
for ($i = 0; $i < $maxIntentos; $i++) {
    usleep(1500000); // 1.5s
    $ch = curl_init($pollUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $apiKey],
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
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

// ===== 3) DESCARGAR IMAGEN Y DEVOLVER COMO DATA URL =====
$ch = curl_init($imageUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$imgBin = curl_exec($ch);
$imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
$imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
curl_close($ch);

if (!$imgOk || $imgBin === false || $imgBin === '') {
    // Fallback: devolver la URL directa
    echo json_encode([
        'success'  => true,
        'imageUrl' => $imageUrl,
        'coste'    => $cost,
        'modelo'   => $endpoint,
        'calidad'  => $quality,
    ]);
    exit;
}

$dataUrl = 'data:' . $imgType . ';base64,' . base64_encode($imgBin);

echo json_encode([
    'success'  => true,
    'imageUrl' => $dataUrl,
    'coste'    => $cost,
    'modelo'   => $endpoint,
    'calidad'  => $quality,
]);
