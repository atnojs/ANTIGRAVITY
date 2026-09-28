---
description: Modelo por defecto para generación y edición de imágenes - OBLIGATORIO
---

# 🎨 Modelo de IA para Generación y Edición de Imágenes

**Modelo por defecto de todo el proyecto: OpenAI image 2 (`gpt-image-2`) con calidad `medium`.**

En el payload que se envía al proxy se identifica como **`openai-image-2`**.

```php
// apps/dibujo_lineas_copia/proxy.php (catálogo vigente)
'openai-image-2' => ['backend' => 'openai', 'model' => 'gpt-image-2', 'quality' => 'medium'],
```

## Catálogo completo que acepta el proxy

| Identificador (payload `model`) | Modelo real | `quality` |
|---|---|---|
| `openai-image-2` | `gpt-image-2` | `medium` — **por defecto** |
| `openai-image-2-high` | `gpt-image-2` | `high` |
| `openai-medium` | `gpt-image-2.5-flare` | `medium` |
| `openai-high` | `gpt-image-2.5-flare` | `high` |
| `openai-max-flare` | `gpt-image-2.5-flare` | `max` |
| `openai-xhigh` | `gpt-image-2.5-sunburst` | `xhigh` |
| `openai-max-sunburst` | `gpt-image-2.5-sunburst` | `max` |
| `gemini-flash` | `google/gemini-3.1-flash-image` (OpenRouter) | — |
| `gemini-pro` | `google/gemini-3-pro-image` (OpenRouter) | — |
| `qwen-pro` | `qwen/qwen-image-3-pro` (OpenRouter Images API) | — |

## Reglas

1. La foto de referencia se edita SIEMPRE por `https://api.openai.com/v1/images/edits` (multipart). **No enviar `response_format`**: la API actual responde `400 Unknown parameter`.
2. Los modelos de OpenAI usan la clave `OPENAI_API_KEY` (alias `O`) y se resuelven **solo desde el entorno** del servidor (`SetEnv` del `.htaccess` raíz). Gemini, Qwen y texto/visión usan `R` (OpenRouter).
3. El frontend nunca llama al proveedor ni ve la clave: siempre pasa por el `proxy.php` de la app. No construir URLs con `?key=`.
4. La fuente de verdad del selector y del mapeo es `apps/dibujo_lineas_copia` (ver `skills/SKILL_MAESTRA.md` y `.claude/skills/crear/SKILL.md`). Orden de los botones: de izquierda a derecha, de menor a mayor calidad dentro de cada modelo real.
5. Para saber qué modelos ofrece la cuenta: `POST {"action":"models"}`. Para comprobar claves y catálogo sin gastar API: `POST {"action":"health"}`.

> ⚠️ No cambiar el modelo por defecto (`openai-image-2`, image 2 calidad media) ni el catálogo sin petición expresa del usuario.
