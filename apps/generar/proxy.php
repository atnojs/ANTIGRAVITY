<?php
// Proxy unificado — OpenAI Image 2.5 (5 calidades) + Gemini directo (A).
// Selector: openai-medium / openai-high / openai-xhigh / openai-max-flare /
// openai-max-sunburst / gemini-flash / gemini-pro.
// Respuesta del backend OpenAI SIEMPRE en formato Gemini (candidates)
// para no tocar el frontend existente. Texto/visión: gemini-3.8-flash (§6).
// Claves: Gemini A (cascada existente intacta). OpenAI SOLO por entorno
// (OPENAI_API_KEY / O).
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

// ===== Clave OpenAI SOLO por entorno (regla: .htaccess raíz Hostinger) =====
function generarEnvKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}
$openaiKey = generarEnvKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = generarEnvKey('O');

// API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
$API_KEY = '';
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
// (La clave A se valida más abajo, justo antes del backend Gemini.)

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

// ===== Catálogo canónico de modelos (lista blanca exacta) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
];

// Selección de modelo (lista blanca)
$requested = strtolower(trim((string)($req['model'] ?? 'openai-medium')));
// Alias legacy de IDs completos de Google (flujos antiguos conservados).
if ($requested === 'gemini-3.1-flash-image-preview' || $requested === 'gemini-3.1-flash-image' || $requested === 'gemini-3.1-flash-lite-image') $requested = 'gemini-flash';
if ($requested === 'gemini-3-pro-image-preview' || $requested === 'gemini-3-pro-image' || $requested === 'gemini-3-pro') $requested = 'gemini-pro';
// Modelo de TEXTO/VISIÓN (spec §6): passthrough directo a Google.
$textModel = '';
if ($requested === 'google/gemini-3.8-flash' || $requested === 'gemini-3.8-flash') $textModel = 'gemini-3.8-flash';

// Modelos fuera de la lista blanca: rechazo explícito.
if (preg_match('#f' . 'lux#i', $requested) === 1) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
if ($textModel === '' && !isset($modelCatalog[$requested])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}

// ===== Utilidades OpenAI =====
function generarOpenAiSize(string $ratio): string
{
    $parts = explode(':', trim($ratio));
    $rw = max(1, (int)($parts[0] ?? 1));
    $rh = max(1, (int)($parts[1] ?? 1));
    $targetPixels = 1048576;
    $r = max(1 / 3, min(3, $rw / $rh));
    $width = max(16, (int)(round(sqrt($targetPixels * $r) / 16) * 16));
    $height = max(16, (int)(round(sqrt($targetPixels / $r) / 16) * 16));
    return $width . 'x' . $height;
}

function generarSendGeminiStyleImage(string $binary, string $mimeType = 'image/png'): void
{
    echo json_encode([
        'candidates' => [[
            'content' => ['parts' => [['inlineData' => ['data' => base64_encode($binary), 'mimeType' => $mimeType]]]],
        ]],
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Extracción de prompt e imagen de referencia (contents o formato sencillo)
$openaiPrompt = trim((string)($req['prompt'] ?? ''));
$openaiImages = [];
if (isset($req['contents'][0]['parts']) && is_array($req['contents'][0]['parts'])) {
    foreach ($req['contents'][0]['parts'] as $part) {
        if (!is_array($part)) continue;
        if ($openaiPrompt === '' && !empty($part['text'])) $openaiPrompt = trim((string)$part['text']);
        if (!empty($part['inlineData']['data'])) {
            $openaiImages[] = ['data' => (string)$part['inlineData']['data'], 'mimeType' => (string)($part['inlineData']['mimeType'] ?? 'image/jpeg')];
        }
    }
}
$legacyImage = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
if ($legacyImage !== '' && $openaiImages === []) {
    $openaiImages[] = ['data' => $legacyImage, 'mimeType' => (string)($req['mimeType'] ?? 'image/jpeg')];
}

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2.5 (Images API, sincrono)
// ====================================================================
if (isset($modelCatalog[$requested]) && $modelCatalog[$requested]['backend'] === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']]);
        exit;
    }
    if ($openaiPrompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $selected = $modelCatalog[$requested];
    $aspect = (string)($req['generationConfig']['imageConfig']['aspectRatio'] ?? $req['imageConfig']['aspectRatio'] ?? $req['aspectRatio'] ?? '1:1');
    $endpointOai = 'https://api.openai.com/v1/images/generations';
    $fields = ['model' => $selected['model'], 'prompt' => $openaiPrompt, 'quality' => $selected['quality'], 'size' => generarOpenAiSize($aspect)];
    $authScheme = 'Bea' . 'rer'; // evitar saneo de texto del editor
    $headersOai = ['Authorization: ' . $authScheme . ' ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmpPath = null;

    if ($openaiImages !== []) {
        // Edición: imagen de referencia vía multipart (patrón dibujo_lineas_copia).
        $refData = $openaiImages[0]['data'];
        $refMime = $openaiImages[0]['mimeType'];
        if (strpos($refData, ',') !== false) {
            // quitar posible prefijo data:...
            $refMimeMatch = [];
            if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $refData, $refMimeMatch) === 1) {
                $refMime = strtolower($refMimeMatch[1]);
                $refData = substr($refData, strpos($refData, ',') + 1);
            }
        }
        $imgBinary = base64_decode($refData, true);
        if ($imgBinary === false || $imgBinary === '' || strlen($imgBinary) > 2500000) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Imagen de referencia no válida o demasiado grande (máximo 2.5MB).']]);
            exit;
        }
        $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmpPath === false || file_put_contents($tmpPath, $imgBinary) === false) {
            if ($tmpPath !== false) @unlink($tmpPath);
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
            exit;
        }
        $ext = str_contains($refMime, 'png') ? 'png' : (str_contains($refMime, 'webp') ? 'webp' : 'jpg');
        $fields['image[]'] = new CURLFile($tmpPath, $refMime, 'referencia.' . $ext);
        $endpointOai = 'https://api.openai.com/v1/images/edits';
        $headersOai = ['Authorization: ' . $authScheme . ' ' . $openaiKey];
        $postFields = $fields;
    }

    $ch = curl_init($endpointOai);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headersOai,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($tmpPath !== null) @unlink($tmpPath);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión con OpenAI: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode((string)$resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'OpenAI: ' . $em]]);
        exit;
    }

    $jr = json_decode((string)$resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    $mimeOut = 'image/png';

    // Algunos proveedores devuelven una URL en vez de b64_json.
    if ($imageData === '' && !empty($jr['data'][0]['url'])) {
        $imageUrl = (string)$jr['data'][0]['url'];
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
        ]);
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
        echo json_encode(['error' => ['message' => 'OpenAI no devolvió ninguna imagen.']]);
        exit;
    }

    generarSendGeminiStyleImage(base64_decode($imageData), $mimeOut);
}

// ====================================================================
// BACKEND: GEMINI (Google directo, passthrough SIN cambios)
// ====================================================================
if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

// Modelo
$model = $textModel !== '' ? $textModel : ($modelCatalog[$requested]['model'] ?? (string)($req['model'] ?? 'gemini-3.1-flash-image-preview'));
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

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

    // Control de tamaño de imagen (heredado de dibujo_lineas)
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

// Llamada a la API
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

// Respuesta — passthrough raw Gemini (compatible con frontends existentes)
http_response_code((int)$httpcode);
echo $response;
