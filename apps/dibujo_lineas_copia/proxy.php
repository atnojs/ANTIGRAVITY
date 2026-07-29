<?php
// ============================================================
// PROXY — Imágenes a Lineales con Gemini 2.5 Flash Image
// Convierte una imagen subida en dibujo lineal (página de colorear).
// Clave Gemini en variable 'G' del .htaccess raíz.
// Contrato de respuesta: {image, mimeType} o {text} o {error: {message}}
// ============================================================
header('Content-Type: application/json');

// ===== Carga de config.php (si existe) =====
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) { include $configFile; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

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

// ===== CLAVE GEMINI (variable 'G'): cascade .htaccess raíz / entorno =====
$apiKey = '';
if (defined('G')) $apiKey = G;
if (!$apiKey || empty($apiKey)) $apiKey = getenv('G');
if (!$apiKey || empty($apiKey)) $apiKey = getenv('REDIRECT_G');
if (!$apiKey || empty($apiKey)) $apiKey = $_SERVER['G'] ?? '';
if (!$apiKey || empty($apiKey)) $apiKey = $_SERVER['REDIRECT_G'] ?? '';
if (!$apiKey || empty($apiKey)) $apiKey = $_ENV['G'] ?? '';
if (!$apiKey || empty($apiKey)) $apiKey = $_ENV['REDIRECT_G'] ?? '';

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini (G) no configurada.']]);
    exit;
}

// ===== LLAMADA A GEMINI 2.5 Flash Image =====
$model = 'gemini-3.1-flash-lite';
$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

$payload = [
    'contents' => [[
        'parts' => [
            ['text' => $prompt],
            ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]]
        ]
    ]],
    'generationConfig' => [
        'responseModalities' => ['IMAGE', 'TEXT'],
        'imageConfig' => [
            'imageSize' => '1K'
        ]
    ]
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error cURL (Gemini): ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}
curl_close($ch);

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => 'Gemini: ' . $msg]]);
    exit;
}

$candidates = $data['candidates'] ?? [];
$imageData = '';
$mimeOut = 'image/png';
$texts = [];

foreach ($candidates as $cand) {
    foreach ($cand['content']['parts'] ?? [] as $part) {
        if (isset($part['inlineData'])) {
            $imageData = $part['inlineData']['data'] ?? '';
            $mimeOut = $part['inlineData']['mimeType'] ?? 'image/png';
        }
        if (isset($part['text']) && !empty($part['text'])) {
            $texts[] = $part['text'];
        }
    }
}

if ($imageData === '') {
    echo json_encode([
        'text' => implode("\n", $texts) ?: 'Gemini no generó imagen ni texto.'
    ]);
    exit;
}

echo json_encode([
    'image'    => $imageData,
    'mimeType' => $mimeOut
]);
