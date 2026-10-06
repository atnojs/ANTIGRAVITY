# -*- coding: utf-8 -*-
"""
Pruebas reales de los codigos de transferencia "X 1 to 2" (imagen 1 -> imagen 2).

Fases:
  refs    -> genera las 2 imagenes de referencia (donante / receptora)
  A       -> 4 codigos del usuario x 2 estilos de prompt (codigo crudo vs. prompt etiquetado), gemini-3-pro-image
  B       -> 10 codigos nuevos de la familia, prompt etiquetado, gemini-3.1-flash-image
  C       -> 4 codigos del usuario en el modelo por defecto del proyecto (gpt-image-2 low, /images/edits)
  sheets  -> hojas de contacto comparativas

Uso: python _run.py refs|A|B|C|sheets|all
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error, uuid

sys.stdout.reconfigure(encoding='utf-8')

ENV = r'E:\hermes-data\.env'
ROOT = r'E:\ANTIGRAVITY\_pruebas_img\transfer_1to2'
REFS = os.path.join(ROOT, 'refs')
OUT = os.path.join(ROOT, 'out')
RESULTS = os.path.join(ROOT, 'results.json')

OR_URL = 'https://openrouter.ai/api/v1/chat/completions'
MODEL_PRO = 'google/gemini-3-pro-image'
MODEL_FLASH = 'google/gemini-3.1-flash-image'


def env(name):
    with open(ENV, encoding='utf-8', errors='ignore') as f:
        for line in f:
            s = line.strip()
            if s.startswith('#') or '=' not in s:
                continue
            k, _, v = s.partition('=')
            if k.strip() == name:
                return v.strip().strip('"').strip("'")
    return ''


OR_KEY = env('OPENROUTER_API_KEY')
OAI_KEY = env('OPENAI_API_KEY')


def datauri(path):
    ext = os.path.splitext(path)[1].lower().lstrip('.') or 'png'
    if ext == 'jpg':
        ext = 'jpeg'
    with open(path, 'rb') as f:
        return f'data:image/{ext};base64,' + base64.b64encode(f.read()).decode()


def save_b64(b64, path):
    with open(path, 'wb') as f:
        f.write(base64.b64decode(b64))


# ----------------------------------------------------------------- openrouter
def openrouter(model, text, images, timeout=300):
    """Devuelve (b64, coste). images = lista de rutas locales, en orden 1..n."""
    content = [{'type': 'text', 'text': text}]
    for p in images:
        content.append({'type': 'image_url', 'image_url': {'url': datauri(p)}})
    body = json.dumps({
        'model': model,
        'modalities': ['image', 'text'],
        'messages': [{'role': 'user', 'content': content}],
        'max_tokens': 8000,
    }).encode()
    req = urllib.request.Request(OR_URL, data=body, headers={
        'Authorization': f'Bearer {OR_KEY}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'HTTP {e.code}: {e.read().decode()[:300]}')
    if d.get('error'):
        raise RuntimeError(str(d['error'])[:300])
    msg = d['choices'][0]['message']
    imgs = msg.get('images') or []
    if not imgs:
        raise RuntimeError('sin imagen: ' + (msg.get('content') or '')[:200])
    url = imgs[0]['image_url']['url']
    if not url.startswith('data:'):
        raise RuntimeError('imagen en URL, no en base64')
    return url.split(',', 1)[1], float(d.get('usage', {}).get('cost') or 0.0)


# --------------------------------------------------------------- openai edits
def openai_edit(prompt, images, quality='low', size='1024x1024', timeout=300):
    """gpt-image-2 /images/edits con varias imagenes de entrada. Devuelve (b64, 0)."""
    boundary = '----dsh' + uuid.uuid4().hex
    parts = []
    for i, path in enumerate(images):
        ext = os.path.splitext(path)[1].lstrip('.').lower() or 'png'
        mime = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'
        with open(path, 'rb') as f:
            blob = f.read()
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; '
            f'filename="img{i}.{ext}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + blob + b'\r\n')
    for name, value in (('model', 'gpt-image-2'), ('prompt', prompt),
                        ('quality', quality), ('size', size), ('n', '1')):
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    body = b''.join(parts) + f'--{boundary}--\r\n'.encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, headers={
        'Authorization': f'Bearer {OAI_KEY}',
        'Content-Type': f'multipart/form-data; boundary={boundary}'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'HTTP {e.code}: {e.read().decode()[:300]}')
    return d['data'][0]['b64_json'], 0.0


# ------------------------------------------------------------------- prompts
PERSON = ('a 30-year-old woman with shoulder-length dark brown wavy hair, light olive skin, '
          'brown eyes, slim build')

REF1_TXT = (
    f'Editorial reference photograph of {PERSON}. '
    'Her dark brown hair is pulled back into one tight high ponytail. She wears large gold hoop '
    'earrings and black cat-eye sunglasses over her eyes. She stands on a neon-lit Tokyo street '
    'at night in the rain, wearing a bright red tartan plaid trench coat over a black top and '
    'black leather ankle boots. Bold red lipstick. Pose: both hands in the coat pockets, weight '
    'on one leg, chin slightly raised, confident subtle smile. Cinematic neon colour grade, cyan '
    'and magenta light, rain-slick pavement reflections, 35mm environmental shot, shallow depth '
    'of field, photorealistic.')

REF2_TXT = (
    f'Studio reference photograph of the same {PERSON} as in the previous image. '
    'She stands in front of a plain light grey seamless studio backdrop, wearing a plain '
    'heather grey cotton t-shirt and blue jeans, flat white sneakers, no jewellery, no glasses, '
    'bare face with natural skin, hair loose and unstyled. Pose: arms crossed over the chest, '
    'body straight, feet together, neutral serious expression, looking straight at the camera. '
    'Flat even neutral soft daylight, muted neutral colour grade, 50mm lens, clean simple '
    'studio look, photorealistic.')

MEANING = {
    'transferbackground': "replace the background of Image 2 with the background of Image 1",
    'transferoutfit': "dress the woman of Image 2 in the exact outfit of the woman of Image 1 (same garment, colour, pattern and footwear)",
    'colorgrade': "apply the colour grade and tonal palette of Image 1 to Image 2 without changing its content",
    'matchpose': "change the body pose of the woman in Image 2 so it matches exactly the pose of the woman in Image 1",
    'transferlight': "relight Image 2 with the lighting setup, direction and colour of the lighting in Image 1",
    'transferstyle': "apply the visual style, film look and mood of Image 1 to Image 2",
    'transferhair': "give the woman in Image 2 the same hairstyle and hair colour as the woman in Image 1",
    'transfermakeup': "apply the same makeup look of the woman in Image 1 to the face of the woman in Image 2",
    'transferaccessories': "add to the woman in Image 2 the accessories worn by the woman in Image 1 (jewellery and eyewear)",
    'transferscene': "place the woman of Image 2 inside the complete scene and environment of Image 1",
    'transferweather': "add to Image 2 the same weather conditions of Image 1 (rain, wet surfaces, atmosphere)",
    'matchexpression': "change the facial expression of the woman in Image 2 to match the expression of the woman in Image 1",
    'transferpattern': "apply the fabric pattern of the garment in Image 1 to the t-shirt worn in Image 2",
    'matchcamera': "match the camera framing, lens and depth of field of Image 1 in Image 2",
}

CORE = ['transferbackground', 'transferoutfit', 'colorgrade', 'matchpose']
NEW = ['transferlight', 'transferstyle', 'transferhair', 'transfermakeup', 'transferaccessories',
       'transferscene', 'transferweather', 'matchexpression', 'transferpattern', 'matchcamera']

TEMPLATE = (
    'Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).\n'
    'Command: /{code} 1 to 2\n'
    'What the command means: {meaning}.\n'
    'Everything else in Image 2 must stay identical: same woman, same face, same body, same '
    'clothing, same pose, same framing. Change only the transferred attribute, integrate it '
    'photorealistically and match perspective, scale and lighting. '
    'All visible text and labels must be written in Spanish with no English words.')


def prompt_for(code, variant):
    if variant == 'crudo':
        return f'/{code} 1 to 2'
    return TEMPLATE.format(code=code, meaning=MEANING[code])


# ------------------------------------------------- fase D: prompt corregido v2
# Los codigos que en la fase A/B se llevaron por delante la escena o no hicieron
# nada, reescritos con una clausula de aislamiento explicita.
V2 = {
    'colorgrade': ("the global colour grade of Image 1 (contrast, saturation, colour balance and "
                   "the cyan and magenta tint). Apply it to Image 2. Do NOT replace the grey "
                   "studio background of Image 2 and do NOT add any neon sign or street."),
    'transferlight': ("the lighting on the woman of Image 2: neon cyan and magenta rim light "
                      "coming from both sides exactly like in Image 1. Do NOT change the "
                      "background of Image 2."),
    'transferstyle': ("the cinematic film look, contrast, grain and neon mood of Image 1, applied "
                      "to Image 2 while keeping the grey studio background of Image 2."),
    'transferhair': ("her hairstyle: pull the hair of the woman in Image 2 back into one tight "
                     "high ponytail exactly like the woman in Image 1, keeping her own hair colour "
                     "and her own face. Do not change anything else."),
    'matchcamera': ("the framing, lens and depth of field of Image 1: a wider environmental "
                    "composition with the woman smaller in the frame, 35mm perspective and "
                    "shallow depth of field. Keep the grey studio background of Image 2."),
}

V2_TEMPLATE = (
    'Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).\n'
    'Command: /{code} 1 to 2\n'
    'What the command means: transfer {meaning}\n'
    'HARD RULES: keep the background, the setting, the pose, the clothing and every object of '
    'Image 2 exactly as they are. Do not add or remove any element that is not part of the '
    'transfer. Keep the same woman of Image 2: same face, same body, same identity.\n'
    'Integrate the result photorealistically and match perspective, scale and lighting. '
    'All visible text and labels must be written in Spanish with no English words.')


# ----------------------------------------------------------------------- run
def guardar(resultados, path=RESULTS):
    json.dump(resultados, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def cargar():
    return json.load(open(RESULTS, encoding='utf-8')) if os.path.exists(RESULTS) else []


def ejecutar(jobs, resultados, usar_openai=False):
    hecho = {r['id'] for r in resultados if r.get('ok')}
    coste_total = sum(r.get('cost') or 0 for r in resultados)
    for i, j in enumerate(jobs, 1):
        if j['id'] in hecho:
            print(f"  ({i}/{len(jobs)}) {j['id']} ya hecho")
            continue
        dst = os.path.join(OUT, j['id'] + '.png')
        try:
            if usar_openai:
                b64, cost = openai_edit(j['prompt'], j['imgs'])
            else:
                b64, cost = openrouter(j['model'], j['prompt'], j['imgs'])
            save_b64(b64, dst)
            resultados.append({**{k: v for k, v in j.items() if k != 'imgs'}, 'file': dst,
                               'ok': True, 'cost': cost})
            coste_total += cost
            print(f"  ({i}/{len(jobs)}) {j['id']:34s} OK {os.path.getsize(dst)//1024} KB "
                  f"${cost:.4f} | acumulado ${coste_total:.3f}", flush=True)
        except Exception as e:
            resultados.append({**{k: v for k, v in j.items() if k != 'imgs'}, 'file': None,
                               'ok': False, 'error': str(e)[:300], 'cost': 0.0})
            print(f"  ({i}/{len(jobs)}) {j['id']:34s} FALLO: {str(e)[:200]}", flush=True)
        guardar(resultados)
    print(f'COSTE TOTAL: ${coste_total:.4f}')
    return resultados


def main():
    os.makedirs(REFS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    que = sys.argv[1] if len(sys.argv) > 1 else 'all'
    resultados = cargar()

    ref1 = os.path.join(REFS, 'ref1_donante.png')
    ref2 = os.path.join(REFS, 'ref2_receptora.png')

    if que in ('refs', 'all'):
        print('=== REFS ===')
        if not os.path.exists(ref1):
            b64, c = openrouter(MODEL_FLASH, REF1_TXT, [])
            save_b64(b64, ref1); print(f'  ref1 OK ${c:.4f}')
        else:
            print('  ref1 ya existe')
        if not os.path.exists(ref2):
            b64, c = openrouter(MODEL_FLASH, REF2_TXT, [ref1])
            save_b64(b64, ref2); print(f'  ref2 OK ${c:.4f}')
        else:
            print('  ref2 ya existe')

    if not (os.path.exists(ref1) and os.path.exists(ref2)):
        sys.exit('Faltan las referencias; ejecuta primero: python _run.py refs')

    if que in ('A', 'all'):
        print('=== FASE A: semantica de "1 to 2" (gemini-3-pro-image) ===')
        jobs = []
        for code in CORE:
            for variant in ('crudo', 'etiquetado'):
                jobs.append({'id': f'A_{code}_{variant}', 'fase': 'A', 'code': code,
                             'variant': variant, 'model': MODEL_PRO,
                             'prompt': prompt_for(code, variant), 'imgs': [ref1, ref2]})
        resultados = ejecutar(jobs, resultados)

    if que in ('B', 'all'):
        print('=== FASE B: familia nueva de codigos (gemini-3.1-flash-image) ===')
        jobs = [{'id': f'B_{code}_etiquetado', 'fase': 'B', 'code': code, 'variant': 'etiquetado',
                 'model': MODEL_FLASH, 'prompt': prompt_for(code, 'etiquetado'),
                 'imgs': [ref1, ref2]} for code in NEW]
        resultados = ejecutar(jobs, resultados)

    if que in ('C', 'all'):
        print('=== FASE C: modelo por defecto del proyecto (gpt-image-2 low) ===')
        if not OAI_KEY:
            print('  sin OPENAI_API_KEY, se omite')
        else:
            jobs = [{'id': f'C_{code}_etiquetado', 'fase': 'C', 'code': code,
                     'variant': 'etiquetado', 'model': 'openai-image-2-low',
                     'prompt': prompt_for(code, 'etiquetado'), 'imgs': [ref1, ref2]} for code in CORE]
            resultados = ejecutar(jobs, resultados, usar_openai=True)

    if que in ('D', 'all'):
        print('=== FASE D: prompt corregido v2 + comprobacion del orden 1/2 ===')
        jobs = [{'id': f'D_{code}_v2', 'fase': 'D', 'code': code, 'variant': 'v2',
                 'model': MODEL_FLASH, 'prompt': V2_TEMPLATE.format(code=code, meaning=V2[code]),
                 'imgs': [ref1, ref2]} for code in V2]
        # Si "1" y "2" se atan al ORDEN de las imagenes, al invertirlas el fondo
        # transferido debe ser el estudio gris sobre la mujer de la calle.
        jobs.append({'id': 'D_orden_invertido_transferbackground', 'fase': 'D',
                     'code': 'transferbackground', 'variant': 'orden_invertido',
                     'model': MODEL_FLASH, 'prompt': prompt_for('transferbackground', 'etiquetado'),
                     'imgs': [ref2, ref1]})
        resultados = ejecutar(jobs, resultados)

    if que in ('sheets', 'all'):
        import _sheet
        _sheet.construir()


if __name__ == '__main__':
    main()
