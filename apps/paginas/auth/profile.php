<?php
// /Paginas/auth/profile.php
declare(strict_types=1);
require __DIR__ . '/config.php';

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$auth && isset($_GET['token'])) $auth = 'Bearer ' . $_GET['token'];
if (!$auth) {
  http_response_code(401);
  echo json_encode(['error'=>'Missing token']);
  exit;
}

list($type, $token) = array_pad(explode(' ', $auth, 2), 2, '');
if (strcasecmp($type,'Bearer') !== 0 || !$token) {
  http_response_code(401);
  echo json_encode(['error'=>'Invalid Authorization header']);
  exit;
}

$out = proxy_json('GET', '/auth/profile', null, $token);
echo json_encode($out, JSON_UNESCAPED_UNICODE);
