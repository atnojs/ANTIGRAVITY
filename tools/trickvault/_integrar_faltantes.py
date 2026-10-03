# -*- coding: utf-8 -*-
"""Pasa los PNG generados a JPG dentro del repo y escribe el bloque JS con las
nuevas entradas de SEED_COMMAND_IMAGES. Uso: _integrar_faltantes.py"""
import json, os, re, sys
sys.path.insert(0, r'E:\ANTIGRAVITY\tools\trickvault')
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image
from _gen_faltantes import SUJETOS, FOLDERS, TOOLS

APP = r'E:\ANTIGRAVITY\apps\trickvault'
MAX_SIDE, QUALITY = 1024, 88

jobs = {}
for f in FOLDERS:
    p = os.path.join(TOOLS, f'_{f}.json')
    if os.path.exists(p):
        for t in json.load(open(p, encoding='utf-8')):
            if t['id'] in SUJETOS:
                jobs[t['id']] = (f, t['code'])

hechos, faltan, lineas = [], [], []
for tid, (folder, code) in sorted(jobs.items()):
    src = os.path.join(TOOLS, f'{folder}_gen', tid + '.png')
    slug = code.lstrip('/')
    rel = f'assets/{folder}/{slug}.jpg'
    dst = os.path.join(APP, rel.replace('/', os.sep))
    if not (os.path.exists(src) and os.path.getsize(src) > 5000):
        faltan.append(tid)
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src).convert('RGB')
    if max(im.size) > MAX_SIDE:
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    hechos.append((tid, code, rel, os.path.getsize(dst) // 1024))
    lineas.append(f"    '{code}': '{rel}',")

print(f'integradas: {len(hechos)}  pendientes de generar: {len(faltan)}')
for tid, code, rel, kb in hechos:
    print(f'  {tid:<12} {code:<18} {rel:<44} {kb} KB')
if faltan:
    print('SIN GENERAR TODAVIA:', faltan)

bloque = ('\n// Ejemplos añadidos después: las tarjetas que se quedaron sin imagen\n'
          '// (los ids del Excel que nunca llegaron a subirse al servidor).\n'
          'Object.assign(SEED_COMMAND_IMAGES, {\n' + '\n'.join(lineas) + '\n});\n')
out = r'E:\ANTIGRAVITY\_pruebas_img\bloque_seed.js'
open(out, 'w', encoding='utf-8').write(bloque)
print(f'\nbloque JS escrito en {out} ({len(lineas)} entradas)')
