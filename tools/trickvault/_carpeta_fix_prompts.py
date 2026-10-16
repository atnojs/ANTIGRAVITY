# -*- coding: utf-8 -*-
"""Completa con la clausula de espanol los prompts de una carpeta que no la tengan.
Uso: _carpeta_fix_prompts.py <folder_id>"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
FOLDER = sys.argv[1] if len(sys.argv) > 1 else 'xl-negocioredes'
CLAUSULA = ', all visible text and labels must be written in Spanish with no English words'

tarjetas = json.load(open(rf'E:\ANTIGRAVITY\tools\trickvault\_{FOLDER}.json', encoding='utf-8'))
codes = [t['code'] for t in tarjetas
         if t['prompt'] and 'must be written in Spanish' not in t['prompt']]
print(f'prompts sin clausula de espanol: {len(codes)}')
for c in codes:
    print('   ', c)

html = open(APP, encoding='utf-8').read()
tocados = []
for code in codes:
    pat = re.compile(r'("' + re.escape(code) + r'":\s*")((?:[^"\\]|\\.)*)(")')
    m = pat.search(html)
    if not m:
        raise SystemExit(f'no encontrado en PROMPT_TEMPLATES: {code}')
    valor = m.group(2)
    if 'must be written in Spanish' in valor:
        continue
    html = html[:m.start(2)] + valor + CLAUSULA + html[m.end(2):]
    tocados.append(code)

open(APP, 'w', encoding='utf-8', newline='').write(html)
print(f'\nprompts completados: {len(tocados)}')
