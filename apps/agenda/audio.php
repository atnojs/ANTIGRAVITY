<?php
declare(strict_types=1);

/**
 * audio.php — sirve las notas de voz SOLO con sesión iniciada.
 *
 * El .htaccess de la app reescribe /uploads/audio/<fichero> a este script,
 * de modo que los audios nunca se sirven como ficheros estáticos públicos.
 * Soporta Range para que el reproductor pueda buscar dentro del audio.
 */

require_once __DIR__ . '/lib.php';
agenda_session_start();

if (!agenda_is_authenticated()) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'error' => 'Sesión no iniciada.']);
    exit;
}

$file = basename((string)($_GET['file'] ?? ''));
if ($file === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*\.(webm|ogg|opus|m4a|aac|mp3|wav)$/', $file) !== 1) {
    http_response_code(404);
    exit;
}

$path = AGENDA_AUDIO_DIR . '/' . $file;
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

$extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$mimeByExtension = [
    'webm' => 'audio/webm',
    'ogg'  => 'audio/ogg',
    'opus' => 'audio/ogg',
    'm4a'  => 'audio/mp4',
    'aac'  => 'audio/aac',
    'mp3'  => 'audio/mpeg',
    'wav'  => 'audio/wav',
];
$mime = $mimeByExtension[$extension] ?? 'application/octet-stream';

$size = (int)filesize($path);
$start = 0;
$end = $size - 1;
$partial = false;

if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', (string)$_SERVER['HTTP_RANGE'], $matches) === 1) {
    if ($matches[1] !== '') {
        $start = (int)$matches[1];
    }
    if ($matches[2] !== '') {
        $end = (int)$matches[2];
    }
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header('Content-Range: bytes */' . $size);
        exit;
    }
    $end = min($end, $size - 1);
    $partial = true;
}

$length = $end - $start + 1;

http_response_code($partial ? 206 : 200);
header('Content-Type: ' . $mime);
header('Accept-Ranges: bytes');
header('Content-Length: ' . $length);
header('Cache-Control: private, max-age=0, must-revalidate');
header('X-Content-Type-Options: nosniff');
if ($partial) {
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
}

$handle = fopen($path, 'rb');
if ($handle === false) {
    http_response_code(500);
    exit;
}
fseek($handle, $start);
$remaining = $length;
while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(65536, $remaining));
    if ($chunk === false) {
        break;
    }
    echo $chunk;
    $remaining -= strlen($chunk);
}
fclose($handle);
