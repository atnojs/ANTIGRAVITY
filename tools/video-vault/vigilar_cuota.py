# -*- coding: utf-8 -*-
"""Vigilante de cuota de Google Flow para el lote de video-vault.

Comprueba cada N minutos si Flow vuelve a tener puntos y, en cuanto los tenga,
lanza el lote de generacion (que publica un commit por video y al final audita
repo y produccion). Pensado para dejarlo corriendo sin atencion.

Uso:
    python tools/video-vault/vigilar_cuota.py                 # cada 20 min, indefinido
    python tools/video-vault/vigilar_cuota.py --cada-min 10 --max-horas 12
"""
import argparse
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

WORKTREE = r'E:\ANTIGRAVITY'
LOGF = os.path.join(WORKTREE, 'tools', 'video-vault', '_vigilante_cuota.log')
LANZADOR = os.path.join(WORKTREE, 'tools', 'video-vault', 'lanzar_lote.ps1')


def log(msg):
    linea = '[%s] %s' % (time.strftime('%d/%m %H:%M:%S'), msg)
    print(linea, flush=True)
    with open(LOGF, 'a', encoding='utf-8') as fh:
        fh.write(linea + '\n')


def pendientes():
    """Cuenta tarjetas sin video en el repo usando la linea SIN_VIDEO=."""
    out = subprocess.run([sys.executable, os.path.join(WORKTREE, 'tools', 'video-vault', 'auditar_cobertura.py')],
                         cwd=WORKTREE, capture_output=True, text=True, encoding='utf-8', errors='replace')
    for linea in (out.stdout or '').splitlines():
        if linea.startswith('SIN_VIDEO='):
            return int(linea.split('=')[1].split()[0])
    return -1


def cuota_ok():
    """True si Flow tiene puntos ahora mismo."""
    out = subprocess.run([sys.executable, os.path.join(WORKTREE, 'tools', 'video-vault', 'comprobar_cuota_flow.py')],
                         cwd=WORKTREE, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return 'CUOTA_OK' in (out.stdout or '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cada-min', type=int, default=20)
    ap.add_argument('--max-horas', type=int, default=24)
    args = ap.parse_args()

    inicio = time.time()
    log('vigilante iniciado (cada %d min, maximo %d h)' % (args.cada_min, args.max_horas))

    while (time.time() - inicio) < args.max_horas * 3600:
        falta = pendientes()
        if falta == 0:
            log('nada pendiente: todas las tarjetas tienen video')
            return 0
        log('quedan %d tarjetas sin video' % falta)

        if cuota_ok():
            log('FLOW CON PUNTOS: lanzo el lote')
            subprocess.run(['powershell', '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass',
                            '-File', LANZADOR], cwd=WORKTREE)
            log('el lote ha terminado')
            if pendientes() == 0:
                log('COMPLETO')
                return 0
        else:
            log('Flow sigue sin puntos; reintento en %d min' % args.cada_min)

        time.sleep(args.cada_min * 60)

    log('tope de tiempo alcanzado; el vigilante se detiene')
    return 0


if __name__ == '__main__':
    sys.exit(main())
