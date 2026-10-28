@echo off
REM Instala (o repara) la tarea FlowStudioWorker en el PC de trabajo.
REM Doble clic o: instalar-worker-flow.cmd
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-worker-flow.ps1" %*
echo.
pause
