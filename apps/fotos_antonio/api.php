<?php
/**
 * Visual Identity Architect - API Corregida
 * Versión que evita el error "Cannot read clipboard"
 */

require_once 'config.php';
require_once 'simple_db.php';

header('Content-Type: application/json');

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
    $agenteDecision = consultarAgenteFixed($userMsg, $historial, $referencias);

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
function consultarAgenteFixed($userPrompt, $historial, $referencias)
{
    // Usar proxy en lugar de conexión directa
    $url = "proxy.php";

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
        "model" => GEMINI_MODEL,
        "contents" => [
            ["parts" => [["text" => $systemPrompt . "\n\nUSUARIO: " . $userPrompt]]]
        ],
        "generationConfig" => [
            "responseMimeType" => "application/json"
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
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
            $jsonRes['imagen_url'] = generarImagenFixed($jsonRes['megaprompt']);
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
function generarImagenFixed($megaprompt)
{
    // Usar proxy para generación de imágenes
    $url = "proxy.php";
    
    $payload = [
        "model" => GEMINI_MODEL,
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