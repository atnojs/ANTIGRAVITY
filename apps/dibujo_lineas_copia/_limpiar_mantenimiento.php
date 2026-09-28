<?php
declare(strict_types=1);
/* Limpieza de UN SOLO USO.
   El despliegue de Hostinger no borra los ficheros que se retiran del repositorio,
   asi que el script temporal de mantenimiento (_mantenimiento_limpiar_config.php)
   seguia publicado. Este limpiador lo elimina y se autodestruye al ejecutarse, de
   modo que no queda ningun endpoint de borrado accesible.
   Exige POST con la cabecera X-Tarea-Token y no acepta rutas del cliente. */
header('Content-Type: application/json; charset=utf-8');

$tokenEsperado = '11861be86b79647d8e4d8e5e8e6ff81a';
$tokenRecibido = (string)($_SERVER['HTTP_X_TAREA_TOKEN'] ?? '');
if ((($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') || !hash_equals($tokenEsperado, $tokenRecibido)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'No autorizado.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$resultado = [];
foreach ([__DIR__ . '/_mantenimiento_limpiar_config.php'] as $ruta) {
    $existia = is_file($ruta);
    $resultado[basename($ruta)] = [
        'existia' => $existia,
        'borrado' => $existia ? (bool)@unlink($ruta) : false,
    ];
}

// Autodestruccion: este fichero tampoco debe quedarse publicado.
$resultado[basename(__FILE__)] = ['autodestruido' => (bool)@unlink(__FILE__)];

echo json_encode(['success' => true, 'resultado' => $resultado], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
