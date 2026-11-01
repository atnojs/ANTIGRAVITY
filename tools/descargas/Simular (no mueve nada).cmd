@echo off
chcp 65001 >nul
title SIMULAR: archivar descargas por mes
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0archivar-mes.ps1" -Simular %*
echo.
pause
