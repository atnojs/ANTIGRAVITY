# -*- coding: utf-8 -*-
"""Lamina de contacto de los ejemplos nuevos, para revisarlos de un vistazo."""
import json, os, sys
sys.path.insert(0, r'E:\ANTIGRAVITY\tools\trickvault')
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont
from _gen_faltantes import SUJETOS, FOLDERS, TOOLS

APP = r'E:\ANTIGRAVITY\apps\trickvault'
OUT = r'E:\ANTIGRAVITY\_pruebas_img'

jobs = {}
for f in FOLDERS:
    p = os.path.join(TOOLS, f'_{f}.json')
    if os.path.exists(p):
        for t in json.load(open(p, encoding='utf-8')):
            if t['id'] in SUJETOS:
                jobs[t['id']] = (f, t['code'], t.get('desc', ''))

items = []
for tid, (folder, code, desc) in sorted(jobs.items()):
    p = os.path.join(APP, 'assets', folder, code.lstrip('/') + '.jpg')
    if os.path.exists(p):
        items.append((tid, code, desc, p))
print('imagenes integradas:', len(items), 'de', len(jobs))

CELL, PAD, CAP, COLS = 300, 6, 50, 5
try:
    font = ImageFont.truetype('arial.ttf', 15)
except Exception:
    font = ImageFont.load_default()

for s in range(0, len(items), 20):
    chunk = items[s:s + 20]
    rows = (len(chunk) + COLS - 1) // COLS
    W = COLS * (CELL + PAD) + PAD
    H = rows * (CELL + CAP + PAD) + PAD
    sheet = Image.new('RGB', (W, H), (12, 12, 18))
    d = ImageDraw.Draw(sheet)
    for i, (tid, code, desc, p) in enumerate(chunk):
        r, c = divmod(i, COLS)
        x = PAD + c * (CELL + PAD); y = PAD + r * (CELL + CAP + PAD)
        try:
            im = Image.open(p).convert('RGB'); im.thumbnail((CELL, CELL))
            sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
        except Exception as e:
            d.text((x + 4, y + 4), 'ERROR ' + str(e)[:40], fill=(255, 80, 80), font=font)
        d.text((x + 2, y + CELL + 3), f'{i+1}. {code}', fill=(255, 205, 40), font=font)
        d.text((x + 2, y + CELL + 21), f'{tid} · {desc[:32]}', fill=(150, 220, 255), font=font)
    path = os.path.join(OUT, f'faltantes_{s//20+1:02d}.png')
    sheet.save(path)
    print('lamina', path, sheet.size, len(chunk), 'celdas')
