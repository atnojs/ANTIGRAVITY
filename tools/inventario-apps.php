<?php
/**
 * Inventario de estado por app para la migración:
 *   flux / dall-e / config.php / historial / modelo gemini 2 / despliegue web.
 * Solo lectura. Uso: php tools/inventario-apps.php
 */
declare(strict_types=1);

$raiz = dirname(__DIR__);
$appsDir = "$raiz/apps";

$apps = [];
foreach (glob("$appsDir/*", GLOB_ONLYDIR) ?: [] as $dir) {
    $nombre = basename($dir);
    if (str_starts_with($nombre, '_') || str_starts_with($nombre, '.')) continue;
    // Sub-apps con su propio proxy (ej. imagenes_ia/generar) se tratan aparte.
    $apps[$nombre] = $dir;
    foreach (glob("$dir/*", GLOB_ONLYDIR) ?: [] as $sub) {
        $subNombre = basename($sub);
        if (str_starts_with($subNombre, '_') || str_starts_with($subNombre, '.')) continue;
        if (is_file("$sub/proxy.php") || is_file("$sub/index.html")) {
            $apps["$nombre/$subNombre"] = $sub;
        }
    }
}

$filas = [];
foreach ($apps as $nombre => $dir) {
    $proxies = array_merge(glob("$dir/proxy*.php") ?: [], glob("$dir/*/proxy*.php") ?: []);
    $proxyTxt = '';
    foreach ($proxies as $p) { $proxyTxt .= (string)file_get_contents($p); }

    $frontTxt = '';
    foreach (array_merge(glob("$dir/*.js") ?: [], glob("$dir/*.html") ?: []) as $f) { $frontTxt .= (string)file_get_contents($f); }

    $histPhp = "$dir/history.php";
    $histTxt = is_file($histPhp) ? (string)file_get_contents($histPhp) : '';
    $store = str_contains($histTxt, 'history_store');
    $legacy = str_contains($histTxt, 'history_data');
    $histDir = is_dir("$dir/history_store") ? 'history_store' : (is_dir("$dir/history_data") ? 'history_data' : '—');
    $histCount = 0;
    foreach (['history_store', 'history_data'] as $h) {
        if (is_dir("$dir/$h")) { $histCount += count(glob("$dir/$h/*") ?: []); }
    }

    $hay = function (string $t, array $agujas): bool {
        foreach ($agujas as $a) { if (stripos($t, $a) !== false) return true; }
        return false;
    };
    $filas[] = [
        'app'      => $nombre,
        'fluxProx' => $hay($proxyTxt, ['flux', 'bfl.ai']),
        'fluxFront'=> $hay($frontTxt, ['flux']),
        'dalle'    => $hay($proxyTxt . $frontTxt, ['dall-e', 'dalle']),
        'config'   => $hay($proxyTxt, ['config.php']) || is_file("$dir/config.php"),
        'gemini2'  => str_contains($proxyTxt, 'gemini-2.5-flash-image'),
        'hist'     => $histCount > 0 ? ($store ? 'store' : ($legacy ? 'LEGACY' : 'otra')) : '—',
        'histN'    => $histCount,
        'proxy'    => count($proxies) > 0,
    ];
}

// Orden: primero las que tienen trabajo pendiente, luego por volumen de historial.
usort($filas, function (array $a, array $b): int {
    $pa = ($a['fluxProx'] || $a['fluxFront'] || $a['dalle'] || $a['config'] || $a['hist'] === 'LEGACY' || !$a['gemini2']) ? 0 : 1;
    $pb = ($b['fluxProx'] || $b['fluxFront'] || $b['dalle'] || $b['config'] || $b['hist'] === 'LEGACY' || !$b['gemini2']) ? 0 : 1;
    return $pa === $pb ? $b['histN'] <=> $a['histN'] : $pa <=> $pb;
});

printf("%-44s %-5s %-6s %-5s %-7s %-7s %-8s %s\n", 'APP', 'FLUXp', 'FLUXf', 'DALL', 'config', 'gemini2', 'historial', 'n');
echo str_repeat('-', 100) . "\n";
foreach ($filas as $f) {
    printf(
        "%-44s %-5s %-6s %-5s %-7s %-7s %-8s %d\n",
        $f['app'],
        $f['fluxProx'] ? 'SI' : '-',
        $f['fluxFront'] ? 'SI' : '-',
        $f['dalle'] ? 'SI' : '-',
        $f['config'] ? 'SI' : '-',
        $f['gemini2'] ? 'SI' : 'NO',
        $f['hist'],
        $f['histN']
    );
}
$pendientes = array_filter($filas, fn($f) => $f['fluxProx'] || $f['fluxFront'] || $f['dalle'] || $f['config'] || $f['hist'] === 'LEGACY' || !$f['gemini2']);
echo "\nTotal apps/sub-apps: " . count($filas) . " | con trabajo pendiente: " . count($pendientes) . "\n";
