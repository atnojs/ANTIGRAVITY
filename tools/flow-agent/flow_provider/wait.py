"""
Espera de resultados de generación en Google Flow.

Flow tiene 3 fases post-submit para imágenes:
  Fase 1: card con blur + contador % (6 → 99)
  Fase 2: reveal animation ~5s — img aparece pero toolbar NO interactivo
  Fase 3: imagen lista — toolbar (more_vert) visible al hover

Incluye detección de errores de generación ("No se pudo generar") con retry automático.
"""
import asyncio
from .browser import get_page

# UI 2026-09: alt nuevo "Recuadro que muestra la imagen del usuario"
SEL_RESULT_IMAGE = 'img[alt="Imagen generada"], img[alt="Recuadro que muestra la imagen del usuario"]'
SEL_RESULT_CARD  = '[aria-roledescription="draggable"]'
SEL_MORE_MENU    = '[aria-roledescription="draggable"] button:has(i:text-is("more_vert"))'

# Selectores de error de generación — usar texto literal para evitar falsos positivos
# con cards de loading que también tienen data-tile-id
SEL_ERROR_TEXT = ':text("No se pudo generar")'
SEL_QUOTA_TEXT = ':text("Has alcanzado tu límite de uso")'
SEL_RETRY_BTN  = 'button:has(i:text-is("refresh"))'


async def _handle_generation_error(page, max_retries: int, attempt: int) -> bool:
    """Detecta card de error y clicka Reintentar. Retorna True si reintentó."""
    error_card = page.locator(SEL_ERROR_TEXT)
    if await error_card.count() == 0:
        return False

    # UI 2026-07: mientras el agente genera pueden convivir tiles de error
    # transitorios con tiles que muestran porcentaje de progreso. Si algo
    # sigue progresando, no es un fallo definitivo: seguir esperando.
    try:
        progressing = await page.evaluate(
            "() => Array.from(document.querySelectorAll('[data-tile-id]'))"
            ".some(t => /\\d+\\s*%/.test(t.innerText))"
        )
        if progressing:
            return False
    except Exception:
        pass

    if attempt >= max_retries:
        raise Exception(
            f"Generación falló {max_retries + 1} veces consecutivas. "
            "Flow reporta: 'No se pudo generar'."
        )

    print(f"  ⚠️  Error de generación detectado (intento {attempt + 1}/{max_retries + 1}). Reintentando...")
    retry_btn = page.locator('[data-tile-id] ' + SEL_RETRY_BTN)
    if await retry_btn.count() > 0:
        await retry_btn.first.click()
        await page.wait_for_timeout(3000)
        # Esperar que el card de error desaparezca antes de re-poll
        try:
            await error_card.first.wait_for(state="hidden", timeout=10_000)
        except Exception:
            pass
        return True

    # UI 2026-07 (agente): la card de error ofrece 'undo' (Reutilizar instrucción)
    # y 'delete_forever' (Borrar). Reutilizamos la instrucción, reenviamos y
    # borramos las cards de error para que la espera detecte el nuevo intento.
    # Nota: el panel del agente puede interceptar el puntero -> force=True y
    # nunca crashear aquí: si falla el click, seguimos esperando.
    try:
        undo_btn = page.locator('[data-tile-id] button:has(i:text-is("undo"))')
        if await undo_btn.count() > 0:
            await undo_btn.first.click(force=True, timeout=5000)
            await page.wait_for_timeout(1500)
            del_btn = page.locator('[data-tile-id] button:has(i:text-is("delete_forever"))')
            for _ in range(8):
                if await del_btn.count() == 0:
                    break
                await del_btn.first.click(force=True, timeout=5000)
                await page.wait_for_timeout(1200)
            submit = page.locator('button[aria-label="Iniciar generación"]')
            if await submit.count() > 0:
                await submit.first.click(force=True, timeout=5000)
                await page.wait_for_timeout(3000)
                return True
    except Exception as e:
        print(f"  ⚠️  Reintento vía 'Reutilizar instrucción' falló ({type(e).__name__}). Continuando espera...")
        return False

    # Si no hay botón retry, no crashear — puede ser falso positivo transiente
    print("  ⚠️  Texto de error detectado pero sin botón Reintentar. Continuando espera...")
    return False


async def wait_for_image(timeout_ms: int = 1_800_000, max_retries: int = 2, pre_submit_count: int | None = None) -> None:
    """Espera que la imagen sea generada y que el toolbar esté listo. Reintenta si Flow falla.

    Sin límite práctico: 30 min por intento (2026-10-22; antes 4 min). En horas
    punta Flow puede tardar bastante más y el corte prematuro tiraba la generación."""
    page = await get_page()

    success_loc = page.locator(SEL_RESULT_IMAGE)
    error_loc   = page.locator(SEL_ERROR_TEXT)
    quota_loc   = page.locator(SEL_QUOTA_TEXT)
    race        = success_loc.or_(error_loc).or_(quota_loc)

    for attempt in range(max_retries + 1):
        try:
            await race.first.wait_for(state="visible", timeout=timeout_ms)
        except Exception:
            if await quota_loc.count() > 0 and await success_loc.count() == 0:
                raise TimeoutError("CUOTA_AGOTADA: Has alcanzado tu límite de uso en Flow. Espera a que se restablezca.")
            raise TimeoutError(f"Generación de imagen no completó en {timeout_ms // 1000}s")

        # ¿Cuota agotada? (UI 2026-09-27: card de error propia, no hay imagen)
        if await quota_loc.count() > 0 and await success_loc.count() == 0:
            raise TimeoutError("CUOTA_AGOTADA: Has alcanzado tu límite de uso en Flow. Espera a que se restablezca.")

        # ¿Error de generación?
        if await error_loc.count() > 0 and await success_loc.count() == 0:
            if await _handle_generation_error(page, max_retries, attempt):
                continue
        break

    # Confirmar carga según estrategia:
    generic_fn = (
        "() => {"
        "const imgs = document.querySelectorAll('img[alt=\"Imagen generada\"], img[alt=\"Recuadro que muestra la imagen del usuario\"], [data-tile-id] img');"
        "const img = imgs[imgs.length - 1];"
        "return img && img.complete && img.naturalWidth > 0;"
        "}"
    )
    if pre_submit_count is not None:
        # Modo estricto: esperar MAS imagenes generadas que el baseline.
        # (Se cuentan solo resultados 'Imagen generada'; los draggables
        # incluyen referencias adjuntas y son un baseline engañoso.)
        try:
            await page.wait_for_function(
                f"""() => {{
                    const imgs = document.querySelectorAll('img[alt="Imagen generada"], img[alt="Recuadro que muestra la imagen del usuario"]');
                    if (imgs.length <= {pre_submit_count}) return false;
                    const img = imgs[0];
                    return img && img.complete && img.naturalWidth > 0;
                }}""",
                timeout=timeout_ms
            )
        except Exception:
            # Fallback UI 2026-09+: el resultado puede venir sin el alt clásico.
            await page.wait_for_function(generic_fn, timeout=150000)
    else:
        # Confirmar que la imagen general esté cargada
        try:
            await page.wait_for_function(
                """() => {
                    const img = document.querySelector('img[alt="Imagen generada"], img[alt="Recuadro que muestra la imagen del usuario"]');
                    return img && img.complete && img.naturalWidth > 0;
                }""",
                timeout=timeout_ms
            )
        except Exception:
            await page.wait_for_function(generic_fn, timeout=150000)
    # Hover omitido para evitar apertura accidental de visualizadores a pantalla completa
    return


async def wait_for_video(timeout_ms: int = 3_600_000, max_retries: int = 2, pre_submit_count: int | None = None) -> None:
    """Espera que el video sea generado. Reintenta si Flow falla. Default 60 min (antes 6)."""
    page = await get_page()

    success_loc = page.locator('img[alt="Miniatura de vídeo generada"]')
    error_loc   = page.locator(SEL_ERROR_TEXT)
    race        = success_loc.or_(error_loc)

    for attempt in range(max_retries + 1):
        try:
            await race.first.wait_for(state="visible", timeout=timeout_ms)
        except Exception:
            raise TimeoutError(f"Generación de video no completó en {timeout_ms // 1000}s")

        if await error_loc.count() > 0 and await success_loc.count() == 0:
            if await _handle_generation_error(page, max_retries, attempt):
                continue
        break

    if pre_submit_count is not None:
        await page.wait_for_function(
            f"""() => {{
                const thumbs = document.querySelectorAll('img[alt="Miniatura de vídeo generada"]');
                return thumbs.length > {pre_submit_count};
            }}""",
            timeout=timeout_ms
        )

    # Confirmar carga de video (readyState >= 2)
    try:
        await page.wait_for_function(
            """() => {
                const card = document.querySelector('[aria-roledescription="draggable"]');
                const vid = card ? card.querySelector('video') : document.querySelector('video');
                if (!vid) return false;
                return vid.readyState >= 2 || (vid.src && vid.src.length > 0);
            }""",
            timeout=80000
        )
    except Exception:
        pass  # Fallback: flow a veces renderiza miniatura y oculta src
    # Hover omitido para evitar apertura accidental de visualizadores a pantalla completa
    return
