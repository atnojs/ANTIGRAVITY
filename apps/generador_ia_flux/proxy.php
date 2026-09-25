<?php
// ============================================================
// PROXY PHP - Generador / Editor de imágenes OpenAI y Gemini.
// Compatible Hostinger (cascade de fuentes de clave).
// Catálogo 2.5 vía canonical-image-model.php: openai-medium/high
// (gpt-image-2.5-flare), openai-xhigh (gpt-image-2.5-sunburst),
// openai-max-flare (gpt-image-2.5-flare/max), openai-max-sunburst
// (gpt-image-2.5-sunburst/max) + gemini-flash/pro (OpenRouter R).
// La llamada OpenAI (generations/edits) la ejecuta
// ag_image_generate() de canonical-image-model.php.
// Modelos fuera de la lista blanca: rechazo con 400.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);
if (is_array($canonicalBody)) {
    try {
        $result = ag_image_generate($canonicalBody, __DIR__);
        recordStat((string)($result['model'] ?? $canonicalBody['model'] ?? 'openai-medium'));
        echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    } catch (Throwable $error) {
        $status = (int)$error->getCode();
        if ($status < 400 || $status > 599) $status = 500;
        http_response_code($status);
        echo json_encode(['error'=>['message'=>$error->getMessage()]], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
    exit;
}
http_response_code(400);
echo json_encode(['error' => ['message' => 'Petición inválida.']]);
