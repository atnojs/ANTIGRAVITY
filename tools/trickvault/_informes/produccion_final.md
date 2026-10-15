# Verificación final de producción — TrickVault «Comida y moda» → «Comida» + «Moda»

- **Verificador:** `verifica-final` (independiente, solo lectura del repo)
- **Fecha/hora de la verificación:** 2026-10-16 00:10–00:14 (+01:00, Atlantic/Canary)
- **Commit a verificar:** `d81914c` — «fix(trickvault): que la carpeta Moda aparezca tambien en un navegador que ya tenia tarjetas»
- **Estado git:** `HEAD = origin/main = d81914cdd145a3d2bd8b7325ac1b1f694a504bb2`; `git log origin/main..HEAD` **vacío** (push hecho); `git status --porcelain -- apps/trickvault` **vacío** (ficheros de la app sin cambios pendientes)
- **URL verificada:** `https://atnojs.es/apps/trickvault/`
- **Método:** peticiones HTTP por Python/`urllib` (sin caché) + lectura de ficheros + `git cat-file`. **NO se ha lanzado Chrome ni `tools\trickvault\_run_banco*.cmd`** (prohibido: otro proceso usaba ese perfil).

---

## Tabla de comprobaciones

| Comprobación | Resultado | Evidencia |
|---|---|---|
| **1.** `index.html` servido == local `apps/trickvault/index.html` (mismo tamaño en bytes) | **CUMPLE** | Servido: `HTTP 200`, **971.867 B**, `sha256 b0dd0cab6da23041c28fe94ea85316fd1464e480272ed44591fb80372cccf724`. Local: **971.867 B**, mismo `sha256`. `Last-Modified: Thu, 15 Oct 2026 23:13:00 GMT`, `ETag: W/"ed45b-6ad15dfc-..."`. Es byte a byte el blob de `d81914c`. ⚠️ Ver nota A (a las 00:10:48 aún servía la versión anterior). |
| **2a.** `id: 'xl-moda'` — 1 vez en el fichero servido | **CUMPLE** | Conteo exacto sobre el HTML servido: `1`. Definición hallada: `{ id: 'xl-moda', label: 'Moda', icon: '👗', color: 'pink', bgIcon: '💄' }` |
| **2b.** `label: 'Comida'` — 1 vez | **CUMPLE** | Conteo exacto: `1`. Definición: `{ id: 'xl-comidamoda', label: 'Comida', icon: '🍽️', color: 'amber', bgIcon: '🍰' }` |
| **2c.** `FOLDERS_SCHEMA_VERSION = 6` | **CUMPLE** | 1 ocurrencia, línea 104 del fichero servido |
| **2d.** `'xl-comidamoda': ['Comida y moda']` en `FOLDERS_LABELS_ANTIGUOS` | **CUMPLE** | 1 ocurrencia, línea 107: `const FOLDERS_LABELS_ANTIGUOS = { 'xl-comidamoda': ['Comida y moda'] };` |
| **2e.** `function dedupeCardsByCommand` | **CUMPLE** | 1 ocurrencia en el fichero servido |
| **2f.** `function mergeSeedCards` | **CUMPLE** | 1 ocurrencia en el fichero servido |
| **2g.** 25 entradas de `CATEGORY_MOVES` que apuntan a `'xl-moda'` | **CUMPLE** | `CATEGORY_MOVES` (línea 3504) tiene **26 entradas**: **25 → `'xl-moda'`** + 1 → `'xl-letras3d'` (`/patternfill`). Los 25: `/transferoutfit`, `/profesión`, `/editorial`, `/fashion`, `/streetstyle`, `/hairstyles`, `/sunglassesstryon`, `/lookbook`, `/editorialfashion`, `/runway`, `/outfitgrid`, `/makeuplook`, `/swatch`, `/beautyclose`, `/nailart`, `/jewelry`, `/tryon`, `/fashionsketch`, `/fabricdrape`, `/outfit`, `/underglasseditorial`, `/crosswalkprofileeditorial`, `/fashioncontentsheet`, `/motionblureditorial`, `/luxurylifestyle`. ⚠️ Ver nota A (en el primer fetch eran **0**) |
| **3a.** `CODE_FOLDER` servido: códigos en `xl-moda` = 25 | **CUMPLE** | **25** (esperado 25). `CODE_FOLDER` tiene 1.249 entradas repartidas en 23 carpetas |
| **3b.** `CODE_FOLDER` servido: códigos en `xl-comidamoda` = 26 | **CUMPLE** | **26** (esperado 26) |
| **3c.** Ningún código de moda (ropa/estilismo/belleza/joyería) sigue en `xl-comidamoda` | **CUMPLE** | Los 26 códigos de `xl-comidamoda` son: `/bakerycase`, `/bakerywindow`, `/bentobox`, `/cartfood`, `/cheesepull`, `/cheesestring`, `/cocktail`, `/cookingstep`, `/drip`, `/fastfoodad`, `/foodphoto`, `/halfeaten`, `/icedrink`, `/ingredientbreakdown`, `/ingredientexplosion`, `/latteart`, `/platebeauty`, `/plating`, `/recipecard`, `/saucedrip`, `/steamrise`, `/steamshot`, `/stepcook`, `/streetfood`, `/tablescape`, `/tablespread`. **Ninguno** de los códigos de moda citados (`/fashion`, `/runway`, `/makeuplook`, `/jewelry`, `/nailart`, `/beautyclose`, `/swatch`, `/lookbook`, `/outfit`, …) está ahí. El único candidato que salta por nombre, **`/platebeauty`, es comida**: su imagen `assets/comida-moda/platebeauty.jpg` es una tarta de chocolate rotulada en español («BIZCOCHO DE CACAO», «GLASEADO DE CHOCOLATE», «CREMA DE CHOCOLATE»), verificado a ojo. Y en sentido inverso: **0** códigos de comida quedan en `xl-moda` |
| **4a.** `catalogo.json` servido: claves de primer nivel (9) | **CUMPLE** | `version`=1, `tarjetas` (dict 35), `nuevas` (list 1), `borradas` (list 0), `orden` (dict 21), `listaCarpetas` (list 23), `ordenCarpetas` (list 24), `carpetasBorradas` (list 0), `actualizado`="2026-10-15T22:55:01+00:00" |
| **4b.** `tarjetas` = 35 | **CUMPLE** | 35 entradas, mismas claves que el fichero local |
| **4c.** `nuevas` = 1 | **CUMPLE** | 1 entrada: `title=/Mercury`, `category=xl-carteles`, `codeSnippet=""`, imagen `uploads/example_muzrldq0pyjtdj8fe_e7ecf5db34d3.webp` |
| **4d.** Ninguna entrada de `tarjetas` con `category` distinta de la carpeta real de su código; la única con `category` debe ser `ig-dcek-561` → `xl-moda` | **CUMPLE** | Exactamente **1** entrada de `tarjetas` con `category`: `ig-dcek-561` = `{"category": "xl-moda"}` → **`xl-moda`**, el valor esperado. Las otras 28 entradas con contenido no llevan `category` (no se puede desajustar). Detalle del «código real» en nota C: la tarjeta no lleva `codeSnippet`, su código es `/luxurylifestyle` y `CODE_FOLDER['/luxurylifestyle'] = 'xl-moda'` → **coherente** |
| **4e.** ¿Alguna entrada de `tarjetas` es lista vacía `[]`? | **CUMPLE (dato)** | **Sí, 6**: `cap-cmd-111`, `cap-cmd-109`, `cap-cmd-110`, `xl-cmd-053`, `xl-cmd-055`, `xl-cmd-060`. Son restos de publicaciones anteriores (idénticos en servido y local) |
| **5.** HTTP 200 y >10 KB en las 8 imágenes de muestra | **CUMPLE 8/8** | Ver tabla de imágenes abajo |
| **6.** OCR nativo: sin texto en inglés en esas 8 | **CUMPLE PARCIAL** | 7 de 8 sin inglés. **`pixelart.jpg` contiene la palabra inglesa `IDLE`** (fila «ANIMACIONES»: IDLE / CAMINAR / CORRER / ATACAR), confirmada a ojo sobre la imagen. Anglicismos además: `VINTAGE` (cheatsheet, cornellnotes), `CHECKLIST` (cheatsheet), `LOOK` (bts). ⚠️ Ver nota B: en `highkey.jpg` el OCR devolvió **vacío** pero la imagen **sí** tiene texto (español). Texto OCR completo en el apéndice |

---

## 5. Imágenes de muestra por HTTP

| Ruta (bajo `https://atnojs.es/apps/trickvault/`) | HTTP | Bytes servidos | Content-Type | Bytes locales |
|---|---|---|---|---|
| `assets/luz-camara-personas/highkey.jpg` | 200 | 110.240 | image/jpeg | 107.954 |
| `assets/luz-camara-personas/bts.jpg` | 200 | 136.640 | image/jpeg | 134.478 |
| `assets/luz-camara-personas/brightflat.jpg` | 200 | 144.231 | image/jpeg | 202.575 |
| `assets/luz-camara-personas/studio.jpg` | 200 | **17.873** | image/jpeg | 141.094 |
| `assets/infografias/cheatsheet.jpg` | 200 | 76.948 | image/jpeg | 280.618 |
| `assets/infografias/cornellnotes.jpg` | 200 | 89.275 | image/jpeg | 231.429 |
| `assets/comida-moda/fastfoodad.jpg` | 200 | 71.097 | image/jpeg | 243.511 |
| `assets/xl-carteles/pixelart.jpg` | 200 | 191.806 | image/jpeg | 187.215 |

**8/8 cumplen `HTTP 200` y `> 10 KB`.** El más justo es `studio.jpg` con 17.873 B (el CDN re-codifica el JPEG, por eso los tamaños servidos no coinciden con los locales; de ahí que el OCR se hiciera sobre los ficheros locales, como pedías).

---

## Notas (matices y cosas que no cuadran al 100 %)

### Nota A — El primer fetch NO coincidía: el despliegue llegó ~2 min 50 s tarde
No es un defecto del commit, pero conviene saberlo porque cualquiera que mirara un minuto antes veía la versión vieja:

| Momento (hora local +01:00) | `index.html` servido | `catalogo.json` servido | Commit que correspondía |
|---|---|---|---|
| **00:10:48** (38 s después del commit) | 970.825 B, `sha256 1ec07834…` | 43.692 B, `sha256 962e19c3…` | `index.html` = `51a8c4c`; `catalogo.json` = `9ccc586` (**una publicación por detrás de `d81914c`**) |
| **00:13:36** (re-fetch) | **971.867 B**, `sha256 b0dd0cab…` | **35.170 B**, `sha256 e7ac23d8…` | **`d81914c`** (coincide con el blob de git) |

En el primer fetch faltaba **exactamente** el delta de `d81914c`: el bloque de 13 líneas de `CATEGORY_MOVES` (4 de comentario + las 25 entradas a `'xl-moda'`) y `ig-dcek-561.category = 'xl-moda'`. Todo lo demás (los 6 marcadores del punto 2, los 25/26 de `CODE_FOLDER`) ya estaba servido. A las 00:13:00 GMT el webhook ya había desplegado (`Last-Modified: Thu, 15 Oct 2026 23:13:00 GMT`). **Todos los resultados de la tabla corresponden al fichero de las 00:13:36, que es el que está en producción ahora.**

### Nota B — El OCR vacío no prueba ausencia de texto
`highkey.jpg` devolvió **0 caracteres**, pero la imagen **sí tiene texto en español** (gris claro sobre blanco, el OCR no lo coge): «CUIDA TU PIEL, SIEMPRE», «Crema Hidratante con Ácido Hialurónico», «Gel Exfoliante con Partículas Naturales», «Limpiador Facial», «RUTINA DE CUIDADO FACIAL — LIMPIA / EXFOLIA / HIDRATA / PROTEGE», «Tu piel, tu mejor versión». Lo he comprobado abriendo la imagen. En esa imagen **no hay inglés**. Igual con `fastfoodad.jpg`: el OCR solo sacó `NON.` (ruido de los adornos), pero la imagen es 100 % española («TENTACIÓN DE CHOCOLATE», «IRRESISTIBLEMENTE DELICIOSA», «INGREDIENTES DE CALIDAD», «¡PÍDELA AHORA!»).

### Nota C — El «código real» de `ig-dcek-561`
Esa tarjeta del catálogo servido es literalmente `{"category": "xl-moda"}`: **no lleva `codeSnippet`**, así que su carpeta no se puede deducir de `CODE_FOLDER` a partir del propio JSON. Su código es `/luxurylifestyle` (evidencia: `tools/trickvault/_volcado.html` línea 598 → `ig-dcek-561 | /luxurylifestyle | assets/comida-moda/luxurylifestyle.jpg`; y `tools/trickvault/_moda2.html` línea 17 → `xl-moda | /luxurylifestyle | ig-dcek-561`, frente a `tools/trickvault/_moda.html` que aún decía `xl-comidamoda`). Y `CODE_FOLDER['/luxurylifestyle'] = 'xl-moda'`. Por tanto el `category` servido es el correcto.

### Nota D — `catalogo.json`: por qué los bytes del fichero de trabajo no son los servidos
El fichero de trabajo `apps/trickvault/catalogo.json` tiene **36.659 B** (CRLF) mientras que el servido tiene **35.170 B** (LF). Normalizado a LF, el local da **35.170 B** y `sha256 e7ac23d8…`, **idéntico** al blob de `d81914c` y al servido. La diferencia de 1.489 B son **solo los finales de línea** (1.489 `CRLF` en la copia de trabajo). Contenido: igual. (`index.html` no tiene CRLF, por eso ahí los bytes coinciden exactamente.)

### Nota E — Fuera del alcance pedido, pero anotado
- `nuevas[0]` (`/Mercury`) lleva `category: "xl-carteles"` con `codeSnippet: ""`. Es una entrada de `nuevas`, no de `tarjetas`, así que no entra en el punto 4d; lo dejo dicho porque es el mismo patrón que `ig-dcek-561`.
- Los 51 códigos de las dos carpetas (26 + 25) tienen su `.jpg` en `apps/trickvault/assets/comida-moda/` (51 ficheros en total, **0 sin imagen**). No existe ninguna carpeta `assets/xl-moda/` ni `assets/xl-comidamoda/`.
- `brightflat.jpg` (carpeta `luz-camara-personas`) muestra un anuncio de comida saludable y `studio.jpg` un anuncio de vestido: son las imágenes que la app usa para esos códigos, no texto en inglés. Lo señalo por si el reparto de imágenes por carpeta es lo siguiente que quieres revisar.
- 3 ficheros de `tools/trickvault/_banco/` (`_fantasmas.html`, `_migracion.html`, `_moda.html`) aparecen modificados sin commitear en el árbol de trabajo, más `Capturas.xlsx` y varios `tools/…` sin trackear. **No afectan a la app desplegada** (`git status -- apps/trickvault` está limpio), pero están ahí.

---

## Lo que NO he podido comprobar

1. **Comportamiento real en navegador.** Estaba prohibido lanzar Chrome, así que no he ejecutado la app: no he verificado en runtime que `dedupeCardsByCommand`, `mergeSeedCards` y `CATEGORY_MOVES` hagan lo que dicen (solo su **presencia, contenido y sintaxis válida** en el fichero servido), ni el `localStorage` de un navegador que ya tuviera tarjetas, ni que «Moda» aparezca de verdad en la interfaz. Eso es exactamente lo que arregla `d81914c` y **sigue sin probarse en un navegador** en esta verificación.
2. **No he probado el flujo de publicación** (`publicar.php`) ni el historial en servidor.
3. **Muestreo, no censo:** he revisado 8 de las ~1.000 imágenes y he contado las 1.249 entradas de `CODE_FOLDER` por valor, pero no he revisado una a una las imágenes del resto de carpetas.
4. **No he visto el log del webhook de Hostinger.** El despliegue lo he medido por HTTP (`Last-Modified`/contenido), no por el lado del servidor.
5. **No he verificado el resto de claves de `catalogo.json`** (`orden`, `listaCarpetas` 23, `ordenCarpetas` 24) más allá de listarlas: no he comprobado que esas 23/24 carpetas cuadren con las 23 de `CODE_FOLDER` + «Favoritos».

---

## Apéndice — Texto completo del OCR nativo de Windows

Comando: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\trickvault\_ocr.ps1 <8 rutas locales>`

```
highkey.jpg       (0 caracteres — el OCR no detecta nada; la imagen SÍ tiene texto español, ver nota B)

bts.jpg
LUZ PRINCIPAL SUAVE PLAN DEL DÍA - PRUEBAS DE LUZ - SESIÓN DE FOTOS - CAMBIOS DE LOOK - ENTREVISTA - CIERRE PROOuCClóN: stsróN OE FOTOS PLANO loga 321 GAR ciA 2a/os,'a52c

brightflat.jpg
COMIDA SALUDABLE PARA TU A Nutrición equilibrada, sabor que te encanta Ingredientes frescos y naturales Alta en proteínas Y fibra Lista en minutos, ahorra tiempo PLANES SEMANALES PERSONALIZADOS ELIGE TU PLAN Y COMIENZA HOY

studio.jpg
VESTIDO MIDI Elegancia que te acompaña siempre COLORES DISPONIBLES VERDE OLIVA BEIGE ARENA AZUL MARINO TERRACOTA CARACTERÍSTICAS TELA SUAVE Y TRANSPIRABLE Comodidad durante todo el día DISEÑO FEMENINO Y VERSÁTIL Ideal para cualquier ocasión CINTURA ELÁSTICA Se adapta a tu figura con estilo CORTE EN CAPAS Movimiento y caída natural CALIDAD GARANTIZADA Durabilidad que mereces COMPRA AHORA É' Y LUCE INCREÍBLE

cornellnotes.jpg
MÁQUINA COLUMNA DE PISTAS ¿Qué es una máquina de escribir vintage? O ¿Cómo funciona? ¿Cuándo se popularizó? ¿Cuál es su importancia? ¿Por qué sigue Siendo valorada hoy en día? DE ESCRIBIR VINTAGE COLUMNA DE NOTAS Fecha: 25 de mayo de 2024 Tema: Historia y tecn0109ia • • Dispositivo mecánico utilizado para escribir texto presionando teclas que imprimen letras sobre el papel. Cada tecla acciona una barra metálica que golpea una cinta entintada y marca el papel. Popularizada a finales del siglo XIX y principios del XX. Herramienta clave para escritores, oficinas y periodistas durante gran parte del siglo XX. Importante por su impacto en la comunicación y la productividad. Su diseño robusto y mecánico la convierte en un objeto de colección y nostalgia. Aporta una experiencia de escritura única, sin distracciones digitales. RESUMEN La máquina de escribir vintage es un invento mecánico esencial en la historia de la comunicación. Funcionó mediante un sistema de teclas y barras que imprimían caracteres sobre el papel. Alcanzó su mayor popularidad en el siglo XX, siendo fundamental en oficinas y redacciones. Hoy es valorada por su durabilidad, diseño clásico y por ofrecer una experiencia de escritura auténtica y libre de tecnología moderna.

fastfoodad.jpg
NON.        (ruido del OCR; la imagen es 100 % española, ver nota B)

pixelart.jpg
ZORRO ROJO Un mamífero astuto y ágil, conocido por su intel]igencia y su colmillo. -VIC _ PALETA DE COLORES INFORMACIÓN TIPO: BESTIA HÁBITAT: BOSQUE RARO: COMÚN ESTRDÍSTICRS SALUD: ATAQUE: DEFENSA: AGILIDAD: HRBILIDRDES ASTUCIA Aumenta la probabilidad de evadir ataques. EMBESTIDA Carga contra eI enemigo ANIMACIONES IDLE CAMINAR CORRER causando daña extra. RTRCRR
        ^^^^ «IDLE» es la única palabra en inglés literal encontrada en las 8 imágenes

cheatsheet.jpg
MÁQUINA DE ESCRIBIR VINTAGE GUÍA RÁPIDA • REFERENCIA ESENCIAL • TODO EN UNA PÁGINA SÍMBOLO DE ESCRITURA RESISTENTE Y DURADERA DISEÑO CLÁSICO ESCRITURA AUTENTICA (3 ¿QUÉ ES? escribir tuto tecla s imprinir en el mediM'te una cinta entintada. VISTA GENERAL 00000000000_ o o o c o o o c 000 0000000000 COMO USARLA Coloca papel entre rodillo y la guia. • Gira las peribas para ajustar el papel. • Escribe presionando las teclas firmemente. • Al final de la de • Para em*zar una nueva linea, presiona la palanca de retorno_ • Usa el tabulador para • Reemplaza la linea entintada cuando la impresión se vea tenue _ o o o PARTES PRINCIPALES nea de avance de linea Rodillo (cilindro) Periblas del rodillo Guia del carm Pa de retomo Ci nta entintada Segme nto y tipo Barra espac iadora Ta bul ador Base o chasis TECLAS ESPECIALES a la letras SI aqueo de las: continuas. la Espacio : inserta un MANTENIMIENTO BASICO LIMPIEZA; usa bmcha para eliminar y residuos. aplica en los puntos moviles. LIMPIA LA CINTA; ei exceso de tinta y manchas, REEMPLAZA LA CINTA: i ión de bil o ALMACENAMIENTO: o Cub PROBLEMAS COMUNES Impresión tenue la cinta O la tensión. Teclas a tascadas Limpia y Lineas de Ajusta el rodilio y guias Ci n ta trada Recoloca y centra la cinta. de Revisa la palanca de ESCRIBE HISTORIA Q A z O 2 w s x e CARACTERES DISPONIBLES 3 E c 4 R F V 5 T G B Y H N 8 J M 9 K O L p Ñ MÁRGENES Y TABULACIONES Ajusta los márgenes moviendo las guias del papel. POSICIONES DEL TABULADOR Para sangria rápida, presiona la tecla TABL FORMULAS Y cÁLcuOos ÚTILES CONSEJOS RÁPIDOS Escribe Con firmeza y Constante. Mantén la Cinta entintada tensa y Limpia el polvo y restos de tinta reg la Usa papel de buena calidad y alinnado. Guarda en un lugar y libre de POIVO. X ESPECIFICACIONES TiptCAS nica Tipdeimpresión._ Impacto Bicolor (negrofroio) Ancho de papel „ Hasta 33 cm Material Metal y acero Peso aprox. _ _ ._S-7kg Aho de fabricación, , . décadas 1930 - 1970 CAMBIO DE CINTA CARACTERES POR LiNEA Muge n CHECKLIST RÁPIDO Papel C OlocadO correctamente Cinta y aj y u mpios Lubricación a I dia Prueba de impresión reali Lista para PRECISIÓN ESPACIOS POR LINEA E,-c-p 1873 1890 1920 1940 1950 1970 RENDIMIENTO DE LA CINTA N, de CRONOLOGÍA BREVE Primeras máquinas comerciales. popularización en oficinas_ Producción en masa. Diseño portátil y estandarización. Auge mundial. Inicio del declive frente a la tecnologia electrónica. O O Levanta la tapa o cubierta. la cinta de cametes, Coloca la cinta asegurando el (negro a "iba), Tensa la Cinta girando IOS Carretes. Verifica que la impresión Sea DURABILIDAD PASION DATOS CURIOSOS Algunas máquinas escriben más de S millones de caracteres Sin falla. Fueron esenciales para escritores y periodistas famosos. Cada modelo tiene un diseño único y coleccionable. Hoy son piezas vintage muy valoradas. CLASICA HOY, INSPIRACION SIEMPRE
```

### Palabras inglesas / anglicismos detectados en el OCR

| Imagen | Palabra | Valoración |
|---|---|---|
| `pixelart.jpg` | **`IDLE`** | **Inglés literal**, visible en la imagen (fila «ANIMACIONES»: IDLE / CAMINAR / CORRER / ATACAR). Es el único caso claro de los 8 |
| `cheatsheet.jpg` | `VINTAGE` | Anglicismo de uso corriente (también en `cornellnotes.jpg`); no está en el DLE |
| `cheatsheet.jpg` | `CHECKLIST` | Anglicismo; el DLE prefiera «lista de comprobación» |
| `bts.jpg` | `LOOK` | Anglicismo **aceptado por el DLE** («look» = aspecto, imagen) |

*(Los textos tipo «PROOuCClóN», «TiptCAS», «RTRCRR», «ESTRDÍSTICRS», «HRBILIDRDES» son ruido de OCR sobre tipografías decorativas, no texto real.)*
