<?php
// payments/retrieve-session.php
require __DIR__ . '/config.php';

$sessionId = $_GET['session_id'] ?? '';
if (!$sessionId) bad('Missing session_id');

[$json, $err] = stripeRequest('GET', "/checkout/sessions/$sessionId", []);
if ($err) bad($err, 400);

ok(['session' => $json]);
