@echo off
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set PROF=E:\ANTIGRAVITY\tools\trickvault\_perfil_verifica_bts_restore
if exist "%PROF%" rmdir /s /q "%PROF%"
%CHROME% --headless=new --no-sandbox --disable-gpu --disable-breakpad --disable-crash-reporter --no-first-run --no-default-browser-check --allow-file-access-from-files --user-data-dir="%PROF%" --virtual-time-budget=120000 --dump-dom "file:///E:/ANTIGRAVITY/tools/trickvault/_verifica_bts_restore.html" > "E:\ANTIGRAVITY\tools\trickvault\_dump_bts_restore.txt" 2> "E:\ANTIGRAVITY\tools\trickvault\_dump_bts_restore.err.txt"
echo exit=%ERRORLEVEL%
