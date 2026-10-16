# -*- coding: utf-8 -*-
"""Hoja de contactos GLOBAL de las 267 imagenes nuevas (6 por carpeta) para QC."""
import os
import sys

from PIL import Image, ImageDraw

TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
OUT = os.path.join(TOOLS, "_reels_overview.png")
THUMB, COLS_X, COLS_Y = 190, 6, 4
PAD, LBL = 6, 16


def miniaturas(carpeta, cuantas=12):
    gen = os.path.join(TOOLS, "%s_gen" % carpeta)
    if not os.path.isdir(gen):
        return []
    fs = sorted(f for f in os.listdir(gen) if f.startswith("reel-cmd-") and f.endswith(".png"))
    paso = max(1, len(fs) // cuantas)
    return [os.path.join(gen, f) for f in fs[::paso][:cuantas]]


def main():
    carpetas = sys.argv[1:]
    if not carpetas:
        carpetas = sorted(d[:-4] for d in os.listdir(TOOLS) if d.endswith("_gen"))
    # rejilla: por carpeta, una fila de 6 miniaturas
    filas = []
    for c in carpetas:
        ms = miniaturas(c)
        if ms:
            filas.append((c, ms))
    ancho = PAD + COLS_X * (THUMB + PAD)
    alto = PAD + len(filas) * (THUMB + LBL + PAD)
    hoja = Image.new("RGB", (ancho, alto), (16, 18, 24))
    d = ImageDraw.Draw(hoja)
    for r, (c, ms) in enumerate(filas):
        y = PAD + r * (THUMB + LBL + PAD)
        d.text((PAD, y), "%s  (%d ejemplos)" % (c, len(ms)), fill=(0, 220, 220))
        for i, p in enumerate(ms[:COLS_X]):
            with Image.open(p) as im:
                im = im.convert("RGB")
                im.thumbnail((THUMB, THUMB), Image.LANCZOS)
            hoja.paste(im, (PAD + i * (THUMB + PAD), y + LBL))
    hoja.save(OUT)
    print("overview:", OUT, hoja.size, "carpetas:", len(filas))


if __name__ == "__main__":
    main()
