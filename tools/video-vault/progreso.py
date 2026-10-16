# -*- coding: utf-8 -*-
"""Resumen de progreso del lote de vídeos de video-vault: cuántas tarjetas tienen
ya su mp4 en el repo, cuáles faltan y tamaño de los últimos publicados.

Uso: python tools/video-vault/progreso.py
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault'
HTML = os.path.join(APP, 'index.html')
SEED = os.path.join(APP, 'video_seed.json')
VIDEOS = os.path.join(APP, 'uploads', 'videos')
LOG = r'E:\ANTIGRAVITY\tools\video-vault\_upload_log.json'
STORE = {'c01', 'c02', 'c03', 'c04', 'c05'}   # vídeos alojados en video_store.php

src = open(HTML, encoding='utf-8').read()
i = src.index('const VIDEO_COMMANDS = [')
j = src.index('const CODE_FOLDER')
ids = re.findall(r"\{ id: '([^']+)'", src[i:j])
seed = json.load(open(SEED, encoding='utf-8')) if os.path.isfile(SEED) else {}
log = json.load(open(LOG, encoding='utf-8')) if os.path.isfile(LOG) else {}

en_disco = {f[:-4] for f in os.listdir(VIDEOS) if f.endswith('.mp4')} if os.path.isdir(VIDEOS) else set()
faltan = [c for c in ids if c not in seed and c not in STORE]

print('catálogo: %d tarjetas' % len(ids))
print('con vídeo (seed): %d | en disco: %d | servidor: %d' % (len(seed) + len(STORE), len(en_disco), len(STORE)))
print('publicados en este lote (log): %d' % sum(1 for k, v in log.items() if v == 'subido'))
if faltan:
    print('faltan %d: %s' % (len(faltan), ', '.join(faltan[:30]) + (' ...' if len(faltan) > 30 else '')))
else:
    print('faltan: ninguno — todas las tarjetas tienen vídeo')

ultimos = sorted(en_disco, key=lambda f: os.path.getmtime(os.path.join(VIDEOS, f + '.mp4')))[-5:]
print('últimos mp4 en disco:')
for f in ultimos:
    p = os.path.join(VIDEOS, f + '.mp4')
    print('   %s  %.1f MB  %s' % (f, os.path.getsize(p) / 1e6, __import__('datetime').datetime.fromtimestamp(os.path.getmtime(p)).strftime('%H:%M:%S')))
