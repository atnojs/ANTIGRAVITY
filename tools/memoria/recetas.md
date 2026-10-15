# Recetas verificadas en este equipo

Comandos que **funcionan aquí** (probados). Si uno deja de funcionar, se anota en
`errores.md` y se actualiza esta lista.

## OCR de imágenes con el motor nativo de Windows (sin instalar nada)

Sirve para cazar texto en otro idioma, rótulos y erratas en cientos de imágenes. No hay
Tesseract ni pytesseract en el equipo; el motor `Windows.Media.Ocr` sí está (idioma `es-ES`).

```powershell
# una o muchas imágenes por llamada; imprime "<ruta><TAB><texto>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\trickvault\_ocr.ps1 img1.jpg img2.jpg
```

Para lotes grandes: `python tools\trickvault\_ocr_todas.py` (1103 imágenes en ~70 s, lotes de
120 rutas por proceso; escribe `tools/trickvault/_ocr_resultado.tsv`) y luego
`python tools\trickvault\_detectar_ingles.py` para marcar las que tienen inglés.

**Trampa:** si el script imprime solo el nombre del fichero en vez de la ruta, no podrás
agrupar por carpeta; usa la ruta completa (ya corregido en `_ocr.ps1`).

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

**Regla de oro: commit por ruta explícita. NUNCA `git commit -a` ni `-am`** — escenifica
todo lo modificado del repo y publica trabajo ajeno o a medias (nos pasó el 2026-10-15).

```powershell
git -C E:\ANTIGRAVITY status --porcelain                 # ver qué hay tocado ANTES
git -C E:\ANTIGRAVITY add tools/memoria/bitacora.md      # SOLO lo mío, ruta explícita
git -C E:\ANTIGRAVITY -c user.name='atnojs' -c user.email='atnojs@gmail.com' commit -m "tipo(ambito): resumen"
git -C E:\ANTIGRAVITY show --stat HEAD                   # confirmar que solo va lo mío
git -C E:\ANTIGRAVITY push origin main
git -C E:\ANTIGRAVITY log --oneline origin/main..HEAD    # vacío = todo subido
git -C E:\ANTIGRAVITY status --porcelain ruta/fichero    # vacío = limpio
```

Alternativa ya existente en el repo: `tools/commit-aislado.ps1`.

## Git: ver qué se va a publicar de verdad (antes del push)

```powershell
git -C E:\ANTIGRAVITY diff --stat HEAD      # modificados sin commitear
git -C E:\ANTIGRAVITY show --stat HEAD      # lo que acaba de entrar en el último commit
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
