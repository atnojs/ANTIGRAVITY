# -*- coding: utf-8 -*-
"""Pasa los codigos de moda/belleza de xl-comidamoda a la carpeta nueva xl-moda."""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
MODA = ['/transferoutfit', '/profesión', '/editorial', '/fashion', '/streetstyle', '/hairstyles',
        '/sunglassesstryon', '/lookbook', '/editorialfashion', '/runway', '/outfitgrid',
        '/makeuplook', '/swatch', '/beautyclose', '/nailart', '/jewelry', '/tryon',
        '/fashionsketch', '/fabricdrape', '/outfit', '/underglasseditorial',
        '/crosswalkprofileeditorial', '/fashioncontentsheet', '/motionblureditorial',
        '/luxurylifestyle']
s = open(APP, encoding='utf-8').read()
n = 0
for c in MODA:
    patron = re.compile(r"('%s':\s*')xl-comidamoda(')" % re.escape(c))
    s2, k = patron.subn(r"\g<1>xl-moda\g<2>", s)
    if k:
        n += k
        s = s2
    else:
        print('  AVISO: no encontre %s en CODE_FOLDER' % c)
# version del esquema de carpetas: 5 -> 6 (para que la carpeta nueva aparezca
# tambien en los navegadores que ya tienen la lista guardada)
s = s.replace('const FOLDERS_SCHEMA_VERSION = 5;', 'const FOLDERS_SCHEMA_VERSION = 6;')
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('codigos movidos a xl-moda: %d de %d' % (n, len(MODA)))
print('FOLDERS_SCHEMA_VERSION = 6:', 'const FOLDERS_SCHEMA_VERSION = 6;' in s)
