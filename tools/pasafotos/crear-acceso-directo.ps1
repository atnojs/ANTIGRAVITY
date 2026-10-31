# Crea (o repara) el acceso directo de PASAFOTOS en el Escritorio real del usuario.
# El Escritorio de este equipo está redirigido a D:\Escritorio; se resuelve con .NET.
$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot 'PasaFotos.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw "No se encuentra $exe. Ejecuta antes build.ps1." }

$escritorio = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path -LiteralPath $escritorio)) { throw "No se encuentra el Escritorio: $escritorio" }
$lnk = Join-Path $escritorio 'PASAFOTOS.lnk'

$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($lnk)
$acceso.TargetPath = $exe
$acceso.WorkingDirectory = $PSScriptRoot
$acceso.IconLocation = $exe + ',0'
$acceso.Description = 'Copiar carpetas de fotos al servidor de ANTONIO'
$acceso.WindowStyle = 1
$acceso.Save()

Write-Host ('Acceso directo creado: ' + $lnk) -ForegroundColor Green
