@echo off
rem Diagnostico del agente de Flow: guarda TODO en logs\diagnostico.log
rem Hace una generacion real de prueba (1 imagen, Nano Banana 2) para ver el error real.
setlocal
cd /d "%~dp0"

if not exist "logs" mkdir "logs"
if not exist "tmp" mkdir "tmp"

rem Chrome y Playwright necesitan temporales escribibles.
set "TEMP=%~dp0tmp"
set "TMP=%~dp0tmp"
set "TMPDIR=%~dp0tmp"
set "FLOW_HEADLESS=true"
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"

rem El perfil de Flow se toma de agente.json, igual que hace el agente.
rem Se escribe un .bat auxiliar para no pelear con las comillas del comando.
".venv\Scripts\python.exe" -c "import json;print('set FLOW_CHROME_PROFILE=' + (json.load(open('agente.json',encoding='utf-8-sig')).get('flow_profile') or ''))" > "%~dp0tmp\entorno.bat"
call "%~dp0tmp\entorno.bat"

set "LOG=%~dp0logs\diagnostico.log"
if exist "%LOG%" del "%LOG%"

echo Diagnostico del agente de Flow
echo Guardando en: %LOG%
echo Puede tardar uno o dos minutos: hace una generacion real.
echo.

call :todo >> "%LOG%" 2>&1

echo.
echo ---- RESULTADO ----
type "%LOG%"
echo.
echo Fichero completo: %LOG%
pause
endlocal
exit /b 0

:todo
echo === VERSION DEL AGENTE ===
".venv\Scripts\python.exe" -c "import hashlib,pathlib;d=pathlib.Path('flow_agent.py').read_bytes();print('flow_agent.py bytes:',len(d));print('sha256:',hashlib.sha256(d).hexdigest()[:16])"
".venv\Scripts\python.exe" -c "import sys,playwright,PIL;print('python:',sys.version.split()[0]);print('playwright: OK');print('pillow:',PIL.__version__)"
echo.
echo === CONFIGURACION ===
".venv\Scripts\python.exe" -c "import flow_agent as fa;c=fa.load_config();print('base:',c.get('base'));print('perfil:',c.get('flow_profile'));print('tmp_dir:',c.get('tmp_dir'));print('token: presente' if c.get('token') else 'token: FALTA')"
echo FLOW_CHROME_PROFILE: %FLOW_CHROME_PROFILE%
echo.
echo === CREDENCIAL EN EL SERVIDOR ===
".venv\Scripts\python.exe" comprobar-token.py
echo.
echo === PERFIL DE CHROME ===
".venv\Scripts\python.exe" -c "import flow_agent as fa;c=fa.load_config();print('Chrome usando el perfil:',fa.chrome_using_profile(c.get('flow_profile') or ''))"
echo.
echo === SESION DE FLOW ===
".venv\Scripts\python.exe" flow.py status
echo.
echo === GENERACION REAL DE PRUEBA ===
".venv\Scripts\python.exe" flow.py image --prompt "un faro minimalista sobre un acantilado, acuarela" --ratio 1:1 --model "Nano Banana 2" --name diagnostico --count 1 --out "%~dp0outputs"
echo Codigo de salida: %ERRORLEVEL%
echo === FIN DEL DIAGNOSTICO ===
exit /b 0