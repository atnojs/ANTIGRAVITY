# Rota (o inventaria) las claves de Google incrustadas en el código.
#
# Estas claves NO se pueden crear desde aquí: eso es en la consola de Google
# Cloud, con sesión. Este script hace lo de después: cambiar la vieja por la
# nueva en TODOS los ficheros, de una vez y sin dejarse ninguno.
#
# Uso:
#   # 1. Ver el inventario actual (no toca nada)
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-claves-google.ps1 -Listar
#
#   # 2. Simulacro: ver qué cambiaría
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-claves-google.ps1 `
#       -Vieja AIzaSyAlTZgo... -Nueva AIzaSyNUEVA...
#
#   # 3. Aplicarlo de verdad
#   ... -Vieja AIza... -Nueva AIza... -Aplicar
#
#   # 4. Varias a la vez, desde un JSON {"AIzaVIEJA":"AIzaNUEVA", ...}
#   ... -MapaJson tools\claves-nuevas.json -Aplicar
#
# OJO: un commit con la clave nueva la vuelve a publicar. Antes de dar por
# cerrada una rotación, decide si esa clave debe seguir viviendo en el
# navegador o pasar a proxy.php (patrón del proyecto).
param(
    [string]$Vieja = '',
    [string]$Nueva = '',
    [string]$MapaJson = '',
    [switch]$Listar,
    [switch]$Aplicar
)

$ErrorActionPreference = 'Stop'
$raiz = 'E:\ANTIGRAVITY'
if (-not (Test-Path -LiteralPath (Join-Path $raiz 'apps'))) { $raiz = Split-Path -Parent $PSScriptRoot }

$patronClave = 'AIza[0-9A-Za-z_\-]{35}'
$carpetas = @('apps', 'webs', 'skills', 'public_html')
$extensiones = @('*.js', '*.php', '*.html', '*.json', '*.css', '*.txt', '*.md')

function Get-Ficheros {
    foreach ($c in $carpetas) {
        $ruta = Join-Path $raiz $c
        if (-not (Test-Path -LiteralPath $ruta)) { continue }
        Get-ChildItem -LiteralPath $ruta -Recurse -File -Include $extensiones -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.git\\' }
    }
}

# ── Inventario ─────────────────────────────────────────────────────────────
if ($Listar -or ($Vieja -eq '' -and $MapaJson -eq '')) {
    $mapa = @{}
    foreach ($f in Get-Ficheros) {
        $t = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $t) { continue }
        foreach ($m in [regex]::Matches($t, $patronClave)) {
            $k = $m.Value
            if (-not $mapa.ContainsKey($k)) { $mapa[$k] = @() }
            $rel = $f.FullName.Replace("$raiz\", '').Replace('\', '/')
            if ($mapa[$k] -notcontains $rel) { $mapa[$k] += $rel }
        }
    }
    Write-Output "Claves distintas encontradas: $($mapa.Keys.Count)"
    Write-Output ''
    Write-Output "=== ¿Siguen vivas? (contra la API de Gemini) ==="
    "{0,-16} {1,-9} {2,-6} {3}" -f 'CLAVE', 'ESTADO', 'FICH.', 'DETALLE'
    foreach ($k in ($mapa.Keys | Sort-Object { -$mapa[$_].Count })) {
        $pref = $k.Substring(0, 12)
        $estado = '?'; $detalle = ''
        try {
            $null = Invoke-WebRequest -Uri "https://generativelanguage.googleapis.com/v1beta/models?key=$k" -TimeoutSec 20 -UseBasicParsing
            $estado = 'VIVA'
        } catch {
            $resp = $_.Exception.Response
            if ($resp) {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
                $cuerpo = $sr.ReadToEnd()
                $detalle = if ($cuerpo -match '"message"\s*:\s*"([^"]{0,70})') { $matches[1] } else { '' }
                if ($detalle -match 'not valid') { $estado = 'MUERTA' }
                elseif ($detalle -match 'reported as leaked') { $estado = 'FILTRADA' }
                elseif ($detalle -match 'IP address restriction|are blocked|has not been used') { $estado = 'VIVA*' }
                else { $estado = "HTTP $([int]$resp.StatusCode)" }
            } else { $estado = 'error'; $detalle = $_.Exception.Message }
        }
        "{0,-16} {1,-9} {2,-6} {3}" -f $pref, $estado, $mapa[$k].Count, $detalle
    }
    Write-Output ''
    Write-Output "  VIVA   = la clave funciona y hay que rotarla"
    Write-Output "  VIVA*  = funciona pero esta restringida (IP o API): menos urgente"
    Write-Output "  MUERTA = Google la rechaza; no hay nada que rotar, solo limpiar el codigo"
    Write-Output "  FILTRADA = Google ya la bloqueo por filtrada"
    Write-Output ''
    Write-Output "=== Detalle por clave ==="
    foreach ($k in ($mapa.Keys | Sort-Object { -$mapa[$_].Count })) {
        Write-Output ''
        Write-Output "--- $($k.Substring(0,12))... ($($mapa[$k].Count) ficheros) ---"
        $mapa[$k] | ForEach-Object { Write-Output "    $_" }
    }
    return
}

# ── Mapa viejo → nuevo ─────────────────────────────────────────────────────
$pares = @{}
if ($MapaJson -ne '') {
    if (-not (Test-Path -LiteralPath $MapaJson)) { throw "No existe $MapaJson" }
    $j = Get-Content -LiteralPath $MapaJson -Raw | ConvertFrom-Json
    foreach ($p in $j.PSObject.Properties) { $pares[$p.Name] = [string]$p.Value }
} else {
    if ($Vieja -notmatch '^AIza[0-9A-Za-z_\-]{35}$') { throw "La clave vieja no tiene forma de clave de Google." }
    if ($Nueva -notmatch '^AIza[0-9A-Za-z_\-]{35}$') { throw "La clave nueva no tiene forma de clave de Google." }
    if ($Vieja -eq $Nueva) { throw "La clave vieja y la nueva son la misma." }
    $pares[$Vieja] = $Nueva
}

Write-Output "Modo: $(if ($Aplicar) { 'APLICAR (escribe)' } else { 'SIMULACRO (no escribe nada)' })"
Write-Output "Pares: $($pares.Count)"
Write-Output ''

$utf8SinBom = New-Object System.Text.UTF8Encoding($false)
$cambiados = 0; $total = 0

foreach ($f in Get-Ficheros) {
    $texto = [System.IO.File]::ReadAllText($f.FullName)
    $nuevo = $texto
    $cuantos = 0
    foreach ($vieja in $pares.Keys) {
        $n = ([regex]::Matches($nuevo, [regex]::Escape($vieja))).Count
        if ($n -gt 0) { $cuantos += $n; $nuevo = $nuevo.Replace($vieja, $pares[$vieja]) }
    }
    if ($cuantos -eq 0) { continue }
    $total += $cuantos
    $rel = $f.FullName.Replace("$raiz\", '')
    Write-Output ("  {0,-4} {1}" -f $cuantos, $rel)
    if ($Aplicar) {
        [System.IO.File]::WriteAllText($f.FullName, $nuevo, $utf8SinBom)
        # Leer de vuelta: si quedara una vieja, mejor saberlo aquí.
        $releido = [System.IO.File]::ReadAllText($f.FullName)
        foreach ($vieja in $pares.Keys) {
            if ($releido.Contains($vieja)) { throw "Quedo la clave vieja en $rel" }
        }
        $cambiados++
    }
}

Write-Output ''
Write-Output ("Ficheros afectados: {0}   sustituciones: {1}" -f $cambiados, $total)
if (-not $Aplicar) {
    Write-Output ''
    Write-Output 'Esto ha sido un simulacro. Repite con -Aplicar para escribirlo.'
} else {
    Write-Output ''
    Write-Output 'Hecho. Ahora: revoca las claves viejas en Google Cloud y luego commit + push.'
}
