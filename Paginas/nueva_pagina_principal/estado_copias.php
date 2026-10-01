<?php
/**
 * Listado de copias de seguridad del estado (solo lectura).
 *
 * Existe como endpoint propio para poder consultarlo sin descargar el estado,
 * que puede pesar megas. También deja el mantenimiento al día (crea la primera
 * copia si aún no existe), así que es la forma barata de arrancar el sistema de
 * copias en un estado que todavía no tenía ninguna.
 *
 *   https://atnojs.es/estado_copias.php
 */
require_once __DIR__ . '/estado_comun.php';

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$accion = estado_mantenimiento($estado_archivo, $estado_backup, $estado_dir_copias);

$copias = [];
$archivos = is_dir($estado_dir_copias) ? glob($estado_dir_copias . '/estado_sitio*.json') : [];
foreach ((array) $archivos as $archivo) {
    $fecha = estado_fecha($archivo);
    $copias[] = [
        'archivo' => basename($archivo),
        'fecha'   => $fecha !== null ? $fecha : 'sin fecha',
        'bytes'   => (int) @filesize($archivo),
        'actual'  => basename($archivo) === basename($estado_backup),
    ];
}
usort($copias, function ($a, $b) {
    return strcmp($b['fecha'], $a['fecha']);
});

echo json_encode([
    'success' => true,
    'estado'  => basename($estado_archivo),
    'accion'  => $accion,
    'copias'  => $copias
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
