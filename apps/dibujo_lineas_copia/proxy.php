<?php
// ============================================================
// PROXY UNIFICADO — Imágenes a Lineales
// Soporta FLUX (BFL, async polling) y Gemini (síncrono).
// Claves: 'F' para FLUX, 'G' para Gemini (desde .htaccess raíz).
// Parámetro 'model' en el body: 'flux' (default) o 'gemini'.
// Contrato de respuesta: {image, mimeType} o {error: {message}}
// ============================================================
header('Content-Type: application/json');

// ===== Carga de config.php (si existe) =====
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) { include $configFile; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacio']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON invalido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$model    = (string)($req['model'] ?? 'flux');

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen']]);
    exit;
}

// --- SEGURIDAD: control de tamaño ---
$imgBinary = base64_decode($imageB64);
if (strlen($imgBinary) > 2500000) { // ~2.5MB
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

$prompt = (string)($req['prompt'] ?? "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page. Convert all visual elements (people, objects, backgrounds) into consistent, smooth, distinct black outlines using clean uniform lines. Completely eliminate all colors, gradients, shading, textures and gray fills: the result must be purely black lines on a pure white background. Simplify complex shapes to create clear areas of white space that are easy to color. Maintain the original composition, perspective and key elements. The final drawing must be sharp, without artifacts or smudges, ready to be printed and hand-colored.");

// ============================================================
// RUTA GEMINI (síncrono)
// ============================================================
if ($model === 'gemini') {
    handleGemini($imageB64, $mimeType, $prompt);
    exit;
}

// ============================================================
// RUTA FLUX (async polling, default)
// ============================================================
handleFlux($imageB64, $prompt);
exit;


// ─── FUNCIONES ──────────────────────────────────────────────

function getApiKey($name) {
    $key = '';
    if (defined($name)) $key = constant($name);
    if (!$key || empty($key)) $key = getenv($name);
    if (!$key || empty($key)) $key = getenv('REDIRECT_' . $name);
    if (!$key || empty($key)) $key = $_SERVER[$name] ?? '';
    if (!$key || empty($key)) $key = $_SERVER['REDIRECT_' . $name] ?? '';
    if (!$key || empty($key)) $key = $_ENV[$name] ?? '';
    if (!$key || empty($key)) $key = $_ENV['REDIRECT_' . $name] ?? '';
    return $key;
}

function handleGemini($imageB64, $mimeType, $prompt) {
    $apiKey = getApiKey('G');
    if (!$apiKey || empty($apiKey)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de Gemini (G) no configurada.']]);
        exit;
    }

    $model = 'gemini-2.0-flash';
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($apiKey);

    $payload = [
        'contents' => [[
            'parts' => [
                ['text' => $prompt],
                ['inlineData' => ['mimeType' => $mimeType, 'data' => $imageB64]]
            ]
        ]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT'],
            'imageConfig' => [
                'imageSize' => '1K'
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Error cURL (Gemini): ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpcode >= 400 || isset($data['error'])) {
        http_response_code($httpcode ?: 500);
        $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
        echo json_encode(['error' => ['message' => 'Gemini: ' . $msg]]);
        exit;
    }

    $candidates = $data['candidates'] ?? [];
    $imageData = '';
    $mimeOut = 'image/png';
    $texts = [];

    foreach ($candidates as $cand) {
        foreach ($cand['content']['parts'] ?? [] as $part) {
            if (isset($part['inlineData'])) {
                $imageData = $part['inlineData']['data'] ?? '';
                $mimeOut = $part['inlineData']['mimeType'] ?? 'image/png';
            }
            if (isset($part['text']) && !empty($part['text'])) {
                $texts[] = $part['text'];
            }
        }
    }

    if ($imageData === '') {
        echo json_encode([
            'text' => implode("\n", $texts) ?: 'Gemini no generó imagen ni texto.'
        ]);
        exit;
    }

    echo json_encode([
        'image'    => $imageData,
        'mimeType' => $mimeOut
    ]);
}

function handleFlux($imageB64, $prompt) {
    $apiKey = getApiKey('F');
    if (!$apiKey || empty($apiKey)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de FLUX (F) no configurada.']]);
        exit;
    }

    // ===== MODELO FLUX: flux-2-max (MAX quality, máxima fidelidad ~$0.07) =====
    $endpoint = 'flux-2-max';

    $payload = [
        'prompt'      => $prompt,
        'input_image' => $imageB64,
    ];

    // ===== 1) ENVIAR TAREA =====
    $submitUrl = 'https://api.bfl.ai/v1/' . $endpoint;
    $ch = curl_init($submitUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'accept: application/json',
            'x-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $submitResp = curl_exec($ch);
    $submitCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión con FLUX: ' . curl_error($ch)]]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);

    if ($submitCode >= 400) {
        $eb = json_decode($submitResp, true);
        $em = $eb['detail'] ?? ('HTTP ' . $submitCode);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($submitCode);
        echo json_encode(['error' => ['message' => 'FLUX: ' . $em]]);
        exit;
    }

    $submit = json_decode($submitResp, true);
    $pollUrl = $submit['polling_url'] ?? '';
    if ($pollUrl === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url']]);
        exit;
    }

    // ===== 2) POLLING hasta Ready (máx ~90s) =====
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) {
        usleep(1500000); // 1.5s
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $apiKey],
            CURLOPT_TIMEOUT => 20,
        ]);
        $pollResp = curl_exec($ch);
        $pollCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($pollCode !== 200) continue;
        $pr = json_decode($pollResp, true);
        $status = $pr['status'] ?? '';
        if ($status === 'Ready') {
            $imageUrl = $pr['result']['sample'] ?? '';
            break;
        }
        if (in_array($status, ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
            http_response_code(422);
            echo json_encode(['error' => ['message' => 'FLUX rechazó la tarea: ' . $status]]);
            exit;
        }
    }

    if ($imageUrl === '') {
        http_response_code(504);
        echo json_encode(['error' => ['message' => 'FLUX tardó demasiado. Inténtalo de nuevo.']]);
        exit;
    }

    // ===== 3) Descargar la imagen y devolverla como base64 =====
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $imgBin = curl_exec($ch);
    $imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
    $imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
    curl_close($ch);

    if (!$imgOk || $imgBin === false || $imgBin === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'No se pudo descargar la imagen de FLUX.']]);
        exit;
    }

    echo json_encode([
        'image'    => base64_encode($imgBin),
        'mimeType' => $imgType,
    ]);
}
