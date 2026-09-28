<?php
declare(strict_types=1);
/* Script de mantenimiento de UN SOLO USO.
   Elimina el fichero de claves local de esta app (duplicado y anticuado, ya no lo
   lee ningun proxy). No acepta rutas del cliente: el objetivo esta fijado con
   __DIR__, asi que solo puede actuar sobre apps/dibujo_lineas_copia/config.php.
   Exige POST con la cabecera X-Tarea-Token y se retira del repositorio en el
   commit siguiente, por lo que deja de estar publicado. */
header('Content-Type: application/json; charset=utf-8');

$tokenEsperado = '62cb223e15410952c4ab47a7906c4e35';
$tokenRecibido = (string)($_SERVER['HTTP_X_TAREA_TOKEN'] ?? '');
if ((($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') || !hash_equals($tokenEsperado, $tokenRecibido)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'No autorizado.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$objetivo = __DIR__ . '/config.php';
$respuesta = [
    'success'  => true,
    'objetivo' => basename(__DIR__) . '/config.php',
    'existia'  => is_file($objetivo),
    'borrado'  => false,
];

if (is_file($objetivo)) {
    $respuesta['bytes'] = (int)filesize($objetivo);
    $respuesta['borrado'] = (bool)@unlink($objetivo);
}

echo json_encode($respuesta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
