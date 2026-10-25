# Flow Studio — 2 imágenes de referencia (2026-10-25)

Cambio: `apps/flow_studio/` acepta hasta **2 imágenes de referencia** por generación.
Viajan con la petición a la cola (`flow_store/ref/`), el worker las descarga en el
`claim`, las escribe en disco y `flow.py` las adjunta a la instrucción del agente de
Flow (una o dos, según haya).

## Qué se tocó

| Fichero | Cambio |
|---|---|
| `apps/flow_studio/index.html` | bloque «Referencias» (2 ranuras), textos y assets fechados |
| `apps/flow_studio/app.js` | subida por clic o arrastre, reescalado a 1280 px JPEG, quitar, envío con `refs`, miniaturas en la tarjeta y `markDone` acotado a `.card-media` |
| `apps/flow_studio/app.css` | estilos de ranuras y franja de referencias; `max-height`/scroll del panel en pantallas bajas |
| `app.20261025b.css`, `app.20261025c.js` | copias fechadas servidas por el HTML nuevo (la CDN de Hostinger cachea por ruta) |
| `apps/flow_studio/flow_queue.php` | valida/guarda hasta 2 referencias por trabajo, las entrega en `claim` y borra los ficheros al terminar |
| `apps/flow_studio/.gitignore` | ignora `flow_store/ref/` |
| `E:\herramientas\google-flow\flow_studio_worker.py` | materializa las referencias base64 y pasa `--image` repetido; limpia los temporales |
| `E:\herramientas\google-flow\flow.py` | `--image` repetible (máx. 2), baseline de espera DESPUÉS de subirlas y soporte `images[]` en `batch` |

## Verificación

**Sintaxis y estática**

- `node --check` en `app.js` y `app.20261025c.js`.
- `ast.parse` en `flow_studio_worker.py` y `flow.py`.
- `php-parser` (PHP 8.2) sobre `flow_queue.php`, `proxy.php` e `history.php`.

**UI local (Chrome headless + CDP, cola simulada)**

- 2 ranuras; rechazo de un `.txt` con nota de error; dos PNG arrastrados dejan
  miniatura, botón quitar y «2 referencias listas (máximo)».
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
| 2.ª (con `app.20261025c.js`) | 76 s; trabajo `done`; `.card-media img` cargada 1024×1024 (91.704 B JPEG, HTTP 200); 2 miniaturas de referencia intactas; meta «2 referencias»; consola limpia |

**Geometría (Chrome, antes → después)**

| Ancho | Panel antes | Panel después | Ranuras | Desborde horizontal |
|---|---|---|---|---|
| 1440 | 390×635 | 390×820 | 168×126 · gap 8 | no |
| 768 | 707×616 | 707×920 | 326×245 · gap 8 | no |
| 390 | 358×616 | 358×811 | 157×118 · gap 8 | no |

En pantallas bajas (1440×768, 1440×900, 1280×720) el panel hace scroll propio y el
botón GENERAR queda visible tras desplazarlo (`max-height: calc(100vh - 104px)`).

## Commits

`4fe351ed` (feat), `b742f8ae` (re-disparar despliegue: el primer push no desplegó),
`4120b1a9` (fix de la tarjeta y del scroll del panel).

## Limitación

El worker de PC corre con `pythonw` y no deja log: que Flow reciba las 2
referencias se infiere de que `claim` las entrega verificadas y de que cualquier
fallo de subida en `flow.py` habría marcado el trabajo como error. La imagen de
prueba no evidencia visualmente los círculos sintéticos usados como referencia.
