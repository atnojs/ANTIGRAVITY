# Lanzador para el Programador de tareas de Windows: ejecuta el runner diario de
# videos de video-vault (hasta 5 videos, los que permiten los 50 puntos diarios
# de Google Flow) y se queda esperando si los puntos aún no se han repuesto.
# Salidas: _runner_diario.log (resumen) y _runner_task.log (salida completa).
$ErrorActionPreference = 'Continue'
Set-Location 'E:\ANTIGRAVITY'
$py = 'C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe'
if (-not (Test-Path $py)) { $py = 'python' }
& $py 'tools\video-vault\runner_diario.py' --max-videos 5 --pausa 90 --esperar-max-min 75 *>> 'E:\ANTIGRAVITY\tools\video-vault\_runner_task.log'
