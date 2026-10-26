@echo off
rem Instala y arranca la tarea UisFlowAgent (una sola vez, en el PC de Flow).
setlocal
cd /d "%~dp0"
echo Instalando la tarea programada del agente de Flow...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-tarea.ps1"
echo.
pause
endlocal
