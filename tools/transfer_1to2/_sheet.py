# -*- coding: utf-8 -*-
"""Hojas de contacto de las pruebas de codigos "X 1 to 2"."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'E:\ANTIGRAVITY\_pruebas_img\transfer_1to2'
REFS = os.path.join(ROOT, 'refs')
OUT = os.path.join(ROOT, 'out')
SHEETS = os.path.join(ROOT, 'sheets')
RESULTS = os.path.join(ROOT, 'results.json')

CELL = 430
LABEL_W = 300
HEAD = 84
FONDO = (14, 20, 26)
TINTA = (235, 245, 250)
ACENTO = (0, 208, 208)
VERDE = (38, 198, 38)
ROJO = (255, 96, 96)


def fuente(size, bold=False):
    for nombre in (('arialbd.ttf' if bold else 'arial.ttf'), 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(nombre, size)
        except Exception:
            continue
    return ImageFont.load_default()


def celda(path, etiqueta_ok=True):
    img = Image.new('RGB', (CELL, CELL), (26, 32, 40))
    if path and os.path.exists(path):
        try:
            with Image.open(path) as im:
                im = im.convert('RGB')
                im.thumbnail((CELL, CELL), Image.LANCZOS)
                img.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2))
        except Exception:
            pass
    return img


def hoja(titulo, filas, columnas, destino):
    """filas: [(etiqueta, [rutas...])] ; columnas: [titulos]"""
    ncols = len(columnas)
    w = LABEL_W + CELL * ncols
    h = HEAD + len(filas) * CELL
    canvas = Image.new('RGB', (w, h), FONDO)
    d = ImageDraw.Draw(canvas)
    d.text((22, 10), titulo, font=fuente(23, True), fill=ACENTO)
    for c, t in enumerate(columnas):
        d.text((LABEL_W + c * CELL + 14, 48), t, font=fuente(19, True), fill=TINTA)
    for r, (etiqueta, rutas) in enumerate(filas):
        y = HEAD + r * CELL
        d.line([(0, y), (w, y)], fill=(40, 52, 62), width=2)
        for k, linea in enumerate(str(etiqueta).split('\n')):
            d.text((20, y + 16 + k * 26), linea, font=fuente(20, True),
                   fill=TINTA if k == 0 else ACENTO)
        for c in range(ncols):
            p = rutas[c] if c < len(rutas) else None
            canvas.paste(celda(p), (LABEL_W + c * CELL, y))
            if p is None:
                d.text((LABEL_W + c * CELL + 20, y + CELL // 2), 'FALLO', font=fuente(22, True), fill=ROJO)
    canvas.save(destino, quality=92)
    print('  ->', destino, f'{canvas.width}x{canvas.height}')
    return destino


def por_codigo(resultados, fase):
    idx = {}
    for r in resultados:
        if r.get('fase') == fase:
            idx.setdefault(r['code'], {})[r.get('variant', '')] = r
    return idx


def construir():
    os.makedirs(SHEETS, exist_ok=True)
    resultados = json.load(open(RESULTS, encoding='utf-8'))
    ref1 = os.path.join(REFS, 'ref1_donante.png')
    ref2 = os.path.join(REFS, 'ref2_receptora.png')

    def ruta(r):
        return r['file'] if r and r.get('ok') and r.get('file') and os.path.exists(r['file']) else None

    # Fase A: semantica
    a = por_codigo(resultados, 'A')
    if a:
        filas = []
        for code in ['transferbackground', 'transferoutfit', 'colorgrade', 'matchpose']:
            if code not in a:
                continue
            filas.append((f'/{code} 1 to 2',
                          [ref1, ref2, ruta(a[code].get('crudo')), ruta(a[code].get('etiquetado'))]))
        hoja('FASE A - "1 to 2" crudo vs prompt etiquetado (gemini-3-pro-image)',
             filas, ['IMG 1 (donante)', 'IMG 2 (receptora)', 'Solo el codigo', 'Prompt etiquetado'],
             os.path.join(SHEETS, 'A_semantica.jpg'))

    # Fases B y C: familia (B troceada en dos hojas para que se lea bien)
    for fase, título, nombre in (
            ('B', 'FASE B (1/2) - familia nueva de codigos 1->2 (gemini-3.1-flash-image)', 'B_familia_1.jpg'),
            ('C', 'FASE C - codigos del usuario en gpt-image-2 low (modelo por defecto)', 'C_openai.jpg')):
        idx = por_codigo(resultados, fase)
        if not idx:
            continue
        filas = []
        for code in list(idx):
            filas.append((f'/{code} 1 to 2', [ref1, ref2, ruta(idx[code].get('etiquetado'))]))
        if fase == 'B':
            for mitad, sub in enumerate((filas[:5], filas[5:]), 1):
                hoja(título.replace('(1/2)', f'({mitad}/2)'), sub,
                     ['IMG 1 (donante)', 'IMG 2 (receptora)', 'Resultado'],
                     os.path.join(SHEETS, f'B_familia_{mitad}.jpg'))
            continue
        hoja(título, filas, ['IMG 1 (donante)', 'IMG 2 (receptora)', 'Resultado'], os.path.join(SHEETS, nombre))

    # Fase D: prompt corregido + comprobacion del orden
    d = por_codigo(resultados, 'D')
    if d:
        filas = []
        for code in ['colorgrade', 'transferlight', 'transferhair', 'transferstyle', 'matchcamera']:
            if code in d and 'v2' in d[code]:
                filas.append((f'/{code} 1 to 2 (v2)', [ref1, ref2, ruta(d[code]['v2'])]))
        for code in d:
            if 'orden_invertido' in d[code]:
                filas.append(('/transferbackground 1 to 2\n(imagenes invertidas 2,1)',
                              [ref2, ref1, ruta(d[code]['orden_invertido'])]))
        hoja('FASE D - prompt corregido v2 y comprobacion del orden 1/2',
             filas, ['IMG 1 (donante)', 'IMG 2 (receptora)', 'Resultado'],
             os.path.join(SHEETS, 'D_corregidos.jpg'))


if __name__ == '__main__':
    construir()
