---
name: google-flow
description: "Genera imágenes (Nano Banana) y videos (Veo) gratis con Google Flow desde la CLI instalada en E:/herramientas/google-flow. Activar cuando Antonio pida generar/animar imágenes o videos 'con Flow', 'con Veo', 'con Nano Banana', o pase una lista de prompts o un guion con escenas para video."
---

# Google Flow (labs.google) — herramienta instalada

## Instrucciones de ejecución

1. La herramienta vive en `E:/herramientas/google-flow`. El manual canónico y completo es su `SKILL.md`: leerlo antes de usarla. No duplicar aquí sus instrucciones.
2. Ejecutar siempre desde esa carpeta con `python` (no `python3`): `python flow.py image|video|batch ...`.
3. La sesión de Google ya está guardada en `session/flowbot-profile` (permanente). Comprobar con `python flow.py status`. Si caducara, correr `python flow.py login` y pedir a Antonio que inicie sesión en la ventana de Chrome.
4. Resultados en `outputs/` (batch en `outputs/<proyecto>/`). No borrar resultados sin que Antonio los haya visto.

## Avisos

- La copia local está ADAPTADA a la UI de agente de Flow (2026-07, commit local `20687fc`) y validada con imagen y video reales. No reinstalar desde el repo original (`BRPLia/google-flow-skill-v1`): pisaría la adaptación.
- Si Google vuelve a cambiar la UI y fallan los selectores, diagnosticar con Playwright sobre el perfil persistente y ajustar `flow_provider/` (patrón ya aplicado en ese commit).
- Abre Chrome visible en el escritorio mientras trabaja: es normal.
- Esta herramienta es local y NO sustituye la regla FLUX de las apps web del proyecto.
