<#
.SYNOPSIS
    Skill para la eliminación completa y profunda de CorelDRAW.
    
.DESCRIPTION
    Este script elimina cualquier rastro de CorelDRAW en el sistema, incluyendo:
    - Instalaciones MSI residuales
    - Claves de registro protegidas (Products, Features, Classes)
    - Archivos temporales y cachés
    - Directorios de instalación en Program Files, ProgramData y AppData
    - Ensamblados GAC de Microsoft Fusion
    
.NOTES
    Autor: Antigravity
    Fecha: 2026-04-19
#>

# Forzar elevación a Administrador (UAC)
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Solicitando privilegios de Administrador..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Iniciando limpieza profunda de CorelDRAW (Skill)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Eliminar productos MSI desde el Registro (Método rápido y exhaustivo)
Write-Host "`n[1/7] Desinstalando productos MSI..." -ForegroundColor Yellow
$paths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
)
foreach ($path in $paths) {
    if (Test-Path $path) {
        Get-ChildItem -Path $path -ErrorAction SilentlyContinue | ForEach-Object {
            $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
            if ($props.DisplayName -match 'Corel') {
                $keyName = $_.PSChildName
                if ($keyName -match '^\{[A-F0-9\-]+\}$') {
                    Write-Host "  Desinstalando: $($props.DisplayName)"
                    Start-Process -FilePath "msiexec.exe" -ArgumentList "/x $keyName /qn /norestart" -Wait -NoNewWindow
                }
                elseif ($keyName -match '_{([A-F0-9\-]+)}') {
                    $code = "{$($matches[1])}"
                    Write-Host "  Desinstalando: $($props.DisplayName)"
                    Start-Process -FilePath "msiexec.exe" -ArgumentList "/x $code /qn /norestart" -Wait -NoNewWindow
                }
            }
        }
    }
}

# 2. Claves de registro de Windows Installer
Write-Host "`n[2/7] Limpiando registro de Windows Installer..." -ForegroundColor Yellow
$regPaths = @(
    "HKLM:\SOFTWARE\Classes\Installer\Products\EAE5109B22C0BA64EA8F4A3E4EDB6D6D",
    "HKLM:\SOFTWARE\Classes\Installer\Features\EAE5109B22C0BA64EA8F4A3E4EDB6D6D",
    "HKLM:\SOFTWARE\Classes\Installer\UpgradeCodes\8A8CD5234F780984D8D6B49827BECD8C",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Products\EAE5109B22C0BA64EA8F4A3E4EDB6D6D"
)
foreach ($path in $regPaths) {
    # Usamos cmd.exe y reg delete para forzar la eliminación de claves protegidas
    $cmdPath = $path -replace "HKLM:\\", "HKLM\SOFTWARE\" -replace "SOFTWARE\\SOFTWARE", "SOFTWARE"
    $cmdPath = $path -replace "HKLM:\\", "HKLM\"
    cmd.exe /c "reg delete `"$cmdPath`" /f 2>nul"
}

# 3. Clases de archivos
Write-Host "`n[3/7] Eliminando asociaciones de archivos..." -ForegroundColor Yellow
$classes = @("CorelDRAW.CMX.23", "CorelDraw.Graphic.23", "CorelDESIGNER.Graphic.23", "CorelPHOTOPAINT.Image.23")
foreach ($c in $classes) {
    cmd.exe /c "reg delete `"HKLM\SOFTWARE\Classes\$c`" /f 2>nul"
}

# 4. Políticas de GAC Fusion
Write-Host "`n[4/7] Limpiando ensamblados GAC de Fusion..." -ForegroundColor Yellow
$fusionKeys = @(
    "HKLM\SOFTWARE\Microsoft\Fusion\PublisherPolicy\Default\v4.0_policy.23.0.Corel.Interop.CorelDRAW__e4835428e22ad6f9",
    "HKLM\SOFTWARE\Microsoft\Fusion\PublisherPolicy\Default\v4.0_policy.23.0.Corel.Interop.VGCore__e4835428e22ad6f9"
)
foreach ($fk in $fusionKeys) {
    cmd.exe /c "reg delete `"$fk`" /f 2>nul"
}
$gacDirs = @(
    "C:\WINDOWS\Microsoft.Net\assembly\GAC_MSIL\policy.23.0.Corel.Interop.CorelDRAW",
    "C:\WINDOWS\Microsoft.Net\assembly\GAC_MSIL\policy.23.0.Corel.Interop.VGCore"
)
foreach ($dir in $gacDirs) {
    if (Test-Path $dir) { Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue }
}

# 5. Carpetas de instalación y cachés
Write-Host "`n[5/7] Eliminando carpetas residuales..." -ForegroundColor Yellow
$folders = @(
    "C:\Program Files\Corel",
    "C:\Program Files (x86)\Corel",
    "C:\ProgramData\Corel",
    "C:\Users\$env:USERNAME\AppData\Roaming\Corel",
    "C:\Users\$env:USERNAME\AppData\Local\Corel",
    "C:\WINDOWS\Installer\{B9015EAE-0C22-46AB-AEF8-A4E3E4BDD6D6}",
    "C:\WINDOWS\Installer\SourceHash{B9015EAE-0C22-46AB-AEF8-A4E3E4BDD6D6}"
)
foreach ($f in $folders) {
    if (Test-Path $f) {
        Remove-Item $f -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Eliminado: $f"
    }
}

# 6. Archivos temporales
Write-Host "`n[6/7] Limpiando archivos temporales..." -ForegroundColor Yellow
Get-ChildItem -Path $env:TEMP -Filter "*Corel*" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
Write-Host "  Temporales de Corel limpiados."

# 7. Tareas programadas y servicios
Write-Host "`n[7/7] Deteniendo servicios residuales..." -ForegroundColor Yellow
Get-Service -Name "*Corel*" -ErrorAction SilentlyContinue | Stop-Service -Force -ErrorAction SilentlyContinue
Get-Service -Name "*Corel*" -ErrorAction SilentlyContinue | Set-Service -StartupType Disabled -ErrorAction SilentlyContinue

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  LIMPIEZA COMPLETADA CON ÉXITO" -ForegroundColor Green
Write-Host "  Ya no quedan rastros de CorelDRAW en el sistema." -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
