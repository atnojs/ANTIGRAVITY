# -*- coding: utf-8 -*-
"""Hoja de contactos de las imagenes generadas de una carpeta.
Uso: _carpeta_contact.py <folder_id>"""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw

FOLDER = sys.argv[1] if len(sys.argv) > 1 else 'xl-negocioredes'
GEN = rf'E:\ANTIGRAVITY\tools\trickvault\{FOLDER}_gen'
OUT = rf'E:\ANTIGRAVITY\tools\trickvault\_{FOLDER}_contact.png'
jobs = json.load(open(rf'E:\ANTIGRAVITY\tools\trickvault\_{FOLDER}_jobs.json', encoding='utf-8'))

COLS, THUMB, PAD, LABEL = 6, 240, 6, 18
filas = (len(jobs) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (THUMB + PAD) + PAD, filas * (THUMB + LABEL + PAD) + PAD), (18, 20, 26))
d = ImageDraw.Draw(sheet)
faltan = []
for i, j in enumerate(jobs):
    p = os.path.join(GEN, j['id'] + '.png')
    r, c = divmod(i, COLS)
    x = PAD + c * (THUMB + PAD)
    y = PAD + r * (THUMB + LABEL + PAD)
    if not os.path.exists(p):
        faltan.append(j['id'])
        d.rectangle([x, y, x + THUMB, y + THUMB], fill=(60, 20, 20))
        d.text((x + 6, y + 6), 'FALTA', fill=(255, 160, 160))
    else:
        im = Image.open(p).convert('RGB')
        im.thumbnail((THUMB, THUMB), Image.LANCZOS)
        sheet.paste(im, (x, y))
    d.text((x + 2, y + THUMB + 3), j['code'], fill=(120, 230, 230))

sheet.save(OUT)
print(f'hoja de contactos: {OUT}  ({sheet.size[0]}x{sheet.size[1]})')
print(f'imagenes: {len(jobs)-len(faltan)}/{len(jobs)}')
if faltan:
    print('FALTAN:', faltan)
