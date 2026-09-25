<?php
/**
 * Proxy híbrido Ficha de Producto:
 *   - describe: texto/visión → xiaomi/mimo-v2.6-pro (OpenRouter, clave R)
 *   - generateImages / editImage: Gemini imagen (OpenRouter, clave R)
 */
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

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

  // ── describe (texto/visión) ──────────────────────────────────
  if ($task === 'describe') {
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (la clave R la resuelve $mimoTextCall)
    $body = [
      "contents" => [[
        "parts" => [
          ["inlineData" => ["data" => $image['data'], "mimeType" => $image['mimeType']]],
          ["text" => $prompt ?: "Describe el producto en español, máximo 1000 caracteres."]
        ]
      ]]
    ];
    // Respuesta con forma Gemini: el parser existente sigue funcionando.
    [$httpcode, $response] = $mimoTextCall($body, []);
    $data = json_decode($response, true);
    if ($httpcode < 200 || $httpcode >= 300) {
      throw new Exception($data['error']['message'] ?? ('HTTP ' . $httpcode));
    }
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
