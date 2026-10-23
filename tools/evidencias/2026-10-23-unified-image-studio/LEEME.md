# Evidencias — Unified Image Studio (2026-10-23)

Capturas del estado real de la app durante la verificación, tomadas con Chrome 155 headless a
través de CDP sobre la app servida en local (PHP 8.3.36 + SQLite).

| Archivo | Qué demuestra |
|---|---|
| `01-inicio.png` | Estado inicial: paneles, selector de modelos canónico, lienzo vacío con zona de carga |
| `02-escritorio-composicion.png` | Composición real: imagen, texto de dos líneas, capas y selección con tiradores |
| `03-servidor-guardado.png` | Modo servidor: «Guardado», presupuesto restante, coste 0,04 € y error honesto del proveedor sin clave |
| `04-exportacion.png` | Modal de exportación con vista previa, dimensiones, transparencia y DPI |
| `05-movil-390.png` | Móvil 390×844 sin desbordamiento horizontal |
| `06-acceso-privado.png` | Modal de acceso privado cuando el servidor exige contraseña |

Los informes con los comandos y sus salidas están en
`apps/unified-image-studio/docs/VERIFICACION.md`.
