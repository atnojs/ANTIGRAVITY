# -*- coding: utf-8 -*-
"""Lista, por carpeta, las tarjetas cuyo SUJETO documentado NO es el mayoritario."""
import collections, glob, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'


def limpia(s):
    s = re.sub(r'^Example:\s*', '', str(s)).strip().rstrip('.')
    return ' '.join(s.split())


for f in sorted(glob.glob(os.path.join(T, '_sujetos_*.json'))):
    carpeta = os.path.basename(f)[len('_sujetos_'):-len('.json')]
    suj = json.load(open(f, encoding='utf-8'))
    f_ej = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    eje = json.load(open(f_ej, encoding='utf-8')) if os.path.exists(f_ej) else {}
    todo = {}
    for k, v in suj.items():
        todo[k] = limpia(v)
    for k, v in eje.items():
        todo[k] = limpia(v)
    if not todo:
        continue
    cuenta = collections.Counter(todo.values())
    mayoria, n = cuenta.most_common(1)[0]
    otros = {k: v for k, v in todo.items() if v != mayoria}
    if not otros:
        print('%-20s  %3d imagenes  UN SOLO SUJETO: %s' % (carpeta, len(todo), mayoria[:60]))
        continue
    print('%-20s  %3d imagenes  mayoria (%d): %s' % (carpeta, len(todo), n, mayoria[:60]))
    for k, v in sorted(otros.items()):
        print('        %-14s %s' % (k, v[:80]))
    print()
