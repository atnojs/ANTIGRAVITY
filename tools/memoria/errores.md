# Errores cometidos y cómo se resolvieron

Catálogo vivo. **Consúltalo antes de repetir un camino** que ya falló. Los errores del
agente se listan igual que los de la máquina: sin causa raíz, se repiten.

---

## Errores de criterio (los que más caro salen)

---

### [2026-10-15] `git commit -am` arrastró trabajo ajeno a un commit ya publicado

- **Síntoma:** quise anotar **una línea** en `tools/memoria/bitacora.md` y el commit
  resultante (`119901a`) salió con **21 ficheros y 1450 inserciones**: `apps/json/` completo
  (`app.js`, `app.css`, `index.html`), `skills/SKILL_VIDEOVAULT_VIDEOS.md` y una docena de
  ficheros de datos de `tools/trickvault/`. Todo eso eran cambios pendientes de otra
  sesión, sin commitear. Al hacer push, **se publicaron** en Hostinger.
- **Causa:** `git commit -am` equivale a `git add -u`: escenifica **todo lo modificado** del
  repositorio, no solo lo mío. Y el push posterior los desplegó.
- **Solución:**
  1. Nunca `-a`. Commit siempre por ruta explícita:
     `git add tools/memoria/bitacora.md && git commit -m "..."` (sin `-a`).
  2. Antes de escribir el mensaje, comprobar `git status --porcelain` y, tras commitear,
     `git show --stat HEAD` — **antes** de hacer push.
  3. Para commits de un solo cambio existe `tools/commit-aislado.ps1`.
  4. **No se revirtió a propósito:** deshacer ese commit habría borrado del disco el trabajo
     pendiente de la otra sesión. Se dejó publicado y se avisó.
- **Lección:** el mensaje del commit es lo de menos; el daño es publicar trabajo que no era
  tuyo ni estaba listo. Un `-a` convierte un cambio de una línea en un despliegue.

---

### [2026-10-15] `Get-NetTCPConnection` devuelve vacío SIN error → conclusión falsa

- **Síntoma:** informé a Antonio de que "nadie escuchaba en el puerto 20128" y que el
  gateway estaba caído, cuando en realidad estaba funcionando.
- **Causa:** `Get-NetTCPConnection` se apoya en CIM/WMI, y el sandbox del agente lo deniega
  **devolviendo una lista vacía en silencio**, sin lanzar error. Un vacío se interpretó
  como "no hay nada escuchando".
- **Solución:** comprobar con herramientas que no pasan por CIM:
  ```powershell
  netstat -ano | Select-String ":20128\s" | Select-String 'LISTENING'
  # o un connect TCP puro
  $t = New-Object System.Net.Sockets.TcpClient; $t.Connect('127.0.0.1',20128); $t.Dispose()
  ```
- **Verificación:** el propio daemon confirmó el estado (`Gateway ya escuchando`).
- **Lección:** un resultado vacío puede ser un fallo de permisos, no una ausencia real.
  Ante una conclusión negativa, confirmarla por una segunda vía.

### [2026-10-15] Se abría una terminal sola en cada arranque (OmniRoute v1)

- **Síntoma:** ventana de Windows Terminal titulada *New Session* con el banner de OmniRoute,
  al iniciar sesión y en algunos reintentos.
- **Causa:** el daemon v1 lanzaba el gateway con
  `subprocess.Popen([r"...\npm\omniroute.cmd", "serve"], creationflags=DETACHED_PROCESS)`.
  Un `.cmd` **no es un ejecutable**: Windows arranca `cmd.exe` para interpretarlo, y con
  `DETACHED_PROCESS` ese `cmd.exe` **crea una consola nueva**. La bandera que evita la
  consola es `CREATE_NO_WINDOW`, no `DETACHED_PROCESS`. Evidencia: la cadena de procesos era
  `cmd.exe /c ...omniroute.cmd serve` → `node bin/omniroute.mjs serve`.
- **Solución:** versión 2 del daemon — `pythonw.exe`, `node.exe` directo sobre
  `bin/omniroute.mjs`, `CREATE_NO_WINDOW | DETACHED_PROCESS`, stdio a `DEVNULL`, candado de
  instancia única. Ficheros en `tools/omniroute/`; guía completa en
  `tools/omniroute/GUIA-OMNIROUTE.md`.
- **Verificación:** `tasklist /v` devuelve `N/D` (sin ventana) para `pythonw` y los `node`;
  ya no aparece ningún `cmd.exe` en la cadena.
- **Commit:** `f65fa58`

### [2026-10-15] Diagnóstico inicial incompleto de esa misma ventana

- **Síntoma:** tras leer el script concluí que "no abre ningún navegador" (cierto) y atribuí
  la pestaña de Chrome a la restauración de sesión. Con eso dejé la ventana de terminal sin
  explicar, dando a entender que no venía de nuestro montaje.
- **Causa:** teorizar sobre el código antes de **mirar la cadena de procesos real**.
- **Solución:** `Get-CimInstance Win32_Process` con el filtro `CommandLine -match 'omniroute'`
  enseñó el `cmd.exe` intermedio y cerró el caso en un comando.
- **Lección:** con procesos, primero la foto real; después la teoría.

### [2026-10-15] El instalador cogía el `pythonw` del venv de Hermes

- **Síntoma:** `instalar-autostart.ps1` eligió
  `C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\pythonw.exe`.
- **Causa:** `Get-Command python.exe` devuelve lo primero del PATH, y el PATH empieza por el
  venv de Hermes. Ese intérprete no es nuestro y puede desaparecer al recrear el venv.
- **Solución:** buscar en instalaciones estándar (`%LOCALAPPDATA%\Programs\Python\Python3*`,
  `C:\Python3*`, `Program Files\Python3*`) y **descartar cualquier ruta con `\venv\`**;
  parámetro `-Python` para forzarlo.
- **Verificación:** el instalador imprime ahora `pythonw: ...\Programs\Python\Python312\pythonw.exe`.

### [2026-10-15] El fichero de secreto se escribía con BOM

- **Síntoma:** en PowerShell 5.1, `Set-Content -Encoding UTF8` antepone un BOM. El daemon lee
  ese fichero como `CLAVE=valor` y la primera clave habría quedado como `\ufeffOMNIROUTE_DASH_PW`,
  es decir, invisible → "password no configurada" en el otro PC.
- **Causa:** el BOM que mete PS 5.1 con `-Encoding UTF8`.
- **Solución:** escribir esos ficheros con `-Encoding ASCII` (o `UTF8Encoding($false)`).
- **Verificación:** `read` del fichero sin caracteres raros al principio.

### [2026-10-15] `pwsh` no se reconoce

- **Síntoma:** `pwsh : El término 'pwsh' no se reconoce...`
- **Causa:** este equipo tiene **Windows PowerShell 5.1**, no PowerShell 7.
- **Solución:** usar `powershell.exe`. (Ya estaba avisado en un preset de DSH; se confirmó
  por las malas.)

### [2026-10-15] La política de ejecución bloquea los `.ps1`

- **Síntoma:** `no está firmado digitalmente. No se puede ejecutar este script`.
- **Causa:** `ExecutionPolicy` restrictiva.
- **Solución:** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "ruta\script.ps1"`.

### [2026-10-15] "Windows Job runner exited with exit code 4294967295" — y el comando SÍ se había ejecutado

- **Síntoma:** el instalador devolvía ese error tres veces seguidas. Parecía que no se
  ejecutaba nada.
- **Causa real:** el runner espera a que su **rango de procesos gestionado** quede vacío; si
  el comando lanza procesos que sobreviven (o el árbol no se cierra), aborta con ese código.
  Pero el script **ya había hecho su trabajo**: los ficheros estaban escritos y los
  lanzadores v1 retirados (se veían los `.bak-20261015-2248xx`).
- **Solución:** no repetir a ciegas. Verificar el estado del sistema antes de reintentar
  (ver los `.bak`, los ficheros destino, el log) y ejecutar los pasos de forma directa en
  lugar de anidar `powershell.exe -File`.
- **Extra:** para arrancar un proceso de larga duración **despegado** del job:
  ```powershell
  $cmd = '"C:\...\pythonw.exe" "E:\hermes-data\omniroute_autostart.py" daemon'
  ([wmiclass]'Win32_Process').Create($cmd)   # ReturnValue=0, PID independiente
  ```
- **Lección:** un error del harness no implica que el efecto no ocurriera. Riesgo real:
  duplicar trabajo.

### [2026-10-15] Los globs recursivos agotan el timeout

- **Síntoma:** `glob **/*memoria*` y `**/CLAUDE.md` → `tool call timed out after 30000ms`.
- **Causa:** el árbol tiene `node_modules`, backups y miles de ficheros.
- **Solución:** rutas concretas, `Get-ChildItem -Depth N` o `-Include` acotado. Para buscar
  contenido, `Select-String` sobre directorios concretos, nunca sobre la raíz entera.
