<?php
echo "<h2>Chequeo de variables Vertex AI</h2>";

$project = getenv('VERTEX_PROJECT_ID');
$location = getenv('VERTEX_LOCATION');
$jsonPath = getenv('VERTEX_SA_JSON');

echo "<b>VERTEX_PROJECT_ID:</b> " . htmlspecialchars($project ?: 'NO DEFINIDO') . "<br>";
echo "<b>VERTEX_LOCATION:</b> " . htmlspecialchars($location ?: 'NO DEFINIDO') . "<br>";
echo "<b>VERTEX_SA_JSON:</b> " . htmlspecialchars($jsonPath ?: 'NO DEFINIDO') . "<br><br>";

if ($jsonPath && file_exists($jsonPath)) {
    echo "<b>Archivo JSON encontrado ✔️</b><br>";
    $j = json_decode(file_get_contents($jsonPath), true);
    if ($j && isset($j['client_email'])) {
        echo "Service Account: " . htmlspecialchars($j['client_email']) . "<br>";
        echo "Project ID en JSON: " . htmlspecialchars($j['project_id'] ?? '---') . "<br>";
    } else {
        echo "⚠️ El JSON no parece válido o no contiene client_email.<br>";
    }
} else {
    echo "❌ No se encuentra el archivo JSON en la ruta indicada.<br>";
}
?>
