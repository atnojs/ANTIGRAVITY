<?php
/**
 * Foto A4 — endpoint de salud.
 * La app es estática; este fichero solo confirma que el despliegue responde.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

echo json_encode([
    'ok'      => true,
    'app'     => 'foto-a4',
    'version' => '1.0.0',
    'time'    => gmdate('c'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
