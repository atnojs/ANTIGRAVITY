<?php
/**
 * PROXY UNIFICADO — Upscaler Pro
 * Soporta FLUX 2 Pro/Max (BFL, clave F) + Gemini via OpenRouter (clave R).
 * Contrato: recibe {imageData, mimeType, prompt, model?, task?}
 *           responde  {success:true, imageUrl, model}  o  {image, mimeType}
 * FLUX = async (submit+poll), Gemini = sync via OpenRouter.
 */
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

// ===== Resolución de claves API =====
function resolveKey(string $name): string {
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        include $configFile;
        $key = defined($name) ? constant($name) : '';
        if (!empty($key)) return (string)$key;
    }
    foreach ([
        getenv($name),
        getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '',
        $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '',
        $_ENV['REDIRECT_' . $name] ?? ''
    ] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$FLUX_KEY = resolveKey('F');      // BFL API key
$OR_KEY   = resolveKey('R');      // OpenRouter API key

// ===== Entrada =====
$raw = file_get_contents('php://input') ?: '';
if (empty($raw)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío.']]);
    exit;
}
$req = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido.']]);
    exit;
}

$task = $req['task'] ?? '';
$modelParam = strtolower((string)($req['model'] ?? 'gemini-flash'));

// ===== Determinar backend =====
$backend = 'gemini';
$fluxEndpoint = 'flux-2-pro';
$geminiModelId = 'google/gemini-3-pro-image';

if (strpos($modelParam, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif (strpos($modelParam, 'flux-pro') !== false || $modelParam === 'flux-2-pro') {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-pro';
} elseif (strpos($modelParam, 'flash') !== false) {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3.1-flash-image';
}
// Valores omitidos o desconocidos → Gemini 3 Pro (default canónico)

// ===== Extraer imagen y prompt =====
$imageData = (string)($req['imageData'] ?? '');
$mimeType  = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt    = trim((string)($req['prompt'] ?? ''));

// Si no hay prompt explícito, usar uno por defecto para enhance
if ($prompt === '') {
    $prompt = 'Enhance this image: improve sharpness, detail, and overall quality while preserving the original content exactly. Do not add or remove any elements.';
}

// ===== Validar imagen =====
if ($imageData !== '') {
    $decoded = base64_decode($imageData);
    if ($decoded === false || strlen($decoded) > 5000000) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 5MB).']]);
        exit;
    }
}

// ===== Si es tarea 'enhance' y backend es gemini, usar API directa de Gemini (más rápido para edición) =====
if ($task === 'enhance' && $backend === 'gemini' && $imageData !== '') {
    // Usar API directa de Gemini para edición fiel (mejor que OpenRouter para enhance)
    $gKey = resolveKey('A'); // clave A para Gemini directo
    if ($gKey === '') {
        // Fallback: usar OpenRouter
        goto use_openrouter;
    }

    $model = 'gemini-3.1-flash-image-preview';
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($gKey);

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['inlineData' => ['data' => $imageData, 'mimeType' => $mimeType]],
                ['text' => $prompt]
            ]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.0
        ]
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $code = (int)(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
    curl_close($ch);

    if ($response === false || $code >= 400) {
        // Fallback a OpenRouter
        goto use_openrouter;
    }

    $data = json_decode($response, true);
    $imageB64 = null;
    $mime = 'image/png';
    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $p) {
            if (isset($p['inlineData']['data'])) {
                $imageB64 = $p['inlineData']['data'];
                $mime = $p['inlineData']['mimeType'] ?? 'image/png';
                break;
            }
        }
    }

    if ($imageB64) {
        echo json_encode([
            'success' => true,
            'imageUrl' => 'data:' . $mime . ';base64,' . $imageB64,
            'model' => $modelParam,
            'image' => $imageB64,
            'mimeType' => $mime
        ]);
        exit;
    }
    // Si no hay imagen, continuar con OpenRouter
}

use_openrouter:

// ====================================================================
// BACKEND: FLUX (BFL async: submit → poll → download)
// ====================================================================
if ($backend === 'flux') {
    if ($FLUX_KEY === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave FLUX (F) no configurada.']]);
        exit;
    }

    $payload = ['prompt' => $prompt, 'width' => 1024, 'height' => 1024];
    if ($imageData !== '') {
        $payload['input_image'] = $imageData;
    }

    // Submit
    $ch = curl_init('https://api.bfl.ai/v1/' . $fluxEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'accept: application/json',
            'x-key: ' . $FLUX_KEY
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error FLUX: ' . $err]]);
        exit;
    }
    if ($code !== 200) {
        $eb = json_decode($resp, true);
        $em = $eb['detail'] ?? ('HTTP ' . $code);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
        exit;
    }

    $submit = json_decode($resp, true);
    $pollUrl = $submit['polling_url'] ?? '';
    if ($pollUrl === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'FLUX sin polling_url']]);
        exit;
    }

    // Polling (hasta 90s)
    $imageUrl = '';
    for ($i = 0; $i < 90; $i++) {
        sleep(1);
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $FLUX_KEY],
            CURLOPT_TIMEOUT => 10,
        ]);
        $r2 = curl_exec($ch);
        curl_close($ch);
        $poll = json_decode($r2, true);
        if (($poll['status'] ?? '') === 'Ready' && !empty($poll['result']['sample'] ?? '')) {
            $imageUrl = $poll['result']['sample'];
            break;
        }
    }

    if ($imageUrl === '') {
        http_response_code(504);
        echo json_encode(['error' => ['message' => 'FLUX no terminó en 90s']]);
        exit;
    }

    // Download
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $imgBin = curl_exec($ch);
    curl_close($ch);

    echo json_encode([
        'success' => true,
        'imageUrl' => 'data:image/png;base64,' . base64_encode($imgBin),
        'model' => $fluxEndpoint
    ]);
    exit;
}

// ====================================================================
// BACKEND: GEMINI via OpenRouter (sync)
// ====================================================================
if ($OR_KEY === '') {
    // Fallback: intentar clave A (Gemini directo)
    $gKey = resolveKey('A');
    if ($gKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) y Gemini (A) no configuradas.']]);
        exit;
    }

    // Usar API directa de Gemini
    $model = 'gemini-3.1-flash-image-preview';
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($gKey);

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['inlineData' => ['data' => $imageData, 'mimeType' => $mimeType]],
                ['text' => $prompt]
            ]
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.0
        ]
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $code = (int)(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
    curl_close($ch);

    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error cURL Gemini: ' . curl_error($ch)]]);
        exit;
    }

    $data = json_decode($response, true);
    if ($code >= 400) {
        $msg = $data['error']['message'] ?? 'HTTP ' . $code;
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'Gemini Error: ' . $msg]]);
        exit;
    }

    $imageB64 = null;
    $mime = 'image/png';
    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $p) {
            if (isset($p['inlineData']['data'])) {
                $imageB64 = $p['inlineData']['data'];
                $mime = $p['inlineData']['mimeType'] ?? 'image/png';
                break;
            }
        }
    }

    if ($imageB64) {
        echo json_encode([
            'success' => true,
            'imageUrl' => 'data:' . $mime . ';base64,' . $imageB64,
            'model' => $modelParam,
            'image' => $imageB64,
            'mimeType' => $mime
        ]);
    } else {
        http_response_code(422);
        echo json_encode(['error' => ['message' => 'Gemini no devolvió imagen.']]);
    }
    exit;
}

// OpenRouter Gemini
$mime = $mimeType;
$b64 = $imageData;
if (strpos($b64, ',') !== false) {
    $b64 = substr($b64, strpos($b64, ',') + 1);
}

$content = [
    ['type' => 'text', 'text' => $prompt],
    ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
];

$payload = [
    'model' => $geminiModelId,
    'modalities' => ['image', 'text'],
    'messages' => [['role' => 'user', 'content' => $content]],
    'max_tokens' => 8000,
];

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OR_KEY,
    ],
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Error OpenRouter: ' . $err]]);
    exit;
}
if ($code >= 400) {
    $eb = json_decode($resp, true);
    $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
    if (is_array($em)) $em = json_encode($em);
    http_response_code($code);
    echo json_encode(['error' => ['message' => 'OpenRouter: ' . $em]]);
    exit;
}

$jr = json_decode($resp, true);
$images = $jr['choices'][0]['message']['images'] ?? [];
if (empty($images)) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Gemini no devolvió imagen.']]);
    exit;
}
$imgDataUrl = $images[0]['image_url']['url'] ?? '';
if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Gemini devolvió URL en lugar de imagen.']]);
    exit;
}
$imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);

echo json_encode([
    'success' => true,
    'imageUrl' => 'data:image/png;base64,' . $imgB64,
    'model' => $geminiModelId,
]);
