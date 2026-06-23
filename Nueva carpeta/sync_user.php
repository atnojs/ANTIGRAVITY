<?php
// sync_user.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_zoer.php';

$user = require_zoer_user();
audit($user['id'], 'SYNC_USER', []);
json_out(['ok'=>true, 'user'=>$user]);
