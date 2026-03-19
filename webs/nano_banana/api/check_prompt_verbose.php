<?php
require_once __DIR__ . '/_vertex_common.php';

function call_vertex_verbose($model_id, $body) {
  list($project, $loc) = [getenv('VERTEX_PROJECT_ID'), getenv('VERTEX_LOCATION') ?: 'us-central1'];
  $token = vertex_access_token();
  $url = "https://{$loc}-aiplatform.googleapis.com/v1beta1/projects/{$project}/locations/{$loc}/publishers/google/models/{$model_id}:generateContent";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      "Authorization: Bearer $token",
      "x-goog-user-project: $project",
      "Content-Type: application/json"
    ],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body)
  ]);
  $resp = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, $url, $resp];
}

$model = "gemini-3.1-flash-image-preview";
$body  = ["contents"=>[[ "parts"=>[[ "text"=>"Ping de prueba" ]] ]]];

list($code, $url, $resp) = call_vertex_verbose($model, $body);

header('Content-Type: text/html; charset=utf-8');
echo "<b>MODEL:</b> $model<br>";
echo "<b>PROJECT:</b> ".getenv('VERTEX_PROJECT_ID')."<br>";
echo "<b>LOCATION:</b> ".getenv('VERTEX_LOCATION')."<br>";
echo "<b>URL:</b> $url<br>";
echo "<b>HTTP:</b> $code<br>";
echo "<pre>".htmlspecialchars($resp)."</pre>";

