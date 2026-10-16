# -*- coding: utf-8 -*-
"""
Deja los ficheros _sujetos_<carpeta>.json consistentes:

  - fuera las entradas de tarjetas que hoy NO son de esa carpeta (restos de cuando
    los ids se desplazaron: una entrada con el id de otra tarjeta le pondría un
    sujeto equivocado si algún día se regenera);
  - dentro las tarjetas de la carpeta que no tuvieran entrada, con el sujeto
    mayoritario de la carpeta (así una futura regeneración no se queda sin sujeto);
  - las excepciones documentadas (sujeto distinto al mayoritario) se respetan.
"""
import collections, glob, importlib.util, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

for f in sorted(glob.glob(os.path.join(T, '_sujetos_*.json'))):
    carpeta = os.path.basename(f)[len('_sujetos_'):-len('.json')]
    suj = json.load(open(f, encoding='utf-8'))
    tarjetas = cl.tarjetas_de(carpeta)
    ids = {t['id']: t['code'] for t in tarjetas}
    # 1) fuera las ajenas
    ajenas = [k for k in suj if k not in ids]
    for k in ajenas:
        del suj[k]
    # 2) sujeto mayoritario de la carpeta (solo con lo que queda)
    cuenta = collections.Counter(suj.values())
    mayoria = cuenta.most_common(1)[0][0] if cuenta else None
    # 3) dentro las que faltan
    puestas = []
    for i, code in ids.items():
        if i not in suj and mayoria:
            suj[i] = mayoria
            puestas.append(code)
    json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    otros = {k: v for k, v in suj.items() if v != mayoria}
    print('%-18s %2d tarjetas | ajenas fuera %2d | anadidas %2d | excepciones %d'
          % (carpeta, len(ids), len(ajenas), len(puestas), len(otros)))
    for k, v in sorted(otros.items())[:3]:
        print('      excepcion %-14s %s' % (k, v[:52]))
