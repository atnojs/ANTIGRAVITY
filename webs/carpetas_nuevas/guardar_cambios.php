<?php
header('Content-Type: application/json; charset=utf-8');

try {
  $raw = $_POST['jsonData']
      ?? $_POST['json']
      ?? $_POST['data']
      ?? $_POST['payload']
      ?? file_get_contents('php://input');

  if (!$raw) throw new Exception('jsonData vacío');

  $data = json_decode($raw, true);
  if ($data === null) throw new Exception('JSON inválido');

  if (isset($data['appData']) && is_array($data['appData'])) {
    $data = $data['appData'];
  }

  foreach (['settings','prompts','promptFolders'] as $k) {
    if (!array_key_exists($k, $data)) {
      throw new Exception('Estructura de datos principal incorrecta. Faltan claves esperadas.');
    }
  }

  $file = __DIR__.'/data.json';
  if (file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)) === false) {
    throw new Exception('No se pudo escribir el archivo');
  }

  echo json_encode(['success'=>true]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
