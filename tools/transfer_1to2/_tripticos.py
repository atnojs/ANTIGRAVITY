# -*- coding: utf-8 -*-
"""
Monta el ejemplo de cada código «1 → 2» como TRÍPTICO: imagen 1 (referencia),
imagen 2 (la que se edita) y el RESULTADO de aplicar el código.

Por qué así:
- Un ejemplo de una sola foto no informa de nada en una transferencia 1 → 2.
- El proxy de Hostinger (openai-image-2-low) NO acepta dos imágenes de entrada,
  así que no puede generar la transferencia: los tres paneles salen de las
  imágenes reales de las pruebas (referencias + salida de cada código).
- La tarjeta recorta con `object-fit: cover` y `max-height: 150px`, por eso los
  paneles van centrados y con margen lateral: el recorte se come el margen, nunca
  un panel.

Uso: python _tripticos.py [codigo]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'E:\ANTIGRAVITY\_pruebas_img\transfer_1to2'
REFS = os.path.join(ROOT, 'refs')
OUT = os.path.join(ROOT, 'out')
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets\transfer-1to2'

# Lienzo 2:1 y tres paneles centrados con margen: al recortar la tarjeta (box
# ~1,7:1 en escritorio) solo se pierde margen, nunca un panel.
W, H = 1536, 768
PANEL_W = 420
SEP = 8
FONDO = (10, 16, 22)
BANDA = (6, 20, 28, 215)
CIAN = (0, 208, 208)

# código -> fichero de salida real de las pruebas
RESULTADOS = {
    'transferoutfit-1to2': 'A_transferoutfit_etiquetado.png',
    'colorgrade-1to2': 'D_colorgrade_v2.png',
    'matchpose-1to2': 'A_matchpose_etiquetado.png',
    'transferlight-1to2': 'D_transferlight_v2.png',
    'transferhair-1to2': 'D_transferhair_v2.png',
    'transfermakeup-1to2': 'B_transfermakeup_etiquetado.png',
    'transferaccessories-1to2': 'B_transferaccessories_etiquetado.png',
    'transferscene-1to2': 'B_transferscene_etiquetado.png',
    'transferweather-1to2': 'B_transferweather_etiquetado.png',
    'matchexpression-1to2': 'B_matchexpression_etiquetado.png',
    'transferpattern-1to2': 'B_transferpattern_etiquetado.png',
}

ETIQUETAS = ('1 · REFERENCIA', '2 · TU IMAGEN', 'RESULTADO')


def fuente(size):
    for ruta in (r'E:\ANTIGRAVITY\apps\conversor_multimedia\vendor\electrolize.ttf',
                 'arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(ruta, size)
        except Exception:
            continue
    return ImageFont.load_default()


def panel(ruta):
    """Recorta en retrato (centrado) y escala al panel."""
    with Image.open(ruta) as im:
        im = im.convert('RGB')
        w, h = im.size
        objetivo = PANEL_W / H
        ancho = min(w, int(round(h * objetivo)))
        alto = min(h, int(round(ancho / objetivo)))
        x0 = max(0, (w - ancho) // 2)
        y0 = max(0, (h - alto) // 2)
        im = im.crop((x0, y0, x0 + ancho, y0 + alto))
        return im.resize((PANEL_W, H), Image.LANCZOS)


def montar(codigo, destino):
    total = PANEL_W * 3 + SEP * 2
    lienzo = Image.new('RGB', (W, H), FONDO)
    x = (W - total) // 2
    fuentes = fuente(24)
    for i, ruta in enumerate((os.path.join(REFS, 'ref1_donante.png'),
                              os.path.join(REFS, 'ref2_receptora.png'),
                              os.path.join(OUT, RESULTADOS[codigo]))):
        lienzo.paste(panel(ruta), (x, 0))
        d = ImageDraw.Draw(lienzo, 'RGBA')
        # Banda con la etiqueta, dentro del panel.
        d.rectangle([x, 0, x + PANEL_W, 44], fill=BANDA)
        texto = ETIQUETAS[i]
        caja = d.textbbox((0, 0), texto, font=fuentes)
        d.text((x + (PANEL_W - (caja[2] - caja[0])) // 2, 10), texto, font=fuentes, fill=CIAN)
        if i < 2:
            d.rectangle([x + PANEL_W, 0, x + PANEL_W + SEP, H], fill=FONDO)
        x += PANEL_W + SEP
    # Marco fino para que se vea el borde de cada panel sobre el fondo oscuro.
    lienzo.save(destino, quality=88, optimize=True)


def main():
    os.makedirs(ASSETS, exist_ok=True)
    pedido = sys.argv[1].lstrip('/') if len(sys.argv) > 1 else ''
    codigos = [c for c in RESULTADOS if not pedido or c == pedido]
    if not codigos:
        sys.exit(f'código desconocido: {pedido}')
    faltan = []
    for code in codigos:
        for ruta in (os.path.join(REFS, 'ref1_donante.png'), os.path.join(REFS, 'ref2_receptora.png'),
                     os.path.join(OUT, RESULTADOS[code])):
            if not os.path.exists(ruta):
                faltan.append(ruta)
    if faltan:
        sys.exit('faltan imágenes de las pruebas:\n  ' + '\n  '.join(faltan))

    for i, code in enumerate(codigos, 1):
        # Sufijo -triptico: el nombre cambia para que ningún navegador sirva la
        # imagen antigua (mono-panel) desde su caché.
        destino = os.path.join(ASSETS, f'{code}-triptico.jpg')
        montar(code, destino)
        with Image.open(destino) as im:
            print(f'  ({i}/{len(codigos)}) {code:26s} {im.size[0]}x{im.size[1]} '
                  f'{os.path.getsize(destino)//1024} KB')
    print(f'\n{len(codigos)} trípticos en {ASSETS}')
    # Índice para la documentación (qué salida usa cada ejemplo).
    json.dump(RESULTADOS, open(os.path.join(ROOT, 'tripticos_fuentes.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
