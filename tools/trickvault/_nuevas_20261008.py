# -*- coding: utf-8 -*-
"""Genera y coloca los ejemplos de las dos tarjetas nuevas (captura TikTok 2026-10-08):
/bts -> xl-luzcamara y /restore -> xl-camararetrato.

Modelo: openai-image-2-low (gpt-image-2, quality low) = modelo por defecto del proyecto.
Salida: JPG 1024x1024 calidad 85 en apps/trickvault/assets/<carpeta>/<codigo>.jpg
Uso: python _nuevas_20261008.py
"""
import base64
import io
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2-low'
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
BASE = r'E:\ANTIGRAVITY\apps\trickvault'

PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";',
                    open(APP, encoding='utf-8').read(), re.S).group(1)

SUJETO = 'a young woman with curly dark hair'

TARJETAS = [
    {
        'code': '/bts',
        'destino': os.path.join(BASE, 'assets', 'luz-camara-personas', 'bts.jpg'),
        'cuerpo': ('Behind the scenes of a photo shoot: [OBJETO] in front of the camera, '
                   'cinema camera on a tripod in the foreground, crew watching the monitor, '
                   'boom microphone, clapperboard, softbox lights and cables on the floor, '
                   'candid documentary snapshot, natural set lighting, shallow depth of field, '
                   'all visible text and labels must be written in Spanish with no English words'),
    },
    {
        'code': '/restore',
        'destino': os.path.join(BASE, 'assets', 'xl-camararetrato', 'restore.jpg'),
        'cuerpo': ('Faithful restoration of an old damaged photograph of [OBJETO], repaired cracks, '
                   'scratches, creases and stains, recovered detail and contrast, balanced colour, '
                   'fine grain, subtle sepia warmth, museum-quality archival retouch, '
                   'all visible text and labels must be written in Spanish with no English words'),
    },
    {
        'code': '/metaads',
        'sujeto': 'a handcrafted leather backpack',
        'destino': os.path.join(BASE, 'assets', 'xl-escenaprueba', 'metaads.jpg'),
        'cuerpo': ('Coordinated set of several Meta advertising creatives for [OBJETO], presented as a '
                   'campaign board with a square feed ad, a vertical story ad and a carousel strip, '
                   'consistent brand style across every piece, bold headline blocks and clean negative '
                   'space, retail advertising design, '
                   'all visible text and labels must be written in Spanish with no English words'),
    },
]


def prompt_de(tarjeta):
    cuerpo = tarjeta['cuerpo'].replace('[OBJETO]', tarjeta.get('sujeto') or SUJETO)
    return f"{tarjeta['code']} {PREFIJO} {cuerpo}"


def generar(prompt, timeout=280):
    payload = json.dumps({'task': 'generateImage', 'prompt': prompt,
                          'model': MODELO, 'aspectRatio': '1:1'}).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:300])
    return base64.b64decode(d['image'])


def guardar_jpg(datos, destino):
    from PIL import Image
    img = Image.open(io.BytesIO(datos)).convert('RGB')
    if img.size != (1024, 1024):
        img = img.resize((1024, 1024), Image.LANCZOS)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    img.save(destino, 'JPEG', quality=85, optimize=True)
    return os.path.getsize(destino)


def main():
    t0 = time.time()
    # Opcional: pasar uno o varios códigos para generar solo esos (p. ej. /metaads).
    pedidos = [a for a in sys.argv[1:] if a.startswith('/')]
    tarjetas = [t for t in TARJETAS if not pedidos or t['code'] in pedidos]
    if not tarjetas:
        print('NINGUNA TARJETA COINCIDE', flush=True)
        return 2
    for t in tarjetas:
        prompt = prompt_de(t)
        print(f"\n== {t['code']} -> {t['destino']}", flush=True)
        print(f"   prompt: {prompt[:160]}…", flush=True)
        for intento in range(6):
            try:
                datos = generar(prompt)
                peso = guardar_jpg(datos, t['destino'])
                print(f"   OK {peso // 1024} KB en {time.time() - t0:.0f}s", flush=True)
                break
            except Exception as e:
                espera = 30 * (2 ** intento) if getattr(e, 'code', None) == 429 else 12
                if intento == 5:
                    print(f"   FALLO: {e!r}", flush=True)
                    return 1
                print(f"   {e} -> espero {espera}s", flush=True)
                time.sleep(espera)
    print(f"\nListo en {time.time() - t0:.0f}s", flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
