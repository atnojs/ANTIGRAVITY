@echo off
rem Agente de Google Flow para Unified Image Studio.
rem Usa el entorno de Python del propio agente (no el Python del sistema).
rem   doble clic                     -> trabaja 25 minutos
rem   iniciar-agente.bat --once      -> una sola pasada
rem   iniciar-agente.bat --status    -> comprobar credencial y sesion de Flow

setlocal
set "AQUI=%~dp0"
if "%AQUI:~0,2%"=="\\" (
  echo Este archivo se ha abierto desde una ruta de red ^(%AQUI%^).
  echo Ejecutalo en el PC de Flow, en su disco E:\ANTIGRAVITY\tools\flow-agent.
  pause
  exit /b 1
)
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo ERROR: falta el entorno del agente.
  echo Ejecuta una vez:
  echo   uv venv .venv --python 3.11
  echo   uv pip install --python .venv\Scripts\python.exe playwright pillow
  pause
  exit /b 1
)

if not exist "agente.json" (
  echo ERROR: falta agente.json con la credencial del agente.
  echo Copia agente.example.json a agente.json y rellena "token" y "base".
  pause
  exit /b 1
)

set "MODO=%~1"
echo Agente de Flow - Unified Image Studio
echo.
".venv\Scripts\python.exe" flow_agent.py %*
set "CODIGO=%ERRORLEVEL%"

rem Solo se detiene para leer el error si se ha abierto a mano (doble clic),
rem no cuando se llama con un argumento desde una consola o una tarea.
if not "%CODIGO%"=="0" if "%MODO%"=="" (
  echo.
  echo El agente termino con error. Revisa el mensaje de arriba.
  pause
)
endlocal & exit /b %CODIGO%