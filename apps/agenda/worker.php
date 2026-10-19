<?php
declare(strict_types=1);

/**
 * worker.php — procesa audios pendientes y purga los que superan retención.
 *
 * Uso normal: cron de hPanel cada 5 minutos (red de seguridad; el flujo real
 * transcribe al terminar la subida, en segundo plano):
 *
 *   php /home/USUARIO/domains/atnojs.es/public_html/apps/agenda/worker.php
 *
 * También sirve para reprocesar a mano:
 *
 *   php worker.php 12
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Solo CLI.\n";
    exit;
}

define('AGENDA_INTERNAL', true);
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/proxy.php';

$arg = $argv[1] ?? '';
$processed = 0;

if ($arg !== '' && ctype_digit((string)$arg)) {
    agenda_process_audio((int)$arg);
    $processed++;
} else {
    $state = agenda_state_read();
    foreach ($state['audios'] as $audio) {
        if ($processed >= 5) {
            break;
        }
        $status = $audio['status'] ?? '';
        if ($status === 'uploaded' || ($status === 'failed' && (int)($audio['attempts'] ?? 0) < AGENDA_MAX_ATTEMPTS)) {
            agenda_process_audio((int)$audio['id']);
            $processed++;
        }
    }
}

agenda_cleanup_audio();
echo 'Procesados: ' . $processed . PHP_EOL;
