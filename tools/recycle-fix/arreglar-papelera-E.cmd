@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Reparar Papelera de reciclaje de E:

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Este arreglo necesita permisos de administrador.
  echo  Se abrira otra ventana pidiendote confirmacion ^(UAC^). Acepta.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp01-inventario-papelera-E.ps1"
echo.
echo ==========================================================
echo  Inventario hecho. Ahora se repara la papelera.
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp02-reparar-papelera-E.ps1"

endlocal
