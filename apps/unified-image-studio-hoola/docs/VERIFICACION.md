# Verificación — Unified Image Studio · Hoola

Fecha: 2026-10-26 · Build: `3.0.0-hoola` · Original intacto en `apps/unified-image-studio/`.

Esta versión **no es un rediseño parcial**: es una copia completa del código actual del original
(con Google Flow, la compuerta de modelos y la cancelación de trabajos) sobre la que se aplica el
sistema visual Hoola/Relatos al 100 %. Lo que se verifica aquí es que la copia arranca, conserva
todas las funciones, aplica de verdad los tokens Hoola y no rompe el flujo ni la responsividad.

## 1. Entorno de prueba

| Elemento | Valor |
|---|---|
| Servidor local | Node 24 (estático) sirviendo `apps/`; `*.php` responde 503 para forzar el modo local |
| Navegador | Chrome real (headless) manejado por CDP, perfil propio |
| URL local | `http://127.0.0.1:8781/unified-image-studio-hoola/index.html` |
| URL producción | `https://atnojs.es/apps/unified-image-studio-hoola/` |
| Evidencias | `tools/evidencias/2026-10-26-uis-hoola-v3/` |

## 2. Pruebas funcionales locales (12/12)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Arranque y sello de versión | PASS · `v3.0.0 · 2026-10-26 · copia Hoola al 100%` |
| 2 | Compuerta de modelos cargada | PASS · Model Gate 1.2.0, **12 candados** exactos |
| 3 | Electrolize en toda la interfaz | PASS · `document.fonts.check('12px Electrolize')` |
| 4 | Fondo Hoola medido | PASS · degradado `rgb(0,16,24) → rgb(6,47,67) → rgb(14,83,104)` + rejilla `46px 46px` |
| 5 | Sin errores de arranque | PASS · `__UIS_DIAG__.problems` vacío |
| 6 | IMAGE 2 LOW libre | PASS · se selecciona sin modal |
| 7 | OPENAI 2.5 MEDIUM protegido | PASS · modal «Modelo protegido», no cambia la selección |
| 8 | Desbloqueo con el código de modelos | PASS · MEDIUM activo, 0 candados |
| 9 | El desbloqueo persiste al recargar | PASS · `sessionStorage` y 0 candados |
| 10 | Pestaña de vídeo | PASS · `data-mode=video`, modelos y fotograma presentes |
| 11 | Biblioteca | PASS · filtros y contenedor de trabajos |
| 12 | Pestaña nueva: VEO 3.1 QUALITY | PASS · vuelve a pedir contraseña con 12 candados |

## 3. Estilo Hoola: medidas y capturas

| Comprobación | Medida / evidencia |
|---|---|
| Barra superior | 56 px de alto, vidrio con borde inferior cian de 2 px |
| Paneles | 322 px (izquierdo) y 336 px (derecho) a 1422 px de ventana; borde cian de separación |
| Navegación Imagen/Vídeo/Biblioteca | 304 × 34 px, píldora de vidrio; activo con gradiente `#174F7A → #00D0D0` |
| Lienzo | 622 × 622 px a 1422; sin scroll horizontal (`scrollWidth == innerWidth`) |
| 390 y 768 px | `scrollWidth == innerWidth`; panel móvil superpuesto; sin desbordes |
| Overlay de carga | Tres aros, fondo translúcido con blur, título «IA generando lo solicitado...», barra indeterminada cian→verde |
| Modales | Acceso privado, compuerta y ayuda en vidrio azulado con borde cian y botón primario cian→verde |

Capturas: `01-hoola-escritorio.png`, `02-hoola-video.png`, `03-hoola-biblioteca.png`,
`04-hoola-ayuda.png`, `05-hoola-movil.png`, `06-hoola-tablet.png`, `07-hoola-carga.png`,
`08-hoola-acceso.png`, `09-hoola-compuerta.png`, `10-hoola-ayuda.png`,
`11-hoola-biblioteca-vacia.png`.

## 4. Producción (2026-10-26, 23:11 UTC)

`index.html` servido con `model-gate.20261026b.js`, `assets/css/hoola.css` y `app.js?v=1`;
`api.php?action=state` responde `ok:true`, `version:"3.0.0-hoola"`, `configured:true` y
`sharedSession:true`. Los recursos nuevos (`flow.js`, `lightbox-zoom.20261026.js`, `hoola.css`)
responden 200. **16/16 PASS** en Chrome real, sin errores de consola ni violaciones de CSP:

| Comprobación | Resultado |
|---|---|
| Arranque con sello v3.0.0 y Electrolize | PASS |
| 12 candados y compuerta 1.2.0 | PASS |
| Fondo Hoola y rejilla 46 px medidas | PASS |
| IMAGE 2 LOW libre / GEMINI 3 PRO pide contraseña | PASS |
| Código de modelos desbloquea y selecciona | PASS |
| Pestaña Vídeo con 4 modelos / Biblioteca con 3 filtros | PASS |
| Móvil 390 px sin desbordes | PASS |

Capturas: `12-produccion-escritorio.png`, `13-produccion-compuerta.png`,
`14-produccion-video.png`, `15-produccion-movil.png`.

**Ajuste posterior:** con el servidor disponible pero **sin sesión**, la barra decía «Flow: sin
credencial», que se podía leer como un fallo de credencial. Ahora dice «Flow: inicia sesión» y la
tarjeta del panel «Sesión pendiente» (commit `389990fb`). No cambia el comportamiento, solo el
mensaje.


## 5. Límites declarados

- No hay PHP en el equipo de desarrollo de esta ronda: las pruebas locales cubren interfaz, estilo,
  compuerta y navegación; la API se comprueba en producción (copia literal del backend del original).
- La generación real con Flow depende de un agente encendido en el PC de Flow; no se lanzaron
  generaciones (coste real).
- La base SQLite es propia de esta copia: no comparte proyectos con el original.

---

## Agente de Flow siempre conectado (2026-10-27)

El agente solo vivía mientras hubiera una ventana abierta: al cerrarla, la app decía «Flow: sin
conexión» y los trabajos se quedaban en cola. Ahora es un **servicio permanente**.

### Qué se instaló

Tarea programada `UisFlowAgent`:

| Ajuste | Valor | Para qué |
|---|---|---|
| Disparador | al iniciar sesión + repetición cada 2 min | cobertura continua y arranque tras reiniciar |
| Acción | `pythonw.exe flow_agent.py --minutes 6` | 6 min de trabajo con solape de 4 min: nunca hay hueco |
| Varias instancias | `IgnoreNew` | el candado del agente evita duplicados |
| Reintentos | 3, cada minuto | si el proceso muere, vuelve |
| `StartWhenAvailable` | activo | se recupera tras suspensión o apagado |
| Ventana de consola | ninguna (`pythonw` + `CREATE_NO_WINDOW`) | no molesta |

Instalación y comprobación:

```powershell
cd E:\ANTIGRAVITY\tools\flow-agent
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Estado
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Quitar
```

El instalador **comprueba la credencial contra la app antes de instalar** y muestra a qué URL apunta
el agente: así no se instala un servicio que no puede funcionar.

### Dos fallos propios corregidos por el camino

1. **El agente apuntaba a `unified-image-studio`**, no a esta app, así que su cola no se atendía.
   Ahora `agente.json` apunta a `unified-image-studio-hoola`.
2. **El endpoint `agent.cancelled` leía mal el identificador**: el agente lo manda en el cuerpo
   JSON y el servidor solo miraba `$_GET`/`$_POST`, así que respondía «cancela» **siempre** y
   mataba cada generación al empezar. Se corrigió en las dos apps, y el agente manda además el id
   en la URL para no depender del orden del despliegue.
3. De paso: `api()` no aceptaba el parámetro `extra_query` que usaba la consulta de cancelación, así
   que la pregunta fallaba en silencio y la parada no funcionaba. Corregido y verificado.

### Verificación

| Prueba | Resultado |
|---|---|
| Credencial del agente contra la app | HTTP 200 |
| Tarea registrada y en ejecución | `Running`, próxima ejecución cada 2 min |
| Agente vivo con el servicio | 2 procesos, sin ventanas |
| `flow.state` desde la app | `workerOnline: true` |
| Indicador en la interfaz | **«Flow: conectado»** |
| Generación real desde producción | trabajo `eeea0973ff744f71` → `done`, 145.392 B, 1024×1024 |
| Parada de una generación en producción | trabajo `fdc6d85eecf7e931` → `cancelled`, sin archivo, Chrome cerrado |
| Descarga del resultado | JPEG válido desde la tarjeta de la biblioteca |

Evidencias: `30-31-produccion-conectado.png`, `32-produccion-biblioteca.png`,
`33-produccion-parada.png`, más `29-hoola-biblioteca.png` de la prueba local con descarga real.

### Límite honesto

Si el PC está apagado, suspendido o con la sesión cerrada, **no hay agente**: no hay nada que
ejecute Flow. Con el portátil enchufado, la suspensión automática está a 0 (nunca); con batería,
a los 10 minutos. Para uso desde el móvil a cualquier hora, el PC debe estar encendido y con sesión
iniciada.

---

## Cantidad de imágenes: se respeta también al editar (2026-10-27)

**Síntoma reportado:** «he clicado dos veces en generaciones en las que quería 3 imágenes y solo ha
generado 1».

**Causa:** con una referencia cargada, la app envía `mode: 'edit'` y el cliente forzaba
`count = 1`; el servidor hacía lo mismo. La cantidad elegida se ignoraba **en silencio**: la
interfaz mostraba «GENERAR 3» y llegaba una sola imagen.

Los dos encargos afectados quedaron en el registro como `mode: edit` con una sola imagen cada uno.

**Corrección:**

- El servidor ya **no** fuerza `count = 1` en modo edición: cada trabajo lleva su propia copia de la
  referencia y produce una variante.
- El cliente envía siempre la cantidad elegida (`count: flowUi.imageCount`), con o sin referencia.
- La nota del panel dice la verdad: «3 variantes de la referencia: cada una es una edición».

**Verificación:**

| Prueba | Resultado |
|---|---|
| Servidor: 3 ediciones con referencia | 3 trabajos creados, `mode: edit` |
| Agente real con Flow: 3 ediciones | 3 `done` · 263.331 B, 283.164 B, 261.366 B · 1024×1024 |
| Navegador en producción con referencia (contador = 1) | etiqueta «GENERAR 3» y nota correcta |
| Petición enviada por el navegador | `count: 3`, `mode: edit`, 1 referencia |
| Trabajos creados en el servidor | 3 (se cancelaron después para no gastar generaciones) |
| Sin referencia (caso ya probado antes) | sigue creando 3 |

Cuidado con el cambio: los invariantes de `tools/flow-agent/comprobar-entregable.mjs` apuntaban al
texto antiguo y **fallaron** al aplicar el arreglo, lo que confirmó que la comprobación sirve.

---

## Máscara: el relleno se aplicaba a TODA la imagen (2026-11-02 · v3.0.1-hoola)

**Síntoma reportado:** «Selecciono con el pincel, clico en rellenar la máscara y le aplica lo
solicitado a toda la imagen».

**Causa raíz (reproducida y medida):** `componerInpaintingSobreCapa()` construía la base del
compuesto con `imageFor(layer.aspectOriginal || layer.resourceId)`. `imageFor()` **solo devuelve la
imagen si ya está cargada** y, si no, devuelve `null` (la deja cargando). `aspectOriginal` no se
pinta nunca en el lienzo, así que su `<img>` no existía: en cuanto la capa tenía `aspectOriginal`
(es decir, después de un inpainting o de «quitar fondo» anteriores, y **siempre** al reabrir el
proyecto), el compuesto devolvía `null` y `acceptResult()` aplicaba **la imagen entera del
proveedor** a la capa. La primera máscara de una imagen recién importada sí funcionaba: por eso las
verificaciones anteriores pasaban y la app seguía fallando para el usuario.

**Corrección (`assets/js/app.js` v3.0.1):**

1. La base del compuesto es **siempre la imagen actual de la capa**, cargada con un ayudante
   (`cargarImagenDeRecurso`) que **espera** a que el `<img>` esté listo. Ya no se usa
   `aspectOriginal` (también revertía las ediciones anteriores fuera de la máscara).
2. Si el compuesto no se puede construir, **no se aplica nada**: se avisa al usuario y se deja la
   vista previa abierta. Nunca se aplica la imagen entera como consuelo.
3. El relleno de máscara usa **siempre un modelo OpenAI (IMAGE 2)**: Flow, Gemini y Qwen ignoran la
   máscara en el servidor y reescribirían la imagen completa. Antes solo se corregía el caso de
   Flow.
4. `maskCanvasFor()` (máscara por píxeles) firma la caché por **contenido** de los trazos, no solo
   por número de trazos y puntos del último.
5. Módulos versionados con fecha (`*.20261102.js`) para que la CDN de Hostinger sirva el código
   nuevo sin depender de `?v=` (cachea por ruta).

**Evidencia:**

| Prueba | Resultado |
|---|---|
| Banco local, código ANTERIOR (peor proveedor: reescribe toda la imagen) | 1.er relleno OK; tras recargar, 2.º relleno: **resto de la imagen cambiado 100 %** |
| Banco local, código CORREGIDO | 1.er relleno: franja 24,4 % / resto **0 %**; tras recargar, 2.º relleno: franja 25,2 % / resto **0 %** |
| Modelo Gemini seleccionado + «Rellenar la máscara» | la petición viaja con `openai-image-2-low` |
| Módulos cargados en una carga | una sola copia de cada uno (`app`, `ai`, `core`, `exporter`, `flow`, `persist`, `render`, `tools`, `ui` `.20261102.js`) |
| Producción tras desplegar | ver más abajo |

### Producción (2026-11-02, tras desplegar `12170394` + re-disparo `c63288cf`)

| Comprobación | Resultado |
|---|---|
| `index.html` servido | cita `assets/js/app.20261102.js?v=20261102` (hash servido = hash del commit) |
| `api.php?action=state` | `version: "3.0.1-hoola"`, `ok: true` |
| Sello en la app | `v3.0.1 · 2026-11-02 · máscara aplicada solo dentro de lo pintado` |
| Módulos servidos | `app/render/tools/ui/core/persist/exporter/ai/flow` `.20261102.js`: hash del **blob del commit** = hash servido; una sola copia de cada uno |
| Escenario real del fallo | foto de detalle → 1.er relleno (franja 1) → simular documento antiguo con `aspectOriginal` heredado → guardar → recargar → 2.º relleno (franja 2) |
| Fuera de las franjas (antes vs después) | **0,25 %** de píxeles cambiados (la composite conserva el original) |
| Fuera de las franjas, capa vs imagen del proveedor | diferencia media **2,79** (no se aplicó la imagen entera) |
| Dentro de la franja pintada | **76,1 %** de los píxeles coinciden con la imagen del proveedor (parche aplicado) |
| Consola | 0 errores propios |
| Cuenta/modelo | `openai-image-2-low`, trabajos `succeeded` |

Script: `tools/pruebas/verificar-produccion-mascara-uis-hoola.mjs` (medida en
`tools/evidencias/2026-11-02-mascara-uis/53-produccion-medicion.json`, capturas 50–52).

### Producción de la versión 3.0.2 (rework, 2026-11-02)

| Comprobación | Resultado |
|---|---|
| Commit | `6429287b` (+ re-disparo del despliegue `fce61b7`) |
| `index.html` servido | cita `assets/js/app.20261102c.js?v=20261102c`; hash servido = blob del commit |
| `api.php?action=state` | `version: "3.0.2-hoola"` |
| Sello en la app | `v3.0.2 · 2026-11-02 · máscara: aplica solo lo pintado (también invertida)` |
| Módulos `*.20261102c.js` | `app/render/tools/ui/core/persist/exporter/ai/flow`: hash servido = blob del commit; una sola copia |
| Escenario del fallo (documento con `aspectOriginal` heredado + recarga) | fuera de la máscara **0,06 %** cambiado; capa ≠ imagen del proveedor fuera (diferencia media 2,8); dentro 75,6 % coincide con el proveedor |
| Consola | 0 errores propios |

Archivos servidos comprobados: `index.html`, `app/render/tools/ui.20261102c.js` (SHA-256 = blob).
Medición: `tools/evidencias/2026-11-02-mascara-uis/53-produccion-medicion.json` (sobrescrita con la
medida de 3.0.2).

### 3.0.3 (2026-11-02) — cierre de observaciones del verificador

- **O1:** el aviso de la vista previa ya dice la verdad con la máscara invertida («se aplica SOLO
  fuera de lo pintado»).
- **O3:** si la capa objetivo ya no existe, el aviso indica descartar la vista previa.
- Los módulos de 3.0.2 (`*.20261102c.js`) **se conservan** servidos (HTTP 200) para el HTML cacheado,
  junto a los nuevos `*.20261102d.js` que cita `index.html`.

Producción 3.0.3: `api.php?action=state` → `version: "3.0.3-hoola"`; `index.html` →
`app.20261102d.js?v=20261102d` (SHA-256 servido = blob del commit `03E35C27…`; `app.20261102c.js`
sigue sirviendo `CE48C9FE…`); sello `v3.0.3`. Una generación real `openai-image-2-low` con máscara:
**fuera 0 %** de cambio, **dentro 21,9 %**.

**Gate de calidad:** verificación independiente en 3 rondas → **PASS 95,9/100** sobre
`e869edb9`/`3.0.3-hoola` (ronda 1: REWORK por D1 Medio «Invertir», D2/D3 menores; rondas 2 y 3:
PASS). Informe: `tools/evidencias/2026-11-02-mascara-uis/VERIFICACION_INDEPENDIENTE.md`;
autoevaluación: `AUTOEVALUACION.md` (94,1).

### 3.0.4 (2026-11-02) — color/opacidad de la máscara y vista previa fiel

Dos peticiones del usuario tras usar la 3.0.3:

1. **«Con la opacidad al 100 % la zona marcada no se queda blanca y no se distingue la máscara.
   Quiero elegir el color para que contraste.»** La capa de máscara estaba pintada a alpha 0,55 con
   cian fijo. Ahora hay **«Color de la máscara»** (selector de color + «Auto») y **«Opacidad de la
   máscara»** (10–100 %, por defecto **100 % = sólida**, tapa la imagen). Se guardan por navegador
   (`localStorage: uis-hoola:maskPrefs`). Medido en Chromium: píxel pintado con color `#00ff00` y
   opacidad 100 % → RGBA `0,255,0,255`; con 30 % → alfa `77`.
2. **«Le aplica lo solicitado a toda la imagen» (captura: prompt "pinta de color fucsia" y todo el
   retrato teñido).** La composición ya respetaba la máscara; lo que enseñaba toda la imagen teñida
   era **la vista previa**, que mostraba la salida completa del proveedor. Ahora `runInpaint` compone
   antes de previsualizar y la vista previa muestra **solo lo que se aplicará** (misma imagen que
   `acceptResult` usa después, sin recomponer). Medido: vista previa vs capa aplicada → **diferencia
   media 0** en los dos rellenos del banco.

Evidencia: `34-local-pass.json` (`okPreview:true`, `vistaPreviaVsAplicado.v1/v2`), `64-casos-limite.json`
(`okMascara:true`, `mascaraVisual.pixel100/pixel30`), PNG 60–63.

### Producción 3.0.4 (2026-11-02)

Commit `6cb8b4d2`. `index.html` cita `app.20261102f.js?v=20261102f`; `api.php?action=state` →
`version: "3.0.4-hoola"`; hashes servidos = blobs del commit (index, app/render/core `f`; `d` sigue
200). Caso del usuario reproducido en Chrome real con una generación `openai-image-2-low`
(foto de detalle, máscara pequeña, prompt «pinta de color fucsia»):

| Comprobación | Resultado |
|---|---|
| Máscara visible con color elegido y opacidad 100 % | píxel `[0,255,0,255]` (sólido, tapa la imagen), etiqueta «100 %» |
| Proveedor | tiñó **toda** la imagen (diferencia media fuera de la máscara **25,09**) |
| Vista previa vs capa aplicada | **diferencia media 0** (idénticas) |
| Fuera de la máscara (antes vs después) | **0,09 %** de píxeles cambiados |
| Dentro de la máscara | **40,9 %** cambiado |
| Consola | 0 errores propios |

Capturas: `70-produccion-mascara-verde.png` (máscara sólida), `71-produccion-vista-previa.png`,
`72-produccion-despues.png`; medida `77-produccion-mascara-color.json`. Script:
`tools/pruebas/verificar-produccion-mascara-color-uis-hoola.mjs`.

### 3.0.5 (2026-11-02) — recursos huérfanos de la vista previa

El verificador detectó (O1) que la composición temporal de la vista previa quedaba en
`state.resources` al descartarla o regenerarla (aparecía en «Recursos del proyecto» y podía subirse).
Ahora el recurso se marca `preview`, **no se guarda ni se sube** mientras no se acepte
(`persist.js`), y al descartar o regenerar se **libera** (`liberarVistaPrevia`: revoca el blob URL y
lo quita de `state.resources`); al aceptar se quita la marca y se sube.

**Producción 3.0.5** (commit `ae2cf27e`; `index.html` → `app.20261102g.js?v=20261102g`;
`api.php?action=state` → `version: "3.0.5-hoola"`; `f`, `d`, `c`, `.20261102` siguen 200):
el verificador reprodujo en Chrome real, con 0 generaciones, recursos base 1 → preview 2 (`preview:true`)
→ descartar 2→1 → regenerar 2→2 → aceptar 2 (preview:false, `remoteId` asignado y `resource.upload`)
→ recarga: la preview **no** persistió; **ninguna** preview se subió; vista previa y aplicado con el
mismo SHA-256; consola `[]`; módulos `g` una sola copia. Generación real en 3.0.4:
fuera de la máscara 0,1 %, dentro 46,3 %, vista previa = aplicado. Gate: **PASS 96,6/100**
(`VERIFICACION_INDEPENDIENTE.md`).

### 3.0.6 (2026-11-02) — máscara sobre la capa equivocada y vista previa del lienzo

Caso real del usuario (proyecto `prj_mvpg4jvf2uuuw5`): pintó las dos máscaras sobre la capa
**«WhatsApp Image…»**, que queda **debajo** de la capa visible **«Resultado IA»** (el dragón). El
relleno se aplicó bien a esa capa, pero la vista previa enseñaba **solo esa capa** (la foto del
árbol), por lo que parecía que «cambió el sujeto de la imagen». Diagnóstico con datos del servidor:
el trabajo `job_6a34e7c6e947665c161bff61` devolvió el dragón en negro; la capa editada era la de
abajo. Correcciones:

1. **«Capa de la máscara: «nombre»»** en el bloque de la máscara: siempre se ve sobre qué capa se
   pinta (se actualiza al cambiar de capa).
2. **Aviso de capa tapada** antes de rellenar: si hay una capa visible por encima que cubre la zona
   pintada, se avisa y se ofrece **cancelar** (selecciona automáticamente la capa de arriba y abre
   «Capas» para pintar allí) o **rellenar la capa tapada** igualmente.
3. **Vista previa = lienzo completo** con el parche aplicado (no la capa suelta ni la imagen del
   proveedor): lo que se ve en la vista previa es exactamente lo que queda al aceptar.

Verificación local (`tools/pruebas/local-mascara-capas-uis-hoola.mjs`): aviso correcto, cancelar deja
0 trabajos y selecciona la capa de arriba, vista previa vs documento antes de aceptar **0**, vs capa
de abajo **110,07**, vs documento tras aceptar **0**, capas 2→2.

**Producción 3.0.6** (commit `4676b8ec`; `index.html` → `app.20261102h.js?v=20261102h`;
`api.php?action=state` → `version: "3.0.6-hoola"`; `g`, `f`, `d`, `c`, `.20261102` siguen 200).
Escenario real reproducido en Chrome con **1 generación** `openai-image-2-low`: dos capas (foto
abajo, dibujo opaco arriba), máscara en la de abajo →
`94-produccion-caso-capas.json`: nota «Capa de la máscara: «foto-abajo»», aviso «La máscara está en
una capa tapada» visible, vista previa vs documento antes de aceptar **0**, vs capa de abajo
**110,07**, vs documento tras aceptar **0**, capas 2→2, 0 errores. Capturas
`90-produccion-aviso-capa-tapada.png`, `91-produccion-vista-previa-lienzo.png`,
`92-produccion-vista-previa.png`. Script:
`tools/pruebas/verificar-produccion-mascara-capas-uis-hoola.mjs`.

### 3.0.7 (2026-11-02) — aviso de capa tapada sin falsos positivos

Observaciones del verificador sobre 3.0.6: (O2) el aviso miraba solo el rectángulo de la capa de
arriba, así que podía avisar con una capa transparente en esa zona; la nota de capa no se refrescaba
al renombrar. (O3) la vista previa cambiaba `layer.resourceId` mientras esperaba la imagen y no
esperaba a todas las capas.

- `capaOpacaEnPuntos()`: renderiza la capa de arriba una vez y comprueba el **alfa real** en los
  puntos pintados; capa transparente en esa zona → **no** avisa (caso probado en local: sin
  `confirmDialog` y con vista previa).
- `esperarImagenesDelDocumento()`: espera a las imágenes de todas las capas antes de componer la
  vista previa; el cambio temporal de `resourceId` pasa a ser **síncrono** (sin ventana para el
  autoguardado).
- La nota «Capa de la máscara» se actualiza también al renombrar.

### 3.0.8 (2026-11-02) — capa de la máscara OCULTA

Nuevo reporte del usuario («sigue sin funcionar») con una captura del 3.0.6/3.0.7. Diagnóstico con
los datos del servidor: en su proyecto la capa seleccionada **«Resultado IA sin fondo» estaba
oculta** (`visible:false`); la máscara y el relleno se aplicaban ahí y en el lienzo no cambiaba nada
(la capa visible es «Resultado IA»). Correcciones:

- La nota «Capa de la máscara» añade **«CAPA OCULTA»** (en rojo) cuando la capa no se ve.
- Antes de rellenar, si la capa de la máscara está oculta o con opacidad 0, se avisa y se ofrece
  **«Mostrar y rellenar»** (la muestra, la deja a opacidad 1 si hacía falta y sigue) o cancelar.
- Prueba local nueva (`local-mascara-capas-uis-hoola.mjs`, caso 4): nota «CAPA OCULTA», diálogo con
  título «La capa de la máscara está oculta», tras aceptar la capa queda visible y el relleno sigue.


**Producción 3.0.7** (commit `9a8a8db3`; `index.html` → `app.20261102i.js?v=20261102i`;
`api.php?action=state` → `version: "3.0.7-hoola"`; `h`, `g`, `f`, `d`, `c`, `.20261102` siguen 200).
Caso de capa tapada reproducido en Chrome con **1 generación** `openai-image-2-low`:
`94-produccion-caso-capas.json` → aviso correcto, vista previa vs documento antes de aceptar **0**,
vs capa de abajo **110,07**, vs documento tras aceptar **0**, capas 2→2, 0 errores. Local sin falso
positivo (capa transparente arriba): `85-caso-capas.json` (`avisoFalso:false`, `hayPreviewFalso:true`).








### Rework 3.0.2 (2026-11-02) — defectos del verificador independiente

El verificador emitió **REWORK** con un defecto Medio y dos menores en el mismo control. Corregidos
y re-verificados con banco local (proveedor simulado que reescribe toda la imagen):

| Defecto | Qué pasaba | Corrección | Medida antes → después |
|---|---|---|---|
| D1 Medio: «Invertir» roto | el proveedor editaba FUERA de lo pintado, pero la composición aplicaba el parche DENTRO: el cambio se perdía | `mascaraParaComponer()` usa la misma zona que se envió (complemento si la máscara está invertida) | pintado: 100 % → **0 %**; fuera: 0,1 % → **100 %** |
| D2 Menor: vista previa + `Escape` | al deseleccionar la capa, «Aceptar» añadía la imagen ENTERA del proveedor como capa nueva | el resultado recuerda `layerId`; si ya no hay capa objetivo no se aplica y se avisa | capas 1→2 → **1→1**; fuera de la máscara 0 % → **0,1 %** |
| D3 Menor: firma de caché | el commit decía «firma por contenido» y solo miraba estructura | la firma incluye ahora estado invertido y última coordenada (la invalidación real sigue siendo `invalidateMask()`) | comentario y firma coherentes |

Evidencia: `tools/evidencias/2026-11-02-mascara-uis/64-casos-limite.json` (corregido) y
`65-casos-limite-antes.json` (código anterior), PNG 60–63. Script:
`tools/pruebas/local-mascara-casos-uis-hoola.mjs`.


Banco: `tools/pruebas/local-mascara-uis-hoola.mjs` (sirve la app por HTTP y simula el proveedor).
Código anterior congelado en `tools/pruebas/tmp-old-uis/` para comparar (no se publica).
Evidencias: `tools/evidencias/2026-11-02-mascara-uis/`.

