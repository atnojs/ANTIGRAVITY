import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '2'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
# /teardown (ig-dcek-005, xl-carteles -> el zorro) y /4K (ig-dcek-141, xl-estilos -> el barco)
CASOS = [('xl-carteles', 'a red fox', ['ig-dcek-005']),
         ('xl-estilos', 'an old wooden fishing boat moored in a small Mediterranean harbour', ['ig-dcek-141'])]
for carpeta, sujeto, ids in CASOS:
    f = os.path.join(T, '_sujetos_%s.json' % carpeta)
    suj = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}
    for i in ids:
        suj[i] = sujeto
        png = os.path.join(T, '%s_gen' % carpeta, i + '.png')
        if os.path.exists(png):
            os.remove(png)
    json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('==== %s : %s ====' % (carpeta, ', '.join(ids)), flush=True)
    rc = cl.generar(carpeta, forzar_ids=set(ids))
    if rc == 0:
        cl.aplicar(carpeta)
