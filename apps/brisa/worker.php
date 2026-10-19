<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require_once __DIR__.'/lib/audio.php';
try {
    cleanup_audio();
    $deadline=time()+240;
    do { $result=process_audio(); echo json_encode($result).PHP_EOL; } while (!in_array($result['status'],['idle','unconfigured','busy'],true) && time()<$deadline);
} catch (Throwable $e) { fwrite(STDERR,'Brisa: '.$e->getMessage().PHP_EOL); exit(1); }
