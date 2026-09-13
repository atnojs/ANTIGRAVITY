<?php
// ============================================================
// PROXY UNIFICADO — OpenAI Image 2.5 (5 calidades) + Gemini
// (Google directo, clave A por entorno).
// Selector: openai-medium / openai-high / openai-xhigh /
// openai-max-flare / openai-max-sunburst / gemini-flash /
// gemini-pro. FLUX rechazado (400 "Modelo no soportado").
// Respuesta SIEMPRE en formato Gemini (candidates) para no
// tocar los frontends existentes.
// Claves: SOLO entorno (getenv/REDIRECT_/$_SERVER/$_ENV).
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

// ===== Claves SOLO por entorno (patrón .htaccess de Hostinger) =====
function getKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$API_KEY = getKey('A'); // Gemini directo (Google AI)
$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');

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

// ===== Selección de modelo (lista blanca) =====
$requested = strtolower(trim((string)($req['model'] ?? 'openai-medium')));
// Alias legacy de IDs completos de Google (flujos antiguos conservados).
if ($requested === 'gemini-3.1-flash-image-preview' || $requested === 'gemini-3.1-flash-image') $requested = 'gemini-flash';
if ($requested === 'gemini-3-pro-image-preview' || $requested === 'gemini-3-pro-image' || $requested === 'gemini-3-pro') $requested = 'gemini-pro';
// Modelo de TEXTO/VISIÓN (spec §6): passthrough directo a Google.
$textModel = '';
if ($requested === 'google/gemini-3.8-flash' || $requested === 'gemini-3.8-flash') $textModel = 'gemini-3.8-flash';

if ($textModel === '' && !isset($modelCatalog[$requested])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}

// ===== Utilidades =====
function normalizeImage(string $data): array
{
    $mime = 'image/jpeg';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $data, $m) === 1) {
        $mime = strtolower($m[1]);
        $data = substr($data, strpos($data, ',') + 1);
    }
    $binary = base64_decode($data, true);
    if ($binary === false || $binary === '') throw new InvalidArgumentException('Imagen base64 inválida.');
    if (strlen($binary) > 2500000) throw new LengthException('Imagen demasiado grande (máximo 2.5MB).');
    return [$binary, $mime];
}

function openAiSize(string $ratio): string
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

function mergeImagesSideBySide(array $binaries): ?string
{
    if (count($binaries) === 0) return null;
    if (count($binaries) === 1) return $binaries[0];
    if (!function_exists('imagecreatefromstring')) return null;
    $imgs = [];
    foreach ($binaries as $binary) {
        $im = @imagecreatefromstring($binary);
        if ($im === false) return null;
        $imgs[] = $im;
    }
    $width = 0;
    $height = 1;
    foreach ($imgs as $im) {
        $width += imagesx($im);
        $height = max($height, imagesy($im));
    }
    $canvas = imagecreatetruecolor($width, $height);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledrectangle($canvas, 0, 0, $width, $height, $white);
    $x = 0;
    foreach ($imgs as $im) {
        imagecopy($canvas, $im, $x, 0, 0, 0, imagesx($im), imagesy($im));
        $x += imagesx($im);
        imagedestroy($im);
    }
    ob_start();
    imagejpeg($canvas, null, 92);
    $out = ob_get_clean();
    imagedestroy($canvas);
    return is_string($out) && $out !== '' ? $out : null;
}

function sendGeminiStyleImage(string $binary, string $mimeType = 'image/png'): void
{
    echo json_encode([
        'candidates' => [[
            'content' => ['parts' => [['inlineData' => ['data' => base64_encode($binary), 'mimeType' => $mimeType]]]],
        ]],
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// ===== Extracción de prompt e imágenes (varios formatos de frontend) =====
$prompt = trim((string)($req['prompt'] ?? ''));
$images = [];
if (isset($req['contents'][0]['parts']) && is_array($req['contents'][0]['parts'])) {
    foreach ($req['contents'][0]['parts'] as $part) {
        if (!is_array($part)) continue;
        if ($prompt === '' && !empty($part['text'])) $prompt = trim((string)$part['text']);
        if (!empty($part['inlineData']['data'])) {
            $images[] = ['data' => (string)$part['inlineData']['data'], 'mimeType' => (string)($part['inlineData']['mimeType'] ?? 'image/jpeg')];
        }
    }
}
$legacyImage = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
if ($legacyImage !== '' && $images === []) {
    $images[] = ['data' => $legacyImage, 'mimeType' => (string)($req['mimeType'] ?? 'image/jpeg')];
}

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2.5 (Images API)
// ====================================================================
if (isset($modelCatalog[$requested]) && $modelCatalog[$requested]['backend'] === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']]);
        exit;
    }
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    $selected = $modelCatalog[$requested];
    $aspect = (string)($req['generationConfig']['imageConfig']['aspectRatio'] ?? $req['aspectRatio'] ?? '1:1');
    $endpoint = 'https://api.openai.com/v1/images/generations';
    $fields = ['model' => $selected['model'], 'prompt' => $prompt, 'quality' => $selected['quality'], 'size' => openAiSize($aspect)];
    $headers = ['Authorization: *** ' . $openaiKey, 'Content-Type: application/json'];
    $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmpPath = null;

    if ($images !== []) {
        try {
            $binaries = [];
            $mime = 'image/jpeg';
            foreach ($images as $img) {
                [$binary, $imgMime] = normalizeImage($img['data']);
                $binaries[] = $binary;
                $mime = $imgMime;
            }
            $reference = mergeImagesSideBySide($binaries);
            if ($reference === null) throw new RuntimeException('No se pudo preparar la imagen de referencia.');
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => $e->getMessage()]]);
            exit;
        }
        $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
        if ($tmpPath === false || file_put_contents($tmpPath, $reference) === false) {
            if ($tmpPath !== false) @unlink($tmpPath);
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
            exit;
        }
        $ext = str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg');
        $fields['image[]'] = new CURLFile($tmpPath, $mime, 'referencia.' . $ext);
        $endpoint = 'https://api.openai.com/v1/images/edits';
        $headers = ['Authorization: *** ' . $openaiKey];
        $postFields = $fields;
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => $headers,
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

    sendGeminiStyleImage(base64_decode($imageData), $mimeOut);
}

// ====================================================================
// BACKEND: GEMINI (Google directo, passthrough SIN cambios)
// ====================================================================
if ($API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}

$model = $textModel !== '' ? $textModel : $modelCatalog[$requested]['model'];
$endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . urlencode($API_KEY);

// Passthrough RAW: se reenvía el cuerpo original tal cual a Google
// (comportamiento heredado de este proxy).
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $requestBody,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($requestBody)
    ],
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
