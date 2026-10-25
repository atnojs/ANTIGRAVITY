# Flow Studio · copia con estilo Hoola (2026-10-25)

Petición: «genera una copia de la app pero con el estilo hoola. solo debes tocar el estilo, nada más».

Copia publicada en **https://atnojs.es/apps/flow_studio_hoola/**. La app original
(`/apps/flow_studio/`) no se ha tocado.

## Alcance: solo estilo

| Fichero | Estado |
|---|---|
| `apps/flow_studio_hoola/index.html` | solo cambian `theme-color` (`#001018`) y el `<link>` a `app.hoola.css` |
| `apps/flow_studio_hoola/app.hoola.css` | **nuevo**: hoja de estilos Hoola completa |
| `app.20261025e.js`, `proxy.php`, `history.php`, `history-manager.js` | **byte a byte idénticos** a la app original (verificado con SHA-256) |
| `flow_queue.php` | idéntico salvo la ruta al `flow_store` compartido y la migración única de la cola propia (petición posterior: «hazlo») |
| `.gitignore` y los dos `.htaccess` de datos | idénticos (protegen `flow_store/` y `history_store/`) |

No se ha cambiado ninguna función, texto, flujo ni contrato de datos.

## Sistema Hoola aplicado

- Tokens canónicos: `--acc #00D0D0`, `--acc2 #26C626`, `--contenedor #174F7A`,
  `--text #eaffff`, `--muted #99CCCC`, `--card-bg rgba(23,79,122,.42)`,
  `--border rgba(0,208,208,.7)`, radios 14/9 px y Electrolize en toda la interfaz.
- Fondo: degradado `#001018 → #062f43 60% → #0E5368` con dos halos cian y rejilla de
  46 px enmascarada en el centro (mismos valores que `apps/dibujo_lineas_copia`).
- Cabecera: título `clamp(2rem,5vw,3.2rem)`, cian, triple halo; acciones en pastillas de vidrio.
- Paneles (compositor, tarjetas, historial, lightbox): vidrio azulado con borde cian de
  2 px, radio 14 px, halo exterior e iluminación interior; controles con radio 9 px.
- Estados activos con gradiente `contenedor → cian` y texto azul muy oscuro (contraste),
  acción primaria GENERAR con gradiente cian → verde.
- Overlay de carga con el degradado translúcido, tres aros cian/verde, texto cian con halo.

## Verificación

- Local (Chrome headless + CDP, cola simulada, 3 imágenes de historial de prueba):
  - 1440 px: cabecera 104 px, panel 390/820 px, 3 tarjetas, **sin desborde horizontal**.
  - 390 px: cabecera 95 px, panel 358 px, botones de propuesta 143×44, sin desborde.
  - Consola sin errores; foco visible en `.ref-pick`, `.chip` y `.btn-prompt-option`.
  - Contraste corregido: textos secundarios a `--muted` y estados activos con texto oscuro.
- Producción (`https://atnojs.es/apps/flow_studio_hoola/`, `last-modified 21:20:23`):
  - HTML sirve `app.hoola.css`; CSS 200 (30.194 B) y JS 200 (38.124 B).
  - `flow_queue.php?action=ping` → `ok:true`; `history.php?action=list` → lista vacía.
  - Datos protegidos: `flow_store/queue.json`, `flow_store/ref/`, `history_store/` → **403**.
  - Sin errores de consola; sin desborde horizontal a 1440 y 390.

## Cola compartida (petición posterior: «hazlo»)

La copia usa el **mismo `flow_store` que la app original** (`../flow_studio/flow_store`),
así que el worker que ya corre en el PC procesa también sus trabajos. Al cambiar la ruta,
`flow_queue.php` migra **una sola vez** los trabajos que hubieran quedado en la cola propia
de la copia (con sus imágenes de referencia) y renombra `queue.json` a `queue.json.merged`.

Verificado en producción:

- `ping` de la copia y de la original devuelven el mismo `lastSeen` y el mismo `pending`.
- Los 4 trabajos que estaban atrapados en la cola propia se migraron y procesaron
  (pendientes 4 → 2 → 0) y aparecen en el lienzo/historial de la copia.
- `?action=img&id=…` sirve desde la copia las mismas imágenes que la original
  (91.704 B y 101.466 B, byte a byte).
- Una generación lanzada desde la UI de la copia terminó en 51 s con la tarjeta completa
  (1024×1024, 162.944 B JPEG por el endpoint de la copia) y «PC conectado», sin errores de
  consola. Captura: `09-produccion-generada.png`.

## Commits

`b55a3877` (copia + CSS), `10f622a6` (protección `.htaccess`), `c3a58306` (finales de
línea), `9bdd5477` (re-disparo), `73a748ae` (cola compartida), `ed6902e8` (migración de la
cola propia) y el de estas evidencias.

