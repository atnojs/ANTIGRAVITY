<#
.SYNOPSIS
    Crea (o repara) la tarea programada FlowStudioWorker, que procesa la cola de
    Google Flow del proyecto cada 2 minutos.

.DESCRIPTION
    Ejecutar EN EL PC DE TRABAJO: el que tiene E:\herramientas\google-flow, la
    sesión de Google (session\flowbot-profile) y Python con Playwright.

    La tarea lanza `flow_studio_worker.py --minutes 25` cada 2 minutos. Si ya hay
    una instancia viva, la nueva sale sola (el worker usa un lock del sistema), y
    la tarea no arranca otra (MultipleInstances=IgnoreNew).

    Es idempotente: si la tarea ya existe, la reemplaza con esta configuración.

.PARAMETER FlowDir
    Carpeta de la herramienta. Por defecto E:\herramientas\google-flow.

.PARAMETER DryRun
    Solo comprueba Python/Playwright y muestra lo que haría, sin crear la tarea.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\flow\instalar-worker-flow.ps1
#>
[CmdletBinding()]
param(
    [string]$FlowDir = 'E:\herramientas\google-flow',
    [string]$TaskName = 'FlowStudioWorker',
    [int]$Minutes = 25,
    [switch]$DryRun,
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Text) { Write-Host ("== " + $Text) -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host ("   OK  " + $Text) -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host ("   !!  " + $Text) -ForegroundColor Yellow }

# ── 1. Comprobar que estamos en el PC correcto ────────────────────────────────
Write-Step "Carpeta de la herramienta: $FlowDir"
$worker = Join-Path $FlowDir 'flow_studio_worker.py'
if (-not (Test-Path $worker)) {
    Write-Host ""
    Write-Host "No existe $worker." -ForegroundColor Red
    Write-Host "Este script debe ejecutarse en el PC de trabajo (el del share \\Principal)," -ForegroundColor Red
    Write-Host "no en otro equipo. Copia la carpeta o ejecútalo allí." -ForegroundColor Red
    exit 2
}
Write-Ok "worker encontrado"

# ── 2. Localizar un Python con Playwright ────────────────────────────────────
Write-Step "Buscando Python con Playwright"

function Test-Python([string]$exe) {
    if (-not $exe -or -not (Test-Path $exe)) { return $false }
    try {
        $out = & $exe -c "import playwright, PIL; print('ok')" 2>$null
        return ($LASTEXITCODE -eq 0 -and "$out".Trim() -eq 'ok')
    } catch { return $false }
}

$candidates = New-Object System.Collections.Generic.List[string]
# Lanzador oficial
try {
    $py = (Get-Command py -ErrorAction Stop).Source
    $exe = (& $py -3 -c "import sys; print(sys.executable)" 2>$null)
    if ($LASTEXITCODE -eq 0 -and $exe) {
        $candidates.Add($exe.Trim())
        $candidates.Add(($exe.Trim() -replace 'python\.exe$', 'pythonw.exe'))
    }
} catch { }
# PATH
foreach ($name in @('pythonw.exe', 'python.exe')) {
    try {
        $c = Get-Command $name -ErrorAction Stop
        $candidates.Add($c.Source)
    } catch { }
}
# Instalaciones típicas por usuario y sistema
$globs = @(
    "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python3*\pythonw.exe",
    "C:\Python3*\python.exe",
    "C:\Program Files\Python3*\python.exe"
)
foreach ($g in $globs) {
    Get-ChildItem -Path $g -ErrorAction SilentlyContinue | ForEach-Object { $candidates.Add($_.FullName) }
}

$python = $null
foreach ($cand in ($candidates | Select-Object -Unique)) {
    if (Test-Python $cand) { $python = $cand; break }
}

if (-not $python) {
    Write-Host ""
    Write-Host "No se encontró un Python con Playwright y Pillow instalados." -ForegroundColor Red
    Write-Host "Instálalos en este PC con:" -ForegroundColor Yellow
    Write-Host "    py -3 -m pip install playwright pillow" -ForegroundColor Yellow
    Write-Host "y vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 3
}
Write-Ok "Python: $python"
# pythonw evita la ventana de consola al ejecutarse desde el Programador de tareas
$pythonw = $python -replace 'python\.exe$', 'pythonw.exe'
if (-not (Test-Path $pythonw)) { $pythonw = $python }

# ── 3. Crear la tarea ────────────────────────────────────────────────────────
$arguments = "flow_studio_worker.py --minutes $Minutes"
Write-Step "Tarea '$TaskName' cada 2 minutos: $pythonw $arguments"

if ($DryRun) {
    Write-Warn "DryRun: no se crea la tarea"
    exit 0
}

$action = New-ScheduledTaskAction -Execute $pythonw -Argument $arguments -WorkingDirectory $FlowDir
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(-1) `
    -RepetitionInterval (New-TimeSpan -Minutes 2) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 60)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$description = 'Worker de Google Flow: procesa la cola de apps/flow_studio cada 2 minutos. Creado por tools/flow/instalar-worker-flow.ps1.'

$created = $false
try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
        -Principal $principal -Description $description -Force | Out-Null
    $created = $true
    Write-Ok "tarea registrada con Register-ScheduledTask"
} catch {
    Write-Warn ("Register-ScheduledTask falló: " + $_.Exception.Message + ". Probando schtasks...")
    $tr = '"' + $pythonw + '" ' + $arguments
    & schtasks.exe /create /sc minute /mo 2 /tn $TaskName /tr $tr /f | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $created = $true
        Write-Ok "tarea registrada con schtasks"
    }
}
if (-not $created) {
    Write-Host "No se pudo crear la tarea. Abre PowerShell como administrador y repite." -ForegroundColor Red
    exit 4
}

# ── 4. Arrancarla y comprobar ────────────────────────────────────────────────
if (-not $NoStart) {
    Write-Step "Arrancando la tarea"
    try { Start-ScheduledTask -TaskName $TaskName; Write-Ok "lanzada" }
    catch { Write-Warn ("no se pudo lanzar: " + $_.Exception.Message) }
    Start-Sleep -Seconds 8
}

Write-Step "Estado"
try {
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host ("   Última ejecución: " + $info.LastRunTime + " · resultado: " + $info.LastTaskResult)
} catch { }
try {
    $t = Get-ScheduledTask -TaskName $TaskName
    Write-Host ("   Estado de la tarea: " + $t.State)
} catch { }

Write-Step "Comprobando la cola (worker en línea)"
try {
    $ping = Invoke-RestMethod -Uri ("https://atnojs.es/apps/flow_studio/flow_queue.php?action=ping&_=" + [guid]::NewGuid().ToString('N')) -TimeoutSec 25
    Write-Host ("   worker=" + $ping.worker + " · pendientes=" + $ping.pending)
    if ($ping.worker) { Write-Ok "el worker está conectado" }
    else { Write-Warn "todavía no aparece conectado: espera 2 minutos y vuelve a mirar (o revisa que no haya un Chrome abierto con session\flowbot-profile)" }
} catch {
    Write-Warn ("no se pudo consultar la cola: " + $_.Exception.Message)
}

Write-Host ""
Write-Host "Listo. Desde ahora la cola se procesa sola cada 2 minutos." -ForegroundColor Green
Write-Host "Para desinstalarla:  Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false" -ForegroundColor DarkGray
