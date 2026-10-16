# -*- coding: utf-8 -*-
"""Valida el catálogo de video-vault: ids únicos, nombres únicos, dificultades
asignadas y tarjetas nuevas con su prompt listo para Flow.

Uso: python tools/video-vault/validar_catalogo.py
"""
import collections
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

HTML = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
src = open(HTML, encoding='utf-8').read()

i = src.index('const VIDEO_COMMANDS = [')
j = src.index('const CODE_FOLDER')
bloque = src[i:j]

ids = re.findall(r"\{ id: '([^']+)'", bloque)
names = re.findall(r"name: '([^']*)'", bloque)
faltan_barras = [n for n in names if not n.startswith('/')]
rep_names = [k for k, v in collections.Counter(names).items() if v > 1]
rep_ids = [k for k, v in collections.Counter(ids).items() if v > 1]

# Comandos de la captura cubiertos por una tarjeta con OTRO nombre (equivalentes).
EQUIVALENTES = {
    'gymworkout': 'li06 /gymworkout',
    'meditation': 'li08 /meditation',
    'travelvlog': 'li10 /travelvlog',
    'screenrecord': 'te01 /screenrecord',
    'vrworld': 'te09 /vrworld',
    'textoverlay': 'au08 /overlay',
    'avatar': 'te09 /vrworld',
    'bullettime': 'tm04 /bullet',
    'freezeframe': 'ac04 /freezeframe',
    'whippan': 'ac07 /whippan',
    'matchcut': 'ac05 /matchcut',
    'fastmotion': 'ac03 /fastmotion',
    'montage': 'ac06 /montage',
    'zoomout': 'cm02 /zoomout',
    'trackingshot': 'mv08 /trackingshot',
    'goldenhour': 'lm01 /goldenhour',
    'backlight': 'lm03 /backlight',
    'sunrise': 'na05 /sunrise',
    'beachview': 'na07 /beachview',
    'timesquare': 'ur06 /timesquare',
    'claymation': 's02 /claymation',
}
ya = set(names)
ya_norm = {re.sub(r'[^a-z0-9]', '', n.lower().lstrip('/')) for n in names}
huecos = {k: v for k, v in EQUIVALENTES.items() if k not in ya_norm}
print('comandos de la captura sin tarjeta con ese nombre (equivalentes ya en la app):', len(huecos))
for k, v in huecos.items():
    print('   /%s -> ya cubierto por %s' % (k, v))

dif_block = src[src.index('const VIDEO_DIFFICULTY'):src.index('const DIFFICULTIES')]
con_dif = set(re.findall(r"(\w+): '", dif_block))
sin_dif = [c for c in ids if c not in con_dif]

# Comandos nuevos de la captura 2026-10-11
nuevos = [c for c in ids if c.startswith('x')]
prompts = dict(re.findall(r"\{ id: '([^']+)'.*?prompt: '([^']*)'", bloque))

print('tarjetas:', len(ids))
print('ids unicos:', len(set(ids)), '(repetidos: %s)' % (rep_ids or 'ninguno'))
print('nombres unicos:', len(set(names)), '(repetidos: %s)' % (rep_names or 'ninguno'))
print('sin barra inicial:', faltan_barras or 'ninguno')
print('sin dificultad asignada:', sin_dif or 'ninguna')
print('tarjetas nuevas:', ', '.join(nuevos))
for c in nuevos:
    print('   %s -> %s' % (c, prompts.get(c, 'SIN PROMPT')[:80]))

ok = not rep_ids and not rep_names and not faltan_barras
print('\nRESULTADO:', 'OK' if ok else 'REVISAR')
sys.exit(0 if ok else 1)
