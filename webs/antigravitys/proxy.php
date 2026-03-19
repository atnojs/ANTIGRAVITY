<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido', 405);

  $apiKey = getenv('GEMINI_KEY_GENERAR_IMAGENES')
    ?: ($_SERVER['GEMINI_KEY_GENERAR_IMAGENES'] ?? $_SERVER['REDIRECT_GEMINI_KEY_GENERAR_IMAGENES'] ?? null);

  $replicateKey = getenv('REPLICATE_API_FLUX') 
    ?: ($_SERVER['REPLICATE_API_FLUX'] ?? $_SERVER['REDIRECT_REPLICATE_API_TOKEN'] ?? null);

  $input = file_get_contents('php://input');
  $json = json_decode($input, true);
  if (!is_array($json)) throw new Exception('JSON inválido o cuerpo vacío', 400);

  $task        = $json['task'] ?? '';
  $provider    = $json['provider'] ?? 'gemini'; 
  $prompt      = (string)($json['prompt'] ?? '');
  $images      = $json['images'] ?? [];
  $maskImage   = $json['maskImage'] ?? null; 
  $aspectRatio = $json['aspectRatio'] ?? '1:1';
  $modalities  = $json['modalities'] ?? ['IMAGE']; 

  // Función interna para llamar APIs
  $callApi = function($url, $body, $headers) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST           => true,
      CURLOPT_HTTPHEADER     => $headers,
      CURLOPT_POSTFIELDS     => json_encode($body),
      CURLOPT_TIMEOUT        => 120,
      CURLOPT_SSL_VERIFYPEER => false 
    ]);

    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($resp === false) throw new Exception('Error conexión cURL: ' . $err, 502);

    $data = json_decode($resp, true);

    if (json_last_error() !== JSON_ERROR_NONE)
        throw new Exception('Respuesta no válida del proveedor. Código HTTP: ' . $status . " - " . $resp, 502);

    if ($status < 200 || $status >= 300) {
       $msg = $data['error']['message'] ?? $data['detail'] ?? ('Error HTTP ' . $status);
       throw new Exception('API Error: ' . $msg, $status);
    }

    return $data;
  };

  /* ---------------------------------------------------------
   *  NUEVA FUNCIÓN: ANALIZAR PDF Y GENERAR SECCIONES CON PARSEO ROBUSTO
   * --------------------------------------------------------- */
  if ($task === 'analyzePDF') {

    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);

    $pdfBase64 = $json['pdf'] ?? null;
    if (!$pdfBase64) throw new Exception('No se recibió el PDF codificado en Base64.', 400);

    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);

    $sysPrompt = "
Eres un experto en documentación técnica. Recibirás un PDF completo en Base64.
Tu tarea es:
1. Leer y analizar TODO el contenido del PDF.
2. Generar un resumen completo y muy detallado dividido en EXACTAMENTE estas secciones:

- introduccion
- interfaz
- agentes
- claude
- claudeCode
- testSprite
- workflows
- configAvanzada
- seguridad
- problemas
- checklist

DEVUELVE EXCLUSIVAMENTE un JSON válido con ESTE FORMATO EXACTO, SIN TEXTO EXTRA, SIN ```json, SIN COMILLAS ALREDEDOR DEL JSON:

{
  \"sections\": {
    \"introduccion\": \"...\",
    \"interfaz\": \"...\",
    \"agentes\": \"...\",
    \"claude\": \"...\",
    \"claudeCode\": \"...\",
    \"testSprite\": \"...\",
    \"workflows\": \"...\",
    \"configAvanzada\": \"...\",
    \"seguridad\": \"...\",
    \"problemas\": \"...\",
    \"checklist\": \"...\"
  }
}

Solo devuelve el JSON puro.
";

    $body = [
      "contents" => [
        [
          "role" => "user",
          "parts" => [
            ["text" => $sysPrompt],
            ["inlineData" => [
                "mimeType" => "application/pdf",
                "data" => $pdfBase64
            ]]
          ]
        ]
      ],
      "generationConfig" => [
        "responseModalities" => ["TEXT"],
        "temperature" => 0.1
      ]
    ];

    $data = $callApi($modelUrl, $body, ['Content-Type: application/json']);

    // Extraer texto devuelto por Gemini
    $raw = "";
    if(isset($data['candidates'][0]['content']['parts'])) {
      foreach($data['candidates'][0]['content']['parts'] as $p) {
        if (isset($p['text'])) $raw .= $p['text'];
      }
    }

    if (!$raw) throw new Exception('Gemini no devolvió texto.', 500);

    // ----------------------------------------------------
    // LIMPIEZA DEL TEXTO: QUITAR ```json, comillas, etc.
    // ----------------------------------------------------
    $clean = trim($raw);

    // Quitar ```json y ```
    $clean = preg_replace('/```json/i', '', $clean);
    $clean = preg_replace('/```/i', '', $clean);

    // Quitar comillas iniciales o finales
    $clean = trim($clean, " \n\r\t\"");

    // A veces Gemini envía: json { ... }
    if (substr($clean, 0, 4) === "json") {
        $clean = substr($clean, 4);
    }

    $clean = trim($clean);

    // ----------------------------------------------------
    // EXTRAER EL PRIMER OBJETO JSON VÁLIDO DEL TEXTO
    // ----------------------------------------------------
    $jsonStart = strpos($clean, "{");
    $jsonEnd   = strrpos($clean, "}");

    if ($jsonStart === false || $jsonEnd === false)
        throw new Exception("No se encontró JSON en la respuesta. Respuesta cruda: " . substr($raw, 0, 400));

    $jsonText = substr($clean, $jsonStart, $jsonEnd - $jsonStart + 1);

    $jsonExtracted = json_decode($jsonText, true);

    if (!$jsonExtracted || !isset($jsonExtracted['sections'])) {
        throw new Exception("No se encontró el campo 'sections'. JSON detectado: " . $jsonText);
    }

    echo json_encode($jsonExtracted);
    exit;
  }

  /* ---------------------------------------------------------
   *  TAREA: MEJORAR PROMPT
   * --------------------------------------------------------- */
  if ($task === 'enhancePrompt') {

    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);

    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);
    $isMaskMode = $json['isMaskMode'] ?? false;

    if ($isMaskMode) {
        $sysPrompt = "Eres un experto en edición de imágenes (Inpainting). Genera 4 variantes del prompt SOLO para la zona enmascarada. Separa con '|||'.";
    } else {
        $sysPrompt = "Eres un experto en prompts de arte IA. Genera 4 versiones mejoradas en español. Separa con '|||'.";
    }

    $body = [
      'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $sysPrompt . "\n\nPROMPT USUARIO: " . $prompt ]] ]],
      'generationConfig' => [ 'responseModalities' => ['TEXT'], 'temperature' => 0.7 ]
    ];

    $data = $callApi($modelUrl, $body, ['Content-Type: application/json']);

    $text = '';
    if (isset($data['candidates'][0]['content']['parts'])) {
      foreach ($data['candidates'][0]['content']['parts'] as $p) {
        if (isset($p['text'])) $text .= $p['text'];
      }
    }

    if (empty($text)) throw new Exception('Gemini no devolvió texto.', 500);

    $options = array_values(array_filter(array_map('trim', explode('|||', $text))));
    echo json_encode(['options' => $options]);
    exit;
  }

  /* ---------------------------------------------------------
   *  TAREA: ANALIZAR POSICIÓN DE MÁSCARA
   * --------------------------------------------------------- */
  if ($task === 'analyzeMaskPosition') {
      if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);

      $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' . urlencode($apiKey);

      if (empty($images) || empty($images[0]['data'])) throw new Exception('No se recibió la imagen.', 400);

      $sysPrompt = "Analiza las zonas rojas y devuelve una PLANTILLA de prompt en español utilizando marcadores entre corchetes.";

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

  /* ---------------------------------------------------------
   *  TAREA: GENERAR IMAGEN
   * --------------------------------------------------------- */
  if ($task === 'generateImage') {

    // FLUX (Replicate)
    if ($provider === 'flux') {
        if (!$replicateKey) throw new Exception('Falta token de Replicate (flux)', 500);

        $url = "https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions";

        $body = [
            'input' => [
                'prompt' => $prompt,
                'aspect_ratio' => $aspectRatio ?: "1:1",
                'output_format' => "jpg",
                'output_quality' => 90,
                'safety_tolerance' => 5
            ]
        ];

        $headers = [
          "Authorization: Bearer $replicateKey",
          "Content-Type: application/json",
          "Prefer: wait"
        ];

        $data = $callApi($url, $body, $headers);

        $imageUrl = $data['output'] ?? null;
        if (!$imageUrl) throw new Exception('Flux no devolvió imagen.', 502);

        $imgData = file_get_contents($imageUrl);

        echo json_encode([
          'image' => base64_encode($imgData),
          'mimeType' => 'image/jpeg',
          'type' => 'image'
        ]);

        exit;
    }

    // GEMINI (Google)
    else {

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

        $imageB64 = null; 
        $mime = 'image/png';

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
            echo json_encode([
              'image' => $imageB64,
              'mimeType' => $mime,
              'type' => 'image'
            ]);
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

        throw new Exception('Gemini no generó imagen ni texto.');
    }
  }

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>

