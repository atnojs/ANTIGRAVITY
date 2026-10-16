import importlib.util, json, os, sys, time
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'; os.environ.setdefault('WORKERS', '4')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
SUJETO = 'a red fox'
CODES = ['/crosssection', '/knolling', '/magazinecover', '/minime', '/movieposter',
         '/polaroid', '/statue', '/timelineboard', '/monogram', '/yearbook90s']
mapa = {t['code']: t['id'] for t in cl.tarjetas_de('xl-carteles')}
f_suj = os.path.join(T, '_sujetos_xl-carteles.json')
f_eje = os.path.join(T, '_ejemplos_xl-carteles.json')
suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
ids = set()
for code in CODES:
    i = mapa.get(code)
    if not i:
        print('  SIN ID:', code); continue
    ids.add(i)
    p = cl.PROMPTS.get(code, '')
    if '[OBJETO]' in p:
        suj[i] = SUJETO
    else:
        eje[i] = 'Example: %s.' % SUJETO
    png = os.path.join(T, 'xl-carteles_gen', i + '.png')
    if os.path.exists(png): os.remove(png)
    print('  %-16s id=%s  (%s)' % (code, i, '[OBJETO]' if '[OBJETO]' in p else 'pista'))
json.dump(suj, open(f_suj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(eje, open(f_eje, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
t0 = time.time()
rc = cl.generar('xl-carteles', forzar_ids=ids)
print('  generar -> %s (%.0fs)' % (rc, time.time() - t0))
if rc == 0: cl.aplicar('xl-carteles')
