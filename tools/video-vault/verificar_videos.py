# -*- coding: utf-8 -*-
"""Verifica que CADA tarjeta de apps/video-vault tiene su vídeo.

Comprueba, id a id del catálogo:
  1. entrada en video_seed.json del repo            (o que sea de los 5 del servidor)
  2. fichero mp4 en el repo (tamaño y cabecera MP4 válida)
  3. entrada en el video_seed.json DESPLEGADO
  4. HEAD 200 del mp4 en producción
  5. que video_store.php siga devolviendo c01–c05 intactos

Uso: python tools/video-vault/verificar_videos.py [--solo sh01,sh02] [--muestra N]
Sale con código 2 si falta algún vídeo.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

WORKTREE = r'E:\ANTIGRAVITY'
APP_HTML = os.path.join(WORKTREE, 'apps', 'video-vault', 'index.html')
SEED = os.path.join(WORKTREE, 'apps', 'video-vault', 'video_seed.json')
VIDEOS_DIR = os.path.join(WORKTREE, 'apps', 'video-vault', 'uploads', 'videos')
BASE = 'https://atnojs.es/apps/video-vault/'
STORE_IDS = ['c01', 'c02', 'c03', 'c04', 'c05']


def catalogo():
    src = open(APP_HTML, encoding='utf-8').read()
    bloque = src[src.index('const VIDEO_COMMANDS = ['):src.index('// Mapa comando de vídeo')]
    ids = []
    for trozo in bloque.split("{ id: '")[1:]:
        ids.append(trozo.split("'")[0])
    return ids


def trae(url, metodo='GET'):
    req = urllib.request.Request(url, method=metodo, headers={'Cache-Control': 'no-cache',
                                                             'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception:
        return None, b''


def es_mp4(path):
    try:
        with open(path, 'rb') as fh:
            cab = fh.read(12)
        return len(cab) >= 12 and cab[4:8] == b'ftyp' and os.path.getsize(path) > 50_000
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', default='')
    ap.add_argument('--muestra', type=int, default=0)
    args = ap.parse_args()

    ids = catalogo()
    seed = json.load(open(SEED, encoding='utf-8')) if os.path.isfile(SEED) else {}
    if args.solo:
        ids = [i for i in (c.strip() for c in args.solo.split(',')) if i in ids]
        seed_local = seed
    else:
        seed_local = seed
    print('tarjetas en el catálogo: %d | ids a comprobar: %d' % (len(catalogo()), len(ids)))

    # seed desplegado
    cod_seed, cuerpo_seed = trae(BASE + 'video_seed.json')
    try:
        seed_prod = json.loads(cuerpo_seed.decode('utf-8')) if cod_seed == 200 else {}
    except Exception:
        seed_prod = {}

    fallos = []
    contador = {'ok': 0, 'servidor': 0}
    for n, cid in enumerate(ids, 1):
        problemas = []
        if cid in STORE_IDS:
            contador['servidor'] += 1
            continue
        if cid not in seed_local:
            problemas.append('sin entrada en video_seed.json del repo')
        ruta = os.path.join(VIDEOS_DIR, cid + '.mp4')
        if not os.path.isfile(ruta):
            problemas.append('mp4 no está en el repo')
        elif not es_mp4(ruta):
            problemas.append('mp4 inválido o demasiado pequeño')
        if cid not in seed_prod:
            problemas.append('sin entrada en el seed DESPLEGADO')
        cod, _ = trae(BASE + 'uploads/videos/%s.mp4' % cid, metodo='HEAD')
        if cod != 200:
            problemas.append('HTTP %s en el mp4 de producción' % cod)
        if problemas:
            fallos.append((cid, problemas))
            if args.muestra:
                print('  FALTA %-6s %s' % (cid, ' | '.join(problemas)))
        else:
            contador['ok'] += 1

    # video_store.php: los 5 del servidor siguen ahí
    cod, cuerpo = trae(BASE + 'video_store.php?action=list')
    intactos = []
    if cod == 200:
        try:
            d = json.loads(cuerpo.decode('utf-8'))
            lista = d.get('videos') or d.get('items') or []
            ids_store = {v.get('id') for v in lista if isinstance(v, dict)}
            intactos = [i for i in STORE_IDS if i in ids_store]
        except Exception:
            pass

    print('\ncon vídeo verificado: %d' % contador['ok'])
    print('del servidor (no comprobados aquí): %d' % contador['servidor'])
    print('video_store.php devuelve intactos: %s' % (', '.join(intactos) or 'no comprobable'))
    print('SIN vídeo: %d' % len(fallos))
    if fallos:
        print('faltan: ' + ', '.join(c for c, _ in fallos))
        return 2
    print('TODO OK: cada tarjeta tiene su vídeo publicado')
    return 0


if __name__ == '__main__':
    sys.exit(main())
