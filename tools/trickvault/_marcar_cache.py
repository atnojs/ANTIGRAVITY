# -*- coding: utf-8 -*-
"""
Tras regenerar imagenes de una carpeta hay que forzar que los navegadores que ya
las tenian guardadas las vuelvan a pedir (si no, Antonio recarga y ve la vieja):

  1. en SEED_COMMAND_IMAGES, sube el ?v= de los codigos regenerados;
  2. sube la version de GENERATED_IMAGE_RELEASES de esa carpeta (asi la app
     vuelve a aplicar el ejemplo del repositorio en las tarjetas ya guardadas).

Uso: _marcar_cache.py <carpeta> <code1> <code2> ...
"""
import json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
T = r'E:\ANTIGRAVITY\tools\trickvault'
SELLO = '20261015-sujeto-unico'

carpeta = sys.argv[1]
codes = set(sys.argv[2:])
src = open(APP, encoding='utf-8').read()

# 1) ?v= en los codigos regenerados
tocados = 0
for c in sorted(codes):
    m = re.search(r"('%s':\s*')(assets/[^']*?)(')" % re.escape(c), src)
    if not m:
        print('  sin registro en SEED_COMMAND_IMAGES:', c)
        continue
    ruta = m.group(2).split('?')[0]
    src = src[:m.start(2)] + ruta + '?v=' + SELLO + src[m.end(2):]
    tocados += 1
print('  %s: ?v= subido en %d codigos' % (carpeta, tocados))

# 2) version del release de la carpeta
pat = re.compile(r"(\{ category: '%s', prefix: '[^']*', key: '[^']*', version: ')([^']*)(' \})" % re.escape(carpeta))
m = pat.search(src)
if m:
    vieja = m.group(2)
    src = src[:m.start(2)] + SELLO + src[m.end(2):]
    print('  %s: release %s -> %s' % (carpeta, vieja, SELLO))
else:
    print('  %s: NO encontre su release' % carpeta)

open(APP, 'w', encoding='utf-8', newline='').write(src)
