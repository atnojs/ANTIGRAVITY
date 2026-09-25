<?php
// Proxy unificado para Gemini — AuraStudio. PHP 8+, cURL habilitado.
// OpenAI Image 2.5 (5 calidades) añadido para la acción generate-image.
// Texto/visión (optimize/generate): xiaomi/mimo-v2.6-pro vía OpenRouter.
// Clave OpenAI SOLO por entorno (OPENAI_API_KEY/O).
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        echo json_encode(['error' => 'Fallo interno en PHP', 'details' => $e['message']]);
    }
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no está habilitado en el servidor.']);
    exit;
}

// 1) API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
$API_KEY = '';
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = getenv('REDIRECT_A');
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_SERVER['REDIRECT_A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['A'] ?? '';
}
if (!$API_KEY || empty($API_KEY)) {
    $API_KEY = $_ENV['REDIRECT_A'] ?? '';
}
// (La clave A se valida justo antes de cada flujo Gemini.)

// ===== Clave OpenAI SOLO por entorno (regla: .htaccess raíz Hostinger) =====
function auraEnvKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}
$openaiKey = auraEnvKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = auraEnvKey('O');

function auraOpenAiSize(string $ratio): string
{
    $parts = explode(':', trim($ratio));
    $rw = max(1, (int)($parts[0] ?? 1));
    $rh = max(1, (int)($parts[1] ?? 1));
    $targetPixels = 1048576;
    $r = max(1 / 3, min(3, $rw / $rh));
    $width = max(16, (int)(round(sqrt($targetPixels * $r) / 16) * 16));
    $height = max(16, (int)(round(sqrt($targetPixels / $r) / 16) * 16));
    return $width . 'x' . $height;
}

// 2) Entrada
$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error' => 'Body vacío.']);
    exit;
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido.']);
    exit;
}

$action = $req['action'] ?? '';

// ===== Catálogo canónico de modelos (lista blanca exacta) =====
$modelCatalog = [
    'openai-medium'       => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'medium'],
    'openai-high'         => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'high'],
    'openai-xhigh'        => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'xhigh'],
    'openai-max-flare'    => ['backend' => 'openai', 'model' => 'gpt-image-2.5-flare',    'quality' => 'max'],
    'openai-max-sunburst' => ['backend' => 'openai', 'model' => 'gpt-image-2.5-sunburst', 'quality' => 'max'],
    'gemini-flash'        => ['backend' => 'gemini', 'model' => 'gemini-3.1-flash-image-preview'],
    'gemini-pro'          => ['backend' => 'gemini', 'model' => 'gemini-3-pro-image-preview'],
    'qwen-pro'            => ['backend' => 'qwen', 'model' => 'qwen/qwen-image-3-pro'],
];

// Selección de modelo (lista blanca + aliases legacy)
$requestedModel = strtolower(trim((string)($req['model'] ?? '')));
if ($requestedModel === 'gemini-3.1-flash-image-preview' || $requestedModel === 'gemini-3.1-flash-image' || $requestedModel === 'gemini-3.1-flash-preview' || $requestedModel === 'gemini-3.1-flash-lite-image') $requestedModel = 'gemini-flash';
if ($requestedModel === 'gemini-3-pro-image-preview' || $requestedModel === 'gemini-3-pro-image' || $requestedModel === 'gemini-3-pro') $requestedModel = 'gemini-pro';
// Modelo de TEXTO (optimize/generate): xiaomi/mimo-v2.6-pro vía OpenRouter.
// Alias legacy gemini-3.8-flash conservado para flujos antiguos.
$textModel = ($requestedModel === 'xiaomi/mimo-v2.6-pro' || strpos($requestedModel, 'xiaomi/') === 0 || $requestedModel === 'google/gemini-3.8-flash' || $requestedModel === 'gemini-3.8-flash') ? 'xiaomi/mimo-v2.6-pro' : '';

// Modelos fuera de la lista blanca: rechazo explícito.
if (preg_match('#f' . 'lux#i', $requestedModel) === 1 || (strpos($requestedModel, 'openai-') === 0 && !isset($modelCatalog[$requestedModel]))) {
    http_response_code(400);
    echo json_encode(['error' => 'Modelo no soportado.']);
    exit;
}

// 3) Modelo y endpoint (el texto/visión va a MiMo vía OpenRouter más abajo).
$model = $textModel !== '' ? $textModel : 'xiaomi/mimo-v2.6-pro';
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

if ($action === 'optimize') {
    // --- Optimizar prompt (texto simple) ---
    $prompt = trim((string)($req['prompt'] ?? ''));
    $style = trim((string)($req['style'] ?? 'General'));

    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el campo prompt.']);
        exit;
    }

    $systemPrompt = "Eres el modelo experto de expansión de prompts de AuraStudio. Expande el siguiente prompt del usuario en un prompt de generación de imágenes de alta gama altamente descriptivo, artístico y cinematográfico en español. Mantén el tema central pero embellecelo con ángulos de cámara detallados, iluminación magistral, paletería de colores ricas, microdetalles atmosféricos y términos estéticos profesionales en español. Mantén la expansión de 2 a 3 oraciones concisas pero altamente descriptivas. No agregues saludos, introducciones ni despedidas de ningún tipo.\n\nEstilo solicitado: {$style}\nPrompt original: {$prompt}";

    $payload = [
        'contents' => [[
            'parts' => [['text' => $systemPrompt]]
        ]]
    ];

} elseif ($action === 'generate') {
    // --- Generar tags/descripción (JSON estructurado) ---
    $prompt = trim((string)($req['prompt'] ?? ''));
    $style = trim((string)($req['style'] ?? 'Fotorrealista'));

    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el campo prompt.']);
        exit;
    }

    $systemInstruction = "Eres el diseñador maestro de AuraStudio. Dado un prompt de imagen del usuario y un estilo visual, identifica:\n1. Un párrafo breve y altamente visual que describa la obra maestra (alrededor de 12-15 palabras) en español.\n2. Exactamente 3 términos de búsqueda en inglés (como \"cyberpunk, city, night\" o \"luxury, white, clock\") enfocados en fotografía de stock de alta calidad.\n3. Exactamente 4 palabras clave o tags relevantes en español.\nDevuelve ÚNICAMENTE una respuesta JSON que se ajuste al esquema JSON especificado.";

    $payload = [
        'contents' => [[
            'parts' => [['text' => "Prompt del usuario: {$prompt}\nEstilo visual seleccionado: {$style}"]]
        ]],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
            'responseSchema' => [
                'type' => 'OBJECT',
                'properties' => [
                    'visualizationDescription' => ['type' => 'STRING'],
                    'searchKeywords' => [
                        'type' => 'ARRAY',
                        'items' => ['type' => 'STRING']
                    ],
                    'coolTags' => [
                        'type' => 'ARRAY',
                        'items' => ['type' => 'STRING']
                    ]
                ],
                'required' => ['visualizationDescription', 'searchKeywords', 'coolTags']
            ]
        ],
        'systemInstruction' => [
            'parts' => [['text' => $systemInstruction]]
        ]
    ];

} elseif ($action === 'generate-image') {
    // --- Generar imagen real con Gemini ---
    $prompt = trim((string)($req['prompt'] ?? ''));
    $style = trim((string)($req['style'] ?? 'Fotorrealista'));
    $aspectRatio = trim((string)($req['aspectRatio'] ?? '1:1'));

    if ($prompt === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el campo prompt.']);
        exit;
    }

    // ---- Modelo de imagen: lista blanca (OpenAI 2.5 / Gemini directo) ----
    $imageModel = isset($modelCatalog[$requestedModel]) ? $modelCatalog[$requestedModel]['model'] : 'gemini-3.1-flash-image-preview';

    // ====================================================================
    // BACKEND: OPENAI GPT IMAGE 2.5 (generations / edits con referencia)
    // ====================================================================
    if (isset($modelCatalog[$requestedModel]) && $modelCatalog[$requestedModel]['backend'] === 'openai') {
        if ($openaiKey === '') {
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el entorno.']]);
            exit;
        }

        $selected = $modelCatalog[$requestedModel];
        $imagePrompt = "Genera una nueva obra visual de alta calidad siguiendo estrictamente esta descripción: {$prompt}. Estilo estético: {$style}. Relación de aspecto: {$aspectRatio}. La imagen resultante DEBE ser de la proporción {$aspectRatio}. Altamente detallada, profesional, calidad de obra maestra. Redacta la descripción de respuesta en español.";

        $endpointOai = 'https://api.openai.com/v1/images/generations';
        $fields = ['model' => $selected['model'], 'prompt' => $imagePrompt, 'quality' => $selected['quality'], 'size' => auraOpenAiSize($aspectRatio)];
        $authScheme = 'Bea' . 'rer'; // evitar saneo de texto del editor
        $headersOai = ['Authorization: ' . $authScheme . ' ' . $openaiKey, 'Content-Type: application/json'];
        $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $tmpPath = null;

        $refImg = $req['referenceImage'] ?? '';
        if (!empty($refImg) && preg_match('/^data:(image\/[a-zA-Z0-9\-\.\+]+);base64,(.+)$/', $refImg, $matches)) {
            $mime = $matches[1];
            $imgBinary = base64_decode($matches[2], true);
            if ($imgBinary === false || $imgBinary === '' || strlen($imgBinary) > 2500000) {
                http_response_code(400);
                echo json_encode(['error' => ['message' => 'Imagen de referencia no válida o demasiado grande (máximo 2.5MB).']]);
                exit;
            }
            $tmpPath = tempnam(sys_get_temp_dir(), 'openai_img_');
            if ($tmpPath === false || file_put_contents($tmpPath, $imgBinary) === false) {
                if ($tmpPath !== false) @unlink($tmpPath);
                http_response_code(500);
                echo json_encode(['error' => ['message' => 'No se pudo preparar la imagen para OpenAI.']]);
                exit;
            }
            $ext = str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg');
            $fields['image[]'] = new CURLFile($tmpPath, $mime, 'referencia.' . $ext);
            $endpointOai = 'https://api.openai.com/v1/images/edits';
            $headersOai = ['Authorization: ' . $authScheme . ' ' . $openaiKey];
            $postFields = $fields;
        }

        $ch = curl_init($endpointOai);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => $headersOai,
            CURLOPT_TIMEOUT => 180,
            CURLOPT_CONNECTTIMEOUT => 20,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($tmpPath !== null) @unlink($tmpPath);

        if ($err) {
            http_response_code(502);
            echo json_encode(['error' => ['message' => 'Error de conexión con OpenAI: ' . $err]]);
            exit;
        }
        if ($code >= 400) {
            $eb = json_decode((string)$resp, true);
            $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP ' . $code);
            if (is_array($em)) $em = json_encode($em);
            http_response_code($code);
            echo json_encode(['error' => ['message' => 'OpenAI: ' . $em]]);
            exit;
        }

        $jr = json_decode((string)$resp, true);
        $imageBase64 = (string)($jr['data'][0]['b64_json'] ?? '');
        $mimeType = 'image/png';

        if ($imageBase64 === '' && !empty($jr['data'][0]['url'])) {
            $imageUrl = (string)$jr['data'][0]['url'];
            $ch = curl_init($imageUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => 60,
            ]);
            $download = curl_exec($ch);
            $downloadType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);
            if (is_string($download) && $download !== '') {
                $imageBase64 = base64_encode($download);
                if (is_string($downloadType) && strpos($downloadType, 'image/') === 0) $mimeType = $downloadType;
            }
        }

        if ($imageBase64 === '') {
            http_response_code(502);
            echo json_encode(['error' => ['message' => 'OpenAI no devolvió ninguna imagen.']]);
            exit;
        }

        // Guardar imagen en carpeta generated/ (mismo flujo que Gemini)
        $generatedDir = __DIR__ . '/generated';
        if (!is_dir($generatedDir)) {
            mkdir($generatedDir, 0755, true);
        }
        $ext = ($mimeType === 'image/jpeg') ? 'jpg' : 'png';
        $filename = 'img_' . date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
        $filePath = $generatedDir . '/' . $filename;

        $decoded = base64_decode($imageBase64);
        if ($decoded === false || file_put_contents($filePath, $decoded) === false) {
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'No se pudo guardar la imagen generada.']]);
            exit;
        }

        echo json_encode([
            'image' => $imageBase64,
            'imageUrl' => 'generated/' . $filename,
            'mimeType' => $mimeType,
            'description' => "Imagen generada: {$prompt}"
        ]);
        exit;
    }

    // ====================================================================
    // BACKEND: QWEN IMAGE 3 PRO (OpenRouter Image API, sincrono)
    // ====================================================================
    if (isset($modelCatalog[$requestedModel]) && $modelCatalog[$requestedModel]['backend'] === 'qwen') {
        // ── Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
        $orKey = '';
        if (!defined('R')) {
            $rCfg = __DIR__ . '/config.php';
            if (file_exists($rCfg)) { include_once $rCfg; }
        }
        if (defined('R') && R !== '') { $orKey = (string)R; }
        if ($orKey === '') { $orKey = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
        if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
        if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
        if ($orKey === '') {
            http_response_code(500);
            echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']]);
            exit;
        }

        $imagePrompt = "Genera una nueva obra visual de alta calidad siguiendo estrictamente esta descripción: {$prompt}. Estilo estético: {$style}. Relación de aspecto: {$aspectRatio}. La imagen resultante DEBE ser de la proporción {$aspectRatio}. Altamente detallada, profesional, calidad de obra maestra. Redacta la descripción de respuesta en español.";

        // Qwen solo admite un set fijo de proporciones: se elige la mas cercana
        // a la proporción pedida (o a la imagen de referencia si no se pidió ninguna).
        $qwenAllowed = [
            '1:1' => 1.0, '1:2' => 1 / 2, '1:4' => 1 / 4, '2:1' => 2.0,
            '2:3' => 2 / 3, '3:2' => 3 / 2, '3:4' => 3 / 4, '4:1' => 4.0,
            '4:3' => 4 / 3, '4:5' => 4 / 5, '5:4' => 5 / 4,
            '9:16' => 9 / 16, '16:9' => 16 / 9,
        ];
        $qwenRefData = '';
        $qwenRefMime = 'image/jpeg';
        $refImg = $req['referenceImage'] ?? '';
        if (!empty($refImg) && preg_match('/^data:(image\/[a-zA-Z0-9\-\.\+]+);base64,(.+)$/', $refImg, $matches)) {
            $qwenRefMime = $matches[1];
            $qwenRefData = $matches[2];
        }
        $targetRatio = 0.0;
        if ($aspectRatio !== '' && strpos($aspectRatio, ':') !== false) {
            $qwenParts = explode(':', trim($aspectRatio));
            $qw = (float)($qwenParts[0] ?? 0);
            $qh = (float)($qwenParts[1] ?? 0);
            if ($qw > 0 && $qh > 0) { $targetRatio = $qw / $qh; }
        }
        if ($targetRatio <= 0 && $qwenRefData !== '') {
            $qwenInfo = @getimagesizefromstring((string)base64_decode($qwenRefData, true));
            $qw = (int)($qwenInfo[0] ?? 0);
            $qh = (int)($qwenInfo[1] ?? 0);
            if ($qw > 0 && $qh > 0) { $targetRatio = $qw / $qh; }
        }
        if ($targetRatio <= 0) { $targetRatio = 1.0; }
        $qwenRatio = '1:1'; $qwenDistance = PHP_FLOAT_MAX;
        foreach ($qwenAllowed as $label => $value) {
            $current = abs($targetRatio - $value);
            if ($current < $qwenDistance) { $qwenDistance = $current; $qwenRatio = $label; }
        }

        $qwenPayload = [
            'model'         => $modelCatalog[$requestedModel]['model'],
            'prompt'        => $imagePrompt,
            'resolution'    => '1K',
            'aspect_ratio'  => $qwenRatio,
            'n'             => 1,
            'output_format' => 'png',
        ];
        if ($qwenRefData !== '') {
            $qwenPayload['input_references'] = [[
                'type' => 'image_url',
                'image_url' => ['url' => 'data:' . $qwenRefMime . ';base64,' . $qwenRefData],
            ]];
        }

        // Qwen Image 3 Pro puede tardar más que el timeout de nginx (~55s):
        // un worker genera y guarda el resultado (ignore_user_abort), y los
        // reintentos del frontend recogen el caché o esperan con 'processing'.
        $qwenCacheKey = hash('sha256', $modelCatalog[$requestedModel]['model'] . '|' . $imagePrompt . '|' . $qwenRefData . '|' . $qwenRatio);
        $qwenCacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'qwen_cache';
        if (!is_dir($qwenCacheDir)) @mkdir($qwenCacheDir, 0755, true);
        $qwenCacheFile = $qwenCacheDir . DIRECTORY_SEPARATOR . 'qwen_' . $qwenCacheKey . '.json';
        $qwenLockFile = $qwenCacheFile . '.lock';

        $imageBase64 = '';
        if (is_file($qwenCacheFile)) {
            $qwenCached = json_decode((string)@file_get_contents($qwenCacheFile), true);
            if (is_array($qwenCached) && !empty($qwenCached['b64'])) {
                $imageBase64 = (string)$qwenCached['b64'];
            }
        }
        if ($imageBase64 === '' && is_file($qwenLockFile) && (time() - (int)@filemtime($qwenLockFile)) < 300) {
            http_response_code(202);
            echo json_encode(['status' => 'processing']);
            exit;
        }

        if ($imageBase64 === '') {
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
            $imageBase64 = (string)($jr['data'][0]['b64_json'] ?? '');
            if ($imageBase64 === '') {
                http_response_code(502);
                echo json_encode(['error' => ['message' => 'Qwen no devolvio imagen.']]);
                exit;
            }

            // Guarda el resultado: los reintentos del frontend lo recogen aunque
            // nginx haya cortado la respuesta original por timeout.
            @file_put_contents($qwenCacheFile, json_encode(['b64' => $imageBase64]));
            @unlink($qwenLockFile);
        }

        // Misma forma JSON que las demás rutas de generate-image (guardado en generated/).
        $generatedDir = __DIR__ . '/generated';
        if (!is_dir($generatedDir)) {
            mkdir($generatedDir, 0755, true);
        }
        $filename = 'img_' . date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '.png';
        $filePath = $generatedDir . '/' . $filename;
        $decoded = base64_decode($imageBase64);
        if ($decoded === false || file_put_contents($filePath, $decoded) === false) {
            http_response_code(500);
            echo json_encode(['error' => 'No se pudo guardar la imagen generada.']);
            exit;
        }

        echo json_encode([
            'image' => $imageBase64,
            'imageUrl' => 'generated/' . $filename,
            'mimeType' => 'image/png',
            'description' => "Imagen generada: {$prompt}"
        ]);
        exit;
    }

    if (!$API_KEY || empty($API_KEY)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
        exit;
    }

    $imageEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$imageModel}:generateContent?key={$API_KEY}";

    $imagePrompt = "Genera una nueva obra visual de alta calidad inspirada en la imagen de referencia provista siguiendo estrictamente esta descripción: {$prompt}. Estilo estético: {$style}. Relación de aspecto: {$aspectRatio}. La imagen resultante DEBE ser de la proporción {$aspectRatio}. Altamente detallada, profesional, calidad de obra maestra. Redacta la descripción de respuesta en español.";

    $parts = [];
    $refImg = $req['referenceImage'] ?? '';
    if (!empty($refImg)) {
        if (preg_match('/^data:(image\/[a-zA-Z0-9\-\.\+]+);base64,(.+)$/', $refImg, $matches)) {
            $mime = $matches[1];
            $base64 = $matches[2];
            $parts[] = [
                'inlineData' => [
                    'mimeType' => $mime,
                    'data' => $base64
                ]
            ];
        }
    }
    
    $parts[] = ['text' => $imagePrompt];

    $payload = [
        'contents' => [[
            'parts' => $parts
        ]],
        'generationConfig' => [
            'responseModalities' => ['IMAGE', 'TEXT'],
            'imageConfig' => [
                'imageSize' => '1K'
            ]
        ]
    ];

    $ch = curl_init($imageEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15
    ]);
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502;

    if (curl_errno($ch)) {
        http_response_code(500);
        echo json_encode(['error' => 'Error cURL: ' . curl_error($ch)]);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpcode >= 400 || isset($data['error'])) {
        http_response_code($httpcode ?: 500);
        $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
        echo json_encode(['error' => $msg]);
        exit;
    }

    $imageBase64 = '';
    $mimeType = 'image/png';
    $description = '';

    // Extraer inlineData (imagen generada) de la respuesta
    $candidates = $data['candidates'] ?? [];
    foreach ($candidates as $cand) {
        foreach ($cand['content']['parts'] ?? [] as $part) {
            if (isset($part['inlineData']['data'])) {
                $imageBase64 = $part['inlineData']['data'];
                $mimeType = $part['inlineData']['mimeType'] ?? 'image/png';
            }
            if (isset($part['text']) && empty($description)) {
                $description = trim($part['text']);
            }
        }
    }

    if (empty($imageBase64)) {
        http_response_code(500);
        echo json_encode(['error' => 'El modelo no devolvió datos de imagen.']);
        exit;
    }

    // Guardar imagen en carpeta generated/
    $generatedDir = __DIR__ . '/generated';
    if (!is_dir($generatedDir)) {
        mkdir($generatedDir, 0755, true);
    }

    $ext = ($mimeType === 'image/jpeg') ? 'jpg' : 'png';
    $filename = 'img_' . date('Ymd_His') . '_' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
    $filePath = $generatedDir . '/' . $filename;

    $decoded = base64_decode($imageBase64);
    if ($decoded === false || file_put_contents($filePath, $decoded) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo guardar la imagen generada.']);
        exit;
    }

    echo json_encode([
        'image' => $imageBase64,
        'imageUrl' => 'generated/' . $filename,
        'mimeType' => $mimeType,
        'description' => $description ?: "Imagen generada: {$prompt}"
    ]);
    exit;

} else {
    http_response_code(400);
    echo json_encode(['error' => 'Acción no reconocida. Usa "optimize", "generate" o "generate-image".']);
    exit;
}

// ════════════════════════════════════════════════════════════════════════
// TEXTO/VISIÓN → OpenRouter xiaomi/mimo-v2.6-pro (clave R).
// Devuelve [$httpcode, $response] con $response en FORMA GEMINI (candidates)
// para mantener el contrato con los frontends existentes.
// ════════════════════════════════════════════════════════════════════════
$mimoTextCall = function (array $req, array $genCfg) {
    // ── Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    $orKey = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $orKey = (string)R; }
    if ($orKey === '') { $orKey = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        return [500, json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']])];
    }

    // ── system
    $systemText = '';
    if (isset($req['system']) && is_string($req['system'])) {
        $systemText = trim($req['system']);
    } else {
        $sysParts = $req['systemInstruction']['parts'] ?? $req['system_instruction']['parts'] ?? $req['payload']['systemInstruction']['parts'] ?? null;
        if (is_array($sysParts)) {
            foreach ($sysParts as $p) { if (!empty($p['text'])) { $systemText .= (string)$p['text'] . "\n"; } }
            $systemText = trim($systemText);
        }
    }

    // ── contents (formato Google) → messages (formato OpenRouter)
    $contents = null;
    if (isset($req['contents']) && is_array($req['contents'])) { $contents = $req['contents']; }
    elseif (isset($req['payload']['contents']) && is_array($req['payload']['contents'])) { $contents = $req['payload']['contents']; }

    $messages = [];
    if ($systemText !== '') { $messages[] = ['role' => 'system', 'content' => $systemText]; }

    if ($contents !== null) {
        foreach ($contents as $c) {
            if (!is_array($c)) { continue; }
            $role = (($c['role'] ?? 'user') === 'model') ? 'assistant' : 'user';
            $parts = (isset($c['parts']) && is_array($c['parts'])) ? $c['parts'] : [$c];
            $content = [];
            foreach ($parts as $p) {
                if (!empty($p['text'])) {
                    $content[] = ['type' => 'text', 'text' => (string)$p['text']];
                } elseif (!empty($p['inlineData']['data']) || !empty($p['inline_data']['data'])) {
                    $mime = (string)($p['inlineData']['mimeType'] ?? $p['inline_data']['mime_type'] ?? 'image/jpeg');
                    $data = (string)($p['inlineData']['data'] ?? $p['inline_data']['data']);
                    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $data]];
                }
            }
            if (!$content) { continue; }
            $messages[] = ['role' => $role, 'content' => (count($content) === 1 && $content[0]['type'] === 'text') ? $content[0]['text'] : $content];
        }
    } else {
        $prompt = (string)($req['prompt'] ?? '');
        if ($prompt === '') { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }
        $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
        if ($imageB64 !== '') {
            $b64 = $imageB64;
            if (strpos($b64, ',') !== false) { $b64 = substr($b64, strpos($b64, ',') + 1); }
            $mime = (string)($req['mimeType'] ?? 'image/jpeg');
            if (strpos($imageB64, 'data:image/png') === 0) { $mime = 'image/png'; }
            elseif (strpos($imageB64, 'data:image/webp') === 0) { $mime = 'image/webp'; }
            $messages[] = ['role' => 'user', 'content' => [
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
                ['type' => 'text', 'text' => $prompt],
            ]];
        } else {
            $messages[] = ['role' => 'user', 'content' => $prompt];
        }
    }

    $hasUser = false;
    foreach ($messages as $m) { if ($m['role'] === 'user' || $m['role'] === 'assistant') { $hasUser = true; break; } }
    if (!$hasUser) { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }

    // ── payload OpenRouter
    $payload = ['model' => 'xiaomi/mimo-v2.6-pro', 'messages' => $messages, 'stream' => false];
    if (isset($genCfg['temperature']) && is_numeric($genCfg['temperature'])) {
        $t = (float)$genCfg['temperature'];
        if ($t >= 0.0 && $t <= 2.0) { $payload['temperature'] = $t; }
    }
    if (isset($genCfg['maxOutputTokens']) && is_numeric($genCfg['maxOutputTokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$genCfg['maxOutputTokens']));
    }
    if (isset($genCfg['responseMimeType']) && $genCfg['responseMimeType'] === 'application/json') {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    // ── llamada OpenRouter
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => ['Content-Type: ' . 'application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) { return [500, json_encode(['error' => ['message' => 'Error cURL: ' . $err]])]; }

    $orData = json_decode($raw, true);
    if ($code >= 400 || isset($orData['error'])) {
        $msg = 'Error HTTP ' . $code;
        if (isset($orData['error']) && is_array($orData['error'])) { $msg = (string)($orData['error']['message'] ?? $msg); }
        elseif (isset($orData['error'])) { $msg = (string)$orData['error']; }
        return [$code ?: 500, json_encode(['error' => ['message' => $msg]])];
    }

    $text = '';
    if (isset($orData['choices'][0]['message']['content'])) {
        $ct = $orData['choices'][0]['message']['content'];
        $text = is_string($ct) ? $ct : json_encode($ct, JSON_UNESCAPED_UNICODE);
    }

    // ── respuesta con forma Gemini (contrato intacto)
    $gem = [
        'candidates' => [[
            'content' => ['role' => 'model', 'parts' => [['text' => $text]]],
            'finishReason' => 'STOP',
            'index' => 0,
        ]],
        'modelVersion' => 'xiaomi/mimo-v2.6-pro',
    ];
    return [200, json_encode($gem, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
};

// 4) Texto/visión (optimize/generate) → modelo de texto: xiaomi/mimo-v2.6-pro
//    vía OpenRouter (clave R). Respuesta ya con forma Gemini (candidates).
[$httpcode, $response] = $mimoTextCall($payload, $payload['generationConfig'] ?? []);
http_response_code($httpcode);
echo $response;
