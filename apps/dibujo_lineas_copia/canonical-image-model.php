<?php
declare(strict_types=1);

/* Contrato único de generación de imágenes para todas las aplicaciones. */
function ag_image_catalog(): array
{
    return [
        'openai-medium' => ['provider'=>'openai', 'model'=>'gpt-image-2', 'quality'=>'medium'],
        'openai-high'   => ['provider'=>'openai', 'model'=>'gpt-image-2', 'quality'=>'high'],
        'gemini-flash'  => ['provider'=>'gemini', 'model'=>'google/gemini-3.1-flash-image'],
        'gemini-pro'    => ['provider'=>'gemini', 'model'=>'google/gemini-3-pro-image'],
    ];
}

function ag_image_selected(string $requested): array
{
    $requested = strtolower(trim($requested));
    if ($requested === '') $requested = 'openai-medium';
    $catalog = ag_image_catalog();
    if (!isset($catalog[$requested])) throw new InvalidArgumentException('Modelo no soportado.', 400);
    return ['id'=>$requested] + $catalog[$requested];
}

function ag_image_key(string $configDir, string ...$names): string
{
    static $configLoaded = [];
    if ($configDir !== '' && !isset($configLoaded[$configDir])) {
        $config = rtrim($configDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'config.php';
        if (is_file($config)) include_once $config;
        $configLoaded[$configDir] = true;
    }
    foreach ($names as $name) {
        if (defined($name) && is_string(constant($name)) && trim(constant($name)) !== '') return trim(constant($name));
        foreach ([getenv($name), getenv('REDIRECT_'.$name), $_SERVER[$name] ?? '', $_SERVER['REDIRECT_'.$name] ?? '', $_ENV[$name] ?? ''] as $value) {
            if (is_string($value) && trim($value) !== '') return trim($value);
        }
    }
    return '';
}

function ag_image_json(string $url, array $headers, array $payload): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), CURLOPT_HTTPHEADER=>$headers, CURLOPT_CONNECTTIMEOUT=>20, CURLOPT_TIMEOUT=>180]);
    $raw = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
    if ($raw === false) throw new RuntimeException('Error conectando con el proveedor: '.$error, 502);
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) throw new RuntimeException('Respuesta no válida del proveedor.', 502);
    if ($status < 200 || $status >= 300 || isset($data['error'])) {
        $message = $data['error']['message'] ?? $data['error'] ?? ('HTTP '.$status);
        if (is_array($message)) $message = json_encode($message, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        throw new RuntimeException((string)$message, $status >= 400 ? $status : 502);
    }
    return $data;
}

function ag_image_input(string $value): array
{
    $value = trim($value); $mime = 'image/jpeg';
    if (preg_match('#^data:(image/[a-z0-9.+-]+);base64,#i', $value, $m) === 1) { $mime = strtolower($m[1]); $value = substr($value, strpos($value, ',') + 1); }
    $binary = base64_decode($value, true);
    if ($binary === false || $binary === '') throw new InvalidArgumentException('Imagen de referencia no válida.', 400);
    if (strlen($binary) > 20 * 1024 * 1024) throw new LengthException('La imagen supera 20 MB.', 413);
    return [$binary, $mime];
}

function ag_image_result(string $b64, string $mime, array $selected, string $provider): array
{
    $binary = base64_decode($b64, true);
    $info = $binary === false ? false : @getimagesizefromstring($binary);
    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    $url = 'data:' . $mime . ';base64,' . $b64;
    return [
        'success'=>true, 'type'=>'image', 'provider'=>$provider, 'model'=>$selected['id'],
        'mimeType'=>$mime, 'image'=>$b64, 'dataUrl'=>$url, 'imageUrl'=>$url,
        'width'=>$width, 'height'=>$height,
        'aspectRatio'=>$width > 0 && $height > 0 ? $width . ':' . $height : null,
    ];
}

function ag_image_aspect(string $ratio): string
{
    return in_array($ratio, ['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'], true) ? $ratio : '1:1';
}

function ag_image_size(array $request): string
{
    $resolution = (int)($request['resolution'] ?? $request['targetPx'] ?? 1024);
    $resolution = in_array($resolution, [512,1024,2048,4096], true) ? $resolution : 1024;
    $parts = explode(':', ag_image_aspect((string)($request['aspectRatio'] ?? '1:1')));
    $rw = max(1, (int)$parts[0]); $rh = max(1, (int)$parts[1]);
    $width = $rw >= $rh ? $resolution : (int)round($resolution * $rw / $rh);
    $height = $rw >= $rh ? (int)round($resolution * $rh / $rw) : $resolution;
    // Presupuesto mínimo de la API Images de OpenAI: 1.048.576 px (1024x1024).
    // Tamaños menores se rechazan ("below the current minimum pixel budget").
    $pixels = min(4194304, max(1048576, $width * $height)); $ratio = max(1/3, min(3, $width / max(1, $height)));
    $width = max(16, (int)(ceil(sqrt($pixels * $ratio) / 16) * 16)); $height = max(16, (int)(ceil(sqrt($pixels / $ratio) / 16) * 16));
    return $width . 'x' . $height;
}

function ag_image_generate(array $request, string $configDir = ''): array
{
    $selected = ag_image_selected((string)($request['model'] ?? ''));
    $prompt = trim((string)($request['prompt'] ?? ''));
    if ($prompt === '' && isset($request['contents'][0]['parts'])) foreach ($request['contents'][0]['parts'] as $part) if (!empty($part['text'])) { $prompt = trim((string)$part['text']); break; }
    if ($prompt === '') throw new InvalidArgumentException('Falta el prompt.', 400);
    if (strlen($prompt) > 12000) throw new LengthException('El prompt es demasiado largo.', 413);
    $images = [];
    foreach (['image','imagen','imageData','subject','referenceImage'] as $key) if (isset($request[$key]) && is_string($request[$key]) && trim($request[$key]) !== '') $images[] = $request[$key];
    if (isset($request['images']) && is_array($request['images'])) foreach ($request['images'] as $image) {
        if (is_string($image) && trim($image) !== '') $images[] = $image;
        elseif (is_array($image) && !empty($image['data'])) $images[] = 'data:' . ($image['mimeType'] ?? 'image/jpeg') . ';base64,' . $image['data'];
    }
    if (isset($request['contents'][0]['parts']) && is_array($request['contents'][0]['parts'])) foreach ($request['contents'][0]['parts'] as $part) if (!empty($part['inlineData']['data'])) $images[] = 'data:' . ($part['inlineData']['mimeType'] ?? 'image/jpeg') . ';base64,' . $part['inlineData']['data'];
    $images = array_slice($images, 0, 8);

    if ($selected['provider'] === 'openai') {
        $key = ag_image_key($configDir, 'OPENAI_API_KEY', 'O');
        if ($key === '') throw new RuntimeException('La clave de OpenAI no está configurada.', 500);
        $fields = ['model'=>'gpt-image-2', 'prompt'=>$prompt, 'quality'=>$selected['quality'], 'size'=>ag_image_size($request)];
        $endpoint = 'https://api.openai.com/v1/images/generations'; $tmp = null;
        $headers = ['Authorization: Bearer '.$key, 'Content-Type: application/json'];
        $postFields = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($images !== []) {
            [$binary, $mime] = ag_image_input($images[0]); $tmp = tempnam(sys_get_temp_dir(), 'ag_image_');
            if ($tmp === false || file_put_contents($tmp, $binary) === false) throw new RuntimeException('No se pudo preparar la imagen.', 500);
            $ext = str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg'); $fields['image[]'] = new CURLFile($tmp, $mime, 'referencia.'.$ext); $endpoint = 'https://api.openai.com/v1/images/edits';
            $headers = ['Authorization: Bearer '.$key];
            $postFields = $fields;
        }
        $ch = curl_init($endpoint); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$postFields, CURLOPT_HTTPHEADER=>$headers, CURLOPT_CONNECTTIMEOUT=>20, CURLOPT_TIMEOUT=>180]);
        $raw = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch); if ($tmp !== null) @unlink($tmp);
        if ($raw === false) throw new RuntimeException('Error conectando con OpenAI: '.$error, 502);
        $data = json_decode((string)$raw, true);
        if (!is_array($data) || $status < 200 || $status >= 300) {
            $message = is_array($data) ? (string)($data['error']['message'] ?? 'OpenAI no pudo completar la solicitud.') : 'OpenAI no pudo completar la solicitud.';
            throw new RuntimeException($message, $status >= 400 ? $status : 502);
        }
        $b64 = (string)($data['data'][0]['b64_json'] ?? ''); if ($b64 === '') throw new RuntimeException('OpenAI no devolvió ninguna imagen.', 502);
        return ag_image_result($b64, 'image/png', $selected, 'openai');
    }

    $key = ag_image_key($configDir, 'R'); if ($key === '') throw new RuntimeException('La clave de OpenRouter no está configurada.', 500);
    $content = [['type'=>'text','text'=>$prompt]];
    foreach ($images as $image) { [, $mime] = ag_image_input($image); $pure = preg_replace('#^data:[^;]+;base64,#i', '', trim($image)); $content[] = ['type'=>'image_url','image_url'=>['url'=>'data:'.$mime.';base64,'.$pure]]; }
    $data = ag_image_json('https://openrouter.ai/api/v1/chat/completions', ['Authorization: Bearer '.$key,'Content-Type: application/json'], ['model'=>$selected['model'],'modalities'=>['image','text'],'messages'=>[['role'=>'user','content'=>$content]],'max_tokens'=>8000,'image_config'=>['aspect_ratio'=>ag_image_aspect((string)($request['aspectRatio'] ?? '1:1'))]]);
    $url = (string)($data['choices'][0]['message']['images'][0]['image_url']['url'] ?? ''); if (strpos($url, 'data:') !== 0) throw new RuntimeException('Gemini no devolvió una imagen.', 502);
    $b64 = substr($url, strpos($url, ',') + 1); $mime = 'image/png'; if (preg_match('#^data:(image/[^;]+);#i', $url, $m) === 1) $mime = strtolower($m[1]);
    return ag_image_result($b64, $mime, $selected, 'gemini');
}

function ag_image_response(array $request, string $configDir = ''): void
{
    try { $result = ag_image_generate($request, $configDir); http_response_code(200); echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); }
    catch (Throwable $error) { $status = (int)$error->getCode(); if ($status < 400 || $status > 599) $status = 500; http_response_code($status); echo json_encode(['success'=>false,'error'=>$error->getMessage()], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); }
    exit;
}
