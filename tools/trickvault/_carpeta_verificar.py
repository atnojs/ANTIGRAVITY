# -*- coding: utf-8 -*-
"""Verifica que cada tarjeta de una carpeta tiene su imagen en el store.
Uso: _carpeta_verificar.py <folder_id>"""
import json, os, sys, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://atnojs.es/apps/trickvault/'
FOLDER = sys.argv[1] if len(sys.argv) > 1 else 'xl-negocioredes'
ROOT = r'E:\ANTIGRAVITY\tools\trickvault'
jobs = json.load(open(rf'{ROOT}\_{FOLDER}_jobs.json', encoding='utf-8'))
tarjetas = json.load(open(rf'{ROOT}\_{FOLDER}.json', encoding='utf-8'))
gen = rf'{ROOT}\{FOLDER}_gen'

req = urllib.request.Request(BASE + 'image_store.php?action=list', headers={'Cache-Control': 'no-cache'})
with urllib.request.urlopen(req, timeout=60) as r:
    store = json.load(r)['images']

regeneradas = {j['id'] for j in jobs if os.path.exists(os.path.join(gen, j['id'] + '.png'))}
print(f'tarjetas en la carpeta: {len(tarjetas)}')
print(f'imagenes generadas con IMAGE 2: {len(regeneradas)}/{len(jobs)}')
print()
ok = sin = 0
sin_imagen = []
for t in sorted(tarjetas, key=lambda x: x['id']):
    rel = store.get(t['id'])
    if rel:
        ok += 1
        marca = 'REGENERADA' if t['id'] in regeneradas else 'anterior  '
    else:
        sin += 1
        sin_imagen.append(t['code'])
        marca = 'SIN IMAGEN'
    print(f"  {marca}  {t['id']:12s} {t['code']:20s} {rel or '-'}")

print(f'\ncon imagen: {ok}/{len(tarjetas)}   sin imagen: {sin}')
if sin_imagen:
    print('SIN IMAGEN:', sin_imagen)
bak = rf'{ROOT}\{FOLDER}_backup'
print(f'backup de imagenes anteriores: {len([f for f in os.listdir(bak) if f.lower().endswith((".jpg",".webp",".png"))])} ficheros')
