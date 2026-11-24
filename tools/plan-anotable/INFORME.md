# plan-anotable — informe de evidencia

Revisión por secciones en el navegador: plantilla canónica, generador y espejo al
catálogo de DSH. Cada ronda la firma un verificador independiente (regla §0.4 de
AGENTS.md) sobre una versión exacta; un PASS caduca con el primer byte que se toque.

## Piezas

| Pieza | Dónde | Para qué |
|---|---|---|
| Plantilla | `skills/recursos/plan-anotable/plantilla.html` | Página que se abre desde disco: decisiones por sección, comentarios, `localStorage`, «Copiar feedback» / «Descargar .md» |
| Generador | `tools/plan-anotable/plan-a-html.ps1` | Convierte un plan en markdown en la página ya rellena |
| Espejo | `tools/skills-sync/sync-a-dsh.ps1` | Lleva plantilla, recursos y soporte al catálogo de DSH (38 elementos) |

## Uso

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File \\Principal\e\ANTIGRAVITY\tools\plan-anotable\plan-a-html.ps1 plan.md -Abrir
```

Escribe en `tools/evidencias/<AAAA-MM-DD>-plan-<slug>/plan.html`. `-WhatIf` enseña
las secciones sin escribir; `-Salida` elige destino; `-Fecha` fija la fecha.

Códigos de salida: `0` generado (y abierto si se pidió) · `1` error o desajuste ·
`2` generado pero no se pudo abrir el navegador.

## Contrato de salida (lo que el agente aplica)

```text
## Feedback del plan — <título> (fecha)
Estado: N aprobadas · N con cambios · N rechazadas · N sin revisar

### 1. <sección>
APROBADA
```

Con cambios: `CON CAMBIOS` + `> <comentario>`. Sin marca: `SIN REVISAR`.
«Con cambios» sin comentario **bloquea** la copia: no es una decisión aplicable.

## Autocomprobación de la página

```powershell
# abrir con ?autotest=1: imprime AUTOTEST PASS n/n y el ancho medido
```

Comprueba: contrato de export literal, escapado de HTML, datos cargados, estado
vacío, ausencia de scroll horizontal, comentario obligatorio y limpieza de marcas.

## Rondas de verificación

| Ronda | Versión | Nota | Veredicto | Motivo |
|---|---|---|---|---|
| 1 | `2d914b85` | 95,2 | PASS | Plantilla + espejo del soporte |
| 2 | `2c9e0cc6` | 90,9 | REWORK | A6 8,8: paso 2 de la skill sobrescribía el plan; slug sin BOM; fecha `2026-13-45` pasaba |
| 3 | `161a70be` | 93,0 | PASS | Los tres defectos cerrados |
| 4 | `9f24139b` | 92,3 | REWORK | A6 8,8: el BOM se perdió al editar (slug otra vez roto); causa del IE mal atribuida |
| 5 | pendiente | — | — | Slug sin literales acentuados (FormD), causa del IE corregida, exit 2 |

## Límites conocidos

- Abrir con `Invoke-Item` o doble clic depende de la asociación de `.html`
  (`assoc` apunta a `iexplore.exe` en esta máquina; el `UserChoice` manda a veces).
  Por eso `-Abrir` lanza Chrome o Edge **por ruta**.
- PowerShell 5.1 lee un `.ps1` UTF-8 **sin BOM** como ANSI: el generador no lleva
  literales acentuados en el código precisamente para no depender del BOM.
- La copia al portapapeles no se puede probar sin gesto de usuario; hay fallback
  `execCommand` y la vía «Descargar .md».
- La página es local: no se publica ni se comparte por URL.
