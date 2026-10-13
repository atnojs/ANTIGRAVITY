# -*- coding: utf-8 -*-
"""
Prueba real: aplicar TRES codigos de una vez (un solo mensaje) frente a
aplicarlos por separado (tres pasadas encadenadas sobre la imagen anterior).

  1. base  : genera una foto antigua DAMNIFICADA (el "antes").
  2. combi : UNA edicion con los tres textos de las tarjetas concatenados.
  3. sep   : TRES ediciones encadenadas, una por codigo.

Los prompts se leen del propio index.html (es lo que copia el usuario).
Salida en tools/trickvault/_prueba_combinar/.
"""
import base64, json, os, re, sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
OUT = r'E:\ANTIGRAVITY\tools\trickvault\_prueba_combinar'
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2-low'
os.makedirs(OUT, exist_ok=True)

src = open(APP, encoding='utf-8').read()
PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";', src, re.S).group(1)
_i = src.index('const PROMPT_TEMPLATES = {')
_j = src.index('\n};', _i)
PROMPTS = dict(re.findall(r'\n    "(/[^"]+)": "(.*?)",(?=\n)', src[_i:_j] + '\n'))

GRUPO = ['/restaurarfotoantigua', '/preservaridentidadantigua', '/restauracionconservadora']


def texto_tarjeta(code):
    """Lo mismo que copia el usuario desde la tarjeta: /codigo + prompt."""
    cuerpo = PROMPTS[code]
    return cuerpo if cuerpo.strip().startswith(code) else '%s %s' % (code, cuerpo)


def pedir(prompt, imagenes=(), timeout=300):
    payload = {'task': 'generateImage', 'prompt': prompt, 'model': MODELO, 'aspectRatio': '1:1'}
    if imagenes:
        payload['images'] = [{'mimeType': 'image/png', 'data': b} for b in imagenes]
    req = urllib.request.Request(PROXY, data=json.dumps(payload).encode(), method='POST',
                                headers={'Content-Type': 'application/json'})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:300])
    return base64.b64decode(d['image']), time.time() - t0


def guardar(nombre, datos):
    p = os.path.join(OUT, nombre + '.png')
    open(p, 'wb').write(datos)
    print('  guardado %-14s %6d KB' % (nombre, len(datos) // 1024), flush=True)
    return p


BASE_PROMPT = (
    "An old 1940s sepia studio portrait photograph of a young woman seated with a small girl "
    "beside her, printed on aged paper: deep scratches, long cracks across the emulsion, hard "
    "creases, dust spots, mould stains, faded corners and a torn missing corner, uneven yellowed "
    "tonality, authentic vintage print damage, all visible text and labels must be written in "
    "Spanish with no English words"
)

if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 else 'todo'

    if modo in ('todo', 'base'):
        print('1) base (foto antigua danada)...', flush=True)
        img, seg = pedir(BASE_PROMPT)
        guardar('0_base', img)
        print('   %.0fs' % seg)

    if modo in ('todo', 'combi'):
        base = open(os.path.join(OUT, '0_base.png'), 'rb').read()
        combinado = '\n\n'.join(texto_tarjeta(c) for c in GRUPO)
        print('2) los TRES codigos en un solo mensaje (%d chars)...' % len(combinado), flush=True)
        img, seg = pedir(combinado, [base64.b64encode(base).decode()])
        guardar('2_combinado', img)
        print('   1 generacion, %.0fs' % seg)

    if modo in ('todo', 'sep'):
        actual = open(os.path.join(OUT, '0_base.png'), 'rb').read()
        total = 0.0
        for n, code in enumerate(GRUPO, 1):
            print('3.%d) %s (pasada %d)...' % (n, code, n), flush=True)
            img, seg = pedir(texto_tarjeta(code), [base64.b64encode(actual).decode()])
            total += seg
            actual = img
            guardar('1_sep_%d_%s' % (n, code.lstrip('/')), img)
            print('   %.0fs' % seg)
        print('   %d generaciones, %.0fs en total' % (len(GRUPO), total))
