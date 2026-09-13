<?php
declare(strict_types=1);
// ============================================================
// API CENTRAL Antigravity — vive en la RAIZ del dominio (public_html).
// Único punto con acceso a las claves (SetEnv del .htaccess raíz),
// que LiteSpeed NO propaga a subdirectorios. Ninguna app lleva
// config.php ni .htaccess propio: todas reenvían aquí.
//
// Acciones:
//   action=image  -> generación/edición de imágenes (catálogo 7 modelos)
//   action=text   -> chat de texto con Gemini 3.8 Flash (OpenRouter)
//   action=vision -> descripción/análisis de una imagen (Gemini 3.8 Flash)
// ============================================================
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(180);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/apps/dibujo_lineas_copia/canonical-image-model.php';

const AG_MAX_BODY = 32 * 1024 * 1024;

function ag_respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ag_respond(405, ['success' => false, 'error' => 'Solo POST.']);
}

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > AG_MAX_BODY) {
    ag_respond(413, ['success' => false, 'error' => 'Solicitud demasiado grande.']);
}

$raw = file_get_contents('php://input');
$req = json_decode($raw ?: '', true);
if (!is_array($req) || json_last_error() !== JSON_ERROR_NONE) {
    ag_respond(400, ['success' => false, 'error' => 'JSON no válido.']);
}

$action = strtolower(trim((string)($req['action'] ?? 'image')));

if ($action === 'image') {
    try {
        $result = ag_image_generate($req, '');
        ag_respond(200, $result);
    } catch (Throwable $e) {
        $status = (int)$e->getCode();
        if ($status < 400 || $status > 599) $status = 500;
        ag_respond($status, ['success' => false, 'error' => $e->getMessage()]);
    }
}

if ($action === 'text' || $action === 'vision') {
    $key = ag_image_key('', 'R');
    if ($key === '') {
        ag_respond(500, ['success' => false, 'error' => 'Clave OpenRouter (R) no configurada.']);
    }
    $prompt = trim((string)($req['prompt'] ?? ''));
    if ($prompt === '') {
        ag_respond(400, ['success' => false, 'error' => 'Falta el prompt.']);
    }
    $content = [['type' => 'text', 'text' => $prompt]];
    if ($action === 'vision') {
        $img = (string)($req['image'] ?? $req['imageData'] ?? '');
        if ($img === '') {
            ag_respond(400, ['success' => false, 'error' => 'Falta la imagen para vision.']);
        }
        try {
            [, $mime] = ag_image_input($img);
        } catch (Throwable $e) {
            ag_respond(400, ['success' => false, 'error' => $e->getMessage()]);
        }
        $pure = preg_replace('#^data:[^;]+;base64,#i', '', trim($img));
        $content[] = ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $mime . ';base64,' . $pure]];
    }
    $payload = [
        'model' => 'google/gemini-3.8-flash',
        'messages' => [['role' => 'user', 'content' => $content]],
        'max_tokens' => 8000,
    ];
    try {
        $data = ag_image_json('https://openrouter.ai/api/v1/chat/completions', ['Authorization: *** ' . $key, 'Content-Type: application/json'], $payload);
    } catch (Throwable $e) {
        ag_respond((int)$e->getCode() ?: 502, ['success' => false, 'error' => $e->getMessage()]);
    }
    $text = (string)($data['choices'][0]['message']['content'] ?? '');
    if ($text === '') {
        ag_respond(502, ['success' => false, 'error' => 'El modelo no devolvió texto.']);
    }
    ag_respond(200, ['success' => true, 'type' => 'text', 'text' => $text, 'model' => 'gemini-3.8-flash']);
}

ag_respond(400, ['success' => false, 'error' => 'Acción no soportada. Usa image, text o vision.']);
