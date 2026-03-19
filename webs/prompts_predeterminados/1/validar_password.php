<?php
header('Content-Type: application/json');
$input = $_POST['password'] ?? '';
echo json_encode(['success' => $input === '0']);
?>