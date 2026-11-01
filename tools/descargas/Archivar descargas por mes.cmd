@echo off
chcp 65001 >nul
title Archivar descargas por mes
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0archivar-mes.ps1" %*
echo.
pause
