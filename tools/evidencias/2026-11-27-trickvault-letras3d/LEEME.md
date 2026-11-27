# Evidencias — TrickVault · «Letras y 3D» partida en «Letras» y «3D» (2026-11-27)

Commit de la app: `5a76e279`. Comprobado en producción (`https://atnojs.es/apps/trickvault/`)
después del despliegue por webhook.

## Qué prueba cada fichero

| Fichero | Qué demuestra |
|---|---|
| `antes-portada-1440.png` | Portada de producción ANTES: 26 carpetas y «Letras y 3D · 60 trucos». |
| `antes-letras3d-1440.png` | Vista de la carpeta vieja ANTES: 60 tarjetas mezcladas en una sola rejilla. |
| `despues-portada-1440.png` | Portada DESPUÉS: 27 carpetas, «Letras · 20 trucos», «3D · 40 trucos» y botón nuevo. |
| `despues-portada-768.png`, `despues-portada-390.png` | Los mismos cambios a 768 y 390 px, sin scroll horizontal. |
| `despues-letras-1440.png`, `despues-letras-390.png` | Carpeta «Letras» con sus 20 tarjetas y sus imágenes. |
| `despues-3d-1440.png` | Carpeta «3D» con sus 40 tarjetas. |
| `comparativa_trickvault_letras_3d.png` | Antes/después de la portada en una sola imagen, etiquetada. |
| `comparativa_trickvault_boton.png` | Detalle de cabecera antes (sin atajo) y después (píldora cian). |
| `foco-teclado-boton.png` | Anillo de foco del botón con Tab (3 px cian), no solo con `.focus()`. |
| `portada-anchos-report.json` | Medidas: 1440/768/390, `scrollWidth == innerWidth`, caja del botón. |
| `interaccion-report.json` | El botón abre `editar_generar` en pestaña nueva y TrickVault sigue abierta; «Volver a carpetas» restaura 27 carpetas. |
| `migracion-report.json` | Simulación del navegador con las 60 tarjetas guardadas en `xl-letras3d`: reparto 20/41, carpeta vieja fuera, `xl-dev` intacta. |

## Cómo se comprobó (reproducible)

- Chrome real por DevTools Protocol (driver propio `cdp.mjs`, sin dependencias) contra la URL
  pública, con perfil limpio y `?cb=` nuevo en cada petición para saltar la caché del CDN.
- Imágenes: las 60 rutas `assets/xl-letras|xl-3d/*.jpg` responden `200` en producción.
- Carga: consola solo con los dos avisos de Babel (`in-browser Babel transformer` y el aviso de
  > 500 KB del script incrustado), que ya salían antes; red sin errores.
- Caché: `x-hcdn-cache-status: DYNAMIC` (origen) y `Last-Modified` posterior al push.

## Fuera de alcance / conocido

- `ig-dcek-004` (/crosssection) desaparece al recargar por la deduplicación que ya existía; se
  comprobó que ocurre igual con el código de producción anterior (`migracion-report.json`).
- Las miniaturas usan `loading="lazy"`: en capturas de página completa algunas aún no han cargado,
  por eso se verificaron las 60 por HTTP además de contar las cargadas en el DOM.
