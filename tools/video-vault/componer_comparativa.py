# -*- coding: utf-8 -*-
"""Compone la comparativa entregable: recorta las capturas de la app desplegada y
monta una imagen única etiquetada (antes/después de la medición).

Uso: python tools/video-vault/componer_comparativa.py
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image, ImageDraw

CAP = r'E:\ANTIGRAVITY\tools\video-vault\_capturas'
SALIDA = os.path.join(CAP, 'videovault_comparativa.png')

piezas = [
    ('Antes: tarjeta nueva sin vídeo (referencia de medida)', 'prod_escritorio_home.png'),
    ('Después: /gymworkout con su vídeo Veo en la app desplegada', 'prod_escritorio_personas-y-accion.png'),
    ('Móvil 390 px: sin desbordes', 'prod_movil_personas-y-accion.png'),
]

imgs = []
for titulo, fichero in piezas:
    ruta = os.path.join(CAP, fichero)
    if not os.path.isfile(ruta):
        print('falta', ruta)
        continue
    im = Image.open(ruta).convert('RGB')
    im.thumbnail((1000, 640))
    imgs.append((titulo, im))

if not imgs:
    print('no hay capturas')
    sys.exit(1)

ancho = max(im.width for _, im in imgs) + 40
alto = sum(im.height + 60 for _, im in imgs) + 40
lienzo = Image.new('RGB', (ancho, alto), (8, 12, 24))
d = ImageDraw.Draw(lienzo)

y = 20
for titulo, im in imgs:
    d.text((20, y), titulo, fill=(0, 208, 208))
    y += 24
    lienzo.paste(im, (20, y))
    y += im.height + 30

lienzo.save(SALIDA)
print('comparativa ->', SALIDA, lienzo.size)
