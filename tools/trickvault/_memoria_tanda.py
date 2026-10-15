# -*- coding: utf-8 -*-
"""Añade a tools/memoria/ lo aprendido en la tanda de TrickVault del 2026-10-15."""

import io, os, sys

sys.stdout.reconfigure(encoding='utf-8')
M = r'E:\ANTIGRAVITY\tools\memoria'


def mete(fichero, texto, tras='---\n', al_final=False):
    """Inserta `texto` tras la primera aparición de `tras` (o al final)."""
    p = os.path.join(M, fichero)
    s = io.open(p, encoding='utf-8').read()
    if al_final:
        s = s.rstrip('\n') + '\n\n' + texto.strip() + '\n'
    else:
        i = s.index(tras) + len(tras)
        s = s[:i] + '\n' + texto.strip() + '\n' + s[i:]
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('  %-18s %d KB' % (fichero, len(s) // 1024))


ERRORES = """
### [2026-10-15] «Hay tarjetas duplicadas»: no estaban en el catálogo, eran **fantasmas del navegador**

- **Síntoma:** Antonio ve varias tarjetas repetidas en «Comandos de texto». En el catálogo
  (el fichero) no hay ni un duplicado.
- **Causa:** el bloque de texto se ha **renumerado** al crecer el catálogo (`ig-dcek-NNN`
  pasa a `NNN+1`, y antes hubo saltos mayores). `mergeSeedCards` solo comparaba **el id**,
  así que la tarjeta vieja guardada en el navegador **se quedaba** y además entraba la nueva
  con el mismo código: dos tarjetas idénticas. Medido con las funciones reales de la app
  sobre 126 revisiones de git y 4 respaldos: `/story` llegaba a salir **4 veces**
  (ids 593+592+464+363); lo mismo `/brainstorm`, `/ultimate`, `/detailed`, `/pricing`.
  Peor aún: el fantasma que ocupa un id vivo **impide entrar** a la tarjeta legítima de ese id.
- **Solución:** en `mergeSeedCards`, descartar las tarjetas de catálogo cuyo id pertenece hoy
  a **otro** comando, respetando tarjetas personales, ediciones del usuario y
  `RESTORED_VARIANTS`. Se arregla solo en la siguiente recarga.
- **Lo que NO hay que hacer:** `flatMap` + `REMOVED_IMAGE_IDS` (el patrón de las tarjetas
  retiradas). Los ids fantasma son **hoy** ids vivos de otras tarjetas: apagaría entre 39 y
  120 tarjetas buenas (medido).
- **Cómo comprobarlo:** `tools/trickvault/_banco/_fantasmas.html` con el banco
  (`_run_banco.cmd`): fabrica 6 fantasmas en un navegador real y, tras recargar, deben quedar
  0 fantasmas y 0 códigos repetidos.

### [2026-10-15] El almacén de imágenes pisaba al catálogo y sus ficheros iban **desplazados**

- **Síntoma:** 235 tarjetas enseñaban la imagen de **otra** tarjeta (un perro en `/cityscape`,
  un cómic en `/nightcity`, un detective en `/polaroid`, un frasco de perfume en `/minifig`).
- **Causa:** dos problemas sumados. (1) `uploads/visual-ig-dcek-N.jpg` guarda la imagen de la
  tarjeta **N+1** (numeración vieja) y el almacén ganaba al repositorio. (2) La **capa
  publicada** (`catalogo.json`, publicada el 8-oct) va **por id** y también estaba desplazada:
  renombraba 26 tarjetas con el código de la vecina.
- **Solución:** la precedencia es determinista y manda el **repositorio**: tu imagen publicada
  > imagen propia (`ownImage`) > `data:` > `assets/<carpeta>/<codigo>.jpg` > almacén.
  `catalogo.json` se reencajó **por código** (que no cambia nunca) y se le quitaron las
  imágenes del almacén.
- **Cómo comprobarlo:** `tools/trickvault/_banco_generar.py` + `_run_banco.cmd` (navegador
  nuevo y con 1223 tarjetas ya guardadas y ensuciadas a propósito).

### [2026-10-15] Imágenes con texto en **inglés** pese a pedirlo en el prompt

- **Síntoma:** Antonio: «hay varias imágenes con texto en inglés, asegúrate de que todo el
  texto sea en español». La coletilla del prompt ya decía «with no English words».
- **Causa:** el modelo escribe rótulos en inglés por inercia (sobre todo en infografías y
  anuncios: «WORLD WAR II KEY TURNING POINTS», «MADE FRESH», «CHEAT SHEET»). La instrucción
  sola no basta y no había forma de **detectarlo**: a ojo son 1100 imágenes.
- **Solución:** OCR nativo de Windows (`tools/trickvault/_ocr.ps1`) pasado por las **1103**
  imágenes + detector por proporción de palabras función inglesas
  (`tools/trickvault/_detectar_ingles.py`). Salieron 10 de verdad; regeneradas y OCR de nuevo:
  0. La coletilla de los 1104 prompts se refuerza a «…with no English words: every sign,
  label, headline and button must be in Spanish, never in English».
- **Cómo comprobarlo:** `python tools\\trickvault\\_ocr_todas.py` y luego
  `python tools\\trickvault\\_detectar_ingles.py` (debe salir ~0).
"""

RECETAS = """
## OCR de imágenes con el motor nativo de Windows (sin instalar nada)

Sirve para cazar texto en otro idioma, rótulos y erratas en cientos de imágenes. No hay
Tesseract ni pytesseract en el equipo; el motor `Windows.Media.Ocr` sí está (idioma `es-ES`).

```powershell
# una o muchas imágenes por llamada; imprime "<ruta><TAB><texto>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\\trickvault\\_ocr.ps1 img1.jpg img2.jpg
```

Para lotes grandes: `python tools\\trickvault\\_ocr_todas.py` (1103 imágenes en ~70 s, lotes de
120 rutas por proceso; escribe `tools/trickvault/_ocr_resultado.tsv`) y luego
`python tools\\trickvault\\_detectar_ingles.py` para marcar las que tienen inglés.

**Trampa:** si el script imprime solo el nombre del fichero en vez de la ruta, no podrás
agrupar por carpeta; usa la ruta completa (ya corregido en `_ocr.ps1`).
"""

DECISIONES = """
### [2026-10-15] Una carpeta = un sujeto; y «Comida y moda» se parte en dos

- **Decisión:** cada carpeta de TrickVault usa **un solo sujeto** en todas sus imágenes
  (Antonio: «dentro de una carpeta todas las imágenes deben utilizar el mismo sujeto para que
  de verdad se vea la diferencia»). Excepciones documentadas: códigos de lettering (una
  palabra), escenas autosuficientes (`/galaxy`, `/dragon`), y códigos que exigen una categoría
  concreta (un animal, una célula, un plato) o cuyo prompt nombra otra cosa (p. ej.
  `/footweartechpack` dice «footwear tech pack / sneaker»).
- **Decisión:** `xl-comidamoda` («Comida y moda») se parte en **`xl-comidamoda` = «Comida»**
  (26 tarjetas) y **`xl-moda` = «Moda»** (25: ropa, estilismo, belleza, joyería).
  Las fotos **siguen en `assets/comida-moda/`**: ya funcionan y moverlas obligaría a tocar
  todas las URLs.
- **Motivo:** mezclar dos temas en una carpeta impide comparar el mismo sujeto entre códigos,
  que es para lo que sirve la carpeta.
- **Contrapartida:** al cambiar el nombre de una carpeta, un navegador que ya tenía la lista
  guardada conserva el nombre viejo. Se resuelve con `FOLDERS_SCHEMA_VERSION` (5 → 6) y el
  mapa `FOLDERS_LABELS_ANTIGUOS`, que renombra solo si el nombre guardado es el viejo por
  defecto (si Antonio le puso otro a mano, se respeta).
"""

BITACORA = """
## 2026-10-15 — TrickVault: cada tarjeta con su imagen, un sujeto por carpeta y ni una palabra en inglés

**Punto de partida.** Antonio: «la imagen no cuadra con la tarjeta», «hay imágenes en las que
has mezclado a dos sujetos», «dentro de una carpeta todas las imágenes deben utilizar el mismo
sujeto», «lo de comida y moda es un despropósito», «en la de luz cámara deja a la chica como
sujeto principal», «hay varias imágenes con texto en inglés» y «en los comandos de texto hay
tarjetas duplicadas».

**Qué se encontró (medido, no supuesto)**

| Problema | Causa raíz | Alcance |
|---|---|---|
| Imágenes de otra tarjeta | El almacén del servidor ganaba al repositorio y sus ficheros van desplazados (+1) | 235 tarjetas |
| Renombrados | La capa publicada (`catalogo.json`) va por id y se publicó con otra numeración | 26 tarjetas |
| Sin ejemplo en el repositorio | 100 rutas apuntaban a ficheros que ya no existen | 215 tarjetas |
| Sujeto mezclado | Tandas anteriores con sujetos distintos en la misma carpeta | 103 imágenes |
| Dos sujetos en una imagen | El propio prompt los pedía (`/pixelart` rotulaba piezas de cámara; `/splashshot` y `/flatlay` invitaban a botella y bultos) | 3 imágenes |
| Texto en inglés | Inercia del modelo; no había forma de detectarlo | 10 imágenes |
| Tarjetas repetidas | `mergeSeedCards` solo miraba el id; el bloque de texto se renumeró | 4-7 fantasmas por navegador viejo |

**Qué se hizo**

- 114 ejemplos **recuperados** del servidor (verificados uno a uno contra su código) y 100
  **generados** con `openai-image-2-low`. El repositorio tiene ya un ejemplo de cada código.
- Precedencia de imagen **determinista**: publicada > propia > `data:` > **repositorio** > almacén.
  (Antes eran dos efectos asíncronos compitiendo: la misma tarjeta podía verse distinta según
  qué petición llegara antes.)
- `catalogo.json` **reencajado por código** y sin las imágenes del almacén.
- **103 imágenes** regeneradas con el sujeto único de su carpeta (xl-pintura 28, xl-juegos 23,
  xl-verdentro 16, xl-estilos 13, xl-letras3d 11, xl-casaviajes 8, xl-hechomano 3, xl-carteles 2).
- **68 imágenes** más: las 59 de `xl-luzcamara` con la chica y las 10 con inglés.
- **Carpeta nueva `xl-moda`** (25) y `xl-comidamoda` → «Comida» (26).
- **Fantasma del navegador** arreglado en `mergeSeedCards`.
- Herramientas nuevas: banco de pruebas con el almacén real simulado (`_banco_server.py` +
  `_run_banco.cmd`), OCR de Windows (`_ocr.ps1`), detector de inglés, tiras de sujeto
  (`_tira_carpeta.py`, `_zoom.py`, `_verif_carpetas.py`) y hojas de revisión
  (`_hojas_revision.py`).

**Commits:** `915bd61` (imágenes correctas + precedencia), `7f9e607` (sujeto único por
carpeta), `0a8403b` y `8524da6` (remates), `276a1fd` (Moda/Comida, luzcamara, inglés),
`6e7468e` (fantasmas de texto).

**Verificación:** banco en Chrome con el almacén contaminado real: navegador nuevo
**1101 tarjetas OK / 0 fallos / 0 sin cargar**, y con **1223 tarjetas ya guardadas y
ensuciadas a propósito**, idéntico. Repetido contra producción. OCR completo sin inglés.
6 fantasmas fabricados → 0 tras recargar.
"""

PENDIENTES = """
## Carpetas con dos familias de códigos: decidir si se parten

- **Estado:** detectadas y sin tocar. `xl-otromundo` mezcla personajes (astronauta, vampiro,
  mago: cada código pide el suyo) con la furgoneta camper de los códigos de producto;
  `xl-juegos` mezcla el aventurero de los códigos de juego con las escenas de temporada (esas
  ya se unificaron el 2026-10-15: ahora es el aventurero vestido de esa temporada).
- **Siguiente paso:** preguntar a Antonio si quiere partirlas como se hizo con «Comida y moda»
  o dejarlas con la excepción documentada en `trickvault-imagenes`.
- **Verificación:** `tools/trickvault/_tiras_sujetos.py` genera una tira por carpeta; si en una
  tira se ven dos familias claras, toca decidir.

## `xl-camararetrato` y `xl-casaviajes`: excepciones por código

- **Estado:** tienen excepciones legítimas (bebé, mascota, pareja, familia / castillo, volcán,
  trono, naufragio) porque **su código pide esa escena**. No es un sujeto mezclado.
- **Siguiente paso:** si Antonio quiere el sujeto único también ahí, hay que reescribir esos
  prompts (no basta con regenerar la imagen).
"""


print('memoria:')
mete('errores.md', ERRORES)
mete('recetas.md', RECETAS, tras='esta lista.\n')
mete('decisiones.md', DECISIONES)
mete('bitacora.md', BITACORA)
mete('pendientes.md', PENDIENTES, tras='---\n')
