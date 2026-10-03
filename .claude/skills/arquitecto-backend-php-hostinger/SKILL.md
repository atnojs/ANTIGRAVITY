---
name: arquitecto-backend-php-hostinger
description: "Activa este skill para configurar proxies de comunicación seguros con APIs de IA en servidores PHP de Hostinger, aislando claves y previniendo errores de entorno."
---

# Arquitecto de backend PHP para Hostinger — puntero

## Modelos de imagen del proyecto (política vigente)

**Modelo por defecto: OpenAI image 2 = `gpt-image-2`, calidad `low`, identificador `openai-image-2-low`.**

| Identificador (payload `model`) | Modelo real | `quality` |
|---|---|---|
| `openai-image-2-low` | `gpt-image-2` | `low` — **por defecto** |
| `openai-image-2` | `gpt-image-2` | `medium` |
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
- Orden de los botones: de izquierda a derecha, de menor a mayor capacidad **dentro de cada modelo real** — `MEDIUM`, `HIGH`, `MAX FLARE` (gpt-image-2.5-flare); `XHIGH`, `MAX SUNBURST` (gpt-image-2.5-sunburst); `GEMINI 2`, `3.1 FLASH`, `3 PRO` (gemini-2.5-flash-image → gemini-3.1-flash-image → gemini-3-pro-image); `QWEN 3 PRO`; `IMAGE 2` (`LOW`, `MEDIUM`, `HIGH`). **`openai-image-2-low` (`LOW`) es el modelo por defecto de todas las apps**, por petición expresa del usuario: la diferencia de coste frente a `medium` justifica usarlo como opción inicial.
- Claves solo desde el entorno (`SetEnv` del `.htaccess` raíz): `OPENAI_API_KEY` (u `O`) y `R`. El frontend nunca ve la clave.
- Reglas completas y patrón del selector: `skills/SKILL_MAESTRA.md`. Referencia viva: `apps/dibujo_lineas_copia`.
- **No cambies el modelo por defecto ni el catálogo sin petición expresa del usuario.**

### Contenido completo de esta skill

El texto íntegro de esta skill vive en **`skills/SKILL_arquitecto-backend-php-hostinger.md`** (relativo a la raíz del proyecto). Léelo y aplícalo tal cual para el resto del procedimiento. Si hay que cambiar algo de esa skill, se cambia SOLO en el árbol canónico `skills/`.
