"""Medidas objetivas de las dos pruebas:
   - saturacion media (grupo de color: cuanto color tiene cada resultado)
   - nitidez (varianza del laplaciano: cada pasada vuelve a codificar la imagen)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

D = r'E:\ANTIGRAVITY\tools\trickvault\_prueba_combinar'

def medir(nombre):
    im = Image.open(os.path.join(D, nombre)).convert('RGB')
    a = np.asarray(im, dtype=np.float32) / 255.0
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    g = np.asarray(im.convert('L'), dtype=np.float32)
    lap = np.asarray(Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    return float(sat.mean()), float(lap.var()), im.size

print('%-38s %10s %12s' % ('imagen', 'saturacion', 'nitidez(edge-var)'))
print('-' * 62)
for n in ['0_base', '2_combinado', '1_sep_1_restaurarfotoantigua',
          '1_sep_2_preservaridentidadantigua', '1_sep_3_restauracionconservadora',
          '3_color_lostres_deuna', '3_color_solo_natural',
          '3_color_sep_1_colorizarfotoantigua', '3_color_sep_2_colorizacionnatural',
          '3_color_sep_3_coloresdeepoca']:
    s, v, tam = medir(n + '.png')
    print('%-38s %10.4f %12.1f  %s' % (n, s, v, tam))
