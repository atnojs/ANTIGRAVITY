"""Descarga del último resultado generado en Google Flow.

UI 2026-09 (flow.google.com):
- VIDEO: el hover sobre el tile dispara el preview en la red
  (googlevideo videoplayback itag=22 = 720p original). Se captura la URL con
  page.on('response') y se baja con page.request. Sin clics de menú ni
  expect_download/save_as (causaban TargetClosedError: el navegador moría).
- IMAGEN: menú contextual (clic derecho) -> Descargar -> resolución, y se
  captura la petición de imagen (flow-content.google/googleusercontent).
"""
import os
from pathlib import Path

from .browser import get_page

# Flow sirve JPEG aunque el archivo se pida como .png. Detectamos el formato
# real por cabecera y renombramos para que la extension no mienta.
_IMAGE_MAGIC = (
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)


def _sniff_image_ext(data: bytes) -> str | None:
    for magic, ext in _IMAGE_MAGIC:
        if data.startswith(magic):
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


SEL_TILE_VIDEO = 'flow-grid-tile-container:has(img[alt="Miniatura de vídeo generada"])'
SEL_TILE_IMAGE = 'flow-grid-tile-container:has(img[alt*="generada"], img[alt*="Recuadro que muestra la imagen del usuario"])'

RES_MENU_TEXTS = {
    "1K": ["Tamaño original", "720p"],
    "2K": ["2K", "Resolución mejorada"],
    "720p": ["720p", "Tamaño original"],
    "1080p": ["1080p", "Resolución mejorada"],
    "4K": ["4K", "Resolución mejorada"],
}


async def _wait_for_capture(page, captured: list, seconds: int):
    for _ in range(seconds):
        await page.wait_for_timeout(1000)
        if captured:
            return True
    return False


async def _capture_video_url(page) -> str:
    """Hover sobre el tile de video -> captura la URL del preview mp4."""
    captured = []

    async def on_response(resp):
        try:
            if "videoplayback" in resp.url:
                captured.append((resp.url, "video/mp4"))
            elif "flow-content.google" in resp.url and "video" in (resp.headers.get("content-type") or "").lower():
                captured.append((resp.url, "video/mp4"))
        except Exception:
            pass

    page.on("response", on_response)
    try:
        tile = page.locator(SEL_TILE_VIDEO).first
        if await tile.count() == 0:
            raise Exception("No hay tile de video terminado.")
        await tile.scroll_into_view_if_needed()
        await tile.hover(force=True)
        # el preview tarda ~1-2s en arrancar la petición
        if not await _wait_for_capture(page, captured, 10):
            # segundo intento: mover el ratón dentro del tile
            try:
                box = await tile.bounding_box()
                if box:
                    await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                if not await _wait_for_capture(page, captured, 8):
                    raise Exception("El hover no disparó el preview del video.")
            except Exception as exc:
                raise exc

        # Preferir flow-content.google; si no, la videoplayback con itag más alto
        urls = sorted(captured, key=lambda t: (0 if "flow-content.google" in t[0] else 1, -int((t[0].split("itag=")[1].split("&")[0]) if "itag=" in t[0] else 0)))
        return urls[0][0]
    finally:
        page.remove_listener("response", on_response)


async def _capture_image_url(page, resolution: str) -> str:
    """Hover/click sobre el tile -> captura la URL de la imagen por red.

    El menú contextual (clic derecho -> Descargar -> resolución) mataba el
    navegador (TargetClosedError). Método bueno (igual que video): hover
    sobre el tile; si no dispara petición, clic izquierdo (abre el visor y
    la imagen completa). Fallback: el src del img del tile.
    """
    captured = []

    async def on_response(resp):
        try:
            ct = (resp.headers.get("content-type") or "").lower()
            if "image" in ct and ("flow-content.google" in resp.url or "googleusercontent" in resp.url):
                captured.append((resp.url, ct))
        except Exception:
            pass

    page.on("response", on_response)
    try:
        # .last: el tile más nuevo es el resultado generado (la imagen de
        # referencia subida también coincide con el selector y va antes).
        tile = page.locator(SEL_TILE_IMAGE).last
        if await tile.count() == 0:
            raise Exception("No hay tile de imagen terminado.")
        await tile.scroll_into_view_if_needed()
        # Intento 1: hover (algunas vistas cargan preview/redes en hover)
        await tile.hover(force=True)
        await _wait_for_capture(page, captured, 8)

        # Intento 2: clic izquierdo (abre visor y carga la imagen completa)
        if not captured:
            try:
                await tile.click(force=True)
            except Exception:
                pass
            await _wait_for_capture(page, captured, 10)

        # Intento 3: src del thumbnail del tile (sin red)
        if not captured:
            try:
                src = await tile.locator("img").first.get_attribute("src")
                if src and ("flow-content.google" in src or "googleusercontent" in src):
                    captured.append((src, "image/jpeg"))
            except Exception:
                pass

        if not captured:
            raise Exception("No se capturó la imagen generada (hover/clic/src).")

        # Preferir la URL sin parámetros de tamaño reducido si existe
        def _score(u: str) -> int:
            s = 0
            if "=s" in u or "=w" in u or "-w" in u:  # thumbnails reducidos
                s -= 10
            if "googleusercontent" in u:
                s += 2
            return s

        urls = sorted(captured, key=lambda t: _score(t[0]), reverse=True)
        return urls[0][0]
    finally:
        page.remove_listener("response", on_response)
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass


async def download_latest(output_path: str, resolution: str = "1K", is_video: bool = False) -> str:
    """Descarga el último resultado. Retorna el path guardado. Debe llamarse con lock."""
    page = await get_page()
    url = await (_capture_video_url(page) if is_video else _capture_image_url(page, resolution))
    resp = await page.request.get(url)
    if not resp.ok:
        raise Exception("Descarga HTTP %s: %s" % (resp.status, url[:120]))
    body = await resp.body()
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(body)
    if not is_video:  # el mp4 mantiene su extension
        real = _sniff_image_ext(body)
        if real and out.suffix.lower() != real:
            fixed = out.with_suffix(real)
            os.replace(out, fixed)
            output_path = str(fixed)
    return output_path


async def delete_latest_card(is_video: bool = False) -> None:
    """Borra el último resultado generado (fallback para reintentar)."""
    page = await get_page()

    sel_card = SEL_TILE_VIDEO if is_video else SEL_TILE_IMAGE
    card = page.locator(sel_card).first
    if await card.count() == 0:
        return

    await card.click(button="right", force=True)
    await page.wait_for_timeout(1500)
    del_item = page.locator('[role="menuitem"]:has-text("Mover a la papelera")').first
    if await del_item.count() > 0:
        await del_item.click(force=True)
        await page.wait_for_timeout(1000)
