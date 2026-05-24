<?php
/**
 * Proxy API - Limpiador Windows Antigravity
 *
 * Endpoints:
 *   POST /api/order        - Crear orden de limpieza
 *   GET  /api/pending      - Agente consulta órdenes pendientes
 *   POST /api/result       - Agente envía resultados
 *   GET  /api/latest       - Frontend consulta último resultado
 *   GET  /api/status       - Estado del sistema
 */
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

$API_KEY      = getenv('LIMPIADOR_API_KEY') ?: 'antigravity_limpiador_2026';
$DATA_DIR     = __DIR__ . '/data';
$ORDERS_FILE  = $DATA_DIR . '/orders.json';
$RESULTS_FILE = $DATA_DIR . '/results.json';
$ORDERS_MAX   = 20; // Máximo de órdenes en historial

// Asegurar que el directorio data existe
if (!is_dir($DATA_DIR)) {
    mkdir($DATA_DIR, 0755, true);
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function read_json(string $path): array {
    if (!file_exists($path)) {
        file_put_contents($path, '[]', LOCK_EX);
    }
    $data = file_get_contents($path);
    $decoded = json_decode($data, true);
    return is_array($decoded) ? $decoded : [];
}

function write_json(string $path, array $data): bool {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    return (bool) file_put_contents($path, $json, LOCK_EX);
}

function verify_api_key(): bool {
    global $API_KEY;
    $provided = $_SERVER['HTTP_X_API_KEY'] ?? '';
    return hash_equals($API_KEY, $provided);
}

function generate_id(): string {
    return date('Ymd_His_') . substr(bin2hex(random_bytes(4)), 0, 8);
}

function json_response(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ============================================================
// ROUTER SIMPLE
// ============================================================

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    // ──── CREAR ORDEN DE LIMPIEZA ──────────────────────────
    case 'order':
        if ($method !== 'POST') {
            json_response(405, ['error' => 'Usa POST']);
        }

        $body = json_decode(file_get_contents('php://input') ?: '{}', true);
        $mode = (int) ($body['mode'] ?? 0);
        $allowedBlocks = ['system_temp', 'windows_update', 'recycle_bin', 'browsers', 'apps', 'deep'];
        $guidedBlocks = [];

        if (isset($body['guided_blocks']) && is_array($body['guided_blocks'])) {
            foreach ($body['guided_blocks'] as $block) {
                $block = (string) $block;
                if (in_array($block, $allowedBlocks, true)) {
                    $guidedBlocks[] = $block;
                }
            }
            $guidedBlocks = array_values(array_unique($guidedBlocks));
        }

        if ($mode < 1 || $mode > 5) {
            json_response(400, ['error' => 'Modo inválido. Usa 1-5.']);
        }

        $modes = [
            1 => 'Analizar solamente',
            2 => 'Limpieza guiada',
            3 => 'Limpieza automática',
            4 => 'Limpieza profunda',
            5 => 'Solo sistema (sin apps)',
        ];

        // Verificar que no haya una orden pendiente
        $orders = read_json($ORDERS_FILE);
        foreach ($orders as $o) {
            if (($o['status'] ?? '') === 'pending') {
                json_response(409, [
                    'error' => 'Ya hay una limpieza en curso',
                    'pending_order' => $o,
                ]);
            }
        }

        $order = [
            'id'         => generate_id(),
            'mode'       => $mode,
            'mode_name'  => $modes[$mode],
            'status'     => 'pending',
            'created_at' => date('c'),
            'completed_at' => null,
        ];

        if ($mode === 2 && !empty($guidedBlocks)) {
            $order['guided_blocks'] = $guidedBlocks;
            $order['mode_name'] = 'Limpieza guiada (bloques aprobados)';
        }

        $orders[] = $order;

        // Limpiar órdenes antiguas
        if (count($orders) > $ORDERS_MAX) {
            $orders = array_slice($orders, -$ORDERS_MAX);
        }

        write_json($ORDERS_FILE, $orders);

        json_response(201, [
            'ok'    => true,
            'order' => $order,
            'message' => 'Orden creada. Esperando al agente...',
        ]);
        break;

    // ──── AGENTE: CONSULTAR ORDEN PENDIENTE ────────────────
    case 'pending':
        if (!verify_api_key()) {
            json_response(401, ['error' => 'API Key inválida']);
        }

        $orders = read_json($ORDERS_FILE);
        $pending = null;

        foreach ($orders as $o) {
            if (($o['status'] ?? '') === 'pending') {
                $pending = $o;
                break;
            }
        }

        if ($pending) {
            json_response(200, ['ok' => true, 'has_order' => true, 'order' => $pending]);
        } else {
            json_response(200, ['ok' => true, 'has_order' => false]);
        }
        break;

    // ──── AGENTE: ENVIAR RESULTADOS ─────────────────────────
    case 'result':
        if ($method !== 'POST') {
            json_response(405, ['error' => 'Usa POST']);
        }

        if (!verify_api_key()) {
            json_response(401, ['error' => 'API Key inválida']);
        }

        $body = json_decode(file_get_contents('php://input') ?: '{}', true);
        $orderId = (string) ($body['order_id'] ?? '');

        if ($orderId === '') {
            json_response(400, ['error' => 'Falta order_id']);
        }

        // Marcar orden como completada
        $orders = read_json($ORDERS_FILE);
        $found = false;
        foreach ($orders as &$o) {
            if (($o['id'] ?? '') === $orderId) {
                $o['status'] = 'completed';
                $o['completed_at'] = date('c');
                $found = true;
                break;
            }
        }
        unset($o);

        if (!$found) {
            json_response(404, ['error' => 'Orden no encontrada']);
        }

        write_json($ORDERS_FILE, $orders);

        // Guardar resultado
        $result = [
            'order_id'       => $orderId,
            'mode'           => (int) ($body['mode'] ?? 0),
            'mode_name'      => (string) ($body['mode_name'] ?? ''),
            'status'         => (string) ($body['status'] ?? 'completed'),
            'total_analyzed' => (string) ($body['total_analyzed'] ?? '0 B'),
            'total_freed'    => (string) ($body['total_freed'] ?? '0 B'),
            'errors'         => (int) ($body['errors'] ?? 0),
            'log'            => (string) ($body['log'] ?? ''),
            'sections'       => (array) ($body['sections'] ?? []),
            'guided_plan'    => (array) ($body['guided_plan'] ?? []),
            'computer'       => (string) ($body['computer'] ?? ''),
            'user'           => (string) ($body['user'] ?? ''),
            'is_admin'       => (bool) ($body['is_admin'] ?? false),
            'completed_at'   => date('c'),
        ];

        $results = read_json($RESULTS_FILE);
        $results[] = $result;

        // Mantener solo últimos 30 resultados
        if (count($results) > 30) {
            $results = array_slice($results, -30);
        }

        write_json($RESULTS_FILE, $results);

        json_response(201, ['ok' => true, 'message' => 'Resultados guardados']);
        break;

    // ──── FRONTEND: ÚLTIMO RESULTADO ────────────────────────
    case 'latest':
        $results = read_json($RESULTS_FILE);

        if (empty($results)) {
            json_response(200, ['ok' => true, 'has_result' => false, 'result' => null]);
        }

        $latest = end($results);
        json_response(200, [
            'ok'         => true,
            'has_result' => true,
            'result'     => $latest,
        ]);
        break;

    // ──── ESTADO DEL SISTEMA ────────────────────────────────
    case 'status':
        $orders  = read_json($ORDERS_FILE);
        $results = read_json($RESULTS_FILE);
        $pending = false;
        $pendingOrder = null;

        foreach ($orders as $o) {
            if (($o['status'] ?? '') === 'pending') {
                $pending = true;
                $pendingOrder = $o;
                break;
            }
        }

        json_response(200, [
            'ok'            => true,
            'has_pending'   => $pending,
            'pending_order' => $pendingOrder,
            'total_orders'  => count($orders),
            'total_results' => count($results),
            'last_cleanup'  => empty($results) ? null : end($results)['completed_at'] ?? null,
        ]);
        break;

    // ──── HISTORIAL COMPLETO ────────────────────────────────
    case 'history':
        $results = read_json($RESULTS_FILE);
        $results = array_reverse($results);
        json_response(200, [
            'ok'      => true,
            'count'   => count($results),
            'results' => $results,
        ]);
        break;

    // ──── CANCELAR ORDEN PENDIENTE ──────────────────────────
    case 'cancel':
        $orders = read_json($ORDERS_FILE);
        $cancelled = 0;

        foreach ($orders as &$o) {
            if (($o['status'] ?? '') === 'pending') {
                $o['status'] = 'cancelled';
                $o['completed_at'] = date('c');
                $cancelled++;
            }
        }
        unset($o);

        write_json($ORDERS_FILE, $orders);

        json_response(200, [
            'ok' => true,
            'cancelled' => $cancelled,
            'message' => $cancelled > 0 ? "$cancelled orden(es) cancelada(s)" : 'No habia ordenes pendientes',
        ]);
        break;

    // ──── DEFAULT ───────────────────────────────────────────
    default:
        json_response(404, [
            'error' => 'Endpoint no encontrado',
            'available' => ['order', 'pending', 'result', 'latest', 'status', 'history', 'cancel'],
        ]);
}
