# -*- coding: utf-8 -*-
"""
Quita de la capa publicada las imageUrl que apuntan al ALMACEN (uploads/...).

El almacen del servidor tiene ficheros de OTRAS tarjetas (se ve claro en
/minifig, /gashapon, /bobblehead y /actionfigure: enseñaban frascos de perfume).
Ahora que el repositorio tiene un ejemplo verificado de cada código, la imagen
buena es la del repositorio; el almacen queda solo como último recurso.
Se conservan los customPrompt, los títulos y el orden.
"""
import json, os, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\catalogo.json'
capa = json.load(open(APP, encoding='utf-8'))
fuera = []
for k, v in capa['tarjetas'].items():
    if str(v.get('imageUrl', '')).startswith('uploads/'):
        fuera.append((k, v.pop('imageUrl')))
shutil.copy(APP, APP + '.bak_antes_de_quitar_uploads')
json.dump(capa, open(APP, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('imageUrl del almacen quitadas de la capa: %d' % len(fuera))
for k, u in fuera:
    print('   %-16s %s' % (k, u))
print()
print('quedan %d tarjetas en la capa; con imageUrl: %d'
      % (len(capa['tarjetas']), len([1 for v in capa['tarjetas'].values() if v.get('imageUrl')])))
