# -*- coding: utf-8 -*-
"""Diagnostico de la carga de vídeos en la app desplegada: registra las
respuestas de red de video_seed.json y video_store.php y lo que ve el navegador.

Uso: python tools/video-vault/diag_carga_videos.py
"""
import sys

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://atnojs.es/apps/video-vault/index.html'

from playwright.sync_api import sync_playwright

respuestas = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    page.on('response', lambda r: respuestas.append((r.status, r.url)) if ('seed' in r.url or 'store' in r.url or 'load_videos' in r.url) else None)
    page.on('console', lambda m: print(f'   [consola {m.type}] {m.text[:200]}'))
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(7000)

    print('--- respuestas relevantes ---')
    for s, u in respuestas:
        print(f'  {s}  {u[:150]}')

    print('--- fetch manual desde la pagina ---')
    r = page.evaluate("""async () => {
        try {
            const res = await fetch('video_seed.json?t=' + Date.now(), {cache:'no-store', credentials:'same-origin'});
            const texto = await res.text();
            let claves = null;
            try { claves = Object.keys(JSON.parse(texto)).length; } catch(e) { claves = 'JSON invalido'; }
            return {status: res.status, tipo: res.headers.get('content-type'), bytes: texto.length, claves, muestra: texto.slice(0, 120)};
        } catch (e) { return {error: String(e)}; }
    }""")
    print('  video_seed.json ->', r)

    r2 = page.evaluate("""async () => {
        try {
            const res = await fetch('video_store.php?action=list&t=' + Date.now(), {cache:'no-store', credentials:'same-origin'});
            const texto = await res.text();
            let videos = null;
            try { const j = JSON.parse(texto); videos = j.videos ? Object.keys(j.videos).length : Object.keys(j).length; } catch(e) { videos = 'JSON invalido'; }
            return {status: res.status, tipo: res.headers.get('content-type'), bytes: texto.length, videos, muestra: texto.slice(0, 120)};
        } catch (e) { return {error: String(e)}; }
    }""")
    print('  video_store.php ->', r2)

    datos = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data') || '[]')")
    print('  tarjetas:', len(datos), '| con videoUrl:', sum(1 for t in datos if t.get('videoUrl')))
    ctx.close()
    nav.close()
