# -*- coding: utf-8 -*-
"""Verifica en Chrome que las tarjetas nuevas muestran su fecha de alta real y que
la corrección se aplica tambien a datos ya guardados (localStorage antiguo).

Uso: python tools/video-vault/verificar_fechas.py
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault'
OUT = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'
PORT = 8901


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servir():
    handler = functools.partial(Handler, directory=APP)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


httpd = servir()
os.makedirs(OUT, exist_ok=True)

from playwright.sync_api import sync_playwright

errores = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    page.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errores.append('pageerror: ' + str(e)))

    # 1) Carga normal: fechas del seed
    page.goto(f'http://127.0.0.1:{PORT}/index.html', wait_until='domcontentloaded')
    page.wait_for_timeout(3000)
    fechas = page.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('videovault_data') || '[]');
        return d.filter(t => ['x18','x19','x20'].includes(t.id))
                .map(t => ({id: t.id, createdAt: t.createdAt, fecha: new Date(t.createdAt).toLocaleDateString('es-ES')}));
    }""")
    print('1) carga nueva ->', fechas)

    # 2) Simular un navegador con datos ANTIGUOS (fecha del seed) y recargar
    page.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('videovault_data') || '[]');
        d.forEach(t => { if (['x18','x19','x20'].includes(t.id)) t.createdAt = Date.UTC(2026, 8, 20); });
        localStorage.setItem('videovault_data', JSON.stringify(d));
    }""")
    page.reload(wait_until='domcontentloaded')
    page.wait_for_timeout(3500)
    fechas2 = page.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('videovault_data') || '[]');
        return d.filter(t => ['x18','x19','x20'].includes(t.id))
                .map(t => ({id: t.id, fecha: new Date(t.createdAt).toLocaleDateString('es-ES')}));
    }""")
    print('2) datos antiguos corregidos ->', fechas2)

    # 3) Captura de la carpeta Efectos y particulas (donde cae /foggy)
    page.get_by_text('Efectos y partículas', exact=False).first.click(timeout=15000)
    page.wait_for_timeout(2500)
    page.screenshot(path=os.path.join(OUT, 'fecha_tarjeta_foggy.png'))
    print('3) captura ->', os.path.join(OUT, 'fecha_tarjeta_foggy.png'))

    ctx.close()
    nav.close()

httpd.shutdown()
print('errores de consola:', len(errores))
for e in errores[:4]:
    print('   ', e[:150])
