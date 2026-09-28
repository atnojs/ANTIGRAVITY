---
name: google-flow
description: "SOLO para videos gratis (Veo) vía Google Flow con la CLI instalada en E:/herramientas/google-flow. Activar cuando Antonio pida videos 'con Flow' o 'con Veo', o un guion con escenas de video. Para selectores de generación o edición de imágenes, usar la referencia canónica de apps/dibujo_lineas_copia."
---

# Google Flow (labs.google) — herramienta instalada

## Imágenes: selector canónico

Esta skill no define un selector de imágenes propio. Cuando una app o web incluya generación o edición de imágenes, copiar el bloque vigente de `apps/dibujo_lineas_copia`: fila superior `OPENAI 2.5` (`MEDIUM`, `HIGH`, `XHIGH`, `MAX FLARE`, `MAX SUNBURST`) y fila inferior `FLOW` (`NANO BANANA`, activo por defecto), `GEMINI` (`3.1 FLASH`, `3 PRO`) y `QWEN` (`QWEN 3 PRO`). No reutilizar selectores, proveedores ni ejemplos anteriores.

El modelo `flow` NO va por proxy: usa la cola `flow_queue.php` + worker de PC (`E:/hermes-data/scripts/flow-queue-bridge.py`, cron 5 min). El frontend hace `request` y polea `status`; el worker genera con Flow y sube con `complete`. Patrón completo en `apps/dibujo_lineas_copia/`.

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
