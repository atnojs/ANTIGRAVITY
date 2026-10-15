# -*- coding: utf-8 -*-
"""
Detector de INGLES en el texto que el OCR saco de cada imagen.

Criterio: cuenta las palabras-function tipicas del ingles (the, and, of, with,
your, for, from, this, that, are, is, was, were, to, in, on, by, it, as, at, or)
sobre el total de palabras del texto. Un texto con >=12% de esas palabras y al
menos 4 de ellas es ingles (o casi). Tambien marca frases tipicas.
Escribe _ocr_ingles.json con las sospechosas y una hoja de contacto.
"""
import json, os, re, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
OUT = os.path.join(T, '_revision', 'SUJETOS')
os.makedirs(OUT, exist_ok=True)

FUNC = ['the', 'and', 'of', 'with', 'your', 'for', 'from', 'this', 'that', 'are', 'is', 'was',
        'were', 'to', 'in', 'on', 'by', 'it', 'as', 'at', 'or', 'you', 'our', 'their', 'have',
        'has', 'been', 'will', 'not', 'but', 'all', 'can', 'more', 'than', 'each', 'other',
        'into', 'over', 'under', 'between', 'about', 'which', 'when', 'where', 'how', 'what']
FRASES = ['cheat sheet', 'step by step', 'made fresh', 'life cycle', 'world war', 'cause and effect',
          'decision tree', 'human memory', 'key turning points', 'arrow functions', 'how to choose',
          'machine learning', 'no compromise', 'order now', 'free shipping', 'short-term', 'long-term',
          'sensory memory', 'working memory', 'project delays', 'flowchart', 'diagram']
FUNC = FUNC + ['the', 'and', 'with', 'your', 'from', 'this', 'that', 'are', 'was', 'were',
               'you', 'our', 'their', 'have', 'been', 'will', 'best', 'only', 'more', 'free',
               'quality', 'handmade', 'fresh', 'made', 'order', 'shipping', 'delivery',
               'welcome', 'discover', 'enjoy', 'delicious', 'recipe', 'ingredients', 'serving',
               'step', 'before', 'after', 'features', 'benefits', 'offer', 'discount',
               'guarantee', 'world', 'war', 'points', 'life', 'cycle', 'stars', 'modern',
               'cheat', 'sheet', 'functions', 'project', 'delays', 'cause', 'effect', 'diagram',
               'memory', 'process', 'tree', 'flowchart', 'choose', 'machine', 'learning',
               'questions', 'cues', 'javascript', 'arrow', 'how', 'what', 'why', 'when',
               'where', 'which', 'not', 'but', 'all', 'can', 'than', 'each', 'other', 'today',
               'now', 'buy', 'taste', 'warranty', 'reviews', 'review', 'rating', 'secure']
FUERTES = ['the', 'and', 'with', 'your', 'from', 'this', 'that', 'are', 'was', 'were', 'you',
           'our', 'their', 'have', 'been', 'best', 'only', 'free', 'quality', 'handmade',
           'fresh', 'made', 'order', 'shipping', 'delivery', 'welcome', 'discover', 'enjoy',
           'delicious', 'recipe', 'ingredients', 'serving', 'features', 'benefits', 'offer',
           'discount', 'guarantee', 'world', 'war', 'points', 'life', 'cycle', 'stars',
           'modern', 'cheat', 'sheet', 'functions', 'project', 'delays', 'cause', 'effect',
           'diagram', 'memory', 'process', 'tree', 'flowchart', 'choose', 'machine',
           'learning', 'questions', 'cues', 'javascript', 'arrow', 'warranty', 'reviews']
RX_FUNC = re.compile(r'\b(' + '|'.join(FUNC) + r')\b', re.IGNORECASE)
RX_FRA = re.compile('|'.join(FRASES), re.IGNORECASE)

filas = []
for linea in open(os.path.join(T, '_ocr_resultado.tsv'), encoding='utf-8'):
    if '\t' not in linea:
        continue
    ruta, texto = linea.rstrip('\n').split('\t', 1)
    if not texto or 'ERROR' in texto[:8]:
        continue
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+", texto)
    if len(palabras) < 3:
        continue
    funcs = [p.lower() for p in palabras if p.lower() in FUNC]
    ratio = len(funcs) / float(len(palabras))
    frases = RX_FRA.findall(texto)
    fuertes = [p for p in funcs if p in FUERTES]
    if (len(funcs) >= 3 and ratio >= 0.10) or len(frases) >= 2 or len(set(fuertes)) >= 1:
        filas.append({
            'f': ruta,
            'rel': os.path.relpath(ruta, ASSETS).replace('\\', '/'),
            'texto': texto,
            'ratio': round(ratio, 3),
            'funcs': sorted(set(funcs)),
            'frases': sorted(set(f.lower() for f in frases)),
        })

filas.sort(key=lambda x: -x['ratio'])
print('imagenes con texto en INGLES: %d de 1103' % len(filas))
por = {}
for f in filas:
    por.setdefault(f['rel'].split('/')[0], []).append(f)
for c, l in sorted(por.items(), key=lambda x: -len(x[1])):
    print('   %-22s %d' % (c, len(l)))
json.dump(filas, open(os.path.join(T, '_ocr_ingles.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
for f in filas[:14]:
    print('   %-46s ratio=%.2f  %s' % (f['rel'][:46], f['ratio'], f['texto'][:60]))

TAM, ET, COLS = 220, 16, 8
for k in range(0, len(filas), 24):
    trozo = filas[k:k + 24]
    alto = (TAM + ET) * ((len(trozo) + COLS - 1) // COLS) + 26
    hoja = Image.new('RGB', (TAM * COLS, alto), (10, 12, 18))
    d = ImageDraw.Draw(hoja)
    d.text((8, 6), 'texto en INGLES  (%d imagenes)' % len(filas), fill=(255, 90, 90))
    for n, f in enumerate(trozo):
        c, r = n % COLS, n // COLS
        x, y = c * TAM, 26 + r * (TAM + ET)
        d.text((x + 3, y + 1), os.path.basename(f['rel'])[:28], fill=(255, 190, 60))
        if os.path.exists(f['f']):
            try:
                hoja.paste(Image.open(f['f']).convert('RGB').resize((TAM, TAM), Image.LANCZOS), (x, y + ET))
            except Exception:
                pass
    destino = os.path.join(OUT, 'INGLES_%02d.png' % (k // 24))
    hoja.save(destino)
    print('  ', destino)
