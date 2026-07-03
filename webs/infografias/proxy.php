<?php
// Proxy Gemini — 2 fases: investigación (texto + Google Search) → imagen
// Basado en el patrón robusto de dibujo_lineas.
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
    echo json_encode(['error' => ['message' => 'Solo POST.']]);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// API Key — cascadeo robusto
$API_KEY = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $API_KEY = defined('A') ? A : '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('REDIRECT_A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// Leer entrada
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

$prompt = trim((string)($req['prompt'] ?? ''));
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt".']]);
    exit;
}

// ===== Función auxiliar: llamar a Gemini =====
function callGemini(string $apiKey, string $model, array $payload, int $timeout = 120): array {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 15
    ]);
    
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        return ['error' => true, 'httpcode' => 500, 'message' => 'Error cURL: ' . $curlErr];
    }
    
    $data = json_decode($response, true);
    
    if ($httpcode >= 400 || isset($data['error'])) {
        $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
        return ['error' => true, 'httpcode' => $httpcode, 'message' => $msg];
    }
    
    return ['error' => false, 'httpcode' => $httpcode, 'data' => $data];
}

// ===== FASE 1: Investigación con modelo de texto + Google Search =====
$researchPrompt = <<<EOT
Actúas como un Diseñador de Infografías Senior. Tu tarea es investigar y crear el prompt perfecto para generar una infografía.

TEMA SOLICITADO POR EL USUARIO:
{$prompt}

INSTRUCCIONES:
1. Busca en la red información verídica y actualizada sobre este tema.
2. Extrae 3-5 puntos clave o datos relevantes.
3. Crea un prompt en español para generar una infografía. El prompt debe incluir:
   - Estilo: "Infografía profesional, diseño editorial limpio, colores vibrantes"
   - Los textos o títulos DEBEN ir entre comillas dobles y escritos en español impecable
   - Describe la disposición: columnas, timeline, o estructura adecuada al tema
   - Especifica paleta de colores apropiada al tema
   - NO uses marcadores como \[tema\] o placeholders — incluye contenido REAL

DEVUELVE ÚNICAMENTE el prompt final para el generador de imágenes, sin explicaciones adicionales.
EOT;

$textPayload = [
    'contents' => [[
        'parts' => [['text' => $researchPrompt]]
    ]],
    'tools' => [[
        'googleSearch' => new stdClass()
    ]],
    'generationConfig' => [
        'temperature' => 0,
        'topK' => 1
    ]
];

$phase1 = callGemini($API_KEY, 'gemini-2.5-flash', $textPayload, 90);

if ($phase1['error']) {
    http_response_code($phase1['httpcode']);
    echo json_encode(['error' => ['message' => 'Fase 1 (investigación): ' . $phase1['message']]]);
    exit;
}

// Extraer el prompt estructurado de la respuesta del modelo de texto
$imagePrompt = '';
$candidates1 = $phase1['data']['candidates'] ?? [];
foreach ($candidates1 as $cand) {
    foreach ($cand['content']['parts'] ?? [] as $part) {
        if (isset($part['text']) && !empty($part['text'])) {
            $imagePrompt .= $part['text'];
        }
    }
}

if (empty(trim($imagePrompt))) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'La fase de investigación no generó contenido.']]);
    exit;
}

$imagePrompt = trim($imagePrompt);

// ===== FASE 2: Generación con Imagen 3 =====
$imagenUrl = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=' . urlencode($API_KEY);

$imagePayload = [
    'instances' => [[
        'prompt' => $imagePrompt
    ]],
    'parameters' => [
        'sampleCount' => 1,
        'negativePrompt' => 'blurry, pixelated, distorted text, misspelled words, wrong language, low quality, watermark'
    ]
];

$ch = curl_init($imagenUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($imagePayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Error cURL Imagen 3: ' . $curlErr]]);
    exit;
}

$data = json_decode($response, true);

if ($httpcode >= 400 || isset($data['error'])) {
    http_response_code($httpcode ?: 500);
    $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
    echo json_encode(['error' => ['message' => 'Imagen 3: ' . $msg]]);
    exit;
}

// Imagen 3 devuelve predictions[].bytesBase64Encoded
$imageData = $data['predictions'][0]['bytesBase64Encoded'] ?? '';

if ($imageData === '') {
    echo json_encode([
        'text' => 'Imagen 3 no generó imagen.',
        'debug_prompt' => $imagePrompt
    ]);
    exit;
}

echo json_encode([
    'candidates' => [[
        'content' => [
            'parts' => [[
                'inlineData' => [
                    'mimeType' => 'image/png',
                    'data' => $imageData
                ]
            ]]
        ]
    ]]
]);
