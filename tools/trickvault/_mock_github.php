<?php
/**
 * API de GitHub SIMULADA para probar publicar.php en local (PUBLICAR_API_URL).
 * Guarda su estado en _mock_github_estado.json y comprueba que los cuerpos que
 * recibe traen los campos que exige la API real (blobs, trees, commits, refs).
 */
$estadoFichero = __DIR__ . '/_mock_github_estado.json';
$estado = is_file($estadoFichero)
    ? json_decode(file_get_contents($estadoFichero), true)
    : ['ref' => str_repeat('a', 40), 'tree' => str_repeat('b', 40), 'blobs' => [], 'catalogoSha' => null, 'commits' => []];
$metodo = $_SERVER['REQUEST_METHOD'];
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$cuerpo = json_decode(file_get_contents('php://input'), true);
header('Content-Type: application/json');

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos);
    exit;
}
function fallo($mensaje, $codigo = 422) { responder(['message' => $mensaje], $codigo); }

if ($metodo === 'GET' && preg_match('#^/repos/[^/]+/[^/]+$#', $ruta)) {
    responder(['permissions' => ['push' => true], 'default_branch' => 'main', 'private' => true]);
}
if ($metodo === 'GET' && preg_match('#^/repos/[^/]+/[^/]+/git/ref/heads/(.+)$#', $ruta, $m)) {
    responder(['object' => ['sha' => $estado['ref']], 'ref' => 'refs/heads/' . $m[1]]);
}
if ($metodo === 'GET' && preg_match('#^/repos/[^/]+/[^/]+/git/commits/([0-9a-f]+)$#', $ruta)) {
    responder(['sha' => $estado['ref'], 'tree' => ['sha' => $estado['tree']]]);
}
if ($metodo === 'GET' && preg_match('#^/repos/[^/]+/[^/]+/contents/(.+)$#', $ruta)) {
    $sha = $estado['catalogoSha'] ?? null;
    if (!$sha || !isset($estado['blobs'][$sha])) fallo('Not Found', 404);
    responder(['content' => $estado['blobs'][$sha], 'size' => strlen(base64_decode($estado['blobs'][$sha]))]);
}
if ($metodo === 'POST' && preg_match('#/git/blobs$#', $ruta)) {
    if (!isset($cuerpo['content'], $cuerpo['encoding']) || $cuerpo['encoding'] !== 'base64') fallo('blob sin content/encoding base64');
    $sha = sha1($cuerpo['content']); $estado['blobs'][$sha] = $cuerpo['content']; file_put_contents($estadoFichero, json_encode($estado)); responder(['sha' => $sha], 201);
}
if ($metodo === 'POST' && preg_match('#/git/trees$#', $ruta)) {
    if (!isset($cuerpo['base_tree'])) fallo('tree sin base_tree');
    if (!is_array($cuerpo['tree'] ?? null) || !$cuerpo['tree']) fallo('tree sin entradas');
    foreach ($cuerpo['tree'] as $e) {
        if (!isset($e['path'], $e['mode'], $e['type'], $e['sha'])) fallo('entrada de tree incompleta');
        if ($e['mode'] !== '100644' || $e['type'] !== 'blob') fallo('modo/tipo de tree inesperado');
    }
    foreach ($cuerpo['tree'] as $e) { if (substr($e['path'], -13) === 'catalogo.json') { $estado['catalogoSha'] = $e['sha']; } }
    file_put_contents($estadoFichero, json_encode($estado));
    responder(['sha' => sha1($cuerpo['base_tree'] . json_encode($cuerpo['tree']))], 201);
}
if ($metodo === 'POST' && preg_match('#/git/commits$#', $ruta)) {
    if (!isset($cuerpo['message'], $cuerpo['tree'], $cuerpo['parents'])) fallo('commit sin message/tree/parents');
    $sha = sha1($cuerpo['message'] . $cuerpo['tree'] . microtime());
    $estado['commits'][] = ['sha' => $sha, 'mensaje' => $cuerpo['message'], 'tree' => $cuerpo['tree'], 'padres' => $cuerpo['parents']];
    $estado['pendiente'] = $sha;
    file_put_contents($estadoFichero, json_encode($estado));
    responder(['sha' => $sha, 'message' => $cuerpo['message']], 201);
}
if ($metodo === 'PATCH' && preg_match('#/git/refs/heads/(.+)$#', $ruta, $m)) {
    if (!isset($cuerpo['sha'])) fallo('ref sin sha');
    $estado['ref'] = $cuerpo['sha'];
    file_put_contents($estadoFichero, json_encode($estado));
    responder(['object' => ['sha' => $cuerpo['sha']], 'ref' => 'refs/heads/' . $m[1]]);
}
fallo('ruta simulada no contemplada: ' . $metodo . ' ' . $ruta, 501);

