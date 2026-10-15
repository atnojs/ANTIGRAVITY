# -*- coding: utf-8 -*-
"""
Deja UNA sola entrada por codigo en SEED_COMMAND_IMAGES (los codigos del plan) y
con el ?v= nuevo.

El bloque Object.assign(SEED_COMMAND_IMAGES, { ... }) va DESPUES del objeto
literal: si un codigo esta en los dos, manda el del bloque. Al aplicar los lotes
se colaron entradas duplicadas sin ?v= y el cache-buster no surtia efecto.
"""
import re, sys

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
SELLO = '20261015-sujeto-unico'
CODIGOS = [c for fila in sys.argv[1:] for c in fila.split(',') if c]
src = open(APP, encoding='utf-8').read()

ini = src.index('Object.assign(SEED_COMMAND_IMAGES, {')
fin = src.index('\n});', ini)

dup = 0
for code in CODIGOS:
    pat = re.compile(r"\n?[ \t]*'%s':\s*'assets/[^']*'," % re.escape(code))
    m = pat.search(src, ini, fin)
    if m and pat.search(src[:ini]) is not None:
        src = src[:m.start()] + src[m.end():]
        fin -= (m.end() - m.start())
        dup += 1
print('entradas duplicadas quitadas del bloque: %d' % dup)

tocados = 0
for code in CODIGOS:
    pat = re.compile(r"('%s':\s*)'(assets/[^']*)'" % re.escape(code))
    def rep(m):
        global tocados
        tocados += 1
        return "%s'%s?v=%s'" % (m.group(1), m.group(2).split('?')[0], SELLO)
    src = pat.sub(rep, src)
print('codigos con ?v= puesto: %d de %d' % (tocados, len(CODIGOS)))
open(APP, 'w', encoding='utf-8', newline='').write(src)
