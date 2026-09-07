<?php
/**
 * PROXY PHP — Generador/Editor unificado
 * Generación y edición mediante el contrato canónico de OpenAI y Gemini.
 * Contrato: recibe {prompt, imagen?, calidad?, model?}
 *           responde  {success:true, imageUrl, model}
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

// CORS y OPTIONS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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

// ===== REGISTRO DE STATS (mismo formato que generador_ia_flux) =====
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

// ===== Claves =====
function getKey(string $name): string {
    $config = __DIR__ . '/config.php';
    if (file_exists($config)) { include $config; $k = defined($name) ? constant($name) : ''; if ($k !== '') return $k; }
    foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name]??'', $_SERVER['REDIRECT_'.$name]??'', $_ENV[$name]??'', $_ENV['REDIRECT_'.$name]??''] as $v) {
        if (!empty($v)) return (string)$v;
    }
    return '';
}

$orKey   = getKey('R');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>['message'=>'Solo POST']]);
    exit;
}

$body = file_get_contents('php://input');
if (empty($body)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'Cuerpo vacio']]);
    exit;
}

$data = json_decode($body, true);
if (json_last_error()!==JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error'=>['message'=>'JSON invalido']]);
    exit;
}

// ====================================================================
// ACCIÓN TEXTO (mejorador de prompts vía OpenRouter)
// Contrato: {action:'text', prompt, system?, model?, imagen?} -> {success, text, model}
// ====================================================================
$action = strtolower((string)($data['action'] ?? ''));
if ($action === 'text' || $action === 'openrouter') {
    if ($orKey === '') {
        http_response_code(500);
        echo json_encode(['error'=>['message'=>'Clave OpenRouter (R) no configurada.']]);
        exit;
    }
    $textPrompt = trim((string)($data['prompt'] ?? ''));
    if ($textPrompt === '' && isset($data['contents'][0]['parts'])) {
        foreach ($data['contents'][0]['parts'] as $part) {
            if (!empty($part['text'])) { $textPrompt = trim((string)$part['text']); break; }
        }
    }
    if ($textPrompt === '') {
        http_response_code(400);
        echo json_encode(['error'=>['message'=>'Falta el campo "prompt" para texto.']]);
        exit;
    }
    $systemText = trim((string)($data['system'] ?? ''));
    $textModel = trim((string)($data['model'] ?? 'openai/gpt-4o'));
    if ($textModel === '' || strlen($textModel) > 160 || preg_match('#^[a-zA-Z0-9._:/-]+$#', $textModel) !== 1) {
        $textModel = 'openai/gpt-4o';
    }
    
    // Detectar imagen opcional para análisis visual
    $imagenEntrada = isset($data['imagen']) ? (string)$data['imagen'] : '';
    if ($imagenEntrada === '' && isset($data['contents'][0]['parts'])) {
        foreach ($data['contents'][0]['parts'] as $part) {
            if (!empty($part['inlineData']['data'])) {
                $imagenEntrada = (string)$part['inlineData']['data'];
                break;
            }
        }
    }
    
    $messages = [];
    if ($systemText !== '') $messages[] = ['role' => 'system', 'content' => $systemText];
    
    // Construir mensaje user con imagen si existe
    if ($imagenEntrada !== '') {
        $mime = 'image/jpeg';
        if (strpos($imagenEntrada, 'data:image/png')===0) $mime='image/png';
        elseif (strpos($imagenEntrada, 'data:image/webp')===0) $mime='image/webp';
        $b64 = $imagenEntrada;
        if (strpos($b64, ',') !== false) $b64 = substr($b64, strpos($b64, ',')+1);
        $userContent = [
            ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
            ['type' => 'text', 'text' => $textPrompt]
        ];
        $messages[] = ['role' => 'user', 'content' => $userContent];
    } else {
        $messages[] = ['role' => 'user', 'content' => $textPrompt];
    }

    $payload = ['model' => $textModel, 'messages' => $messages, 'stream' => false];
    $temp = (float)($data['temperature'] ?? 0.7);
    if ($temp >= 0.0 && $temp <= 2.0) $payload['temperature'] = $temp;
    if (isset($data['max_tokens']) && is_numeric($data['max_tokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$data['max_tokens']));
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120, CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($err) { http_response_code(502); echo json_encode(['error'=>['message'=>'Error OpenRouter: '.$err]]); exit; }
    if ($code >= 400) {
        $eb = json_decode($resp, true); $em = $eb['error']['message'] ?? $eb['error'] ?? ('HTTP '.$code);
        if (is_array($em)) $em = json_encode($em);
        http_response_code($code); echo json_encode(['error'=>['message'=>'OpenRouter: '.$em]]); exit;
    }
    $jr = json_decode($resp, true);
    $content = $jr['choices'][0]['message']['content'] ?? '';
    if (is_array($content)) {
        $content = implode("\n", array_map(static fn($p) => is_array($p) ? ($p['text'] ?? '') : (string)$p, $content));
    }
    echo json_encode(['success' => true, 'text' => (string)$content, 'model' => (string)($jr['model'] ?? $textModel)]);
    exit;
}

// Todas las solicitudes de imagen pasan por el contrato canónico.
// Esto elimina cualquier ruta heredada de Flux y mantiene únicamente:
// openai-medium, openai-high, gemini-flash y gemini-pro.
ag_image_response($data, __DIR__);
