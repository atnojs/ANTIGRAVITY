#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""comprobar-token.py — verifica si el servidor ya acepta un token de agente.

Sirve para el paso más delicado de la instalación: después de pegar la línea
`SetEnv UIS_FLOW_AGENT_TOKEN` en el `.htaccess` del servidor, este script dice
si el servidor la ha leído, sin lanzar el agente ni tocar Flow.

Uso:
    python comprobar-token.py            # usa el token de agente.json
    python comprobar-token.py <TOKEN>    # comprueba otro token concreto
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(BASE_DIR, 'agente.json')


def leer_config() -> dict:
    if not os.path.isfile(CONFIG):
        print('Falta agente.json. Copia agente.example.json y rellena "base" y "token".')
        raise SystemExit(2)
    with open(CONFIG, 'r', encoding='utf-8-sig') as fh:
        return json.load(fh)


def main() -> int:
    cfg = leer_config()
    token = (sys.argv[1] if len(sys.argv) > 1 else str(cfg.get('token') or '')).strip()
    base = str(cfg.get('base') or '').strip()
    if not token or token == 'PEGA_AQUI_EL_TOKEN_DEL_AGENTE':
        print('No hay token que comprobar: rellena "token" en agente.json o pásalo como argumento.')
        return 2
    if not base:
        print('Falta "base" en agente.json (la URL del api.php).')
        return 2

    url = base + '?action=agent.heartbeat'
    req = urllib.request.Request(
        url,
        data=b'{}',
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UIS-Agent': token,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        print('HTTP %d: el servidor ACEPTA este token.' % resp.status)
        print('Trabajos pendientes ahora mismo: %s' % data.get('pending', '?'))
        print('Siguiente paso: doble clic en iniciar-agente.bat')
        return 0
    except urllib.error.HTTPError as exc:
        cuerpo = ''
        try:
            cuerpo = exc.read().decode('utf-8', 'replace')[:200]
        except Exception:  # noqa: BLE001
            pass
        if exc.code == 401:
            print('HTTP 401: el servidor NO reconoce este token.')
            print('Revisa en el .htaccess raíz de Hostinger la línea:')
            print('  SetEnv UIS_FLOW_AGENT_TOKEN "<el mismo valor>"')
            print('Y que no sobre espacio antes del cierre de comillas.')
        else:
            print('HTTP %d: %s' % (exc.code, cuerpo))
        return 1
    except urllib.error.URLError as exc:
        print('No se pudo conectar con el servidor: %s' % exc.reason)
        return 1


if __name__ == '__main__':
    sys.exit(main())
