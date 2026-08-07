<?php
// ============================================================
// PROXY PHP — Copiar Estilo (dual-backend)
// Soporta FLUX 2 Pro/Max (BFL, clave F) + Gemini via OpenRouter (clave R).
// Mantiene compatibilidad con análisis Gemini texto (passthrough).
// FLUX = asíncrono (submit+poll), Gemini = síncrono (OpenRouter).
// ============================================================
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

// ===== Resolución de claves: F (FLUX-BFL) y R (OpenRouter) y A (Gemini directa, legacy) =====
function resolveKey(string $name): string {
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        include $configFile;
        $k = defined($name) ? constant($name) : '';
        if (!empty($k)) return (string)$k;
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

$fluxKey = resolveKey('F');
$orKey   = resolveKey('R');
$geminiDirectKey = resolveKey('A'); // legacy Gemini directa (para análisis texto)

// ===== Entrada =====
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

// ===== MODO PASSTHROUGH: análisis de texto Gemini (legacy, backward compat) =====
// Si viene con 'contents' y responseModalities es solo TEXT, usar Gemini directa.
if (isset($req['contents'])) {
    $genConfig = $req['generationConfig'] ?? [];
    $modalities = $genConfig['responseModalities'] ?? [];
    $isTextOnly = !in_array('IMAGE', $modalities, true);

    if ($isTextOnly) {
        // ---- Gemini directa (análisis de texto, sin cambios) ----
        if ($geminiDirectKey === '') {
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'API key de Gemini (A) no configurada.']]);
            exit;
        }

        $model = (string)($req['model'] ?? 'gemini-2.5-flash');
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($geminiDirectKey);

        $payload = ['contents' => $req['contents']];
        if (!empty($genConfig)) {
            $payload['generationConfig'] = $genConfig;
        }

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

        http_response_code((int)$httpcode);
        echo $response;
        exit;
    }
    // Si viene con IMAGE en modalities, cae al nuevo flujo dual-backend
}

// ===== MODO IMAGEN: dual-backend FLUX + Gemini =====
// Contrato: {model, image, mimeType, prompt?}
$imageB64 = (string)($req['image'] ?? $req['base64ImageData'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');

// Si viene en formato contents (con IMAGE), extraer imagen y prompt
if (isset($req['contents']) && $imageB64 === '') {
    $parts = $req['contents'][0]['parts'] ?? [];
    foreach ($parts as $part) {
        if (isset($part['inlineData']['data'])) {
            $imageB64 = $part['inlineData']['data'];
            $mimeType = $part['inlineData']['mimeType'] ?? 'image/jpeg';
        }
        if (isset($part['text'])) {
            $prompt = $part['text'];
        }
    }
}

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen.']]);
    exit;
}

// Validación tamaño
$imgBinary = base64_decode($imageB64);
if ($imgBinary === false || strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

// Preparar base64 puro (sin prefijo data:)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// ===== Selección de modelo =====
$reqModel = strtolower((string)($req['model'] ?? 'flux-pro'));
$backend = null;
$geminiModel = 'google/gemini-3.1-flash-image';
$fluxEndpoint = 'flux-2-pro';

if (strpos($reqModel, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif (strpos($reqModel, 'gemini') !== false && strpos($reqModel, 'pro') !== false) {
    $backend = 'gemini';
    $geminiModel = 'google/gemini-3-pro-image';
} elseif (strpos($reqModel, 'gemini') !== false || strpos($reqModel, 'flash') !== false) {
    $backend = 'gemini';
    $geminiModel = 'google/gemini-3.1-flash-image';
} else {
    // 'flux-pro', 'flux', 'pro' -> flux-2-pro
    $backend = 'flux';
}

// ====================================================================
// BACKEND: FLUX (BFL async)
// ====================================================================
if ($backend === 'flux') {
    if ($fluxKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave FLUX (F) no configurada.']]);
        exit;
    }

    $payload = [
        'prompt'      => $prompt !== '' ? $prompt : 'Apply the style and composition of the reference image to the subject image. Maintain the exact scene, lighting, camera angle, and atmosphere from the reference, but replace the person with the subject. High quality photorealistic result.',
        'input_image' => $imageB64,
    ];

    // 1) Submit
    $ch = curl_init('https://api.bfl.ai/v1/' . $fluxEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'accept: application/json',
            'x-key: ' . $fluxKey,
        ],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexión FLUX: ' . $err]]);
        exit;
    }
    if ($code !== 200) {
        $eb = json_decode($resp, true);
        $em = $eb['detail'] ?? $eb['error'] ?? ('HTTP ' . $code);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
        exit;
    }

    $submit = json_decode($resp, true);
    $pollUrl = $submit['polling_url'] ?? '';
    if ($pollUrl === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url']]);
        exit;
    }

    // 2) Polling (max 90s)
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) {
        sleep(1);
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['accept: application/json', 'x-key: ' . $fluxKey],
            CURLOPT_TIMEOUT        => 10,
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

    // 3) Download
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $imgBin = curl_exec($ch);
    curl_close($ch);

    echo json_encode([
        'image'    => base64_encode($imgBin),
        'mimeType' => 'image/png',
    ]);
    exit;
}

// ====================================================================
// BACKEND: GEMINI (OpenRouter sync)
// ====================================================================
if ($backend === 'gemini') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }

    $content = [
        ['type' => 'text', 'text' => $prompt !== '' ? $prompt : 'Apply the style of the reference image to the subject image.'],
        ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]],
    ];

    $payload = [
        'model'      => $geminiModel,
        'modalities' => ['image', 'text'],
        'messages'   => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexión OpenRouter: ' . $err]]);
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
        'image'    => base64_encode(base64_decode($imgB64)),
        'mimeType' => 'image/png',
    ]);
    exit;
}

// Modelo no reconocido
http_response_code(400);
echo json_encode(['error' => ['message' => 'Modelo no soportado. Usa flux-pro, flux-max, gemini-flash o gemini-pro.']]);
