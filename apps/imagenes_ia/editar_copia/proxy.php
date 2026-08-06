<?php
/**
 * PROXY PHP — Generador / Editor de imagenes con Gemini 3 Pro (OpenRouter)
 * Migrado de FLUX a Gemini via OpenRouter. Sincrono, sin polling.
 * Clave OpenRouter en variable 'R' del .htaccess raiz (SetEnv R "sk-or-...").
 * Soporta texto→imagen (prompt solo) y edicion (prompt + imagen).
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// ===== CLAVE OpenRouter (variable 'R') =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) { include $configFile; $apiKey = defined('R') ? R : ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('R'); }
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_R'); }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['REDIRECT_R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['R'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['REDIRECT_R'] ?? ''; }

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada.']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST.']]);
    exit;
}

$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio.']]);
    exit;
}

$data = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido.']]);
    exit;
}

$prompt = (string)($data['prompt'] ?? '');
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt".']]);
    exit;
}

// Imagen de entrada opcional para editar (image-to-image)
$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';

// ===== GEMINI 3 PRO via OpenRouter =====
$model = 'google/gemini-3-pro-image';

if ($imagenEntrada !== '') {
    // Modo edicion: prompt + imagen
    $mime = 'image/jpeg';
    if (strpos($imagenEntrada, 'data:image/png') === 0) $mime = 'image/png';
    elseif (strpos($imagenEntrada, 'data:image/webp') === 0) $mime = 'image/webp';
    $b64 = $imagenEntrada;
    if (strpos($b64, ',') !== false) $b64 = substr($b64, strpos($b64, ',') + 1);
    
    $content = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
    ];
} else {
    // Modo generacion: solo prompt
    $content = $prompt;
}

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
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexion: ' . $err]]);
    exit;
}
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
    echo json_encode(['error' => ['message' => 'Gemini devolvio URL en lugar de imagen.']]);
    exit;
}

$imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
echo json_encode([
    'success'  => true,
    'imageUrl' => 'data:image/png;base64,' . $imgB64,
    'model'    => $model,
]);
