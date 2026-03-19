<?php
// Proxy downloader (Hostinger). PHP 8+, cURL opcional. Requiere yt-dlp disponible en el servidor.
// Acciones:
//  - analyze: devuelve metadata y formatos
//  - download: descarga en servidor y devuelve download_url
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        echo json_encode(['error'=>'Fallo interno en PHP','details'=>$e['message']], JSON_UNESCAPED_UNICODE);
    }
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'Método no permitido. Usa POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error'=>'Body vacío.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error'=>'JSON inválido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = (string)($req['action'] ?? '');
$url    = trim((string)($req['url'] ?? ''));
if ($action === '' || $url === '') {
    http_response_code(400);
    echo json_encode(['error'=>'Faltan campos: action o url.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Seguridad básica: permitir solo http/https
if (!preg_match('~^https?://~i', $url)) {
    http_response_code(400);
    echo json_encode(['error'=>'URL inválida. Debe empezar por http(s)://'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Comprobar si se puede ejecutar comandos
$canExec = function_exists('shell_exec') || function_exists('exec');
if (!$canExec) {
    http_response_code(500);
    echo json_encode(['error'=>'El servidor no permite ejecutar comandos (shell_exec/exec deshabilitado).'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Ruta a yt-dlp: intenta "yt-dlp" primero.
// Si tu Hostinger lo tiene en otra ruta, ponla fija aquí (por ejemplo /usr/local/bin/yt-dlp).
$YTDLP = 'yt-dlp';

// Carpeta de descargas
$downloadsDir = __DIR__ . DIRECTORY_SEPARATOR . 'downloads';
if (!is_dir($downloadsDir)) {
    @mkdir($downloadsDir, 0755, true);
}
if (!is_dir($downloadsDir) || !is_writable($downloadsDir)) {
    http_response_code(500);
    echo json_encode(['error'=>'No se puede escribir en /downloads. Crea la carpeta "downloads" con permisos de escritura.'], JSON_UNESCAPED_UNICODE);
    exit;
}

function run_cmd(string $cmd, int &$exitCode = null): string {
    $out = [];
    $code = 0;
    @exec($cmd . ' 2>&1', $out, $code);
    $exitCode = $code;
    return implode("\n", $out);
}

function j($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}

// Comprobar yt-dlp
$testCode = 0;
$test = run_cmd(escapeshellcmd($YTDLP) . ' --version', $testCode);
if ($testCode !== 0 || trim($test) === '') {
    j([
        'error' => 'yt-dlp no está disponible en el servidor.',
        'details' => 'Instala yt-dlp o usa un servidor/VPS. Salida: ' . trim($test)
    ], 500);
}

if ($action === 'analyze') {
    // --dump-single-json devuelve un JSON con metadata y formats
    $cmd = escapeshellcmd($YTDLP)
    . ' --cookies ' . escapeshellarg(__DIR__ . '/cookies.txt')
    . ' --dump-single-json --no-warnings '
    . escapeshellarg($url);

    $code = 0;
    $out = run_cmd($cmd, $code);
    if ($code !== 0) {
        j(['error'=>'No se pudo analizar el enlace.','details'=>$out], 502);
    }
    $json = json_decode($out, true);
    if (!is_array($json)) {
        j(['error'=>'Salida inválida de yt-dlp.','details'=>substr($out,0,4000)], 502);
    }
    j($json, 200);
}

if ($action === 'download') {
    $formatId = (string)($req['format_id'] ?? '');
    if ($formatId === '') {
        j(['error'=>'Falta format_id.'], 400);
    }

    // Generar nombre seguro
    $token = bin2hex(random_bytes(8));
    $outTemplate = $downloadsDir . DIRECTORY_SEPARATOR . $token . '.%(ext)s';

    // Descargar con el formato seleccionado.
    // Nota: algunos vídeos requieren merge; si ffmpeg no existe, puede fallar para ciertos formatos.
    $cmd = escapeshellcmd($YTDLP)
    . ' --cookies ' . escapeshellarg(__DIR__ . '/cookies.txt')
    . ' -f ' . escapeshellarg($formatId)
    . ' --no-warnings'
    . ' -o ' . escapeshellarg($outTemplate)
    . ' ' . escapeshellarg($url);


    $code = 0;
    $out = run_cmd($cmd, $code);
    if ($code !== 0) {
        j(['error'=>'Error descargando.','details'=>$out], 502);
    }

    // Encontrar el archivo generado
    $matches = glob($downloadsDir . DIRECTORY_SEPARATOR . $token . '.*');
    if (!$matches || !is_file($matches[0])) {
        j(['error'=>'Descarga completada pero no se encontró el archivo.','details'=>$out], 502);
    }
    $filePath = $matches[0];
    $fileName = basename($filePath);

    // Devolver URL pública. Ajusta si tu estructura difiere.
    // Si proxy.php está en /public_html/miapp/proxy.php => downloads estará en /public_html/miapp/downloads/
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $downloadUrl = $base . '/downloads/' . rawurlencode($fileName);

    j([
        'ok' => true,
        'download_url' => $downloadUrl,
        'file' => $fileName
    ], 200);
}

j(['error'=>'Acción no soportada. Usa analyze o download.'], 400);
