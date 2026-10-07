# TrickVault — pendientes (anotado el 2026-10-07)

Lista para retomar mañana. Cada punto lleva lo que ya se sabe (o se sospecha con
alguna prueba) y el arreglo propuesto. **No hay nada urgente que rompa datos.**

---

## 1. Al refrescar cambian de sitio las tarjetas

**Qué pasa**: el orden de las tarjetas dentro de una carpeta no es estable entre
recargas.

**Lo que se sabe**:
- `normalizeTrickOrder()` reparte un `sortOrder` por carpeta, pero **solo a las
  tarjetas que no lo tienen**. Las nuevas (al entrar en el catálogo) reciben los
  números bajos y se van arriba; las viejas conservan los suyos.
- `mergeSeedCards()` **antepone** las tarjetas nuevas a las guardadas, así que
  cada vez que entra algo en el catálogo el orden se recoloca.
- Además, la capa publicada (`catalogo.json`) ahora puede llevar `orden` por
  carpeta (lo publicamos para «Letras y 3D»), que compite con lo anterior.

**Arreglo propuesto**: hacer el orden determinista. O se ordena siempre por una
clave estable (`createdAt` descendente), o al cargar se **renumeran todas** las
tarjetas de cada carpeta con el orden actual y ese orden es el que manda. Decidir
una de las dos y quitar de en medio el `orden` de la capa publicada.

---

## 2. Imágenes que salen distintas entre incógnito y ventana normal

**Qué pasa**: en incógnito vio dos imágenes que le gustaron; al cerrar y recargar
normal, esas tarjetas tenían otras imágenes.

**Lo que se sabe** (y es la causa más probable de casi todo el desconcierto):
- Hay **tres fuentes** de imagen compitiendo: el **catálogo** (`assets/…`),
  el **almacén del servidor** (`image_store.php`, 779 entradas, nombres
  `uploads/example_<id>_<hash>.webp`) y la **capa publicada** (`catalogo.json`).
- En la app, la sincronización con el almacén y la aplicación de la capa son **dos
  efectos asíncronos**: no está garantizado cuál termina antes, así que la imagen
  final **puede depender de la recarga**. Eso explica que en incógnito (sin datos)
  se vea una y en la ventana de siempre otra.
- `migrateGeneratedCardImages()` (release pendiente) y `applyRemoteImages()`
  (almacén) pueden sobrescribirse mutuamente.

**Arreglo propuesto**: un único orden fijo y explícito de precedencia y un solo
punto de aplicación: 1) catálogo → 2) almacén → 3) capa publicada, y que la capa
sea **lo último** y no se pueda sobrescribir después (hoy es una carrera). Marcar
qué campos son de la capa y respetarlos siempre.

---

## 3. El botón de copiar no se ve

**Comprobado hoy en la web**: `app.css` servido tiene `.copy-btn { … opacity: 1 }`
(verificado extrayendo el bloque real, no una regla suelta).

**Causa más probable**: `app.css` se sirve con `Cache-Control: max-age=604800`
(**7 días**, igual que los `.jpg`). El `index.html` no lleva esa caché, así que
los cambios de HTML se ven al momento y los de CSS **no** — de ahí que la app
parezca incoherente.

**Arreglo propuesto**: versionar el CSS en el HTML (`app.css?v=N`) y subir la N
en cada cambio de estilos, igual que se hace con las imágenes. Mientras tanto,
para verlo ya: `Ctrl+F5` (recarga forzada; F5 no basta).

---

## 4. Publicar las imágenes que elige el usuario

**Estado**: arreglado hoy, commit `f544e60`, empujado y **pendiente de
despliegue** (Hostinger va por detrás: hay que pulsar *Redistribuir*).

**Qué se arregló**: el filtro excluía `uploads/example_...` creyendo que eran
ejemplos del catálogo, cuando `image_store.php` **nombra así todas** las imágenes
de una tarjeta, incluidas las que sube el usuario. Ahora se publica la imagen
cuando la tarjeta se ha editado después de nacer (`updatedAt` más nuevo que el
del catálogo) o cuando la imagen es tuya sin subir (`data:image/...`).

**Pendiente (refinamiento)**: hoy la imagen se publica como **URL** del almacén
(`uploads/…`), no como fichero del repositorio. Copiarla a
`apps/trickvault/assets/publicado/<id>.jpg` (comprimida a ≤60 KB, como hace la
app) la haría sobrevivir a cualquier limpieza del servidor y quedaría en el
historial.

---

## 5. Los 7 `customPrompt` que se publicaron sin querer

Se publicaron en el commit `05b0e1e` (dentro de «Letras y 3D»). Son prompts
personalizados reales de esas tarjetas. **Decidir**: si no se quieren, vaciar el
prompt en esas tarjetas y publicar la carpeta otra vez (la capa se resincroniza
por carpeta, no se acumula).

---

## 6. Deriva del catálogo (215 tarjetas al publicar «todas las carpetas»)

Al publicar sin filtrar por carpeta salen ~215 tarjetas con `title`/`codeSnippet`
de versiones antiguas del catálogo (la app los ha ido renombrando con el tiempo y
el navegador conserva los viejos). **Decidir**: hacer una publicación de limpieza
única que las iguale al catálogo actual, o dejarlo y publicar siempre por carpeta.

---

## 7. Recordatorio de operativa (para no volver a perder el tiempo)

- **Antes de creer que un cambio está en la web**: comprobar el fichero servido
  (con cache-buster) buscando una marca concreta del cambio. Hoy me creí una
  verificación por una expresión regular mal hecha y di por desplegado algo que
  no lo estaba.
- **Hostinger** a veces se queda atrás con el despliegue: *Sitios web → Avanzado
  → GIT → Redistribuir*, y comprobar que *Comprometerse* apunta al último commit.
- **Caché del CDN**: 7 días para `.jpg` y `.css`. Cada vez que se cambia un
  fichero de esos, hay que **cambiar la URL** (`?v=N`) o no se verá.
