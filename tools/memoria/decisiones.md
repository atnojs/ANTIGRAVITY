# Decisiones tomadas y por qué

Registro de cosas que **parecen raras a propósito**. Antes de cambiarlas, lee el motivo;
si el motivo ya no aplica, actualiza esta entrada en el mismo cambio.

---

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
  el documento completo ocupa ~184 KB y no debe consumir contexto en tareas que no lo necesiten; el
  `LEEME` explica el reparto por rol.
- **Verificación:** `EVIDENCIA.md` (matriz R1–R8, gates FG-A 96,0 y FG-B 95,0, red-team sin
  B/M/Med/Men abiertos) y `supervision/scorecard-supervisor-*.md`.
