# -*- coding: utf-8 -*-
"""Afina las carpetas de apps/video-vault:

  - Separa los bonus creativos en tres carpetas: `style` (estilo y color),
    `fx` (efectos y partículas) y `anim` (animación e ilustración).
  - Renombra `style` a "Estilo y color" (ya no contiene los efectos).
  - Sube el esquema de carpetas a 3 para que los navegadores con carpetas guardadas
    vuelvan a fusionar las nuevas.

Uso: python _afinar_carpetas.py [--dry]
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
DRY = '--dry' in sys.argv

CARPETAS_NUEVAS = [
    {"id": "fx",   "label": "Efectos y partículas",     "icon": "💥", "color": "pink",   "bgIcon": "✨"},
    {"id": "anim", "label": "Animación e ilustración",  "icon": "🎞️", "color": "purple", "bgIcon": "🖍️"},
]

MOVIDOS = {
    'fx16': 'fx', 'fx17': 'fx', 'fx18': 'fx', 'fx19': 'fx', 'fx20': 'fx',
    'fx21': 'fx', 'fx22': 'fx', 'fx23': 'fx', 'fx24': 'fx',
    'fx25': 'anim', 'fx26': 'anim', 'fx27': 'anim', 'fx28': 'anim',
    'fx29': 'anim', 'fx30': 'anim', 'fx31': 'anim', 'fx32': 'anim',
}

src = open(APP, encoding='utf-8').read()

# 1) Carpetas nuevas
existentes = set(re.findall(r"\{ id: '([a-z0-9]+)',\s*label: '[^']+',\s*icon", src))
anadir = [c for c in CARPETAS_NUEVAS if c['id'] not in existentes]
print('carpetas a añadir:', [c['id'] for c in anadir] or 'ninguna')
if anadir:
    lineas = '\n'.join(
        "    {{ id: '{id}',{pad}label: {label}, icon: {icon}, color: {color}, bgIcon: {bg} }},".format(
            id=c['id'], pad=' ' * max(1, 10 - len(c['id'])),
            label="'" + c['label'] + "'", icon="'" + c['icon'] + "'",
            color="'" + c['color'] + "'", bg="'" + c['bgIcon'] + "'")
        for c in anadir)
    ancla = "    { id: 'audio', "  # ultima carpeta de la tanda anterior
    i = src.index(ancla)
    fin = src.index('\n', i)
    src = src[:fin + 1] + lineas + '\n' + src[fin + 1:]

# 2) Renombrar la etiqueta de 'style'
src2 = src.replace("label: 'Estilo y efectos'", "label: 'Estilo y color'")
print('etiqueta style renombrada:', src2 != src)
src = src2

# 3) Reasignar categorías
for cid, nueva in MOVIDOS.items():
    patron = re.compile(r"(\{ id: '" + cid + r"', cat: ')[a-z]+(')")
    src, n = patron.subn(lambda m: m.group(1) + nueva + m.group(2), src)
    if n != 1:
        print(f'  AVISO: {cid} -> {n} sustituciones')

# 4) Esquema de carpetas a 3
src = src.replace('const FOLDERS_SCHEMA_VERSION = 2;', 'const FOLDERS_SCHEMA_VERSION = 3;')

if DRY:
    print('DRY: no se escribe')
    sys.exit(0)

open(APP, 'w', encoding='utf-8', newline='').write(src)

# Comprobación final
cats = {}
for m in re.finditer(r"\{ id: '([a-z0-9]+)', cat: '([a-z]+)', name: '([^']+)'", src):
    cats.setdefault(m.group(2), []).append(m.group(3))
print('\ncarpetas y numero de comandos:')
for cat in sorted(cats):
    print(f'  {cat:8s} {len(cats[cat]):3d}')
print('total comandos:', sum(len(v) for v in cats.values()))
