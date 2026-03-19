<?php
// start_checkout.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth_zoer.php';

$user = require_zoer_user();

$plan_code = $_POST['plan_code'] ?? $_GET['plan_code'] ?? null;
if (!$plan_code) json_out(['error'=>'MISSING_PLAN_CODE'], 400);

// Endpoint de Zoer para crear sesión de checkout.
// Sustituye la ruta exacta por la que aparezca en tu panel de Zoer.
// Ejemplos comunes: /billing/checkout, /payments/checkout, /subscriptions/checkout
$apiBase = rtrim(env('ZOER_API_BASE','https://zoer.ai/api'), '/');
$endpoint = $apiBase . "/billing/checkout"; // AJUSTA AQUÍ

$payload = [
  'project_id' => env('ZOER_PROJECT_ID'),
  'plan_code'  => $plan_code,
  'customer'   => ['id' => $user['id'], 'email' => $user['email'] ?? null],
  // URLs de retorno en tu dominio
  'success_url'=> (isset($_SERVER['HTTPS'])?'https':'http') . '://' . $_SERVER['HTTP_HOST'] . '/post_payment_return.php?success=1',
  'cancel_url' => (isset($_SERVER['HTTPS'])?'https':'http') . '://' . $_SERVER['HTTP_HOST'] . '/post_payment_return.php?canceled=1'
];

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'Authorization: Bearer ' . env('ZOER_API_KEY','')
  ],
  CURLOPT_POSTFIELDS => json_encode($payload),
  CURLOPT_TIMEOUT => 20
]);
$res = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http !== 200 || !$res) json_out(['error'=>'CHECKOUT_FAILED','status'=>$http], 502);
$data = json_decode($res, true);
if (empty($data['checkout_url'])) json_out(['error'=>'MALFORMED_RESPONSE'], 502);

// Opcional: auditar
audit($user['id'], 'CHECKOUT_CREATED', ['plan_code'=>$plan_code]);

json_out(['checkout_url'=>$data['checkout_url']]);
