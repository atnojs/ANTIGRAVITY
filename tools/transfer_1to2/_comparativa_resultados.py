# -*- coding: utf-8 -*-
"""Comparativa antes/después de los 5 resultados que Antonio marcó como flojos.

Recorta el panel RESULTADO de cada tríptico (antes: gemini; ahora: openai-image-2
medium) y los apila en dos columnas.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'E:\ANTIGRAVITY\_pruebas_img\transfer_1to2'
ANTES = os.path.join(ROOT, 'antes')
AHORA = r'E:\ANTIGRAVITY\apps\trickvault\assets\transfer-1to2'
DESTINO = r'E:\ANTIGRAVITY\tools\transfer_1to2\evidencias\comparativa_resultados_medium.png'

CODIGOS = ['matchpose', 'transferlight', 'transferhair', 'transferweather', 'matchexpression']
ETIQUETAS = {
    'matchpose': '/matchpose-1to2', 'transferlight': '/transferlight-1to2',
    'transferhair': '/transferhair-1to2', 'transferweather': '/transferweather-1to2',
    'matchexpression': '/matchexpression-1to2',
}

# Geometría del tríptico: 1536x768, 3 paneles de 420 con 8 px de separación.
PANEL_W, SEP, LIENZO = 420, 8, 1536
X0 = (LIENZO - (PANEL_W * 3 + SEP * 2)) // 2
X_RESULTADO = X0 + 2 * (PANEL_W + SEP)

CELDA_W, CELDA_H = 320, 585
CABECERA = 124
FONDO = (10, 16, 22)
CIAN = (0, 208, 208)
TINTA = (235, 245, 250)
ROJO = (255, 120, 120)


def fuente(size):
    for ruta in (r'E:\ANTIGRAVITY\apps\conversor_multimedia\vendor\electrolize.ttf',
                 'arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(ruta, size)
        except Exception:
            continue
    return ImageFont.load_default()


def panel_resultado(ruta):
    with Image.open(ruta) as im:
        im = im.convert('RGB').crop((X_RESULTADO, 0, X_RESULTADO + PANEL_W, im.height))
        return im.resize((CELDA_W, CELDA_H), Image.LANCZOS)


def main():
    filas = len(CODIGOS)
    ancho = 40 + CELDA_W * 2 + 40
    alto = CABECERA + filas * (CELDA_H + 56)
    lienzo = Image.new('RGB', (ancho, alto), FONDO)
    d = ImageDraw.Draw(lienzo)
    f_titulo, f_cab, f_cod = fuente(21), fuente(19), fuente(18)

    d.text((24, 14), 'Panel de RESULTADO: antes (gemini) vs ahora (medium)', font=f_titulo, fill=CIAN)
    d.text((26, 46), 'Imagen 1 e imagen 2 son las mismas en los dos casos: solo cambia el motor.', font=f_cod, fill=TINTA)
    d.text((40, CABECERA - 30), 'ANTES', font=f_cab, fill=ROJO)
    d.text((40 + CELDA_W + 40, CABECERA - 30), 'AHORA (gpt-image-2 medium)', font=f_cab, fill=CIAN)

    for i, code in enumerate(CODIGOS):
        y = CABECERA + i * (CELDA_H + 56)
        d.text((40, y - 22), ETIQUETAS[code], font=f_cod, fill=TINTA)
        viejo = os.path.join(ANTES, f'{code}-1to2.jpg')
        nuevo = os.path.join(AHORA, f'{code}-1to2-triptico-medium.jpg')
        lienzo.paste(panel_resultado(viejo), (40, y))
        lienzo.paste(panel_resultado(nuevo), (40 + CELDA_W + 40, y))

    lienzo.save(DESTINO, quality=92)
    print('->', DESTINO, lienzo.size)


if __name__ == '__main__':
    main()
