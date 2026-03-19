<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

try {
  $pdo = db();

  // BD actual
  $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();

  // Prueba simple
  $r = $pdo->query("SELECT 1")->fetchColumn();

  // Conteo de tablas en esta BD
  $tables = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();

  // OK si r == 1 (no estricto)
  if ($r == 1) {
    echo "OK\n";
  } else {
    echo "WARN\n";
  }

  echo "DB: {$dbName}\n";
  echo "SELECT 1 => "; var_export($r); echo "\n";
  echo "Tables in DB: {$tables}\n";

} catch (Throwable $e) {
  echo "ERROR: " . $e->getMessage() . "\n";
}
