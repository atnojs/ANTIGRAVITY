# Verificación de `xl-luzcamara` (sujeto único + texto en español)

**Verificador:** `verifica-luz` (subagente de solo lectura).
**Fecha:** 2026-10-15, 23:2x (Atlantic/Canary).
**Encargo verificado:** las 59 imágenes de `apps/trickvault/assets/luz-camara-personas/`
(carpeta de catálogo `xl-luzcamara`) más 9 imágenes sueltas
(8 de `assets/infografias/` y `assets/comida-moda/fastfoodad.jpg`).
**No se ha modificado** ni el HTML ni ninguna imagen. Solo lectura + scripts de análisis en `tools/trickvault/`.

---

## 1. Resumen ejecutivo

| Comprobación | Resultado |
|---|---|
| ¿Cuántas de las 59 enseñan a la chica (mujer joven, pelo oscuro rizado)? | **59 de 59** |
| Códigos que **no cuadran** (sujeto no principal o identidad visiblemente distinta) | **6**: `/highkey`, `/anglepack`, `/softlighting`, `/lowangle`, `/tiltshift`, `/bts` |
| ¿Queda texto en inglés? | **No queda inglés funcional.** Solo 4 anglicismos de uso corriente en español: `BLOG` (colorgelset), `LOOKS` (duotoneportrait), `PREMIUM` (spinturntable), `SHAMPOO` (brightflat) |
| Duplicados (mismo fichero, mismo código, mismo prompt, o casi-duplicados visuales) | **Ninguno** |
| Hallazgo colateral | La carpeta declara **60** códigos pero solo tiene **59** imágenes: falta **`/storm`** ("Tormenta épica"), que sí está en el catálogo del HTML apuntando a `xl-luzcamara` |

---

## 2. Método y evidencia (todo reproducible)

Todo con Python/PIL y el OCR nativo de Windows. No se ha lanzado Chrome ni el banco de pruebas.

| Paso | Comando | Artefacto |
|---|---|---|
| Tira de la carpeta | `python tools\trickvault\_tira_carpeta.py xl-luzcamara 175` | `tools\trickvault\_revision\SUJETOS\CARPETA_xl-luzcamara.png` (1400x1568, 59 tarjetas) |
| Zoom legible de dudosas | `python tools\trickvault\_zoom.py xl-luzcamara <códigos...>` | `_revision\SUJETOS\ZOOM_xl-luzcamara.png` → copias `_revision\verifica_luz\zoomA…zoomF.png` |
| Zoom grande 620 px | `python tools\trickvault\_zoom_grande_verifica.py xl-luzcamara <salida> <códigos...>` | `_revision\verifica_luz\zoomA-D.png` |
| Recortes de cara comparables | `python tools\trickvault\_caras_verifica.py <salida> xl-luzcamara "<code>:x0,y0,x1,y1" …` | `_revision\verifica_luz\caras1.png` |
| OCR | `python tools\trickvault\_ocr_verifica_luz.py` (llama a `_ocr.ps1` con las 68 rutas en **una** llamada; ver §5) | `_revision\verifica_luz\ocr.tsv` + `ocr_log.txt` |
| Duplicados | `python tools\trickvault\_dup_verifica_luz.py` (SHA-256 exacto + dHash 8x8) | salida en consola |

Datos de partida comprobados (no supuestos):

* `_carpeta_lote.tarjetas_de('xl-luzcamara')` → **59** tarjetas; códigos **únicos**, rutas de fichero **únicas**, **ningún prompt repetido**.
* `_sujetos_xl-luzcamara.json` (mtime 2026-10-15 23:12) → **las 59 entradas** valen `a young woman with curly dark hair`; ninguna otra.
* `_carpeta_lote.PROMPTS` → **las 59** plantillas llevan `[OBJETO]`, así que en las 59 se inyectó ese sujeto (no hay tarjetas que se libraran por no llevar `[OBJETO]`).
* Fechas de modificación: **las 59** imágenes a `2026-10-15 23:xx`; las 8 infografías a `23:18:30` y `fastfoodad.jpg` a `23:17:18` → coherente con la regeneración del Lead.
* El HTML carga estas imágenes con cache-busting `?v=20261015-sujeto-unico` (app `apps/trickvault/index.html`, L1362 y ss.).
* Ficheros en disco = 59; catálogo = 59; no hay huérfanos ni referencias rotas **dentro de la carpeta** (ver §6 para `/storm`).

---

## 3. Sujeto: recuento y qué se ve

**59/59 imágenes tienen a una mujer joven de pelo oscuro rizado como sujeto visible.** Las 59 se han
mirado al menos a 300 px de lado (tira + 6 hojas de zoom); las 6 dudosas además a 620 px y con recorte
de cara a tamaño nativo (`caras1.png`).

### 3.1 Las 53 que cuadran sin reservas

`/35mm`, `/anamorphic`, `/backview`, `/balanced3Lightportrait`, `/beamlight`, `/bokeh`, `/brightflat`,
`/cambiahora`, `/cameramove`, `/colorgelset`, `/darkmoody`, `/darkpoint`, `/dramaticlighting`,
`/duotoneportrait`, `/dutchangle`, `/environmentalportrait`, `/extremecloseup`, `/firelight`, `/fog`,
`/gobopattern`, `/godrays`, `/goldenrim`, `/gridboard`, `/hardshadow`, `/keyframepair`,
`/lightingdiagram`, `/lighttrail`, `/longexposure`, `/lowkey`, `/mist`, `/moonlight`, `/moonlit`,
`/neon`, `/neonlights`, `/neonwash`, `/nightshot`, `/overhead`, `/rain`, `/rainynight`, `/reflection`,
`/reflectionsetup`, `/shadowplay`, `/shallowdepth`, `/shotsetup`, `/silhouette`, `/snow`, `/softglow`,
`/spinturntable`, `/startrail`, `/studio`, `/sunrise`, `/sunset`, `/volumetriclight`.

Notas de estas 53:

* `/gridboard` son 9 viñetas y `/spinturntable` 5 vistas: **en todas las viñetas sale la misma mujer**
  (comprobado a 620 px; en el caso de `/spinturntable` el pelo rizado oscuro y la cara coinciden en
  las 5 vistas).
* `/cameramove`, `/keyframepair`, `/lightingdiagram` y `/shotsetup` mezclan la **foto de ella** con
  diagramas/ Storyboard en línea: la persona protagonista de la foto es ella.
* `/extremecloseup` es un primer plano de su ojo/cara (no hay otra persona).
* `/balanced3Lightportrait`, `/hardshadow`, `/dramaticlighting`, `/colorgelset`, `/duotoneportrait`,
  `/studio`, `/goldenrim`, `/brightflat`, `/reflectionsetup`, `/softglow` son fichas/anuncios: el
  sujeto fotografiado es ella.

### 3.2 Las 6 que NO cuadran (código → qué enseña)

| Código | Qué enseña | Por qué no cuadra |
|---|---|---|
| `/highkey` | Anuncio web "Luz Natural · Tu piel, tu mejor versión" con una modelo sonriente sujetando un tarro | **Otra mujer**: piel claramente más clara, cara más redonda y rizo más cerrado/abundante que la chica del resto (comparativa en `caras1.png`, posición 2 contra la 1) |
| `/anglepack` | Ficha de producto "SUDADERA CON CAPUCHA PARA MUJER" con 6 viñetas | 4 viñetas llevan una modelo de **piel más clara y pelo más liso**; las 2 últimas (`VISTA SUPERIOR`, `VISTA INFERIOR`) son **solo la prenda**, sin persona |
| `/softlighting` | Anuncio "Nutrición y suavidad para tu cabello" con champú | Deriva de identidad visible: **piel más clara, rizo más suelto y largo** que la chica de referencia (`caras1.png`, posición 5) |
| `/lowangle` | Contrapicado callejero: ella con top blanco y vaqueros ante un cartel "TU FUTURO EMPIEZA HOY" | **Piel más clara y melena más larga/suelta**; la cara queda medio fuera del recorte y no encaja del todo |
| `/tiltshift` | Escena tilt-shift de la "Librería El Paraíso" con bici, farola y pizarra "HOY PRESENTACIÓN DE LIBRO 19:00" | La mujer **aparece diminuta, leyendo y sin rostro visible**: el sujeto que domina es la librería, no ella (recorte a tamaño nativo en `_revision\verifica_luz\crop_tiltshift.png`, donde sí se le ve el pelo rizado oscuro) |
| `/bts` | "Making of" del rodaje: 4 miembros de equipo, trípode, claqueta y monitor | El sujeto principal son **los técnicos**; a ella solo se la reconoce bien en el **monitor** del operador (recorte `crop_bts_monitor2.png`; en el monitor sí es ella, pelo rizado oscuro) |

Las tres primeras (`/highkey`, `/anglepack`, `/softlighting`) y en menor medida `/lowangle` son el
mismo problema: **deriva de identidad** en las tarjetas tipo anuncio de belleza/moda. Las otras dos
(`/tiltshift`, `/bts`) son de **encuadre**: ella está, pero no es el sujeto principal.
Si Antonio quiere "la misma chica" en sentido estricto, esas 4 (6 contando las dos de encuadre) son
las candidatas a regenerar.

---

## 4. Texto en español (OCR)

**Motor OCR:** Windows.Media.Ocr con el único reconocedor instalado en el equipo, **`es-ES`**
(comprobado con `_revision\verifica_luz\_idiomas.ps1`; no hay `en-US`, así que no se puede hacer la
doble pasada español/inglés: es una limitación real, ver §7).

**Cobertura:** las 68 imágenes en una sola llamada a `_ocr.ps1` (lote < 100). Resultado completo en
`_revision\verifica_luz\ocr.tsv`.

* **16 de las 59** de `xl-luzcamara` no tienen texto visible (fotos puras): `beamlight`, `bokeh`,
  `cambiahora`, `dutchangle`, `environmentalportrait`, `extremecloseup`, `gobopattern`, `lowangle`,
  `lowkey`, `nightshot`, `reflection`, `shadowplay`, `silhouette`, `snow`, `startrail`, `sunrise`.
  En esas no puede haber inglés.
* Las otras 43 tienen rótulos, y **todos** los rótulos legibles están en español.

### 4.1 Palabras inglesas encontradas (4, todas anglicismos asentados)

| Imagen | Palabra exacta | Contexto en la imagen |
|---|---|---|
| `luz-camara-personas/colorgelset.jpg` | `BLOG` | menú de la web "BELLEZA PURA": `NOVEDADES · MAQUILLAJE · ACCESORIOS · OFERTAS · BLOG` |
| `luz-camara-personas/duotoneportrait.jpg` | `LOOKS` | portada "VIBRA": `COLORES, TEXTURAS Y LOOKS QUE HABLAN DE TI` |
| `luz-camara-personas/spinturntable.jpg` | `PREMIUM` | sello `ACABADO PREMIUM` |
| `luz-camara-personas/brightflat.jpg` | `SHAMPOO` | etiqueta `SHAMPOO RIZOS DEFINIDOS` |

Ninguna frase, titular, botón ni etiqueta en inglés. El resto del texto detectado es español
correcto (p. ej. `ENVÍO GRATIS`, `MI CUENTA`, `CARRITO`, `BUSCAR`, `COMPRAR AHORA`,
`HAZLO TUYO AHORA`, `DIAGRAMA DE ILUMINACIÓN`, `VESTIDO MIDI`, `Rizos definidos, siempre hidratados`).

### 4.2 Las 9 imágenes sueltas: todas en español

Verificadas con OCR **y** a la vista (`info1.png`, `info2.png` y `fastfoodad.jpg` a resolución nativa):

| Imagen | Texto (resumen) | Inglés |
|---|---|---|
| `infografias/cornellnotes.jpg` | `MÁQUINA DE ESCRIBIR VINTAGE · COLUMNA DE PISTAS · COLUMNA DE NOTAS · Fecha: 25 de mayo de 2024 · RESUMEN` | no |
| `infografias/decisiontree.jpg` | `¿QUÉ MÁQUINA DE ESCRIBIR VINTAGE ES PARA TI? · ¿La usarás con frecuencia? · CONSEJO FINAL` | no (ver nota) |
| `infografias/cyclicalprocess.jpg` | `CICLO DE VIDA DE UNA MÁQUINA DE ESCRIBIR VINTAGE · FABRICACIÓN · USO · MANTENIMIENTO · RESTAURACIÓN · CONSERVACIÓN · LEGADO` | no |
| `infografias/cheatsheet.jpg` | `GUÍA RÁPIDA · REFERENCIA ESENCIAL · TODO EN UNA PÁGINA · CÓMO USARLA · PARTES PRINCIPALES · TECLAS ESPECIALES · MANTENIMIENTO BÁSICO · PROBLEMAS COMUNES · CHECKLIST RÁPIDO` | no |
| `infografias/fishbone.jpg` | `DIAGRAMA DE ISHIKAWA · ANÁLISIS CAUSA-EFECTO · MECÁNICA · LUBRICACIÓN · MATERIALES · OPERADOR · ENTORNO · MÉTODO · LEYENDA` | no |
| `infografias/matrix2x2.jpg` | `MATRIZ DE PRIORIDADES 2x2 · ALTA PRIORIDAD · PROYECTOS ESTRATÉGICOS · TAREAS RÁPIDAS · BAJA PRIORIDAD · HACER AHORA · PLANIFICAR · EVALUAR DESPUÉS` | no |
| `infografias/funnelchart.jpg` | `El Proceso de Escritura: De la Idea al Manuscrito Final · IDEA INICIAL · INVESTIGACIÓN · BORRADOR · REVISIÓN · MANUSCRITO FINAL` | no |
| `infografias/pyramidchart.jpg` | `LA MÁQUINA DE ESCRIBIR · UNA HERRAMIENTA CLÁSICA DE COMUNICACIÓN · PAPEL Y CARRITO · RODILLO Y MÁRGENES · BARRAS DE TIPOS · CINTA ENTINTADA · TECLADO · PALANCA DE RETORNO` | no |
| `comida-moda/fastfoodad.jpg` | `TENTACIÓN DE CHOCOLATE · IRRESISTIBLEMENTE DELICIOSA · CON CACAO SELECCIONADO DE ORIGEN · INGREDIENTES DE CALIDAD · TEXTURA SUAVE Y HÚMEDA · DECORADO A MANO · ¡PÍDELA AHORA!` | no |

**Nota (nombres propios, no inglés a traducir):** en `decisiontree.jpg` aparecen `REMINGTON
QUIET-RITER`, `LETTERA 32`, `HERMES BABY`, `ROYAL STANDARD`, `UNDERWOOD`, `CORONA SILENT`,
`SMITH-CORONA SUPER STERLING`, `BROTHER DELUXE 220`: son **marcas/modelos históricos de máquinas de
escribir**. Igual en `cheatsheet.jpg` (`QWERTYUIOP` = distribución del teclado) y en la UI del monitor
de `/bts` (`FPS`, `REC`, `WB 5500 K` = rótulos universales de cámara, el resto `OBTURADOR`,
`BATERÍA`, `TARJETA` está en español).

**Aviso sobre el OCR:** en las infografías el OCR devuelve palabras rotas
(`tecn0109ia`, `Vlva`, `Suvae`, `desca librados`, `recemendaú`) porque la tipografía es artística;
**son errores de lectura del OCR, no texto inglés**. En `fastfoodad.jpg` el OCR solo reconoció `NON.`
(el texto va rotado y con sombra) → por eso esa imagen se ha verificado **a la vista**, no por OCR.

---

## 5. Duplicados

* Códigos repetidos: **ninguno** (59 códigos únicos).
* Prompts repetidos: **ninguno** (59 prompts distintos; todos con `[OBJETO]` sustituido por el mismo sujeto).
* Ficheros idénticos (SHA-256): **ninguno**.
* Casi-duplicados visuales (dHash 8x8, 64 bits, los 1711 pares): **mínima distancia = 10 bits**
  (`/anglepack` ↔ `/gridboard`), muy por encima del umbral de parecido (≤ 8). Ningún par sospechoso.

---

## 6. Hallazgo colateral: falta `/storm`

La carpeta `xl-luzcamara` tiene **60 códigos** declarados en `CODE_FOLDER` (`_carpeta_lote.py`) y en el
mapa del HTML (`apps/trickvault/index.html` L150: `'/storm': 'xl-luzcamara'`), pero **solo 59
imágenes**:

* `/storm` **no está** en `SEED_IMAGES` (no tiene fichero en disco),
* **no está** en `_sujetos_xl-luzcamara.json` (por eso el generador no lo ha tocado: `generar()` aborta
  con "FALTA SUJETO" si le falta),
* su prompt **sí** lleva `[OBJETO]`.

Consecuencia: la tarjeta `/storm` ("Tormenta épica", `index.html` L842) se queda **sin imagen de
ejemplo** en la carpeta. No lo he podido comprobar en navegador (prohibido en este encargo), así que lo
dejo señalado para que el Lead decida: o se le asigna sujeto + imagen, o se saca de la carpeta.

---

## 7. Limitaciones de esta verificación

1. **No hay motor OCR en inglés** en el equipo (`AvailableRecognizerLanguages` = solo `es-ES`), así que
   no se ha podido hacer la doble pasada español/inglés. Mitigación: el motor **no traduce** (transcribe
   `BLOG`, `LOOKS`, `SHAMPOO` tal cual), y además las 9 imágenes sueltas y las 6 dudosas se han mirado
   **a la vista** a resolución nativa.
2. **No hay librería de reconocimiento facial** (`cv2`, `mediapipe`, `face_recognition`, `torch`: no
   instaladas) ni se pueden instalar en este encargo. El juicio de identidad es **visual**, con
   comparativa de caras al mismo encuadre (`caras1.png`); por eso `/softlighting` y `/lowangle` se
   reportan como "deriva" y no como "otra persona" categórica. `/highkey` sí es claramente otra cara.
3. El OCR es **una foto del texto**: no detecta texto diminuto o muy estilizado (caso `fastfoodad.jpg`).
4. No se ha abierto la app en navegador (restricción del encargo), así que no se ha comprobado cómo se
   ve el conjunto dentro de la tarjeta ni el hueco de `/storm`.

---

## 8. Veredicto

* **Sujeto único: conseguido** — 59/59 con la mujer de pelo oscuro rizado; ningún objeto, diagrama sin
  persona, paisaje ni otra persona como sujeto. Quedan **6 tarjetas a revisar** (4 por deriva de
  identidad y 2 por encuadre).
* **Español: conseguido** — no queda inglés funcional ni en las 59 ni en las 9; solo 4 anglicismos
  asentados (`BLOG`, `LOOKS`, `PREMIUM`, `SHAMPOO`) y nombres propios de modelos de máquinas de escribir.
* **Duplicados: ninguno.**
* **Pendiente detectado:** el código `/storm` de la misma carpeta sigue sin imagen.
