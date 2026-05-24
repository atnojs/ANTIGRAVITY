@echo off
setlocal

cd /d "%~dp0"

if not exist "agente-limpiador.ps1" (
    echo No se encuentra agente-limpiador.ps1.
    pause
    exit /b 1
)

if not exist "Clean-WindowsJunk.ps1" (
    echo No se encuentra Clean-WindowsJunk.ps1.
    pause
    exit /b 1
)

if not exist "config.json" (
    echo No existe config.json.
    echo.
    echo Copiando config.example.json a config.json...
    copy "config.example.json" "config.json" >nul
    echo.
    echo Edita config.json y cambia server_url por la URL real de Hostinger:
    echo https://TU-DOMINIO.com/limpiador-windows/proxy.php
    echo.
    pause
    exit /b 1
)

set "TASK_NAME=Limpiador Windows Antigravity"
set "SCRIPT=%CD%\agente-limpiador.ps1"
set "CONFIG=%CD%\config.json"

schtasks /Create /TN "%TASK_NAME%" /SC ONLOGON /RL HIGHEST /F /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT%\" -ConfigPath \"%CONFIG%\""

if errorlevel 1 (
    echo.
    echo No se pudo crear la tarea. Prueba ejecutando este archivo como Administrador.
    pause
    exit /b 1
)

echo.
echo Agente instalado para arrancar al iniciar sesion.
echo.
echo Para iniciarlo ahora sin reiniciar, ejecuta:
echo powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -ConfigPath "%CONFIG%"
echo.
pause
