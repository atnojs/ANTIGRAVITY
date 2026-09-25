<?php
// ============================================================
// PROXY PHP — Edición de imágenes con IA (OpenAI GPT Image 2.5 + Gemini)
// Bloque "IA — 10 Herramientas" de la app ajustes_imagen.
// Migrado al contrato canónico (canonical-image-model.php):
//   openai-medium / openai-high / openai-max-flare → gpt-image-2.5-flare
//   openai-xhigh / openai-max-sunburst           → gpt-image-2.5-sunburst
//   gemini-flash → google/gemini-3.1-flash-image (OpenRouter)
//   gemini-pro   → google/gemini-3-pro-image     (OpenRouter)
// (lista cerrada) (400 "Modelo no soportado").
// Backend de imágenes: solo Gemini (OpenRouter).
// Contrato con el frontend: recibe {image (base64), mimeType, prompt, model?}
//                           responde {image (base64), mimeType}
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';

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

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);
if (is_array($canonicalBody)) ag_image_response($canonicalBody, __DIR__);



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
if ($reqModel === '') { $reqModel = ($quality === 'max') ? 'gemini-pro' : 'gemini-flash'; }
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

// La imagen puede llegar como data URL o base64 puro; Gemini espera base64 PURO (sin prefijo data:)
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

// ===== SELECCION MODELO (Gemini: 3.1 FLASH por defecto / 3 PRO si se pide) =====
$backend = 'gemini';
$geminiModelId = 'google/gemini-3.1-flash-image';
if (strpos($reqModel, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
if (strpos($reqModel, 'pro') !== false || $reqModel === 'google/gemini-3-pro-image') {
    $geminiModelId = 'google/gemini-3-pro-image';
}

// ===== RAMA GEMINI (OpenRouter chat/completions, usa la imagen de referencia) =====
if ($backend === 'gemini') {
    // Clave OpenRouter (R): cascade .htaccess raiz / env / server
    $orKey = '';
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
        'width' => null,
        'height' => $reqH ?: null,
        'model' => $geminiModelId,
    ]);
    exit;
}
