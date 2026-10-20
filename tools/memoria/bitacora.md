# Bitácora

Qué se hizo, cuándo y con qué commit. De lo más reciente a lo más antiguo.
Una entrada por sesión de trabajo relevante.

---

## 2026-10-19 — TrickVault: limpieza de «Cámara y retrato», botón de duplicados y «Últimas» por lote

Cuatro cosas que pidió Antonio de una vez:

1. **Fuera 5 tarjetas** (se quedan sus parejas): `/newbackground` (queda `/newbg`),
   `/repairhd` y `/restore` (ya hay carpeta de restaurar imágenes), `/petphoto` (queda
   `/pet`) y `/sameface` (queda `/samecharacter`). Ids apuntados en `REMOVED_IMAGE_IDS`
   (`ig-dcek-047`, `ig-dcek-172`, `cap-cmd-009`, `cap-cmd-113`, `xl-cmd-131`) y en
   `borradas` de `catalogo.json` para que desaparezcan también de los navegadores que ya
   las tuvieran.
   - El constructor de las tarjetas de Excel usaba `map` y no miraba la lista de retiradas:
     ahora es `flatMap` con el mismo filtro que las de capturas y las de Instagram.
2. **Botón «Buscar duplicados», solo en modo edición** (`canEdit`): agrupa las tarjetas cuyo
   prompt es el mismo tras quitarles el código delante y normalizar espacios
   (`tvGruposDuplicados`), enseña solo esas y debajo de cada una dice con qué otros códigos
   coincide. Si no hay ninguno, «Sin duplicados».
3. **«Últimas» ya no son las 24 más nuevas**: ahora enseña solo las tarjetas del **último
   lote** (`updatedAt`/`createdAt` más reciente de todo el catálogo) y el chip dice la fecha
   de esa actualización. Constantes `TV_RECIENTES`/`tvRecientes` eliminadas.
4. CSS nuevo para el botón encendido y el aviso de duplicado; cache-buster a
   `app.css?v=20261019-dup`.

**Verificado**: JSX OK (1.003.662 chars), 10 comprobaciones de `tvUltimaMarca`, `tvMarca`,
`tvPromptComparable` y `tvGruposDuplicados` (incluye falsos positivos y prompts vacíos), y
`catalogo.json` válido con los 6 ids en `borradas`. Sin Chrome en el sandbox: sin capturas.

---

## 2026-10-19 — TrickVault: botón «Últimas» en el filtro de fechas

Antonio: en el buscador por fechas, un botón para ver las últimas tarjetas subidas.

- Cuarto modo del filtro: **Últimas** (junto a Todo / Un día / Rango). Enseña las
  **24 más recientes** por `createdAt`, de más nueva a más vieja, y funciona también con
  texto escrito (filtra por texto y luego recorta).
- Resumen en el chip: «🆕 últimas 24 subidas»; la ✕ y «Quitar filtro» lo deshacen.
- Constante `TV_RECIENTES` para cambiar el número en un sitio; función pura `tvRecientes()`
  (no muta la lista, respeta tarjetas sin `createdAt` mandándolas al final).
- Verificado: JSX OK (`@babel/parser`), 6 comprobaciones de `tvRecientes` (orden, recorte,
  sin fecha, no muta, lista vacía) y 0 restos de codificación rota.

---

## 2026-10-19 — TrickVault: fuera /legoify (duplicaba a /lego)

Antonio: en «Otro mundo» había dos tarjetas de LEGO; se queda `/lego` y se elimina `/legoify`.

- Su id de serie es **`ig-dcek-473`** (índice 472 de `ALL_IMAGE_COMMANDS`), apuntado en
  `REMOVED_IMAGE_IDS` (así desaparece de los navegadores que ya lo tuvieran y no vuelve).
- Añadido también a `borradas` de `catalogo.json` para que la capa publicada lo oculte en
  cualquier navegador.
- Quitadas del `index.html` sus dos líneas propias (imagen `assets/xl-otromundo/legoify.jpg`
  y su prompt) y borrado el jpg (225 KB).
- **No** se tocó la entrada de `ADDITIONAL_IMAGE_COMMANDS`: quitar esa línea renumeraría todos
  los ids `ig-dcek` siguientes y rompería las tarjetas guardadas.
- Verificado: JSX OK, `catalogo.json` válido, cero referencias al jpg.

---

## 2026-10-19 — TrickVault: buscador por fecha de alta (un día o un rango)

Antonio lo pidió para **TrickVault** (yo lo había hecho antes en Descargas por error: se queda
allí, funciona, pero no era lo que pedía). Va en **Búsqueda Global**: cada tarjeta tiene
`createdAt` (epoch ms), así que el filtro va sobre la **fecha de alta**.

- **`apps/trickvault/index.html`**: en `GlobalSearch`, tres modos (Todo / Un día / Rango) con
  sus `<input type="date">`, chip con el resumen y la ✕ para quitarlo, y mensaje «No hay
  tarjetas con esa fecha» cuando no hay coincidencias. Funciona también **sin texto**: con
  una fecha puesta ya lista las tarjetas de ese día, ordenadas de más nueva a más antigua.
  Añadidas las funciones puras `tvClaveDia`, `tvFechaLarga`, `tvCumpleFecha` y
  `tvResumenFecha` (comparan en fecha **local** y aceptan rangos abiertos).
- **`apps/trickvault/app.css`**: bloque `.date-bar` / `.date-toggle` / `.date-input` con el
  estilo de la app, `color-scheme: dark` para el calendario nativo y ajuste a móvil. Se subió
  el cache-buster del CSS a `app.css?v=20261019-fecha`.
- **Susto de codificación**: al subir el `?v=` con un `-replace` de PowerShell 5.1 el fichero
  se reescribió en ANSI y se rompieron 830 acentos (`Ã¡`…). Detectado con `git diff --stat`
  (992 líneas cambiadas) y arreglado con `git checkout --` + rehacer el cambio con la
  herramienta de edición. Regla para la próxima: **no** usar `Get-Content | Set-Content` para
  tocar ficheros UTF-8; usar el editor o Node.
- **Verificado**: 0 restos de mojibake; parseo JSX con `@babel/parser` (997.968 chars, OK);
  prueba de las funciones de fecha sobre el propio fichero (19 comprobaciones: día, rango,
  rangos abiertos, tarjeta sin fecha y textos del resumen), todas OK.
- **Limitación honesta**: sin Chrome en este sandbox (Playwright falla con WinError 5): no hay
  capturas ni comprobación visual a 360/768/1280 de esta edición.

---

## 2026-10-19 — Descargas: buscador por fecha en la cola (un día o un rango)

Antonio: «añadas un buscador por fechas, tanto por una fecha concreta como por un rango».
Va en el panel **Cola**, que es donde están las descargas con su `created_at`.

- **HTML** (`apps/descargas/index.html`): bloque `.fecha-filtro` bajo el título de la cola
  con tres modos (Todo / Un día / Rango), los `<input type="date">` que toquen, botón
  «Quitar filtro» y una línea de resumen (`role="status"`).
- **JS**: fichero nuevo `app.20261019a.js` (copia del `app.20261018k.js` que se servía, más
  los cambios). Añade `claveDia()`, `fechaLarga()`, `jobsFiltrados()`, `filtrandoPorFecha()`,
  `pintarResumenFecha()`, `aplicarModoFecha()` y `bindFecha()`; `renderQueue()` pinta solo las
  descargas filtradas y el contador dice cuántas se ven.
- **CSS**: `app.20261019a.css` (copia del `k` + estilos del filtro, con `color-scheme: dark`
  para que el calendario del navegador no salga blanco, foco visible y ajuste a móvil).
- El filtro compara por **fecha local** (`YYYY-MM-DD`), acepta rangos abiertos (solo desde o
  solo hasta) y no rompe si una descarga no tiene fecha.
- **Verificado**: `node --check` del JS; prueba de la lógica con los 5 casos de filtro
  (`tools/_test_filtro_fecha.js`, todo OK); y prueba de DOM real con jsdom sobre el
  `index.html` y el JS de verdad (`tools/_test_fecha_dom.js`, 17 comprobaciones OK: modos,
  visibilidad de campos, contador, resumen, mensaje de «sin resultados» y «Quitar filtro»).
- **Limitación honesta**: en este sandbox no arranca Chrome (Playwright falla con WinError 5),
  así que no hay capturas ni auditoría Lighthouse de esta edición. Queda pendiente abrirlo en
  Chrome y mirarlo a 360/768/1280 antes de darlo por cerrado al 100 %.

---

## 2026-10-17 — Descargas: contraseña de entrada propia, separada de la de edición

Antonio pidió cambiar **solo** el login de entrada de `apps/descargas` («Solo en descargas
para el login de entrada»). Antes las cuatro apps compartían el mismo hash y
`tools/rotar-password.ps1` lo escribía en los cuatro `auth.php`.

- `apps/descargas/auth.php` tiene ahora su propio `$expectedHash` (ya no es el de
  TrickVault / video-vault / json) y el comentario de cabecera lo explica.
- `tools/rotar-password.ps1`: se quitó `apps\descargas\auth.php` de `$destinos` para que
  una rotación futura no pise esta contraseña; la cabecera avisa de que Descargas va aparte.
- `tools/memoria/credenciales.md`: nueva fila con dónde vive la contraseña de Descargas y
  cómo cambiarla a mano (sha256 en el propio `auth.php`).
- La contraseña elegida es la que pidió Antonio (no se anota aquí). Empezó siendo de 2
  caracteres y él mismo la cambió a **6** esa misma tarde; sigue siendo corta para una app
  pública, así que el freno real es el `sleep(1)` por intento fallido del propio `auth.php`.
- Verificado en producción tras el push: el login con la nueva contraseña devuelve
  `success:true` y con una incorrecta, 403.

---

## 2026-10-15 — TrickVault: cada tarjeta con su imagen, un sujeto por carpeta y ni una palabra en inglés

**Punto de partida.** Antonio: «la imagen no cuadra con la tarjeta», «hay imágenes en las que
has mezclado a dos sujetos», «dentro de una carpeta todas las imágenes deben utilizar el mismo
sujeto», «lo de comida y moda es un despropósito», «en la de luz cámara deja a la chica como
sujeto principal», «hay varias imágenes con texto en inglés» y «en los comandos de texto hay
tarjetas duplicadas».

**Qué se encontró (medido, no supuesto)**

| Problema | Causa raíz | Alcance |
|---|---|---|
| Imágenes de otra tarjeta | El almacén del servidor ganaba al repositorio y sus ficheros van desplazados (+1) | 235 tarjetas |
| Renombrados | La capa publicada (`catalogo.json`) va por id y se publicó con otra numeración | 26 tarjetas |
| Sin ejemplo en el repositorio | 100 rutas apuntaban a ficheros que ya no existen | 215 tarjetas |
| Sujeto mezclado | Tandas anteriores con sujetos distintos en la misma carpeta | 103 imágenes |
| Dos sujetos en una imagen | El propio prompt los pedía (`/pixelart` rotulaba piezas de cámara; `/splashshot` y `/flatlay` invitaban a botella y bultos) | 3 imágenes |
| Texto en inglés | Inercia del modelo; no había forma de detectarlo | 10 imágenes |
| Tarjetas repetidas | `mergeSeedCards` solo miraba el id; el bloque de texto se renumeró | 4-7 fantasmas por navegador viejo |

**Qué se hizo**

- 114 ejemplos **recuperados** del servidor (verificados uno a uno contra su código) y 100
  **generados** con `openai-image-2-low`. El repositorio tiene ya un ejemplo de cada código.
- Precedencia de imagen **determinista**: publicada > propia > `data:` > **repositorio** > almacén.
  (Antes eran dos efectos asíncronos compitiendo: la misma tarjeta podía verse distinta según
  qué petición llegara antes.)
- `catalogo.json` **reencajado por código** y sin las imágenes del almacén.
- **103 imágenes** regeneradas con el sujeto único de su carpeta (xl-pintura 28, xl-juegos 23,
  xl-verdentro 16, xl-estilos 13, xl-letras3d 11, xl-casaviajes 8, xl-hechomano 3, xl-carteles 2).
- **68 imágenes** más: las 59 de `xl-luzcamara` con la chica y las 10 con inglés.
- **Carpeta nueva `xl-moda`** (25) y `xl-comidamoda` → «Comida» (26).
- **Fantasma del navegador** arreglado en `mergeSeedCards`.
- Herramientas nuevas: banco de pruebas con el almacén real simulado (`_banco_server.py` +
  `_run_banco.cmd`), OCR de Windows (`_ocr.ps1`), detector de inglés, tiras de sujeto
  (`_tira_carpeta.py`, `_zoom.py`, `_verif_carpetas.py`) y hojas de revisión
  (`_hojas_revision.py`).

**Commits:** `915bd61` (imágenes correctas + precedencia), `7f9e607` (sujeto único por
carpeta), `0a8403b` y `8524da6` (remates), `276a1fd` (Moda/Comida, luzcamara, inglés),
`6e7468e` (fantasmas de texto).

**Verificación:** banco en Chrome con el almacén contaminado real: navegador nuevo
**1101 tarjetas OK / 0 fallos / 0 sin cargar**, y con **1223 tarjetas ya guardadas y
ensuciadas a propósito**, idéntico. Repetido contra producción. OCR completo sin inglés.
6 fantasmas fabricados → 0 tras recargar.

## 2026-10-15 — OmniRoute: arranque oculto, diagnóstico de la ventana y esta memoria

**Punto de partida.** Antonio pregunta por la memoria del agente y por un montaje antiguo:
un script que, al encender el PC, abría la URL de OmniRoute y una terminal, con la idea de
que eso optimizaba los tokens.

**Qué se descubrió**

1. El script existía: `E:\hermes-data\omniroute_deepseek_autostart.py` + `.cmd` + `.vbs`,
   este último en la carpeta de Inicio de Windows. Hacía tres cosas: arrancar el gateway si
   estaba caído, loguearse en el panel y **re-registrar DeepSeek cada hora** (sus
   credenciales no sobreviven a los reinicios del servidor).
2. **No abría ningún navegador.** La terminal que aparecía sola era otra cosa.
3. La ventana salía de un `cmd.exe` intermedio: el daemon lanzaba el shim `omniroute.cmd`,
   y `DETACHED_PROCESS` sobre un `.cmd` hace que Windows cree una consola nueva.
4. **El ahorro de tokens no viene de tener ventanas abiertas**, sino de que las
   herramientas apunten su `base_url` al gateway (`http://localhost:20128/v1`), que aplica
   compresión RTK+Caveman y failover a capas gratuitas. Una ventana abierta no ahorra nada.

**Qué se hizo**

| Acción | Resultado |
|---|---|
| Levantar el gateway | Arriba, DeepSeek activo |
| Daemon v2 | `pythonw` + `node` directo + `CREATE_NO_WINDOW` + candado de instancia + log con rotación |
| Instalador y verificador | `tools/omniroute/instalar-autostart.ps1` y `verificar-omniroute.ps1` |
| Guía de réplica | `tools/omniroute/GUIA-OMNIROUTE.md` (incluye cómo montarlo en otro PC) |
| Arranque automático | `…\Startup\omniroute_gateway.vbs`; los lanzadores v1 quedaron como `.bak` |
| Memoria del proyecto | Esta carpeta `tools/memoria/` |

**Evidencia**

- Cadena nueva: `pythonw.exe` → `node.exe ...\bin\omniroute.mjs serve` → `node dist/server-ws.mjs`.
  Sin `cmd.exe`.
- `tasklist /v`: `N/D` (sin ventana) para los tres procesos.
- Candado probado: `Ya hay un daemon vivo (PID 27956). Salgo sin duplicar.`
- Gateway arriba en 2 s; `DeepSeek ya registrado y activo. OK.`

**Errores cometidos** (detalle en `errores.md`): falso "puerto cerrado" por CIM denegado en
silencio; diagnóstico inicial incompleto de la ventana; `pythonw` del venv de Hermes; BOM en
el fichero de secreto; `pwsh` inexistente; `ExecutionPolicy`; y el error del job runner que
**sí había ejecutado** el comando (riesgo de duplicar trabajo).

**Commits**

- `f65fa58` — `feat(omniroute): arranque oculto v2 + guia de replica`
- `c7f061f` — `feat(memoria): memoria operativa del proyecto en tools/memoria`
- `119901a` — `docs(memoria): anota el commit de la propia memoria en la bitacora`
  ⚠️ **Este commit salió contaminado**: por usar `git commit -am` arrastró y publicó
  trabajo pendiente de otra sesión (`apps/json/`, `skills/SKILL_VIDEOVAULT_VIDEOS.md`,
  `tools/trickvault/*`). Ver `errores.md`. Detectado y avisado a Antonio; **no se revirtió**
  para no borrar ese trabajo del disco.

**Queda abierto:** ver `pendientes.md` (lo importante: apuntar el agente al gateway).

---

## 2026-10-15 (segunda parte) — Ampliación de la memoria: credenciales, producción y hallazgo de seguridad

Antonio pide ampliar la memoria con los pasos **1 (credenciales), 3 (producción) y
4 (histórico de fallos)**.

**Se hizo**

| Acción | Resultado |
|---|---|
| Inventario de credenciales | `credenciales.md`: 9 almacenes, nombres de claves (nunca valores) y a quién afecta cada rotación |
| Estado de producción | `produccion.md`: barrido de **80 rutas de `apps/`, las 80 con HTTP 200**, con la fecha del `index.html` de cada una |
| Histórico de fallos | `errores-historicos.md`: **40 entradas** rescatadas de Hermes, cron y backups (trabajo delegado a un subagente) |

**Hallazgo de seguridad (lo más importante del día)**

- **37 ficheros** dentro de `apps/` llevan una clave de Google (`AIza…`) escrita en el
  código: **6 claves distintas**, casi todas servidas por web con HTTP 200.
- El repositorio `github.com/atnojs/ANTIGRAVITY` es **público**, así que están expuestas por
  partida doble, y el historial de git las conserva aunque se borren.
- Afecta a apps vivas (`generar_imagenes`, `imagenes_ia`, `viaje_tiempo`,
  `prompts_predeterminados`, `decorar_habitacion`) y a `apps/Copias por si/`, que también se
  sirve.
- Se documentó en `credenciales.md` y se marcó como **urgente** en `pendientes.md`.
  **No se tocó ninguna clave**: la revocación es decisión de Antonio.

**Comprobado que está bien:** `E:\ANTIGRAVITY\keys\` (gitignored, línea 106) y
`E:\ANTIGRAVITY\.private\` están fuera de git e inaccesibles por web (`403`/`404`).

**Método que funcionó:** delegar el rastreo del histórico a un subagente con un fichero de
salida propio (`errores-historicos.md`) evitó cargar decenas de documentos en el contexto
del agente principal y no hubo conflicto de escritura.

---

## 2026-10-16 — Archivos de septiembre a su carpeta en `D:\Descargas`

Antonio pide «entra en la carpeta de descargas y crea una carpeta con todos los archivos de
septiembre». **No es una tarea del repo**: se organiza el disco, no se toca código.

**Se hizo**

| Paso | Resultado |
|---|---|
| Localizar la carpeta | `%USERPROFILE%\Downloads` **no existe**; `shell:Downloads` = **`D:\Descargas`** |
| Criterio | `LastWriteTime` en `[2026-09-01, 2026-10-01)` |
| Lote calculado antes de mover | **705 objetos** (704 archivos + la carpeta `ZjY4…==`), **17.044,09 MB**, 0 nombres repetidos |
| Destino | `D:\Descargas\2026-09_Septiembre` (convención ya existente: `2026-07_Julio`, `2026-08_Agosto`) |
| Ejecución | 705/705 movidos, **0 fallos** |

**Exclusiones que había que hacer sí o sí**

- `2026-08_Agosto`: `LastWriteTime` 09/09/2026 (se creó en septiembre), pero dentro está
  **agosto**. Toda carpeta `^\d{4}-\d{2}_` se excluye.
- `PortableApps`: `LastWriteTime` 19/09/2026, pero es una instalación portátil de 2024.

**Verificación**

- Destino: 705 objetos, 17.044,09 MB y **0** con fecha fuera de septiembre → cuadra con el
  lote con el que se entró.
- Raíz: `959 − 705 = 254` originales + la carpeta nueva + 1 archivo descargado *durante* la
  tarea (`Podenco Canario_ Elegancia Canaria.png`, 15:24) = **256**. Cuadra.
- En la raíz **no queda ningún archivo de septiembre**; solo las 2 carpetas excluidas a
  propósito (`2026-08_Agosto`, `PortableApps`).
- La subcarpeta movida sigue intacta (sus 2 documentos con sus fechas).
- Se movió con `Move-Item` dentro del mismo volumen: es un renombrado, no hay copia que
  pueda corromperse.

**Error de entorno cometido** (detalle en `errores.md`): dar por hecho que la carpeta de
descargas era `%USERPROFILE%\Downloads`, y chocar con el sandbox al escribir en `D:\` estando
en modo `workspace-write`. Se resolvió reintentando esa misma operación con
`sandbox_permissions: danger-full-access`.

**Commits**

- `886c23c` — `docs(memoria): descargas de septiembre, receta de organizacion por mes y error
  del sandbox en D:` (commit aislado por rutas explícitas: solo los 3 ficheros de `tools/memoria/`)

**Receta reutilizable:** `recetas.md` → «Organizar las descargas por mes» (para octubre, que
ya tiene 245 archivos acumulados).

---

## 2026-10-16 (segunda parte) — El mecanismo con el que Antonio publica TrickVault

Antonio pide documentar **cómo actualiza él TrickVault**. No estaba en la memoria: lo que había
era el flujo del **agente** (`skills/SKILL_TRICKVAULT_IMAGENES.md`: generar imágenes, commit,
push), no el suyo. Su pista: «cuando entro en modo edición, al final de la tarjeta aparece el
botón de actualizar».

**Lo que hace él**

Entra en **modo edición** (candado → contraseña) y, **al final de la página, debajo de las
tarjetas**, aparece el panel **«🚀 Publicar en GitHub»**: elige `solo lo que he cambiado (todas
las carpetas)` o `solo «<carpeta>»`, pulsa **«🚀 Publicar cambios»**, acepta el `confirm` y la app
llama a `publicar.php`. Hay además un «🔎 Comprobar conexión» que solo diagnostica.

**Lo que salió de leer el código (y no estaba escrito en ninguna parte)**

| Hallazgo | Detalle |
|---|---|
| **No lanza git** | Hostinger tiene `exec`/`shell_exec`/`proc_open` deshabilitados: usa la **API de GitHub** (blobs → tree → commit → ref) |
| **Un solo commit** | `apps/trickvault/catalogo.json` + `apps/trickvault/assets/publicado/<id>.jpg` |
| **Secretos fuera del alcance** | La contraseña se delega en `auth.php`; el token de GitHub vive solo en el `SetEnv` del `.htaccess` raíz y nunca vuelve al navegador |
| **Crea commits reales en `main`** | Sin pasar por el agente: hay que mirar `origin/main` antes de tocar el catálogo, o el push choca |
| **El «montón de carpetas»** | `resumen.carpetas` es el **total** de carpetas (`listaCarpetas.length`), no las cambiadas; lista y orden son globales y viajan en **todas** las publicaciones a propósito |

Ese último punto resuelve la duda con la que venía: al publicar dos tarjetas ve
«• N carpetas y su orden» y parece que va a subir todas las carpetas. **No es un fallo**: es el
recuento de la lista global (así todos los navegadores ven lo mismo). Para publicar de verdad
una sola carpeta hay que usar el selector **«Solo «<carpeta>»»**.

**Verificación**

- `https://atnojs.es/apps/trickvault/publicar.php` por GET responde **405** con el mismo mensaje
  que `publicar.php:507` (`Este endpoint solo acepta POST.`) → lo desplegado es lo del repo.
- El panel solo se pinta con `editUnlocked` (`index.html:6931`), después de las vistas de
  tarjetas (`index.html:6881-6927`).
- **No comprobado:** el clic real en producción (hace falta la contraseña de edición). Queda
  dicho así en la receta en vez de darlo por probado.

**Commits**

- `542e0c5` — `docs(memoria): el flujo de Antonio para publicar TrickVault desde la app`

**Receta reutilizable:** `recetas.md` → «TrickVault: publicar cambios desde la propia app».

---

## 2026-10-16 (tercera parte) — Inventario de lo que no está versionado

Antonio pide «prepara la lista» de todo lo que el repo tiene sin versionar, porque su panel de
git le enseña «un montón de carpetas por subir» y no entiende por qué sigue ahí.

**Lo que se midió**

- El panel no miente pero engaña: git **colapsa** los directorios sin versionar. Las **256
  entradas** de `git status` son en realidad **57.427 ficheros** y unos **5,8 GB**.
- Los tres bloques grandes son lotes de imágenes de trabajo: `tools/_ig2/` (26.440 ficheros,
  1,9 GB), `tools/imagen_json_prompt/` (34.339, 941 MB) y las 22 carpetas
  `tools/trickvault/*_gen/` (959 PNG, 1,6 GB).

**Hallazgo de seguridad (lo importante del día)**

- `apps/video-vault/auth.php` **está versionado** y lleva el sha256 de la contraseña.
  `apps/json/auth.php`, que **no** está versionado, lleva `AUTH_PASSWORD_HASH` con **el mismo
  hash** → misma contraseña para las dos apps, y el repositorio es público.
- Es un sha256 **sin sal**: se rompe con diccionario y GPU. Anotado como **0-bis** en
  `pendientes.md`; la única solución real es **rotar la contraseña**, porque el historial de git
  conserva el fichero aunque se saque.

**Hueco de herramientas encontrado**

- La skill `trickvault-imagenes` manda usar `_carpeta_gen.py`, `_carpeta_upload.py`,
  `_carpeta_contact.py`, `_escribir_sujetos.py`… y **ninguno está versionado**: un clon limpio
  se queda sin pipeline (solo `_carpeta_lote.py` está en git). Lo mismo con
  `tools/commit-aislado.ps1`, que esta misma memoria cita como «ya existente en el repo».

**Entregable:** `pendientes.md` §7, con los cuatro grupos (subir / ignorar / nunca versionar /
decidir), recuentos, tamaños y el siguiente paso. **No se ha tocado nada**: ni un `git add`,
ni una línea de `.gitignore`. Espera validación de Antonio.

**Commits**

- `cb88397` — `docs(memoria): inventario de lo no versionado y segundo hallazgo de seguridad`

---

## 2026-10-16 (cuarta parte) — Limpieza ejecutada: de 256 entradas a 1

Antonio dice «empieza por donde quieras», así que empiezo por la limpieza, que es la que quita el
ruido del panel y no depende de ninguna decisión suya.

**Resultado**

| | Antes | Después |
|---|---|---|
| Entradas sin versionar | 256 | **1** (`apps/dev/`) |
| Modificados | 1 | **0** |
| Ficheros ocultos tras esas entradas | 57.427 | — |

**Qué se hizo** (commits `1cfa411` y `3d97c8d`)

- **Subidos 80 ficheros (0,34 MB)**: `tools/commit-aislado.ps1`; el pipeline de imágenes de
  TrickVault (10 `.py`); los reels (9); las specs `_xl-*.json` (11) + `_ejemplos_xl-fotoproducto.json`
  + `_retroedu.json`; las herramientas de `tools/video-vault/` (28); `logo_solo_lineas.py`,
  `quitar_fondo.py`; `tools/evidencias/` (3); `tools/veronicaz/` (3); y el
  `skills/SKILL_VIDEOVAULT_VIDEOS.md` que tenía 13 líneas sin confirmar.
- **Bloque nuevo en `.gitignore`** para el material de trabajo, con las familias de pipeline
  exceptuadas por negación.
- **Escaneo de secretos previo** sobre los 101 candidatos: **limpio** (ni `AIza…`, ni `sk-…`,
  ni `ghp_…`, ni tokens en asignaciones).

**Corrección de un error mío de clasificación**

`apps/dev/null` **no** era basura de una redirección mal hecha: son **648 líneas de una app React
real** (generación de imágenes, 8 modelos, historial, compartir), y es contenido **único** —
ningún otro fichero del repo tiene ese tamaño ni ese sha256. Así que **no se ha ignorado**: sigue
apareciendo en el panel a propósito, para que no se pierda de vista. Queda anotado en
`pendientes.md` §7.e.

**Verificado**

- `https://atnojs.es/tools/memoria/recetas.md` y `https://atnojs.es/tools/video-vault/runner_diario.py`
  → **403**. Lo subido a `tools/` **no** es accesible por web (era la premisa que había que probar).
- El pipeline sigue en git: `git ls-files tools/trickvault` → **198** ficheros. `.gitignore` no
  afecta a lo ya versionado, así que las negaciones no pueden «desversionar» nada.

**Errores cometidos** (detalle en `errores.md`): el `if (git …)` de PowerShell, que evalúa la
**salida** y no el código de salida y me hizo «arreglar» algo que ya funcionaba; y la negación `!`
sin extensión, que re-incluyó 20 PNG de contacto, un `.txt` y dos `*_backup.py`.

**Commits**

- `1cfa411` — `chore(limpieza): versionar las herramientas que faltaban e ignorar el material de trabajo`
- `3d97c8d` — `chore(gitignore): ignorar tambien los guiones de un solo uso y las copias`

**Queda abierto:** el 0-bis (rotar la contraseña con el hash publicado) y decidir qué es
`apps/dev/null`.

---

## 2026-10-16 (quinta parte) — Contraseña de edición rotada y verificada

Antonio dice «contraseña»: cerrar el hallazgo 0-bis. Antes de tocar nada resultó ser **peor de lo
que parecía**.

**El hallazgo, con nombre y apellidos**

- El hash guardado es `sha256` de **un solo dígito**. No hacía falta *buscar* la contraseña:
  **diez intentos** y se entraba; el hash publicado en el repo solo lo confirmaba.
- Estaba en `apps/video-vault/auth.php` (**versionado**) y en el historial de git desde
  `6d7ef50`, `7037dc1` y `577652e`. El repo es público.
- Y había una **tercera copia invisible**: `apps/trickvault/auth.php` existía **solo en el
  servidor** — ni en git ni en disco — y es la que usa la app para desbloquear el modo edición
  (`AUTH_URL` en `index.html:29`) **y** `publicar.php` para cada publicación. Sin ella no se
  podía rotar desde el repositorio.

**Qué se hizo**

1. `tools/rotar-password.ps1`: genera la contraseña, calcula el sha256 **con PHP** (lo mismo que
   ejecuta el servidor), escribe el hash en los tres `auth.php`, **lo relee para comprobarlo** y
   guarda el valor en claro en `.private/` (gitignored, `Deny from all`). UTF-8 **sin BOM**, que
   un BOM delante de `<?php` se enviaría como salida y rompería las cabeceras.
2. **`apps/trickvault/auth.php` entra en git**, para que la próxima rotación sea un push.
3. `.private/` pasa a estar **entero** en `.gitignore` (antes solo se ignoraba `config.json`).

**Verificado (no es «debería funcionar»)**

- Local: hash calculado con PHP = hash escrito; los 3 ficheros sin BOM y con `php -l` limpio; el
  hash viejo ya no está en ningún fichero del árbol.
- Producción: sondeo cada 20 s hasta que `POST auth.php` dio **200** en trickvault y video-vault
  (a los ~2 min del push, `153cc63`).
- **Navegador real** (Chrome headless vía REA): abrir la app, pulsar «Activar edición», meter la
  contraseña nueva → la red muestra `POST /apps/trickvault/auth.php → 200`, el DOM final tiene
  `Publicar en GitHub`, `ExportImport` y «Arrastra cualquier carpeta» (solo existen con
  `editUnlocked`) y el modal se ha cerrado sin «Contraseña incorrecta». Captura en
  `tools/evidencias/2026-10-16_trickvault-modo-edicion-desbloqueado.png` (sha256 comprobado).

**Commits**

- `153cc63` — `fix(seguridad): rotar la contrasena de edicion y traer a git el auth.php de trickvault`

**Documentado en:** `credenciales.md` (dónde vive ahora y cómo se rota) y `pendientes.md` 0-bis
(cerrado).

---

## 2026-10-16 (sexta parte) — Claves de Google: inventario verificado y herramienta de rotación

Antonio pide rotar las claves. **No se han podido rotar desde aquí**, y eso se comprobó en vez de
suponerse: no hay `gcloud`; el token OAuth de Hermes solo tiene Gmail/Calendar/Docs/Sheets/Drive
(**sin `cloud-platform`**, y caducó el 2026-07-09); y el service account de `keys/` vive en
`nano-banana-470719`, otro proyecto distinto. **Crear claves es consola + sesión suya.**

Lo que sí se ha hecho, y cambia bastante el trabajo que le queda:

**El inventario real no era el de la memoria.** Decía «6 claves en 37 ficheros». Son **19 claves
en 49 ficheros**, y comprobadas una a una contra la API de Google:

| | Cuántas | Qué hacer |
|---|---|---|
| **Ya muertas** (`API key not valid`) | **11** | Nada: limpiar el código |
| **Bloqueada por Google** (`reported as leaked`) | 1 | Nada: Google se adelantó |
| **Vivas y publicadas** | **5** | Rotar (2 son Firebase: basta restringir) |
| Viva pero **sin publicar** (solo en un `.md` gitignored, 404) | 1 | Rotar cuando se pueda, sin prisa |
| Vivas y restringidas por IP (servidor) | 2 de las 5 | Rotar; el daño ya está limitado |

**Hallazgos del barrido**

- **Dos claves de OpenAI y una de Gemini vivas y sin restricción** estaban en
  `apps/ESTADO_ACTUAL_2026-05-1{7,8}.md`. **No están expuestas** (gitignored + `404`), pero es un
  documento con secretos en claro dentro del árbol.
- **Trampa:** `apps/generar_imagenes/1/app.js.bak` devuelve **HTTP 200 y no está en git**. Los
  ficheros que git ignora **no se borran del servidor**: si algún día estuvieron versionados,
  siguen publicados. Hay que retirarlos a mano.
- `apps/json/auth.php` da 404: código muerto.

**Entregable:** `tools/rotar-claves-google.ps1` — inventario con el estado de cada clave
(`-Listar`), simulacro y sustitución (`-Aplicar`) con relectura de cada fichero para confirmar que
no queda la vieja. **No hace commit**: publicar es una decisión.

**Commits**

- `314873d` — `docs(memoria): inventario verificado de claves de Google y herramienta de rotacion`

---

## 2026-10-16 (séptima parte) — `apps/temp_extract` no era basura: es «Chronos Booth»

Antonio confirma que no usa `apps/temp_extract` y me dice que lo borre. **Antes de borrar lo
miré**, y menos mal.

**Lo que era de verdad**

- **«Chronos Booth»**: app exportada de Google AI Studio, *«a time-traveling photo booth that
  inserts your face into historical scenes using AI»*. React 19 + Vite 6 + Tailwind 4 + Firebase
  (Auth con Google y Firestore) + `@google/genai`; **909 líneas** en `src/App.tsx`. No es un
  resto: es una app completa.
- **Y no funcionaba donde estaba**: `apps/` se sirve como estático, y esto es un proyecto Vite.
  `index.html` pedía `/src/main.tsx` y el servidor devolvía **TSX en crudo con HTTP 200** — un
  navegador no ejecuta eso. No hay `dist/`. Comprobado también que publicaba todo el código fuente
  y `firebase-applet-config.json` con la clave `AIzaSyAYhoQj…`.

**Qué se hizo**

- `git mv apps/temp_extract tools/chronos-booth` → git lo registra como **17 renombrados puros
  (R100)**, así que el historial se conserva. `tools/` está protegido por `.htaccess`, así que la
  clave y el código dejan de ser accesibles por web.
- `tools/chronos-booth/LEEME.md` explica qué es, por qué está ahí y qué haría falta para ponerla
  viva (`npm run build`, desplegar el `dist/` y pasar la `GEMINI_API_KEY` por `proxy.php`, que
  ahora mismo se usa en el cliente).
- **No se ha borrado nada.**

**Hallazgo importante (va a `errores.md`)**

**Quitar un fichero del repositorio NO lo despublica.** Tras 11 minutos, `apps/temp_extract/`
seguía dando 200. Quedó demostrado comparando `Last-Modified`: `apps/trickvault/index.html` marca
`17:41:16` (el despliegue del commit de las 17:39 **sí corrió**) mientras
`apps/temp_extract/index.html` se quedó en `17:35:54` y sigue sirviéndose. Hostinger **reescribe**
los ficheros del repo pero **no borra** los que salen de él.

→ **Hay que borrar `apps/temp_extract/` a mano en hPanel.** Y es la misma causa del
`app.js.bak`. Y, sobre todo: como el historial de git conserva el contenido igualmente, **sacar un
fichero de git no arregla una clave: hay que rotarla.**

**Commits**

- `8192f0b` — `chore: sacar Chronos Booth (apps/temp_extract) de la web; no funcionaba y publicaba fuente y clave`

---

## 2026-10-16 (octava parte) — El despliegue se congeló y revirtió: por eso «reapareció» la carpeta

Antonio avisa de que **borró `apps/temp_extract/` y ha vuelto a aparecer**. No era un despiste suyo.

**Lo que pasaba**

- El despliegue de Hostinger estaba **congelado** en el commit de ~17:32: el `Last-Modified` del
  `.gitignore` servido llevaba más de 20 minutos clavado en `16:54:30 GMT`.
- Al fallar, **restauró el último estado bueno**, que todavía incluía `apps/temp_extract/`. De ahí
  que la carpeta volviera.
- Su borrado del `app.js.bak` **sí cuajó** (sigue en `404`): ese fichero no existe en ninguna copia
  del repo, así que no había nada que restaurar.

**Cómo lo identifiqué**

Comparé el **contenido** del `.gitignore` servido con el de cada commit candidato
(`git show <commit>:.gitignore`): coincidía con `153cc63`/`2715863`/`3f0ff72` (17:17–17:32) y con
**ninguno** posterior. Con eso supe el commit exacto en el que estaba el servidor. Con
cache-buster seguía igual, así que **no era la caché del CDN**.

**Solución**

`git commit --allow-empty` + push para re-disparar el webhook (la receta que ya estaba en
`recetas.md`). En ~2 minutos el `.gitignore` del servidor pasó a ser **idéntico al de HEAD**
(verificado). Commits: `76e642d`.

**Comprobado además, ya con el servidor al día**

- La **contraseña nueva sigue viva** (`POST auth.php` → `200`) y la vieja de un dígito **no entra**.
  La reversión no la tocó.
- `apps/temp_extract/` **sigue publicado** aunque el servidor esté en HEAD: el despliegue
  **no borra** lo que sale del repo. Queda borrarlo a mano **una vez más** — ahora ya es un fichero
  sin rastrear en el servidor, así que esta vez se queda.

**A `errores.md`:** el despliegue puede congelarse en silencio y revertir; y una reversión devuelve
ficheros ya retirados y **pisa cambios recientes**.

## 2026-10-16 (novena parte) — El descargador de vídeos de Antonio: dónde estaba y por qué YouTube fallaba

Antonio: «tengo un programa para descargar vídeos y audios pero no recuerdo el nombre y no lo
encuentro»; y después: «actualiza, que el otro no me deja bajar de YouTube».

**Dónde estaba.** `D:\Vídeos\ytdownloader\ytdownloader.bat` — un lanzador propio que abre una
ventana «YouTube Downloader» (link + carpeta + Vídeo/Solo MP3), con `yt-dlp.exe` y `ffmpeg.exe`
en la misma carpeta. **No tiene acceso directo** en Escritorio, menú Inicio ni barra de tareas:
solo existe ahí, entre las descargas. De ahí que no lo encontrara. Lo había usado esa misma tarde
(último acceso 16/10 a las 18:02).

**Lo que NO era.** `E:\JDownloader` es su **carpeta de descargas** (41 carpetas, vídeos de enero
de 2026), no el programa: JDownloader está **desinstalado** (sin entrada en el registro, sin
`.jar` ni `.exe`, sin accesos directos). Solo quedan instaladores en `D:\Duplicados\exe\` y
`F:\Copias de seguridad\Software\`. `aTubeCatcher` y `4K Video Downloader`: solo carpetas de
salida, tampoco instalados. VLC sí está instalado, pero no es un descargador.

**El arreglo.** `yt-dlp.exe` `2026.03.17` → `2026.08.19` (con copia `.bak`), más una
`yt-dlp.conf` portable con `--js-runtimes node` y `--remote-components ejs:github`. El
lanzador no se tocó. Probado de verdad: vídeo por defecto (395+251 fusionado con ffmpeg) y MP3
de 117,8 KB válido. Detalle y comprobación en `errores.md`.

**A `entorno.md`:** la ruta del descargador, para que no se pierda otra vez.

**Remate (18:30).** Antonio pide «añade .mp4» y «crea el acceso». Hecho:

- `yt-dlp.conf` gana `--merge-output-format mp4` y `-S vcodec:h264,acodec:aac,ext:mp4:m4a`.
  Probado y **verificado con `ffmpeg -i`**: `h264 (Main)` + `aac (LC)` dentro de un `.mp4`
  (formatos `133+140`). Ojo: preferir h264 limita a **1080p** en YouTube (1440p/4K solo
  existen en VP9/AV1); es el precio de la compatibilidad con Corel/Filmora.
- Acceso directo creado en el Escritorio: `D:\Escritorio\Descargar vídeos y MP3.lnk`
  (icono `shell32.dll,137`). **Probado lanzándolo**: abre la ventana «YouTube Downloader»
  (PID detectado por `MainWindowTitle`) y se cierra limpia con `CloseMainWindow()`.

**Y un tropiezo que va a `errores.md`:** el **Escritorio real es `D:\Escritorio`**, no
`C:\Users\atnojs\Desktop` (esa carpeta existe con restos viejos, así que `Test-Path` engaña).
Se saca con `[Environment]::GetFolderPath('Desktop')`.

## 2026-10-16 (décima parte) — App de descargas: del «no lo encuentro» a bajarlo desde cualquier sitio

Antonio: «así el uso está muy limitado, crea una app para poder usarla desde cualquier sitio».
Elegida la **opción C**: app en `atnojs.es` con cola en el servidor y **su PC como worker** (la
descarga tiene que correr donde están yt-dlp y ffmpeg; en Hostinger no puede, y YouTube bloquea las
IPs de datacenter). Alcance pedido: calidad y formato, playlists, varias a la vez con progreso,
historial desde cualquier dispositivo y que valga para otras webs.

**Lo construido.** `apps/descargas/` (interfaz Hoola, `api.php` con cola + subida por trozos +
descarga autenticada, `auth.php` con la contraseña de edición, y los canónicos `proxy.php`,
`history.php` y `history-manager.js`) y `tools/descargador/` (worker en Node que recoge trabajos,
baja con yt-dlp y sube los ficheros por trozos de 16 MB). El worker se delega a un subagente, que
lo prueba contra un mock propio: **fichero ensamblado idéntico por SHA-256**, cancelación, error de
yt-dlp, Ctrl+C real y config inválida.

**Lo que cazó la prueba de extremo a extremo** (y no se veía leyendo el código): el worker manda la
acción **dentro del JSON** (`{"action":"next"}`) y `api.php` solo la leía de la query string, así que
caía en la rama de usuario y devolvía `401 Sesión no iniciada`. Arreglado, y de paso el fichero se
reescribe limpio: había quedado con **mojibake** al pasar por `Get-Content`/`Set-Content` de
PowerShell 5.1 (lee UTF-8 como CP-1252 si el fichero no lleva BOM).

**Segundo fallo, ya con el usuario delante:** su vídeo se bajó entero (55 MB) y murió al subirlo con
**HTTP 413** — el tope de trozo de la API (12 MB) se había quedado por debajo del que manda el worker
(16 MB). Corregido a 24 MB. Reproceso y **verificado**: `done`, MP3 de 55,3 MB, descargado de
producción en 2,4 s y validado con `ffmpeg` (1 h 06 min, 44,1 kHz estéreo).

**El 403 que parecía de la app, no lo era.** Antonio dijo que ese vídeo lo había bajado antes con la
otra app; cierto, pero el bloqueo era **de YouTube contra su conexión en ese momento**: un vídeo de
control que había funcionado una hora antes también devolvía 403, igual que los comandos exactos de
su `.bat` y que todas las variantes de `player_client`. Se fue solo. Aun así el worker ahora traduce
los fallos típicos al castellano y admite un `cookies.txt` opcional.

**Auditoría de accesibilidad con medición real.** Los fondos se midieron **sobre la captura de
producción** (no estimados): `--faint` daba 3,78:1 y el rojo de error 2,9:1, los dos por debajo del
4,5:1 de WCAG AA. Ahora `--faint #93AEBF` = 4,61:1 y `--danger-text #ff9a9a` = 5,27:1, y la barra de
progreso anima `transform` en vez de `width`.

**Queda abierto:** el CDN de Hostinger no ha refrescado `index.html`/`app.css` (sirve estáticos
cacheados por ruta e **ignora la query**, así que `?t=<guid>` no rompe nada). La app funciona —es un
retoque de contraste—; el siguiente paso está en `pendientes.md`.

## 2026-10-17 (madrugada) — Descargas: subir solo cuando toca, 48 h, elegir carpeta y el móvil arreglado

Antonio deja cuatro encargos y se va a dormir: «esto lo puedes ir haciendo tú solo y mañana lo
tienes listo». Repaso de lo hecho, con lo que salió mal incluido.

**1. Subir a la web solo cuando hace falta.** La app funcionaba, pero para un fichero pedido desde
el propio PC hacía el ridículo: bajaba 55 MB, los subía al servidor y él los volvía a bajar. Ahora,
en casa y sin marcar la casilla, el fichero **se queda en su carpeta y no se sube ni un byte** (como
la `.bat`); desde fuera, o marcando la casilla, se sube. Verificado en producción con el mismo vídeo
en dos trabajos: sin marcar **no llega nada** al servidor (la descarga da 404), marcado llega
(114,3 KB).

**2. Retención de 48 h** (`RETENTION_DAYS` → `RETENTION_HOURS`), con borrado automático.

**3. Elegir la carpeta de descarga**, con la lista de unidades del PC (C: D: E: F: G: H: I:) para
poder tirar a un USB. El worker valida, crea la carpeta y **comprueba que se puede escribir** antes
de confirmar. Probado en producción: pedido a `D:\Vídeos\prueba-carpeta`, aplicado en 10 s, carpeta
creada en el PC y guardada en la config. Restaurada después a `D:\Vídeos\descargas-app`.

**4. El móvil.** Se midió en Chrome con un banco propio (la app en iframes de 320 a 1920 px):
**417 px de desborde** a 390 px. La causa: al pasar a columna se quedó `align-items: flex-start`, y
así los hijos no se estiran: adoptan su ancho máximo, y un título largo los llevaba a 795 px dentro
de una pantalla de 390. Con `align-items: stretch` + `min-width: 0`: **0 px de desborde en 12
anchos**.

**Lo que salió mal (y está en `errores.md`):**
- «La elección de carpetas no funciona» **era la caché**: el HTML ya traía el panel pero el JS
  cacheado no tenía la lógica. La CDN indexa por ruta e ignora la query, así que `?v=` no rompe
  nada: hay que **renombrar** los assets. Comprobado con datos.
- El despliegue se **congeló 10 minutos** (404 en los ficheros nuevos); se arregló re-disparando el
  webhook con un commit vacío.
- **Volví a cometer el error del mojibake** con `Set-Content` (ya documentado desde ayer): todos los
  acentos del `index.html` a `Ã³`. Deshecho, y a partir de ahora esos ficheros se tocan con
  `[System.IO.File]`.
- `mb_strlen` sin `function_exists`: 500 con el cuerpo vacío en un PHP sin mbstring. Corregido.
- La detección de «estoy en casa» **por IP es imposible en esta línea** (CGNAT: la IP pública cambia
  entre peticiones). Queda una sonda directa al worker en `127.0.0.1:8125` (Chrome pide permiso) y
  un **conmutador a un toque** guardado por dispositivo, que es lo que no engaña.

**Pendiente para cuando vuelva:** el botón «Traer a la web» para un fichero que ya está en el PC
(él lo aprobó en la conversación y no ha dado tiempo), y borrar las copias de assets que se han ido
acumulando cuando expire la caché de 7 días.
**Cierre (21:50).** Se remata el hueco que quedaba: **botón «Traer a la web»**. Si un fichero se
quedó en el PC (en casa, sin marcar la casilla) y luego lo quiere en el móvil, ya no hay que volver
a pegar el enlace: se pide desde la web y el worker lo sube. Probado primero en el banco local y
después en producción, con el fichero de siempre: `local=True` 117.029 B → pedir → `local=False` y
**descarga HTTP 200 con los mismos 117.029 bytes**, y el historial con **una sola entrada** (la
actualiza, no la duplica).

Tres fallos propios por el camino, los tres cazados por la prueba y ninguno por lectura del código:
el bloque de actualización quedó colocado **antes** de ensamblar el fichero (`$written` null →
TypeError 500); el callback de progreso no puede ser `null` porque la cadena hace `.catch()`; y las
subidas pendientes no se devolvían cuando **no había trabajo en cola**, que es justo el caso normal.
## 2026-10-17 (mañana) — Un botón para elegir carpeta y el fichero suelto en la carpeta

Antonio, con la app ya en marcha: «lo de seleccionar la ubicacion de descargas no me gusta, quiero
que sea un solo boton donde yo clique y se abra el explorador para seleccionar la carpeta» y «cuando
se descarga el archivo se crea una carpeta nueva y tiene esos 3 archivos y no los quiero así. el
archivo debe alojarse solo y en la carpeta seleccionada».

**1. Un solo botón con el explorador de Windows.** Fuera el desplegable de unidades, el campo de
texto y el botón "Cambiar": queda la carpeta actual y **un botón**. El diálogo lo abre el worker
(el navegador no puede revelar rutas reales del disco): `FolderBrowserDialog` por PowerShell en modo
`-STA`, con un formulario oculto siempre encima para que salga delante. Probado de extremo a
extremo: el botón pide `elegir_carpeta` → el worker abre "Buscar carpeta" (captura guardada) →
pulsado **Aceptar** por automatización → carpeta aplicada y guardada en la config. Y el camino de
**Cancelar** también: cierra y la web muestra "Has cerrado el explorador sin elegir carpeta".

**2. El fichero, suelto en la carpeta elegida.** Antes cada descarga creaba `j_<id>/` con el mp3,
`_ytdlp.log` y `.info.json`, y ahí se quedaba. Ahora la descarga trabaja en
`<carpeta>/.descargas-tmp/j_<id>` (**oculta**), al terminar **mueve** los ficheros de audio/vídeo a
la carpeta elegida, borra la carpeta de trabajo (y la base si queda vacía) y no pisa nada: si ya
existe el nombre, añade " (2)". Verificado en producción: la carpeta del usuario quedó con **un
solo fichero** y **cero carpetas**; con ffmpeg se comprobó que el mp3 es válido (3:15, 130 kb/s).

**Lo que salió mal (está en `errores.md`):** 4 workers a la vez por mi forma de reiniciar (uno viejo
atendió un trabajo y lo dejó en carpeta); filtrar procesos por `CommandLine` mata tu propio script;
`$pid` es reservado; el bloque de `item_done` estaba antes de ensamblar el fichero (500); y **borrar
las carpetas `j_*` viejas se llevó por delante ficheros que solo estaban en el PC** (un mp3 de
Chayanne, recuperado descargándolo otra vez; el resto estaban subidos y a salvo).
## 2026-10-17 (tarde) — Explorador grande y app centrada

Dos encargos de Antonio: «el explorador que se abre es muy pequeño, lo quiero mucho más grande» y
«has hecho la app del ancho de la pantalla y se ve fea, deja los campos un pelín más pequeños y
centra el contenido».

**1. Explorador grande.** El `FolderBrowserDialog` de PowerShell 5.1 es el diálogo antiguo: 334x383
y de tamaño fijo. Se cambia al `IFileOpenDialog` moderno de Windows (interop COM en
`elegir-carpeta.ps1`): **960x540**, redimensionable, con barra de ruta y centrado. Comprobado en
producción: abre directamente en `BACKUPS (D:) > Vídeos > descargas-app`, y al aceptar devuelve esa
carpeta. Costó tres cosas: ventana propietaria invisible para que salga delante, salida en UTF-8
(sin eso la tilde de `Vídeos` llegaba corrupta) y no esperar el diálogo en el latido.

**2. App centrada.** `.wrap` de 1800 a **1240 px** centrado; campos y controles un poco más
compactos. Medido en Chrome sirviendo la versión anterior (git HEAD) y la nueva:

  ancho   .wrap antes   .wrap ahora   desborde
   320        320            320          0
   390        390            390          0
   768        768            768          0
  1024       1024           1024          0
  1440       1440           1240          0
  1920       1800           1240          0

Comparativa en `tools/evidencias/comparativa_ancho_descargas.png`.

**Fallo grave cazado usando la app de verdad:** un trabajo real (HA-ASH) se quedó `running` sin
avanzar. Era mío: si el sondeo devolvía a la vez un trabajo y la petición de abrir el explorador, el
`continue` descartaba el trabajo ya marcado como `running` en el servidor. Arreglado, y añadido un
guardián que cierra los trabajos con más de 15 minutos sin progreso. También se limpiaron 7 entradas
de prueba del historial y la carpeta quedó devuelta a `D:\Vídeos\descargas-app` (un diálogo de
prueba la había puesto en el Escritorio).
## 2026-10-17 (tarde) — Fase 1: Playwright CLI y verificación funcional en el flujo

Antonio pidió examinar el Short de `revolutia` «5 Herramientas Para Que Tu App De Claude Code No
Parezca De 2006» y arrancar la Fase 1 del plan. De las cinco, se integra la que tapa el hueco real:
**Playwright CLI** (`microsoft/playwright-cli`).

- **Instalado:** `@playwright/cli` **0.1.22** global (`npm i -g @playwright/cli@latest`), binario
  `E:\npm\playwright-cli.ps1` (ya en PATH). Node 24.14 y Chrome 155 existentes; no descarga navegadores.
- **Skill nueva:** `skills/SKILL_VERIFICACION_PLAYWRIGHT.md` + puntero
  `.claude/skills/verificacion-playwright/` (regenerado con `tools/generar-punteros-skills.php`:
  14 punteros, 0 a revisar). Enganchada en `capturas-verificacion` (llamada + checklist) y en
  `SKILL_MAESTRA` Fase 5. `.gitignore` ignora ya `.playwright-cli/`.
- **Prueba real (producción):** TrickVault. Abrir → snapshot → `fill e32 "logo"` (14 resultados) →
  clic carpeta «Comida» → `console` → `requests` (dinámicas 200) → resize 768/393 → `close`.
  Evidencias en `tools/evidencias/2026-10-17-verificacion-playwright/`.
- **Hallazgo:** error y warning de **Babel en el navegador** en producción (preexistente, anotado
  en `pendientes.md`).
- **Commit:** `124556e`.
## 2026-10-17 (tarde-noche) — Las seis mejoras que eligió Antonio

De la lluvia de ideas eligió: buscar en YouTube dentro de la app, reintentar, PWA con «compartir»,
MP4 h264 de verdad, cola en paralelo, y el aviso SOLO si llega por WhatsApp.

1. **Buscar en YouTube:** la consulta la resuelve el PC con `yt-dlp "ytsearch10:..."` (sin clave de
   API; el hosting no se come los bloqueos). La web pide, hace polling y pinta 10 tarjetas con
   miniatura, canal y duración, con botón DESCARGAR que encola con los ajustes actuales.
   Probado en local y en producción: 10 resultados reales.
2. **Reintentar:** botón en fallidos/cancelados que reutiliza la URL guardada; y **reintento
   automático** con espera 30/120/300 s solo para errores temporales (403, red, timeouts). Los
   permanentes (vídeo privado, enlace cortado) no se repiten. Probados los dos caminos por API.
3. **Cola en paralelo:** `max_parallel` (1..3, por defecto 2); el worker solo pide trabajo cuando
   tiene hueco. Verificado en producción: «Trabajos en curso: 2/2».
4. **MP4 h264 de verdad:** a 1440p/2160p YouTube no da h264, así que se baja la resolución pedida y
   el worker la convierte con ffmpeg (progreso «convirtiendo»). **Verificado con un 1440p: entrada
   VP9 → salida H.264 High 2560x1440 AAC, 238 MB**, en ~76 s. A 1080p o menos no se convierte.
5. **PWA + compartir:** `manifest.json`, `sw.js` e iconos 192/512; `share_target` →
   `compartir.php` que redirige a `index.html?compartido=<url>` y la app lo encola sola.
   Los iconos dieron guerra: el `.gitignore` global `*.png` los excluía y la CDN cacheó su 404.
6. **WhatsApp:** aviso al terminar con la Cloud API oficial de Meta. Panel en la app para
   configurarlo (sin token en git: `data/whatsapp.json` en el servidor) + botón Probar + log.
   CallMeBot está cerrado a altas nuevas (comprobado), así que se va por la vía oficial; los pasos
   para activarlo están en `tools/descargador/whatsapp-LEEME.md`. **Pendiente de que Antonio cree
   la app de Meta y meta el token.**

De propina, dos fallos del worker cazados y arreglados: el selector de formato MP4 prefería h264
SIEMPRE (a 1440p bajaba 1080p en vez de convertir) y el `max_parallel` de su config estaba a 1.
**Verificación de cierre (misma tarde).** Las seis mejoras quedaron comprobadas así:

- **Buscar en YouTube, flujo completo en navegador real:** escribir «me at the zoo» → BUSCAR →
  10 tarjetas con miniatura → clic en DESCARGAR → trabajo encolado (`Me at the zoo`, 16:35) → bajado.
  Las miniaturas se piden a i.ytimg.com y cargan (200).
- **PWA:** el navegador pide `manifest.json`, los iconos 192/512 y **`sw.js` (3 peticiones: registro
  y actualización)** → service worker registrado, que es el requisito de instalación. Ojo: los
  iconos renombrados dieron 404 un buen rato porque la CDN había cacheado el 404; acabaron
  sirviéndose solos (los originales siempre funcionaron y ahora el manifest apunta a esos).
- **WhatsApp:** con un token FALSO se verificó toda la fontanería: la petición llega a Meta y
  responde `HTTP 401 Malformed access token (OAuthException 190)`; la app lo traduce («token
  caducado o incorrecto…») y lo registra en `data/whatsapp.log`. Solo falta el token real.
- **MP4 h264 en producción:** trabajo real de 1440p → descarga VP9 → conversión con progreso
  (0,3 %→96,7 %, ~54 s) → `h264 High 2560x1440 + AAC`, 238 MB, verificado con ffmpeg.
- **Cola en paralelo:** `Trabajos en curso: 2/2` en el log de producción.
- **Reintentos:** manual y automático (espera 30 s) por API; los errores permanentes no se repiten.

Se limpiaron todos los trabajos de prueba (cola = 7 suyos, historial = 6 suyos) y la carpeta de
descargas quedó con sus ficheros.
**Cierre de la verificación (tercera pasada, en producción).**

- **«Compartir» del móvil, simulado de verdad:** POST a `compartir.php` con un enlace de YouTube →
  redirige a `index.html?compartido=<url>` → abierto en Chrome con sesión → **la app rellenó el
  campo y encoló el vídeo sola** (trabajo `Me at the zoo`, 16:47, bajado). Es exactamente lo que
  hará el móvil al compartir desde YouTube.
- **Progreso por elemento:** el worker ya manda `item_index`/`item_count` (parsea
  `[download] Downloading item N of M`) y la cola lo pinta: verificado con la web mostrando
  **«Audio MP3 · elemento 2/3»**.
- **PWA consistente:** manifest → `icono-192/512.png`, `share_target` con `display: standalone`,
  `sw.js` servido, `index` con `app.20261017j.*`; todo HTTP 200.
- **WhatsApp:** con un token FALSO se comprobó la fontanería completa contra Meta
  (`HTTP 401 Malformed access token`, OAuthException 190) y se borró el token de prueba
  (estado: desactivado y vacío). Solo falta el token real de Antonio.
- Limpieza: cola = 7 trabajos suyos, historial = 6 suyos, carpeta sin restos, banco local borrado.
## 2026-10-17 (noche) — Fases 2 y 3, y tanda Xabatz en TrickVault

Continuación del plan del vídeo de `revolutia` y encargo nuevo: examinar el Short de Xabatz
(`recursos.xabatz.com`, 16 códigos para editar fotos) y añadir a TrickVault lo que faltaba,
revisando las tarjetas.

- **Fase 2 (commit `a4d27a5`):** copia fijada de las Web Interface Guidelines de Vercel en
  `skills/recursos/web-interface-guidelines/` (README + `2026-10-17_command.md`) y sección H
  nueva en `auditor-lighthouse-accesibilidad` (20 items + anti-patrones + formato de salida).
  Sin descargar reglas remotas en cada auditoría.
- **Fase 3 (mismo commit):** skill `recrear-desde-referencia` + puntero (15 punteros, 0 a revisar):
  captura → tokens → mapeo a marca hoola → construcción → verificación con Playwright y capturas.
  Prohíbe copiar fotos, logos o textos de la referencia.
- **Xabatz (commit `73360d2`):** de los 16 códigos, 10 ya existían y se revisaron con hoja de
  contacto (imagen↔prompt↔código y texto en español: correctos). Se añadieron 6: `/phantom`,
  `/speedframe`, `/hairstylegrid` (imagen; ejemplos con `openai-image-2-low` y el sujeto único de
  cada carpeta) y `/faceharmony`, `/skinglowtips`, `/colourfittips` (texto). Verificado en
  producción: 1242 trucos, los 6 aparecen en su carpeta, las 3 imágenes cargan 1024×1024 y no hay
  errores nuevos de consola ni 4xx/5xx.
- **Hallazgo:** `/proshot` y `/together` siguen en «Tú en otro mundo» aunque son retoque de
  persona; queda anotado en `pendientes.md` para decidir si se mueven a «Cámara y retrato».
- **Entorno:** Pillow 13 instalado en el Python 3.12 del proyecto (lo exige el pipeline de
  TrickVault); el pipeline se ejecuta con ese Python, no con el venv de Hermes.
- **Evidencias:** `tools/evidencias/2026-10-17-xabatz/` (hoja de las 10 existentes, hoja de las 3
  nuevas y capturas de producción).
**Remate de T1 (misma tarde).** Dos cosas más, ambas verificadas:

- El botón **REINTENTAR** se probó con un **clic real** en Chrome sobre un trabajo fallido: el
  trabajo volvió al worker y se reintentó (`updated_at` pasó de 16:50:42 a 17:01:06). T1 cerrado
  de punta a punta (API + worker + botón).
- Los fallos por vídeo no disponible mostraban el texto crudo de yt-dlp porque el patrón pedía
  «Video unavailable» y YouTube dice «This video is **unavailable**» (con «is» en medio). Arreglado
  y comprobado: ahora sale «El video no esta disponible: puede ser privado, estar borrado o
  restringido por pais.» delante del detalle. De paso, `VERSION_WORKER` ya dice **1.1**.

Estado: T3 (WhatsApp) sigue esperando el token de Meta de Antonio; T2 solo necesita el móvil.
## 2026-10-18 — Descargas: tres botones de origen (YouTube, Instagram y TikTok)

Antonio: «Quiero poder descargar archivos de Instagram y tiktok. Añade 3 botones y clico en el botón
correspondiente para pegar el enlace. Por defecto que sea el de youtube. La opción de youtube que
tenga un botón para ir a la página de youtube y poder buscar el archivo».

**Lo que se hizo.** En el formulario hay tres botones de origen (YouTube activo por defecto,
Instagram, TikTok). Al pulsar uno cambia la etiqueta del campo, el placeholder y la ayuda, y el
botón de al lado pasa a «Ir a YouTube / Instagram / TikTok» (abre la web en otra pestaña para
buscar y copiar el enlace). Con YouTube se mantiene además el buscador dentro de la app (yt-dlp
solo busca en YouTube, así que con Instagram/TikTok se oculta) y se mantiene el selector de
calidad; con Instagram y TikTok se oculta porque esas redes sirven un único fichero y se baja tal
cual. `api.php` detecta la red **por el dominio** (así funciona aunque se pulse el botón que no
toca), la guarda en el trabajo y la cola la muestra («MP4 · TikTok»).

**Dos fallos corregidos de paso.**
- `worker.mjs` forzaba leer cookies de Chrome para Instagram. En Chrome/Edge modernos yt-dlp no
  puede abrir esa base de datos («Could not copy Chrome cookie database») y el error es **fatal**,
  así que fallaban incluso los posts públicos. Ahora por defecto NO usa cookies del navegador y el
  mensaje de error explica cómo exportar un `cookies.txt` y ponerlo en `instagram_cookies`.
- El buscador había quedado metido dentro del `<label>` del campo de enlace (HTML inválido que
  funcionaba de milagro). Formulario reestructurado.

**Verificado en banco local (mismo código que producción):**
- Detección de red: YouTube → youtube, Instagram → instagram (aunque se pulsara YouTube),
  TikTok → tiktok, `vm.tiktok.com` → tiktok.
- **TikTok baja de verdad**: vídeo mp4 de 2,82 MB con su título.
- **Instagram** devuelve el aviso claro («Instagram no da este contenido sin sesión… cómo exportar
  cookies.txt»), no un error técnico. Instagram exige sesión: hace falta el cookies.txt.
- Capturas en escritorio (1500) y móvil (390): los tres botones caben, sin desbordes.

Desplegado: assets `app.20261018a.*` (200 en producción) y API nueva. El worker de producción se
reinició con el código nuevo.
**Confirmado en producción (14:39).** Antonio bajó **dos enlaces de Instagram** (un vídeo de 41 MB,
`Video by emmaagiil [DecVZs_uTQo].mp4`, y un MP3) y **uno de TikTok**, todo con el worker ya
corregido y sin tocar nada más. Es decir: **Instagram funciona para contenido público** desde que el
worker dejó de forzar las cookies de Chrome (era eso lo que rompía TODAS las descargas de Instagram,
también las públicas). Solo las cuentas privadas o que exigen seguir a la cuenta siguen necesitando
el `cookies.txt`/Firefox, y la app lo explica en el propio error. También cambió su carpeta de
descargas a `D:\Descargas Y, I y T` desde el botón de la app.
**Instagram con sesión (16:20).** Antonio exportó las cookies con Cookie-Editor (el botón Export
copia el JSON al **portapapeles**, no lo descarga: por eso en Descargas no aparecía nada y hubo que
leerlo con `Get-Clipboard`). Se convirtieron a formato Netscape en
`D:\Vídeos\ytdownloader\cookies-instagram.txt` (fuera del repo) y se añadió `instagram_cookies` a
`.private\descargas-worker.json`; worker reiniciado. Verificado con yt-dlp: `[Instagram] Found
Instagram account cookies` y el reel público baja con la sesión. Los dos reels que fallaron son de
cuentas que **no sigue**: Instagram no los da ni con cookies (sin sesión dice «only available for
registered users who follow this account»; con sesión, HTTP 400).
**Corrección (contrastado con el log, 16:20-17:00).** Los **10 vídeos de Instagram** que Antonio
bajó (14:35–16:07) se descargaron **sin cookies**: las cookies se configuraron a las 16:20. O sea,
los reels **públicos funcionan sin sesión**; él creía que eran privados, pero Instagram los sirvió
sin login. Y los dos reels que fallaron al principio (`DemQccogGmdey…`, `DeS9kSUjQkF…`) **siguen
fallando con cookies** (`HTTP 400`): esos posts no están disponibles, no era problema de sesión. Las
cookies quedan puestas para lo que sí exija login.
**Layout de Descargas (2026-10-18, tarde).** A petición de Antonio se intercambiaron las dos zonas:
el **historial pasa a la izquierda** y el **formulario de descargas a la derecha**, con los anchos
intactos (historial estrecho, formulario ancho). Se hizo moviendo el `<aside class="history-col">`
antes de `.main-col` en el HTML (flex en fila) y, en móvil, con `order: 1` / `order: 2` para que el
formulario siga saliendo primero. Assets `app.20261018c.*`. Verificado en banco local (escritorio
1500 px y móvil 390 px) y en producción por HTTP: el HTML servido tiene el aside en la posición
3328 y el main-col en la 3622. **El despliegue de Hostinger tardó ~4 minutos**; mientras tanto el
navegador de Antonio servía la página vieja de caché (hay que recargar con Ctrl+Shift+R).

También queda **descartado el aviso por WhatsApp**: Antonio dice que las descargas bajan tan rápido
que no lo necesita. El panel queda en la app, desactivado, por si cambia de idea.
## 2026-10-18 (tarde) — /proshot y /together pasan a «Cámara y retrato»

- **Cambio (commit `ca59b61`):** en `CODE_FOLDER`, `/proshot` y `/together` pasan de `xl-otromundo`
  a `xl-camararetrato`, y se añaden a `CATEGORY_MOVES` para que las tarjetas **ya guardadas** se
  muevan al recargar (el mismo mecanismo que se usó al partir «Comida y moda»).
- **Por qué no rompe las imágenes:** la imagen se resuelve por **código** (`SEED_COMMAND_IMAGES`),
  no por carpeta; los ejemplos siguen en `assets/xl-otromundo/` y cargan igual.
- **Verificación en producción:** búsqueda de ambos códigos → chip «Cámara y retrato» e imagen
  1024×1024; migración probada forzando `category='xl-otromundo'` en localStorage y recargando →
  las dos vuelven a `xl-camararetrato`; consola sin errores nuevos (Babel preexistente), red sin
  4xx/5xx. Capturas en `tools/evidencias/2026-10-18-camararetrato/`.
**Ajustes de layout pedidos por Antonio (2026-10-18, tarde-noche).**

- La pestaña de origen (YouTube/Instagram/TikTok) ya existía; ahora el formulario va a la izquierda,
  el **historial justo debajo** y la **cola (estado de las descargas) a la derecha** (rejilla CSS con
  `grid-template-areas: "form queue" "history queue"`; en móvil `"form" "queue" "history"`).
- Los botones **DESCARGAR** y **ELEGIR CARPETA EN EL PC** quedaron en **una sola fila** con el estilo
  de botón normal (`.btn-sm` tipo pastilla): carpeta ancha a la izquierda, Descargar pequeño a la
  derecha. Se quitó la regla vieja `.dir-btn { width: 100% }` que los deformaba.
- Fuera el panel de **Avisos por WhatsApp** (Antonio no lo usará: las descargas bajan rápido). Los
  endpoints siguen en el servidor, sin interfaz.
- «Se guardan en: …» pasa **debajo** del botón de carpeta y se quitó la frase del explorador.
- Las dos líneas de ayuda se sustituyeron por el texto de la nube que pidió Antonio
  («Para descargar el archivo en el móvil debe estar en la nube…»).
- **Scroll propio en la cola a partir de la 6ª descarga**: `ajustarAltoCola()` mide las 5 primeras
  fichas y fija ese alto como `max-height`; con 5 o menos no hay barra. Se recalcula al repintar la
  cola (MutationObserver) y al cambiar el tamaño de la ventana. Probado en banco con 6 trabajos:
  se ven 5 y la sexta queda dentro del scroll.
- Assets actuales: `app.20261018h.*` (pendiente de desplegar al escribir esto; Hostinger iba muy
  lento, entre 5 y 10 minutos por despliegue, y a veces la CDN sirve versiones mezcladas).
**Tanda de ajustes finos de Descargas (2026-10-18, noche; commits `ef3bf08` y `8d510d5`).**

Pedidos por Antonio y hechos: fuera el buscador interno de YouTube (queda solo «Ir a YouTube»);
botón DESCARGAR de 220 px a la derecha y «Elegir otra carpeta» a la izquierda; fuera la barra de
estado (PC conectado · yt-dlp · servidor) y el interruptor casa/nube (el estado se sigue detectando
solo, pero ya no hay botón manual); «Salir» arriba a la derecha del título; fuera la frase de ayuda
bajo el campo de URLs; scroll del historial con 2 filas visibles en escritorio (4 historiales) y 1
fila en móvil; assets `app.20261018i.*` y `app.20261018j.*`.
**Descargas: historial fuera y cola con scroll desde la 4ª (2026-10-18, noche; commit `ef3bf08`+`8d510d5`+ posterior).**

Tras probar, Antonio decidió: el historial se solapaba con la cola, así que **se elimina el panel de
historial** (queda solo la COLA). Cambios de esa tanda: botón DESCARGAR de **320 px**, «ELEGIR OTRA
CARPETA» ocupa el resto; **cola con scroll a partir de la 4ª descarga** (3 visibles); **botón «Limpiar
campo»** bajo el campo de URLs; fuera el buscador de YouTube y la barra de estado (ya de antes);
**títulos desde el enlace** en TikTok («TikTok · @usuario») e Instagram («Instagram · Reel ID»), que
luego se sustituyen por el título real cuando termina. Arreglado el BORRAR de la cola y la X del
historial (los enganches se habían perdido al borrar el bloque del buscador).
**REVERTIDO (2026-10-19, 14:45): el lanzador VBS del Inicio.** Antonio se asusto al ver avisos de
Windows y cosas raras tras encender el PC; se le pidio revertir. Se ha restaurado el acceso directo
original `Worker de Descargas.lnk` -> `iniciar-worker.bat` (minimizado) en shell:startup y se han
borrado `iniciar-worker.vbs` (Inicio y repo). NO se toco nada mas del sistema: ni registro, ni
servicios, ni tareas programadas, ni discos. El worker de descargas sigue funcionando (node oculto,
puerto 8125, la app lo ve). El aviso de Windows al abrir el .bat es normal y es del propio Windows.
**Incidencias del PC resueltas (2026-10-19, tarde).** (1) Papelera de `E:` dañada (el Explorador se
colgaba y salía el aviso «La Papelera de reciclaje en E: está dañada»): la papelera tenía 51.632
archivos / 1,9 GB de elementos borrados en 2026 —las fechas de 2013 eran la fecha ORIGINAL de los
ficheros, no la de borrado; la fecha real está en los `$I`—. Se rescató lo posible con un script que
reconstruye rutas originales a `E:\_papelera_rescatada_2026-10-19\` (51.464 ficheros, 1,77 GB, con
`_INDICE.txt`); 6 carpetas de `E:\...\Verónica´z\Talleres\Música` (168 ficheros, 122 MB) NO se
pudieron rescatar por rutas de 247-285 caracteres y se perdieron al vaciar. La papelera se vació y se
probó que vuelve a funcionar (borrar un fichero de prueba y verlo en la papelera). (2) **Edge** tenía
las descargas en `H:\Descargas` (vacía); corregido su `Preferences` a `D:\Descargas` (con copia
`.bak-2026-10-19`), y `D:\Descargas` ya era la carpeta de descargas de Windows (Chrome y apps la usan).
(3) Explorador colgado con previsualizaciones pegadas: reiniciar `explorer.exe`.
## 2026-10-19 (tarde) — TrickVault: 16 tarjetas nuevas de cuatro reels de Instagram

Antonio: «examina estas urls y añade a trickvault las tarjetas que no tengamos» con cuatro reels:
`DdgihjiHQSj` (codigo_adria, entrega 7 «mundos pequeños»), `DdFHEICTsMF` (soysusanquintero, fotos de
pareja), `DcrMIItPSOa` (manuelgilcontent, foto de producto) y `DeVxASAolh8` (phd_inai, comandos
virales con personajes).

- **Cómo se leyeron:** metadatos de `yt-dlp` con cookies de Instagram; los códigos de los tres
  primeros venían en la descripción; el de producto solo en pantalla y se leyó de fotogramas
  (2 fps + OCR de la banda del rótulo) y de las hojas de contactos. Receta en `recetas.md`
  («Leer los códigos de un reel de Instagram»).
- **Qué entró:** 16 códigos nuevos, cada uno con las 4 piezas del catálogo: `CODE_FOLDER`, array
  `REEL2_COMMANDS` (`reel2-cmd-NNN`, con la URL del reel como origen), prompt en
  `PROMPT_TEMPLATES` y ejemplo generado con `openai-image-2-low` (1:1) en `assets/` registrado en
  `SEED_COMMAND_IMAGES`:
  `/figurine`, `/lego`, `/miniature`; `/couplefunselfie`, `/romancecollage`, `/cozyclosecouple`,
  `/candidcouple`, `/mirrorcoupleselfie`; `/DARKPREMIUM`, `/SPLASHHERO`, `/AESTHETICLUXURY`,
  `/BUSSTOPAD`; `/TOMJERRYCHAOS`, `/PINKPANIC`, `/CHIPMUNKTRIO`, `/MINTMUSE`.
- **Duplicado detectado:** `/METAAD` (reel de manuelgilcontent) **no entra**: ya está en el catálogo
  como `/metaad`; la búsqueda de la app ignora mayúsculas. Los códigos de `phd_inai` y
  `manuelgilcontent` se conservan tal y como los escribe el reel.
- **Sujetos:** se respeta el sujeto único por carpeta (cámara de película, camper van, botella de
  aceite, mochila…). Excepciones documentadas en `_excepciones_*.json`: los 5 de pareja usan «a
  young couple in love» y los 3 de personajes una mujer joven, porque el código pide expresamente
  dos personas o una persona.
- **Por qué array nuevo:** añadir a `REEL_COMMANDS` habría movido sus 267 ids posicionales y roto
  `_reels_lote.py` (que los cuenta y los usa para el lote de imágenes).
- **Herramientas:** `tools/trickvault/_reel2_lote.py` (monkey-patch de `_carpeta_lote` para leer
  `REEL2_COMMANDS`) y `_reel2_sujetos.py`; se versionan con la negación
  `!tools/trickvault/_reel2_*.py` del `.gitignore`.
- **Verificado en local (Playwright, banco con `http.server`):** 1258 trucos (1242 + 16), las 16
  tarjetas tienen su `assets/….jpg` y cargan (`naturalWidth > 0`), búsqueda por `/figurine` y por
  `/MINTMUSE` (mayúsculas) devuelve 1 resultado con imagen, «Copiar prompt completo» da el prompt
  entero (empieza por el código y acaba en «never in English»), la carpeta «Cámara y retrato» pasa
  de 58 a 63 trucos. Consola: solo el aviso/error de Babel y los 404 de `image_store.php` del banco
  sin PHP (preexistentes).
- **Verificación en producción (18:41, tras el despliegue):** `https://atnojs.es/apps/trickvault/`
  sirve el `index.html` nuevo (9.874.404 bytes; contiene `REEL2_COMMANDS` y
  `assets/xl-letras3d/figurine.jpg`); **1258 trucos**, las **16 tarjetas** están en localStorage con
  su imagen y las 16 cargan **1024×1024**; la carpeta «Cámara y retrato» marca **63 trucos** y sus 5
  tarjetas nuevas se ven con imagen; consola solo con el aviso/error ya conocido de Babel; red
  `image_store.php`, `catalogo.json` y `fav_list` → **200**; capturas en
  `tools/evidencias/2026-10-19-trickvault-reels/` (producción escritorio y móvil).
- **Commit:** `e1ce0c1`. La memoria va en el commit siguiente.
- **Evidencias:** `tools/evidencias/2026-10-19-trickvault-reels/` (hoja de las 16 imágenes, búsqueda,
  carpeta y móvil).

## 2026-10-19 (tarde) — Agenda personal autoalojada en `apps/agenda`

Creada la agenda que Antonio pidió: citas, tareas, notas y notas de voz con transcripción
automática. Publicada en `https://atnojs.es/apps/agenda/` y verificada contra producción.

- **Stack sobrio:** PHP 8 sin framework + estado JSON en `data/` con `flock` y escritura atómica
  (single-user; sin MySQL para no depender de credenciales no configuradas), frontend vanilla sin
  build, Electrolize local (`electrolize.ttf`), CSP propia y cero peticiones a Google Fonts.
- **Módulo de audio (lo esencial):** MediaRecorder (opus/webm o mp4/aac) con **un solo toque**;
  subida multipart → 202 → worker PHP en segundo plano (`ignore_user_abort` /
  `litespeed_finish_request`) → transcripción OpenAI `gpt-4o-mini-transcribe` vía `proxy.php` con
  la clave solo del entorno → analizador de reglas en español que sugiere nota/tarea/cita y el
  usuario confirma. Nunca se auto-agenda ni se gasta API en clasificar si no hace falta.
- **Verificado en producción con audio real (TTS de Windows, voz Helena):**
  - «Mañana a las 10 reunión con Ana…» → transcrito y sugerencia **evento** 2026-10-20 10:00.
  - «Recuérdame comprar pilas y pagar la luz antes del viernes, es urgente» → transcrito y
    sugerencia **tarea**, fecha 2026-10-23 y prioridad alta.
  - `audio.php` sirve el WAV grabado con sesión (200, 219.548 bytes); `GET` sin sesión da 401.
- **Verificación de interfaz (Playwright sobre la URL desplegada):** login, Hoy / Calendario /
  Tareas / Notas, búsqueda instantánea («pilas» → 1 tarjeta), diálogo de revisión con transcript
  real, recarga conserva sesión y datos, tres anchos (1280, 768, 393), consola **0 errores**.
- **Calidad:** Lighthouse local **100/100/100/100**. Partía de Performance 78 y CLS 0,481: el CSS
  propio del `#confirmDialog` (`display:flex`) se comía el `dialog:not([open])` del navegador y el
  diálogo cerrado se pintaba (ver `errores.md`). Fuente local + `font-display: optional` + preload
  y `dialog:not([open]){display:none!important}` → CLS 0. Assets con nombre versionado por ruta
  (`app.20261019b.*`; el fix de búsqueda móvil va en `app.20261019c.*`).
- **Datos de prueba borrados:** la agenda queda vacía (0 citas, 0 tareas, 0 notas, 0 audios) y el
  audio de prueba ya no se sirve (404).
- **Despliegue:** el push de la app (18:41) tardó más de lo normal y seguía 404 a los 13 min; el
  segundo push (`a3d577a`, 18:54) lo destrabó y a las 18:56 ya servía 200 (regla conocida: reempujar
  en vez de esperar indefinidamente). Ver `errores.md`.
- **Commits:** `b493a6e` (app), `a3d577a` (fuente local/CLS), `28a950b` (limpiar búsqueda móvil).
- **Pendiente/mejoras:** recurrencia de citas, recordatorios push/Telegram, cola offline, export
  JSON y cron de hPanel para `worker.php` como red de seguridad (el worker inline ya funciona).
- **Evidencias:** `tools/evidencias/2026-10-19-agenda/` (login, Hoy, Calendario, Tareas, Notas,
  revisión, búsqueda y vistas móvil/tablet de producción).
- **Nota:** en la misma tarde otra sesión creó `apps/brisa/` (otra agenda paralela); no se tocó.
