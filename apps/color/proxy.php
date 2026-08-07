<?php
// ============================================================
// PROXY PHP - Generador de imágenes con FLUX (Black Forest Labs)
// Oculta la clave FLUX (variable 'F' del .htaccess raíz de Hostinger).
// BFL es ASÍNCRONO: este proxy hace submit + polling del lado servidor,
// así el frontend recibe la imagen en una sola llamada.
// Selector PRO/MAX + width/height dinámicos con CLAMP 4MP (FLUX 2 rechaza >4MP).
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// ===== CLAVE API FLUX ('F'): cascade de fuentes (Hostinger) =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    if (defined('F') && F !== '') $apiKey = F;
}
if (empty($apiKey)) $apiKey = getenv('F');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_F');
if (empty($apiKey)) $apiKey = $_SERVER['F'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_F'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['F'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_F'] ?? '';

if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key de FLUX no configurada. Añade SetEnv F "bfl_..." al .htaccess raíz de Hostinger.']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['prompt']) || trim((string)$data['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$prompt = (string)$data['prompt'];

// Selector de calidad PRO/MAX -> endpoint FLUX real
$MODELOS = [
    'pro' => 'flux-2-pro',   // equilibrado (~$0.03)
    'max' => 'flux-2-max',   // máxima fidelidad (~$0.07)
];
$calidad = $data['calidad'] ?? 'pro';
$endpoint = $MODELOS[$calidad] ?? $MODELOS['pro'];

// ===== DIMENSIONES (formato + resolución) con CLAMP 4MP =====
$MAX_PX = 4194304; // 4 MP: FLUX 2 rechaza (HTTP 422) por encima de esto
$width  = (int)($data['width'] ?? 1024);
$height = (int)($data['height'] ?? 1024);
if ($width  < 256) $width  = 1024;
if ($height < 256) $height = 1024;

// Redondear a múltiplos de 32 (requisito FLUX)
$round32 = function ($n) {
    $n = (int)round($n / 32) * 32;
    return max(256, $n);
};
$width  = $round32($width);
$height = $round32($height);

// Clamp 4MP preservando el aspect ratio
$pixels = $width * $height;
if ($pixels > $MAX_PX) {
    $scale  = sqrt($MAX_PX / $pixels);
    $width  = $round32($width  * $scale);
    $height = $round32($height * $scale);
    // Reajuste fino por si el redondeo reintrodujo overflow
    while ($width * $height > $MAX_PX) {
        if ($width >= $height) { $width -= 32; } else { $height -= 32; }
        $width  = max(256, $width);
        $height = max(256, $height);
    }
}

// Imagen de entrada opcional (data URL base64) para image-to-image
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

// ===== CONSTRUIR PAYLOAD =====
$payload = [
    'prompt' => $prompt,
    'width'  => $width,
    'height' => $height,
];

// Para editar/referencia: FLUX.2 acepta imagen en base64 puro (sin el prefijo data:)
if ($imagenEntrada !== '') {
    $b64 = $imagenEntrada;
    if (strpos($b64, ',') !== false) {
        $b64 = substr($b64, strpos($b64, ',') + 1); // quitar "data:image/...;base64,"
    }
    $payload['input_image'] = $b64;
}

// ===== 1) ENVIAR TAREA =====
$submitUrl = 'https://api.bfl.ai/v1/' . $endpoint;
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $submitUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'accept: application/json',
        'x-key: ' . $apiKey,
    ],
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
if ($submitCode !== 200) {
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

// ===== 2) POLLING hasta que esté lista (máx ~90s) =====
$imageUrl = '';
$maxIntentos = 60;
for ($i = 0; $i < $maxIntentos; $i++) {
    usleep(1500000); // 1.5s entre sondeos
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $pollUrl,
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
    // "Pending" / "Task not found (todavía)" -> seguir
}

if ($imageUrl === '') {
    http_response_code(504);
    echo json_encode(['error' => ['message' => 'FLUX tardó demasiado en generar la imagen. Inténtalo de nuevo.']]);
    exit;
}

// ===== 3) Descargar la imagen y devolverla como data URL =====
// (La URL de BFL caduca; la incrustamos para poder guardarla en el historial.)
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $imageUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$imgBin = curl_exec($ch);
$imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
$imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
curl_close($ch);

if (!$imgOk || $imgBin === false || $imgBin === '') {
    // Si falla la descarga, al menos devolvemos la URL directa
    echo json_encode([
        'success'  => true,
        'imageUrl' => $imageUrl,
        'coste'    => $cost,
        'modelo'   => $endpoint,
        'calidad'  => $calidad,
        'width'    => $width,
        'height'   => $height,
    ]);
    exit;
}

$dataUrl = 'data:' . $imgType . ';base64,' . base64_encode($imgBin);

echo json_encode([
    'success'  => true,
    'imageUrl' => $dataUrl,
    'coste'    => $cost,
    'modelo'   => $endpoint,
    'calidad'  => $calidad,
    'width'    => $width,
    'height'   => $height,
]);
