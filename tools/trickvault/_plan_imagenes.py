# -*- coding: utf-8 -*-
"""
Plan definitivo de imagenes de TrickVault.

Para CADA tarjeta del catalogo con prompt de imagen, decide que hay que hacer
para que su ejemplo viva en el repositorio (assets/), que es la unica fuente
que se puede verificar:

  assets_ok      -> ya tiene su .jpg en el repositorio y el fichero existe
  assets_falta   -> el catalogo apunta a assets/... pero el fichero NO esta
  copiar         -> el catalogo apunta a un uploads/... que SI existe: se copia
  generar        -> no hay imagen buena: se genera con su propio prompt
  texto          -> comando de texto: no lleva imagen nunca
"""
import importlib.util, json, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
BASE = 'https://atnojs.es/apps/trickvault/'

spec = importlib.util.spec_from_file_location('cl', r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_lote.py')
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

# id de catalogo por codigo
ig, ad = cl._lit('INSTAGRAM_COMMANDS'), cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex, cap = cl._lit('EXCEL_COMMANDS'), cl._lit('CAPTURE_COMMANDS')
allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
ID, FOLDER = {}, {}
for n, (code, _d) in enumerate(allc):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid)
for n, (code, _d) in enumerate(ex):
    ID.setdefault(code, 'xl-cmd-%03d' % (n + 1))
for n, (code, _d) in enumerate(cap):
    cid = 'cap-cmd-%03d' % (n + 1)
    if cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid)

TEXTOS = set(cl.TEXTOS)
# subcarpeta de assets que usa cada carpeta (la mas repetida), como en _carpeta_lote
sub_uso = {}
for code, ruta in cl.SEED_IMAGES.items():
    m = re.match(r'assets/([^/]+)/', str(ruta))
    if m:
        carpeta = cl.CODE_FOLDER.get(code, 'xl-dev')
        sub_uso.setdefault(carpeta, {})
        sub_uso[carpeta][m.group(1)] = sub_uso[carpeta].get(m.group(1), 0) + 1


def subcarpeta(carpeta):
    d = sub_uso.get(carpeta)
    return max(d, key=d.get) if d else carpeta


# TODOS los codigos con prompt de imagen (los que deben tener ejemplo)
codigos = sorted(set(cl.PROMPTS) | set(TEXTOS))
filas = []
for code in codigos:
    if code in TEXTOS and code not in cl.PROMPTS:
        filas.append({'code': code, 'id': ID.get(code, ''), 'carpeta': cl.CODE_FOLDER.get(code, 'xl-dev'),
                      'catalogo': '', 'estado': 'texto'})
        continue
    carpeta = cl.CODE_FOLDER.get(code, 'xl-dev')
    cat = str(cl.SEED_IMAGES.get(code, ''))
    destino = 'assets/%s/%s.jpg' % (subcarpeta(carpeta), code.lstrip('/'))
    f = {'code': code, 'id': ID.get(code, ''), 'carpeta': carpeta, 'catalogo': cat, 'destino': destino}
    if cat.startswith('assets/'):
        f['estado'] = 'assets_ok' if os.path.exists(os.path.join(ASSETS, cat[len('assets/'):])) else 'assets_falta'
    elif cat.startswith('uploads/'):
        f['estado'] = 'por_comprobar'
    else:
        f['estado'] = 'sin_imagen'
    filas.append(f)

# comprobar en el servidor los uploads/ pendientes
pend = [f for f in filas if f['estado'] == 'por_comprobar']
print('comprobando %d uploads/ en el servidor...' % len(pend), flush=True)


def vivo(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + u, method='HEAD'), timeout=30) as r:
            return r.status == 200
    except Exception:
        return False


with ThreadPoolExecutor(max_workers=8) as pool:
    ok = list(pool.map(lambda f: vivo(f['catalogo']), pend))
for f, v in zip(pend, ok):
    f['estado'] = 'copiar' if v else 'generar'

import collections
c = collections.Counter(f['estado'] for f in filas)
print()
for k, v in c.most_common():
    print('  %-14s %4d' % (k, v))
print('  %-14s %4d' % ('TOTAL', len(filas)))

json.dump(filas, open(r'E:\ANTIGRAVITY\tools\trickvault\_plan_imagenes.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print()
print('--- lo que hay que GENERAR (%d) ---' % c['generar'])
for f in [x for x in filas if x['estado'] == 'generar']:
    print('  %-26s %-14s %s' % (f['code'], f['id'], f['carpeta']))
print()
print('--- assets que faltan (%d) ---' % c['assets_falta'])
for f in [x for x in filas if x['estado'] == 'assets_falta'][:40]:
    print('  %-26s %-14s %s' % (f['code'], f['id'], f['catalogo']))
print()
print('guardado tools/trickvault/_plan_imagenes.json')
