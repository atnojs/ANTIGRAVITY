# Flow Studio — 2 imágenes de referencia (2026-10-25)

Cambio: la app `apps/flow_studio/` acepta hasta **2 imágenes de referencia** por
generación. Viajan con la petición a la cola (`flow_store/ref/`), el worker las
descarga en el `claim`, las escribe en disco y `flow.py` las adjunta a la
instrucción del agente de Flow (una o dos, según haya).

## Qué se tocó

| Fichero | Cambio |
|---|---|
| `apps/flow_studio/index.html` | bloque «Referencias» (2 ranuras), textos y assets fechados |
| `apps/flow_studio/app.js` | subida por clic o arrastre, reescalado a 1280 px JPEG, quitar, envío con `refs`, miniaturas en la tarjeta |
| `apps/flow_studio/app.css` (+ `app.20261025a.css`) | estilos de las ranuras, nota y franja de referencias de la tarjeta |
| `apps/flow_studio/app.20261025a.js` | copia fechada idéntica a `app.js` (la CDN de Hostinger cachea por ruta) |
| `apps/flow_studio/flow_queue.php` | valida/guarda hasta 2 referencias por trabajo, las entrega en `claim` y borra los ficheros al terminar |
| `apps/flow_studio/.gitignore` | ignora `flow_store/ref/` |
| `E:\herramientas\google-flow\flow_studio_worker.py` | materializa las referencias base64 y las pasa a `flow.py` (`--image` repetible); limpia los temporales |
| `E:\herramientas\google-flow\flow.py` | `--image` repetible (máx. 2), baseline de espera DESPUÉS de subir las referencias, soporte `images[]` en `batch` |

## Verificación hecha

- Sintaxis: `node --check` en `app.js` y `app.20261025a.js`; `ast.parse` en los dos
  ficheros de Python; `php-parser` sobre `flow_queue.php`, `proxy.php` e `history.php`.
- UI real con Chrome headless + CDP y un stub de la cola (`flow_queue.php` simulado):
  2 ranuras, rechazo de un `.txt`, arrastre de 2 PNG, miniatura + botón quitar,
  nota «2 referencias listas (máximo)», `POST` con 2 data URLs JPEG, tarjeta con
  franja de 2 referencias y meta «2 referencias», sin errores de consola y sin
  desbordamiento a 390 px.

## Limitación

La generación real con 2 referencias en Google Flow se comprueba en producción
después del despliegue (el worker de PC corre allí; desde este equipo no se puede
lanzar Flow). Capturas: `01-*`, `02-*`, `03-*`.
