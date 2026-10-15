# -*- coding: utf-8 -*-
"""
Pasa el OCR nativo de Windows por TODAS las imagenes de assets/ y guarda el texto
en _ocr_resultado.tsv. Marca las que parecen tener INGLES.

Uso: _ocr_todas.py [carpeta]
"""
import json, os, re, subprocess, sys, time

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
PS = os.path.join(T, '_ocr.ps1')
SALIDA = os.path.join(T, '_ocr_resultado.tsv')

INGLES = re.compile(r'\b(the|and|with|your|from|this|that|are|was|were|you|our|their|have|been|'
                    r'will|made|best|only|more|free|new|quality|handmade|fresh|natural|pure|'
                    r'strong|light|dark|power|premium|collection|edition|limited|sale|price|'
                    r'shop|buy|now|today|welcome|discover|enjoy|taste|delicious|recipe|'
                    r'ingredients|serving|step|before|after|results|features|benefits|'
                    r'information|details|size|color|style|design|brand|product|offer|'
                    r'discount|guarantee|about|contact|home|menu|search|login|sign|'
                    r'hello|thanks|please|order|free|shipping|delivery|warranty|review|'
                    r'reviews|rating|stars|new|top|hot|best|super|ultra|mega|pro|max)\b',
                    re.IGNORECASE)

filtro = sys.argv[1] if len(sys.argv) > 1 else ''
rutas = []
for raiz, _d, ficheros in os.walk(ASSETS):
    for f in sorted(ficheros):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            p = os.path.join(raiz, f)
            rel = os.path.relpath(p, ASSETS).replace('\\', '/')
            if filtro and not rel.startswith(filtro):
                continue
            rutas.append(p)
print('imagenes a pasar por OCR: %d' % len(rutas), flush=True)

t0 = time.time()
filas = []
LOTE = 120
for i in range(0, len(rutas), LOTE):
    trozo = rutas[i:i + LOTE]
    r = subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS] + trozo,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    for linea in (r.stdout or '').splitlines():
        if '\t' not in linea:
            continue
        nombre, texto = linea.split('\t', 1)
        filas.append((nombre, texto.strip()))
    print('  %d/%d  (%.0fs)' % (min(i + LOTE, len(rutas)), len(rutas), time.time() - t0), flush=True)

with open(SALIDA, 'w', encoding='utf-8') as f:
    for nombre, texto in filas:
        f.write('%s\t%s\n' % (nombre, texto))

sospechosas = [(n, t) for n, t in filas if t and INGLES.search(t)]
print('\nimagenes con OCR: %d | con palabras inglesas: %d' % (len(filas), len(sospechosas)))
for n, t in sospechosas[:20]:
    print('   %-46s %s' % (n[:46], t[:80]))
json.dump([{'f': n, 'texto': t} for n, t in sospechosas],
          open(os.path.join(T, '_ocr_sospechosas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\nescrito', SALIDA)
