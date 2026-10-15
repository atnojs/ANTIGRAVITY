# -*- coding: utf-8 -*-
"""
Mide QUE SUJETO se uso en cada imagen de cada carpeta, para detectar:
  - carpetas con mas de un sujeto (deberia haber UNO solo)
  - imagenes con dos sujetos mezclados

Fuentes: _sujetos_<carpeta>.json (sustituye [OBJETO]) y _ejemplos_<carpeta>.json
(pista), mas los prompts reales de _<carpeta>_jobs.json.
"""
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
    cuenta = collections.Counter()
    for v in suj.values():
        cuenta[limpia(v)] += 1
    for v in eje.values():
        cuenta[limpia(v)] += 1
    total = sum(cuenta.values())
    print('%s: %d imagenes documentadas, %d sujetos distintos' % (carpeta, total, len(cuenta)))
    for s, n in cuenta.most_common(6):
        print('    %3d x %s' % (n, s[:88]))
    if len(cuenta) > 6:
        print('    ... y %d sujetos mas' % (len(cuenta) - 6))
    print()
