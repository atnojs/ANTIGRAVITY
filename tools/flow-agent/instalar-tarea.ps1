# Instala el agente de Flow como servicio permanente en este PC.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Estado
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Quitar
#
# Qué hace: registra la tarea "UisFlowAgent", que arranca al iniciar sesión y se
# repite cada 2 minutos. Cada arranque trabaja 6 minutos, así que siempre hay uno
# vivo: el siguiente empieza antes de que acabe el anterior. El agente evita
# duplicados con su candado y la tarea reintenta si el proceso falla.
#
# Antes de instalar comprueba de verdad que la credencial funciona contra la app
# configurada en `agente.json`.

param(
    [switch]$Quitar,
    [switch]$Estado
)

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tarea = 'UisFlowAgent'

if ($dir -like '\\*') {
    throw "Esto se ha abierto desde la ruta de red $dir. Ejecútalo en el PC de Flow, en E:\ANTIGRAVITY\tools\flow-agent."
}

$py = Join-Path $dir '.venv\Scripts\pythonw.exe'
$script = Join-Path $dir 'flow_agent.py'
$config = Join-Path $dir 'agente.json'

function Leer-Base {
    if (-not (Test-Path $config)) { return $null }
    try { return (Get-Content $config -Raw -Encoding UTF8 | ConvertFrom-Json).base }
    catch { return $null }
}

function Comprobar-Credencial {
    $exe = Join-Path $dir '.venv\Scripts\python.exe'
    Push-Location $dir
    try { return (& $exe comprobar-token.py 2>&1) }
    finally { Pop-Location }
}

function Ver-Estado {
    $base = Leer-Base
    Write-Host '── Estado del agente de Flow ──' -ForegroundColor Cyan
    if ($base) { Write-Host ("App:              {0}" -f $base) } else { Write-Host 'App:              (falta agente.json)' }
    $t = Get-ScheduledTask -TaskName $tarea -ErrorAction SilentlyContinue
    if ($t) {
        $info = Get-ScheduledTaskInfo -TaskName $tarea
        Write-Host ("Tarea:            {0}" -f $t.State) -ForegroundColor Green
        Write-Host ("Última ejecución: {0} · resultado {1}" -f $info.LastRunTime, $info.LastTaskResult)
        Write-Host ("Próxima:          {0}" -f $info.NextRunTime)
    } else {
        Write-Host 'Tarea:            NO instalada' -ForegroundColor Yellow
    }
    $proc = @(Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*flow_agent.py*' })
    if ($proc.Count -gt 0) {
        Write-Host ("Agente:           {0} proceso(s) vivo(s)" -f $proc.Count) -ForegroundColor Green
    } else {
        Write-Host 'Agente:           parado' -ForegroundColor Yellow
    }
    $lock = Join-Path $dir 'flow_agent.lock'
    if (Test-Path $lock) {
        $id = (Get-Content $lock -Raw).Trim()
        $vivo = Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue
        if ($vivo) { Write-Host ("Candado:          PID {0} (vivo)" -f $id) }
        else { Write-Host ("Candado:          PID {0} (huérfano)" -f $id) -ForegroundColor Yellow }
    }
    if ($base) {
        $r = Comprobar-Credencial
        if (($r -join "`n") -match 'HTTP 200') {
            Write-Host 'Credencial:       OK' -ForegroundColor Green
        } else {
            Write-Host 'Credencial:       FALLO' -ForegroundColor Red
            $r | Where-Object { $_ -match 'HTTP|Revisa|SetEnv' } | ForEach-Object { Write-Host ("  {0}" -f $_.Trim()) }
        }
    }
}

if ($Estado) { Ver-Estado; return }

if ($Quitar) {
    $t = Get-ScheduledTask -TaskName $tarea -ErrorAction SilentlyContinue
    if ($t) {
        Unregister-ScheduledTask -TaskName $tarea -Confirm:$false
        Write-Host "Tarea $tarea eliminada." -ForegroundColor Green
    } else {
        Write-Host "La tarea $tarea no estaba instalada."
    }
    Write-Host 'Los procesos vivos seguirán hasta terminar su turno.'
    return
}

# ── Requisitos ──
if (-not (Test-Path $py)) { throw "No existe $py. Falta el entorno .venv del agente." }
if (-not (Test-Path $script)) { throw "No existe $script." }
if (-not (Test-Path $config)) { throw 'No existe agente.json con la credencial y la URL de la app.' }

$base = Leer-Base
if (-not $base) { throw 'agente.json no tiene "base". Copia agente.example.json y rellénalo.' }
if ($base -notlike '*unified-image-studio-hoola*') {
    Write-Host ''
    Write-Host ("AVISO: el agente apunta a {0}" -f $base) -ForegroundColor Yellow
    Write-Host 'La app en uso es apps/unified-image-studio-hoola. Cambia "base" en agente.json si no es lo que quieres.' -ForegroundColor Yellow
}

# ── Comprobación real de la credencial contra esa app ──
Write-Host ''
Write-Host ("Comprobando la credencial contra {0} ..." -f $base)
$resultado = Comprobar-Credencial
if (($resultado -join "`n") -notmatch 'HTTP 200') {
    $resultado | ForEach-Object { Write-Host $_ }
    throw 'La credencial no funciona contra esa app. No se instala nada hasta que responda HTTP 200.'
}
Write-Host 'Credencial: OK' -ForegroundColor Green

# ── Tarea permanente ──
$accion = New-ScheduledTaskAction -Execute $py -Argument 'flow_agent.py --minutes 6' -WorkingDirectory $dir
# "Al iniciar sesión" para el usuario actual: para todos los usuarios exige
# permisos de administrador y el sistema lo deniega.
$alIniciar = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$cadaDos = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2)
$ajustes = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $tarea -Action $accion -Trigger @($alIniciar, $cadaDos) -Settings $ajustes `
    -Description 'Agente de Google Flow para Unified Image Studio (siempre activo)' -Force | Out-Null

Write-Host "Tarea $tarea registrada." -ForegroundColor Green

# ── Arranque inmediato sin duplicar ──
$vivo = @(Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*flow_agent.py*' })
if ($vivo.Count -eq 0) {
    Start-ScheduledTask -TaskName $tarea
    Start-Sleep -Seconds 5
} else {
    Write-Host 'Ya había un agente vivo: se mantiene.'
}

Write-Host ''
Ver-Estado
Write-Host ''
Write-Host 'Listo: la app pasará a «Flow: conectado» en menos de un minuto.' -ForegroundColor Green
Write-Host 'Se reinicia solo al iniciar sesión y cada 2 minutos, y se recupera tras suspensión.'
Write-Host 'Para verlo cuando quieras:  .\instalar-tarea.ps1 -Estado'
