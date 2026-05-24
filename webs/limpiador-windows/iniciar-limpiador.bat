@echo off
setlocal

cd /d "%~dp0"

if not exist "php\php.exe" (
    echo No se encuentra php\php.exe.
    echo Instala PHP portable en esta carpeta o vuelve a pedir a Codex que lo instale.
    pause
    exit /b 1
)

echo Iniciando Limpiador Windows en http://127.0.0.1:8080/
echo.
echo Deja esta ventana abierta mientras uses la app.
echo Para apagar el servidor, cierra esta ventana o pulsa Ctrl+C.
echo.

start "" "http://127.0.0.1:8080/"
"php\php.exe" -S 127.0.0.1:8080 -t .

