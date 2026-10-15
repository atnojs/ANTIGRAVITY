# -*- coding: utf-8 -*-
"""
Compara, para cada tarjeta del catalogo que tira de uploads/, la imagen que dice
el CATALOGO con la que tiene el ALMACEN para su id real.

  - almacen == catalogo        -> bien
  - almacen != catalogo        -> el almacen GANA en la app => imagen ajena (mal)
  - sin entrada en el almacen  -> manda el catalogo
"""
import importlib.util, json, re, sys, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
spec = importlib.util.spec_from_file_location('cl', r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_lote.py')
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

ig = cl._lit('INSTAGRAM_COMMANDS'); ad = cl._lit('ADDITIONAL_IMAGE_COMMANDS')
allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
ID = {}
for n, (code, _d) in enumerate(allc):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid)

url = 'https://atnojs.es/apps/trickvault/image_store.php?action=list&t=1'
with urllib.request.urlopen(url, timeout=90) as r:
    store = json.load(r)['images']
print('entradas en el almacen:', len(store))

catalogo = [(c, u) for c, u in cl.SEED_IMAGES.items() if str(u).startswith('uploads/')]
print('tarjetas del catalogo que tiran de uploads/:', len(catalogo))

iguales, distintas, sin_entrada, sin_id = [], [], [], []
for code, cat in catalogo:
    cid = ID.get(code)
    if not cid:
        sin_id.append((code, cat)); continue
    alm = store.get(cid)
    if not alm:
        sin_entrada.append((code, cid, cat))
    elif alm == cat:
        iguales.append((code, cid))
    else:
        distintas.append((code, cid, cat, alm))

print('  iguales (bien)                :', len(iguales))
print('  DISTINTAS (el almacen gana)   :', len(distintas))
print('  sin entrada en el almacen     :', len(sin_entrada))
print('  sin id de catalogo            :', len(sin_id))
print()
print('--- las DISTINTAS (codigo | id | catalogo -> almacen) ---')
for code, cid, cat, alm in distintas:
    print('  %-26s %-14s %-34s %s' % (code, cid, cat, alm))
json.dump([{'code': c, 'id': i, 'catalogo': a, 'almacen': b} for c, i, a, b in distintas],
          open(r'E:\ANTIGRAVITY\tools\trickvault\_desajustes.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print()
print('guardado tools/trickvault/_desajustes.json')
