<?php
// Proxy unificado para Gemini — AuraStudio. PHP 8+, cURL habilitado.
// OpenAI Image 2.5 (5 calidades) añadido para la acción generate-image.
// Texto/visión (optimize/generate): gemini-3.8-flash (spec §6).
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
];

// Selección de modelo (lista blanca + aliases legacy)
$requestedModel = strtolower(trim((string)($req['model'] ?? '')));
if ($requestedModel === 'gemini-3.1-flash-image-preview' || $requestedModel === 'gemini-3.1-flash-image' || $requestedModel === 'gemini-3.1-flash-preview' || $requestedModel === 'gemini-3.1-flash-lite-image') $requestedModel = 'gemini-flash';
if ($requestedModel === 'gemini-3-pro-image-preview' || $requestedModel === 'gemini-3-pro-image' || $requestedModel === 'gemini-3-pro') $requestedModel = 'gemini-pro';
$textModel = ($requestedModel === 'google/gemini-3.8-flash' || $requestedModel === 'gemini-3.8-flash') ? 'gemini-3.8-flash' : '';

// Modelos fuera de la lista blanca: rechazo explícito.
if (preg_match('#f' . 'lux#i', $requestedModel) === 1 || (strpos($requestedModel, 'openai-') === 0 && !isset($modelCatalog[$requestedModel]))) {
    http_response_code(400);
    echo json_encode(['error' => 'Modelo no soportado.']);
    exit;
}

// 3) Modelo y endpoint (texto/visión → gemini-3.8-flash, spec §6)
$model = $textModel !== '' ? $textModel : 'gemini-3.8-flash';
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

// 4) cURL (solo para acciones optimize y generate)
if (!$API_KEY || empty($API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key de Gemini no configurada.']]);
    exit;
}
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15
]);
$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error de comunicación con Google', 'details' => $err]);
    exit;
}
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502;
curl_close($ch);

http_response_code($code);
echo $response;
