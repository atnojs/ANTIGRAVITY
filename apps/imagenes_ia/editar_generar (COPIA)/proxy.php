<?php
// Proxy Gemini + FLUX — PHP 8+, cURL habilitado.
// Soporta Gemini directo (clave A) + FLUX BFL async (clave F).
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

// ===== Helper: carga de claves (cascada config.php → env → REDIRECT_ → $_SERVER → $_ENV) =====
function loadKey(string $name): string {
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        include $configFile;
        $k = defined($name) ? constant($name) : '';
        if ($k !== '') return (string)$k;
    }
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
$FLUX_KEY   = loadKey('F');

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

// Detectar backend según el modelo
$modelParam = strtolower((string)($req['model'] ?? 'flux-pro'));

// ====================================================================
// BACKEND: FLUX (BFL) — async submit + poll
// ====================================================================
if (strpos($modelParam, 'flux') !== false) {
    if ($FLUX_KEY === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave FLUX (F) no configurada.']]);
        exit;
    }

    // Endpoint: flux-2-max si el modelo contiene 'max', sino flux-2-pro
    $fluxEndpoint = (strpos($modelParam, 'max') !== false) ? 'flux-2-max' : 'flux-2-pro';

    // Prompt
    $prompt = (string)($req['prompt'] ?? '');
    if ($prompt === '') {
        // Intentar extraer prompt de contents (formato Gemini)
        if (isset($req['contents'][0]['parts'])) {
            foreach ($req['contents'][0]['parts'] as $part) {
                if (isset($part['text'])) {
                    $prompt .= $part['text'] . ' ';
                }
            }
            $prompt = trim($prompt);
        }
    }
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Imagen de entrada (opcional, para edición / img2img)
    $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
    if ($imageB64 === '' && isset($req['contents'][0]['parts'])) {
        // Extraer imagen de formato Gemini contents
        foreach ($req['contents'][0]['parts'] as $part) {
            if (isset($part['inlineData']['data'])) {
                $imageB64 = $part['inlineData']['data'];
                break;
            }
        }
    }
    if ($imageB64 !== '') {
        // Limpiar prefijo data:URL si existe
        if (strpos($imageB64, ',') !== false) {
            $imageB64 = substr($imageB64, strpos($imageB64, ',') + 1);
        }
    }

    // Dimensiones según aspectRatio
    $aspectRatio = (string)($req['aspectRatio'] ?? ($req['generationConfig']['imageConfig']['aspectRatio'] ?? '1:1'));
    $width = 1024;
    $height = 1024;
    switch ($aspectRatio) {
        case '16:9': $height = 576; break;
        case '9:16': $width = 576; break;
        case '3:4':  $width = 768; break;
        case '21:9': $height = 439; break;
    }

    $payload = [
        'prompt' => $prompt,
        'width'  => $width,
        'height' => $height,
    ];
    if ($imageB64 !== '') {
        $payload['input_image'] = $imageB64;
    }

    // --- Submit ---
    $ch = curl_init('https://api.bfl.ai/v1/' . $fluxEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'accept: application/json',
            'x-key: ' . $FLUX_KEY,
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
        echo json_encode(['error' => ['message' => 'Error FLUX submit: ' . $err]]);
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
        echo json_encode(['error' => ['message' => 'FLUX no devolvió polling_url.']]);
        exit;
    }

    // --- Polling (hasta 60 s) ---
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) {
        sleep(1);
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['accept: application/json', 'x-key: ' . $FLUX_KEY],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $r2   = curl_exec($ch);
        curl_close($ch);
        $poll = json_decode($r2, true);
        if (($poll['status'] ?? '') === 'Ready' && !empty($poll['result']['sample'] ?? '')) {
            $imageUrl = $poll['result']['sample'];
            break;
        }
    }

    if ($imageUrl === '') {
        http_response_code(504);
        echo json_encode(['error' => ['message' => 'FLUX no terminó en 60s.']]);
        exit;
    }

    // --- Descargar imagen generada ---
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $imgBin = curl_exec($ch);
    curl_close($ch);

    echo json_encode([
        'success'  => true,
        'imageUrl' => 'data:image/png;base64,' . base64_encode($imgBin),
        'model'    => $fluxEndpoint,
    ]);
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
