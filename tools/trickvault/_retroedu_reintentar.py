# -*- coding: utf-8 -*-
"""Reintenta solo las tarjetas que faltan, muchas veces, hasta que alguna pase el corte."""
import importlib.util, json, os, sys, time
sys.stdout.reconfigure(encoding='utf-8')

spec = importlib.util.spec_from_file_location('g', r'E:\ANTIGRAVITY\tools\trickvault\_retroedu_gen.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

jobs = g.build_jobs()
faltan = [j for j in jobs if not os.path.exists(os.path.join(g.OUT, j['id'] + '.png'))]
print(f'faltan {len(faltan)}: {[j["code"] for j in faltan]}', flush=True)

MAX = int(os.environ.get('RETROEDU_MAX', '12'))
for vuelta in range(1, MAX + 1):
    pend = [j for j in faltan if not os.path.exists(os.path.join(g.OUT, j['id'] + '.png'))]
    if not pend:
        break
    for j in pend:
        t0 = time.time()
        try:
            img = g.generate(j['prompt'])
            open(os.path.join(g.OUT, j['id'] + '.png'), 'wb').write(img)
            print(f'  vuelta {vuelta} {j["id"]} {j["code"]:22s} OK {len(img)//1024} KB '
                  f'en {time.time()-t0:.0f}s', flush=True)
        except Exception as e:
            print(f'  vuelta {vuelta} {j["id"]} {j["code"]:22s} fallo en {time.time()-t0:.0f}s: {e}', flush=True)
            time.sleep(5)

restantes = [j['code'] for j in faltan if not os.path.exists(os.path.join(g.OUT, j['id'] + '.png'))]
print('SIGUEN FALTANDO:' if restantes else 'COMPLETO:', restantes, flush=True)
