@echo off
setlocal

cd /d "%~dp0"

if not exist "config.json" (
    echo No existe config.json.
    echo Copia config.example.json como config.json y pon la URL real de Hostinger.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\agente-limpiador.ps1" -ConfigPath "%CD%\config.json"
