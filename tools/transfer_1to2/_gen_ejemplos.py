# -*- coding: utf-8 -*-
"""
Genera la imagen de ejemplo de cada código «1 → 2» de la carpeta xl-transfer1to2.

Modelo: openai-image-2-low (gpt-image-2, quality low) — el que manda la skill del
vault. Se llama al proxy de Hostinger (la clave de OpenAI vive en su entorno), por
eso no hace falta ninguna clave local.

Los códigos necesitan DOS imágenes, así que el ejemplo no puede reproducir la
transferencia: se pide el RESULTADO (el mismo sujeto del estudio con el atributo
ya transferido), que es lo que verá el usuario en la tarjeta.

Uso:
  python _gen_ejemplos.py            # todos los que falten
  python _gen_ejemplos.py <codigo>   # solo uno (sin la barra inicial)
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2-low'
GEN = r'E:\ANTIGRAVITY\tools\transfer_1to2\ejemplos_gen'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets\transfer-1to2'

PREFIJO = ("If the user attaches an image, you must apply only the style to it, ensuring the original "
           "image remains completely unchanged; in other words, you must recreate the user-provided "
           "image and apply solely the requested style.")
COLA = "all visible text and labels must be written in Spanish with no English words"

SUJETO = ("a woman with dark brown wavy hair wearing a plain grey t-shirt and blue jeans, standing in "
          "front of a plain light grey seamless studio backdrop, full body, soft even light, "
          "photorealistic")

# Resultado que ilustra cada transferencia (el atributo de la imagen 1 ya aplicado).
HINTS = {
    'transferoutfit-1to2': SUJETO + ", now wearing a bright red tartan plaid trench coat over her t-shirt "
                           "and black leather ankle boots, the coat fitting naturally with realistic "
                           "fabric folds, everything else in the photo unchanged",
    'colorgrade-1to2': SUJETO + ", graded with a cinematic neon colour grade: deep contrast, cool shadows "
                       "and a cyan and magenta tint over the grey background, same framing and same "
                       "person unchanged",
    'matchpose-1to2': ("the same woman with dark brown wavy hair in a plain grey t-shirt and blue jeans in "
                       "front of the same plain light grey seamless studio backdrop, now in a confident "
                       "pose with both hands in her pockets, weight on one leg and chin slightly raised, "
                       "full body, photorealistic"),
    'transferlight-1to2': SUJETO + ", lit with cyan and magenta neon rim light from both sides over the "
                          "grey background, same pose, same clothing and same framing",
    'transferhair-1to2': SUJETO + ", her dark brown hair pulled back into one tight high ponytail, same "
                         "face, same clothing and same background",
    'transfermakeup-1to2': SUJETO + " wearing bold red lipstick and a subtle smoky eye makeup, same face, "
                           "same hair, same clothing and same background",
    'transferaccessories-1to2': SUJETO + " wearing large gold hoop earrings and black cat-eye sunglasses, "
                                "same clothing and same background",
    'transferscene-1to2': ("the same woman with dark brown wavy hair in a plain grey t-shirt and blue jeans, "
                           "now standing in a neon-lit Tokyo street at night in the rain, wet pavement with "
                           "neon reflections, cyan and magenta lights, seamless integration with matched "
                           "perspective and shadows, photorealistic"),
    'transferweather-1to2': SUJETO + ", now under heavy rain: raindrops in the air, damp hair and wet "
                            "clothing, wet floor with reflections, same pose and same grey background",
    'matchexpression-1to2': SUJETO + " with a confident subtle smile and her chin slightly raised, same "
                            "face, hair, clothing and background",
    'transferpattern-1to2': SUJETO + ", her t-shirt now printed with a bright red tartan plaid pattern "
                            "adapted to the folds of the fabric, same jeans and same background",
}


def prompt(code):
    return f'{PREFIJO} Subject: {HINTS[code]}. {COLA}'


def generar(texto, timeout=280):
    payload = json.dumps({'task': 'generateImage', 'prompt': texto,
                          'model': MODELO, 'aspectRatio': '1:1'}).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:200])
    return base64.b64decode(d['image'])


def main():
    os.makedirs(GEN, exist_ok=True)
    os.makedirs(ASSETS, exist_ok=True)
    from PIL import Image

    pedido = sys.argv[1] if len(sys.argv) > 1 else ''
    codigos = [c for c in HINTS if not pedido or c.startswith(pedido.lstrip('/'))]
    if not codigos:
        sys.exit(f'código desconocido: {pedido}')

    t0 = time.time()
    fallos = []
    for i, code in enumerate(codigos, 1):
        destino = os.path.join(ASSETS, f'{code}.jpg')
        if os.path.exists(destino) and os.path.getsize(destino) > 5000:
            print(f'  ({i}/{len(codigos)}) {code:26s} ya hecho')
            continue
        png = os.path.join(GEN, f'{code}.png')
        try:
            if not (os.path.exists(png) and os.path.getsize(png) > 5000):
                with open(png, 'wb') as f:
                    f.write(generar(prompt(code)))
            # 1024x1024 en jpg, como el resto de ejemplos del vault.
            with Image.open(png) as im:
                im = im.convert('RGB').resize((1024, 1024), Image.LANCZOS)
                im.save(destino, quality=85, optimize=True)
            print(f'  ({i}/{len(codigos)}) {code:26s} OK {os.path.getsize(destino)//1024} KB '
                  f'({time.time()-t0:.0f}s)', flush=True)
        except Exception as e:
            fallos.append((code, str(e)[:200]))
            print(f'  ({i}/{len(codigos)}) {code:26s} FALLO: {str(e)[:200]}', flush=True)
        time.sleep(1)

    print(f'\nhechos: {len(codigos)-len(fallos)}  fallos: {len(fallos)}  tiempo: {time.time()-t0:.0f}s')
    if fallos:
        print('ERRORES:', fallos)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
