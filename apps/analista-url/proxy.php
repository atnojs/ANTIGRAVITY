<?php
declare(strict_types=1);
/**
 * Proxy de «Analista de URL».
 *
 * La app no genera ni edita nada con IA: aquí no hay claves ni proveedores.
 * Este proxy existe por dos motivos:
 *   1. `health` — endpoint de salud que usa el catálogo y las comprobaciones de despliegue.
 *   2. `meta`   — leer metadatos públicos (YouTube y GitHub) desde el servidor.
 *                 El navegador no puede: la CSP del hosting bloquea las llamadas
 *                 externas, así que se piden aquí, desde el mismo origen.
 *
 * No es un proxy genérico: la URL remota NO viaja en la petición. Se reconstruye
 * a partir de un identificador validado (id de vídeo o `owner/repo`), y solo hay
 * dos destinos posibles, ambos de solo lectura.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(20);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_ID = 32;

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** GET simple con cURL y tiempo máximo corto. Devuelve [status, json|null]. */
function pedirJson(string $url, array $cabeceras, int $timeout = 8): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        return [0, ['error' => $error !== '' ? 'sin conexión' : 'error de red']];
    }
    $json = json_decode((string)$raw, true);
    return [$status, is_array($json) ? $json : null];
}

function recortar($valor, int $max = 300): string {
    if (!is_scalar($valor)) return '';
    $texto = trim((string)$valor);
    return mb_strlen($texto, 'UTF-8') > $max ? mb_substr($texto, 0, $max, 'UTF-8') . '…' : $texto;
}

$action = strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? 'health')));

if ($action === 'health') {
    respond(200, [
        'success' => true,
        'app' => 'analista-url',
        'version' => '20261123',
        'acciones' => ['health', 'meta'],
    ]);
}

if ($action !== 'meta') {
    respond(404, ['success' => false, 'error' => 'Acción no disponible.']);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$tipo = strtolower(trim((string)($_GET['tipo'] ?? '')));

if ($tipo === 'video') {
    $id = (string)($_GET['id'] ?? '');
    if (preg_match('/^[A-Za-z0-9_-]{6,20}$/', $id) !== 1) {
        respond(400, ['success' => false, 'error' => 'Identificador de vídeo no válido.']);
    }
    $url = 'https://www.youtube.com/oembed?url=' . rawurlencode('https://www.youtube.com/watch?v=' . $id) . '&format=json';
    [$estado, $json] = pedirJson($url, ['Accept: application/json']);
    if ($estado !== 200 || !is_array($json)) {
        respond(200, ['success' => false, 'error' => 'YouTube no devolvió metadatos.']);
    }
    respond(200, [
        'success' => true,
        'meta' => [
            'titulo' => recortar($json['title'] ?? ''),
            'autor' => recortar($json['author_name'] ?? '', 120),
            'fuente' => 'oEmbed de YouTube',
        ],
    ]);
}

if ($tipo === 'repo') {
    $repo = (string)($_GET['repo'] ?? '');
    if (strlen($repo) > MAX_ID * 3 || preg_match('#^[A-Za-z0-9._-]{1,39}/[A-Za-z0-9._-]{1,80}$#', $repo) !== 1) {
        respond(400, ['success' => false, 'error' => 'Repositorio no válido.']);
    }
    [$estado, $json] = pedirJson('https://api.github.com/repos/' . $repo, [
        'Accept: application/vnd.github+json',
        'User-Agent: atnojs-analista-url',
    ]);
    if ($estado !== 200 || !is_array($json)) {
        respond(200, ['success' => false, 'error' => 'GitHub no devolvió el repositorio (¿privado o inexistente?).']);
    }
    $licencia = 'sin licencia declarada';
    if (isset($json['license']) && is_array($json['license'])) {
        $spdx = strtoupper((string)($json['license']['spdx_id'] ?? ''));
        if ($spdx !== '' && $spdx !== 'NOASSERTION' && $spdx !== 'NONE') {
            $licencia = recortar($spdx, 40);
        }
    }
    respond(200, [
        'success' => true,
        'meta' => [
            'titulo' => recortar($json['full_name'] ?? '', 120),
            'autor' => recortar($json['owner']['login'] ?? '', 80),
            'licencia' => $licencia,
            'estrellas' => isset($json['stargazers_count']) ? (string)(int)$json['stargazers_count'] : '',
            'actualizado' => substr((string)($json['pushed_at'] ?? ''), 0, 10),
            'fuente' => 'API pública de GitHub',
        ],
    ]);
}

respond(400, ['success' => false, 'error' => 'Tipo de metadato no soportado.']);
