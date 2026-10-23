# Sección 4 — Verificación end-to-end, proyecto y entrega

> **Nota de integración (no forma parte del prompt final).** Aporta cuatro piezas: reglas de proyecto para **§2**, **§9 Fase 5**, **§10 Fase 6** y **§12 Anexos**. Referencia §6 (rúbrica), §7 (supervisión) y §8 (rework) sin redefinirlas. Trazabilidad principal: **R8** → 2.3.7, 9.1–9.13, 10.1–10.2 y 12.3 (cuatro mecanismos independientes); **R7** → 9.13 y 10.3; **R4** → 9 (intro) y 9.13 (verificación independiente y supervisión que reproduce); **R5/R6** → 9.13 y 10.1–10.2. La Fase 5 se asigna al «dueño de la tarea de verificación» (rol «Autores y especialistas» de §1.4, §7.2/§7.6) y su evidencia la supervisa §7: no se introducen roles nuevos. Fuera de Antigravity se aplica §12.2: cambian rutas e infraestructura, no los criterios.

## 2.3 Reglas inviolables del proyecto

Estas reglas obligan a todo agente que cree, edite o publique la web, además de las demás reglas de §2. Son requisitos de aceptación: incumplirlas es defecto, y si afecta a funcionalidad, seguridad o verificación es bloqueante. En un entorno distinto de Antigravity se sustituyen rutas y herramientas según §12.2; no se rebaja ningún criterio.

### 2.3.1 Skills obligatorias

| Cuándo | Skill | Qué impone |
|---|---|---|
| Crear o editar la web | `skills/SKILL_CREAR.md` y `skills/SKILL_MAESTRA.md` | Fases completas de creación; Fases 4–5 de control, publicación y checklist de salida |
| Diseño nuevo o rediseño | `skills/SKILL_style-guide-antigravity.md` | Estilo Hoola/Relatos, tokens, glassmorphism y validación visual |
| Historial | `skills/SKILL_history-server.md` | Persistencia PHP en servidor, entre navegadores y sesiones |
| Proxy y claves | `skills/SKILL_arquitecto-backend-php-hostinger.md` | Claves solo en el entorno del servidor; proxy cerrado y acción de salud |
| Geometría y capturas | `skills/SKILL_CAPTURAS_VERIFICACION.md` | Medir en Chrome y enseñar el resultado, no describirlo |
| Flujo real en navegador | `skills/SKILL_VERIFICACION_PLAYWRIGHT.md` | Clics, formularios, descargas, consola, red, recarga y anchos |
| Auditoría final | `skills/SKILL_AUDITOR.md` | Rendimiento, SEO, contraste, teclado, imágenes, formularios, contenido dinámico y UX |
| Editar código existente | `skills/SKILL_EDITAR_cirujano-codigo-produccion.md` | Cambio quirúrgico sin destruir lo que funciona |

Reglas de uso: la skill se lee **antes** de escribir código; en el contrato de tarea se anotan las skills cargadas y su fecha de lectura; si una skill falta en el destino, se aplica el requisito equivalente de este prompt y se declara la carencia (no se inventa su contenido); si una skill contradice este prompt, se cumple el requisito más exigente y se documenta; si dos reglas del proyecto discrepan entre sí, manda la especificación más reciente y específica para la materia (producción, estilo y overlay: `SKILL_MAESTRA.md`; auditoría: `SKILL_AUDITOR.md`) y se deja constancia en el informe.

### 2.3.2 Arquitectura mínima

```text
apps/<nombre-app>/
├── index.html          ← estructura semántica; sin lógica inline salvo la imprescindible
├── app.css             ← estilos; tokens Hoola y responsive
├── app.js              ← lógica del cliente
├── proxy.php           ← único punto servidor para APIs con clave + health
├── history.php         ← API de historial en servidor (list, save, delete, clear)
├── history-manager.js  ← cliente de history.php; se carga antes del código que lo usa
├── assets/             ← imágenes y recursos estáticos
└── history_store/      ← datos persistentes: NUNCA se versiona
```

Reglas de integración: en una app existente se comparan primero las copias y se conservan las adaptaciones válidas; el frontend nunca llama a un proveedor con clave ni guarda la clave; `history-manager.js`, `history.php` y `proxy.php` se copian de los canónicos de `skills/`; el historial usa una instancia con nombre único (`new HistoryManager('nombre_app')`), `load()` al iniciar y `onChange()` para renderizar; el servidor es la fuente de verdad, no `localStorage`; los errores de persistencia se muestran en la interfaz; los datos de `history_store/` y las herramientas de prueba no se versionan.

### 2.3.3 Proxy y claves

- Las claves viven **solo** en el `.htaccess` raíz privado del hosting con `SetEnv`: `R` (OpenRouter) y `OPENAI_API_KEY` (alias `O`, OpenAI). No crear ni leer `config.php` ni constantes locales con claves.
- `proxy.php` resuelve la clave solo del entorno (`getenv`, variantes `REDIRECT_`, `$_SERVER`, `$_ENV`); valida método, acción, modelo, tamaño y tipos; usa lista blanca cerrada de acciones y modelos; no acepta URLs remotas arbitrarias; devuelve errores JSON comprensibles sin claves, rutas internas ni trazas; aplica tiempos máximos.
- Toda app conserva `proxy.php` con acción `health` que informa de configuración y catálogo sin gastar API. Una web sin IA lo mantiene como endpoint de salud.
- El frontend llama al proxy, nunca a la API externa. No se registran claves en logs, capturas, documentación ni respuestas. Si una clave aparece expuesta, la entrega se detiene: hay que revocarla y regenerarla.
- Validación mínima: `php -l proxy.php`, acción `health` en servidor y una petición real cerrada.

### 2.3.4 Persistencia en servidor

- Historial persistente obligatorio mediante `history.php` + `history-manager.js`: `list` (GET), `save`, `delete` y `clear` (POST). Cada entrada guarda un `id`, un `type`, `data` serializable y `createdAt`.
- `load()` al iniciar; `save()` después de cada generación o edición con éxito; `delete()` y `clear()` con confirmación; `onChange()` mantiene la vista sincronizada. Si el servidor falla, se muestra el error y no se simula éxito.
- No se guardan secretos en el historial. El almacén (`history_store/`) queda fuera de Git con su `.htaccess`; el despliegue no debe pisarlo. En Hostinger, PHP necesita permiso de escritura en esa carpeta.
- La persistencia se comprueba guardando, recargando, abriendo otra pestaña o navegador y eliminando. Si la app necesita más estado que el historial, se guarda también en servidor con escritura atómica y datos fuera de Git; `localStorage` puede ser caché, nunca la única fuente de verdad.
- Toda app que genere o edite imágenes incluye el panel de historial canónico: `<aside class="history-col">` con scroll propio, sticky en escritorio y ancho completo en móvil, título y botón «Limpiar» ocultos mientras no haya elementos, lightbox con cierre por clic y Escape, y borrado individual.

### 2.3.5 Estilo Hoola/Relatos

- Cian `#00D0D0` y verde `#26C626`; tipografía **Electrolize** en toda la interfaz (encabezados, cuerpo y controles). Electrolize solo tiene peso 400: la jerarquía se construye con tamaño, `letter-spacing` y mayúsculas, nunca con pesos sintéticos ni una segunda familia.
- Lienzo: degradado fijo `linear-gradient(180deg, #001018 0%, #062f43 60%, #0E5368 100%)`, dos halos radiales difusos y rejilla cian de 1 px cada 46 px con máscara radial.
- Paneles de vidrio azulado `rgba(23, 79, 122, 0.42)` con `backdrop-filter: blur(12px)`; borde sólido de 2 px `rgba(0, 208, 208, 0.45)`, radio 14 px (9 px en controles), halo exterior e iluminación interior cian. Prohibidas las tarjetas casi negras, los bordes de 1 px sin presencia y las sombras grises genéricas.
- Controles con la misma superficie de vidrio y borde cian; hover con capa blanca translúcida al 8 %; selección activa en cian sólido y acción primaria con gradiente cian-verde y texto azul muy oscuro.
- Composición: ancho máximo 1800 px, relleno exterior 16 px, separaciones 14–20 px; título `clamp(2rem, 5vw, 3.2rem)`, mayúsculas, `letter-spacing: 0.04em` y triple halo cian; subtítulo `1.05rem` con `var(--text-dim)`.
- Tokens mínimos en `:root`: `--acc:#00D0D0; --acc2:#26C626; --text:#eaffff; --muted:#99CCCC; --text-dim:#99CCCC; --contenedor:#174F7A; --border:rgba(0,208,208,.7); --border-strong:#00D0D0; --card-bg:rgba(23,79,122,.42); --card-hover:rgba(30,100,150,.55); --glow:rgba(0,208,208,.8); --glow-soft:rgba(0,208,208,.4); --font-ui:'Electrolize', system-ui, sans-serif`.
- Animaciones solo con `transform`/`opacity`; `prefers-reduced-motion` respetado; texto de interfaz y toda instrucción a una IA que genere texto o audio, en español.
- Estados: overlay de carga canónico (tres aros, barra indeterminada, texto `IA generando lo solicitado...`, `role="status"`, `aria-live="polite"`, `aria-busy="true"`, sin porcentaje, scroll bloqueado, acción duplicada deshabilitada) y estados vacío, error y reintento visibles.

### 2.3.6 Imágenes con OpenAI image 2 y selectores

- Modelo por defecto del proyecto: **image 2** con calidad baja, identificador `openai-image-2-low` → `gpt-image-2`, `quality: low`. Catálogo mínimo de image 2: `openai-image-2-low` (low, por defecto), `openai-image-2` (medium), `openai-image-2-high` (high).
- El catálogo completo del proyecto (image 2.5, Gemini y Qwen) se consulta en la fuente canónica del proyecto (`skills/SKILL_MAESTRA.md` y la app de referencia); no se inventan identificadores ni se reutilizan nombres retirados. Si esa fuente no está disponible en el destino, se usan solo los identificadores de image 2 de esta sección, se declara la limitación y no se inventan los demás. Cada identificador se mapea en PHP con lista blanca cerrada; el fallback de valor ausente es `openai-image-2-low`.
- La edición de una imagen de referencia va por `https://api.openai.com/v1/images/edits` (multipart) en los modelos de OpenAI y **sin** `response_format`. Si el proveedor devuelve una URL temporal, se descarga y se persiste en servidor antes de responder.
- Toda app que genere o edite imágenes ofrece, como mínimo, selector de **calidad** (LOW/MEDIUM/HIGH de image 2, LOW activo), selector de **formato/relación de aspecto** y selector de **resolución** `512`, `1024`, `2048` y `4096`. El payload envía el identificador elegido y el valor real usado se muestra o se registra.
- Si el brief pide selector multimodelo, se usa el patrón canónico de toggles pill del proyecto: grupos por proveedor, mínimo dos líneas, botones de un grupo siempre en línea, activo único con gradiente contenedor→cian, y `openai-image-2-low` como estado inicial. No se cambian ids, etiquetas ni estado inicial sin petición expresa.
- Se conservan identidad y elementos protegidos al editar; se respetan los límites reales del modelo y se muestran las dimensiones efectivas sin fingir resoluciones. La imagen generada se puede ampliar (lightbox), descargar y guardar en historial.

### 2.3.7 Git, despliegue y comprobación de producción

- Se trabaja **solo en `main`**. Prohibido crear ramas, worktrees o copias de trabajo; si se crean por error, se eliminan al terminar y se publica en `main`.
- Commit por **ruta explícita**, nunca `git commit -a` ni `-am` (arrastra trabajo ajeno o a medias). Antes: `git status --porcelain`; después: `git show --stat HEAD` debe listar solo los ficheros del encargo. Cada unidad lógica verificada se publica con commit descriptivo y `git push origin main`; el push dispara el despliegue del hosting.
- Cierre de Git: `git log --oneline origin/main..HEAD` vacío (todo subido) y `git status` sin modificados los ficheros del encargo. Un arreglo sin push no existe.
- Comprobación de la versión servida: la URL pública responde 200, el HTML servido referencia el asset nuevo (hash o nombre con fecha) y la acción `health` del proxy devuelve el catálogo vigente. No basta con que el push conste.
- Caché: la CDN del proyecto cachea estáticos **por ruta** e ignora la query: ni `?v=` ni un `?t=` aleatorio crean una entrada nueva. Para publicar un cambio de CSS/JS, renombra el fichero con fecha, actualiza la referencia y vuelve a publicar; no borres el antiguo mientras haya HTML cacheado que lo pida. Para saber si el despliegue llegó, compara `Last-Modified` y el marcador de versión del `health`, no el contenido con parámetro.
- El despliegue tarda de 1 a varios minutos y puede atascarse (se han visto 10–30 min). Un 404 de una ruta nueva no es definitivo antes de ~20 min; si no publica en ese plazo, crea un commit vacío (`git commit --allow-empty -m "chore: re-disparar despliegue"`) y haz push: un push sin cambios no se ejecuta ni re-dispara el webhook. No se arregla borrando ni tocando ficheros a mano en el servidor: el despliegue repone el árbol versionado.
- Herramientas del proyecto que complementan (no sustituyen) la verificación: `tools/verificar-despliegue.ps1` (marcadores publicados en bucle) y `tools/verificar-apps-produccion.ps1` (health del proxy e historial de las apps).

### 2.3.8 Memoria del proyecto

- Al empezar: leer la memoria operativa (en Antigravity, `tools/memoria/MEMORIA.md` y los ficheros que la tarea necesite: entorno, mapa, errores, recetas, decisiones, producción, pendientes).
- Al terminar: actualizar `tools/memoria/bitacora.md` con fecha, qué se hizo y commit, y cuando aplique `errores.md` (síntoma, causa, solución, verificación), `recetas.md` (comando verificado), `decisiones.md` (decisión y porqué), `produccion.md` (qué se publicó y cuándo) y `pendientes.md` (lo abierto con el siguiente paso concreto).
- Reglas: nunca valores de claves ni contraseñas (solo dónde viven); punteros, no copias de lo ya documentado; toda entrada verificable. Fuera de Antigravity se registra lo equivalente en el proyecto (CHANGELOG/ADR/README) y se declara en la entrega.

### 2.3.9 Edición segura y alcance

- Antes de editar, leer el archivo completo y sus consumidores. Si el archivo existe, **no se reescribe desde cero**: parche mínimo y quirúrgico, salvo reescritura pedida expresamente y justificada.
- Conservar funcionalidades, rutas, nombres, IDs, clases, firmas y contratos existentes salvo petición expresa o necesidad técnica demostrable; actualizar consumidores solo si el contrato cambia.
- No mezclar refactorizaciones cosméticas con correcciones funcionales; no introducir dependencias nuevas sin justificación y sin declararlas en el contrato de tarea.
- Un escritor por archivo y por tarea. No se toca ningún archivo fuera del scope de escritura del contrato de tarea.
- Todo archivo versionado es accesible por web en el destino de producción: nunca versionar scripts de prueba, datos privados, historiales ni credenciales. Lo de desarrollo vive en una carpeta protegida y no publicada (en Antigravity, `tools/`), y se elimina al terminar.

## 9. Fase 5 — Verificación end-to-end del proyecto

La Fase 5 no produce código nuevo salvo las correcciones que exija la propia verificación: produce **evidencia**. La ejecuta el **dueño de la tarea de verificación** —rol «Autores y especialistas» de §1.4, asignado por el orquestador y registrado en el contrato de tarea (§4.4: «Dueño y supervisor» y «Gate aplicable»), conforme a §7.2 y §7.6—, que no es autor de lo verificado, no firma el gate de tarea y produce evidencia primaria. Su evidencia la supervisa el supervisor independiente (§7) y la audita el auditor end-to-end. Sin evidencia no hay PASS: una afirmación no verificada vale 0 en la rúbrica (§6).

### 9.1 Qué cuenta como verificado

- Verificado es **observado personalmente** por quien firma, en el entorno que ejecutará la web (URL publicada o runtime real), y **reproducible** por un tercero con la evidencia registrada.
- No son prueba: leer el código, revisar el diff, comprobar que el HTML responde 200, que el botón existe en el DOM, que la consola está limpia en una carga sin interacción, ni la palabra del autor.
- Todo defecto encontrado se registra con severidad y ubicación, se corrige y se re-verifica; no se pospone a «post-entrega» ni se disfraza de limitación.
- La Fase 5 se cierra con el informe de 9.13 y alimenta el gate de §7 y la entrega de §10.

### 9.2 Entorno y herramientas de verificación

- Entorno real: la **URL de producción** y la versión desplegada; si el brief no incluye publicación, el **runtime real declarado** en el contrato (servidor local ejecutable, staging o la app servida como se usará). `file://` no es prueba; `localhost` solo vale como entorno final si el brief define la app como local y se declara; en una app publicada, la entrega se firma sobre la URL publicada.
- Identidad de versión: anota commit (`git rev-parse HEAD`), hora de push y marcador servido (asset con hash/fecha o versión en `health`). Si el entorno sirve otra versión, la prueba no vale: espera el despliegue o re-dispáralo con un commit vacío y push (§2.3.7).
- Navegador: el Chrome instalado, con sesión propia de automatización por app (`playwright-cli -s=<app>`), sin perfiles personales. Comandos base: `open <URL> --browser=chrome`, `snapshot`, `click`/`fill`/`press`, `screenshot`, `console`, `requests`, `resize`, `close`. Cwd = carpeta de evidencias. **No matar Chrome por nombre de proceso**: cerrar con la sesión del CLI. Si el entorno impide arrancar el navegador, no se declara verificado (10.3).
- Caché: contexto limpio y recarga forzada. Para comprobar si la versión nueva está servida, mira `Last-Modified` y el marcador de versión (`health`), no un parámetro de query.
- Herramientas: flujo y comportamiento con Playwright; geometría con el harness de iframes de `capturas-verificacion` (Chrome no baja de 500 px de ventana: los anchos móviles se miden en iframe o con emulación de dispositivo); auditoría con `SKILL_AUDITOR`; capturas en Chrome headless para la entrega.
- Evidencia: carpeta `tools/evidencias/<AAAA-MM-DD>-<app>/`, protegida por `tools/.htaccess`; las capturas `.png` y `.playwright-cli/` están excluidas de Git por `.gitignore`, y el resto de evidencias (logs, JSON, medidas) se mantiene fuera del índice. Dentro van capturas numeradas, logs de consola y red, ficheros descargados y tabla de medidas. Adaptación §12.2. Banco de pruebas y perfiles temporales se borran al terminar.

### 9.3 Flujo completo del usuario en el navegador

- Abrir la URL real y recorrer el **flujo principal completo** del contrato de aceptación (Fase 0) en el orden del usuario: entrada → acción principal → resultado → persistencia → descarga o compartición → salida.
- Ejercer **todos los controles visibles** del recorrido (botones, enlaces, pestañas, selectores, menús y modales). Cada control produce el efecto que promete o no está visible: cero botones muertos, `href="#"` sin acción o «próximamente».
- Formularios: envío vacío, valores inválidos y valores válidos; mensajes junto al campo, foco en el primer error, datos conservados tras fallo, sin doble envío.
- Subida de ficheros: formatos y tamaños admitidos, rechazo del no admitido con mensaje comprensible, previsualización si existe.
- Navegación: atrás/adelante, recarga a mitad de flujo, enlaces directos y estado en la URL cuando el brief lo exija (pestañas, filtros, paginación).
- Errores provocados de verdad: entrada inválida, red cortada (abortar la petición desde la herramienta) o proveedor caído (acción de salud del proxy). Comprobar mensaje comprensible y reintento que funciona, no un botón que solo recarga.
- Teclado: recorrer el flujo principal solo con Tab, Mayús+Tab, Enter, Espacio y Escape.
- Evidencia por paso: captura y comprobación objetiva (texto o estado del DOM, número de resultados, contenido del panel). «Se ve bien» no es evidencia.

### 9.4 Consola y red

- Consola: **cero errores propios**. Warnings revisados y explicados; el ruido de extensiones o terceros se documenta y se separa. Un error propio es defecto (bloqueante si rompe la funcionalidad).
- Red: todas las peticiones del producto acaban en 2xx/3xx esperados; se identifican los 4xx/5xx propios. Un proxy puede devolver HTTP 200 con error interno: valida también el cuerpo. Assets 404, bucles, reintentos infinitos y peticiones duplicadas son defecto.
- Frontera de seguridad: ninguna petición del navegador va al proveedor de IA con clave; la clave solo existe en el servidor y no aparece en URL, cabeceras, respuestas ni trazas.
- Persistencia: en red se comprueba que guardar, eliminar y limpiar llaman a los endpoints del servidor y reciben JSON válido, no solo un 200.
- Evidencia: log de consola, listado de peticiones con estados, extracto de una respuesta relevante y captura del error si lo hubo.

### 9.5 Descargas y ficheros generados

- Toda descarga o generación de fichero que ofrezca la interfaz se prueba hasta el disco: JSON, TXT, CSV, imagen, PDF, ZIP, audio o vídeo.
- El fichero aparece en disco, con nombre y extensión esperados (evento de descarga capturado y guardado en la carpeta de evidencias). Tamaño mayor que 0 y coherente; jamás una página de error HTML guardada como `.json`.
- Contenido válido: JSON parseable con las claves y tipos del contrato; CSV con cabecera y filas; imagen que abre y tiene dimensiones; PDF que abre y tiene páginas; ZIP que lista entradas. Se anota hash cuando aplique.
- Coherencia con la interfaz: los datos descargados corresponden a lo mostrado (prompt, modelo, formato, resolución, fecha, identificadores).
- Reintento: una descarga fallida muestra error y puede repetirse con éxito. Un clic sin error no demuestra que la descarga funcione.
- Evidencia: ruta del fichero, tamaño, hash, salida de la validación y captura del resultado.

### 9.6 Recarga, persistencia y servidor

- Guardar → recarga completa → el elemento sigue y se renderiza desde el servidor; repetir en pestaña nueva o segundo navegador.
- Eliminar → recarga → desaparece; limpiar todo → recarga → vacío. El servidor es la fuente de verdad.
- Persistencia solo en `localStorage` o memoria es defecto bloqueante cuando el brief exige persistencia (siempre en el historial). Una caché local puede existir, pero no sustituye al servidor.
- Si el guardado falla, la interfaz lo muestra y no simula éxito; el dato no se pierde sin aviso.
- Servidor: consulta directa al endpoint de historial (`list`) y valida el JSON; el almacén (`history_store/`) no está versionado y el despliegue no lo pisa.
- Tras publicar (si el brief incluye publicación), repetir en el entorno final: crear, recargar, abrir en otro navegador, eliminar.
- Evidencia: capturas antes/después de recargar, respuesta del endpoint y captura del segundo navegador.

### 9.7 Responsive, geometría y táctil

- Matriz obligatoria: **360×800, 390×844, 768×1024 y 1440×900**. Mínimo tres anchos; si el brief fija otro conjunto, debe incluir al menos un móvil (360 o 390), una tablet (768) y escritorio (1440), justificado. La verificación estándar de este proyecto usa la matriz completa 360/390/768/1440.
- Medir geometría real, no a ojo: ancho de contenedores, número de líneas de los grupos de controles, recortes, solapes y elementos fuera del viewport. Sin scroll horizontal en cada ancho: `document.scrollingElement.scrollWidth <= window.innerWidth + 1`.
- Los anchos móviles se miden con emulación de dispositivo o dentro de iframes del ancho exacto: una ventana estrecha de Chrome no prueba un viewport de 360 px.
- Revisar: cabecera y título sin recortes; selectores de modelo, formato y resolución sin comprimirse ni apilarse mal; panel de historial lateral fijo en escritorio y ancho completo en móvil; modales y lightbox dentro del viewport; textos largos sin desbordar; imágenes con proporción correcta.
- Táctil: objetivos cómodos (referencia 44×44 px; nunca menos de 24×24 px con separación suficiente), acciones no dependientes de hover, sin scroll atrapado y sin zoom bloqueado (`user-scalable=no` prohibido).
- Evidencia: captura por ancho y tabla de medidas (ancho → contenedor → líneas/comportamiento). Si hubo corrección, comparativa antes/después etiquetada. Sin al menos tres anchos probados no se cierra la fase.

### 9.8 Accesibilidad y auditoría

- Ejecutar la auditoría completa del proyecto (`SKILL_AUDITOR`, secciones A–H) y exigir el **100 % de los ítems aplicables**. Cada N/A se justifica por ausencia real de la funcionalidad (mismo criterio que 9.13) y lo acepta el supervisor.
- Teclado: todo interactivo alcanzable con Tab en orden lógico, foco visible real (`:focus-visible` con outline), modales que atrapan el foco y cierran con Escape, skip-link si la navegación es extensa.
- Contraste calculado contra el fondo real de cada texto (no contra un color supuesto): ≥4,5:1 en texto normal y ≥3:1 en texto grande. No usar `#64748b` para texto normal sobre fondo oscuro. La información no se transmite solo por color.
- Semántica: un `h1`, jerarquía correcta, `<main>`, `alt` descriptivo, decorativas con `alt=""`, labels o `aria-label`, `aria-live` en resultados y errores, `aria-busy` durante procesos, botón para acciones y enlace para navegación, IDs únicos.
- Movimiento: `prefers-reduced-motion` respetado; animaciones solo con `transform`/`opacity`; sin `transition: all`.
- Anti-patrones que bloquean: `user-scalable=no`/`maximum-scale=1`, `onPaste` + `preventDefault`, `outline:none` sin foco alternativo, `<div onclick>` como botón, imágenes sin dimensiones, inputs sin label, botones de icono sin `aria-label`, fechas o números hardcodeados.
- Lighthouse sobre el entorno final (URL publicada o runtime real declarado), en móvil y escritorio: guardar las cuatro categorías (Rendimiento, Accesibilidad, Buenas prácticas, SEO) y las métricas. Se ejecuta con Chrome DevTools (pestaña Lighthouse) o con un runner equivalente ya disponible en el entorno; no se instala nada nuevo para auditar. Guarda captura o JSON por perfil. La nota de Lighthouse no es el umbral del proyecto (90 % de calidad de tarea, §6 y §7), pero una categoría por debajo de 90 obliga a corregir o a documentar causa raíz y decisión del supervisor: una auditoría con carencias conocidas no sostiene un 90 de calidad.
- Evidencia: informe A–H con `archivo:línea` de cada corrección, captura o JSON de Lighthouse y recorrido de teclado documentado.

### 9.9 Estados: vacío, carga, error, reintento y éxito

- Cada funcionalidad asíncrona se prueba en: inicial, vacío, carga, éxito, error, reintento y contenido largo o masivo.
- Carga: overlay canónico del proyecto (tres aros, barra indeterminada, texto `IA generando lo solicitado...`, `role="status"`, `aria-live="polite"`, `aria-busy="true"`, sin porcentaje, scroll bloqueado y acción duplicada deshabilitada) o su equivalente declarado; nunca un spinner mudo sin contexto.
- Vacío: explica qué hacer, no una pantalla en blanco.
- Error: mensaje comprensible en español, sin trazas técnicas, con reintento real y conservando la entrada del usuario.
- Éxito: resultado visible, anunciado por `aria-live` y con las acciones disponibles (descargar, guardar, ampliar).
- Tiempos: si la operación tarda, hay estado y mensaje; si se puede cancelar, se cancela de verdad. Estados simulados, éxito falso, botones inertes y mensajes «próximamente» son defectos bloqueantes.
- Evidencia: captura de cada estado; en el error, motivo provocado (red abortada o proveedor caído) y reintento posterior con éxito.

### 9.10 Seguridad de la entrega

- Revisión de los ficheros servidos (HTML, JS, CSS, JSON y capturas compartidas): sin claves, tokens, contraseñas ni rutas internas sensibles.
- Sin llamadas del frontend a un proveedor con clave y sin `Authorization` en las peticiones del navegador; el proxy no devuelve claves ni trazas.
- Errores del servidor: JSON comprensible, sin stack traces, rutas ni detalles internos.
- Entradas: el proxy valida método, acción, modelo, tamaño y tipos; no acepta URL remota arbitraria. El historial no expone datos de otras apps y no guarda secretos.
- Si aparece una clave expuesta: bloquear la entrega, avisar de que debe revocarse y regenerarse, y no reproducirla en informes ni capturas.
- Evidencia: comandos y salida redactada, peticiones de red y respuesta de `health`.

### 9.11 Entorno final: despliegue y comprobación de la versión servida

- Aplica cuando el alcance incluye publicación; si el brief no la incluye, el entorno final es el runtime real declarado en 9.2 y se verifica allí, sin marcarlo N/A. Requisito previo cuando hay publicación: commit y push en `main` (§2.3.7) y despliegue disparado.
- Comprobar la URL publicada: HTTP 200, `index.html` sirve la versión nueva (marcador o asset renombrado), `health` correcto e historial operativo.
- Caché: si el estático sigue viejo, aplicar la regla de §2.3.7: renombrar con fecha y mantener el antiguo; comprobar con `Last-Modified` y `health`, no con un `?t=`.
- Despliegue: esperar de 1 a varios minutos; no dar un 404 por definitivo antes de ~20 min; si se atasca, crear un commit vacío (`git commit --allow-empty`) y hacer push: un push sin cambios no se ejecuta. No tocar ficheros a mano en el servidor.
- Cuando la versión nueva esté servida, repetir **en el entorno final** el flujo (9.3), consola y red (9.4), descarga (9.5), persistencia (9.6), anchos (9.7) y auditoría (9.8). La entrega se firma sobre el entorno final verificado (producción o runtime real declarado).
- Herramientas propias del proyecto (`tools/verificar-despliegue.ps1`, `tools/verificar-apps-produccion.ps1`): evidencia complementaria, nunca sustituto del flujo real.
- Evidencia: commit, hora de push, fragmento del HTML o JSON servido, captura del entorno final y resultado de los verificadores.

### 9.12 Registro de evidencias

- Una carpeta por verificación: `tools/evidencias/<AAAA-MM-DD>-<app>/`, protegida por `tools/.htaccess` y fuera del despliegue público; las capturas `.png` y `.playwright-cli/` están excluidas de Git por `.gitignore`, y no se añaden al índice logs, JSON ni medidas. Adaptación §12.2. Con nombres por paso: `01-flujo.png`, `02-...`, `03-tablet.png`, `04-movil.png`, `console.log`, `network.log`, `descarga.json`, `medidas.md`, `lighthouse-movil.json`.
- Cada evidencia indica qué demuestra, la acción o comando que la produjo, URL, commit, fecha/hora y navegador. Una captura sin contexto no es evidencia.
- Prohibido: evidencia inventada, captura de un estado no comprobado, evidencia antigua reutilizada y seleccionar solo las capturas favorables. Los intentos fallidos se guardan y se explican.
- Arreglos visuales: una sola imagen comparativa antes/después, etiquetada, guardada en `tools/` (protegida; las imágenes están excluidas de Git por `.gitignore`).
- Limpieza: borrar banco de pruebas, perfiles temporales, sesiones de automatización y capturas intermedias; conservar solo lo que sostiene la entrega.

### 9.13 Informe de verificación y cierre de la fase

Plantilla mínima:

```text
### Informe de verificación — Fase 5
Versión verificada: <commit> · URL: <url> · Fecha: <AAAA-MM-DD HH:MM> · Dueño de la tarea de verificación: <rol>
Navegador: <producto y versión> · Anchos: 360 / 390 / 768 / 1440

| # | Comprobación | Resultado | Evidencia | Notas |
|---|--------------|-----------|-----------|-------|
| V1 | Flujo completo del usuario | PASS/FAIL | <ruta> | <pasos> |
| V2 | Formularios y validación | PASS/FAIL/N/A | <ruta> | |
| V3 | Consola sin errores propios | PASS/FAIL | <ruta> | |
| V4 | Red: 2xx/3xx propios y cuerpos válidos | PASS/FAIL | <ruta> | |
| V5 | Descarga en disco y contenido válido | PASS/FAIL/N/A | <ruta> | <fichero, tamaño, hash> |
| V6 | Persistencia tras recarga y en segundo navegador | PASS/FAIL | <ruta> | |
| V7 | Responsive 360/390/768/1440 sin scroll horizontal | PASS/FAIL | <ruta> | |
| V8 | Accesibilidad A–H y Lighthouse | PASS/FAIL | <ruta> | |
| V9 | Estados vacío/carga/error/reintento/éxito | PASS/FAIL | <ruta> | |
| V10 | Seguridad: sin claves ni trazas expuestas | PASS/FAIL | <ruta> | |
| V11 | Entorno final: versión servida y flujo repetido | PASS/FAIL | <ruta> | |

Defectos abiertos: <0 | lista con severidad, ubicación y estado>
Limitaciones y N/A aceptados: <lista>
Veredicto de fase: CERRADA / REWORK / BLOCKED
```

- La Fase 5 se cierra solo si: todos los puntos aplicables están PASS; no queda ningún defecto abierto (los encontrados se corrigieron y re-verificaron); las evidencias son completas y reproducibles; el **entorno final** está verificado (producción si el brief incluye publicación; runtime real declarado si no); y no hay N/A discrecionales.
- N/A solo se admite cuando la comprobación no aplica porque **la funcionalidad no existe** en el alcance (por ejemplo, no hay formularios ni descargas). No es N/A que el brief no incluya publicación: en ese caso se verifica el **runtime real declarado** (9.2 y Anexo B) y se registra como entorno final. Si no existe un runtime verificable, no es N/A: es limitación explícita o BLOCKED (10.3). «No me dio tiempo», «no tengo entorno» o «no sé cómo probarlo» no son N/A.
- El informe alimenta el gate de §7 y la entrega de §10.2. El supervisor reproduce una muestra de las evidencias según §7; las reglas de puntuación y veredicto no se redefinen aquí.

## 10. Fase 6 — Entrega, cierre y memoria

### 10.1 Condiciones de entrega

No se entrega hasta que se cumplan **todas**:

- Cada tarea del tablero tiene PASS con nota ≥90,0 conforme a §6 y §7; ninguna por debajo; cero defectos bloqueantes, mayores o medios abiertos; como máximo tres menores documentadas con justificación de coste/beneficio.
- Auditoría end-to-end independiente (§7) con PASS.
- Fase 5 cerrada (9.13) y entorno final verificado (producción o runtime real declarado, 9.2).
- `main` sin ramas ni worktrees; commit y push hechos; `git log --oneline origin/main..HEAD` vacío; `git status` limpio en los ficheros del encargo.
- Sin TODOs, «[pendiente]», botones falsos, errores de consola propios ni 4xx/5xx propios.
- Evidencias completas y reproducibles; memoria actualizada (10.4).
- Si falla cualquiera de estas condiciones: no se entrega; se vuelve por §8 (rework) o se declara BLOCKED (10.3).

### 10.2 Formato exacto de la entrega final al usuario

```text
ENTREGA — <nombre de la web/app>
Estado: ENTREGADO
URL: <url pública o runtime real declarado>
Commit: <sha> (main) · Push: <fecha y hora> · Entorno final verificado: <fecha y hora> (producción | runtime real declarado)

1. RESULTADO
<2–4 líneas: qué hace, para quién y qué se ha verificado de verdad. Sin épica.>

2. TAREAS Y VEREDICTOS
| ID | Tarea | Dueño de tarea | Supervisor | Rondas | Veredicto | Nota ponderada |
|----|-------|-------|------------|--------|-----------|----------------|
| T1 | <tarea> | <rol> | <rol> | <n> | PASS | <nota> |
...
Veredicto global: PASS <total ponderado> (umbral 90,0; §6 y §7).

3. PRUEBAS REALES
- Navegador: <producto y versión> sobre <url>; flujo: <pasos recorridos>; consola: <n errores propios>; red: <n 4xx/5xx propios>.
- Descargas: <fichero>, <tamaño>, <hash>, contenido válido (<comprobación realizada>).
- Persistencia: guardar → recarga → <resultado>; segundo navegador → <resultado>; servidor → <resultado>.
- Responsive: 360/390/768/1440 → <medidas y comportamiento>; scroll horizontal: no.
- Accesibilidad/auditoría: A–H <resumen>; Lighthouse: Rendimiento <n> · Accesibilidad <n> · Buenas prácticas <n> · SEO <n>.
- Entorno final: <producción o runtime real declarado>; versión servida <marcador>, health <resultado>, historial <resultado>.
- Seguridad: sin claves en frontend, repo ni respuestas; <comprobación>.

4. EVIDENCIAS
![<descripción>](tools/evidencias/<fecha>-<app>/01-flujo.png)
![Entorno final](tools/evidencias/<fecha>-<app>/05-entorno-final.png)
![<descripción antes/después>](tools/comparativa_<componente>_<app>.png)
Carpeta de evidencias: <ruta> (protegida; capturas excluidas de Git)
Informe de verificación: <ruta>

5. CAMBIOS
- Creados: <rutas>
- Modificados: <rutas>
- Commit: <sha> — <asunto>; incluye solo <n> archivos del encargo.
- Despliegue: <webhook>; caché: <ninguna acción | renombrado <fichero> | pendiente de expirar> (si el brief incluye publicación).

6. RIESGOS Y LIMITACIONES
<ninguno | lista: qué no se pudo comprobar, por qué, impacto y siguiente paso>

7. MEJORAS RESIDUALES
<ninguna | lista con severidad y coste; solo menores aceptadas>

8. DECISIÓN
ENTREGADO al usuario — cierre conforme a §10.1.
```

- Cada nota es el total ponderado de §6, con un decimal; se calcula con su fórmula, no se estima ni se redondea al alza.
- Toda afirmación de «probado» apunta a una evidencia existente y localizable. Si no existe, se escribe como limitación, nunca como prueba.
- Prohibido entregar con «aprobado con reservas», omitir una tarea con nota inferior a 90 o presentar como PASS un total inferior a 90,0.
- Las capturas se adjuntan en la respuesta con enlaces a su ruta; no se describen ni se sustituyen por texto.
- Si el estado es BLOQUEADO, se usa el informe de 10.3 y **no** la plantilla de entrega; no se mezclan.

### 10.3 Regla BLOCKED: parada explícita, nunca entrega disfrazada

BLOCKED es el estado que se declara cuando el contrato no se puede cumplir sin bajar el 90, falsear evidencia o entregar sin verificar. **No es una forma de entrega**: es una parada con causa, evidencia y dueño de tarea.

Disparadores admitidos (siempre con evidencia de intentos):

1. **Entorno**: el navegador no puede ejecutarse o no hay acceso al entorno final (producción o runtime real declarado); faltan credenciales o claves tras pedirlas (máximo 3 preguntas en Fase 0) y no hay forma de configurarlas.
2. **Infraestructura**: proveedor u hosting caído tras al menos dos intentos separados y documentados; despliegue sin publicar tras esperar ~20 min y re-dispararlo con un commit vacío (`git commit --allow-empty`) y push.
3. **Brief**: requisitos contradictorios que exigen decisión del usuario; dato crítico ausente que no se puede suponer con seguridad.
4. **Seguridad o legalidad**: secreto expuesto que exige revocación; riesgo de privacidad; imposibilidad de verificar o publicar de forma segura.
5. **Proceso**: cinco rondas de rework agotadas sin PASS; el orquestador decide reasignar, reducir alcance o declarar BLOCKED según §8.

Procedimiento obligatorio:

1. Detener la entrega; no marcar la tarea como completada; no bajar el umbral; no inventar ni reciclar evidencia.
2. Registrar un BLOCKED en el tablero con: causa exacta, qué está verificado y con qué evidencia, qué falta, intentos con comando, hora y resultado, decisión necesaria, quién debe tomarla y riesgo residual.
3. Avisar al orquestador y a los dueños de las tareas afectadas; escalar conforme a §8.
4. Entregar al usuario solo el informe BLOCKED. Si el usuario pide un parcial, entregarlo etiquetado **«PARCIAL — NO VERIFICADO»**, con la lista exacta de lo no probado y sin afirmar el 90.
5. Al resolverse la causa, reanudar la Fase 5 en el punto afectado, re-verificar y continuar a la Fase 6.

Plantilla compacta del informe:

```text
### Informe BLOCKED
Tarea: <ID> · Fecha: <AAAA-MM-DD HH:MM> · Dueño de tarea: <rol>
Estado: BLOQUEADO — no entregado
Causa exacta: <qué impide cumplir el contrato>
Qué está verificado: <puntos y evidencia>
Qué falta: <lista concreta>
Intentos: <acción o comando · hora · resultado> (mínimo 2 si es fallo transitorio)
Decisión necesaria: <decisión> · Quién: <usuario u orquestador, según la causa>
Riesgo residual: <riesgo y mitigación>
Reanudación: <condición que desbloquea> → re-verificar la Fase 5 desde <punto>
```

Un BLOCKED sin evidencia de intentos es defecto bloqueante; usarlo para evitar trabajo es gaming del proceso y el supervisor lo audita.

### 10.4 Cierre, limpieza y memoria

- Cerrar el tablero solo con PASS de todas las tareas y con la entrega emitida.
- Memoria del proyecto: actualizar los ficheros indicados en §2.3.8 con fecha, qué se hizo, commit, verificación y, si aplica, errores, recetas, decisiones y estado de producción. Nunca valores de claves; punteros, no copias; entradas verificables.
- Fuera de Antigravity: registrar lo equivalente en el proyecto (CHANGELOG, ADR o README) y decirlo en la entrega.
- Limpieza: cerrar sesiones de automatización, borrar perfiles temporales, bancos de prueba y ficheros temporales de directorios públicos; no versionar scripts de prueba; comprobar `git status` limpio y que solo existe `main`, sin ramas ni worktrees huérfanos.
- Lo que no se pudo comprobar queda declarado en la entrega; no se cierra como si estuviera resuelto.

## 12. Anexos de esta sección

### 12.1 Anexo A — Ejemplo compacto (ilustrativo, no es evidencia real)

Caso: web «fichas de producto». El usuario sube una foto, escribe el producto, elige formato 16:9 y resolución 1024, genera con `IMAGE 2 · LOW`, descarga un JSON y el historial persiste en Hostinger.

Contrato de aceptación (extracto): (1) generar ficha con imagen y datos; (2) descargar JSON válido; (3) el historial sobrevive a recarga y a otro navegador; (4) 360/390/768/1440 sin scroll horizontal; (5) sin errores propios de consola ni de red; (6) auditoría A–H al 100 % de lo aplicable.

Fase 5 (extracto ejecutado):

| Paso | Acción | Resultado observado | Evidencia |
|---|---|---|---|
| 1 | `open https://…/fichas/ --browser=chrome` | Título correcto, versión servida = commit | `01-inicio.png` |
| 2 | Subir foto, texto y opciones; generar | Overlay canónico, resultado con imagen y datos | `02-generacion.png` |
| 3 | Descargar JSON | Fichero en disco, 2,1 KB, parsea, claves `producto/imagen/modelo` | `descarga.json` + hash |
| 4 | Recargar y abrir incógnito | El elemento sigue en historial del servidor | `03-recarga.png`, `04-incognito.png` |
| 5 | Anchos 360/390/768/1440 | Sin scroll horizontal; historial pasa a ancho completo en móvil | `medidas.md` |
| 6 | Teclado y auditoría | Tab completo, foco visible, contraste OK; Lighthouse 98/100/100/100 | `auditoria.md` |
| 7 | Entorno final | HTML sirve asset nuevo; flujo repetido en el entorno final | `05-entorno-final.png` |

Defecto detectado y cerrado (ejemplo): la descarga guardaba una página de error HTML con extensión `.json` (severidad bloqueante). Se corrigió el `Content-Type` y el manejo de error, se repitió la descarga y se validó el JSON parseado.

Ejemplo de BLOCKED (ilustrativo): el proveedor devolvió `500` en tres intentos separados durante 15 minutos. No se entregó: se registró BLOCKED con comandos, horas y respuestas; se avisó al orquestador; al restablecerse el servicio se reanudó la Fase 5 y se verificó de nuevo.

Entrega (extracto): cuatro tareas con PASS 92,5 / 91,0 / 93,0 / 90,5; global 91,8; commit `abc1234` en `main`; URL verificada; una mejora residual menor documentada; estado ENTREGADO.

### 12.2 Anexo B — Adaptación fuera de Antigravity

El prompt es autosuficiente: si el destino no tiene estas skills, rutas ni herramientas, se sustituyen por equivalentes y se declara la adaptación en el contrato de aceptación; los criterios de verificación no cambian.

| Elemento en Antigravity | Sustituto en otro entorno | Regla que no cambia |
|---|---|---|
| `skills/SKILL_*.md` | Protocolo propio del equipo o las secciones de este prompt | Leer antes de escribir; requisitos equivalentes; no inventar contenido de una skill |
| `apps/<app>/` + Hostinger por webhook | Convención del repo + CI/CD del destino | Un escritor por archivo; commit y push; verificar la versión desplegada |
| `proxy.php` (PHP) | BFF en Node, Python o serverless | Claves solo en servidor; acciones cerradas; health; errores sin secretos |
| `history.php` + `history_store/` | Base de datos, almacenamiento de objetos o API | Servidor como fuente de verdad; datos fuera de Git; recarga y segundo navegador |
| Tokens Hoola | Identidad visual del brief o del producto | Contraste, foco, estados, responsive y jerarquía no se rebajan |
| `openai-image-2-low` | Modelo de imagen permitido por el brief | Catálogo cerrado; id real verificado; sin inventar modelos; formato, resolución y calidad declarados |
| `playwright-cli` y Chrome | Automatización equivalente o prueba manual reproducible | Flujo completo, consola, red, recargas, descargas en disco y anchos medidos |
| `tools/evidencias/` | Carpeta de evidencias protegida y fuera del despliegue público | Evidencia reproducible, excluida del índice del proyecto; nada inventado |
| `tools/memoria/` | CHANGELOG, ADR o registro de decisiones del proyecto | Registrar lo replicable; sin secretos; entradas verificables |
| `main` + push + webhook | Rama de integración única + pipeline de despliegue | Sin ramas paralelas; verificar el entorno final antes de entregar |
| Español de proceso y producto | Idioma del equipo y del brief | Si el producto es en otro idioma, la interfaz y los prompts a IA lo respetan; la documentación interna conserva el idioma del equipo |
| Entorno final (URL pública, staging o runtime local declarado) | Runtime real declarado en el contrato (local ejecutable, staging o app servida) | Si el brief no incluye publicación, se verifica ese runtime y se registra como entorno final; «N/A» no se usa para evitar probar |

La adaptación se valida con el supervisor: una adaptación que rebaje un criterio de esta sección es defecto bloqueante.

### 12.3 Anexo C — Checklist final de verificación y entrega

- [ ] Entorno final (producción o runtime real declarado) y versión servida = commit verificado; `health` correcto.
- [ ] Flujo principal completo recorrido con clics, teclado y recarga.
- [ ] Formularios probados: vacío, inválido, válido; errores claros y datos conservados.
- [ ] Consola sin errores propios; warnings justificados.
- [ ] Red sin 4xx/5xx propios; sin claves ni llamadas del frontend al proveedor.
- [ ] Descargas comprobadas en disco y con contenido válido (parseo, tamaño, hash).
- [ ] Persistencia probada tras recarga y en segundo navegador; servidor como verdad.
- [ ] Matriz 360/390/768/1440 sin scroll horizontal ni recortes; tabla de medidas.
- [ ] Accesibilidad A–H al 100 % de lo aplicable; Lighthouse registrado.
- [ ] Estados vacío, carga, error, reintento y éxito comprobados con capturas.
- [ ] Sin secretos, trazas ni rutas internas en la entrega.
- [ ] Evidencias en carpeta protegida, reproducibles y ligadas a comando o acción.
- [ ] Cada tarea con PASS ≥90,0 y sin defectos B/M/Med abiertos.
- [ ] Commit y push en `main`; `git log origin/main..HEAD` vacío; `git status` limpio.
- [ ] Entorno final repasado con el flujo completo, no solo con el 200.
- [ ] Memoria actualizada; sin valores sensibles.
- [ ] Tablero cerrado; sesiones y perfiles temporales eliminados.
- [ ] Si algo no se pudo verificar: informe BLOCKED con causa, intentos y decisión requerida.
