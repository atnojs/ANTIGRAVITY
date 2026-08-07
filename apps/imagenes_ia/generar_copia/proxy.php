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
$reqModel = strtolower((string)($data['model'] ?? 'flux-pro'));
$backend = 'flux';
$geminiModelId = 'google/gemini-3.1-flash-image';
$fluxEndpoint = 'flux-2-pro'; // por defecto

if (strpos($reqModel, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif (strpos($reqModel, 'pro') !== false && (strpos($reqModel, 'gemini') !== false || $reqModel === 'google/gemini-3-pro-image')) {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3-pro-image';
} elseif (strpos($reqModel, 'flash') !== false || $reqModel === 'google/gemini-3.1-flash-image') {
    $backend = 'gemini';
    $geminiModelId = 'google/gemini-3.1-flash-image';
}
// 'flux-pro', 'flux', 'pro' -> flux-2-pro (ya establecido)

// ====================================================================
// BACKEND: FLUX
// ====================================================================
if ($backend === 'flux') {
    if ($fluxKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave FLUX (F) no configurada.']]);
        exit;
    }

    $payload = ['prompt' => $prompt, 'width' => 1024, 'height' => 1024];
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
    $content = [
        ['type'=>'text', 'text'=>$prompt],
        ['type'=>'image_url', 'image_url'=>['url'=>'data:'.$mime.';base64,'.$b64]],
    ];
} else {
    $content = $prompt;
}

$payload = ['model'=>$geminiModelId, 'modalities'=>['image','text'], 'messages'=>[['role'=>'user','content'=>$content]], 'max_tokens'=>8000];

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload),
    CURLOPT_HTTPHEADER=>['Content-Type: application/json', 'Authorization: Bearer '.$orKey],
    CURLOPT_TIMEOUT=>120, CURLOPT_CONNECTTIMEOUT=>15,
]);
$resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
if ($err) { http_response_code(502); echo json_encode(['error'=>['message'=>'Error OpenRouter: '.$err]]); exit; }
if ($code>=400) {
    $eb = json_decode($resp, true); $em = $eb['error']['message']??$eb['error']??('HTTP '.$code);
    if (is_array($em)) $em = json_encode($em);
    http_response_code($code); echo json_encode(['error'=>['message'=>'OpenRouter: '.$em]]); exit;
}
$jr = json_decode($resp, true);
$images = $jr['choices'][0]['message']['images'] ?? [];
if (empty($images)) { http_response_code(502); echo json_encode(['error'=>['message'=>'Gemini no devolvio imagen.']]); exit; }
$imgDataUrl = $images[0]['image_url']['url'] ?? '';
if ($imgDataUrl==='' || strpos($imgDataUrl, 'data:')!==0) { http_response_code(502); echo json_encode(['error'=>['message'=>'Gemini devolvio URL en lugar de imagen.']]); exit; }
$imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',')+1);
echo json_encode(['success'=>true, 'imageUrl'=>'data:image/png;base64,'.$imgB64, 'model'=>$geminiModelId]);