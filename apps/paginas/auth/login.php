<?php
// /Paginas/auth/login.php
declare(strict_types=1);
require __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim($input['email'] ?? '');
$pass  = (string)($input['password'] ?? '');

if (!$email || !$pass) {
  http_response_code(400);
  echo json_encode(['error' => 'Email y contraseña requeridos']);
  exit;
}

$out = proxy_json('POST', '/auth/login/', ['email'=>$email,'password'=>$pass], null);

// Esperado: { token: "...", user: {...} }
echo json_encode(['token'=>$out['token'] ?? null, 'user'=>$out['user'] ?? null], JSON_UNESCAPED_UNICODE);
