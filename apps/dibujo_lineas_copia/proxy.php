<?php
// ============================================================
// PROXY PHP — Imagenes Lineales (unificado)
// Soporta FLUX 2 Pro (BFL, clave F) + Gemini via OpenRouter (clave R).
// Selector de modelo desde el frontend: flux / gemini flash / gemini pro.
// FLUX = asincrono (submit+poll), Gemini = sincrono.
// Contrato: recibe {image, mimeType, model?, prompt?}
//           responde  {image, mimeType}
// ============================================================
header('Content-Type: application/json');

// ===== Claves: F (FLUX-BFL) y R (OpenRouter) =====
function getKey(string $name): string {
    $config = __DIR__ . '/config.php';
    if (file_exists($config)) { include $config; $k = defined($name) ? constant($name) : ''; if ($k !== '') return $k; }
    foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name]??'', $_SERVER['REDIRECT_'.$name]??'', $_ENV[$name]??'', $_ENV['REDIRECT_'.$name]??''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$fluxKey = getKey('F');
$orKey   = getKey('R');

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

// Validacion tamano
$imgBinary = base64_decode($imageB64);
if (strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Imagen demasiado grande (maximo 2.5MB).']]);
    exit;
}

// Preparar base64 puro (sin prefijo data:)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// ===== Seleccion de modelo =====
$reqModel = strtolower((string)($req['model'] ?? 'gemini-pro'));
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
    echo json_encode([
        'image'    => base64_encode(base64_decode($imgB64)),
        'mimeType' => 'image/png',
    ]);
    exit;
}

// Modelo no reconocido
http_response_code(400);
echo json_encode(['error'=>['message'=>'Modelo no soportado. Usa flux, gemini-flash o gemini-pro.']]);
