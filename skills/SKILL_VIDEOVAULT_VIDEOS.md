---
name: videovault-videos
description: "Use when Antonio pide generar o rellenar vídeos de la app video-vault (cada tarjeta con su vídeo) o lanzar el lote 'genera los vídeos de las tarjetas'. Genera con Flow/Veo y sube cada vídeo a git (rama main) conforme se genera; Hostinger lo despliega."
---

# VideoVault — generar y subir vídeos de las tarjetas

## ⚠️ Límite de puntos de Flow (2026-10-15)

La cuenta tiene un plan de Google AI que da **50 puntos de Flow al día**, y **cada
vídeo de Veo 3.1 Lite cuesta 10 puntos → 5 vídeos/día**. Al agotarlos:

- La UI muestra *"Te has quedado sin puntos de Google Flow"* y **elimina el botón de
  enviar del compositor** (ya no es un botón deshabilitado: no existe en el DOM), así
  que `flow.py video` falla con `Locator.click: Timeout ... "Iniciar generación"`.
- **No es un fallo del código ni de la red**: hay que esperar a la reposición diaria
  o recargar puntos. Comprobar con:
  `python tools/video-vault/comprobar_cuota_flow.py` (imprime `CUOTA_AGOTADA` / `CUOTA_OK`).
- Saldo y movimientos: badge **PRO** en `https://flow.google.com/` →
  *"0 puntos de Google Flow"*, y detalle en `https://one.google.com/ai/activity`
  (cada generación aparece como `-10`).
- El lote (`lanzar_lote.ps1`) detecta la cuota agotada y se detiene solo en vez de
  reintentar en bucle; `vigilar_cuota.py` lo relanza cuando hay puntos.

### ⚠️ La reposición diaria NO está llegando (verificado 2026-10-16)

Los días 15 y 16 de octubre el contador siguió a **0** pese a ~10 pasadas del runner:
en `one.google.com/ai/activity` **no aparece ninguna concesión nueva** desde el
14/10 (solo un reembolso de +10). Es decir: se consumieron los 50 puntos del ciclo y
no se han repuesto. No hay nada que arreglar en el código; el lote reanudará solo en
cuanto Google otorgue puntos nuevos.

Alternativas si se quiere acelerar (decide Antonio, no el agente):
- **Comprar puntos de IA**: `one.google.com/ai/credits` → 2.500 pts = 27,99 €,
  5.000 = 54,99 €, 20.000 = 219,99 € (cada vídeo = 10 pts).
- **Cambiar a un plan superior** (da límites/lotes mayores).

## Automatización diaria (desde 2026-10-15)

Antonio pidió que los vídeos suban "poco a poco" aprovechando los puntos diarios,
sin depender de que haya un chat abierto:

- **Tarea programada de Windows** `Antigravity-VideoVault-Diario` (usuario actual,
  no SYSTEM: necesita el perfil de Chrome de Flow): se dispara a las **09:00, 13:00,
  17:00 y 21:00**, con `-StartWhenAvailable`.
  - Revisar: `Get-ScheduledTaskInfo -TaskName 'Antigravity-VideoVault-Diario'`
  - Lanzar a mano: `Start-ScheduledTask -TaskName 'Antigravity-VideoVault-Diario'`
- **Runner**: `tools/video-vault/runner_diario.py --max-videos 5 --pausa 90
  --esperar-max-min 75` (invocado desde `tarea_diaria.ps1`). Genera **hasta 5 vídeos
  por pasada** (los que dan los 50 puntos diarios), uno a uno con 90 s de pausa, y si
  no hay puntos espera en bucle hasta 75 min antes de rendirse.
- **Logs**: `tools/video-vault/_runner_diario.log` (resumen) y `_runner_task.log`
  (salida completa). El runner termina auditando repo y producción.
- Las tareas se ejecutan **con la sesión de Windows iniciada** y el PC encendido; si
  el PC está apagado, `-StartWhenAvailable` la lanza al encender.
- Recordatorio en la sesión de DSH a las 10:30 (Atlantic/Canary) para revisar el
  resultado del día.

## Objetivo

Cada tarjeta de `apps/video-vault` (clon de trickvault para vídeos) debe tener su
vídeo. Los vídeos se generan con Google Flow (Veo 3.1 Lite, 16:9) en el PC local
y se suben a la app **vía git, uno a uno, según se generan** (así no se pierden
aunque el navegador o la web se caigan a mitad).

## Estado (2026-10-06)

- **34/34 generados y subidos**: t01–t04, l01–l04, tm01–tm04, s01–s06, cm01–cm05
  (tanda del 24/09) + **c06–c11, tm05, l05, cm06–cm08** (los 11 comandos de vídeo
  nuevos de las capturas del 06/10, añadidos al catálogo en el commit `ca8a4b3`).
- El catálogo de la app tiene **39 comandos**: los 34 del seed + los 5 de
  "Movimiento de cámara" (c01–c05), que tienen vídeo propio subido por Antonio al
  servidor (`video_store.php`): **NO tocar, NO regenerar, NO borrar**.
- Guion de prompts: `E:/herramientas/google-flow/videovault_catalogo.json`.
- Registro de subidos (retomable): `E:/herramientas/google-flow/upload_log.json`.

## Dónde vive todo

- Lote (generar+subir): `E:/herramientas/google-flow/generate_and_upload.py`.
- CLI Flow: `E:/herramientas/google-flow/flow.py` (leer su SKILL.md antes de tocar).
- App en el repo único: `E:/ANTIGRAVITY/apps/video-vault/` (los worktrees están
  prohibidos: `generate_and_upload.py` ya apunta a `E:\ANTIGRAVITY`).
- Vídeos de la app: `apps/video-vault/uploads/videos/<id>.mp4` (en git, con `add -f`
  porque `uploads/` está en `.gitignore`).
- Mapa id→ruta que carga el frontend: `apps/video-vault/video_seed.json`.

## Flujo de subida (ya validado, NO cambiar sin probar)

1. Cada job: `python flow.py video --prompt <p> --ratio 16:9 --model "Veo 3.1 - Lite" --name <id> --out outputs/videovault_catalogo`
   **con `FLOW_HEADLESS=true`** (obligatorio en lotes).
2. Si el mp4 se descargó → copiarlo a `apps/video-vault/uploads/videos/<id>.mp4`,
   añadir `<id>: "uploads/videos/<id>.mp4"` a `video_seed.json`.
3. `git add -f <mp4> video_seed.json` → `git commit -m "feat(video-vault): vídeo de ejemplo <id>"` → `git push origin main`.
   **Un commit+push por vídeo**, nunca en bloque.
4. Registrar `<id>: "subido"` en `upload_log.json` (permite retomar sin repetir).
5. Jobs fallidos: se reintentan al final (2 rondas). Si queda algo sin subir, el
   script sale con código 2 y lo dice en el resumen.

## Lanzar el lote

- Completo: `cd /e/herramientas/google-flow && python generate_and_upload.py`
  (en background, con notify; ~1.5–2 min por vídeo).
- Solo falta volver a ejecutar: el script retoma solo (log + mp4s existentes).
- Desde Telegram (solo si corre el PC): "genera los vídeos de las tarjetas",
  "lanza el lote de vídeos de video-vault" o "continúa el trabajo de videovault-videos".
  Plan en `E:/hermes-data/work/videovault-videos/PLAN.md` (+ copia en VPS).

## Cómo los muestra la app

- El frontend hace `fetch('video_seed.json')` y rellena el `videoUrl` de las
  tarjetas que NO tienen vídeo. **El servidor manda**: si un id ya tiene vídeo en
  `video_store.php`, el seed no lo pisa (por eso c01–c05 quedan intactos).
- Si Antonio quita un vídeo de una tarjeta con la app, el id queda marcado en
  `localStorage['videovault_skipped_videos']` y el seed no lo repone. Si vuelve a
  subir un vídeo a esa tarjeta, se desmarca solo.
- Antonio debe recargar con **Ctrl+F5** para ver los cambios.

## Pitfalls validados (lecciones de la primera corrida)

1. **FLOW_HEADLESS=true siempre en lotes.** Con ventana visible, Chrome se cerraba
   a mitad de corrida (`TargetClosedError`) y se perdía todo.
2. **Descargar por HOVER del tile, nunca por el menú "Descargar".** El menú +
   `expect_download`/`save_as` mataba el navegador. Método bueno: hover sobre
   `flow-grid-tile-container:has(img[alt="Miniatura de vídeo generada"])` → capturar
   con `page.on('response')` la URL `googlevideo.com/videoplayback?...&itag=22`
   (preview 720p) o `flow-content.google/video/...` → bajar con `page.request.get`
   (comparte cookies). Implementado en `flow_provider/download.py`.
3. **El visor (clic en la miniatura) NO expone `<video src>`** en el DOM: no pierdas
   tiempo con esa vía. El menú contextual (clic derecho) SÍ se abre en headless.
4. UI Flow 2026-09: botón "Nuevo proyecto"; panel de ajustes
   `button[aria-label="Activador de ajustes"]`; prompt en div ProseMirror
   (clic + Ctrl+A, no `.fill()`); envío "Iniciar generación"; tile final
   `img[alt="Miniatura de vídeo generada"]`.
5. `uploads/` está en `.gitignore`: usar siempre `git add -f`.
6. Si la sesión de Flow caduca: `python flow.py login` (ventana visible, Antonio
   inicia sesión; para lotes seguir en headless).
7. La descarga por menú abre también `flow-content.google/video/<uuid>?Signature=...`
   (firma con caducidad): usar la URL al momento, no guardarla.
8. **Un job puede fallar y se reintenta solo** (2 rondas al final). En la tanda del
   06/10 `cm06` falló a la primera y salió bien en el reintento: no relanzar el lote
   a mano por un fallo aislado.
9. **Hostinger a veces no publica los últimos pushes.** En la tanda del 06/10 el
   seed desplegado se quedó en 32/34 (faltaban `cm06` y `cm08`) más de 4 minutos.
   Solución del proyecto: commit vacío y push
   (`git commit --allow-empty -m "chore: re-disparar despliegue (...)"`), y volver a
   comprobar; puede hacer falta más de un intento.

## Verificación

- [ ] `git log --oneline` del repo: un commit por id, todos en `origin/main`.
- [ ] `video_seed.json` en `main` tiene una entrada por id nuevo.
- [ ] **Comprobar los 39 comandos uno a uno**: para cada id del catálogo, HEAD de su
      mp4 (los 34 del seed + los 5 del `video_store.php`) → 200; ninguno sin vídeo.
- [ ] `curl` de algún mp4 (p. ej. `.../uploads/videos/t01.mp4`) → 200.
- [ ] `video_store.php?action=list` sigue devolviendo c01–c05 intactos.
- [ ] Si el seed desplegado no incluye los últimos ids, re-disparar el despliegue
      (pitfall 9) antes de dar la tanda por publicada.
- [ ] Medir en Chrome sobre la app desplegada (Playwright): sirviendo el seed sin los
      ids nuevos la tarjeta sale sin vídeo, y con el seed real el `<video>` carga a
      1280×720. En móvil (390 px): sin desbordes horizontales.
- [ ] Antonio recarga la app con Ctrl+F5 y ve los vídeos en las tarjetas.
