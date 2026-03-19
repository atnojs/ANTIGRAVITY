<?php
// app-ia-v2/api/check_prompt.php
require_once __DIR__ . '/_vertex_common.php';

header('Content-Type: text/html; charset=utf-8');

try {
  // 1) PROMPT DE PRUEBA (puedes cambiarlo)
  $prompt = "High-end studio photo of a green cap on gradient background, softbox lighting, clean shadows, premium catalog look";

  // 2) Construimos la petición (texto solo; el modelo devuelve imagen)
 $MODEL_ID = "gemini-3.1-flash-image-preview";

$body = [
  "contents" => [[
    "parts" => [[ "text" => "Di 'ok' si ves este mensaje" ]]
  ]],
  "generationConfig" => [
    "temperature" => 0.3,
    "seed" => 12345
  ]
];


  // 3) Llamada a Vertex
  $json = vertex_generate_content($MODEL_ID, $body);

  // 4) Extraer imagen base64
  $img64 = vertex_extract_image($json);
  if (!$img64) {
    echo "<h3>Respuesta sin imagen</h3><pre>".htmlspecialchars(json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES))."</pre>";
    exit;
  }

  // 5) Guardar JPG en disco público
  $outDir = __DIR__ . "/../test_out";              // app-ia-v2/test_out/
  if (!is_dir($outDir)) { mkdir($outDir, 0775, true); }
  $fname = "gemini_test_" . date("Ymd_His") . ".jpg";
  $fpath = $outDir . "/" . $fname;
  file_put_contents($fpath, base64_decode($img64));

  // 6) URL pública (ajústala si tu ruta cambia)
  $publicUrl = rtrim(dirname(dirname($_SERVER['REQUEST_SCHEME'].'://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'])), '/')
             . "/test_out/" . $fname;

  echo "<h2>✔ Imagen generada y guardada</h2>";
  echo "<p><b>Prompt:</b> ".htmlspecialchars($prompt)."</p>";
  echo "<p><a href='".htmlspecialchars($publicUrl)."' target='_blank'>Abrir JPG</a></p>";
  echo "<img src='data:image/jpeg;base64,".$img64."' style='max-width:640px;border:1px solid #ccc;border-radius:8px' />";
} catch (Exception $e) {
  echo "<h2>❌ Error</h2><pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}

// Extrae el texto de la respuesta de Vertex
function vertex_extract_text($json) {
  foreach (($json['candidates'] ?? []) as $c) {
    foreach (($c['content']['parts'] ?? []) as $p) {
      if (isset($p['text'])) return $p['text'];
    }
  }
  return null;
}

// --- tu flujo ---
$json = vertex_generate_content($MODEL_ID, $body);

$txt = vertex_extract_text($json);
if ($txt) {
  header('Content-Type: text/html; charset=utf-8');
  echo "<h2>✅ Respuesta de gemini-3.1-flash-image-preview</h2>";
  echo "<pre>".htmlspecialchars($txt)."</pre>";
} else {
  echo "<h2>⚠️ Respuesta sin texto</h2><pre>"
     .htmlspecialchars(json_encode($json, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE))
     ."</pre>";
}

