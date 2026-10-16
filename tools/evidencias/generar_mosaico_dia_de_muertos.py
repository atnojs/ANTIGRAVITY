# -*- coding: utf-8 -*-
"""Mosaico con las 24 referencias de Día de Muertos en UNA sola imagen.

Entrada:  tools/evidencias/dia-de-muertos/NN_img_xxx.jpg
Salida:   E:\\ANTIGRAVITY\\Dia-de-Muertos.jpg  (mosaico 4x6 con título y numeración)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

CARPETA = r'E:\ANTIGRAVITY\tools\evidencias\dia-de-muertos'
SALIDA = r'E:\ANTIGRAVITY\Dia-de-Muertos.jpg'

COLS, FILAS = 4, 6
CELDA_W, CELDA_H = 380, 500
MARGEN, GAP = 28, 14
TITULO_H = 90

archivos = sorted(f for f in os.listdir(CARPETA) if f.lower().endswith('.jpg'))
if len(archivos) < COLS * FILAS:
    print('aviso: solo hay %d imágenes' % len(archivos))

ancho = MARGEN * 2 + COLS * CELDA_W + (COLS - 1) * GAP
alto = MARGEN * 2 + TITULO_H + FILAS * CELDA_H + (FILAS - 1) * GAP

lienzo = Image.new('RGB', (ancho, alto), (250, 248, 245))
dib = ImageDraw.Draw(lienzo)


def fuente(tam):
    for ruta in (r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf'):
        if os.path.isfile(ruta):
            return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


f_titulo, f_num = fuente(38), fuente(20)
dib.text((MARGEN, MARGEN + 10), 'Día de Muertos — 24 referencias', font=f_titulo, fill=(40, 30, 30))
dib.line([(MARGEN, MARGEN + TITULO_H - 12), (ancho - MARGEN, MARGEN + TITULO_H - 12)], fill=(210, 200, 195), width=2)

for i, nombre in enumerate(archivos[:COLS * FILAS]):
    fila, col = divmod(i, COLS)
    x0 = MARGEN + col * (CELDA_W + GAP)
    y0 = MARGEN + TITULO_H + fila * (CELDA_H + GAP)
    dib.rectangle([x0, y0, x0 + CELDA_W, y0 + CELDA_H], fill=(255, 255, 255), outline=(226, 220, 216), width=2)

    with Image.open(os.path.join(CARPETA, nombre)) as im:
        im = im.convert('RGB')
        escala = min((CELDA_W - 16) / im.width, (CELDA_H - 16) / im.height)
        im = im.resize((max(1, int(im.width * escala)), max(1, int(im.height * escala))), Image.LANCZOS)
        lienzo.paste(im, (x0 + (CELDA_W - im.width) // 2, y0 + (CELDA_H - im.height) // 2))

    dib.ellipse([x0 + 8, y0 + 8, x0 + 44, y0 + 44], fill=(245, 240, 236), outline=(200, 190, 185), width=2)
    texto = str(i + 1)
    caja = dib.textbbox((0, 0), texto, font=f_num)
    dib.text((x0 + 26 - (caja[2] - caja[0]) / 2, y0 + 26 - (caja[3] - caja[1]) / 2 - 2), texto, font=f_num, fill=(90, 60, 70))

lienzo.save(SALIDA, 'JPEG', quality=88, optimize=True)
print('mosaico:', SALIDA)
print('tamaño: %dx%d | %.1f MB | %d imágenes' % (lienzo.width, lienzo.height,
                                                os.path.getsize(SALIDA) / 1024 / 1024, len(archivos)))
