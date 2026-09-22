<?php
/**
 * Historial persistente canónico para apps Antigravity.
 *
 * GET  ?action=list&app=nombre
 * POST ?action=save    cuerpo JSON
 * POST ?action=delete  cuerpo { app, id }
 * POST ?action=clear   cuerpo { app }
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_HISTORY_ITEMS = 200;
const MAX_REQUEST_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_BYTES = 24 * 1024 * 1024;

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function dataDir(): string {
    $directory = __DIR__ . '/history_data';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        respond(500, ['success' => false, 'error' => 'No se pudo crear el almacenamiento del historial.']);
    }
    return $directory;
}

function dataFile(): string {
    return dataDir() . '/history.json';
}

function lockFile() {
    $handle = fopen(dataDir() . '/history.lock', 'c+');
    if ($handle === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo bloquear el historial.']);
    }
    return $handle;
}

function loadHistoryUnlocked(): array {
    $file = dataFile();
    if (!is_file($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    if ($raw === false || $raw === '') {
        return [];
    }
    $history = json_decode($raw, true);
    return is_array($history) ? $history : [];
}

function saveHistoryUnlocked(array $history): void {
    $json = json_encode(array_values($history), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(dataFile(), $json, LOCK_EX) === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo guardar el historial.']);
    }
}

function readJsonBody(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
        respond(413, ['success' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
    }
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '', true);
    if (!is_array($body) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['success' => false, 'error' => 'El cuerpo no contiene JSON válido.']);
    }
    return $body;
}

function sanitizeToken(string $value, string $fallback = ''): string {
    $sanitized = preg_replace('/[^a-zA-Z0-9_-]/', '', $value) ?? '';
    return $sanitized !== '' ? substr($sanitized, 0, 100) : $fallback;
}

function removeImageForEntry(array $entry): void {
    $imageFile = sanitizeToken((string)($entry['imageFile'] ?? ''));
    if ($imageFile === '') {
        return;
    }
    foreach (['png', 'jpg', 'jpeg', 'webp', 'gif'] as $extension) {
        $path = dataDir() . '/' . $imageFile . '.' . $extension;
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

function persistImage(string $id, string $dataUrl): array {
    if (preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#is', $dataUrl, $matches) !== 1) {
        respond(400, ['success' => false, 'error' => 'imageData debe ser una imagen data URL válida.']);
    }
    $extension = strtolower($matches[1]);
    if ($extension === 'jpeg') {
        $extension = 'jpg';
    }
    $binary = base64_decode($matches[2], true);
    if ($binary === false) {
        respond(400, ['success' => false, 'error' => 'La imagen no contiene base64 válido.']);
    }
    if (strlen($binary) > MAX_IMAGE_BYTES) {
        respond(413, ['success' => false, 'error' => 'La imagen supera el máximo de 24 MB.']);
    }
    $baseName = sanitizeToken($id, 'item_' . bin2hex(random_bytes(8)));
    $path = dataDir() . '/' . $baseName . '.' . $extension;
    if (file_put_contents($path, $binary, LOCK_EX) === false) {
        respond(500, ['success' => false, 'error' => 'No se pudo guardar la imagen del historial.']);
    }
    return [$baseName, './history_data/' . rawurlencode($baseName . '.' . $extension)];
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = strtolower((string)($_GET['action'] ?? ($method === 'GET' ? 'list' : '')));

if ($method === 'GET' && $action === 'list') {
    $app = sanitizeToken((string)($_GET['app'] ?? ''));
    $lock = lockFile();
    flock($lock, LOCK_SH);
    $history = loadHistoryUnlocked();
    flock($lock, LOCK_UN);
    fclose($lock);

    if ($app !== '') {
        $history = array_values(array_filter($history, static fn(array $entry): bool => ($entry['app'] ?? '') === $app));
    }
    respond(200, ['success' => true, 'history' => $history, 'count' => count($history)]);
}

if ($method !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$body = readJsonBody();
$app = sanitizeToken((string)($body['app'] ?? ''), 'default');
$lock = lockFile();
if (!flock($lock, LOCK_EX)) {
    fclose($lock);
    respond(500, ['success' => false, 'error' => 'No se pudo acceder al historial.']);
}
$history = loadHistoryUnlocked();

if ($action === 'save') {
    $id = sanitizeToken((string)($body['id'] ?? ''), 'h_' . bin2hex(random_bytes(12)));
    $entry = [
        'id' => $id,
        'app' => $app,
        'type' => sanitizeToken((string)($body['type'] ?? 'item'), 'item'),
        'model' => sanitizeToken((string)($body['model'] ?? ($body['data']['model'] ?? '')), ''),
        'data' => $body['data'] ?? [],
        'createdAt' => (string)($body['createdAt'] ?? date(DATE_ATOM)),
    ];

    if (isset($body['imageData']) && is_string($body['imageData']) && $body['imageData'] !== '') {
        [$imageFile, $imageUrl] = persistImage($id, $body['imageData']);
        $entry['imageFile'] = $imageFile;
        $entry['imageUrl'] = $imageUrl;
    }

    $history = array_values(array_filter($history, static fn(array $existing): bool => ($existing['id'] ?? '') !== $id));
    array_unshift($history, $entry);
    while (count($history) > MAX_HISTORY_ITEMS) {
        $removed = array_pop($history);
        if (is_array($removed)) {
            removeImageForEntry($removed);
        }
    }
    saveHistoryUnlocked($history);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'entry' => $entry, 'count' => count($history)]);
}

if ($action === 'delete') {
    $id = sanitizeToken((string)($body['id'] ?? ''));
    if ($id === '') {
        flock($lock, LOCK_UN);
        fclose($lock);
        respond(400, ['success' => false, 'error' => 'Falta el ID.']);
    }

    $next = [];
    $deleted = false;
    foreach ($history as $entry) {
        if (($entry['id'] ?? '') === $id && ($entry['app'] ?? 'default') === $app) {
            removeImageForEntry($entry);
            $deleted = true;
            continue;
        }
        $next[] = $entry;
    }
    saveHistoryUnlocked($next);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond($deleted ? 200 : 404, ['success' => $deleted, 'deleted' => $deleted ? 1 : 0]);
}

if ($action === 'clear') {
    $next = [];
    $deleted = 0;
    foreach ($history as $entry) {
        if (($entry['app'] ?? 'default') === $app) {
            removeImageForEntry($entry);
            $deleted++;
            continue;
        }
        $next[] = $entry;
    }
    saveHistoryUnlocked($next);
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(200, ['success' => true, 'deleted' => $deleted]);
}

flock($lock, LOCK_UN);
fclose($lock);
respond(400, ['success' => false, 'error' => 'Acción no válida.', 'validActions' => ['list', 'save', 'delete', 'clear']]);
