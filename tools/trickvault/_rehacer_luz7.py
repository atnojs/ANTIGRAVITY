import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '3'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
# sujeto mas detallado para que salga LA MISMA chica en las 6 que derivaban
SUJETO = ('a young woman in her late twenties with long dark brown curly hair, '
          'olive skin and brown eyes')
mapa = {t['code']: t['id'] for t in cl.tarjetas_de('xl-luzcamara')}
f = os.path.join(T, '_sujetos_xl-luzcamara.json')
suj = json.load(open(f, encoding='utf-8'))
ids = set()
for code in ('/highkey', '/anglepack', '/softlighting', '/lowangle', '/tiltshift', '/bts', '/brightflat'):
    i = mapa[code]; ids.add(i); suj[i] = SUJETO
    png = os.path.join(T, 'xl-luzcamara_gen', i + '.png')
    if os.path.exists(png): os.remove(png)
    print('  %-14s id=%s' % (code, i))
json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
rc = cl.generar('xl-luzcamara', forzar_ids=ids)
if rc == 0: cl.aplicar('xl-luzcamara')
