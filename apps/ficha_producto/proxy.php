<?php
/**
 * Proxy híbrido Ficha de Producto:
 *   - describe: Gemini (visión → texto, clave A)
 *   - generateImages / editImage: FLUX BFL (clave F)
 */
header("Content-Type: application/json; charset=utf-8");

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
  }

  $raw = file_get_contents("php://input");
  $json = json_decode($raw, true);
  if (!is_array($json)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido']);
    exit;
  }

  $task   = $json['task']   ?? '';
  $image  = $json['image']  ?? null;
  $prompt = $json['prompt'] ?? null;
  $prompts = $json['prompts'] ?? null;

  // ─── Clave A (Gemini → describe) ──────────────────────
  $geminiKey = '';
  $cascade = ['A','G'];
  foreach ($cascade as $var) {
    foreach (['', 'REDIRECT_'] as $prefix) {
      $val = getenv($prefix . $var);
      if (!empty($val)) { $geminiKey = $val; break 2; }
    }
  }
  if (empty($geminiKey)) {
    foreach ($cascade as $var) {
      if (!empty($_SERVER[$var] ?? '')) { $geminiKey = $_SERVER[$var]; break; }
    }
  }

  // ─── Clave F (FLUX) ───────────────────────────────────
  $fluxKey = '';
  foreach (['F'] as $var) {
    foreach (['', 'REDIRECT_'] as $prefix) {
      $val = getenv($prefix . $var);
      if (!empty($val)) { $fluxKey = $val; break 2; }
    }
  }
  if (empty($fluxKey)) {
    foreach (['F'] as $var) {
      if (!empty($_SERVER[$var] ?? '')) { $fluxKey = $_SERVER[$var]; break; }
    }
  }

  // ─── Clave R (OpenRouter → Gemini imagen) ─────────────
  $orKey = '';
  foreach (['R'] as $var) {
    foreach (['', 'REDIRECT_'] as $prefix) {
      $val = getenv($prefix . $var);
      if (!empty($val)) { $orKey = $val; break 2; }
    }
  }
  if (empty($orKey)) {
    foreach (['R'] as $var) {
      if (!empty($_SERVER[$var] ?? '')) { $orKey = $_SERVER[$var]; break; }
    }
  }

  // Modelo elegido por el frontend (patrón canónico 4 modelos)
  $model = strtolower((string)($json['model'] ?? ''));

  // ══════════════════════════════════════════════════════════
  //  Gemini helpers
  // ══════════════════════════════════════════════════════════
  function callGemini($model, $body, $apiKey) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
      CURLOPT_POSTFIELDS => json_encode($body),
      CURLOPT_TIMEOUT => 120,
      CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) throw new Exception("cURL Gemini: " . curl_error($ch));
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = json_decode($resp, true);
    if ($status < 200 || $status >= 300) {
      $msg = $data['error']['message'] ?? ("HTTP " . $status);
      throw new Exception($msg);
    }
    return $data;
  }

  // ══════════════════════════════════════════════════════════
  //  FLUX helpers
  // ══════════════════════════════════════════════════════════
  function callFluxSubmit($endpoint, $payload, $apiKey) {
    $url = "https://api.bfl.ai/v1/" . $endpoint;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-key: ' . $apiKey,
        'accept: application/json'
      ],
      CURLOPT_POSTFIELDS => json_encode($payload),
      CURLOPT_TIMEOUT => 30,
      CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) throw new Exception("cURL FLUX submit: " . curl_error($ch));
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = json_decode($resp, true);
    if ($status < 200 || $status >= 300) {
      $msg = $data['error']['message'] ?? $data['error'] ?? ("FLUX HTTP " . $status);
      throw new Exception($msg);
    }
    return $data;
  }

  function callFluxPoll($pollingUrl, $apiKey) {
    $ch = curl_init($pollingUrl);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => ['x-key: ' . $apiKey, 'accept: application/json'],
      CURLOPT_TIMEOUT => 20,
      CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) return null;
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($status < 200 || $status >= 300) return null;
    return json_decode($resp, true);
  }

  function geminiGenerate($geminiModel, $prompt, $inputImageBase64, $mimeType, $apiKey) {
    $content = [
      ['type' => 'text', 'text' => $prompt],
    ];
    if (!empty($inputImageBase64)) {
      $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . ($mimeType ?: 'image/png') . ';base64,' . $inputImageBase64]];
    }
    $payload = [
      'model' => $geminiModel,
      'modalities' => ['image', 'text'],
      'messages' => [['role' => 'user', 'content' => $content]],
      'max_tokens' => 8000,
    ];
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'accept: application/json', 'Authorization: Bearer ' . $apiKey],
      CURLOPT_POSTFIELDS => json_encode($payload),
      CURLOPT_TIMEOUT => 120,
      CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) throw new Exception("cURL OpenRouter: " . curl_error($ch));
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = json_decode($resp, true);
    if ($status < 200 || $status >= 300 || isset($data['error'])) {
      $msg = $data['error']['message'] ?? $data['error'] ?? ("HTTP " . $status);
      if (is_array($msg)) $msg = json_encode($msg);
      throw new Exception("OpenRouter: " . $msg);
    }
    $images = $data['choices'][0]['message']['images'] ?? [];
    if (empty($images)) throw new Exception("Gemini no devolvió imagen.");
    $imgDataUrl = $images[0]['image_url']['url'] ?? '';
    if ($imgDataUrl === '' || strpos($imgDataUrl, 'data:') !== 0) throw new Exception("Gemini devolvió URL en lugar de imagen.");
    $outB64 = substr($imgDataUrl, strpos($imgDataUrl, ',') + 1);
    $outMime = 'image/png';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);#i', $imgDataUrl, $m) === 1) $outMime = $m[1];
    return ['data' => $outB64, 'mimeType' => $outMime];
  }

  function fluxGenerate($endpoint, $prompt, $inputImageBase64, $apiKey) {
    $payload = ['prompt' => $prompt, 'width' => 1024, 'height' => 1024];
    if (!empty($inputImageBase64)) {
      $payload['input_image'] = $inputImageBase64; // base64 puro sin prefijo
    }

    $submit = callFluxSubmit($endpoint, $payload, $apiKey);
    $pollingUrl = $submit['polling_url'] ?? null;
    if (!$pollingUrl) throw new Exception("FLUX no devolvió polling_url");

    // Polling hasta ~90s
    $maxAttempts = 60;
    for ($i = 0; $i < $maxAttempts; $i++) {
      usleep(1500000); // 1.5s
      $poll = callFluxPoll($pollingUrl, $apiKey);
      if (!$poll) continue;
      $status = $poll['status'] ?? '';
      if ($status === 'Ready') {
        $sampleUrl = $poll['result']['sample'] ?? null;
        if (!$sampleUrl) throw new Exception("FLUX Ready sin sample URL");

        $ch = curl_init($sampleUrl);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
        $imgBin = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if ($http !== 200 || empty($imgBin)) throw new Exception("No se pudo descargar la imagen FLUX");

        return ['data' => base64_encode($imgBin), 'mimeType' => $ct ?: 'image/png'];
      }
      if ($status === 'Error' || $status === 'Content Moderated') {
        throw new Exception("FLUX: " . ($poll['result']['error'] ?? $status));
      }
    }
    throw new Exception("FLUX: timeout de polling");
  }

  // ══════════════════════════════════════════════════════════
  //  ROUTER
  // ══════════════════════════════════════════════════════════

  // ── describe (Gemini) ──────────────────────────────────
  if ($task === 'describe') {
    if (empty($geminiKey)) {
      http_response_code(500);
      echo json_encode(['error' => ['message' => 'Clave Gemini (A) no configurada']]);
      exit;
    }
    $body = [
      "contents" => [[
        "parts" => [
          ["inlineData" => ["data" => $image['data'], "mimeType" => $image['mimeType']]],
          ["text" => $prompt ?: "Describe el producto en español, máximo 1000 caracteres."]
        ]
      ]]
    ];
    $data = callGemini("gemini-2.5-flash", $body, $geminiKey);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!$text) throw new Exception("Sin descripción");
    echo json_encode(['description' => $text], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // ── generateImages (FLUX o GEMINI según modelo) ───────
  if ($task === 'generateImages') {
    if (!is_array($prompts)) $prompts = [];
    $images = [];

    // Extraer base64 puro de la imagen (quitar prefijo data:...)
    $inputB64 = '';
    $inputMime = 'image/png';
    if (!empty($image['data'])) {
      $d = $image['data'];
      if (preg_match('#^data:(image/[^;]+);base64,(.+)$#', $d, $m)) {
        $inputMime = $m[1];
        $inputB64 = $m[2];
      } else {
        $inputB64 = $d; // asumir que ya viene puro
      }
    }

    // Determinar backend por modelo
    $isGemini = (strpos($model, 'gemini') !== false);
    $isMax = (strpos($model, 'max') !== false);

    if ($isGemini) {
      if (empty($orKey)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada']]);
        exit;
      }
      $geminiModel = (strpos($model, 'flash') !== false) ? 'google/gemini-3.1-flash-image' : 'google/gemini-3-pro-image';
      foreach ($prompts as $p) {
        $images[] = geminiGenerate($geminiModel, $p, $inputB64, $inputMime, $orKey);
      }
    } else {
      if (empty($fluxKey)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave FLUX (F) no configurada']]);
        exit;
      }
      $endpoint = $isMax ? 'flux-2-max' : 'flux-2-pro';
      foreach ($prompts as $p) {
        $images[] = fluxGenerate($endpoint, $p, $inputB64, $fluxKey);
      }
    }

    echo json_encode(['images' => $images]);
    exit;
  }

  http_response_code(400);
  echo json_encode(['error' => 'task inválida']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
