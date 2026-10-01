<?php
/**
 * Estado del portal (estado_sitio.json).
 *
 * IMPORTANTE (persistencia): estado_sitio.json es el estado VIVO del usuario y
 * NO debe versionarse nunca en Git. Si entra en el repositorio, cada despliegue
 * de Hostinger lo sobrescribe con la copia antigua y se pierden las categorías,
 * enlaces y cambios recién guardados.
 *
 * Este endpoint:
 *   1. Devuelve el estado para la app (mismo contrato de siempre).
 *   2. Deja el mantenimiento al día (primera copia y auto-reparación) usando
 *      estado_comun.php.
 *   3. Con ?copias=1 delega en estado_copias.php (listado, solo lectura).
 */
require_once __DIR__ . '/estado_comun.php';

if (isset($_GET['copias'])) {
    require __DIR__ . '/estado_copias.php';
    exit;
}

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$accion = estado_mantenimiento($estado_archivo, $estado_backup, $estado_dir_copias);
$estado = estado_leer($estado_archivo);

if ($estado === null) {
    if (is_file($estado_archivo)) {
        // Existe algo, pero no es JSON válido: mejor avisar que mostrar el panel
        // vacío y arriesgarse a que un guardado borre el estado bueno.
        http_response_code(500);
        echo json_encode(['error' => 'El estado del sitio no es un JSON válido', 'accion' => $accion]);
        exit;
    }
    echo json_encode([
        'background' => '',
        'columns' => []
    ]);
    exit;
}

// Se devuelve el fichero tal cual (validado) para no recodificar megas.
echo $estado['crudo'];
