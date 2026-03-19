<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

$base   = rtrim(env('ZOER_API_BASE',''), '/');
$apiKey = env('ZOER_API_KEY','');
$url    = $base . '/auth/profile';

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
  ],
  CURLOPT_TIMEOUT => 25,
  CURLOPT_CONNECTTIMEOUT => 15,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS => 3,

  // Fuerza condiciones de red seguras pero tolerantes para debug
  CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_USERAGENT => 'Hostinger-cURL-Diag/1.0',

  // Desactiva verificación SSL SOLO para diagnóstico
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => 0,
  // Algunas pilas requieren cifrados explícitos
  // curl >=7.61: puedes comentar si da error de opción
  CURLOPT_SSL_CIPHER_LIST => 'DEFAULT:!DH',
]);

$res  = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
$eno  = curl_errno($ch);
$inf  = curl_getinfo($ch);
curl_close($ch);

echo "URL: {$url}\n";
echo "HTTP: {$http}\n";
echo "cURL errno: {$eno}\n";
echo "cURL error: {$err}\n\n";

echo "---- curl_getinfo ----\n";
foreach ($inf as $k=>$v) {
  if (is_array($v)) $v = json_encode($v);
  echo $k . ': ' . $v . "\n";
}
echo "\n---- Response ----\n";
echo ($res === false ? '(false)' : $res);
