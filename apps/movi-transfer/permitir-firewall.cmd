@echo off
rem Movi Transfer — abre el puerto 8099 en el firewall de Windows.
rem Solo hace falta una vez. Pide permisos de administrador (UAC).
setlocal
chcp 65001 >nul

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Solicitando permisos de administrador...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="Movi Transfer (TCP 8099)" >nul 2>&1
netsh advfirewall firewall add rule name="Movi Transfer (TCP 8099)" dir=in action=allow protocol=TCP localport=8099 profile=private
if errorlevel 1 (
  echo.
  echo  No se pudo crear la regla. Anade el puerto 8099 a mano en el firewall.
) else (
  echo.
  echo  Listo: el puerto 8099 queda abierto solo en redes privadas.
)
echo.
pause
