# -*- coding: utf-8 -*-
"""Comprueba en la app desplegada qué tarjetas nuevas tienen videoUrl asignado y
si el seed las contiene, con espera progresiva.

Uso: python tools/video-vault/diag_x18.py
"""
import json
import sys
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
URL = 'https://atnojs.es/apps/video-vault/index.html'

seed = json.loads(urllib.request.urlopen('https://atnojs.es/apps/video-vault/video_seed.json?t=1', timeout=30).read())
print('seed servido:', len(seed), 'entradas | x18 =', seed.get('x18'))

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    for i in range(12):
        page.wait_for_timeout(2000)
        datos = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data') || '[]')")
        x = {t['id']: (t.get('videoUrl') or '') for t in datos if t['id'].startswith('x')}
        con = sum(1 for t in datos if t.get('videoUrl'))
        print(f'  t+{(i+1)*2}s: con_video={con} | x18={x.get("x18")!r} | x={ {k: bool(v) for k, v in x.items()} }')
    ctx.close()
    nav.close()
