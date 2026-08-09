<?php
/**
 * PROXY PHP — Generador/Editor unificado
 * Soporta FLUX 2 Pro/Max (BFL, clave F) + Gemini via OpenRouter (clave R).
 * Contrato: recibe {prompt, imagen?, calidad?, model?}
 *           responde  {success:true, imageUrl, model}
 * FLUX = async (submit+poll), Gemini = sync.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// CORS y OPTIONS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== Claves =====
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

$data = json_decode($body, true);
if (json_last_error()!==JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'JSON invalido']]);
    exit;
}

// ====================================================================
// ACCIÓN TEXTO (mejorador de prompts vía OpenRouter)
// Contrato: {action:'text', prompt, system?, model?} -> {success, text, model}
// ====================================================================
$action = strtolower((string)($data['action'] ?? ''));
if ($action === 'text' || $action === 'openrouter') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave OpenRouter (R) no configurada.']]);
        exit;
    }
    $textPrompt = trim((string)($data['prompt'] ?? ''));
    if ($textPrompt === '' && isset($data['contents'][0]['parts'])) {
        foreach ($data['contents'][0]['parts'] as $part) {
            if (!empty($part['text'])) { $textPrompt = trim((string)$part['text']); break; }
        }
    }
    if ($textPrompt === '') {
        http_response_code(400);
        echo json_encode(['error'=>['message'=>'Falta el campo "prompt" para texto.']]);
        exit;
    }
    $systemText = trim((string)($data['system'] ?? ''));
    $textModel = trim((string)($data['model'] ?? 'openrouter/auto'));
    if ($textModel === '' || strlen($textModel) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $textModel) !== 1) {
        $textModel = 'openrouter/auto';
    }
    $messages = [];
    if ($systemText !== '') $messages[] = ['role' => 'system', 'content' => $systemText];
    $messages[] = ['role' => 'user', 'content' => $textPrompt];

    $payload = ['model' => $textModel, 'messages' => $messages, 'stream' => false];
    $temp = (float)($data['temperature'] ?? 0.7);
    if ($temp >= 0.0 && $temp <= 2.0) $payload['temperature'] = $temp;
    if (isset($data['max_tokens']) && is_numeric($data['max_tokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$data['max_tokens']));
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120, CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($err) { http_response_code(502); echo json_encode(['error'=>['message'=>'Error OpenRouter: '.$err]]); exit; }
    if ($code >= 400) {
        $eb = json_decode($resp, true); $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP '.$code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code); echo json_encode(['error'=>['message'=>'OpenRouter: '.$em]]); exit;
    }
    $jr = json_decode($resp, true);
    $content = $jr['choices'][0]['message']['content'] ?? '';
    if (is_array($content)) {
        $content = implode("\n", array_map(static fn($p) => is_array($p) ? ($p['text'] ?? '') : (string)$p, $content));
    }
    echo json_encode(['success' => true, 'text' => (string)$content, 'model' => (string)($jr['model'] ?? $textModel)]);
    exit;
}

// ===== Relación de aspecto y resolución =====
$aspectRatio = (string)($data['aspectRatio'] ?? ($data['generationConfig']['imageConfig']['aspectRatio'] ?? '1:1'));
$allowedAspects = ['1:1','3:4','4:3','16:9','9:16','21:9'];
if (!in_array($aspectRatio, $allowedAspects, true)) $aspectRatio = '1:1';
$resolution = strtoupper((string)($data['resolution'] ?? '1K'));
if (!in_array($resolution, ['512','1K','2K','4K'], true)) $resolution = '1K';
$targetPx = 1024;
if ($resolution === '512') $targetPx = 512;
elseif ($resolution === '2K' || $resolution === '4K') $targetPx = 2048;
$MAX_PX = 4194304; // 4 MP
$ratioParts = explode(':', $aspectRatio);
$ratioW = max(1.0, (float)($ratioParts[0] ?? 1));
$ratioH = max(1.0, (float)($ratioParts[1] ?? 1));
if ($ratioW >= $ratioH) { $width = $targetPx; $height = $targetPx * $ratioH / $ratioW; }
else { $height = $targetPx; $width = $targetPx * $ratioW / $ratioH; }
if ($width * $height > $MAX_PX) {
    $scale = sqrt($MAX_PX / ($width * $height));
    $width *= $scale; $height *= $scale;
}
$width = max(256, (int)(round($width / 32) * 32));
$height = max(256, (int)(round($height / 32) * 32));
while ($width * $height > $MAX_PX) {
    if ($width >= $height) $width -= 32; else $height -= 32;
}

$prompt = trim((string)($data['prompt'] ?? ''));
// Si prompt viene vacío, extraerlo de contents (formato Gemini que usa React)
if ($prompt === '' && isset($data['contents'][0]['parts'])) {
    foreach ($data['contents'][0]['parts'] as $part) {
        if (!empty($part['text'])) { $prompt = trim((string)$part['text']); break; }
    }
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Falta el campo "prompt".']]);
    exit;
}

$imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';
// Si imagen viene vacía, extraerla de contents[0].parts (inlineData)
if ($imagenEntrada === '' && isset($data['contents'][0]['parts'])) {
    foreach ($data['contents'][0]['parts'] as $part) {
        if (!empty($part['inlineData']['data'])) {
            $imagenEntrada = (string)$part['inlineData']['data'];
            break;
        }
    }
}
$calidad = (string)($data['calidad'] ?? 'pro');

// ===== Seleccion de modelo =====
$reqModel = strtolower((string)($data['model'] ?? 'gemini-pro'));
$backend = 'gemini';
$geminiModelId = 'google/gemini-3-pro-image';
$fluxEndpoint = 'flux-2-pro'; // por defecto

if (strpos($reqModel, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif (strpos($reqModel, 'pro') !== false && strpos($reqModel, 'flux') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-pro';
} elseif (strpos($reqModel, 'flash') !== false || $reqModel === 'google/gemini-3.1-flash-image') {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3.1-flash-image';
}
// Valores omitidos o no reconocidos conservan Gemini 3 Pro como fallback seguro.

// ====================================================================
// BACKEND: FLUX
// ====================================================================
if ($backend === 'flux') {
    if ($fluxKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave FLUX (F) no configurada.']]);
        exit;
    }

    $payload = ['prompt' => $prompt, 'width' => $width, 'height' => $height];
    if ($imagenEntrada !== '') {
        $b64 = $imagenEntrada;
        if (strpos($b64, ',') !== false) $b64 = substr($b64, strpos($b64, ',') + 1);
        $payload['input_image'] = $b64;
    }

    // Submit
    $ch = curl_init('https://api.bfl.ai/v1/' . $fluxEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'accept: application/json', 'x-key: '.$fluxKey],
        CURLOPT_TIMEOUT => 30, CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($err) { http_response_code(502); echo json_encode(['error'=>['message'=>'Error FLUX: '.$err]]); exit; }
    if ($code !== 200) {
        $eb = json_decode($resp, true); $em = $eb['detail'] ?? ('HTTP '.$code);
        http_response_code($code); echo json_encode(['error'=>['message'=>'FLUX: '.$em]]); exit;
    }
    $submit = json_decode($resp, true);
    $pollUrl = $submit['polling_url'] ?? '';
    if ($pollUrl === '') { http_response_code(502); echo json_encode(['error'=>['message'=>'FLUX sin polling_url']]); exit; }

    // Polling
    $imageUrl = '';
    for ($i = 0; $i < 60; $i++) { sleep(1);
        $ch = curl_init($pollUrl);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPHEADER=>['accept: application/json','x-key: '.$fluxKey], CURLOPT_TIMEOUT=>10]);
        $r2 = curl_exec($ch); curl_close($ch);
        $poll = json_decode($r2, true);
        if (($poll['status']??'') === 'Ready' && !empty($poll['result']['sample']??'')) { $imageUrl = $poll['result']['sample']; break; }
    }
    if ($imageUrl === '') { http_response_code(504); echo json_encode(['error'=>['message'=>'FLUX no termino en 60s']]); exit; }

    // Download
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>60, CURLOPT_FOLLOWLOCATION=>true]);
    $imgBin = curl_exec($ch); curl_close($ch);
    echo json_encode(['success'=>true, 'imageUrl'=>'data:image/png;base64,'.base64_encode($imgBin), 'model'=>$fluxEndpoint]);
    exit;
}

// ====================================================================
// BACKEND: GEMINI
// ====================================================================
if ($orKey === '') {
    http_response_code(500);
    echo json_encode(['error'=>['message'=>'Clave OpenRouter (R) no configurada.']]);
    exit;
}

if ($imagenEntrada !== '') {
    $mime = 'image/jpeg';
    if (strpos($imagenEntrada, 'data:image/png')===0) $mime='image/png';
    elseif (strpos($imagenEntrada, 'data:image/webp')===0) $mime='image/webp';
    $b64 = $imagenEntrada;
    if (strpos($b64, ',') !== false) $b64 = substr($b64, strpos($b64, ',')+1);
}

$payload = [
    'model' => $geminiModelId,
    'prompt' => $prompt,
    'aspect_ratio' => $aspectRatio,
    'resolution' => $resolution,
    'output_format' => 'png'
];
if ($imagenEntrada !== '') {
    $imageDataUrl = $imagenEntrada;
    if (strpos($imageDataUrl, 'data:image/') !== 0) {
        $imageDataUrl = 'data:' . $mime . ';base64,' . $b64;
    }
    $payload['input_references'] = [[
        'type' => 'image_url',
        'image_url' => ['url' => $imageDataUrl]
    ]];
}

$ch = curl_init('https://openrouter.ai/api/v1/images');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey],
    CURLOPT_TIMEOUT => 180, CURLOPT_CONNECTTIMEOUT => 15,
]);
$resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
if ($err) { http_response_code(502); echo json_encode(['error'=>['message'=>'Error OpenRouter: '.$err]]); exit; }
$jr = json_decode($resp, true);
if ($code >= 400 || !is_array($jr)) {
    $em = $jr['error']['message'] ?? $jr['error'] ?? ('HTTP '.$code);
    if (is_array($em)) $em = json_encode($em);
    http_response_code($code >= 400 ? $code : 502);
    echo json_encode(['error'=>['message'=>'OpenRouter: '.$em]]); exit;
}
$imageBase64 = (string)($jr['data'][0]['b64_json'] ?? '');
if ($imageBase64 === '') { http_response_code(502); echo json_encode(['error'=>['message'=>'Gemini no devolvio imagen.']]); exit; }
$mediaType = (string)($jr['data'][0]['media_type'] ?? 'image/png');
echo json_encode(['success'=>true, 'imageUrl'=>'data:'.$mediaType.';base64,'.$imageBase64, 'model'=>$geminiModelId]);