<?php
// ============================================================
// API de historial persistente para el Generador de Imágenes
// Guarda metadatos en JSON + las imágenes como archivos.
// ============================================================
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
    // Coste total acumulado de TODO el historial guardado
    $total = 0.0;
    foreach (loadMeta() as $it) { $total += (float)($it['coste'] ?? 0); }
    http_response_code(200);
    echo json_encode(['success' => true, 'items' => $meta, 'costeTotal' => $total]);
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

    // Extraer binario del data URL
    $dataDir = getDataDir();
    $base64 = '';
    $ext = 'png';
    if (preg_match('#^data:image/([a-zA-Z0-9]+);base64,(.+)$#', $imageData, $m)) {
        $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
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

    $meta = loadMeta();
    $newItem = [
        'id'        => $id,
        'prompt'    => (string)($req['prompt'] ?? ''),
        'calidad'   => (string)($req['calidad'] ?? ''),
        'modelo'    => (string)($req['modelo'] ?? ''),
        'coste'     => (float)($req['coste'] ?? 0),
        'editada'   => (bool)($req['editada'] ?? false),
        'createdAt' => (int)($req['createdAt'] ?? (time() * 1000)),
        'imageFile' => $imageFile,
        'imageUrl'  => './history_data/' . $imageFile,
    ];

    array_unshift($meta, $newItem);
    $meta = array_slice($meta, 0, 200);
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
            if ($imgPath && file_exists($imgPath)) { unlink($imgPath); }
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
                if ($imgPath && file_exists($imgPath)) { unlink($imgPath); }
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
