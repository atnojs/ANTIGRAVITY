# -*- coding: utf-8 -*-
"""Lista los prompts de imagen de PROMPT_TEMPLATES y los que no llevan [OBJETO]."""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
html = open(APP, encoding='utf-8').read()
mpt = re.search(r'const PROMPT_TEMPLATES = \{(.*?)\n\};', html, re.S).group(1)
pt = dict(re.findall(r'"(\/[^"]+)":\s*"((?:[^"\\]|\\.)*)"', mpt))
PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";', html, re.S).group(1)

sin = [(c, v) for c, v in pt.items() if '[OBJETO]' not in v]
print(f'total prompts de imagen: {len(pt)}')
print(f'con la parte fija dentro: {sum(1 for v in pt.values() if "apply solely the requested style" in v)}')
print(f'con la coletilla de español: {sum(1 for v in pt.values() if "must be written in Spanish" in v)}')
print(f'SIN [OBJETO]: {len(sin)}')
print()
for c, v in sin:
    print(f'{c}\n    {v}\n')

json.dump(sin, open(r'E:\ANTIGRAVITY\tools\trickvault\_sin_objeto.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
