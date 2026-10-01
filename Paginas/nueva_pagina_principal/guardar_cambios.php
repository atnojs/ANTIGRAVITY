<?php
/**
 * Guarda el estado del portal (estado_sitio.json).
 *
 * El estado es VIVO y no se versiona en Git: si entra en el repositorio, cada
 * despliegue de Hostinger lo sobrescribe y se pierde lo guardado. Además de
 * escribirlo, aquí se mantienen copias en copias_estado_sitio/ (no versionada)
 * para que load_state.php pueda restaurarlas y ?copias=1 las liste.
 */
header('Content-Type: application/json');
// Los avisos de PHP se registran pero NUNCA se imprimen: ensuciarían el JSON y
// el cliente pensarían que el guardado falló.
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Recibir datos
$input = file_get_contents('php://input');
if (empty($input)) {
    die(json_encode(['success' => false, 'error' => 'No se recibieron datos']));
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die(json_encode(['success' => false, 'error' => 'JSON inválido: ' . json_last_error_msg()]));
}

// Verificar contraseña
if (!isset($data['password']) || $data['password'] !== '0') {
    die(json_encode(['success' => false, 'error' => 'Contraseña incorrecta o faltante']));
}

// Validar estructura de datos
if (!isset($data['background']) || !isset($data['columns'])) {
    die(json_encode(['success' => false, 'error' => 'Estructura de datos incorrecta']));
}

// Guardar en archivo
try {
    $ruta_archivo = __DIR__ . '/estado_sitio.json';
    $contenido = json_encode([
        'background' => $data['background'],
        'columns' => $data['columns'],
        'ultima_actualizacion' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    // Un despliegue puede haber recreado el fichero con otros permisos.
    if (file_exists($ruta_archivo)) {
        @chmod($ruta_archivo, 0666);
    }

    // Sistema de copias redundantes
    $dir_copias = __DIR__ . '/copias_estado_sitio';
    if (!is_dir($dir_copias)) {
        mkdir($dir_copias, 0777, true);
    }

    // 1. Copia persistente estática (siempre actualizada)
    $ruta_backup = $dir_copias . '/estado_sitio_backup.json';

    // ¿Cambió algo respecto al último guardado? Sólo entonces merece una copia
    // con timestamp: estos estados pueden pesar megas y la rotación es finita.
    $estado_canonico = json_encode(
        ['background' => $data['background'], 'columns' => $data['columns']],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    $es_nuevo = true;
    if (file_exists($ruta_backup)) {
        $previo = json_decode(file_get_contents($ruta_backup), true);
        if (is_array($previo) && isset($previo['columns'])) {
            $previo_canonico = json_encode(
                [
                    'background' => isset($previo['background']) ? $previo['background'] : '',
                    'columns' => $previo['columns']
                ],
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
            $es_nuevo = ($previo_canonico !== $estado_canonico);
        }
    }

    file_put_contents($ruta_backup, $contenido);
    chmod($ruta_backup, 0666);

    // 2. Copia histórica con timestamp (sólo si hay cambios reales)
    if ($es_nuevo) {
        $ruta_historica = $dir_copias . '/estado_sitio_' . date('Ymd_His') . '.json';
        file_put_contents($ruta_historica, $contenido);
        chmod($ruta_historica, 0666);
    }

    // 3. Rotación: por número de copias y por espacio total ocupado.
    $max_copias = 10;
    $max_bytes = 120 * 1024 * 1024;
    $historicas = array_values(array_filter(
        glob($dir_copias . '/estado_sitio_*.json'),
        function ($archivo) {
            return basename($archivo) !== 'estado_sitio_backup.json';
        }
    ));
    usort($historicas, function ($a, $b) {
        return filemtime($a) - filemtime($b); // más antiguas primero
    });

    $total = 0;
    foreach ($historicas as $archivo) {
        $total += (int) @filesize($archivo);
    }
    while (count($historicas) > 1 && (count($historicas) > $max_copias || $total > $max_bytes)) {
        $vieja = array_shift($historicas);
        $tamano = (int) @filesize($vieja);
        if (!@unlink($vieja)) {
            break;
        }
        $total -= $tamano;
    }

    // 4. El fichero principal se escribe AL FINAL: si fallara, el trabajo ya
    // está en la copia y load_state.php lo restaura en la siguiente carga.
    $bytes = @file_put_contents($ruta_archivo, $contenido);
    $principal_escrito = ($bytes !== false);
    if ($principal_escrito) {
        @chmod($ruta_archivo, 0666);
    }

    echo json_encode([
        'success' => true,
        'detalles' => [
            'ruta' => $ruta_archivo,
            'tamano' => $principal_escrito ? $bytes : 0,
            'backup' => true,
            'principal_escrito' => $principal_escrito
        ],
        'aviso' => $principal_escrito ? null : 'No se pudo escribir el estado directamente, pero se guardó la copia de seguridad y se restaurará al recargar la página.'
    ]);
} catch (Exception $e) {
    die(json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'detalles_tecnicos' => [
            'error_get_last' => error_get_last(),
            'permisos_archivo' => (isset($ruta_archivo) && file_exists($ruta_archivo)) ? substr(sprintf('%o', fileperms($ruta_archivo)), -4) : 'No existe',
            'espacio_disco' => @disk_free_space(__DIR__)
        ]
    ]));
}
?>
