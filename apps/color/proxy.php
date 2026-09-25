<?php
// ============================================================
// PROXY PHP - Generador de imágenes OpenAI y Gemini.
// Catálogo 2.5 vía canonical-image-model.php: openai-medium/high
// (gpt-image-2.5-flare), openai-xhigh (gpt-image-2.5-sunburst),
// openai-max-flare (gpt-image-2.5-flare/max), openai-max-sunburst
// (gpt-image-2.5-sunburst/max) + gemini-flash/pro (OpenRouter R).
// La llamada OpenAI (generations/edits) la ejecuta
// ag_image_generate() de canonical-image-model.php.
// Modelos fuera de la lista blanca: rechazados con 400.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

// ====================================================================
// BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API)
// Catálogo: 'qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']
// El bloque canónico compartido es síncrono: Qwen tarda ~100s/imagen y
// nginx corta a ~55s, así que esta ruta va con keepalive (curl_multi +
// espacios + flush) y caché/lock en la carpeta de la app (qwen_cache/):
// los reintentos del frontend recogen el resultado aunque nginx corte.
// ====================================================================
function ag_qwen_key(string $name): string
{
    if (defined($name) && is_string(constant($name)) && trim((string)constant($name)) !== '') return trim((string)constant($name));
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? ''] as $v) {
        if (is_string($v) && trim($v) !== '') return trim($v);
    }
    return '';
}

function ag_qwen_generate(array $request): void
{
    $qwenCatalog = ['qwen-pro' => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro']];
    $requested = strtolower(trim((string)($request['model'] ?? 'qwen-pro')));
    if ($requested === 'qwen/qwen-image-3-pro') $requested = 'qwen-pro';
    $qwenModel = $qwenCatalog[$requested]['model'];

    // Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    $orKey = ag_qwen_key('R');
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada en el entorno.']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Falta el prompt.']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
    $ar = explode(':', trim((string)($request['aspectRatio'] ?? '1:1')));
    $rw = max(1, (int)($ar[0] ?? 1));
    $rh = max(1, (int)($ar[1] ?? 1));
    $targetRatio = $rw / $rh;
    $qwenRatio = '1:1';
    $qwenDistance = PHP_FLOAT_MAX;
    foreach ($qwenAllowed as $label => $value) {
        $current = abs($targetRatio - $value);
        if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
    }

    $qwenPayload = [
        'model'         => $qwenModel,
        'prompt'        => $prompt,
        'resolution'    => '1K',
        'aspect_ratio'  => $qwenRatio,
        'n'             => 1,
        'output_format' => 'png',
    ];
    $images = [];
    if (isset($request['image']) && is_string($request['image']) && trim($request['image']) !== '') $images[] = $request['image'];
    if (isset($request['images']) && is_array($request['images'])) {
        foreach ($request['images'] as $image) {
            if (is_string($image) && trim($image) !== '') $images[] = $image;
        }
    }
    foreach (array_slice($images, 0, 4) as $image) {
        $mime = 'image/jpeg';
        if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', (string)$image, $m) === 1) $mime = strtolower($m[1]);
        $pure = (string)preg_replace('#^data:[^;]+;base64,#i', '', trim((string)$image));
        $qwenPayload['input_references'][] = [
            'type' => 'image_url',
            'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure],
        ];
    }

    // Qwen Image 3 Pro puede tardar más que el timeout de nginx (~55s):
    // un worker genera y guarda el resultado (ignore_user_abort), y los
    // reintentos del frontend recogen el caché o esperan con 'processing'.
    $cacheKey = hash('sha256', $qwenModel . '|' . $prompt . '|' . $qwenRatio . '|' . implode('|', $images));
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $cacheKey . '.json';
    $lockFile = $cacheFile . '.lock';

    if (is_file($cacheFile)) {
        $cached = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['b64'])) {
            $result = ag_image_result((string)$cached['b64'], 'image/png', ['id' => 'qwen-pro'], 'qwen');
            $result['width'] = (int)($request['width'] ?? 0);
            $result['height'] = (int)($request['height'] ?? 0);
            $result['imageUrl'] = $result['imageUrl'] ?? $result['dataUrl'];
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
        $mhStatus = curl_multi_exec($mh, $active);
        if ($active) {
            curl_multi_select($mh, 3.0);
            echo str_repeat(' ', 64) . "\n";
            @flush();
        }
    } while ($active && $mhStatus === CURLM_OK);
    $resp = (string)curl_multi_getcontent($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_multi_remove_handle($mh, $ch);
    curl_multi_close($mh);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Error de conexión con OpenRouter: ' . $err]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    if ($code >= 400) {
        $eb = json_decode($resp, true);
        $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code);
        echo json_encode(['error' => ['message' => 'OpenRouter: ' . $em]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $jr = json_decode($resp, true);
    $imageData = (string)($jr['data'][0]['b64_json'] ?? '');
    if ($imageData === '') {
        http_response_code(502);
        echo json_encode(['error' => ['message' => 'Qwen no devolvió ninguna imagen.']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Guarda el resultado: los reintentos del frontend lo recogen aunque
    // nginx haya cortado la respuesta original por timeout.
    @file_put_contents($cacheFile, json_encode(['b64' => $imageData]));
    @unlink($lockFile);

    $result = ag_image_result($imageData, 'image/png', ['id' => 'qwen-pro'], 'qwen');
    $result['width'] = (int)($request['width'] ?? 0);
    $result['height'] = (int)($request['height'] ?? 0);
    $result['imageUrl'] = $result['imageUrl'] ?? $result['dataUrl'];
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);
if (is_array($canonicalBody)) {
    // QWEN IMAGE 3 PRO: backend propio con keepalive + caché en la app.
    $reqModel = strtolower(trim((string)($canonicalBody['model'] ?? '')));
    if ($reqModel === 'qwen-pro' || $reqModel === 'qwen/qwen-image-3-pro') {
        ag_qwen_generate($canonicalBody);
        exit;
    }
    try {
        // Respetar el formato de salida de la app (9:16 por defecto) cuando
        // el frontend solo envía width/height (sin aspectRatio).
        if (empty($canonicalBody['aspectRatio'])) {
            $cw = (int)($canonicalBody['width'] ?? 0);
            $ch = (int)($canonicalBody['height'] ?? 0);
            if ($cw > 0 && $ch > 0) {
                $allowed = ['1:1'=>1.0,'2:3'=>2/3,'3:2'=>3/2,'3:4'=>3/4,'4:3'=>4/3,'4:5'=>4/5,'5:4'=>5/4,'9:16'=>9/16,'16:9'=>16/9,'21:9'=>21/9];
                $ratio = $cw / $ch; $best = '1:1'; $dist = PHP_FLOAT_MAX;
                foreach ($allowed as $label => $value) {
                    $d = abs($ratio - $value);
                    if ($d < $dist) { $dist = $d; $best = $label; }
                }
                $canonicalBody['aspectRatio'] = $best;
            }
        }
        $result = ag_image_generate($canonicalBody, __DIR__);
        $result['width'] = (int)($canonicalBody['width'] ?? 0);
        $result['height'] = (int)($canonicalBody['height'] ?? 0);
        $result['imageUrl'] = $result['imageUrl'] ?? $result['dataUrl'];
        echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    } catch (Throwable $error) {
        $status = (int)$error->getCode();
        if ($status < 400 || $status > 599) $status = 500;
        http_response_code($status);
        echo json_encode(['error'=>['message'=>$error->getMessage()]], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
    exit;
}

// ===== Petición no canónica: rechazar =====
http_response_code(400);
echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
exit;
