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

// ════════════════════════════════════════════════════════════════════════
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API, sincrono)
// Catálogo: 'qwen-pro' => ['backend'=>'qwen', 'model'=>'qwen/qwen-image-3-pro']
// Qwen tarda ~100s/imagen y nginx corta la conexion a los ~55s: se
// mantiene viva con pings (curl_multi + espacios + flush) y se guarda
// el resultado en qwen_cache/ (carpeta de la app: sys_get_temp_dir()
// NO persiste entre peticiones en Hostinger).
// ════════════════════════════════════════════════════════════════════════
$qwenCatalog = ['qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']];
$qwenReqModel = is_array($agBody) ? strtolower((string)($agBody['model'] ?? '')) : '';
if (isset($qwenCatalog[$qwenReqModel])) {
    $qwenKey = '';
    foreach (['R', 'REDIRECT_R'] as $qwenK) {
        if (!empty($qwenKey)) break;
        $qwenKey = (string)(getenv($qwenK) ?: ($_SERVER[$qwenK] ?? '') ?: ($_ENV[$qwenK] ?? ''));
    }
    if ($qwenKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }

    $qwenPrompt = trim((string)($agBody['prompt'] ?? ''));
    if ($qwenPrompt === '' && isset($agBody['contents'][0]['parts'])) {
        foreach ($agBody['contents'][0]['parts'] as $qwenPart) {
            if (!empty($qwenPart['text'])) { $qwenPrompt = trim((string)$qwenPart['text']); break; }
        }
    }
    if ($qwenPrompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el campo "prompt".']]);
        exit;
    }

    $qwenImagen = isset($agBody['imagen']) ? (string)$agBody['imagen'] : '';
    if ($qwenImagen === '' && isset($agBody['contents'][0]['parts'])) {
        foreach ($agBody['contents'][0]['parts'] as $qwenPart) {
            if (!empty($qwenPart['inlineData']['data'])) { $qwenImagen = (string)$qwenPart['inlineData']['data']; break; }
        }
    }
    $qwenMime = 'image/jpeg';
    $qwenB64 = $qwenImagen;
    if (strpos($qwenB64, 'data:') === 0 && strpos($qwenB64, ',') !== false) {
        if (preg_match('#^data:(image/[a-z0-9.+-]+);#i', $qwenB64, $qwenM)) { $qwenMime = strtolower($qwenM[1]); }
        $qwenB64 = substr($qwenB64, strpos($qwenB64, ',') + 1);
    }

    // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
    // a la imagen fuente (nunca se finge una proporcion inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qwenTarget = 1.0;
    $qwenInfo = $qwenB64 !== '' ? @getimagesizefromstring((string)base64_decode($qwenB64)) : false;
    if (is_array($qwenInfo) && $qwenInfo[0] > 0 && $qwenInfo[1] > 0) {
        $qwenTarget = $qwenInfo[0] / $qwenInfo[1];
    } else {
        $qwenParts = explode(':', (string)($agBody['aspectRatio'] ?? '1:1'));
        $qwenRW = max(1.0, (float)($qwenParts[0] ?? 1));
        $qwenRH = max(1.0, (float)($qwenParts[1] ?? 1));
        $qwenTarget = $qwenRW / $qwenRH;
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $qwenLabel => $qwenValue) {
        $qwenCurrent = abs($qwenTarget - $qwenValue);
        if ($qwenCurrent < $qwenDistance) { $qwenDistance = $qwenCurrent; $qwenRatio = $qwenLabel; }
    }

    $qwenPayload = [
        'model'         => $qwenCatalog[$qwenReqModel]['model'],
        'prompt'        => $qwenPrompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    if ($qwenB64 !== '') {
        $qwenPayload['input_references'] = [[
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $qwenMime . ';base64,' . $qwenB64],
        ]];
    }

    $qwenCacheKey = hash('sha256', $qwenPayload['model'] . '|' . $qwenPrompt . '|' . $qwenB64 . '|' . $qwenRatio);
    $qwenCacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($qwenCacheDir)) @mkdir($qwenCacheDir, 0755, true);
    $qwenCacheFile = $qwenCacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $qwenCacheKey . '.json';
    $qwenLockFile = $qwenCacheFile . '.lock';

    if (is_file($qwenCacheFile)) {
        $qwenCached = json_decode((string)@file_get_contents($qwenCacheFile), true);
        if (is_array($qwenCached) && !empty($qwenCached['b64'])) {
            echo json_encode(['success' => true, 'imageUrl' => 'data:image/png;base64,' . $qwenCached['b64'], 'model' => 'qwen-pro', 'modelo' => 'qwen-pro']);
            exit;
        }
    }
    if (is_file($qwenLockFile) && (time() - (int)@filemtime($qwenLockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($qwenLockFile, (string)time());
    register_shutdown_function(static function () use ($qwenLockFile, $qwenCacheFile) {
        // Si la generacion termino sin guardar cache, libera el candado.
        if (is_file($qwenLockFile) && !is_file($qwenCacheFile)) @unlink($qwenLockFile);
    });

    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $qwenCh = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($qwenCh, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $qwenKey,
        ],
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $qwenMh = curl_multi_init();
    curl_multi_add_handle($qwenMh, $qwenCh);
    do {
        $qwenMStatus = curl_multi_exec($qwenMh, $qwenActive);
        if ($qwenActive) {
            curl_multi_select($qwenMh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($qwenActive && $qwenMStatus === CURLM_OK);
    $qwenResp = (string)curl_multi_getcontent($qwenCh);
    $qwenCode = (int)curl_getinfo($qwenCh, CURLINFO_HTTP_CODE);
    $qwenErr  = curl_error($qwenCh);
    curl_multi_remove_handle($qwenMh, $qwenCh);
    curl_multi_close($qwenMh);
    curl_close($qwenCh);

    if ($qwenErr) {
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $qwenErr]]);
        exit;
    }
    $qwenJson = json_decode($qwenResp, true);
    if ($qwenCode >= 400) {
        $qwenMsg = is_array($qwenJson) ? ($qwenJson['error']['message'] ?? $qwenJson['error'] ?? ('HTTP ' . $qwenCode)) : ('HTTP ' . $qwenCode);
        if (is_array($qwenMsg)) $qwenMsg = json_encode($qwenMsg);
        echo json_encode(['error' => ['message' => 'OpenRouter Qwen: ' . $qwenMsg]]);
        exit;
    }
    $qwenImage = is_array($qwenJson) ? (string)($qwenJson['data'][0]['b64_json'] ?? '') : '';
    if ($qwenImage === '') {
        echo json_encode(['error' => ['message' => 'Qwen no devolvio imagen.']]);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($qwenCacheFile, json_encode(['b64' => $qwenImage]));
    @unlink($qwenLockFile);
    echo json_encode(['success' => true, 'imageUrl' => 'data:image/png;base64,' . $qwenImage, 'model' => 'qwen-pro', 'modelo' => 'qwen-pro']);
    exit;
}

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
