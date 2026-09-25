<?php
/**
 * Proxy híbrido Ficha de Producto:
 *   - describe: Gemini (visión → texto, clave A)
 *   - generateImages / editImage: Gemini imagen (OpenRouter, clave R)
 */
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

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

  if ($task === 'generateImages') {
    $images = [];
    foreach (is_array($prompts) ? $prompts : [] as $itemPrompt) {
      $payload = $json;
      $payload['prompt'] = (string)$itemPrompt;
      $result = ag_image_generate($payload, __DIR__);
      $images[] = ['data' => $result['image'], 'mimeType' => $result['mimeType']];
    }
    echo json_encode(['images' => $images], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

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
    $data = callGemini("gemini-3.8-flash", $body, $geminiKey);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!$text) throw new Exception("Sin descripción");
    echo json_encode(['description' => $text], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // -- generateImages (GEMINI)
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

    $reqModel = ($model !== '') ? $model : 'gemini-flash';
    if (preg_match('#f'.'lux#i', $reqModel) === 1) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
        exit;
    }
    if (empty($orKey)) {
        http_response_code(500);
        echo json_encode(['error' => ['message' => 'Clave OpenRouter (R) no configurada']]);
        exit;
    }
    $geminiModel = (strpos($reqModel, 'flash') !== false) ? 'google/gemini-3.1-flash-image' : 'google/gemini-3-pro-image';
    foreach ($prompts as $p) {
        $images[] = geminiGenerate($geminiModel, $p, $inputB64, $inputMime, $orKey);
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
