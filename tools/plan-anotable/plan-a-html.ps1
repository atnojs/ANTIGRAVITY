<#
.SYNOPSIS
    Convierte un plan en markdown en la pagina anotable ya rellena (plan.html).

.DESCRIPTION
    Toma un plan escrito en markdown y genera la pagina de revision a partir de la
    plantilla canonica, sustituyendo su bloque <script id="datos"> por el JSON real.
    Nadie escribe JSON a mano: lo genera ConvertTo-Json y se valida releyendolo.

    Mapeo del markdown:
      # Titulo                      -> titulo del plan (si no empieza por "Plan", se prefija)
      parrafos antes del primer ##   -> contexto
      ## Seccion                    -> una seccion revisable (su cuerpo conserva markdown minimo)
      ## Riesgos                    -> lista de riesgos (vinetas - o *)
      ## Preguntas | Decisiones...  -> decisiones que dependen del usuario

    La seccion "Riesgos" y la de preguntas NO son revisables: son contexto. Todo lo
    demas ## es una decision, y por tanto aparece con sus botones.

.PARAMETER Plan
    Ruta del plan en markdown.

.PARAMETER Fecha
    Fecha del plan, formato AAAA-MM-DD. Por defecto, hoy.

.PARAMETER Salida
    Ruta del plan.html. Por defecto tools\evidencias\<AAAA-MM-DD>-plan-<slug>\plan.html.

.PARAMETER Plantilla
    Plantilla a usar. Por defecto la canonica del repo.

.PARAMETER Repo
    Raiz del repo ANTIGRAVITY. Por defecto el share.

.PARAMETER Abrir
    Abre la pagina generada al terminar.

.PARAMETER WhatIf
    Ensenya el plan de ejecucion sin escribir nada.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\plan-anotable\plan-a-html.ps1 .\plan.md -Abrir

.EXAMPLE
    ... plan-a-html.ps1 .\plan.md -Fecha 2026-11-24 -Salida C:\tmp\plan.html -WhatIf

.NOTES
    PowerShell 5.1. Sin `??` ni operador ternario.
    Exit 0 = HTML escrito y el JSON releido cuadra. Exit 1 = error o desajuste.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Plan,
    [string]$Fecha = (Get-Date -Format 'yyyy-MM-dd'),
    [string]$Salida,
    [string]$Plantilla,
    [string]$Repo = '\\Principal\e\ANTIGRAVITY',
    [switch]$Abrir,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$dryRun = [bool]$WhatIf

function Convert-Slug {
    param([string]$Texto)
    $s = $Texto.ToLowerInvariant()
    $mapa = @{ 'á' = 'a'; 'é' = 'e'; 'í' = 'i'; 'ó' = 'o'; 'ú' = 'u'; 'ü' = 'u'; 'ñ' = 'n'; 'ç' = 'c'; 'à' = 'a'; 'è' = 'e' }
    foreach ($k in $mapa.Keys) { $s = $s.Replace($k, $mapa[$k]) }
    $s = [regex]::Replace($s, '[^a-z0-9]+', '-').Trim('-')
    if ($s.Length -gt 40) { $s = $s.Substring(0, 40).Trim('-') }
    if ([string]::IsNullOrWhiteSpace($s)) { return 'plan' }
    return $s
}

function Get-Vinetas {
    param($Lineas, [string]$Titulo)
    $items = @()
    foreach ($l in $Lineas) {
        if ($l -match '^\s*[-*]\s+(.+?)\s*$') { $items += $Matches[1] }
    }
    if ($items.Count -eq 0) {
        foreach ($l in $Lineas) {
            if (-not [string]::IsNullOrWhiteSpace($l)) { $items += $l.Trim() }
        }
    }
    return $items
}

Write-Output '=== plan-a-html : plan markdown -> pagina anotable rellena ==='

if (-not (Test-Path -LiteralPath $Plan)) {
    Write-Output ("ERROR: no existe el plan: {0}" -f $Plan)
    exit 1
}
if (-not $Plantilla) { $Plantilla = Join-Path $Repo 'skills\recursos\plan-anotable\plantilla.html' }
if (-not (Test-Path -LiteralPath $Plantilla)) {
    Write-Output ("ERROR: no existe la plantilla: {0}" -f $Plantilla)
    exit 1
}
if ($Fecha -notmatch '^\d{4}-\d{2}-\d{2}$') {
    Write-Output ("ERROR: la fecha debe ser AAAA-MM-DD, no '{0}'" -f $Fecha)
    exit 1
}

# ---------- 1. leer y trocear el markdown ----------
$lineas = @(Get-Content -LiteralPath $Plan -Encoding UTF8)
if ($lineas.Count -eq 0) {
    Write-Output 'ERROR: el plan esta vacio.'
    exit 1
}

$titulo = $null
$inicio = 0
for ($i = 0; $i -lt $lineas.Count; $i++) {
    if ($lineas[$i] -match '^#\s+(.+?)\s*$') { $titulo = $Matches[1]; $inicio = $i + 1; break }
}
if (-not $titulo) { $titulo = [System.IO.Path]::GetFileNameWithoutExtension($Plan) }
if ($titulo -notmatch '^(?i)plan\b') { $titulo = 'Plan: ' + $titulo }

$contexto = New-Object System.Collections.ArrayList
$secciones = New-Object System.Collections.ArrayList
$riesgosLineas = New-Object System.Collections.ArrayList
$preguntasLineas = New-Object System.Collections.ArrayList
$modo = 'contexto'
$actual = $null

for ($j = $inicio; $j -lt $lineas.Count; $j++) {
    $l = $lineas[$j]
    if ($l -match '^##\s+(.+?)\s*$') {
        $t = $Matches[1]
        $norm = $t.ToLowerInvariant().Trim()
        if ($norm -match '^riesgos?$') { $modo = 'riesgos'; $actual = $null }
        elseif ($norm -match '^(preguntas|decisiones|decisiones que dependen de ti|preguntas abiertas)$') { $modo = 'preguntas'; $actual = $null }
        else {
            $modo = 'seccion'
            $actual = @{ titulo = $t; lineas = (New-Object System.Collections.ArrayList) }
            [void]$secciones.Add($actual)
        }
        continue
    }
    switch ($modo) {
        'contexto'  { if (-not [string]::IsNullOrWhiteSpace($l)) { [void]$contexto.Add($l.Trim()) } }
        'seccion'   { if ($null -ne $actual) { [void]$actual.lineas.Add($l) } }
        'riesgos'   { [void]$riesgosLineas.Add($l) }
        'preguntas' { [void]$preguntasLineas.Add($l) }
    }
}

if ($secciones.Count -eq 0) {
    Write-Output 'ERROR: el plan no tiene ninguna seccion "## ". Sin secciones no hay nada que aprobar.'
    Write-Output '       Escribe cada decision como "## Titulo de la decision".'
    exit 1
}

$textoContexto = (($contexto -join ' ') -replace '\s+', ' ').Trim()
if ($textoContexto.Length -gt 400) { $textoContexto = $textoContexto.Substring(0, 397) + '...' }

$listaSecciones = @()
foreach ($s in $secciones) {
    $cuerpo = (($s.lineas -join "`n").Trim())
    $listaSecciones += [ordered]@{ titulo = $s.titulo; texto = $cuerpo }
}
$listaRiesgos = @(Get-Vinetas -Lineas $riesgosLineas -Titulo 'Riesgos')
$listaPreguntas = @(Get-Vinetas -Lineas $preguntasLineas -Titulo 'Preguntas')

# ---------- 2. JSON (generado, nunca escrito a mano) ----------
$datos = [ordered]@{
    titulo    = $titulo
    fecha     = $Fecha
    contexto  = $textoContexto
    secciones = $listaSecciones
    riesgos   = $listaRiesgos
    preguntas = $listaPreguntas
}
$json = $datos | ConvertTo-Json -Depth 8
# "</" rompe el <script> del HTML: se escapa como "<\/" (JSON valido, mismo contenido).
$json = $json -replace '</', '<\/'

# ---------- 3. montar el HTML sobre la plantilla ----------
$html = Get-Content -LiteralPath $Plantilla -Raw -Encoding UTF8
$patron = '(?s)<script type="application/json" id="datos">.*?</script>'
if ($html -notmatch $patron) {
    Write-Output ("ERROR: la plantilla no tiene el bloque <script id=""datos"">: {0}" -f $Plantilla)
    exit 1
}
$bloque = '<script type="application/json" id="datos">' + "`n" + $json + "`n" + '</script>'
$evaluador = [System.Text.RegularExpressions.MatchEvaluator] { param($m) $bloque }
$html = [regex]::Replace($html, $patron, $evaluador, 1)

if (-not $Salida) {
    $slug = Convert-Slug ((($listaSecciones[0].titulo) + ' ' + $titulo))
    $Salida = Join-Path $Repo ('tools\evidencias\' + $Fecha + '-plan-' + $slug + '\plan.html')
}

Write-Output ("Plan    : {0}" -f $Plan)
Write-Output ("Titulo  : {0}" -f $titulo)
Write-Output ("Fecha   : {0}" -f $Fecha)
Write-Output ("Secciones revisables : {0}" -f $listaSecciones.Count)
Write-Output ("Riesgos : {0}   Preguntas : {1}" -f $listaRiesgos.Count, $listaPreguntas.Count)
Write-Output ("Salida  : {0}" -f $Salida)

if ($dryRun) {
    Write-Output ''
    Write-Output 'MODO -WhatIf: no se ha escrito nada. Se revisarian estas secciones:'
    for ($k = 0; $k -lt $listaSecciones.Count; $k++) {
        Write-Output ("  {0}. {1}" -f ($k + 1), $listaSecciones[$k].titulo)
    }
    exit 0
}

$carpeta = Split-Path -Parent $Salida
if ($carpeta -and -not (Test-Path -LiteralPath $carpeta)) {
    New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
}
Set-Content -LiteralPath $Salida -Value $html -Encoding UTF8

# ---------- 4. verificar releyendo lo escrito ----------
$problemas = @()
$escrito = Get-Content -LiteralPath $Salida -Raw -Encoding UTF8
if ($escrito -notmatch $patron) {
    $problemas += 'el HTML escrito no tiene bloque de datos'
} else {
    $bloqueEscrito = [regex]::Match($escrito, $patron).Value
    $crudo = [regex]::Replace($bloqueEscrito, '(?s)^.*?<script[^>]*>', '')
    $crudo = [regex]::Replace($crudo, '(?s)</script>.*$', '').Trim()
    try {
        $releido = $crudo | ConvertFrom-Json
    } catch {
        $problemas += ('el JSON escrito no se puede leer: {0}' -f $_.Exception.Message)
        $releido = $null
    }
    if ($null -ne $releido) {
        if (@($releido.secciones).Count -ne $listaSecciones.Count) {
            $problemas += ('secciones escritas={0} origen={1}' -f @($releido.secciones).Count, $listaSecciones.Count)
        }
        if ([string]$releido.titulo -ne $titulo) { $problemas += 'el titulo no coincide' }
        if ([string]$releido.fecha -ne $Fecha) { $problemas += 'la fecha no coincide' }
        $vacias = @(@($releido.secciones) | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.texto) })
        if ($vacias.Count -gt 0) { Write-Output ("AVISO: {0} seccion(es) sin texto." -f $vacias.Count) }
    }
}

Write-Output ''
if ($problemas.Count -gt 0) {
    Write-Output 'RESULTADO: NO CUADRA. Problemas:'
    foreach ($p in $problemas) { Write-Output ("  - {0}" -f $p) }
    exit 1
}

Write-Output 'RESULTADO: OK. HTML escrito y JSON releido sin desajustes.'
Write-Output ("Tamanyo: {0} bytes" -f (Get-Item -LiteralPath $Salida).Length)

if ($Abrir) {
    Invoke-Item $Salida
    Write-Output 'Abierta en el navegador.'
} else {
    Write-Output ("Siguiente: Invoke-Item `"{0}`"" -f $Salida)
}
exit 0
