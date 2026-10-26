"""
Selección de items del canvas y upload de frames para modo Fotogramas/Ingredientes.
"""
from .browser import get_page
from .registry import capture_name
import re


SEL_ADD_INGREDIENT = ('button[aria-haspopup="dialog"]:has-text("Crear"), '
                      'button[aria-label="Añadir ingredientes a ventana para peticiones"]')
async def select_ingredients_by_name(uuids: list[str]) -> None:
    """Marca items del canvas como ingredientes a través del Dialog Modal de Flow, buscando por UUID."""
    page = await get_page()
    PANEL_RECURSOS = 'div[role="dialog"]:has(input[placeholder*="Buscar"]), div[role="dialog"]:has(input[placeholder*="Search"])'
    
    for uuid in uuids:
        encontrado = False
        # Intentar hasta 3 veces con recarga de página intermedia si no se encuentra (para curación por retraso del backend)
        for intento_busqueda in range(3):
            await page.locator(SEL_ADD_INGREDIENT).first.click()
            await page.wait_for_timeout(2500)
            
            # Intentar buscar el ingrediente directamente en la pestaña activa
            target_img = page.locator(PANEL_RECURSOS).locator(f'img[src*="{uuid}"]')
            
            if await target_img.count() == 0:
                # Probar diferentes textos posibles para las pestañas de recursos en toda la página
                for tab_text in ["Cargas", "Uploads", "Imágenes", "Images", "Todos", "All", "Lienzo", "Canvas"]:
                    tab = page.locator('div, span, p, button, [role="tab"]').get_by_text(tab_text, exact=False).first
                    if await tab.count() > 0:
                        print(f"    [Robusto] Haciendo clic en pestaña: {tab_text}")
                        await tab.click()
                        await page.wait_for_timeout(2000)
                        # Volver a verificar
                        if await target_img.count() > 0:
                            break
            
            # Si aún no se encuentra, realizar scroll vertical robusto para cargar elementos del virtual scroll
            if await target_img.count() == 0:
                print(f"    [Robusto] Iniciando scroll vertical en la lista del modal de recursos para UUID: {uuid}...")
                for scroll_step in range(10):
                    await page.evaluate(f"""() => {{
                        const dialog = document.querySelector('{PANEL_RECURSOS}');
                        if (!dialog) return;
                        const divs = dialog.querySelectorAll('div');
                        for (const div of divs) {{
                            if (div.scrollHeight > div.clientHeight) {{
                                div.scrollTop += 250;
                            }}
                        }}
                    }}""")
                    await page.wait_for_timeout(1200)
                    if await target_img.count() > 0:
                        print(f"    [Robusto] ¡Ingrediente encontrado tras scroll en paso {scroll_step+1}!")
                        break
            
            if await target_img.count() > 0:
                encontrado = True
                break
                
            # Si no se encontró, cerramos el panel con Escape, esperamos y recargamos la página (auto-curación)
            if intento_busqueda < 2:
                print(f"    [Auto-Curación] Ingrediente {uuid} NO visible en intento {intento_busqueda+1}. Cerrando panel, esperando 5s y recargando página...")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(5000)
                await page.reload()
                await page.wait_for_timeout(5000)
        
        # Verificación final
        if not encontrado:
            # Tomar una captura para depurar
            from pathlib import Path
            debug_dir = Path(__file__).parent.parent / "_debug"
            debug_dir.mkdir(parents=True, exist_ok=True)
            shot = str(debug_dir / "select_ingredient_error.png")
            await page.screenshot(path=shot)
            print(f"    [ERROR] Captura del diálogo de recursos guardada en {shot}")
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(1000)
            raise ValueError(f"No se encontró el ingrediente con UUID {uuid} in el proyecto.")
            
        await target_img.first.click()
        await page.wait_for_timeout(1500)
        
        # Buscar el botón 'Agregar a la instrucción' o su equivalente en inglés dentro del panel flotante
        import re
        add_btn = page.locator(PANEL_RECURSOS).locator('button, [role="button"]').filter(
            has_text=re.compile(r"(Agregar a la instrucción|Add to instrucción|Add to instruction|Add to prompt)", re.IGNORECASE)
        ).first
        
        try:
            # Esperar a que el botón de agregar esté visible en la previsualización
            await add_btn.wait_for(state="visible", timeout=6000)
            await add_btn.click()
            await page.wait_for_timeout(1000)
        except Exception:
            # Si no se encuentra o ya se cerró el panel, usar Escape como fallback
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(1000)


async def _upload_and_attach(page, image_path: str) -> None:
    """UI actual (2026-07): abre el diálogo 'Crear', sube el archivo con
    'Cargar medios' y lo adjunta a la instrucción del agente ('Agregar a la
    instrucción'). El asset queda como chip del prompt y el agente lo usa
    como referencia/fotograma."""
    import re as _re

    await page.wait_for_selector(SEL_ADD_INGREDIENT, state="visible", timeout=8_000)
    await page.locator(SEL_ADD_INGREDIENT).first.click()
    await page.wait_for_timeout(2_000)

    upload_btn = page.locator('button, [role="button"]').filter(
        has_text=_re.compile(r"(Cargar medios|Upload media|Subir imagen|Subir archivo multimedia)", _re.IGNORECASE)
    ).first
    if await upload_btn.count() == 0:
        raise Exception("Botón 'Cargar medios' o 'Upload' no encontrado.")

    async with page.expect_file_chooser(timeout=8_000) as fc_info:
        await upload_btn.click(force=True)
    file_chooser = await fc_info.value
    await file_chooser.set_files(str(image_path))

    # Tras subir, Flow muestra la previsualización con 'Añadir a petición'.
    add_btn = page.locator('button, [role="button"]').filter(
        has_text=_re.compile(r"(Añadir a petición|Agregar a la instrucción|Add to instruction|Add to prompt)", _re.IGNORECASE)
    ).first
    try:
        await add_btn.wait_for(state="visible", timeout=60_000)
        # Esperar a que termine la subida (el botón aparece ya con "Subiendo X%")
        try:
            await page.wait_for_function(
                "() => !document.body.innerText.includes('Subiendo')",
                timeout=120_000)
        except Exception:
            pass
        await add_btn.click()
        await page.wait_for_timeout(1_000)
    except Exception:
        await page.keyboard.press("Escape")
        raise Exception(
            "La imagen se subió pero no apareció 'Añadir a petición'; "
            "no quedó adjunta al prompt."
        )
    # Cerrar el diálogo si sigue abierto.
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(800)


async def upload_standalone_image(image_path: str) -> None:
    """Sube una imagen y la adjunta a la instrucción del agente (referencia/edición)."""
    page = await get_page()
    await _upload_and_attach(page, image_path)



async def get_canvas_count() -> int:
    """Retorna cantidad actual de items en el canvas."""
    page = await get_page()
    return await page.locator('[aria-roledescription="draggable"]').count()


async def get_generated_count(is_video: bool = False) -> int:
    """Cuenta SOLO resultados generados (imagenes o videos terminados).

    UI 2026-09: la miniatura de video puede no llevar alt; contar también
    tiles con <video> real. El baseline fiable para esperar un resultado
    nuevo es el numero de resultados generados."""
    page = await get_page()
    if is_video:
        sel = 'img[alt="Miniatura de vídeo generada"]'
    else:
        sel = 'img[alt="Imagen generada"], img[alt="Recuadro que muestra la imagen del usuario"]'
    return await page.locator(sel).count()


SEL_SLOTS_INICIAR = 'div:text-is("Iniciar")'
SEL_SLOTS_FIN = 'div:text-is("Fin")'
SEL_UPLOAD_BTN = ':text-is("Subir imagen")'
SEL_SLOT_LOADED = 'img[alt*="contenido multimedia"]'

# --- Fotogramas de vídeo (UI 2026-10-26) -----------------------------------
# En Video > Fotogramas el compositor muestra dos huecos ('Inicio' y 'Fin').
# Al pulsar uno se abre el panel «Selecciona una imagen de encuadre», desde el
# que se sube el archivo ('Subir archivo...') y se confirma ('Añadir a
# petición'). Ese botón permanece DESHABILITADO mientras Flow procesa la
# subida: hay que esperar a que se habilite antes de pulsarlo.
SEL_FRAME_SLOT_INICIAL = ('flow-ingredient-bar button:text-is("Inicio"), '
                          'flow-ingredient-bar button:text-is("Start")')
SEL_FRAME_SLOT_FINAL = ('flow-ingredient-bar button:text-is("Fin"), '
                        'flow-ingredient-bar button:text-is("End")')
SEL_FRAME_UPLOAD = re.compile(r"(Subir archivo|Upload file|Upload media)", re.IGNORECASE)
SEL_FRAME_CONFIRM = re.compile(r"(Añadir a petición|Add to prompt|Add to request)", re.IGNORECASE)
SEL_FRAME_PICKER_TITULO = re.compile(
    r"(Selecciona una imagen de encuadre|Select a frame|Choose a frame)", re.IGNORECASE)
SEL_FRAME_CHIP = 'flow-ingredient-bar flow-image-ingredient-chip'


async def _attach_frame_via_picker(page, slot: str, image_path: str) -> None:
    """Adjunta un fotograma usando los huecos reales de Video > Fotogramas.

    Flujo: pulsar el hueco -> esperar el panel de encuadre -> 'Subir archivo'
    (file chooser) -> esperar a que 'Añadir a petición' se habilite -> pulsar
    -> comprobar que el hueco pasa a chip con imagen.
    """
    slot_sel = SEL_FRAME_SLOT_INICIAL if slot == "initial" else SEL_FRAME_SLOT_FINAL
    slot_btn = page.locator(slot_sel).first
    await slot_btn.wait_for(state="visible", timeout=20_000)

    chips_antes = await page.locator(SEL_FRAME_CHIP).count()
    await slot_btn.click(force=True)

    titulo = page.get_by_text(SEL_FRAME_PICKER_TITULO).first
    try:
        await titulo.wait_for(state="visible", timeout=20_000)
    except Exception as exc:
        raise RuntimeError(
            "Flow no abrió el panel «Selecciona una imagen de encuadre» al pulsar "
            "el hueco %r." % slot
        ) from exc
    await page.wait_for_timeout(600)

    upload_btn = page.locator('button').filter(has_text=SEL_FRAME_UPLOAD).first
    await upload_btn.wait_for(state="visible", timeout=15_000)
    async with page.expect_file_chooser(timeout=20_000) as fc_info:
        await upload_btn.click(force=True)
    file_chooser = await fc_info.value
    await file_chooser.set_files(str(image_path))

    confirm = page.locator('button').filter(has_text=SEL_FRAME_CONFIRM).first
    await confirm.wait_for(state="visible", timeout=120_000)

    # La subida tarda: el botón está deshabilitado hasta que Flow termina de
    # procesar el archivo (spinner en la previsualización).
    listo = False
    for _ in range(180):
        try:
            if await confirm.is_enabled():
                listo = True
                break
        except Exception:
            pass
        await page.wait_for_timeout(1_000)
    if not listo:
        # Último recurso: seleccionar explícitamente la opción subida.
        try:
            opcion = page.locator('[role="option"]').first
            if await opcion.count() > 0:
                await opcion.click(force=True)
                await page.wait_for_timeout(1_000)
        except Exception:
            pass
        for _ in range(60):
            try:
                if await confirm.is_enabled():
                    listo = True
                    break
            except Exception:
                pass
            await page.wait_for_timeout(1_000)
    if not listo:
        raise RuntimeError(
            "Flow no terminó de procesar el fotograma %r (el botón «Añadir a "
            "petición» siguió deshabilitado)." % slot
        )

    await confirm.click(force=True)

    # El panel debe cerrarse y el hueco vacío convertirse en chip con imagen.
    try:
        await titulo.wait_for(state="hidden", timeout=60_000)
    except Exception:
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        await page.wait_for_timeout(1_000)

    await page.wait_for_function(
        """(args) => document.querySelectorAll(args.sel).length > args.antes""",
        arg={"sel": SEL_FRAME_CHIP, "antes": chips_antes},
        timeout=30_000,
    )


async def upload_frame(file_path: str, slot: str = "initial") -> None:
    """Sube un fotograma para video.

    UI 2026-10-26: en Video > Fotogramas hay dos huecos reales ('Inicio' y
    'Fin') y el fotograma se elige en el panel de encuadre. La ruta antigua
    (adjuntarlo como ingrediente del agente, UI 2026-07) se conserva como
    último recurso por si Google vuelve a esa interfaz.
    """
    page = await get_page()
    slot_sel = SEL_FRAME_SLOT_INICIAL if slot == "initial" else SEL_FRAME_SLOT_FINAL
    fallo_selector = None
    try:
        if await page.locator(slot_sel).count() > 0:
            try:
                await _attach_frame_via_picker(page, slot, file_path)
                return
            except Exception as exc:
                fallo_selector = exc
                print(f"  [aviso] el selector de encuadre falló: {type(exc).__name__}: {exc}")
                print("  [aviso] probando la ruta antigua (ingrediente del agente)...")
                try:
                    await page.keyboard.press("Escape")
                    await page.wait_for_timeout(800)
                except Exception:
                    pass
        await _upload_and_attach(page, file_path)
    except Exception as e:
        from pathlib import Path
        debug_dir = Path(__file__).parent.parent / "_debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        shot = str(debug_dir / f"upload_frame_error_{slot}.png")
        try:
            await page.screenshot(path=shot)
        except Exception:
            shot = "(sin captura)"
        motivo = (f"selector de encuadre: {fallo_selector}; ruta antigua: {e}"
                  if fallo_selector else str(e))
        print(f"  [ERROR] upload_frame falló: {motivo}. Captura: {shot}")
        raise RuntimeError(f"upload_frame({slot}) falló: {motivo}") from (fallo_selector or e)


async def select_frame_from_project(uuid: str, slot: str = "initial") -> None:
    """Selecciona un frame existente del proyecto para modo Fotogramas."""
    page = await get_page()
    
    await page.wait_for_selector(SEL_SLOTS_INICIAR, state="visible", timeout=10000)
    target_slot = page.locator(SEL_SLOTS_INICIAR) if slot == "initial" else page.locator(SEL_SLOTS_FIN)
    
    initial_count = await page.locator(SEL_SLOT_LOADED).count()
    await target_slot.click()
    await page.wait_for_timeout(2000)
    
    # Buscar la imagen en el dropup por UUID dentro del diálogo modal
    target_img = page.locator(f'[role="dialog"] img[src*="{uuid}"]')
    if await target_img.count() == 0:
        await page.keyboard.press("Escape")
        raise ValueError(f"No se encontró la imagen con UUID {uuid} en el proyecto para usar como frame.")
        
    await target_img.first.click()
    await page.wait_for_timeout(1000)
    
    # Confirmar selección con el botón 'Agregar a la instrucción'
    import re
    add_btn = page.locator('button, [role="button"]').filter(
        has_text=re.compile(r"(Agregar a la instrucción|Add to instruction|Add to prompt)", re.IGNORECASE)
    ).first
    if await add_btn.count() > 0:
        await add_btn.click()
        await page.wait_for_timeout(1000)
    
    # Esperar que cargue en el slot
    await page.wait_for_function(
        f"""() => {{
            const imgs = document.querySelectorAll('{SEL_SLOT_LOADED}');
            if (imgs.length <= {initial_count}) return false;
            return [...imgs].some(img => img.complete && img.naturalWidth > 0);
        }}""",
        timeout=60000
    )


async def capture_newest_asset_name(label: str, is_video: bool = False) -> str:
    """Rastrea el card más nuevo en el canvas y guarda su UUID en el registry bajo label.
    
    Para imágenes extrae el src del <img alt="Imagen generada">.
    Para videos extrae el src del <video> (mismo patrón URL ?name=UUID).
    """
    page = await get_page()
    
    # Flow prepende, así que .first siempre es el asset recién generado.
    card = page.locator('[aria-roledescription="draggable"]').first
    
    if is_video:
        element = card.locator('video').first
    else:
        element = card.locator('img').first
    
    src = await element.get_attribute("src")
    if not src:
        raise ValueError("No se pudo obtener el atributo src del asset más reciente.")
        
    match = re.search(r'[?&]name=([a-f0-9-]{36})', src)
    if not match:
        raise ValueError(f"No se encontró UUID en el src: {src}")
        
    uuid = match.group(1)
    capture_name(label, uuid)
    print(f"  📌 Registry: Guardado '{label}' -> {uuid}")
    return uuid
