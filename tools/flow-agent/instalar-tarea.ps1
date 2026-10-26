# Instala el agente de Flow como tarea programada y lo arranca.
# Ejecutar una sola vez en el PC donde esta E:\ANTIGRAVITY.
# Desde consola:  powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($dir -like '\\*') {
  throw "Esto se ha abierto desde la ruta de red $dir. Ejecútalo en el PC de Flow, en E:\ANTIGRAVITY\tools\flow-agent."
}
$py = Join-Path $dir '.venv\Scripts\pythonw.exe'
$script = Join-Path $dir 'flow_agent.py'

if (-not (Test-Path $py)) { throw "No existe $py. Falta el entorno .venv del agente." }
if (-not (Test-Path $script)) { throw "No existe $script." }
if (-not (Test-Path (Join-Path $dir 'agente.json'))) { throw "No existe agente.json con la credencial." }

$action = New-ScheduledTaskAction -Execute $py -Argument 'flow_agent.py --minutes 6' -WorkingDirectory $dir
$logon = New-ScheduledTaskTrigger -AtLogOn
$every = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName 'UisFlowAgent' -Action $action -Trigger @($logon, $every) -Settings $settings `
  -Description 'Agente de Google Flow para Unified Image Studio (cada 2 minutos)' -Force | Out-Null

Start-ScheduledTask -TaskName 'UisFlowAgent'
Write-Host ''
Write-Host 'Tarea UisFlowAgent instalada y arrancada.' -ForegroundColor Green
Write-Host 'Comprobacion:  Get-ScheduledTaskInfo -TaskName UisFlowAgent'
Write-Host 'La app debe pasar a "Flow: conectado" en menos de 1 minuto.'
