<?php
// load_state.php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Sat, 01 Jan 2000 00:00:00 GMT'); // Fecha pasada para no cachear

$ruta_archivo = __DIR__ . '/estado_sitio.json';

if (!file_exists($ruta_archivo)) {
    // Estructura por defecto si el archivo no existe
    echo json_encode([
        'settings' => [
            'background' => '',
            'theme' => 'dark', // Tema oscuro por defecto
            'lastActiveCategoryFilter' => '_all_',
            'lastAppCategoryFilter' => '_all_',
        ],
        'aiAppsCategories' => [],
        'prompts' => [],
        'promptFolders' => []
    ]);
    exit;
}

$contenido = file_get_contents($ruta_archivo);
if ($contenido === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo leer el archivo de estado.']);
    exit;
}

$datos = json_decode($contenido, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'error' => 'JSON inválido en el archivo de estado.',
        'detalles' => json_last_error_msg()
    ]);
    exit;
}

echo json_encode($datos);
?>