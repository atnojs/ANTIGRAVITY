<?php
/**
 * Deploy script para apps/decorar_habitacion/
 * 
 * Se llama desde GitHub webhook tras cada push.
 * Descarga los archivos directamente de raw.githubusercontent.com.
 * Como shell_exec está deshabilitado, usamos file_get_contents() con stream context.
 * 
 * Uso: POST a deploy.php con header X-Hub-Signature-256 para validación
 */

// --- CONFIGURACIÓN ---
$SECRET = getenv('GITHUB_WEBHOOK_SECRET') ?: ''; // Definir en .htaccess o leer de variables de entorno
$BRANCH = 'main';
$REPO_OWNER = 'atnojs';
$REPO_NAME = 'ANTIGRAVITY';
$BASE_PATH = __DIR__;  // apps/decorar_habitacion/

// Archivos a sincronizar (rutas relativas desde la raíz del repo)
$FILES = [
    'apps/decorar_habitacion/index.html',
    'apps/decorar_habitacion/app.js',
    'apps/decorar_habitacion/app.css',
    'apps/decorar_habitacion/proxy.php',
    'apps/decorar_habitacion/history.php',
    'apps/decorar_habitacion/history-manager.js',
    'apps/decorar_habitacion/lightbox.js',
];

// --- VALIDACIÓN DEL WEBHOOK ---
if ($SECRET) {
    $payload = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $SECRET);
    if (!hash_equals($expected, $signature)) {
        http_response_code(403);
        die('Invalid signature');
    }
    $data = json_decode($payload, true);
    // Solo desplegar si es push a la rama correcta
    $ref = $data['ref'] ?? '';
    if ($ref !== "refs/heads/$BRANCH") {
        die("Skipping — not $BRANCH branch");
    }
}

// --- DESCARGA Y ESCRITURA ---
$rawBase = "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$BRANCH/";
$errors = [];
$ok = [];

$context = stream_context_create([
    'http' => [
        'timeout' => 30,
        'user_agent' => 'Deploy-DecorarHabitacion/1.0',
    ]
]);

foreach ($FILES as $file) {
    $url = $rawBase . $file . '?t=' . time();
    $localPath = $BASE_PATH . '/' . basename($file);
    
    $content = @file_get_contents($url, false, $context);
    if ($content === false) {
        $errors[] = "Failed to download: $file";
        continue;
    }
    
    $result = @file_put_contents($localPath, $content);
    if ($result === false) {
        $errors[] = "Failed to write: " . basename($file);
        continue;
    }
    
    $ok[] = basename($file) . ' (' . number_format(strlen($content)) . ' bytes)';
}

// --- RESPUESTA ---
header('Content-Type: application/json');
echo json_encode([
    'success' => empty($errors),
    'deployed' => $ok,
    'errors' => $errors,
    'timestamp' => date('c'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
