import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '2'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
mapa = {t['code']: t['id'] for t in cl.tarjetas_de('xl-letras3d')}
f = os.path.join(T, '_sujetos_xl-letras3d.json')
suj = json.load(open(f, encoding='utf-8'))
ids = set()
for code in ('/nodhead', '/plushtoy'):
    i = mapa[code]; ids.add(i); suj[i] = 'a vintage film camera'
    png = os.path.join(T, 'xl-letras3d_gen', i + '.png')
    if os.path.exists(png): os.remove(png)
    print('  %-12s id=%s' % (code, i))
json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
rc = cl.generar('xl-letras3d', forzar_ids=ids)
if rc == 0: cl.aplicar('xl-letras3d')
