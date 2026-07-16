---
name: google-flow
description: "SOLO para videos gratis (Veo) vía Google Flow con la CLI instalada en E:/herramientas/google-flow. Activar cuando Antonio pida videos 'con Flow' o 'con Veo', o un guion con escenas de video. NO usarla para imágenes sueltas: es lenta (2-4 min/imagen vía navegador) y la calidad es inferior; las imágenes se generan SIEMPRE con FLUX (ver sección 'Imágenes')."
---

# Google Flow (labs.google) — herramienta instalada

## Imágenes: NO usar Flow — usar FLUX (validado 2026-07-16)

Comparativa real medida: Flow/Nano Banana = 2-4 min por imagen, aspecto artificial y falla contando objetos; FLUX 2 MAX vía el proxy de producción de Antonio = ~22 s, fotorrealista y clavó el encargo a la primera. Para generar una imagen suelta:

```bash
# payload en archivo (evita problemas de comillas/acentos en git-bash)
# {"prompt": "...", "calidad": "pro"}   calidad: barato|normal|pro -> klein/pro/max
curl -s -X POST "https://atnojs.es/apps/generador_ia_flux/proxy.php" \
  -H "Content-Type: application/json" --data-binary @payload.json -o resp.json
# resp.json: {success, imageUrl (data URL base64), coste, modelo} -> decodificar y guardar
```

Nota: ese proxy genera 1024×1024; para otros formatos usar un proxy de app que acepte `width`/`height` (p. ej. `apps/outfit/proxy.php`).

## Instrucciones de ejecución (videos)

1. La herramienta vive en `E:/herramientas/google-flow`. El manual canónico y completo es su `SKILL.md`: leerlo antes de usarla. No duplicar aquí sus instrucciones.
2. Ejecutar siempre desde esa carpeta con `python` (no `python3`): `python flow.py image|video|batch ...`.
3. La sesión de Google ya está guardada en `session/flowbot-profile` (permanente). Comprobar con `python flow.py status`. Si caducara, correr `python flow.py login` y pedir a Antonio que inicie sesión en la ventana de Chrome.
4. Resultados en `outputs/` (batch en `outputs/<proyecto>/`). No borrar resultados sin que Antonio los haya visto.

## Avisos

- La copia local está ADAPTADA a la UI de agente de Flow (2026-07, commit local `20687fc`) y validada con imagen y video reales. No reinstalar desde el repo original (`BRPLia/google-flow-skill-v1`): pisaría la adaptación.
- Si Google vuelve a cambiar la UI y fallan los selectores, diagnosticar con Playwright sobre el perfil persistente y ajustar `flow_provider/` (patrón ya aplicado en ese commit).
- Abre Chrome visible en el escritorio mientras trabaja: es normal.
- Esta herramienta es local y NO sustituye la regla FLUX de las apps web del proyecto.
