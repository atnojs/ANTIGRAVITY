<?php
/**
 * PROXY PHP — Generador/Editor unificado (OpenAI GPT Image 2.5 + Gemini)
 * Delega en canonical-image-model.php (ag_image_response):
 *   openai-medium / openai-high / openai-max-flare → gpt-image-2.5-flare
 *   openai-xhigh / openai-max-sunburst           → gpt-image-2.5-sunburst
 *   gemini-flash → google/gemini-3.1-flash-image, gemini-pro → google/gemini-3-pro-image
 * (lista cerrada) (400 "Modelo no soportado").
 * Backend de imágenes: solo Gemini (OpenRouter).
 * Contrato: recibe {prompt, imagen?, model?}
 *           responde  {success:true, imageUrl, model}
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';
$agBody = json_decode(file_get_contents('php://input') ?: '', true);
if (is_array($agBody)) ag_image_response($agBody, __DIR__);

// ===== Claves =====
function getKey(string $name): string {
    foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name]??'', $_SERVER['REDIRECT_'.$name]??'', $_ENV[$name]??'', $_ENV['REDIRECT_'.$name]??''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$orKey   = getKey('R');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>['message'=>'Solo POST']]);
    exit;
}

$body = is_array($agBody) ? json_encode($agBody) : file_get_contents('php://input');
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

// ===== Seleccion de modelo (solo Gemini) =====
$reqModel = strtolower((string)($data['model'] ?? 'gemini-flash'));
if (strpos($reqModel, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Modelo no soportado.']]);
    exit;
}
$geminiModelId = 'google/gemini-3.1-flash-image';
if (strpos($reqModel, 'pro') !== false || $reqModel === 'google/gemini-3-pro-image') {
    $geminiModelId = 'google/gemini-3-pro-image';
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
