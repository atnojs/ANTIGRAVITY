<?php
require_once __DIR__ . '/_vertex_common.php';

$project = getenv('VERTEX_PROJECT_ID');
$loc = getenv('VERTEX_LOCATION') ?: 'us-central1';
$token = vertex_access_token();

$url = "https://aiplatform.googleapis.com/v1beta1/projects/{$project}/locations/{$loc}/publishers/google/models?pageSize=200";


$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer $token",
    "x-goog-user-project: $project"
  ]
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($code);
header('Content-Type: text/html; charset=utf-8');

if ($code < 200 || $code >= 300) {
  echo "<pre>$resp</pre>";
  exit;
}

$data = json_decode($resp, true);
echo "<h3>Modelos disponibles en $loc</h3><ul>";
foreach (($data['models'] ?? []) as $m) {
  echo "<li>" . htmlspecialchars($m['name']) . "</li>";
}
echo "</ul><p>El ID que uses en check_prompt.php debe coincidir con lo que aparece tras <code>/models/</code>.</p>";
