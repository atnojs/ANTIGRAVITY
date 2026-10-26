---
name: google-flow
description: "SOLO para videos gratis (Veo) vía Google Flow con la CLI instalada en E:/herramientas/google-flow. Activar cuando Antonio pida videos 'con Flow' o 'con Veo', o un guion con escenas de video. Para selectores de generación o edición de imágenes, usar la referencia canónica de apps/dibujo_lineas_copia."
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
- Locks con PID: `flow_studio_worker.lock` guarda el PID y se libera si el proceso ya no existe
  (un lock huérfano dejaba el worker mudo hasta 30 min).
