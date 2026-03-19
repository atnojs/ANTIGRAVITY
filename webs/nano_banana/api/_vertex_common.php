<?php
/**
 * Utilidades para autenticar con Vertex AI (Service Account) y llamar a generateContent.
 * Requiere en el entorno (o hardcodear si prefieres):
 *  - VERTEX_PROJECT_ID
 *  - VERTEX_LOCATION   (ej. us-central1)
 *  - VERTEX_SA_JSON    (ruta ABSOLUTA al .json de la service account)
 */

function vertex_env() {
  $project = getenv('VERTEX_PROJECT_ID');
  $loc     = getenv('VERTEX_LOCATION') ?: 'us-central1';
  $sa_path = getenv('VERTEX_SA_JSON');

  if (!$project || !$sa_path || !file_exists($sa_path)) {
    throw new Exception("Faltan VERTEX_PROJECT_ID / VERTEX_SA_JSON o el archivo no existe");
  }
  return [$project, $loc, $sa_path];
}

/** Obtiene un access_token OAuth2 usando la service account (cache ~50 min) */
function vertex_access_token() {
  list($project, $loc, $sa_path) = vertex_env();

  $cache = sys_get_temp_dir() . "/vertex_token.cache.json";
  if (file_exists($cache)) {
    $j = json_decode(file_get_contents($cache), true);
    if ($j && isset($j['access_token'], $j['exp']) && time() < $j['exp'] - 60) {
      return $j['access_token'];
    }
  }

  $sa = json_decode(file_get_contents($sa_path), true);
  $iss = $sa['client_email'];
  $scope = "https://www.googleapis.com/auth/cloud-platform";
  $aud = "https://oauth2.googleapis.com/token";
  $now = time();
  $exp = $now + 3600;

  $jwtHeader  = base64url_encode(json_encode(["alg"=>"RS256","typ"=>"JWT"]));
  $jwtClaim   = base64url_encode(json_encode([
    "iss"=>$iss, "scope"=>$scope, "aud"=>$aud, "exp"=>$exp, "iat"=>$now
  ]));
  $toSign = $jwtHeader . "." . $jwtClaim;

  $pkey = openssl_pkey_get_private($sa['private_key']);
  if (!$pkey) throw new Exception("No se pudo cargar private_key de la SA");
  openssl_sign($toSign, $signature, $pkey, 'sha256WithRSAEncryption');
  $jwt = $toSign . "." . base64url_encode($signature);

  // JWT -> access_token
  $post = http_build_query([
    "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion"  => $jwt
  ]);
  $ch = curl_init("https://oauth2.googleapis.com/token");
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $post,
    CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
    CURLOPT_RETURNTRANSFER => true
  ]);
  $resp = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code < 200 || $code >= 300) throw new Exception("OAuth token error ($code): $resp");

  $tok = json_decode($resp, true);
  $access = $tok['access_token'] ?? null;
  $expires_in = intval($tok['expires_in'] ?? 3600);
  if (!$access) throw new Exception("Token inválido");
  file_put_contents($cache, json_encode(["access_token"=>$access, "exp"=>$now + $expires_in]));
  return $access;
}

function base64url_encode($data) {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** Rate limit básico: 1 req/seg (ajusta si necesitas) */
function rl() {
  $file = sys_get_temp_dir() . "/vertex_rate.lock";
  $now = microtime(true);
  $last = file_exists($file) ? floatval(trim(file_get_contents($file))) : 0;
  $delta = $now - $last;
  if ($delta < 1.0) usleep((int)((1.0 - $delta) * 1000000));
  file_put_contents($file, (string)microtime(true));
}

/** Llamada a Vertex generateContent con backoff ante 429/5xx */
function vertex_generate_content($model_id, $body) {
  list($project, $loc, $sa_path) = vertex_env();
  $token = vertex_access_token();
 $url = "https://aiplatform.googleapis.com/v1beta1/projects/{$project}/locations/{$loc}/publishers/google/models/{$model_id}:generateContent";

  $sleep = 0.8;
  for ($i=0; $i<4; $i++) {
    rl();
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

    if ($code >= 200 && $code < 300) {
      return json_decode($resp, true);
    }
    if ($code == 429 || ($code >= 500 && $code < 600)) {
      usleep((int)($sleep * 1e6));
      $sleep *= 1.7;
      continue;
    }
    throw new Exception("Vertex error ($code): $resp");
  }
  throw new Exception("Vertex sin éxito tras reintentos");
}

/** Extrae la primera imagen base64 de la respuesta */
function vertex_extract_image($json) {
  if (isset($json["candidates"][0]["content"]["parts"])) {
    foreach ($json["candidates"][0]["content"]["parts"] as $p) {
      if (isset($p["inline_data"]["data"])) return $p["inline_data"]["data"];
    }
  }
  return null;
}
