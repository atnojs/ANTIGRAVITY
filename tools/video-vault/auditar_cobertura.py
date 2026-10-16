# -*- coding: utf-8 -*-
"""Auditoria de cobertura de vídeo: comprueba UNA A UNA (repo y produccion) que
todas las tarjetas del catálogo tienen su vídeo, y que el vídeo responde 200 y es
un mp4 reproducible.

Uso:
    python tools/video-vault/auditar_cobertura.py            # repo (local)
    python tools/video-vault/auditar_cobertura.py --produccion
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\video-vault'
HTML = os.path.join(APP, 'index.html')
SEED = os.path.join(APP, 'video_seed.json')
VIDEOS = os.path.join(APP, 'uploads', 'videos')
BASE = 'https://atnojs.es/apps/video-vault'
PROD = '--produccion' in sys.argv

# c01-c05 viven en video_store.php (subidos por Antonio al servidor).
STORE_IDS = {'c01', 'c02', 'c03', 'c04', 'c05'}


def catalogo():
    src = open(HTML, encoding='utf-8').read()
    i = src.index('const VIDEO_COMMANDS = [')
    j = src.index('const CODE_FOLDER')
    return re.findall(r"\{ id: '([^']+)'", src[i:j])


def estado_prod(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'antigravity-audit'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, int(r.headers.get('Content-Length') or 0)
    except urllib.error.HTTPError as e:
        return e.code, 0
    except Exception:
        return 0, 0


def main():
    ids = catalogo()
    print('catálogo: %d tarjetas' % len(ids))

    if PROD:
        with urllib.request.urlopen(BASE + '/video_seed.json?t=1', timeout=30) as r:
            seed = json.loads(r.read().decode('utf-8'))
        with urllib.request.urlopen(BASE + '/video_store.php?action=list&t=1', timeout=30) as r:
            store = json.loads(r.read().decode('utf-8')).get('videos', {})
        print('seed en producción: %d | video_store: %d' % (len(seed), len(store)))
        faltan, malos = [], []
        for cid in ids:
            url = seed.get(cid) or store.get(cid)
            if not url:
                faltan.append(cid)
                continue
            code, size = estado_prod('%s/%s' % (BASE, url))
            if code != 200 or size < 50_000:
                malos.append('%s (HTTP %s, %s bytes)' % (cid, code, size))
        sin_video = faltan + malos
    else:
        seed = json.load(open(SEED, encoding='utf-8'))
        en_disco = {f[:-4] for f in os.listdir(VIDEOS) if f.endswith('.mp4')}
        print('seed en repo: %d | mp4 en disco: %d' % (len(seed), len(en_disco)))
        sin_video = []
        for cid in ids:
            if cid in STORE_IDS:
                continue
            ruta = seed.get(cid)
            if not ruta:
                sin_video.append('%s (sin entrada en el seed)' % cid)
                continue
            f = os.path.join(VIDEOS, cid + '.mp4')
            if cid not in en_disco or not os.path.isfile(f) or os.path.getsize(f) < 50_000:
                sin_video.append('%s (mp4 ausente o vacío)' % cid)

    print('tarjetas SIN vídeo: %d' % len(sin_video))
    if sin_video:
        print('   ' + ', '.join(sin_video))
    else:
        print('   ninguna — todas las tarjetas tienen su vídeo')
    # Línea estable en ASCII para que los scripts que la parsean no dependan de acentos.
    print('SIN_VIDEO=%d TOTAL=%d' % (len(sin_video), len(ids)))
    return 0 if not sin_video else 2


if __name__ == '__main__':
    sys.exit(main())
