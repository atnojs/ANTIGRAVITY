# Verificación de «xl-carteles» — solo el zorro rojo

- **Fecha:** 2026-10-16 15:0x–15:2x (Atlantic/Canary)
- **Carpeta verificada:** `apps/trickvault/assets/xl-carteles/` — **49 tarjetas**, 49 ficheros de imagen (coinciden 1:1)
- **Sujeto exigido:** «a red fox» (el zorro rojo)
- **Verificador:** teammate `revisa-carteles` (solo lectura; no ha editado `apps/` ni HTML)
- **Método:** tira de contacto + zoom con la herramienta de imágenes, OCR nativo de Windows
  (`Windows.Media.Ocr`) sobre los 49 ficheros locales, y análisis de `tarjetas_de()`/`PROMPTS`/`SEED_IMAGES`.

## 1. Recuento

| Resultado | Tarjetas |
|---|---|
| **Zorro rojo (pelaje rojizo/naranja)** | **48** |
| **NO es el zorro rojo** | **1** |
| Total | 49 |

**La única tarjeta que falla es `/chromemetal`.**

Matiz honesto, para que el dato no se lea de más: de las 48 que sí son el zorro rojo,
**47 lo son sin reservas**. La 48.ª (`/yearbook90s`) es un zorro rojo con un ligero tinte
azulado/morado en el fondo, pero el pelaje sigue siendo rojizo, así que la cuento como
acierto. Y la que falla (`/chromemetal`) **sí es un zorro anatómicamente**, pero está
**cromado**: gris plata uniforme, sin información de color de pelaje. Como el encargo es
«deja solo al zorro rojo», se clasifica como **NO cumple**; si el criterio aceptase
«cualquier zorro», sería 49/49.

## 2. La que NO es el zorro rojo

| Código | Fichero | Qué se ve realmente |
|---|---|---|
| `/chromemetal` | `chromemetal.jpg` | Escultura/foto de un **zorro en cromo pulido** (superficie metálica especular gris-plata, reflejos de estudio). La anatomía es de zorro, pero **no hay pelaje rojizo**: es monocromo plata. Rótulo en español: «ZORRO ROJO · EDICIÓN LIMITADA». |

### Evidencia de `/chromemetal`

- **Zoom de la tarjeta sola** (`_revision/SUJETOS/ZOOM_xl-carteles.png`, 1500×346): silueta de
  zorro sentado, orejas y cola de zorro, acabado **cromado/plata** con reflejo lateral.
- **mtime del fichero:** `2026-10-15 20:36:48`. Es decir: **no está entre las 10 que el Lead
  regeneró hoy a las 15:08:44**, así que arrastra el sujeto de una tanda anterior.
- **No tiene entrada en `_sujetos_xl-carteles.json`** (el fichero que inyecta «a red fox»),
  por lo que su imagen es la semilla antigua.

## 3. Verificación de las 10 tarjetas regeneradas (las que anunció el Lead)

Las 10 tienen mtime `2026-10-16 15:08:44`, el mismo instante que `_sujetos_xl-carteles.json`
(15:08:44). **Las 10 muestran el zorro rojo** y con texto español:

| Código | Fichero | mtime | Sujeto visible | Veredicto |
|---|---|---|---|---|
| `/crosssection` | crosssection.jpg | 15:08:44 | Zorro rojo, corte anatómico | ✅ |
| `/knolling` | knolling.jpg | 15:08:44 | Zorro rojo despiezado | ✅ |
| `/magazinecover` | magazinecover.jpg | 15:08:44 | Zorro rojo, portada «EL ZORRO ROJO» | ✅ |
| `/minime` | minime.jpg | 15:08:44 | Zorro rojo, figura de colección | ✅ |
| `/movieposter` | movieposter.jpg | 15:08:44 | Zorro rojo, cartel de cine | ✅ |
| `/polaroid` | polaroid.jpg | 15:08:44 | Zorro rojo, foto instantánea | ✅ |
| `/statue` | statue.jpg | 15:08:44 | Zorro rojo, estatua neoclásica | ✅ |
| `/timelineboard` | timelineboard.jpg | 15:08:44 | Zorro rojo, tablero de marca | ✅ |
| `/monogram` | monogram.jpg | 15:08:44 | Zorro rojo, monograma «ZR» | ✅ |
| `/yearbook90s` | yearbook90s.jpg | 15:08:44 | Zorro rojo, anuario escolar | ✅ |

## 4. Texto: ¿hay inglés?

**No se ha encontrado ni una sola palabra inglesa en las 49 imágenes.** Todo el texto
reconocido está en español: rótulos, titulares, etiquetas, descripciones y datos.

El único candidato que salió en el barrido fue **«Adaptable»**, y es **español** (válido en
ambos idiomas). Aparece en:

| Fichero | Contexto OCR |
|---|---|
| `holographiccard.jpg` | «Astuto • **Adaptable** • Resiliente» |
| `pixelart.jpg` | «Astuto y **adaptable**, el zorro rojo es conocido…» |
| `scroll.jpg` | «…inteligente y **adaptable**, conocido por su inteligencia…» |
| `tradingcard.jpg` | «Astuto • Ágil • **Adaptable**» |

Otras palabras que el barrido descartó por ser español legítimo: «premium» (EDICIÓN PREMIUM),
«natural»/«naturaleza», «especial», «instinto», «salvaje», «rpm» (unidad). Los rótulos
extranjeros típicos (SALE, NEW, OPEN, THE, AND…) **no aparecen**.

> Nota de alcance: el OCR es óptico y sobre texto pequeño/estilizado produce ruido
> (`D/VERS/ÕN` por «DIVERSIÓN», `SORRO ROÜo` por «ZORRO ROJO», `Moscocos` por «MÚSCULOS»).
> Ese ruido son errores de lectura del OCR, **no** texto inglés en la imagen.

## 5. Duplicados

**No hay duplicados.** Comprobado por cinco vías independientes:

| Comprobación | Resultado |
|---|---|
| Códigos repetidos | 49 códigos, **49 únicos**, 0 duplicados |
| IDs de catálogo repetidos | 49 ids, **49 únicos**, 0 duplicados |
| `PROMPTS` con el mismo texto dos veces | **0** |
| Plantillas de prompt idénticas tras normalizar el sujeto | **0** |
| Imágenes con el **mismo SHA-256** (bytes idénticos) | **0** |

Ninguna tarjeta comparte ni el código, ni el id, ni el prompt, ni los bytes de la imagen.

## 6. Observaciones de proceso (sin maquillar)

1. **`/chromemetal` es el único fallo**, y es de una tanda anterior (15/10 20:36), no de la
   regeneración de hoy. Si el criterio es «solo el zorro rojo», hay que rehacerlo pidiendo
   explícitamente pelaje rojizo (el prompt de estilo «chrome metal» empuja hacia el cromo).
2. **16 de las 49 tarjetas no tienen entrada en `_sujetos_xl-carteles.json`**
   (`/banner`, `/coatofarms`, `/coin`, `/currency`, `/emblem`, `/emoji`, `/invitation`,
   `/mangacover`, `/mapscroll`, `/monogram`, `/museumplaque`, `/playingcard`, `/quotes`,
   `/scroll`, `/securitycam`, `/zine`). No es un fallo visual —las 16 muestran el zorro
   rojo, comprobado en la tira y en el zoom— pero significa que su sujeto **no está
   garantizado por configuración**: dependen de la imagen semilla congelada. Si algún día
   se regeneran, saldrían sin sujeto zorro (el generador lanza `FALTA SUJETO`).
3. **Discrepancia de datos detectada y acotada.** El fichero de sujetos tiene **37**
   entradas, no 49. El desglose exacto es:
   - **33** entradas corresponden a tarjetas de esta carpeta: **32** son «a red fox» y
     **1 no lo es** → `ig-dcek-565` = `'a teenage boy with braces and a bowl cut'`
     (excepción declarada en `_excepciones_xl-carteles.json`).
   - **4** entradas **no pertenecen a esta carpeta**: `ig-dcek-371`, `ig-dcek-374`,
     `ig-dcek-561` (los tres «a red fox») e `ig-dcek-534` = `'ORIGEN, a specialty coffee
     brand'`. Es decir, el sujeto «marca de café ORIGEN» que aparece en el fichero
     **no afecta a `xl-carteles`**: esa tarjeta es de otra carpeta.
   - Cuadre: **16 sin entrada + 33 con entrada = 49 tarjetas**.
   - **`ig-dcek-565` (`/holographiccard`) sí es de esta carpeta y su sujeto configurado es
     un adolescente, no un zorro.** En la imagen se ve un zorro rojo, así que el resultado
     visual es correcto, pero **la configuración de esa tarjeta apunta a otro sujeto** y una
     futura regeneración la rompería.
4. `/monogram` está entre las 16 sin entrada, pese a haberse regenerado hoy a las 15:08:44:
   su imagen nueva sí es el zorro rojo, pero su sujeto se toma de la pista de ejemplo, no de
   `_sujetos_xl-carteles.json`.
5. **Cobertura de fuentes:** la tira (`SEED_IMAGES` + `CODE_FOLDER`) y el catálogo
   (`tarjetas_de('xl-carteles')`) dan **exactamente las mismas 49 tarjetas**, sin elementos
   solo-en-una ni solo-en-otra.
6. **Estado git (informativo, fuera de mi alcance de escritura):** `HEAD` =
   `4f5914a fix(trickvault): en «Carteles y materiales» solo el zorro rojo`;
   `git log origin/main..HEAD` está **vacío** (nada sin subir) y
   `git status --porcelain apps/trickvault/assets/xl-carteles` está **limpio** (0 ficheros).
   El working tree sí tiene 281 entradas modificadas en total, **fuera** de esa carpeta.
   Mi informe queda como fichero nuevo sin seguimiento (`??`); **no lo he commiteado**
   porque publicar es tarea del Lead.

## 7. Artefactos de esta verificación

| Artefacto | Ruta |
|---|---|
| Tira de la carpeta (49 tarjetas) | `tools/trickvault/_revision/SUJETOS/CARPETA_xl-carteles.png` |
| Zoom de dudosas y regeneradas | `tools/trickvault/_revision/SUJETOS/ZOOM_xl-carteles.png` |
| OCR crudo de los 49 ficheros | `tools/trickvault/_tmp_ocr.txt` |
| Fechas de modificación de los 49 ficheros | `tools/trickvault/_tmp_mtimes.txt` |

## 8. Conclusión

El encargo «deja solo al zorro rojo» está cumplido en **48 de 49** tarjetas.

- **Falla 1 tarjeta: `/chromemetal`** (zorro cromado/plata, sin pelaje rojizo). No es de la
  regeneración de hoy.
- **Texto: todo en español**, 0 palabras inglesas en las 49 imágenes.
- **Duplicados: ninguno** (código, id, prompt, plantilla y bytes).
- **Las 10 tarjetas que el Lead regeneró hoy están correctas** (zorro rojo + texto español),
  y sus mtime (15:08:44) y el commit `4f5914a` ya publicado cuadran.
- **Riesgo para futuras regeneraciones (no es fallo visual de hoy):** `/holographiccard`
  (`ig-dcek-565`) tiene como sujeto configurado «a teenage boy with braces and a bowl cut»,
  no un zorro; y 16 tarjetas no tienen sujeto configurado. Hoy las 49 se ven bien, pero esa
  configuración no protegería una nueva tanda.

**Veredicto: 48/49 correctas. Hay que rehacer `/chromemetal`.**
