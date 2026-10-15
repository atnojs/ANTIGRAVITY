# -*- coding: utf-8 -*-
"""
Lote de la tanda:
  1. xl-luzcamara ENTERA con la chica como sujeto (Antonio: "deja a la chica como
     sujeto principal").
  2. Las 10 imagenes que el OCR detecto con texto en INGLES (8 infografias de
     xl-retroedu + /fastfoodad de comida + /lightingdiagram, que ya cae en el
     punto 1), regeneradas con la coletilla de espanol reforzada.
"""
import importlib.util, json, os, sys, time

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'
os.environ.setdefault('WORKERS', '4')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

MUJER = 'a young woman with curly dark hair'
INGLES_OK = {  # fichero de la imagen con ingles -> (carpeta, codigo)
    'fastfoodad.jpg': ('xl-comidamoda', '/fastfoodad'),
    'decisiontree.jpg': ('xl-retroedu', '/decisiontree'),
    'cornellnotes.jpg': ('xl-retroedu', '/cornellnotes'),
    'cyclicalprocess.jpg': ('xl-retroedu', '/cyclicalprocess'),
    'cheatsheet.jpg': ('xl-retroedu', '/cheatsheet'),
    'fishbone.jpg': ('xl-retroedu', '/fishbone'),
    'matrix2x2.jpg': ('xl-retroedu', '/matrix2x2'),
    'funnelchart.jpg': ('xl-retroedu', '/funnelchart'),
    'pyramidchart.jpg': ('xl-retroedu', '/pyramidchart'),
    'lightingdiagram.jpg': ('xl-luzcamara', '/lightingdiagram'),
}

t0 = time.time()
plan = {}

# 1) xl-luzcamara entera con la chica
plan.setdefault('xl-luzcamara', {'sujeto': MUJER, 'codes': []})['codes'] = [
    t['code'] for t in cl.tarjetas_de('xl-luzcamara')]

# 2) las de ingles, cada una con el sujeto de su carpeta
SUJETOS = {'xl-retroedu': 'a vintage typewriter', 'xl-comidamoda': 'a gourmet chocolate cake',
           'xl-luzcamara': MUJER}
for fichero, (carpeta, code) in INGLES_OK.items():
    e = plan.setdefault(carpeta, {'sujeto': SUJETOS[carpeta], 'codes': []})
    if code not in e['codes']:
        e['codes'].append(code)

for carpeta, datos in plan.items():
    mapa = {t['code']: t['id'] for t in cl.tarjetas_de(carpeta)}
    f_suj = os.path.join(T, '_sujetos_%s.json' % carpeta)
    f_eje = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
    eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
    ids = set()
    for code in datos['codes']:
        i = mapa.get(code)
        if not i:
            print('   SIN ID:', carpeta, code)
            continue
        ids.add(i)
        p = cl.PROMPTS.get(code, '')
        if '[OBJETO]' in p:
            suj[i] = datos['sujeto']
        else:
            eje[i] = 'Example: %s.' % datos['sujeto'].rstrip('.')
        png = os.path.join(T, '%s_gen' % carpeta, i + '.png')
        if os.path.exists(png):
            os.remove(png)
    json.dump(suj, open(f_suj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(eje, open(f_eje, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n===== %s : %d tarjetas | sujeto: %s =====' % (carpeta, len(ids), datos['sujeto'][:50]), flush=True)
    rc = cl.generar(carpeta, forzar_ids=ids)
    print('  generar -> %s (%.0fs)' % (rc, time.time() - t0), flush=True)
    if rc == 0:
        cl.aplicar(carpeta)
print('\nFIN %.0fs' % (time.time() - t0))
