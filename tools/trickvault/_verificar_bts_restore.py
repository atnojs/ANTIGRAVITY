# -*- coding: utf-8 -*-
"""Verificacion (sin navegador) del cableado de las tarjetas nuevas /bts y /restore.

Comprueba que el index.html las tiene en TODAS las estructuras que hacen falta
(mapa de carpeta, catalogo de captura, prompt, ejemplo y release) y que los JPG
existen, son JPEG validos y miden 1024x1024.

Nota: la comprobacion con Chrome headless no se puede ejecutar en este entorno
(el sandbox bloquea los pipes internos de Chrome), asi que esta es la verificacion
estructural equivalente. Uso: python _verificar_bts_restore.py
"""
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
BASE = r'E:\ANTIGRAVITY\apps\trickvault'

ESPERADO = {
    '/bts': {
        'folder': 'xl-luzcamara',
        'seed': 'assets/luz-camara-personas/bts.jpg',
        'release_key': 'trickvault-luz-camara-personas-images-version',
        'release_prefix': 'assets/luz-camara-personas/',
    },
    '/restore': {
        'folder': 'xl-camararetrato',
        'seed': 'assets/xl-camararetrato/restore.jpg',
        'release_key': 'trickvault-xl-camararetrato-images-version',
        'release_prefix': 'assets/xl-camararetrato/',
    },
}

fallos = []
src = open(APP, encoding='utf-8').read()

for code, exp in ESPERADO.items():
    print(f"\n== {code}")
    # 1) mapa de carpeta
    m = re.search(r"'%s':\s*'([a-z0-9\-]+)'" % re.escape(code), src)
    ok = bool(m) and m.group(1) == exp['folder']
    print(f"   CODE_FOLDER -> {m.group(1) if m else 'NO ENCONTRADO'} {'OK' if ok else 'FALLO'}")
    if not ok:
        fallos.append(f'{code} CODE_FOLDER')

    # 2) catalogo de captura (etiqueta)
    ok = bool(re.search(r"\[\s*'%s'\s*,\s*'[^']+'\s*\]" % re.escape(code), src))
    print(f"   CAPTURE_COMMANDS {'OK' if ok else 'FALLO'}")
    if not ok:
        fallos.append(f'{code} CAPTURE_COMMANDS')

    # 3) prompt (con el prefijo fijo y la coletilla de idioma)
    m = re.search(r'"%s":\s*"([^"]+)"' % re.escape(code), src)
    ok = bool(m) and len(m.group(1)) > 200
    print(f"   PROMPT_TEMPLATES ({len(m.group(1)) if m else 0} chars) {'OK' if ok else 'FALLO'}")
    if not ok:
        fallos.append(f'{code} PROMPT_TEMPLATES')

    # 4) ejemplo en el repositorio
    ok = bool(re.search(r"'%s':\s*'%s'" % (re.escape(code), re.escape(exp['seed'])), src))
    print(f"   SEED_COMMAND_IMAGES {'OK' if ok else 'FALLO'}")
    if not ok:
        fallos.append(f'{code} SEED')

    # 5) release (para rellenar tarjetas ya guardadas)
    m = re.search(re.escape(exp['release_key']) + r"',\s*version:\s*'([^']+)'", src)
    ok = bool(m)
    print(f"   GENERATED_IMAGE_RELEASES version={m.group(1) if m else '?'} {'OK' if ok else 'FALLO'}")
    if not ok:
        fallos.append(f'{code} RELEASE')

    # 6) el fichero existe y es un JPEG 1024x1024
    ruta = os.path.join(BASE, exp['seed'].replace('/', os.sep))
    if not os.path.exists(ruta):
        print(f"   FICHERO {ruta} NO EXISTE")
        fallos.append(f'{code} fichero')
    else:
        from PIL import Image
        with Image.open(ruta) as im:
            ok = im.format == 'JPEG' and im.size == (1024, 1024)
            print(f"   FICHERO {im.format} {im.size[0]}x{im.size[1]} {os.path.getsize(ruta)//1024} KB {'OK' if ok else 'FALLO'}")
            if not ok:
                fallos.append(f'{code} formato')

print('\nRESUMEN:', 'TODO OK' if not fallos else 'REVISAR -> ' + ', '.join(fallos))
sys.exit(1 if fallos else 0)
