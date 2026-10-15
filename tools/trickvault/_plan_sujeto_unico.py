# -*- coding: utf-8 -*-
"""
PLAN DE SUJETO UNICO POR CARPETA.

Antonio: «hay imagenes en las que has mezclado a dos sujetos (zorro y botella), o
uno o el otro pero no mezclados... dentro de una carpeta todas las imagenes deben
utilizar el mismo sujeto».

Clasificacion hecha a ojo, tarjeta a tarjeta, sobre las tiras de _revision/SUJETOS.
Este script:
  1. escribe el sujeto unico en _sujetos_<carpeta>.json (prompts con [OBJETO]) o
     en _ejemplos_<carpeta>.json (prompts sin [OBJETO]: llevan la pista al principio),
  2. borra los PNG de esas tarjetas para que se regeneren,
  3. deja el resto de la carpeta intacto.
"""
import importlib.util, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

PLAN = {
    'xl-pintura': {
        'sujeto': 'a vase of sunflowers on a wooden table',
        'rehacer': ['/adcreative', '/charcoal', '/claimproof', '/colorpencil', '/comicpanel',
                    '/etching', '/flatvector', '/fresco', '/gouache', '/hookframe', '/impasto',
                    '/inkwash', '/lineart', '/mangapanel', '/markerrender', '/oilpainting',
                    '/pastelchalk', '/pricecard', '/resultchart', '/scratchboard', '/speedpaint',
                    '/stippling', '/sumie', '/testimonialframe', '/uglyad', '/watercolor',
                    '/weartimeline', '/webtoon'],
    },
    'xl-verdentro': {
        'sujeto': 'a mechanical wristwatch',
        'rehacer': ['/annotated', '/bluecopy', '/blueprint', '/dieline', '/footweartechpack',
                    '/ghostshell', '/handwritten', '/infographic', '/layerpeel', '/moodboard',
                    '/napkinsketch', '/pencilsketch', '/revealparts', '/sidecut', '/skeletalview',
                    '/wireframe2'],
    },
    'xl-juegos': {
        'sujeto': 'a brave young adventurer with a sword',
        'rehacer': ['/32x', '/autumn', '/blackfriday', '/bonsai', '/christmas', '/easter',
                    '/floral', '/gta', '/halloween', '/herbarium', '/loadingscreen', '/moss',
                    '/newyear', '/playstation', '/pressedflowers', '/pubg', '/pvp', '/summer',
                    '/terrarium', '/toybox', '/valentine', '/winter', '/zelda'],
    },
    'xl-letras3d': {
        'sujeto': 'a vintage film camera',
        'rehacer': ['/blisterpack', '/boxdiorama', '/capsuletoy', '/headswing', '/keychain',
                    '/modhead', '/plushie', '/toypackaging', '/yarnfigure', '/dioramabox',
                    '/menushot'],
    },
    'xl-casaviajes': {
        'sujeto': 'a white Mediterranean villa with a pool',
        'rehacer': ['/interior', '/cityscape', '/festival', '/workspace', '/forest', '/beach',
                    '/mountains', '/nightcity'],
    },
    'xl-estilos': {
        'sujeto': 'an old wooden fishing boat moored in a small Mediterranean harbour',
        'rehacer': ['/4k', '/cinematiccolor', '/detective', '/disposablecamera', '/hdreal',
                    '/luxury', '/mercury', '/minimalist', '/negativespace', '/partycam',
                    '/pastelcolor', '/vintage', '/vintagecolor'],
    },
    'xl-hechomano': {
        'sujeto': 'a red fox',
        'rehacer': ['/splashshot', '/flatlay', '/jacket'],
    },
    'xl-carteles': {
        'sujeto': 'a red fox',
        'rehacer': ['/pixelart'],
    },
    'xl-camararetrato': {
        'sujeto': 'a young woman with curly dark hair',
        'rehacer': ['/bw', '/abreojos'],
    },
}

total = 0
for carpeta, datos in PLAN.items():
    sujeto = datos['sujeto']
    ids_por_codigo = {t['code']: t['id'] for t in cl.tarjetas_de(carpeta)}
    f_suj = os.path.join(T, '_sujetos_%s.json' % carpeta)
    f_eje = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
    eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
    out = os.path.join(T, '%s_gen' % carpeta)
    hechos, sin_id, borrados = [], [], 0
    for code in datos['rehacer']:
        i = ids_por_codigo.get(code)
        if not i:
            sin_id.append(code)
            continue
        p = cl.PROMPTS.get(code, '')
        if '[OBJETO]' in p:
            suj[i] = sujeto
        else:
            eje[i] = 'Example: %s.' % sujeto.rstrip('.')
        hechos.append(code)
        png = os.path.join(out, i + '.png')
        if os.path.exists(png):
            os.remove(png)
            borrados += 1
    json.dump(suj, open(f_suj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(eje, open(f_eje, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    total += len(hechos)
    print('%-18s sujeto: %-52s rehacer %2d | PNG borrados %2d%s'
          % (carpeta, sujeto[:52], len(hechos), borrados,
             ('   SIN ID: ' + ', '.join(sin_id)) if sin_id else ''))
print('\nTOTAL a regenerar: %d imagenes' % total)
