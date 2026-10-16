# -*- coding: utf-8 -*-
"""Verifica en la app desplegada que las 5 tarjetas duplicadas ya NO estan y que
las 3 nuevas (x18, x19, x20) siguen con su vídeo. Escritorio y movil.

Uso: python tools/video-vault/verificar_dedup.py
"""
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://atnojs.es/apps/video-vault/index.html'
VIEJAS = ['x13', 'x14', 'x15', 'x16', 'x17']
NUEVAS = ['x18', 'x19', 'x20']

from playwright.sync_api import sync_playwright

errores = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    for etiqueta, ancho, alto in [('escritorio', 1440, 950), ('movil', 390, 844)]:
        ctx = nav.new_context(viewport={'width': ancho, 'height': alto})
        page = ctx.new_page()
        page.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errores.append(str(e)))
        page.goto(URL, wait_until='domcontentloaded', timeout=60000)
        for _ in range(20):
            page.wait_for_timeout(1000)
            if page.evaluate("() => (JSON.parse(localStorage.getItem('videovault_data')||'[]')).filter(t=>t.videoUrl).length") > 45:
                break
        datos = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data')||'[]')")
        ids = {t['id'] for t in datos}
        nuevas_video = {t['id']: bool(t.get('videoUrl')) for t in datos if t['id'] in NUEVAS}
        desborde = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print(f'[{etiqueta}] tarjetas={len(datos)} | duplicadas presentes={sorted(ids & set(VIEJAS)) or "ninguna"}'
              f' | nuevas={nuevas_video} | desborde={desborde}px')
        ctx.close()
    nav.close()

print('errores de consola:', len(errores))
for e in errores[:3]:
    print('   ', e[:160])
