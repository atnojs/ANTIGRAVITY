# -*- coding: utf-8 -*-
"""
Prepara los 100 ejemplos que hay que GENERAR:
  1) quita de SEED_COMMAND_IMAGES las entradas muertas (uploads/... que da 404),
     para que la herramienta de carpetas las vea como pendientes;
  2) escribe el sujeto de cada tarjeta en _sujetos_<carpeta>.json (si el prompt
     lleva [OBJETO]) o la pista de ejemplo en _ejemplos_<carpeta>.json (si no),
     SIN pisar las entradas que ya hubiera para otras tarjetas de la carpeta.
"""
import importlib.util, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
T = r'E:\ANTIGRAVITY\tools\trickvault'

spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

# Un solo sujeto por carpeta (el que ya usan sus otras tarjetas)...
SUJETO = {
    'xl-hechomano': 'a red fox',
    'xl-camararetrato': 'a young woman with curly dark hair',
    'xl-casaviajes': 'a white Mediterranean villa with a pool',
    'xl-efectosempaque': 'a glass bottle of artisanal olive oil',
    'xl-estilos': 'an old wooden fishing boat moored in a small Mediterranean harbour',
    'xl-negocioredes': 'ORIGEN, a specialty coffee roaster',
    'xl-ilustracion': 'a friendly retro robot',
    'xl-carteles': 'a red fox',
    'xl-retroedu': 'a vintage typewriter',
    'xl-planos': 'a red vintage sports car',
    'xl-verdentro': 'a mechanical wristwatch',
    'xl-letras3d': 'a vintage film camera',
}
# ...salvo donde el prompt pide una categoria concreta.
EXCEPCIONES = {
    '/babyphoto': 'a smiling baby lying on a soft blanket',
    '/coupleshot': 'a young couple in love',
    '/petphoto': 'a golden retriever puppy',
    '/repairhd': 'an old damaged sepia family photograph with cracks and a torn corner',
    '/fullcolour': 'an old black and white family photograph',
    '/nombrafamoso': 'an excited young fan',
    '/forest': 'a mossy pine forest clearing',
    '/mountains': 'a snowy granite peak range',
    '/interior': 'a bright living room with linen sofas',
    '/workspace': 'a wooden desk with a laptop and a coffee cup',
    '/beach': 'a quiet sandy cove with turquoise water',
    '/cityscape': 'a dense downtown district with glass towers',
    '/nightcity': 'a small late-night ramen stall on a busy corner',
    '/festival': 'a summer street festival',
}

plan = json.load(open(os.path.join(T, '_plan_imagenes.json'), encoding='utf-8'))
gen = [x for x in plan if x['estado'] == 'generar' and x['code'] != '/glassart']
print('tarjetas a generar: %d' % len(gen))

# 1) quitar entradas muertas del catalogo
src = open(APP, encoding='utf-8').read()
quitadas = 0
for x in gen:
    if not x.get('catalogo', '').startswith('uploads/'):
        continue
    pat = re.compile(r"\n[ \t]*'%s':\s*'%s'," % (re.escape(x['code']), re.escape(x['catalogo'])))
    src, n = pat.subn('', src)
    quitadas += n
    if n != 1:
        print('   AVISO: %s -> %d coincidencias' % (x['code'], n))
open(APP, 'w', encoding='utf-8', newline='').write(src)
print('entradas muertas quitadas de SEED_COMMAND_IMAGES: %d' % quitadas)

# 2) sujetos y pistas, sin pisar lo que ya habia
por_carpeta = {}
for x in gen:
    por_carpeta.setdefault(x['carpeta'], []).append(x)

for carpeta, lista in sorted(por_carpeta.items()):
    f_suj = os.path.join(T, '_sujetos_%s.json' % carpeta)
    f_eje = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
    eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
    base = SUJETO.get(carpeta, 'a product on a clean studio background')
    con_obj = sin_obj = 0
    for x in lista:
        s = EXCEPCIONES.get(x['code'], base)
        if '[OBJETO]' in cl.PROMPTS[x['code']]:
            suj[x['id']] = s
            con_obj += 1
        else:
            eje[x['id']] = 'Example: %s.' % s.rstrip('.')
            sin_obj += 1
    json.dump(suj, open(f_suj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(eje, open(f_eje, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('  %-20s %2d tarjetas  (%d con [OBJETO], %d con pista)  sujeto: %s'
          % (carpeta, len(lista), con_obj, sin_obj, base[:60]))
print('listo: ahora _carpeta_lote.py <carpeta> gen  y  aplicar')
