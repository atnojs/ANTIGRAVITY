# -*- coding: utf-8 -*-
"""Tira GRANDE de una sola carpeta, con etiqueta legible encima de cada imagen.
Uso: _tira_carpeta.py <carpeta> [tamano]"""
import importlib.util, json, os, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
OUT = os.path.join(T, '_revision', 'SUJETOS')
os.makedirs(OUT, exist_ok=True)
carpeta = sys.argv[1]
TAM = int(sys.argv[2]) if len(sys.argv) > 2 else 190
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

lista = []
for code, ruta in cl.SEED_IMAGES.items():
    r = str(ruta)
    if not r.startswith('assets/') or cl.CODE_FOLDER.get(code) != carpeta:
        continue
    f = os.path.join(ASSETS, r[len('assets/'):].split('?')[0])
    if os.path.exists(f):
        lista.append((code, f))
lista.sort()
COLS = 8
ET = 18
filas = (len(lista) + COLS - 1) // COLS
hoja = Image.new('RGB', (TAM * COLS, (TAM + ET) * filas + 24), (10, 12, 18))
d = ImageDraw.Draw(hoja)
d.text((8, 6), '%s  (%d tarjetas)  -  todas deben ser el MISMO sujeto' % (carpeta, len(lista)), fill=(0, 220, 255))
for n, (code, f) in enumerate(lista):
    c, r = n % COLS, n // COLS
    x, y = c * TAM, 24 + r * (TAM + ET)
    d.text((x + 4, y + 3), code[:26], fill=(255, 190, 60))
    try:
        hoja.paste(Image.open(f).convert('RGB').resize((TAM, TAM), Image.LANCZOS), (x, y + ET))
    except Exception:
        pass
destino = os.path.join(OUT, 'CARPETA_%s.png' % carpeta)
hoja.save(destino)
print(destino, hoja.size, len(lista), 'tarjetas')
print(', '.join(c for c, _ in lista))
