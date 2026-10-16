# -*- coding: utf-8 -*-
"""Vigilante del lote de vídeos de video-vault: comprueba cada minuto si el lote
sigue avanzando (nuevos mp4 en el repo) y, si lleva demasiado tiempo parado sin
haber terminado, lo relanza solo. Pensado para dejar corriendo horas.

Uso: python tools/video-vault/vigilar_lote.py [--parar-tras-min 0]
     --parar-tras-min 0 = no parar nunca (hasta que no queden pendientes)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

WORKTREE = r'E:\ANTIGRAVITY'
APP = os.path.join(WORKTREE, 'apps', 'video-vault')
HTML = os.path.join(APP, 'index.html')
SEED = os.path.join(APP, 'video_seed.json')
VIDEOS = os.path.join(APP, 'uploads', 'videos')
LANZADOR = os.path.join(WORKTREE, 'tools', 'video-vault', 'generar_videos_pendientes.py')
LOG = os.path.join(WORKTREE, 'tools', 'video-vault', '_vigilante.log')
STORE = {'c01', 'c02', 'c03', 'c04', 'c05'}


def log(msg):
    linea = '[%s] %s' % (time.strftime('%H:%M:%S'), msg)
    print(linea, flush=True)
    with open(LOG, 'a', encoding='utf-8') as fh:
        fh.write(linea + '\n')


def pendientes():
    src = open(HTML, encoding='utf-8').read()
    i = src.index('const VIDEO_COMMANDS = [')
    j = src.index('const CODE_FOLDER')
    ids = re.findall(r"\{ id: '([^']+)'", src[i:j])
    seed = json.load(open(SEED, encoding='utf-8')) if os.path.isfile(SEED) else {}
    return [c for c in ids if c not in seed and c not in STORE]


def ultimo_mp4():
    if not os.path.isdir(VIDEOS):
        return 0
    return max((os.path.getmtime(os.path.join(VIDEOS, f)) for f in os.listdir(VIDEOS) if f.endswith('.mp4')), default=0)


def lanzar():
    env = dict(os.environ)
    p = subprocess.Popen([sys.executable, LANZADOR, '--limite', '45'], cwd=WORKTREE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--parar-tras-min', type=int, default=0)
    args = ap.parse_args()

    inicio = time.time()
    proc = lanzar()
    log('lote lanzado (pid %d)' % proc.pid)
    ultimo = ultimo_mp4()

    while True:
        time.sleep(60)
        falta = pendientes()
        ultimo_ahora = ultimo_mp4()

        if not falta:
            log('COMPLETO: todas las tarjetas tienen vídeo')
            return 0

        if ultimo_ahora > ultimo:
            ultimo = ultimo_ahora
            continue

        parado = time.time() - ultimo
        vivo = proc.poll() is None
        log('sin vídeos nuevos desde hace %d min | lote vivo: %s | pendientes: %d'
            % (parado // 60, vivo, len(falta)))

        # Se considera atascado si lleva 7 minutos sin publicar nada (un vídeo
        # tarda ~2,5 min) o si el proceso ya no existe.
        if parado > 7 * 60 or not vivo:
            if vivo:
                proc.kill()
                log('proceso atascado: matado')
            time.sleep(10)
            proc = lanzar()
            ultimo = ultimo_mp4()
            log('lote relanzado (pid %d)' % proc.pid)

        if args.parar_tras_min and (time.time() - inicio) > args.parar_tras_min * 60:
            log('tope de tiempo alcanzado; el vigilante se detiene (el lote sigue)')
            return 0


if __name__ == '__main__':
    sys.exit(main())
