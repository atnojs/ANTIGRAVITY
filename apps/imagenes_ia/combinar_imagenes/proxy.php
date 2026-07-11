<?php
/**
 * ============================================
 * 🎨 COMBINAR IMÁGENES - PROXY PHP
 * Generación con FLUX 2 (Black Forest Labs): fusión de varias
 * imágenes en una sola composición.
 *   - combineImages : FLUX 2 [pro] / [max] (submit + polling servidor)
 *   - enhancePrompt : DeepSeek (API directa, modelo de texto deepseek-chat)
 * 100% FLUX para imágenes. Sin ninguna dependencia de Gemini.
 * ============================================
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido', 405);
    }
    if (!function_exists('curl_init')) {
        throw new Exception('cURL no habilitado en el servidor.', 500);
    }

    // ── Claves API (config.php local → env → REDIRECT_ → $_SERVER → $_ENV) ──
    $fluxKey = '';
    $dsKey   = '';
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        include $configFile;
        if (defined('F')) $fluxKey = F;
        elseif (defined('BFL_API_KEY')) $fluxKey = BFL_API_KEY;
        if (defined('DEEPSEEK_API_KEY')) $dsKey = DEEPSEEK_API_KEY;
    }
    // FLUX (F / BFL_API_KEY)
    foreach (['F', 'REDIRECT_F', 'BFL_API_KEY', 'REDIRECT_BFL_API_KEY'] as $v) {
        if (!empty($fluxKey)) break;
        $fluxKey = getenv($v) ?: ($_SERVER[$v] ?? '') ?: ($_ENV[$v] ?? '');
    }
    // DeepSeek (texto, para Mejorar Prompt) — DEEPSEEK_API_KEY o la clave 'B' del servidor
    foreach (['DEEPSEEK_API_KEY', 'REDIRECT_DEEPSEEK_API_KEY', 'B', 'REDIRECT_B'] as $v) {
        if (!empty($dsKey)) break;
        $dsKey = getenv($v) ?: ($_SERVER[$v] ?? '') ?: ($_ENV[$v] ?? '');
    }

    // ── Leer body ──
    $input = file_get_contents('php://input');
    $json = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($json)) {
        http_response_code(400);
        echo json_encode(['error' => ['message' => 'JSON inválido.']]);
        exit;
    }

    $task = $json['task'] ?? '';

    // Helper genérico de POST JSON
    $callApi = function ($url, $body, $headers, $timeout = 60) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $resp = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) {
            throw new Exception('Error conexión cURL: ' . $err, 502);
        }
        $data = json_decode($resp, true);
        return [$status, $data, $resp];
    };

    // ═══════════════════════════════════════════════
    // TAREA: MEJORAR PROMPT (DeepSeek · API directa · deepseek-chat)
    // ═══════════════════════════════════════════════
    if ($task === 'enhancePrompt') {
        if (empty($dsKey)) {
            throw new Exception('API Key de DeepSeek no configurada (para Mejorar Prompt).', 401);
        }

        $prompt = (string) ($json['prompt'] ?? '');
        $hasBackground = $json['hasBackground'] ?? false;
        $numImages = is_array($json['images'] ?? null) ? count($json['images']) : 0;

        if ($hasBackground) {
            $sysText = "Eres un experto en prompts para IA de imágenes (FLUX). "
                . "El usuario va a combinar {$numImages} imágenes, donde la PRIMERA es un FONDO estático que NO debe modificarse "
                . "y el resto son sujetos que se insertan en ese fondo con escala e iluminación realistas. "
                . "A partir de la idea del usuario, redacta 4 prompts en español, realistas, concisos (máximo 2 líneas cada uno), "
                . "para insertar los sujetos en el fondo manteniéndolo intacto. "
                . "Devuelve SOLO los 4 prompts separados por '|||', sin numeración ni texto extra.";
        } else {
            $sysText = "Eres un experto en prompts para IA de imágenes (FLUX). "
                . "El usuario va a combinar {$numImages} imágenes en una composición coherente y realista. "
                . "A partir de su idea, redacta 4 prompts en español, realistas y concisos (máximo 2 líneas cada uno), "
                . "que describan cómo fusionar los elementos manteniendo la identidad visual de los sujetos. "
                . "Devuelve SOLO los 4 prompts separados por '|||', sin numeración ni texto extra.";
        }

        $userIdea = $prompt !== '' ? $prompt : 'Combina estas imágenes de forma creativa y realista.';

        [$status, $data] = $callApi(
            'https://api.deepseek.com/chat/completions',
            [
                'model' => 'deepseek-chat',
                'messages' => [
                    ['role' => 'system', 'content' => $sysText],
                    ['role' => 'user', 'content' => 'Idea del usuario: ' . $userIdea],
                ],
                'temperature' => 0.8,
                'stream' => false,
            ],
            [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $dsKey,
            ],
            60
        );

        if ($status < 200 || $status >= 300) {
            $msg = $data['error']['message'] ?? ('HTTP ' . $status);
            throw new Exception('DeepSeek: ' . $msg, $status);
        }

        $text = (string) ($data['choices'][0]['message']['content'] ?? '');
        if ($text === '') {
            throw new Exception('El modelo de texto no devolvió respuesta.', 502);
        }

        $options = array_values(array_filter(array_map('trim', explode('|||', $text))));
        echo json_encode(['options' => array_slice($options, 0, 4)]);
        exit;
    }

    // ═══════════════════════════════════════════════
    // TAREA: COMBINAR IMÁGENES (FLUX 2 pro / max)
    // ═══════════════════════════════════════════════
    if ($task === 'combineImages') {
        if (empty($fluxKey)) {
            throw new Exception('API Key de FLUX (F) no configurada.', 401);
        }

        $prompt = (string) ($json['prompt'] ?? '');
        if (trim($prompt) === '') {
            throw new Exception('Falta el prompt.', 400);
        }

        $images = is_array($json['images'] ?? null) ? $json['images'] : [];
        $backgroundImage = $json['backgroundImage'] ?? null;
        $aspectRatio = (string) ($json['aspectRatio'] ?? '1:1');

        // Modelo según botón: PRO (equilibrado) o MAX (máxima fidelidad)
        $MODELOS = [
            'pro' => 'flux-2-pro',
            'max' => 'flux-2-max',
        ];
        $calidad = (string) ($json['calidad'] ?? 'pro');
        $endpoint = $MODELOS[$calidad] ?? $MODELOS['pro'];

        // ── Reunir imágenes de entrada (fondo primero) — FLUX 2 admite hasta 8 ──
        $refImages = [];
        if ($backgroundImage && !empty($backgroundImage['data'])) {
            $refImages[] = (string) $backgroundImage['data'];
        }
        foreach ($images as $img) {
            if (!empty($img['data'])) {
                $refImages[] = (string) $img['data'];
            }
        }
        if (count($refImages) < 1) {
            throw new Exception('Se necesitan imágenes para combinar.', 400);
        }
        // Limitar a 8 (tope de FLUX 2) y limpiar prefijo data: si viniera
        $refImages = array_slice($refImages, 0, 8);
        foreach ($refImages as &$b64) {
            if (strpos($b64, ',') !== false) {
                $b64 = substr($b64, strpos($b64, ',') + 1);
            }
        }
        unset($b64);

        // Validación de tamaño (2.5MB por imagen ya decodificada)
        $MAX_IMAGE_SIZE = 2500000;
        foreach ($refImages as $b64) {
            $decoded = base64_decode($b64, true);
            if ($decoded === false || strlen($decoded) > $MAX_IMAGE_SIZE) {
                throw new Exception('Imagen demasiado grande (máximo 2.5MB por imagen).', 400);
            }
        }

        // ── Dimensiones: aspect ratio + lado objetivo (elegido por el usuario), tope duro 4MP ──
        // El usuario elige 512/1024/2048/4096; FLUX 2 rechaza (422) resoluciones > 4MP,
        // así que el lado efectivo se limita a 2048 y el clamp de abajo respeta los 4 MP.
        // Para 4096 real, el reescalado final lo hace el navegador (nota en el frontend).
        $target = (int) ($json['targetPx'] ?? 1024);
        if ($target < 256)  $target = 256;
        if ($target > 2048) $target = 2048; // FLUX nunca supera ~2048 de lado (tope 4MP)
        $MAX_PX = 4194304; // 4 MP: límite verificado de FLUX 2
        $parts = explode(':', $aspectRatio);
        $aw = (float) ($parts[0] ?? 1);
        $ah = (float) ($parts[1] ?? 1);
        if ($aw <= 0 || $ah <= 0) { $aw = 1.0; $ah = 1.0; }
        if ($aw >= $ah) { $w = $target; $h = $target * $ah / $aw; }
        else            { $h = $target; $w = $target * $aw / $ah; }
        if ($w * $h > $MAX_PX) {
            $scale = sqrt($MAX_PX / ($w * $h));
            $w *= $scale; $h *= $scale;
        }
        $w = max(256, (int) (round($w / 32) * 32));
        $h = max(256, (int) (round($h / 32) * 32));
        while ($w * $h > $MAX_PX) {
            if ($w >= $h) $w -= 32; else $h -= 32;
        }

        // Instrucción reforzada si hay fondo estático
        $fullPrompt = $prompt;
        if ($backgroundImage && !empty($backgroundImage['data'])) {
            $fullPrompt = "La primera imagen de referencia es el FONDO: mantenlo intacto, "
                . "sin recortarlo ni cambiar su iluminación. Inserta los sujetos de las demás "
                . "imágenes sobre ese fondo con escala e integración realistas. " . $prompt;
        }

        // ── Payload FLUX 2: input_image, input_image_2..8 ──
        $payload = [
            'prompt' => $fullPrompt,
            'width'  => $w,
            'height' => $h,
            'output_format' => 'jpeg',
        ];
        foreach ($refImages as $idx => $b64) {
            $key = $idx === 0 ? 'input_image' : ('input_image_' . ($idx + 1));
            $payload[$key] = $b64;
        }

        // 1) ENVIAR TAREA
        [$submitCode, $submit] = $callApi(
            'https://api.bfl.ai/v1/' . $endpoint,
            $payload,
            ['Content-Type: application/json', 'accept: application/json', 'x-key: ' . $fluxKey],
            30
        );
        if ($submitCode !== 200) {
            $em = $submit['detail'] ?? ('HTTP ' . $submitCode);
            if (is_array($em)) $em = json_encode($em);
            throw new Exception('FLUX: ' . $em, $submitCode);
        }
        $pollUrl = $submit['polling_url'] ?? '';
        if ($pollUrl === '') {
            throw new Exception('FLUX no devolvió polling_url.', 502);
        }

        // 2) POLLING hasta Ready (máx ~90s)
        $imageUrl = '';
        for ($i = 0; $i < 60; $i++) {
            usleep(1500000); // 1.5s
            $ch = curl_init($pollUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $fluxKey],
                CURLOPT_TIMEOUT => 20,
                CURLOPT_SSL_VERIFYPEER => true,
            ]);
            $pollResp = curl_exec($ch);
            $pollCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($pollCode !== 200) continue;
            $pr = json_decode($pollResp, true);
            $st = $pr['status'] ?? '';
            if ($st === 'Ready') {
                $imageUrl = $pr['result']['sample'] ?? '';
                break;
            }
            if (in_array($st, ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
                throw new Exception('FLUX rechazó la tarea: ' . $st, 422);
            }
        }
        if ($imageUrl === '') {
            throw new Exception('FLUX tardó demasiado en generar la imagen. Inténtalo de nuevo.', 504);
        }

        // 3) Descargar la imagen (la URL de BFL caduca) y devolverla como base64
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $imgBin = curl_exec($ch);
        $imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
        curl_close($ch);

        if (!$imgOk || $imgBin === false || $imgBin === '') {
            throw new Exception('No se pudo descargar la imagen generada por FLUX.', 502);
        }

        // Formato de salida compatible con el frontend: { images: [ {data, mimeType} ] }
        echo json_encode([
            'images' => [[
                'data' => base64_encode($imgBin),
                'mimeType' => 'image/jpeg',
            ]],
            'modelo' => $endpoint,
            'calidad' => $calidad,
        ]);
        exit;
    }

    throw new Exception('Tarea no reconocida: ' . $task, 400);

} catch (Throwable $e) {
    $code = (int) $e->getCode();
    http_response_code($code >= 400 ? $code : 500);
    echo json_encode(['error' => ['message' => $e->getMessage()]]);
}
