$ErrorActionPreference = 'Continue'
Set-Location 'E:\ANTIGRAVITY'
$log = 'E:\ANTIGRAVITY\tools\video-vault\_lote.log'
$py = 'C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe'
if (-not (Test-Path $py)) { $py = 'python' }
$orden = (Get-Content 'E:\ANTIGRAVITY\tools\video-vault\_orden_prioridad.txt' -Raw).Trim()

function Log($msg) {
  Add-Content -Path $log -Value ('[{0}] {1}' -f (Get-Date -Format 'dd/MM HH:mm:ss'), $msg) -Encoding UTF8
}

Log '=== lote (con prioridad) iniciado ==='
$completo = $false
for ($ronda = 1; $ronda -le 300; $ronda++) {
  $salida = & $py 'tools\video-vault\generar_videos_pendientes.py' --limite 15 --orden $orden 2>&1
  Add-Content -Path $log -Value ($salida | Out-String) -Encoding UTF8

  $repo = & $py 'tools\video-vault\auditar_cobertura.py' 2>&1 | Out-String
  $m = [regex]::Match($repo, 'SIN_VIDEO=(\d+)')
  Log "ronda $ronda terminada; sin video en repo: $($m.Groups[1].Value)"
  if ($m.Groups[1].Value -eq '0') { $completo = $true; break }

  # Si falla algún video, comprobar si es por falta de puntos de Google Flow:
  # en ese caso se detiene en vez de reintentar en bucle durante horas.
  if ($salida -match 'Faltan:') {
    $cuota = & $py 'tools\video-vault\comprobar_cuota_flow.py' 2>&1 | Out-String
    Add-Content -Path $log -Value $cuota -Encoding UTF8
    if ($cuota -match 'CUOTA_AGOTADA') {
      Log '=== CUOTA DE FLOW AGOTADA: lote detenido; se reanuda al reponer los puntos ==='
      return
    }
  }
  Start-Sleep -Seconds 15
}
Log ('=== repo completo: ' + $completo + ' ===')

for ($intento = 1; $intento -le 15; $intento++) {
  $prod = & $py 'tools\video-vault\auditar_cobertura.py' --produccion 2>&1 | Out-String
  $n = [regex]::Match($prod, 'SIN_VIDEO=(\d+)').Groups[1].Value
  Log "produccion sin video: $n (intento $intento)"
  if ($n -eq '0') { Log '=== PRODUCCION COMPLETA ==='; break }
  git commit --allow-empty -q -m 'chore(deploy): re-disparar despliegue (videos de video-vault pendientes)'
  git push origin main 2>&1 | Out-Null
  Start-Sleep -Seconds 240
}
Log '=== proceso del lote finalizado ==='
