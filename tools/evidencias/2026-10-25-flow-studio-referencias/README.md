# Flow Studio — 2 imágenes de referencia (2026-10-25)

Cambio: `apps/flow_studio/` acepta hasta **2 imágenes de referencia** por generación.
Viajan con la petición a la cola (`flow_store/ref/`), el worker las descarga en el
`claim`, las escribe en disco y `flow.py` las adjunta a la instrucción del agente de
Flow (una o dos, según haya).

## Qué se tocó

| Fichero | Cambio |
|---|---|
| `apps/flow_studio/index.html` | bloque «Referencias» (2 ranuras) con botón `.ref-pick` + botón quitar hermano, textos y assets fechados |
| `apps/flow_studio/app.js` | subida por clic o arrastre, reescalado a 1280 px JPEG, quitar, envío con `refs`, miniaturas en la tarjeta y `markDone` acotado a `.card-media` |
| `apps/flow_studio/app.css` | estilos de ranuras, foco visible (outline cian 2 px) y `max-height`/scroll del panel en pantallas bajas |
| `app.20261025a/b/d.css`, `app.20261025a/c/d.js` | copias fechadas servidas por el HTML (la CDN de Hostinger cachea por ruta) |
| `apps/flow_studio/flow_queue.php` | valida/guarda hasta 2 referencias por trabajo, las entrega en `claim` y borra los ficheros al terminar |
| `apps/flow_studio/.gitignore` | ignora `flow_store/ref/` |
| `E:\herramientas\google-flow\flow_studio_worker.py` | materializa las referencias base64 y pasa `--image` repetido; limpia los temporales |
| `E:\herramientas\google-flow\flow.py` | `--image` repetible (máx. 2), baseline de espera DESPUÉS de subirlas y soporte `images[]` en `batch` |

## Verificación

**Sintaxis y estática**

- `node --check` en `app.js` y `app.20261025d.js`.
- `ast.parse` en `flow_studio_worker.py` y `flow.py`.
- `php-parser` (PHP 8.2) sobre `flow_queue.php`, `proxy.php` e `history.php`.

**UI local (Chrome headless + CDP, cola simulada)**

- 2 ranuras; rechazo de un `.txt` con nota de error; dos PNG arrastrados dejan
  miniatura, botón quitar y «2 referencias listas (máximo)».
- Sin interactivos anidados (`.ref-slot` no lleva `role`; `.ref-pick` y `.ref-remove`
  son hermanos); Tab llega a `.ref-pick` con `:focus-visible` y outline `solid 2px`.
- Las etiquetas `aria-label` cambian a «Referencia N cargada…» al cargar.
- `POST` con 2 data URLs JPEG; tarjeta con 2 miniaturas y meta «2 referencias»;
  tras completar, la imagen va a `.card-media` y las miniaturas no se pisan.
- Sin errores de consola.

**Cola en producción (con token, sin gastar generación)**

- `request` con 2 PNG → `claim` devuelve 2 referencias (`image/png`, 224 y 226 B,
  cabecera PNG válida) → `complete` → `status: done` y `?action=img` 200.
  Las referencias se borran al terminar.

**Generación real en producción (`https://atnojs.es/apps/flow_studio/`)**

| Prueba | Resultado |
|---|---|
| 1.ª (sin el fix de tarjeta) | 81 s; trabajo `done`; imagen 1024×1024 en el historial; la tarjeta quedó vacía (bug `querySelector('img')` cogía la miniatura) |
| 2.ª (con `app.20261025c.js`) | 76 s; trabajo `done`; `.card-media img` cargada 1024×1024 (91.704 B JPEG, HTTP 200); 2 miniaturas intactas; meta «2 referencias» |
| 3.ª (versión final, assets `d`) | trabajo `done`; imagen 1024×1024 (101.466 B JPEG, HTTP 200); 2 miniaturas intactas; meta «2 referencias»; consola limpia. Tardó 469 s por la cola compartida con otras sesiones (el worker tenía 6 pendientes ajenos) |

La primera prueba (20:02) destapó el fallo de la tarjeta; la tercera (20:28) es la
versión que quedó publicada (`app.20261025d.css/js`).

**Geometría (Chrome, antes → después)**

| Ancho | Panel antes | Panel después | Ranuras | Desborde horizontal |
|---|---|---|---|---|
| 1440 | 390×635 | 390×820 | 168×126 · gap 8 | no |
| 768 | 707×616 | 707×920 | 326×245 · gap 8 | no |
| 390 | 358×616 | 358×811 | 157×118 · gap 8 | no |

En pantallas bajas (1440×768, 1440×900, 1280×720) el panel hace scroll propio y el
botón GENERAR queda visible tras desplazarlo (`max-height: calc(100vh - 104px)`).

## Commits

`4fe351ed` (feat), `b742f8ae` (re-disparo), `4120b1a9` (fix tarjeta + scroll),
`f6ddfff8` (accesibilidad de ranuras), `f4fb7537` (re-disparo final), más los
commits `docs` de memoria y evidencias.

## Limitaciones

- El worker de PC corre con `pythonw` y no deja log: que Flow reciba las 2
  referencias se infiere de que `claim` las entrega verificadas y de que cualquier
  fallo de subida en `flow.py` habría marcado el trabajo como error. La imagen de
  prueba no evidencia visualmente los círculos sintéticos usados como referencia.
- La prueba 3 tardó 469 s porque la cola es compartida y había 6 trabajos de otras
  sesiones delante; no es un problema del cambio.
- Incidencia ajena a este cambio: durante la verificación independiente se marcó
  `fail` por error un trabajo de otra sesión (id `84a1caa8390e79ef`, prompt
  «Cinematic double-exposure portrait…»). Esa sesión volvió a generar sus imágenes
  después (hay 3 entradas nuevas en el historial), pero conviene saberlo.
