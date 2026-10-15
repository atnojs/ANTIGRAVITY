import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ['WORKERS'] = '1'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
# /keyloop (xl-letras3d): tenia un llavero con un zorro; su carpeta va con la camara
t = [x for x in cl.tarjetas_de('xl-letras3d') if x['code'] == '/keyloop']
print('tarjeta:', t)
i = t[0]['id']
f = os.path.join(T, '_sujetos_xl-letras3d.json')
suj = json.load(open(f, encoding='utf-8'))
suj[i] = 'a vintage film camera'
json.dump(suj, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
png = os.path.join(T, 'xl-letras3d_gen', i + '.png')
if os.path.exists(png): os.remove(png)
rc = cl.generar('xl-letras3d', forzar_ids={i})
if rc == 0: cl.aplicar('xl-letras3d')
