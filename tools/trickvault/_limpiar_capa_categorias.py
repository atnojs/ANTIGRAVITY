# -*- coding: utf-8 -*-
"""
Limpia los `category` de la capa publicada (catalogo.json).

La capa va POR ID y se publicó desde un navegador con otra numeración, así que una
entrada como `ig-dcek-373: { category: 'xl-negocioredes' }` se aplica hoy sobre la
tarjeta que ocupa ese id (/banner, de «Carteles y materiales») y la saca de su
carpeta. Se comprueba cada entrada contra el catálogo de hoy:

  - si la carpeta publicada NO es la del código que hoy tiene ese id -> se quita el
    `category` (manda el catálogo, que es la regla de la app para lo que no has
    tocado tú a mano);
  - si coincide -> se deja.
"""
import importlib.util, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
APP = r'E:\ANTIGRAVITY\apps\trickvault\catalogo.json'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

ig, ad = cl._lit('INSTAGRAM_COMMANDS'), cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex, cap, reel = cl._lit('EXCEL_COMMANDS'), cl._lit('CAPTURE_COMMANDS'), cl._lit('REEL_COMMANDS')
CODE = {}
for n, (code, _d) in enumerate(list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]):
    CODE.setdefault('ig-dcek-%03d' % (n + 1), code)
for n, (code, _d) in enumerate(ex):
    CODE.setdefault('xl-cmd-%03d' % (n + 1), code)
for n, (code, _d) in enumerate(cap):
    CODE.setdefault('cap-cmd-%03d' % (n + 1), code)
for n, (code, _d) in enumerate(reel):
    CODE.setdefault('reel-cmd-%03d' % (n + 1), code)

j = json.load(open(APP, encoding='utf-8'))
quitados, dejados = [], []
for k, v in j['tarjetas'].items():
    if not isinstance(v, dict) or not v.get('category'):
        continue
    code = CODE.get(k)
    real = cl.CODE_FOLDER.get(code) if code else None
    if real and real != v['category']:
        quitados.append((k, code, v.pop('category'), real))
    else:
        dejados.append((k, code, v['category']))
json.dump(j, open(APP, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('category quitados (id de otra numeracion): %d' % len(quitados))
for k, c, puesta, real in quitados:
    print('   %-16s hoy es %-18s pedia %-16s (real %s)' % (k, c, puesta, real))
print('category respetados: %d' % len(dejados))
for k, c, cat in dejados:
    print('   %-16s %-18s %s' % (k, c, cat))
