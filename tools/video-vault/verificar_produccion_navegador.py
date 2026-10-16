# -*- coding: utf-8 -*-
"""Verifica la app DESPLEGADA (https://atnojs.es/apps/video-vault) en un navegador
real: las tarjetas nuevas se pintan, su vídeo carga (readyState) y no hay
desbordes horizontales ni errores de consola.

Uso: python tools/video-vault/verificar_produccion_navegador.py
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://atnojs.es/apps/video-vault/index.html'
OUT = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'
IDS = ['x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20']

os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

errores = []
resultado = {}
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    page.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errores.append('pageerror: ' + str(e)))
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    # La sincronización con el servidor tarda unos segundos (fetch del seed + store).
    for _ in range(20):
        page.wait_for_timeout(1000)
        n = page.evaluate("() => (JSON.parse(localStorage.getItem('videovault_data') || '[]')).filter(t => t.videoUrl).length")
        if n > 40:
            break

    datos = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data') || '[]')")
    con_video = [t for t in datos if t.get('videoUrl')]
    resultado['tarjetas'] = len(datos)
    resultado['con_video'] = len(con_video)
    resultado['nuevas'] = [t['id'] for t in datos if t['id'] in IDS]
    resultado['nuevas_con_video'] = [t['id'] for t in con_video if t['id'] in IDS]

    # Comprobar carga real de un vídeo nuevo en el DOM: abrir su tarjeta y medir readyState
    estado_video = page.evaluate("""async (ids) => {
        const out = {};
        for (const id of ids) {
            const url = 'uploads/videos/' + id + '.mp4';
            out[id] = await new Promise((res) => {
                const v = document.createElement('video');
                v.muted = true; v.preload = 'metadata'; v.src = url;
                v.onloadedmetadata = () => res({ok: true, w: v.videoWidth, h: v.videoHeight});
                v.onerror = () => res({ok: false});
                setTimeout(() => res({ok: false, timeout: true}), 15000);
            });
        }
        return out;
    }""", ['x13', 'x19', 'x20'])

    desborde = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    page.screenshot(path=os.path.join(OUT, 'produccion_escritorio.png'))
    ctx.close()

    ctx2 = nav.new_context(viewport={'width': 390, 'height': 844})
    p2 = ctx2.new_page()
    p2.goto(URL, wait_until='domcontentloaded', timeout=60000)
    p2.wait_for_timeout(5000)
    desborde_movil = p2.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    p2.screenshot(path=os.path.join(OUT, 'produccion_movil.png'))
    ctx2.close()
    nav.close()

print('tarjetas en produccion:', resultado['tarjetas'])
print('con video:', resultado['con_video'])
print('nuevas presentes:', resultado['nuevas'])
print('nuevas con video:', resultado['nuevas_con_video'])
print('carga de video (metadata):', estado_video)
print('desborde horizontal escritorio:', desborde, 'px | movil:', desborde_movil, 'px')
print('errores de consola:', len(errores))
for e in errores[:5]:
    print('   ', e[:200])
print('\nRESULTADO:', 'OK' if len(resultado['nuevas_con_video']) == 8 and not errores else 'REVISAR')
