# -*- coding: utf-8 -*-
"""Verifica en la app DESPLEGADA que las 3 tarjetas nuevas muestran su fecha de
alta real (11 oct 2026) y que el resto conserva la suya.

Uso: python tools/video-vault/verificar_fechas_produccion.py
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://atnojs.es/apps/video-vault/index.html'
OUT = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(6000)

    filas = page.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('videovault_data') || '[]');
        const f = t => new Date(t.createdAt).toLocaleDateString('es-ES');
        return {
            total: d.length,
            nuevas: d.filter(t => ['x18','x19','x20'].includes(t.id)).map(t => t.id + ' = ' + f(t)),
            nuevas_con_video: d.filter(t => ['x18','x19','x20'].includes(t.id) && t.videoUrl).length,
            ejemplos_antiguas: d.filter(t => ['sh01','fx16','au01'].includes(t.id)).map(t => t.id + ' = ' + f(t)),
        };
    }""")
    print('tarjetas:', filas['total'])
    print('nuevas:', filas['nuevas'], '| con vídeo:', filas['nuevas_con_video'])
    print('antiguas (control):', filas['ejemplos_antiguas'])

    # Captura de la carpeta de /foggy con su fecha
    try:
        page.get_by_text('Efectos y partículas', exact=False).first.click(timeout=15000)
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUT, 'prod_fecha_foggy.png'))
        print('captura ->', os.path.join(OUT, 'prod_fecha_foggy.png'))
    except Exception as e:
        print('no se pudo capturar la carpeta:', type(e).__name__)

    ctx.close()
    nav.close()
