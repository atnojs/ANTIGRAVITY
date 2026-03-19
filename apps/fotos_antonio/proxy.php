<?php
// Proxy para Google Gemini — fotos_antonio version
declare(strict_types=1);
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Use POST']);
    exit;
}



$apiKey = getenv('D');
  if (!$apiKey && isset($_SERVER['GOOGLE_API_KEY'])) $apiKey = $_SERVER['GOOGLE_API_KEY'];
  if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta GOOGLE_API_KEY en entorno del servidor']);
    exit;
  }

$raw = file_get_contents('php://input') ?: '';
$req = json_decode($raw, true);

$model = (string) ($req['model'] ?? 'gemini-3.1-flash-image-preview'); // Default for general logic
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

// Passthrough implementation
$payload = $req;

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 120,
    CURLOPT_SSL_VERIFYPEER => false,
]);

$response = curl_exec($ch);
$code = (int) (curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
curl_close($ch);

http_response_code($code);
echo $response;
