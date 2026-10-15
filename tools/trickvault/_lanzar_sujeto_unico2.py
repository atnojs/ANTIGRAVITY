# -*- coding: utf-8 -*-
"""
Relanza SOLO las tarjetas del plan (no todas las del fichero de sujetos), borrando
sus PNG viejos y con FORZAR=1: el guardian avisa de que los PNG existentes no
corresponden al prompt nuevo (llevan el sujeto viejo), que es justo lo que queremos
rehacer. Las que no estan en el plan no se tocan.
"""
import importlib.util, json, os, sys, time

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ['FORZAR'] = '1'
os.environ.setdefault('WORKERS', '4')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

PLAN = {
    'xl-verdentro': ('a mechanical wristwatch',
                     ['/annotated', '/bluecopy', '/blueprint', '/dieline', '/footweartechpack',
                      '/ghostshell', '/handwritten', '/infographic', '/layerpeel', '/moodboard',
                      '/napkinsketch', '/pencilsketch', '/revealparts', '/sidecut', '/skeletalview',
                      '/wireframe2']),
    'xl-letras3d': ('a vintage film camera',
                    ['/blisterpack', '/boxdiorama', '/capsuletoy', '/headswing', '/keychain',
                     '/yarnfigure', '/dioramabox', '/menushot']),
    'xl-casaviajes': ('a white Mediterranean villa with a pool',
                      ['/interior', '/cityscape', '/festival', '/workspace', '/forest', '/beach',
                       '/mountains', '/nightcity']),
    'xl-estilos': ('an old wooden fishing boat moored in a small Mediterranean harbour',
                   ['/cinematiccolor', '/detective', '/disposablecamera', '/hdreal', '/luxury',
                    '/mercury', '/minimalist', '/negativespace', '/partycam', '/pastelcolor',
                    '/vintage', '/vintagecolor']),
    'xl-hechomano': ('a red fox', ['/splashshot', '/flatlay']),
    'xl-carteles': ('a red fox', ['/pixelart']),
}

t0 = time.time()
for carpeta, (sujeto, codes) in PLAN.items():
    mapa = {t['code']: t['id'] for t in cl.tarjetas_de(carpeta)}
    f_suj = os.path.join(T, '_sujetos_%s.json' % carpeta)
    f_eje = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
    eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
    out = os.path.join(T, '%s_gen' % carpeta)
    ids, borrados, sinid = set(), 0, []
    for code in codes:
        i = mapa.get(code)
        if not i:
            sinid.append(code)
            continue
        ids.add(i)
        p = cl.PROMPTS.get(code, '')
        if '[OBJETO]' in p:
            suj[i] = sujeto
        else:
            eje[i] = 'Example: %s.' % sujeto.rstrip('.')
        png = os.path.join(out, i + '.png')
        if os.path.exists(png):
            os.remove(png)
            borrados += 1
    json.dump(suj, open(f_suj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(eje, open(f_eje, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n===== %s : %d tarjetas (PNG borrados %d)%s ====='
          % (carpeta, len(ids), borrados, ('  SIN ID: ' + ','.join(sinid)) if sinid else ''), flush=True)
    if not ids:
        continue
    rc = cl.generar(carpeta, forzar_ids=ids)
    print('  generar -> %s (%.0fs)' % (rc, time.time() - t0), flush=True)
    if rc == 0:
        cl.aplicar(carpeta)
print('\nFIN %.0fs' % (time.time() - t0))
