# Estado y plan de migración de apps — 2026-09-28

Documento de relevo. Si retomas este trabajo en otra sesión, **lee esto primero** y sigue
el protocolo tal cual. Todo lo verificado está marcado; lo que no, también.

> **Empieza por el §6.1** (apps en uso, en ese orden, una a una) y **no toques el §6.2**
> (copias, backups, `dist`, espejo `public_html`, entornos). Una app = un commit, y no
> pasas a la siguiente hasta verificarla en producción. Trabaja sobre `main`, sin ramas ni
> worktrees. Al terminar cada app, actualiza su fila en el §6.1.

### Cómo arrancar esta noche (el usuario NO estará disponible)

1. **Lee este documento entero antes de tocar nada.**
2. **Crea un objetivo persistente** para que el trabajo siga en rondas automáticas aunque
   nadie responda. Usa `create_goal` con este objetivo:

   > Actualizar las apps del §6.1 de apps/ESTADO_MIGRACION_APPS.md una a una, verificando
   > cada una en producción antes de pasar a la siguiente: sin FLUX, sin DALL-E, sin
   > config.php (claves solo del entorno), historial en history_store/ no versionado, y
   > gemini-2 integrado con los botones de menor a mayor capacidad. Mantener actualizado el
   > §6.1 del documento. Ignorar por completo el §6.2.

3. **Trabaja en bucle**: siguiente app del §6.1 → protocolo §4 → verificar en producción →
   marcar la fila como ✅ en el §6.1 → commit → siguiente app. No pidas confirmación para
   cada paso: el usuario quiere encontrarlo hecho.
4. **Si el contexto se agota**: no dejes una app a medias. Termina la que tengas entre
   manos (o revierte sus cambios), actualiza el §6.1 con el estado real y deja escrito
   cuál es la siguiente app. Así una tercera sesión puede continuar sin preguntar.
5. **No inventes nada**: los identificadores de modelo, los precios y las carpetas se
   comprueban con las herramientas del §5 y con la cuenta real.

---

## 1. Objetivo

Actualizar **todas** las apps de `E:\ANTIGRAVITY\apps\` una a una, verificando cada una
en producción antes de pasar a la siguiente:

1. **Nada de FLUX** (ni `flux-pro`, `flux-2-pro`, `bfl.ai`, clave `F`).
2. **Nada de DALL·E** (`dall-e-2`, `dall-e-3`, `image-3`): no existen en la cuenta.
3. **Nada de `config.php`**: las claves viven SOLO en el `.htaccess` raíz (`SetEnv`) y
   el proxy las resuelve desde el entorno (`getenv`, `REDIRECT_`, `$_SERVER`, `$_ENV`).
4. **Historial persistente de verdad**: datos en `history_store/` (nunca versionado) y
   `history.php` idéntico al canónico; ningún historial en Git (se pisa en cada despliegue).
5. **Integrar el modelo Gemini 2**: `gemini-2` = `google/gemini-2.5-flash-image`,
   en el selector y con los botones ordenados de **menor a mayor capacidad** dentro de
   cada modelo real.

## 2. Catálogo vigente (verificado en la cuenta, 2026-09-28)

| Identificador | Modelo real | `quality` | Notas |
|---|---|---|---|
| `openai-image-2` | `gpt-image-2` | `medium` | **por defecto en todas las apps** |
| `openai-image-2-high` | `gpt-image-2` | `high` | |
| `openai-medium` | `gpt-image-2.5-flare` | `medium` | |
| `openai-high` | `gpt-image-2.5-flare` | `high` | |
| `openai-max-flare` | `gpt-image-2.5-flare` | `max` | |
| `openai-xhigh` | `gpt-image-2.5-sunburst` | `xhigh` | |
| `openai-max-sunburst` | `gpt-image-2.5-sunburst` | `max` | |
| `gemini-2` | `google/gemini-2.5-flash-image` | — | **el más ligero del grupo Gemini** |
| `gemini-flash` | `google/gemini-3.1-flash-image` | — | |
| `gemini-pro` | `google/gemini-3-pro-image` | — | el más capaz del grupo |
| `qwen-pro` | `qwen/qwen-image-3-pro` | — | |

**Orden de los botones** (de izquierda a derecha, de menor a mayor capacidad *dentro de
cada modelo real*): `MEDIUM`, `HIGH`, `MAX FLARE` (flare) · `XHIGH`, `MAX SUNBURST`
(sunburst) · `GEMINI 2`, `3.1 FLASH`, `3 PRO` · `QWEN 3 PRO` · `IMAGE 2` (`MEDIUM` por
defecto, `HIGH`).

Datos que NO se deben inventar (se consultan en vivo):
- Modelos de OpenAI de la cuenta: `POST {"action":"models"}` al proxy.
- Modelos de imagen de Google/OpenRouter: `https://openrouter.ai/api/v1/models` (público).

## 3. Ficheros canónicos que se copian/adaptan en cada app

| Origen (canónico) | Qué es |
|---|---|
| `apps/dibujo_lineas_copia/proxy.php` | proxy de referencia: catálogo, `action=health`, `action=models`, resolución de claves solo desde el entorno |
| `apps/dibujo_lineas_copia/history.php` | historial con datos en `history_store/` + `.htaccess` propio + bloqueos y límites |
| `apps/dibujo_lineas_copia/history-manager.js` | cliente de historial (con sello anti-caché en la lista) |
| `apps/dibujo_lineas_copia/index.html` + `app.js` + `app.css` | selector canónico de botones y patrón visual hoola |
| `apps/dibujo_lineas_copia/canonical-image-model.php` | contrato único para las apps que lo incluyen |
| `skills/POLITICA_modelos-imagen.md` | fuente única del bloque de modelos que llevan los punteros |

## 4. Protocolo por app (una app = un commit; no pasar a la siguiente sin verificar)

1. **Inspeccionar**: `proxy*.php`, `history.php`, `index.html`, `app.js` de la app.
2. **Proxy**: quitar cualquier `config.php`/clave local; catálogo con los identificadores
   vigentes (sin FLUX ni DALL·E); añadir `gemini-2`; si falta, añadir `action=health`.
3. **Historial**: copiar el `history.php` canónico; borrar del servidor el `config.php`
   si existía; comprobar que `history_store/` no está en Git.
4. **Frontend**: botones en el orden del punto 2; `GEMINI 2` el primero de su grupo;
   `DEFAULT_MODEL = 'openai-image-2'`; subir la versión de `app.js`/`app.css` en el
   `index.html` (cache busting).
5. **Commit + push** a `main` (nunca ramas ni worktrees; ver `CLAUDE.md`).
6. **Verificar en producción** (gratis):
   - `https://atnojs.es/apps/<app>/index.html` → el orden de los `data-model` es el correcto.
   - `POST https://atnojs.es/apps/<app>/proxy.php {"action":"health"}` → claves y catálogo.
   - `GET https://atnojs.es/apps/<app>/history.php?action=list&app=<app>` → responde y no
     apunta a `history_data`.
7. **Marcar la app como hecha** en la tabla del punto 6.

## 5. Herramientas ya listas

- `php tools/inventario-apps.php` → estado por app (FLUX, DALL·E, config.php, gemini-2,
  historial, nº de ficheros de historial). Volver a lanzarlo para ver el avance.
- `php tools/generar-punteros-skills.php [--check]` → regenera los punteros de
  `.claude/skills/` desde `skills/POLITICA_modelos-imagen.md`.
- `node agent/dsh/validar-agentes.mjs` → comprueba que los punteros/agentes siguen sanos.

## 6. Orden de trabajo (empezar SOLO por aquí)

> **Instrucción para la próxima sesión**: trabaja únicamente las apps del **§6.1**, en ese
> orden, una por una. **No toques nada del §6.2** (copias, backups, `dist`, espejo
> `public_html`, carpetas de entorno). Si terminas el §6.1, avisa antes de seguir.

### 6.1 Apps a migrar (en uso: portal + actividad real)

Dato importante comprobado: **todas las apps del repositorio están publicadas** (el deploy
sube la raíz completa, así que casi cualquier `/apps/<x>/index.html` responde 200). Por eso
"desplegada" **no** sirve como filtro. El criterio real es:

- **En el portal del usuario** (listado vivo `apps/paginas/web_apps/apps_data.json`, solo
  cuentan las que existen en el repo).
- **Con actividad real**: tienen ficheros en `history_data/` o `history_store/` (son las
  que se usan de verdad).

Orden recomendado (primero las del portal y las de más actividad):

Estado: **✅ = migrada, commiteada y verificada en producción** (`health` con `gemini-2`,
`history_store/` sirviendo las imágenes y orden real de los `data-model` correcto en el HTML
servido). **⏳ = pendiente.**

| # | Estado | App | Motivo | Historial |
|---|---|---|---|---|
| 1 | ✅ | `angulos_de_camara` | portal + mucha actividad | 20 |
| 2 | ✅ | `escenario_modelo` | mucha actividad | 28 |
| 3 | ✅ | `imagenes_ia/ajustes_imagen` | mucha actividad | 23 |
| 4 | ✅ | `estilizador_prompt` | actividad | 19 |
| 5 | ✅ | `conversor_multimedia` | actividad | 13 |
| 6 | ✅ | `creador_memes` | actividad + `config.php` | 12 |
| 7 | ✅ | `infografia-referencia` | actividad | 10 |
| 8 | ✅ | `infografia` | actividad | 8 |
| 9 | ⏳ | `vestir_modelo` | portal + actividad | 4 |
| 10 | ⏳ | `imagenes_ia/editar_generar` | actividad | 6 |
| 11 | ⏳ | `editar_generar` y `editar_generar_1` | actividad + `config.php` | 3 |
| 12 | ⏳ | `galletas_infografias` | actividad + FLUX en front | 2 |
| 13 | ⏳ | `prompt_copilot_premium` y `prompt_estudio` | actividad | 2 |
| 14 | ⏳ | `imagenes_ia/generar`, `imagenes_ia/generar_copia`, `imagenes_ia/editar`, `imagenes_ia/copiar_estilo`, `imagenes_ia/combinar_imagenes`, `imagenes_ia/estilo_json`, `imagenes_ia/upscaler` | apps de imagen del proyecto | 0–2 |
| 15 | ⏳ | `color`, `dibujo_lineas`, `ficha_producto`, `outfit`, `generar_imagenes` | portal | 0–1 |
| 16 | ⏳ | `aura-edit` (**FLUX en proxy**), `clonador`, `decorar_habitacion`, `editar_imagen`, `generar`, `generar_ai_studio`, `generar_imagene_personalizadas`, `fotos_antonio`, `estudio_creativo`, `estudio_imagenes`, `illusion_diffusion`, `banco_de_imagenes`, `crear_historias`, `pasatiempos`, `publicidad_producto`, `transferir_estilo`, `hermes_academy`, `rrss`, `video-vault`, `trickvault` | resto de apps con proxy propio | 0–1 |

**Patrón aplicado por app** (§4, ya probado en las apps 1–8): `history.php` canónico
copiado tal cual (datos en `history_store/`, con migración de un solo paso desde
`history_data/`), `history-manager.js` canónico (sello anti-caché en la lista + shim de la
API legacy), `gemini-2` como primer botón del grupo GEMINI, columna `IMAGE 2`
(`openai-image-2` MEDIUM por defecto + `openai-image-2-high`), botones de `OPENAI 2.5` en
orden MEDIUM, HIGH, MAX FLARE, XHIGH, MAX SUNBURST, y `action=health` que devuelve catálogo
y claves configuradas (más `action=models` cuando la app no lo tenía).

`dibujo_lineas_copia` ya está hecho y sirve de patrón (§9).

### 6.2 Ignorar por completo

- `apps/Copias por si/**` y cualquier carpeta `(COPIA)` o `* (COPIA)`.
- `apps/_*` (`_clonador`, `_illusion_diffusion (1)`, `_viaje_tiempo_backup`, `_template_proxy.php`…).
- Carpetas numeradas de versiones: `apps/<app>/1`, `/2`, `/5`, `/3`.
- `apps/**/dist/**`, `apps/**/build/**`, `apps/**/node_modules/**`.
- Entornos y extracciones: `apps/dibujo_lineas/env/**`, `apps/base_library_extracted/**`,
  `apps/compilar/**`, `apps/temp_extract/**`, `apps/PROTOCOLO GEMINI- CLONADOR DE FOTOS/**`.
- `public_html/**`: es un **espejo publicado** del repo, no una app. Si hay que cambiar
  algo ahí (p. ej. `public_html/apps/hermes_academy/proxy.php`, que aún es un proxy FLUX),
  se cambia en su origen dentro de `apps/` o se trata como caso aparte.
- `apps/Girasoles`, `apps/Premium`, `apps/amd-video-optimizer`, `apps/dev`, `apps/1`.
- `_backups/**` y `backups/**` de la raíz (histórico).

### 6.3 Cómo saber el estado actual en cualquier momento

```powershell
php tools/inventario-apps.php          # FLUX / DALL-E / config.php / gemini-2 / historial por app
```
La columna `g2 = NO` indica que a esa app le falta el modelo Gemini 2.
## 7. Paquete de trabajo ya cerrado (no hay que rehacerlo)

- `config.php` eliminado del servidor de `dibujo_lineas_copia` y todas sus referencias
  fuera del código, de las skills y de los agentes.
- Historial de `dibujo_lineas_copia` migrado a `history_store/` (167/167 entradas e
  imágenes servidas) y **147 ficheros de historial de 21 apps dejados de versionar**.
- Skills consolidadas en `skills/` (los `.claude/skills/*/SKILL.md` son punteros
  generados con la política de modelos incrustada: cero saltos de lectura).
- Modelo por defecto y orden de botones documentados en `skills/SKILL_MAESTRA.md`,
  `skills/POLITICA_modelos-imagen.md`, `claude.md` y `apps/agent/workflows/gemini-model.md`.

## 8. Avisos

- El despliegue de Hostinger **no borra** los ficheros retirados del repo (comprobado):
  si hace falta quitar algo del servidor, hay que hacerlo con un script temporal
  autodestructivo y retirarlo del repo después.
- La respuesta de un intermediario puede estar cacheada: al verificar, usar un
  parámetro aleatorio (`?cb=<random>`) y, si el resultado no cuadra, comprobar la
  cabecera `Last-Modified`.
- Antes de dar una app por buena, comprobar el **orden real de los `data-model`** en el
  HTML servido, no solo el fichero local.

## 9. Prueba real de gemini 2 en la app canónica (2026-09-28 00:2x)

Petición: `POST https://atnojs.es/apps/dibujo_lineas_copia/proxy.php` con
`{"image": <base64 de apps/creador_memes/ui-check.png>, "mimeType":"image/png", "model":"gemini-2"}`
(sin `prompt`, así que el proxy usa su prompt de dibujo lineal).

Resultado: **HTTP 200 en 11,1 s**, imagen `image/png` de 1248×832, aspect `3:2`, 1065 KB.

Lo bueno: el identificador, el catálogo, la clave `R`, el endpoint de OpenRouter y la
respuesta con imagen funcionan de punta a punta.

### 9.1 Repetición con FOTO REAL (2026-09-29 01:0x) — RESUELTO

Primera tarea de la sesión nocturna: repetir la prueba con una foto de verdad (hipótesis 1
del §9). Se usó
`apps/dibujo_lineas_local/salida/ORIGINAL_ORIGINAL_ORIGINAL_WhatsApp Image 2026-04-28 at 15.16.53.jpeg`
(68 KB, foto de dos personas), enviada con `tools/probar-gemini2.ps1`.

Resultado: **HTTP 200 en 8,4 s**, imagen `image/png` de **864×1184**, aspect `27:37`,
1173 KB. La salida es **línea negra sobre blanco, sin color ni relleno**, con la composición
y los rasgos de la foto original conservados (coloring page correcta). Evidencia guardada en
`tools/evidencias/gemini2-foto-real-entrada.jpg` y
`tools/evidencias/gemini2-foto-real-resultado.png`.

Conclusión: **`gemini-2` convierte correctamente con fotos reales**. El problema observado
en la prueba anterior era la entrada (un pantallazo de interfaz con mucho texto), no el
modelo. No hace falta tocar el prompt ni el orden del contenido de `messages[0]`, y
`gemini-2` se queda como opción plena del selector (no secundaria).

Nota de método: al enviar la imagen desde PowerShell hay que escribir el cuerpo como bytes
UTF-8 explícitos; con `Invoke-WebRequest -InFile` el proxy devolvía `JSON invalido`.

El resto del catálogo (image 2 y 2.5) está probado en producción y convierte correctamente.

