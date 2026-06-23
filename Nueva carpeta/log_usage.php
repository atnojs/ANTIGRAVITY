<?php
// log_usage.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/require_active_subscription.php';

$user = require_active_subscription();
$zoer_user_id = $user['id'];

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$event_key = $payload['event_key'] ?? null;
$quantity  = intval($payload['quantity'] ?? 1);
$meta      = $payload['meta'] ?? null;

if (!$event_key) json_out(['error'=>'MISSING_EVENT_KEY'], 400);

$stmt = db()->prepare("INSERT INTO usage_events(zoer_user_id, event_key, quantity, occurred_at, meta)
                       VALUES(?,?,?,?,?)");
$stmt->execute([$zoer_user_id, $event_key, $quantity, date('Y-m-d H:i:s'), $meta?json_encode($meta, JSON_UNESCAPED_UNICODE):null]);

audit($zoer_user_id, 'USAGE_LOGGED', ['event_key'=>$event_key,'q'=>$quantity]);

json_out(['ok'=>true]);
