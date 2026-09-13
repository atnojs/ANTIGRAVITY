<?php
// DEBUG TEMPORAL — solo nombres de variables, nunca valores.
header('Content-Type: application/json');
$patterns = ['/OPENAI/i', '/^O$/i', '/^R$/i', '/^F$/i', '/^A$/i', '/^B$/i', '/GEMINI/i', '/API/i', '/KEY/i'];
$found = [];
foreach ($patterns as $p) {
    foreach (array_keys($_SERVER) as $k) {
        if (preg_match($p, $k)) $found['_SERVER'][$k] = true;
    }
    foreach (array_keys($_ENV) as $k) {
        if (preg_match($p, $k)) $found['_ENV'][$k] = true;
    }
}
$envKeys = getenv() ? array_keys(getenv()) : [];
foreach ($patterns as $p) {
    foreach ($envKeys as $k) {
        if (preg_match($p, $k)) $found['getenv'][$k] = true;
    }
}
echo json_encode(['only_names' => array_map('array_keys', $found)], JSON_PRETTY_PRINT);
