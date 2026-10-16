# -*- coding: utf-8 -*-
"""
Completa los prompts de «Retro y educativo» que no exigen texto en español.
Regla del proyecto: todo prompt a IA debe exigir que el texto salga en español.
Asi la imagen de ejemplo se genera EXACTAMENTE con el prompt que copia la tarjeta.
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
CLAUSULA = ', all visible text and labels must be written in Spanish with no English words'

CODES = ['/flashcard', '/stickynotes', '/visualizelearning', '/generatehandwritingimage',
         '/infochart', '/infograph', '/venndiagram', '/conceptmap', '/pyramidchart',
         '/cheatsheet', '/cornellnotes', '/sketchnote', '/proscons', '/funnelchart',
         '/fishbone', '/matrix2x2', '/cyclicalprocess', '/anatomicalposter', '/comicstrip',
         '/decisiontree', '/classroom', '/16bit', '/scientificplate', '/analogy']

html = open(APP, encoding='utf-8').read()
tocados = 0
for code in CODES:
    pat = re.compile(r'("' + re.escape(code) + r'":\s*")((?:[^"\\]|\\.)*)(")')
    m = pat.search(html)
    if not m:
        raise SystemExit(f'no encontrado en PROMPT_TEMPLATES: {code}')
    valor = m.group(2)
    if 'must be written in Spanish' in valor:
        print(f'  ya lo tenia: {code}')
        continue
    html = html[:m.start(2)] + valor + CLAUSULA + html[m.end(2):]
    tocados += 1
    print(f'  + español: {code}')

open(APP, 'w', encoding='utf-8', newline='').write(html)
print(f'\nprompts completados: {tocados}/{len(CODES)}')
