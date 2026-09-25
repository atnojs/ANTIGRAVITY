<?php
// Proxy for StoryWeaver Character Generator
// Catálogo 2.5: openai-medium/high (gpt-image-2.5-flare),
// openai-xhigh (gpt-image-2.5-sunburst), openai-max-flare
// (gpt-image-2.5-flare/max), openai-max-sunburst
// (gpt-image-2.5-sunburst/max) + gemini-flash/pro (Google directo, A).
// La llamada OpenAI (generations/edits) la ejecuta ag_image_response()
// de canonical-image-model.php. Otros modelos rechazados (400).
// Texto/visión (enhancePrompt / analyzeMaskPosition): modelo de texto
// xiaomi/mimo-v2.6-pro vía OpenRouter.
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido', 405);

  // API Key (B) — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
  $apiKey = '';
    if (!$apiKey || empty($apiKey)) {
      $apiKey = getenv('A');
  }
  if (!$apiKey || empty($apiKey)) {
      $apiKey = getenv('REDIRECT_A');
  }
  if (!$apiKey || empty($apiKey)) {
      $apiKey = $_SERVER['A'] ?? '';
  }
  if (!$apiKey || empty($apiKey)) {
      $apiKey = $_SERVER['REDIRECT_A'] ?? '';
  }
  if (!$apiKey || empty($apiKey)) {
      $apiKey = $_ENV['A'] ?? '';
  }
  if (!$apiKey || empty($apiKey)) {
      $apiKey = $_ENV['REDIRECT_A'] ?? '';
  }
  if (!$apiKey || empty($apiKey)) {
      http_response_code(500);
      echo json_encode(['error' => ['message' => 'API key no configurada.']]);
      exit;
  }

  
  $input = file_get_contents('php://input');
  $json = json_decode($input, true);
  if (!is_array($json)) throw new Exception('JSON inválido o cuerpo vacío', 400);

  $task        = $json['task'] ?? '';
  // Selección de modelo: lista blanca (catálogo 2.5 + backend Gemini directo propio).
  $requestedModel = strtolower(trim((string)($json['model'] ?? '')));
  if ($requestedModel === 'gemini-3.1-flash-image-preview' || $requestedModel === 'gemini-3.1-flash-image') $requestedModel = 'gemini-flash';
  if ($requestedModel === 'gemini-3-pro-image-preview' || $requestedModel === 'gemini-3-pro-image') $requestedModel = 'gemini-pro';
  if ($task === 'generateImage') {
      // Otros modelos rechazados (400), fuera de la lista blanca.
      if (preg_match('#f'.'lux#i', $requestedModel) || preg_match('#f'.'lux#i', (string)($json['provider'] ?? ''))) {
          http_response_code(400);
          echo json_encode(['error' => 'Modelo no soportado.']);
          exit;
      }
      // OpenAI 2.5 → contrato canónico ag_image_response (gpt-image-2.5).
      if ($requestedModel === '' || strpos($requestedModel, 'openai-') === 0) {
          if ($requestedModel === '') $json['model'] = 'openai-medium';
          ag_image_response($json, __DIR__);
      }
      // gemini-flash / gemini-pro / legacy → backend Gemini directo (clave A)
      // de esta app, CONSERVADO tal cual (cae al bloque siguiente).
  }
  $provider    = $json['provider'] ?? 'gemini'; 
  $prompt      = (string)($json['prompt'] ?? '');
  $images      = $json['images'] ?? [];
  $maskImage   = $json['maskImage'] ?? null; 
  $aspectRatio = $json['aspectRatio'] ?? '1:1';
  $modalities  = $json['modalities'] ?? ['IMAGE']; 

  $callApi = function($url, $body, $headers) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST           => true,
      CURLOPT_HTTPHEADER     => $headers,
      CURLOPT_POSTFIELDS     => json_encode($body),
      CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
      CURLOPT_SSL_VERIFYPEER => false 
    ]);
    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($resp === false) throw new Exception('Error conexión cURL: ' . $err, 502);
    
    $data = json_decode($resp, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception('Respuesta no válida del proveedor (no es JSON). Código: ' . $status, 502);

    if ($status < 200 || $status >= 300) {
       $msg = $data['error']['message'] ?? $data['detail'] ?? ('Error HTTP ' . $status);
       throw new Exception('API Error: ' . $msg, $status);
    }
    return $data;
  };

// ════════════════════════════════════════════════════════════════════════
// TEXTO/VISIÓN → OpenRouter xiaomi/mimo-v2.6-pro (clave R).
// Devuelve [$httpcode, $response] con $response en FORMA GEMINI (candidates)
// para mantener el contrato con los frontends existentes.
// ════════════════════════════════════════════════════════════════════════
$mimoTextCall = function (array $req, array $genCfg) {
    // ── Clave R (OpenRouter): config.php → getenv → REDIRECT_ → $_SERVER → $_ENV
    $orKey = '';
    if (!defined('R')) {
        $rCfg = __DIR__ . '/config.php';
        if (file_exists($rCfg)) { include_once $rCfg; }
    }
    if (defined('R') && R !== '') { $orKey = (string)R; }
    if ($orKey === '') { $orKey = (string)(getenv('R') ?: getenv('REDIRECT_R') ?: ''); }
    if ($orKey === '') { $orKey = (string)($_SERVER['R'] ?? $_SERVER['REDIRECT_R'] ?? ''); }
    if ($orKey === '') { $orKey = (string)($_ENV['R'] ?? $_ENV['REDIRECT_R'] ?? ''); }
    if ($orKey === '') {
        return [500, json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada.']])];
    }

    // ── system
    $systemText = '';
    if (isset($req['system']) && is_string($req['system'])) {
        $systemText = trim($req['system']);
    } else {
        $sysParts = $req['systemInstruction']['parts'] ?? $req['system_instruction']['parts'] ?? $req['payload']['systemInstruction']['parts'] ?? null;
        if (is_array($sysParts)) {
            foreach ($sysParts as $p) { if (!empty($p['text'])) { $systemText .= (string)$p['text'] . "\n"; } }
            $systemText = trim($systemText);
        }
    }

    // ── contents (formato Google) → messages (formato OpenRouter)
    $contents = null;
    if (isset($req['contents']) && is_array($req['contents'])) { $contents = $req['contents']; }
    elseif (isset($req['payload']['contents']) && is_array($req['payload']['contents'])) { $contents = $req['payload']['contents']; }

    $messages = [];
    if ($systemText !== '') { $messages[] = ['role' => 'system', 'content' => $systemText]; }

    if ($contents !== null) {
        foreach ($contents as $c) {
            if (!is_array($c)) { continue; }
            $role = (($c['role'] ?? 'user') === 'model') ? 'assistant' : 'user';
            $parts = (isset($c['parts']) && is_array($c['parts'])) ? $c['parts'] : [$c];
            $content = [];
            foreach ($parts as $p) {
                if (!empty($p['text'])) {
                    $content[] = ['type' => 'text', 'text' => (string)$p['text']];
                } elseif (!empty($p['inlineData']['data']) || !empty($p['inline_data']['data'])) {
                    $mime = (string)($p['inlineData']['mimeType'] ?? $p['inline_data']['mime_type'] ?? 'image/jpeg');
                    $data = (string)($p['inlineData']['data'] ?? $p['inline_data']['data']);
                    $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $data]];
                }
            }
            if (!$content) { continue; }
            $messages[] = ['role' => $role, 'content' => (count($content) === 1 && $content[0]['type'] === 'text') ? $content[0]['text'] : $content];
        }
    } else {
        $prompt = (string)($req['prompt'] ?? '');
        if ($prompt === '') { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }
        $imageB64 = (string)($req['base64ImageData'] ?? $req['image'] ?? '');
        if ($imageB64 !== '') {
            $b64 = $imageB64;
            if (strpos($b64, ',') !== false) { $b64 = substr($b64, strpos($b64, ',') + 1); }
            $mime = (string)($req['mimeType'] ?? 'image/jpeg');
            if (strpos($imageB64, 'data:image/png') === 0) { $mime = 'image/png'; }
            elseif (strpos($imageB64, 'data:image/webp') === 0) { $mime = 'image/webp'; }
            $messages[] = ['role' => 'user', 'content' => [
                ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $b64]],
                ['type' => 'text', 'text' => $prompt],
            ]];
        } else {
            $messages[] = ['role' => 'user', 'content' => $prompt];
        }
    }

    $hasUser = false;
    foreach ($messages as $m) { if ($m['role'] === 'user' || $m['role'] === 'assistant') { $hasUser = true; break; } }
    if (!$hasUser) { return [400, json_encode(['error' => ['message' => 'Falta el prompt.']])]; }

    // ── payload OpenRouter
    $payload = ['model' => 'xiaomi/mimo-v2.6-pro', 'messages' => $messages, 'stream' => false];
    if (isset($genCfg['temperature']) && is_numeric($genCfg['temperature'])) {
        $t = (float)$genCfg['temperature'];
        if ($t >= 0.0 && $t <= 2.0) { $payload['temperature'] = $t; }
    }
    if (isset($genCfg['maxOutputTokens']) && is_numeric($genCfg['maxOutputTokens'])) {
        $payload['max_tokens'] = max(1, min(32768, (int)$genCfg['maxOutputTokens']));
    }
    if (isset($genCfg['responseMimeType']) && $genCfg['responseMimeType'] === 'application/json') {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    // ── llamada OpenRouter
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => ['Content-Type: ' . 'application/json', 'Authorization: Bearer ' . $orKey, 'accept: application/json'],
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) { return [500, json_encode(['error' => ['message' => 'Error cURL: ' . $err]])]; }

    $orData = json_decode($raw, true);
    if ($code >= 400 || isset($orData['error'])) {
        $msg = 'Error HTTP ' . $code;
        if (isset($orData['error']) && is_array($orData['error'])) { $msg = (string)($orData['error']['message'] ?? $msg); }
        elseif (isset($orData['error'])) { $msg = (string)$orData['error']; }
        return [$code ?: 500, json_encode(['error' => ['message' => $msg]])];
    }

    $text = '';
    if (isset($orData['choices'][0]['message']['content'])) {
        $ct = $orData['choices'][0]['message']['content'];
        $text = is_string($ct) ? $ct : json_encode($ct, JSON_UNESCAPED_UNICODE);
    }

    // ── respuesta con forma Gemini (contrato intacto)
    $gem = [
        'candidates' => [[
            'content' => ['role' => 'model', 'parts' => [['text' => $text]]],
            'finishReason' => 'STOP',
            'index' => 0,
        ]],
        'modelVersion' => 'xiaomi/mimo-v2.6-pro',
    ];
    return [200, json_encode($gem, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
};

  // --- TAREA: MEJORAR PROMPT ---
  if ($task === 'enhancePrompt') {
    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter
    $isMaskMode = $json['isMaskMode'] ?? false;

    if ($isMaskMode) {
        $sysPrompt = "Eres un experto en edición de imágenes (Inpainting). El usuario quiere editar una ZONA ESPECÍFICA (máscara). Genera 4 variantes del prompt en ESPAÑOL describiendo SOLO el contenido nuevo para la zona enmascarada para que se integre bien (iluminación, estilo). Separa con '|||'.";
    } else {
        $sysPrompt = "Eres un experto en prompts de arte IA. Genera 4 versiones mejoradas del prompt en ESPAÑOL. Separa con '|||'.";
    }
    
    $body = [
      'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $sysPrompt . "\n\nPROMPT USUARIO: " . $prompt ]] ]],
      'generationConfig' => [ 'responseModalities' => ['TEXT'], 'temperature' => 0.7 ]
    ];
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (respuesta con forma Gemini)
    [$httpcode, $response] = $mimoTextCall($body, $body['generationConfig'] ?? []);
    $data = json_decode($response, true);
    if ($httpcode >= 400) {
      $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
      throw new Exception('API Error: ' . $msg, $httpcode);
    }
    $text = '';
    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $p) { if (isset($p['text'])) $text .= $p['text']; }
    }
    if (empty($text)) throw new Exception('Gemini no devolvió texto.', 500);
    $options = array_values(array_filter(array_map('trim', explode('|||', $text))));
    echo json_encode(['options' => $options]);
    exit;
  }

  // --- NUEVA TAREA: ANALIZAR POSICIÓN DE MÁSCARA ---
  if ($task === 'analyzeMaskPosition') {
      if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);
      
      // Análisis de visión de máscara: texto/visión → modelo de texto:
      // xiaomi/mimo-v2.6-pro vía OpenRouter
      
      // La imagen viene en $images[0]
      if (empty($images) || empty($images[0]['data'])) throw new Exception('No se recibió la imagen para analizar.', 400);

      $sysPrompt = "Eres un asistente de edición de imágenes. He marcado una o varias zonas con un color ROJO semitransparente en esta imagen.
      
      TU TAREA:
      Analiza dónde están situadas esas zonas rojas (izquierda, derecha, centro, arriba, fondo, primer plano, etc.).
      Genera una PLANTILLA DE PROMPT en ESPAÑOL para editar esas zonas.
      Usa marcadores entre corchetes como [DESCRIBE AQUÍ] para que yo rellene el contenido.
      
      EJEMPLO DE SALIDA:
      'Añade [DESCRIBE OBJETO] en la zona roja a la derecha y [DESCRIBE OBJETO] en la zona roja de la izquierda, manteniendo la iluminación natural.'
      
      Responde SOLO con la plantilla de texto, nada más.";

      $parts = [
          ['text' => $sysPrompt],
          ['inlineData' => ['data' => $images[0]['data'], 'mimeType' => $images[0]['mimeType']]]
      ];

      $body = [
        'contents' => [[ 'role' => 'user', 'parts' => $parts ]],
        'generationConfig' => [ 'responseModalities' => ['TEXT'], 'temperature' => 0.4 ]
      ];

      // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (respuesta con forma Gemini)
      [$httpcode, $response] = $mimoTextCall($body, $body['generationConfig'] ?? []);
      $data = json_decode($response, true);
      if ($httpcode >= 400) {
          $msg = $data['error']['message'] ?? ('Error HTTP ' . $httpcode);
          throw new Exception('API Error: ' . $msg, $httpcode);
      }
      
      $textResponse = '';
      if(isset($data['candidates'][0]['content']['parts'])) {
          foreach ($data['candidates'][0]['content']['parts'] as $p) {
              if (isset($p['text'])) $textResponse .= $p['text'];
          }
      }

      if (empty($textResponse)) throw new Exception('No se pudo generar la plantilla.', 500);

      echo json_encode(['template' => trim($textResponse)]);
      exit;
  }

  // --- TAREA: GENERAR IMAGEN ---
  if ($task === 'generateImage') {
    
        if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);
        
        $model = ($requestedModel === 'gemini-pro') ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . urlencode($apiKey);

        $parts = [];
        foreach ($images as $img) {
            if (!empty($img['data']) && !empty($img['mimeType'])) {
                $parts[] = ['inlineData' => ['data' => $img['data'], 'mimeType' => $img['mimeType']]];
            }
        }
        if ($maskImage && !empty($maskImage['data']) && !empty($maskImage['mimeType'])) {
             $parts[] = ['inlineData' => ['data' => $maskImage['data'], 'mimeType' => $maskImage['mimeType']]];
        }
        $parts[] = ['text' => $prompt];

        $genConfig = [ 'responseModalities' => $modalities ];
        if (in_array('IMAGE', $modalities) && !empty($aspectRatio)) {
            $genConfig['imageConfig'] = ['aspectRatio' => $aspectRatio];
        }

        $body = [
          'contents' => [[ 'role' => 'user', 'parts' => $parts ]],
          'generationConfig' => $genConfig
        ];

        $data = $callApi($url, $body, ['Content-Type: application/json']);

        $imageB64 = null; $mime = 'image/png';
        if(isset($data['candidates'][0]['content']['parts'])) {
            foreach ($data['candidates'][0]['content']['parts'] as $p) {
                if (isset($p['inlineData']['data'])) {
                    $imageB64 = $p['inlineData']['data'];
                    $mime = $p['inlineData']['mimeType'] ?? 'image/png';
                    break;
                }
            }
        }

        if ($imageB64) { 
            echo json_encode(['image' => $imageB64, 'mimeType' => $mime, 'type' => 'image']); 
            exit; 
        }

        $textResponse = '';
        if(isset($data['candidates'][0]['content']['parts'])) {
            foreach ($data['candidates'][0]['content']['parts'] as $p) {
                if (isset($p['text'])) $textResponse .= $p['text'];
            }
        }
        
        if ($textResponse) { 
            echo json_encode(['text' => $textResponse, 'type' => 'text']); 
            exit; 
        }
        throw new Exception('Gemini no generó imagen ni texto. Motivo: ' . ($data['promptFeedback']['blockReason'] ?? 'Desconocido'));
    }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>


