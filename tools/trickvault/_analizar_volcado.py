# -*- coding: utf-8 -*-
"""Analiza el volcado de tarjetas del banco: que ids no cuadran con su codigo,
cuales llevan una imagen que no es la de su codigo, y de donde sale cada cosa."""
import collections, importlib.util, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

# id canonico de cada codigo, segun el catalogo de hoy
ig, ad = cl._lit('INSTAGRAM_COMMANDS'), cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex, cap = cl._lit('EXCEL_COMMANDS'), cl._lit('CAPTURE_COMMANDS')
allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
ID, CODE = {}, {}
for n, (code, _d) in enumerate(allc):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid); CODE.setdefault(cid, code)
for n, (code, _d) in enumerate(ex):
    ID.setdefault(code, 'xl-cmd-%03d' % (n + 1)); CODE.setdefault('xl-cmd-%03d' % (n + 1), code)
for n, (code, _d) in enumerate(cap):
    cid = 'cap-cmd-%03d' % (n + 1)
    if cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid); CODE.setdefault(cid, code)

dom = open(os.path.join(T, '_volcado.html'), encoding='utf-8', errors='replace').read()
m = re.search(r'(?s)<pre id="out">(.*?)</pre>', dom)
txt = (m.group(1).replace('&quot;', '"').replace('&amp;', '&')
       .replace('&lt;', '<').replace('&gt;', '>'))
filas = []
for linea in txt.split('\n'):
    partes = [x.strip() for x in linea.split('|')]
    if len(partes) < 2:
        continue
    while len(partes) < 4:
        partes.append('')
    filas.append({'id': partes[0], 'code': partes[1], 'img': partes[2], 'own': partes[3]})
print('tarjetas en el navegador: %d' % len(filas))

sin_id = [f for f in filas if not f['id']]
print('  sin id: %d' % len(sin_id))
for f in sin_id[:5]:
    print('     code=%-22s img=%s' % (f['code'], f['img']))

# 1) id que NO corresponde al codigo canonico de hoy
desalineadas = [f for f in filas if f['id'] and f['id'] in CODE and CODE[f['id']] != f['code']]
print()
print('TARJETAS cuyo id pertenece hoy a OTRO codigo: %d' % len(desalineadas))
for f in desalineadas[:20]:
    print('   id=%-14s dice=%-22s pero ese id es hoy %-22s  img=%s'
          % (f['id'], f['code'], CODE[f['id']], f['img']))

# 2) tarjetas que ensenan una imagen que no es la de su codigo
mal = []
for f in filas:
    esperada = str(cl.SEED_IMAGES.get(f['code'], ''))
    if not esperada.startswith('assets/'):
        continue
    if f['img'].split('?')[0] != esperada.split('?')[0] and not f['own'] and not f['img'].startswith('data:'):
        mal.append(f)
print()
print('TARJETAS con imagen que no es la de su codigo: %d' % len(mal))
for f in mal[:25]:
    print('   id=%-14s code=%-22s img=%s' % (f['id'], f['code'], f['img']))
print()
print('resumen por id:', dict(collections.Counter(f['id'][:8] for f in mal)))
