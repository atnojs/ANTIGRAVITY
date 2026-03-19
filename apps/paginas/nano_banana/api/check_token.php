<?php
require_once __DIR__ . '/_vertex_common.php';

try {
    $token = vertex_access_token();
    echo "<h2>Access token generado correctamente ✔️</h2>";
    echo "<pre>" . substr($token, 0, 60) . "...</pre>";

    // llamada mínima a Vertex AI (echo simple)
    $MODEL_ID = "gemini-3.1-flash-image-preview";
    $body = [
        "contents" => [[ "parts" => [[ "text" => "Ping de prueba desde Vertex AI" ]] ]]
    ];
    $json = vertex_generate_content($MODEL_ID, $body);

    echo "<h3>Respuesta Vertex</h3>";
    echo "<pre>" . htmlspecialchars(json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)) . "</pre>";

} catch (Exception $e) {
    echo "<h2>❌ Error</h2>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}

