# -*- coding: utf-8 -*-
"""Comprueba coherencia del catalogo de apps/video-vault tras inyectar las tarjetas."""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
src = open(APP, encoding='utf-8').read()

# Comandos
comandos = re.findall(r"\{ id: '([a-z0-9]+)', cat: '([a-z]+)', name: '([^']+)'", src)
carpetas = re.findall(r"\{ id: '([a-z0-9]+)',\s*label: '[^']+',\s*icon", src)
ids = [c[0] for c in comandos]
nombres = [c[2] for c in comandos]
cats = sorted({c[1] for c in comandos})

print('comandos:', len(comandos))
print('ids unicos:', len(set(ids)) == len(ids), '| nombres unicos:', len(set(nombres)) == len(nombres))
print('carpetas definidas:', len(carpetas))
fuera = sorted(set(cats) - set(carpetas))
print('cats sin carpeta:', fuera if fuera else 'ninguna')
print('carpetas sin usar:', sorted(set(carpetas) - set(cats)) or 'ninguna')

# Dificultades
bloque = re.search(r'const VIDEO_DIFFICULTY = \{(.*?)\n\};', src, re.S)
difs = set(re.findall(r"([a-z0-9]+):\s*'(beginner|intermediate|advanced)'", bloque.group(1)))
faltan = [i for i in ids if (i, ) and not any(d[0] == i for d in difs)]
print('dificultades definidas:', len(difs), '| comandos sin dificultad:', faltan or 'ninguno')

# Ejemplos duplicados o vacios
vacios = [c[2] for c in comandos if not c[2].startswith('/')]
print('nombres sin barra:', vacios or 'ninguno')
