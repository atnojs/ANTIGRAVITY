<?php
header('Content-Type: application/json; charset=utf-8');

try {
  if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    throw new Exception('Archivo no recibido');
  }
  $kind = $_POST['kind'] ?? 'prompt';
  $subdir = $kind === 'folder' ? 'imagenes/iconos' : ($kind === 'bg' ? 'imagenes/fondos' : 'imagenes/miniaturas');

  $baseDir = __DIR__ . '/' . $subdir;
  if (!is_dir($baseDir) && !mkdir($baseDir, 0755, true)) {
    throw new Exception('No se pudo crear el directorio destino');
  }

  $name = $kind.'_'.date('Ymd_His').'_'.bin2hex(random_bytes(3)).'.jpg';
  $pathFs = $baseDir . '/' . $name;

  $tmp = $_FILES['file']['tmp_name'];
  $data = file_get_contents($tmp);
  $saved = false;

  if (function_exists('imagecreatefromstring') && ($im = @imagecreatefromstring($data))) {
    $saved = imagejpeg($im, $pathFs, 85);
    imagedestroy($im);
  }
  if (!$saved) { $saved = move_uploaded_file($tmp, $pathFs); }
  if (!$saved) throw new Exception('No se pudo guardar la imagen');

  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'];
  $baseUrl = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
  $url = $scheme.'://'.$host.$baseUrl.'/'.$subdir.'/'.$name;

  echo json_encode(['success'=>true,'url'=>$url], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}

