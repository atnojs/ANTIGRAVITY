<?php
// post_payment_return.php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

$success = isset($_GET['success']);
$canceled = isset($_GET['canceled']);

if ($success) {
  // Normalmente Zoer enviará webhook con el estado final. Aquí solo UI.
  header('Content-Type: text/html; charset=utf-8');
  echo "<script>window.localStorage.setItem('lastPayment','success');</script>";
  echo "Pago confirmado. Puedes cerrar esta pestaña y volver a la app.";
  exit;
}
if ($canceled) {
  header('Content-Type: text/html; charset=utf-8');
  echo "Pago cancelado por el usuario.";
  exit;
}
echo "OK";
