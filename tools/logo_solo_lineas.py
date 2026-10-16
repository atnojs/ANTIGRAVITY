# -*- coding: utf-8 -*-
"""Convierte un dibujo de línea (negro sobre blanco) en PNG con TODO el fondo
transparente —también el relleno interior de la malla— dejando solo las líneas.

La transparencia se saca de la luminancia: blanco puro = alfa 0, negro = alfa 255,
y los grises intermedios quedan como bordes suavizados.

Uso: python logo_solo_lineas.py <entrada> <salida.png>
"""
import sys

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

entrada, salida = sys.argv[1], sys.argv[2]

im = Image.open(entrada).convert('L')
ancho, alto = im.size
lum = np.asarray(im).astype(np.int16)

# alfa por luminancia, con limpieza del ruido del blanco (JPEG) y un poco de contraste
alfa = np.clip((250 - lum) * 1.25, 0, 255)
alfa[lum >= 244] = 0

cero = Image.new('L', (ancho, alto), 0)
rgba = Image.merge('RGBA', (cero, cero, cero, Image.fromarray(alfa.astype(np.uint8))))
rgba.save(salida, 'PNG', optimize=True)

opacos = int((alfa > 128).sum())
print(f'{salida}: {ancho}x{alto} | trazo {100 * opacos / (ancho * alto):.1f}% del área | {__import__("os").path.getsize(salida) // 1024} KB')
