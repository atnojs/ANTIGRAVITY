# -*- coding: utf-8 -*-
"""Verifica en produccion (atnojs.es) que TODAS las tarjetas del catalogo de
video-vault tienen su vídeo servido con HTTP 200, y que el seed publicado
coincide con el del repo.

Uso:
    python tools/video-vault/verificar_produccion.py            # solo resumen
    python tools/video-vault/verificar_produccion.py --detalle   # lista cada id
"""
import json
import re
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://atnojs.es/apps/video-vault'
HTML = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
SEED_LOCAL = r'E:\ANTIGRAVITY\apps\video-vault\video_seed.json'
DETALLE = '--detalle' in sys.argv


def get(url, metodo='GET', timeout=30):
    req = urllib.request.Request(url, method=metodo, headers={'User-Agent': 'antigravity-verify'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read() if metodo == 'GET' else b''
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception as e:
        return 0, str(e).encode()


def catalogo():
    src = open(HTML, encoding='utf-8').read()
    i = src.index('const VIDEO_COMMANDS = [')
    j = src.index('const CODE_FOLDER')
    return re.findall(r"\{ id: '([^']+)'", src[i:j])


def main():
    ids = catalogo()
    codigo, cuerpo = get(f'{BASE}/video_seed.json?t=1')
    try:
        seed_prod = json.loads(cuerpo.decode('utf-8'))
    except Exception:
        seed_prod = {}
    seed_local = json.load(open(SEED_LOCAL, encoding='utf-8'))
    print('catalogo:', len(ids), 'tarjetas')
    print('seed produccion:', len(seed_prod), '| seed repo:', len(seed_local))

    sin_video = []
    for cid in ids:
        url = seed_prod.get(cid)
        if not url:
            sin_video.append(cid)
            continue
        code, _ = get(f'{BASE}/{url}', metodo='HEAD')
        if code != 200:
            sin_video.append(f'{cid}(HTTP {code})')

    print('tarjetas SIN video en produccion:', len(sin_video))
    if sin_video:
        print('  ', ', '.join(sin_video[:40]))
    faltan_seed = [c for c in seed_local if c not in seed_prod]
    print('en el repo pero sin publicar:', len(faltan_seed), (', '.join(faltan_seed[:20]) if faltan_seed else '-'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
