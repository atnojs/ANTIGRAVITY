# Evidencia — Flow Studio Hoola: edición de imágenes, referencia y escalado 2× · 4× · 8×

- **Fecha:** 2026-10-26
- **App:** `apps/flow_studio_hoola` — https://atnojs.es/apps/flow_studio_hoola/
- **Commits:** `4e0c4174` (feature), `9c056814` (CSP del escalado), `be0a0d65` (JS con nombre nuevo), `f9f02a13` (marcador de despliegue)
- **Producción servida:** `index.html` 16.192 B, `app.20261026d.js` 65.969 B, `app.hoola.20261026c.css` 39.196 B (SHA-256 verificados contra el repo)

## Encargo

La app solo generaba imágenes. Antonio pidió: además de generar, **editar imágenes**, con **mejorador de prompt**, **imagen de referencia** y un **botón de upscaler 2×, 4× y 8×**.

## Qué se hizo

### 1. Modo «Editar» (nuevo)

- Conmutador **Generar · Editar** en el panel. En edición aparece la zona **Imagen a editar** (clic o arrastrar, PNG/JPG/WEBP/GIF, máx. 8 MB), el botón pasa a **EDITAR IMAGEN** y la cantidad se fija en 1.
- La imagen se reescala en el navegador a 1600 px (JPEG q0.92) y viaja como **primera referencia**. La cola ya entregaba las referencias al worker, así que **no hace falta desplegar ni reiniciar el worker del PC**.
- La instrucción que recibe Flow se compone en el cliente: `Edita la imagen adjunta manteniendo intacto todo lo que no se indique: <texto>`. Si el texto ya empieza por «Edita», no se duplica.
- El formato se ajusta solo al de la imagen (1:1, 4:3, 3:4, 16:9 o 9:16).
- **Referencia de estilo opcional** (1 hueco, porque la imagen base ocupa el otro). La instrucción avisa a Flow de que la segunda imagen es solo referencia.
- Cualquier tarjeta del lienzo o del historial tiene ahora **Editar**: carga su imagen y su prompt en el modo edición.
- El historial guarda `mode: 'edit'` y la tarjeta muestra la etiqueta **EDICIÓN**.

### 2. Mejorador de prompt específico de edición

- `proxy.php` acepta `mode: 'edit'` y usa un system prompt de retoque: 4 instrucciones de 35–55 palabras que dicen **qué cambia** y **qué debe permanecer intacto**, sin describir una escena nueva.
- Los 4 botones se etiquetan «Instrucción 1…4» y el aviso cambia a «4 instrucciones». Al pulsar uno, se carga en el editor.

### 3. Escalado 2× · 4× · 8×

- Menú **Escalar** en cada tarjeta (2×, 4×, 8×) y fila **«Escalar sin pasar por Flow»** bajo la imagen de trabajo.
- Se hace en el navegador con remuestreo progresivo 2× y `imageSmoothingQuality: 'high'`, máximo **8192 px por lado**; si el factor pedido supera el tope, se avisa del tamaño real.
- El resultado es una tarjeta nueva con sus dimensiones reales, botón de descarga y zoom. **No se guarda en el historial** (el aviso lo dice) para no llenar el almacén con JPEG de varios MB.
- Se genera como **data URL**, no como `blob:`: la CSP del sitio (`img-src 'self' data: https:`) bloquea los blob y también `connect-src` para `fetch(data:)`. El código convierte los data URL a Blob con `atob`, sin fetch.

### 4. Panel y accesibilidad

- El panel del compositor pasa a dos zonas: contenido con scroll propio y **pie fijo con la CTA**, visible sin buscarla a 1440×768 y 820×1000.
- Foco visible en todos los controles nuevos, `aria-pressed` en el conmutador, `aria-label` en los botones de icono y en el grupo de escalado, `aria-live` en las notas, cierre con Escape y `[hidden]` respetado.
- Copy en español de España, sin promesas de detalle inventado en el escalado.

## Archivos

| Archivo | Cambio |
|---|---|
| `apps/flow_studio_hoola/index.html` | conmutador, zona de imagen, 6 acciones de tarjeta, pie fijo, copy y meta |
| `apps/flow_studio_hoola/app.20261026d.js` | lógica de edición, fuente, referencia, escalado y descarga (copia servida; `c` se conserva para HTML cacheados) |
| `apps/flow_studio_hoola/app.hoola.20261026c.css` | estilos del modo edición, fuente, menú de escalado y pie fijo |
| `apps/flow_studio_hoola/flow_queue.php` | `mode` en request/status/claim, validación «editar exige imagen», `MAX_PROMPT` 1500 |
| `apps/flow_studio_hoola/proxy.php` | system prompt de edición y `mode` en la respuesta |

La cola sigue compartiendo `../flow_studio/flow_store` y el worker actual la procesa sin cambios. Los trabajos antiguos sin `mode` se leen como `generate`.

## Pruebas

### Local (Chrome real por CDP + mocks de cola, historial y proxy)

`C:\Users\atnoj\AppData\Local\Temp\fsh_edit\verify.mjs` → **35/35 PASS**, consola limpia.

Cubre: arranque, conmutador, copy, subida y tamaño, formato automático, mejorador con `mode=edit`, instrucción enviada, tarjeta «Edición» con su miniatura, petición real a la cola (`mode=edit`, 1 imagen, `count=1`), menú 2×/4×/8×, **escalados 2× (1600×1200), 4× (3200×2400) y 8× (6400×4800)**, descarga a disco (JPEG válido), historial con `mode=edit`, recarga, editar desde tarjeta, generación normal con referencia (regresión) y anchos 1440/820/393 sin scroll horizontal.

### Cola PHP real (PHP 8.3.36 portable, servidor aislado)

`C:\Users\atnoj\AppData\Local\Temp\fsh_edit\phptest.mjs` → **13/13 PASS**.

Cubre: editar sin imagen → 400; editar con imagen → 1 trabajo; `claim` con `mode=edit` y la imagen en base64; prompt de 1449 caracteres sin recorte; formato/modelo; `status` con `mode`; generación de 2 unidades; `complete`; URL final; referencia que no es imagen → 400; referencias purgadas al terminar. `php -l` sin errores en los dos PHP.

### Producción (Chrome real, flujo completo, sin mocks)

`C:\Users\atnoj\AppData\Local\Temp\fsh_edit\prodcheck.mjs` → **11/11 PASS**:

| Comprobación | Resultado |
|---|---|
| Cola PHP y worker | `ok`, `worker: true` |
| Versión servida (d) | `app.20261026d.js` 65.969 B, hash idéntico al repo |
| Subida de la imagen base | 800 × 600 px |
| Mejorador real (OpenRouter) | 4 instrucciones |
| **Edición real con Flow** | tarjeta terminada, 1200 px de ancho, etiqueta «Edición» |
| Petición a la cola | `mode=edit`, `refs=1`, `count=1` |
| Escalado 2× en producción | 2400 × 1792 px (data URL visible pese a la CSP) |
| Descarga a disco | `flow-studio-*.jpg`, 414.162 B, cabecera JPEG válida |
| 393 px | sin scroll horizontal |
| Consola | sin errores ni avisos de CSP |

Prueba ligera posterior (`prodlight.mjs`) → **5/5 PASS**: versión d, escalado 1600×1200, descarga JPEG de 78.710 B, 393 px y consola limpia.

## Capturas

- `local-01…11`: escritorio generar/editar/resultado, menú de escalado, 2×, 8×, editar desde tarjeta, portátil 1440×768, tablet 820 y móvil 393 (generar y editar).
- `produccion-01…09`: flujo real (generar, editar, mejorador, resultado de Flow, escalado, móvil) y pasada final de la versión d.
- `fixture-800x600.png`: imagen sintética usada en las pruebas.

## Limitaciones declaradas

- **El escalado es local** (remuestreo de alta calidad): aumenta píxeles reales, no inventa detalle nuevo. El panel no lo promete.
- **La edición es una edición del agente de Flow sobre la imagen adjunta**, no una herramienta de máscara/capas: Flow puede reinterpretar algún elemento. En la prueba con la imagen sintética conservó el bloque verde y añadió la casa y los árboles; con fotos reales conviene revisar el resultado antes de darlo por bueno. No se promete fidelidad píxel a píxel.
- El worker del PC **no se ha tocado** ni reiniciado: la edición reutiliza el canal de referencias. Si en el futuro se quiere que Flow reciba una instrucción específica de edición desde `flow.py`, habría que desplegar el worker.
- Las imágenes escaladas **no van al historial**; se descargan desde la tarjeta. Es una decisión de producto para no almacenar JPEG de hasta 8 MB por operación.
- En la primera prueba real se añadió «PRUEBA DSH» al prompt y Flow lo **pintó como texto en la imagen**: confirma que la edición actúa sobre la imagen, pero fue un artefacto de prueba. La verificación final se repitió sin marcador.
- Se borraron del historial compartido las **3 entradas de prueba** creadas por la verificación; quedan las 4 imágenes reales que había antes.
- La sesión no ha modificado `tools/memoria/bitacora.md` porque estaba tocado por otra sesión en paralelo; la entrada queda aquí y en el informe de entrega.
- El despliegue de Hostinger tarda entre 10 y 20 minutos en esta sesión; se comprobó el contenido servido por hash, no solo el HTTP 200.

## Hashes SHA-256 (repo = producción)

```
6A4D7E2F6735798BC64033295A396D2F04D7B84DB2D33D85D828FD15EAA8C303  index.html (16.192 B)
E6730B5AFDD699AFBEA7382A6E201C08D82B691E9721EF25B45D1E31B3C0DC30  app.20261026d.js (65.969 B)
BABDEA336D5CC0EAA70FB4E2EDCBB8DFE69BD1A8E8BCDD9CCDBC729065D1721E  app.hoola.20261026c.css (39.196 B)
5FD76900439E58B3811840D04D76E4C625823973DF8BF88270D27DB7920EB32A  flow_queue.php (20.504 B)
12B86D8E99EF35C5922FECE56C7D5711DF1A565EE495E312FBA11760A9E4B249  proxy.php (12.469 B)
```
