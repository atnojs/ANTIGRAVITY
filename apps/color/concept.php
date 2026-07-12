<?php
// ============================================================
// PROXY PHP - Conceptos de diseño con DeepSeek (API directa)
// Genera 3 propuestas (nombre + 6 HEX + tipografía Google Fonts + prompt
// de imagen para FLUX) a partir de un color base o descripción.
// Oculta la clave DeepSeek (variable 'B' del .htaccess raíz de Hostinger).
// DeepSeek es SÍNCRONO: una sola llamada.
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
if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'cURL no habilitado.']]);
    exit;
}

// ===== CLAVE DeepSeek ('B'): cascade de fuentes (Hostinger) =====
$apiKey = '';
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    if (defined('B') && B !== '') $apiKey = B;
}
if (empty($apiKey)) $apiKey = getenv('B');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_B');
if (empty($apiKey)) $apiKey = getenv('DEEPSEEK_API_KEY');
if (empty($apiKey)) $apiKey = getenv('REDIRECT_DEEPSEEK_API_KEY');
if (empty($apiKey)) $apiKey = $_SERVER['B'] ?? '';
if (empty($apiKey)) $apiKey = $_SERVER['REDIRECT_B'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['B'] ?? '';
if (empty($apiKey)) $apiKey = $_ENV['REDIRECT_B'] ?? '';

if (empty($apiKey)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'API Key de DeepSeek no configurada. Añade SetEnv B "sk-..." al .htaccess raíz de Hostinger.']]);
    exit;
}

// ===== LEER BODY =====
$body = file_get_contents('php://input');
$data = json_decode($body, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

$baseColor  = trim((string)($data['baseColor'] ?? ''));
$textChoice = (string)($data['textChoice'] ?? 'without'); // with | without | custom
$customText = trim((string)($data['customText'] ?? ''));
$count      = (int)($data['count'] ?? 3);
if ($count < 1 || $count > 5) $count = 3;

if ($baseColor === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta el color base.']]);
    exit;
}

// Instrucción sobre el texto dentro de la imagen (se refleja en el imagePrompt)
if ($textChoice === 'with') {
    $textRule = "Cada 'imagePrompt' DEBE pedir que la imagen incluya un texto/título corto visible y estéticamente integrado usando la tipografía sugerida.";
} elseif ($textChoice === 'custom') {
    $safe = str_replace('"', "'", $customText);
    $textRule = "Cada 'imagePrompt' DEBE pedir que la imagen incluya EXACTAMENTE el texto \"$safe\" visible e integrado estéticamente.";
} else {
    $textRule = "Cada 'imagePrompt' DEBE pedir explícitamente que NO aparezca ningún texto, logotipo ni marca de agua en la imagen; imagen puramente visual.";
}

$systemMsg = "Eres un director de arte experto en branding y publicidad premium. "
    . "Respondes SIEMPRE y ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, sin ```.";

$userMsg = "Genera exactamente $count propuestas de diseño publicitario premium basadas en el color base: \"$baseColor\".\n"
    . "Las propuestas deben cubrir armonías de color distintas y variadas (por ejemplo: complementaria, análoga y monocromática).\n"
    . "$textRule\n\n"
    . "Devuelve EXCLUSIVAMENTE este JSON (sin texto adicional):\n"
    . "{\n"
    . "  \"concepts\": [\n"
    . "    {\n"
    . "      \"title\": \"Nombre corto y evocador de la propuesta\",\n"
    . "      \"harmony\": \"Complementaria|Análoga|Monocromática|...\",\n"
    . "      \"palette\": [\"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\"],\n"
    . "      \"font\": { \"name\": \"Nombre de una tipografía de Google Fonts\", \"url\": \"https://fonts.google.com/specimen/Nombre\" },\n"
    . "      \"imagePrompt\": \"Prompt en inglés, detallado, para un modelo de imagen (FLUX). Describe una imagen publicitaria premium con estética glassmorphism/neón que use la paleta indicada. Incluye la instrucción sobre el texto.\"\n"
    . "    }\n"
    . "  ]\n"
    . "}\n"
    . "Cada 'palette' debe tener exactamente 6 códigos HEX válidos. Usa comillas dobles en todo el JSON.";

$payload = [
    'model' => 'deepseek-chat',
    'messages' => [
        ['role' => 'system', 'content' => $systemMsg],
        ['role' => 'user',   'content' => $userMsg],
    ],
    'temperature' => 0.8,
    'max_tokens' => 2000,
    'response_format' => ['type' => 'json_object'],
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://api.deepseek.com/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error de conexión con DeepSeek: ' . $err]]);
    exit;
}
$respData = json_decode($resp, true);
if ($code >= 400 || isset($respData['error'])) {
    $msg = $respData['error']['message'] ?? ('Error HTTP ' . $code);
    http_response_code($code ?: 500);
    echo json_encode(['error' => ['message' => 'DeepSeek: ' . $msg]]);
    exit;
}

$content = $respData['choices'][0]['message']['content'] ?? '';
if ($content === '') {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'DeepSeek no devolvió contenido.']]);
    exit;
}

// Extraer JSON (por si viniera envuelto en ``` o con texto alrededor)
$parsed = json_decode($content, true);
if (!is_array($parsed)) {
    if (preg_match('/\{[\s\S]*\}/', $content, $m)) {
        $parsed = json_decode($m[0], true);
    }
}
if (!is_array($parsed) || !isset($parsed['concepts']) || !is_array($parsed['concepts'])) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'DeepSeek devolvió un formato inesperado.']]);
    exit;
}

echo json_encode([
    'success'  => true,
    'concepts' => array_values($parsed['concepts']),
]);
