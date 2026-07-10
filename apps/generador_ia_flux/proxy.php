<?php
// ============================================================
// PROXY PHP - Generador / Editor de imágenes con FLUX (Black Forest Labs)
// Oculta la clave BFL_API_KEY del frontend.
// BFL es ASÍNCRONO: este proxy hace submit + polling del lado servidor,
// así el frontend recibe la imagen en una sola llamada.
// Compatible Hostinger (cascade de fuentes de clave).
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

// ===== CLAVE API BFL: cascade de fuentes (Hostinger) =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('BFL_API_KEY') ? BFL_API_KEY : '';
}
if (empty($apiKey)) $apiKey = getenv('BFL_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_BFL_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['BFL_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_BFL_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['BFL_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_BFL_API_KEY'] ?? '';

if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key no configurada. Crea config.php con define("BFL_API_KEY", "tu-key");']]);
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

// Presets de calidad -> endpoint FLUX real
$MODELOS = [
    'barato' => 'flux-2-klein-9b',  // compacto, rápido, barato
    'normal' => 'flux-2-pro',       // recomendado por BFL: calidad/velocidad
    'pro'    => 'flux-2-max',        // máxima fidelidad
];
$calidad = $data['calidad'] ?? 'normal';
$endpoint = $MODELOS[$calidad] ?? $MODELOS['normal'];

// Imagen de entrada opcional (data URL base64) para EDITAR
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

// ===== CONSTRUIR PAYLOAD =====
$payload = [
    'prompt' => $prompt,
    'width'  => 1024,
    'height' => 1024,
];

// Para editar: FLUX.2 acepta imágenes de referencia en base64 puro (sin el prefijo data:)
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
]);
