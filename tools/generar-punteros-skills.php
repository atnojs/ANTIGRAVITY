<?php
/**
 * Regenera los punteros de `.claude/skills/<nombre>/SKILL.md` a partir de:
 *   1. su front matter actual (name/description, para que se descubran),
 *   2. el bloque de política de `skills/POLITICA_modelos-imagen.md` (fuente única),
 *   3. la ruta del contenido canónico que ya indica el puntero.
 *
 * Objetivo: que un modelo NO tenga que dar ningún salto para saber qué modelo de
 * imagen usar, y que ese bloque no pueda divergir entre punteros (se genera).
 *
 * Uso:  php tools/generar-punteros-skills.php [--check]
 *       --check  no escribe nada; solo informa de los punteros desactualizados.
 */
declare(strict_types=1);

$raiz = dirname(__DIR__);
$politicaFichero = "$raiz/skills/POLITICA_modelos-imagen.md";
$soloComprobar = in_array('--check', $argv, true);

if (!is_file($politicaFichero)) {
    fwrite(STDERR, "ERROR: falta $politicaFichero\n");
    exit(1);
}

// Bloque de política: se toma tal cual a partir de la primera línea "## ".
$politicaBruta = (string)file_get_contents($politicaFichero);
$inicio = strpos($politicaBruta, '## ');
if ($inicio === false) {
    fwrite(STDERR, "ERROR: la política no contiene una sección '## '.\n");
    exit(1);
}
$politica = trim(substr($politicaBruta, $inicio)) . "\n";

$punteros = glob("$raiz/.claude/skills/*/SKILL.md") ?: [];
sort($punteros);

$actualizados = 0;
$revisar = 0;

foreach ($punteros as $ruta) {
    $texto = (string)file_get_contents($ruta);
    $rel = str_replace("$raiz/", '', $ruta);

    // Ruta canónica: el puntero la indica entre **`...`**.
    if (preg_match('/\*\*`([^`]+\.md)`\*\*/', $texto, $m) !== 1) {
        echo "SIN RUTA   $rel\n";
        $revisar++;
        continue;
    }
    $canonico = $m[1];
    if (!is_file("$raiz/$canonico")) {
        echo "ROTA       $rel  ->  $canonico (no existe)\n";
        $revisar++;
        continue;
    }

    // Front matter del puntero (o del canónico si faltara).
    if (preg_match('/^name:\s*(.+)$/m', $texto, $mn) !== 1 && preg_match('/^name:\s*(.+)$/m', (string)file_get_contents("$raiz/$canonico"), $mn) !== 1) {
        echo "SIN NAME   $rel\n";
        $revisar++;
        continue;
    }
    $name = trim($mn[1]);
    preg_match('/^description:\s*(.+)$/m', $texto, $md);
    if (!isset($md[1])) { preg_match('/^description:\s*(.+)$/m', (string)file_get_contents("$raiz/$canonico"), $md); }
    $desc = isset($md[1]) ? trim($md[1]) : '';

    // Título: el H1 que ya tiene el puntero.
    preg_match('/^#\s+(.+)$/m', $texto, $mt);
    $titulo = isset($mt[1]) ? trim($mt[1]) : $name;

    $nuevo = "---\nname: $name\n" . ($desc !== '' ? "description: $desc\n" : '') . "---\n\n"
        . "# $titulo\n\n"
        . $politica
        . "\n### Contenido completo de esta skill\n\n"
        . "El texto íntegro de esta skill vive en **`$canonico`** (relativo a la raíz del proyecto). "
        . "Léelo y aplícalo tal cual para el resto del procedimiento. Si hay que cambiar algo de esa skill, "
        . "se cambia SOLO en el árbol canónico `skills/`.\n";

    if ($nuevo === $texto) {
        echo "OK         $rel\n";
        continue;
    }
    if ($soloComprobar) {
        echo "DESACTUALIZADO  $rel\n";
        $revisar++;
        continue;
    }
    if (file_put_contents($ruta, $nuevo) === false) {
        fwrite(STDERR, "ERROR escribiendo $rel\n");
        exit(1);
    }
    echo "REGENERADO $rel  ->  $canonico\n";
    $actualizados++;
}

echo "\nPunteros: " . count($punteros) . " | regenerados: $actualizados | a revisar: $revisar\n";
exit($revisar > 0 ? 1 : 0);
