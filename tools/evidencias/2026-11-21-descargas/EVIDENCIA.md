# Descargas 1.3 — cuatro fases (21/11/2026)

Commit de la app: `9412d248` + arreglo de reanudación (este mismo documento).
Web: https://atnojs.es/apps/descargas/ · Worker: `tools/descargador/worker.mjs` 1.3

## Qué se ha hecho

1. **Previsualizar el enlace** antes de descargar (Fase 1).
2. **Cola con filtros, orden y pausa** (Fase 2).
3. **Errores explicados con registro y botón de arreglo** (Fase 3).
4. **Límite de velocidad, atajos y aviso al terminar** (Fase 4).

## Pruebas

- **API (copia local con auth de prueba + worker de mentira)**: 23/23 OK con
  `node tools/pruebas/descargas-api-test.mjs` (`API_BASE=http://127.0.0.1:4305`).
  Cubre: list, orden, `move`, pausa/reanudación, `pause_all`/`resume_all`,
  `update_tool`→`tool_result`, `probe`/`probe_status`/`sonda_result`, `add` con
  `limit_rate` y título, y `clear_finished`.
- **Producción, sonda real** (`jNQXAC9IVRw`): título «Me at the zoo», canal
  «jawed», 0:19, miniatura real y «llega a 240p»; 2160/1440/1080/720/480/360
  apagadas.
- **Producción, descarga real**: 720p de `dQw4w9WgXcQ` con límite 1 MB/s; el log
  del trabajo marca **1005–1023 KiB/s** (el límite llega a yt-dlp).
- **Producción, pausa y reanudación** (1080p de `9M9K-qkdPdA`, límite 1 MB/s):
  pausa al **34,2 %** con `.part` de **19.912.616 B** conservado; al reanudar,
  yt-dlp escribe **`[download] Resuming download at byte 19912616`** y sigue en
  36 % → 39,9 % → 41,7 %. **Arreglo**: `--force-overwrites` (que incluye
  `--no-continue`) ya solo se pasa en el primer intento.
- **Producción, error real** (`watch?v=zzzzzzzzzzz`): clase `nodisponible`, pista
  en español, log de yt-dlp y comando en «Ver registro»; «Copiar registro» avisa.
- **Cola**: reordenar en cola pausada, ↑ deshabilitado en la primera, chips con
  contadores, banner de pausa; «Limpiar terminadas» probado en local.
- **Responsive**: 393, 768 y 1484 sin desbordes; foco visible; `aria-pressed` en
  filtros; `alt` con el título en la miniatura.

## Capturas

- `01-inicio-con-previsualizacion.png` — tarjeta de la sonda + cola con filtros.
- `02-error-con-registro.png` — fallo explicado con registro y comando.
- `03-produccion.png` — producción con la sonda real de «Me at the zoo».
- `04-movil.png` — 393 px, sin desbordes.

## Limpieza

Trabajos de prueba y ficheros generados (`Rick Astley…`, `OMNIGET…`) borrados de
producción y de `D:\Descargas Y, I y T`; entradas de prueba del historial
eliminadas (71 → 68). La cola queda con los 32 trabajos terminados del usuario.
