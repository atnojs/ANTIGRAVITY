# -*- coding: utf-8 -*-
"""
Tira de miniaturas por carpeta: TODAS las imagenes de la carpeta en una rejilla
pequena, para ver de un vistazo si el sujeto es el mismo en todas.
"""
import importlib.util, json, os, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
OUT = os.path.join(T, '_revision', 'SUJETOS')
os.makedirs(OUT, exist_ok=True)
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

por_carpeta = {}
for code, ruta in cl.SEED_IMAGES.items():
    r = str(ruta)
    if not r.startswith('assets/'):
        continue
    f = os.path.join(ASSETS, r[len('assets/'):].split('?')[0])
    if os.path.exists(f):
        por_carpeta.setdefault(cl.CODE_FOLDER.get(code, 'xl-dev'), []).append((code, f))

TAM, ET, COLS = 120, 14, 16
carpetas = sorted(por_carpeta)
print('carpetas:', len(carpetas))
# 3 carpetas por hoja
for k in range(0, len(carpetas), 3):
    trozo = carpetas[k:k + 3]
    bloques = []
    for carpeta in trozo:
        lista = sorted(por_carpeta[carpeta])
        filas = (len(lista) + COLS - 1) // COLS
        bloques.append((carpeta, lista, filas))
    ancho = TAM * COLS
    alto = sum(28 + (TAM + ET) * f for _, _, f in bloques) + 20
    hoja = Image.new('RGB', (ancho, alto), (10, 12, 18))
    d = ImageDraw.Draw(hoja)
    y = 10
    for carpeta, lista, filas in bloques:
        d.text((8, y), '%s  (%d tarjetas)  -  todas deben ser el MISMO sujeto' % (carpeta, len(lista)),
               fill=(0, 220, 255))
        y += 20
        for n, (code, f) in enumerate(lista):
            c, r = n % COLS, n // COLS
            x = c * TAM
            yy = y + r * (TAM + ET)
            try:
                im = Image.open(f).convert('RGB').resize((TAM, TAM), Image.LANCZOS)
                hoja.paste(im, (x, yy + ET))
            except Exception:
                pass
            d.text((x + 3, yy + 1), code[:20], fill=(255, 190, 60))
        y += (TAM + ET) * filas + 8
    destino = os.path.join(OUT, 'SUJETOS_%02d.png' % (k // 3))
    hoja.save(destino)
    print(' ', destino, hoja.size)
