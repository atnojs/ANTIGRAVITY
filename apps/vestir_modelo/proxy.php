<?php
// ============================================================
// PROXY PHP - Vestir Modelo con FLUX Virtual Try-On (VTO)
// Usa el endpoint flux-tools/vto-v1 para transferir prendas.
// Clave FLUX en variable de entorno 'F' del .htaccess raíz.
// Async: submit + polling del lado servidor.
// ============================================================
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Envolver todo en try-catch para evitar 500 silenciosos
try {

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

// ===== CLAVE FLUX (variable F) =====
$apiKey = '';
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_F'); }
if (!$apiKey || empty($apiKey)) { $apiKey = (isset($_SERVER['F']) ? $_SERVER['F'] : ''); }
if (!$apiKey || empty($apiKey)) { $apiKey = (isset($_SERVER['REDIRECT_F']) ? $_SERVER['REDIRECT_F'] : ''); }
if (!$apiKey || empty($apiKey)) { $apiKey = (isset($_ENV['F']) ? $_ENV['F'] : ''); }
if (!$apiKey || empty($apiKey)) { $apiKey = (isset($_ENV['REDIRECT_F']) ? $_ENV['REDIRECT_F'] : ''); }

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de FLUX (F) no configurada en el servidor.']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio.']]);
    exit;
}

$req = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido.']]);
    exit;
}

$prompt     = isset($req['prompt']) ? (string)$req['prompt'] : '';
$personB64  = isset($req['person']) ? (string)$req['person'] : '';
$garmentB64 = isset($req['garment']) ? (string)$req['garment'] : '';

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
    exit;
}
if ($personB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen de la modelo (person).']]);
    exit;
}
if ($garmentB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen de la prenda (garment).']]);
    exit;
}

// Limpiar prefijo data URL
if (strpos($personB64, ',') !== false) {
    $personB64 = substr($personB64, strpos($personB64, ',') + 1);
}
if (strpos($garmentB64, ',') !== false) {
    $garmentB64 = substr($garmentB64, strpos($garmentB64, ',') + 1);
}

// Control de tamaño (max ~2.5MB cada imagen decodificada)
$personBinary = base64_decode($personB64, true);
if ($personBinary === false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Base64 invalido en la imagen de la modelo.']]);
    exit;
}
if (strlen($personBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen de la modelo demasiado grande (max 2.5MB).']]);
    exit;
}

$garmentBinary = base64_decode($garmentB64, true);
if ($garmentBinary === false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Base64 invalido en la imagen de la prenda.']]);
    exit;
}
if (strlen($garmentBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen de la prenda demasiado grande (max 2.5MB).']]);
    exit;
}

// ===== ENDPOINT VTO =====
$submitUrl = 'https://api.bfl.ai/v1/flux-tools/vto-v1';

$payload = array(
    'prompt'           => $prompt,
    'person'           => $personB64,
    'garment'          => $garmentB64,
    'safety_tolerance' => 2,
    'output_format'    => 'jpeg',
);

// ===== 1) ENVIAR TAREA A FLUX VTO =====
$ch = curl_init($submitUrl);
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => array(
        'Content-Type: application/json',
        'accept: application/json',
        'x-key: ' . $apiKey,
    ),
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
));
$submitResp = curl_exec($ch);
$submitCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$submitErr  = curl_error($ch);
curl_close($ch);

if ($submitErr !== '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexion con FLUX VTO: ' . $submitErr]]);
    exit;
}

if ($submitCode >= 400) {
    $eb = json_decode($submitResp, true);
    if (is_array($eb) && isset($eb['detail'])) {
        $em = is_array($eb['detail']) ? json_encode($eb['detail']) : (string)$eb['detail'];
    } else {
        $em = 'HTTP ' . $submitCode;
    }
    http_response_code($submitCode >= 500 ? 502 : $submitCode);
    echo json_encode(['error' => ['message' => 'FLUX VTO error: ' . $em]]);
    exit;
}

$submit = json_decode($submitResp, true);
if (!is_array($submit)) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'FLUX VTO: respuesta invalida.']]);
    exit;
}

$pollUrl = isset($submit['polling_url']) ? (string)$submit['polling_url'] : '';
$costCreditos = isset($submit['cost']) ? (float)$submit['cost'] : 0;
$cost = $costCreditos * 0.01;

if ($pollUrl === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'FLUX VTO no devolvio polling_url.']]);
    exit;
}

// ===== 2) POLLING (max ~90s) =====
$imageUrl = '';
$maxIntentos = 60;
for ($i = 0; $i < $maxIntentos; $i++) {
    usleep(1500000);
    $ch = curl_init($pollUrl);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => array(
            'accept: application/json',
            'x-key: ' . $apiKey,
        ),
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => true,
    ));
    $pollResp = curl_exec($ch);
    $pollCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($pollCode !== 200) continue;

    $pr = json_decode($pollResp, true);
    if (!is_array($pr)) continue;

    $status = isset($pr['status']) ? (string)$pr['status'] : '';

    if ($status === 'Ready') {
        $imageUrl = isset($pr['result']['sample']) ? (string)$pr['result']['sample'] : '';
        break;
    }
    if (in_array($status, array('Error', 'Failed', 'Request Moderated', 'Content Moderated'), true)) {
        http_response_code(422);
        echo json_encode(['error' => ['message' => 'FLUX VTO rechazo la tarea: ' . $status]]);
        exit;
    }
}

if ($imageUrl === '') {
    http_response_code(504);
    echo json_encode(['error' => ['message' => 'FLUX VTO tardo demasiado. Intentalo de nuevo.']]);
    exit;
}

// ===== 3) DESCARGAR IMAGEN =====
$ch = curl_init($imageUrl);
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_SSL_VERIFYPEER => true,
));
$imgBin  = curl_exec($ch);
$imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$imgCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($imgType === false || $imgType === '') {
    $imgType = 'image/jpeg';
}

if ($imgCode !== 200 || $imgBin === false || $imgBin === '') {
    // Fallback: devolver URL directa
    echo json_encode(array(
        'success'  => true,
        'imageUrl' => $imageUrl,
        'coste'    => $cost,
        'modelo'   => 'flux-tools/vto-v1',
    ));
    exit;
}

$dataUrl = 'data:' . $imgType . ';base64,' . base64_encode($imgBin);

echo json_encode(array(
    'success'  => true,
    'imageUrl' => $dataUrl,
    'coste'    => $cost,
    'modelo'   => 'flux-tools/vto-v1',
));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error interno: ' . $e->getMessage()]]);
}
