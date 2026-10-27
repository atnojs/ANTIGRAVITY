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
