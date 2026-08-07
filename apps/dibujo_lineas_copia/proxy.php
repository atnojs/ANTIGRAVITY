<?php
// ============================================================
// PROXY PHP - Imágenes a Lineales con Gemini 3.1 Flash Image (OpenRouter)
// Convierte una imagen subida en un dibujo lineal (página de colorear).
// Clave OpenRouter en variable de entorno 'R' del .htaccess raíz.
// OpenRouter es SÍNCRONO: llamada única, sin polling.
// ============================================================
header('Content-Type: application/json');

// ===== CLAVE OpenRouter (variable 'R'): cascade .htaccess raíz / entorno =====
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
    echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada en .htaccess raíz.']]);
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
    echo json_encode(['error' => ['message' => 'Cuerpo vacío']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

// ===== Modelo seleccionable desde el frontend =====
// Por defecto 3.1 Flash Image (más barato, fiel para todo salvo personas).
// '3' o 'pro' -> Gemini 3 Pro Image (mejor para personas).
$reqModel = strtolower((string)($req['model'] ?? ''));
$ALLOWED_MODELS = [
    'google/gemini-3.1-flash-image',
    'google/gemini-3-pro-image',
];
if (in_array($reqModel, $ALLOWED_MODELS, true)) {
    $model = $reqModel;
} else {
    // Fallback por si el frontend manda 'pro'/'flash' corto
    if (strpos($reqModel, 'pro') !== false) {
        $model = 'google/gemini-3-pro-image';
    } else {
        $model = 'google/gemini-3.1-flash-image';
    }
}

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen']]);
    exit;
}

// --- SEGURIDAD: control de tamaño ---
$imgBinary = base64_decode($imageB64);
if (strlen($imgBinary) > 2500000) { // ~2.5MB
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

$prompt = (string)($req['prompt'] ?? "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page. Convert all visual elements (people, objects, backgrounds) into consistent, smooth, distinct black outlines using clean uniform lines. Completely eliminate all colors, gradients, shading, textures and gray fills: the result must be purely black lines on a pure white background. Simplify complex shapes to create clear areas of white space that are easy to color. Maintain the original composition, perspective and key elements. The final drawing must be sharp, without artifacts or smudges, ready to be printed and hand-colored.");

// ===== MODELO: elegido por el usuario en el selector (por defecto 3.1 Flash) =====
$model = 'google/gemini-3.1-flash-image';

// Construir content con imagen + prompt (data URL con prefijo)
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
    echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}
curl_close($ch);

if ($code >= 400) {
    $eb = json_decode($resp, true);
    // Aplanar error anidado de OpenRouter
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
    echo json_encode(['error' => ['message' => 'OpenRouter no devolvió imagen.']]);
    exit;
}

$imgDataUrl = $images[0]['image_url']['url'] ?? '';
if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'OpenRouter devolvió URL en lugar de imagen base64.']]);
    exit;
}

// Extraer base64 del data URL y re-encodear (mantiene contrato {image, mimeType})
$imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
$imgBin = base64_decode($imgB64);
$imgType = 'image/png';

echo json_encode([
    'image'    => base64_encode($imgBin),
    'mimeType' => $imgType,
]);
