# -*- coding: utf-8 -*-
"""Muestra los prompts de una carpeta: codigo | [OBJETO]? | cuerpo del prompt.
Uso: _prompts_carpeta.py <carpeta>"""
import importlib.util, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)
carpeta = sys.argv[1]
tarjetas = cl.tarjetas_de(carpeta)
for t in sorted(tarjetas, key=lambda x: x['code']):
    p = cl.PROMPTS.get(t['code'])
    if not p:
        continue
    obj = 'SI' if '[OBJETO]' in p else '--'
    cuerpo = p.replace(cl.PREFIJO, '').strip() if cl.PREFIJO in p else p
    print('%-26s %s  %s' % (t['code'], obj, ' '.join(cuerpo.split())[:150]))
