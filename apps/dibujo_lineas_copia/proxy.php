<?php
// ============================================================
// PROXY PHP — Imagenes Lineales (unificado)
// Soporta FLUX 2 Pro/Max (BFL, clave F), Gemini via OpenRouter (clave R)
// y GPT Image 2 directo de OpenAI (OPENAI_API_KEY o clave O).
// Selector de modelo desde el frontend: flux / gemini flash / gemini pro /
// openai-medium / openai-high.
// FLUX = asincrono (submit+poll), Gemini/OpenAI = sincrono.
// Contrato: recibe {image, mimeType, model?, prompt?}
//           responde  {image, mimeType}
// ============================================================
header('Content-Type: application/json');

// ===== Claves: F (FLUX-BFL), R (OpenRouter), OPENAI_API_KEY/O (OpenAI) =====
function getKey(string $name): string {
    $config = __DIR__ . '/config.php';
    if (file_exists($config)) { include $config; $k = defined($name) ? constant($name) : ''; if ($k !== '') return $k; }
    foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name]??'', $_SERVER['REDIRECT_'.$name]??'', $_ENV[$name]??'', $_ENV['REDIRECT_'.$name]??''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

function gcdInt(int $a, int $b): int {
    $a = abs($a); $b = abs($b);
    while ($b !== 0) { $tmp = $a % $b; $a = $b; $b = $tmp; }
    return $a > 0 ? $a : 1;
}

function imageAspectLabel(int $width, int $height): string {
    if ($width <= 0 || $height <= 0) return '1:1';
    $g = gcdInt($width, $height);
    return intdiv($width, $g) . ':' . intdiv($height, $g);
}

function sendImageResponse(string $binary, string $mimeType = 'image/png'): void {
    $info = @getimagesizefromstring($binary);
    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    echo json_encode([
        'image'       => base64_encode($binary),
        'mimeType'    => $mimeType,
        'width'       => $width,
        'height'      => $height,
        'aspectRatio' => imageAspectLabel($width, $height),
    ]);
    exit;
}

function openAiOutputSize(int $sourceWidth, int $sourceHeight): string {
    if ($sourceWidth <= 0 || $sourceHeight <= 0) return '1024x1024';

    // GPT Image 2 permite tamaños arbitrarios en múltiplos de 16.
    // Usamos aproximadamente 1 MP para conservar el AR sin disparar el coste.
    $ratio = max(1 / 3, min(3, $sourceWidth / $sourceHeight));
    $targetPixels = 1048576;
    $width = (int)(round(sqrt($targetPixels * $ratio) / 16) * 16);
    $height = (int)(round(sqrt($targetPixels / $ratio) / 16) * 16);
    $width = max(16, $width);
    $height = max(16, $height);

    // Redondeo defensivo para cumplir el límite 3:1 de la API.
    while ($width / $height > 3) $height += 16;
    while ($height / $width > 3) $width += 16;
    return $width . 'x' . $height;
}

function geminiAspectRatio(int $sourceWidth, int $sourceHeight): string {
    if ($sourceWidth <= 0 || $sourceHeight <= 0) return '1:1';
    $ratio = $sourceWidth / $sourceHeight;
    $allowed = [
        '1:1' => 1.0, '2:3' => 2 / 3, '3:2' => 3 / 2,
        '3:4' => 3 / 4, '4:3' => 4 / 3, '4:5' => 4 / 5,
        '5:4' => 5 / 4, '9:16' => 9 / 16, '16:9' => 16 / 9,
        '21:9' => 21 / 9,
    ];
    $best = '1:1'; $distance = PHP_FLOAT_MAX;
    foreach ($allowed as $label => $value) {
        $current = abs($ratio - $value);
        if ($current < $distance) { $distance = $current; $best = $label; }
    }
    return $best;
}

$fluxKey = getKey('F');
$orKey   = getKey('R');
$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>['message'=>'Solo POST']]);
    exit;
}

$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Cuerpo vacio']]);
    exit;
}

$req = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'JSON invalido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page. Convert all visual elements (people, objects, backgrounds) into consistent, smooth, distinct black outlines using clean uniform lines. Completely eliminate all colors, gradients, shading, textures, and gray fills: the result must be purely black lines on pure white background. Simplify complex shapes to create clear areas of white space easy to color. Maintain the original composition, perspective, and key elements. The final drawing must be sharp, without artifacts or smudges, ready to be printed and hand-colored.");

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Falta la imagen']]);
    exit;
}

// Preparar base64 puro (sin prefijo data:) antes de decodificar.
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// Validacion tamano y dimensiones de la imagen original.
$imgBinary = base64_decode($imageB64, true);
if ($imgBinary === false || $imgBinary === '') {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Imagen base64 invalida.']]);
    exit;
}
if (strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Imagen demasiado grande (maximo 2.5MB).']]);
    exit;
}

$imageInfo = @getimagesizefromstring($imgBinary);
$sourceWidth = (int)($imageInfo[0] ?? 0);
$sourceHeight = (int)($imageInfo[1] ?? 0);
$openaiSize = openAiOutputSize($sourceWidth, $sourceHeight);
$geminiRatio = geminiAspectRatio($sourceWidth, $sourceHeight);

// ===== Seleccion de modelo =====
$reqModel = strtolower((string)($req['model'] ?? 'gemini-flash'));
$backend = null;
$geminiModel = 'google/gemini-3.1-flash-image';
$fluxEndpoint = 'flux-2-pro';
$openaiQuality = 'medium';

if (strpos($reqModel, 'openai') !== false) {
    $backend = 'openai';
    $openaiQuality = (strpos($reqModel, 'high') !== false) ? 'high' : 'medium';
} elseif (strpos($reqModel, 'max') !== false) {
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
        echo json_encode(['error'=>['message'=>'Clave FLUX (F) no configurada.']]);
        exit;
    }

    $payload = [
        'prompt'      => $prompt,
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
        echo json_encode(['error'=>['message'=>'Error conexion FLUX: '.$err]]);
        exit;
    }
    if ($code !== 200) {
        $eb = json_decode($resp, true);
        $em = $eb['detail'] ?? $eb['error'] ?? ('HTTP '.$code);
        http_response_code($code);
        echo json_encode(['error'=>['message'=>'FLUX: '.$em]]);
        exit;
    }

    $submit = json_decode($resp, true);
    $pollUrl = $submit['polling_url'] ?? '';
    if ($pollUrl === '') {
        http_response_code(502);
        echo json_encode(['error'=>['message'=>'FLUX no devolvio polling_url']]);
        exit;
    }

    // 2) Polling (max 90s)
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) {
        sleep(1);
        $ch = curl_init($pollUrl); // BFL usa GET al poll_url (comportamiento real de la API BFL)
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['accept: application/json', 'x-key: ' . $fluxKey],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $r2 = curl_exec($ch);
        $c2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $poll = json_decode($r2, true);
        if (($poll['status'] ?? '') === 'Ready' && !empty($poll['result']['sample'] ?? '')) {
            $imageUrl = $poll['result']['sample'];
            break;
        }
    }

    if ($imageUrl === '') {
        http_response_code(504);
        echo json_encode(['error'=>['message'=>'FLUX no termino en 90s']]);
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

    sendImageResponse($imgBin, 'image/png');
}

// ====================================================================
// BACKEND: GEMINI (OpenRouter sync)
// ====================================================================
if ($backend === 'gemini') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave OpenRouter (R) no configurada.']]);
        exit;
    }

    $content = [
        ['type'=>'text', 'text'=>$prompt],
        ['type'=>'image_url', 'image_url'=>['url'=>'data:'.$mimeType.';base64,'.$imageB64]],
    ];

    $payload = [
        'model'      => $geminiModel,
        'modalities' => ['image','text'],
        'messages'   => [['role'=>'user','content'=>$content]],
        'max_tokens' => 8000,
        // OpenRouter reenvía esta configuración al proveedor Gemini.
        'image_config' => ['aspect_ratio' => $geminiRatio],
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer '.$orKey,
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
        echo json_encode(['error'=>['message'=>'Error conexion OpenRouter: '.$err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP '.$code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error'=>['message'=>'OpenRouter: '.$em]]);
        exit;
    }

    $jr = json_decode($resp, true);
    $images = $jr['choices'][0]['message']['images'] ?? [];
    if (empty($images)) {
        http_response_code(502);
        echo json_encode(['error'=>['message'=>'Gemini no devolvio imagen.']]);
        exit;
    }

    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
        http_response_code(502);
        echo json_encode(['error'=>['message'=>'Gemini devolvio URL en lugar de imagen.']]);
        exit;
    }

    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
    sendImageResponse(base64_decode($imgB64), 'image/png');
}

// ====================================================================
// BACKEND: OPENAI GPT IMAGE 2 (Images API, edicion sincrona)
// ====================================================================
if ($backend === 'openai') {
    if ($openaiKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
        exit;
    }

    // GPT Image 2 recibe la referencia como multipart/form-data.
    // Se usa un fichero temporal para que funcione también en instalaciones
    // PHP donde CURLStringFile no está disponible.
    $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
    if ($tmpPath === false || file_put_contents($tmpPath, $imgBinary) === false) {
        if ($tmpPath !== false) @unlink($tmpPath);
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'No se pudo preparar la imagen para OpenAI.']]);
        exit;
    }

    $uploadName = 'referencia.' . (stripos($mimeType, 'png') !== false ? 'png' : (stripos($mimeType, 'webp') !== false ? 'webp' : 'jpg'));
    $payload = [
        'model'  => 'gpt-image-2',
        'prompt' => $prompt,
        'quality'=> $openaiQuality,
        'size'   => $openaiSize,
        'image[]'=> new CURLFile($tmpPath, $mimeType, $uploadName),
    ];

    $ch = curl_init('https://api.openai.com/v1/images/edits');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $openaiKey,
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    @unlink($tmpPath);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error'=>['message'=>'Error de conexion con OpenAI: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error'=>['message'=>'OpenAI: ' . $em]]);
        exit;
    }

    $jr = json_decode($resp, true);
    $imageData = $jr['data'][0]['b64_json'] ?? '';
    $mimeOut = 'image/png';

    // Algunos proveedores pueden devolver una URL en vez de b64_json.
    if ($imageData === '' && !empty($jr['data'][0]['url'])) {
        $imageUrl = (string)$jr['data'][0]['url'];
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 60,
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
        echo json_encode(['error'=>['message'=>'OpenAI no devolvio ninguna imagen.']]);
        exit;
    }

    sendImageResponse(base64_decode($imageData), $mimeOut);
}

// Modelo no reconocido
http_response_code(400);
echo json_encode(['error'=>['message'=>'Modelo no soportado. Usa flux, gemini-flash, gemini-pro, openai-medium u openai-high.']]);
