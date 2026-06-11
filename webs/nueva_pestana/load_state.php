<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$ruta_archivo = __DIR__ . '/estado_nueva_pestaña.json';
$ruta_backup = __DIR__ . '/copias_estado_nueva_pestaña/estado_nueva_pestaña_backup.json';

// Lógica de auto-recuperación (Self-healing)
$debe_restaurar = false;

if (file_exists($ruta_backup)) {
    if (!file_exists($ruta_archivo)) {
        // 1. Si el archivo principal no existe
        $debe_restaurar = true;
    } else {
        $contenido_principal = file_get_contents($ruta_archivo);
        $datos_principal = json_decode($contenido_principal, true);
        
        if ($contenido_principal === false || empty($contenido_principal) || json_last_error() !== JSON_ERROR_NONE) {
            // 2. Si el archivo principal está vacío o corrupto
            $debe_restaurar = true;
        } else {
            // 3. Comparar fechas de última actualización
            $contenido_backup = file_get_contents($ruta_backup);
            $datos_backup = json_decode($contenido_backup, true);
            
            if (json_last_error() === JSON_ERROR_NONE) {
                $fecha_principal = isset($datos_principal['ultima_actualizacion']) ? $datos_principal['ultima_actualizacion'] : '';
                $fecha_backup = isset($datos_backup['ultima_actualizacion']) ? $datos_backup['ultima_actualizacion'] : '';
                
                // Si el backup es más reciente por la clave o por fecha de modificación física
                if (strtotime($fecha_backup) > strtotime($fecha_principal) || filemtime($ruta_backup) > filemtime($ruta_archivo)) {
                    $debe_restaurar = true;
                }
            }
        }
    }
}

if ($debe_restaurar) {
    // Restaurar archivo principal desde el backup persistente
    copy($ruta_backup, $ruta_archivo);
    chmod($ruta_archivo, 0666);
}

if (!file_exists($ruta_archivo)) {
    echo json_encode([
        'background' => '',
        'columns' => []
    ]);
    exit;
}

$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo leer el archivo']);
    exit;
}

$datos = json_decode($contenido, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'error' => 'JSON inválido en estado_sitio.json',
        'detalles' => json_last_error_msg()
    ]);
    exit;
}

echo json_encode($datos);
?>