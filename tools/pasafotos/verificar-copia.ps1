# Compara dos árboles de carpetas (origen y copia) por contenido SHA-256 y estructura.
# Soporta rutas largas (>260) y rutas de red UNC. No escribe nada.
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File verificar-copia.ps1 -Origen "C:\fotos" -Destino "\\192.168.18.10\D\Media\Fotos\_prueba"
#   ... -Json "E:\ruta\informe.json"     guarda el resultado en JSON
#   ... -Rapido                          compara tamaño + fecha en vez de hash (para lotes enormes)
# Códigos: 0 idéntico · 1 diferencias · 2 error de uso/rutas.
param(
    [Parameter(Mandatory = $true)][string]$Origen,
    [Parameter(Mandatory = $true)][string]$Destino,
    [string]$Json = '',
    [switch]$Rapido
)
$ErrorActionPreference = 'Stop'

function RutaLarga([string]$ruta) {
    if ($ruta.StartsWith('\\?\')) { return $ruta }
    if ($ruta.StartsWith('\\')) { return '\\?\UNC\' + $ruta.Substring(2) }
    return '\\?\' + $ruta
}

function Listar-Arbol([string]$raiz) {
    $resultado = New-Object System.Collections.ArrayList
    $pila = New-Object System.Collections.Stack
    $pila.Push('')
    while ($pila.Count -gt 0) {
        $relDir = $pila.Pop()
        $abs = $raiz
        if ($relDir.Length -gt 0) { $abs = Join-Path $raiz $relDir }
        $entradas = $null
        try { $entradas = [System.IO.Directory]::GetFileSystemEntries((RutaLarga $abs)) }
        catch { throw "No se pudo leer $abs : $($_.Exception.Message)" }
        foreach ($entrada in $entradas) {
            $limpia = $entrada
            if ($limpia.StartsWith('\\?\UNC\')) { $limpia = '\\' + $limpia.Substring(8) }
            elseif ($limpia.StartsWith('\\?\')) { $limpia = $limpia.Substring(4) }
            $nombre = [System.IO.Path]::GetFileName($limpia)
            $hijoRel = $nombre
            if ($relDir.Length -gt 0) { $hijoRel = Join-Path $relDir $nombre }
            $atributos = [System.IO.File]::GetAttributes((RutaLarga $limpia))
            if (($atributos -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
            if (($atributos -band [System.IO.FileAttributes]::Directory) -ne 0) {
                [void]$resultado.Add([pscustomobject]@{ Tipo = 'dir'; Rel = $hijoRel })
                $pila.Push($hijoRel)
            }
            else {
                $fi = New-Object System.IO.FileInfo((RutaLarga $limpia))
                [void]$resultado.Add([pscustomobject]@{ Tipo = 'file'; Rel = $hijoRel; Abs = $limpia; Tam = $fi.Length; Fecha = $fi.LastWriteTimeUtc })
            }
        }
    }
    return $resultado
}

function Hash-Fichero([string]$ruta) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $fs = $null
    try {
        $fs = [System.IO.File]::OpenRead((RutaLarga $ruta))
        $bytes = $sha.ComputeHash([System.IO.Stream]$fs)
        return ([System.BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    }
    finally {
        if ($fs -ne $null) { $fs.Dispose() }
        $sha.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $Origen)) { Write-Error "No existe el origen: $Origen"; exit 2 }
if (-not (Test-Path -LiteralPath $Destino)) { Write-Error "No existe el destino: $Destino"; exit 2 }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$arbolOrigen = Listar-Arbol $Origen
$arbolDestino = Listar-Arbol $Destino
$ficherosOrigen = @($arbolOrigen | Where-Object { $_.Tipo -eq 'file' })
$ficherosDestino = @($arbolDestino | Where-Object { $_.Tipo -eq 'file' })
$dirsOrigen = @($arbolOrigen | Where-Object { $_.Tipo -eq 'dir' })
$dirsDestino = @($arbolDestino | Where-Object { $_.Tipo -eq 'dir' })

$mapaDestino = @{}
foreach ($d in $ficherosDestino) { $mapaDestino[$d.Rel.ToLowerInvariant()] = $d }

$faltan = New-Object System.Collections.ArrayList
$sobran = New-Object System.Collections.ArrayList
$distintos = New-Object System.Collections.ArrayList
$iguales = 0

foreach ($o in $ficherosOrigen) {
    $clave = $o.Rel.ToLowerInvariant()
    $d = $mapaDestino[$clave]
    if ($d -eq $null) { [void]$faltan.Add($o.Rel); continue }
    $ok = $false
    if ($Rapido) {
        $ok = ($d.Tam -eq $o.Tam) -and ([Math]::Abs(($d.Fecha - $o.Fecha).TotalSeconds) -le 3)
    }
    else {
        $ok = ($d.Tam -eq $o.Tam) -and ((Hash-Fichero $o.Abs) -eq (Hash-Fichero $d.Abs))
    }
    if ($ok) { $iguales++ } else { [void]$distintos.Add($o.Rel) }
}
$mapaOrigen = @{}
foreach ($o in $ficherosOrigen) { $mapaOrigen[$o.Rel.ToLowerInvariant()] = $true }
foreach ($d in $ficherosDestino) { if (-not $mapaOrigen.ContainsKey($d.Rel.ToLowerInvariant())) { [void]$sobran.Add($d.Rel) } }

$totalBytes = ($ficherosOrigen | Measure-Object -Property Tam -Sum).Sum
$sw.Stop()
$correcto = ($faltan.Count -eq 0 -and $distintos.Count -eq 0)

$resumen = [pscustomobject]@{
    origen            = $Origen
    destino           = $Destino
    modo              = $(if ($Rapido) { 'tamano+fecha' } else { 'sha256' })
    segundos          = [Math]::Round($sw.Elapsed.TotalSeconds, 2)
    ficheros_origen   = $ficherosOrigen.Count
    ficheros_destino  = $ficherosDestino.Count
    bytes_origen      = $totalBytes
    identicos         = $iguales
    faltan            = $faltan.Count
    distintos         = $distintos.Count
    sobran            = $sobran.Count
    carpetas_origen   = $dirsOrigen.Count
    carpetas_destino  = $dirsDestino.Count
    correcto          = $correcto
    detalle_faltan    = @($faltan)
    detalle_distintos = @($distintos)
    detalle_sobran    = @($sobran)
}

Write-Host ''
Write-Host ('VERIFICACION ' + $(if ($Rapido) { 'tamano+fecha' } else { 'SHA-256' })) -ForegroundColor Cyan
Write-Host ("  Origen : {0}" -f $Origen)
Write-Host ("  Destino: {0}" -f $Destino)
Write-Host ("  Ficheros origen={0} destino={1} | identicos={2} faltan={3} distintos={4} sobran={5} | {6:N2} s" -f `
        $ficherosOrigen.Count, $ficherosDestino.Count, $iguales, $faltan.Count, $distintos.Count, $sobran.Count, $sw.Elapsed.TotalSeconds)
Write-Host ("  Carpetas origen={0} destino={1}" -f $dirsOrigen.Count, $dirsDestino.Count)
if ($faltan.Count -gt 0) { Write-Host '  FALTAN:' -ForegroundColor Red; $faltan | Select-Object -First 20 | ForEach-Object { Write-Host "    - $_" } }
if ($distintos.Count -gt 0) { Write-Host '  DISTINTOS:' -ForegroundColor Red; $distintos | Select-Object -First 20 | ForEach-Object { Write-Host "    - $_" } }
if ($sobran.Count -gt 0) { Write-Host '  SOBRAN EN EL DESTINO:' -ForegroundColor Yellow; $sobran | Select-Object -First 20 | ForEach-Object { Write-Host "    - $_" } }
if ($correcto) { Write-Host '  RESULTADO: IDENTICO' -ForegroundColor Green } else { Write-Host '  RESULTADO: DIFERENCIAS' -ForegroundColor Red }

if ($Json.Length -gt 0) {
    $carpeta = Split-Path -Parent ([System.IO.Path]::GetFullPath($Json))
    if ($carpeta -and -not (Test-Path -LiteralPath $carpeta)) { New-Item -ItemType Directory -Force $carpeta | Out-Null }
    $resumen | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Json -Encoding UTF8
    Write-Host ("  JSON: {0}" -f $Json)
}

if ($correcto) { exit 0 } else { exit 1 }
