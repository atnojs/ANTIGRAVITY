<#
.SYNOPSIS
    Instala (o repara) el arranque automatico y OCULTO de OmniRoute en Windows.

.DESCRIPTION
    Deja el gateway levantandose solo al iniciar sesion, sin ninguna ventana
    visible, y con DeepSeek re-registrado cada hora.

    Que hace, en orden:
      1. Copia omniroute_autostart.py a la carpeta de datos de Hermes.
      2. Guarda la password del panel en %USERPROFILE%\.omniroute\panel.secret
         (fuera del repositorio; el .py no lleva credenciales dentro).
      3. Escribe el lanzador .cmd usando pythonw.exe (sin consola).
      4. Escribe el .vbs en la carpeta de Inicio de Windows.
      5. Retira los lanzadores antiguos (v1) y los deja como .bak.

    Es idempotente: se puede volver a ejecutar tantas veces como haga falta.

.PARAMETER HermesHome
    Carpeta de datos (donde vive .env y la carpeta logs). Por defecto E:\hermes-data

.PARAMETER Password
    Password del panel de OmniRoute. Si se omite, se conserva la que ya hubiera.

.PARAMETER Port
    Puerto del gateway. Por defecto 20128.

.PARAMETER Bind
    Vacio (por defecto) = comportamiento actual (escucha en todas las interfaces).
    "127.0.0.1" = solo loopback (mas seguro; comprueba antes que nada lo llame
    desde WSL o desde otro equipo).

.PARAMETER Python
    Ruta a un python.exe concreto. Si se omite, se busca en las instalaciones
    estandar (LOCALAPPDATA\Programs\Python, C:\Python3*, Program Files\Python3*)
    y NUNCA se usa un python que viva dentro de un venv.

.EXAMPLE
    .\instalar-autostart.ps1 -Password 'miPasswordDelPanel'
#>
[CmdletBinding()]
param(
    [string]$HermesHome = 'E:\hermes-data',
    [string]$Password,
    [int]$Port = 20128,
    [string]$Bind = '',
    [string]$Python
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp     = Get-Date -Format 'yyyyMMdd-HHmmss'

function Paso($t) { Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    OK  $t" -ForegroundColor Green }
function Aviso($t){ Write-Host "    !!! $t" -ForegroundColor Yellow }

# ---------------------------------------------------------------- 0. comprobaciones
Paso 'Comprobando rutas y ejecutables'

if (-not (Test-Path $HermesHome)) { throw "No existe la carpeta de datos: $HermesHome" }

# OJO: no vale el primer python.exe del PATH. En este equipo el PATH empieza por
# el venv de Hermes (AppData\Local\hermes\hermes-agent\venv), y ese interprete no
# es nuestro: puede desaparecer o recrearse. Preferimos una instalacion estandar.
$pythonw = $null
if ($Python) {
    $pythonw = if ($Python -match 'pythonw\.exe$') { $Python } else { Join-Path (Split-Path $Python) 'pythonw.exe' }
    if (-not (Test-Path $pythonw)) { throw "No existe $pythonw" }
} else {
    $candidatos = @()
    $candidatos += Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\pythonw.exe" -ErrorAction SilentlyContinue |
                   Sort-Object FullName -Descending
    $candidatos += Get-ChildItem 'C:\Python3*\pythonw.exe' -ErrorAction SilentlyContinue |
                   Sort-Object FullName -Descending
    $candidatos += Get-ChildItem "$env:ProgramFiles\Python3*\pythonw.exe" -ErrorAction SilentlyContinue |
                   Sort-Object FullName -Descending
    $delPath = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
    if ($delPath -and $delPath -notmatch '\\venv\\') { $candidatos += Get-Item $delPath }

    foreach ($c in $candidatos) {
        if ($c.FullName -match '\\venv\\') { continue }   # nunca un venv ajeno
        $pythonw = $c.FullName
        break
    }
}
if (-not $pythonw) {
    throw "No encuentro pythonw.exe de una instalacion estandar de Python. Usa -Python 'C:\ruta\a\python.exe'."
}
Ok "pythonw: $pythonw"

$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path $node)) { throw "No encuentro node.exe. Instala Node.js LTS." }
Ok "node:    $node"

$entry = Join-Path $env:APPDATA 'npm\node_modules\omniroute\bin\omniroute.mjs'
if (-not (Test-Path $entry)) {
    throw "OmniRoute no esta instalado en $entry  ->  ejecuta primero:  npm install -g omniroute"
}
Ok "gateway: $entry"

$startup = [Environment]::GetFolderPath('Startup')
Ok "Inicio:  $startup"

# ---------------------------------------------------------------- 1. daemon .py
Paso 'Instalando el daemon (pythonw, sin consola)'

$destPy  = Join-Path $HermesHome 'omniroute_autostart.py'
$srcPy   = Join-Path $scriptDir 'omniroute_autostart.py'
if (-not (Test-Path $srcPy)) { throw "Falta $srcPy" }

if (Test-Path $destPy) { Copy-Item $destPy "$destPy.bak-$stamp" -Force }
Copy-Item $srcPy $destPy -Force
Ok "daemon:  $destPy"

# ---------------------------------------------------------------- 2. password
Paso 'Configurando la password del panel'

$secretsDir = Join-Path $env:USERPROFILE '.omniroute'
$secretFile = Join-Path $secretsDir 'panel.secret'
if (-not (Test-Path $secretsDir)) { New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null }

if ($Password) {
    if (Test-Path $secretFile) { Copy-Item $secretFile "$secretFile.bak-$stamp" -Force }
    # ASCII a proposito: Set-Content -Encoding UTF8 mete BOM en PowerShell 5.1
    # y el BOM rompe la lectura de la primera clave en el daemon.
    Set-Content -Path $secretFile -Value "OMNIROUTE_DASH_PW=$Password" -Encoding ASCII
    Ok "password guardada en $secretFile (fuera del repositorio)"
} elseif (Test-Path $secretFile) {
    Ok "password ya existente, se conserva"
} else {
    Aviso "Sin password: el daemon arrancara el gateway pero NO registrara DeepSeek."
    Aviso "Vuelve a ejecutar con  -Password 'laDelPanel'  o crea $secretFile"
}

# ---------------------------------------------------------------- 3. lanzador .cmd
Paso 'Escribiendo lanzador .cmd (pythonw = sin ventana)'

$destCmd = Join-Path $HermesHome 'omniroute_autostart.cmd'
if (Test-Path $destCmd) { Copy-Item $destCmd "$destCmd.bak-$stamp" -Force }

$cmdLines = @(
    '@echo off',
    'rem Lanzador de OmniRoute - arranque oculto. Generado por tools\omniroute\instalar-autostart.ps1',
    "cd /d `"$HermesHome`"",
    "set HERMES_HOME=$HermesHome",
    "set OMNIROUTE_PORT=$Port",
    "set OMNIROUTE_NODE=$node",
    "set OMNIROUTE_ENTRY=$entry"
)
if ($Bind) { $cmdLines += "set OMNIROUTE_BIND=$Bind" }
$cmdLines += "start `"`" /b `"$pythonw`" `"$destPy`" daemon"
($cmdLines -join "`r`n") + "`r`n" | Set-Content -Path $destCmd -Encoding ASCII
Ok "lanzador: $destCmd"

# ---------------------------------------------------------------- 4. .vbs en Inicio
Paso 'Colocando el arranque automatico en la carpeta de Inicio'

$destVbs = Join-Path $startup 'omniroute_gateway.vbs'
if (Test-Path $destVbs) { Copy-Item $destVbs "$destVbs.bak-$stamp" -Force }

$vbs = @(
    "' OmniRoute gateway - arranque oculto al iniciar sesion.",
    "' El 0 final de WshShell.Run = ventana oculta. Generado por tools\omniroute\instalar-autostart.ps1",
    'Set WshShell = CreateObject("WScript.Shell")',
    "WshShell.Run chr(34) & `"$destCmd`" & chr(34), 0, False",
    'Set WshShell = Nothing'
) -join "`r`n"
$vbs + "`r`n" | Set-Content -Path $destVbs -Encoding ASCII
Ok "autostart: $destVbs"

# ---------------------------------------------------------------- 5. limpiar v1
Paso 'Retirando lanzadores antiguos (v1)'

$viejos = @(
    (Join-Path $startup 'omniroute_deepseek_autostart.vbs'),
    (Join-Path $HermesHome 'omniroute_deepseek_autostart.cmd'),
    (Join-Path $HermesHome 'omniroute_deepseek_autostart.py')
)
foreach ($viejo in $viejos) {
    if (Test-Path $viejo) {
        Move-Item $viejo "$viejo.bak-$stamp" -Force
        Ok "retirado: $(Split-Path $viejo -Leaf)  ->  .bak-$stamp"
    }
}

# ---------------------------------------------------------------- 6. parar duplicados
Paso 'Parando daemons duplicados'

try {
    $vivos = Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object { $_.CommandLine -and $_.CommandLine -match 'omniroute.*autostart' }
    foreach ($p in $vivos) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        Ok "parado PID $($p.ProcessId)"
    }
    if (-not $vivos) { Ok 'ninguno vivo' }
} catch {
    Aviso 'no pude enumerar procesos (permisos); revisa a mano si ves duplicados'
}

# ---------------------------------------------------------------- 7. resumen
Paso 'Resumen'
Write-Host ""
Write-Host "  Daemon    : $destPy"          -ForegroundColor White
Write-Host "  Lanzador  : $destCmd"          -ForegroundColor White
Write-Host "  Autostart : $destVbs"          -ForegroundColor White
Write-Host "  Puerto    : $Port  (bind: $(if ($Bind) { $Bind } else { 'todas las interfaces' }))" -ForegroundColor White
Write-Host "  Log       : $(Join-Path $HermesHome 'logs\omniroute-autostart.log')" -ForegroundColor White
Write-Host ""
Write-Host "  Arrancarlo ahora sin reiniciar:" -ForegroundColor Cyan
Write-Host "    & '$pythonw' '$destPy' daemon" -ForegroundColor Gray
Write-Host "  Ver estado:" -ForegroundColor Cyan
Write-Host "    & '$pythonw' '$destPy' status" -ForegroundColor Gray
Write-Host "  Comprobar salud:" -ForegroundColor Cyan
Write-Host "    & '$scriptDir\verificar-omniroute.ps1' -Port $Port" -ForegroundColor Gray
Write-Host ""
