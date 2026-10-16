# -*- coding: utf-8 -*-
"""Comparativa final: antes (sin imagenes) vs despues (con ejemplos), en la app."""
import os

from PIL import Image, ImageDraw

ROOT = r"E:\ANTIGRAVITY\tools\trickvault"
IG2 = r"E:\ANTIGRAVITY\tools\_ig2"
FUENTE = (0, 210, 220)
AMBAR = (255, 190, 60)


def abre(p):
    with Image.open(p) as im:
        return im.convert("RGB")


def esc(im, ancho):
    return im.resize((ancho, int(im.size[1] * ancho / float(im.size[0]))), Image.LANCZOS)


def franja(ancho, alto, texto, color=AMBAR):
    f = Image.new("RGB", (ancho, alto), (8, 10, 16))
    ImageDraw.Draw(f).text((14, (alto - 12) // 2), texto, fill=color)
    return f


def main():
    A = 1100
    antes = esc(abre(os.path.join(IG2, "ev_antes.png")).crop((0, 240, 1424, 620)), A)
    despues = esc(abre(os.path.join(ROOT, "ev_rejilla_con_imagenes.png")).crop((0, 240, 1424, 900)), A)
    tarjeta = esc(abre(os.path.join(ROOT, "ev_tarjeta_con_imagen.png")).crop((0, 240, 1424, 700)), A)
    alto = 46 + antes.size[1] + 46 + despues.size[1] + 46 + tarjeta.size[1] + 20
    hoja = Image.new("RGB", (A, alto), (8, 10, 16))
    y = 0
    for texto, im in [
        ("ANTES  -  las 267 tarjetas nuevas estaban SIN imagen de ejemplo", antes),
        ("DESPUES  -  100 de las nuevas ('/product ...') ya con su ejemplo generado", despues),
        ("UNA TARJETA NUEVA  -  /product lava, con su imagen en assets/", tarjeta),
    ]:
        hoja.paste(franja(A, 46, texto), (0, y))
        y += 46
        hoja.paste(im, (0, y))
        y += im.size[1]
    hoja.save(os.path.join(ROOT, "comparativa_trickvault_imagenes.png"))
    print("comparativa:", hoja.size)


if __name__ == "__main__":
    main()
