# -*- coding: utf-8 -*-
"""
Ciclo completo de UNA carpeta de imagenes de ejemplo de TrickVault.

  1. plan     : lista las tarjetas de imagen de esa carpeta que no tienen ejemplo
                y marca cuales necesitan sujeto ([OBJETO]).
  2. gen      : genera los PNG con openai-image-2-low en <carpeta>_gen/.
  3. aplicar  : convierte a assets/<carpeta>/<codigo>.jpg, los registra en
                SEED_COMMAND_IMAGES y anade la entrada de GENERATED_IMAGE_RELEASES.
  4. validar  : comprueba la sintaxis JSX del index.html.

Los sujetos para [OBJETO] viven en _sujetos_<carpeta>.json  (id -> sujeto).

Uso: _carpeta_lote.py <carpeta> plan|gen|aplicar|validar|todo
"""
import base64, io, json, os, re, subprocess, sys, threading, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
TOOLS = r'E:\ANTIGRAVITY\tools\trickvault'
PROXY = 'https://atnojs.es/apps/crear_historias/proxy.php'
MODELO = 'openai-image-2-low'
ASPECT = '1:1'
NODE = r'E:\dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

src = open(APP, encoding='utf-8').read()


def _sin_comentarios(txt):
    """Quita los comentarios // de un literal JS, respetando lo que va entre comillas
    (si no, se cargaria los 'https://' de dentro de las cadenas)."""
    salida, i, n, comilla = [], 0, len(txt), None
    while i < n:
        ch = txt[i]
        if comilla:
            salida.append(ch)
            if ch == '\\' and i + 1 < n:
                salida.append(txt[i + 1]); i += 2; continue
            if ch == comilla:
                comilla = None
            i += 1; continue
        if ch in '"\'':
            comilla = ch; salida.append(ch); i += 1; continue
        if ch == '/' and i + 1 < n and txt[i + 1] == '/':
            while i < n and txt[i] != '\n':
                i += 1
            continue
        salida.append(ch); i += 1
    return ''.join(salida)


def _lit(nombre):
    i = src.index('const %s = [' % nombre)
    j = src.index('\n];', i)
    txt = _sin_comentarios(src[i + len('const %s = ' % nombre):j + 3]).rstrip().rstrip(';')
    return eval(txt)


def _obj(nombre):
    i = src.index('const %s = {' % nombre)
    j = src.index('\n};', i)
    txt = _sin_comentarios(src[i + len('const %s = ' % nombre):j + 3]).rstrip().rstrip(';')
    return eval('(' + txt + ')')


CODE_FOLDER = _obj('CODE_FOLDER')
SEED_IMAGES = dict(_obj('SEED_COMMAND_IMAGES'))
# el Object.assign posterior tambien registra ejemplos
_oa = src.index('Object.assign(SEED_COMMAND_IMAGES, {')
for m in re.finditer(r"'(\/[^']+)':\s*'([^']+)'", src[_oa:src.index('});', _oa)]):
    SEED_IMAGES[m.group(1)] = m.group(2)

_i = src.index('const PROMPT_TEMPLATES = {')
_j = src.index('\n};', _i)
PROMPTS = dict(re.findall(r'\n    "(/[^"]+)": "(.*?)",(?=\n)', src[_i:_j]))
_k = src.index('const TEXT_COMMAND_TEMPLATES = {')
TEXTOS = set(re.findall(r"\n    '(/[^']+)':", src[_k:src.index('\n};', _k)]))
REMOVED = set(re.findall(r"'([^']+)'", src[src.index('const REMOVED_IMAGE_IDS = new Set(['):src.index(']);', src.index('const REMOVED_IMAGE_IDS = new Set(['))]))
PREFIJO = re.search(r'const IMAGE_STYLE_PREFIX_TEXT = "(.*?)";', src, re.S).group(1)


def tarjetas_de(carpeta):
    """Tarjetas de comando de esa carpeta, con su id de catalogo."""
    salida = []
    ig = _lit('INSTAGRAM_COMMANDS')
    ad = _lit('ADDITIONAL_IMAGE_COMMANDS')
    ex = _lit('EXCEL_COMMANDS')
    cap = _lit('CAPTURE_COMMANDS')
    allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
    for n, (code, _d) in enumerate(allc):
        cid = 'ig-dcek-%03d' % (n + 1)
        if code == '/glassart' or cid in REMOVED:
            continue
        if CODE_FOLDER.get(code, 'xl-dev') == carpeta:
            salida.append({'id': cid, 'code': code})
    for n, (code, _d) in enumerate(ex):
        if CODE_FOLDER.get(code, 'xl-dev') == carpeta:
            salida.append({'id': 'xl-cmd-%03d' % (n + 1), 'code': code})
    for n, (code, _d) in enumerate(cap):
        if CODE_FOLDER.get(code, 'xl-dev') == carpeta:
            salida.append({'id': 'cap-cmd-%03d' % (n + 1), 'code': code})
    return salida


def assets_dir(carpeta):
    """Subcarpeta de assets que ya usa esa carpeta (o su propio id)."""
    cuenta = {}
    for t in tarjetas_de(carpeta):
        ruta = SEED_IMAGES.get(t['code'], '')
        m = re.match(r'assets/([^/]+)/', ruta)
        if m:
            cuenta[m.group(1)] = cuenta.get(m.group(1), 0) + 1
    return max(cuenta, key=cuenta.get) if cuenta else carpeta


def pendientes(carpeta):
    """Tarjetas de imagen de esa carpeta sin ejemplo."""
    fuera = []
    for t in tarjetas_de(carpeta):
        if t['code'] in TEXTOS or t['code'] not in PROMPTS:
            continue                      # comando de texto: nunca lleva imagen
        if SEED_IMAGES.get(t['code']):
            continue                      # ya tiene ejemplo
        fuera.append(t)
    return fuera


def copyable(code, guardado):
    if PREFIJO in guardado:
        return guardado if guardado.strip().startswith(code) else '%s %s' % (code, guardado)
    return '%s %s %s' % (code, PREFIJO, guardado)


def plan(carpeta):
    sub = assets_dir(carpeta)
    pend = pendientes(carpeta)
    sujetos = {}
    f = os.path.join(TOOLS, '_sujetos_%s.json' % carpeta)
    if os.path.exists(f):
        sujetos = json.load(open(f, encoding='utf-8'))
    print('CARPETA %s  ->  assets/%s/   | pendientes: %d' % (carpeta, sub, len(pend)))
    con_obj = 0
    for t in pend:
        cuerpo = PROMPTS[t['code']]
        obj = '[OBJETO]' in cuerpo
        con_obj += obj
        estado = ('sujeto: ' + sujetos[t['id']]) if (obj and t['id'] in sujetos) else ('FALTA SUJETO' if obj else 'sin [OBJETO]')
        print('  %-12s %-24s %-14s %s' % (t['id'], t['code'], ('[OBJETO]' if obj else '-'), estado))
    print('  -> %d necesitan sujeto, %d no' % (con_obj, len(pend) - con_obj))
    return pend, sujetos


def generar(carpeta):
    pend, sujetos = plan(carpeta)
    out = os.path.join(TOOLS, '%s_gen' % carpeta)
    os.makedirs(out, exist_ok=True)
    jobs = []
    for t in pend:
        p = copyable(t['code'], PROMPTS[t['code']])
        if '[OBJETO]' in p:
            if t['id'] not in sujetos:
                raise SystemExit('FALTA SUJETO para %s (%s)' % (t['id'], t['code']))
            p = p.replace('[OBJETO]', sujetos[t['id']])
        assert '[OBJETO]' not in p, 'queda [OBJETO] en ' + t['code']
        assert PREFIJO in p and 'must be written in Spanish' in p, 'prompt incompleto en ' + t['code']
        jobs.append({'id': t['id'], 'code': t['code'], 'prompt': p, 'subject': sujetos.get(t['id'], '')})
    json.dump(jobs, open(os.path.join(TOOLS, '_%s_jobs.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump([{'id': j['id'], 'code': j['code'], 'desc': '', 'origen': 'lote low', 'prompt': j['prompt']} for j in jobs],
              open(os.path.join(TOOLS, '_%s.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    faltan = [j for j in jobs if not (os.path.exists(os.path.join(out, j['id'] + '.png')) and os.path.getsize(os.path.join(out, j['id'] + '.png')) > 5000)]
    print('\nModelo %s | %d jobs | ya hechos %d | por hacer %d' % (MODELO, len(jobs), len(jobs) - len(faltan), len(faltan)), flush=True)
    if not faltan:
        return 0
    lock, err = threading.Lock(), []
    t0 = time.time()

    def worker(j):
        dst = os.path.join(out, j['id'] + '.png')
        for intento in range(6):
            try:
                payload = json.dumps({'task': 'generateImage', 'prompt': j['prompt'], 'model': MODELO, 'aspectRatio': ASPECT}).encode()
                req = urllib.request.Request(PROXY, data=payload, method='POST', headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=300) as r:
                    d = json.load(r)
                if not d.get('success'):
                    raise RuntimeError(str(d.get('error'))[:200])
                img = base64.b64decode(d['image'])
                open(dst, 'wb').write(img)
                with lock:
                    print('  OK %-12s %-22s %d KB (%.0fs)' % (j['id'], j['code'], len(img) // 1024, time.time() - t0), flush=True)
                return
            except Exception as e:
                if intento == 5:
                    with lock:
                        err.append((j['code'], repr(e)))
                        print('  FALLO %-12s %-22s %s' % (j['id'], j['code'], e), flush=True)
                else:
                    time.sleep(15)
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=int(os.environ.get('WORKERS', '2'))) as pool:
        list(pool.map(worker, faltan))
    print('\nGeneradas %d | fallos %d | %.0fs' % (len(faltan) - len(err), len(err), time.time() - t0))
    if err:
        print('ERRORES:', err)
    return 1 if err else 0


def aplicar(carpeta):
    sub = assets_dir(carpeta)
    out = os.path.join(TOOLS, '%s_gen' % carpeta)
    jobs = json.load(open(os.path.join(TOOLS, '_%s_jobs.json' % carpeta), encoding='utf-8'))
    from PIL import Image
    os.makedirs(os.path.join(ASSETS, sub), exist_ok=True)
    global src
    nuevas, release = [], []
    for j in jobs:
        png = os.path.join(out, j['id'] + '.png')
        if not os.path.exists(png):
            print('  sin PNG, se omite:', j['code'])
            continue
        nombre = j['code'].lstrip('/')
        im = Image.open(png).convert('RGB')
        if max(im.size) > 1024:
            im.thumbnail((1024, 1024), Image.LANCZOS)
        ruta = os.path.join(ASSETS, sub, nombre + '.jpg')
        im.save(ruta, 'JPEG', quality=85, optimize=True, progressive=True)
        rel = 'assets/%s/%s.jpg' % (sub, nombre)
        nuevas.append((j['code'], rel))
        print('  %-22s -> %-40s %d KB' % (j['code'], rel, os.path.getsize(ruta) // 1024))

    # 1) registros en el bloque Object.assign
    ancla_fin = "    '/blackfriday': 'assets/xl-juegos/blackfriday.jpg',\n"
    assert src.count(ancla_fin) == 1, 'ancla del Object.assign no unica'
    bloque = ancla_fin
    for code, rel in nuevas:
        if ("'%s':" % code) in src:
            continue
        bloque += "    '%s': '%s',\n" % (code, rel)
    if bloque != ancla_fin:
        src = src.replace(ancla_fin, bloque.rstrip('\n') + '\n')
        print('  registrados %d codigos en SEED_COMMAND_IMAGES' % len([1 for c, _ in nuevas if ("'%s':" % c) not in src]))

    # 2) release de la carpeta
    ancla_rel = "];\n  function isGeneratedCardImage"
    assert src.count(ancla_rel) == 1, 'ancla de GENERATED_IMAGE_RELEASES no unica'
    if ("category: '%s'" % carpeta) not in src:
        entrada = "      { category: '%s', prefix: 'assets/%s/', key: 'trickvault-%s-images-version', version: '2026-10-06-gpt-image-2-low' },\n" % (carpeta, sub, carpeta)
        src = src.replace("  ];\n  function isGeneratedCardImage", "  " + entrada + "];\n  function isGeneratedCardImage")
        # recolocar la indentacion exacta
        src = src.replace("  " + entrada, entrada)
        print('  release anadida para %s (prefix assets/%s/)' % (carpeta, sub))
    else:
        print('  release de %s ya existia' % carpeta)
    open(APP, 'w', encoding='utf-8', newline='').write(src)
    return 0


def validar():
    js = os.path.join(TOOLS, '_val.js')
    open(js, 'w', encoding='utf-8').write(
        "const fs=require('fs'),p=require('E:/ANTIGRAVITY/node_modules/@babel/parser');"
        "const s=fs.readFileSync('E:/ANTIGRAVITY/apps/trickvault/index.html','utf8');"
        "const re=/<script type=\"text\\/babel\"[^>]*>([\\s\\S]*?)<\\/script>/g;let m,f=0;"
        "while((m=re.exec(s))!==null){try{p.parse(m[1],{sourceType:'module',plugins:['jsx']});console.log('OK sintaxis');}"
        "catch(e){f++;console.log('FALLO linea '+(e.loc?e.loc.line:'?')+': '+e.message);}}"
        "process.exit(f?1:0);")
    return subprocess.call([NODE, js])


if __name__ == '__main__':
    carpeta = sys.argv[1]
    modo = sys.argv[2] if len(sys.argv) > 2 else 'plan'
    if modo == 'plan':
        plan(carpeta)
    elif modo == 'gen':
        sys.exit(generar(carpeta))
    elif modo == 'aplicar':
        sys.exit(aplicar(carpeta))
    elif modo == 'validar':
        sys.exit(validar())
