<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const MAX_ITEMS = 100;
const MAX_FILE_BYTES = 2_000_000;

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
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

function cleanText(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = trim(str_replace("\0", '', $value));
    return textSubstr($value, 0, $maxLength);
}

function validateNamespace(string $raw): string
{
    $sanitized = preg_replace('/[^a-zA-Z0-9_-]/', '', $raw) ?? '';
    if (strlen($sanitized) < 3 || strlen($sanitized) > 64) {
        respond(400, ['ok' => false, 'error' => 'Namespace de historial no válido.']);
    }
    return $sanitized;
}

function clientHistoryKey(string $namespace): string
{
    $cookieName = 'psp_history_id';
    $token = $_COOKIE[$cookieName] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/', $token)) {
        $token = bin2hex(random_bytes(16));
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        setcookie($cookieName, $token, [
            'expires' => time() + 31536000,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $_COOKIE[$cookieName] = $token;
    }
    return hash('sha256', $namespace . ':' . $token);
}

function dataPath(string $namespace): string
{
    $directory = __DIR__ . '/history_data';
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        respond(500, ['ok' => false, 'error' => 'No se pudo preparar la carpeta del historial.']);
    }
    return $directory . '/' . $namespace . '_' . clientHistoryKey($namespace) . '.json';
}

function readItemsLocked($handle): array
{
    rewind($handle);
    $raw = stream_get_contents($handle);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
}

function writeItemsLocked($handle, array $items): void
{
    $encoded = json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false || strlen($encoded) > MAX_FILE_BYTES) {
        respond(507, ['ok' => false, 'error' => 'El historial supera el tamaño permitido.']);
    }
    rewind($handle);
    if (!ftruncate($handle, 0) || fwrite($handle, $encoded) === false) {
        respond(500, ['ok' => false, 'error' => 'No se pudo guardar el historial.']);
    }
    fflush($handle);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
    respond(400, ['ok' => false, 'error' => 'Solicitud no válida.']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '' || strlen($raw) > 60000) {
    respond(400, ['ok' => false, 'error' => 'Solicitud vacía o demasiado grande.']);
}

try {
    $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    respond(400, ['ok' => false, 'error' => 'El JSON enviado no es válido.']);
}

if (!is_array($input)) {
    respond(400, ['ok' => false, 'error' => 'Historial no válido.']);
}

$namespace = validateNamespace((string)($input['namespace'] ?? ''));

$action = is_string($input['action'] ?? null) ? $input['action'] : '';
if (!in_array($action, ['load', 'save', 'delete', 'clear'], true)) {
    respond(400, ['ok' => false, 'error' => 'Acción no válida.']);
}

$path = dataPath($namespace);
$handle = fopen($path, 'c+');
if ($handle === false) {
    respond(500, ['ok' => false, 'error' => 'No se pudo abrir el historial.']);
}

if (!flock($handle, LOCK_EX)) {
    fclose($handle);
    respond(503, ['ok' => false, 'error' => 'El historial está ocupado. Vuelve a intentarlo.']);
}

$items = readItemsLocked($handle);

if ($action === 'load') {
    flock($handle, LOCK_UN);
    fclose($handle);
    respond(200, ['ok' => true, 'items' => $items]);
}

if ($action === 'clear') {
    $items = [];
    writeItemsLocked($handle, $items);
    flock($handle, LOCK_UN);
    fclose($handle);
    respond(200, ['ok' => true, 'items' => []]);
}

if ($action === 'delete') {
    $id = cleanText($input['id'] ?? '', 80);
    if (!preg_match('/^[a-zA-Z0-9_-]{8,80}$/', $id)) {
        flock($handle, LOCK_UN);
        fclose($handle);
        respond(422, ['ok' => false, 'error' => 'Identificador de historial no válido.']);
    }
    $items = array_values(array_filter($items, static fn(array $item): bool => ($item['id'] ?? '') !== $id));
    writeItemsLocked($handle, $items);
    flock($handle, LOCK_UN);
    fclose($handle);
    respond(200, ['ok' => true, 'items' => $items]);
}

$item = $input['item'] ?? null;
if (!is_array($item)) {
    flock($handle, LOCK_UN);
    fclose($handle);
    respond(422, ['ok' => false, 'error' => 'El elemento del historial no es válido.']);
}

$id = cleanText($item['id'] ?? '', 80);
if (!preg_match('/^[a-zA-Z0-9_-]{8,80}$/', $id)) {
    $id = bin2hex(random_bytes(12));
}

$mode = in_array($item['mode'] ?? '', ['copilot', 'improver'], true) ? $item['mode'] : 'copilot';
$safeItem = [
    'id' => $id,
    'title' => cleanText($item['title'] ?? 'Prompt profesional', 120) ?: 'Prompt profesional',
    'original' => cleanText($item['original'] ?? '', 12000),
    'prompt' => cleanText($item['prompt'] ?? '', 30000),
    'mode' => $mode,
    'score' => max(0, min(100, (int) ($item['score'] ?? 0))),
    'createdAt' => cleanText($item['createdAt'] ?? gmdate(DATE_ATOM), 40),
    'updatedAt' => gmdate(DATE_ATOM),
    'meta' => is_array($item['meta'] ?? null) ? [
        'targetTool' => cleanText($item['meta']['targetTool'] ?? '', 40),
        'resolvedModel' => cleanText($item['meta']['resolvedModel'] ?? '', 160),
    ] : [],
    'changes' => is_array($item['changes'] ?? null) ? array_slice(array_values(array_map(static fn($v) => cleanText($v, 900), $item['changes'])), 0, 12) : [],
    'assumptions' => is_array($item['assumptions'] ?? null) ? array_slice(array_values(array_map(static fn($v) => cleanText($v, 900), $item['assumptions'])), 0, 12) : [],
    'validation' => is_array($item['validation'] ?? null) ? array_slice(array_values(array_map(static fn($v) => cleanText($v, 900), $item['validation'])), 0, 12) : [],
    'metrics' => is_array($item['metrics'] ?? null) ? [
        'claridad' => max(0, min(100, (int) ($item['metrics']['claridad'] ?? 0))),
        'contexto' => max(0, min(100, (int) ($item['metrics']['contexto'] ?? 0))),
        'restricciones' => max(0, min(100, (int) ($item['metrics']['restricciones'] ?? 0))),
        'formato' => max(0, min(100, (int) ($item['metrics']['formato'] ?? 0))),
        'verificacion' => max(0, min(100, (int) ($item['metrics']['verificacion'] ?? 0))),
    ] : [],
];

if ($safeItem['prompt'] === '') {
    flock($handle, LOCK_UN);
    fclose($handle);
    respond(422, ['ok' => false, 'error' => 'No se puede guardar un prompt vacío.']);
}

$items = array_values(array_filter($items, static fn(array $existing): bool => ($existing['id'] ?? '') !== $id));
array_unshift($items, $safeItem);
$items = array_slice($items, 0, MAX_ITEMS);
writeItemsLocked($handle, $items);

flock($handle, LOCK_UN);
fclose($handle);
respond(200, ['ok' => true, 'item' => $safeItem, 'items' => $items]);
