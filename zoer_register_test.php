<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

$base = rtrim(env('ZOER_API_BASE',''), '/');
$url  = $base . '/auth/register/'; // Zoer redirige a la barra final

$data = [
  "email"    => "test" . rand(1000,9999) . "@atnojs.es",
  "password" => "12345678",
  "name"     => "Test User"
];

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_UNICODE),
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "Accept: application/json"
  ],
  CURLOPT_TIMEOUT => 25,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS => 5,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
]);

$res  = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

echo "URL: $url\n";
echo "HTTP: $http\n";
if ($err) echo "cURL error: $err\n";
echo "Response:\n$res\n";
