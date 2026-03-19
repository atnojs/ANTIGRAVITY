<?php
// webhook_stripe.php (opcional)
declare(strict_types=1);
require_once __DIR__ . '/config.php';

// Verifica firma de Stripe si la configuras
$secret = env('STRIPE_WEBHOOK_SECRET','');
$payload = file_get_contents('php://input');
$sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
if (!$secret || !$sig) json_out(['error'=>'MISSING_STRIPE_SIG'], 400);

/**
 * Aquí normalmente usarías la librería oficial de Stripe para validar y decodificar el evento.
 * Para mantener dependencias cero, salimos con ACK básico. Adapta si integras Stripe nativo.
 */
$event = json_decode($payload, true);
if (!$event || empty($event['type'])) json_out(['error'=>'INVALID_EVENT'], 400);

// Traduce a tu esquema local similar a webhook_zoer.php si lo necesitas
audit(null, 'STRIPE_EVENT', ['type'=>$event['type']]);
json_out(['ok'=>true]);
