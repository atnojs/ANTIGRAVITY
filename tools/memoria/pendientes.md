# Pendientes

Lo que quedó abierto. Cada uno con **el siguiente paso concreto**, no con una intención.
Cuando se cierra, se mueve a `bitacora.md` y se borra de aquí.

---

## 🔍 Auditoría semanal 2026-10-25 — hallazgos abiertos

- **Estado:** auditoría automática de las 164 páginas propias (`/`, `webs/*`, `apps/*`): todas
  responden **200**, **0 respuestas 5xx**, 0 contenido mixto. **44 recursos/enlaces internos dan
  404** (32 páginas de origen) y 2 CDN externos 404. Informe completo: `tools/_audit_result.json`
  (generado por `tools/_audit_atnojs.py`).
- **🔴 Alta — página de Verónica rota en las 3 copias** (`apps/pagina_camisetas/`,
  `apps/paginas/pagina_camisetas/`, `webs/pagina_camisetas/`): las **8 imágenes de producto no
  cargan** y 11 enlaces (camisetas, gorras, tazas, platos, presupuesto) dan 404. Causa: 31
  referencias absolutas `/Paginas/pagina_camisetas/...` que no existen en el servidor; el
  contenido real está en `/apps/paginas/pagina_camisetas/` y `/webs/pagina_camisetas/` (cada
  copia con su propia carpeta `imagenes/`; la de `apps/pagina_camisetas` no tiene ninguna).
  Verificado en Chrome: 8/8 imágenes con `naturalWidth=0`.
- **🟠 Alta — `apps/transferir_estilo/` no arranca** («FusionAI Studio»): pinta «Error Crítico de
  Interfaz». Causa exacta en consola: `SyntaxError: Unexpected token (32:65)` en
  `useState < HistoryItem[] > ([])`; el preset `typescript` de Babel no se aplica al script
  inline, así que la sintaxis TS no compila. Además el `<script>` de
  `lucide-react@0.294.0/.../lucide-react.development.js` da 404 (solo existe `.min.js`), aunque
  el código no usa `lucide`.
- **🟡 Media — peso:** `/webs/relatos/` 6,0 MB (data.js 8,3 MB sin comprimir / 4,0 MB con brotli)
  y `/webs/limpiador-windows/` 2,5 MB (PNG hero de 2,6 MB). Partir el JSON de relatos por
  categoría y pasar el PNG a WebP.
- **🟡 Media —** `ia_workflow` (apps/paginas y webs): 4 páginas de detalle +
  `gpt_personalizado.html` dan 404. `chatgpt/c/descargables`: faltan `mc-addon.css` y
  `mc-addon.js` en las 3 copias.
- **🟢 Baja —** restos de plantilla (`/index.css`, `/index.tsx`, `/vite.svg`, `/src/main.*`,
  `assets/*` de `apps/compilar/temp-*`), favicons (`primera_pagina_principal`,
  `carpetas_nuevas`) y 10 enlaces del directorio (2 con 404; 8 dominios sin respuesta).
- **Siguiente paso:** decidir si se corrige ya la página de Verónica (sustituir `/Paginas/` por la
  ruta correcta en las 3 copias; 31 referencias por fichero) y la app FusionAI. El resto, en la
  próxima pasada de limpieza.
- **Verificación:** repetir `python tools/_audit_atnojs.py` → 0 problemas en esas rutas; abrir las
  3 URLs en Chrome y contar `document.images` con `naturalWidth>0`.

## 🃏 TrickVault: cambios de «Doble exposición» sin commitear (2026-10-24)

- **Estado:** en el árbol de trabajo hay cambios de una sesión anterior en
  `apps/trickvault/index.html` (migraciones `migrateDobleLote` / `migrateDobleReorganizada`, ids
  apagados) y `apps/trickvault/catalogo.json`, **sin commitear y sin publicar**. El commit
  `e12e1cc5` (renombrar carpetas) se hizo aislado y no los incluye; producción no los sirve
  (comprobado: el HTML servido no contiene `migrateDobleReorganizada`).
- **Siguiente paso (dueño):** decidir si esa reorganización está terminada y publicarla en un commit
  propio (`git diff -- apps/trickvault`), o descartarla. No mezclarla con otros encargos.
- **Verificación:** `git status -- apps/trickvault` y buscar `migrateDobleReorganizada` en el HTML
  servido con cache-buster (no debe estar hasta publicarlo).

---

## 🃏 TrickVault: renombrar carpetas — límites conocidos (2026-10-24)

- **Favoritos no se renombra:** es carpeta de sistema (`FAVORITES_FOLDER` + `getCat`). Exponerlo
  exigiría persistir su label aparte. Decisión consciente; el botón ✏️ no aparece en su tarjeta.
- **D1 (menor):** `trickvault_folders_renombradas` no se limpia al publicar; en multi-dispositivo un
  nombre local viejo puede pisar un cambio remoto posterior. Mejora futura: limpiar/rebasar la capa
  local cuando la publicación de carpetas tenga éxito.
- **D2 (menor, evidencia):** los ids `botones-24px-*` de los informes del autor miden 26 px (solo la
  etiqueta; el dato es correcto).
- **D3 (menor, UX):** botón de 26×26 px (cumple AA 24 px; recomendable 32–36 px en móvil).
- **O1:** al publicar de verdad, el `confirm` listará además diferencias de datos preexistentes
  (tarjetas/orden) que **no** introduce este encargo; revisarlas antes de pulsar publicar.

---

## 🔐 Contraseña de ACCESO restaurada y purgada (2026-10-24)

- **Estado:** ✅ **purgada de los sitios públicos y restaurada la contraseña original** (petición
  del dueño): el `.htaccess` del servidor guarda solo su `PW_ACCESS_SHA256`, el repositorio y su
  historial ya no contienen el valor y la contraseña temporal de la rotación quedó invalidada.
  Valor vigente en `.private/password-acceso.txt`. Verificado: original 200, temporal 403.
- **Siguiente paso 1 (dueño):** abrir ticket a soporte de GitHub para purgar los commits viejos
  `3396a40`, `0397ac4` y `92b1364`, aún accesibles por SHA. Es la única exposición pendiente real.
- **Siguiente paso 2 (dueño):** revisar las copias de seguridad de Hostinger anteriores al
  2026-10-24 (no accesibles por web; pueden contener el valor en claro).
- **Siguiente paso 3 (dueño):** si la bóveda de Bitwarden se considera «fuera de control», rotar
  o borrar allí la entrada (cifrada, no editable desde aquí).
- **Los ficheros del PC (bajo control del dueño) no requieren purga.**
- **Verificación:** `GET /auth/validar.php` (`edicion`+`acceso` configurados), publicación de
  TrickVault con la contraseña restaurada, y `git log -S` / escaneo de objetos sin ocurrencias.

---

## 🧪 Probar el prompt maestro en una web real (2026-10-23)

- **Estado:** el prompt está aprobado por doble gate (FG-A 96,0 · FG-B 95,0), red-team ACEPTABLE y
  matrices de trazabilidad completas, pero no se ha ejercitado generando una web real: las pruebas
  son de mesa, trazabilidad y coherencia.
- **Siguiente paso:** lanzarlo con un brief real (mejor una app pequeña) y comprobar que el equipo
  produce tabla de tareas, autoevaluaciones, scorecards ≥90 y la evidencia de §9 sin
  interpretaciones. Anotar fricciones y, si aparecen, corregir el prompt y re-pasar los gates.
- **Verificación:** salida completa con PASS por tarea, evidencias de navegador y entrega final con
  notas; contrastar con la checklist §12.3 de `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md`.

---

## 🔎 TrickVault: hueco y lupa suelta en la cabecera de carpeta a ≤768 px (2026-10-23)

- **Estado:** detectado al verificar la restauración; **preexistente**, no lo provoca el cambio
  de tarjetas. A 393 y 768 px, entre el buscador de la carpeta y la rejilla aparece un hueco de
  ~260 px con la lupa flotando en medio (visible en
  `tools/evidencias/2026-10-23-trickvault-restauracion/12-despues-carpeta-3-tablet.png` y
  `13-despues-carpeta-3-movil.png`).
- **Causa:** en `apps/trickvault/app.css`, dentro de `@media (max-width: 768px)` el
  `.section-header` pasa a `flex-direction: column`, pero `.section-header .search-wrap { flex: 1
  1 260px; }` conserva el `flex-basis` de 260 px, que en columna se aplica al **alto**. El icono
  `.search-icon` va centrado en esos 260 px.
- **Siguiente paso:** en el breakpoint, anular ese `flex-basis` (por ejemplo `.search-wrap { flex:
  0 0 auto; }` o `flex-basis: auto; min-height: 0;`) y medir a 393/768/1280 px con captura
  antes/después. No mezclar con otros cambios.
- **Verificación:** a 393 px, separación entre el buscador y la primera tarjeta ≤20 px y la lupa
  dentro del buscador.

---

## 🔐 Contraseñas centralizadas: cierre de la migración (2026-10-21)

- **Estado:** ✅ **verificado en producción y cerrado** (commit `3396a40` + retirada de la
  compatibilidad en `9fb2175`). El `.htaccess` raíz tiene `PW_EDIT` y `PW_ACCESS`; entran `0` y
  la contraseña de acceso (su valor vive solo en el servidor; **rotada el 2026-10-24** tras
  detectarse en claro en el repositorio) y las antiguas dan 403.
- **Siguiente paso 1 (hecho):** `AU_PERMITIR_ANTIGUAS` retirado de `auth/lib.php`; comprobado que
  la contraseña antigua de 20 caracteres y `050309` ya no entran.
- **Siguiente paso 2:** borrar por hPanel el `apps/codigos_imagen/config.php` del servidor: ya no
  se lee y solo guarda un `ADMIN_PASSWORD`.
- **Siguiente paso 3:** revisar los front-ends legacy que mandaban `password: '0'` fijo al guardar
  (funcionan por la sesión común o porque `PW_EDIT` vale `0`). Si algún día se cambia `PW_EDIT`,
  esos avisos dejan de guardar: hay que hacer que manden la contraseña escrita por el usuario.
- **Verificación:** `GET /auth/validar.php` (configurado), candado de TrickVault, login de
  Descargas, login de la agenda (Brisa) y modal de publicación de TrickVault.
- **Bóveda privada:** los datos viejos se perdieron del servidor (no hay copia restaurada);
  Antonio creó una bóveda nueva. Si algún día aparecen copias de seguridad de Hostinger con
  `vault_data/vault.json`, se puede recuperar; sin él los blobs no se descifran.

---

## 🧪 5 herramientas del vídeo «…no parezca de 2006» — Fase 1 hecha (2026-10-17)

- **Estado:** Fases 1-3 hechas (commits `124556e` y `a4d27a5`): Playwright CLI integrado y probado; Web Interface Guidelines fijadas y enganchadas al auditor; skill `recrear-desde-referencia` creada. Solo queda lo opcional: Taste Skill/Awesome Design como referencia puntual si Antonio quiere un look fuera de la marca.
- **Origen:** Short de `revolutia` (15-10-2026, 74 s) «5 Herramientas Para Que Tu App De Claude Code No Parezca De 2006». YouTube bloqueó la descarga del vídeo (403): la lista se reconstruyó con la descripción y se verificó cada repo.
- **Las 5:** (1) **Taste Skill** `Leonxlnx/taste-skill` (MIT; dirección de arte + chequeo en navegador a 3 anchos; 30-45 min y cientos de miles de tokens por página; usa fotos de archivos abiertos). (2) **Web Interface Guidelines** de Vercel + skill `web-design-guidelines` (interacción, animación, formularios, a11y; la skill se descarga las reglas de una URL en cada revisión). (3) **Awesome Design** `bergside/awesome-design-skills` (67 sistemas con `DESIGN.md` + `SKILL.md`; CLI `typeui.sh`). (4) **Image to Code** (`plugin87/ux-ui-agent-skills` o la de taste-skill): captura → tokens → código. (5) **Playwright CLI** `microsoft/playwright-cli` (npm `@playwright/cli`: snapshot con refs, clics, formularios, consola, red, capturas, vídeo, emulación móvil).
- **Encaje real:** **Playwright CLI** tapa el hueco grande (el flujo exige clics/formularios/descargas/consola y hoy solo hay Chrome `--headless` + harness, sin interacción). **Web Guidelines** refuerza `auditor-lighthouse`. **Image to Code** encaja con `analista-visual-pro`. **Taste Skill** y **Awesome Design** chocan con la marca fija hoola: solo como referencia puntual, nunca instalados en bloque (brand drift + coste + fotos externas frente a la política de OpenAI image 2).
- **Siguiente paso:** (a) ✅ hecho: CLI instalado y skill probada con evidencias en `tools/evidencias/<fecha>-<app>/`; (b) **Fase 2:** copia fija de Web Interface Guidelines en `skills/recursos/` y sección nueva en `auditor-lighthouse-accesibilidad`, sin descargar reglas remotas en cada auditoría; (c) **Fase 3:** adaptar image-to-code a la marca hoola como skill propia (sin copiar assets ni textos ajenos); (d) `Awesome Design` solo bajo demanda (`npx typeui.sh pull glassmorphism --dry-run` primero).
- **Verificación:** `playwright-cli open https://atnojs.es` + `snapshot` + `screenshot` dejan fichero en disco; capturas de la prueba en `tools/evidencias/2026-10-17_prueba_playwright_atnojs_*.png` y en `tools/evidencias/2026-10-17-verificacion-playwright/`; `git status` sin restos.
- **Probado hoy:** Playwright **1.63** (venv de Hermes) + Chrome **155** capturó `https://atnojs.es` en escritorio (1440×1622) y a 393 px de ancho. También `npx -y @playwright/cli@latest` (**0.1.22**): abrió Chrome, escribió en TodoMVC, pulsó Enter, capturó y leyó la consola (1 error: favicon 404), y cerró. Sin permiso ampliado, Chrome no arranca (`spawn EPERM`); el `--device` de la CLI de Python fuerza webkit (usar viewport o el CLI de Microsoft). Evidencias en `tools/evidencias/2026-10-17_prueba_playwright_*`.
- **Hallazgo de la prueba (TrickVault):** la consola de producción muestra un error y un warning de **Babel en el navegador** (`@babel/standalone` desde unpkg y script inline >500 KB). No rompe la app, pero penaliza la carga; evaluar precompilar o quitar Babel en una pasada de rendimiento.

---

## 🃏 TrickVault: tanda Xabatz añadida (2026-10-17)

- **Estado:** hecha y publicada (commit `73360d2`). De los 16 códigos del Short, 10 ya existían y se revisaron (imagen↔prompt↔código y texto en español: correctos); se añadieron 6: `/phantom`, `/speedframe`, `/hairstylegrid` (imagen, con ejemplo `openai-image-2-low` en Carteles, Planos y Moda) y `/faceharmony`, `/skinglowtips`, `/colourfittips` (texto, en Comandos de texto).
- **Verificación:** producción sirve el catálogo con **1242 trucos**; la búsqueda de los 6 devuelve tarjeta; las 3 imágenes cargan 1024×1024; consola sin errores nuevos (solo el aviso de Babel ya conocido); red sin 4xx/5xx.
- **Resuelto 2026-10-18 (commit `ca59b61`):** `/proshot` y `/together` pasan de `xl-otromundo` a «Cámara y retrato» con `CODE_FOLDER` + `CATEGORY_MOVES`; verificado en producción (chip correcto, imagen intacta y migración de tarjeta guardada).
- **Evidencias:** `tools/evidencias/2026-10-17-xabatz/` (revisión de las 10 existentes, las 3 nuevas y capturas de producción).

---

## Carpetas con dos familias de códigos: decidir si se parten

- **Estado:** detectadas y sin tocar. `xl-otromundo` mezcla personajes (astronauta, vampiro,
  mago: cada código pide el suyo) con la furgoneta camper de los códigos de producto;
  `xl-juegos` mezcla el aventurero de los códigos de juego con las escenas de temporada (esas
  ya se unificaron el 2026-10-15: ahora es el aventurero vestido de esa temporada).
- **Siguiente paso:** preguntar a Antonio si quiere partirlas como se hizo con «Comida y moda»
  o dejarlas con la excepción documentada en `trickvault-imagenes`.
- **Verificación:** `tools/trickvault/_tiras_sujetos.py` genera una tira por carpeta; si en una
  tira se ven dos familias claras, toca decidir.

## `xl-camararetrato` y `xl-casaviajes`: excepciones por código

- **Estado:** tienen excepciones legítimas (bebé, mascota, pareja, familia / castillo, volcán,
  trono, naufragio) porque **su código pide esa escena**. No es un sujeto mezclado.
- **Siguiente paso:** si Antonio quiere el sujeto único también ahí, hay que reescribir esos
  prompts (no basta con regenerar la imagen).

## 0. 🔴 ROTAR las 6 claves de Google expuestas — **urgente**

- **Estado:** detectado el 2026-10-15, sin resolver. Detalle completo en `credenciales.md`.
- **Hecho:** 37 ficheros de `apps/` llevan una clave `AIza…` incrustada; 6 claves distintas;
  la mayoría se sirven por web con HTTP 200 y el repositorio de GitHub es **público**.
  Borrar los ficheros NO basta: el historial de git las conserva.
- **Siguiente paso:** revocar y regenerar las 6 claves en Google Cloud Console (se
  identifican por el prefijo, tabla en `credenciales.md`) y sustituir su uso por `proxy.php`.
- **Verificación:** las claves viejas deben devolver error de API deshabilitada; los
  ficheros de `apps/` no deben contener ninguna cadena `AIza`.

---

## 0-bis. ✅ CERRADO el 2026-10-16 — contraseña de edición rotada

El hash de la contraseña de `apps/video-vault/auth.php` estaba **versionado en el repo público**
y correspondía a una contraseña de **un solo dígito**. Rotada, verificada en producción y
documentada en `credenciales.md` (con el procedimiento) y en `bitacora.md`.

- **Queda suelto (sin prisa):** `apps/json/auth.php` es **código muerto** (da 404 en producción y
  esa carpeta no tiene `publicar.php`). Se le puso el hash nuevo por coherencia; se puede borrar.
- **Recuerda:** el hash viejo sigue en el historial de git, pero ya corresponde a una contraseña
  que no existe. Nada que hacer.

---

## 0-septies. Descargas: Instagram necesita cookies.txt (2026-10-18)

- **Instagram: cookies ya configuradas (2026-10-18 16:20)** en `D:\Vídeos\ytdownloader\cookies-instagram.txt` + `instagram_cookies` en el worker. Renovar cuando caduque (Export de Cookie-Editor otra vez). Confirmado que NO se puede sin sesión (2026-10-18, probado con un reel de Antonio):
  yt-dlp responde «This content is only available for registered users who follow this account» y
  «empty media response». Probado también `--simulate` del enlace `/embed/` y `/embed/captioned/`
  (página de login: 584 KB sin ningún `.mp4`) — no hay atajo. Las dos vías están en
  `tools/descargador/instagram-LEEME.md`: (A) exportar `cookies.txt` con Cookie-Editor y poner
  `instagram_cookies`; (B) instalar Firefox, iniciar sesión allí y poner `"instagram_browser":
  "firefox"` (Firefox no cifra las cookies; Chrome/Edge sí y yt-dlp no puede leerlas).
  **Fallo corregido de paso:** el mensaje de error era el genérico porque el texto «only available
  for registered users who follow this account» no casaba con los patrones; ahora distingue «cuenta
  privada a la que no sigues» de «falta sesión».
- **TikTok ya funciona sin nada más.** Instagram pide sesión: para que baje reels/posts hay que
  exportar las cookies de Instagram con una extensión del navegador («Get cookies.txt LOCALLY»),
  guardar el fichero en el PC y añadir `"instagram_cookies": "ruta\\al\\cookies.txt"` en
  `.private/descargas-worker.json`. Leer las cookies del navegador automáticamente NO funciona con
  Chrome/Edge modernos (App-Bound Encryption): yt-dlp no puede abrir su base de datos.
- **Contraseña de Descargas**: la eligió Antonio (6 caracteres) y NO está guardada en el repo ni en
  `.private`. Por eso las verificaciones automatizadas de la app en producción se hacen en banco
  local (con sesión sembrada) y del despliegue se comprueba por HTTP.
- Pendiente de probar en producción con su sesión: bajar un TikTok y un Instagram reales, y el
  botón «Ir a YouTube» en el móvil.

---
## 0-sexies. Descargas: lo que queda (2026-10-17, tras las seis mejoras)

1. **Activar el WhatsApp**: falta que Antonio cree la app en Meta, añada su número como
   destinatario, genere el token permanente y lo pegue en el panel de la app
   (`tools/descargador/whatsapp-LEEME.md`). El código ya está y responde bien.
2. **Probar la PWA en el móvil de verdad**: instalar y usar «Compartir → Descargas» desde YouTube.
   Solo se ha verificado que el manifest, el service worker y `compartir.php` se sirven y
   redirigen bien; la instalación real y el share target necesitan su móvil.
3. **Copias de assets**: van por `app.20261017i.*`; quedan `app.css`, `...h`, `...g`, etc. Cuando
   expire la caché de la CDN, dejar solo las vigentes.
4. **`VERSION_WORKER` sigue en 1.0** en el worker.
5. **Mensaje de error de yt-dlp**: el fallo por vídeo no disponible mostró «La descarga falló»
   seguido del texto crudo, en vez del mensaje amable de `mensajeUtil`. Revisar por qué no casó.
6. **Títulos con caracteres no latinos**: en una prueba temprana el título coreano de PSY salió
   como `()`, aunque después salió bien. Vigilarlo.

---
## 0-quinquies. Descargas: lo que queda (2026-10-17)

1. ✅ **HECHO el 2026-10-17 (madrugada): botón «Traer a la web».** Acción `subir_item`, el worker
   sube esos trozos a petición y `item_done` con `item_id` **actualiza** la ficha (no duplica el
   historial). Verificado en producción: `local=True` 117.029 B → pedir → `local=False` y descarga
   HTTP 200 con los mismos 117.029 B.
2. ✅ El fichero ya se guarda suelto (2026-10-17). Queda **limpiar copias de assets**: `app.css`, `app.20261017.css`, `...b`, `...c`, `...d`, `...e`, `...f`. Las
   antiguas están por el HTML cacheado; cuando expire la caché (7 días desde el 17), dejar solo las
   vigentes y actualizar la referencia.
3. **Ficheros locales que se acumulan** en `D:\Vídeos\descargas-app\<id>\`: decidir si se borran al
   terminar la subida o se quedan (hoy se quedan, y con el modo «solo al PC» son el único original).
4. **Sondeo del navegador cada 4 s** y latido cada 30 s: bajarlos cuando no haya trabajos activos.
5. **`VERSION_WORKER` en el worker sigue diciendo 1.0** aunque el código vaya por la 1.1: subirla
   para que el latido identifique la versión de verdad.

---

## 0-quater. App de descargas: candidatos a mejorar (Antonio, 2026-10-16: «se puede mejorar un poco, eso lo hacemos mañana») (Antonio, 2026-10-16: «se puede mejorar un poco, eso lo hacemos mañana»)

Sin decidir y sin orden. **Ninguno es un fallo**: la app funciona de punta a punta.

1. **Botón de «reintentar» en los trabajos en error.** Hoy, cuando uno falla, hay que volver a pegar
   el enlace. Es el más claro: el trabajo ya está guardado con su URL, calidad y formato.
2. **Velocidad y ETA**: en la cola llegan **vacíos**. Comprobar primero si es el analizador de la
   salida de yt-dlp (que no los captura) o el worker (que no los manda) antes de tocar la interfaz.
3. **Playlists: sin probar con una lista de verdad.** El worker las implementa, pero no se ha
   ejecutado ni una. Es lo primero que hay que verificar, no lo primero que hay que programar.
4. **Sondeo del navegador cada 4 s**: es más tráfico del necesario en hosting compartido (y puede
   tener que ver con los `fetch failed` que se vieron). Bajarlo a 10-15 s cuando no haya trabajos
   activos, y a 3-4 s solo mientras los haya.
5. **`D:\Vídeos\descargas-app\<job_id>\`**: el worker deja ahí los ficheros originales y se van
   acumulando. Decidir si se limpian al terminar o si se quedan (hoy se quedan).

---

## 0-ter. App de descargas: el CDN no ha refrescado los estáticos

`apps/descargas/` está publicada y **funcionando de extremo a extremo** (probado: cola → worker →
yt-dlp → subida por trozos → descarga desde el navegador). Lo que **no** ha llegado a la URL pública
es el retoque de contraste de `app.css`/`app.js` (commit `5e8c2da`): el CDN (`Server: hcdn`) sirve
los estáticos cacheados **por ruta** y **ignora la query string**, así que `?v=2` y `?t=<guid>` no
sirven de nada. `api.php` sí está al día (marcador: `?action=health` → `version`).

- **Siguiente paso concreto:** renombrar `app.css` → `app.20261016.css` y `app.js` →
  `app.20261016.js`, actualizar las dos referencias de `index.html`, commit + push, y **no borrar**
  los ficheros viejos (el HTML cacheado los sigue pidiendo). Detalle en `errores.md`.
- **Por qué no urge:** es solo el contraste de textos secundarios (la app se usa igual). El día que
  se toque cualquier estático, hacerlo ya con el nombre nuevo.
- **Comprobar si ya expiró:** `curl -I https://atnojs.es/apps/descargas/index.html` y mirar
  `last-modified`: si es posterior al commit, la caché soltó.

---

## 1. Apuntar DSH (el agente) al gateway de OmniRoute — *el ahorro grande*

- **Estado:** sin hacer. Hoy el agente habla **directo** con la API del proveedor, así que
  no usa la compresión ni el failover: el gasto no baja nada.
- **Siguiente paso:** localizar dónde define DSH su `base_url` de proveedor
  (`C:\Users\atnojs\.dsh\`: perfiles, `storages`, ajustes del proveedor) o añadir un
  proveedor personalizado OpenAI-compatible con base URL `http://localhost:20128/v1` y la
  clave de `Dashboard → Endpoints`.
- **Riesgo:** cambiar el endpoint propio a mitad de sesión puede dejar al agente sin
  responder. Hacerlo entre sesiones y con la configuración anterior anotada.
- **Verificación:** una petición debe devolver la cabecera `X-OmniRoute-Compression` y
  aparecer en `Dashboard → Analytics`.

## 2. Confirmar que la ventana de terminal NO reaparece

- **Estado:** arreglado y verificado en caliente (sin `cmd.exe` en la cadena, procesos sin
  título de ventana), pero falta la prueba definitiva.
- **Siguiente paso:** en el próximo arranque del PC, comprobar que no aparece ninguna
  terminal de OmniRoute. Si apareciera, vendría de **fuera** de esta cadena: buscar con
  `Get-CimInstance Win32_Process | Where-Object CommandLine -match 'omniroute'`.
- **Verificación:** `E:\hermes-data\logs\omniroute-autostart.log` con una línea
  `Modo daemon: reviso cada hora` de la hora del arranque.

## 3. Decidir el bind del gateway: `0.0.0.0` → `127.0.0.1`

- **Estado:** documentado, sin tocar (ver `decisiones.md`).
- **Siguiente paso:** comprobar si algún cliente llama al gateway desde WSL o desde otro
  equipo (skills `omniroute-wsl-claude-code`, `omniroute-deepseek-autostart` en Hermes).
  Si nadie lo necesita: añadir `set OMNIROUTE_BIND=127.0.0.1` al `.cmd` y reiniciar el daemon.
- **Verificación:** `netstat -ano | Select-String ':20128'` debe mostrar `127.0.0.1:20128`.

## 4. Ver las sesiones de DSH desde otro PC

- **Estado:** explicado, sin montar. Las sesiones son locales
  (`C:\Users\atnojs\.dsh\sessions`, formato `session.v4.jsonl.zstd`) y la GUI escucha solo
  en `127.0.0.1:19387`.
- **Siguiente paso elegido:** túnel SSH desde el otro PC
  (`ssh -L 19387:127.0.0.1:19387 atnojs@IP-DE-ESTE-PC` y abrir `http://127.0.0.1:19387`).
  Alternativa: copiar la carpeta de sesiones (**nunca** `.credentials.yaml`).
- **Verificación:** desde el otro PC aparece el historial de este.

## 5. Higiene: token de GitHub en claro

- **Estado:** `E:\ANTIGRAVITY\inicio.md` contiene un token de GitHub en texto plano.
  Está en `.gitignore` (línea 25), así que **no** se publica, pero vive en claro y hay
  zips en la raíz (`skills.zip`, `claude_skills_pack.zip`) que podrían arrastrarlo.
- **Siguiente paso:** decidir si se rota el token; si se toca, no quitar nunca esa línea
  del `.gitignore`.

## 6. Ampliar la memoria con lo que aún no está

- **Mapa del repositorio**: qué hay en `apps/` y `skills/` y para qué sirve cada cosa
  (evita exploraciones caras).
- **Índice tarea → skill**: tabla rápida para no dudar qué skill cargar.
- **Histórico de fallos ya resueltos de sesiones anteriores** a 2026-10-15 (hay material en
  `E:\hermes-data\skills\`, `E:\hermes-data\cron\output\` y backups).

## 7. Limpieza de lo no versionado: 256 entradas, 57.427 ficheros, ~5,8 GB

**HECHO el 2026-10-16** (commits `1cfa411` y `3d97c8d`): `git status` pasó de **256 entradas sin
versionar + 1 modificado** a **1 sin versionar y 0 modificados**. Queda solo `apps/dev/`, que no
es basura (ver «e» abajo). Se subieron **80 ficheros (0,34 MB)** de herramientas que faltaban y
se añadió el bloque de `.gitignore`.

El panel de git enseñaba «un montón de carpetas» porque git **colapsa** los directorios sin
versionar: esas 256 entradas eran 57.427 ficheros. **Regla:** se sube lo que es herramienta o
contenido; se ignora el material de trabajo; lo que tenga secretos o datos de terceros, no se
sube nunca. **Jamás `git add -A`.**

### a) SUBIR — herramientas y datos que faltan en el repo

| Qué | Ficheros | Por qué |
|---|---|---|
| `tools/commit-aislado.ps1` | 1 | La memoria lo cita como «ya existente en el repo» y **no lo está** |
| `tools/trickvault/`: `_carpeta_gen.py`, `_carpeta_upload.py`, `_carpeta_contact.py`, `_carpeta_verificar.py`, `_carpeta_fix_prompts.py`, `_escribir_sujetos.py`, `_listar_faltan_sujetos.py`, `_listar_sin_objeto.py`, `_contact_sheet.py`, `_contact_carpeta.py` | 10 | Es **el pipeline que manda usar la skill `trickvault-imagenes`**. Un clon limpio no lo tiene (solo `_carpeta_lote.py` está versionado) |
| `tools/trickvault/_xl-*.json` (11) + `_ejemplos_xl-fotoproducto.json` + `_retroedu.json` | 13 | Son las **specs** por carpeta. Ya hay 50 specs, 20 `_sujetos_`, 19 `_ejemplos_` y 4 `_excepciones_` versionadas: falta igualar |
| `tools/video-vault/` → sus `.py` (~25), `.ps1` (2) y `.js` | ~28 | Herramientas del flujo de `videovault-videos` (`generar_videos_pendientes.py`, `runner_diario.py`, `lanzar_lote.ps1`…). **Sin** los 104 `.mp4` (482 MB), que ya están ignorados |
| `skills/SKILL_VIDEOVAULT_VIDEOS.md` | 1 | Ya versionado; solo tiene 13 líneas nuevas sin commitear |

### b) IGNORAR — material de trabajo (añadir a `.gitignore`)

| Patrón | Ficheros | MB |
|---|---|---|
| `tools/trickvault/*_gen/` (22 carpetas) | 979 (959 PNG) | 1.618 |
| `tools/trickvault/_e2e/` (repo de prueba, perfil de Chrome, `remoto.git`, logs) | 1.745 | 234 |
| `tools/trickvault/_revision/` | 178 | 291 |
| `tools/trickvault/_banco_export/`, `_imgs_revisar/`, `_prueba_api/`, `prompts_in/`, `prompts_out/` | 104 | 23 |
| `tools/_ig2/` | 26.440 | 1.900 |
| `tools/imagen_json_prompt/` | 34.339 | 941 |
| `tools/imagen_json_prompt_prueba/`, `tools/_reel_ig/` | 19 | 14 |
| `tools/json/_e2e/` (mock de GitHub) | 2 | 0 |
| `tools/video-vault/` → `.log` y `.txt` | ~15 | 0 |

Y dentro de `tools/trickvault/`, los sueltos: `_*.log` (26), `_*.txt` (28), `_*.cmd` (12),
`_*_jobs.json` (**22 manifiestos de lote**), `_prod_hoy*.html`, `_verifica_*`, `_dump_*`, y los
JSON de **estado derivado** (`_auditoria_*.json`, `_cruce_rotas.json`, `_desajustes.json`,
`_ocr_*.json`, `_catalogo_estado.json`, `_plan_imagenes.json`, `_rutas_imagenes.json`,
`_sin_objeto.json`, `_recuperadas.json`). Guiones de un solo uso: `_fix_*` (9), `_ver_*` (14),
`_diag_*`, `_antes_*`, `_ids_*`, `_hojas_*`.

### c) NUNCA VERSIONAR — secretos o datos de terceros

- **`apps/json/auth.php`** → `AUTH_PASSWORD_HASH` (ver el hallazgo 0-bis).
- **`tools/veronicaz/Clientes_2026-10-02_antes_de_septiembre.xlsx`** → datos de clientes.
- **`Capturas.xlsx`** (en la **raíz pública**) → si se versiona queda servido por web. Si hay
  que conservarlo, moverlo a `tools/`.

### d) DECIDIR

- `tools/evidencias/` → solo 3 `.py` (`generar_*_dia_de_muertos.py`); las 50 imágenes ya están
  ignoradas por `*.jpg`/`*.png`.
- `tools/logo_solo_lineas.py`, `tools/quitar_fondo.py` → parecen herramientas reutilizables.
- `tools/veronicaz/` → `conv.mjs`, `ejecutar.py`, `render.mjs` (¿herramienta o encargo puntual?).
- `tools/trickvault/_reels_*.py` (9) → ¿lote terminado o herramienta viva?

### e) PENDIENTE DE DECISIÓN — `apps/dev/null` **no es basura**

Me equivoqué al clasificarlo como «accidente de `> null`». Al abrirlo: son **648 líneas de una
app React de verdad** (generación de imágenes, 8 modelos —`openai-medium`…`max-sunburst`,
`gemini-flash/pro`, `qwen-pro`—, selectores de proporción, subida, historial y compartir). Es
contenido **único**: ningún otro fichero del repo tiene ese tamaño ni ese sha256, así que no es
copia de nada. El nombre `null` sí viene de una redirección mal hecha, pero el contenido es
trabajo real.

**Por eso NO se ha ignorado y sigue apareciendo**: es lo único que queda en el panel, a
propósito, para que no se pierda de vista.
- **Siguiente paso:** decidir qué es y dónde vive (¿app nueva en `apps/<nombre>/`? ¿parte de una
  que ya existe?). Hasta entonces, **no borrar**.
- **Verificación:** `(Get-Item 'apps\dev\null').Length` → `50898` bytes; primera línea
  `import React, { useState, useRef, useEffect } from "react";`.

- **Siguiente paso:** solo queda lo de «d» (decidir esas cuatro cosas) y lo de «e» (rescatar
  `apps/dev/null`). Lo demás, hecho y publicado.
- **Verificación:** `git status --porcelain` debe devolver **una sola línea**: `?? apps/dev/`.

---

## 🗓️ Agenda (`apps/agenda`): publicada el 2026-10-21, con mejoras abiertas

- **Estado:** la app del modelo está portada a PHP + React, publicada en `/apps/agenda/` y
  verificada en producción (login, CRUD, audio con transcripción real, 401, 3 anchos, consola 0).
  La agenda queda **vacía** de datos de prueba.
- **Lo que preguntó Antonio:** «¿qué API necesito?». Respuesta corta: **ninguna para lo básico**;
  la voz usa la clave **OpenAI** que ya está en el `.htaccess` raíz (`OPENAI_API_KEY`/`O`). Si se
  rota o se quita, la app sigue funcionando: guarda el audio y permite escribir la transcripción a
  mano (aviso en el modal).
- **Siguiente paso (si quiere más):** probar la grabación real desde su móvil y decidir si añade
  clasificación con LLM (mismo contrato `appointment|task|note` del modal) o Gemini opcional.
- **Mejoras pendientes:** recurrencia de citas, recordatorios (Telegram/push), export/import JSON,
  copia de seguridad de `data/` (cron hPanel) y borrado de audios huérfanos antiguos.
- **Verificación:** `GET https://atnojs.es/apps/agenda/api/health` → `{"status":"ok",
  "version":"2.0.0","openai_configured":true}`; evidencias en
  `tools/evidencias/2026-10-21-agenda/`.

---

## 🔍 Visor de contraseña (`apps/_shared/password-eye.js`) — límites declarados

- **Estado:** desplegado (commits `601716af` y `c4e9a916`, versión final `20261025b`) con smoke
  165/165 en local y producción. La verificación independiente señaló D1 (el ojo no se alcanzaba
  con Tab en un modal con trampa de foco), ya corregido con un botón puente oculto junto al campo.
  Receta para reaplicarlo o cambiar la versión: `recetas.md`.
- **Pendiente 1 — Safari/iOS real:** no hay webkit instalado; probar en un iPhone real un login
  (descargas o bóveda) y confirmar que el ojo flota dentro del campo y no tapa el texto.
  *Siguiente paso:* abrir la URL en un iPhone y capturar, o `npx playwright install webkit`.
- **Pendiente 2 — campos diminutos:** los `input` de menos de 56 px de ancho o 14 px de alto no
  reciben ojo (no cabría). *Siguiente paso:* si aparece un login así, ensanchar el campo o añadir
  una variante compacta al componente.
- **Pendiente 3 — apps nuevas:** el visor no se añade solo. Al crear una página con contraseña,
  ejecutar `node tools/inject-password-eye.mjs --apply` y el smoke antes de publicar.

---

## 🐞 Unified Image Studio (`apps/unified-image-studio`) — defectos detectados en la verificación del tutorial

- **Estado:** app estable y usable; el tutorial completo está entregado y verificado (`tools/tutoriales/unified-image-studio/TUTORIAL.html`, PASS 94,5). Los defectos están **documentados dentro del tutorial** con su solución provisional.
- **Pendiente 1 — redimensión por asas:** el tamaño se calcula bien pero la capa salta de posición (`tools.js` `applyResize`, doble cómputo del ancla). *Siguiente paso:* corregir `applyResize` y probar las 8 asas con capa rotada.
- **Pendiente 2 — «Mantener proporción»:** listener vacío (`app.js:1731`); 800×600 con ancho 1600 acaba en 1600×600. *Siguiente paso:* conectar la casilla a `applyResize`.
- **Pendiente 3 — transparencia JPG→PNG:** al volver a PNG la casilla sigue desmarcada, el resumen dice «conservada» y el PNG sale opaco (`app.js:1416-1417`). *Siguiente paso:* recordar el estado previo por formato o volver a marcar en PNG.
- **Pendiente 4 — doble import al soltar en la dropzone:** burbujeo del `drop` a `#stageInner` (`app.js:777-785`). *Siguiente paso:* `stopPropagation()` en el handler de `#dropzone`.
- **Pendiente 5 — `Shift+2`:** el código exige `event.key === '@'` (`app.js:1698`), inoperante en teclado ES. *Siguiente paso:* aceptar `'@' || '"' || event.code === 'Digit2'`.
- **Pendiente 6 — conflicto 409:** al «Conservar la mía» el guardado se hace pero salta `setSaveState is not defined` (`app.js:1540`). *Siguiente paso:* importar `setSaveState` desde `core.js` y probar el flujo.
- **Pendiente 7 — máscara y roles:** el contrato canónico no reenvía `mask` ni los roles de referencia al proveedor (`canonical-image-model.php`). *Siguiente paso:* decidir si se implementa el envío (OpenAI `/images/edits` admite `mask`) o se retira la promesa de la UI.
- **Evidencias:** `tools/evidencias/2026-10-25-tutorial-uis/verificacion-ui.md` (68 capturas, descargas validadas) y `verificacion-tutorial-r2.md`.

## 2026-10-26 — Seguridad: token de la cola de Flow escrito en el repositorio público

- **Qué:** `apps/flow_studio/flow_queue.php` y `apps/flow_studio_hoola/flow_queue.php` llevan
  `const QUEUE_TOKEN = '...'` en claro, y el repositorio es público. Ese token autoriza `claim`
  (reclamar trabajos) y `complete`/`fail` (subir resultados) en la cola compartida.
- **Riesgo:** quien lo lea puede inyectar resultados falsos o quedarse trabajos de la cola. No da
  acceso a la cuenta de Google, pero sí a la cola.
- **Estado:** **no se ha tocado** en esta ronda para no romper el worker antiguo
  (`E:\herramientas\google-flow\flow_studio_worker.py`, que usa el valor literal). El motor nuevo
  (`apps/unified-image-studio`) **no** lo reutiliza: tiene credencial propia por entorno/fichero.
- **Siguiente paso concreto:** rotar el valor, moverlo a `SetEnv FLOW_QUEUE_TOKEN` en el `.htaccess`
  raíz, hacer que ambos `flow_queue.php` lo lean del entorno con `hash_equals` y actualizar el worker
  del PC para leerlo de un fichero de configuración fuera de Git. Después, retirar
  `apps/flow_studio_hoola` si el estudio unificado ya cubre su función.
