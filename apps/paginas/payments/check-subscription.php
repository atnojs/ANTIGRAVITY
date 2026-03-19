<?php
// payments/check-subscription.php
require __DIR__ . '/config.php';

$body = readJson();
$email = trim($body['email'] ?? '');
if ($email === '') bad('Missing email');

// Intentar búsqueda por email (endpoint de búsqueda; si falla, usamos listado)
[$found, $err] = stripeRequest('GET', '/customers', ['email' => $email, 'limit' => 1]);
if ($err) bad($err, 400);

$customerId = $found['data'][0]['id'] ?? '';
if (!$customerId) {
    ok(['active' => false, 'status' => 'no_customer']);
}

[$subs, $err2] = stripeRequest('GET', '/subscriptions', ['customer' => $customerId, 'limit' => 5, 'status' => 'all']);
if ($err2) bad($err2, 400);

$activeStates = ['trialing','active','past_due','unpaid']; // considera acceso en estos estados
$status = 'none';
$current_period_end = null;

foreach (($subs['data'] ?? []) as $s) {
    if (in_array($s['status'], $activeStates, true)) {
        $status = $s['status'];
        $current_period_end = $s['current_period_end'] ?? null;
        break;
    }
}

ok([
    'active' => $status !== 'none',
    'status' => $status,
    'current_period_end' => $current_period_end
]);
