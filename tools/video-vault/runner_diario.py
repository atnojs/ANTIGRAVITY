# -*- coding: utf-8 -*-
"""Runner diario de vídeos de video-vault: genera hasta --max-videos por tanda
(por defecto 5, que es lo que permiten los 50 puntos diarios de Flow), publica un
commit por vídeo y se detiene en cuanto la cuota se agota. Al final informa del
estado repo/producción.

Pensado para lanzarse desde el Programador de tareas de Windows una vez al día.

Uso:
    python tools/video-vault/runner_diario.py                # hasta 5 vídeos
    python tools/video-vault/runner_diario.py --max-videos 8
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
TOOLS = os.path.join(WORKTREE, 'tools', 'video-vault')
LANZADOR = os.path.join(TOOLS, 'lanzar_lote.ps1')
ORDEN_F = os.path.join(TOOLS, '_orden_prioridad.txt')
LOG = os.path.join(TOOLS, '_runner_diario.log')
PY = sys.executable


def log(msg):
    linea = '[%s] %s' % (time.strftime('%d/%m %H:%M:%S'), msg)
    print(linea, flush=True)
    try:
        with open(LOG, 'a', encoding='utf-8') as fh:
            fh.write(linea + '\n')
    except Exception:
        pass


def run(args, timeout=None):
    return subprocess.run(args, cwd=WORKTREE, capture_output=True, text=True,
                          encoding='utf-8', errors='replace', timeout=timeout)


def pendientes():
    out = run([PY, os.path.join(TOOLS, 'auditar_cobertura.py')])
    for linea in (out.stdout or '').splitlines():
        m = re.match(r'SIN_VIDEO=(\d+)', linea)
        if m:
            return int(m.group(1))
    return -1


def cuota_ok():
    out = run([PY, os.path.join(TOOLS, 'comprobar_cuota_flow.py')])
    return 'CUOTA_OK' in (out.stdout or '')


def seed_size():
    try:
        return len(json.load(open(os.path.join(WORKTREE, 'apps', 'video-vault', 'video_seed.json'), encoding='utf-8')))
    except Exception:
        return -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-videos', type=int, default=5)
    ap.add_argument('--pausa', type=int, default=90, help='segundos entre vídeos')
    ap.add_argument('--esperar-max-min', type=int, default=60,
                    help='si no hay puntos al empezar, reintentar hasta estos minutos')
    args = ap.parse_args()

    log('=== runner diario: hasta %d vídeos ===' % args.max_videos)
    falta_inicial = pendientes()
    log('tarjetas sin vídeo al empezar: %d' % falta_inicial)
    if falta_inicial == 0:
        log('nada pendiente: todas las tarjetas tienen vídeo')
        return 0

    # Los puntos pueden reponerse a lo largo de la ventana: reintentar en vez de
    # abandonar a la primera.
    limite = time.time() + args.esperar_max_min * 60
    while not cuota_ok():
        if time.time() >= limite:
            log('Flow sin puntos tras %d min de espera; se reintentará en la próxima ejecución' % args.esperar_max_min)
            return 3
        log('Flow sin puntos; reintento en 10 min')
        time.sleep(600)
    log('Flow con puntos: empiezo a generar')

    hechos = 0
    orden = ''
    if os.path.isfile(ORDEN_F):
        orden = open(ORDEN_F, encoding='utf-8').read().strip()

    while hechos < args.max_videos:
        antes = seed_size()
        # Limitar la ronda a los vídeos que quedan por hacer hoy.
        restantes = args.max_videos - hechos
        cmd = [PY, os.path.join(TOOLS, 'generar_videos_pendientes.py'), '--limite', str(restantes)]
        if orden:
            cmd += ['--orden', orden]
        log('generando hasta %d vídeo(s)...' % restantes)
        out = run(cmd, timeout=3600)
        log((out.stdout or '').strip().splitlines()[-1] if (out.stdout or '').strip() else 'sin salida')

        despues = seed_size()
        nuevos = max(0, despues - antes)
        hechos += nuevos
        log('vídeos publicados en esta ronda: %d (total hoy: %d)' % (nuevos, hechos))

        if nuevos == 0:
            log('no se ha podido publicar ninguno: cuota agotada o fallo de Flow; fin por hoy')
            break

        falta = pendientes()
        if falta == 0:
            log('COMPLETO: ya no queda ninguna tarjeta sin vídeo')
            break
        if hechos < args.max_videos:
            time.sleep(args.pausa)

    falta_final = pendientes()
    log('=== fin del runner: quedan %d tarjetas sin vídeo ===' % falta_final)

    # Aviso final: estado de producción (informativo, el lote ya fuerza el despliegue).
    try:
        out = run([PY, os.path.join(TOOLS, 'auditar_cobertura.py'), '--produccion'], timeout=900)
        for linea in (out.stdout or '').splitlines():
            if linea.startswith('SIN_VIDEO='):
                log('producción: %s' % linea)
    except Exception as e:
        log('no se pudo auditar producción: %s' % type(e).__name__)

    return 0 if falta_final == 0 else 0


if __name__ == '__main__':
    sys.exit(main())
