<?php
// ============================================================
// PROXY PHP - Generador de imágenes OpenAI y Gemini.
// Catálogo 2.5 vía canonical-image-model.php: openai-medium/high
// (gpt-image-2.5-flare), openai-xhigh (gpt-image-2.5-sunburst),
// openai-max-flare (gpt-image-2.5-flare/max), openai-max-sunburst
// (gpt-image-2.5-sunburst/max) + gemini-flash/pro (OpenRouter R).
// La llamada OpenAI (generations/edits) la ejecuta
// ag_image_generate() de canonical-image-model.php.
// Modelos fuera de la lista blanca: rechazados con 400.
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'Solo se aceptan peticiones POST']]);
    exit;
}

$canonicalBody = json_decode((string)file_get_contents('php://input'), true);
if (is_array($canonicalBody)) {
    try {
        // Respetar el formato de salida de la app (9:16 por defecto) cuando
        // el frontend solo envía width/height (sin aspectRatio).
        if (empty($canonicalBody['aspectRatio'])) {
            $cw = (int)($canonicalBody['width'] ?? 0);
            $ch = (int)($canonicalBody['height'] ?? 0);
            if ($cw > 0 && $ch > 0) {
                $allowed = ['1:1'=>1.0,'2:3'=>2/3,'3:2'=>3/2,'3:4'=>3/4,'4:3'=>4/3,'4:5'=>4/5,'5:4'=>5/4,'9:16'=>9/16,'16:9'=>16/9,'21:9'=>21/9];
                $ratio = $cw / $ch; $best = '1:1'; $dist = PHP_FLOAT_MAX;
                foreach ($allowed as $label => $value) {
                    $d = abs($ratio - $value);
                    if ($d < $dist) { $dist = $d; $best = $label; }
                }
                $canonicalBody['aspectRatio'] = $best;
            }
        }
        $result = ag_image_generate($canonicalBody, __DIR__);
        $result['width'] = (int)($canonicalBody['width'] ?? 0);
        $result['height'] = (int)($canonicalBody['height'] ?? 0);
        $result['imageUrl'] = $result['imageUrl'] ?? $result['dataUrl'];
        echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    } catch (Throwable $error) {
        $status = (int)$error->getCode();
        if ($status < 400 || $status > 599) $status = 500;
        http_response_code($status);
        echo json_encode(['error'=>['message'=>$error->getMessage()]], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
    exit;
}

// ===== Petición no canónica: rechazar =====
http_response_code(400);
echo json_encode(['error' => ['message' => 'Modelo no soportado.']]);
exit;
