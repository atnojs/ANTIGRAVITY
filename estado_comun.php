<?php
/**
 * Utilidades compartidas del estado del portal (estado_sitio.json).
 *
 * El estado es VIVO y no se versiona en Git: si entra en el repositorio, cada
 * despliegue de Hostinger lo sobrescribe con la copia antigua y se pierden las
 * categorías y enlaces guardados. Las copias las escribe guardar_cambios.php en
 * copias_estado_sitio/ (tampoco versionada) y aquí se usan para auto-repararse.
 *
 * Los ficheros de estado pueden pesar megas, así que la fecha se lee del final
 * del fichero en lugar de cargarlo entero.
 */

$estado_archivo    = __DIR__ . '/estado_sitio.json';
$estado_dir_copias = __DIR__ . '/copias_estado_sitio';
$estado_backup     = $estado_dir_copias . '/estado_sitio_backup.json';

/** Fecha de última actualización declarada dentro del JSON, o null. */
function estado_fecha($ruta)
{
    if (!is_file($ruta)) {
        return null;
    }
    $manejador = @fopen($ruta, 'rb');
    if ($manejador === false) {
        return null;
    }
    $tamano = @filesize($ruta);
    if (is_int($tamano) && $tamano > 1024) {
        @fseek($manejador, $tamano - 1024);
    }
    $cola = @fread($manejador, 1024);
    @fclose($manejador);

    if (is_string($cola) && preg_match('/ultima_actualizacion"\s*:\s*"([^"]+)"/', $cola, $coincidencias)) {
        return $coincidencias[1];
    }
    return null;
}

/** Lee el estado validando el JSON (sin BOM). Devuelve null si no sirve. */
function estado_leer($ruta)
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
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($datos) || !isset($datos['columns'])) {
        return null;
    }
    return ['datos' => $datos, 'crudo' => $contenido];
}

/**
 * Mantenimiento del estado:
 *   1. Si hay estado y todavía no hay copia, la crea (primera vez).
 *   2. Si la copia es más reciente que el principal, lo restaura (un despliegue
 *      lo pisó). Se comparan las fechas declaradas DENTRO del JSON, nunca el
 *      mtime: un despliegue reescribe el fichero y le pondría la fecha de hoy.
 *
 * Devuelve '' | 'copia_creada' | 'restaurado'.
 */
function estado_mantenimiento($archivo, $backup, $dir_copias)
{
    $fecha_archivo = estado_fecha($archivo);
    $fecha_backup  = estado_fecha($backup);
    $accion = '';

    if ($fecha_backup === null && $fecha_archivo !== null) {
        if (!is_dir($dir_copias)) {
            @mkdir($dir_copias, 0777, true);
        }
        if (@copy($archivo, $backup)) {
            @chmod($backup, 0666);
            $fecha_backup = $fecha_archivo;
            $accion = 'copia_creada';
        }
    }

    if ($fecha_backup !== null && ($fecha_archivo === null || $fecha_backup > $fecha_archivo)) {
        if (@copy($backup, $archivo)) {
            @chmod($archivo, 0666);
            $accion = 'restaurado';
        }
    }

    return $accion;
}
