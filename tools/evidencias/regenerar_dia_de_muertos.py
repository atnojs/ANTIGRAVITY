# -*- coding: utf-8 -*-
"""Regenera el PDF y el mosaico con JPEG BASE (no progresivos), que es lo que
pintan bien todos los visores de PDF. Las originales se conservan; las versiones
normalizadas van a _normalizadas/.

Salidas: E:\\ANTIGRAVITY\\Dia-de-Muertos.pdf  y  E:\\ANTIGRAVITY\\Dia-de-Muertos.jpg
"""
import os
import sys

import pymupdf
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

sys.stdout.reconfigure(encoding='utf-8')

BASE = r'E:\ANTIGRAVITY\tools\evidencias\dia-de-muertos'
NORM = os.path.join(BASE, '_normalizadas')
PDF = r'E:\ANTIGRAVITY\Dia-de-Muertos.pdf'
JPG = r'E:\ANTIGRAVITY\Dia-de-Muertos.jpg'
MAX_LADO = 1500

TITULOS = [
    'Ilustración estilo Frida Kahlo con flores en el pelo',
    'Catrina kawaii con vestido rosa y flores',
    'Calavera de azúcar con rosas',
    'Calavera con rosas y girasol sobre fondo negro',
    'Calavera mexicana a color (con marca de agua)',
    'Calavera con sombrero, estilo plano',
    'Golondrina decorada con flores',
    'Gato morado pintado de calavera',
    'Vela decorada estilo mexicano (con marca de agua)',
    'Corazón con calavera dentro',
    'Calavera para colorear (con marca de agua)',
    'Tres velas con caritas de calavera',
    'Catrina con mariposa monarca y trenzas',
    'Tres velas sobre tres calaveras con lazo rosa',
    'Catrina kawaii con corona de flores y vestido rojo',
    'Calavera con corona de flores y pendientes',
    'Chihuahua pintado de calavera (plantilla recortable)',
    'Molde de catrina con velita (con marca de agua)',
    'Catrina kawaii con mariposa, fondo morado',
    'Calavera con rosa grande y colores vivos',
    'Catrina con rosas rojas y pendientes de aro',
    'Catrina en blanco y negro (silueta)',
    'Catrina en blanco y negro, detallada',
    'Diseño «VIVA LA VIDA» con corazón y catrina',
]

os.makedirs(NORM, exist_ok=True)
originales = sorted(f for f in os.listdir(BASE) if f.lower().endswith('.jpg'))

# 1) Normalizar a JPEG base (SOF0)
normalizadas = []
for f in originales:
    with Image.open(os.path.join(BASE, f)) as im:
        im = im.convert('RGB')
        if max(im.size) > MAX_LADO:
            esc = MAX_LADO / max(im.size)
            im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.LANCZOS)
        destino = os.path.join(NORM, f)
        im.save(destino, 'JPEG', quality=88, optimize=True, progressive=False)
    normalizadas.append(destino)
print('normalizadas a JPEG base:', len(normalizadas))

# 2) PDF A4, una por pagina, con pie
ancho_pag, alto_pag = A4
margen, alto_pie = 18 * mm, 12 * mm
c = canvas.Canvas(PDF, pagesize=A4)
c.setTitle('Dia de Muertos - referencias')
for i, ruta in enumerate(normalizadas, start=1):
    with Image.open(ruta) as im:
        aw, ah = im.size
    disp_w = ancho_pag - 2 * margen
    disp_h = alto_pag - 2 * margen - alto_pie
    escala = min(disp_w / aw, disp_h / ah)
    w, h = aw * escala, ah * escala
    x = (ancho_pag - w) / 2
    y = margen + alto_pie + (disp_h - h) / 2
    c.drawImage(ruta, x, y, width=w, height=h)
    c.setFont('Helvetica', 9)
    c.setFillGray(0.35)
    c.drawCentredString(ancho_pag / 2, margen + 2 * mm, '%d. %s' % (i, TITULOS[i - 1] if i <= len(TITULOS) else ''))
    c.setFillGray(0)
    c.showPage()
c.save()

# 3) Mosaico 4x6 con las normalizadas
COLS, FILAS, CW, CH, M, GAP, TH = 4, 6, 380, 500, 28, 14, 90
ancho = M * 2 + COLS * CW + (COLS - 1) * GAP
alto = M * 2 + TH + FILAS * CH + (FILAS - 1) * GAP
lienzo = Image.new('RGB', (ancho, alto), (250, 248, 245))
dib = ImageDraw.Draw(lienzo)


def fuente(tam):
    for r in (r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf'):
        if os.path.isfile(r):
            return ImageFont.truetype(r, tam)
    return ImageFont.load_default()


dib.text((M, M + 10), 'Día de Muertos — 24 referencias', font=fuente(38), fill=(40, 30, 30))
dib.line([(M, M + TH - 12), (ancho - M, M + TH - 12)], fill=(210, 200, 195), width=2)
f_num = fuente(20)
for i, ruta in enumerate(normalizadas[:COLS * FILAS]):
    fila, col = divmod(i, COLS)
    x0 = M + col * (CW + GAP)
    y0 = M + TH + fila * (CH + GAP)
    dib.rectangle([x0, y0, x0 + CW, y0 + CH], fill=(255, 255, 255), outline=(226, 220, 216), width=2)
    with Image.open(ruta) as im:
        im = im.convert('RGB')
        esc = min((CW - 16) / im.width, (CH - 16) / im.height)
        im = im.resize((max(1, int(im.width * esc)), max(1, int(im.height * esc))), Image.LANCZOS)
        lienzo.paste(im, (x0 + (CW - im.width) // 2, y0 + (CH - im.height) // 2))
    dib.ellipse([x0 + 8, y0 + 8, x0 + 44, y0 + 44], fill=(245, 240, 236), outline=(200, 190, 185), width=2)
    t = str(i + 1)
    caja = dib.textbbox((0, 0), t, font=f_num)
    dib.text((x0 + 26 - (caja[2] - caja[0]) / 2, y0 + 26 - (caja[3] - caja[1]) / 2 - 2), t, font=f_num, fill=(90, 60, 70))
lienzo.save(JPG, 'JPEG', quality=88, optimize=True, progressive=False)

# 4) Verificacion: cada imagen embebida debe ser JPEG base
doc = pymupdf.open(PDF)
progresivos = []
for n in range(doc.page_count):
    for img in doc[n].get_images(full=True):
        datos = doc.extract_image(img[0])['image']
        if b'\xff\xc2' in datos[:4096]:
            progresivos.append(n + 1)
print('paginas:', doc.page_count, '| paginas con JPEG progresivo:', progresivos or 'ninguna')
doc.close()

with open(PDF, 'rb') as fh:
    cab = fh.read(4096)
print('pdf empieza por %PDF:', cab[:4] == b'%PDF')
for etiqueta, ruta in (('PDF', PDF), ('mosaico', JPG)):
    print('%s: %.1f MB' % (etiqueta, os.path.getsize(ruta) / 1024 / 1024))
with open(JPG, 'rb') as fh:
    print('mosaico progresivo:', b'\xff\xc2' in fh.read(4096))
