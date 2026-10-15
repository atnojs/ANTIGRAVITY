# -*- coding: utf-8 -*-
"""
Repasa el OCR ya hecho y saca las imagenes con INGLES de verdad.

Dos listas:
  - PALABRAS: solo cuentan si aparecen como palabra completa y no son tambien
    espanol (se excluyen PREMIUM, LOOK, TOP, NATURAL... que se usan en espanol).
  - FRASES: pares tipicos del ingles ("cheat sheet", "step by step"...).
Ademas genera una hoja de contacto para revisarlas a ojo.
"""
import json, os, re, sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
TSV = os.path.join(T, '_ocr_resultado.tsv')
OUT = os.path.join(T, '_revision', 'SUJETOS')
os.makedirs(OUT, exist_ok=True)

EXCLUIDAS = {'premium', 'look', 'top', 'natural', 'super', 'pro', 'max', 'hot', 'new', 'free',
             'light', 'dark', 'power', 'made', 'only', 'more', 'best', 'sale', 'shop', 'home',
             'menu', 'about', 'contact', 'color', 'size', 'style', 'design', 'brand', 'order',
             'rating', 'stars', 'review', 'results', 'information', 'details'}
PALABRAS = ['the', 'and', 'with', 'your', 'from', 'this', 'that', 'are', 'was', 'were', 'you',
            'our', 'their', 'have', 'been', 'will', 'best', 'made', 'quality', 'handmade',
            'fresh', 'pure', 'strong', 'collection', 'edition', 'limited', 'buy', 'now',
            'today', 'welcome', 'discover', 'enjoy', 'taste', 'delicious', 'recipe',
            'ingredients', 'serving', 'step', 'before', 'after', 'features', 'benefits',
            'offer', 'discount', 'guarantee', 'shipping', 'delivery', 'warranty', 'reviews',
            'world', 'war', 'points', 'life', 'cycle', 'stars', 'modern', 'cheat', 'sheet',
            'functions', 'project', 'delays', 'cause', 'effect', 'diagram', 'memory',
            'process', 'tree', 'flowchart', 'choose', 'machine', 'learning', 'sensory',
            'short', 'term', 'working', 'long', 'key', 'questions', 'cues', 'invasion',
            'javascript', 'arrow', 'destructuring', 'nebula', 'birth', 'gravitational',
            'collapse', 'interstellar', 'software', 'people', 'skills', 'gaps', 'flow',
            'chart', 'tips', 'guide', 'how', 'to', 'what', 'why', 'when', 'where', 'which']
FRASES = ['cheat sheet', 'step by step', 'made fresh', 'life cycle', 'world war',
          'cause and effect', 'decision tree', 'human memory', 'short term', 'long term',
          'key turning points', 'arrow functions', 'how to choose', 'machine learning',
          'no compromise', 'order now', 'free shipping']
RX_PAL = re.compile(r'\b(' + '|'.join(PALABRAS) + r')\b', re.IGNORECASE)
RX_FRA = re.compile('|'.join(FRASES), re.IGNORECASE)

filas = []
for linea in open(TSV, encoding='utf-8'):
    if '\t' not in linea:
        continue
    n, t = linea.rstrip('\n').split('\t', 1)
    if not t:
        continue
    palabras = [p for p in RX_PAL.findall(t) if p.lower() not in EXCLUIDAS]
    frases = RX_FRA.findall(t)
    if len(palabras) >= 2 or frases:
        filas.append({'f': n, 'texto': t, 'palabras': sorted(set(p.lower() for p in palabras)),
                      'frases': sorted(set(f.lower() for f in frases))})

print('imagenes con INGLES probable: %d' % len(filas))
porcarpeta = {}
for f in filas:
    c = os.path.relpath(f['f'], ASSETS).replace('\\', '/').split('/')[0]
    porcarpeta.setdefault(c, []).append(f)
for c, l in sorted(porcarpeta.items(), key=lambda x: -len(x[1])):
    print('   %-24s %d' % (c, len(l)))
json.dump(filas, open(os.path.join(T, '_ocr_ingles.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

# hoja de contacto para revisarlas a ojo
TAM, ET, COLS = 210, 16, 8
filas.sort(key=lambda x: x['f'])
for k in range(0, len(filas), 24):
    trozo = filas[k:k + 24]
    alto = (TAM + ET) * ((len(trozo) + COLS - 1) // COLS) + 26
    hoja = Image.new('RGB', (TAM * COLS, alto), (10, 12, 18))
    d = ImageDraw.Draw(hoja)
    d.text((8, 6), 'imagenes con texto en INGLES (%d de %d)  -  revisar y regenerar' % (len(filas), k + len(trozo)), fill=(255, 90, 90))
    for n, f in enumerate(trozo):
        c, r = n % COLS, n // COLS
        x, y = c * TAM, 26 + r * (TAM + ET)
        d.text((x + 3, y + 1), os.path.basename(f['f'])[:26], fill=(255, 190, 60))
        p = f['f']
        if os.path.exists(p):
            try:
                hoja.paste(Image.open(p).convert('RGB').resize((TAM, TAM), Image.LANCZOS), (x, y + ET))
            except Exception:
                pass
    destino = os.path.join(OUT, 'INGLES_%02d.png' % (k // 24))
    hoja.save(destino)
    print('  ', destino)
