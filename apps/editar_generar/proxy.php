<?php
/**
 * PROXY PHP — Generador/Editor unificado
 * Generación y edición mediante el contrato canónico de OpenAI y Gemini.
 * Contrato: recibe {prompt, imagen?, calidad?, model?}
 *           responde  {success:true, imageUrl, model}
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

// CORS y OPTIONS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== ESTADÍSTICAS POR MODELO (GET) =====
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statsFile = __DIR__ . '/stats.json';
    $stats = file_exists($statsFile) ? json_decode((string)file_get_contents($statsFile), true) : [];
    if (!is_array($stats)) $stats = [];
    echo json_encode(['success' => true, 'stats' => $stats], JSON_UNESCAPED_SLASHES);
    exit;
}

// ===== REGISTRO DE STATS (mismo formato que otras apps del catalogo) =====
function recordStat(string $modelo): void {
    $statsFile = __DIR__ . '/stats.json';
    $lock = fopen($statsFile, 'c+');
    if ($lock === false) return;
    flock($lock, LOCK_EX);
    $stats = [];
    if (filesize($statsFile) > 0) {
        $raw = fread($lock, filesize($statsFile));
        $decoded = json_decode((string)$raw, true);
        if (is_array($decoded)) $stats = $decoded;
    }
    if (!isset($stats['models']) || !is_array($stats['models'])) $stats['models'] = [];
    $stats['models'][$modelo] = (int)($stats['models'][$modelo] ?? 0) + 1;
    $stats['total'] = (int)($stats['total'] ?? 0) + 1;
    $stats['last'] = date(DATE_ATOM);
    ftruncate($lock, 0);
    fseek($lock, 0);
    fwrite($lock, json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    flock($lock, LOCK_UN);
    fclose($lock);
}

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
// Contrato: {action:'text', prompt, system?, model?, imagen?} -> {success, text, model}
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
    $textModel = trim((string)($data['model'] ?? 'xiaomi/mimo-v2.6-pro'));
    if ($textModel === '' || strlen($textModel) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $textModel) !== 1) {
        $textModel = 'xiaomi/mimo-v2.6-pro';
    }
    
    // Detectar imagen opcional para análisis visual
    $imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';
    if ($imagenEntrada === '' && isset($data['contents'][0]['parts'])) {
        foreach ($data['contents'][0]['parts'] as $part) {
            if (!empty($part['inlineData']['data'])) {
                $imagenEntrada = (string)$part['inlineData']['data'];
                break;
            }
        }
    }
    
    $messages = [];
    if ($systemText !== '') $messages[] = ['role' => 'system', 'content' => $systemText];
    
    // Construir mensaje user con imagen si existe
    if ($imagenEntrada !== '') {
        $mime = 'image/jpeg';
        if (strpos($imagenEntrada, 'data:image/png')===0) $mime='image/png';
        elseif (strpos($imagenEntrada, 'data:image/webp')===0) $mime='image/webp';
        $b64 = $imagenEntrada;
        if (strpos($b64, ',') !== false) $b64 = substr($b64, strpos($b64, ',')+1);
        $userContent = [
            ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
            ['type' => 'text', 'text' => $textPrompt]
        ];
        $messages[] = ['role' => 'user', 'content' => $userContent];
    } else {
        $messages[] = ['role' => 'user', 'content' => $textPrompt];
    }

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

// Todas las solicitudes de imagen pasan por el contrato canónico.
// Esto elimina cualquier ruta heredada de otros modelos y mantiene únicamente:
// openai-medium, openai-high, openai-xhigh, openai-max-flare,
// openai-max-sunburst, gemini-flash y gemini-pro.
// Catálogo OpenAI 2.5 delegado a canonical-image-model.php:
// gpt-image-2.5-flare (medium/high/max).
// gpt-image-2.5-sunburst (xhigh/max).
// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API)
// Qwen tarda ~100s/imagen y nginx corta a ~55s: worker con keepalive
// (pings curl_multi + espacios + flush) y caché/lock en carpeta de la
// app (qwen_cache/ + register_shutdown_function). sys_get_temp_dir()
// NO persiste entre peticiones en Hostinger.
// Salida con la MISMA forma JSON que el resto de rutas de este proxy.
// ====================================================================
$qwenCatalog = [
    'qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro'],
];
$qwenRequested = strtolower(trim((string)($data['model'] ?? '')));
if (isset($qwenCatalog[$qwenRequested]) && $qwenCatalog[$qwenRequested]['backend'] === 'qwen') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
        exit;
    }
    $qwenModel = $qwenCatalog[$qwenRequested]['model'];

    // Prompt e imágenes de referencia (formato del frontend + fallbacks).
    $qwenPrompt = trim((string)($data['prompt'] ?? ''));
    $qwenImages = [];
    if (isset($data['contents'][0]['parts']) && is_array($data['contents'][0]['parts'])) {
        foreach ($data['contents'][0]['parts'] as $part) {
            if (!is_array($part)) continue;
            if ($qwenPrompt === '' && !empty($part['text'])) $qwenPrompt = trim((string)$part['text']);
            if (!empty($part['inlineData']['data'])) {
                $qwenImages[] = 'data:' . ((string)($part['inlineData']['mimeType'] ?? 'image/jpeg')) . ';base64,' . (string)$part['inlineData']['data'];
            }
        }
    }
    foreach (['imagen', 'image'] as $qwenKey) {
        if (isset($data[$qwenKey]) && is_string($data[$qwenKey]) && trim($data[$qwenKey]) !== '') {
            $qwenVal = trim($data[$qwenKey]);
            if (strpos($qwenVal, 'data:') !== 0) $qwenVal = 'data:image/jpeg;base64,' . $qwenVal;
            $qwenImages[] = $qwenVal;
        }
    }
    if ($qwenPrompt === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => ['message' => 'Falta el prompt.']]);
        exit;
    }

    // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
    // a la imagen fuente (nunca se finge una proporción inexistente).
    $qwenAllowed = [
        '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
        '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
        '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
        '9:16' => 9 / 16, '16:9' => 16 / 9,
    ];
    $qwenTarget = 1.0;
    $qwenRefBinary = '';
    if ($qwenImages !== []) {
        $qwenRefBinary = (string)base64_decode(preg_replace('#^data:[^;]+;base64,#i', '', $qwenImages[0]), true);
        $qwenInfo = $qwenRefBinary !== '' ? @getimagesizefromstring($qwenRefBinary) : false;
        if (is_array($qwenInfo) && (int)$qwenInfo[0] > 0 && (int)$qwenInfo[1] > 0) {
            $qwenTarget = (int)$qwenInfo[0] / (int)$qwenInfo[1];
        }
    }
    if ($qwenTarget === 1.0) {
        $qwenAspect = (string)($data['aspectRatio'] ?? $data['generationConfig']['imageConfig']['aspectRatio'] ?? '1:1');
        $qwenParts = explode(':', trim($qwenAspect));
        $qwenRw = max(1, (int)($qwenParts[0] ?? 1));
        $qwenRh = max(1, (int)($qwenParts[1] ?? 1));
        $qwenTarget = $qwenRw / $qwenRh;
    }
    $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $qwenLabel => $qwenValue) {
        $qwenCurrent = abs($qwenTarget - $qwenValue);
        if ($qwenCurrent < $qwenDistance) { $qwenDistance = $qwenCurrent; $qwenRatio = $qwenLabel; }
    }

    $qwenPayload = [
        'model'         => $qwenModel,
        'prompt'        => $qwenPrompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    foreach (array_slice($qwenImages, 0, 4) as $qwenImage) {
        $qwenPayload['input_references'][] = [
            'type' => 'image_url',
            'image_url' => ['url' => $qwenImage],
        ];
    }

    // Caché/lock en carpeta de la app: los reintentos del frontend recogen
    // el resultado aunque nginx haya cortado la respuesta por timeout.
    $qwenCacheKey = hash('sha256', $qwenModel . '|' . $qwenPrompt . '|' . implode(',', $qwenImages) . '|' . $qwenRatio);
    $qwenCacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($qwenCacheDir)) @mkdir($qwenCacheDir, 0755, true);
    $qwenCacheFile = $qwenCacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $qwenCacheKey . '.json';
    $qwenLockFile = $qwenCacheFile . '.lock';

    $qwenRespond = static function (string $qwenB64): void {
        $qwenBinary = base64_decode($qwenB64);
        $qwenInfo = $qwenBinary !== false ? @getimagesizefromstring($qwenBinary) : false;
        $qwenW = (int)($qwenInfo[0] ?? 0);
        $qwenH = (int)($qwenInfo[1] ?? 0);
        $qwenUrl = 'data:image/png;base64,' . $qwenB64;
        echo json_encode([
            'success' => true, 'type' => 'image', 'provider' => 'qwen', 'model' => 'qwen-pro',
            'mimeType' => 'image/png', 'image' => $qwenB64, 'dataUrl' => $qwenUrl, 'imageUrl' => $qwenUrl,
            'width' => $qwenW, 'height' => $qwenH,
            'aspectRatio' => ($qwenW > 0 && $qwenH > 0) ? $qwenW . ':' . $qwenH : null,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    };

    if (is_file($qwenCacheFile)) {
        $qwenCached = json_decode((string)@file_get_contents($qwenCacheFile), true);
        if (is_array($qwenCached) && !empty($qwenCached['b64'])) {
            $qwenRespond((string)$qwenCached['b64']);
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
        // Si la generación terminó sin guardar caché, libera el candado.
        if (is_file($qwenLockFile) && !is_file($qwenCacheFile)) @unlink($qwenLockFile);
    });

    // Mantener viva la conexión con nginx (corta a ~55s sin tráfico): la
    // generación puede tardar más; se emiten espacios periódicos que no
    // invalidan el JSON final (el parser tolera espacio en blanco inicial).
    while (ob_get_level() > 0) { @ob_end_flush(); }
    @ob_implicit_flush(true);

    $ch = curl_init('https://openrouter.ai/api/v1/images');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($qwenPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $orKey,
        ],
        CURLOPT_TIMEOUT        => 180,
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
    $err  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['success' => false, 'error' => ['message' => 'Error conexion OpenRouter: ' . $err]]);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true); $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => ['message' => 'OpenRouter: ' . $em]]);
        exit;
    }

    $jr = json_decode($resp, true);
    $qwenData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($qwenData === '') {
        http_response_code(502);
        echo json_encode(['success' => false, 'error' => ['message' => 'Qwen no devolvio imagen.']]);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($qwenCacheFile, json_encode(['b64' => $qwenData]));
    @unlink($qwenLockFile);
    $qwenRespond($qwenData);
}

ag_image_response($data, __DIR__);
