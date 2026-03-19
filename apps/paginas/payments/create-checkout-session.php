<?php
// payments/create-checkout-session.php
require __DIR__ . '/config.php';

$body = readJson();
$plan = strtolower(trim($body['plan'] ?? 'monthly'));
$email = trim($body['email'] ?? ''); // opcional, ayuda a crear el customer

$price = $plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;

$payload = [
    'mode' => 'subscription',
    'success_url' => SUCCESS_URL,
    'cancel_url'  => CANCEL_URL,
    'line_items[0][price]' => $price,
    'line_items[0][quantity]' => 1,
    'allow_promotion_codes' => 'true',
    'automatic_tax[enabled]' => 'true',
    'billing_address_collection' => 'auto',
];

// Si conocemos el email, lo adjuntamos
if ($email !== '') {
    $payload['customer_email'] = $email;
    $payload['subscription_data[metadata][email]'] = $email;
}

[$json, $err] = stripeRequest('POST', '/checkout/sessions', $payload);
if ($err) bad($err, 400);

ok(['sessionId' => $json['id'] ?? null, 'url' => $json['url'] ?? null]);
