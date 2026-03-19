<?php
// /Paginas/auth/register.php
declare(strict_types=1);
require __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim($input['email'] ?? '');
$pass  = (string)($input['password'] ?? '');
$name  = trim($input['name'] ?? '');

if (!$email || !$pass) {
  http_response_code(400);
  echo json_encode(['error' => 'Email y contraseña requeridos']);
  exit;
}

$data = ['email'=>$email,'password'=>$pass];
if ($name) $data['name'] = $name;

// Zoer suele aceptar register sin bearer.
$out = proxy_json('POST', '/auth/register/', $data, null);
echo json_encode(['ok'=>true,'user'=>$out], JSON_UNESCAPED_UNICODE);
