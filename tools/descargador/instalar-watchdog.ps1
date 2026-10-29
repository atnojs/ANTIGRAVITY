<#
  Instala (o repara) la tarea programada "DescargasWorkerWatchdog".

  Cada 5 minutos ejecuta iniciar-worker.vbs:
    - si el worker ya esta corriendo, el VBS sale solo (no se duplica);
    - si se ha caido, lo vuelve a arrancar en segundos.
  El arranque al iniciar sesion lo sigue haciendo el acceso directo de la
  carpeta Inicio; esta tarea es la red de seguridad por si el lanzador muere.

  No necesita permisos de administrador (se registra para el usuario actual).
  Nota: un disparador "al iniciar sesion" exige elevacion, por eso se usa un
  disparador "una vez" con repeticion indefinida cada 5 minutos.

  Uso:
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\descargador\instalar-watchdog.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\descargador\instalar-watchdog.ps1 -Quitar
#>
param([switch]$Quitar)

$ErrorActionPreference = 'Stop'
$nombre = 'DescargasWorkerWatchdog'

if ($Quitar) {
    Unregister-ScheduledTask -TaskName $nombre -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea '$nombre' eliminada."
    exit 0
}

$vbs = Join-Path $PSScriptRoot 'iniciar-worker.vbs'
$vigia = Join-Path $PSScriptRoot 'watchdog.vbs'
if (-not (Test-Path -LiteralPath $vbs)) {
    throw "No encuentro $vbs"
}
if (-not (Test-Path -LiteralPath $vigia)) {
    throw "No encuentro $vigia"
}

# La tarea ejecuta el watchdog CORTO (comprueba y sale), no el supervisor:
# si ejecutara el supervisor, la tarea quedaria "en ejecucion" para siempre.
$accion = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $vigia + '"')
# Disparador "una vez" + repeticion cada 5 minutos: se puede registrar sin ser
# administrador (el disparador "al iniciar sesion" da Acceso denegado).
$disparadores = @(
    (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
        -RepetitionInterval (New-TimeSpan -Minutes 5))
)
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

Register-ScheduledTask -TaskName $nombre -Action $accion -Trigger $disparadores `
    -Settings $ajustes -Force `
    -Description 'Arranca el worker de descargas si se ha caido (comprobacion cada 5 minutos).' | Out-Null

$tarea = Get-ScheduledTask -TaskName $nombre
Write-Host "OK: tarea '$nombre' registrada (estado: $($tarea.State))."
Write-Host "VBS: $vbs"
