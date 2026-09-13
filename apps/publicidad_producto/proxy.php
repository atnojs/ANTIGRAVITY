<?php
// Proxy para Google Gemini + Veo — PHP 8+, sin cURL (usa stream contexts)
declare(strict_types = 1)
;
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// CORS básico
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-goog-api-key');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Fallo interno en PHP', 'details' => $e['message']]);
    }
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

// ===== API KEY: config.php + cascade (patrón dibujo_lineas) =====
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

$raw = file_get_contents('php://input') ?: '';
$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido.', 'raw' => $raw]);
    exit;
}

$BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
$action = (string)($req['action'] ?? 'generate_image');

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

// ===== Lista blanca exacta de modelos de imagen (FLUX fuera) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
];

/**
 * Función auxiliar para hacer peticiones HTTP sin cURL
 */
function make_request($url, $method = 'GET', $headers = [], $body = null)
{
    if ($body !== null && !in_array('Content-Type: application/json', $headers)) {
        $headers[] = 'Content-Type: application/json';
    }

    $opts = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 120
        ]
    ];

    if ($body !== null) {
        $opts['http']['content'] = is_string($body) ? $body : json_encode($body);
    }

    $context = stream_context_create($opts);
    $response = file_get_contents($url, false, $context);

    $status = 0;
    foreach ($http_response_header as $h) {
        if (preg_match('{^HTTP\/\S*\s(\d{3})}', $h, $match)) {
            $status = (int)$match[1];
        }
    }

    // Devolver formato de los headers igual a cURL
    $contentType = 'application/json';
    foreach ($http_response_header as $h) {
        if (stripos($h, 'Content-Type:') === 0) {
            $contentType = trim(substr($h, 13));
        }
    }

    return [
        'status' => (int)$status,
        'body' => $response,
        'contentType' => $contentType
    ];
}

// ─── ACCIÓN: Generar imagen (OpenAI 2.5 o Gemini, lista blanca) ───
if ($action === 'generate_image') {
    $reqModel = strtolower((string)($req['model'] ?? 'openai-medium'));
    if (!isset($modelCatalog[$reqModel])) {
        http_response_code(400);
        echo json_encode(['error' => 'Modelo no soportado.']);
        exit;
    }
    $selected = $modelCatalog[$reqModel];

    // ─── BACKEND: OPENAI GPT IMAGE 2.5 (con o sin imagen de referencia) ───
    if ($selected['backend'] === 'openai') {
        if ($openaiKey === '') {
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
            exit;
        }
        $prompt = trim((string)($req['prompt'] ?? ''));
        if ($prompt === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Falta el prompt.']);
            exit;
        }
        $fields = ['model' => $selected['model'], 'prompt' => $prompt, 'quality' => $selected['quality'], 'size' => '1024x1024'];
        $endpointOai = 'https://api.openai.com/v1/images/generations';
        $headers = ['Authorization: Bearer ' . $openaiKey, 'Content-Type: application/json'];
        $postFields = json_encode($fields);
        $tmp = null;
        $imageB64 = (string)($req['base64ImageData'] ?? '');
        if ($imageB64 !== '') {
            $mime = (string)($req['mimeType'] ?? 'image/jpeg');
            $binary = base64_decode($imageB64, true);
            if ($binary === false || $binary === '') {
                http_response_code(400);
                echo json_encode(['error' => 'Imagen de referencia no válida.']);
                exit;
            }
            $tmp = tempnam(sys_get_temp_dir(), 'openai_img_');
            if ($tmp === false || file_put_contents($tmp, $binary) === false) {
                if ($tmp !== false) @unlink($tmp);
                http_response_code(500);
                echo json_encode(['error' => 'No se pudo preparar la imagen para OpenAI.']);
                exit;
            }
            $ext = stripos($mime, 'png') !== false ? 'png' : (stripos($mime, 'webp') !== false ? 'webp' : 'jpg');
            $fields['image[]'] = new CURLFile($tmp, $mime, 'referencia.' . $ext);
            $endpointOai = 'https://api.openai.com/v1/images/edits';
            $headers = ['Authorization: Bearer ' . $openaiKey];
            $postFields = $fields;
        }
        $ch = curl_init($endpointOai);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 180,
            CURLOPT_CONNECTTIMEOUT => 20,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($tmp !== null) @unlink($tmp);
        if ($err) {
            http_response_code(502);
            echo json_encode(['error' => ['message' => 'Error de conexion con OpenAI: ' . $err]]);
            exit;
        }
        $data = json_decode($resp, true);
        if ($code >= 400 || isset($data['error'])) {
            $msg = $data['error']['message'] ?? ('HTTP ' . $code);
            if (is_array($msg)) $msg = json_encode($msg);
            http_response_code($code >= 400 ? $code : 502);
            echo json_encode(['error' => ['message' => 'OpenAI: ' . $msg]]);
            exit;
        }
        $b64 = (string)($data['data'][0]['b64_json'] ?? '');
        $mimeOut = 'image/png';
        if ($b64 === '' && !empty($data['data'][0]['url'])) {
            $ch = curl_init((string)$data['data'][0]['url']);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
            $download = curl_exec($ch);
            $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);
            if (is_string($download) && $download !== '') {
                $b64 = base64_encode($download);
                if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeOut = $downloadType;
            }
        }
        if ($b64 === '') {
            http_response_code(502);
            echo json_encode(['error' => ['message' => 'OpenAI no devolvio ninguna imagen.']]);
            exit;
        }
        echo json_encode(['image' => $b64, 'mimeType' => $mimeOut]);
        exit;
    }

    // ─── BACKEND: GEMINI (Google directo, clave A) — conservado tal cual ───
    $model = $selected['model'];
    $endpoint = "{$BASE_URL}/models/{$model}:generateContent?key={$API_KEY}";

    if (isset($req['contents'])) {
        $payload = ['contents' => $req['contents']];
        if (isset($req['generationConfig']))
            $payload['generationConfig'] = $req['generationConfig'];
    }
    else {
        $prompt = trim((string)($req['prompt'] ?? ''));
        $imageB64 = (string)($req['base64ImageData'] ?? '');
        $mime = (string)($req['mimeType'] ?? 'image/jpeg');

        $payload = [
            'contents' => [[
                    'parts' => [
                        ['text' => $prompt],
                        ['inlineData' => [
                                'mimeType' => $mime,
                                'data' => $imageB64
                            ]]
                    ]
                ]],
            'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']]
        ];
    }

    $res = make_request($endpoint, 'POST', [], $payload);
    http_response_code($res['status']);
    header('Content-Type: ' . $res['contentType']);
    echo $res['body'];
    exit;
}

// ─── ACCIÓN: Iniciar generación de vídeo con Veo ────────────
if ($action === 'generate_video') {
    $model = (string)($req['model'] ?? 'veo-3.1-generate-preview');
    $prompt = trim((string)($req['prompt'] ?? 'Cinematic product video'));
    $imageB64 = (string)($req['base64ImageData'] ?? '');
    $mime = (string)($req['mimeType'] ?? 'image/png');
    $aspectRatio = (string)($req['aspectRatio'] ?? '16:9');

    $endpoint = "{$BASE_URL}/models/{$model}:predictLongRunning";

    $instance = ['prompt' => $prompt];

    if ($imageB64 !== '') {
        $instance['image'] = [
            'mimeType' => $mime,
            'bytesBase64Encoded' => $imageB64
        ];
    }

    $payload = [
        'instances' => [$instance],
        'parameters' => [
            'aspectRatio' => $aspectRatio
        ]
    ];

    if (isset($req['generateAudio']) && $req['generateAudio'] === true) {
        $audioPromptExt = isset($req['audioPrompt']) && trim($req['audioPrompt']) !== '' ? "\n[AUDIO REQUIREMENT]: " . trim($req['audioPrompt']) . "\n" : "";
        $payload['instances'][0]['prompt'] .= $audioPromptExt;
    }

    $res = make_request($endpoint, 'POST', ["x-goog-api-key: {$API_KEY}"], $payload);

    if ($res['status'] !== 200) {
        file_put_contents('logs.txt', date('Y-m-d H:i:s') . "\nEndpoint: $endpoint\nPayload: " . json_encode($payload) . "\nStatus: " . $res['status'] . "\nResponse: " . $res['body'] . "\n\n", FILE_APPEND);
    }

    http_response_code($res['status']);
    header('Content-Type: ' . $res['contentType']);
    echo $res['body'];
    exit;
}

// ─── ACCIÓN: Poll estado de operación Veo ────────────────────
if ($action === 'poll_video') {
    $operationName = (string)($req['operationName'] ?? '');
    if ($operationName === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta operationName.']);
        exit;
    }

    $endpoint = "{$BASE_URL}/{$operationName}";
    $res = make_request($endpoint, 'GET', ["x-goog-api-key: {$API_KEY}"]);

    http_response_code($res['status']);
    header('Content-Type: ' . $res['contentType']);
    echo $res['body'];
    exit;
}

// ─── ACCIÓN: Descargar vídeo generado ────────────────────────
if ($action === 'download_video') {
    $videoUri = (string)($req['videoUri'] ?? '');
    if ($videoUri === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta videoUri.']);
        exit;
    }

    $separator = (strpos($videoUri, '?') === false) ? '?' : '&';
    $downloadUrl = $videoUri . $separator . "key={$API_KEY}";

    $opts = [
        'http' => [
            'method' => 'GET',
            'ignore_errors' => true,
            'timeout' => 120
        ]
    ];
    $context = stream_context_create($opts);
    $videoBytes = file_get_contents($downloadUrl, false, $context);

    $status = 0;
    foreach ($http_response_header as $h) {
        if (preg_match('{^HTTP\/\S*\s(\d{3})}', $h, $match)) {
            $status = (int)$match[1];
        }
    }

    $contentType = 'video/mp4';
    foreach ($http_response_header as $h) {
        if (stripos($h, 'Content-Type:') === 0) {
            $contentType = trim(substr($h, 13));
        }
    }

    if ($status >= 200 && $status < 300 && $videoBytes !== false) {
        $b64 = base64_encode($videoBytes);
        echo json_encode([
            'videoBase64' => $b64,
            'mimeType' => $contentType
        ]);
    }
    else {
        http_response_code($status ?: 500);
        echo json_encode(['error' => 'No se pudo descargar el vídeo.', 'httpCode' => $status, 'body' => $videoBytes]);
    }
    exit;
}

// Acción no reconocida
http_response_code(400);
echo json_encode(['error' => "Acción no reconocida: {$action}"]);
