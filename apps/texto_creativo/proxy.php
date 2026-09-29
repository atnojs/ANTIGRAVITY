<?php
/**
 * Proxy de texto/imagen para la app de siluetas (texto_creativo).
 *
 * Qué resuelve: antes el navegador llamaba DIRECTAMENTE a
 * generativelanguage.googleapis.com con la clave que el usuario pegaba en la interfaz,
 * que se guardaba en localStorage. Eso incumple la regla del proyecto: el frontend
 * nunca llama a una API que requiera clave. Ahora:
 *   - la clave vive SOLO en el .htaccess raíz del servidor (SetEnv A) y se resuelve del
 *     entorno (getenv / REDIRECT_ / $_SERVER / $_ENV);
 *   - el frontend llama a este proxy con la misma forma que esperaba de Google
 *     ({contents, generationConfig}) y recibe la misma forma de respuesta
 *     (candidates/parts), así que el cliente no cambia de contrato;
 *   - `action=health` informa de si hay clave configurada, sin devolverla nunca.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
ini_set('display_errors', '0');
error_reporting(E_ALL);

const MODELO_IMAGEN = 'gemini-2.5-flash-image';
const MODELO_IMAGEN_ALIAS = [
    'gemini-3.1-flash-image-preview' => 'gemini-2.5-flash-image',
    'gemini-3.1-flash-image'         => 'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview'     => 'gemini-3-pro-image',
    'gemini-2.5-flash-image-preview' => 'gemini-2.5-flash-image',
];

function claveEntorno(string $nombre): string {
    foreach ([getenv($nombre), getenv('REDIRECT_' . $nombre), $_SERVER[$nombre] ?? '', $_SERVER['REDIRECT_' . $nombre] ?? '', $_ENV[$nombre] ?? '', $_ENV['REDIRECT_' . $nombre] ?? ''] as $valor) {
        if (is_string($valor) && trim($valor) !== '') return trim($valor);
    }
    return '';
}

function responder(int $estado, array $cuerpo): never {
    http_response_code($estado);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$clave = claveEntorno('A');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$cuerpoCrudo = ($_SERVER['REQUEST_METHOD'] === 'POST') ? (string)file_get_contents('php://input') : '';
$entrada = json_decode($cuerpoCrudo ?: '{}', true);
if (!is_array($entrada)) $entrada = [];
$accion = strtolower(trim((string)(($entrada['action'] ?? '') ?: ($_GET['action'] ?? ''))));

// Diagnóstico: nunca devuelve la clave.
if ($accion === 'health' || ($accion === '' && $_SERVER['REQUEST_METHOD'] === 'GET')) {
    responder(200, [
        'success'    => true,
        'service'    => 'texto_creativo-proxy',
        'configured' => ['gemini' => $clave !== ''],
        'models'     => ['gemini-2', 'gemini-flash', 'gemini-pro'],
        'actions'    => ['generate', 'health'],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['error' => ['message' => 'Método no permitido.']]);
}

if ($clave === '') {
    responder(500, ['error' => ['message' => 'La clave de Gemini (A) no está configurada en el servidor.']]);
}
if (!function_exists('curl_init')) {
    responder(500, ['error' => ['message' => 'cURL no está disponible en el servidor.']]);
}

// Modelo pedido por el cliente (con alias a los identificadores vigentes) y carga útil.
$modelo = (string)($entrada['model'] ?? MODELO_IMAGEN);
$modelo = MODELO_IMAGEN_ALIAS[$modelo] ?? $modelo;
if (preg_match('#^[a-zA-Z0-9._-]+$#', $modelo) !== 1) {
    responder(400, ['error' => ['message' => 'Modelo no válido.']]);
}

$carga = [];
foreach (['contents', 'generationConfig', 'safetySettings', 'systemInstruction'] as $campo) {
    if (isset($entrada[$campo])) $carga[$campo] = $entrada[$campo];
}
if (empty($carga['contents']) || !is_array($carga['contents'])) {
    responder(400, ['error' => ['message' => 'Falta el contenido de la petición.']]);
}
if (strlen($cuerpoCrudo) > 24 * 1024 * 1024) {
    responder(413, ['error' => ['message' => 'La petición es demasiado grande.']]);
}

$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $modelo . ':generateContent?key=' . urlencode($clave);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($carga, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT        => 180,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
]);
$respuesta = curl_exec($ch);
$estadoHttp = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$errorCurl = curl_error($ch);
curl_close($ch);

if ($respuesta === false) {
    responder(502, ['error' => ['message' => 'No se pudo contactar con el proveedor.']]);
}
$json = json_decode((string)$respuesta, true);
if (!is_array($json)) {
    responder(502, ['error' => ['message' => 'Respuesta no válida del proveedor.']]);
}
if ($estadoHttp >= 400) {
    // Se propaga el error del proveedor sin la URL (que lleva la clave).
    responder($estadoHttp, ['error' => ['message' => (string)($json['error']['message'] ?? ('HTTP ' . $estadoHttp))]]);
}
// Mismo contrato que devolvía Google directamente (candidates/parts).
echo json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
