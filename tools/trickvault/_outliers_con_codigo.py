# -*- coding: utf-8 -*-
"""Para cada sujeto discrepante, dice QUE CODIGO es la tarjeta y su descripcion."""
import collections, glob, importlib.util, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

# id -> codigo
ig, ad = cl._lit('INSTAGRAM_COMMANDS'), cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex, cap = cl._lit('EXCEL_COMMANDS'), cl._lit('CAPTURE_COMMANDS')
CODE = {}
for n, (code, _d) in enumerate(list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED:
        continue
    CODE.setdefault(cid, code)
for n, (code, _d) in enumerate(ex):
    CODE.setdefault('xl-cmd-%03d' % (n + 1), code)
for n, (code, _d) in enumerate(cap):
    cid = 'cap-cmd-%03d' % (n + 1)
    if cid in cl.REMOVED:
        continue
    CODE.setdefault(cid, code)


def limpia(s):
    return ' '.join(re.sub(r'^Example:\s*', '', str(s)).strip().rstrip('.').split())


for f in sorted(glob.glob(os.path.join(T, '_sujetos_*.json'))):
    carpeta = os.path.basename(f)[len('_sujetos_'):-len('.json')]
    suj = json.load(open(f, encoding='utf-8'))
    f_ej = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    eje = json.load(open(f_ej, encoding='utf-8')) if os.path.exists(f_ej) else {}
    todo = {k: limpia(v) for k, v in suj.items()}
    todo.update({k: limpia(v) for k, v in eje.items()})
    if not todo:
        continue
    mayoria = collections.Counter(todo.values()).most_common(1)[0][0]
    otros = {k: v for k, v in todo.items() if v != mayoria}
    if not otros:
        continue
    print('=== %s   (sujeto de la carpeta: %s)' % (carpeta, mayoria[:55]))
    for k, v in sorted(otros.items()):
        code = CODE.get(k, '(id de otra tanda)')
        print('   %-14s %-20s %s' % (k, code, v[:70]))
    print()
