<!-- Fuente ÚNICA del bloque de modelos que se inserta literalmente en los punteros
     de .claude/skills/*/SKILL.md. Si cambia algo aquí, ejecuta:
         php tools/generar-punteros-skills.php
     Así los 12 punteros quedan siempre idénticos y sin saltos de lectura. -->

## Modelos de imagen del proyecto (política vigente)

**Modelo por defecto: OpenAI image 2 = `gpt-image-2`, calidad `medium`, identificador `openai-image-2`.**

| Identificador (payload `model`) | Modelo real | `quality` |
|---|---|---|
| `openai-image-2-low` | `gpt-image-2` | `low` |
| `openai-image-2` | `gpt-image-2` | `medium` — **por defecto** |
| `openai-image-2-high` | `gpt-image-2` | `high` |
| `openai-medium` | `gpt-image-2.5-flare` | `medium` |
| `openai-high` | `gpt-image-2.5-flare` | `high` |
| `openai-max-flare` | `gpt-image-2.5-flare` | `max` |
| `openai-xhigh` | `gpt-image-2.5-sunburst` | `xhigh` |
| `openai-max-sunburst` | `gpt-image-2.5-sunburst` | `max` |
| `gemini-2` | `google/gemini-2.5-flash-image` | — |
| `gemini-flash` | `google/gemini-3.1-flash-image` | — |
| `gemini-pro` | `google/gemini-3-pro-image` | — |
| `qwen-pro` | `qwen/qwen-image-3-pro` | — |

- Editar la foto de referencia: siempre `https://api.openai.com/v1/images/edits` (multipart) y **sin** `response_format`.
- Orden de los botones: de izquierda a derecha, de menor a mayor capacidad **dentro de cada modelo real** — `MEDIUM`, `HIGH`, `MAX FLARE` (gpt-image-2.5-flare); `XHIGH`, `MAX SUNBURST` (gpt-image-2.5-sunburst); `GEMINI 2`, `3.1 FLASH`, `3 PRO` (gemini-2.5-flash-image → gemini-3.1-flash-image → gemini-3-pro-image); `QWEN 3 PRO`; `IMAGE 2` (`LOW`, `MEDIUM` por defecto, `HIGH`). `apps/dibujo_lineas_copia` arranca con `openai-image-2-low` por petición expresa del usuario.
- Claves solo desde el entorno (`SetEnv` del `.htaccess` raíz): `OPENAI_API_KEY` (u `O`) y `R`. El frontend nunca ve la clave.
- Reglas completas y patrón del selector: `skills/SKILL_MAESTRA.md`. Referencia viva: `apps/dibujo_lineas_copia`.
- **No cambies el modelo por defecto ni el catálogo sin petición expresa del usuario.**
