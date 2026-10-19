<?php
declare(strict_types=1);

/**
 * audio.php — entrega privada de un audio.
 *
 * Los ficheros viven en data/audio/ (denegado por web y fuera de git). Solo se
 * sirven con sesión iniciada, comprobando que la ruta resuelta sigue dentro de
 * la carpeta de audios.
 */

require_once __DIR__ . '/lib.php';
agenda_session_start();
agenda_require_auth();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    agenda_send_json(400, ['ok' => false, 'error' => 'Falta el identificador del audio.']);
}

$state = agenda_state_read();
$index = agenda_find_index($state['audios'], $id);
if ($index < 0) {
    agenda_send_json(404, ['ok' => false, 'error' => 'Audio no encontrado.']);
}
$audio = $state['audios'][$index];
if (!empty($audio['deleted_at']) || empty($audio['file'])) {
    agenda_send_json(410, ['ok' => false, 'error' => 'El audio ya se borró; la transcripción se conserva.']);
}

$absolute = realpath(AGENDA_AUDIO_DIR . '/' . ltrim((string)$audio['file'], '/'));
$root     = realpath(AGENDA_AUDIO_DIR);
if ($absolute === false || $root === false || strpos($absolute, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($absolute)) {
    agenda_send_json(404, ['ok' => false, 'error' => 'Audio no encontrado.']);
}

$mime = (string)($audio['mime'] ?? 'audio/webm');
$size = (int)filesize($absolute);
header('Content-Type: ' . $mime);
header('Content-Length: ' . $size);
header('Content-Disposition: inline; filename="nota-' . $id . '.' . pathinfo($absolute, PATHINFO_EXTENSION) . '"');
header('Cache-Control: private, max-age=0, no-store');
header('X-Content-Type-Options: nosniff');
readfile($absolute);
exit;
