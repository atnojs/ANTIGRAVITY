<?php
header('Content-Type: application/json');

function call_gemini($url, $body, $retries=3, $sleep=0.8){
  for($i=0; $i<$retries; $i++){
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => [ "Content-Type: application/json" ],
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => json_encode($body)
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if($resp !== false && $code >=200 && $code<300){ return $resp; }
    if($code==429 || ($code>=500 && $code<600)){ usleep((int)($sleep*1000000)); $sleep *= 1.6; continue; }
    break;
  }
  if($resp===false){ throw new Exception("No se pudo conectar: $err"); }
  throw new Exception("Error API Gemini ($code): ".$resp);
}

try {
  $raw = file_get_contents('php://input');
  $payload = json_decode($raw, true);

  $base = $payload['base_definitiva_base64'] ?? null;
  $imgs = $payload['imagenes_secundarias_base64'] ?? [];
  if(!$base){ throw new Exception('Falta base definitiva'); }
  if(!$imgs || !is_array($imgs)){ throw new Exception('Faltan imágenes a integrar'); }

  $instr = $payload['instrucciones_globales'] ?? null;
  $preserveStyle = $payload['preserve_style'] ?? true;

  $API_KEY = getenv('GOOGLE_API_KEY');
  if(!$API_KEY){ $API_KEY = 'AIzaSyAlyFoKY3jXgehHfpZ_S_aSg75fVyOFryE'; }

  $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=" . urlencode($API_KEY);

  $parts = [];
  $text = "Integra de forma realista todas las imágenes en la base. Ajusta luz, sombras, perspectiva y color.";
  if($instr){ $text .= " Instrucciones globales: {$instr}."; }
  if($preserveStyle){ $text .= " Mantén el estilo y grano de la base para coherencia visual."; }
  $parts[] = [ "text" => $text ];

  $parts[] = [ "inline_data" => [ "mime_type" => "image/jpeg", "data" => $base ] ];
  foreach($imgs as $i64){
    $parts[] = [ "inline_data" => [ "mime_type" => "image/jpeg", "data" => $i64 ] ];
  }

  $body = [ "contents" => [ [ "parts" => $parts ] ] ];

  $resp = call_gemini($url, $body);
  $json = json_decode($resp, true);

  $imageBase64 = null;
  if(isset($json["candidates"][0]["content"]["parts"])){
    foreach($json["candidates"][0]["content"]["parts"] as $p){
      if(isset($p["inline_data"]["data"])){ $imageBase64 = $p["inline_data"]["data"]; break; }
    }
  }
  if(!$imageBase64){ throw new Exception('Sin imagen en la respuesta'); }

  echo json_encode([ "ok"=>true, "image_base64"=>$imageBase64 ]);
} catch(Exception $e){
  http_response_code(200);
  echo json_encode([ "ok"=>false, "error"=>$e->getMessage() ]);
}
?>
