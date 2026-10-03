# -*- coding: utf-8 -*-
"""Genera los ejemplos que faltan en el catalogo (ids del Excel que nunca se
subieron). Mismo pipeline que _carpeta_gen.py: proxy del proyecto,
modelo openai-image-2 (IMAGE 2 de OpenAI), calidad medium, 1:1.

Uso:  _gen_faltantes.py                 -> genera todas las que falten
      _gen_faltantes.py <id> [<id>...]  -> genera solo esas
"""
import base64, json, os, re, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2'
TOOLS = r'E:\ANTIGRAVITY\tools\trickvault'
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";',
                    open(APP, encoding='utf-8').read(), re.S).group(1)
COLA_ESP = 'must be written in Spanish'

# Sujeto concreto que sustituye a [OBJETO] en cada tarjeta que faltaba.
SUJETOS = {
    # ── Juegos y temporadas ──
    'xl-cmd-247': 'a dinosaur island adventure game',
    'xl-cmd-248': 'a fire dragon',
    'xl-cmd-249': 'a female elven archer',
    'xl-cmd-250': 'a post-apocalyptic city',
    'xl-cmd-251': 'an archipelago kingdom',
    'xl-cmd-252': 'a knight with a sword',
    'xl-cmd-253': 'a dwarf warrior',
    'xl-cmd-254': 'the catacombs under a castle',
    'xl-cmd-255': 'luminous turquoise magic essence',
    'xl-cmd-256': 'elemental fire magic',
    'xl-cmd-257': 'a wolf howling at the moon',
    'xl-cmd-258': 'the guild of explorers',
    'xl-cmd-259': "a herbalist's journey",
    'xl-cmd-260': 'a miniature tropical jungle',
    'xl-cmd-261': 'a wild olive tree',
    'xl-cmd-262': 'a garden rose',
    'xl-cmd-263': 'a field daisy',
    'xl-cmd-264': 'a smooth river stone',
    'xl-cmd-265': 'a fern leaf',
    'xl-cmd-266': 'a wooden toy train',
    'xl-cmd-267': 'a carved pumpkin',
    'xl-cmd-268': 'a heart-shaped box of chocolates',
    'xl-cmd-269': 'a decorated Easter egg',
    'xl-cmd-270': 'a striped beach ball',
    'xl-cmd-271': 'a snow globe',
    'xl-cmd-272': 'a bottle of cava',
    'xl-cmd-273': 'a pair of wireless headphones',
    # ── Tu en otro mundo ──
    'xl-cmd-152': 'a golden retriever',
    'xl-cmd-153': 'a bearded king',
    'xl-cmd-154': 'a young man with short dark hair',
    'xl-cmd-155': 'a bald man with a scar',
    'xl-cmd-156': 'a young explorer',
    'xl-cmd-157': 'an inventor with brass goggles',
    'xl-cmd-158': 'a bearded sea captain',
    'xl-cmd-159': 'a lone sheriff',
    'xl-cmd-160': 'a Roman general',
    'xl-cmd-161': 'a young pharaoh',
    'xl-cmd-162': 'a red-bearded warrior',
    'xl-cmd-163': 'a little forest elf',
    'xl-cmd-164': 'a private detective',
    'xl-cmd-165': 'a teenager with big hair',
    'xl-cmd-166': 'a surprised young man',
    'xl-cmd-167': 'a summer fashion collection',
    'xl-cmd-168': 'a new specialty coffee brand',
    'xl-cmd-169': 'a mountain travel diary',
    'xl-cmd-170': 'a handmade ceramic mug',
    'xl-cmd-171': 'a cat sitting at a desk',
    'xl-cmd-172': 'a marketing expert',
    'xl-cmd-173': 'a pair of running shoes',
    # ── Sueltas de otras carpetas ──
    'xl-cmd-001': 'a creative studio',
    'xl-cmd-002': 'the history of photography',
    'xl-cmd-237': 'the world of coffee',
}

FOLDERS = ['xl-juegos', 'xl-otromundo', 'xl-escenaprueba', 'xl-retroedu']


def copyable_prompt(code, guardado):
    if PREFIJO in guardado:
        return guardado if guardado.strip().startswith(code) else f'{code} {guardado}'
    return f'{code} {PREFIJO} {guardado}'


def build_jobs():
    jobs = []
    for f in FOLDERS:
        p = os.path.join(TOOLS, f'_{f}.json')
        if not os.path.exists(p):
            continue
        for t in json.load(open(p, encoding='utf-8')):
            if t['id'] not in SUJETOS:
                continue
            prompt = copyable_prompt(t['code'], t['prompt'])
            if '[OBJETO]' not in prompt:
                raise SystemExit(f"{t['code']} no lleva [OBJETO]")
            prompt = prompt.replace('[OBJETO]', SUJETOS[t['id']])
            if '[OBJETO]' in prompt:
                raise SystemExit(f"queda [OBJETO] en {t['code']}")
            if PREFIJO not in prompt or COLA_ESP not in prompt:
                raise SystemExit(f"prompt incompleto en {t['code']}")
            jobs.append({'id': t['id'], 'code': t['code'], 'folder': f, 'prompt': prompt})
    return jobs


def generate(prompt, timeout=280):
    payload = json.dumps({'task': 'generateImage', 'prompt': prompt,
                          'model': MODELO, 'aspectRatio': '1:1'}).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:300])
    return base64.b64decode(d['image'])


def main():
    pedidos = set(sys.argv[1:])
    jobs = build_jobs()
    if pedidos:
        jobs = [j for j in jobs if j['id'] in pedidos]
    for j in jobs:
        j['out'] = os.path.join(TOOLS, f"{j['folder']}_gen", j['id'] + '.png')
        os.makedirs(os.path.dirname(j['out']), exist_ok=True)
    pend = [j for j in jobs if not (os.path.exists(j['out']) and os.path.getsize(j['out']) > 5000)]
    print(f'jobs: {len(jobs)} | pendientes: {len(pend)}', flush=True)
    if not pend:
        print('NADA QUE HACER', flush=True)
        return 0
    lock = threading.Lock()
    est = {'ok': 0, 'n': 0}
    err = []
    t0 = time.time()

    def worker(j):
        for intento in range(7):
            try:
                img = generate(j['prompt'])
                open(j['out'], 'wb').write(img)
                with lock:
                    est['ok'] += 1; est['n'] += 1
                    print(f"  [{est['n']}/{len(pend)}] {j['id']} {j['code']:20s} OK "
                          f"{len(img)//1024} KB ({time.time()-t0:.0f}s)", flush=True)
                return
            except Exception as e:
                if intento == 6:
                    with lock:
                        est['n'] += 1; err.append((j['id'], j['code'], repr(e)))
                        print(f"  [{est['n']}/{len(pend)}] {j['id']} {j['code']:20s} FALLO: {e}", flush=True)
                else:
                    espera = min(300, 30 * (2 ** intento)) if getattr(e, 'code', None) == 429 else 12
                    print(f"      ... {j['code']} {e} -> espero {espera}s", flush=True)
                    time.sleep(espera)

    with ThreadPoolExecutor(max_workers=int(os.environ.get('WORKERS', '2'))) as ex:
        list(ex.map(worker, pend))
    print(f"\nGeneradas: {est['ok']}  fallos: {len(err)}  tiempo: {time.time()-t0:.0f}s", flush=True)
    for e in err:
        print('  ERROR', e, flush=True)
    return 0 if not err else 1


if __name__ == '__main__':
    sys.exit(main())
