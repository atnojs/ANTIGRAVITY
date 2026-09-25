<?php
/**
 * Visual Identity Architect - API Corregida
 * Versión que evita el error "Cannot read clipboard"
 */

require_once 'config.php';
require_once 'simple_db.php';

header('Content-Type: application/json');

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

$action = $_GET['action'] ?? '';
$db = new SimpleDB();

try {
    switch ($action) {
        case 'chat':
            handleChatFixed($db);
            break;
        case 'get_conversations':
            echo json_encode($db->obtenerConversaciones());
            break;
        case 'get_messages':
            $convId = $_GET['id'] ?? null;
            echo json_encode($db->obtenerMensajes($convId));
            break;
        case 'get_references':
            echo json_encode($db->obtenerReferencias());
            break;
        case 'upload_ref':
            handleUploadRef($db);
            break;
        default:
            throw new Exception("Acción no válida: " . $action);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Maneja la lógica del Agente IA (Chat) - Versión corregida
 */
function handleChatFixed($db)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $userMsg = $data['message'] ?? '';
    $conversacionId = $data['conversacion_id'] ?? null;
    $model = (string)($data['model'] ?? 'openai-medium');

    if (empty($userMsg))
        throw new Exception("Mensaje vacío");

    // 1. Crear conversación si no existe
    if (!$conversacionId) {
        $conversacionId = $db->crearConversacion();
    }

    // 2. Guardar mensaje del usuario
    $db->guardarMensaje($conversacionId, 'user', $userMsg);

    // 3. Obtener contexto (historial + referencias)
    $historial = $db->obtenerMensajes($conversacionId);
    $referencias = $db->obtenerReferencias();

    // 4. Lógica del Agente (Fase 1 y 2: Análisis y Cualificación)
    $agenteDecision = consultarAgenteFixed($userMsg, $historial, $referencias, $model);

    // 5. Guardar y devolver respuesta
    $imagenUrl = $agenteDecision['imagen_url'] ?? null;
    $db->guardarMensaje($conversacionId, 'assistant', $agenteDecision['respuesta'], $imagenUrl);

    echo json_encode([
        'conversacion_id' => $conversacionId,
        'respuesta' => $agenteDecision['respuesta'],
        'imagen_url' => $imagenUrl,
        'fase' => $agenteDecision['fase'] ?? 'cualificacion'
    ]);
}

/**
 * Consulta al agente - Versión corregida sin envío de imágenes
 */
function consultarAgenteFixed($userPrompt, $historial, $referencias, $imageModel = 'openai-medium')
{
    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (clave R; la resuelve el helper)
    global $mimoTextCall;

    $refText = "";
    foreach ($referencias as $ref) {
        $refText .= "- " . $ref['nombre'] . ": " . $ref['descripcion'] . "\n";
    }

    $historialText = "";
    foreach (array_slice($historial, -5) as $msg) {
        $historialText .= strtoupper($msg['rol']) . ": " . $msg['contenido'] . "\n";
    }

    $systemPrompt = "Eres 'Director de Arte' de Visual Identity Architect. 
    Tu sujeto es Antonio. Tienes acceso a descripciones de sus fotos de referencia.
    
    IMPORTANTE: NO puedes ver imágenes directamente, solo tienes descripciones textuales.
    
    TU MISIÓN:
    1. Fase Análisis: ¿El usuario quiere una imagen de Antonio?
    2. Fase Cualificación: Si pide imagen pero faltan detalles técnicos (RATIO, ESTILO, LUZ, LENTE), NO generes. Pregunta proactivamente.
    3. Fase Ejecución: Si tienes todos los detalles, crea un MEGAPROMPT técnico para generar una imagen.
    
    BASÁNDOTE EN LAS DESCRIPCIONES, Antonio es:
    - Hombre hispano, alrededor de 30 años
    - Cabello oscuro, sonrisa natural
    - Estatura media, complexión atlética
    
    RESPONDE SIEMPRE EN JSON:
    {
        \"fase\": \"cualificacion\" | \"ejecucion\",
        \"respuesta\": \"Tu mensaje al usuario\",
        \"requiere_generacion\": boolean,
        \"megaprompt\": \"...\" (solo si requiere_generacion es true)
    }
    
    Historial:\n$historialText
    Referencias (descripciones):\n$refText";

    $payload = [
        "model" => "xiaomi/mimo-v2.6-pro", // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter
        "contents" => [
            ["parts" => [["text" => $systemPrompt . "\n\nUSUARIO: " . $userPrompt]]]
        ],
        "generationConfig" => [
            "responseMimeType" => "application/json"
        ]
    ];

    // modelo de texto: xiaomi/mimo-v2.6-pro vía OpenRouter (response_format json_object cuando responseMimeType es JSON)
    [$httpcode, $response] = $mimoTextCall($payload, $payload['generationConfig'] ?? []);
    $data = json_decode($response, true);

    if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        $jsonRes = json_decode($data['candidates'][0]['content']['parts'][0]['text'], true);
        
        // Validar respuesta
        if (!is_array($jsonRes)) {
            return [
                'fase' => 'cualificacion',
                'respuesta' => 'Entiendo que quieres trabajar en la identidad visual de Antonio. ¿Podrías darme más detalles sobre el estilo, iluminación y composición que tienes en mente?',
                'requiere_generacion' => false
            ];
        }
        
        if (isset($jsonRes['requiere_generacion']) && $jsonRes['requiere_generacion'] && isset($jsonRes['megaprompt'])) {
            $jsonRes['imagen_url'] = generarImagenFixed($jsonRes['megaprompt'], $imageModel);
        }
        
        return $jsonRes;
    }

    // Respuesta de fallback si hay error
    return [
        'fase' => 'cualificacion',
        'respuesta' => 'Perfecto, estoy listo para trabajar en la identidad visual de Antonio. Para crear una imagen precisa, necesito saber: 1) ¿Qué estilo prefieres (retrato profesional, casual, artístico)? 2) ¿Qué iluminación (natural, estudio, dramática)? 3) ¿Qué ratio o formato (cuadrado, horizontal, vertical)?',
        'requiere_generacion' => false
    ];
}

/**
 * Genera imagen usando el proxy - Versión corregida
 */
function generarImagenFixed($megaprompt, $model = 'openai-medium')
{
    // Usar proxy para generación de imágenes
    $url = "proxy.php";
    
    $payload = [
        "model" => $model,
        "contents" => [["parts" => [["text" => $megaprompt]]]],
        "generationConfig" => ["responseModalities" => ["IMAGE"]]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 60
    ]);

    $response = curl_exec($ch);
    $data = json_decode($response, true);

    if (isset($data['candidates'][0]['content']['parts'])) {
        foreach ($data['candidates'][0]['content']['parts'] as $part) {
            if (isset($part['inlineData'])) {
                $filename = 'gen_' . time() . '_' . uniqid() . '.jpg';
                $filepath = UPLOADS_DIR . $filename;
                
                // Asegurar que la carpeta existe
                if (!file_exists(UPLOADS_DIR)) {
                    mkdir(UPLOADS_DIR, 0777, true);
                }
                
                $imageData = base64_decode($part['inlineData']['data']);
                if (file_put_contents($filepath, $imageData)) {
                    return UPLOADS_URL . $filename;
                }
            }
        }
    }

    return null;
}

/**
 * Maneja la subida de fotos de referencia
 */
function handleUploadRef($db)
{
    if ($_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $nombre = $_POST['nombre'] ?? 'Sin nombre';
        $ext = pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION);
        $filename = 'ref_' . time() . '.' . $ext;
        $targetPath = REFERENCIAS_DIR . $filename;

        if (move_uploaded_file($_FILES['foto']['tmp_name'], $targetPath)) {
            $db->agregarReferencia($nombre, REFERENCIAS_URL . $filename);
            header('Location: admin.html?success=1');
            exit;
        }
    }
    throw new Exception("Error al subir la foto");
}