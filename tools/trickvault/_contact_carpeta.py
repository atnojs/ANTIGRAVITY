"""Hoja de contactos de los PNG generados de una carpeta, con su codigo."""
import os, sys
from PIL import Image, ImageDraw

TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
carpeta = sys.argv[1]
jobs = __import__('json').load(open(os.path.join(TOOLS, '_%s_jobs.json' % carpeta), encoding='utf-8'))
gen = os.path.join(TOOLS, '%s_gen' % carpeta)
COLS, TAM = 3, 420
filas = (len(jobs) + COLS - 1) // COLS
canvas = Image.new("RGB", (COLS * TAM, filas * (TAM + 26)), (12, 12, 12))
d = ImageDraw.Draw(canvas)
for n, j in enumerate(jobs):
    p = os.path.join(gen, j['id'] + '.png')
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert("RGB").resize((TAM, TAM), Image.LANCZOS)
    c, r = n % COLS, n // COLS
    canvas.paste(im, (c * TAM, r * (TAM + 26) + 24))
    d.text((c * TAM + 6, r * (TAM + 26) + 6), '%s  %s' % (j['id'], j['code']), fill=(0, 220, 255))
out = os.path.join(TOOLS, '%s_contact.png' % carpeta)
canvas.save(out)
print(out, canvas.size)
