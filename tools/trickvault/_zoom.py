# -*- coding: utf-8 -*-
"""Zoom de las imagenes dudosas de una carpeta (para verlas de verdad).
Uso: _zoom.py <carpeta> <code1> <code2> ..."""
import importlib.util, os, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
OUT = os.path.join(T, '_revision', 'SUJETOS')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
carpeta = sys.argv[1]
codes = sys.argv[2:]
TAM, ET, COLS = 300, 20, 5
filas = (len(codes) + COLS - 1) // COLS
hoja = Image.new('RGB', (TAM * COLS, (TAM + ET) * filas + 26), (10, 12, 18))
d = ImageDraw.Draw(hoja)
d.text((8, 6), '%s  -  zoom' % carpeta, fill=(0, 220, 255))
for n, code in enumerate(codes):
    ruta = str(cl.SEED_IMAGES.get(code, ''))
    f = os.path.join(ASSETS, ruta[len('assets/'):].split('?')[0]) if ruta.startswith('assets/') else None
    c, r = n % COLS, n // COLS
    x, y = c * TAM, 26 + r * (TAM + ET)
    d.text((x + 4, y + 3), code[:30], fill=(255, 190, 60))
    if f and os.path.exists(f):
        hoja.paste(Image.open(f).convert('RGB').resize((TAM, TAM), Image.LANCZOS), (x, y + ET))
destino = os.path.join(OUT, 'ZOOM_%s.png' % carpeta)
hoja.save(destino)
print(destino, hoja.size)
