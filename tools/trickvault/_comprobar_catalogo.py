# -*- coding: utf-8 -*-
"""Comprueba que URLs del catalogo (uploads/...) existen de verdad en el servidor."""
import json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'https://atnojs.es/apps/trickvault/'
d = json.load(open(r'E:\ANTIGRAVITY\tools\trickvault\_desajustes.json', encoding='utf-8'))
urls = sorted({x['catalogo'] for x in d})


def vivo(u):
    req = urllib.request.Request(BASE + u, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return u, r.status, int(r.headers.get('Content-Length') or 0)
    except Exception as e:
        return u, getattr(e, 'code', 0), 0


with ThreadPoolExecutor(max_workers=8) as ex:
    res = list(ex.map(vivo, urls))

ok = [r for r in res if r[1] == 200]
mal = [r for r in res if r[1] != 200]
print('URLs de catalogo comprobadas: %d' % len(res))
print('  VIVAS  : %d' % len(ok))
print('  MUERTAS: %d' % len(mal))
print()
print('--- muertas (la tarjeta se queda sin imagen buena) ---')
porcat = {}
for x in d:
    porcat.setdefault(x['catalogo'], []).append(x['code'])
for u, st, _ in sorted(mal):
    print('  %-36s HTTP %-4s -> %s' % (u, st, ', '.join(porcat.get(u, []))))
json.dump({'vivas': [u for u, _, _ in ok], 'muertas': [u for u, _, _ in mal]},
          open(r'E:\ANTIGRAVITY\tools\trickvault\_catalogo_estado.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
