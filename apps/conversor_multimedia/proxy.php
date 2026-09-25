<?php
/**
 * Proxy canónico Antigravity.
 * R = OpenRouter (texto/modelos compatibles).
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(130);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_BYTES = 12000;
const MAX_OUTPUT_PIXELS = 4194304;

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getSecret(string $name): string {
    if (is_file($config)) {
        include_once $config;
        if (defined($name) && is_string(constant($name)) && constant($name) !== '') {
            return trim((string)constant($name));
        }
    }
    $values = [
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ];
    foreach ($values as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function readJsonBody(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
        respond(413, ['success' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
    }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON válido.']);
    }
    return $data;
}

function requestJson(string $url, string $method, array $headers, ?array $body = null, int $timeout = 45): array {
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($body !== null) {
        $encoded = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) respond(500, ['success' => false, 'error' => 'No se pudo preparar la solicitud.']);
        $options[CURLOPT_POSTFIELDS] = $encoded;
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false) respond(502, ['success' => false, 'error' => 'Error conectando con el proveedor.', 'detail' => $error]);
    $json = json_decode($raw, true);
    if (!is_array($json)) respond(502, ['success' => false, 'error' => 'El proveedor devolvió una respuesta no válida.']);
    return [$status, $json];
}

function round32(float $value): int {
    return max(256, (int)(round($value / 32) * 32));
}

function dimensions(array $request): array {
    $allowed = [512, 1024, 2048, 4096];
    $resolution = (int)($request['resolution'] ?? 1024);
    if (!in_array($resolution, $allowed, true)) $resolution = 1024;
    $ratios = ['1:1'=>[1,1], '16:9'=>[16,9], '9:16'=>[9,16], '4:3'=>[4,3], '3:4'=>[3,4], '3:2'=>[3,2], '2:3'=>[2,3]];
    $ratio = (string)($request['aspectRatio'] ?? '1:1');
    [$rw, $rh] = $ratios[$ratio] ?? $ratios['1:1'];
    if (isset($request['width'], $request['height'])) {
        $width = round32((float)$request['width']);
        $height = round32((float)$request['height']);
    } elseif ($rw >= $rh) {
        $width = $resolution;
        $height = round32($resolution * $rh / $rw);
    } else {
        $height = $resolution;
        $width = round32($resolution * $rw / $rh);
    }
    $adjusted = false;
    if ($width * $height > MAX_OUTPUT_PIXELS) {
        $scale = sqrt(MAX_OUTPUT_PIXELS / ($width * $height));
        $width = round32($width * $scale);
        $height = round32($height * $scale);
        while ($width * $height > MAX_OUTPUT_PIXELS) {
            if ($width >= $height) $width -= 32; else $height -= 32;
        }
        $adjusted = true;
    }
    return [$width, $height, $ratio, $resolution, $adjusted];
}

function base64Image(string $value): string {
    $value = trim($value);
    if (preg_match('#^data:image/(?:png|jpe?g|webp);base64,#i', $value) === 1) {
        $value = substr($value, strpos($value, ',') + 1);
    }
    $binary = base64_decode($value, true);
    if ($binary === false) respond(400, ['success' => false, 'error' => 'Una imagen no contiene base64 válido.']);
    if (strlen($binary) > MAX_IMAGE_BYTES) respond(413, ['success' => false, 'error' => 'Una imagen supera 20 MB.']);
    return $value;
}

function getEnvKey(string $name): string {
    // Resolución SOLO por entorno (sin .htaccess raiz): getenv → REDIRECT_ → $_SERVER → $_ENV
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (is_string($v) && trim($v) !== '') return trim($v);
    }
    return '';
}

function openAiKey(): string {
    $key = getEnvKey('OPENAI_API_KEY');
    if ($key === '') $key = getEnvKey('O');
    return $key;
}

function openAiSizeFromRequest(array $request): string {
    $ratios = ['1:1'=>[1,1], '16:9'=>[16,9], '9:16'=>[9,16], '4:3'=>[4,3], '3:4'=>[3,4], '3:2'=>[3,2], '2:3'=>[2,3]];
    $ratio = (string)($request['aspectRatio'] ?? '1:1');
    [$rw, $rh] = $ratios[$ratio] ?? [1, 1];
    $width = $rw >= $rh ? 1024 : max(16, (int)(round(1024 * $rw / $rh / 16) * 16));
    $height = $rw >= $rh ? max(16, (int)(round(1024 * $rh / $rw / 16) * 16)) : 1024;
    while ($width * $height < 1048576) { $width += 16; }
    return $width . 'x' . $height;
}

// ===== Lista blanca exacta de modelos de imagen (lista cerrada) =====
function imageModelCatalog(): array {
    return [
        'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'medium'],
        'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'high'],
        'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
        'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare', 'quality' => 'max'],
        'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
        'gemini-flash'        => ['backend' => 'gemini', 'model' => 'google/gemini-3.1-flash-image'],
        'gemini-pro'          => ['backend' => 'gemini', 'model' => 'google/gemini-3-pro-image'],
    ];
}

function handleImageGenerate(array $request): void {
    $catalog = imageModelCatalog();
    $reqModel = strtolower((string)($request['model'] ?? 'openai-medium'));
    if (!isset($catalog[$reqModel])) {
        respond(400, ['success' => false, 'error' => 'Modelo no soportado.']);
    }
    $selected = $catalog[$reqModel];
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') respond(400, ['success' => false, 'error' => 'Falta el prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);
    $images = [];
    if (isset($request['image']) && is_string($request['image']) && trim($request['image']) !== '') $images[] = $request['image'];
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) if (is_string($image) && trim($image) !== '') $images[] = $image;
    }
    $images = array_slice($images, 0, 1);

    if ($selected['backend'] === 'openai') {
        $key = openAiKey();
        if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenAI (OPENAI_API_KEY/O) no está configurada.']);
        $fields = ['model' => $selected['model'], 'prompt' => $prompt, 'quality' => $selected['quality'], 'size' => openAiSizeFromRequest($request)];
        $endpoint = 'https://api.openai.com/v1/images/generations';
        $headers = ['Authorization: Bearer ' . $key, 'Content-Type: application/json'];
        $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $tmp = null;
        if ($images !== []) {
            $pure = base64Image($images[0]);
            $binary = base64_decode($pure, true);
            $mime = 'image/jpeg';
            if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $images[0], $m) === 1) $mime = strtolower($m[1]);
            $tmp = tempnam(sys_get_temp_dir(), 'openai_img_');
            if ($tmp === false || file_put_contents($tmp, $binary) === false) {
                if ($tmp !== false) @unlink($tmp);
                respond(500, ['success' => false, 'error' => 'No se pudo preparar la imagen para OpenAI.']);
            }
            $ext = str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg');
            $fields['image[]'] = new CURLFile($tmp, $mime, 'referencia.' . $ext);
            $endpoint = 'https://api.openai.com/v1/images/edits';
            $headers = ['Authorization: Bearer ' . $key];
            $postFields = $fields;
        }
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $postFields, CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => 20, CURLOPT_TIMEOUT => 180]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($tmp !== null) @unlink($tmp);
        if ($raw === false) respond(502, ['success' => false, 'error' => 'Error conectando con OpenAI: ' . $error]);
        $data = json_decode((string)$raw, true);
        if (!is_array($data) || $status < 200 || $status >= 300) {
            $message = is_array($data) ? (string)($data['error']['message'] ?? 'OpenAI no pudo completar la solicitud.') : 'OpenAI no pudo completar la solicitud.';
            respond($status >= 400 ? $status : 502, ['success' => false, 'error' => $message]);
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
        if ($b64 === '') respond(502, ['success' => false, 'error' => 'OpenAI no devolvió ninguna imagen.']);
        respond(200, [
            'success' => true, 'provider' => 'openai', 'model' => $selected['model'], 'quality' => $selected['quality'],
            'mimeType' => $mimeOut, 'image' => $b64, 'dataUrl' => 'data:' . $mimeOut . ';base64,' . $b64,
        ]);
    }

    // Gemini vía OpenRouter (clave R) — patrón canónico
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter (R) no está configurada.']);
    $content = [['type' => 'text', 'text' => $prompt]];
    foreach ($images as $image) {
        $pure = preg_replace('#^data:[^;]+;base64,#i', '', trim($image));
        $mime = 'image/jpeg';
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $image, $m) === 1) $mime = strtolower($m[1]);
        $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure]];
    }
    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key, 'Content-Type: application/json'
    ], [
        'model' => $selected['model'],
        'modalities' => ['image', 'text'],
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ], 180);
    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success' => false, 'error' => 'Gemini no pudo completar la solicitud.', 'detail' => $detail]);
    }
    $url = (string)($response['choices'][0]['message']['images'][0]['image_url']['url'] ?? '');
    if (strpos($url, 'data:') !== 0) respond(502, ['success' => false, 'error' => 'Gemini no devolvió una imagen.']);
    $b64 = substr($url, strpos($url, ',') + 1);
    $mimeOut = 'image/png';
    if (preg_match('#^data:(image/[^;]+);#i', $url, $m) === 1) $mimeOut = strtolower($m[1]);
    respond(200, [
        'success' => true, 'provider' => 'gemini', 'model' => $selected['model'],
        'mimeType' => $mimeOut, 'image' => $b64, 'dataUrl' => $url,
    ]);
}

function handleOpenRouter(array $request): void {
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter no está configurada.']);
    $messages = $request['messages'] ?? null;
    if (!is_array($messages) || $messages === []) {
        $prompt = trim((string)($request['prompt'] ?? ''));
        if ($prompt === '') respond(400, ['success' => false, 'error' => 'Faltan messages o prompt.']);
        if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);
        $messages = [];
        $system = trim((string)($request['system'] ?? ''));
        if ($system !== '') $messages[] = ['role' => 'system', 'content' => $system];
        $messages[] = ['role' => 'user', 'content' => $prompt];
    }
    if (count($messages) > 100) respond(400, ['success' => false, 'error' => 'Demasiados mensajes.']);
    foreach ($messages as $message) {
        if (!is_array($message) || !in_array((string)($message['role'] ?? ''), ['system','user','assistant','tool'], true) || !array_key_exists('content', $message)) {
            respond(400, ['success' => false, 'error' => 'La estructura de messages no es válida.']);
        }
    }
    $payload = ['messages' => array_values($messages), 'stream' => false];
    $model = trim((string)($request['model'] ?? ''));
    if ($model !== '') {
        if (strlen($model) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $model) !== 1) respond(400, ['success' => false, 'error' => 'Modelo no válido.']);
        $payload['model'] = $model;
    }
    if (isset($request['temperature']) && is_numeric($request['temperature'])) $payload['temperature'] = max(0.0, min(2.0, (float)$request['temperature']));
    if (isset($request['max_tokens']) && is_numeric($request['max_tokens'])) $payload['max_tokens'] = max(1, min(32768, (int)$request['max_tokens']));
    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key, 'Content-Type: application/json', 'accept: application/json'
    ], $payload, 120);
    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, ['success'=>false, 'error'=>'OpenRouter no pudo completar la solicitud.', 'detail'=>$detail]);
    }
    respond(200, [
        'success'=>true, 'provider'=>'openrouter', 'model'=>(string)($response['model'] ?? $model),
        'text'=>(string)($response['choices'][0]['message']['content'] ?? ''),
        'usage'=>$response['usage'] ?? null, 'response'=>$response,
    ]);
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success'=>true, 'service'=>'antigravity-ai-proxy',
    'configured'=>['openrouter'=>getSecret('R') !== ''],
    'actions'=>['generate','openrouter','text','download_url','health'],
]);
if ($method !== 'POST') respond(405, ['success'=>false, 'error'=>'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success'=>false, 'error'=>'cURL no está disponible.']);
$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? 'generate'));
if ($action === 'health') respond(200, ['success'=>true, 'configured'=>['openrouter'=>getSecret('R') !== '']]);
if ($action === 'diagnose') handleDiagnose();
if ($action === 'setup_ytdlp') handleSetupYtDlp();
if (in_array($action, ['openrouter','text'], true)) handleOpenRouter($request);
if ($action === 'generate') handleImageGenerate($request);
if ($action === 'download_url') handleDownloadUrl($request);
if ($action === 'proxy_download') handleProxyDownload($request);
respond(400, ['success'=>false, 'error'=>'Acción no permitida.']);

function handleDownloadUrl(array $request): void {
    $url = trim((string)($request['url'] ?? ''));
    if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
        respond(400, ['success' => false, 'error' => 'URL no válida.']);
    }

    $host = strtolower((string)parse_url($url, PHP_URL_HOST));

    // Intentar backends específicos por plataforma
    $result = null;

    // TikTok → tikwm.com
    if (preg_match('/(^|\\.)(tiktok\\.com|vm\\.tiktok\\.com|vt\\.tiktok\\.com)$/', $host)) {
        $result = downloadViaTikwm($url);
    }
    // Instagram
    elseif (preg_match('/(^|\\.)instagram\\.com$/', $host)) {
        $result = downloadViaGeneric($url, 'Instagram');
    }
    // YouTube
    elseif (preg_match('/(^|\\.)(youtube\\.com|youtu\\.be)$/', $host)) {
        $result = downloadViaGeneric($url, 'YouTube');
    }
    // X / Twitter
    elseif (preg_match('/(^|\\.)(x\\.com|twitter\\.com)$/', $host)) {
        $result = downloadViaGeneric($url, 'X/Twitter');
    }
    // Resto
    else {
        $result = downloadViaGeneric($url, parse_url($url, PHP_URL_HOST));
    }

    if ($result !== null) {
        respond(200, $result);
    }

    respond(502, ['success' => false, 'error' => 'No se pudo descargar el vídeo desde esa URL con ningún backend disponible.']);
}

function curlGet(string $url, int $timeout = 30): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    $contentType = (string)(curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '');
    curl_close($ch);
    return [$raw, $status, $error, $contentType];
}

function downloadViaTikwm(string $url): ?array {
    $apiUrl = 'https://tikwm.com/api/?url=' . urlencode($url);
    [$raw, $status, $error, $_] = curlGet($apiUrl, 20);
    if ($raw === false || $status !== 200) return null;
    $data = json_decode($raw, true);
    if (!is_array($data) || ($data['code'] ?? -1) !== 0) return null;
    $videoUrl = (string)($data['data']['play'] ?? '');
    if ($videoUrl === '' || filter_var($videoUrl, FILTER_VALIDATE_URL) === false) return null;
    $title = trim((string)($data['data']['title'] ?? ''));
    $id = (string)($data['data']['id'] ?? '');
    $filename = ($title !== '' ? $title : 'tiktok_' . $id) . '.mp4';
    // Limpiar nombre de archivo
    $filename = preg_replace('/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _\\.-]/u', '', $filename);
    $filename = trim($filename) !== '' ? trim($filename) : 'tiktok_video.mp4';
    return [
        'success' => true,
        'downloadUrl' => $videoUrl,
        'filename' => $filename,
        'service' => 'tikwm'
    ];
}

function downloadViaGeneric(string $url, string $platform): ?array {
    // Intento 1: ¿Es ya un enlace directo a un vídeo?
    $ext = strtolower(pathinfo((string)parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
    $videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'gif'];
    if (in_array($ext, $videoExts, true)) {
        $filename = basename((string)parse_url($url, PHP_URL_PATH));
        if ($filename === '' || $filename === '.') $filename = 'video_descargado.' . $ext;
        return [
            'success' => true,
            'downloadUrl' => $url,
            'filename' => $filename,
            'service' => 'direct'
        ];
    }

    // Intento 2: Intentar con yt-dlp si está disponible en el servidor
    $ytdlp = detectYtDlp();
    if ($ytdlp !== null) {
        $cmd = escapeshellcmd($ytdlp) . ' -f best --get-url --no-playlist ' . escapeshellarg($url) . ' 2>&1';
        $output = @shell_exec($cmd);
        if (is_string($output) && filter_var(trim($output), FILTER_VALIDATE_URL)) {
            $videoUrl = trim($output);
            $cmdName = escapeshellcmd($ytdlp) . ' --print filename --no-playlist ' . escapeshellarg($url) . ' 2>&1';
            $filename = @shell_exec($cmdName);
            $filename = is_string($filename) ? trim($filename) : 'video_descargado.mp4';
            if ($filename === '') $filename = 'video_descargado.mp4';
            return [
                'success' => true,
                'downloadUrl' => $videoUrl,
                'filename' => $filename,
                'service' => 'yt-dlp'
            ];
        }
    }

    return null;
}

function detectYtDlp(): ?string {
    static $path = false;
    if ($path !== false) return $path;
    if (!function_exists('shell_exec') || !is_callable('shell_exec')) {
        $path = null;
        return null;
    }
    $home = (string)getenv('HOME');
    $candidates = ['yt-dlp', 'yt-dl', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp',
        'python3 -m yt_dlp', 'python -m yt_dlp',
        $home . '/.local/bin/yt-dlp'];
    foreach ($candidates as $cmd) {
        if ($cmd === '') continue;
        $test = @shell_exec(escapeshellcmd($cmd) . ' --version 2>&1');
        if (is_string($test) && preg_match('/\d{4}\.\d{2}\.\d{2}/', $test)) {
            $path = $cmd;
            return $path;
        }
    }
    $path = null;
    return null;
}

function handleDiagnose(): void {
    $shellAvailable = function_exists('shell_exec') && is_callable('shell_exec');
    $info = [
        'success' => true,
        'shell_exec_available' => $shellAvailable,
        'python' => null,
        'python3' => null,
        'pip' => null,
        'yt_dlp' => 'no encontrado',
        'home' => (string)getenv('HOME') ?: 'no disponible',
        'php_version' => PHP_VERSION,
    ];
    // Solo intentar detectYtDlp si shell_exec está disponible
    if ($shellAvailable) {
        $yt = detectYtDlp();
        $info['yt_dlp'] = $yt ?: 'no encontrado';
        $python3 = @shell_exec('python3 --version 2>&1');
        $python = @shell_exec('python --version 2>&1');
        $pip3 = @shell_exec('python3 -m pip --version 2>&1');
        $info['python3'] = is_string($python3) ? trim($python3) : 'error';
        $info['python'] = is_string($python) ? trim($python) : 'error';
        $info['pip'] = is_string($pip3) ? trim($pip3) : 'error';
    }
    respond(200, $info);
}

function handleSetupYtDlp(): void {
    if (!function_exists('shell_exec') || !is_callable('shell_exec')) {
        respond(500, ['success' => false, 'error' => 'shell_exec no está disponible en este hosting. No se puede instalar yt-dlp automáticamente.']);
    }
    // Verificar Python
    $python3 = trim((string)@shell_exec('python3 --version 2>&1'));
    $pythonBin = '';
    if (preg_match('/Python 3/', $python3)) {
        $pythonBin = 'python3';
    } else {
        $python = trim((string)@shell_exec('python --version 2>&1'));
        if (preg_match('/Python 3/', $python)) {
            $pythonBin = 'python';
        }
    }
    if ($pythonBin === '') {
        respond(500, ['success' => false, 'error' => 'Python 3 no está disponible en el servidor.', 'python3' => $python3]);
    }
    // Instalar yt-dlp con pip --user
    $cmd = $pythonBin . ' -m pip install --user yt-dlp 2>&1';
    $output = @shell_exec($cmd);
    // Verificar instalación
    $ytdlp = detectYtDlp();
    if ($ytdlp !== null) {
        respond(200, ['success' => true, 'yt_dlp' => $ytdlp, 'message' => 'yt-dlp instalado correctamente.', 'output' => is_string($output) ? trim($output) : '']);
    }
    // Intentar con --break-system-packages
    $cmd2 = $pythonBin . ' -m pip install --user --break-system-packages yt-dlp 2>&1';
    $output2 = @shell_exec($cmd2);
    $ytdlp2 = detectYtDlp();
    if ($ytdlp2 !== null) {
        respond(200, ['success' => true, 'yt_dlp' => $ytdlp2, 'message' => 'yt-dlp instalado con --break-system-packages.', 'output' => is_string($output2) ? trim($output2) : '']);
    }
    respond(500, ['success' => false, 'error' => 'No se pudo instalar yt-dlp.', 'pip_output' => is_string($output) ? trim($output) : '(sin salida)', 'pip2_output' => is_string($output2) ? trim($output2) : '(sin salida)']);
}

function proxyDownloadBinary(string $videoUrl): ?string {
    $ch = curl_init($videoUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_HTTPHEADER => [
            'Referer: https://www.tiktok.com/',
            'Accept: video/*,*/*;q=0.8',
        ],
    ]);
    $binary = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($binary === false || $binary === '' || $status < 200 || $status >= 400) return null;
    return $binary;
}

function handleProxyDownload(array $request): void {
    $url = trim((string)($request['url'] ?? ''));
    if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
        http_response_code(400);
        header('Content-Type: text/plain');
        echo 'URL no válida';
        exit;
    }
    $binary = proxyDownloadBinary($url);
    if ($binary === null) {
        http_response_code(502);
        header('Content-Type: text/plain');
        echo 'No se pudo descargar el archivo';
        exit;
    }
    // Streaming: devolver binario crudo, sin JSON, sin límite de tamaño
    header('Content-Type: video/mp4');
    header('Content-Length: ' . strlen($binary));
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');
    echo $binary;
    exit;
}
