<?php
header('Content-Type: text/plain');

echo "=== DIAGNÓSTICO DE VARIABLES DE ENTORNO ===\n\n";

$vars = [
    'getenv("A")' => getenv('A'),
    'getenv("REDIRECT_A")' => getenv('REDIRECT_A'),
    '$_SERVER["A"]' => isset($_SERVER['A']) ? $_SERVER['A'] : null,
    '$_SERVER["REDIRECT_A"]' => isset($_SERVER['REDIRECT_A']) ? $_SERVER['REDIRECT_A'] : null,
    '$_ENV["A"]' => isset($_ENV['A']) ? $_ENV['A'] : null,
    '$_ENV["REDIRECT_A"]' => isset($_ENV['REDIRECT_A']) ? $_ENV['REDIRECT_A'] : null,
];

foreach ($vars as $name => $val) {
    if ($val === null) {
        echo "$name: [NO EXISTE]\n";
    } elseif ($val === false) {
        echo "$name: [FALSE]\n";
    } elseif ($val === '') {
        echo "$name: [VACÍO]\n";
    } else {
        $masked = substr($val, 0, 10) . "..." . substr($val, -5);
        echo "$name: $masked (Longitud: " . strlen($val) . ")\n";
    }
}

echo "\n=== COMPROBACIÓN DE CONFIG.PHP ===\n\n";
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    if (defined('A')) {
        $val = A;
        $masked = substr($val, 0, 10) . "..." . substr($val, -5);
        echo "Constante 'A' en config.php: $masked (Longitud: " . strlen($val) . ")\n";
    } else {
        echo "config.php existe, pero la constante 'A' no está definida.\n";
    }
} else {
    echo "config.php no existe en este directorio.\n";
}

echo "\n=== CLAVE DE API ACTUALMENTE RESUELTA POR PROXY.PHP ===\n\n";

$apiKey = getenv('A');
if (!$apiKey || empty($apiKey)) { $apiKey = getenv('REDIRECT_A'); }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['A'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_SERVER['REDIRECT_A'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['A'] ?? ''; }
if (!$apiKey || empty($apiKey)) { $apiKey = $_ENV['REDIRECT_A'] ?? ''; }

$fallbackUsed = false;
if (!$apiKey || empty($apiKey)) {
    $fallbackUsed = true;
    if (file_exists($configFile)) {
        $apiKey = defined('A') ? A : '';
    }
}

if (!$apiKey) {
    echo "Resultado final: [NINGUNA CLAVE ENCONTRADA]\n";
} else {
    $masked = substr($apiKey, 0, 10) . "..." . substr($apiKey, -5);
    echo "Resultado final: $masked (Origen: " . ($fallbackUsed ? "config.php" : "Variable de Entorno") . ")\n";
}
?>
