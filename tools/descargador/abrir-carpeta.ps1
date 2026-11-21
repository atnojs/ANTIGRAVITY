# Abre el Explorador en la carpeta de descargas (con el fichero seleccionado, si
# se indica) y TRAE LA VENTANA AL FRENTE.
#
# Por qué existe este script: abrir `explorer.exe /select,...` desde el worker
# (un proceso en segundo plano) dejaba la ventana DETRÁS del navegador, así que
# Antonio pulsaba «Carpeta» y parecía que no hacía nada. `SwitchToThisWindow`
# sí la trae al frente.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File abrir-carpeta.ps1 `
#     -Carpeta "D:\Descargas Y, I y T" [-Fichero "D:\...\video.mp4"]
#
# Sale con 0 si la ventana se ha abierto (se traiga al frente o no).

param(
  [Parameter(Mandatory = $true)][string]$Carpeta,
  [string]$Fichero = ''
)

$ErrorActionPreference = 'SilentlyContinue'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class VentanaExplorador {
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool alt);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@

if (-not (Test-Path -LiteralPath $Carpeta)) {
  Write-Output 'NO_EXISTE'
  exit 2
}

# 1) Abrir el Explorador (seleccionando el fichero si se conoce).
if ($Fichero -ne '' -and (Test-Path -LiteralPath $Fichero)) {
  Start-Process explorer.exe -ArgumentList ('/select,"' + $Fichero + '"')
} else {
  Start-Process explorer.exe -ArgumentList ('"' + $Carpeta + '"')
}

# 2) Buscar SU ventana (puede tardar un poco en aparecer).
$rutaCarpeta = $Carpeta.Replace('/', '\').TrimEnd('\')
$objetivo = $null
$shell = New-Object -ComObject Shell.Application
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Milliseconds 300
  foreach ($ventana in @($shell.Windows())) {
    $url = [string]$ventana.LocationURL
    if ($url -eq '') { continue }
    $ruta = ([uri]::UnescapeDataString($url)).Replace('file:///', '').Replace('/', '\').TrimEnd('\')
    if ($ruta -ieq $rutaCarpeta) {
      $objetivo = $ventana
      break
    }
  }
  if ($objetivo) { break }
}

if (-not $objetivo) {
  Write-Output 'SIN_VENTANA'
  exit 0
}

# 3) Traerla al frente (restaurar si estaba minimizada).
$h = [IntPtr]$objetivo.HWND
if ([VentanaExplorador]::IsIconic($h)) {
  [void][VentanaExplorador]::ShowWindow($h, 9)
}
[VentanaExplorador]::SwitchToThisWindow($h, $true)
Write-Output 'OK'
exit 0
