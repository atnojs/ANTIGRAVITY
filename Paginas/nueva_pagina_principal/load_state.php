<?php
/**
 * Estado del portal (estado_sitio.json).
 *
 * IMPORTANTE (persistencia): estado_sitio.json es el estado VIVO del usuario y
 * NO debe versionarse nunca en Git. Si entra en el repositorio, cada despliegue
 * de Hostinger lo sobrescribe con la copia antigua del repositorio y se pierden
 * las categorías, enlaces y cambios recién guardados. Las copias buenas las
 * escribe guardar_cambios.php en copias_estado_sitio/ (tampoco versionada).
 *
 * Este endpoint:
 *   1. Devuelve el estado para la app (mismo contrato de siempre).
 *   2. Crea la primera copia de seguridad si aún no existe.
 *   3. Se auto-repara: si la copia es más reciente que el fichero principal
 *      (por ejemplo porque un despliegue lo pisó), restaura el principal.
 *   4. Con ?copias=1 devuelve el listado de copias disponibles (solo lectura,
 *      sin volcar el estado completo).
 */
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/estado_sitio.json';
$dir_copias   = __DIR__ . '/copias_estado_sitio';
$ruta_backup  = $dir_copias . '/estado_sitio_backup.json';
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
    $columnas = 0;
    $items = 0;
    foreach ($datos['columns'] as $columna) {
        $columnas++;
        foreach (['tools', 'links'] as $clave) {
            if (empty($columna[$clave]) || !is_array($columna[$clave])) {
                continue;
            }
            foreach ($columna[$clave] as $item) {
                $items++;
                if (is_array($item)) {
                    foreach (['tools', 'links'] as $sub) {
                        if (!empty($item[$sub]) && is_array($item[$sub])) {
                            $items += count($item[$sub]);
                        }
                    }
                }
            }
        }
    }
    return ['columnas' => $columnas, 'items' => $items];
}

// --- 1. Primera copia de seguridad (una sola vez) ---------------------------
$principal = leer_estado($ruta_archivo);
$respaldo  = leer_estado($ruta_backup);

if ($respaldo === null && $principal !== null) {
    if (!is_dir($dir_copias)) {
        @mkdir($dir_copias, 0777, true);
    }
    if (@copy($ruta_archivo, $ruta_backup)) {
        @chmod($ruta_backup, 0666);
        $respaldo = $principal;
    }
}

// --- 2. Auto-reparación: la copia manda si es más reciente ------------------
// Se compara la fecha declarada DENTRO del JSON, nunca el mtime: un despliegue
// reescribe el fichero principal y le pondría la fecha de hoy.
if ($respaldo !== null && fecha_estado($respaldo) > fecha_estado($principal)) {
    @copy($ruta_backup, $ruta_archivo);
    @chmod($ruta_archivo, 0666);
    $principal = $respaldo;
}

// --- 3. Listado de copias disponibles (solo lectura) ------------------------
if (isset($_GET['copias'])) {
    $copias = [];
    $archivos = is_dir($dir_copias) ? glob($dir_copias . '/estado_sitio*.json') : [];
    foreach ($archivos as $archivo) {
        $datos = leer_estado($archivo);
        if ($datos === null) {
            continue;
        }
        $copias[] = array_merge([
            'archivo' => basename($archivo),
            'fecha'   => fecha_estado($datos),
            'bytes'   => (int) @filesize($archivo),
            'actual'  => basename($archivo) === 'estado_sitio_backup.json',
        ], resumen_estado($datos));
    }
    usort($copias, function ($a, $b) {
        return strcmp($b['fecha'], $a['fecha']);
    });
    echo json_encode(['success' => true, 'copias' => $copias], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 4. Estado para la app --------------------------------------------------
if ($principal === null) {
    if (file_exists($ruta_archivo) || $respaldo !== null) {
        http_response_code(500);
        echo json_encode(['error' => 'El estado del sitio no es un JSON válido']);
        exit;
    }
    echo json_encode([
        'background' => '',
        'columns' => []
    ]);
    exit;
}

echo json_encode($principal);
