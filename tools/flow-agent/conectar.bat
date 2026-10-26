@echo off
rem Arranca el agente de Flow con la ventana visible para poder leer cualquier error.
rem Pensado para doble clic en el PC donde esta la carpeta E:\ANTIGRAVITY.
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Agente de Flow - Unified Image Studio

rem Si el lock es de un agente que ya no existe (PID reciclado), se libera.
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*flow_agent.py*' }; if (-not $p -and (Test-Path 'flow_agent.lock')) { Remove-Item 'flow_agent.lock' -Force; Write-Host 'Lock huerfano eliminado.' }" >nul 2>&1

if not exist ".venv\Scripts\python.exe" (
  echo ERROR: falta el entorno .venv del agente en esta carpeta.
  pause
  exit /b 1
)
if not exist "agente.json" (
  echo ERROR: falta agente.json con la credencial.
  pause
  exit /b 1
)

echo ============================================================
echo  1. Comprobando credencial, cola y sesion de Google Flow
echo ============================================================
".venv\Scripts\python.exe" flow_agent.py --status
echo.

echo ============================================================
echo  2. Arrancando el agente (12 horas)
echo     Deja esta ventana abierta; no la cierres.
echo     La app pasara a "Flow: conectado" en menos de 1 minuto.
echo ============================================================
".venv\Scripts\python.exe" flow_agent.py --minutes 720

echo.
echo El agente se ha detenido. Si arriba hay un error, copialo tal cual.
pause
endlocal
