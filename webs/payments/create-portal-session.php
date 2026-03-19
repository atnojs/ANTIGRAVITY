<?php
// payments/create-portal-session.php
require __DIR__ . '/config.php';

// Puedes enviar: { customer_id } o { session_id }
$body = readJson();
$customerId = trim($body['customer_id'] ?? '');
$sessionId  = trim($body['session_id'] ?? '');

if (!$customerId && !$sessionId) bad('Provide customer_id or session_id');

if (!$customerId && $sessionId) {
    [$sess, $err] = stripeRequest('GET', "/checkout/sessions/$sessionId");
    if ($err) bad($err, 400);
    $customerId = $sess['customer'] ?? '';
    if (!$customerId) bad('Customer not found in session');
}

$payload = [
    'customer' => $customerId,
    'return_url' => 'https://atnojs.es/Paginas/web_apps/index.html'
];

[$json, $err] = stripeRequest('POST', '/billing_portal/sessions', $payload);
if ($err) bad($err, 400);

ok(['url' => $json['url'] ?? null]);
