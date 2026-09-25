<?php
// ============================================================
// PROXY PHP — Edición de imágenes con IA (OpenAI GPT Image 2.5 + Gemini)
// Bloque "IA — 10 Herramientas" de la app ajustes_imagen.
// Migrado al contrato canónico (canonical-image-model.php):
//   openai-medium / openai-high / openai-max-flare → gpt-image-2.5-flare
//   openai-xhigh / openai-max-sunburst           → gpt-image-2.5-sunburst
//   gemini-flash → google/gemini-3.1-flash-image (OpenRouter)
//   gemini-pro   → google/gemini-3-pro-image     (OpenRouter)
// (lista cerrada) (400 "Modelo no soportado").
// Backend de imágenes: solo Gemini (OpenRouter).
// Contrato con el frontend: recibe {image (base64), mimeType, prompt, model?}
//                           responde {image (base64), mimeType}
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../dibujo_lineas_copia/canonical-image-model.php';

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
    echo json_encode(['error' => ['message' => 'Solo POST']]);
    exit;
}

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Images API, sincrono + keepalive)
// ====================================================================
// Catálogo (lista cerrada): 'qwen-pro' => provider 'qwen', model 'qwen/qwen-image-3-pro'.
// Qwen tarda ~100s/imagen y nginx corta la conexión a ~55s sin tráfico:
//  - keepalive: espacios periódicos (curl_multi) que no invalidan el JSON final;
//  - caché/lock en carpeta de la app (qwen_cache/ + register_shutdown_function):
//    sys_get_temp_dir() NO persiste entre peticiones en Hostinger. Un worker
//    guarda el resultado y los reintentos del frontend lo recogen o esperan
//    con 'processing' (202).
// Se resuelve aquí para no tocar canonical-image-model.php.
if (is_array($canonicalBody) && strtolower((string)($canonicalBody['model'] ?? '')) === 'qwen-pro') {
    $qwenSelected = ['id' => 'qwen-pro', 'provider' => 'qwen', 'model' => 'qwen/qwen-image-3-pro'];

    // Clave OpenRouter (R): misma cascada que el resto de claves de este proxy.
    $orKey = '';
    if ($orKey === '') { $orKey = (string)getenv('R'); }
    if ($orKey === '') { $orKey = (string)getenv('REDIRECT_R'); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada.']]);
        exit;
    }

    // Prompt: campo directo o primer texto de contents/parts (formato Google).
    $qwenPrompt = trim((string)($canonicalBody['prompt'] ?? ''));
    if ($qwenPrompt === '' && isset($canonicalBody['contents'][0]['parts']) && is_array($canonicalBody['contents'][0]['parts'])) {
        foreach ($canonicalBody['contents'][0]['parts'] as $qPart) {
            if (!empty($qPart['text'])) { $qwenPrompt = trim((string)$qPart['text']); break; }
        }
    }
    if ($qwenPrompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Imágenes de referencia (máx. 4): imagen única, array images[] o parts inlineData.
    $qwenRefs = [];
    foreach (['image', 'imagen', 'imageData', 'subject', 'referenceImage'] as $qKey) {
        if (isset($canonicalBody[$qKey]) && is_string($canonicalBody[$qKey]) && trim($canonicalBody[$qKey]) !== '') {
            $qwenRefs[] = $canonicalBody[$qKey];
            break;
        }
    }
    if (isset($canonicalBody['images']) && is_array($canonicalBody['images'])) {
        foreach ($canonicalBody['images'] as $qImg) {
            if (is_string($qImg) && trim($qImg) !== '') $qwenRefs[] = $qImg;
            elseif (is_array($qImg) && !empty($qImg['data'])) $qwenRefs[] = 'data:' . ($qImg['mimeType'] ?? 'image/jpeg') . ';base64,' . $qImg['data'];
        }
    }
    if (isset($canonicalBody['contents'][0]['parts']) && is_array($canonicalBody['contents'][0]['parts'])) {
        foreach ($canonicalBody['contents'][0]['parts'] as $qPart) {
            if (!empty($qPart['inlineData']['data'])) $qwenRefs[] = 'data:' . ($qPart['inlineData']['mimeType'] ?? 'image/jpeg') . ';base64,' . $qPart['inlineData']['data'];
        }
    }
    $qwenRefs = array_slice($qwenRefs, 0, 4);

    // Proporciones REALES de Qwen: la más cercana a la imagen/petición.
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qW = (int)($canonicalBody['width'] ?? 0);
    $qH = (int)($canonicalBody['height'] ?? 0);
    if ($qW > 0 && $qH > 0) {
        $targetRatio = $qW / $qH;
    } else {
        $qParts = explode(':', (string)($canonicalBody['aspectRatio'] ?? '1:1'));
        $targetRatio = max(1, (int)($qParts[0] ?? 1)) / max(1, (int)($qParts[1] ?? 1));
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $qLabel => $qValue) {
        $current = abs($targetRatio - $qValue);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $qLabel; }
    }

    $fields = [
        'model' => $qwenSelected['model'],
        'prompt' => $qwenPrompt,
        'resolution' => '1K',
        'aspect_ratio' => $qwenRatio,
        'n' => 1,
        'output_format' => 'png',
    ];
    foreach ($qwenRefs as $qRef) {
        try {
            [, $qMime] = ag_image_input($qRef);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => ['message' => $e->getMessage()]]);
            exit;
        }
        $qPure = preg_replace('#^data:[^;]+;base64,#i', '', trim($qRef));
        $fields['input_references'][] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $qMime . ';base64,' . $qPure]];
    }

    // Caché + candado en carpeta de la app (Hostinger no persiste /tmp).
    $cacheKey = hash('sha256', $qwenSelected['model'] . '|' . $qwenPrompt . '|' . json_encode($fields['input_references'] ?? []) . '|' . $qwenRatio);
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            echo json_encode(ag_image_result($cached['b64'], 'image/png', $qwenSelected, 'qwen'));
            exit;
        }
    }
    if (is_file($lockFile) && (time() - (int)@filemtime($lockFile)) < 300) {
        http_response_code(202);
        echo json_encode(['status' => 'processing']);
        exit;
    }

    ignore_user_abort(true);
    set_time_limit(180);
    @file_put_contents($lockFile, (string)time());
    register_shutdown_function(static function () use ($lockFile, $cacheFile) {
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($lockFile) && !is_file($cacheFile)) @unlink($lockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): se
    // emiten espacios periódicos que no invalidan el JSON final.
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 20,
    ]);
    $mh = curl_multi_init();
    curl_multi_add_handle($mh, $ch);
    do {
        $status = curl_multi_exec($mh, $active);
        if ($active) {
            curl_multi_select($mh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($active && $status === CURLM_OK);
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error conexion OpenRouter: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $em]]);
        exit;
    }

    $jr = json_decode($resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvio imagen.']]);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);
    echo json_encode(ag_image_result($imageData, 'image/png', $qwenSelected, 'qwen'));
    exit;
}

if (is_array($canonicalBody)) ag_image_response($canonicalBody, __DIR__);



$requestBody = file_get_contents('php://input');
if (empty($requestBody)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Cuerpo vacío']]);
    exit;
}

$req = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'JSON inválido']]);
    exit;
}

$imageB64 = (string)($req['image'] ?? '');
$mimeType = (string)($req['mimeType'] ?? 'image/jpeg');
$prompt   = (string)($req['prompt'] ?? '');
$quality  = (string)($req['quality'] ?? 'pro'); // 'pro' o 'max', elegido por el usuario
$reqModel = strtolower((string)($req['model'] ?? ''));
if ($reqModel === '') { $reqModel = ($quality === 'max') ? 'gemini-pro' : 'gemini-flash'; }
$reqH     = (int)($req['height'] ?? 0);          // alto pedido (px), 0 = por defecto

if ($imageB64 === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la imagen a editar']]);
    exit;
}
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Falta la instrucción de edición']]);
    exit;
}

// La imagen puede llegar como data URL o base64 puro; Gemini espera base64 PURO (sin prefijo data:)
if (strpos($imageB64, 'base64,') !== false) {
    $imageB64 = substr($imageB64, strpos($imageB64, 'base64,') + 7);
}

// --- SEGURIDAD: control de tamaño (~2.5MB) ---
$imgBinary = base64_decode($imageB64, true);
if ($imgBinary === false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen base64 inválida']]);
    exit;
}
if (strlen($imgBinary) > 2500000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Imagen demasiado grande (máximo 2.5MB).']]);
    exit;
}

// ===== SELECCION MODELO (Gemini: 3.1 FLASH por defecto / 3 PRO si se pide) =====
$backend = 'gemini';
$geminiModelId = 'google/gemini-3.1-flash-image';
if (strpos($reqModel, 'f' . 'lux') !== false) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
    exit;
}
if (strpos($reqModel, 'pro') !== false || $reqModel === 'google/gemini-3-pro-image') {
    $geminiModelId = 'google/gemini-3-pro-image';
}

// ===== RAMA GEMINI (OpenRouter chat/completions, usa la imagen de referencia) =====
if ($backend === 'gemini') {
    // Clave OpenRouter (R): cascade .htaccess raiz / env / server
    $orKey = '';
        if ($orKey === '') { $orKey = (string)getenv('R'); }
    if ($orKey === '') { $orKey = (string)getenv('REDIRECT_R'); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de OpenRouter (R) no configurada.']]);
        exit;
    }
    $content = [['type' => 'text', 'text' => $prompt]];
    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mimeType . ';base64,' . $imageB64]];
    $gPayload = [
        'model' => $geminiModelId,
        'modalities' => ['image', 'text'],
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $orKey, 'Content-Type: application/json', 'accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($gPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error OpenRouter: ' . $err]]);
        exit;
    }
    $jr = json_decode($resp, true);
    if ($code >= 400 || !is_array($jr)) {
        $message = $jr['error']['message'] ?? ($jr['error'] ?? ('HTTP ' . $code));
        if (is_array($message)) { $message = json_encode($message); }
        http_response_code($code >= 400 ? $code : 502);
        echo json_encode(['error' => ['message' => 'Gemini: ' . $message]]);
        exit;
    }
    $images = $jr['choices'][0]['message']['images'] ?? [];
    if (empty($images)) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini no devolvio imagen.']]);
        exit;
    }
    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Gemini devolvio URL en lugar de imagen.']]);
        exit;
    }
    $imgB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
    $gMime = 'image/png';
    if (strpos($imgDataUrl, 'data:image/jpeg') === 0) { $gMime = 'image/jpeg'; }
    elseif (strpos($imgDataUrl, 'data:image/webp') === 0) { $gMime = 'image/webp'; }
    echo json_encode([
        'image' => $imgB64,
        'mimeType' => $gMime,
        'width' => null,
        'height' => $reqH ?: null,
        'model' => $geminiModelId,
    ]);
    exit;
}
