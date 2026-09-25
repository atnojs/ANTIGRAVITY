<?php
// Proxy Gemini — PHP 8+, cURL habilitado.
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
// (La comprobación de la clave Gemini se hace en la ruta que la necesita;
//  los modelos de texto MiMo usan la clave OpenRouter R y no requieren A.)

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

// Normaliza el formato {data:{contents}} que envía el frontend
if (isset($req['data']) && is_array($req['data']) && !isset($req['contents']) && !isset($req['payload'])) {
    $req = array_merge($req, $req['data']);
}

// Modelo (por defecto: MiMo 2.6 Pro — modelo de texto/análisis del parque)
$model = (string)($req['model'] ?? 'xiaomi/mimo-v2.6-pro');
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

// ===== Modelos de texto/análisis (MiMo) vía OpenRouter (clave R) =====
$isTextModel = (strpos($model, 'xiaomi/') === 0) || $model === 'gemini-3.8-flash';
if ($isTextModel) {
    $orKey = getenv('R') ?: getenv('REDIRECT_R') ?: ($_SERVER['R'] ?? '') ?: ($_SERVER['REDIRECT_R'] ?? '') ?: ($_ENV['R'] ?? '');
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }
    $mimoModel = strpos($model, 'xiaomi/') === 0 ? $model : 'xiaomi/mimo-v2.6-pro';

    // Gemini contents/parts → mensajes multimodales OpenRouter
    $content = [];
    $parts = $req['contents'][0]['parts'] ?? ($req['payload']['contents'][0]['parts'] ?? null);
    if (is_array($parts)) {
        foreach ($parts as $part) {
            if (!empty($part['text'])) {
                $content[] = ['type' => 'text', 'text' => (string)$part['text']];
            } elseif (!empty($part['inlineData']['data'])) {
                $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . ((string)($part['inlineData']['mimeType'] ?? 'image/jpeg')) . ';base64,' . (string)$part['inlineData']['data']]];
            }
        }
    } else {
        $textPrompt = (string)($req['prompt'] ?? '');
        $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
        if ($textPrompt === '') {
            http_response_code(400);
            echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
            exit;
        }
        if ($imageB64 !== '') {
            $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . ((string)($req['mimeType'] ?? 'image/jpeg')) . ';base64,' . $imageB64]];
        }
        $content[] = ['type' => 'text', 'text' => $textPrompt];
    }
    if ($content === []) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey],
        CURLOPT_POSTFIELDS => json_encode(['model' => $mimoModel, 'messages' => [['role' => 'user', 'content' => $content]], 'max_tokens' => 2000], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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

    $text = $data['choices'][0]['message']['content'] ?? '';
    if (is_array($text)) {
        $text = implode('', array_map(static function ($p) { return is_array($p) ? (string)($p['text'] ?? '') : (string)$p; }, $text));
    }

    // Formato Gemini para el frontend + modelo usado (contrato del parque)
    echo json_encode([
        'model' => $mimoModel,
        'candidates' => [[
            'content' => ['role' => 'model', 'parts' => [['text' => (string)$text]]],
            'finishReason' => 'STOP'
        ]]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

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

if ($API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
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
