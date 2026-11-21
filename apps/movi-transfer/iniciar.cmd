@echo off
rem Movi Transfer — arranque en primer plano. Cierra esta ventana para parar el servidor.
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js no esta instalado o no esta en el PATH.
  echo  Instalalo desde https://nodejs.org y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

node server.mjs --open
if errorlevel 1 pause
