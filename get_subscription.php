<?php
// get_subscription.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_zoer.php';

$user = require_zoer_user();
$pdo = db();

$stmt = $pdo->prepare("SELECT plan_code, status, current_period_end, trial_end
                       FROM subscriptions_local WHERE zoer_user_id=?
                       ORDER BY updated_at DESC LIMIT 1");
$stmt->execute([$user['id']]);
$sub = $stmt->fetch() ?: null;

json_out(['user_id'=>$user['id'], 'subscription'=>$sub]);
