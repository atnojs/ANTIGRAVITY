# Script para crear un respaldo comprimido de la configuración de Antigravity
$date = Get-Date -Format "yyyy-MM-dd"
$backupPath = "e:\ANTIGRAVITY_BACKUP_$date"

if (!(Test-Path $backupPath)) {
    New-Item -ItemType Directory -Force -Path $backupPath
}

Write-Host "--- INICIANDO RESPALDO ANTIGRAVITY ---" -ForegroundColor Cyan

# 1. Respaldar carpeta .agent (Skills y Reglas)
if (Test-Path "e:\ANTIGRAVITY\.agent") {
    Write-Host "Respaldando Skills y Reglas..." -ForegroundColor Yellow
    Copy-Item -Path "e:\ANTIGRAVITY\.agent" -Destination $backupPath -Recurse -Force
}

# 2. Respaldar Scripts de utilidad
Write-Host "Respaldando Scripts de sistema..." -ForegroundColor Yellow
Get-ChildItem -Path "e:\ANTIGRAVITY\*.ps1" | Copy-Item -Destination $backupPath -Force

# 3. Guardar un resumen de la sesión actual (Brain)
# (Opcional, pero útil para que yo sepa por dónde íbamos)

Write-Host "---------------------------------------" -ForegroundColor Green
Write-Host "¡RESPALDO COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "Carpeta: $backupPath" -ForegroundColor Green
Write-Host "CONSEJO: Sube esta carpeta a la nube (Google Drive/OneDrive)." -ForegroundColor White
