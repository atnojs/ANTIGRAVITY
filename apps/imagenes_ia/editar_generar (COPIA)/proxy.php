<?php
// Proxy Gemini — PHP 8+, cURL habilitado.
// Soporta Gemini directo (clave A).
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

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Fallo interno en PHP', 'details' => $e['message']]]);
    }
});

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

// ===== Helper: carga de claves (cascada .htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV) =====
function loadKey(string $name): string {
        $candidates = [
        getenv($name),
        getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '',
        $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '',
        $_ENV['REDIRECT_' . $name] ?? '',
    ];
    foreach ($candidates as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$GEMINI_KEY = loadKey('A');

// Entrada
$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

// Detectar backend según el modelo (solo Gemini)
$modelParam = strtolower((string)($req['model'] ?? 'gemini-3.8-flash'));
if (strpos($modelParam, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}


// ====================================================================
// BACKEND: GEMINI
// ====================================================================

if (!$GEMINI_KEY || empty($GEMINI_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// Mapear IDs del frontend a nombres de modelo reales de Gemini
$geminiModelMap = [
    'gemini-flash' => 'gemini-2.5-flash-image',
    'gemini-pro'   => 'gemini-2.5-pro-image',
];
$model = $geminiModelMap[$modelParam] ?? $modelParam;
if ($model === '' || stripos($model, 'flah') !== false) {
    $model = 'gemini-2.5-flash-image';
}
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($GEMINI_KEY);

// Construir payload — soporte passthrough + formato sencillo
if (isset($req['contents'])) {
    $payload = ['contents' => $req['contents']];
    if (isset($req['generationConfig']) && is_array($req['generationConfig'])) {
        $payload['generationConfig'] = $req['generationConfig'];
    }
} elseif (isset($req['payload']) && is_array($req['payload'])) {
    $payload = $req['payload'];
} else {
    $prompt   = (string)($req['prompt'] ?? '');
    $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
    $mimeType = (string)($req['mimeType'] ?? 'image/jpeg');

    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Control de tamaño de imagen
    if ($imageB64 !== '') {
        $imgBinary = base64_decode($imageB64);
        if ($imgBinary === false || strlen($imgBinary) > 2500000) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
            exit;
        }
    }

    $parts = [];
    if ($imageB64 !== '') {
        $parts[] = ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]];
    }
    $parts[] = ['text' => $prompt];

    $payload = [
        'contents' => [['parts' => $parts]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT'],
            'imageConfig' => ['imageSize' => '1K']
        ]
    ];
}

// Llamada a la API de Gemini
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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

// Respuesta — passthrough raw Gemini
http_response_code((int)$httpcode);
echo $response;
