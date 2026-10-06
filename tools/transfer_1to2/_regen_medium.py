# -*- coding: utf-8 -*-
"""
Regenera el panel de RESULTADO (imagen 1 + imagen 2 -> resultado) con un modelo
OpenAI «medium» del proyecto, usando el prompt REAL de cada tarjeta.

Se llama al proxy de Hostinger, que para los modelos `openai-*` usa el bloque
canónico (`/v1/images/edits`) y SÍ envía las dos referencias (campo `image[]`
repetido). El prompt que se manda es exactamente el que copia la tarjeta:
`/codigo` + texto guardado, con [REFERENCIA] -> image 1 y [OBJETO] -> image 2.

Uso:
  python _regen_medium.py [modelo] [codigo ...]
  python _regen_medium.py                       # openai-image-2 y los 5 marcados
  python _regen_medium.py openai-medium
"""
import base64
import json
import os
import re
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
ROOT = r'E:\ANTIGRAVITY\_pruebas_img\transfer_1to2'
REFS = os.path.join(ROOT, 'refs')
MODELO_POR_DEFECTO = 'openai-image-2'  # gpt-image-2, quality medium

# Las 5 tarjetas cuyo resultado marcó Antonio como flojo.
MARCADAS = ['matchpose-1to2', 'transferlight-1to2', 'transferhair-1to2',
            'transferweather-1to2', 'matchexpression-1to2']


def prompt_de_la_app(code):
    """Lee de la app el prompt guardado del código (una sola verdad)."""
    html = open(APP, encoding='utf-8').read()
    m = re.search(r'"/' + re.escape(code) + r'":\s*"((?:[^"\\]|\\.)*)"', html)
    if not m:
        raise SystemExit(f'no encuentro el prompt de /{code} en la app')
    guardado = m.group(1).encode().decode('unicode_escape')
    texto = f'/{code} {guardado}'
    return texto.replace('[REFERENCIA]', 'image 1').replace('[OBJETO]', 'image 2')


def datauri(ruta):
    with open(ruta, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def generar(modelo, prompt, timeout=300):
    payload = json.dumps({
        'task': 'generateImage',
        'model': modelo,
        'prompt': prompt,
        'aspectRatio': '2:3',
        'resolution': 1024,
        'images': [
            {'data': datauri(os.path.join(REFS, 'ref1_donante.png')), 'mimeType': 'image/jpeg'},
            {'data': datauri(os.path.join(REFS, 'ref2_receptora.png')), 'mimeType': 'image/jpeg'},
        ],
    }).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success') or not d.get('image'):
        raise RuntimeError(str(d.get('error') or d)[:300])
    return base64.b64decode(d['image'])


def main():
    args = sys.argv[1:]
    modelo = args[0] if args and args[0].startswith('openai') else MODELO_POR_DEFECTO
    codigos = [a.lstrip('/') for a in args if not a.startswith('openai')] or MARCADAS
    destino_dir = os.path.join(ROOT, 'medium', modelo)
    os.makedirs(destino_dir, exist_ok=True)

    print(f'modelo: {modelo} | códigos: {len(codigos)}')
    t0 = time.time()
    for i, code in enumerate(codigos, 1):
        dst = os.path.join(destino_dir, f'{code}.png')
        if os.path.exists(dst) and os.path.getsize(dst) > 5000:
            print(f'  ({i}/{len(codigos)}) {code:24s} ya hecho')
            continue
        try:
            img = generar(modelo, prompt_de_la_app(code))
            with open(dst, 'wb') as f:
                f.write(img)
            print(f'  ({i}/{len(codigos)}) {code:24s} OK {len(img)//1024} KB ({time.time()-t0:.0f}s)', flush=True)
        except Exception as e:
            print(f'  ({i}/{len(codigos)}) {code:24s} FALLO: {str(e)[:220]}', flush=True)
        time.sleep(1)


if __name__ == '__main__':
    main()
