# Duplicados en TrickVault — informe global (todas las carpetas)

**Analista:** `dup-global` (solo lectura; no he tocado `apps/`)
**Fecha:** 2026-10-15
**Revisión analizada:** `apps/trickvault/index.html` sha256 `300F0C74D40CDC5EB4293A384B3C47A1E32B003FE1037F80DC3CFA575D278F9D`
(967 581 bytes, 6 931 líneas). Comprobado que el fichero de trabajo era idéntico a `HEAD` (`git status --porcelain -- apps/trickvault/index.html` vacío) en el momento del análisis. Copia congelada en `%TEMP%\dup_global_index_300F0C74.html`.

---

## 1. Resumen ejecutivo

1. **El catálogo fuente NO tiene duplicados.** En las 23 carpetas hay **1 222 comandos** construidos desde los 5 arrays (`INSTAGRAM_COMMANDS`, `ADDITIONAL_IMAGE_COMMANDS`, `EXCEL_COMMANDS`, `CAPTURE_COMMANDS`, `REEL_COMMANDS`): **0 códigos repetidos, 0 prompts idénticos, 0 ejemplos compartidos**. Por la regla del proyecto (mismo código **y** mismo prompt **y** mismo ejemplo) hay **0 duplicados exactos** en el array.
2. **Los duplicados que ve Antonio existen, pero no están en el array: están guardados en el navegador.** Los ids `ig-dcek-NNN` / `cap-cmd-NNN` son **posicionales**. Al insertar un código **en medio** de un array, todos los siguientes cambian de número; la tarjeta que ya estaba guardada conserva su id viejo y la semilla nueva entra con el id nuevo → **dos tarjetas con el mismo código y el mismo prompt**. `mergeSeedCards()` sólo deduplica **por id**, nunca por código, así que el duplicado se guarda y ya no se limpia nunca.
3. **Reproducido con el código real de la app** (Node ejecutando el bloque de datos y `mergeSeedCards` de la propia `index.html`, validado además con una segunda implementación en Python): partiendo del estado guardado de la revisión anterior a `/metaads` (2026-10-08) salen **3 códigos duplicados**:

   | código | ids | carpeta | ¿duplicado exacto? |
   |---|---|---|---|
   | `/story` | `ig-dcek-592` + `ig-dcek-593` | **xl-texto** | **SÍ** (mismo código, mismo prompt, sin ejemplo) |
   | `/forest` | `ig-dcek-296` + `ig-dcek-297` | xl-casaviajes | **SÍ** |
   | `/expressionsheet` | `ig-dcek-083` + `mu7fpvmx114wfqvaw` | xl-hechomano | NO (prompts distintos: cómic vs realista; restaurado a propósito en `41c3630`) |

   El replay de las **126 revisiones** del fichero (un navegador que hubiera abierto la app en cada versión) da exactamente **los mismos 3**: es todo lo que el mecanismo de semillas puede acumular hoy, y **uno de ellos es un comando de texto** — justo lo que ha notado Antonio.
4. **La causa concreta del duplicado de texto:** el commit `a66e7421` (2026-10-08, «tarjeta /metaads») insertó `/metaads` al principio de `ADDITIONAL_IMAGE_COMMANDS`. Eso movió **todas** las posiciones ≥ 108 una casilla: `/story` pasó de la posición **592 a la 593**. El navegador ya tenía `/story` en `ig-dcek-592`; la semilla `ig-dcek-593` no existía en su lista, así que se añadió → dos `/story` en **xl-texto**. Lo mismo con `/forest` (de 296 a 297), que se duplicó porque el hueco `ig-dcek-297` estaba libre: en la numeración vieja esa posición era `/glassart`, cuya tarjeta **no existe** (la apaga el guard `command === '/glassart'`).
5. **Aviso importante para el arreglo:** los ids `592` y `296` **hoy apuntan a otros códigos** (`/outputs` y `/dreamcore`). Si se añaden a `REMOVED_IMAGE_IDS` «para quitar el duplicado», el `flatMap` de las semillas **borraría `/outputs` y `/dreamcore` para todo el mundo**. El patrón `flatMap` + lista de retiradas es correcto para duplicados *del array* (hoy no hay ninguno), **no** para estos. Ver §6.
6. **Riesgo estructural abierto:** sólo se deduplica `ADDITIONAL` contra `INSTAGRAM` (en `ALL_IMAGE_COMMANDS`). `EXCEL_COMMANDS`, `CAPTURE_COMMANDS` y `REEL_COMMANDS` se mapean **sin ninguna deduplicación** entre sí ni contra los anteriores: hoy no hay ningún código repetido, pero el primer código repetido que entre ahí producirá una tarjeta duplicada de verdad.

---

## 2. Método (todo reproducible)

* Los arrays y las plantillas se leen de una **copia congelada** con `tools/trickvault/_carpeta_lote.py` importado como módulo (redirigiendo `APP` al snapshot): `_lit`, `PROMPTS`, `TEXTOS`, `CODE_FOLDER`, `SEED_IMAGES`, `tarjetas_de`, `REMOVED`.
* **Verificación independiente**: se ejecuta el **código real de la app** en Node (bloque de datos de `index.html`, sin JSX) para obtener `SEED_TRICKS` tal cual lo construye la app, y se compara con la réplica en Python: **idénticas** (2 122 comandos; las 2 únicas tarjetas extra de la app son las variantes personales de `RESTORED_VARIANTS`).
* La simulación del navegador usa las funciones **de la propia app** (`mergeSeedCards`, `normalizeTrickCategories`) y el pipeline real de `useLocalStorage` (filtro por `REMOVED_IMAGE_IDS` → normalizar → merge).
* Scripts (solo lectura, dentro de `tools/trickvault/_informes/`): `_dup_global.py`, `_dup_global_drift.py`, `_dup_global_bordes.py`, `_dup_global_seed.js`, `_dup_global_merge.js`, `_dup_global_replay.js`. Datos: `_dup_global_datos.json`.

Cifras base: arrays `IG 100 + AD 493 + EXCEL 274 + CAPTURE 125 + REEL 267 = 1 259` posiciones → **1 222 comandos vivos** (37 posiciones apagadas: 36 ids retirados + `/glassart`). Plantillas: **1 130 de imagen + 120 de texto**, **0 códigos en ambas**. De las 1 235 tarjetas de `SEED_TRICKS`: 1 222 comandos + 11 trucos escritos a mano (`s1`–`s11`, xl-dev) + 2 variantes personales.

---

## 3. Tabla por carpeta

`tarjetas` = lo que la app muestra en esa carpeta (`SEED_TRICKS`, código real ejecutado en Node). `de texto` = tarjetas cuyo prompt sale de `TEXT_COMMAND_TEMPLATES`. `dup exactos` = mismo código + mismo prompt + mismo ejemplo, **en el array** (ninguno en ninguna carpeta).

| carpeta | tarjetas | de texto | comandos (arrays) | dup exactos |
|---|---:|---:|---:|---:|
| `xl-camararetrato` | 56 | 0 | 56 | 0 |
| `xl-carteles` | 49 | 0 | 49 | 0 |
| `xl-casaviajes` | 58 | 0 | 58 | 0 |
| `xl-comidamoda` | 26 | 0 | 26 | 0 |
| `xl-dev` | 16 | 0 | 5 | 0 |
| `xl-efectosempaque` | 100 | 0 | 100 | 0 |
| `xl-escenaprueba` | 66 | 0 | 66 | 0 |
| `xl-estilos` | 55 | 0 | 55 | 0 |
| `xl-fotoproducto` | 58 | 0 | 58 | 0 |
| `xl-hechomano` | 54 | 0 | 53 | 0 |
| `xl-ilustracion` | 53 | 0 | 52 | 0 |
| `xl-juegos` | 44 | 0 | 44 | 0 |
| `xl-letras3d` | 58 | 0 | 58 | 0 |
| `xl-luzcamara` | 59 | 0 | 59 | 0 |
| `xl-moda` | 25 | 0 | 25 | 0 |
| `xl-negocioredes` | 51 | 1 | 51 | 0 |
| `xl-otromundo` | 80 | 0 | 80 | 0 |
| `xl-pintura` | 40 | 0 | 40 | 0 |
| `xl-planos` | 64 | 0 | 64 | 0 |
| `xl-restauracion` | 3 | 0 | 3 | 0 |
| `xl-retroedu` | 55 | 1 | 55 | 0 |
| `xl-texto` | 118 | 118 | 118 | 0 |
| `xl-verdentro` | 47 | 0 | 47 | 0 |
| **TOTAL (23)** | **1 235** | **120** | **1 222** | **0** |

Notas de la tabla:
* `xl-dev` = 5 comandos + los **11 trucos escritos a mano** (`s1`–`s11`).
* `xl-hechomano` = 53 comandos + la variante `/expressionsheet`; `xl-ilustracion` = 52 + la variante `/glassart`.
* Los 120 comandos de texto están en `xl-texto` (118), más `/funnel` (`ig-dcek-440`, xl-negocioredes) y `/stepbystep` (`ig-dcek-399`, xl-retroedu): 2 textos **fuera** de la carpeta «Comandos de texto» por cómo los mapea `CODE_FOLDER`.
* Hay **casos en que dos tarjetas distintas comparten la misma *imagen de ejemplo***: **0**. Y **0** códigos que sólo difieran en mayúsculas/espacios (`/4K` vs `/4k`).

---

## 4. Qué es duplicado y qué no (los cuatro apartados pedidos)

### (a) Duplicados exactos por la regla (código + prompt + ejemplo): **0 en el array**

Comprobado de cuatro formas independientes: por código literal, por prompt literal, por prompt normalizado (minúsculas + sin tildes + espacios colapsados), por pareja de ejemplo, y por `SEED_TRICKS` ejecutado en Node (ids y códigos únicos salvo el caso (b)). No hay ninguna clave repetida en `PROMPT_TEMPLATES` ni en `TEXT_COMMAND_TEMPLATES` (un objeto JS repetido se colapsa en silencio; aquí no pasa).

### (b) Mismo código repetido con prompts distintos: **1 caso** (NO duplicado)

| código | ids | carpeta | prompts | ejemplo |
|---|---|---|---|---|
| `/expressionsheet` | `ig-dcek-083` (semilla) + `mu7fpvmx114wfqvaw` (variante) | xl-hechomano | «expression sheet, comic animation model sheet» vs prompt propio realista | `assets/xl-hechomano/expressionsheet.jpg` vs `uploads/example_mu7fpvmx114wfqvaw_0f8729e92e26.webp` |

Es **intencionado**: `90406c7` (2026-10-06) la retiró como duplicado y `41c3630` la **restauró** con el razonamiento correcto («mismo código pero prompt distinto: comic vs realista»). **No tocar.** Caso hermano: `/glassart` **no** está duplicado porque la tarjeta de catálogo se apaga con el guard `command === '/glassart'` (línea 3 254) y sólo queda la variante `tv-glassart-optical`.

### (c) Prompts idénticos con códigos distintos: **0**

Tampoco hay ninguno normalizado. Lo más parecido:
* `ig-dcek-417` `/professional` («Reescribe [TEXTO] con tono profesional.») vs `ig-dcek-418` `/casual` («… tono conversacional.»): similitud 0,78 (**prompts distintos** → no es duplicado).
* **4 pares** con el mismo *significado* (la descripción del array) y códigos distintos — no son duplicados por la regla, pero son los candidatos a revisar si Antonio los ve «repetidos»:
  * «anuncio de lanzamiento» → `xl-cmd-174` `/launchpost` y `reel-cmd-227` `/launchpic` (xl-negocioredes)
  * «caja de cerillas antigua» → `xl-cmd-224` `/matchbox` y `reel-cmd-185` `/matchpack` (xl-retroedu)
  * «flotando sin soporte visible» → `reel-cmd-169` `/floatnoline` y `ig-dcek-038` `/floatingproduct` (xl-fotoproducto / xl-hechomano)
  * «trama de puntos de imprenta» → `ig-dcek-077` `/halftone` y `reel-cmd-161` `/printdots` (xl-hechomano)

### (d) Tarjetas retiradas que siguen en el array: **48 ids**, de los cuales 36 son posicionales y siguen «armados» (correcto: el `flatMap` los apaga)

| grupo | ids | estado |
|---|---|---|
| 27 × `ig-dcek` (`020`, `099`, `100`, `113`–`136`) | siguen en `ALL_IMAGE_COMMANDS` | apagados por `REMOVED_IMAGE_IDS.has(seedId)` (línea 3 254) |
| 9 × `cap-cmd` (`114`–`122`) | siguen en `CAPTURE_COMMANDS` | apagados por `REMOVED_IMAGE_IDS.has(id)` (línea 3 290) |
| 11 × `tr-cmd-001`–`011` + `tv-glassart-art` | **no están** en ningún array (carpeta `xl-transfer1to2` retirada) | inocuos: sólo limpian navegadores que ya las tuvieran |

Ninguno quedó «suelto»: los 36 posicionales siguen **apagando una tarjeta que existe** (ningún id fuera de rango). Pero ojo con el hallazgo siguiente.

#### Hallazgo: **deriva posicional** en el bloque `ig-dcek-113`–`136` (2026-10-08)

`git show fc790c2` (2026-09-26) introdujo ese bloque cuando las posiciones eran:

```
113 /glassreflection  114 /surrealad  115 /nature ... 135 /hologram  136 /neon
```

Al insertar `/metaads` (`a66e7421`, 2026-10-08) todo lo posterior se desplazó **+1**, así que hoy esos mismos ids apuntan a:

```
113 /luxurywatchad  114 /glassreflection ... 136 /hologram     (y /neon pasó a 137)
```

Efectos verificados hoy:

* **`/neon` volvió a entrar** como `ig-dcek-137` (xl-luzcamara, con ejemplo `assets/luz-camara-personas/neon.jpg`). Estaba retirado a propósito desde 2026-09-26 → es una tarjeta que «resucita» en cualquier navegador donde se hubiera borrado (que es exactamente para lo que existe `REMOVED_IMAGE_IDS`).
* **`/luxurywatchad` desapareció** (su posición 113 quedó apagada por el id derivado): es una tarjeta que estuvo viva desde 2026-09-26, con prompt en `PROMPT_TEMPLATES` y ejemplo `assets/xl-escenaprueba/luxurywatchad.jpg` en el repositorio.
* La deriva ocurrió **una sola vez** en las 126 revisiones (comprobado revisión a revisión con `_dup_global_drift.py`); `cap-cmd-114`–`122` y `ig-dcek-020/099/100` siguen apuntando al mismo código que el día que se retiraron.
* `/expressionsheet` **no** está hoy en `REMOVED_IMAGE_IDS` (se quitó en `41c3630`): el `ig-dcek-083` que aparece en el historial es un id **histórico**, no actual.

---

## 5. Lo que ve Antonio: por qué hay duplicados y por qué no salen en el array

Cadena verificada, con las funciones reales de la app:

```
positions shift (inserción en medio)  ->  la tarjeta guardada conserva su id viejo
                                      ->  la semilla nueva usa un id que NO está guardado
                                      ->  mergeSeedCards(saved, initial) la añade
                                          (deduplica por id: línea 5 436)
                                      ->  dos tarjetas con el mismo código y el mismo prompt
                                      ->  se guardan en localStorage y ya no se limpian nunca
```

`mergeSeedCards` (línea 5 435) sólo mira `id` (con la excepción de `RESTORED_VARIANTS`). `normalizeTrickCategories` recoloca carpetas y aplica `CODE_MOVES`, pero **no** toca ids ni deduplica por código. Las imágenes sí se resuelven **por código** (`SEED_ID_BY_COMMAND`, migración de 2026-09-27), así que las dos tarjetas gemelas muestran *la misma imagen*: el duplicado es visualmente idéntico, que es justo lo que se ve mal en una carpeta de **texto** (sin imagen que las diferencie).

**Duplicados reproducidos** (id → código), partiendo del estado guardado de la revisión anterior a `/metaads` y del replay de las 126 revisiones (mismo resultado):

| código | tarjeta guardada | semilla nueva | carpeta | prompt |
|---|---|---|---|---|
| **`/story`** | `ig-dcek-592` | `ig-dcek-593` | **xl-texto** | `Escribe una historia sobre [TEMA] con personajes, conflicto y final.` |
| **`/forest`** | `ig-dcek-296` | `ig-dcek-297` | xl-casaviajes | plantilla de imagen de `/forest` (idéntica: va por código) |
| `/expressionsheet` | `mu7fpvmx114wfqvaw` | `ig-dcek-083` | xl-hechomano | **distintos** → no es duplicado (ver §4b) |

Para verificarlo **en el navegador de Antonio** (consola, con la app abierta):

```js
const t = JSON.parse(localStorage.getItem('trickvault_data') || '[]');
const c = {};
t.forEach(x => { const k = String(x.codeSnippet || '').trim(); if (k.startsWith('/')) c[k] = (c[k] || 0) + 1; });
console.table(Object.entries(c).filter(([, n]) => n > 1));
```

---

## 6. Snippets para el Lead (por grupo)

> Regla que respetan todos: **no se borra ninguna entrada de los arrays** (los ids `ig-dcek-NNN` / `cap-cmd-NNN` / `xl-cmd-NNN` / `reel-cmd-NNN` son posiciones; borrar desplaza todos los ids y multiplica el problema). Todo se resuelve con `flatMap` devolviendo `[]`, con listas de retiradas o con una migración de carga.

### Grupo 0 — Duplicados exactos **en el array**: no hay ninguno

No hay que retirar nada por duplicación. El patrón de referencia (ya usado en la app) queda documentado por si aparece:

```js
// ...ALL_IMAGE_COMMANDS.flatMap(([command, meaning], index) => {
const seedId = `ig-dcek-${String(index + 1).padStart(3, '0')}`;
if (REMOVED_IMAGE_IDS.has(seedId) || command === '/glassart') return [];
return [{ /* tarjeta */ }];
// });
```
Y su id se añade a `REMOVED_IMAGE_IDS` (línea 1 324) para que también se borre de los navegadores que ya la tuvieran guardada. **Pero ver Grupo 2: para `/story` y `/forest` esto NO sirve.**

### Grupo 1 — `/expressionsheet` (`ig-dcek-083` + `mu7fpvmx114wfqvaw`, xl-hechomano): **no tocar**

Es el caso legítimo de la regla (mismo código, prompts distintos) y se restauró a propósito en `41c3630`. Snippet = sólo el comentario que ya está en el código, para que nadie lo «arregle» otra vez:

```js
// /expressionsheet: DOS tarjetas a propósito. La del catálogo hace un model sheet
// de cómic; la variante personal (mu7fpvmx114wfqvaw) es fotorrealista. Mismo código,
// prompt distinto => son dos herramientas. NO retirar ig-dcek-083 (eso ya se probó
// en 90406c7 y se revirtió en 41c3630).
```

### Grupo 2 — `/story` (xl-texto) y `/forest` (xl-casaviajes): duplicados guardados en el navegador

**NO usar `REMOVED_IMAGE_IDS` con los ids viejos**: hoy `ig-dcek-592` = `/outputs` y `ig-dcek-296` = `/dreamcore`, así que el `flatMap` de las semillas apagaría esas dos tarjetas vivas para todo el mundo. Dos opciones correctas:

**Opción A (recomendada) — deduplicar por código+prompt al cargar.** Es la regla del proyecto escrita en código, arregla los duplicados actuales, los que ya tenga cada navegador y los que producirá cualquier inserción futura. En `useLocalStorage` (línea ~5 478), antes de `migrateGeneratedCardImages`:

```js
// Dos tarjetas con el MISMO código y el MISMO prompt son la misma herramienta: una
// se queda. Si el prompt es distinto (p. ej. /expressionsheet) se conservan las dos.
function claveDeTarjeta(trick) {
    const codigo = getImageCommandKey(trick);
    const propio = String(trick.customPrompt || '').trim();
    const plantilla = propio || IMAGE_COMMAND_PROMPTS.get(codigo) || TEXT_COMMAND_PROMPTS.get(codigo) || '';
    return codigo + '\u0000' + plantilla;
}
function dedupeCardsByCommand(items) {
    const vistas = new Map();
    const salida = [];
    for (const item of items) {
        const codigo = getImageCommandKey(item);
        if (!codigo.startsWith('/')) { salida.push(item); continue; }   // sin comando: no se toca
        const clave = claveDeTarjeta(item);
        const previa = vistas.get(clave);
        if (!previa) { vistas.set(clave, item); salida.push(item); continue; }
        const valor = t => (t.isFavorite ? 2 : 0) + (/^data:/.test(String(t.imageUrl || '')) ? 1 : 0);
        if (valor(item) > valor(previa)) {           // gana la que tiene trabajo del usuario
            salida[salida.indexOf(previa)] = item;
            vistas.set(clave, item);
        }
    }
    return salida;
}
```
y en el `return` de `useLocalStorage`:

```js
return normalizeTrickOrder(cleanLegacyImageCommandDescriptions(
    migrateGeneratedCardImages(dedupeCardsByCommand(merged))));
```

**Opción B (mínima) — lista de purga sólo para lo guardado.** Si se prefiere no tocar la deduplicación general, se apuntan los ids **viejos** en un set aparte que se aplica **únicamente** al array guardado (nunca en el `flatMap` de las semillas):
```js
// Ids VIEJOS que quedaron guardados en los navegadores y hoy apuntan a otra tarjeta
// por el desplazamiento del 2026-10-08. Se purgan SOLO de la lista guardada: la
// semilla viva de /story y /forest entra por su id nuevo (593 / 297).
const DUPLICADOS_PURGADOS = new Set(['ig-dcek-592', 'ig-dcek-296']);
// ...
const filtered = parsed.filter(item => !REMOVED_IMAGE_IDS.has(String(item.id))
    && !DUPLICADOS_PURGADOS.has(String(item.id)));
```
Efecto: 1 tarjeta por comando en cualquier navegador; se pierden los retoques personales que tuvieran *esas dos* tarjetas (hoy: ninguno). No previene el siguiente desplazamiento (por eso se recomienda la Opción A).

> **Estado (2026-10-15):** el Lead ya tiene en el árbol de trabajo un filtro de «fantasmas» en `mergeSeedCards` que resuelve `/story` y `/forest`; deja un caso, `/glitch`, porque la posición 298 está hueca (guard de `/glassart`). La Opción A lo cierra. Comprobado extremo a extremo en §7.

### Grupo 3 — Deriva del bloque `ig-dcek-113`–`136` (dos tarjetas mal)

`/neon` está viva cuando debería estar retirada y `/luxurywatchad` está retirada cuando debería estar viva. Con el mecanismo actual (ids posicionales) el arreglo mínimo es **mover dos ids** en `REMOVED_IMAGE_IDS` (línea 1 324):

```js
const REMOVED_IMAGE_IDS = new Set([
    'tv-glassart-art',
    'ig-dcek-020', 'ig-dcek-099', 'ig-dcek-100',
    // 'ig-dcek-113',   <-- FUERA: hoy apunta a /luxurywatchad (debe estar viva)
    'ig-dcek-114', ... 'ig-dcek-136',
    'ig-dcek-137',      // <-- NUEVO: hoy es /neon (debe seguir retirada)
    ...
]);
```

**Mejor todavía (a prueba de deriva):** retirar por **código**, no por posición. El guard ya existe para un caso (`command === '/glassart'`), así que es el mismo patrón. Con la lista real de los 24 códigos del bloque del 2026-09-26 (incluido `/neon`, y **sin** `/luxurywatchad`, que debe quedar viva):

```js
const RETIRED_IMAGE_CODES = new Set(['/glassreflection', '/surrealad', '/nature', '/jungle',
    '/desert', '/ocean', '/underwater', '/space', '/cyberpunk', '/futuristic', '/fire', '/ice',
    '/fireAndIce', '/smoke', '/storm', '/energy', '/splash', '/waterSplashAd', '/explosion',
    '/productexplosion', '/portrait', '/floating', '/hologram', '/neon']);
// ...ALL_IMAGE_COMMANDS.flatMap(([command, meaning], index) => {
if (REMOVED_IMAGE_IDS.has(seedId) || RETIRED_IMAGE_CODES.has(command) || command === '/glassart') return [];
```
Decisión de Antonio pendiente: si `/luxurywatchad` también se borró a mano el 2026-09-18, basta con añadirlo a esa lista; si no, al quitar `'ig-dcek-113'` vuelve a estar viva (tiene prompt y ejemplo en `assets/xl-escenaprueba/luxurywatchad.jpg`).

### Grupo 4 — Capa publicada: `/Mercury` (`apps/trickvault/catalogo.json`)

En `catalogo.json` (versión 1, 2026-10-08) hay 34 tarjetas publicadas **con id de semilla** (se actualizan en su sitio, no duplican) y **1 «nueva»**: `id=muzrldq0pyjtdj8fe`, `title="/Mercury"`, `category=xl-carteles`, **`codeSnippet: ""`**, con prompt propio (similitud 0,26 con el `/mercury` del catálogo: 1 306 vs 512 caracteres) e imagen `uploads/example_muzrldq0pyjtdj8fe_e7ecf5db34d3.webp`. Por la regla **no es duplicado** (no tiene código y el prompt es distinto), pero es la única tarjeta de la capa publicada que no se puede enlazar con su comando: si Antonio la ve como «otra tarjeta de Mercurio», el arreglo no es el `flatMap` sino rellenar/limpiar su `codeSnippet` (o retirarla) en `catalogo.json` y republicar esa carpeta.

---

## 7. Verificación del arreglo que hay EN CURSO en el árbol de trabajo (2026-10-15, sin commitear)

Mientras terminaba este informe, el Lead ha modificado `mergeSeedCards` en el árbol de trabajo (sha256 `b5bd74daedcdd8eb…`, 968 980 bytes, `git status` = ` M`). El cambio descarta las tarjetas guardadas cuyo **id** pertenece hoy a otro comando («fantasmas» de una numeración anterior). Lo he probado con los mismos arneses, sobre **copias en `%TEMP%`** (nunca sobre `apps/`):

| revisión probada | tarjetas finales | códigos duplicados | detalle |
|---|---:|---:|---|
| `300F0C74` (= HEAD al empezar) | 1 236 | **3** | `/story` (xl-texto), `/forest`, `/expressionsheet` |
| `b5bd74da` (arreglo en curso) | 1 236 | **2** | `/glitch`, `/expressionsheet` |
| `b5bd74da` + `dedupeCardsByCommand` (§6, Opción A) | **1 235** | **1** | sólo `/expressionsheet` (intencionado) |

* El filtro de fantasmas **arregla `/story` (el duplicado de texto) y `/forest`**. 
* **Le queda `/glitch`**: `ig-dcek-298` (guardada) + `ig-dcek-299` (semilla nueva), xl-efectosempaque. Motivo: en la numeración vieja la posición **298** era `/glitch` y la **299** `/medieval`; hoy la 298 es `/glassart`, cuya tarjeta **no existe** (guard), así que `seedCodeById` no tiene entrada para 298 y la tarjeta guardada se interpreta como «personal» (se queda); la semilla de `/glitch` entra por 299 y su gemela de 299 (`/medieval`) se descarta. Con la deduplicación por código+prompt (§6 Opción A) ese caso también se limpia, y de paso queda cubierto cualquier desplazamiento futuro.
* El mismo resultado sale con el **replay de las 127 revisiones**: 1 236 tarjetas y 2 duplicados con el arreglo en curso → 1 235 tarjetas y 1 duplicado (el intencionado) con la deduplicación añadida. Es decir: **0 duplicados reales**.
* Si en vez de la Opción A se prefiere un arreglo puntual para `/glitch`, hay que contar con que la posición 298 está «hueca» en las semillas (por `/glassart`): el filtro por id no puede verla y hay que comparar por **código** (¿existe este código en el catálogo con otro id?).

Reproducción de esta verificación:

```powershell
python -c "import shutil,os; shutil.copy(r'E:\ANTIGRAVITY\apps\trickvault\index.html', os.path.join(os.environ['TEMP'],'idx_working.html'))"
node tools\trickvault\_informes\_dup_global_merge.js "$env:TEMP\idx_working.html" "$env:TEMP\idx_prev_metaads.html" "$env:TEMP\m_nodedupe.json"
node tools\trickvault\_informes\_dup_global_replay.js "$env:TEMP\dup_replay_full" "$env:TEMP\r_work.json"
```

---

## 8. Riesgo estructural (recomendación)

`ALL_IMAGE_COMMANDS` deduplica `ADDITIONAL` contra `INSTAGRAM` por código; **`EXCEL_COMMANDS`, `CAPTURE_COMMANDS` y `REEL_COMMANDS` no se deduplican contra nada**. Hoy no hay ni un código repetido en las 1 222 tarjetas, así que no hay nada que arreglar, pero cualquier código que entre repetido en esos tres arrays dará una tarjeta duplicada de verdad (código + prompt idénticos, porque el prompt va por código). Dos defensas baratas:

```js
// Al construir SEED_TRICKS, o como assert en desarrollo:
const CODIGOS_VISTOS = new Set();
const sinDuplicar = (command) => !CODIGOS_VISTOS.has(command) && CODIGOS_VISTOS.add(command);
```
o, mejor, la deduplicación por código+prompt del Grupo 2 (Opción A), que además limpia lo ya guardado.

---

## 9. Anexo: cómo reproducirlo

```powershell
# 1. Copia congelada + auditoría global (arrays, carpetas, retiradas, bordes)
python tools\trickvault\_informes\_dup_global.py
python tools\trickvault\_informes\_dup_global_bordes.py
# 2. Deriva de los ids posicionales en las 126 revisiones
python tools\trickvault\_informes\_dup_global_drift.py
# 3. Inventario real de la app (bloque de datos ejecutado en Node)
node tools\trickvault\_informes\_dup_global_seed.js "$env:TEMP\idx_head.html" "$env:TEMP\seed_head.json"
# 4. Duplicados que ve el navegador (merge real de la app)
python -c "import subprocess,os;open(os.path.join(os.environ['TEMP'],'idx_prev_metaads.html'),'wb').write(subprocess.run(['git','show','a66e7421^:apps/trickvault/index.html'],capture_output=True).stdout)"
node tools\trickvault\_informes\_dup_global_merge.js "$env:TEMP\idx_head.html" "$env:TEMP\idx_prev_metaads.html" "$env:TEMP\dup_global_merge.json"
# 5. Replay de todo el historial
node tools\trickvault\_informes\_dup_global_replay.js "$env:TEMP\dup_replay_full" "$env:TEMP\dup_global_replay_full.json"
```

Resultados esperados sobre la revisión `300F0C74`: `0` duplicados exactos en el array, `3` códigos duplicados en el merge guardado (`/story`, `/forest`, `/expressionsheet`) y deriva en `ig-dcek-113`–`136`.
Con el arreglo en curso (`b5bd74da`): `2` (`/glitch`, `/expressionsheet`); con la deduplicación por código+prompt añadida: `1` (sólo el intencionado).
