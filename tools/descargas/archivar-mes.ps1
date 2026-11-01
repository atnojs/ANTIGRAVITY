param(
    [string]$Ruta = 'D:\Descargas',
    [switch]$Simular,
    [string]$Mes,               # 'YYYY-MM' opcional: archiva solo ese mes
    [switch]$IncluirMesActual
)
# Archiva los archivos sueltos de Descargas en la carpeta de SU mes: YYYY-MM_Mes
#  - El mes en curso se queda suelto (no se archiva hasta que acabe).
#  - No toca carpetas. Nunca sobrescribe (si el nombre existe, usa sufijo (2), (3)...).
#  - -Simular: no mueve nada, solo dice qué haría.
$ErrorActionPreference = 'Stop'
$meses = @('Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre')
$inicio = Get-Date
$logPath = Join-Path $Ruta '_archivo-descargas.log'

if (-not (Test-Path -LiteralPath $Ruta)) { Write-Host "No existe la carpeta: $Ruta" -ForegroundColor Red; exit 1 }
$mesActual = (Get-Date).ToString('yyyy-MM')
$files = @(Get-ChildItem -LiteralPath $Ruta -Force | Where-Object { -not $_.PSIsContainer })

$movidos = 0; $seQuedan = 0; $errores = 0; $porMes = @{}
$lineas = @()

foreach ($f in $files) {
    $ym = $f.LastWriteTime.ToString('yyyy-MM')
    if ($Mes -and $ym -ne $Mes) { $seQuedan++; continue }
    if (-not $IncluirMesActual -and $ym -eq $mesActual) { $seQuedan++; continue }

    $idx = [int]$ym.Substring(5, 2) - 1
    $carpeta = if ($idx -ge 0 -and $idx -le 11) { "${ym}_$($meses[$idx])" } else { "${ym}_Mes" }
    $dest = Join-Path $Ruta $carpeta
    $target = Join-Path $dest $f.Name
    $final = $f.Name

    try {
        if (Test-Path -LiteralPath $target) {
            $base = [IO.Path]::GetFileNameWithoutExtension($f.Name)
            $ext = [IO.Path]::GetExtension($f.Name)
            $i = 2
            do { $final = "$base ($i)$ext"; $i++ } while (Test-Path -LiteralPath (Join-Path $dest $final))
            $target = Join-Path $dest $final
        }
        if (-not $Simular) {
            if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
            $h1 = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
            Move-Item -LiteralPath $f.FullName -Destination $target
            $h2 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
            if ($h1 -ne $h2) { throw "hash distinto tras mover" }
        }
        $movidos++
        if (-not $porMes.ContainsKey($carpeta)) { $porMes[$carpeta] = 0 }
        $porMes[$carpeta]++
        $lineas += ("{0}  {1} -> {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $f.Name, $carpeta)
    } catch {
        $errores++
        Write-Host ("ERROR con {0}: {1}" -f $f.Name, $_.Exception.Message) -ForegroundColor Red
        $lineas += ("{0}  ERROR {1}: {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $f.Name, $_.Exception.Message)
    }
}

if (-not $Simular -and $lineas.Count -gt 0) {
    Add-Content -LiteralPath $logPath -Value ($lineas -join "`r`n") -Encoding UTF8
}

$dur = [math]::Round(((Get-Date) - $inicio).TotalSeconds, 2)
Write-Host ""
Write-Host ("Revisados: {0}  |  Movidos: {1}  |  Se quedan sueltos (mes en curso): {2}  |  Errores: {3}  |  {4} s" -f $files.Count, $movidos, $seQuedan, $errores, $dur) -ForegroundColor Cyan
if ($porMes.Count -gt 0) {
    Write-Host "Destinos:" -ForegroundColor Cyan
    $porMes.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Name, $_.Value) }
}
if ($Simular) { Write-Host "(Simulacion: no se ha movido nada)" -ForegroundColor Yellow }
if ($errores -gt 0) { exit 2 }
