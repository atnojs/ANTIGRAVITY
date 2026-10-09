---
name: google-flow
description: "SOLO para videos gratis (Veo) vía Google Flow con la CLI instalada en E:/herramientas/google-flow. Activar cuando Antonio pida videos 'con Flow' o 'con Veo', o un guion con escenas de video. Para selectores de generación o edición de imágenes, usar la referencia canónica de apps/dibujo_lineas_copia."
---

# Google Flow (labs.google) — herramienta instalada

## Imágenes: selector canónico

Esta skill no define un selector de imágenes propio. Cuando una app o web incluya generación o edición de imágenes, copiar el bloque vigente de `apps/dibujo_lineas_copia`: fila superior `OPENAI 2.5` (`MEDIUM`, `HIGH`, `MAX FLARE` del modelo flare, y `XHIGH`, `MAX SUNBURST` del modelo sunburst) y fila inferior `GEMINI` (`3.1 FLASH`, `3 PRO`), `QWEN` (`QWEN 3 PRO`) e `IMAGE 2` (`LOW` activo por defecto, `MEDIUM`, `HIGH`). Orden: de izquierda a derecha, de menor a mayor calidad dentro de cada modelo real. No reutilizar selectores, proveedores ni ejemplos anteriores.

El modelo `flow` está **RETIRADO** (2026-10-09) y no debe tener **ninguna** llamada: su cola (`flow_queue.php`), el worker de PC (`flow-queue-bridge.py`) y el trabajo de cron que lo lanzaba cada 5 minutos ya no existen. La generación y edición de imágenes va SIEMPRE por el proxy con el modelo por defecto del proyecto, **`openai-image-2-low`** (`gpt-image-2`, calidad `low`), que es el más barato que da un resultado válido. Si aparece cualquier resto del modelo `flow` en una app, un proxy o un script, se elimina y se sustituye por `openai-image-2-low`.

## Instrucciones de ejecución (videos)

1. La herramienta vive en `E:/herramientas/google-flow`. El manual canónico y completo es su `SKILL.md`: leerlo antes de usarla. No duplicar aquí sus instrucciones.
2. Ejecutar siempre desde esa carpeta con `python` (no `python3`): `python flow.py image|video|batch ...`.
3. La sesión de Google ya está guardada en `session/flowbot-profile` (permanente). Comprobar con `python flow.py status`. Si caducara, correr `python flow.py login` y pedir a Antonio que inicie sesión en la ventana de Chrome.
4. Resultados en `outputs/` (batch en `outputs/<proyecto>/`). No borrar resultados sin que Antonio los haya visto.

## Avisos

- La copia local está ADAPTADA a la UI de agente de Flow (2026-07, commit local `20687fc`) y validada con imagen y video reales. No reinstalar desde el repo original (`BRPLia/google-flow-skill-v1`): pisaría la adaptación.
- Si Google vuelve a cambiar la UI y fallan los selectores, diagnosticar con Playwright sobre el perfil persistente y ajustar `flow_provider/` (patrón ya aplicado en ese commit).
- UI 2026-09: botón "New project" en inglés; subida de referencia = "Subir archivo multimedia" y confirmación "Añadir a petición" (no "Cargar medios"/"Agregar a la instrucción"). Ver `flow_provider/canvas.py`.
- IMÁGENES: el menú contextual (clic derecho → Descargar → resolución) mata el navegador (TargetClosedError). Método bueno: hover/clic sobre el tile + captura de URL con `page.on('response')`, fallback al `src` del img. Ver `flow_provider/download.py`.
- Descarga con `page.request.get(url)` (usa las cookies de la sesión). Sin expect_download ni save_as.
- En LOTES de videos correr con `FLOW_HEADLESS=true` (sin ventana): con ventana visible Chrome puede cerrarse a mitad y se pierde todo. Para `login` sí se necesita la ventana visible. Detalles y flujo de video-vault: `SKILL_VIDEOVAULT_VIDEOS.md`.
- Abre Chrome visible en el escritorio mientras trabaja: es normal (salvo lotes, ver punto anterior).
- Esta herramienta es local y no sustituye el bloque canónico de modelos de `apps/dibujo_lineas_copia` en las apps web del proyecto.
