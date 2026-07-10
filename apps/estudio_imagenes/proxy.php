<?php
// ============================================================
// PROXY PHP — Estudio de Imágenes IA (OpenRouter)
// Hostinger-compatible · 7 fuentes de API Key
// Acciones:
//   - generar : text-to-image
//   - editar  : image-to-image (con imagen de entrada)
//   - mejorar : mejora un prompt (modelo de texto barato)
// La clave viaja SIEMPRE server-side, nunca al frontend.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

// ===== 7 FUENTES DE API KEY (Hostinger) =====
$apiKey = '';

$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
}
if (empty($apiKey)) $apiKey = getenv('OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_OPENROUTER_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['OPENROUTER_API_KEY'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_OPENROUTER_API_KEY'] ?? '';

// La clave "AQUI_TU_API_KEY" del placeholder no es válida
if (empty($apiKey) || $apiKey === 'AQUI_TU_API_KEY') {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key no configurada. Crea config.php con define("OPENROUTER_API_KEY", "tu-key");']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el campo "prompt" en la petición']]);
    exit;
}

$accion = $data['action'] ?? 'generar';
$prompt = trim((string)$data['prompt']);

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'El prompt está vacío']]);
    exit;
}

// Modelos permitidos (whitelist server-side — el frontend NO elige libremente)
$MODELOS_IMG = [
    'barato' => 'google/gemini-3.1-flash-lite-image',
    'normal' => 'google/gemini-2.5-flash-image',
    'pro'    => 'google/gemini-3-pro-image',
];
$MODELO_TEXTO = 'google/gemini-2.5-flash-lite';

$openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================
// Helper: llamada a OpenRouter
// ============================================================
function llamarOpenRouter($url, $payload, $apiKey) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
            'X-Title: Estudio de Imagenes IA'
        ],
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    return [$response, $httpCode, $curlError];
}

// ============================================================
// ACCIÓN: mejorar prompt (texto)
// ============================================================
if ($accion === 'mejorar') {
    $sistema = 'Eres un experto en prompts para modelos de imagen. Reescribe la idea del usuario '
        . 'como un prompt en INGLÉS, detallado y visual, para generar una imagen de alta calidad. '
        . 'Incluye sujeto, composición, iluminación, estilo, ambiente y calidad. '
        . 'Si el usuario indica un número exacto de objetos, recálcalo de forma explícita para que el modelo lo respete. '
        . 'Devuelve ÚNICAMENTE el prompt mejorado, sin explicaciones, sin comillas, sin prefijos.';

    $payload = [
        'model' => $MODELO_TEXTO,
        'messages' => [
            ['role' => 'system', 'content' => $sistema],
            ['role' => 'user', 'content' => $prompt],
        ],
    ];

    list($response, $httpCode, $curlError) = llamarOpenRouter($openRouterUrl, $payload, $apiKey);

    if ($curlError) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión: ' . $curlError]]);
        exit;
    }
    if ($httpCode !== 200) {
        $errBody = json_decode($response, true);
        $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
        if (is_array($errMsg)) $errMsg = json_encode($errMsg);
        http_response_code($httpCode);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
        exit;
    }

    $r = json_decode($response, true);
    $texto = $r['choices'][0]['message']['content'] ?? '';
    $cost = $r['usage']['cost'] ?? 0;
    echo json_encode(['success' => true, 'prompt' => trim($texto), 'cost' => $cost]);
    exit;
}

// ============================================================
// ACCIÓN: generar / editar imagen
// ============================================================
$calidad = $data['calidad'] ?? 'normal';
$model = $MODELOS_IMG[$calidad] ?? $MODELOS_IMG['normal'];

// Construir el contenido del mensaje
if ($accion === 'editar') {
    $imagenEntrada = $data['imageData'] ?? '';  // data URL base64
    if (empty($imagenEntrada)) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Para editar hace falta una imagen de entrada (imageData)']]);
        exit;
    }
    $contenido = [
        ['type' => 'text', 'text' => $prompt],
        ['type' => 'image_url', 'image_url' => ['url' => $imagenEntrada]],
    ];
} else {
    // generar desde texto
    $contenido = [
        ['type' => 'text', 'text' => $prompt],
    ];
}

$payload = [
    'model' => $model,
    'messages' => [
        ['role' => 'user', 'content' => $contenido],
    ],
    'modalities' => ['image', 'text'],
];

list($response, $httpCode, $curlError) = llamarOpenRouter($openRouterUrl, $payload, $apiKey);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $curlError]]);
    exit;
}

if ($httpCode !== 200) {
    $errBody = json_decode($response, true);
    $errMsg = $errBody['error']['message'] ?? 'HTTP ' . $httpCode;
    if (is_array($errMsg)) $errMsg = json_encode($errMsg);
    http_response_code($httpCode);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $errMsg]]);
    exit;
}

// Extraer la imagen de la respuesta de OpenRouter
$r = json_decode($response, true);
$msg = $r['choices'][0]['message'] ?? [];
$imagenUrl = '';

if (!empty($msg['images']) && is_array($msg['images'])) {
    $imagenUrl = $msg['images'][0]['image_url']['url'] ?? '';
}

if (empty($imagenUrl)) {
    $texto = is_string($msg['content'] ?? null) ? $msg['content'] : '';
    http_response_code(422);
    echo json_encode(['error' => ['message' => 'El modelo no devolvió imagen. ' . mb_substr($texto, 0, 200)]]);
    exit;
}

$cost = $r['usage']['cost'] ?? 0;

echo json_encode([
    'success' => true,
    'image'   => $imagenUrl,   // data URL base64
    'cost'    => $cost,
    'model'   => $model,
]);
