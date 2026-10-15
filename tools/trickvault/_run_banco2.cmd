@echo off
rem Igual que _run_banco.cmd pero con OTRO perfil, para no chocar cuando el
rem primero esta ocupado. Uso: _run_banco2.cmd <url> <destino.html>
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set T=E:\ANTIGRAVITY\tools\trickvault
set PROF=%T%\_perfil_banco2
if exist "%PROF%" rmdir /s /q "%PROF%" 2>nul
%CHROME% --headless=new --no-sandbox --disable-gpu --disable-breakpad --disable-crash-reporter --no-first-run --no-default-browser-check --disable-extensions --allow-file-access-from-files --user-data-dir="%PROF%" --window-size=1200,700 --virtual-time-budget=8000000 --dump-dom "%~1" > "%~2" 2> "%T%\_banco2.log"
echo exit=%ERRORLEVEL%
