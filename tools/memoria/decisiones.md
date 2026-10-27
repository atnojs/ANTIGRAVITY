## 2026-10-27 — Conviven dos sistemas de Flow (estudio nuevo y app antigua)

- **Decisión:** mantener activos a la vez `UisFlowAgent` (app nueva) y `FlowStudioWorker` (apps
  antiguas), cada uno con su cola y su perfil de Chrome.
- **Por qué:** Antonio sigue usando las dos apps y quería Flow siempre disponible en ambas.
- **Cómo conviven sin romperse:** perfiles de Chrome distintos (el agente nuevo usa una copia dentro
  del repo; el antiguo, el original de `E:\herramientas\google-flow`). Cada uno tiene su candado y su
  tarea programada con repetición cada 2 minutos.
- **Contrapartida aceptada:** comparten la misma cuenta de Google. Si generan a la vez, compiten por
  la cuota y pueden tardar más.
- **Si algún día se quiere simplificar:** desactivar el worker antiguo con
  `instalar-tarea-antigua.ps1 -Quitar` y vaciar su cola desde la app.

---
# Decisiones tomadas y por qué

Registro de cosas que **parecen raras a propósito**. Antes de cambiarlas, lee el motivo;
si el motivo ya no aplica, actualiza esta entrada en el mismo cambio.

---

### [2026-10-25] Visor de contraseña: un componente compartido con botón flotante, en vez de editar 165 formularios

- **Decisión:** un único `apps/_shared/password-eye.js` incluido con una etiqueta por página, y el
  botón posicionado en `position:fixed` sobre el borde derecho del campo (montado en `body` o en el
  `<dialog>` abierto), sin envolver el input ni tocar la estructura del formulario.
- **Por qué:** hay 165 páginas con estilos y stacks distintos (apps React/Babel, modales
  glassmorphism con `backdrop-filter`, webs legacy, login PHP con dos ramas). Envolver el campo o
  inyectar el botón dentro del formulario rompía selectores CSS y layouts flex; editar 165
  formularios a mano duplicaba código y divergía. Un componente único se mantiene una sola vez,
  cubre campos creados por JS (modales de TrickVault, gate de modelos, bóveda, login de Firebase) y
  se actualiza subiendo la versión en la URL.
- **Contrapartidas asumidas:** cuando un antecesor del campo crea bloque contenedor
  (`transform`/`filter`/`backdrop-filter`), el control visible se monta en `body` y se añade un
  **botón puente oculto** junto al campo para que entre en el orden de tabulación y en la trampa de
  foco del modal (así el ojo se alcanza con Tab + Enter incluso en modales que atrapan el foco;
  defecto D1 detectado por el verificador). Los campos muy pequeños (<56 px de ancho o <14 px de
  alto) no reciben ojo. El `.js` se sirve con `Cache-Control: max-age=604800`: al cambiarlo hay que
  subir `VERSION` y re-ejecutar `tools/inject-password-eye.mjs --apply` (actualiza el `?v=` de las
  165 páginas).
- **Verificación:** smoke local y de producción 165/165 y flujos manuales en producción; evidencias
  en `tools/evidencias/2026-10-25-password-eye/`.

---

### [2026-10-24] Reescritura del historial de `main`: excepción puntual para borrar un secreto

- **Decisión:** se reescribió el historial de `main` con `git filter-repo` y se publicó con
  `--force-with-lease`. Es la **única excepción autorizada** a las normas «nunca `--force`» y
  «nunca reescribir historia publicada» de la skill `publicar-git`.
- **Motivo:** la contraseña de ACCESO estaba en claro en commits públicos (`auth/lib.php`,
  memoria y `rotar-password.ps1`). Rotarla no basta si el valor sigue visible en el historial:
  el dueño pidió explícitamente que no quedara ni una copia.
- **Cómo:** `git filter-repo --replace-text` con el valor sustituido + retirada del endpoint
  temporal; verificación objeto a objeto antes y después; `force-with-lease` sobre el SHA
  remoto esperado. Después: `reflog expire --expire=now --all` y `gc --prune=now` en local.
- **Contrapartida:** los SHA cambian (los locales y los de cualquier otra sesión quedan
  obsoletos: hay que hacer `fetch --force` y `reset --hard origin/main`); GitHub puede mantener
  commits viejos accesibles por SHA hasta su GC. Para lo segundo, ticket a soporte de GitHub.
- **Regla que queda:** nunca escribir valores reales de contraseñas en ficheros versionados,
  ni siquiera en docblocks de ejemplo. Solo placeholders y rutas de almacén.
- **Cierre (mismo día):** a petición del dueño se **restauró la contraseña original**; el
  servidor guarda solo su SHA-256 y el valor vive en `.private/password-acceso.txt`. La
  reescritura del historial se mantiene (el valor ya no está en ningún commit del historial
  actual); GitHub aún puede servir los commits viejos por SHA hasta su GC.

### [2026-10-23] Restauración de fotos antiguas: 3 tarjetas canónicas, nunca una por caso

- **Decisión:** la carpeta «Restauración de fotos antiguas» contiene solo 3 tarjetas, una por
  faena (`/restaurarfotoantigua`, `/colorizarfotoantigua`, `/prepararparaimprimir`). Cualquier
  código nuevo de restauración se funde en una de esas tres; no se crean tarjetas por tipo de
  foto (boda, entierro, etc.) ni variantes que repitan la misma faena.
- **Motivo:** Antonio lo pidió expresamente el 2026-10-23: «las imágenes se restauran todas
  igual, ya sean de una boda o de un entierro». Las 10 tarjetas del carrusel sifuyik (2026-10-22)
  repetían las mismas faenas con los mismos ejemplos y dos no eran restauración
  (`/restaurarboda`, `/marcoregalo`).
- **Cómo se retira una tarjeta sin romper ids:** se deja la entrada en `CAPTURE_COMMANDS` con
  descripción `RETIRADO: …` (los ids son posicionales: borrar la fila renumeraría todas las
  posteriores) y se añade su `cap-cmd-NNN` a `REMOVED_IMAGE_IDS`, que la borra también de los
  navegadores que ya la tuvieran guardada. No se le deja `CODE_FOLDER` ni prompt propio.
- **Verificación:** producción muestra `(3 trucos)` en la carpeta y la búsqueda «boda» no
  devuelve nada; un perfil con las 13 tarjetas guardadas queda con 3 al recargar.

### [2026-10-21] Las contraseñas del proyecto viven en el `.htaccess` raíz, no en el código

- **Contexto:** había ~50 ficheros con una contraseña cada uno (`auth.php` con un hash de 20
  caracteres, `validar_password.php` con `0`, `01`, `1`, `0503` en claro en un repo público, JS con
  `ADMIN_PASSWORD`…). Cambiarla obligaba a tocar varios ficheros por app y desplegar.
- **Decisión:** dos contraseñas únicas —`PW_EDIT` (editar) y `PW_ACCESS` (acceder)— declaradas con
  `SetEnv` en el `.htaccess` raíz de Hostinger, **fuera de git**, igual que las claves de API.
  Todas las apps las leen con `auth/lib.php`; un endpoint común `/auth/validar.php` sirve a las
  apps nuevas. Cambiarla es editar una línea del `.htaccess` (sin commit ni despliegue).
- **Por qué:** Antonio lo pidió así y es el patrón del proyecto: un secreto, un sitio, nada de
  valores en el repositorio. Además elimina 107 ficheros con contraseñas escritas.
- **Contrapartida aceptada:** `PW_EDIT` vale `0` a propósito — no protege. Por eso **publicar en
  GitHub no usa `PW_EDIT`**: pide `PW_ACCESS` (decisión de Antonio), porque `publicar.php` mueve el
  token de GitHub. Si algún día se quiere más seguridad, solo hay que cambiar `PW_ACCESS`.
- **Excepción:** `apps/boveda_privada` no se centraliza: su contraseña es la llave de cifrado de los
  datos (zero-knowledge). Cambiarla obligaría a re-cifrar y no hay forma de hacerlo sin la actual.
- **Verificación:** `GET /auth/validar.php` → `"configurado":{"edicion":true,"acceso":true}`;
  candado de TrickVault con la de edición, login de Descargas con la de acceso.

### [2026-10-21] Agenda (`apps/agenda`): la app del modelo se porta a PHP + estático

- **Decisión:** la app que generó un modelo (React 19 + Express + SQLite + Gemini, descargada de AI
  Studio) se publica como **build estático de React + backend PHP**, no como app Node.
  **Motivo:** el hosting de atnojs.es es compartido (LiteSpeed + PHP) y no ejecuta Node; además el
  repo ya tiene una convención probada (estado JSON con `flock`, proxy con claves del entorno,
  sesión con contraseña). **Contrapartida:** se descarta el backend Node original (no se versiona);
  el fuente React sí queda en `apps/agenda/src/` y el build se regenera con `npm run publish`.
- **Decisión:** transcripción con **OpenAI** (`gpt-4o-mini-transcribe`, fallback `whisper-1`) en vez
  de Gemini, y clasificación cita/tarea/nota con **reglas en español**. **Motivo:** la clave de
  OpenAI ya está configurada en el `.htaccess` raíz y funciona (probado); Antonio pidió «la opción 1»
  y aclaró que la app es «de ChatGPT». **Contrapartida:** la clasificación es explicable pero menos
  semántica que un LLM; el contrato del modal permite añadir un clasificador LLM después sin tocar
  la UI.
- **Decisión:** misma URL `/apps/agenda/` y misma contraseña de edición; datos en `data/` fuera de
  Git y audios servidos solo por `audio.php` con sesión. **Motivo:** privacidad y no romper el
  acceso que Antonio ya conoce.
- **Decisión:** el `.htaccess` de la app (rewrites de `api/` y `uploads/audio/`) sí se versiona,
  con excepción explícita en el `.gitignore` raíz. **Motivo:** sin él no hay API REST en Hostinger;
  no contiene claves (la de OpenAI sigue solo en el `.htaccess` raíz).

### [2026-10-19] Agenda (`apps/agenda`): JSON en disco y fuente autoalojada

- **Decisión:** el MVP guarda el estado en `data/state.json` con `flock` y escritura atómica, en vez
  de MySQL. Motivo: no hay credenciales de base de datos configuradas para esta app y el volumen
  personal no necesita motor; se evita un punto de fallo y el despliegue sigue siendo un push.
  Contrapartida: si algún día hay multiusuario o miles de registros, migrar al esquema documentado
  en la entrega (`events`, `tasks`, `notes`, `audios`).
- **Decisión:** Electrolize se sirve local (`apps/agenda/electrolize.ttf`) con `@font-face` y CSP
  propia, sin Google Fonts. Motivo: elimina dependencia externa, mejora privacidad y reduce CLS.
- **Decisión:** la clasificación del audio es un analizador de reglas en español (la IA es la
  transcripción) y el usuario confirma siempre. Motivo: el caso es personal, una regla explicable
  acierta lo común y no gasta API; si hace falta más, un LLM entra después del mismo contrato.
- **Decisión:** el audio se entrega solo por `audio.php` con sesión y `realpath` validado; `data/`
  está fuera de git y con `Require all denied`. Es la única forma de que un fichero privado no
  quede accesible en la raíz pública de Hostinger.

### [2026-10-15] Una carpeta = un sujeto; y «Comida y moda» se parte en dos

- **Decisión:** cada carpeta de TrickVault usa **un solo sujeto** en todas sus imágenes
  (Antonio: «dentro de una carpeta todas las imágenes deben utilizar el mismo sujeto para que
  de verdad se vea la diferencia»). Excepciones documentadas: códigos de lettering (una
  palabra), escenas autosuficientes (`/galaxy`, `/dragon`), y códigos que exigen una categoría
  concreta (un animal, una célula, un plato) o cuyo prompt nombra otra cosa (p. ej.
  `/footweartechpack` dice «footwear tech pack / sneaker»).
- **Decisión:** `xl-comidamoda` («Comida y moda») se parte en **`xl-comidamoda` = «Comida»**
  (26 tarjetas) y **`xl-moda` = «Moda»** (25: ropa, estilismo, belleza, joyería).
  Las fotos **siguen en `assets/comida-moda/`**: ya funcionan y moverlas obligaría a tocar
  todas las URLs.
- **Motivo:** mezclar dos temas en una carpeta impide comparar el mismo sujeto entre códigos,
  que es para lo que sirve la carpeta.
- **Contrapartida:** al cambiar el nombre de una carpeta, un navegador que ya tenía la lista
  guardada conserva el nombre viejo. Se resuelve con `FOLDERS_SCHEMA_VERSION` (5 → 6) y el
  mapa `FOLDERS_LABELS_ANTIGUOS`, que renombra solo si el nombre guardado es el viejo por
  defecto (si Antonio le puso otro a mano, se respeta).

### [2026-10-15] La memoria vive en `tools/memoria/`, no en la raíz

- **Decisión:** toda la memoria operativa va en `tools/memoria/`.
- **Motivo:** el repo se despliega en la **raíz pública** de Hostinger: cualquier fichero
  versionado es accesible por web. `tools/` tiene un `.htaccess` con `Require all denied`.
  La memoria acumulará rutas y detalles internos; no tienen por qué ser públicos.
- **Contrapartida:** hay que conocer la ruta. Se resuelve con el puntero en `claude.md`,
  que sí se lee siempre.

### [2026-10-15] En la memoria se escriben rutas, nunca valores de claves

- **Decisión:** ni contraseñas, ni tokens, ni API keys — solo **dónde** están.
- **Motivo:** el valor caduca (se rota) y el fichero viaja por git. Un secreto escrito aquí
  es un secreto publicado.

### [2026-10-15] OmniRoute sigue escuchando en `0.0.0.0` (no se cambió a loopback)

- **Decisión:** dejar el bind como estaba y documentarlo en vez de "arreglarlo".
- **Motivo:** existe una skill `omniroute-wsl-claude-code` en Hermes: hay clientes que
  pueden llegar desde WSL o desde otro equipo. Cambiar a `127.0.0.1` sin comprobarlo
  rompería ese flujo. El interruptor está listo (`OMNIROUTE_BIND=127.0.0.1`).
- **Pendiente asociado:** ver `pendientes.md`.

### [2026-10-15] No se cambió la contraseña del panel de OmniRoute

- **Decisión:** dejarla y documentar sus dependencias.
- **Motivo:** al menos dos sitios la usan (el daemon y
  `E:\hermes-data\scripts\monitor-omniroute-diario.py`). Cambiarla a lo loco rompe el
  registro automático de DeepSeek. Ahora vive en
  `C:\Users\atnojs\.omniroute\panel.secret` (fuera del repo), no dentro del `.py`.

### [2026-10-15] Los ficheros sustituidos se guardan como `.bak-<fecha>`, no se borran

- **Decisión:** todo instalador deja respaldo de lo que reemplaza.
- **Motivo:** el montaje de OmniRoute llevaba meses funcionando; un arranque automático
  roto deja a Hermes sin proveedor. Los respaldos del arranque se movieron a
  `E:\hermes-data\backups\autostart-backups`.

### [2026-10-15] Nunca ramas ni worktrees (regla del proyecto)

- **Decisión:** todo se publica en `main`.
- **Motivo:** cada worktree genera historia paralela con SHAs distintos y deja ramas
  huérfanas. Ya está en `claude.md`; se repite aquí porque es el error más caro de deshacer.

### [2026-10-17] Se documenta con guía + scripts, no con capturas

- **Decisión:** para montajes de sistema, guía en Markdown y scripts ejecutables.
- **Motivo:** las capturas caducan y no se pueden volver a ejecutar. La regla de
  `capturas-verificacion` es para resultados **visuales** de apps/web, no para esto.

### [2026-10-17] Web Interface Guidelines, copia fijada en el repo

- **Decisión:** las reglas de interfaz de Vercel se guardan fechadas en
  `skills/recursos/web-interface-guidelines/` y se aplican desde la sección H de
  `auditor-lighthouse-accesibilidad`; no se descargan en cada revisión.
- **Motivo:** una skill que baja instrucciones de una URL cada vez es superficie de inyección y
  cambia el criterio sin avisar. Fijarla hace la auditoría reproducible; actualizarla es una
  decisión explícita (nueva copia fechada + revisar la sección H).
- **Contrapartida:** hay que actualizarla a mano cuando cambien las guías.

### [2026-10-17] Recrear desde referencia: sistema sí, assets no

- **Decisión:** `recrear-desde-referencia` copia el **sistema** de la referencia (jerarquía, ritmo,
  layout) y lo mapea a los tokens hoola; nunca copia fotos, logos, ilustraciones ni textos ajenos,
  y las imágenes se generan con `openai-image-2-low`.
- **Motivo:** derechos de terceros y coherencia de marca. El pixel-perfect no aporta y el material
  ajeno no se puede usar.
- **Contrapartida:** si Antonio pide el look exacto, se avisa de la desviación de marca y se decide
  juntos.

### [2026-10-17] Playwright CLI como verificación funcional estándar

- **Decisión:** el flujo real en navegador (clics, formularios, subida/descarga, consola, red,
  recarga y 3 anchos) se comprueba con `playwright-cli` siguiendo la skill `verificacion-playwright`.
  `capturas-verificacion` sigue siendo la herramienta de **medida de geometría** (harness + iframes + PIL).
- **Motivo:** `capturas-verificacion` no puede pulsar ni rellenar, y la regla del proyecto exige
  recorrer el flujo completo en el navegador y verificar descargas. Playwright CLI es oficial
  (Microsoft), reutiliza el Chrome instalado (no descarga navegadores) y evita cargar en contexto
  esquemas MCP grandes.
- **Contrapartida:** en DSH con sandbox `workspace-write` Chrome no arranca (`spawn EPERM`): hay que
  ejecutarlo con permiso ampliado. No sustituye a Safari/iOS real (webkit no está instalado).

### [2026-10-23] El prompt maestro de calidad web vive en `tools/prompts/` y se valida con doble gate

- **Decisión:** el prompt que exige autoevaluación de **todos** los roles, supervisión independiente
  y suelo de 90 % vive en `tools/prompts/maestro-web-autocalidad/` (carpeta protegida por
  `.htaccess`), no en `skills/`. Se entrega como documento con `LEEME.md`, `EVIDENCIA.md`, las
  secciones canónicas, autoevaluaciones, scorecards y auditoría adversarial.
- **Motivo:** Antonio pidió un prompt, no una skill, y el contenido incluye evidencias, rutas y
  detalles internos que no tienen por qué publicarse. El contrato de calidad (autoevaluación de cada
  agente, supervisor independiente, 90 % inviolable) exige un proceso de validación propio: red-team
  y dos gates finales sobre el mismo SHA.
- **Contrapartida:** no se autodescubre como skill: hay que cargarlo explícitamente. Compensa porque
  el documento completo ocupa ~185 KB (189.489 bytes) y no debe consumir contexto en tareas que no lo necesiten; el
  `LEEME` explica el reparto por rol.
- **Verificación:** `EVIDENCIA.md` (matriz R1–R8, gates FG-A 96,0 y FG-B 95,0, red-team sin
  B/M/Med/Men abiertos) y `supervision/scorecard-supervisor-*.md`.
- **Actualización (misma fecha):** Antonio pidió que el gate se aplique solo, sin copiar/pegar; se
  convierte en skill obligatoria `autocalidad-90` (ver la entrada siguiente). El protocolo completo
  sigue siendo la fuente de verdad en `tools/prompts/maestro-web-autocalidad/`.

### [2026-10-23] `autocalidad-90`: el gate del prompt maestro pasa a skill obligatoria

- **Decisión:** el protocolo de autoevaluación + supervisión ≥ 90 se operativiza como skill canónica
  `skills/SKILL_AUTOCALIDAD_90.md` (puntero `.claude/skills/autocalidad-90/SKILL.md`), obligatoria
  antes de generar o editar cualquier artefacto. El protocolo completo sigue en
  `tools/prompts/maestro-web-autocalidad/PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` y se carga solo para
  webs/apps o trabajos multiarchivo.
- **Motivo:** Antonio no quiere copiar/pegar: la skill se autodescubre y se activa por su descripción
  en cualquier tarea de creación/edición. Cargar los ~185 KB (189.489 bytes) completos en cada edición sería inviable
  y duplicaría la fuente de verdad; la skill compacta aplica el gate y remite al protocolo completo
  cuando hace falta.
- **Contrapartida:** en tareas pequeñas el gate se aplica con la versión compacta (rúbrica + PASS);
  para webs/apps hay una lectura adicional del protocolo completo, una vez por tarea.
- **Verificación:** `autocalidad-90` aparece en el catálogo de skills de DSH de la sesión; puntero
  validado con `php tools/generar-punteros-skills.php --check`; `claude.md` la declara obligatoria y
  `SKILL_MAESTRA.md`, `SKILL_CREAR.md`, `SKILL_EDITAR_cirujano-codigo-produccion.md` y `mapa.md` la
  referencian.


## 2026-10-24 — Los tonos frío/cálido de `ajustes_imagen` se calculan en local, no con IA

- **Contexto:** había que añadir 2 botones para pasar la imagen a colores fríos/cálidos.
- **Decisión:** grading local por píxeles en canvas (balance de blancos normalizado por luminancia + split toning + micro saturación), aplicado a la imagen de trabajo y guardado con el botón de historial existente.
- **Por qué:** es instantáneo, gratis y determinista; no depende de `proxy.php` ni de la clave de ninguna API, y el resultado es reversible (segundo clic en el tono activo restaura el original) sin acumular el efecto.
- **Cómo se comprueba:** `tools/evidencias/2026-10-24-ajustes-imagen/verificacion-produccion-fix.json` (contraste activo 8,63:1 / 8,58:1) y `flujo-verificacion.json` (medias RGB: original 153,162,171 → frío 141,163,190 → cálido 166,161,146 → restaurado 153,162,171).


## 2026-10-24 — TrickVault: el nombre manual de una carpeta gana a la capa publicada en ese navegador

- **Contexto:** `applyPublishedFolders` deja que la capa publicada mande en el nombre de las
  carpetas. Un renombrado local aún sin publicar se perdía al recargar, justo lo que pide el
  encargo («cambiar el nombre de las carpetas en el modo edición»).
- **Decisión:** apuntar los nombres puestos a mano en `trickvault_folders_renombradas` y aplicarlos
  **después** de la capa publicada (`loadFolders` y `applyPublishedFolders`). «Favoritos» no se
  puede renombrar: es una carpeta de sistema que se resuelve por constante (`FAVORITES_FOLDER`).
- **Por qué:** no se pierde el trabajo local y publicar sigue siendo el mecanismo para propagarlo a
  los demás equipos (`listaCarpetas`). Alternativa descartada: reescribir la capa publicada en cada
  recarga (perdería los nombres puestos desde otros navegadores).
- **Contrapartida:** en multi-dispositivo, un nombre local viejo puede pisar un cambio remoto
  posterior; limpiar/rebasar la capa al publicar con éxito queda como mejora futura (D1 del
  veredicto del verificador). `PW_EDIT` del proyecto es «0» (ver `credenciales.md`): el candado no
  protege, la publicación sí pide `PW_ACCESS`.
- **Verificación:** `tools/evidencias/2026-10-24-trickvault-renombrar/prod-despues/informe-prod-despues.json`
  (persistencia tras recarga con la capa publicada antigua) y `verificador/VEREDICTO.md` (PASS 96,0).

### [2026-10-26] Copia Hoola de unified-image-studio: namespace local y CSP propia

- **Decisión:** la copia `apps/unified-image-studio-hoola/` usa su propio IndexedDB (`unified-image-studio-hoola`) y claves `uis-hoola:*`, porque IndexedDB/localStorage son por origen y la copia vive en el mismo dominio que la original: sin namespace se mezclarían proyectos locales.
- **Decisión:** `.htaccess` propio con CSP que permite `blob:` solo en img/media (el resto igual de restrictivo que la política del proyecto). No se toca la CSP raíz. Motivo: el modo local del estudio usa object URLs y el CSP heredado lo bloqueaba; el patrón ya existía en `apps/conversor_multimedia`.
- **Decisión:** el historial sigue siendo proyectos + versiones + `jobs` en SQLite (diseño del original), sin añadir `history.php`/`history-manager.js` para no duplicar almacenamiento.
- **Decisión:** el selector de modelo conserva los 12 ids canónicos y el estado inicial `openai-image-2-low`; en el panel lateral se reparte en varias líneas por ancho (la skill lo permite cuando el panel es más estrecho que el grupo).
---

### [2026-10-26] Unified Image Studio: Flow se ejecuta en el PC y la web solo encola

- **Decisión:** la generación con Google Flow **no** ocurre en el navegador ni en Hostinger. La web
  encola en SQLite (`flow_jobs`) y un agente instalado en el PC
  (`tools/flow-agent/flow_agent.py`) reclama por HTTPS con su propia credencial, genera con la CLI de
  Flow y sube el resultado al servidor.
- **Por qué:** Antonio pidió usar el estudio **desde el móvil y desde otros ordenadores**. Hostinger
  no puede alcanzar su PC (CGNAT, IP variable, sin puertos abiertos) y `localhost` del visitante es
  su propio dispositivo, no el PC con Flow. Una conexión **saliente** del PC resuelve el problema sin
  tocar el router ni exponer nada.
- **Contrapartida:** el PC tiene que estar encendido y con la sesión de Flow iniciada. Se asume y se
  comunica: la interfaz muestra «Flow: conectado / desconectado», permite encolar igualmente y la
  cola sobrevive a cerrar la pestaña.
- **Credencial:** solo del entorno (`UIS_FLOW_AGENT_TOKEN`) o de `storage/flow-agent.json`, nunca en
  Git ni en el frontend; el `agente.json` del PC está en `.gitignore`. Es independiente de la
  contraseña de la persona: `claim/complete/fail` exigen credencial de agente y `flow.file` exige
  sesión o credencial.
- **Estados honestos:** un trabajo cuyo PC dejó de responder pasa a `unknown` («pendiente de
  comprobar») y **no se reenvía solo**; el usuario decide con «Reintentar» después de mirar en Flow.
  Evita gastar dos veces la generación.
- **Verificación:** `apps/unified-image-studio/docs/VERIFICACION.md` §17 (backend, agente, Chrome en
  tres anchos, regresión). Generación real de Flow no ejecutada en esa ronda (consume puntos).

### [2026-10-26] La interfaz de costes sale del estudio; la protección económica se queda en el servidor

- **Decisión:** se retiran del DOM, CSS y JS el medidor de coste, la estimación por operación y el
  modal de presupuesto. **No** se retiran autenticación, límites técnicos (trabajos por minuto,
  tamaño de subida), protección de proveedores ni mensajes de cuota del proveedor.
- **Por qué:** Antonio lo pidió expresamente. Ocultar euros no hace gratuita una generación: los
  límites reales siguen donde deben estar (servidor), y los errores de cuota se explican tal cual.
- **Contrapartida:** `budget.get/set` y la tabla `ledger` siguen en el backend, sin interfaz que los
  use. Se conservan para no romper la base de datos ni el histórico; si se quiere limpiar del todo,
  es un cambio de esquema aparte.
### [2026-10-27] `unified-app`: el build publicado vive en la raíz y el index de Vite pasa a `index.dev.html`

- **Contexto:** la app es Vite + React, pero en esta Hostinger la carpeta de la app es la raíz
  pública (`/apps/unified-app/`) y `dist/` está en `.gitignore`. El repo solo tenía el
  `index.html` de desarrollo → producción recibía un HTML que pedía `/src/main.jsx` (404) y la
  pantalla quedaba en blanco.
- **Decisión:** `index.html` es la **página de producción** (la genera `scripts/publish.mjs` con
  refs `./assets/app.<fecha-hora>.js|css`) y la entrada de Vite se mueve a **`index.dev.html`**
  (`rollupOptions.input`, `server.open`), con `base: '/apps/unified-app/'`.
- **Por qué:** es la única forma de que convivan en el mismo directorio el HTML que se sirve y el
  grafo de módulos sin que uno pise al otro; y el nombre versionado por fecha evita la caché de la
  CDN de Hostinger, que indexa **por ruta** e ignora `?v=`.
- **Contrapartida:** en desarrollo la URL es `…/apps/unified-app/index.dev.html` (documentado en el
  README) y el `.htaccess` deniega `index.dev.html`, `scripts/` y los `package*.json` en producción.
- **Verificación:** `npm run publish:app` reescribe el index y copia los assets; el servido en
  producción tiene el mismo SHA-256 que el local (`75d74b92…`) y `index.dev.html` responde 403.

### [2026-10-27] `unified-app`: el login usa el proyecto Firebase `nanobanana-cbb2d`

- **Contexto:** el build traía el proyecto `generacion-de-imagenes-6e624`, cuya apiKey está revocada
  (`API_KEY_INVALID` en `identitytoolkit` con cualquier Referer). Sin clave válida, el login falla
  siempre y la app es inútil aunque la pantalla ya no esté en blanco.
- **Decisión:** usar la configuración de **`nanobanana-cbb2d`** (`AIzaSyAlTZgo…`), la misma de las
  apps vivas del catálogo (`generar_imagenes`, `imagenes_ia`, `prompts_predeterminados`,
  `viaje_tiempo`), sin tocar nada más del bundle.
- **Por qué:** es el único proyecto del que consta una clave que hoy responde
  (`INVALID_LOGIN_CREDENTIALS` con credenciales falsas = clave válida), y es el que ya usan los
  usuarios reales de Antonio, así que los inicios de sesión existentes sirven.
- **Contrapartida:** si el proyecto antiguo se recupera (apiKey nueva), habría que volver a cambiar
  la config y republicar; los usuarios que solo existan en el proyecto viejo no podrán entrar.
- **Cómo se comprueba:** POST directo a
  `identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<clave>` → con la vieja
  `API_KEY_INVALID`, con la nueva `INVALID_LOGIN_CREDENTIALS`; y en la UI, credenciales falsas
  devuelven «Credenciales inválidas o error de red.» con `auth/invalid-credential` en consola.

### [2026-10-27] `unified-app`: se retira el `lightbox.js` genérico del build publicado

- **Contexto:** el `dist/index.html` cargaba el visor compartido `lightbox.js`; su overlay nace con
  `display:flex` en línea y tapa a pantalla completa la app al cargar.
- **Decisión:** no publicar ese script en esta app. El visor propio de React (modal de máscara y
  ampliación de resultados) se conserva intacto.
- **Por qué:** el script compartido está pensado para apps vanilla que no tienen visor propio; aquí
  duplica función y rompe la interfaz. Se prefiere no incluir antes que retocar un módulo compartido
  que usan otras apps.
- **Cómo se comprueba:** en producción no existe `#lightbox-antigravity` en el DOM y la pantalla de
  login se ve sin velo (`document.querySelectorAll('#lightbox-antigravity').length === 0`).
