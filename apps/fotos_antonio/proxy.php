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



// API Key — cascadeo robusto (config.php → env → REDIRECT_ → $_SERVER → $_ENV)
$apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('GEMINI_API_KEY');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_GEMINI_API_KEY');
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_GEMINI_API_KEY'] ?? '';
}
if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'API key no configurada.']]);
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
