# -*- coding: utf-8 -*-
"""
Genera la imagen de ejemplo de cada tarjeta de «Retro y educativo» usando
EXACTAMENTE el prompt de esa tarjeta, sustituyendo [OBJETO] por un sujeto
concreto y coherente con su descripción.

- Salida: tools/trickvault/retroedu_gen/<id>.png  (se salta las ya hechas)
- Proxy: https://atnojs.es/apps/crear_historias/proxy.php
- Modelo: openai-image-2  ->  gpt-image-2 (IMAGE 2 de OpenAI), calidad medium.
"""
import base64, json, os, sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2'   # IMAGE 2 de OpenAI (gpt-image-2, quality medium)
OUT = r'E:\ANTIGRAVITY\tools\trickvault\retroedu_gen'
JOBS_FILE = r'E:\ANTIGRAVITY\tools\trickvault\_retroedu_jobs.json'

# id -> sujeto concreto que sustituye a [OBJETO] en EL PROMPT DE ESA TARJETA
SUJETOS = {
    # --- didácticas / infografías ---
    'ig-dcek-137': 'the water cycle',
    'ig-dcek-139': 'a product launch plan',
    'ig-dcek-156': 'how photosynthesis works',
    'ig-dcek-157': 'the French Revolution',
    'ig-dcek-158': 'global coffee consumption',
    'ig-dcek-159': 'the anatomy of a honeybee',
    'ig-dcek-162': 'cats and dogs',
    'ig-dcek-163': 'the branches of biology',
    'ig-dcek-164': "Maslow's hierarchy of needs",
    'ig-dcek-165': 'Spanish verb tenses',
    'ig-dcek-166': 'the causes of the First World War',
    'ig-dcek-167': 'how to give a good presentation',
    'ig-dcek-168': 'remote work versus office work',
    'ig-dcek-169': 'an online sales funnel',
    'ig-dcek-170': 'why a bakery order arrived late',
    'ig-dcek-171': 'task urgency and importance',
    'ig-dcek-172': 'a butterfly',
    'ig-dcek-173': 'the human skeleton',
    'ig-dcek-174': 'the scientific method',
    'ig-dcek-175': 'choosing a university degree',
    'ig-dcek-589': 'the solar system',
    'xl-cmd-233': 'a bicycle gear system',
    'xl-cmd-234': 'the human eye',
    'xl-cmd-235': 'printed books',
    'xl-cmd-236': 'the four seasons',
    'xl-cmd-237': 'the world of coffee',
    'xl-cmd-238': 'a stag beetle',
    'xl-cmd-239': 'a wild red poppy',
    'xl-cmd-240': 'the island of Mallorca',
    'xl-cmd-241': 'a pirate island in the Caribbean',
    'xl-cmd-242': 'the history of the printing press',
    'xl-cmd-243': 'human memory',
    'xl-cmd-244': 'the planets of the solar system',
    'xl-cmd-245': 'the history of space exploration',
    'xl-cmd-246': 'mythical creatures',
    # --- retro ---
    'xl-cmd-222': 'a knight with a sword',
    'xl-cmd-223': 'a household accounts spreadsheet',
    'xl-cmd-224': 'a 1950s seaside souvenir',
    'xl-cmd-225': 'a vintage tea brand',
    'xl-cmd-226': 'a classic barber shop',
    'xl-cmd-227': 'the space race',
    'xl-cmd-228': 'summer holidays',
    'xl-cmd-229': 'a range of kitchen appliances',
    'xl-cmd-230': 'a mountain hiking club',
    'xl-cmd-231': 'a space shooter',
    'xl-cmd-232': 'alien invaders from Mars',
}

# /stepbystep es un comando de TEXTO: no tiene prompt de imagen, no se genera.


def build_jobs():
    tarjetas = json.load(open(r'E:\ANTIGRAVITY\tools\trickvault\_retroedu.json', encoding='utf-8'))
    jobs = []
    for t in tarjetas:
        if not t['prompt']:
            print(f"  SIN PROMPT DE IMAGEN, se omite: {t['code']} ({t['id']})")
            continue
        if t['id'] not in SUJETOS:
            raise SystemExit(f"FALTA SUJETO para {t['id']} ({t['code']})")
        sujeto = SUJETOS[t['id']]
        if '[OBJETO]' not in t['prompt']:
            raise SystemExit(f"el prompt de {t['code']} no lleva [OBJETO]")
        full = t['prompt'].replace('[OBJETO]', sujeto)
        jobs.append({'id': t['id'], 'code': t['code'], 'subject': sujeto,
                     'desc': t['desc'], 'prompt': full})
    sobran = set(SUJETOS) - {j['id'] for j in jobs}
    if sobran:
        raise SystemExit(f'sujetos sin tarjeta: {sorted(sobran)}')
    return jobs


def generate(prompt, timeout=300):
    payload = json.dumps({'task': 'generateImage', 'prompt': prompt,
                          'model': MODELO, 'aspectRatio': '1:1'}).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:200])
    return base64.b64decode(d['image'])


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = build_jobs()
    json.dump(jobs, open(JOBS_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    pendientes = [j for j in jobs
                  if not (os.path.exists(os.path.join(OUT, j['id'] + '.png'))
                          and os.path.getsize(os.path.join(OUT, j['id'] + '.png')) > 5000)]
    print(f'Trabajos: {len(jobs)} | ya hechas: {len(jobs)-len(pendientes)} | por hacer: {len(pendientes)}', flush=True)

    import threading
    lock = threading.Lock()
    estado = {'ok': 0, 'fail': 0, 'n': 0}
    errores = []
    t0 = time.time()

    def worker(job):
        dst = os.path.join(OUT, job['id'] + '.png')
        for intento in range(6):
            try:
                img = generate(job['prompt'])
                open(dst, 'wb').write(img)
                with lock:
                    estado['ok'] += 1
                    estado['n'] += 1
                    print(f"  [{estado['n']}/{len(pendientes)}] {job['id']} {job['code']:22s} "
                          f"OK {len(img)//1024} KB ({time.time()-t0:.0f}s) «{job['subject']}»", flush=True)
                return
            except Exception as e:
                codigo = getattr(e, 'code', None)
                ultimo = intento == 5
                if ultimo:
                    with lock:
                        estado['fail'] += 1
                        estado['n'] += 1
                        errores.append((job['id'], job['code'], repr(e)))
                        print(f"  [{estado['n']}/{len(pendientes)}] {job['id']} {job['code']:22s} FALLO: {e}", flush=True)
                else:
                    espera = 40 if codigo == 429 else 15
                    time.sleep(espera)

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=int(os.environ.get('RETROEDU_WORKERS', '2'))) as ex:
        list(ex.map(worker, pendientes))

    print(f"\nGeneradas ahora: {estado['ok']}  fallos: {estado['fail']}  "
          f"tiempo: {time.time()-t0:.0f}s", flush=True)
    if errores:
        print('ERRORES:', errores, flush=True)
    return 0 if estado['fail'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
