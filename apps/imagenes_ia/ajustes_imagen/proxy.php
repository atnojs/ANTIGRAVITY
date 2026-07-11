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

// ===== MODELO FLUX según la calidad elegida por el usuario (pro / max) =====
$endpoint = ($quality === 'max') ? 'flux-2-max' : 'flux-2-pro';

$payload = [
    'prompt'      => $prompt,
    'input_image' => $imageB64,
];

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
]);
