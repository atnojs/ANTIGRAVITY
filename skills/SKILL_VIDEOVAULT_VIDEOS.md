---
name: videovault-videos
description: "Use when Antonio pide generar o rellenar vídeos de la app video-vault (cada tarjeta con su vídeo) o lanzar el lote 'genera los vídeos de las tarjetas'. Genera con Flow/Veo y sube cada vídeo a git (rama main) conforme se genera; Hostinger lo despliega."
---

# VideoVault — generar y subir vídeos de las tarjetas

## Objetivo

Cada tarjeta de `apps/video-vault` (clon de trickvault para vídeos) debe tener su
vídeo. Los vídeos se generan con Google Flow (Veo 3.1 Lite, 16:9) en el PC local
y se suben a la app **vía git, uno a uno, según se generan** (así no se pierden
aunque el navegador o la web se caigan a mitad).

## Estado (2026-09-24)

- **23/23 generados y subidos**: t01–t04, l01–l04, tm01–tm04, s01–s06, cm01–cm05.
- Los 5 de "Movimiento de cámara" (c01–c05) tienen vídeo propio subido por
  Antonio al servidor: **NO tocar, NO regenerar, NO borrar**.
- Guion de prompts: `E:/herramientas/google-flow/videovault_catalogo.json`.
- Registro de subidos (retomable): `E:/herramientas/google-flow/upload_log.json`.

## Dónde vive todo

- Lote (generar+subir): `E:/herramientas/google-flow/generate_and_upload.py`.
- CLI Flow: `E:/herramientas/google-flow/flow.py` (leer su SKILL.md antes de tocar).
- App en el worktree: `E:/e/ANTIGRAVITY_MAIN_WT/apps/video-vault/` (NO en
  `E:/ANTIGRAVITY/apps/`).
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

## Verificación

- [ ] `git log --oneline` del worktree: un commit por id, todos en `origin/main`.
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://www.atnojs.es/apps/video-vault/video_seed.json` → 200.
- [ ] `curl` de algún mp4 (p. ej. `.../uploads/videos/t01.mp4`) → 200.
- [ ] `video_store.php?action=list` sigue devolviendo c01–c05 intactos.
- [ ] Antonio recarga la app con Ctrl+F5 y ve los vídeos en las tarjetas.
