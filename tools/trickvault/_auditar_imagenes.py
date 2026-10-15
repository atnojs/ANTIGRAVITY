import importlib.util, json, re, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
spec = importlib.util.spec_from_file_location('cl', r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_lote.py')
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

ig = cl._lit('INSTAGRAM_COMMANDS'); ad = cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex = cl._lit('EXCEL_COMMANDS');     cap = cl._lit('CAPTURE_COMMANDS')
allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
ID, CODE = {}, {}
for n, (code, _d) in enumerate(allc):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED: continue
    ID.setdefault(code, cid); CODE.setdefault(cid, code)
for n, (code, _d) in enumerate(ex):
    ID.setdefault(code, 'xl-cmd-%03d' % (n+1)); CODE.setdefault('xl-cmd-%03d' % (n+1), code)
for n, (code, _d) in enumerate(cap):
    cid = 'cap-cmd-%03d' % (n + 1)
    if cid in cl.REMOVED: continue
    ID.setdefault(code, cid); CODE.setdefault(cid, code)

with urllib.request.urlopen('https://atnojs.es/apps/trickvault/image_store.php?action=list&t=1', timeout=90) as r:
    store = json.load(r)['images']

print('tarjetas de catalogo con codigo:', len(ID))
print('entradas en el almacen         :', len(store))
print()
# clasificar
import collections
casos = collections.Counter()
filas = []
for code, cid in ID.items():
    cat = str(cl.SEED_IMAGES.get(code, ''))
    alm = str(store.get(cid, ''))
    if not alm:
        caso = 'sin almacen'
    elif alm == cat:
        caso = 'iguales'
    elif cat.startswith('assets/'):
        caso = 'catalogo en assets (manda el)'
    elif cat.startswith('uploads/'):
        caso = 'CATALOGO EN UPLOADS (gana el almacen)' if alm != cat else 'iguales'
    else:
        caso = 'sin imagen de catalogo'
    if alm and alm != cat and cat.startswith('assets/') and 'visual-ig-dcek' in alm:
        caso = 'assets en catalogo, almacen con visual-*'
    casos[caso] += 1
    filas.append({'code': code, 'id': cid, 'catalogo': cat, 'almacen': alm, 'caso': caso})
for k, v in casos.most_common():
    print('  %-46s %4d' % (k, v))
print()
for c in ['/neonoir', '/editorial', '/fashion', '/fullcolour', '/3Dbillboard', '/nightcity', '/polaroid']:
    f = next((x for x in filas if x['code'] == c), None)
    print('  %-14s %-14s cat=%-38s alm=%s' % (c, f['id'] if f else '?', (f['catalogo'] if f else '')[:38], f['almacen'] if f else ''))
json.dump(filas, open(r'E:\ANTIGRAVITY\tools\trickvault\_auditoria_imagenes.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print()
print('guardado _auditoria_imagenes.json')
