<?php
// API de historial persistente — Estudio de Imágenes IA
// Almacena metadatos en JSON + imágenes en history_data/
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Helpers ---

function getDataDir(): string {
    $dir = __DIR__ . '/history_data';
    if (!is_dir($dir)) { mkdir($dir, 0755, true); }
    return $dir;
}

function getMetaFile(): string {
    return getDataDir() . '/metadata.json';
}

function loadMeta(): array {
    $file = getMetaFile();
    if (!file_exists($file)) return [];
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveMeta(array $data): void {
    $file = getMetaFile();
    file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
}

function sanitizeId(string $id): string {
    return preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
}

// --- Router ---

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $meta = loadMeta();
    $meta = array_slice($meta, 0, 100);
    http_response_code(200);
    echo json_encode(['success' => true, 'items' => $meta]);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $req = json_decode($raw, true);
    if (!is_array($req)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON inválido']);
        exit;
    }

    $id = sanitizeId((string)($req['id'] ?? ''));
    $imageData = (string)($req['imageData'] ?? ''); // base64 data URL

    if ($id === '' || $imageData === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Faltan campos: id, imageData']);
        exit;
    }

    // Guardar imagen como archivo
    $dataDir = getDataDir();
    $base64 = '';
    $ext = 'png';
    if (preg_match('#^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$#s', $imageData, $m)) {
        $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : preg_replace('/[^a-z0-9]/', '', strtolower($m[1]));
        if ($ext === '') $ext = 'png';
        $base64 = $m[2];
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato imageData no válido (data URL esperado)']);
        exit;
    }

    $imageFile = $id . '.' . $ext;
    $imagePath = $dataDir . '/' . $imageFile;
    $binary = base64_decode($base64, true);
    if ($binary === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Base64 inválido']);
        exit;
    }
    file_put_contents($imagePath, $binary, LOCK_EX);

    // Actualizar metadatos
    $meta = loadMeta();
    $newItem = [
        'id'        => $id,
        'prompt'    => (string)($req['prompt'] ?? ''),
        'action'    => (string)($req['action'] ?? 'generar'),
        'calidad'   => (string)($req['calidad'] ?? 'normal'),
        'cost'      => (float)($req['cost'] ?? 0),
        'createdAt' => (int)($req['createdAt'] ?? 0),
        'imageFile' => $imageFile,
        'imageUrl'  => './history_data/' . $imageFile,
    ];

    // Insertar al principio (más reciente primero)
    array_unshift($meta, $newItem);

    // Limitar a 100 items en servidor
    $meta = array_slice($meta, 0, 100);

    saveMeta($meta);

    http_response_code(200);
    echo json_encode(['success' => true, 'item' => $newItem]);
    exit;
}

if ($method === 'DELETE') {
    $raw = file_get_contents('php://input') ?: '';
    $req = json_decode($raw, true);
    $idToDelete = isset($req['id']) ? sanitizeId((string)$req['id']) : null;
    $clearAll = isset($req['clearAll']) && $req['clearAll'];

    $dataDir = getDataDir();
    $meta = loadMeta();

    if ($clearAll) {
        foreach ($meta as $item) {
            $imgPath = $dataDir . '/' . ($item['imageFile'] ?? '');
            if ($imgPath && file_exists($imgPath)) {
                unlink($imgPath);
            }
        }
        saveMeta([]);
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Historial limpiado']);
        exit;
    }

    if ($idToDelete) {
        $newMeta = [];
        $deleted = false;
        foreach ($meta as $item) {
            if (($item['id'] ?? '') === $idToDelete) {
                $imgPath = $dataDir . '/' . ($item['imageFile'] ?? '');
                if ($imgPath && file_exists($imgPath)) {
                    unlink($imgPath);
                }
                $deleted = true;
            } else {
                $newMeta[] = $item;
            }
        }
        saveMeta($newMeta);
        http_response_code(200);
        echo json_encode(['success' => $deleted, 'message' => $deleted ? 'Item eliminado' : 'No encontrado']);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Especifica id o clearAll']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Método no permitido']);
