<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_REQUEST_LENGTH = 12000;
const MAX_CONTEXT_LENGTH = 5000;
const MAX_CONSTRAINTS_LENGTH = 2500;

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        respond(400, ['ok' => false, 'error' => 'No se recibió ninguna solicitud.']);
    }

    if (strlen($raw) > 25000) {
        respond(413, ['ok' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
    }

    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        respond(400, ['ok' => false, 'error' => 'El JSON enviado no es válido.']);
    }

    if (!is_array($data)) {
        respond(400, ['ok' => false, 'error' => 'La solicitud no tiene el formato esperado.']);
    }

    return $data;
}

function textLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function textSubstr(string $value, int $start, int $length): string
{
    return function_exists('mb_substr')
        ? mb_substr($value, $start, $length, 'UTF-8')
        : substr($value, $start, $length);
}

function textLower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function cleanText(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }

    $value = trim(str_replace("\0", '', $value));
    if (textLength($value) > $maxLength) {
        $value = textSubstr($value, 0, $maxLength);
    }
    return $value;
}

function enumValue(mixed $value, array $allowed, string $default): string
{
    return is_string($value) && in_array($value, $allowed, true) ? $value : $default;
}

function resolveApiKey(): ?string
{
    $candidates = [];

    // Variables de entorno estándar
    foreach (['R', 'REDIRECT_R', 'OPENROUTER_API_KEY'] as $var) {
        $val = getenv($var);
        if (is_string($val) && trim($val) !== '') {
            $candidates[] = $val;
        }
    }

    // $_SERVER (funciona con SetEnv en Apache + PHP-FPM)
    foreach (['R', 'REDIRECT_R', 'OPENROUTER_API_KEY'] as $key) {
        if (isset($_SERVER[$key]) && is_string($_SERVER[$key]) && trim($_SERVER[$key]) !== '') {
            $candidates[] = $_SERVER[$key];
        }
    }

    // $_ENV
    foreach (['R', 'REDIRECT_R', 'OPENROUTER_API_KEY'] as $key) {
        if (isset($_ENV[$key]) && is_string($_ENV[$key]) && trim($_ENV[$key]) !== '') {
            $candidates[] = $_ENV[$key];
        }
    }

    // apache_getenv (módulo Apache)
    if (function_exists('apache_getenv')) {
        foreach (['R', 'REDIRECT_R'] as $var) {
            $val = apache_getenv($var);
            if (is_string($val) && trim($val) !== '') {
                $candidates[] = $val;
            }
        }
    }

    // config.php local
    $configPath = __DIR__ . '/config.php';
    if (is_file($configPath)) {
        $config = require $configPath;
        if (is_array($config) && isset($config['openrouter_api_key']) && is_string($config['openrouter_api_key']) && trim($config['openrouter_api_key']) !== '') {
            $candidates[] = $config['openrouter_api_key'];
        }
    }

    foreach ($candidates as $candidate) {
        if (trim($candidate) !== '') {
            return trim($candidate);
        }
    }

    return null;
}

function detectMode(string $requestedMode, string $request): string
{
    if ($requestedMode === 'copilot' || $requestedMode === 'improver') {
        return $requestedMode;
    }

    $lower = textLower($request);
    $improverSignals = [
        'mejora este prompt', 'mejorar este prompt', 'optimiza este prompt',
        'corrige este prompt', 'reescribe este prompt', 'prompt:',
        '# objetivo', '## objetivo', 'actúa como', 'eres un experto'
    ];

    foreach ($improverSignals as $signal) {
        if (str_contains($lower, $signal)) {
            return 'improver';
        }
    }

    $looksStructured = substr_count($request, "\n") >= 6 && preg_match('/(^|\n)\s*[-#*]\s+/u', $request) === 1;
    return $looksStructured ? 'improver' : 'copilot';
}

function loadSkill(string $mode): string
{
    $filename = $mode === 'improver'
        ? 'SKILL_MEJORADOR_PROMPT.md'
        : 'SKILL_METODO_COPILOTO.md';

    // Intentar múltiples rutas (Hostinger a veces cambia __DIR__ o no copia subdirectorios)
    $paths = [
        __DIR__ . '/skills/' . $filename,
        __DIR__ . '/../skills/' . $filename,
        __DIR__ . '/../../skills/' . $filename,
        dirname(__DIR__, 2) . '/skills/' . $filename,
    ];

    $content = false;
    $triedPaths = [];
    foreach ($paths as $path) {
        $normalized = str_replace(['\\', '//'], '/', $path);
        $triedPaths[] = $normalized;
        if (is_file($normalized)) {
            $content = file_get_contents($normalized);
            if ($content !== false && trim($content) !== '') {
                break;
            }
        }
    }

    // Fallback: si los archivos .md no están desplegados en el servidor, usar versión inline mínima
    if ($content === false || trim($content) === '') {
        $content = getInlineSkill($mode);
    }

    if ($content === false || trim($content) === '') {
        $detail = 'Archivo: ' . $filename . '. Rutas probadas: ' . implode(' | ', $triedPaths);
        respond(500, [
            'ok' => false,
            'error' => 'No se pudo cargar la skill. Asegúrate de que skills/' . $filename . ' existe en el servidor.',
            'debug' => $detail,
        ]);
    }

    return $content;
}

function getInlineSkill(string $mode): string
{
    if ($mode === 'improver') {
        return <<<'SKILL'
# Mejorador profesional de prompts

Convierte la entrada del usuario en el prompt más útil, preciso y proporcionado para producir el resultado deseado.
Preserva la intención original, elimina ambigüedad y añade solo el contexto, estructura y criterios que mejoren la ejecución.

## Principios
1. FIDELIDAD: conservar objetivo, materiales, restricciones, tono, público, formato y elementos protegidos.
2. UTILIDAD: cada instrucción debe mejorar el resultado; eliminar relleno, repetición y frases ornamentales.
3. PRECISIÓN: convertir deseos vagos en requisitos observables y criterios verificables.
4. MÍNIMA INTERVENCIÓN: no añadir requisitos nuevos salvo que resuelvan ambigüedad o eviten fallo probable.
5. PROPORCIONALIDAD: no imponer plantilla larga a tarea simple.
6. VERIFICABILIDAD: incluir criterios de aceptación cuando ayuden a comprobar la calidad.

## Estructura del prompt mejorado
1. Rol y objetivo (1-2 frases).
2. Tarea principal concreta (qué debe hacer, no cómo).
3. Materiales, formato de entrada y salida.
4. Restricciones: qué SÍ y qué NO debe hacer.
5. Criterios de aceptación verificables.
6. Formato de salida (JSON, Markdown, tabla, texto libre, etc.).

## Métricas de evaluación (0-100)
- claridad: ¿se entiende sin ambigüedad?
- contexto: ¿tiene suficiente información de fondo?
- restricciones: ¿están definidos los límites?
- formato: ¿está especificada la salida?
- verificacion: ¿hay criterios para comprobar el resultado?

No ejecutes la tarea descrita en el prompt. Tu trabajo es mejorar el prompt que otra IA ejecutará.
SKILL;
    }

    // Método Copiloto (default)
    return <<<'SKILL'
# Método Copiloto — NextGen IA Hub

Convierte ideas en prompts profesionales mediante: descubrir → estructurar → redactar → validar → entregar.

## Fases
A. DEFINIR: entender objetivo, contexto, usuario, materiales, restricciones y resultado esperado.
B. CREAR PROMPT: redactar prompt final con estructura profesional, criterios de aceptación y supuestos explícitos.
C. ENTREGAR: entregar el prompt listo para copiar. No ejecutar la tarea final.

## Plantillas de prompt profesional
Elegir la estructura más adecuada según el tipo de tarea:

### Plantilla 1 — App o herramienta
```
[CABECERA]: tipo de usuario + objetivo principal
[ALCANCE]: qué incluye y qué no
[REQUISITOS TÉCNICOS]: stack, hosting, APIs, formato de archivos
[INTERFAZ]: pantallas, componentes clave, flujo principal
[COMPORTAMIENTO]: interacciones, estados (vacío, carga, error), validaciones
[CRITERIOS DE ACEPTACIÓN]: 3-7 condiciones medibles
```

### Plantilla 2 — Investigación o análisis
```
[OBJETIVO]: qué se quiere saber o decidir
[CONTEXTO]: antecedentes y restricciones
[FUENTES]: tipo de fuentes esperadas
[ENTREGABLE]: formato y profundidad
[CRITERIOS DE CALIDAD]: qué hace que la respuesta sea útil
```

### Plantilla 3 — Imagen, diseño o creatividad
```
[CONCEPTO]: qué debe representar la imagen/diseño
[ESTILO]: referencias visuales, paleta, atmósfera
[COMPOSICIÓN]: elementos, planos, jerarquía
[FORMATO]: dimensiones, orientación, resolución
[RESTRICCIONES]: qué evitar (marcas, texto, personas reales...)
```

## Métricas de evaluación (0-100)
- claridad: ¿se entiende el objetivo sin ambigüedad?
- contexto: ¿hay suficiente información para ejecutar?
- restricciones: ¿están los límites bien definidos?
- formato: ¿está clara la salida esperada?
- verificacion: ¿se puede comprobar si el resultado es correcto?

No ejecutes la tarea. Entrega el prompt profesional listo para copiar y usar.
SKILL;
}

function siteUrl(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $scheme = $https ? 'https' : 'http';
    $host = preg_replace('/[^a-z0-9.\-:]/i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . ($host ?: 'localhost');
}

function buildUserInstruction(array $input, string $detectedMode): string
{
    $labels = [
        'universal' => 'Universal / modelo no especificado',
        'chatgpt' => 'ChatGPT / OpenAI',
        'claude' => 'Claude',
        'gemini' => 'Gemini',
        'image' => 'Flux u otra herramienta de imagen',
        'coding' => 'Agente de programación o herramienta de código',
    ];

    $depthLabels = [
        'compact' => 'Compacto: directo, breve y listo para copiar',
        'standard' => 'Profesional: estructura completa sin longitud innecesaria',
        'exhaustive' => 'Exhaustivo: máxima precisión, criterios de aceptación y validación',
    ];

    $outputLabels = [
        'prompt_only' => 'Prioriza el prompt final; deja cambios, supuestos y validación vacíos si no son imprescindibles.',
        'prompt_changes' => 'Incluye prompt final, mejoras principales, supuestos y validación.',
        'diagnostic' => 'Incluye prompt final y un diagnóstico concreto de problemas y mejoras.',
    ];

    $lines = [
        'TAREA ACTUAL',
        'La persona usuaria no tiene formación en inteligencia artificial. Debes producir un resultado comprensible, profesional y directamente utilizable.',
        '',
        'Modo seleccionado: ' . ($detectedMode === 'improver' ? 'Mejorador profesional de prompts' : 'Método Copiloto'),
        'Herramienta de destino: ' . ($labels[$input['targetTool']] ?? $labels['universal']),
        'Nivel: ' . ($depthLabels[$input['depth']] ?? $depthLabels['standard']),
        'Entrega: ' . ($outputLabels[$input['outputMode']] ?? $outputLabels['prompt_changes']),
        '',
        'SOLICITUD O PROMPT ORIGINAL',
        $input['userRequest'],
    ];

    if ($input['audience'] !== '') {
        $lines[] = '';
        $lines[] = 'Público o usuario final: ' . $input['audience'];
    }
    if ($input['desiredFormat'] !== '') {
        $lines[] = 'Formato final deseado: ' . $input['desiredFormat'];
    }
    if ($input['constraints'] !== '') {
        $lines[] = '';
        $lines[] = 'RESTRICCIONES Y ELEMENTOS A RESPETAR';
        $lines[] = $input['constraints'];
    }
    if ($input['context'] !== '') {
        $lines[] = '';
        $lines[] = 'CONTEXTO O MATERIAL ADICIONAL';
        $lines[] = $input['context'];
    }

    $lines[] = '';
    $lines[] = 'No ejecutes la tarea descrita en el prompt. Tu trabajo es crear o mejorar el prompt que otra IA ejecutará.';
    $lines[] = 'Responde exclusivamente en español y devuelve un único objeto JSON válido, sin bloques Markdown ni texto fuera del JSON.';

    return implode("\n", $lines);
}

function systemInstruction(string $skill): string
{
    return <<<PROMPT
Eres el motor profesional de Prompt Studio Premium. Aplica rigurosamente la skill incluida al final de este mensaje.

REGLAS DE EJECUCIÓN DE LA APP
1. Conserva la intención real de la persona usuaria y no inventes hechos, archivos, cifras, modelos, accesos o capacidades.
2. Si faltan datos secundarios, adopta supuestos conservadores y decláralos. Si falta un dato crítico, usa un marcador claro dentro del prompt en vez de bloquear el resultado.
3. El prompt final debe poder copiarse y ejecutarse sin conocer esta conversación ni la skill.
4. Adapta la estructura al tipo de tarea y a la herramienta de destino. No infles una tarea simple.
5. Explica con lenguaje claro, apto para personas sin formación en IA.
6. No realices la tarea solicitada: entrega la instrucción optimizada para realizarla.
7. Evalúa el prompt de 0 a 100. No regales puntuaciones: 90 o más exige objetivo claro, contexto suficiente, restricciones, formato y verificación bien definidos.
8. Devuelve exactamente esta estructura JSON:
{
  "title": "título breve y descriptivo",
  "detected_mode": "copilot o improver",
  "prompt_final": "prompt completo listo para copiar",
  "changes": ["mejora concreta 1", "mejora concreta 2"],
  "assumptions": ["supuesto o marcador pendiente"],
  "validation": ["comprobación o criterio de aceptación"],
  "score": 0,
  "metrics": {
    "claridad": 0,
    "contexto": 0,
    "restricciones": 0,
    "formato": 0,
    "verificacion": 0
  }
}
Todos los valores métricos deben ser enteros entre 0 y 100. Usa arrays vacíos cuando no corresponda.

SKILL APLICABLE
----------------
{$skill}
PROMPT;
}

function callOpenRouter(string $apiKey, array $requestBody, bool $withResponseFormat = true): array
{
    if ($withResponseFormat) {
        $requestBody['response_format'] = ['type' => 'json_object'];
    }

    $ch = curl_init(OPENROUTER_ENDPOINT);
    if ($ch === false) {
        respond(500, ['ok' => false, 'error' => 'No se pudo iniciar la conexión con el proveedor de IA.']);
    }

    $headers = [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'HTTP-Referer: ' . siteUrl(),
        'X-OpenRouter-Title: Prompt Studio Premium',
    ];

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($requestBody, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 95,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false || $curlError !== '') {
        respond(502, ['ok' => false, 'error' => 'No se pudo contactar con OpenRouter. Revisa la conexión e inténtalo de nuevo.']);
    }

    try {
        $data = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        respond(502, ['ok' => false, 'error' => 'OpenRouter devolvió una respuesta ilegible.']);
    }

    if ($httpCode >= 400) {
        $message = $data['error']['message'] ?? 'OpenRouter rechazó la solicitud.';
        return ['ok' => false, 'status' => $httpCode, 'message' => cleanText($message, 500), 'data' => $data];
    }

    return ['ok' => true, 'status' => $httpCode, 'data' => $data];
}

function extractJsonResult(string $content, string $detectedMode): array
{
    $content = trim($content);
    $content = preg_replace('/^```(?:json)?\s*/i', '', $content) ?? $content;
    $content = preg_replace('/\s*```$/', '', $content) ?? $content;

    $first = strpos($content, '{');
    $last = strrpos($content, '}');
    if ($first !== false && $last !== false && $last > $first) {
        $content = substr($content, $first, $last - $first + 1);
    }

    try {
        $result = json_decode($content, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return [
            'title' => 'Prompt profesional',
            'detected_mode' => $detectedMode,
            'prompt_final' => trim($content),
            'changes' => [],
            'assumptions' => ['La respuesta del modelo no llegó en formato estructurado; se conservó el contenido útil.'],
            'validation' => [],
            'score' => 75,
            'metrics' => [
                'claridad' => 80,
                'contexto' => 70,
                'restricciones' => 70,
                'formato' => 75,
                'verificacion' => 65,
            ],
        ];
    }

    if (!is_array($result)) {
        $result = [];
    }

    $metrics = is_array($result['metrics'] ?? null) ? $result['metrics'] : [];
    $metricNames = ['claridad', 'contexto', 'restricciones', 'formato', 'verificacion'];
    $safeMetrics = [];
    foreach ($metricNames as $name) {
        $value = (int) ($metrics[$name] ?? 0);
        $safeMetrics[$name] = max(0, min(100, $value));
    }

    $promptFinal = cleanText($result['prompt_final'] ?? '', 30000);
    if ($promptFinal === '') {
        $promptFinal = 'No se pudo extraer un prompt final. Repite la solicitud con algo más de contexto.';
    }

    $normalizeList = static function (mixed $value): array {
        if (!is_array($value)) {
            return [];
        }
        $items = [];
        foreach (array_slice($value, 0, 12) as $item) {
            $clean = cleanText($item, 900);
            if ($clean !== '') {
                $items[] = $clean;
            }
        }
        return $items;
    };

    return [
        'title' => cleanText($result['title'] ?? 'Prompt profesional', 120) ?: 'Prompt profesional',
        'detected_mode' => in_array($result['detected_mode'] ?? '', ['copilot', 'improver'], true)
            ? $result['detected_mode']
            : $detectedMode,
        'prompt_final' => $promptFinal,
        'changes' => $normalizeList($result['changes'] ?? []),
        'assumptions' => $normalizeList($result['assumptions'] ?? []),
        'validation' => $normalizeList($result['validation'] ?? []),
        'score' => max(0, min(100, (int) ($result['score'] ?? 0))),
        'metrics' => $safeMetrics,
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $configured = resolveApiKey() !== null;
    respond(200, [
        'ok' => true,
        'service' => 'Prompt Studio Premium',
        'configured' => $configured,
        'message' => $configured ? 'Servicio preparado.' : 'Falta configurar la clave R de OpenRouter en el servidor.',
    ]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
    respond(400, ['ok' => false, 'error' => 'Solicitud no válida.']);
}

$input = readJsonBody();
$action = enumValue($input['action'] ?? '', ['generate', 'health'], 'generate');
if ($action === 'health') {
    $configured = resolveApiKey() !== null;
    respond(200, ['ok' => true, 'configured' => $configured]);
}

$userRequest = cleanText($input['userRequest'] ?? '', MAX_REQUEST_LENGTH);
if (textLength($userRequest) < 10) {
    respond(422, ['ok' => false, 'error' => 'Describe tu idea o pega un prompt con al menos 10 caracteres.']);
}

$validated = [
    'userRequest' => $userRequest,
    'mode' => enumValue($input['mode'] ?? '', ['auto', 'copilot', 'improver'], 'auto'),
    'targetTool' => enumValue($input['targetTool'] ?? '', ['universal', 'chatgpt', 'claude', 'gemini', 'image', 'coding'], 'universal'),
    'depth' => enumValue($input['depth'] ?? '', ['compact', 'standard', 'exhaustive'], 'standard'),
    'outputMode' => enumValue($input['outputMode'] ?? '', ['prompt_only', 'prompt_changes', 'diagnostic'], 'prompt_changes'),
    'qualityModel' => enumValue($input['qualityModel'] ?? '', ['auto', 'balanced', 'premium'], 'auto'),
    'audience' => cleanText($input['audience'] ?? '', 300),
    'desiredFormat' => cleanText($input['desiredFormat'] ?? '', 300),
    'constraints' => cleanText($input['constraints'] ?? '', MAX_CONSTRAINTS_LENGTH),
    'context' => cleanText($input['context'] ?? '', MAX_CONTEXT_LENGTH),
];

$detectedMode = detectMode($validated['mode'], $validated['userRequest']);
$skill = loadSkill($detectedMode);
$apiKey = resolveApiKey();
if ($apiKey === null) {
    respond(503, [
        'ok' => false,
        'error' => 'La app todavía no tiene configurada la clave de OpenRouter en el servidor. Añade la variable R o un config.php privado.',
    ]);
}

$modelMap = [
    'auto' => 'openrouter/auto',
    'balanced' => 'openai/gpt-4o-mini',
    'premium' => 'openai/gpt-4o',
];

$tokenMap = [
    'compact' => 1800,
    'standard' => 3000,
    'exhaustive' => 4500,
];

$requestBody = [
    'model' => $modelMap[$validated['qualityModel']],
    'messages' => [
        ['role' => 'system', 'content' => systemInstruction($skill)],
        ['role' => 'user', 'content' => buildUserInstruction($validated, $detectedMode)],
    ],
    'temperature' => 0.2,
    'max_tokens' => $tokenMap[$validated['depth']],
];

$apiResponse = callOpenRouter($apiKey, $requestBody, true);
if (!$apiResponse['ok'] && in_array($apiResponse['status'], [400, 422], true)) {
    $apiResponse = callOpenRouter($apiKey, $requestBody, false);
}

if (!$apiResponse['ok']) {
    $status = $apiResponse['status'] === 401 ? 503 : 502;
    $message = $apiResponse['status'] === 401
        ? 'La clave de OpenRouter no es válida o no tiene permisos.'
        : 'No se pudo generar el prompt: ' . $apiResponse['message'];
    respond($status, ['ok' => false, 'error' => $message]);
}

$data = $apiResponse['data'];
$content = $data['choices'][0]['message']['content'] ?? '';
if (is_array($content)) {
    $content = implode("\n", array_map(static fn($part) => is_array($part) ? ($part['text'] ?? '') : (string) $part, $content));
}
if (!is_string($content) || trim($content) === '') {
    respond(502, ['ok' => false, 'error' => 'El modelo no devolvió contenido utilizable.']);
}

$result = extractJsonResult($content, $detectedMode);
respond(200, [
    'ok' => true,
    'result' => $result,
    'meta' => [
        'requested_mode' => $validated['mode'],
        'detected_mode' => $detectedMode,
        'requested_model' => $requestBody['model'],
        'resolved_model' => cleanText($data['model'] ?? $requestBody['model'], 160),
        'usage' => [
            'prompt_tokens' => (int) ($data['usage']['prompt_tokens'] ?? 0),
            'completion_tokens' => (int) ($data['usage']['completion_tokens'] ?? 0),
            'total_tokens' => (int) ($data['usage']['total_tokens'] ?? 0),
        ],
    ],
]);
