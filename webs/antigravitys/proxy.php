<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido', 405);

  // ===== API KEY: config.php + cascade (patrón dibujo_lineas) =====
  $apiKey = '';
  $configFile = __DIR__ . '/config.php';
  if (file_exists($configFile)) {
      include $configFile;
      $apiKey = defined('A') ? A : '';
  }
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

    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' . urlencode($apiKey);

    $sysPrompt = "
Eres un analizador de documentos. Recibirás un PDF completo en Base64.
Tu tarea:
1. Leer y analizar TODO el contenido del PDF.
2. Detectar su título real, tema principal y estructura natural (capítulos, secciones, apartados).
3. Generar un resumen completo y fiel al contenido original, dividido en las secciones que el propio documento tenga.

DEVUELVE EXCLUSIVAMENTE un JSON válido con ESTE FORMATO EXACTO, SIN TEXTO EXTRA, SIN ```json, SIN COMILLAS ALREDEDOR DEL JSON:

{
  \"meta\": {
    \"title\": \"Título real del documento\",
    \"description\": \"Resumen de 1-2 frases del contenido\"
  },
  \"sections\": [
    { \"id\": \"sec-1\", \"title\": \"Título de la primera sección\", \"content\": \"Contenido resumido de esta sección...\" },
    { \"id\": \"sec-2\", \"title\": \"Título de la segunda sección\", \"content\": \"...\" }
  ]
}

Reglas:
- Usa tantas secciones como tenga realmente el PDF (mín 1, máx 20).
- El contenido de cada sección debe ser fiel al PDF original, no inventes información.
- Los IDs deben ser \"sec-1\", \"sec-2\", \"sec-3\", etc.
- Solo devuelve el JSON puro.
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

    if (!$jsonExtracted) {
        throw new Exception("JSON inválido. Respuesta cruda: " . substr($jsonText, 0, 400));
    }

    // Aceptar tanto el nuevo formato {meta, sections:[]} como el antiguo {sections:{...}}
    if (!isset($jsonExtracted['sections'])) {
        throw new Exception("No se encontró el campo 'sections'. JSON detectado: " . substr($jsonText, 0, 400));
    }

    // Si sections es un objeto asociativo (formato antiguo), convertirlo al nuevo formato de array
    if (is_array($jsonExtracted['sections']) && !isset($jsonExtracted['sections'][0])) {
        // Formato antiguo: {introduccion: "...", interfaz: "...", ...}
        $oldSections = $jsonExtracted['sections'];
        $newSections = [];
        $i = 1;
        foreach ($oldSections as $key => $content) {
            $newSections[] = [
                'id' => 'sec-' . $i,
                'title' => ucfirst($key),
                'content' => $content
            ];
            $i++;
        }
        $jsonExtracted['sections'] = $newSections;
    }

    // Si no hay meta, generar uno por defecto
    if (!isset($jsonExtracted['meta']) || !is_array($jsonExtracted['meta'])) {
        $jsonExtracted['meta'] = [
            'title' => 'Documento analizado',
            'description' => 'Contenido extraído y organizado automáticamente desde el PDF.'
        ];
    }

    echo json_encode($jsonExtracted, JSON_UNESCAPED_UNICODE);
    exit;
  }

  /* ---------------------------------------------------------
   *  TAREA: MEJORAR PROMPT
   * --------------------------------------------------------- */
  if ($task === 'enhancePrompt') {

    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);

    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' . urlencode($apiKey);
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

      $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' . urlencode($apiKey);

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

        $model = 'gemini-2.5-flash-image';
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

  /* ---------------------------------------------------------
   *  TAREA: ANALIZAR PDF CHUNKED
   *  Convierte cualquier PDF en contenido web con máxima fiabilidad.
   *  Usa File API de Gemini (PDFs grandes) + 2 pasadas (índice + contenido)
   *  + extracción de imágenes binarias con imagick (fallback a descrito).
   * --------------------------------------------------------- */
  if ($task === 'analyzePDFChunked') {

    if (!$apiKey) throw new Exception('Falta API Key de Gemini', 500);

    $pdfBase64 = $json['pdf'] ?? null;
    if (!$pdfBase64) throw new Exception('No se recibió el PDF codificado en Base64.', 400);

    $filename = $json['filename'] ?? 'documento.pdf';

    // Helper local para generateContent con timeout extendido (300s)
    $callGen = function($url, $body) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_TIMEOUT        => 300,
        CURLOPT_SSL_VERIFYPEER => false
      ]);
      $resp   = curl_exec($ch);
      $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
      $err    = curl_error($ch);
      curl_close($ch);
      if ($resp === false) throw new Exception('Error conexión cURL: ' . $err, 502);
      $data = json_decode($resp, true);
      if (json_last_error() !== JSON_ERROR_NONE)
        throw new Exception('Respuesta no válida del proveedor. HTTP: ' . $status . ' - ' . $resp, 502);
      if ($status < 200 || $status >= 300) {
        $msg = $data['error']['message'] ?? $data['detail'] ?? ('Error HTTP ' . $status);
        throw new Exception('API Error: ' . $msg, $status);
      }
      return $data;
    };

    // ----------------------------------------------------
    // 1) SUBIDA del PDF vía File API (soporta PDFs grandes)
    // ----------------------------------------------------
    $pdfBin = base64_decode($pdfBase64, true);
    if ($pdfBin === false) throw new Exception('Base64 del PDF inválido.', 400);

    // Escribir binario a tmpfile para crear CURLFile
    $tmp = tmpfile();
    if (!$tmp) throw new Exception('No se pudo crear archivo temporal.', 500);
    fwrite($tmp, $pdfBin);
    $tmpPath = stream_get_meta_data($tmp)['uri'];

    $uploadUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files?key=' . urlencode($apiKey);
    $cfile = new CURLFile($tmpPath, 'application/pdf', $filename);

    $chUp = curl_init($uploadUrl);
    curl_setopt_array($chUp, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => ['file' => $cfile],
      CURLOPT_TIMEOUT        => 300,
      CURLOPT_SSL_VERIFYPEER => false,
      // Headers recomendados por la File API de Gemini para la subida multipart
      CURLOPT_HTTPHEADER     => [
        'X-Goog-Upload-Protocol: multipart',
        'X-Goog-Upload-File-Name: ' . $filename
      ]
    ]);
    $upResp   = curl_exec($chUp);
    $upStatus = curl_getinfo($chUp, CURLINFO_RESPONSE_CODE);
    $upErr    = curl_error($chUp);
    curl_close($chUp);
    fclose($tmp);

    if ($upResp === false) throw new Exception('Error subiendo PDF a File API: ' . $upErr, 502);

    $upData = json_decode($upResp, true);
    if (json_last_error() !== JSON_ERROR_NONE || $upStatus < 200 || $upStatus >= 300) {
      throw new Exception('File API devolvió error. HTTP ' . $upStatus . ': ' . $upResp, 502);
    }

    $fileUri  = $upData['file']['uri'] ?? null;
    $fileName = $upData['file']['name'] ?? null;
    if (!$fileUri || !$fileName) throw new Exception('File API no devolvió file.uri/file.name.', 502);

    // ----------------------------------------------------
    // Poll de estado hasta ACTIVE (máx 30 intentos, sleep 2s)
    // ----------------------------------------------------
    $stateUrl = 'https://generativelanguage.googleapis.com/v1beta/files/' . urlencode($fileName) . '?key=' . urlencode($apiKey);
    $active = false;
    for ($i = 0; $i < 30; $i++) {
      $chS = curl_init($stateUrl);
      curl_setopt_array($chS, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30
      ]);
      $sResp = curl_exec($chS);
      curl_close($chS);
      $sData = json_decode($sResp, true);
      if (isset($sData['state']) && $sData['state'] === 'ACTIVE') {
        $active = true;
        break;
      }
      sleep(2);
    }
    if (!$active) throw new Exception('El PDF subido no quedó ACTIVE tras 30 intentos.', 504);

    $modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' . urlencode($apiKey);

    // ----------------------------------------------------
    // 2) PASADA 1 — ÍNDICE (solo estructura, sin contenido)
    // ----------------------------------------------------
    $indexPrompt = "Eres un analizador de documentos. Recibirás un PDF.
Tu tarea: analizar TODO el PDF y devolver EXCLUSIVAMENTE un JSON con el ÍNDICE real del documento (sin el contenido de cada sección, solo títulos).

TODO el contenido debe estar obligatoriamente en ESPAÑOL.

Devuelve EXCLUSIVAMENTE este JSON, SIN texto extra, SIN ```json, SIN comillas alrededor:

{
  \"meta\": {
    \"title\": \"Título real del documento\",
    \"description\": \"Resumen de 1-2 frases del contenido en español\"
  },
  \"sections\": [
    { \"id\": \"sec-1\", \"title\": \"Título de la primera sección\" },
    { \"id\": \"sec-2\", \"title\": \"Título de la segunda sección\" }
  ]
}

Reglas:
- Usa tantas secciones como tenga realmente el PDF (mín 1, máx 20).
- Los IDs deben ser \"sec-1\", \"sec-2\", \"sec-3\", etc.
- No incluyas el contenido, solo el índice.
- Todo el texto en español.";

    $indexBody = [
      'contents' => [[
        'role' => 'user',
        'parts' => [
          ['text' => $indexPrompt],
          ['fileData' => ['mimeType' => 'application/pdf', 'fileUri' => $fileUri]]
        ]
      ]],
      'generationConfig' => [
        'responseModalities' => ['TEXT'],
        'temperature' => 0.1
      ]
    ];

    $indexData = $callGen($modelUrl, $indexBody);

    // Extraer texto devuelto por Gemini
    $rawIndex = "";
    if (isset($indexData['candidates'][0]['content']['parts'])) {
      foreach ($indexData['candidates'][0]['content']['parts'] as $p) {
        if (isset($p['text'])) $rawIndex .= $p['text'];
      }
    }
    if (!$rawIndex) throw new Exception('Gemini no devolvió texto en la pasada de índice.', 500);

    // Limpieza JSON (mismo patrón que analyzePDF: quitar ```json y extraer entre { y })
    $cleanIdx = trim($rawIndex);
    $cleanIdx = preg_replace('/```json/i', '', $cleanIdx);
    $cleanIdx = preg_replace('/```/i', '', $cleanIdx);
    $cleanIdx = trim($cleanIdx, " \n\r\t\"");
    if (substr($cleanIdx, 0, 4) === "json") $cleanIdx = substr($cleanIdx, 4);
    $cleanIdx = trim($cleanIdx);

    $iStart = strpos($cleanIdx, "{");
    $iEnd   = strrpos($cleanIdx, "}");
    if ($iStart === false || $iEnd === false)
      throw new Exception('No se encontró JSON en el índice. Crudo: ' . substr($rawIndex, 0, 400));

    $indexJsonText = substr($cleanIdx, $iStart, $iEnd - $iStart + 1);
    $indexExtracted = json_decode($indexJsonText, true);
    if (!$indexExtracted) throw new Exception('JSON de índice inválido. Crudo: ' . substr($indexJsonText, 0, 400));

    if (!isset($indexExtracted['sections']) || !is_array($indexExtracted['sections']))
      throw new Exception('El índice no contiene sections válidas.', 500);

    $meta = $indexExtracted['meta'] ?? ['title' => 'Documento analizado', 'description' => 'Contenido extraído del PDF.'];
    $sections = $indexExtracted['sections'];

    // ----------------------------------------------------
    // 3) PASADA 2 — CONTENIDO POR SECCIÓN (chunking lógico)
    // ----------------------------------------------------
    foreach ($sections as $idx => &$sec) {
      $secId    = $sec['id'] ?? ('sec-' . ($idx + 1));
      $secTitle = $sec['title'] ?? ('Sección ' . ($idx + 1));
      try {
        $contentPrompt = "Eres un analizador de documentos. Recibirás un PDF.
Analiza EXCLUSIVAMENTE la sección titulada \"{$secTitle}\" del documento y devuelve su contenido resumido y FIEL en formato Markdown.

TODO el contenido debe estar obligatoriamente en ESPAÑOL.

Formato Markdown requerido (usa lo que aplique):
- Listas con guiones (-) o numeradas (1.).
- **Negritas** para términos clave.
- *Cursivas* para énfasis.
- Encabezados de subsección con ## (y ### si hace falta).
- Tablas GFM con formato | columna | columna |.

Si en esa sección del PDF hay imágenes, diagramas, gráficos o figuras, NO intentes generar la imagen: descríbela en español usando este marcador exacto en una línea propia:
![IMG](IMAGEN: descripción detallada en español de lo que muestra la imagen, diagrama o gráfico)

Devuelve SOLO el Markdown de esa sección, SIN JSON, SIN texto extra, SIN ```markdown.

Sección a procesar: \"{$secTitle}\"";

        $secBody = [
          'contents' => [[
            'role' => 'user',
            'parts' => [
              ['text' => $contentPrompt],
              ['fileData' => ['mimeType' => 'application/pdf', 'fileUri' => $fileUri]]
            ]
          ]],
          'generationConfig' => [
            'responseModalities' => ['TEXT'],
            'temperature' => 0.2
          ]
        ];

        $secData = $callGen($modelUrl, $secBody);

        $secText = "";
        if (isset($secData['candidates'][0]['content']['parts'])) {
          foreach ($secData['candidates'][0]['content']['parts'] as $p) {
            if (isset($p['text'])) $secText .= $p['text'];
          }
        }
        $sec['content'] = trim($secText) ?: '[Sección sin contenido disponible.]';
      } catch (Throwable $eSec) {
        $sec['content'] = '[Sección no disponible: ' . $eSec->getMessage() . ']';
      }
    }
    unset($sec);

    // ----------------------------------------------------
    // 4) EXTRACCIÓN DE IMÁGENES (binario real con fallback)
    // ----------------------------------------------------
    $images = [];
    $imageMode = 'described';

    if (extension_loaded('imagick')) {
      try {
        $tmpImg = tempnam(sys_get_temp_dir(), 'pdfimg_');
        file_put_contents($tmpImg, $pdfBin);
        $im = new Imagick();
        $im->setResolution(150, 150);
        $im->readImage($tmpImg);
        $imgIndex = 0;
        $maxPages = 20;
        foreach ($im as $page) {
          if ($imgIndex >= $maxPages) break;
          $page->setImageFormat('png');
          $pngBin = $page->getImageBlob();
          $images[] = [
            'id'       => 'img-' . ($imgIndex + 1),
            'data'     => base64_encode($pngBin),
            'mimeType' => 'image/png'
          ];
          $imgIndex++;
        }
        $im->clear();
        $im->destroy();
        @unlink($tmpImg);
        if (count($images) > 0) $imageMode = 'binary';
      } catch (Throwable $eImg) {
        $images = [];
        $imageMode = 'described';
      }
    }

    echo json_encode([
      'meta'      => $meta,
      'sections'  => $sections,
      'images'    => $images,
      'imageMode' => $imageMode
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>

