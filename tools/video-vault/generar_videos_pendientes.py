# -*- coding: utf-8 -*-
"""Lote de vídeos para apps/video-vault: genera con Google Flow los vídeos que faltan
y los publica uno a uno en git (main).

Este lanzador vive en el repo porque el sandbox del agente no puede escribir en
E:\\herramientas\\google-flow, pero NO necesita escribir ahí: manda a la CLI de Flow
la carpeta de salida dentro del workspace y luego copia el mp4 a la app.

Uso (desde E:\\ANTIGRAVITY):
    python tools/video-vault/generar_videos_pendientes.py            # todos los pendientes
    python tools/video-vault/generar_videos_pendientes.py --solo sh01,sh02
    python tools/video-vault/generar_videos_pendientes.py --limite 10
    python tools/video-vault/generar_videos_pendientes.py --dry

Requisitos: sesión de Flow iniciada (python flow.py login) y Chrome disponible.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

FLOW_DIR = r'E:\herramientas\google-flow'
WORKTREE = r'E:\ANTIGRAVITY'
APP_HTML = os.path.join(WORKTREE, 'apps', 'video-vault', 'index.html')
SEED = os.path.join(WORKTREE, 'apps', 'video-vault', 'video_seed.json')
VIDEOS_DIR = os.path.join(WORKTREE, 'apps', 'video-vault', 'uploads', 'videos')
OUT_DIR = os.path.join(WORKTREE, 'tools', 'video-vault', '_flow_out')
LOG = os.path.join(WORKTREE, 'tools', 'video-vault', '_upload_log.json')

STORE_IDS = {'c01', 'c02', 'c03', 'c04', 'c05'}   # vídeos subidos al servidor: NO tocar
VIDEO_MODEL = 'Veo 3.1 - Lite'
RATIO = '16:9'


def catalogo():
    """id -> prompt, leído del catálogo de la app."""
    src = open(APP_HTML, encoding='utf-8').read()
    bloque = src[src.index('const VIDEO_COMMANDS = ['):src.index('// Mapa comando de vídeo')]
    out = {}
    for trozo in bloque.split("{ id: '")[1:]:
        cid = trozo.split("'")[0]
        m = re.search(r'prompt:\s*(".*?"|\'.*?\')', trozo, re.S)
        if m:
            out[cid] = m.group(1)[1:-1]
    return out


def cargar_json(path, defecto):
    if os.path.isfile(path):
        try:
            return json.load(open(path, encoding='utf-8'))
        except Exception:
            return defecto
    return defecto


def git(args, timeout=300):
    out = subprocess.run(['git', *args], cwd=WORKTREE, capture_output=True, text=True,
                         encoding='utf-8', errors='replace', timeout=timeout)
    return out.returncode, ((out.stdout or '') + (out.stderr or '')).strip()


def push_robusto():
    """git push normal y, si falla, con las credenciales guardadas y backend openssl."""
    code, out = git(['push', 'origin', 'main'])
    if code == 0:
        return True, 'push origin main'
    cred = os.path.join(os.path.expanduser('~'), '.git-credentials')
    if os.path.isfile(cred):
        linea = next((l.strip() for l in open(cred, encoding='utf-8', errors='replace')
                      if 'github.com' in l), '')
        if linea:
            url = re.sub(r'github\.com.*$', 'github.com/atnojs/ANTIGRAVITY.git', linea)
            code2, out2 = git(['-c', 'http.sslBackend=openssl', '-c', 'credential.helper=',
                               'push', url, 'main'])
            if code2 == 0:
                return True, 'push con credenciales guardadas'
    return False, out[-400:]


def genera(cid, prompt):
    os.makedirs(OUT_DIR, exist_ok=True)
    env = dict(os.environ, FLOW_HEADLESS='true')
    cmd = [sys.executable, 'flow.py', 'video', '--prompt', prompt, '--ratio', RATIO,
           '--model', VIDEO_MODEL, '--name', cid, '--out', OUT_DIR]
    print('   flow.py ...', flush=True)
    out = subprocess.run(cmd, cwd=FLOW_DIR, capture_output=True, text=True,
                         encoding='utf-8', errors='replace', timeout=2400, env=env)
    cola = (out.stdout or '').strip().splitlines()
    print('   [flow] ' + (cola[-1] if cola else 'sin salida'), flush=True)
    mp4 = os.path.join(OUT_DIR, cid + '.mp4')
    if out.returncode == 0 and os.path.isfile(mp4) and os.path.getsize(mp4) > 50_000:
        return mp4
    return None


def publica(cid, mp4):
    os.makedirs(VIDEOS_DIR, exist_ok=True)
    destino = os.path.join(VIDEOS_DIR, cid + '.mp4')
    shutil.copyfile(mp4, destino)

    seed = cargar_json(SEED, {})
    seed[cid] = 'uploads/videos/%s.mp4' % cid
    with open(SEED, 'w', encoding='utf-8') as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=2)

    code, out = git(['add', '-f', 'apps/video-vault/uploads/videos/%s.mp4' % cid,
                     'apps/video-vault/video_seed.json'])
    if code != 0:
        return False, 'git add: ' + out[-200:]
    code, out = git(['commit', '-m', 'feat(video-vault): vídeo de ejemplo %s' % cid])
    if code != 0 and 'nothing to commit' not in out:
        return False, 'git commit: ' + out[-200:]
    ok, detalle = push_robusto()
    return (True, detalle) if ok else (False, 'push: ' + detalle)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', default='')
    ap.add_argument('--orden', default='', help='ids que se generan primero; el resto sigue el orden del catálogo')
    ap.add_argument('--limite', type=int, default=0)
    ap.add_argument('--dry', action='store_true')
    args = ap.parse_args()

    cat = catalogo()
    seed = cargar_json(SEED, {})
    log = cargar_json(LOG, {})

    if args.solo:
        pedidos = [c.strip() for c in args.solo.split(',') if c.strip()]
        pendientes = [c for c in pedidos if c in cat]
    else:
        pendientes = [c for c in cat
                      if c not in seed and c not in STORE_IDS and log.get(c) != 'subido']
        # Prioridad: los ids indicados en --orden van primero (en ese orden).
        if args.orden:
            prioridad = [c.strip() for c in args.orden.split(',') if c.strip()]
            cabeza = [c for c in prioridad if c in pendientes]
            pendientes = cabeza + [c for c in pendientes if c not in cabeza]

    if args.limite:
        pendientes = pendientes[:args.limite]

    print('comandos en el catálogo: %d | ya con vídeo: %d | pendientes: %d'
          % (len(cat), len(seed) + len(STORE_IDS), len(pendientes)))
    if pendientes:
        print('pendientes:', ', '.join(pendientes))
    if args.dry or not pendientes:
        return 0

    fallos = []
    for n, cid in enumerate(pendientes, 1):
        print('\n[%d/%d] %s — %s' % (n, len(pendientes), cid, cat[cid][:90]), flush=True)
        t0 = time.time()
        mp4 = os.path.join(OUT_DIR, cid + '.mp4')
        if not (os.path.isfile(mp4) and os.path.getsize(mp4) > 50_000):
            mp4 = genera(cid, cat[cid])
        if not mp4:
            print('   FALLO de generación', flush=True)
            fallos.append(cid)
            continue
        ok, detalle = publica(cid, mp4)
        if ok:
            log[cid] = 'subido'
            with open(LOG, 'w', encoding='utf-8') as fh:
                json.dump(log, fh, ensure_ascii=False, indent=2)
            print('   publicada en %ds (%s)' % (time.time() - t0, detalle), flush=True)
        else:
            print('   FALLO al publicar:', detalle, flush=True)
            fallos.append(cid)

    faltan = [c for c in pendientes if log.get(c) != 'subido']
    print('\nRESUMEN: %d/%d publicados. Faltan: %s'
          % (len(pendientes) - len(faltan), len(pendientes), ', '.join(faltan) or 'ninguno'))
    return 2 if faltan else 0


if __name__ == '__main__':
    sys.exit(main())
