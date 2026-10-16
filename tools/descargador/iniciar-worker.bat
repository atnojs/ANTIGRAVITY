@echo off
rem ====================================================================
rem  Worker local de descargas - Antigravity
rem  Lanza worker.mjs en bucle: si el proceso termina, espera 10 s y
rem  lo vuelve a arrancar. Se puede ejecutar con doble clic.
rem ====================================================================
setlocal
chcp 65001 >nul 2>nul
title Worker de descargas - Antigravity
cd /d "%~dp0"

rem Node: primero la ruta conocida del equipo, si no la del PATH.
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

echo.
echo ====================================================================
echo  WORKER LOCAL DE DESCARGAS - %DATE% %TIME%
echo  Carpeta : %~dp0
echo  Node    : %NODE_EXE%
echo  Config  : %DESCARGAS_WORKER_CONFIG%
echo  (si "Config" sale vacio se usa ..\..\.private\descargas-worker.json)
echo ====================================================================
echo.

:bucle
echo [%DATE% %TIME%] Arrancando el worker...
"%NODE_EXE%" "%~dp0worker.mjs"
set "CODIGO=%ERRORLEVEL%"
echo.
echo [%DATE% %TIME%] El worker ha terminado con el codigo %CODIGO%.

rem Codigo 2 = error de configuracion: no se relanza, hay que revisarlo.
if "%CODIGO%"=="2" goto configuracion

echo [%DATE% %TIME%] Se relanzara en 10 segundos (Ctrl+C para cancelar)...
rem timeout da cuenta atras en una consola normal, pero falla si la entrada esta
rem redirigida; en ese caso se usa ping como espera garantizada de 10 segundos.
timeout /t 10 /nobreak >nul 2>nul
if errorlevel 1 ping -n 11 127.0.0.1 >nul 2>nul
goto bucle

:configuracion
echo.
echo *******************************************************************
echo  ERROR DE CONFIGURACION (codigo 2). NO se relanza en bucle.
echo  Revisa el fichero de configuracion y vuelve a lanzar este .bat.
echo *******************************************************************
echo.
pause
exit /b 2
