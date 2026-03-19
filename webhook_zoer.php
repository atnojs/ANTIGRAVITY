<?php
// webhook_zoer.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

// Verificación básica de firma (ajusta a lo que Zoer indique en su doc)
$signature = $_SERVER['HTTP_ZOER_SIGNATURE'] ?? '';
$secret = env('ZOER_WEBHOOK_SECRET','');
$body = file_get_contents('php://input');
$calc = base64_encode(hash_hmac('sha256', $body, $secret, true));
if (!$secret || !hash_equals($calc, $signature)) {
  json_out(['error'=>'INVALID_SIGNATURE'], 400);
}

$event = json_decode($body, true);
if (!$event || empty($event['type'])) json_out(['error'=>'INVALID_PAYLOAD'], 400);

/**
 * Esperados (ejemplos): subscription.created, subscription.updated, subscription.canceled,
 * invoice.payment_succeeded, invoice.payment_failed, trial.started, trial.ended
 * El esquema exacto depende de Zoer; consulta tu panel y adapta los campos.
 */
$type = $event['type'];
$data = $event['data'] ?? [];
$sub  = $data['subscription'] ?? null;
$user = $data['user'] ?? null;

if ($sub && $user && !empty($sub['id'])) {
  // Upsert de suscripción
  $pdo = db();
  $stmt = $pdo->prepare("INSERT INTO subscriptions_local
    (zoer_user_id, zoer_subscription_id, plan_code, status, current_period_start, current_period_end, cancel_at, canceled_at, trial_end, raw_provider)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      plan_code=VALUES(plan_code),
      status=VALUES(status),
      current_period_start=VALUES(current_period_start),
      current_period_end=VALUES(current_period_end),
      cancel_at=VALUES(cancel_at),
      canceled_at=VALUES(canceled_at),
      trial_end=VALUES(trial_end),
      raw_provider=VALUES(raw_provider),
      updated_at=NOW()");
  $stmt->execute([
    $user['id'],
    $sub['id'],
    $sub['plan_code'] ?? ($sub['plan']['code'] ?? 'unknown'),
    $sub['status'] ?? 'active',
    date('Y-m-d H:i:s', intval($sub['current_period_start'] ?? time())),
    date('Y-m-d H:i:s', intval($sub['current_period_end'] ?? time())),
    !empty($sub['cancel_at']) ? date('Y-m-d H:i:s', intval($sub['cancel_at'])) : null,
    !empty($sub['canceled_at']) ? date('Y-m-d H:i:s', intval($sub['canceled_at'])) : null,
    !empty($sub['trial_end']) ? date('Y-m-d H:i:s', intval($sub['trial_end'])) : null,
    json_encode($sub, JSON_UNESCAPED_UNICODE)
  ]);
  audit($user['id'], 'WEBHOOK_'.strtoupper(str_replace('.','_',$type)), ['sub'=>$sub['id']]);
}

json_out(['ok'=>true]);
