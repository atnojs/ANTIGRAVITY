<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
  // Modelo OpenAI Image 2 (gpt-image-2) como respaldo del proxy.
  $defaultOpenAiImageModel = 'openai-image-2';
  // Diagnostico del proxy (no gasta API): que claves ve el entorno y que modelos
  // acepta. Uso: POST {"action":"health"}. Nunca devuelve las claves.
  $action = strtolower(trim((string)(json_decode((string)file_get_contents('php://input'), true)['action'] ?? '')));
  if ($action === 'health' || $action === 'models') {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') throw new Exception('Método no permitido', 405);
    $secret = function (string ...$names): string {
      foreach ($names as $name) {
        foreach ([getenv($name), getenv('REDIRECT_' . $name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '', $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? ''] as $value) {
          if (is_string($value) && trim($value) !== '') return trim($value);
        }
      }
      return '';
    };
    $imageCatalog = function_exists('ag_image_catalog') ? ag_image_catalog() : [$defaultOpenAiImageModel => []];
    $configured = [
      'openai' => $secret('OPENAI_API_KEY', 'O') !== '',
      'openrouter' => $secret('R') !== '',
    ];
    if ($action === 'health') {
      http_response_code(200);
      echo json_encode([
        'success' => true,
        'configured' => $configured,
        'models' => array_values(array_keys($imageCatalog)),
        'actions' => ['generateImage', 'enhancePrompt', 'analyzeMaskPosition', 'health', 'models'],
      ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
    // action=models: consulta REAL a OpenAI, solo ids de imagen, cache 600 s.
    $openaiKey = $secret('OPENAI_API_KEY', 'O');
    if ($openaiKey === '') {
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => 'La clave de OpenAI (OPENAI_API_KEY/O) no está configurada en el servidor.']);
      exit;
    }
    $cacheDir = __DIR__ . '/qwen_cache';
    $cacheFile = $cacheDir . '/openai_models.json';
    $cached = is_file($cacheFile) ? json_decode((string)@file_get_contents($cacheFile), true) : null;
    if (is_array($cached) && (time() - (int)($cached['at'] ?? 0)) < 600 && !empty($cached['ids'])) {
      $ids = array_values((array)$cached['ids']);
    } else {
      $ch = curl_init('https://api.openai.com/v1/models');
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $openaiKey],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
      ]);
      $raw = curl_exec($ch);
      $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      $data = json_decode((string)$raw, true);
      if ($code >= 400 || !is_array($data)) {
        http_response_code(502);
        echo json_encode(['success' => false, 'error' => 'No se pudo consultar la lista de modelos.', 'detail' => 'HTTP ' . $code]);
        exit;
      }
      $ids = [];
      foreach (($data['data'] ?? []) as $model) {
        $id = (string)($model['id'] ?? '');
        if ($id !== '' && preg_match('/image/i', $id) === 1) $ids[] = $id;
      }
      sort($ids);
      if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
      @file_put_contents($cacheFile, json_encode(['at' => time(), 'ids' => $ids], JSON_UNESCAPED_SLASHES));
    }
    http_response_code(200);
    echo json_encode(['success' => true, 'imageModels' => $ids], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido', 405);

  // API Key — cascadeo robusto (.htaccess raiz → env → REDIRECT_ → $_SERVER → $_ENV)
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
  if ($task === 'generateImage') {
      if (!isset(ag_image_catalog()[(string)($json['model'] ?? '')])) $json['model'] = $defaultOpenAiImageModel;
      ag_image_response($json, __DIR__);
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

  // --- TAREA: MEJORAR PROMPT ---
  if ($task === 'enhancePrompt') {
    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);
    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);
    $isMaskMode = $json['isMaskMode'] ?? false;

    if ($isMaskMode) {
        $sysPrompt = "Eres un experto en edición de imágenes (Inpainting). El usuario quiere editar una ZONA ESPECÍFICA (máscara). Genera 4 variantes del prompt en ESPAÑOL describiendo SOLO el contenido nuevo para la zona enmascarada para que se integre bien (iluminación, estilo). ";
    } else {
    $sysPrompt = "Eres un experto en edición de imágenes con IA. El usuario tiene una imagen base y quiere un cambio ESPECÍFICO.

REGLAS ESTRICTAS:
1. Genera exactamente 4 variaciones del cambio solicitado
2. TODAS las variaciones deben respetar el MISMO cambio específico pedido
3. NUNCA cambies el sujeto, composición ni añadas elementos no solicitados
4. Solo varía: intensidad, tono del color, o detalles menores del cambio
5. La imagen original debe permanecer intacta excepto por el cambio pedido
6. Cada variación debe incluir 'mantén el resto de la imagen idéntica'

Ejemplo:
Usuario: 'cambiar color del sofá'
Respuestas correctas:
- Cambia el sofá a azul marino profundo, mantén el resto de la imagen idéntica
- Cambia el sofá a rojo burdeos cálido, preserva todos los demás elementos
- Cambia el sofá a verde bosque, mantén exactamente la misma escena
- Cambia el sofá a blanco crema, conserva el resto sin cambios

Respuestas INCORRECTAS (NUNCA hagas esto):
- Transforma la escena en una biblioteca ❌
- Crea una interpretación artística ❌
- Cambia el fondo ❌

Usa los tipos: Descriptiva, Cinematográfica, Artística, Minimalista.

Genera EXACTAMENTE 4 objetos JSON, uno por cada tipo. En ESPAÑOL.";
}
    
    $body = [
      'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $sysPrompt . "\n\nPROMPT USUARIO: " . $prompt ]] ]],
      'generationConfig' => [
        'responseModalities' => ['TEXT'],
        'temperature' => 0.7,
        'responseMimeType' => 'application/json',
        'responseSchema' => [
          'type' => 'ARRAY',
          'items' => [
            'type' => 'OBJECT',
            'properties' => [
              'type' => ['type' => 'STRING'],
              'text' => ['type' => 'STRING']
            ],
            'required' => ['type', 'text']
          ]
        ]
      ]
    ];
    $data = $callApi($modelUrl, $body, ['Content-Type: application/json']);
    $text = '';
    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $p) { if (isset($p['text'])) $text .= $p['text']; }
    }
    if (empty($text)) throw new Exception('Gemini no devolvió texto.', 500);
    $parsed = json_decode($text, true);
    if (!is_array($parsed)) throw new Exception('Gemini no devolvió JSON válido. Respuesta: ' . substr($text, 0, 200), 500);
    $options = array_map(fn($item) => $item['text'] ?? '', $parsed);
    $options = array_values(array_filter($options, fn($t) => !empty(trim($t))));
    if (count($options) === 0) throw new Exception('No se generaron opciones válidas.', 500);
    echo json_encode(['options' => $options]);
    exit;
  }

  // --- NUEVA TAREA: ANALIZAR POSICIÓN DE MÁSCARA ---
  if ($task === 'analyzeMaskPosition') {
      if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);
      
      // Usamos Flash para análisis rápido de visión
      $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);
      
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

      $data = $callApi($modelUrl, $body, ['Content-Type: application/json']);
      
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
        
        $model = 'gemini-3.1-flash-image-preview'; 
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
        // Debug: capturar la respuesta completa para diagnóstico
        $debug = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        throw new Exception('Gemini no generó imagen ni texto. Respuesta: ' . substr($debug, 0, 500));
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
