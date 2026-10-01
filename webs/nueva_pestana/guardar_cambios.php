<?php
// Los errores se registran en el log del servidor, pero NUNCA se imprimen en la
// respuesta: cualquier aviso de PHP delante del JSON rompe el response.json()
// del cliente y el guardado parecía fallar aunque hubiera funcionado.
header('Content-Type: application/json');
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
    $ruta_archivo = __DIR__ . '/estado_nueva_pestaña.json';
    $contenido = json_encode([
        'background' => $data['background'],
        'columns' => $data['columns'],
        'ultima_actualizacion' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    // Un despliegue de Hostinger puede haber recreado el fichero con otro
    // propietario o sin permisos de escritura para PHP: se fuerza antes de
    // intentar escribir.
    if (file_exists($ruta_archivo)) {
        @chmod($ruta_archivo, 0666);
    }

    // Sistema de Backups Redundantes
    $dir_backups = __DIR__ . '/copias_estado_nueva_pestaña';
    if (!is_dir($dir_backups)) {
        mkdir($dir_backups, 0777, true);
    }

    // 1. Guardar el backup persistente estático (siempre actualizado)
    $ruta_backup_estatico = $dir_backups . '/estado_nueva_pestaña_backup.json';

    // ¿El estado cambió respecto al último guardado? Sólo entonces se crea una
    // copia nueva con timestamp: así la rotación conserva historial de verdad y
    // no se agota con guardados que no cambiaban nada.
    $estado_canonico = json_encode(
        ['background' => $data['background'], 'columns' => $data['columns']],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    $es_nuevo = true;
    if (file_exists($ruta_backup_estatico)) {
        $previo = json_decode(file_get_contents($ruta_backup_estatico), true);
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

    file_put_contents($ruta_backup_estatico, $contenido);
    chmod($ruta_backup_estatico, 0666);

    // 2. Guardar backup histórico con timestamp (sólo si hay cambios reales)
    if ($es_nuevo) {
        $timestamp = date('Ymd_His');
        $ruta_backup_historico = $dir_backups . '/estado_nueva_pestaña_' . $timestamp . '.json';
        file_put_contents($ruta_backup_historico, $contenido);
        chmod($ruta_backup_historico, 0666);
    }

    // 3. Rotación de copias (mantener las últimas 60)
    $max_copias = 60;
    $patron = $dir_backups . '/estado_nueva_pestaña_*.json';
    $archivos = glob($patron);
    
    // Excluir el backup estático de la lista de rotación
    $archivos_historicos = array_filter($archivos, function($archivo) {
        return basename($archivo) !== 'estado_nueva_pestaña_backup.json';
    });

    if (count($archivos_historicos) > $max_copias) {
        // Ordenar por tiempo de modificación (más antiguos primero)
        usort($archivos_historicos, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        
        // Eliminar excedentes
        $a_eliminar = count($archivos_historicos) - $max_copias;
        for ($i = 0; $i < $a_eliminar; $i++) {
            @unlink($archivos_historicos[$i]);
        }
    }
    
    // El fichero principal se escribe AL FINAL. Si fallara (permisos, disco) el
    // trabajo ya está en la copia de seguridad y load_state.php la restaura en
    // la siguiente carga, en lugar de perderse como pasaba antes.
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