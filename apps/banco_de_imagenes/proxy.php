<?php
declare(strict_types=1);

// Configuración de errores
ini_set('display_errors', '0');
error_reporting(E_ALL);

// CORS Headers - MUY IMPORTANTE
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validación POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Solo POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no habilitado']);
    exit;
}

// API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
$apiKey = '';
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
    echo json_encode(['error' => ['message' => 'API key no configurada.']]);
    exit;
}

// ===== Clave OpenAI: SOLO entorno (getenv → REDIRECT_ → $_SERVER → $_ENV) =====
$openaiKey = '';
foreach ([getenv('OPENAI_API_KEY'), getenv('REDIRECT_OPENAI_API_KEY'), $_SERVER['OPENAI_API_KEY'] ?? '', $_SERVER['REDIRECT_OPENAI_API_KEY'] ?? '', $_ENV['OPENAI_API_KEY'] ?? '', $_ENV['REDIRECT_OPENAI_API_KEY'] ?? ''] as $v) {
    if (!empty($v)) { $openaiKey = (string)$v; break; }
}
if ($openaiKey === '') {
    foreach ([getenv('O'), getenv('REDIRECT_O'), $_SERVER['O'] ?? '', $_SERVER['REDIRECT_O'] ?? '', $_ENV['O'] ?? '', $_ENV['REDIRECT_O'] ?? ''] as $v) {
        if (!empty($v)) { $openaiKey = (string)$v; break; }
    }
}

// Input validation
$requestBody = file_get_contents('php://input');
if (!$requestBody) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacío']);
    exit;
}

$requestData = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !isset($requestData['prompt']) || trim($requestData['prompt']) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt requerido']);
    exit;
}

$prompt = $requestData['prompt'];

// ===== Lista blanca exacta de modelos (lista cerrada) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
];

// ====================================================================
// ACCIÓN TEXTO (mejorar prompts) — Gemini 3.8 Flash (§6)
// ====================================================================
if (($requestData['action'] ?? '') === 'mejorar') {
    $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' . urlencode($apiKey);
    $payload = json_encode([
        'contents' => [[
            'parts' => [['text' => $prompt]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT'],
            'temperature' => 0.4,
        ]
    ]);
} else {
    $reqModel = strtolower((string)($requestData['model'] ?? 'openai-medium'));
    if (!isset($modelCatalog[$reqModel])) {
        http_response_code(400);
        echo json_encode(['error' => 'Modelo no soportado.']);
        exit;
    }
    $selected = $modelCatalog[$reqModel];

    // ====================================================================
    // BACKEND: OPENAI GPT IMAGE 2.5 (Images API, generación desde texto)
    // ====================================================================
    if ($selected['backend'] === 'openai') {
        if ($openaiKey === '') {
            http_response_code(500);
            echo json_encode(['error' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']);
            exit;
        }
        $oaiPayload = [
            'model'   => $selected['model'],
            'prompt'  => $prompt,
            'quality' => $selected['quality'],
            'size'    => '1024x1024',
        ];
        $ch = curl_init('https://api.openai.com/v1/images/generations');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($oaiPayload),
            CURLOPT_TIMEOUT => 180,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            $error = curl_error($ch);
            curl_close($ch);
            http_response_code(502);
            echo json_encode(['error' => 'Error cURL', 'details' => $error]);
            exit;
        }
        curl_close($ch);
        if ($httpcode >= 400) {
            $errorData = json_decode($response, true);
            $msg = $errorData['error']['message'] ?? 'Error desconocido de OpenAI';
            if (is_array($msg)) $msg = json_encode($msg);
            http_response_code($httpcode);
            echo json_encode(['error' => 'Error OpenAI API', 'details' => $msg]);
            exit;
        }
        $data = json_decode($response, true);
        $imageData = $data['data'][0]['b64_json'] ?? '';
        $mimeOut = 'image/png';
        if ($imageData === '' && !empty($data['data'][0]['url'])) {
            $ch = curl_init((string)$data['data'][0]['url']);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
            $download = curl_exec($ch);
            $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);
            if (is_string($download) && $download !== '') {
                $imageData = base64_encode($download);
                if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
            }
        }
        if ($imageData === '') {
            http_response_code(502);
            echo json_encode(['error' => 'OpenAI no devolvió ninguna imagen.']);
            exit;
        }
        echo json_encode(['image' => $imageData, 'mimeType' => $mimeOut]);
        exit;
    }

    // ====================================================================
    // BACKEND: GEMINI (Google directo, clave A) — conservado tal cual
    // ====================================================================
    $model = $selected['model'];
    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    $payload = json_encode([
        'contents' => [[
            'parts' => [['text' => $prompt]]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.4,
        ]
    ]);
}

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error cURL', 'details' => $error]);
    exit;
}

curl_close($ch);

// Si la API devuelve error, reenviarlo
if ($httpcode >= 400) {
    $errorData = json_decode($response, true);
    $msg = $errorData['error']['message'] ?? 'Error desconocido de Gemini';
    http_response_code($httpcode);
    echo json_encode(['error' => 'Error Gemini API', 'details' => $msg]);
    exit;
}

// Verificar respuesta válida
$data = json_decode($response, true);
if (!$data || !isset($data['candidates'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Respuesta inválida', 'details' => substr($response, 0, 200)]);
    exit;
}

http_response_code($httpcode);
echo $response;
?>
