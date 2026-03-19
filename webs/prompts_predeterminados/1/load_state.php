<?php
header('Content-Type: application/json');
$ruta = __DIR__ . '/estado_galeria.json';

if (!file_exists($ruta)) {
    echo json_encode([
        'background' => '', 
        'columns' => [
            ['title' => 'Galeria', 'tools' => []]
        ]
    ]);
} else {
    echo file_get_contents($ruta);
}
?>