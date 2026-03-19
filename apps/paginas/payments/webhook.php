<?php
// payments/webhook.php
require __DIR__ . '/config.php';

// Si en el futuro añades STRIPE_WEBHOOK_SECRET, valida la firma aquí.
// De momento, simplemente 200 OK para pruebas.
http_response_code(200);
echo json_encode(['ok'=>true]);
