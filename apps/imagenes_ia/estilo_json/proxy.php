<?php
/**
 * ============================================================
 * 🎨 ESTILO JSON — PROXY PHP
 * Flujo:
 *   1) analizarEstilo : imagen de referencia -> JSON de estilo
 *                       (visión: OpenRouter gpt-4o-mini, JSON mode)
 *   2) aplicarEstilo  : imagen del nuevo sujeto + JSON de estilo
 *                       -> nueva imagen (FLUX 2 img2img, submit+poll)
 *   3) mejorarPrompt  : DeepSeek (texto) afina las instrucciones extra
 *
 * 100% FLUX para GENERAR imagen (regla del proyecto). El análisis de
 * estilo usa un modelo de VISIÓN (FLUX no lee imágenes) vía OpenRouter,
 * NUNCA Gemini.
 *
 * Claves (cascada, fuente real = SetEnv del .htaccess raíz de Hostinger):
 *   F                  -> FLUX / Black Forest Labs (generar imagen)
 *   OPENROUTER_API_KEY -> OpenRouter (visión gpt-4o-mini para el JSON)
 *   B / DEEPSEEK_API_KEY -> DeepSeek (texto, Mejorar Prompt)
 * ============================================================
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
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
    $orKey   = '';
    $dsKey   = '';
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        include $configFile;
        if (defined('F')) $fluxKey = F;
        elseif (defined('BFL_API_KEY')) $fluxKey = BFL_API_KEY;
        if (defined('OPENROUTER_API_KEY')) $orKey = OPENROUTER_API_KEY;
        if (defined('DEEPSEEK_API_KEY')) $dsKey = DEEPSEEK_API_KEY;
    }
    // FLUX (F / BFL_API_KEY)
    foreach (['F', 'REDIRECT_F', 'BFL_API_KEY', 'REDIRECT_BFL_API_KEY'] as $v) {
        if (!empty($fluxKey)) break;
        $fluxKey = getenv($v) ?: ($_SERVER[$v] ?? '') ?: ($_ENV[$v] ?? '');
    }
    // OpenRouter (visión) — OPENROUTER_API_KEY o la letra corta 'C' si Antonio la usa
    foreach (['OPENROUTER_API_KEY', 'REDIRECT_OPENROUTER_API_KEY', 'C', 'REDIRECT_C'] as $v) {
        if (!empty($orKey)) break;
        $orKey = getenv($v) ?: ($_SERVER[$v] ?? '') ?: ($_ENV[$v] ?? '');
    }
    // DeepSeek (texto, Mejorar Prompt) — DEEPSEEK_API_KEY o la clave 'B' del servidor
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
    // TAREA 1: ANALIZAR ESTILO (imagen -> JSON)  ·  OpenRouter gpt-4o-mini (visión)
    // ═══════════════════════════════════════════════
    if ($task === 'analizarEstilo') {
        if (empty($orKey)) {
            throw new Exception('API Key de OpenRouter no configurada (para analizar el estilo).', 401);
        }

        $imageB64 = (string) ($json['image'] ?? '');
        $mimeType = (string) ($json['mimeType'] ?? 'image/jpeg');
        if ($imageB64 === '') {
            throw new Exception('Falta la imagen de referencia.', 400);
        }
        // Aceptar tanto data URL como base64 puro; normalizar a data URL
        $dataUrl = (strpos($imageB64, 'data:') === 0)
            ? $imageB64
            : ('data:' . $mimeType . ';base64,' . $imageB64);

        $sysText = "Eres un analista visual experto. Analizas EXCLUSIVAMENTE el ESTILO "
            . "visual de una imagen (nunca el sujeto ni su identidad concreta), para poder "
            . "recrear ese mismo estilo aplicándolo a OTRO sujeto distinto. "
            . "Responde SIEMPRE en español salvo el campo prompt_estilo (en inglés). "
            . "Devuelve ÚNICAMENTE un objeto JSON válido con EXACTAMENTE estas claves: "
            . "estilo_general, composicion, iluminacion, paleta_colores, texturas_materiales, "
            . "fondo_profundidad, atmosfera, post_procesado, prompt_estilo. "
            . "El campo prompt_estilo es una frase en INGLÉS, lista para un generador de "
            . "imágenes, que capture el estilo/iluminación/composición/paleta SIN describir "
            . "el sujeto concreto (para que sirva con cualquier sujeto nuevo).";

        [$status, $data] = $callApi(
            'https://openrouter.ai/api/v1/chat/completions',
            [
                'model' => 'openai/gpt-4o-mini',
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => $sysText],
                    ['role' => 'user', 'content' => [
                        ['type' => 'text', 'text' => 'Analiza el ESTILO visual de esta imagen y devuelve el JSON pedido.'],
                        ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]],
                    ]],
                ],
                'max_tokens' => 700,
                'temperature' => 0.4,
            ],
            [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $orKey,
                'HTTP-Referer: ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
                'X-Title: Estilo JSON',
            ],
            90
        );

        if ($status < 200 || $status >= 300) {
            $msg = $data['error']['message'] ?? ('HTTP ' . $status);
            if (is_array($msg)) $msg = json_encode($msg);
            throw new Exception('OpenRouter: ' . $msg, $status);
        }

        $text = (string) ($data['choices'][0]['message']['content'] ?? '');
        if ($text === '') {
            throw new Exception('El modelo de visión no devolvió respuesta.', 502);
        }

        // Sanear: quitar fences ```json ... ``` si los hubiera
        $clean = trim($text);
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
        $estilo = json_decode($clean, true);
        if (!is_array($estilo)) {
            // Fallback: intentar extraer el primer bloque {...}
            if (preg_match('/\{.*\}/s', $clean, $m)) {
                $estilo = json_decode($m[0], true);
            }
        }
        if (!is_array($estilo)) {
            throw new Exception('No se pudo interpretar el JSON de estilo devuelto.', 502);
        }

        $cost = (float) ($data['usage']['cost'] ?? 0);
        echo json_encode(['success' => true, 'estilo' => $estilo, 'coste' => $cost]);
        exit;
    }

    // ═══════════════════════════════════════════════
    // TAREA 2: MEJORAR PROMPT (DeepSeek · texto · deepseek-chat)
    // ═══════════════════════════════════════════════
    if ($task === 'mejorarPrompt') {
        if (empty($dsKey)) {
            throw new Exception('API Key de DeepSeek no configurada (para Mejorar Prompt).', 401);
        }

        $prompt = (string) ($json['prompt'] ?? '');
        $estilo = $json['estilo'] ?? null;
        $estiloTxt = is_array($estilo) ? json_encode($estilo, JSON_UNESCAPED_UNICODE) : '';

        $sysText = "Eres un experto en prompts para IA de imágenes (FLUX). "
            . "El usuario aplicará un ESTILO ya analizado (te lo paso como JSON) al sujeto "
            . "de una imagen que él sube. A partir de su idea y de ese estilo, redacta 4 "
            . "variantes de instrucción en español, concisas (máx. 2 líneas cada una), que "
            . "indiquen cómo aplicar el estilo al sujeto CONSERVANDO su identidad (rostro, "
            . "ropa, rasgos) y cambiando solo iluminación, paleta, composición y atmósfera. "
            . "Devuelve SOLO las 4 variantes separadas por '|||', sin numeración ni texto extra.";

        $userIdea = ($prompt !== '' ? $prompt : 'Aplica el estilo de referencia a mi sujeto de forma realista.')
            . ($estiloTxt !== '' ? ("\n\nEstilo (JSON): " . $estiloTxt) : '');

        [$status, $data] = $callApi(
            'https://api.deepseek.com/chat/completions',
            [
                'model' => 'deepseek-chat',
                'messages' => [
                    ['role' => 'system', 'content' => $sysText],
                    ['role' => 'user', 'content' => $userIdea],
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
            if (is_array($msg)) $msg = json_encode($msg);
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
    // TAREA 3: APLICAR ESTILO (FLUX 2 img2img: sujeto + JSON de estilo)
    // ═══════════════════════════════════════════════
    if ($task === 'aplicarEstilo') {
        if (empty($fluxKey)) {
            throw new Exception('API Key de FLUX (F) no configurada.', 401);
        }

        // Imagen del NUEVO sujeto (base64 con o sin prefijo data:)
        $subject = (string) ($json['subject'] ?? '');
        if ($subject === '') {
            throw new Exception('Falta la imagen del sujeto.', 400);
        }
        if (strpos($subject, ',') !== false && strpos($subject, 'data:') === 0) {
            $subject = substr($subject, strpos($subject, ',') + 1);
        }
        $decoded = base64_decode($subject, true);
        if ($decoded === false || strlen($decoded) > 2500000) {
            throw new Exception('Imagen del sujeto demasiado grande (máximo 2.5MB).', 400);
        }

        // Estilo (JSON) + instrucciones extra del usuario
        $estilo = $json['estilo'] ?? null;
        $extra  = trim((string) ($json['prompt'] ?? ''));

        // Construir el prompt de estilo a partir del JSON
        $estiloPrompt = '';
        if (is_array($estilo)) {
            if (!empty($estilo['prompt_estilo'])) {
                $estiloPrompt = (string) $estilo['prompt_estilo'];
            } else {
                // Concatenar los campos descriptivos si no hay prompt_estilo
                $campos = ['estilo_general', 'iluminacion', 'paleta_colores', 'composicion', 'texturas_materiales', 'fondo_profundidad', 'atmosfera', 'post_procesado'];
                $trozos = [];
                foreach ($campos as $c) {
                    if (!empty($estilo[$c])) $trozos[] = (string) $estilo[$c];
                }
                $estiloPrompt = implode(', ', $trozos);
            }
        }
        if ($estiloPrompt === '' && $extra === '') {
            throw new Exception('Falta el estilo (JSON) o instrucciones para aplicar.', 400);
        }

        // Prompt final: conservar sujeto de la imagen, aplicar SOLO el estilo
        $fullPrompt = "Keep the exact subject of the provided image (same person/object, "
            . "same identity, face, clothing and key features). Re-render it in this VISUAL STYLE: "
            . $estiloPrompt . ". Apply only the lighting, color palette, composition, textures and "
            . "atmosphere of that style; do NOT change who or what the subject is.";
        if ($extra !== '') {
            $fullPrompt .= ' ' . $extra;
        }

        // Modelo según botón: PRO (equilibrado) o MAX (máxima fidelidad)
        $MODELOS = ['pro' => 'flux-2-pro', 'max' => 'flux-2-max'];
        $calidad = (string) ($json['calidad'] ?? 'pro');
        $endpoint = $MODELOS[$calidad] ?? $MODELOS['pro'];

        // ── Dimensiones: aspect ratio + lado objetivo, tope duro 4MP ──
        $aspectRatio = (string) ($json['aspectRatio'] ?? '1:1');
        $target = (int) ($json['targetPx'] ?? 1024);
        if ($target < 256)  $target = 256;
        if ($target > 2048) $target = 2048; // FLUX 2 tope ~4MP
        $MAX_PX = 4194304;
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

        // ── Payload FLUX 2 (img2img): input_image = sujeto ──
        $payload = [
            'prompt' => $fullPrompt,
            'width'  => $w,
            'height' => $h,
            'input_image' => $subject,
            'output_format' => 'jpeg',
        ];

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
        $costCreditos = (float) ($submit['cost'] ?? 0);
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

        // 3) Descargar la imagen (la URL de BFL caduca) y devolverla como data URL
        $ch = curl_init($imageUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $imgBin = curl_exec($ch);
        $imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
        $imgOk = (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200);
        curl_close($ch);

        if (!$imgOk || $imgBin === false || $imgBin === '') {
            throw new Exception('No se pudo descargar la imagen generada por FLUX.', 502);
        }

        echo json_encode([
            'success'  => true,
            'imageUrl' => 'data:' . $imgType . ';base64,' . base64_encode($imgBin),
            'coste'    => $costCreditos * 0.01,
            'modelo'   => $endpoint,
            'calidad'  => $calidad,
            'width'    => $w,
            'height'   => $h,
        ]);
        exit;
    }

    throw new Exception('Tarea no reconocida: ' . $task, 400);

} catch (Throwable $e) {
    $code = (int) $e->getCode();
    http_response_code($code >= 400 ? $code : 500);
    echo json_encode(['error' => ['message' => $e->getMessage()]]);
}
