# Evidencias — Unified Image Studio (2026-10-23)

Las capturas del estado real de la app **no se versionan**: el `.gitignore` del repositorio ignora
`*.png` de forma global. Se adjuntan en el informe de entrega y se conservan fuera del repositorio,
en el equipo de verificación.

## Qué se capturó

| Captura | Qué demuestra |
|---|---|
| `01-inicio` | Estado inicial: paneles, selector de modelos canónico, lienzo vacío con zona de carga |
| `02-escritorio-composicion` | Composición real: imagen, texto de dos líneas, capas y selección con tiradores |
| `03-servidor-guardado` | Modo servidor: «Guardado», presupuesto restante, coste 0,04 € y error honesto del proveedor sin clave |
| `04-exportacion` | Modal de exportación con vista previa, dimensiones, transparencia y DPI |
| `05-movil-390` | Móvil 390×844 sin desbordamiento horizontal |
| `06-acceso-privado` | Modal de acceso privado cuando el servidor exige contraseña |

## Dónde está la evidencia reproducible

`apps/unified-image-studio/docs/VERIFICACION.md` recoge los comandos, sus salidas PASS/FAIL y lo que
queda pendiente de comprobar en producción.
