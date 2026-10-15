# Recetas verificadas en este equipo

Comandos que **funcionan aquí** (probados). Si uno deja de funcionar, se anota en
`errores.md` y se actualiza esta lista.

## Ver si un puerto está abierto (sin CIM)

```powershell
netstat -ano | Select-String ":20128\s" | Select-String 'LISTENING'

# o connect TCP directo (funciona sin permisos especiales)
$t = New-Object System.Net.Sockets.TcpClient
try { $t.Connect('127.0.0.1',20128); 'ABIERTO'; $t.Dispose() } catch { 'CERRADO' }
```

## Ver procesos y su relación padre-hijo

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'omniroute' } |
  Select-Object ProcessId,ParentProcessId,Name,CommandLine
```

## ¿Un proceso tiene ventana de consola?

```powershell
tasklist /v /fo csv /nh | Select-String 'node.exe|pythonw.exe'
# "N/D" en la columna de título = sin ventana
```

## Parar un proceso concreto

```powershell
Stop-Process -Id 12345 -Force
```

## Arrancar algo despegado del job del agente (sobrevive al comando)

```powershell
$cmd = '"C:\Users\atnojs\AppData\Local\Programs\Python\Python312\pythonw.exe" "E:\hermes-data\omniroute_autostart.py" daemon'
([wmiclass]'Win32_Process').Create($cmd)
```

## Ejecutar un `.ps1` que la política bloquea

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\ANTIGRAVITY\tools\...\script.ps1" -Param valor
```

## Git: publicar (el repo despliega solo en Hostinger)

```powershell
git -C E:\ANTIGRAVITY add ruta/fichero
git -C E:\ANTIGRAVITY -c user.name='atnojs' -c user.email='atnojs@gmail.com' commit -m "tipo(ambito): resumen"
git -C E:\ANTIGRAVITY push origin main
git -C E:\ANTIGRAVITY log --oneline origin/main..HEAD   # vacío = todo subido
git -C E:\ANTIGRAVITY status --porcelain ruta/fichero   # vacío = limpio
```

## Git: ¿está un fichero ignorado? (importante antes de meter secretos)

```powershell
git -C E:\ANTIGRAVITY check-ignore -v inicio.md
```

## Leer un `.env` sin volcar secretos (solo nombres de claves)

```powershell
Get-Content E:\hermes-data\.env | ForEach-Object { ($_ -split '=')[0] } | Select-Object -First 40
```

## Listar una carpeta grande sin recursión infinita

```powershell
Get-ChildItem E:\ANTIGRAVITY -Force | Select-Object Mode,Name
Get-ChildItem E:\hermes-data\scripts -Recurse -Depth 1 -File -Include *.py
```

## OmniRoute

```powershell
# estado del daemon (puerto, node, entrypoint, credenciales)
& "C:\Users\atnojs\AppData\Local\Programs\Python\Python312\pythonw.exe" "E:\hermes-data\omniroute_autostart.py" status

# salud completa
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\ANTIGRAVITY\tools\omniroute\verificar-omniroute.ps1" -Probe

# log en vivo
Get-Content E:\hermes-data\logs\omniroute-autostart.log -Tail 30 -Wait
```
