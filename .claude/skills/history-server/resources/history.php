<?php
/**
 * History Server — API de historial persistente para apps Antigravity
 *
 * Almacena historial en servidor (sin límite de 5MB de localStorage).
 * Accesible desde cualquier navegador/dispositivo.
 *
 * Uso:
 *   GET  history.php?action=list           → lista todas las entradas
 *   POST history.php?action=save           → guarda una entrada (body JSON)
 *   POST history.php?action=delete&id=X    → elimina entrada X
 *   POST history.php?action=clear          → limpia todo el historial
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/history.json';

// Asegurar que el directorio de datos existe
if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo crear el directorio de datos']);
        exit;
    }
}

/**
 * Carga el historial desde el archivo JSON
 */
function loadHistory(string $file): array {
    if (!file_exists($file)) {
        return [];
    }
    $json = file_get_contents($file);
    if ($json === false) {
        return [];
    }
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

/**
 * Guarda el historial en el archivo JSON (con bloqueo de escritura)
 */
function saveHistory(string $file, array $history): bool {
    $json = json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    return file_put_contents($file, $json, LOCK_EX) !== false;
}

// Determinar acción
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        $history = loadHistory($dataFile);
        echo json_encode(['success' => true, 'history' => $history, 'count' => count($history)]);
        break;

    case 'save':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Datos JSON inválidos']);
            exit;
        }

        $history = loadHistory($dataFile);

        $entry = [
            'id' => $input['id'] ?? uniqid('h_', true),
            'type' => $input['type'] ?? 'image',
            'data' => $input['data'] ?? $input,
            'createdAt' => $input['createdAt'] ?? date('c'),
        ];

        // Insertar al principio (más reciente primero)
        array_unshift($history, $entry);

        if (!saveHistory($dataFile, $history)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al guardar el historial']);
            exit;
        }

        echo json_encode(['success' => true, 'entry' => $entry, 'count' => count($history)]);
        break;

    case 'delete':
        $id = $_GET['id'] ?? $_POST['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Parámetro id requerido']);
            exit;
        }

        $history = loadHistory($dataFile);
        $before = count($history);
        $history = array_values(array_filter($history, function($e) use ($id) {
            return ($e['id'] ?? '') !== $id;
        }));
        $deleted = $before - count($history);

        if (!saveHistory($dataFile, $history)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al guardar cambios']);
            exit;
        }

        echo json_encode(['success' => true, 'deleted' => $deleted, 'count' => count($history)]);
        break;

    case 'clear':
        if (!saveHistory($dataFile, [])) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al limpiar historial']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Historial limpiado']);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Acción no válida',
            'valid_actions' => ['list', 'save', 'delete', 'clear'],
            'usage' => [
                'list'   => 'GET  history.php?action=list',
                'save'   => 'POST history.php?action=save  (body JSON)',
                'delete' => 'POST history.php?action=delete&id=ID',
                'clear'  => 'POST history.php?action=clear',
            ]
        ]);
}
