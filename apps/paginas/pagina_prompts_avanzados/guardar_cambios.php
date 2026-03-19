<?php
// Habilitar reporte detallado de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Recibir datos
$input = file_get_contents('php://input');
if (empty($input)) {
    echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
    exit;
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'JSON inválido: ' . json_last_error_msg()]);
    exit;
}

// Verificar contraseña (ajusta el "1" a tu contraseña real)
if (!isset($data['password']) || $data['password'] !== '1') {
    echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta o faltante']);
    exit;
}

// Validar estructura mínima
if (!isset($data['background']) || !isset($data['mainTitle']) || !isset($data['blocks'])) {
    echo json_encode(['success' => false, 'error' => 'Estructura de datos incorrecta (faltan background, mainTitle o blocks)']);
    exit;
}

// Recuperar appsData y folders (si existen)
$appsData = isset($data['appsData']) ? $data['appsData'] : [];
$folders  = isset($data['folders'])   ? $data['folders']   : [];

// Guardar en archivo
try {
    $ruta_archivo = __DIR__ . '/estado_sitio.json';

    // Prepara el contenido que guardarás
    $contenido = json_encode([
        'background' => $data['background'],
        'mainTitle'  => $data['mainTitle'],
        'blocks'     => $data['blocks'],
        'appsData'   => $appsData,
        'folders'    => $folders,
        'ultima_actualizacion' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    if ($contenido === false) {
        throw new Exception("Error al codificar JSON");
    }

    // Escribe el archivo
    $bytes = file_put_contents($ruta_archivo, $contenido);
    if ($bytes === false) {
        throw new Exception("Error al escribir en el archivo");
    }

    // Forzar permisos (opcional)
    @chmod($ruta_archivo, 0666);

    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'appsData' => $appsData,  // Devolvemos appsData para refrescar en el JS
        'folders'  => $folders,   // Devolvemos folders para refrescar en el JS
        'detalles' => [
            'ruta'  => $ruta_archivo,
            'tamano'=> $bytes
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
