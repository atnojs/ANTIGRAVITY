# =====================================================================
#  1-inventario-papelera-E.ps1
#  Genera un CSV con TODO lo que hay dentro de la Papelera de reciclaje
#  de E: (indices $I), indicando si pertenece al usuario actual o viene
#  de una instalacion/maquina anterior. NO borra nada.
#  Ejecutar en PowerShell normal (no hace falta administrador).
# =====================================================================
[CmdletBinding()]
param(
    [string]$Volumen = 'E',
    [string]$Salida
)

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# $PSScriptRoot puede llegar vacio segun como se invoque el script
$base = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $base) { $base = (Get-Location).Path }
if (-not $Salida) { $Salida = Join-Path $base "inventario-papelera-$($Volumen).csv" }

$ErrorActionPreference = 'Continue'
$raiz = "$($Volumen):\`$Recycle.Bin"
$miSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$patronSid = '^S-1-5-21-(\d+)-(\d+)-(\d+)-(\d+)$'
$familias = @{}   # machineSID -> @{ Sufijos=@(); Bytes=0; Elementos=0 }

function Convert-FechaSegura([int64]$ft) {
    try {
        $d = [System.DateTime]::FromFileTime($ft)
        if ($d.Year -gt 1990 -and $d.Year -lt 2100) { return $d }
    } catch {}
    return $null
}

if (-not (Test-Path -LiteralPath $raiz)) { throw "No existe $raiz" }

$filas = New-Object System.Collections.Generic.List[object]

foreach ($dir in Get-ChildItem -LiteralPath $raiz -Force -Directory -ErrorAction SilentlyContinue) {
    $sid  = $dir.Name
    $esMio = ($sid -eq $miSid)
    $tipo = if ($esMio) { 'MIO (usuario actual)' } else { 'AJENO (instalacion/usuario anterior)' }

    if ($sid -match $patronSid) {
        $maq = $Matches[1] + '-' + $Matches[2] + '-' + $Matches[3]
        $suf = [int]$Matches[4]
        if (-not $familias.ContainsKey($maq)) { $familias[$maq] = @{ Sufijos = New-Object System.Collections.Generic.List[int]; Bytes = [int64]0; Elementos = 0 } }
        if (-not $familias[$maq].Sufijos.Contains($suf)) { $familias[$maq].Sufijos.Add($suf) }
    }

    foreach ($f in Get-ChildItem -LiteralPath $dir.FullName -Force -File -Filter '$I*' -ErrorAction SilentlyContinue) {
        try {
            $b = [System.IO.File]::ReadAllBytes($f.FullName)
            if ($b.Length -lt 24) { continue }

            $ver = [BitConverter]::ToInt64($b, 0)
            if ($ver -eq 2) {
                $tam = [BitConverter]::ToInt64($b, 8)
                $fec = Convert-FechaSegura ([BitConverter]::ToInt64($b, 16))
                $ruta = [System.Text.Encoding]::Unicode.GetString($b, 24, $b.Length - 25).Trim([char]0)
            } else {
                # formato antiguo (Windows XP/2003): tamano 8 bytes desde 0, fecha 8 bytes desde 16, ruta ANSI
                $tam = [BitConverter]::ToInt64($b, 0)
                $fec = Convert-FechaSegura ([BitConverter]::ToInt64($b, 8))
                $ruta = [System.Text.Encoding]::Default.GetString($b, 24, [Math]::Max(0, $b.Length - 25)).Trim([char]0)
            }

            # quita caracteres de relleno/control al inicio y final
            $rutaLimpia = ($ruta -replace '^[\x00-\x1f]+', '' -replace '[\x00-\x1f]+$', '').Trim()

            $filas.Add([pscustomobject]@{
                Volumen      = $Volumen
                SID          = $sid
                Propietario  = $tipo
                Eliminado    = if ($fec) { $fec.ToString('yyyy-MM-dd HH:mm') } else { '' }
                MB           = [Math]::Round($tam / 1MB, 3)
                RutaOriginal = $rutaLimpia
                ArchivoI     = $f.Name
            })

            if ($sid -match $patronSid) {
                $maq = $Matches[1] + '-' + $Matches[2] + '-' + $Matches[3]
                $familias[$maq].Bytes += $tam
                $familias[$maq].Elementos++
            }
        } catch {
            Write-Warning "No se pudo leer $($f.FullName): $($_.Exception.Message)"
        }
    }
}

$filas | Sort-Object Eliminado -Descending | Export-Csv -LiteralPath $Salida -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "=== FAMILIAS DE SID DETECTADAS EN $raiz ===" -ForegroundColor Cyan
foreach ($k in $familias.Keys) {
    $v = $familias[$k]
    $sufijos = ($v.Sufijos | Sort-Object) -join ', '
    Write-Host ("  SID maquina {0}  -> usuarios: {1}   elementos: {2}   tamaño: {3} GB" -f `
        $k, $sufijos, $v.Elementos, [Math]::Round($v.Bytes / 1GB, 2))
}
Write-Host ""
Write-Host "  SID del usuario actual: $miSid"
Write-Host ""
Write-Host "Inventario guardado en: $Salida" -ForegroundColor Green
Write-Host ("Total de elementos inventariados: {0}" -f $filas.Count)
Write-Host ""
Write-Host "Si ves mas de un 'usuario' dentro del MISMO SID maquina, ese SID se reutilizo" -ForegroundColor Yellow
Write-Host "y las carpetas de los sufijos antiguos quedan huerfanas (causa del aviso de corrupcion)." -ForegroundColor Yellow
