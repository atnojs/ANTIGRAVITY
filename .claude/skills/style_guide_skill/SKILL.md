---
name: style-guide-antigravity
description: "Sistema de diseño Neon Glassmorphism completo. Activar al crear o editar apps para aplicar la estética Antigravity: fondos oscuros, acentos neón, efectos cristal, botones 3D y tipografía Montserrat/Poppins."
---

# Style guide Antigravity — puntero

## Modelos de imagen del proyecto (política vigente)

**Modelo por defecto: OpenAI image 2 = `gpt-image-2`, calidad `medium`, identificador `openai-image-2`.**

| Identificador (payload `model`) | Modelo real | `quality` |
|---|---|---|
| `openai-image-2` | `gpt-image-2` | `medium` — **por defecto** |
| `openai-image-2-high` | `gpt-image-2` | `high` |
| `openai-medium` | `gpt-image-2.5-flare` | `medium` |
| `openai-high` | `gpt-image-2.5-flare` | `high` |
| `openai-max-flare` | `gpt-image-2.5-flare` | `max` |
| `openai-xhigh` | `gpt-image-2.5-sunburst` | `xhigh` |
| `openai-max-sunburst` | `gpt-image-2.5-sunburst` | `max` |
| `gemini-flash` | `google/gemini-3.1-flash-image` | — |
| `gemini-pro` | `google/gemini-3-pro-image` | — |
| `qwen-pro` | `qwen/qwen-image-3-pro` | — |

- Editar la foto de referencia: siempre `https://api.openai.com/v1/images/edits` (multipart) y **sin** `response_format`.
- Orden de los botones: de izquierda a derecha, de menor a mayor calidad **dentro de cada modelo real** — `MEDIUM`, `HIGH`, `MAX FLARE` (gpt-image-2.5-flare); `XHIGH`, `MAX SUNBURST` (gpt-image-2.5-sunburst); `GEMINI` (`3.1 FLASH`, `3 PRO`); `QWEN` (`QWEN 3 PRO`); `IMAGE 2` (`MEDIUM` por defecto, `HIGH`).
- Claves solo desde el entorno (`SetEnv` del `.htaccess` raíz): `OPENAI_API_KEY` (u `O`) y `R`. El frontend nunca ve la clave.
- Reglas completas y patrón del selector: `skills/SKILL_MAESTRA.md`. Referencia viva: `apps/dibujo_lineas_copia`.
- **No cambies el modelo por defecto ni el catálogo sin petición expresa del usuario.**

### Contenido completo de esta skill

El texto íntegro de esta skill vive en **`skills/SKILL_style-guide-antigravity.md`** (relativo a la raíz del proyecto). Léelo y aplícalo tal cual para el resto del procedimiento. Si hay que cambiar algo de esa skill, se cambia SOLO en el árbol canónico `skills/`.
