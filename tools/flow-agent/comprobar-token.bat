@echo off
rem Comprueba si el servidor ya acepta el token del agente.
rem   comprobar-token.bat            -> usa el token de agente.json
rem   comprobar-token.bat TOKEN      -> comprueba otro token
setlocal
cd /d "%~dp0"
".venv\Scripts\python.exe" comprobar-token.py %*
if errorlevel 1 pause
endlocal