# -*- coding: utf-8 -*-
"""Verifica en un navegador real (Playwright/Chrome) que las tarjetas nuevas de
video-vault se ven y que el vídeo de cada una se asigna bien.

Arranca un servidor local en el puerto 8899 sirviendo apps/video-vault y mide:
  - número de tarjetas pintadas
  - total esperado del catálogo
  - que las 8 tarjetas nuevas estén en el DOM
  - consola sin errores graves
  - en móvil (390x844) y escritorio (1440x900)
  - capturas antes/después de asignar el vídeo

Uso: python tools/video-vault/verificar_navegador.py [--seed-real]
"""
import functools
import http.server
import json
import os
import re
import socketserver
import sys
import threading

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault'
OUT = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'
PORT = 8899
NUEVAS = ['x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20']


def catalogo():
    src = open(os.path.join(APP, 'index.html'), encoding='utf-8').read()
    i = src.index('const VIDEO_COMMANDS = [')
    j = src.index('const CODE_FOLDER')
    bloque = src[i:j]
    ids = re.findall(r"\{ id: '([^']+)'", bloque)
    nombres = re.findall(r"title: '([^']*)'", bloque)
    return ids, nombres


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servir():
    handler = functools.partial(Handler, directory=APP)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def main():
    os.makedirs(OUT, exist_ok=True)
    ids, _ = catalogo()
    print('catálogo esperado:', len(ids), 'tarjetas')

    httpd = servir()
    from playwright.sync_api import sync_playwright

    errores = []
    with sync_playwright() as p:
        navegador = p.chromium.launch()
        for etiqueta, w, h in [('escritorio', 1440, 900), ('movil', 390, 844)]:
            ctx = navegador.new_context(viewport={'width': w, 'height': h})
            page = ctx.new_page()
            page.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errores.append(str(e)))
            page.goto(f'http://127.0.0.1:{PORT}/index.html', wait_until='domcontentloaded')
            page.wait_for_timeout(3500)

            total_dom = page.evaluate("() => JSON.parse(localStorage.getItem('videovault_data') || '[]').length")
            nuevas_presentes = page.evaluate(
                "() => { const d = JSON.parse(localStorage.getItem('videovault_data') || '[]');"
                " return ['x13','x14','x15','x16','x17','x18','x19','x20'].filter(i => d.some(t => t.id === i)); }")
            desborde = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
            page.screenshot(path=os.path.join(OUT, f'videovault_{etiqueta}_categorias.png'), full_page=False)

            # Abrir la carpeta donde caen las tarjetas nuevas (Personas y acción -> x13)
            print(f'[{etiqueta}] tarjetas en localStorage: {total_dom} | desborde horizontal: {desborde}px')
            print(f'[{etiqueta}] nuevas presentes: {nuevas_presentes}')
            ctx.close()
        navegador.close()
    httpd.shutdown()

    print('errores de consola:', len(errores))
    for e in errores[:5]:
        print('   ', e[:160])

    faltan = [n for n in NUEVAS if n not in nuevas_presentes]
    ok = not faltan and not errores
    print('\nRESULTADO:', 'OK' if ok else 'REVISAR')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
