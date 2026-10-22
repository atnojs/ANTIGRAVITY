<?php
declare(strict_types=1);
/**
 * proxy.php — mejorador de prompts de Flow Studio.
 *
 * Recibe {action:"improve", prompt, ratio?} y devuelve 4 propuestas de prompt
 * distintas para que el usuario elija. Usa OpenRouter con el modelo de texto
 * canónico del proyecto (xiaomi/mimo-v2.6-pro).
 *
 * La clave vive SOLO en el entorno del servidor (SetEnv R en el .htaccess raíz
 * de Hostinger). Este fichero no contiene claves y nunca las devuelve.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const TEXT_MODEL = 'xiaomi/mimo-v2.6-pro';
const MAX_PROMPT = 1200;
const RATE_LIMIT = 12;          // peticiones por minuto y IP
const STORE_DIR = 'flow_store';

function getKey(string $name): string
{
    foreach ([
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ] as $value) {
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }
    }
    return '';
}

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function textLen(string $text): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }
    $n = preg_match_all('/./us', $text);
    return $n === false ? strlen($text) : $n;
}

function textCut(string $text, int $max): string
{
    if (textLen($text) <= $max) {
        return $text;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $max, 'UTF-8');
    }
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    return $chars === false ? substr($text, 0, $max) : implode('', array_slice($chars, 0, $max));
}

/** Límite sencillo por IP para no abusar del modelo de texto. */
function rateLimitOk(): bool
{
    $dir = __DIR__ . '/' . STORE_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'anon';
    $file = $dir . '/ai_rate_' . md5($ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $data = json_decode((string) $raw, true);
        if (is_array($data)) {
            $hits = array_values(array_filter($data, fn($t) => is_int($t) && $now - $t < 60));
        }
    }
    if (count($hits) >= RATE_LIMIT) {
        return false;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits));
    return true;
}

function buildSystemPrompt(string $ratio): string
{
    return 'Eres director de arte y fotógrafo especializado en prompts para modelos de imagen '
        . '(Nano Banana / Google Flow). Reescribes la idea del usuario en español de España, sin '
        . 'inventar marcas ni personas reales. Cada propuesta debe ser un prompt visual completo de '
        . '40 a 55 palabras con: sujeto y acción, escena, encuadre y objetivo, iluminación, paleta, '
        . 'textura y acabado fotográfico. Formato de imagen objetivo: ' . $ratio . '. '
        . 'Devuelve EXACTAMENTE 4 líneas, una por propuesta, con este formato: '
        . 'TITULO CORTO || prompt completo. '
        . 'Sin numeración, sin JSON, sin markdown, sin comillas y sin texto extra.';
}

function looksLikeJunk(string $text): bool
{
    foreach (['{', '}', 'options:', '"prompt"', 'titulo:', '```'] as $needle) {
        if (str_contains($text, $needle)) {
            return true;
        }
    }
    return false;
}

function extractPromptItem(array $item): ?array
{
    $prompt = (string) ($item['prompt'] ?? $item['texto'] ?? $item['text'] ?? $item['descripcion'] ?? '');
    if (trim($prompt) === '') {
        return null;
    }
    return [
        'titulo' => textCut(trim((string) ($item['titulo'] ?? $item['title'] ?? $item['nombre'] ?? 'Propuesta')), 40),
        'prompt' => trim($prompt),
    ];
}

function parseLines(string $text): array
{
    $options = [];
    $lines = preg_split('/\R/u', $text) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }
        $line = trim(preg_replace('/^\s*(?:\d+[\.\)\-:]|[-*•])\s*/u', '', $line) ?? $line);
        if (looksLikeJunk($line)) {
            continue;
        }
        if (preg_match('/^(.{2,60}?)\s*(?:\|\||\||—|–)\s*(.{40,})$/u', $line, $m)) {
            $options[] = ['titulo' => textCut(trim($m[1]), 40), 'prompt' => trim($m[2])];
        } elseif (textLen($line) >= 60) {
            $options[] = ['titulo' => 'Propuesta', 'prompt' => textCut($line, 700)];
        }
        if (count($options) >= 4) {
            break;
        }
    }
    return $options;
}

function parseOptions(string $content): array
{
    $text = trim($content);
    $text = preg_replace('/```(?:json|JSON)?\s*/', '', $text) ?? $text;
    $text = str_replace('```', '', $text);

    // 1) Formato pedido: 4 líneas "TITULO || prompt".
    $options = parseLines($text);
    if ($options) {
        return array_slice($options, 0, 4);
    }

    // 2) Respaldo: JSON válido (array u objeto con la lista).
    $candidates = [$text];
    if (preg_match('/\[[\s\S]*\]/u', $text, $m)) {
        $candidates[] = $m[0];
    }
    if (preg_match('/\{[\s\S]*\}/u', $text, $m2)) {
        $candidates[] = $m2[0];
    }

    foreach ($candidates as $candidate) {
        $data = json_decode($candidate, true);
        if (is_array($data) && !array_is_list($data)) {
            foreach (['options', 'propuestas', 'opciones', 'items', 'result'] as $key) {
                if (isset($data[$key]) && is_array($data[$key])) {
                    $data = $data[$key];
                    break;
                }
            }
        }
        if (!is_array($data) || !array_is_list($data)) {
            continue;
        }
        $parsed = [];
        foreach ($data as $item) {
            if (is_string($item) && trim($item) !== '' && !looksLikeJunk($item)) {
                $parsed[] = ['titulo' => 'Propuesta', 'prompt' => trim($item)];
            } elseif (is_array($item)) {
                $normalized = extractPromptItem($item);
                if ($normalized !== null && !looksLikeJunk($normalized['prompt'])) {
                    $parsed[] = $normalized;
                }
            }
            if (count($parsed) >= 4) {
                break;
            }
        }
        if ($parsed) {
            return array_slice($parsed, 0, 4);
        }
    }

    return [];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    respond(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(['ok' => false, 'error' => 'JSON no válido'], 400);
}

$action = (string) ($body['action'] ?? 'improve');

if ($action === 'health') {
    respond([
        'ok' => true,
        'model' => TEXT_MODEL,
        'configured' => getKey('R') !== '',
    ]);
}

if ($action !== 'improve') {
    respond(['ok' => false, 'error' => 'Acción desconocida'], 400);
}

$prompt = trim((string) ($body['prompt'] ?? ''));
if ($prompt === '') {
    respond(['ok' => false, 'error' => 'Escribe primero una idea para mejorar.'], 400);
}
$prompt = textCut($prompt, MAX_PROMPT);

$ratio = (string) ($body['ratio'] ?? '1:1');
if (!in_array($ratio, ['1:1', '16:9', '9:16', '4:3', '3:4'], true)) {
    $ratio = '1:1';
}

if (!rateLimitOk()) {
    respond(['ok' => false, 'error' => 'Demasiadas peticiones seguidas. Espera un minuto.'], 429);
}

$key = getKey('R');
if ($key === '') {
    respond(['ok' => false, 'error' => 'Falta la clave del proveedor de texto (R) en el servidor.'], 503);
}

$content = '';
$finish = '';

// Hasta 2 intentos: el modelo a veces devuelve una respuesta vacía.
for ($attempt = 0; $attempt < 2 && trim($content) === ''; $attempt++) {
    $payload = [
        'model' => TEXT_MODEL,
        'messages' => $attempt === 0 ? [
            ['role' => 'system', 'content' => buildSystemPrompt($ratio)],
            ['role' => 'user', 'content' => $prompt],
        ] : [
            ['role' => 'system', 'content' => 'Devuelve 4 líneas. Cada línea: TITULO || prompt visual en español de 40 a 55 palabras para formato ' . $ratio . '. Sin JSON, sin numeración, sin comillas, sin texto extra.'],
            ['role' => 'user', 'content' => $prompt],
        ],
        'temperature' => $attempt === 0 ? 0.85 : 0.6,
        'max_tokens' => 700,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        // 50 s: por debajo del corte de nginx (60 s) para poder devolver un error claro.
        CURLOPT_TIMEOUT => 50,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json',
            'HTTP-Referer: https://atnojs.es',
            'X-Title: Flow Studio',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        $slow = stripos($curlError, 'timed out') !== false || stripos($curlError, 'timeout') !== false;
        respond([
            'ok' => false,
            'error' => $slow
                ? 'El modelo tardó demasiado (más de 50 s). Vuelve a intentarlo.'
                : 'No se pudo contactar con el proveedor de texto.',
        ], 502);
    }

    $decoded = json_decode((string) $response, true);
    if ($status < 200 || $status >= 300) {
        $message = is_array($decoded) ? (string) ($decoded['error']['message'] ?? '') : '';
        respond(['ok' => false, 'error' => 'El proveedor respondió HTTP ' . $status . ($message !== '' ? ': ' . textCut($message, 160) : '')], 502);
    }

    if (is_array($decoded)) {
        $content = (string) ($decoded['choices'][0]['message']['content'] ?? '');
        $finish = (string) ($decoded['choices'][0]['finish_reason'] ?? '');
    }
}

if (trim($content) === '') {
    respond([
        'ok' => false,
        'error' => 'El modelo no devolvió texto (motivo: ' . ($finish !== '' ? $finish : 'vacío') . '). Reintenta.',
    ], 502);
}

$options = parseOptions($content);
if (count($options) < 1) {
    respond([
        'ok' => false,
        'error' => 'No se pudieron leer las propuestas. Inténtalo otra vez.',
        'preview' => textCut(trim($content), 320),
    ], 502);
}

respond([
    'ok' => true,
    'model' => TEXT_MODEL,
    'original' => $prompt,
    'options' => array_slice($options, 0, 4),
]);

