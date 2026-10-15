# -*- coding: utf-8 -*-
"""Hoja de comprobacion: las carpetas regeneradas, con todas sus imagenes en
miniatura, para verificar que el sujeto es UNO solo."""
import importlib.util, os, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
OUT = os.path.join(T, '_revision', 'SUJETOS')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

CARPETAS = sys.argv[1:] or ['xl-pintura', 'xl-verdentro', 'xl-juegos', 'xl-letras3d',
                            'xl-casaviajes', 'xl-estilos', 'xl-hechomano', 'xl-carteles']
TAM, ET, COLS = 108, 13, 20
por_hoja = 3
for k in range(0, len(CARPETAS), por_hoja):
    trozo = CARPETAS[k:k + por_hoja]
    bloques = []
    for carpeta in trozo:
        lista = []
        for code, ruta in cl.SEED_IMAGES.items():
            r = str(ruta)
            if not r.startswith('assets/') or cl.CODE_FOLDER.get(code) != carpeta:
                continue
            f = os.path.join(ASSETS, r[len('assets/'):].split('?')[0])
            if os.path.exists(f):
                lista.append((code, f))
        lista.sort()
        bloques.append((carpeta, lista, (len(lista) + COLS - 1) // COLS))
    alto = sum(24 + (TAM + ET) * f for _, _, f in bloques) + 16
    hoja = Image.new('RGB', (TAM * COLS, alto), (10, 12, 18))
    d = ImageDraw.Draw(hoja)
    y = 8
    for carpeta, lista, filas in bloques:
        d.text((8, y), '%s  (%d tarjetas)  -  todas el MISMO sujeto' % (carpeta, len(lista)), fill=(0, 220, 255))
        y += 18
        for n, (code, f) in enumerate(lista):
            c, r = n % COLS, n // COLS
            x, yy = c * TAM, y + r * (TAM + ET)
            d.text((x + 3, yy + 1), code[:19], fill=(255, 190, 60))
            try:
                hoja.paste(Image.open(f).convert('RGB').resize((TAM, TAM), Image.LANCZOS), (x, yy + ET))
            except Exception:
                pass
        y += (TAM + ET) * filas + 6
    destino = os.path.join(OUT, 'VERIF_%02d.png' % (k // por_hoja))
    hoja.save(destino)
    print(destino, hoja.size, ' | '.join(c for c, _, _ in bloques))
