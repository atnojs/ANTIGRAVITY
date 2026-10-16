# Errores cometidos y cómo se resolvieron

Catálogo vivo. **Consúltalo antes de repetir un camino** que ya falló. Los errores del
agente se listan igual que los de la máquina: sin causa raíz, se repiten.

---

### [2026-10-16] La capa publicada también manda la CARPETA, y va por id: sacaba 5 tarjetas de «Carteles»

- **Síntoma:** tras regenerar las 10 tarjetas de `xl-carteles` con el zorro, la carpeta
  enseñaba **44** en vez de 49. Faltaban `/banner`, `/crosssection`, `/invitation`,
  `/museumplaque` y `/securitycam`.
- **Causa:** la capa publicada (`catalogo.json`) guarda `category` por **id**, y esos ids
  hoy son otras tarjetas: `ig-dcek-373: { category: 'xl-negocioredes' }` se aplicaba sobre
  `/banner` (de Carteles) y la sacaba de su carpeta. Igual con 376, 540, 570 y 004 (esta
  última apuntaba a una carpeta de otro navegador, `f_mv…`). `applyPublishedCatalogue`
  aplica la capa **encima** del catálogo, así que ganaba la entrada vieja.
- **Solución:** `tools/trickvault/_limpiar_capa_categorias.py`: para cada entrada con
  `category`, compara con la carpeta que el catálogo da hoy a ese id y **quita el campo**
  si no coincide (manda el catálogo). Quitó 9; respetó la única correcta
  (`ig-dcek-561` → `xl-moda`).
- **Regla que se repite:** todo lo que la app guarda **por id** (tarjetas, imágenes de la
  capa, categorías de la capa) envejece mal porque los ids son posicionales. Al tocar
  carpetas o renumerar, revisa `catalogo.json` además del HTML.
- **Cómo comprobarlo:** `tools/trickvault/_banco/_carpetas.html` con el banco: debe dar
  `carteles=49`, `moda=25`, `comida=26` y ninguna categoría huérfana.

### [2026-10-16] `if (git check-ignore -q f)` en PowerShell: comprobación falsa

- **Síntoma:** el `.gitignore` parecía no aplicar a `tools/trickvault/_xl-carteles_jobs.json` y me
  puse a «arreglar» algo que ya estaba bien.
- **Causa:** en PowerShell, `if (<comando nativo>)` evalúa la **salida** del comando, **no** su
  código de salida. `git check-ignore -q` no imprime nada, así que el `if` daba `$false` siempre
  y todo se reportaba como «VISIBLE».
- **Solución:** mirar `$LASTEXITCODE`:
  `git check-ignore -q --no-index $f; if ($LASTEXITCODE -eq 0) { 'ignorado' }`. Para depurar de
  verdad, `git check-ignore -v`, que dice **qué patrón y en qué línea** decide.
- **Cómo comprobarlo:** `git check-ignore -v --no-index <ruta>` imprime el patrón ganador; si
  imprime algo, el fichero está ignorado.

### [2026-10-16] Una negación `!` en `.gitignore` re-incluye **todos** los tipos, no solo el que quieres

- **Síntoma:** tras añadir `!tools/trickvault/_xl-*` para rescatar las specs `.json`, volvieron a
  `git status` 20 PNG de contacto, un `.txt` y dos `*_backup.py` que estaban ignorados.
- **Causa:** en `.gitignore` **gana el último patrón que coincide**, y una negación no distingue
  extensión: `!_xl-*` re-incluía `_xl-carteles_contact.png` (pisando el `*.png` global) y
  `!_reels_*` re-incluía `_reels_verificacion.txt`.
- **Solución:** negar **con extensión** (`!tools/trickvault/_xl-*.json`, `!_reels_*.py`) y dejar
  las exclusiones finales **después** de las negaciones
  (`tools/trickvault/_*_jobs.json`, `tools/trickvault/*_backup*`).
- **Cómo comprobarlo:** `git status --porcelain` debe quedarse en la única entrada esperada, y
  `git check-ignore -v` sobre un PNG de contacto debe seguir devolviendo un patrón.

### [2026-10-16] «La carpeta de descargas» no es `%USERPROFILE%\Downloads`, y el sandbox no deja escribir en `D:\`

- **Síntoma:** `Get-ChildItem "$env:USERPROFILE\Downloads"` no devuelve nada y termina con
  *exit code 1*. Al crear la carpeta del mes, `New-Item` falla con
  `Acceso denegado a la ruta de acceso '2026-09_Septiembre'`.
- **Causa:** son **dos** cosas. (1) En este equipo las descargas están redirigidas a
  **`D:\Descargas`** y `%USERPROFILE%\Downloads` no existe. (2) El sandbox DSH está en modo
  `workspace-write` y `D:\` cae **fuera** de `E:\ANTIGRAVITY`, así que toda escritura allí se
  deniega; no es un problema de permisos NTFS ni un fichero bloqueado.
- **Solución:** averiguar la ruta real en vez de suponerla
  (`(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path`) y
  reintentar **esa misma operación** con `sandbox_permissions: danger-full-access`, indicando
  en la justificación qué se va a mover y cuánto.
- **Cómo comprobarlo:** `Test-Path -LiteralPath 'D:\Descargas'` → `True`. Tras mover, el
  recuento y el tamaño del destino cuadran con el lote calculado **antes** de mover
  (el 2026-10-16: `705 objetos, 17.044,09 MB`, 0 fallos).

### [2026-10-16] Mover una tarjeta de carpeta en el catálogo NO la mueve si el navegador ya la tenía

- **Síntoma:** se partió «Comida y moda» en «Comida» + «Moda» (25 códigos movidos en
  `CODE_FOLDER`) y en un navegador nuevo salían 24/27 en vez de 25/26; en un navegador con
  datos guardados, `moda=0`.
- **Causa:** dos capas pisaban el catálogo. (1) `normalizeTrickCategory` **respeta la carpeta
  guardada** si sigue existiendo (`if (cat && folderIds.includes(cat)) return item;`), que es
  lo correcto para no pisar al usuario, pero deja la tarjeta en la carpeta vieja para siempre.
  (2) La **capa publicada** (`catalogo.json`) llevaba `ig-dcek-561: { category: 'xl-comidamoda' }`
  y `applyPublishedCatalogue` la aplica **encima**, así que incluso en un navegador limpio
  devolvía esa tarjeta a la carpeta vieja.
- **Solución:** apuntar los códigos movidos en **`CATEGORY_MOVES`** (la tabla que ya existía
  para `/patternfill`): se mueven una vez y solo una. Y corregir la `category` de la entrada
  de la capa publicada.
- **Cómo comprobarlo:** `tools/trickvault/_banco/_migracion.html` con el banco: simula el
  navegador viejo (lista de carpetas sin la nueva, nombre viejo, esquema 5 y las tarjetas en
  la carpeta vieja) y tras recargar debe dar 25/26, 23 carpetas y los nombres nuevos.

### [2026-10-16] Al verificar «en producción» hay que mirar que la página pida la URL de producción

- **Síntoma:** tres pruebas etiquetadas como «producción» daban resultados distintos de las
  locales y me llevaron a buscar un fallo inexistente.
- **Causa:** esas páginas del banco llevaban `/app/index.html` **fijo** y ignoraban el parámetro
  `?base=/prod` (solo lo soportaban algunas). Estaban probando **local** con la etiqueta de
  producción.
- **Solución:** todas las páginas del banco leen `BASE` de la query. Se comprobó que el fallo
  real era otro: el commit aún no estaba desplegado (Hostinger tarda entre 1 y 20 minutos; si
  pasan más de 20, un commit vacío reempuja el webhook).
- **Cómo comprobarlo:** comparar el tamaño en bytes del `index.html` servido con
  `git cat-file -s HEAD:apps/trickvault/index.html` antes de sacar conclusiones.

### [2026-10-15] «Hay tarjetas duplicadas»: no estaban en el catálogo, eran **fantasmas del navegador**

- **Síntoma:** Antonio ve varias tarjetas repetidas en «Comandos de texto». En el catálogo
  (el fichero) no hay ni un duplicado.
- **Causa:** el bloque de texto se ha **renumerado** al crecer el catálogo (`ig-dcek-NNN`
  pasa a `NNN+1`, y antes hubo saltos mayores). `mergeSeedCards` solo comparaba **el id**,
  así que la tarjeta vieja guardada en el navegador **se quedaba** y además entraba la nueva
  con el mismo código: dos tarjetas idénticas. Medido con las funciones reales de la app
  sobre 126 revisiones de git y 4 respaldos: `/story` llegaba a salir **4 veces**
  (ids 593+592+464+363); lo mismo `/brainstorm`, `/ultimate`, `/detailed`, `/pricing`.
  Peor aún: el fantasma que ocupa un id vivo **impide entrar** a la tarjeta legítima de ese id.
- **Solución:** en `mergeSeedCards`, descartar las tarjetas de catálogo cuyo id pertenece hoy
  a **otro** comando, respetando tarjetas personales, ediciones del usuario y
  `RESTORED_VARIANTS`. Se arregla solo en la siguiente recarga.
- **Lo que NO hay que hacer:** `flatMap` + `REMOVED_IMAGE_IDS` (el patrón de las tarjetas
  retiradas). Los ids fantasma son **hoy** ids vivos de otras tarjetas: apagaría entre 39 y
  120 tarjetas buenas (medido).
- **Cómo comprobarlo:** `tools/trickvault/_banco/_fantasmas.html` con el banco
  (`_run_banco.cmd`): fabrica 6 fantasmas en un navegador real y, tras recargar, deben quedar
  0 fantasmas y 0 códigos repetidos.

### [2026-10-15] El almacén de imágenes pisaba al catálogo y sus ficheros iban **desplazados**

- **Síntoma:** 235 tarjetas enseñaban la imagen de **otra** tarjeta (un perro en `/cityscape`,
  un cómic en `/nightcity`, un detective en `/polaroid`, un frasco de perfume en `/minifig`).
- **Causa:** dos problemas sumados. (1) `uploads/visual-ig-dcek-N.jpg` guarda la imagen de la
  tarjeta **N+1** (numeración vieja) y el almacén ganaba al repositorio. (2) La **capa
  publicada** (`catalogo.json`, publicada el 8-oct) va **por id** y también estaba desplazada:
  renombraba 26 tarjetas con el código de la vecina.
- **Solución:** la precedencia es determinista y manda el **repositorio**: tu imagen publicada
  > imagen propia (`ownImage`) > `data:` > `assets/<carpeta>/<codigo>.jpg` > almacén.
  `catalogo.json` se reencajó **por código** (que no cambia nunca) y se le quitaron las
  imágenes del almacén.
- **Cómo comprobarlo:** `tools/trickvault/_banco_generar.py` + `_run_banco.cmd` (navegador
  nuevo y con 1223 tarjetas ya guardadas y ensuciadas a propósito).

### [2026-10-15] Imágenes con texto en **inglés** pese a pedirlo en el prompt

- **Síntoma:** Antonio: «hay varias imágenes con texto en inglés, asegúrate de que todo el
  texto sea en español». La coletilla del prompt ya decía «with no English words».
- **Causa:** el modelo escribe rótulos en inglés por inercia (sobre todo en infografías y
  anuncios: «WORLD WAR II KEY TURNING POINTS», «MADE FRESH», «CHEAT SHEET»). La instrucción
  sola no basta y no había forma de **detectarlo**: a ojo son 1100 imágenes.
- **Solución:** OCR nativo de Windows (`tools/trickvault/_ocr.ps1`) pasado por las **1103**
  imágenes + detector por proporción de palabras función inglesas
  (`tools/trickvault/_detectar_ingles.py`). Salieron 10 de verdad; regeneradas y OCR de nuevo:
  0. La coletilla de los 1104 prompts se refuerza a «…with no English words: every sign,
  label, headline and button must be in Spanish, never in English».
- **Cómo comprobarlo:** `python tools\trickvault\_ocr_todas.py` y luego
  `python tools\trickvault\_detectar_ingles.py` (debe salir ~0).

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
