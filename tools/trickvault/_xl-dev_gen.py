# -*- coding: utf-8 -*-
"""
Genera las imagenes de ejemplo de las 5 tarjetas de "Dev y productividad" con
EXACTAMENTE el prompt que copia la app, usando openai-image-2-low (gpt-image-2, low).

Herramienta puntual: vive en tools/ y se borra al terminar.
Uso: _xl-dev_gen.py [codigo ...]   (sin argumentos = las 5)
"""
import base64, json, os, re, sys, time, threading, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
# modelo y carpeta de salida por variable de entorno (por defecto: image 2 low)
MODELO = os.environ.get('GEN_MODELO', 'openai-image-2-low')   # gpt-image-2, low
ASPECT = '1:1'                          # igual que las 180+ imagenes que ya hay
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
OUT = os.environ.get('GEN_OUT', r'E:\ANTIGRAVITY\tools\trickvault\xl-dev_gen')
SPEC = r'E:\ANTIGRAVITY\tools\trickvault\_xl-dev.json'

CODIGOS = ['/appui', '/glassui', '/darkmode', '/appicons', '/terminal']

src = open(APP, encoding='utf-8').read()
PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";', src, re.S).group(1)

# posiciones en CAPTURE_COMMANDS -> id cap-cmd-NNN (lo mismo que hace la app)
i = src.index('const CAPTURE_COMMANDS = [')
f = src.index('\n];', i) + 3
capturas = re.findall(r"\['(/[^']+)', '([^']*)'\]", src[i:f])
ids = {c: 'cap-cmd-%03d' % (n + 1) for n, (c, _) in enumerate(capturas)}

# plantillas del propio index.html (solo el bloque PROMPT_TEMPLATES).
# OJO: el lookahead (?=\n) es imprescindible; si el patron consume el \n final
# solo captura una de cada dos entradas.
_i = src.index('const PROMPT_TEMPLATES = {')
_j = src.index('\n};', _i)
_bloque = src[_i:_j]
plantillas = dict(re.findall(r'\n    "(/[^"]+)": "(.*?)",(?=\n)', _bloque))
print(f'plantillas leidas: {len(plantillas)} de {len(re.findall(chr(10) + "    " + chr(34) + "/", _bloque))} entradas del bloque')


def copyable(code, guardado):
    """Replica getTrickCopyText() de la app."""
    if PREFIJO in guardado:
        return guardado if guardado.strip().startswith(code) else f'{code} {guardado}'
    return f'{code} {PREFIJO} {guardado}'


def generar(prompt, timeout=300):
    payload = json.dumps({'task': 'generateImage', 'prompt': prompt,
                          'model': MODELO, 'aspectRatio': ASPECT}).encode()
    req = urllib.request.Request(PROXY, data=payload, method='POST',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError(str(d.get('error'))[:300])
    return base64.b64decode(d['image']), d


def main():
    objetivo = sys.argv[1:] or CODIGOS
    os.makedirs(OUT, exist_ok=True)
    jobs, errores = [], []

    for code in objetivo:
        if code not in ids:
            raise SystemExit('codigo no encontrado en CAPTURE_COMMANDS: ' + code)
        if code not in plantillas:
            raise SystemExit('codigo sin plantilla en PROMPT_TEMPLATES: ' + code)
        guardado = plantillas[code]
        prompt = copyable(code, guardado)
        # las mismas comprobaciones que el generador canonico del proyecto
        assert PREFIJO in prompt, 'falta la parte fija en ' + code
        assert 'must be written in Spanish' in prompt, 'falta la coletilla de español en ' + code
        assert '[OBJETO]' not in prompt, 'lleva [OBJETO] sin sustituir: ' + code
        jobs.append({'id': ids[code], 'code': code, 'desc': dict(capturas)[code],
                     'origen': 'capturas 2026-10-06', 'prompt': prompt})

    json.dump(jobs, open(SPEC, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # segundo fichero, con el nombre que esperan _carpeta_upload.py y _carpeta_contact.py
    jobs_path = SPEC.replace('_xl-dev.json', '_xl-dev_jobs.json')
    json.dump([{**j, 'subject': ''} for j in jobs], open(jobs_path, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'Spec escrita: {SPEC} ({len(jobs)} entradas)')
    print(f'Jobs escritos: {jobs_path}')
    print(f'Modelo: {MODELO}  |  formato: {ASPECT}\n')

    estado = {'ok': 0, 'n': 0}
    lock = threading.Lock()
    t0 = time.time()

    def worker(job):
        dst = os.path.join(OUT, job['id'] + '.png')
        try:
            img, meta = generar(job['prompt'])
            open(dst, 'wb').write(img)
            with lock:
                estado['ok'] += 1; estado['n'] += 1
                print(f"  [{estado['n']}/{len(jobs)}] {job['id']} {job['code']:12s} OK "
                      f"{len(img)//1024} KB ({time.time()-t0:.0f}s)", flush=True)
        except Exception as e:
            with lock:
                estado['n'] += 1
                errores.append((job['code'], repr(e)))
                print(f"  [{estado['n']}/{len(jobs)}] {job['id']} {job['code']:12s} FALLO: {e}", flush=True)

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=int(os.environ.get('WORKERS', '2'))) as ex:
        list(ex.map(worker, jobs))

    print(f"\nGeneradas: {estado['ok']}/{len(jobs)}  fallos: {len(errores)}  tiempo: {time.time()-t0:.0f}s")
    if errores:
        print('ERRORES:', errores)
    return 0 if not errores else 1


if __name__ == '__main__':
    sys.exit(main())
