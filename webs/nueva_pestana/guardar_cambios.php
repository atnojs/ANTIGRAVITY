<?php
// Habilitar reporte detallado de errores
ini_set('display_errors', 1);
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
    
    $bytes = file_put_contents($ruta_archivo, $contenido);
    
    if ($bytes === false) {
        throw new Exception("Error al escribir en el archivo");
    }
    
    // Forzar permisos
    chmod($ruta_archivo, 0666);

    // Sistema de Backups Redundantes
    $dir_backups = __DIR__ . '/copias_estado_nueva_pestaña';
    if (!is_dir($dir_backups)) {
        mkdir($dir_backups, 0777, true);
    }

    // 1. Guardar el backup persistente estático (siempre actualizado)
    $ruta_backup_estatico = $dir_backups . '/estado_nueva_pestaña_backup.json';
    file_put_contents($ruta_backup_estatico, $contenido);
    chmod($ruta_backup_estatico, 0666);

    // 2. Guardar backup histórico con timestamp
    $timestamp = date('Ymd_His');
    $ruta_backup_historico = $dir_backups . '/estado_nueva_pestaña_' . $timestamp . '.json';
    file_put_contents($ruta_backup_historico, $contenido);
    chmod($ruta_backup_historico, 0666);

    // 3. Rotación de copias (mantener sólo las últimas 20)
    $patron = $dir_backups . '/estado_nueva_pestaña_*.json';
    $archivos = glob($patron);
    
    // Excluir el backup estático de la lista de rotación
    $archivos_historicos = array_filter($archivos, function($archivo) {
        return basename($archivo) !== 'estado_nueva_pestaña_backup.json';
    });

    if (count($archivos_historicos) > 20) {
        // Ordenar por tiempo de modificación (más antiguos primero)
        usort($archivos_historicos, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        
        // Eliminar excedentes
        $a_eliminar = count($archivos_historicos) - 20;
        for ($i = 0; $i < $a_eliminar; $i++) {
            @unlink($archivos_historicos[$i]);
        }
    }
    
    echo json_encode([
        'success' => true,
        'detalles' => [
            'ruta' => $ruta_archivo,
            'tamano' => $bytes,
            'backup' => true
        ]
    ]);
    
} catch (Exception $e) {
    die(json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'detalles_tecnicos' => [
            'error_get_last' => error_get_last(),
            'permisos_archivo' => file_exists($ruta_archivo) ? substr(sprintf('%o', fileperms($ruta_archivo)), -4) : 'No existe',
            'espacio_disco' => disk_free_space(__DIR__)
        ]
    ]));
}
?>