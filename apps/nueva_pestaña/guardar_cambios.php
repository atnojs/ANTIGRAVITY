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
    
    echo json_encode([
        'success' => true,
        'detalles' => [
            'ruta' => $ruta_archivo,
            'tamano' => $bytes
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