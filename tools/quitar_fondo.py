# -*- coding: utf-8 -*-
"""Quita el fondo de una imagen con fondo plano (papel blanco, fondo liso).

Método: relleno por reconstrucción desde los bordes sobre los píxeles parecidos al
color del borde (así NO se comen los blancos interiores, como los ojos o el brillo),
con un borde suavizado para que no queden dientes de sierra.

Uso: python quitar_fondo.py <entrada> <salida.png> [umbral]
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')


def quitar_fondo(ruta, salida, umbral=30, erode=1, suavizar=1.0):
    im = Image.open(ruta).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    alto, ancho, _ = a.shape

    # Color de fondo = mediana del marco exterior
    marco = np.concatenate([
        a[0, :, :], a[-1, :, :], a[:, 0, :], a[:, -1, :],
    ])
    fondo = np.median(marco, axis=0)

    dist = np.sqrt(((a - fondo) ** 2).sum(axis=2))
    parecido = dist <= umbral

    # Semillas: píxeles del borde que son fondo
    semilla = np.zeros((alto, ancho), dtype=bool)
    semilla[0, :] = parecido[0, :]
    semilla[-1, :] = parecido[-1, :]
    semilla[:, 0] = parecido[:, 0]
    semilla[:, -1] = parecido[:, -1]

    # Reconstrucción morfológica: dilatar la semilla dentro de 'parecido' hasta estabilizar
    actual = semilla.copy()
    for _ in range(4000):
        vecinos = actual.copy()
        vecinos[1:, :] |= actual[:-1, :]
        vecinos[:-1, :] |= actual[1:, :]
        vecinos[:, 1:] |= actual[:, :-1]
        vecinos[:, :-1] |= actual[:, 1:]
        nuevo = vecinos & parecido
        if np.array_equal(nuevo, actual):
            break
        actual = nuevo
    fondo_exterior = actual

    # Erosionar el fondo 1px para no dejar halo claro pegado al sujeto
    for _ in range(max(0, erode)):
        e = fondo_exterior.copy()
        e[1:, :] &= fondo_exterior[:-1, :]
        e[:-1, :] &= fondo_exterior[1:, :]
        e[:, 1:] &= fondo_exterior[:, :-1]
        e[:, :-1] &= fondo_exterior[:, 1:]
        fondo_exterior = e

    alfa = np.where(fondo_exterior, 0, 255).astype(np.uint8)
    alfa_im = Image.fromarray(alfa, 'L')
    if suavizar:
        alfa_im = alfa_im.filter(ImageFilter.GaussianBlur(suavizar))

    rgba = im.convert('RGBA')
    rgba.putalpha(alfa_im)
    rgba.save(salida, 'PNG', optimize=True)

    opacos = int((np.asarray(alfa_im) > 128).sum())
    print(f'{salida}: {rgba.size[0]}x{rgba.size[1]} | fondo detectado #{int(fondo[0]):02X}{int(fondo[1]):02X}{int(fondo[2]):02X} '
          f'| sujeto {100 * opacos / (alto * ancho):.1f}% | {__import__("os").path.getsize(salida) // 1024} KB')


if __name__ == '__main__':
    entrada, salida = sys.argv[1], sys.argv[2]
    umbral = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    quitar_fondo(entrada, salida, umbral)
