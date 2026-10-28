---
name: google-flow
description: "SOLO para videos gratis (Veo) vía Google Flow con la CLI instalada en E:/herramientas/google-flow, y para IMPLANTAR el modelo `flow` en una app (cola del PC, conexión permanente y 1-4 imágenes por generación). Activar cuando Antonio pida videos 'con Flow' o 'con Veo', un guion con escenas de video, o añadir el modelo flow a una app. Para selectores de generación o edición de imágenes, usar la referencia canónica de apps/dibujo_lineas_copia."
---

# Google Flow (labs.google) — herramienta instalada

## Imágenes: selector canónico

Esta skill no define un selector de imágenes propio. Cuando una app o web incluya generación o edición de imágenes, copiar el bloque vigente de `apps/dibujo_lineas_copia`: fila superior `OPENAI 2.5` (`MEDIUM`, `HIGH`, `MAX FLARE` del modelo flare, y `XHIGH`, `MAX SUNBURST` del modelo sunburst) y fila inferior `GEMINI` (`3.1 FLASH`, `3 PRO`), `QWEN` (`QWEN 3 PRO`) e `IMAGE 2` (`LOW` activo por defecto, `MEDIUM`, `HIGH`). Orden: de izquierda a derecha, de menor a mayor calidad dentro de cada modelo real. No reutilizar selectores, proveedores ni ejemplos anteriores.

El modelo `flow` NO va por proxy: usa una cola `flow_queue.php` + worker de PC. La app de
referencia es `apps/flow_studio/` (cola propia, historial, lightbox y descarga) con el worker
`E:/herramientas/google-flow/flow_studio_worker.py`, lanzado por la tarea programada
`FlowStudioWorker` cada 2 minutos. El frontend hace `request` y polea `status`; el worker reclama
con `claim`, genera con Flow y sube con `complete` (o `fail`). Publicada en
`https://atnojs.es/apps/flow_studio/`.

## Implantación del modelo Flow en una app (patrón obligatorio)

Patrón ya implantado en `apps/editar_generar` y en `apps/imagenes_ia/combinar_imagenes`
(2026-10-28). Toda app que ofrezca el modelo `flow` debe cumplirlo:

1. **Conector propio por app**: copiar `flow-client.20261028.js` a la carpeta de la app y cargarlo
   antes del JS principal. La cola vive en `/apps/flow_studio/flow_queue.php`; el conector
   resuelve la ruta buscando `/apps/` en `location.pathname`, así sirve también para apps
   anidadas como `apps/imagenes_ia/<app>/`.
2. **Conexión siempre viva**: latido cada 15 s con la pestaña visible y 45 s en segundo plano;
   si falla, reintento con espera creciente (4 s → 20 s) que no se rinde; reconexión inmediata al
   volver a la pestaña, al evento `online`, al foco y al restaurar desde bfcache. La espera de un
   trabajo sobrevive a un corte de red y la petición se reintenta hasta 3 veces.
3. **Estado visible**: píldora «Flow conectado · N en cola» / «Flow sin conexión · Reintentar» en
   el encabezado; al pulsarla se relanza el ping.
4. **Modelos libres**: `flow-nano-banana-2`, `flow-nano-banana-pro` y `flow-nano-banana-2-lite`
   no piden contraseña (`model-gate.20261028.js`). En el selector viajan los ids; en el cuerpo de
   la petición, los nombres literales que valida la cola (`Nano Banana 2`, etc.).
5. **De 1 a 4 imágenes por generación (obligatorio)**: la cola admite `count` de 1 a 4. La app
   debe ofrecer un selector 1-4 y encolar esa cantidad en **una sola** petición; todos los ids se
   sondean con **una** consulta `status` por vuelta y cada resultado se guarda en el historial.
   Con modelos de pago (vía proxy) el selector se desactiva con el aviso «Solo con FLOW: el resto
   de modelos genera 1 imagen por solicitud».
6. **Límites que la UI debe avisar**: 2 referencias como máximo (reducirlas a JPEG de ≤1280 px
   antes de encolar: el tope es 6 MB por referencia), formatos 1:1 / 4:3 / 3:4 / 16:9 / 9:16
   (3:2→4:3, 4:5→3:4, 21:9→16:9), sin resolución propia (~1K) y prompt ≤1200 caracteres.
7. **Verificación obligatoria**: una generación real en producción con el worker encendido;
   comprobar la píldora, el avance por imagen, el resultado, el historial y la consola.

## Instrucciones de ejecución (videos)

1. La herramienta vive en `E:/herramientas/google-flow`. El manual canónico y completo es su `SKILL.md`: leerlo antes de usarla. No duplicar aquí sus instrucciones.
2. Ejecutar siempre desde esa carpeta con `python` (no `python3`): `python flow.py image|video|batch ...`.
3. La sesión de Google ya está guardada en `session/flowbot-profile` (permanente). Comprobar con `python flow.py status`. Si caducara, correr `python flow.py login` y pedir a Antonio que inicie sesión en la ventana de Chrome.
4. Resultados en `outputs/` (batch en `outputs/<proyecto>/`). No borrar resultados sin que Antonio los haya visto.

## Avisos

- La copia local está ADAPTADA a la UI de agente de Flow (2026-07, commit local `20687fc`) y validada con imagen y video reales. No reinstalar desde el repo original (`BRPLia/google-flow-skill-v1`): pisaría la adaptación.
- Si Google vuelve a cambiar la UI y fallan los selectores, diagnosticar con Playwright sobre el perfil persistente y ajustar `flow_provider/` (patrón ya aplicado en ese commit).
- UI 2026-09: botón "New project" en inglés; subida de referencia = "Subir archivo multimedia" y confirmación "Añadir a petición" (no "Cargar medios"/"Agregar a la instrucción"). Ver `flow_provider/canvas.py`.
- UI 2026-10-26 (`flow_provider/canvas.py`, `_attach_frame_via_picker`): en **Vídeo → Fotogramas** el compositor ya no tiene el botón "Crear"; tiene los huecos **"Inicio"/"Fin"** y al pulsarlos se abre el panel **"Selecciona una imagen de encuadre"**. Se sube con "Subir archivo…", y **"Añadir a petición" sigue deshabilitado hasta que Flow termina de procesar la subida**: no pulsarlo antes. El vídeo con fotogramas se genera de verdad (probado 2026-10-26: 2.232.476 B, 8 s, 1280×720, H.264+AAC).
- Modelos de Flow: renombrados el 2026-10-26 (`Nano Banana 2` → `Nano Banana 2.1`; `Omni Flash` → `Omni 1.1 Flash`). `flow_provider/configure.py` tiene `MODEL_ALIASES`: pide el nombre exacto y, si ya no existe, el alias; nunca genera con un modelo distinto del pedido.
- IMÁGENES: el menú contextual (clic derecho → Descargar → resolución) mata el navegador (TargetClosedError). Método bueno: hover/clic sobre el tile + captura de URL con `page.on('response')`, fallback al `src` del img. Ver `flow_provider/download.py`.
- Descarga con `page.request.get(url)` (usa las cookies de la sesión). Sin expect_download ni save_as.
- En LOTES de videos correr con `FLOW_HEADLESS=true` (sin ventana): con ventana visible Chrome puede cerrarse a mitad y se pierde todo. Para `login` sí se necesita la ventana visible. Detalles y flujo de video-vault: `SKILL_VIDEOVAULT_VIDEOS.md`.
- Abre Chrome visible en el escritorio mientras trabaja: es normal (salvo lotes, ver punto anterior).
- Esta herramienta es local y no sustituye el bloque canónico de modelos de `apps/dibujo_lineas_copia` en las apps web del proyecto.
- SIN LÍMITE DE TIEMPO (2026-10-22): fuera los topes de 900 s. `flow.py` espera 30 min por imagen
  y 60 por vídeo; el worker y el servidor MCP ya no cortan el subproceso; la cola no reencola un
  `running` hasta las 2 h. Si una generación se cuelga de verdad, se cancela a mano.
- ANTES DE GENERAR: ningún Chrome puede estar usando `session/flowbot-profile` (Playwright no abre
  un perfil persistente en uso; `flow.py` muere en 2 s). Cerrar esos procesos primero.
- Locks del worker: `flow_studio_worker.lock` se bloquea con `msvcrt.locking` (Windows), así que
  el sistema lo libera al morir el proceso. **No se decide por PID**: un PID reciclado por otro
  programa (2026-10-28: el lock apuntaba a un `powershell`) dejaba la cola muda hasta 30 min y el
  usuario veía generaciones que no llegaban o resultados de otro encargo.
- Si la cola no avanza: comprobar `flow_queue.php?action=ping` (si `lastSeen` no cambia, el worker
  no está corriendo), que no haya un Chrome usando `session/flowbot-profile`, y el lock. Recordar
  que el worker y la tarea `FlowStudioWorker` viven en el PC de trabajo, no en el portátil: desde
  otro equipo solo se puede mirar la cola, no arrancarlo.
- Para (re)crear la tarea en el PC de trabajo: `tools/flow/instalar-worker-flow.ps1` (o su
  `.cmd`, doble clic). Detecta el Python con Playwright, registra la tarea cada 2 minutos con
  `StartWhenAvailable` e `IgnoreNew`, la arranca y comprueba el ping. Es idempotente y no
  necesita administrador si la tarea es del propio usuario.
- PROMPT: el texto que viaja a Flow es **el del usuario, literal**. `flow.py` ya antepone «Usando
  las imágenes adjuntas como referencia, combina su contenido…»; envolverlo otra vez en la app
  (roles inventados tipo «la primera es el fondo», plantillas del proxy en inglés) cambia la
  intención y el resultado deja de seguir lo pedido. Solo se añade el formato cuando hace falta.
- Referencias: enviarlas a **2048 px / JPEG 0.92** (tope 6 MB por referencia). Bajarlas a 1280
  hacía que textos y caras llegaran ilegibles y el modelo "no siguiera" la imagen.

