<?php
/**
 * Deploy script para apps/imagenes_ia/ajustes_imagen/
 * 
 * Permite sincronizar los archivos directamente desde GitHub (raw.githubusercontent.com).
 * Funciona tanto por Webhook de GitHub (POST) como accediendo directamente en el navegador.
 */

// --- CONFIGURACIÓN ---
$SECRET = getenv('GITHUB_WEBHOOK_SECRET') ?: '';
$BRANCH = 'main';
$REPO_OWNER = 'atnojs';
$REPO_NAME = 'ANTIGRAVITY';
$BASE_PATH = __DIR__;

// Archivos a sincronizar
$FILES = [
    'apps/imagenes_ia/ajustes_imagen/index.html',
    'apps/imagenes_ia/ajustes_imagen/app.js',
    'apps/imagenes_ia/ajustes_imagen/app-compiled.js',
    'apps/imagenes_ia/ajustes_imagen/app.css',
    'apps/imagenes_ia/ajustes_imagen/ai-tools.js',
    'apps/imagenes_ia/ajustes_imagen/history-manager.js',
    'apps/imagenes_ia/ajustes_imagen/history.php',
    'apps/imagenes_ia/ajustes_imagen/lightbox.js',
    'apps/imagenes_ia/ajustes_imagen/proxy.php',
    'apps/imagenes_ia/ajustes_imagen/deploy.php',
];

// --- VALIDACIÓN DE WEBHOOK (si viene cabecera de firma de GitHub) ---
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
if ($SECRET && $signature !== '') {
    $payload = file_get_contents('php://input');
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $SECRET);
    if (!hash_equals($expected, $signature)) {
        http_response_code(403);
        die(json_encode(['error' => 'Firma no válida']));
    }
}

// --- DESCARGA Y ESCRITURA ---
$rawBase = "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$BRANCH/";
$errors = [];
$ok = [];

$context = stream_context_create([
    'http' => [
        'timeout' => 30,
        'user_agent' => 'Deploy-AjustesImagen/1.0',
    ]
]);

foreach ($FILES as $file) {
    $url = $rawBase . $file . '?t=' . time();
    $localPath = $BASE_PATH . '/' . basename($file);
    
    $content = @file_get_contents($url, false, $context);
    if ($content === false) {
        $errors[] = "Error descargando: $file";
        continue;
    }
    
    $result = @file_put_contents($localPath, $content);
    if ($result === false) {
        $errors[] = "Error escribiendo: " . basename($file);
        continue;
    }
    
    $ok[] = basename($file) . ' (' . number_format(strlen($content)) . ' bytes)';
}

// --- RESPUESTA ---
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => empty($errors),
    'deployed' => $ok,
    'errors' => $errors,
    'timestamp' => date('c'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
