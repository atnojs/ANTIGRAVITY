# Estado y plan de migración de apps — 2026-09-28

Documento de relevo. Si retomas este trabajo en otra sesión, **lee esto primero** y sigue
el protocolo tal cual. Todo lo verificado está marcado; lo que no, también.

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

## 6. Estado por app

Leyenda: FLUXp/FLUXf = FLUX en proxy/frontend · cfg = referencias a `config.php` ·
g2 = tiene `gemini-2` · hist = carpeta de historial.

| App | FLUXp | FLUXf | cfg | g2 | hist | Estado |
|---|---|---|---|---|---|---|
| `dibujo_lineas_copia` (canónica) | no | no | no | **sí** | store | ✅ integrado y verificado en producción (ver §9) |
| `escenario_modelo` | no | no | no | no | LEGACY | ⏳ pendiente |
| `imagenes_ia/ajustes_imagen` | no | no | no | no | LEGACY | ⏳ pendiente |
| `angulos_de_camara` | no | no | no | no | LEGACY | ⏳ pendiente |
| `estilizador_prompt` | no | no | no | no | LEGACY | ⏳ pendiente |
| `conversor_multimedia` | no | no | no | no | LEGACY | ⏳ pendiente |
| `creador_memes` | no | no | sí | no | LEGACY | ⏳ pendiente |
| `infografia-referencia` | no | no | no | no | LEGACY | ⏳ pendiente |
| `infografia` | no | no | no | no | LEGACY | ⏳ pendiente |
| `vestir_modelo` | no | no | no | no | LEGACY | ⏳ pendiente |
| `galletas_infografias` | no | sí | no | no | LEGACY | ⏳ pendiente |
| `decorar_habitacion` | no | no | sí | no | LEGACY | ⏳ pendiente |
| `editar_generar` | no | no | no | no | LEGACY | ⏳ pendiente |
| `prompt_copilot_premium` | no | no | no | no | LEGACY | ⏳ pendiente |
| `aura-edit` | **sí** | no | sí | no | — | ⏳ pendiente |
| `imagenes_ia/copiar_estilo` | no | **sí** | sí | no | — | ⏳ pendiente |
| `clonador` | no | no | sí | sí | — | ⏳ pendiente |
| `color`, `editar_imagen`, `fotos_antonio`, `generar`, `generar_ai_studio`, `imagenes_ia`, `imagenes_ia/editar`, `imagenes_ia/generar`, `banco_de_imagenes`, `crear_historias`, `ficha_producto`, `illusion_diffusion`, `generar_imagene_personalizadas`, `codigos_imagen`, `editar_generar_1` | no | no | **sí** | no | — | ⏳ pendiente |
| `public_html/apps/hermes_academy/proxy.php` | **sí** | — | no | no | — | ⏳ pendiente (proxy FLUX completo) |

Comando para regenerar la lista con el estado actual: `php tools/inventario-apps.php`.

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

Lo que hay que revisar (primera tarea de la próxima sesión): la imagen devuelta **conserva
el color y reproduce la imagen de entrada** en lugar de convertirla a línea. Hipótesis, por
orden de coste:

1. La entrada de prueba es un pantallazo de interfaz (mucho texto), no una foto: **repetir
   la prueba con una foto real** antes de tocar nada.
2. Orden del contenido: probar `image` antes de `text` en `messages[0].content` (algunos
   modelos de imagen son sensibles al orden).
3. Fuerza del prompt: para `gemini-2` puede hacer falta un prompt más explícito
   («convierte a blanco y negro, solo líneas, elimina todo color y relleno»).
4. Si con foto real sigue sin convertir, dejarlo en el selector como opción secundaria
   documentando su comportamiento, sin prometer estilo.

El resto del catálogo (image 2 y 2.5) está probado en producción y convierte correctamente.

