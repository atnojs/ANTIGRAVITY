<?php
// ============================================================
// PROXY PHP - Generador / Editor de imágenes con FLUX (Black Forest Labs)
//   API asíncrona: submit + polling del lado servidor -> el frontend
//   recibe la imagen en una sola llamada (data URL).
//   Clave BFL oculta en el .htaccess raíz de Hostinger (SetEnv F).
//   100% FLUX, sin ninguna dependencia de otros proveedores.
// ============================================================

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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

// ===== CLAVE API FLUX (F): cascade config.php -> env -> REDIRECT_ -> $_SERVER -> $_ENV =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    if (defined('F')) $apiKey = F;
    elseif (defined('BFL_API_KEY')) $apiKey = BFL_API_KEY;
}
$src = ['F', 'REDIRECT_F', 'BFL_API_KEY', 'REDIRECT_BFL_API_KEY'];
foreach ($src as $v) {
    if (!empty($apiKey)) break;
    $apiKey = getenv($v) ?: ($_SERVER[$v] ?? '') ?: ($_ENV[$v] ?? '');
}
if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key de FLUX (F) no configurada.']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}
$data = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}
if (!isset($data['prompt']) || trim((string)$data['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt".']]);
    exit;
}

$prompt = (string)$data['prompt'];

// Presets de calidad -> endpoint FLUX real (según la calidad/resolución elegida)
$MODELOS = [
    'barato' => 'flux-2-klein-9b', // 512px: compacto, rápido, barato
    'normal' => 'flux-2-pro',      // 1K/2K: recomendado BFL, calidad/velocidad
    'pro'    => 'flux-2-max',       // 4K: máxima fidelidad
];
$calidad  = (string)($data['calidad'] ?? 'normal');
$endpoint = $MODELOS[$calidad] ?? $MODELOS['normal'];

// ===== Dimensiones: aspect ratio + lado objetivo, con tope de 4MP =====
$aspect  = (string)($data['aspectRatio'] ?? '1:1');
$target  = (int)($data['targetPx'] ?? 1024);
if ($target < 256)  $target = 256;
if ($target > 2048) $target = 2048; // FLUX nunca supera ~2048 de lado (tope 4MP)

$MAX_PX = 4194304; // 4 MP: límite duro verificado de FLUX 2
$parts = explode(':', $aspect);
$aw = (float)($parts[0] ?? 1);
$ah = (float)($parts[1] ?? 1);
if ($aw <= 0 || $ah <= 0) { $aw = 1.0; $ah = 1.0; }

if ($aw >= $ah) { $w = $target;               $h = $target * $ah / $aw; }
else            { $h = $target;               $w = $target * $aw / $ah; }

if ($w * $h > $MAX_PX) {
    $scale = sqrt($MAX_PX / ($w * $h));
    $w *= $scale;
    $h *= $scale;
}
// redondear a múltiplos de 32 (recomendado en modelos de difusión)
$w = max(256, (int)(round($w / 32) * 32));
$h = max(256, (int)(round($h / 32) * 32));
// re-tope de seguridad tras el redondeo
while ($w * $h > $MAX_PX) {
    if ($w >= $h) $w -= 32; else $h -= 32;
}

// Imagen de entrada opcional (data URL base64) para EDITAR (image-to-image)
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

$payload = [
    'prompt' => $prompt,
    'width'  => $w,
    'height' => $h,
];
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
        'width'    => $w,
        'height'   => $h,
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
    'width'    => $w,
    'height'   => $h,
]);
