<?php
header('Content-Type: application/json');

$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('A') ? A : '';
}

// Si no está en config.php, buscar en variables de entorno (incluyendo prefijos de redirección FastCGI)
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_A');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['A'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_A'] ?? '';
}

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
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
$prompt   = (string)($req['prompt'] ?? "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page.\n\nStyle Conversion: Convert all visual elements from the input image (people, objects, backgrounds, text, etc.) into consistent, smooth, and distinct black outlines using clean, uniform lines.\n\nTonal Removal: Completely eliminate all colors, gradients, shading, textures, and gray fills. The resulting image must consist purely of black lines on a pure white background.\n\nClarity and Space: Simplify complex shapes when necessary to create distinct, clear areas of white space that invite and are easy to color. Ensure that the outlines of key objects are prominent.\n\nDetail & Context Preservation: Maintain the original composition, perspective, and key elements of the input image. If the input image contains text, render it as clear, simple, colorable outlines. If there are intricate details, reduce them to essential lines without losing the object's identity (e.g., ship rigging details or basic facial features).\n\nCleanliness: The final drawing must be sharp, without artifacts, smudges, or extraneous lines. Do not add additional background textures or decorative frames unless they were present in the original image or specifically requested.\n\nThe final output should appear ready to be printed and hand-colored.");

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen']]);
    exit;
}

$model = 'gemini-3.1-flash-image-preview';
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
    echo json_encode(['error' => ['message' => 'Error cURL: ' . curl_error($ch)]]);
    curl_close($ch);
    exit;
}

curl_close($ch);

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => $msg]]);
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
        'text' => implode("\n", $texts) ?: 'El modelo no genero imagen ni texto.'
    ]);
    exit;
}

echo json_encode([
    'image' => $imageData,
    'mimeType' => $mimeOut
]);
