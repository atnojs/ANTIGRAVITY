# Evidencias — TrickVault · «Letras y 3D» partida en «Letras» y «3D» + atajo a Editar y Generar (2026-11-27)

Producción: `https://atnojs.es/apps/trickvault/`. Commits: `5a76e279` (reparto + assets + botón),
`da1fe24d` (botón debajo de la guía y en llamarada), `6529a6d1` (reparto 20/40 en la capa publicada
y ejemplos con la ruta nueva). Todo comprobado sobre la versión **servida**, no solo sobre el repo.

## Qué prueba cada fichero

| Fichero | Qué demuestra |
|---|---|
| `antes-portada-1440.png` | Portada de producción ANTES: 26 carpetas y «Letras y 3D · 60 trucos». |
| `antes-letras3d-1440.png` | Carpeta vieja ANTES: 60 tarjetas mezcladas en una sola rejilla. |
| `despues-portada-1440.png` | Portada DESPUÉS: 27 carpetas, «Letras · 20 trucos», «3D · 40 trucos» y botón nuevo. |
| `despues-portada-768.png`, `despues-portada-390.png` | Lo mismo a 768 y 390 px, sin scroll horizontal. |
| `despues-letras-1440.png`, `despues-letras-390.png` | «Letras» con sus 20 tarjetas y sus imágenes (incluye `/ascii` y `/typefill`). |
| `despues-3d-1440.png` | «3D» con sus 40 tarjetas. |
| `comparativa_trickvault_letras_3d.png` | Antes/después de la portada en una sola imagen, etiquetada. |
| `comparativa_trickvault_boton.png` | Cabecera antes (sin atajo) y después (píldora de llamarada bajo la guía). |
| `detalle_boton_llama.png` | El botón a 1440 y a 390, ampliado. |
| `foco-teclado-boton.png` | Anillo de foco real al llegar con **Tab** (`0 0 0 3px rgba(255,138,31,.75)`). |
| `portada-anchos-report.json` | Medidas de portada: 1440/768/390, `scrollWidth == innerWidth`, caja del botón. |
| `interaccion-report.json` | Clic real: abre `editar_generar` en pestaña nueva (título comprobado) y TrickVault sigue abierta; «Volver a carpetas» restaura 27. |
| `migracion-report.json` | Navegador simulado con las **60** tarjetas guardadas en `xl-letras3d` y esquema 7: tras recargar, 20 / 40, carpeta vieja fuera, `xl-dev` en 16 y ninguna tarjeta huérfana. |
| `carga-imagenes-produccion.json` | Con scroll completo, 20/20 y 40/40 miniaturas pintadas (`naturalWidth > 0`), 0 rotas. |

## Cómo se comprobó (reproducible)

- Chrome real por DevTools Protocol (driver propio `cdp.mjs`, sin Playwright) **contra la URL
  pública**, perfil limpio y `?cb=` nuevo en cada petición.
- `catalogo.json` servido: 26 carpetas, `orden` 20/40, sin la clave `xl-letras3d`, y las únicas
  anulaciones de carpeta que quedan son las legítimas (`ig-dcek-561` → Moda, `ig-dcek-004` → Doble
  exposición).
- Las 60 rutas `assets/xl-letras|xl-3d/*.jpg` responden `200` en producción (ojo con las que ya
  llevan `?v=`: el parámetro extra va con `&`).
- Consola en producción: solo los dos avisos de Babel (aviso del transformador en navegador y nota
  de > 500 KB), que también emite la versión anterior. Cero respuestas ≥ 400.
- Caché: `x-hcdn-cache-status: DYNAMIC` (origen) y `Last-Modified` posterior al push.

## Incidencias encontradas y corregidas en esta misma entrega

- **Datos**: la publicación de las 20:12 (`a312621c`) traía dos anulaciones de carpeta
  (`cap-cmd-108` = `/ascii`, `cap-cmd-110` = `/typefill`) que dejaban **18/42** en producción.
  Corregido en `6529a6d1` (se quitaron las anulaciones y se regeneró el `orden` con los ids
  reales). Si vuelve a publicarse desde un navegador con esas dos tarjetas en «3D», volvería a
  pasar: se arregla arrastrándolas a «Letras» y publicando.
- **Imágenes**: `/figurine` (`reel2-cmd-001`) y `/toyversion` (`turn-cmd-002`) conservaban rutas
  `assets/xl-letras3d/…`. Ahora se remapean por código al cargar (0 tarjetas con la ruta vieja).

## Fuera de alcance / conocido

- `ig-dcek-004` (`/crosssection`) desaparece al recargar por la migración de una sola vez de «Doble
  exposición» (`migrateDobleReorganizada`), **no** por deduplicación. Se reprodujo también con el
  `index.html` anterior (`backup/index.html` de la sesión de trabajo): es previo a este cambio. En
  un navegador real esa migración ya está marcada como hecha.
- Si `catalogo.json` no se puede cargar, las ~15 tarjetas publicadas que viven solo en la capa
  (`nuevas`) desaparecen de la vista. Es el comportamiento de la app, no de este cambio.
- Las miniaturas usan `loading="lazy"`: en capturas de página completa algunas aún no se han
  pintado; por eso se comprobó la carga con scroll completo (`carga-imagenes-produccion.json`) y
  las 60 rutas por HTTP.
