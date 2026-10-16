# -*- coding: utf-8 -*-
"""Genera un PDF con las 24 imágenes del lote Día de Muertos, una por página A4,
con una línea de pie describiendo cada una.

Entrada:  tools/evidencias/dia-de-muertos/NN_img_xxx.jpg (en orden)
Salida:   E:\\ANTIGRAVITY\\Dia-de-Muertos.pdf
"""
import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

CARPETA = r'E:\ANTIGRAVITY\tools\evidencias\dia-de-muertos'
SALIDA = r'E:\ANTIGRAVITY\Dia-de-Muertos.pdf'

TITULOS = {
    1: 'Ilustración estilo Frida Kahlo con flores en el pelo',
    2: 'Catrina kawaii con vestido rosa y flores',
    3: 'Calavera de azúcar con rosas',
    4: 'Calavera con rosas y girasol sobre fondo negro',
    5: 'Calavera mexicana a color (con marca de agua)',
    6: 'Calavera con sombrero, estilo plano',
    7: 'Golondrina decorada con flores',
    8: 'Gato morado pintado de calavera',
    9: 'Vela decorada estilo mexicano (con marca de agua)',
    10: 'Corazón con calavera dentro',
    11: 'Calavera para colorear (con marca de agua)',
    12: 'Tres velas con caritas de calavera',
    13: 'Catrina con mariposa monarca y trenzas',
    14: 'Tres velas sobre tres calaveras con lazo rosa',
    15: 'Catrina kawaii con corona de flores y vestido rojo',
    16: 'Calavera con corona de flores y pendientes',
    17: 'Chihuahua pintado de calavera (plantilla recortable)',
    18: 'Molde de catrina con velita (con marca de agua)',
    19: 'Catrina kawaii con mariposa, fondo morado',
    20: 'Calavera con rosa grande y colores vivos',
    21: 'Catrina con rosas rojas y pendientes de aro',
    22: 'Catrina en blanco y negro (silueta)',
    23: 'Catrina en blanco y negro, detallada',
    24: 'Diseño «VIVA LA VIDA» con corazón y catrina',
}

archivos = sorted(f for f in os.listdir(CARPETA) if f.lower().endswith('.jpg'))
if not archivos:
    print('no hay imágenes en', CARPETA)
    sys.exit(2)

ancho_pag, alto_pag = A4
margen = 18 * mm
alto_pie = 12 * mm

c = canvas.Canvas(SALIDA, pagesize=A4)
c.setTitle('Día de Muertos — referencias')
c.setAuthor('Antigravity')

for i, nombre in enumerate(archivos, start=1):
    ruta = os.path.join(CARPETA, nombre)
    with Image.open(ruta) as im:
        ancho_img, alto_img = im.size
    disponible_ancho = ancho_pag - 2 * margen
    disponible_alto = alto_pag - 2 * margen - alto_pie
    escala = min(disponible_ancho / ancho_img, disponible_alto / alto_img)
    w, h = ancho_img * escala, alto_img * escala
    x = (ancho_pag - w) / 2
    y = margen + alto_pie + (disponible_alto - h) / 2
    c.drawImage(ruta, x, y, width=w, height=h, preserveAspectRatio=True, anchor='c')

    c.setFont('Helvetica', 9)
    c.setFillGray(0.35)
    pie = '%d. %s' % (i, TITULOS.get(i, nombre))
    c.drawCentredString(ancho_pag / 2, margen + 2 * mm, pie)
    c.setFillGray(0)
    c.showPage()

c.save()
print('PDF generado:', SALIDA)
print('páginas:', len(archivos), '| tamaño:', round(os.path.getsize(SALIDA) / 1024 / 1024, 1), 'MB')
