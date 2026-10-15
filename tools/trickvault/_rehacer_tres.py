import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '3'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
PLAN = {'xl-carteles': ('a red fox', ['/pixelart']),
        'xl-hechomano': ('a red fox', ['/splashshot', '/flatlay'])}
for carpeta, (sujeto, codes) in PLAN.items():
    mapa = {t['code']: t['id'] for t in cl.tarjetas_de(carpeta)}
    f = os.path.join(T, '_sujetos_%s.json' % carpeta)
    suj = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}
    ids = set()
    for code in codes:
        i = mapa[code]; ids.add(i); suj[i] = sujeto
        png = os.path.join(T, '%s_gen' % carpeta, i + '.png')
        if os.path.exists(png): os.remove(png)
    json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('==== %s : %s ====' % (carpeta, ', '.join(codes)), flush=True)
    rc = cl.generar(carpeta, forzar_ids=ids)
    if rc == 0: cl.aplicar(carpeta)
