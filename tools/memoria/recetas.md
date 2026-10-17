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

## Organizar las descargas por mes (carpeta `YYYY-MM_Mes`)

La carpeta de descargas **no** es `%USERPROFILE%\Downloads` (no existe): `shell:Downloads`
apunta a **`D:\Descargas`**. Convención ya en uso allí: `2026-07_Julio`, `2026-08_Agosto`…
(verificado el 2026-10-16 con 705 objetos de septiembre).

```powershell
$p = 'D:\Descargas'
$mes = '2026-09'; $nombre = '2026-09_Septiembre'      # convencion YYYY-MM_Mes
$ini = [datetime]::ParseExact("$mes-01", 'yyyy-MM-dd', $null)
$fin = $ini.AddMonths(1)
$dest = Join-Path $p $nombre

if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }

Get-ChildItem -LiteralPath $p -Force |
  Where-Object { $_.LastWriteTime -ge $ini -and $_.LastWriteTime -lt $fin } |
  Where-Object { -not ($_.PSIsContainer -and ($_.Name -match '^\d{4}-\d{2}_' -or
                                                $_.Name -eq 'PortableApps' -or
                                                $_.FullName -eq $dest)) } |
  ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination $dest }

# verificar: recuento y tamano deben cuadrar con el lote calculado antes de mover
$d = Get-ChildItem -LiteralPath $dest -Force
"{0} objetos, {1:N2} MB" -f $d.Count, (($d | Where-Object { -not $_.PSIsContainer } |
  Measure-Object Length -Sum).Sum / 1MB)
```

**Las dos exclusiones no son opcionales** (si se mueven, se rompe algo):

- Carpetas de archivo `^\d{4}-\d{2}_`: su `LastWriteTime` es del mes en que **se crearon**,
  no del contenido. `2026-08_Agosto` tiene fecha 09/09/2026 y dentro están los de agosto.
- `PortableApps`: fecha 19/09/2026, pero es una instalación portátil de 2024.

**Trampa de entorno:** organizar descargas escribe en `D:\`, fuera de `E:\ANTIGRAVITY`, así
que el sandbox en modo `workspace-write` lo corta con *Acceso denegado a la ruta de acceso*.
Hay que reintentar esa operación con `sandbox_permissions: danger-full-access`.

**Antes de mover**, comprobar que el destino no exista y que no haya nombres repetidos en el
lote (`Group-Object Name | Where-Object Count -gt 1`); al venir de una carpeta plana no
debería haberlos, pero el destino podría tenerlos de una pasada anterior.

## TrickVault: publicar cambios desde la propia app (el flujo de Antonio)

Esto **no** es el flujo del agente. El del agente está en
`skills/SKILL_TRICKVAULT_IMAGENES.md` (generar imágenes → `assets/` → commit + push). Este es
el que usa **Antonio**, y **crea commits reales en `main`** que el agente no ha hecho.

### Cómo se hace (lado usuario)

1. Abrir la app (`https://atnojs.es/apps/trickvault/`).
2. Entrar en **modo edición** (candado → contraseña).
3. Al desbloquearse (`editUnlocked`), aparece **al final de la página, debajo de las tarjetas**,
   el panel **«🚀 Publicar en GitHub»** (`index.html`, ~líneas 6931-6958). Antes no existe en el
   DOM: sin la contraseña no hay botón.
4. En el panel:
   - **«Qué publicar:»** → `Solo lo que he cambiado (todas las carpetas)` o `Solo «<carpeta>»`.
   - **«🚀 Publicar cambios»**.
   - **«🔎 Comprobar conexión»** → diagnóstico (`action=estado`), no publica nada.
5. Al pulsar «Publicar cambios» sale un `window.confirm` con el resumen, y **solo si se acepta**
   se envía.

### Qué pasa por dentro

- `publicarCambios()` calcula la diferencia con el catálogo de serie (`buildPublishPayload`) y
  hace POST a `publicar.php` (`publishCatalogue`; FormData con `action=publicar`, `password`,
  `catalogo`, `imagenes`, `mensaje`).
- `publicar.php` **no lanza git** (en Hostinger están deshabilitados `exec`, `shell_exec` y
  `proc_open`): usa la **API de GitHub** (blobs → tree → commit → ref) y escribe **en un solo
  commit**:
  - `apps/trickvault/catalogo.json` — la capa de cambios;
  - `apps/trickvault/assets/publicado/<id>.jpg` — las imágenes propias.
- La contraseña se delega en `auth.php` (aquí no se guarda ni se conoce su hash). El **token de
  GitHub vive solo en el entorno del servidor** (`SetEnv` del `.htaccess` raíz) y nunca vuelve
  al navegador. Límites: 4 MB de JSON, 60 imágenes, 400 KB por imagen, 200 carpetas.
- El despliegue automático de Hostinger trae luego esos ficheros, así que el checkout del
  servidor queda limpio y el `pull` del despliegue no choca.
- La app espera hasta 10 × 3 s a que la capa publicada en el aire coincida
  (`loadPublishedCatalogue`) y entonces dice «✅ Publicado y ya en el aire».

### Consecuencia para el agente (importante)

Esos commits **aparecen en `main` de GitHub** sin pasar por el agente. Antes de tocar
`apps/trickvault/catalogo.json` o `assets/publicado/`, comprobar `origin/main` (o `git pull`):
si no, el push choca o se pisa lo que Antonio acaba de publicar.

### La confusión de «un montón de carpetas por subir» (no es un error)

En el `confirm` sale, cuando toca publicar carpetas:

```
• N carpetas y su orden
```

y ese **N es el TOTAL de carpetas** (`resumen.carpetas = listaCarpetas.length`), no las que han
cambiado. La lista de carpetas y su orden son datos **globales** que viajan en **todas** las
publicaciones a propósito (para que móvil, incógnito y cualquier otro navegador vean lo mismo),
y `foldersNeedPublish()` devuelve `true` si no hay capa publicada, si su `listaCarpetas` está
vacía, si difiere la lista o el orden, o si hay carpetas borradas pendientes.

O sea: ver «• 23 carpetas y su orden» al publicar dos tarjetas **no** quiere decir que vaya a
subir 23 carpetas de ficheros. Es el recuento informativo de la lista global. Para limitar de
verdad lo que se publica, usar **«Solo «<carpeta>»»**.

### Verificado el 2026-10-16

- `https://atnojs.es/apps/trickvault/publicar.php` por GET responde **405** con
  `{"success":false,"error":"Este endpoint solo acepta POST."}`, que es literalmente el mensaje
  de `publicar.php:507` → **lo desplegado es lo del repo**.
- El panel es cliente: solo se pinta con `editUnlocked` (`index.html:6931`) y va **después** de
  las vistas de tarjetas (`index.html:6881-6927`).
- **Lo que NO se comprobó:** el clic real en producción (hace falta la contraseña de edición).

## Verificar una app en Chrome con Playwright CLI (verificado 2026-10-17)

`@playwright/cli` **0.1.22** global → `E:\npm\playwright-cli.ps1` (ya en PATH). No descarga
navegadores: `--browser=chrome` usa el Chrome 155 instalado.

```powershell
$ev = 'tools\evidencias\2026-10-17-mi-app'; New-Item -ItemType Directory -Force $ev | Out-Null
Set-Location $ev                      # el CLI escribe .playwright-cli\ aquí (ignorado por git)
playwright-cli -s=miapp open https://atnojs.es/apps/mi-app/ --browser=chrome
playwright-cli -s=miapp snapshot      # refs e12, e32... (YAML en .playwright-cli\)
playwright-cli -s=miapp fill e32 "texto"
playwright-cli -s=miapp press Enter
playwright-cli -s=miapp screenshot --filename=01-resultado.png
playwright-cli -s=miapp console       # errores y warnings
playwright-cli -s=miapp requests      # red (--static para estáticas)
playwright-cli -s=miapp resize 393 844
playwright-cli -s=miapp screenshot --filename=02-movil.png
playwright-cli -s=miapp close
playwright-cli list                   # no debe quedar sesión
```

- **Sandbox:** en DSH `workspace-write` el navegador no arranca (`spawn EPERM`); hace falta permiso
  ampliado. En Claude Code no aplica.
- **No matar Chrome por nombre** (`Get-Process chrome | Stop-Process` se lleva también el de
  Antonio): cerrar con `-s=<app> close`.
- Detalle del flujo y checklist: skill `verificacion-playwright`
  (`skills/SKILL_VERIFICACION_PLAYWRIGHT.md`).

## Añadir un código nuevo a TrickVault (tanda tipo Xabatz) — verificado 2026-10-17

Un código de **imagen** necesita 4 sitios en `apps/trickvault/index.html`; uno de **texto**, 3:

1. `CODE_FOLDER`: `'/codigo': 'xl-<carpeta>'`.
2. La lista de comandos que toque (`ADDITIONAL_IMAGE_COMMANDS`, `CAPTURE_COMMANDS`, `REEL_COMMANDS`…):
   `['/codigo', 'descripción corta en español']`.
3. `PROMPT_TEMPLATES` (imagen) o `TEXT_COMMAND_TEMPLATES` (texto).
4. Solo imagen: el ejemplo. Pista en `tools/trickvault/_ejemplos_<carpeta>.json` con la clave del id
   (`ig-dcek-NNN`) y **el sujeto único de esa carpeta**.

**Cuidado con las comas:** la última entrada de cada bloque no lleva coma; si se inserta después
sin añadirla, el JSX rompe (pasó y lo cazó `validar`). Los ids son posicionales: añadir al final
del array no desplaza los existentes.

Generar y registrar (Python 3.12 del proyecto, con Pillow):

```powershell
$py='C:\Users\atnojs\AppData\Local\Programs\Python\Python312\python.exe'
& $py tools\trickvault\_carpeta_lote.py <carpeta> plan      # da el id nuevo y el pendiente
& $py tools\trickvault\_carpeta_lote.py <carpeta> rehacer <id>   # solo ese (backup antes de los _xl-*.json versionados)
& $py tools\trickvault\_carpeta_lote.py <carpeta> aplicar  # PNG→JPG, SEED_COMMAND_IMAGES y release
& $py tools\trickvault\_carpeta_lote.py <carpeta> validar  # sintaxis JSX con @babel/parser
```

Después: revisar las imágenes generadas en una hoja de contacto (que coincidan con el prompt y el
código), commit + push, esperar el despliegue y verificar en producción con
`verificacion-playwright`: buscar el código, comprobar que aparece su carpeta y que la imagen
carga (`naturalWidth > 0`), consola y red.
