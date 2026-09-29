<?php
// ============================================================
// VIDEO VAULT — proxy mínimo de salud.
// Esta app es un catálogo (no llama a ninguna API de IA de imagen),
// así que NO tiene catálogo de modelos: `models` va vacío a propósito.
// La persistencia de vídeos y favoritos vive en video_store.php;
// el acceso de edición se protege con auth.php.
//
// Acciones de diagnóstico (GET o POST):
//   ?action=health (por defecto) → configured + actions + models
//   ?action=models              → catálogo (vacío: app sin modelos de IA)
// Las claves se leen SOLO del entorno (getenv / REDIRECT_ / $_SERVER /
// $_ENV), con SetEnv en el .htaccess raíz de Hostinger. Nunca se
// devuelven claves ni se leen ficheros locales de configuración.
// ============================================================
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== Claves SOLO por entorno (patrón .htaccess de Hostinger) =====
function getKey(string $name): string
{
    foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $v) {
        if (is_string($v) && trim($v) !== '') return trim($v);
    }
    return '';
}

$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');
$orKey = getKey('R');

// Esta app no maneja modelos de imagen: lista blanca vacía y explícita.
$modelCatalog = [];

$action = strtolower(trim((string)(($_GET['action'] ?? '') ?: 'health')));

if ($action === 'health') {
    echo json_encode([
        'success'    => true,
        'status'     => 'ok',
        'app'        => 'video-vault',
        'configured' => ['openai' => $openaiKey !== '', 'openrouter' => $orKey !== ''],
        'actions'    => ['health', 'models'],
        'models'     => array_keys($modelCatalog),
        'time'       => gmdate('c'),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'models') {
    echo json_encode([
        'success' => true,
        'app'     => 'video-vault',
        'models'  => array_keys($modelCatalog),
        'note'    => 'Esta app es un catálogo de vídeos: no usa modelos de imagen.',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Acción no válida.', 'validActions' => ['health', 'models']]);
