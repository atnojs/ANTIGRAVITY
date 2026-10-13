# -*- coding: utf-8 -*-
"""
Segunda prueba: los tres codigos de COLOR son ALTERNATIVAS entre si (no suman).
  D1: los tres en un solo mensaje.
  D2: solo /colorizacionnatural.
  D3: los tres encadenados, uno detras de otro.
Parte del resultado ya reparado (2_combinado.png).
"""
import base64, json, os, re, sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
OUT = r'E:\ANTIGRAVITY\tools\trickvault\_prueba_combinar'
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2-low'
os.makedirs(OUT, exist_ok=True)

src = open(APP, encoding='utf-8').read()
_i = src.index('const PROMPT_TEMPLATES = {')
_j = src.index('\n};', _i)
PROMPTS = dict(re.findall(r'\n    "(/[^"]+)": "(.*?)",(?=\n)', src[_i:_j] + '\n'))
GRUPO = ['/colorizarfotoantigua', '/colorizacionnatural', '/coloresdeepoca']


def texto(code):
    cuerpo = PROMPTS[code]
    return cuerpo if cuerpo.strip().startswith(code) else '%s %s' % (code, cuerpo)


def pedir(prompt, b64):
    payload = {'task': 'generateImage', 'prompt': prompt, 'model': MODELO, 'aspectRatio': '1:1',
               'images': [{'mimeType': 'image/png', 'data': b64}]}
    req = urllib.request.Request(PROXY, data=json.dumps(payload).encode(), method='POST',
                                headers={'Content-Type': 'application/json'})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:300])
    return base64.b64decode(d['image']), time.time() - t0


def guardar(n, datos):
    p = os.path.join(OUT, n + '.png')
    open(p, 'wb').write(datos)
    print('  guardado %-22s %6d KB' % (n, len(datos) // 1024), flush=True)


if __name__ == '__main__':
    base = open(os.path.join(OUT, '2_combinado.png'), 'rb').read()
    b64 = base64.b64encode(base).decode()

    print('D1) los TRES codigos de color en un solo mensaje...', flush=True)
    img, seg = pedir('\n\n'.join(texto(c) for c in GRUPO), b64)
    guardar('3_color_lostres_deuna', img); print('   1 generacion, %.0fs' % seg)

    print('D2) solo /colorizacionnatural...', flush=True)
    img, seg = pedir(texto('/colorizacionnatural'), b64)
    guardar('3_color_solo_natural', img); print('   1 generacion, %.0fs' % seg)

    print('D3) los tres encadenados...', flush=True)
    actual, total = base, 0.0
    for n, c in enumerate(GRUPO, 1):
        img, seg = pedir(texto(c), base64.b64encode(actual).decode())
        total += seg; actual = img
        guardar('3_color_sep_%d_%s' % (n, c.lstrip('/')), img)
        print('   %s  %.0fs' % (c, seg))
    print('   %d generaciones, %.0fs' % (len(GRUPO), total))
