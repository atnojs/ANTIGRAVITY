<?php
/**
 * Proxy para Google Gemini - Chef at Home
 * Permite realizar peticiones a la API de Gemini desde el frontend sin exponer la API Key.
 * También incluye funciones de web scraping para buscar recetas.
 */
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Captura de errores fatales
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Error interno del servidor', 'details' => $e['message']]);
    }
});

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL no está habilitado en el servidor.']);
    exit;
}

// API Key
$API_KEY = getenv('GEMINI_KEY_COLOR') ?: 'TU_API_KEY_AQUI';

// ============ ACCIONES ESPECIALES (GET) ============
$action = $_GET['action'] ?? null;

if ($action === 'search_recipe') {
    $query = $_GET['q'] ?? '';
    if (empty($query)) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el parámetro q']);
        exit;
    }

    // Buscar directamente en webs de recetas
    $results = searchRecipeSites($query);
    echo json_encode(['results' => $results]);
    exit;
}

if ($action === 'extract_url') {
    $url = $_GET['url'] ?? '';
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el parámetro url']);
        exit;
    }

    $html = fetchUrl($url);
    $recipe = extractRecipeWithAI($html, $url, $API_KEY);
    echo json_encode($recipe);
    exit;
}

// ============ PETICIÓN GEMINI NORMAL (POST) ============
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST o GET con action.']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$req = json_decode($raw, true);

if (!is_array($req)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido o vacío.']);
    exit;
}

$model = (string) ($req['model'] ?? 'gemini-3.1-flash-image-preview');
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";

$payload = $req['payload'] ?? $req;

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_TIMEOUT => 120,
]);

$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(['error' => 'Error de comunicación con Google', 'details' => $err]);
    exit;
}

$code = (int) (curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
curl_close($ch);

http_response_code($code);
echo $response;
exit;

// ============ FUNCIONES AUXILIARES ============

function fetchUrl(string $url): string
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER => ['Accept-Language: es-ES,es;q=0.9'],
    ]);
    $html = curl_exec($ch) ?: '';
    curl_close($ch);
    return $html;
}

function searchRecipeSites(string $query): array
{
    $results = [];
    $q = urlencode($query);

    // Buscar en RecetasGratis
    $html = fetchUrl("https://www.recetasgratis.net/busqueda?q={$q}");
    preg_match_all('/<a[^>]+href="(https:\/\/www\.recetasgratis\.net\/receta[^"]+)"[^>]*>.*?<h2[^>]*>([^<]+)<\/h2>/is', $html, $m);
    if (empty($m[1])) {
        // Fallback: buscar enlaces de receta
        preg_match_all('/<a[^>]+href="(https:\/\/www\.recetasgratis\.net\/receta-de-[^"]+)"/i', $html, $m2);
        foreach (array_unique($m2[1] ?? []) as $url) {
            $title = ucwords(str_replace(['-', 'receta-de-'], [' ', ''], basename(parse_url($url, PHP_URL_PATH))));
            $results[] = ['url' => $url, 'title' => trim($title), 'source' => 'recetasgratis.net'];
            if (count($results) >= 4)
                break;
        }
    } else {
        foreach ($m[1] as $i => $url) {
            $results[] = ['url' => $url, 'title' => trim($m[2][$i] ?? $query), 'source' => 'recetasgratis.net'];
            if (count($results) >= 4)
                break;
        }
    }

    // Buscar en DirectoAlPaladar
    $html = fetchUrl("https://www.directoalpaladar.com/buscar?q={$q}");
    preg_match_all('/<a[^>]+href="(https:\/\/www\.directoalpaladar\.com\/recetas[^"]+)"[^>]*>([^<]+)/i', $html, $m);
    foreach ($m[1] ?? [] as $i => $url) {
        $results[] = ['url' => $url, 'title' => trim($m[2][$i] ?? $query), 'source' => 'directoalpaladar.com'];
        if (count($results) >= 8)
            break;
    }

    return array_slice($results, 0, 8);
}

function extractRecipeWithAI(string $html, string $url, string $apiKey): array
{
    // Limpiar HTML
    $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
    $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
    $html = preg_replace('/<nav[^>]*>.*?<\/nav>/is', '', $html);
    $html = preg_replace('/<footer[^>]*>.*?<\/footer>/is', '', $html);
    $html = preg_replace('/<header[^>]*>.*?<\/header>/is', '', $html);
    $text = strip_tags(preg_replace('/\s+/', ' ', $html));
    $text = substr($text, 0, 12000);

    $prompt = "Extrae la receta completa de este contenido web. URL origen: {$url}\n\nContenido:\n{$text}\n\n" .
        "IMPORTANTE: Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques de código markdown) con esta estructura:\n" .
        '{"id":"gen_' . time() . '","title":"nombre del plato","description":"breve descripción","timeMinutes":número,' .
        '"difficulty":"Fácil/Media/Difícil","servings":número,"rating":4.5,' .
        '"imageUrl":"busca una imagen de unsplash relacionada o usa https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",' .
        '"sourceUrl":"' . $url . '",' .
        '"ingredients":[{"id":"i1","name":"ingrediente","amount":cantidad,"unit":"unidad","amountImperial":cantidad,"unitImperial":"unidad"}],' .
        '"instructions":[{"stepNumber":1,"description":"paso detallado","durationSeconds":null o número,"ingredients":["i1"],"sensoryCue":"pista sensorial opcional"}]}' .
        "\n\nAsegúrate de incluir TODOS los ingredientes y TODOS los pasos de la receta original.";

    $payload = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['temperature' => 0.1]
    ];

    $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={$apiKey}";

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 90,
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    $text = preg_replace('/```json|```/', '', $text);
    $text = trim($text);

    $recipe = json_decode($text, true);
    if (!$recipe || !isset($recipe['title'])) {
        return ['error' => 'No se pudo extraer la receta de esta página', 'url' => $url];
    }

    // Asegurar ID único
    $recipe['id'] = 'web_' . md5($url) . '_' . time();
    $recipe['sourceUrl'] = $url;

    return $recipe;
}

