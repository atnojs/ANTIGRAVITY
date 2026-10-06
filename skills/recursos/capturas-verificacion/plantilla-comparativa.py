# -*- coding: utf-8 -*-
"""Plantilla para montar la imagen de entrega: recorta la misma zona del antes y del
después, apila las bandas y las etiqueta con la tipografía del proyecto (Electrolize).

Uso tipico (capturas hechas con Chrome headless al mismo --window-size):

    python plantilla-comparativa.py \
        --antes  tools\\_antes.png \
        --despues tools\\_despues.png \
        --recorte 140,1290,1310,1480 \
        --etiqueta-antes   "ANTES  -  capsulas comprimidas: MAX SUNBURST, 3 PRO y HIGH salian cortados" \
        --etiqueta-despues "DESPUES  -  2 lineas: OPENAI 2.5 / GEMINI + QWEN + IMAGE 2, todo visible" \
        --salida tools\\comparativa_componente_app.png

Notas:
- El recorte se da en píxeles de la captura original (x1,y1,x2,y2), igual para ambas.
- La TTF local del proyecto evita depender de fuentes del sistema.
- No versiones el resultado en ningún árbol de la app: tools/ es el sitio.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TTF_POR_DEFECTO = r"E:\ANTIGRAVITY\apps\conversor_multimedia\vendor\electrolize.ttf"


def recortar(ruta: Path, caja: tuple[int, int, int, int]) -> Image.Image:
    return Image.open(ruta).convert("RGB").crop(caja)


def main() -> None:
    p = argparse.ArgumentParser(description="Comparativa antes/despues etiquetada")
    p.add_argument("--antes", required=True, type=Path)
    p.add_argument("--despues", required=True, type=Path)
    p.add_argument("--recorte", required=True, help="x1,y1,x2,y2 (mismo recorte en ambas capturas)")
    p.add_argument("--salida", required=True, type=Path)
    p.add_argument("--etiqueta-antes", default="ANTES")
    p.add_argument("--etiqueta-despues", default="DESPUES")
    p.add_argument("--ttf", default=TTF_POR_DEFECTO)
    p.add_argument("--titulo-px", type=int, default=19)
    args = p.parse_args()

    x1, y1, x2, y2 = (int(v) for v in args.recorte.split(","))
    caja = (x1, y1, x2, y2)
    arriba = recortar(args.antes, caja)
    abajo = recortar(args.despues, caja)

    fuente = ImageFont.truetype(args.ttf, args.titulo_px)
    banda = args.titulo_px + 14
    ancho = max(arriba.width, abajo.width)
    alto = banda + arriba.height + banda + abajo.height + 8
    lienzo = Image.new("RGB", (ancho, alto), (3, 14, 20))
    dibujo = ImageDraw.Draw(lienzo)

    dibujo.text((8, 7), args.etiqueta_antes, font=fuente, fill=(255, 140, 140))
    lienzo.paste(arriba, (0, banda))
    y = banda + arriba.height
    dibujo.text((8, y + 7), args.etiqueta_despues, font=fuente, fill=(120, 255, 190))
    lienzo.paste(abajo, (0, y + banda))

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(args.salida)
    print(f"comparativa escrita: {args.salida} ({lienzo.width}x{lienzo.height})")


if __name__ == "__main__":
    main()
