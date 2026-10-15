import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '1'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
mapa = {t['code']: t['id'] for t in cl.tarjetas_de('xl-carteles')}
i = mapa['/pixelart']
f = os.path.join(T, '_sujetos_xl-carteles.json')
suj = json.load(open(f, encoding='utf-8'))
suj[i] = 'a red fox'
json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
png = os.path.join(T, 'xl-carteles_gen', i + '.png')
if os.path.exists(png): os.remove(png)
print('  /pixelart id=%s' % i)
rc = cl.generar('xl-carteles', forzar_ids={i})
if rc == 0: cl.aplicar('xl-carteles')
