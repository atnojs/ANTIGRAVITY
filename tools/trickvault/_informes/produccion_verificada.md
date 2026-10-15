# Verificación independiente de producción — TrickVault

**Fecha:** 2026-10-15, ventana 23:38–23:44 (Atlantic/Canary)
**Verificador:** agente `verifica-prod` (solo lectura; no se editó nada del repo)
**Objetivo servido:** `https://atnojs.es/apps/trickvault/`
**Comparado con:** `apps/trickvault/index.html` en `main` (HEAD = `51a8c4c`, árbol limpio para ese fichero)
**Método:** HTTP (PowerShell + Python/urllib) y lectura de ficheros. **No se lanzó Chrome ni `tools\trickvault\_run_banco.cmd`.**

---

## VEREDICTO EN UNA LÍNEA POR PUNTO

| # | Punto | Veredicto |
|---|-------|-----------|
| 1 | `index.html` servido == fichero local | **NO.** Servido 968.980 B ≠ local 970.825 B (−1.845 B / −39 líneas). El servido es **exactamente el commit `6e7468e`**, no HEAD `51a8c4c`. |
| 1b | Marcadores exigidos en el servido | **6 de 7 presentes.** Falta `function dedupeCardsByCommand` (0 apariciones). |
| 2 | `xl-moda` = 25 códigos / `xl-comidamoda` = 26 | **SÍ.** 25 y 26 exactos en `CODE_FOLDER` (1.249 entradas totales, sin claves duplicadas). |
| 3 | Imágenes por HTTP (16) | **SÍ.** 16/16 responden 200 y >10 KB en todas las rondas. |
| 3b | Contenido de las imágenes = el del repo | **SÍ (pixel-equivalente).** El CDN re-codifica los JPEG: bytes distintos, píxeles idénticos a efectos prácticos (diff media ≤ 0,76; 0,00 % de píxeles con diff > 30). |
| 4 | `catalogo.json` = 34 tarjetas, 1 `nueva`, 0 `imageUrl` | **SÍ.** 34 / 1 / 0. |
| 5 | Qué NO se ha comprobado | Ver sección final. **Lo más importante: la corrección `dedupeCardsByCommand` NO está en producción.** |

---

## 1. `index.html` servido vs. local

| comprobación | resultado | evidencia (tamaño/recuento/HTTP) |
|---|---|---|
| Descarga servida con `?cb=<ts>` | HTTP 200 | 968.980 B, sha256 `B5BD74DA…ABD3` |
| Fichero local (`apps/trickvault/index.html`) | — | 970.825 B, sha256 `1EC07834…8650`, mtime 15/10 23:36:48 |
| ¿Mismo tamaño/hash? | **NO** | −1.845 B, −39 líneas (`Compare-Object`: 41 líneas de diferencia, todas del bloque `dedupeCardsByCommand` y su llamada) |
| ¿A qué commit corresponde lo servido? | **`6e7468e`** | `git cat-file -p 6e7468e:apps/trickvault/index.html` = **968.980 B, sha256 `B5BD74DA…ABD3`** → idéntico byte a byte |
| ¿Coincide con HEAD `51a8c4c`? | NO | HEAD = 970.825 B, sha256 `1EC07834…8650` |
| `Last-Modified` del servido | 15/10 **22:37:34 GMT** (23:37:34 local) | Commit `6e7468e` = 23:35:29 local; commit `51a8c4c` = **23:37:48 local** (posterior al Last-Modified) |
| Reintentos de descarga | 4 (23:38, 23:40, 23:43, 23:44) | Siempre 968.980 B / `B5BD74DA…`, siempre `Last-Modified 22:37:34 GMT` |
| Intento de saltar caché del CDN | 7 variantes de URL | `index.html`, `?x=1`, `apps//trickvault/`, `./index.html`, `index%2Ehtml`, `www.atnojs.es/…`, `/trickvault/?cb=zz` → **las 7 devuelven 968.980 B idénticos** (`Server: hcdn` en todas) |

**Conclusión 1:** producción sirve el commit **`6e7468e`** («las tarjetas repetidas… eran fantasmas del navegador»); el commit **`51a8c4c`** («deduplicar por codigo+prompt al cargar») **no está en el aire** ~6,5 min después de su commit (23:37:48 → última comprobación 23:44:11).

### Marcadores buscados en el fichero servido

| comprobación | resultado | evidencia (recuento / literal) |
|---|---|---|
| `id: 'xl-moda'` | **1** ✅ | `{ id: 'xl-moda', label: 'Moda', icon: '👗', color: 'pink', bgIcon: '💄' }` |
| `label: 'Comida'` | **1** ✅ | `{ id: 'xl-comidamoda', label: 'Comida', icon: '🍽️', color: 'amber', bgIcon: '🍰' }` |
| `FOLDERS_SCHEMA_VERSION` | **= 6** ✅ | `FOLDERS_SCHEMA_VERSION = 6;` (4 apariciones del símbolo: 1 definición + 2 usos en código + 1 mención en comentario) |
| `FOLDERS_LABELS_ANTIGUOS` | **2** ✅ | definición literal `const FOLDERS_LABELS_ANTIGUOS = { 'xl-comidamoda': ['Comida y moda'] };` + 1 uso |
| `function dedupeCardsByCommand` | **0** ❌ | **no existe** en el servido (sí en el local/HEAD) |
| `function mergeSeedCards` | **1** ✅ | definición + llamada `const merged = mergeSeedCards(migrated, initial);` dentro del inicializador de `useLocalStorage` |
| `fantasma de una numeración anterior` | **1** ✅ | comentario de `mergeSeedCards` |
| Coletilla reforzada | **1.104** ✅ | `with no English words: every sign, label, headline and button must be in Spanish, never in English` |
| Sello `?v=20261015-sujeto-unico` (sin sufijo) | **162** | p. ej. `assets/luz-camara-personas/studio.jpg?v=20261015-sujeto-unico` |
| Sello `?v=20261015-sujeto-unico-2` | **2** | `assets/xl-carteles/teardown.jpg`, `assets/xl-estilos/4K.jpg` |
| Sello `?v=20261015-sujeto-unico-3` | **7** | `anglepack`, `brightflat`, `bts`, `highkey`, `lowangle`, `softlighting`, `tiltshift` (todos en `assets/luz-camara-personas/`) |
| Total sellos «sujeto-unico» | **171** | 162 + 2 + 7 |
| Otras marcas `?v=` (ajenas a esta tanda) | 5 | `app.css?v=20261007-copy-btn` + 4 en `xl-letras3d` (`?v=2` ×2, `?v=3` ×2) |
| `GENERATED_IMAGE_RELEASES` — `xl-luzcamara` | ✅ | `version: '20261015-sujeto-unico-3'` |
| `GENERATED_IMAGE_RELEASES` — `xl-comidamoda` | ✅ | `version: '20261015-sujeto-unico'` |
| `GENERATED_IMAGE_RELEASES` — `xl-estilos` | ✅ | `version: '20261015-sujeto-unico-2'` |

---

## 2. Reparto de códigos (`CODE_FOLDER`)

| comprobación | resultado | evidencia (recuento) |
|---|---|---|
| Entradas totales en `CODE_FOLDER` | 1.249 | sin claves duplicadas |
| Códigos en `xl-moda` | **25** ✅ | `/beautyclose, /crosswalkprofileeditorial, /editorial, /editorialfashion, /fabricdrape, /fashion, /fashioncontentsheet, /fashionsketch, /hairstyles, /jewelry, /lookbook, /luxurylifestyle, /makeuplook, /motionblureditorial, /nailart, /outfit, /outfitgrid, /profesión, /runway, /streetstyle, /sunglassesstryon, /swatch, /transferoutfit, /tryon, /underglasseditorial` |
| Códigos en `xl-comidamoda` | **26** ✅ | `/bakerycase, /bakerywindow, /bentobox, /cartfood, /cheesepull, /cheesestring, /cocktail, /cookingstep, /drip, /fastfoodad, /foodphoto, /halfeaten, /icedrink, /ingredientbreakdown, /ingredientexplosion, /latteart, /platebeauty, /plating, /recipecard, /saucedrip, /steamrise, /steamshot, /stepcook, /streetfood, /tablescape, /tablespread` |
| Comentario de la separación | ✅ | «Moda separada de comida (2026-10-15): «Comida y moda» mezclaba dos temas en una carpeta…» |

---

## 3. Imágenes por HTTP

Todas las muestras: **HTTP 200 y > 10 KB** en las dos rondas completas (no hubo ningún 404 ni respuesta por debajo del umbral).

| fichero | ronda 1 (23:39) | ronda 2 (23:42) | bytes en el repo | ¿píxeles = repo? |
|---|---|---|---|---|
| `assets/luz-camara-personas/highkey.jpg` | 200 · 110.240 B | 200 · 110.240 B | 107.954 B | sí (diff media 0,02 / max 9) |
| `assets/luz-camara-personas/bts.jpg` | 200 · 137.857 B | 200 · 137.857 B | 134.478 B | sí (0,02 / 9) |
| `assets/luz-camara-personas/brightflat.jpg` | 200 · 144.231 B | 200 · 210.415 B | 202.575 B | sí (0,22 / 16) |
| `assets/luz-camara-personas/anglepack.jpg` | 200 · 210.339 B | 200 · 210.339 B | 200.114 B | — |
| `assets/luz-camara-personas/softlighting.jpg` | 200 · 23.361 B | 200 · 178.024 B | 171.000 B | sí (0,03 / 10) |
| `assets/luz-camara-personas/lowangle.jpg` | 200 · 35.490 B | 200 · 228.169 B | 218.662 B | — |
| `assets/infografias/cornellnotes.jpg` | 200 · 241.364 B | 200 · 241.364 B | 231.429 B | — |
| `assets/infografias/decisiontree.jpg` | 200 · 136.906 B | 200 · 136.906 B | 130.824 B | — |
| `assets/infografias/cyclicalprocess.jpg` | 200 · 158.552 B | 200 · 158.552 B | 151.623 B | — |
| `assets/infografias/cheatsheet.jpg` | 200 · 76.948 B | 200 · 291.944 B | 280.618 B | sí (0,12 / 18) |
| `assets/infografias/fishbone.jpg` | 200 · 79.533 B | 200 · 209.067 B | 199.930 B | — |
| `assets/infografias/matrix2x2.jpg` | 200 · 209.789 B | 200 · 209.789 B | 200.448 B | — |
| `assets/infografias/funnelchart.jpg` | 200 · 177.905 B | 200 · 177.905 B | 170.327 B | — |
| `assets/infografias/pyramidchart.jpg` | 200 · 62.607 B | 200 · 178.688 B | 171.015 B | — |
| `assets/comida-moda/fastfoodad.jpg` | 200 · 71.097 B | 200 · 252.525 B | 243.511 B | sí (0,76 / 35; 0,001 % >30) |
| `assets/xl-carteles/pixelart.jpg` | 200 · 191.806 B | 200 · 191.806 B | 187.215 B | — |
| **Resumen** | **16/16 OK** | **16/16 OK** | — | — |

### Sobre la diferencia de bytes servido↔repo (importante, no es un fallo de la tanda)

- Los bytes servidos **nunca** coinciden con el fichero del repo — tampoco en carpetas **sin** bump de release (`assets/xl-dev/appicons.jpg`, `assets/xl-camararetrato/abreojos.jpg`, `assets/xl-efectosempaque/aluminum.jpg`, `assets/xl-ilustracion/3dicon.jpg`): control negativo que descarta que sea un cambio de contenido.
- La comparación **por píxeles** (Pillow) sí coincide: diferencias medias 0,02–0,76 sobre 255, máximas 9–39, **0,00 %** de píxeles con diferencia > 30. Es **re-codificación JPEG del CDN (`Server: hcdn`)**, no otra imagen.
- Entre las 23:39 y las 23:43 el CDN sirvió **variantes de distinto tamaño para la misma URL** (p. ej. `cheatsheet.jpg` 76.948 B → 291.944 B; `highkey.jpg` 110.240 B → 15.838 B en una descarga suelta). A partir de las 23:43 se estabilizó (5/5 descargas idénticas por fichero). Conclusión: hay **nodos de CDN con versiones distintas en caché**; a efectos de contenido las variantes son la misma foto.
- Efecto colateral verificado en un fichero de texto: `app.css` servido = 43.260 B (LF) = blob de `6e7468e` = blob de HEAD; el fichero de trabajo tiene 44.862 B por CRLF. **No es una discrepancia real.**

### Verificación visual del sujeto (`a young woman with curly dark hair`)

Descargadas del servidor y vistas (no estaban en el HTML: «curly», «dark hair», «young woman» aparecen **0 veces** en `index.html`; el sujeto vive en `tools/trickvault/_lanzar_luz_ingles.py`, `_plan_sujeto_unico.py`, `_sujetos_xl-luzcamara.json`):

- `highkey.jpg` servido: chica joven de pelo oscuro rizado, luz alta, texto en pantalla **en español** («CUIDA TU PIEL, SIEMPRE», «RUTINA DE CUIDADO FACIAL», «LIMPIA / EXFOLIA / HIDRATA / PROTEGE»). ✅ sujeto y ✅ sin inglés.
- `bts.jpg` servido: chica joven de pelo oscuro rizado en un rodaje, claqueta y carteles **en español** («PLAN DEL DÍA», «LUZ PRINCIPAL SUAVE», «EQUIPO DE PRODUCCIÓN», «AGUA PARA EL EQUIPO»). ✅ sujeto y ✅ sin inglés.

---

## 4. `catalogo.json` servido

| comprobación | resultado | evidencia |
|---|---|---|
| Descarga | HTTP 200 | 9.600 B, `application/json; charset=UTF-8` |
| Claves raíz | — | `version, tarjetas, nuevas, borradas, orden, actualizado` |
| Nº de tarjetas | **34** ✅ | `len(tarjetas) == 34` (`version: 1`, `borradas: 0`, `orden: 2`, `actualizado: 2026-10-08T17:35:47+00:00`) |
| Tarjetas nuevas | **1** ✅ | `nuevas` = 1 elemento (`title: "/Mercury"`, categoría `xl-carteles`) |
| `imageUrl` dentro de `tarjetas` | **0** ✅ | 0 tarjetas con `imageUrl`; el único `"imageUrl"` del fichero está en `nuevas[0]` → `uploads/example_muzrldq0pyjtdj8fe_e7ecf5db34d3.webp` |

---

## 5. QUÉ NO HE COMPROBADO (sin adornos)

1. **No he abierto la app en un navegador.** Estaba prohibido lanzar Chrome/`_run_banco.cmd`. Por tanto **no** he probado: que la carpeta «Moda» aparezca bien en la UI, que `mergeSeedCards`/`dedupeCardsByCommand` limpien de verdad los duplicados en «Comandos de texto», ni nada que dependa de `localStorage`, clics o recargas.
2. **El arreglo de duplicados está a medias en producción:** `mergeSeedCards` sí; `dedupeCardsByCommand` **no** (0 apariciones). El segundo commit (`51a8c4c`) no ha llegado al aire en ~6,5 min.
3. **No puedo descartar** que `hcdn` esté sirviendo una copia cacheada mientras el origen ya tiene `51a8c4c`: las 7 variantes de URL que probé pasan todas por `hcdn`. Lo que sí es un hecho medido: **lo que se sirve ahora mismo es `6e7468e`** (4 descargas en 6 minutos, mismo `Last-Modified`).
4. **No he verificado los 1.104 prompts uno a uno**: solo el recuento exacto de la coletilla (1.104) y el de sellos.
5. **No he verificado las 59/60 imágenes de `xl-luzcamara` una por una**: 6 por HTTP y 2 visualmente.
6. **No he verificado la UI contra `CODE_FOLDER`**: el 25/26 sale del mapa estático, no de contar tarjetas renderizadas.
7. **No he verificado el contenido de las 8 infografías** más allá de HTTP 200 + tamaño + JPEG válido.
8. **No he tocado nada**: solo lectura. El único fichero que he escrito es este informe.
9. El repo **no está limpio del todo** (`M tools/trickvault/_xl-retroedu.json` y muchos ficheros sin seguimiento), pero `apps/trickvault/index.html` sí está limpio y coincide con HEAD.

---

## Anexo — evidencias brutas

```
servido : 968980 B  sha256 B5BD74DAEDCDD8EB7D0D674C4EB32B9286656097C6C2BCDCF2655B61B204ABD3
6e7468e : 968980 B  sha256 B5BD74DAEDCDD8EB7D0D674C4EB32B9286656097C6C2BCDCF2655B61B204ABD3  <-- IDENTICO
local   : 970825 B  sha256 1EC07834E0BAF51FFCD1BCD277E18EADD801B8FB81F85B8CF30215BC1ABA8650  (= HEAD 51a8c4c)
276a1fd : 967581 B  8524da6 : 879892 B  0a8403b : 879820 B   (ninguno coincide)
Last-Modified servido: Thu, 15 Oct 2026 22:37:34 GMT
commits: 6e7468e 23:35:29 | 9737f49 23:36:15 | 51a8c4c 23:37:48  (local, +0100)
git: HEAD == origin/main == 51a8c4c ; git log origin/main..HEAD vacio
51a8c4c toca: apps/trickvault/index.html (+40/-1), tools/trickvault/_ampliar_fantasmas.py, _banco/_fantasmas.html, _enganchar_dedupe.py
```
