<?php
// require_active_subscription.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_zoer.php';

function require_active_subscription(array $allowed_status = ['trialing','active']): array {
  $user = require_zoer_user();
  $zoer_user_id = $user['id'];

  $stmt = db()->prepare("SELECT status, current_period_end FROM subscriptions_local
                         WHERE zoer_user_id=? ORDER BY updated_at DESC LIMIT 1");
  $stmt->execute([$zoer_user_id]);
  $row = $stmt->fetch();

  if (!$row || !in_array($row['status'], $allowed_status, true)) {
    json_out(['error'=>'SUBSCRIPTION_REQUIRED','status'=>$row['status'] ?? 'none'], 402);
  }
  // Opcional: si está caducado por tiempo
  if (strtotime($row['current_period_end']) < time() && $row['status'] !== 'trialing') {
    json_out(['error'=>'SUBSCRIPTION_EXPIRED'], 402);
  }
  return $user;
}
