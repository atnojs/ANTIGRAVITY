# -*- coding: utf-8 -*-
"""Capturas de verificacion de las tarjetas nuevas en la app DESPLEGADA.

Abre https://atnojs.es/apps/video-vault, espera la sincronizacion de vídeos, entra
en las carpetas donde caen las tarjetas nuevas y guarda capturas + medidas reales
(geometría, vídeo visible, desbordes) en escritorio y móvil.

Uso: python tools/video-vault/capturas_tarjetas_nuevas.py
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://atnojs.es/apps/video-vault/index.html'
OUT = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'
CARPETAS = [('Personas y acción', 'personas-y-accion'), ('Tecnología y digital', 'tecnologia-y-digital'),
            ('Estilo de vida', 'estilo-de-vida'), ('Efectos y partículas', 'efectos-y-particulas')]
IDS = ['x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20']

os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    nav = p.chromium.launch()

    for etiqueta, ancho, alto in [('escritorio', 1440, 950), ('movil', 390, 844)]:
        ctx = nav.new_context(viewport={'width': ancho, 'height': alto})
        page = ctx.new_page()
        page.goto(URL, wait_until='domcontentloaded', timeout=60000)
        for _ in range(20):
            page.wait_for_timeout(1000)
            if page.evaluate("() => (JSON.parse(localStorage.getItem('videovault_data')||'[]')).filter(t=>t.videoUrl).length") > 40:
                break

        # Resumen: cuántas tarjetas nuevas tienen ya su vídeo servido
        datos = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data')||'[]')")
        nuevas = {t['id']: bool(t.get('videoUrl')) for t in datos if t['id'] in IDS}
        print(f'[{etiqueta}] nuevas con vídeo: {nuevas}')

        # Captura de la home (carpetas)
        page.screenshot(path=os.path.join(OUT, f'prod_{etiqueta}_home.png'))

        # Entrar en la primera carpeta que contenga una tarjeta nueva y capturarla
        for nombre, slug in CARPETAS:
            try:
                page.get_by_text(nombre, exact=False).first.click(timeout=8000)
                page.wait_for_timeout(2500)
                page.screenshot(path=os.path.join(OUT, f'prod_{etiqueta}_{slug}.png'))
                desborde = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
                videos_visibles = page.evaluate("() => document.querySelectorAll('video').length")
                print(f'[{etiqueta}] {nombre}: vídeos en DOM={videos_visibles} | desborde={desborde}px')
                page.go_back()
                page.wait_for_timeout(1500)
            except Exception as e:
                print(f'[{etiqueta}] {nombre}: no se pudo abrir ({type(e).__name__})')
        ctx.close()

    nav.close()
print('capturas en', OUT)
