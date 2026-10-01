<?php
/**
 * Estado del panel "Nueva Pestaña".
 *
 * IMPORTANTE (persistencia): estado_nueva_pestaña.json es el estado VIVO del
 * usuario y NO debe versionarse nunca en Git. Si entra en el repositorio, cada
 * despliegue de Hostinger lo sobrescribe con la copia antigua del repositorio y
 * desaparecen las carpetas y enlaces recién guardados. Las copias de seguridad
 * de verdad las escribe guardar_cambios.php en copias_estado_nueva_pestaña/
 * (tampoco versionada).
 *
 * Este endpoint:
 *   1. Devuelve el estado para la app (mismo contrato de siempre).
 *   2. Se auto-repara: si la copia de seguridad del servidor es más reciente
 *      que el fichero principal (por ejemplo porque un despliegue lo pisó),
 *      restaura el principal desde ella.
 *   3. Con ?copias=1 devuelve la lista de copias disponibles (solo lectura)
 *      para que la app pueda restaurar una desde el modal "Copias".
 */
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/estado_nueva_pestaña.json';
$dir_copias   = __DIR__ . '/copias_estado_nueva_pestaña';
$ruta_backup  = $dir_copias . '/estado_nueva_pestaña_backup.json';
$sin_fecha    = '0000-00-00 00:00:00';

/** Lee un JSON de estado y lo valida. Devuelve null si no sirve. */
function leer_estado($ruta)
{
    if (!is_file($ruta)) {
        return null;
    }
    $contenido = @file_get_contents($ruta);
    if ($contenido === false || trim($contenido) === '') {
        return null;
    }
    // Un editor de Windows puede dejar un BOM delante: no es JSON inválido.
    if (substr($contenido, 0, 3) === "\xEF\xBB\xBF") {
        $contenido = substr($contenido, 3);
    }
    $datos = json_decode($contenido, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($datos)) {
        return null;
    }
    if (!isset($datos['columns']) || !is_array($datos['columns'])) {
        return null;
    }
    return $datos;
}

/** Fecha de última actualización declarada dentro del propio estado. */
function fecha_estado($datos)
{
    global $sin_fecha;
    return !empty($datos['ultima_actualizacion']) ? (string) $datos['ultima_actualizacion'] : $sin_fecha;
}

/** Resumen legible de un estado (para el listado de copias). */
function resumen_estado($datos)
{
    $paneles = 0;
    $enlaces = 0;
    $nombres = [];
    foreach ($datos['columns'] as $columna) {
        if (empty($columna['tools']) || !is_array($columna['tools'])) {
            continue;
        }
        foreach ($columna['tools'] as $item) {
            if (!empty($item['isPanelHeader'])) {
                $paneles++;
                $nombres[] = isset($item['name']) ? (string) $item['name'] : '';
                // Los enlaces de un panel viven anidados dentro de él.
                if (!empty($item['tools']) && is_array($item['tools'])) {
                    $enlaces += count($item['tools']);
                }
            } else {
                $enlaces++;
            }
        }
    }
    return ['paneles' => $paneles, 'enlaces' => $enlaces, 'nombres' => $nombres];
}

// --- 1. Auto-reparación: la copia del servidor manda si es más reciente ------
// Se compara la fecha declarada DENTRO del JSON, nunca el mtime: un despliegue
// reescribe el fichero principal y le pondría la fecha de hoy.
$principal = leer_estado($ruta_archivo);
$respaldo  = leer_estado($ruta_backup);

if ($respaldo !== null && fecha_estado($respaldo) > fecha_estado($principal)) {
    @copy($ruta_backup, $ruta_archivo);
    @chmod($ruta_archivo, 0666);
    $principal = $respaldo;
}

// --- 2. Listado de copias disponibles (solo lectura) -------------------------
if (isset($_GET['copias'])) {
    $copias = [];
    $archivos = is_dir($dir_copias) ? glob($dir_copias . '/estado_nueva_pestaña*.json') : [];
    foreach ($archivos as $archivo) {
        $datos = leer_estado($archivo);
        if ($datos === null) {
            continue;
        }
        $copias[] = array_merge([
            'archivo' => basename($archivo),
            'fecha'   => fecha_estado($datos),
            // El backup estático es siempre el estado vigente (load_state.php lo
            // repara desde ahí cuando el principal se queda atrás).
            'actual'  => basename($archivo) === 'estado_nueva_pestaña_backup.json',
        ], resumen_estado($datos));
    }
    usort($copias, function ($a, $b) {
        return strcmp($b['fecha'], $a['fecha']);
    });
    echo json_encode(['success' => true, 'copias' => $copias], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 3. Estado para la app ---------------------------------------------------
if ($principal === null) {
    if (file_exists($ruta_archivo) || $respaldo !== null) {
        // Existe algo, pero no es JSON válido: mejor avisar que mostrar el panel
        // vacío y arriesgarse a que un guardado borre el estado bueno.
        http_response_code(500);
        echo json_encode(['error' => 'El estado del panel no es un JSON válido']);
        exit;
    }
    // Instalación nueva: todavía no hay nada guardado.
    echo json_encode([
        'background' => '',
        'columns' => []
    ]);
    exit;
}

echo json_encode($principal);
