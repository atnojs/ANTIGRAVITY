@echo off
setlocal
title Foto A4 - puente de impresion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encuentra Node.js en el PATH.
  echo   Instala Node o abre este archivo desde una consola con Node disponible.
  echo.
  pause
  exit /b 1
)

node server.mjs
if errorlevel 1 (
  echo.
  echo   El puente se ha detenido con error.
  pause
)
