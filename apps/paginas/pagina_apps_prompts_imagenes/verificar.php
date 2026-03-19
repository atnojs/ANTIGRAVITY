<?php
header("Content-Type: text/plain");
$jsonFile = 'estado_sitio.json';

if (file_exists($jsonFile)) {
    $content = file_get_contents($jsonFile);
    echo "Contenido del archivo estado_sitio.json:\n\n";
    echo $content;
    
    // Verificar si el blockNavTitle está presente
    $data = json_decode($content, true);
    echo "\n\nValor de blockNavTitle: " . ($data['blockNavTitle'] ?? 'NO ENCONTRADO');
} else {
    echo "El archivo $jsonFile no existe!";
}
?>
