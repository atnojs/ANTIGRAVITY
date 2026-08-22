<?php
/**
 * Proxy canónico Antigravity para Infográfica AI.
 * F = FLUX (imágenes), R = OpenRouter (texto/modelos compatibles).
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(130);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const MAX_PROMPT_BYTES = 12000;
const MAX_SYSTEM_BYTES = 16000;
const ALLOWED_MODELS = ['openai/gpt-4o-mini'];

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getSecret(string $name): string {
    $config = __DIR__ . '/config.php';
    if (is_file($config)) {
        include_once $config;
        if (defined($name) && is_string(constant($name)) && constant($name) !== '') {
            return trim((string)constant($name));
        }
    }
    $values = [
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ];
    foreach ($values as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function readJsonBody(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
        respond(413, ['success' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
    }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON válido.']);
    }
    return $data;
}

function requestJson(string $url, string $method, array $headers, ?array $body = null, int $timeout = 45): array {
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($body !== null) {
        $encoded = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) respond(500, ['success' => false, 'error' => 'No se pudo preparar la solicitud.']);
        $options[CURLOPT_POSTFIELDS] = $encoded;
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false) respond(502, ['success' => false, 'error' => 'Error conectando con el proveedor.', 'detail' => $error]);
    $json = json_decode($raw, true);
    if (!is_array($json)) respond(502, ['success' => false, 'error' => 'El proveedor devolvió una respuesta no válida.']);
    return [$status, $json];
}

function extractJSON(string $content): string {
    $cleaned = preg_replace('/```(?:json)?\s*/i', '', $content);
    $cleaned = trim($cleaned ?? '');
    if ($cleaned !== '' && $cleaned[0] === '{' && $cleaned[-1] === '}') return $cleaned;
    preg_match('/\{[\s\S]*\}/', $cleaned, $match);
    if (!empty($match)) return $match[0];
    respond(502, ['success' => false, 'error' => 'La IA no devolvió JSON válido.']);
    return '';
}

// ===== RUTEO =====
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'GET') respond(200, [
    'success' => true, 'service' => 'infografia-ai-proxy',
    'configured' => ['openrouter' => getSecret('R') !== ''],
    'actions' => ['generate-text', 'analyze-reference', 'health'],
]);
if ($method !== 'POST') respond(405, ['success' => false, 'error' => 'Método no permitido.']);
if (!function_exists('curl_init')) respond(500, ['success' => false, 'error' => 'cURL no está disponible.']);

$request = readJsonBody();
$action = strtolower((string)($request['action'] ?? 'generate-text'));

if ($action === 'health') respond(200, ['success' => true, 'configured' => ['openrouter' => getSecret('R') !== '']]);

if ($action === 'analyze-reference') {
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave R de OpenRouter no está configurada.']);

    $image = trim((string)($request['image'] ?? ''));
    if ($image === '' || !preg_match('#^data:image/(png|jpeg|webp);base64,#i', $image)) {
        respond(400, ['success' => false, 'error' => 'La referencia debe ser una imagen PNG, JPG o WebP válida.']);
    }
    if (strlen($image) > 14 * 1024 * 1024) {
        respond(413, ['success' => false, 'error' => 'La imagen de referencia supera el tamaño permitido.']);
    }

    $system = <<<'PROMPT'
Eres un director de arte experto en infografías. Analiza la imagen como referencia de DISEÑO, no de contenido.
Devuelve exclusivamente JSON válido. Extrae composición, recorrido visual, paleta, tipografía genérica, formas, conectores, densidad y posición de ilustraciones.
No transcribas ni reutilices textos, nombres, logos, marcas de agua, personajes ni ilustraciones exactas. No identifiques al autor. Describe una gramática visual abstracta y reutilizable.
Usa solamente estos valores:
- orientation: vertical, landscape o square
- layout: split, radial, timeline, process, dashboard, editorial, poster, grid, comparison o map
- typography.title/body: serif, sans, display, handwritten o mono
- typography.titleScale: small, medium, large o huge
- composition.readingPath: top-down, left-right, radial o zigzag
- composition.density: airy, balanced o dense
- shapes.cards: square, rounded, organic o none
- shapes.connectors: none, lines, arrows, branches o dashed
- shapes.illustration: central, distributed, background o none
Todos los colores deben ser hexadecimales de seis dígitos.
Formato exacto:
{"version":1,"orientation":"vertical","layout":"editorial","palette":{"background":"#ffffff","primary":"#111111","secondary":"#777777","accent":"#ff5500","text":"#111111"},"typography":{"title":"display","body":"sans","titleScale":"large"},"composition":{"columns":2,"sectionCount":5,"readingPath":"top-down","density":"balanced"},"shapes":{"cards":"rounded","connectors":"arrows","illustration":"distributed"},"decorations":["formas geométricas"],"summary":"Descripción breve en español"}
PROMPT;

    $payload = [
        'model' => 'openai/gpt-4o-mini',
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => [
                ['type' => 'text', 'text' => 'Extrae una gramática visual reutilizable de esta infografía.'],
                ['type' => 'image_url', 'image_url' => ['url' => $image]],
            ]],
        ],
        'temperature' => 0.2,
        'max_tokens' => 1200,
        'response_format' => ['type' => 'json_object'],
    ];

    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Accept: application/json',
        'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        'X-Title: Folio Reference Analyzer',
    ], $payload, 90);

    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, [
            'success' => false, 'error' => 'OpenRouter no pudo analizar la referencia.', 'detail' => $detail
        ]);
    }
    $content = (string)($response['choices'][0]['message']['content'] ?? '');
    if ($content === '') respond(502, ['success' => false, 'error' => 'La IA devolvió un análisis vacío.']);
    $json = extractJSON($content);
    respond(200, ['success' => true, 'provider' => 'openrouter', 'model' => 'openai/gpt-4o-mini', 'text' => $content, 'json' => $json]);
}

if ($action === 'generate-text') {
    $key = getSecret('R');
    if ($key === '') respond(500, ['success' => false, 'error' => 'La clave de OpenRouter no está configurada.']);

    $system = trim((string)($request['system'] ?? ''));
    $prompt = trim((string)($request['prompt'] ?? ''));
    $model = trim((string)($request['model'] ?? 'openai/gpt-4o-mini'));

    if ($system === '' && $prompt === '') respond(400, ['success' => false, 'error' => 'Faltan system o prompt.']);
    if (strlen($prompt) > MAX_PROMPT_BYTES) respond(413, ['success' => false, 'error' => 'El prompt es demasiado largo.']);
    if (strlen($system) > MAX_SYSTEM_BYTES) respond(413, ['success' => false, 'error' => 'Las instrucciones son demasiado largas.']);
    if (!in_array($model, ALLOWED_MODELS, true)) respond(400, ['success' => false, 'error' => 'Modelo no permitido.']);

    $messages = [];
    if ($system !== '') $messages[] = ['role' => 'system', 'content' => $system];
    $messages[] = ['role' => 'user', 'content' => $prompt];

    $payload = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => 0.7,
        'max_tokens' => 2000,
    ];

    [$status, $response] = requestJson('https://openrouter.ai/api/v1/chat/completions', 'POST', [
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Accept: application/json',
        'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        'X-Title: Infographic Generator',
    ], $payload, 60);

    if ($status < 200 || $status >= 300 || isset($response['error'])) {
        $detail = $response['error']['message'] ?? $response['error'] ?? ('HTTP ' . $status);
        respond($status >= 400 && $status < 600 ? $status : 502, [
            'success' => false, 'error' => 'OpenRouter no pudo completar la solicitud.', 'detail' => $detail
        ]);
    }

    $content = (string)($response['choices'][0]['message']['content'] ?? '');
    if ($content === '') respond(502, ['success' => false, 'error' => 'La IA devolvió una respuesta vacía.']);

    // Extraer JSON del contenido si la IA lo pide
    $extractedJson = null;
    if (str_contains($system, 'JSON') || str_contains($system, 'json')) {
        $extractedJson = extractJSON($content);
    }

    respond(200, [
        'success' => true,
        'provider' => 'openrouter',
        'model' => $model,
        'text' => $content,
        'json' => $extractedJson,
        'usage' => $response['usage'] ?? null,
    ]);
}

respond(400, ['success' => false, 'error' => 'Acción no permitida.', 'validActions' => ['generate-text', 'analyze-reference', 'health']]);
