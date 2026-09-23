<?php
// ============================================================
// VIDEO VAULT — proxy mínimo de salud.
// Esta app es un catálogo (no llama a ninguna API de IA).
// La persistencia de vídeos y favoritos vive en video_store.php;
// el acceso de edición se protege con auth.php.
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = strtolower((string)($_GET['action'] ?? 'health'));

if ($action === 'health') {
    echo json_encode([
        'success' => true,
        'status' => 'ok',
        'app' => 'video-vault',
        'time' => gmdate('c'),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Acción no válida.']);
