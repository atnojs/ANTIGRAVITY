<?php
/**
 * Deploy script para webs/relatos/
 * 
 * Se llama desde GitHub webhook tras cada push.
 * Descarga los archivos directamente de raw.githubusercontent.com.
 * Como shell_exec está deshabilitado, usamos file_get_contents() con stream context.
 * 
 * Uso: POST a deploy.php con header X-Hub-Signature-256 para validación
 */

// --- CONFIGURACIÓN ---
$SECRET = getenv('GITHUB_WEBHOOK_SECRET') ?: ''; // Definir en .htaccess: SetEnv GITHUB_WEBHOOK_SECRET "..."
$BRANCH = 'main';
$REPO_OWNER = 'atnojs';
$REPO_NAME = 'ANTIGRAVITY';
$BASE_PATH = __DIR__;  // webs/relatos/

// Archivos a sincronizar (rutas relativas desde la raíz del repo)
$FILES = [
    'webs/relatos/index.html',
    'webs/relatos/app.js',
    'webs/relatos/styles.css',
    'webs/relatos/data.js',
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
        'user_agent' => 'Deploy-Relatos/1.0',
    ]
]);

foreach ($FILES as $file) {
    $url = $rawBase . $file;
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
