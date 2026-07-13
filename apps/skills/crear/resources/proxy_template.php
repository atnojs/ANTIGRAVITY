<?php
// Proxy FLUX/BFL para Hostinger: usa la clave F definida fuera de Git.
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !function_exists('curl_init')) {
    http_response_code(405);
    echo json_encode(['error' => 'Solo se admiten peticiones POST con cURL habilitado.']);
    exit;
}

$apiKey = getenv('F') ?: getenv('REDIRECT_F') ?: ($_SERVER['F'] ?? '') ?: ($_SERVER['REDIRECT_F'] ?? '');
$req = json_decode(file_get_contents('php://input') ?: '', true);
if (!$apiKey || !is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta la clave F de FLUX o el cuerpo JSON es inválido.']);
    exit;
}

$prompt = trim((string)($req['prompt'] ?? ''));
$image = (string)($req['image'] ?? '');
$quality = (string)($req['quality'] ?? 'pro');
$width = max(32, (int)($req['width'] ?? 1024));
$height = max(32, (int)($req['height'] ?? 1024));
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Falta el prompt.']);
    exit;
}
if (str_contains($image, 'base64,')) { $image = substr($image, strpos($image, 'base64,') + 7); }

$endpoint = 'https://api.bfl.ai/v1/' . ($quality === 'max' ? 'flux-2-max' : 'flux-2-pro');
$payload = ['prompt' => $prompt, 'width' => $width, 'height' => $height];
if ($image !== '') { $payload['input_image'] = $image; }

$ch = curl_init($endpoint);
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'accept: application/json', 'x-key: ' . $apiKey], CURLOPT_POSTFIELDS => json_encode($payload), CURLOPT_TIMEOUT => 30]);
$response = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);
if ($response === false || $code >= 400) {
    http_response_code($code ?: 502);
    echo json_encode(['error' => $error ?: 'FLUX rechazó la solicitud.']);
    exit;
}

$data = json_decode($response, true);
$pollingUrl = (string)($data['polling_url'] ?? '');
if ($pollingUrl === '') {
    http_response_code(502);
    echo json_encode(['error' => 'FLUX no devolvió una URL de seguimiento.']);
    exit;
}
for ($i = 0; $i < 60; $i++) {
    usleep(1500000);
    $poll = curl_init($pollingUrl);
    curl_setopt_array($poll, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['accept: application/json', 'x-key: ' . $apiKey], CURLOPT_TIMEOUT => 20]);
    $result = curl_exec($poll);
    curl_close($poll);
    $status = json_decode((string)$result, true);
    if (($status['status'] ?? '') === 'Ready') {
        echo json_encode(['success' => true, 'imageUrl' => $status['result']['sample'] ?? '']);
        exit;
    }
    if (in_array($status['status'] ?? '', ['Error', 'Failed', 'Request Moderated', 'Content Moderated'], true)) {
        http_response_code(422);
        echo json_encode(['error' => 'FLUX no pudo completar la solicitud.']);
        exit;
    }
}
http_response_code(504);
echo json_encode(['error' => 'FLUX tardó demasiado en responder.']);