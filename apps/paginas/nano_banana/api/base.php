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

  $prompt = $payload['prompt_base'] ?? '';
  if(!$prompt){ throw new Exception('Prompt vacío'); }

  $neg = $payload['negative_prompt'] ?? null;
  $seed = $payload['seed'] ?? null;
  $variation = $payload['variation'] ?? '30';
  $size = $payload['size'] ?? '1024';
  $style = $payload['style'] ?? 'fotorrealista';
  $styleStrength = $payload['style_strength'] ?? '75';

  $base_inicial = $payload['base_inicial_base64'] ?? null;
  $base_previa = $payload['base_previa_base64'] ?? null;

  $API_KEY = getenv('GOOGLE_API_KEY');
  if(!$API_KEY){ $API_KEY = 'AIzaSyA1uwquL3vheNtPpvT5qLcbj6kFlBm9JEg'; }

  $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=" . urlencode($API_KEY);

  $parts = [];
  $text = "Crea/refina una imagen base en estilo {$style} con intensidad ".intval($styleStrength)."/100. Prompt: {$prompt}.";
  if($neg){ $text .= " Evita: {$neg}."; }
  $text .= " Mantén composición y mejora detalle. Si hay imagen previa, tómala como referencia para refinar.";
  $parts[] = [ "text" => $text ];

  if($base_inicial){
    $parts[] = [ "inline_data" => [ "mime_type" => "image/jpeg", "data" => $base_inicial ] ];
  }
  if($base_previa){
    $parts[] = [ "inline_data" => [ "mime_type" => "image/jpeg", "data" => $base_previa ] ];
  }

  $genCfg = [ "temperature" => max(0.0, min(1.0, floatval($variation)/100.0)), "seed" => $seed ? intval($seed) : null ];

  $body = [ "contents" => [ [ "parts" => $parts ] ], "generationConfig" => $genCfg ];

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
