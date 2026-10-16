# -*- coding: utf-8 -*-
"""Añade al guion de Flow (videovault_catalogo.json) los jobs de las tarjetas de
video-vault que aún no tienen vídeo. Lee id + prompt del catálogo de la app y
excluye los que ya están cubiertos (seed en git, video_store.php y el propio guion).

Uso: python preparar_catalogo_videovault.py [--dry]
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
SEED = r'E:\ANTIGRAVITY\apps\video-vault\video_seed.json'
GUION = r'E:\herramientas\google-flow\videovault_catalogo.json'
DRY = '--dry' in sys.argv

# Los 5 ids con vídeo subido al servidor (video_store.php): NO se regeneran.
STORE_IDS = {'c01', 'c02', 'c03', 'c04', 'c05'}

src = open(APP, encoding='utf-8').read()
bloque = src[src.index('const VIDEO_COMMANDS = ['):src.index('// Mapa comando de vídeo')]

entradas = {}
for trozo in bloque.split("{ id: '")[1:]:
    cid = trozo.split("'")[0]
    m = re.search(r'prompt:\s*(".*?"|\'.*?\')', trozo, re.S)
    if not m:
        continue
    prompt = m.group(1)[1:-1]
    entradas[cid] = prompt

print('comandos leídos de la app:', len(entradas))

seed = json.load(open(SEED, encoding='utf-8')) if os.path.isfile(SEED) else {}
guion = json.load(open(GUION, encoding='utf-8'))
ya = set(seed) | STORE_IDS | {j['name'] for j in guion['jobs']}
print('ya cubiertos (seed + servidor + guion):', len(ya))

nuevos = [{'type': 'video', 'name': cid, 'prompt': p}
          for cid, p in entradas.items() if cid not in ya and p]
print('jobs nuevos a añadir:', len(nuevos))
print('  ids:', ', '.join(j['name'] for j in nuevos))

if DRY:
    print('DRY: no se escribe')
    sys.exit(0)

if nuevos:
    guion['jobs'].extend(nuevos)
    with open(GUION, 'w', encoding='utf-8') as fh:
        json.dump(guion, fh, ensure_ascii=False, indent=2)
    print(f'OK: el guion tiene ahora {len(guion["jobs"])} jobs')
