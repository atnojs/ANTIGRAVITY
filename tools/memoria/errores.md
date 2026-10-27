## 2026-10-27 — Verificar una app en «modo local» es no verificar nada

- **Qué pasó:** la app `unified-image-studio-hoola` se dio por verificada con 12 pruebas ejecutadas
  sobre un servidor estático con `*.php` → 503 («modo local»). Pasó el gate de calidad.
- **Qué estaba roto en realidad contra el servidor:** la importación no creaba capa visible, el ojo
  de capas no repintaba, el inpainting y «quitar el fondo con IA» devolvían 400 por usar el modelo de
  Flow, el resultado de la máscara se aplicaba centrado como capa nueva, los deslizadores no marcaban
  su valor y el pincel mostraba una cruz. Ninguna de esas cosas era visible en local.
- **Agravante propio:** al subir la versión de caché del frontend solo se cambió `app.js`; los
  módulos internos seguían con `?v=12`. Eso cargó **dos copias** de `core.js` y, con ellas, dos
  estados: la capa entraba en uno y la pantalla leía el otro.
- **Reglas que quedan escritas:** en `skills/SKILL_AUTOCALIDAD_90.md` §8-bis (prohibido verificar en
  modo local; comprobar producción tras desplegar; una sola copia de cada módulo; persistencia real)
  y en `skills/SKILL_VERIFICACION_PLAYWRIGHT.md` (contar módulos, comprobar el efecto del clic).
- **Prueba permanente:** `tools/pruebas/humo-uis-hoola.mjs` comprueba contra producción las cuatro
  cosas que fallaron: versión única de módulos, importación visible, máscara pintada y envío del
  trabajo de inpainting.

---
## 2026-10-27 — Cancelación que mataba cada generación al empezar

- **Síntoma:** los trabajos se quedaban en `running` para siempre, sin Chrome y sin archivo.
- **Causa:** el agente pregunta cada 3 s `agent.cancelled` mandando `{"id": …}` en el cuerpo JSON,
  pero el endpoint leía el id de `$_GET`/`$_POST`; con el id vacío `uis_safe_id('')` falla y
  `uis_flow_cancelled('')` devuelve `true` → el agente mataba la generación recién nacida.
  En paralelo, `api()` no aceptaba el parámetro `extra_query` con el que se enviaba el id en la URL,
  así que esa consulta lanzaba `TypeError` y se tragaba en un `except`.
- **Lección:** cuando un endpoint recibe datos del agente, hay que aceptar **cuerpo JSON y
  formulario**, no solo `$_REQUEST`. Y una pregunta de tipo «¿cancelo?» debe **fallar en cerrado
  del lado seguro**: si el id no es válido, responder «no canceles» es más seguro que «cancela».
- **Corregido:** el endpoint lee el cuerpo JSON (y `$_GET`), el agente manda el id también en la URL
  (funciona con servidor nuevo y antiguo) y `api()` acepta `extra_query`. Verificado con generación
  real en producción y con parada real.

---
## 2026-10-26 — Chrome no puede escribir el bloqueo del perfil de Flow: «Acceso denegado (0x5)»

- **Síntoma:** el agente falla siempre con `RuntimeError: Event loop is closed`; dentro del log,
  el error verdadero es `Failed to create a ProcessSingleton for your profile directory`, con
  `Crashpad\settings.dat: Acceso denegado. (0x5)` y `Lock file can not be created`.
- **Diagnóstico correcto (lo que costó tiempo):** no era una colisión de dos Chrome. El usuario
  podía crear archivos en `E:\herramientas\google-flow\session\flowbot-profile` desde PowerShell,
  no había reglas `Deny` en las ACL y no había ningún Chrome abierto. Aun así, el proceso `chrome.exe`
  no podía crear su lock en esa carpeta, ni a mano ni desde el Programador de tareas.
- **Solución:** copiar el perfil a `E:\ANTIGRAVITY\tools\flow-agent\session\flowbot-profile`
  (ignorada por Git) y apuntar `flow_profile` de `agente.json` a esa ruta. Con la copia dentro del
  espacio de trabajo, Chrome arranca y Flow genera con normalidad. Verificado con 3 generaciones
  reales subidas a producción.
- **Lecciones:**
  1. `RuntimeError: Event loop is closed` de Playwright es **ruido**: tapaba el error real. Por eso
     `summarize_error` filtra el cierre de asyncio y cada trabajo guarda `logs/<id>.log`.
  2. Antes de tocar permisos, reproducir el fallo en una ruta alternativa y comparar.
  3. El agente debe comprobar el perfil **antes de reclamar** trabajo; si se ocupa después, se
     **aplaza** (`agent.release`) en vez de marcar el trabajo como fallido.
- **Efecto colateral corregido:** lanzar PowerShell y `flow.py` desde `pythonw` abría ventanas de
  consola que se cerraban solas. Ahora ambos usan `CREATE_NO_WINDOW` (`NO_WINDOW` en el código).

---
# Errores cometidos y cómo se resolvieron

Catálogo vivo. **Consúltalo antes de repetir un camino** que ya falló. Los errores del
agente se listan igual que los de la máquina: sin causa raíz, se repiten.

---

### [2026-10-25] El despliegue de Hostinger revirtió la app a un commit anterior y los `?v=` no bastaron

- **Síntoma:** tras publicar los botones del historial de `apps/infografia-referencia` (commit
  `85ee9983`) y comprobarlos en producción, minutos después la URL servía otra vez la versión
  anterior: `index.html` citaba `app.css?v=9`/`app.js?v=11`, `app.js` medía 14.557 B sin
  `history-action-btn` y el `Last-Modified` era 16:56:21. Antonio lo vio como «no veo los botones ni
  refrescando ni en incógnito».
- **Causa:** la cola de despliegue de Hostinger aplica webhooks atrasados/fuera de orden y cada
  entrega sincroniza el árbol completo; una entrega de un commit anterior (docs `9fe4b110`) se
  ejecutó después de la del commit nuevo y revirtió los ficheros en el origen. No era caché del
  navegador (el HTML se sirve `x-hcdn-cache-status: DYNAMIC`) ni error de la app: GitHub tenía la
  versión nueva. Además la CDN cachea estáticos **por ruta** e ignora `?v=`, así que aunque el HTML
  se refresque, `app.css`/`app.js` pueden llegar viejos.
- **Solución:** (1) assets con fecha nueva (`app.20261025a.css` y `app.20261025a.js`, copias
  exactas) y `index.html` apuntando a ellos; (2) commit aislado + push (`415132d7`) para re-disparar
  el despliegue. En ~1 min el origen sirvió los assets nuevos (rutas nunca cacheadas).
- **Verificación:** `GET` a la URL **sin parámetros** → cita `app.20261025a.css/js`;
  `app.20261025a.js` 19.169 B (26.491 B el CSS; ojo: 19.123 y 26.457 son longitudes de cadena,
  no bytes, por los acentos UTF-8) con `history-action-btn`; en Chrome limpio sobre la URL normal:
  12 tarjetas con 3 acciones, descarga real (1.474.295 B, PNG 768×1376, SHA-256 = fichero servido) y
  «Referencia cargada». Si un usuario aún viera lo viejo, `Ctrl+F5` (el HTML no está cacheado en CDN,
  pero su navegador puede conservarlo).
- **Lección:** no dar por publicado hasta comprobar el **origen sin query** y varios minutos después
  (`Last-Modified` + contenido), y usar assets renombrados con fecha en cada publicación de app:
  `?v=` no protege de la CDN de Hostinger.

---

### [2026-10-25] El ojo no se podía alcanzar con Tab en un modal que atrapa el foco

- **Síntoma:** el verificador independiente (defecto D1) comprobó en producción que en
  `apps/unified-image-studio/` el ojo no era accesible con el teclado: 20 pulsaciones de Tab
  ciclaban entre los 5 controles del `#loginModal` sin llegar al botón. Ratón y `Alt+Shift+P` sí
  funcionaban.
- **Causa:** el modal usa `backdrop-filter`, que crea bloque contenedor para `position:fixed`; para
  que el ojo quedara en el sitio correcto se montaba en `body`, fuera del modal y, por tanto, fuera
  de su trampa de foco.
- **Solución:** cuando el control se monta en `body`, se inserta junto al campo un botón puente de
  1×1 px (`clip-path`, solo teclado) con el mismo `aria-label`/`aria-pressed`, que sí está dentro
  del modal y entra en la trampa de foco; al enfocarse dibuja el anillo de foco sobre el ojo visible
  y al activarse (Enter/Espacio) alterna la contraseña y devuelve el foco al campo. El control
  visible pasa a ser un `<span aria-hidden>` (solo ratón) para no duplicar semántica.
- **Verificación:** en `unified-image-studio`, `trickvault` y la raíz, Tab desde el campo llega al
  puente, Enter alterna y el foco vuelve al campo; smoke local 165/165 OK. Commit `c4e9a916`.

### [2026-10-25] Los `admin.php` con dos ramas se quedaban sin el visor en la pantalla de login

- **Síntoma:** tras inyectar la etiqueta del visor, `apps/paginas/web_app/admin.php` y su copia de
  `webs/web_app/` seguían mostrando el formulario de contraseña sin ojo.
- **Causa:** el inyector insertaba la etiqueta solo antes del **último** `</body>` del fichero.
  Esos PHP tienen dos `<body>`/`</body>` (login y panel) y la primera rama termina en `exit;` antes
  de llegar al final, así que la etiqueta caía en la rama que no se ejecutaba.
- **Solución:** para ficheros `.php` el inyector inserta la etiqueta antes de **cada** `</body>`;
  para `.html` mantiene solo el último (hay páginas que llevan `</body>` dentro de plantillas JS).
  Aplicado en `tools/inject-password-eye.mjs` y comprobado en las dos ramas.
- **Verificación:** `webs/web_app/admin.php` y `apps/paginas/web_app/admin.php` sirven la etiqueta
  en su login (comprobado en producción con `?cb=`) y el smoke carga ambas páginas OK.

### [2026-10-25] El smoke en local daba falsos fallos por `alert()` y por contar campos que no se ven

- **Síntoma:** 7 páginas marcadas como fallo sin serlo: 2 se quedaban con `timeout CDP
  Runtime.evaluate` y 5 decían «ojos visibles 0 < campos visibles 1».
- **Causa:** (a) páginas legacy abren un `alert()` al cargar porque en el `php -S` local falta un
  JSON de datos; el diálogo bloquea el renderer y la evaluación CDP nunca vuelve; (b) el criterio de
  visibilidad del smoke solo miraba `display`/`visibility`/tamaño: contaba campos con `opacity:0` o
  muy por debajo del viewport como «visibles», y en esas páginas el ojo está (correctamente) oculto.
- **Solución:** el smoke atiende `Page.javascriptDialogOpening` y acepta el diálogo; el criterio de
  visibilidad exige intersección con el viewport y opacidad acumulada de antecesores. En el
  componente se añadió también la opacidad acumulada (una caja `opacity:0` ocupa sitio y tapaba el
  ojo).
- **Verificación:** rerun de las páginas afectadas OK y smoke completo local y producción 165/165 OK.

---

### [2026-10-24] El valor real de una contraseña acabó en un docblock de un fichero versionado

- **Síntoma:** la contraseña de ACCESO del proyecto (la de publicar en TrickVault) aparecía en
  claro en `auth/lib.php`, en `tools/memoria/` y en `tools/rotar-password.ps1`, todos versionados
  en un repositorio **público**. El mismo valor se reutilizaba como `DB_PASS` en `.env` antiguos
  y quedó en logs de agentes, export de Bitwarden y sesiones comprimidas.
- **Causa:** el docblock decía «ejemplo, no versionar» pero llevaba el valor real; la memoria del
  proyecto también lo copió. Un repositorio público no tiene «zona privada»: cualquier valor
  escrito en un fichero versionado es público para siempre mientras exista en el historial.
- **Solución:** retirar el valor de todos los sitios públicos: sustituirlo por placeholders en
  código y memoria, reescribir el historial con `git filter-repo --replace-text`, publicar con
  `force-with-lease` (autorizado) y purgar objetos locales con `reflog expire` + `gc --prune=now`.
  Si el dueño quiere seguir usando la misma contraseña, el servidor debe guardar **solo**
  `PW_ACCESS_SHA256` en el `.htaccess` (el valor en `.private/`, fuera de git). Limpiar también
  copias, backups comprimidos, sesiones de agentes y bases SQLite.
- **Verificación:** `git log -S` sin resultados, escaneo de todos los objetos (2,1 GB, 0
  ocurrencias), contraseña original 200 / temporal 403 en `/auth/validar.php`, y escaneo del
  servidor (8.626 ficheros, 0 ocurrencias).

### [2026-10-22] Ventana de terminal cada 2 minutos: el `pythonw.exe` de un venv era el de consola

- **Síntoma:** cada ~2 min aparecía sola una ventana de Windows Terminal con consola negra y título
  `C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\pythonw.exe`; Antonio la cerraba y
  volvía a salir («cada dos por tres»).
- **Causa:** la tarea programada `FlowStudioWorker` (trigger cada 2 min, `--minutes 6`) lanzaba ese
  `pythonw.exe`, pero el fichero del venv de Hermes era **idéntico byte a byte a `python.exe`**
  (mismo SHA-256 `45BC142F…`) y con subsistema **CONSOLE (3)** en la cabecera PE, no GUI. Un
  `pythonw` de consola lanzado por el Programador de tareas crea una consola nueva y visible, con la
  ruta completa del exe como título. El venv se generó mal (el `pythonw` es una copia del de consola);
  la tarea estaba bien configurada.
- **Solución:**
  1. Parar y deshabilitar la tarea para poder sustituir el exe:
     `Disable-ScheduledTask FlowStudioWorker; Stop-ScheduledTask FlowStudioWorker`.
  2. Guardar copia: `venv\Scripts\pythonw.exe.console-original` (45.568 B, CONSOLE).
  3. Sustituirlo por el lanzador **GUI** correcto de la misma distribución Python 3.11:
     `C:\Users\atnojs\AppData\Roaming\uv\python\cpython-3.11-windows-x86_64-none\Lib\venv\scripts\nt\pythonw.exe`
     (249.856 B, subsistema GUI) → `venv\Scripts\pythonw.exe`.
  4. Reactivar la tarea (`Enable-ScheduledTask`). No hay que tocar la tarea.
  Playwright ya lanza su driver `node` con `STARTUPINFO` + `SW_HIDE`, así que con `pythonw` GUI no
  aparecen consolas hijas al generar.
- **Verificación:**
  - Cabecera PE del nuevo `pythonw.exe` = **GUI (2)** y su hash ya no coincide con `python.exe`.
  - `pythonw.exe` con redirección: `sys.prefix` = venv de Hermes y `PIL` importa desde
    `venv\Lib\site-packages` (el venv sigue activándose; con `print` sin salida no falla).
  - `Start-ScheduledTask FlowStudioWorker` y enumerar ventanas visibles con `EnumWindows`: **no
    aparece ninguna ventana nueva**; el árbol es `pythonw.exe` (GUI) → `pythonw.exe` base; la tarea
    queda `Running` y `flow_studio_worker.lock` se crea con el PID correcto.
  - Si se recrea el venv de Hermes, repetir la comprobación: el lanzador bueno es el de
    `Lib\venv\scripts\nt\pythonw.exe` de la distribución base (GUI), no una copia de `python.exe`.
- **Commit:** el de esta entrada en `tools/memoria/`.

### [2026-10-22] Flow falla en 2 s: Chrome con el perfil abierto y lock del worker zombi

- **Síntoma:** los trabajos de la cola de Flow Studio pasaban a `error` a los dos segundos y el
  mensaje solo mostraba el final de un traceback de `asyncio` (`RuntimeError: ... base_events.py`),
  sin decir nada útil.
- **Causa real (dos a la vez):**
  1. Había un Chrome abierto a mano con `--user-data-dir=E:\herramientas\google-flow\session\flowbot-profile`
     (para capturar la UI de Flow con REA). Playwright **no puede abrir un perfil persistente que ya
     está en uso**: `flow.py` revienta al arrancar el contexto.
  2. Al matar un worker anterior quedó `flow_studio_worker.lock`, y el lock solo caducaba por
     antigüedad (30 min): todo worker nuevo salía con «otro worker en marcha» sin tocar la cola.
- **Solución:**
  - Cerrar los Chrome que usen `flowbot-profile` antes de generar:
    `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ? { $_.CommandLine -match 'flowbot-profile' } | % { Stop-Process -Id $_.ProcessId -Force }`.
  - El worker guarda su PID en el lock y comprueba con `OpenProcess`/`GetExitCodeProcess` si sigue
    vivo: un lock huérfano se libera al instante.
  - El worker resume el error real (`^AlgoError:`) en vez de las últimas líneas del traceback.
- **Regla:** no dejar Chrome abierto con el perfil de Flow mientras se genera; y todo lock propio
  debe llevar PID, no solo marca de tiempo.

---

### [2026-10-21] Mover los PCs de habitación: Windows pone la red en Pública y deja de compartir

- **Síntoma:** dos PCs en la misma red doméstica (`PRINCIPAL` 192.168.18.205 y `ANTONIO`
  192.168.18.10). Después de cambiarlos de habitación, `ANTONIO` no ve a `PRINCIPAL` en «Red» y al
  abrir `\\ANTONIO` desde `PRINCIPAL` sale «Windows no puede obtener acceso» / «acceso denegado».
  Internet funcionaba en ambos y los dos se respondían a `ping` (misma subred).
- **Causa:** al mover los equipos cambió la puerta de enlace (antes un TP-Link, ahora el router
  Huawei `EG8147X6` de fibra) y Windows creó un perfil de red nuevo, **«Red 3»**, que clasifica como
  **Pública** (19/10 a las 12:49, 14:33, 14:40 y 15:09; antes era «Red», Privada, hasta el 16/10).
  En Pública Windows apaga descubrimiento y compartición y deja **parado `FDResPub`** (publicación
  de recursos), así que el otro PC no ve a este. Además Windows 11 actual exige **firma SMB** por
  defecto, y la firma es incompatible con el **acceso de invitado** que usa esta red (cuenta
  Invitado activa y carpetas compartidas a «Todos»): de ahí el «acceso denegado» al abrir el otro
  equipo.
- **Solución (PowerShell elevado, en cada PC):**
  `Set-NetConnectionProfile -InterfaceAlias Ethernet -NetworkCategory Private`;
  `Set-Service FDResPub -StartupType Automatic; Start-Service FDResPub; Start-Service upnphost`;
  habilitar las reglas del perfil **Privado** de «Detección de redes» (20) y «Compartir archivos e
  impresoras» (17) con `Enable-NetFirewallRule`;
  `Set-SmbClientConfiguration -EnableInsecureGuestLogons $true -Force`;
  `Set-SmbClientConfiguration -RequireSecuritySignature $false -Force`;
  `Set-SmbServerConfiguration -RequireSecuritySignature $false -Force`.
  En el segundo PC se dejó `D:\arreglo-red\arreglar-antonio.bat` (autoeleva el mismo arreglo).
- **Verificación:** `Get-NetConnectionProfile` → «Red 3 / Private»; `Get-Service FDResPub` →
  Running; `dir \\ANTONIO\Users` lista sin contraseña y `dir \\192.168.18.205\D` responde como
  invitado. En `ANTONIO` solo `Users` está abierto a invitado; C/D/E/F piden usuario y contraseña.
- **Commit:** el de esta entrada en `tools/memoria/` (2026-10-21).

### [2026-10-21] Pegar el bloque de contraseñas con vallas de Markdown rompe el `.htaccess`

- **Síntoma:** `/auth/validar.php` devolvía `configurado:false` aunque el `.htaccess` «ya estaba».
  La captura del editor mostraba las directivas `SetEnv` pegadas todas en una misma línea (con el
  valor de acceso incluido), con backticks (` ``` `) y repetido dos veces.
- **Causa:** al copiar el bloque de código del chat se pegaron las **vallas de Markdown** y se
  perdieron los saltos de línea. Apache no encuentra ninguna directiva `SetEnv` válida; peor aún,
  una línea que empiece por `apache …` puede tumbar el sitio entero (HTTP 500).
- **Solución:** borrar esas líneas y escribir **a mano** las dos directivas, una por línea, sin
  backticks ni prefijos: `SetEnv PW_EDIT "0"` y `SetEnv PW_ACCESS "…"`. Guardar y **recargar el
  archivo** para comprobar que quedaron separadas.
- **Verificación:** `GET https://atnojs.es/auth/validar.php` → `"configurado":{"edicion":true,"acceso":true}`
  y el sitio en HTTP 200.

### [2026-10-21] `git commit -- <carpeta>` falla si la carpeta es nueva y no está en el índice

- **Síntoma:** `git commit -m "…" -- auth apps webs …` abortó con
  `error: pathspec 'auth' did not match any file(s) known to git`, y el commit no se hizo.
- **Causa:** el modo pathspec de `git commit` solo resuelve rutas **conocidas** por git; `auth/`
  era una carpeta nueva sin trackear. Además el índice es compartido entre sesiones, así que no
  conviene un `git add -A` genérico.
- **Solución:** `git add -A -- auth` (solo la ruta nueva) y después
  `git commit -m "…" -- auth apps webs Paginas validar_password.php guardar_cambios.php`; se
  comprueba con `git show --name-only --pretty=format: HEAD`.
- **Verificación:** el commit lista exactamente los 118 ficheros del encargo y
  `git status` sigue sin incluir `skills/SKILL_VIDEOVAULT_VIDEOS.md` (modificado por otra sesión).

### [2026-10-21] `git commit` con el índice compartido se llevó 3 renames de otra sesión

- **Síntoma:** al commitear **solo** `apps/trickvault/index.html` (con `git add` de esa ruta), el
  commit `d856caa` incluyó además tres renames `{apps => tools}/brisa/...` que otra sesión tenía
  **staged** en el mismo repositorio.
- **Causa:** el índice (`.git/index`) es del repositorio, no del proceso. `git add <mi ruta>` no
  aísla lo que otro ya había escenificado: un `git commit -m "..."` sin pathspec commitea **todo**
  lo que está en el índice.
- **Solución:** commitear por **pathspec en el propio commit**:
  `git commit apps/trickvault/index.html -m "..."` (equivale a add+commit solo de esas rutas e
  ignora el resto del índice). Con dos sesiones en el mismo árbol, revisar antes
  `git diff --cached --name-only` si el encargo es pequeño.
- **Verificación:** `git show --name-only --pretty=format: HEAD` debe listar únicamente los
  ficheros del encargo.

### [2026-10-21] Borrar una carpeta a mano en el servidor NO la elimina: el despliegue la repone

- **Síntoma:** Antonio borró `apps/agenda` en el servidor; la ruta seguía sirviendo la app **vieja**
  (title antiguo, `auth.php` con `"version":"1.0.0"`, `api/health` 404) y la versión nueva tardó
  >10 min en aparecer. La `Last-Modified` del `index.html` era posterior al push.
- **Causa:** el webhook iba atrasado y desplegó un commit **anterior** (que aún tenía la agenda
  vieja). Cualquier despliegue posterior restaura las carpetas versionadas, así que borrar a mano
  no sirve de nada. Lo único que sustituye una carpeta es **cambiarla en Git**. Además la cola de
  despliegue de Hostinger aplica los commits **de uno en uno y en orden**: tras un push puede
  seguir sirviendo el árbol de un commit anterior durante 10-30 min (en esta sesión se vio una
  app mezclada: `src/` nuevo con `index.html`/`auth.php` viejos). El estado final se reconoce por
  `auth.php` → `"version":"2.0.0"` y `index.html` citando el asset nuevo.
- **Solución:** no borrar en hPanel; hacer commit+push del cambio y esperar (o reempujar). Para
  comprobar qué versión sirve el origen, `GET /apps/agenda/auth.php` devuelve `"version":"2.0.0"` y
  `GET /apps/agenda/api/health` existe solo en la nueva.
- **Verificación:** `curl`/Node contra `auth.php` y `api/health`; el `index.html` debe citar el
  asset con hash nuevo. Si el usuario sigue viendo la versión vieja con el origen ya correcto, es
  caché de su navegador/CDN: `Ctrl+F5`.

### [2026-10-21] En DSH, `npm install` y `vite build` fallan con `spawn EPERM`

- **Síntoma:** el `preinstall` de una dependencia y `vite build` morían con `spawn EPERM`; en
  cambio, Node sí podía hacer HTTPS (fallaba solo `curl.exe` con `schannel`).
- **Causa:** el sandbox `workspace-write` bloquea lanzar procesos hijos/lifecycle scripts. Basta
  con `danger-full-access` para compilar; instalar sin scripts también evita el `preinstall`.
- **Solución:** `npm install --ignore-scripts --cache <ruta-dentro-del-workspace>` (el cache por
  defecto en `%LOCALAPPDATA%` también da EPERM) y compilar/verificar con permiso ampliado.
- **Verificación:** `npm run build` genera `dist/` y `node scripts/publish.js` copia `index.html` y
  `assets/` a la raíz de la app.

### [2026-10-21] `Set-Content -Encoding UTF8` de PowerShell 5.1 escribe BOM y rompe PHP

- **Síntoma:** al router local de pruebas (`php -S`) le precedía un BOM: `Warning: Cannot modify
  header information… output started at router-local.php:1` y el navegador no cargaba el JS
  (servía `text/html` donde esperaba un módulo).
- **Causa:** PowerShell 5.1 añade BOM con `-Encoding UTF8`; cualquier byte antes de `<?php` se
  emite como salida.
- **Solución:** crear los PHP con el editor del agente (UTF-8 sin BOM) o
  `[IO.File]::WriteAllText(ruta, texto, New-Object Text.UTF8Encoding($false))`.
- **Verificación:** `node -e` o un editor que muestre que los primeros bytes son `<?php`.

### [2026-10-19] Un `<dialog>` cerrado con `display:flex` propio provoca CLS 0,481

- **Síntoma:** Lighthouse de la agenda daba Performance 78 y CLS 0,481; el resto de categorías 100.
- **Causa:** el CSS propio `.confirm-dialog { display:flex }` gana al `dialog:not([open]) { display:none }`
  del navegador. El diálogo cerrado seguía ocupando 147 px al final del `body` y provocaba un layout
  shift al cargar; la auditoría `layout-shifts` lo señalaba como nodo `BODY > DIALOG`.
- **Solución:** `dialog:not([open]) { display: none !important; }` + fuente local con
  `font-display: optional` y `preload`. Resultado: CLS 0 y 100/100/100/100.
- **Cómo comprobarlo:** `[...document.querySelectorAll('dialog')].map(d => getComputedStyle(d).display)`.

### [2026-10-19] El despliegue de Hostinger tardó 13 min y lo destrabó un segundo push

- **Síntoma:** `apps/agenda` seguía 404 trece minutos después del push; los webhooks de GitHub a
  `webhooks.hostinger.com` constaban OK. `apps/brisa` (push posterior) también 404.
- **Causa:** despliegue atascado, como el caso documentado del 2026-10-16; no era CDN ni error de la
  app (la comprobación se hacía contra `index.html`, una ruta nunca pedida antes).
- **Solución:** segundo push (`a3d577a`, 18:54) → 200 a las 18:56 (~2 min). No dar un 404 por
  definitivo antes de ~20 min; si se acerca, reempujar (la receta del commit vacío ya está en
  `recetas.md`).
- **Detalle:** mientras el despliegue está pendiente, la CDN no cachea el 404 de una ruta nueva de
  forma permanente; en cuanto el origen publica, `index.html` pasa a 200.

### [2026-10-17] El explorador de carpetas "pequeño": era el diálogo antiguo

- **Síntoma:** Antonio: «el explorador que se abre es muy pequeño, lo quiero mucho más grande».
- **Causa:** `System.Windows.Forms.FolderBrowserDialog` en PowerShell 5.1 (.NET Framework) es el
  diálogo **antiguo**, de tamaño fijo: **334x383 px**. No se puede agrandar de forma decente.
- **Solución:** usar el `IFileOpenDialog` **moderno** de Windows (Vista+) con `FOS_PICKFOLDERS`, por
  interop COM compilado con `Add-Type` en `tools/descargador/elegir-carpeta.ps1`. Medido:
  **960x540**, con barra de ruta, redimensionable y centrado en pantalla.
- **Detalles que hubo que resolver:** hay que pasar el HANDLE de una ventana propietaria invisible
  (si no, sale detrás o en la esquina); y la ruta elegida hay que escribirla en **UTF-8**
  (`[Console]::OutputEncoding`), o al worker le llega `D:\V¡deos`.
- **Trampa de medición:** leer la salida de PowerShell con `Get-Content` (ANSI) hace parecer que las
  tildes están corruptas cuando no lo están. Leer siempre con `[System.IO.File]::ReadAllText(UTF8)`.

### [2026-10-17] `continue` tras abrir el explorador: se comía el trabajo

- **Síntoma:** un trabajo real (HA-ASH) se quedó en `running` sin título y sin avanzar.
- **Causa:** el sondeo (cada 5 s) puede devolver **a la vez** un trabajo y la petición de abrir el
  explorador. El código abría el diálogo y hacía `continue`, **descartando el trabajo**; como el
  servidor ya lo había marcado `running` al entregarlo, quedaba muerto para siempre.
- **Solución:** abrir el diálogo **sin** `continue` y seguir con el trabajo. Además se añadió
  `cerrarTrabajosColgados()` en la API: los trabajos con más de 15 min en `running` sin progreso se
  cierran con un mensaje claro (worker reiniciado, PC apagado…).
- **Lección:** al matar un worker a mitad de descarga, el trabajo queda `running`; ahora se cierra
  solo, pero conviene no reiniciar el worker con trabajos en curso.

### [2026-10-17] El banco de medidas daba 404 y medía una app muerta

- **Síntoma:** el harness devolvía `.wrap` con ancho 0 y "entra: false" en todas las variantes.
- **Causa:** el `index.html` del banco apuntaba a los assets **con fecha** (`app.20261017g.*`) que
  no se habían copiado → 404 de CSS y JS → la app nunca arrancaba.
- **Solución:** copiar también esos ficheros al banco o reescribir las referencias a `app.css` y
  `app.js` en la copia.
- **Pista:** el navegador lo dice en la consola (`Failed to load resource: 404`). Mirar siempre la
  consola del escenario, no solo la captura.

### [2026-10-17] Medir con iframes y `--virtual-time-budget`: los temporizadores engañan

- **Síntoma:** el harness de iframes se quedaba "midiendo" o medía antes de que la app entrara
  (`#app-main` seguía oculto por el login asíncrono).
- **Causa:** con tiempo virtual los `setTimeout` se disparan todos de golpe antes de que lleguen los
  `fetch`; los bucles de espera se agotan al instante. Y `--dump-dom` vuelca al cargar, no cuando
  termina el trabajo asíncrono.
- **Solución:** esperar al evento `load` del iframe y, para cambios de DOM posteriores, usar un
  `MutationObserver` (reacciona a cambios reales, no a temporizadores). Una medición por ejecución
  de Chrome con `?w=<ancho>` es lo que funciona de forma fiable.
### [2026-10-17] Cuatro workers a la vez (mi forma de reiniciar los multiplicaba)

- **Síntoma:** un trabajo acabó dentro de una carpeta `j_xxx` cuando el código nuevo ya no las
  crea. El log del worker que lo atendió era el de una instancia vieja.
- **Causa:** cada "reinicio" lanzaba `cmd /c start /min iniciar-worker.bat`. El `.bat` corre un
  bucle (`/K`) que relanza node cuando termina; al matar solo el node, el bucle lo volvía a
  arrancar, y además cada `start` añadía un bucle nuevo. Resultado: **4 workers** (uno de la noche
  anterior) compitiendo por la misma cola.
- **Solución:** matar **node Y los `cmd` padres** del bucle, y arrancar **una** sola instancia.
  Comprobar con:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? CommandLine -like '*worker.mjs*'`
  (debe haber exactamente 1).
- **Regla:** para reiniciar el worker, matar el árbol completo (node + cmd del .bat) y volver a
  lanzarlo UNA vez. El acceso de Inicio lanza uno solo al iniciar sesión.

### [2026-10-17] Filtrar procesos por `CommandLine` mata tu propio script

- **Síntoma:** un comando murió a mitad con `[exit code: 4294967295]` justo después de "matando PID X".
- **Causa:** filtraba `powershell.exe` por `CommandLine -like '*FolderBrowserDialog*'`… y **mi propio
  script contenía ese texto en su línea de comandos**. Se mató a sí mismo.
- **Solución:** excluir siempre el proceso actual: `Where-Object { $_.ProcessId -ne $PID }`.
- **Extra:** en PowerShell `$pid` es una **variable reservada** (PID del proceso actual); no se
  puede asignar. Usar `$procId`.

### [2026-10-17] Borrar las carpetas `j_*` de descargas se llevó por delante ficheros

- **Qué pasó:** para limpiar el desorden que vio Antonio (carpeta por descarga con log y
  `.info.json`), borré las 17 carpetas `j_*` de su carpeta de descargas. **Dentro estaban los
  ficheros descargados**: los que se habían quedado solo en el PC se perdieron (uno: un mp3 de
  Chayanne, que volví a descargar). Los demás estaban subidos a la web y no se perdió nada.
- **Regla:** antes de borrar una carpeta de descargas, **listar y mirar el contenido**, y distinguir
  restos (log, `.info.json`) de originales (`.mp3`, `.mp4`). Y si hay que borrar, comprobar
  primero qué fichas de la cola/historial apuntan ahí.
- **Arreglo de fondo:** ahora el fichero se mueve a la carpeta elegida y la carpeta de trabajo
  (oculta, `.descargas-tmp`) se borra sola al terminar, así que no hay nada que limpiar a mano.

### [2026-10-17] `item_done` con `item_id`: el bloque de actualización iba ANTES de ensamblar

- **Síntoma:** "traer a la web" subía los trozos pero `item_done` devolvía **500 con el cuerpo
  vacío**; el elemento quedaba a medias (`local=False, bytes=0`).
- **Causa:** el bloque que actualiza la ficha existente lo inserté antes de `$itemId = ...`, es
  decir **antes** de ensamblar el fichero: `$written` y `$relative` valían `null` → TypeError en
  `marcarHistorialEnWeb(int $bytes)`.
- **Solución:** mover el bloque detrás del ensamblado y la limpieza de trozos, justo antes de crear
  la ficha. **Comprobar el orden con los índices**: `$written = 0` < bloque < `$item = [`.
### [2026-10-17] El móvil se veía fatal: `align-items: flex-start` sobre un flex que pasa a columna

- **Síntoma:** en el móvil, botones enormes que se salían de la pantalla y scroll horizontal.
  Antonio: «en el móvil se ve fatal».
- **Causa:** al pasar `.main-layout` a `flex-direction: column` en el media query de 768 px, la
  regla base seguía aportando `align-items: flex-start`. En columna, eso significa que los hijos
  **no se estiran al ancho disponible**: adoptan su ancho de contenido MÁXIMO. Un título largo
  llevaba la columna a **795 px dentro de una pantalla de 390** → el contenedor entero desbordaba
  y todo lo de dentro (textarea, botones) se dimensionaba contra esos 795 px.
- **Medido, no supuesto:** 417 px de desborde a 390 px; `textarea#url` a 195 % del ancho de la
  pantalla; `button#add-btn` a 195 %; `a.file-chip` a 187 %.
- **Solución:** `align-items: stretch` + `min-width: 0` en la columna. Resultado: **0 px de
  desborde en 12 anchos** (320 a 1920).
- **Cómo comprobarlo:** banco de medidas que carga la app en un iframe del ancho pedido y saca por
  el DOM los elementos que se salen (`getBoundingClientRect().right > innerWidth`) y los controles
  desproporcionados; se lee con `chrome --headless --dump-dom`. Leer el CSS no lo habría visto.

### [2026-10-17] La CDN de Hostinger NO refresca los estáticos: `?v=` no sirve, hay que RENOMBRAR

Ampliación con datos de la entrada del 2026-10-16:

- **Prueba que lo cierra:** tras desplegar un cambio, `app.js?v=4` seguía sirviendo el fichero
  cacheado por RUTA del despliegue anterior (traía una parte del código nuevo y no la otra). La
  query se ignora al indexar: **subir el `?v=` no rompe nada**.
- **Síntoma que ve el usuario:** «la elección de carpetas no funciona». El HTML ya traía el panel
  (la CDN sí refrescó el HTML al cabo de un rato), pero el JS cacheado no tenía la lógica: el panel
  aparecía y no hacía nada. **Parece un botón roto y es una caché.**
- **Solución:** ruta nueva de verdad (`app.20261017b.css`, `...c`, `...d`, `...e`…). Los ficheros
  anteriores se quedan mientras haya HTML cacheado que los pida.
- **Comprobar:** `curl -o NUL -w "%{http_code}"` al fichero nuevo (404 = no desplegado) y buscar la
  referencia en el HTML servido con un parámetro aleatorio... que tampoco rompe su caché: sirve
  para ver qué HTML hay, no para forzar el nuevo.
- **Efecto secundario a limpiar:** se acumulan copias (`app.css`, `app.20261017.css`,
  `...b`, `...c`, `...d`, `...e`). Cuando expire la caché (7 días), dejar solo las vigentes.

### [2026-10-17] El despliegue de Hostinger se congeló 10 minutos: commit vacío y a correr

- **Síntoma:** dos ficheros nuevos daban **404** y el HTML servido seguía siendo el anterior 10
  minutos después del push (otros despliegues de la misma noche tardaron 80-120 s).
- **Solución:** la receta que ya estaba en `recetas.md` y `errores.md`: `git commit --allow-empty` +
  push para re-disparar el webhook. A los 120 s estaba todo servido.
- **Aviso:** mientras el despliegue está congelado, **no** sirve reintentar con `?t=<guid>`: la CDN
  ignora la query y devuelve su copia, así que la comprobación miente.

### [2026-10-17] «¿Estoy en casa?» no se puede decidir por IP: CGNAT

- **Síntoma:** trabajos lanzados desde el propio PC se marcaban como `origen=fuera` (y por tanto se
  subían a la web cuando no hacía falta).
- **Causa:** la IP pública de esta línea **cambia entre peticiones** (visto: `45.14.x.x` y
  `194.116.x.x` en momentos distintos, y dos direcciones distintas del mismo rango con segundos de
  diferencia). Es CGNAT del operador. Comparar la IP del navegador con la del último latido del
  worker no puede ser fiable. Además, el agente (esta herramienta) puede salir por otra ruta, así
  que tampoco sirve para probarlo desde aquí.
- **Solución (dos capas):**
  1. **Sonda directa al worker**: escucha en `127.0.0.1:8125` y la página le pregunta si está en el
     mismo PC. Es determinista… salvo que **Chrome 155 exige permiso** para que una página pública
     hable con 127.0.0.1 (Local Network Access); sin permiso, la sonda falla en silencio.
  2. **Conmutador a un toque** en la barra de estado: «Estás en el PC / Desde fuera», guardado en
     `localStorage` de ESE dispositivo. Con CGNAT es lo único que no engaña.
- **Decisión por defecto:** si no hay ajuste manual y las dos señales automáticas fallan, se asume
  **fuera** (subir). Es preferible a que una descarga pedida desde el móvil se quede en el PC sin
  forma de bajarla.
- **Cómo comprobarlo:** `curl http://127.0.0.1:8125/pc` → `{"pc":true,...}` con el worker corriendo;
  y el `title` del aviso lleva `worker=… cliente=… coinciden=… sonda=… manual=…`.

### [2026-10-17] `mb_strlen` sin proteger: fatal en un PHP sin mbstring

- **Síntoma:** `POST api.php` devolvía **500 con el cuerpo vacío** (`Uncaught Error: Call to
  undefined function mb_strlen()`), y en la web se veía como una respuesta vacía.
- **Causa:** `mbstring` es una extensión **opcional**; el PHP de pruebas de este equipo no la tiene.
  En producción sí está (las subidas funcionaban), pero depender de ella es una bomba de relojería
  en hosting compartido.
- **Solución:** `recortarUtf8()` que usa `mb_substr` si existe y, si no, corta por bytes y quita el
  carácter UTF-8 partido. Y `function_exists('mb_strlen')` para medir.
- **Cómo comprobarlo:** `php -m | Select-String mbstring`. Si no aparece, la app tiene que seguir
  funcionando igual.

### [2026-10-17] El error de PowerShell que YA estaba documentado y he vuelto a cometer

- **Síntoma:** todos los acentos del `index.html` convertidos en `reproducciÃ³n`, `Vídeo` → `VÃ­deo`.
- **Causa:** `(Get-Content -Raw) … | Set-Content -Encoding UTF8` en PowerShell 5.1: lee UTF-8 como
  CP-1252 (si el fichero no lleva BOM) y lo reescribe como UTF-8. Es **exactamente** la entrada
  «yt-dlp … mojibake» de este mismo fichero.
- **Solución:** deshacer es posible: codificar el texto en CP-1252 (recupera los bytes originales) y
  leerlo como UTF-8. Y de ahora en adelante, esos ficheros se tocan con
  `[System.IO.File]::ReadAllText/WriteAllText` con `UTF8Encoding($false)`.
- **Trampa añadida:** `[System.IO.File]` usa el directorio del **proceso**, no el de PowerShell. Con
  `cd` a otra carpeta y una ruta relativa, el fichero se crea donde no toca (pasó: un `api.php` de 0
  bytes en la RAÍZ PÚBLICA del repo, a punto de publicarse).
- **Cómo comprobarlo:** `Select-String -Pattern 'Ã|â€'` sobre el fichero; y comprobar los tres
  primeros bytes (`3C 3F 70` = `<?p`, sin BOM).
### [2026-10-16] El tope de trozo de la API no coincidía con el que manda el worker (HTTP 413)

- **Síntoma:** en producción, una descarga de 55 MB se bajó **entera** y murió al subirla:
  `no se pudo subir el trozo 1/4 …: HTTP 413`.
- **Causa:** dos números que van emparejados y se tocaron por separado. El worker manda trozos de
  `chunk_mb = 16` MB (lo subí al ver que el servidor admite 2 GB por subida) y `api.php` seguía con
  `MAX_CHUNK_BYTES = 12` MB. Todo trozo mayor que el tope se rechaza, así que **la descarga se
  pierde después de haberse bajado completa**: lo caro ya está hecho y se tira.
- **Solución:** `MAX_CHUNK_BYTES = 24 MB` (holgura sobre los 16 del worker) y el error ahora dice el
  peso real, el máximo y qué hay que tocar. Si algún día se cambia `chunk_mb`, hay que cambiar los dos.
- **Cómo comprobarlo:** encolar un audio largo y ver la cola pasar por `subiendo` hasta `done`, y que
  el fichero se descargue con `HTTP 200` y un tamaño coherente. Reproductor: `ffmpeg -i`.

### [2026-10-16] El 403 de YouTube NO era de la app: bloqueo temporal de la IP

- **Síntoma:** un vídeo falla con `ERROR: unable to download video data: HTTP Error 403: Forbidden`
  mientras la extracción (títulos, formatos) funciona sin problema. El usuario sabía que **ese mismo
  vídeo lo había bajado antes con la otra app**.
- **Causa:** nada de la app. La prueba que lo cierra es un **vídeo de control** que había bajado bien
  una hora antes: también devolvía 403, igual que los comandos exactos del `.bat` de siempre y que
  todas las variantes de `player_client` (`tv`, `web_safari`, `web_embedded`, `android_vr`). YouTube
  bloqueaba temporalmente las descargas desde esa conexión, casi seguro por el **volumen de
  peticiones seguidas** de la tarde (pruebas del agente incluidas). Pasó solo: minutos después el
  mismo vídeo se bajó entero.
- **Solución:** ninguna en el código. Antes de tocar nada, **comparar con un vídeo de control** y con
  el comando que el usuario ya usaba: si fallan todos, es el servidor, no la app. Se aprovechó para
  que el worker traduzca los fallos típicos (403, «confirma que no eres un robot», enlace cortado,
  vídeo no disponible, formato inexistente) en vez de mostrar solo el log crudo, y para aceptar un
  `cookies.txt` opcional (`cookies_file` en la config) cuando YouTube pide sesión.
- **Cómo comprobarlo:** `yt-dlp -f 140 <url>` contra un vídeo corto conocido. Si sale 403 en todos
  los clientes, esperar y repetir.
- **Aviso:** `--cookies-from-browser chrome` **no funciona** en este equipo: Chrome 155 usa
  *App-Bound Encryption* y yt-dlp no puede copiar su base de cookies (`Could not copy Chrome cookie
  database`, issue 7271). Hay que exportar un `cookies.txt` a mano.

### [2026-10-16] La CDN de Hostinger NO refresca los estáticos, y `?t=<guid>` no lo rompe

- **Síntoma:** se sube un cambio de `index.html`/`app.css` y 40 minutos después la URL pública sigue
  sirviendo el contenido viejo (`app.css?v=1`), mientras que `api.php` sí está al día
  (`version: 1.0.1` → `1.0.2` se ve enseguida).
- **Causa:** `Server: hcdn` sirve **estáticos cacheados por RUTA**. Añadir un parámetro aleatorio
  (`app.css?t=<guid>`) **no** crea una entrada nueva: la CDN ignora la query al indexar, así que
  devuelve la copia vieja y encima no sirve para comprobar nada. Lo dinámico no se cachea, y de ahí
  la asimetría.
- **Solución:** para los estáticos, **renombrar el fichero con fecha** (`app.css` → `app.20261016.css`)
  y actualizar la referencia; el fichero viejo **no se borra** (hay HTML cacheado que lo pide). Para
  saber si un despliegue llegó, mirar `last-modified` de la respuesta, no el contenido con `?t=`.
- **Cómo comprobarlo:** `curl -I` a la ruta y comparar `last-modified` con la fecha del commit.
  `api.php?action=health` sirve de marcador fiable: lleva `version`, que se sube en cada arreglo.

### [2026-10-16] El Escritorio real es `D:\Escritorio`: en `%USERPROFILE%\Desktop` no se ve nada

- **Síntoma:** se crea un acceso directo en `$env:USERPROFILE\Desktop` y en el Escritorio de
  Antonio **no aparece**.
- **Causa:** la misma redirección que las Descargas (ver la entrada de `D:\Descargas`): su
  **Escritorio es `D:\Escritorio`**. Lo traicionero es que `C:\Users\atnojs\Desktop` **sí
  existe** (con un `Hermes.lnk` viejo dentro), así que `Test-Path` devuelve `True` y la ruta
  parece buena. No lo es.
- **Solución:** no componer la ruta a mano; preguntarla:
  `[Environment]::GetFolderPath('Desktop')` → `D:\Escritorio`.
- **Cómo comprobarlo:** el `.lnk` aparece al listar `D:\Escritorio` y **no** al listar
  `C:\Users\atnojs\Desktop`.

### [2026-10-16] yt-dlp «no me deja bajar de YouTube»: versión vieja **y** falta de motor JS

- **Síntoma:** el descargador de vídeo/audio de Antonio (la ventana «YouTube Downloader», ver
  `entorno.md`) fallaba con YouTube; con otras webs sí iba.
- **Causa:** **dos**, y la segunda no se ve. (1) El `yt-dlp.exe` de `D:\Vídeos\ytdownloader\`
  era del **2026.03.17**, cinco meses viejo. (2) Al actualizarlo salió el aviso de verdad:
  `No supported JavaScript runtime could be found. Only deno is enabled by default` →
  **yt-dlp necesita un runtime JS para YouTube** (resolver los retos `nsig`); sin él faltan
  formatos y la descarga falla. No era la red, ni la web, ni los permisos.
- **Solución:** sustituir el exe por la última release
  (`https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe` → `2026.08.19`) y
  dejar una **config portable** en `D:\Vídeos\ytdownloader\yt-dlp.conf` con
  `--js-runtimes node` + `--remote-components ejs:github`. La lee el propio exe, así que vale
  para el `.bat` **sin tocar el lanzador**. Copia del anterior: `yt-dlp.exe.bak-2026.03.17`.
- **Cómo comprobarlo:** `yt-dlp.exe --verbose --simulate <url>` debe imprimir
  `Portable config "…\yt-dlp.conf"` y `JS runtimes: node-24.14.0` (Node está en
  `C:\Program Files\nodejs\node.exe`) y `JS Challenge Providers: … node …`. Descarga real:
  formato por defecto → `395+251` fusionados por ffmpeg; y `-x --audio-format mp3` → MP3 válido.
  Si algún vídeo sigue fallando por «Sign in to confirm you're not a bot», es cookies, no esto
  (`--cookies-from-browser chrome`).

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

### [2026-10-16] El despliegue de Hostinger se congela en silencio y **revierte** al último estado bueno

- **Síntoma:** Antonio borró `apps/temp_extract/` a mano en hPanel y **la carpeta reapareció**. En
  paralelo, `https://atnojs.es/.gitignore` dejó de actualizarse: seguía con el contenido del commit
  `153cc63` aunque ya iba por `980d832`.
- **Causa:** el despliegue se quedó **atascado** en el commit de ~17:32 (16:54:30 GMT de
  `Last-Modified`, clavado durante más de 20 minutos) y, al fallar, **restauró el último estado
  bueno** — que todavía contenía `apps/temp_extract/`. Por eso volvió: no fue un despiste de
  Antonio, fue una reversión. Su borrado del `.bak` sí cuajó, porque ese fichero **no existe** en
  ninguna copia del repo y por tanto no hay nada que restaurar.
- **Diagnóstico (el que sirve):** comparar el **contenido** de un fichero versionado y público
  (`.gitignore` es ideal: cambia a menudo y se sirve en la raíz) contra `git show <commit>:<fichero>`
  para cada commit candidato. El que coincide **exactamente** dice en qué commit está el servidor.
  Si el `Last-Modified` no se mueve en varios minutos, está congelado, no lento.
- **Solución:** **commit vacío + push** (`git commit --allow-empty`) para re-disparar el webhook.
  Funcionó: en ~2 minutos el `.gitignore` del servidor pasó a ser idéntico al de HEAD.
- **Importante:** al revertir, el servidor devuelve ficheros que ya no están en el repo y **pisa
  cambios recientes**. Antes de dar por bueno un arreglo «en producción», comprobar que el
  servidor está de verdad en HEAD — no basta con que el push haya salido.
- **Cómo comprobarlo:** `git show HEAD:.gitignore` == lo que sirve `https://atnojs.es/.gitignore`.

### [2026-10-16] Quitar un fichero del repositorio **NO** lo despublica de Hostinger

- **Síntoma:** saqué `apps/temp_extract/` del repo (un `git mv` a `tools/`), esperé ~11 minutos y
  `https://atnojs.es/apps/temp_extract/` seguía devolviendo **200**, con el `src/App.tsx` y el
  `firebase-applet-config.json` (clave incluida) todavía legibles. Igual pasaba con
  `apps/generar_imagenes/1/app.js.bak`: **200 y no está en git**.
- **Causa:** el despliegue de Hostinger **reescribe** los ficheros del repo, pero **no borra** los
  que han dejado de estar en él. Comprobado comparando `Last-Modified` de dos ficheros tras el
  mismo despliegue:
  - `apps/trickvault/index.html` → `17:41:16` (el despliegue del commit de las 17:39 sí corrió:
    reescribe también ficheros que no cambiaron en ese commit).
  - `apps/temp_extract/index.html` → se quedó en `17:35:54` y sigue sirviéndose.
- **Consecuencia (importante para seguridad):** un fichero con una clave que se saca del repo
  **sigue publicado** en la web. Y como el historial de git conserva el contenido de todos modos,
  **sacar un fichero de git no arregla nada por sí solo: hay que rotar la clave.**
- **Solución:** borrar el fichero o la carpeta **a mano** en el servidor (hPanel → Administrador de
  archivos, o FTP). No basta con `git rm` ni con `git mv`.
- **Cómo comprobarlo:** `Last-Modified` con `Invoke-WebRequest` sobre un fichero que SÍ cambió en
  el último commit; si su fecha es posterior a la del fichero retirado y este sigue dando 200, el
  despliegue corrió y no borró.

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

## 2026-10-18 — Botón gigante en móvil por `flex: 0 0 220px` en una fila que pasa a columna

- **Síntoma:** el botón DESCARGAR salía con ~220 px de ALTO en el móvil (una pastilla enorme),
  mientras en escritorio se veía bien.
- **Causa:** `.acciones-fila #add-btn { flex: 0 0 220px; }` fija el ancho en fila, pero en el
  `@media (max-width: 560px)` la fila pasa a `flex-direction: column` y ese `220px` se interpreta
  como **alto** (flex-basis del eje principal, que ahora es vertical). La regla del id ganaba a la
  regla de clase del media query.
- **Solución:** en el media query, `.acciones-fila #add-btn { order: -1; flex: 1 1 auto; width: 100%; }`.
- **Regla:** al pasar una fila a columna, revisar siempre los `flex-basis` con valor fijo.
## 2026-10-18 — Al borrar un bloque de JS se llevó los enganches de la cola y el historial

- **Síntoma:** los botones BORRAR de la cola y la X del historial se veían pero no hacían nada.
- **Causa:** al quitar el bloque del buscador de YouTube se borró el rango «desde `function
  pintarResultados(` hasta `async function onQueueClick(`». En `bindUI` los enganches
  `$('queue-list').addEventListener(...)` y `$('history-grid').addEventListener(...)` estaban
  **en la misma línea** que el cierre del bloque `yt-results`, así que se fueron con él.
- **Solución:** reponer los dos `addEventListener` de `#queue-list`; la X desapareció con el
  historial. Comprobar SIEMPRE `grep 'addEventListener'` tras quitar bloques por índices.
## 2026-10-19 — El aviso de Windows seguía saliendo con un VBS que lanzaba el .bat

- **Síntoma:** el aviso «Advertencia de seguridad de Abrir archivo — No se pudo comprobar el editor»
  seguía apareciendo al arrancar, ahora con el diálogo colgado incluso al pulsar «Ejecutar».
- **Causa:** el lanzador del Inicio era un VBS que hacía `WScript.Shell.Run` sobre el **.bat**; Windows
  también aplica el filtro de adjuntos a `.bat` abiertos desde un script, y el diálogo se queda
  huérfano dentro del proceso `wscript.exe`.
- **Solución:** el VBS arranca **Node directamente** (`node.exe worker.mjs`) con `Run(..., 0, True)`,
  sin pasar por el .bat; bucle de relanzado en VBS (10 s), salta si ya hay un worker y no reintenta
  el código 2. Comprobado: sin ventanas de aviso, worker oculto, puerto 8125 y la app lo ve.
- **Para lanzarlo a mano:** doble clic en `tools\descargador\iniciar-worker.vbs` (oculto) o en el
  `.bat` (muestra consola y puede pedir confirmación: es normal).

## 2026-10-25 — El despliegue de Hostinger NO borra los archivos retirados del repo

- **Síntoma:** se eliminó `webs/curso-ia-2026` del repo (commit `658b881b`), se subió a `main`
  y, 25 minutos y 4 push después, `https://atnojs.es/webs/curso-ia-2026/index.html` seguía
  devolviendo 200 con `Last-Modified` 17:13:38 (el del despliegue anterior). El webhook de
  Hostinger recibía todos los push con HTTP 200 (entregas del hook vistas con `gh api`).
- **Causa:** el despliegue de Hostinger **replica/actualiza** el árbol de `main` pero **no
  elimina** los ficheros que ya no están en el repo. Prueba independiente: en el despliegue del
  25-oct 17:32:44 todos los ficheros públicos presentes se reescribieron (mtime 17:32:44) y la
  carpeta borrada conservó el suyo (17:13:38); además, `apps/agenda/index.dev.html`, borrado del
  repo el 2026-10-21, sigue sirviéndose con `Last-Modified` del 21-oct.
- **Solución:** retirar la carpeta a mano en **hPanel → Administrador de archivos →
  `public_html/webs/<app>` → Eliminar** (desde el agente no hay FTP/SSH válidos para
  `atnojs.es`). Después verificar con `?cb=<guid>` nuevo que `index.html`, los assets,
  `proxy.php` y la raíz de la carpeta dan **404**.
- **Cómo comprobarlo:** `Invoke-WebRequest` a la URL con `?cb=` nuevo → 404; y
  `git ls-tree HEAD -- <ruta>` vacío.
- **Lección:** «publicado en `main`» ≠ «retirado de producción». No dar un borrado por
  terminado hasta comprobar la URL real.

## 2026-10-26 — Flow Studio: el vídeo con fotogramas moría con `Page.wait_for_selector: Timeout 8000ms exceeded`

- **Síntoma:** al generar un vídeo en `apps/flow_studio_hoola` la tarjeta quedaba en error con
  `RuntimeError: playwright._impl._errors.TimeoutError: Page.wait_for_selector: Timeout 8000ms exceeded`.
  La captura que dejó el propio fallo (`_debug/upload_frame_error_initial.png`, 26-oct 14:59)
  mostraba la UI real: pestaña Vídeo > Fotogramas con los huecos **«Inicio»/«Fin»**.
- **Causa:** Google cambió la UI de Flow ese mismo día. En modo Fotogramas el compositor **ya no
  tiene el botón «Crear»** que usaba `flow_provider/canvas.py::_upload_and_attach`; su
  `page.wait_for_selector(..., timeout=8_000)` agotaba los 8 s y el worker resumía el traceback
  como `RuntimeError`. En el mismo cambio Flow renombró **«Nano Banana 2» → «Nano Banana 2.1»**,
  así que las imágenes con el modelo por defecto de la app también iban a fallar.
- **Solución (herramienta local `E:\herramientas\google-flow`, 3 ficheros):**
  - `flow_provider/canvas.py`: nuevo `_attach_frame_via_picker` (pulsa el hueco Inicio/Fin, abre
    «Selecciona una imagen de encuadre», sube con «Subir archivo», **espera a que «Añadir a
    petición» se habilite** — durante la subida está deshabilitado — confirma y verifica el chip)
    y `upload_frame` lo usa; la ruta antigua queda solo como último recurso.
  - `flow_provider/configure.py`: `MODEL_ALIASES` (`Nano Banana 2`→`Nano Banana 2.1`,
    `Omni Flash`→`Omni 1.1 Flash`); `_select_model` prueba el nombre exacto y luego los alias.
  - `flow_studio_worker.py`: guarda de intérprete (sin Playwright no reclama trabajos; se vio una
    segunda instancia del worker con otro Python que no podía generar).
- **Verificación:** sondas con Chrome real sobre el perfil persistente + **generación real** de un
  vídeo con fotograma inicial y final: `e2e_fix_20261026.mp4` (2.232.476 B, 8,00 s, 1280×720,
  H.264+AAC) y `verify_fix_result.json` PASS 11/11. Evidencias en
  `tools/evidencias/2026-10-26-flow-studio-video-fotogramas/`. El verificador independiente emitió
  el informe en `…/verificador/INFORME.md`.
- **Cómo comprobarlo:** `python _debug\verify_fix.py` con el Python del venv de Hermes
  (`C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`, `FLOW_HEADLESS=true`,
  cwd `E:\herramientas\google-flow`); no pulsa «Iniciar generación» (no gasta puntos).
- **Lección:** cuando una app que automatiza una web de terceros falla con un timeout de selector,
  la captura del fallo vale más que el traceback: aquí mostró el compositor nuevo. Y un cambio de
  UI de Google puede romper **dos** rutas a la vez (fotogramas y nombre de modelo): probar las dos.
- **Commit:** herramienta local sin publicar (repo aparte con adaptaciones previas sin commitear);
  documentación y memoria en el commit de esta entrada en `ANTIGRAVITY`.
### [2026-10-26] Copia Hoola: CSP heredado bloquea blob de IndexedDB en modo local

- **Síntoma:** en producción, al importar una imagen sin sesión el lienzo no la pintaba y el PNG exportado salía en blanco (24.805 B); consola: `Loading the image 'blob:…' violates … img-src 'self' data: https:`.
- **Causa:** la CSP heredada de la raíz no incluye `blob:` en `img-src`; el estudio usa object URLs de IndexedDB mientras no hay sesión. En local no se reproduce porque el servidor PHP no aplica el `.htaccess`.
- **Solución:** `.htaccess` propio de la app con `Header unset`/`Header always unset Content-Security-Policy` + política con `img-src 'self' data: blob: https:` y `media-src … blob:` (patrón ya usado en `apps/conversor_multimedia`). Commit `33516df0` de la copia.
- **Verificación:** proxy local que inyecta la misma cabecera (`_csp_test_server.py`) y prueba en la URL real: import visible, export PNG 1024×1024 57.077 B, 0 violaciones.
- **Extra:** el webhook de GitHub entregó todos los push con HTTP 200 pero Hostinger no publicó durante ~15 min; se resolvió con commits vacíos de re-disparo y comprobando `version.txt` servido (no basta HTTP 200).
---

### [2026-10-26] El overlay de carga bloqueaba toda el estudio mientras había un trabajo en cola

- **Síntoma:** al encolar una imagen con Flow, Playwright no podía pulsar «Biblioteca»:
  `<div id="loadingOverlay"> intercepts pointer events`. En uso real, el usuario se quedaba hasta
  30 minutos sin poder cambiar de sección, guardar ni exportar.
- **Causa:** reutilicé el overlay a pantalla completa (`showLoading`) para esperar un trabajo que no
  corre en el navegador sino en el PC. Ese overlay está pensado para peticiones de segundos, no para
  una cola asíncrona.
- **Solución:** en las rutas de Flow no se usa el overlay. Se encola, se devuelve el control al
  usuario y un vigilante en segundo plano (sondeo 3,5 s) pinta un aviso compacto
  (`#flowProgress`, `position:fixed`, no modal) que muestra «en cola» o «generando» y desaparece al
  terminar. La interfaz sigue siendo utilizable y el botón de generar se libera enseguida.
- **Verificación:** `e2e.mjs` comprueba `overlayDeCarga: false` y `uiLibreDuranteGeneracion: true`
  mientras hay un trabajo pendiente.
- **Regla que queda:** un overlay modal solo para operaciones que bloquean de verdad el trabajo del
  usuario (segundos). Para colas o agentes externos, aviso no bloqueante.
- **Actualización (2026-10-27):** Antonio pidió recuperar el overlay de 3 aros al pulsar «GENERAR»
  y, tras probar la versión breve, pidió expresamente que se quede **hasta que Flow termine**,
  aceptando el bloqueo. Se mantiene visible durante toda la generación, con un tope de seguridad de
  10 minutos; si se alcanza, se libera la interfaz y el trabajo sigue en Biblioteca. Es una decisión
  del usuario frente a la regla anterior, no una regresión accidental.

### [2026-10-26] Ocultar el rail con `display:none` rompió la rejilla del estudio

- **Síntoma:** al entrar en la sección Vídeo, el panel de herramientas quedaba en ~84 px y el texto
  se partía palabra a palabra («Se genera en tu PC con Google Flow…» en una columna de 8 caracteres).
- **Causa:** `.workspace` es una rejilla de columnas fijas
  (`rail | panel izquierdo | lienzo | panel derecho`). Al sacar el rail del flujo con `display:none`,
  el panel izquierdo pasó a ocupar **la celda del rail** (84 px) y el resto se desplazó.
- **Solución:** el rail nunca se oculta: conserva su columna y se atenúa con
  `.rail.is-inactive` (opacidad 0,42, recuperada al pasar el ratón o al enfocar). Pulsar cualquier
  herramienta del rail devuelve a la sección Imagen.
- **Verificación:** medida real en Chrome a 1440 px: panel de 322 px en las tres secciones, 0 nodos
  de texto estrechos y 0 desbordamiento horizontal.
- **Regla que queda:** en una rejilla con celdas fijas, no quitar hijos del flujo (`display:none`)
  para «esconder» algo: cambiar su contenido, atenuarlo o colapsar su columna con una clase.

### [2026-10-26] Documenté como corregidos tres defectos que seguían en el código

- **Síntoma:** el verificador independiente reabrió D3, D7 y D8 después de que yo escribiera en
  `docs/VERIFICACION.md` que estaban cerrados. El botón «Usar como inicio» seguía pintándose en las
  tarjetas de vídeo (y además sin manejador, así que era un botón muerto), el visor seguía mostrando
  «?×?» y `flow.js` conservaba cuatro exports sin uso.
- **Causa:** las tres correcciones se aplicaron con sustituciones de texto masivas
  (`String.replace` con cadenas literales) que **no coincidían** con el código real, así que no
  cambiaron nada, y el script no comprobaba si había sustituido algo. Después escribí la tabla de
  correcciones leyendo mi intención, no el archivo. Es el fallo más caro de esta sesión: la
  documentación decía una cosa y el artefacto otra.
- **Solución:** (1) corregir los tres puntos con edición quirúrgica del bloque exacto; (2) crear
  `tools/flow-agent/comprobar-entregable.mjs`, que comprueba 26 invariantes del entregable
  (sin `data-flow-frames`, visor con medidas condicionales, lista de símbolos muertos, cero
  elementos de coste, contrato de modelos y ausencia de credenciales en el frontend) y **sale con
  código 1** si alguno falla; (3) reescribir las filas de la tabla con el estado real y bajar la
  autoevaluación de 91,8 a 90,6 (A5 y A6 a 8,6).
- **Verificación:** `node tools/flow-agent/comprobar-entregable.mjs` → 26 OK; en Chrome
  (`d3-d7.mjs`, `visor-video.mjs`): 0 botones `data-flow-frames` a 1440 y 390, y el visor de vídeo
  muestra «Vídeo · 16:9» sin interrogantes.
- **Regla que queda:** una corrección no está hecha hasta que un comando falla si se deshace. Toda
  tabla de correcciones debe citar ese comando, no la intención. Y al sustituir texto en lote,
  comprobar siempre que la sustitución ocurrió antes de dar nada por cerrado.
