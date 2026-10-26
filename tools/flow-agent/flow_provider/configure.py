"""
Selección de parámetros de generación en el panel de ajustes de Google Flow.

UI actual (validada 2026-09-24 en flow.google.com):
- El activador es el chip inferior izquierdo: button[aria-label="Activador de ajustes"].
- Dentro del panel: toggle Imagen/Vídeo (radios con aria-checked), ratios
  (imagen: 16:9/4:3/1:1/3:4/9:16; video: solo 16:9 y 9:16), desplegable de
  modelo (aria-label "Seleccionar familia de modelos", menuitems con el nombre
  del modelo), resolución (360p/720p) y duración (4s..10s) en video, y
  cantidad x1..x4.
- No hay botón Guardar: los cambios se aplican en vivo. Cerrar con Escape.
"""
import re

from .browser import get_page

SEL_TUNE_BTN = 'button[aria-label="Activador de ajustes"]'
SEL_RADIO_IMAGEN = '[role="radio"]:has-text("Imagen")'
SEL_RADIO_VIDEO = '[role="radio"]:has-text("Vídeo")'
SEL_MODEL_TRIGGER = 'button[aria-label="Seleccionar familia de modelos"]'

VIDEO_RATIO_FALLBACK = {"4:3": "16:9", "1:1": "16:9", "3:4": "9:16"}

IMAGE_MODELS = ["Nano Banana Pro", "Nano Banana 2 Lite", "Nano Banana 2"]
VIDEO_MODELS = ["Veo 3.1 - Lite", "Veo 3.1 - Fast", "Veo 3.1 - Quality", "Omni Flash"]

# Flow renombra modelos sin avisar: el 2026-10-26 «Nano Banana 2» pasó a
# «Nano Banana 2.1» y «Omni Flash» ya se llamaba «Omni 1.1 Flash». Se pide
# primero el nombre exacto y, solo si ya no existe, sus alias conocidos.
MODEL_ALIASES = {
    "Nano Banana 2": ["Nano Banana 2.1"],
    "Omni Flash": ["Omni 1.1 Flash"],
}


async def _open_tune(page) -> None:
    btn = page.locator(SEL_TUNE_BTN)
    await btn.first.wait_for(state="visible", timeout=15000)
    await btn.first.click(force=True)
    await page.wait_for_timeout(900)


async def _close_tune(page) -> None:
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(600)


async def _click_radio(page, selector: str, what: str) -> None:
    loc = page.locator(selector)
    if await loc.count() == 0:
        print(f"  aviso: no encontré {what} ({selector}); se mantiene el valor por defecto de Flow.")
        return
    radio = loc.first
    if (await radio.get_attribute("aria-checked")) != "true":
        await radio.click(force=True)
        await page.wait_for_timeout(300)


async def _select_model(page, model: str, valid: list[str]) -> None:
    if not model:
        return
    trig = page.locator(SEL_MODEL_TRIGGER)
    if await trig.count() == 0:
        # Seguir con el modelo que Flow tenga seleccionado gastaría puntos y
        # devolvería otro modelo distinto del pedido: mejor abortar.
        raise ValueError("no encontré el desplegable de modelo de Flow")
    await trig.first.click(force=True)
    await page.wait_for_timeout(700)
    elegido = None
    for nombre in [model] + MODEL_ALIASES.get(model, []):
        item = page.locator('[role="menuitem"]').filter(
            has_text=re.compile(re.escape(nombre) + r"\s*$")
        )
        if await item.count() > 0:
            elegido = item.first
            if nombre != model:
                print(f"  aviso: Flow ya no llama «{model}» al modelo; uso «{nombre}».")
            break
    if elegido is None:
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
        # Igual que arriba: avisar y continuar generaría con otro modelo y
        # consumiría puntos de la cuenta sin que el usuario lo sepa.
        raise ValueError(f"modelo '{model}' no está en el menú de Flow (válidos: {valid})")
    await elegido.click(force=True)
    await page.wait_for_timeout(400)


async def select_image_mode(
    aspect_ratio: str = "9:16",
    count: int = 1,
    model: str = "Nano Banana 2",
) -> None:
    """Configura tipo, ratio, cantidad y modelo de IMAGEN. Debe llamarse con lock."""
    page = await get_page()

    if aspect_ratio not in ("16:9", "4:3", "1:1", "3:4", "9:16"):
        raise ValueError(f"aspect_ratio '{aspect_ratio}' no válido. Opciones: 16:9, 4:3, 1:1, 3:4, 9:16")

    await _open_tune(page)
    await _click_radio(page, SEL_RADIO_IMAGEN, "toggle Imagen")
    await _click_radio(page, f'[role="radio"]:has-text("{aspect_ratio}")', f"ratio {aspect_ratio}")
    if count in (1, 2, 3, 4):
        await _click_radio(page, f'[role="radio"]:has-text("x{count}")', f"cantidad x{count}")
    await _select_model(page, model, IMAGE_MODELS)
    await _close_tune(page)


async def select_video_mode(
    mode: str = "texto",
    model: str = "Veo 3.1 - Lite",
    aspect_ratio: str = "9:16",
    count: int = 1,
) -> None:
    """Configura tipo, ratio, cantidad y modelo de VIDEO. Debe llamarse con lock.

    'mode': 'texto' (default) usa el modo Ingredientes de la UI actual.
    'fotogramas' activa el modo Fotogramas (start/end frames).
    """
    page = await get_page()

    ratio = VIDEO_RATIO_FALLBACK.get(aspect_ratio, aspect_ratio)
    if ratio != aspect_ratio:
        print(f"  aviso: el video solo admite 16:9 o 9:16; uso {ratio} en lugar de {aspect_ratio}.")
    if ratio not in ("16:9", "9:16"):
        raise ValueError(f"aspect_ratio '{aspect_ratio}' no válido para video (16:9 o 9:16).")

    await _open_tune(page)
    await _click_radio(page, SEL_RADIO_VIDEO, "toggle Vídeo")
    if mode == "fotogramas":
        await _click_radio(page, '[role="radio"]:has-text("Fotogramas")', "modo Fotogramas")
    else:
        await _click_radio(page, '[role="radio"]:has-text("Ingredientes")', "modo Ingredientes")
    await _click_radio(page, f'[role="radio"]:has-text("{ratio}")', f"ratio {ratio}")
    if count in (1, 2, 3, 4):
        await _click_radio(page, f'[role="radio"]:has-text("x{count}")', f"cantidad x{count}")
    await _select_model(page, model, VIDEO_MODELS)
    await _close_tune(page)
