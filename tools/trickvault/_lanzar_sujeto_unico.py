# -*- coding: utf-8 -*-
"""Lanza la regeneracion (rehacer) + aplicar de las carpetas del plan de sujeto unico."""
import importlib.util, json, os, sys, time

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
os.environ.setdefault('WORKERS', '4')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

CARPETAS = ['xl-pintura', 'xl-verdentro', 'xl-juegos', 'xl-letras3d',
            'xl-casaviajes', 'xl-estilos', 'xl-hechomano', 'xl-carteles']
t0 = time.time()
for carpeta in CARPETAS:
    f_suj = os.path.join(T, '_sujetos_%s.json' % carpeta)
    f_eje = os.path.join(T, '_ejemplos_%s.json' % carpeta)
    suj = json.load(open(f_suj, encoding='utf-8')) if os.path.exists(f_suj) else {}
    eje = json.load(open(f_eje, encoding='utf-8')) if os.path.exists(f_eje) else {}
    validos = {t['id'] for t in cl.tarjetas_de(carpeta)}
    ids = sorted((set(suj) | set(eje)) & validos)
    print('\n===== %s : %d tarjetas =====' % (carpeta, len(ids)), flush=True)
    if not ids:
        continue
    rc = cl.generar(carpeta, forzar_ids=set(ids))
    print('  generar -> %s (%.0fs)' % (rc, time.time() - t0), flush=True)
    if rc == 0:
        cl.aplicar(carpeta)
print('\nFIN %.0fs' % (time.time() - t0))
