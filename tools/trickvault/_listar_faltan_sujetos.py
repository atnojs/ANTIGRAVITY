# -*- coding: utf-8 -*-
"""Lista, por carpeta, las tarjetas que ahora llevan [OBJETO] y no tienen sujeto."""
import importlib.util, re, sys
sys.stdout.reconfigure(encoding='utf-8')
spec = importlib.util.spec_from_file_location('g', r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_gen.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

for folder in ['xl-retroedu', 'xl-negocioredes', 'xl-casaviajes', 'xl-letras3d']:
    sujetos = g.SUJETOS_POR_CARPETA.get(folder, {})
    import json
    tarjetas = json.load(open(rf'E:\ANTIGRAVITY\tools\trickvault\_{folder}.json', encoding='utf-8'))
    faltan = [t for t in tarjetas if t['prompt'] and '[OBJETO]' in t['prompt']
              and t['id'] not in sujetos]
    print(f'### {folder}: {len(faltan)} sin sujeto')
    for t in faltan:
        # contexto alrededor de [OBJETO]
        m = re.search(r'(.{0,55})\[OBJETO\](.{0,55})', t['prompt'])
        ctx = m.group(0).replace('\n', ' ') if m else t['prompt'][:110]
        print(f"  {t['id']:12s} {t['code']:20s} ...{ctx}...")
    print()
