# Instala el worker de la app ANTIGUA (flow_studio / flow_studio_hoola) como servicio.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea-antigua.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea-antigua.ps1 -Estado
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea-antigua.ps1 -Quitar
#
# La app antigua usa su propia cola (`flow_queue.php` con `flow_store/`) y su propio
# worker, que vive fuera del repositorio en E:\herramientas\google-flow. Este script
# solo crea la tarea programada que lo mantiene vivo; no toca el worker.
#
# Nota: este worker y el agente del estudio nuevo (UisFlowAgent) pueden convivir
# porque usan perfiles de Chrome distintos. Si ambos generan a la vez compiten por
# la misma cuenta de Google: es lo esperado y aceptado.

param(
    [switch]$Quitar,
    [switch]$Estado
)

$ErrorActionPreference = 'Stop'
$tarea = 'FlowStudioWorker'
$flowDir = 'E:\herramientas\google-flow'
$worker = Join-Path $flowDir 'flow_studio_worker.py'
$py = 'C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\pythonw.exe'

function Ver-Estado {
    Write-Host '── Worker de la app antigua (Flow Studio) ──' -ForegroundColor Cyan
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
        Where-Object { $_.CommandLine -like '*flow_studio_worker*' })
    if ($proc.Count -gt 0) {
        Write-Host ("Worker:           {0} proceso(s) vivo(s)" -f $proc.Count) -ForegroundColor Green
    } else {
        Write-Host 'Worker:           parado' -ForegroundColor Yellow
    }
    try {
        $r = Invoke-RestMethod -Uri 'https://atnojs.es/apps/flow_studio_hoola/flow_queue.php' -Method Post `
            -ContentType 'application/json' -Body '{"action":"status","ids":[]}' -TimeoutSec 25
        if ($r.worker) {
            Write-Host 'Cola:             conectada (la app muestra «PC conectado»)' -ForegroundColor Green
        } else {
            Write-Host 'Cola:             sin latido reciente' -ForegroundColor Yellow
        }
        Write-Host ("Pendientes:       {0}" -f $r.pending)
    } catch {
        Write-Host 'Cola:             no se pudo consultar' -ForegroundColor Red
    }
    Write-Host ("Worker en disco:  {0}" -f $(if (Test-Path $worker) { $worker } else { 'NO EXISTE' }))
    Write-Host ("Intérprete:       {0}" -f $(if (Test-Path $py) { $py } else { 'NO EXISTE' }))
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
    Write-Host 'La cola de la app antigua dejará de atenderse hasta que la vuelvas a activar.'
    return
}

# ── Requisitos ──
if (-not (Test-Path $worker)) { throw "No existe el worker: $worker" }
if (-not (Test-Path $py)) { throw "No existe el intérprete con Playwright: $py" }

# ── Tarea permanente, mismo patrón que el agente del estudio nuevo ──
$accion = New-ScheduledTaskAction -Execute $py -Argument "`"$worker`" --minutes 6" -WorkingDirectory $flowDir
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
    -Description 'Worker de Flow Studio y Flow Studio Hoola (siempre activo)' -Force -ErrorAction Stop | Out-Null
Write-Host "Tarea $tarea registrada." -ForegroundColor Green

$vivo = @(Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*flow_studio_worker*' })
if ($vivo.Count -eq 0) {
    Start-ScheduledTask -TaskName $tarea
    Start-Sleep -Seconds 5
} else {
    Write-Host 'Ya había un worker vivo: se mantiene.'
}

Write-Host ''
Ver-Estado
Write-Host ''
Write-Host 'Listo: la app antigua pasará a «PC conectado» en menos de un minuto.' -ForegroundColor Green
