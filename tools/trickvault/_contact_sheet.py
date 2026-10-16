# -*- coding: utf-8 -*-
"""Monta una hoja de contactos con las 46 imagenes generadas para revisarlas de un vistazo."""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw

GEN = r'E:\ANTIGRAVITY\tools\trickvault\retroedu_gen'
OUT = r'E:\ANTIGRAVITY\tools\trickvault\_contact_sheet.png'
jobs = json.load(open(r'E:\ANTIGRAVITY\tools\trickvault\_retroedu_jobs.json', encoding='utf-8'))

COLS, THUMB, PAD, LABEL = 6, 240, 6, 18
filas = (len(jobs) + COLS - 1) // COLS
W = COLS * (THUMB + PAD) + PAD
H = filas * (THUMB + LABEL + PAD) + PAD
sheet = Image.new('RGB', (W, H), (18, 20, 26))
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
    d.text((x + 2, y + THUMB + 3), f"{j['code']}", fill=(120, 230, 230))

sheet.save(OUT)
print(f'hoja de contactos: {OUT}  ({W}x{H})')
print(f'imagenes presentes: {len(jobs)-len(faltan)}/{len(jobs)}')
if faltan:
    print('FALTAN:', faltan)
