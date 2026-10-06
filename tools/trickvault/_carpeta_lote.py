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
import base64, hashlib, io, json, os, re, subprocess, sys, threading, time, urllib.request

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


def _huella(texto):
    """Huella corta del prompt, para saber con que se genero cada PNG."""
    return hashlib.sha1(texto.encode('utf-8')).hexdigest()[:12]


def _sujetos(carpeta):
    f = os.path.join(TOOLS, '_sujetos_%s.json' % carpeta)
    return json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}


def _ejemplos(carpeta):
    """Pista de sujeto SOLO para generar el ejemplo, cuando el prompt de la tarjeta
    no lleva [OBJETO] (si no, el modelo inventa un cartel en vez de una foto).
    No cambia el prompt que copia el usuario."""
    f = os.path.join(TOOLS, '_ejemplos_%s.json' % carpeta)
    return json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}


def plan(carpeta):
    sub = assets_dir(carpeta)
    pend = pendientes(carpeta)
    sujetos = _sujetos(carpeta)
    ejemplos = _ejemplos(carpeta)
    print('CARPETA %s  ->  assets/%s/   | pendientes: %d' % (carpeta, sub, len(pend)))
    con_obj = 0
    for t in pend:
        cuerpo = PROMPTS[t['code']]
        obj = '[OBJETO]' in cuerpo
        con_obj += obj
        if obj:
            estado = 'sujeto: ' + sujetos[t['id']] if t['id'] in sujetos else 'FALTA SUJETO'
        else:
            estado = 'pista: ' + ejemplos[t['id']] if t['id'] in ejemplos else 'sin pista (el modelo inventa)'
        print('  %-12s %-24s %-14s %s' % (t['id'], t['code'], ('[OBJETO]' if obj else '-'), estado))
    print('  -> %d necesitan sujeto, %d pista de ejemplo' % (con_obj, len(pend) - con_obj))
    return pend, sujetos


def generar(carpeta, forzar_ids=None):
    if forzar_ids:
        sujetos, ejemplos = _sujetos(carpeta), _ejemplos(carpeta)
        pend = [t for t in tarjetas_de(carpeta) if t['id'] in forzar_ids and t['code'] in PROMPTS]
        faltan_ids = set(forzar_ids) - set(t['id'] for t in pend)
        if faltan_ids:
            raise SystemExit('ids no encontrados en %s: %s' % (carpeta, sorted(faltan_ids)))
        print('REHACER %s: %d tarjetas' % (carpeta, len(pend)))
    else:
        pend, sujetos = plan(carpeta)
        ejemplos = _ejemplos(carpeta)
    out = os.path.join(TOOLS, '%s_gen' % carpeta)
    jobs_path = os.path.join(TOOLS, '_%s_jobs.json' % carpeta)
    os.makedirs(out, exist_ok=True)
    jobs = []
    for t in pend:
        p = copyable(t['code'], PROMPTS[t['code']])
        if '[OBJETO]' in p:
            if t['id'] not in sujetos:
                raise SystemExit('FALTA SUJETO para %s (%s)' % (t['id'], t['code']))
            p = p.replace('[OBJETO]', sujetos[t['id']])
        elif t['id'] in ejemplos:
            # El sujeto va ANTES del cuerpo, justo despues del preambulo, como
            # "Subject: ...". Al final ("Example: ...") el modelo lo ignora a
            # veces: paso con /ghibli, /felt y /sandart.
            bruto = re.sub(r'^\s*Example:\s*', '', ejemplos[t['id']]).rstrip('.')
            sentencia = 'Subject: %s.' % bruto
            pos = p.index(PREFIJO) + len(PREFIJO)
            p = p[:pos] + ' ' + sentencia + p[pos:]
        assert '[OBJETO]' not in p, 'queda [OBJETO] en ' + t['code']
        assert PREFIJO in p and 'must be written in Spanish' in p, 'prompt incompleto en ' + t['code']
        jobs.append({'id': t['id'], 'code': t['code'], 'prompt': p, 'subject': sujetos.get(t['id'], '')})
    json.dump(jobs, open(os.path.join(TOOLS, '_%s_jobs.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump([{'id': j['id'], 'code': j['code'], 'desc': '', 'origen': 'lote low', 'prompt': j['prompt']} for j in jobs],
              open(os.path.join(TOOLS, '_%s.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # Guardian: PNG que ya existen pero NO se generaron con el prompt actual
    # (tandas anteriores, otros sujetos u otro modelo). Se apoya en una huella
    # por imagen guardada en <carpeta>_gen/_manifest.json: asi no depende de que
    # el fichero de jobs se haya sobrescrito o no.
    man_path = os.path.join(out, '_manifest.json')
    manifest = {}
    if os.path.exists(man_path):
        try:
            manifest = json.load(open(man_path, encoding='utf-8'))
        except Exception:
            manifest = {}
    sospechosos = [j['id'] for j in jobs
                   if os.path.exists(os.path.join(out, j['id'] + '.png'))
                   and manifest.get(j['id']) != _huella(j['prompt'])]
    if sospechosos:
        print('AVISO: %d PNG ya existen pero NO corresponden al prompt actual (tandas anteriores):'
              % len(sospechosos))
        print('       %s' % ', '.join(sospechosos[:8]))
        print('       Para rehacer la carpeta entera: _carpeta_lote.py %s borrar' % carpeta)
        if os.environ.get('FORZAR') != '1':
            print('       (no se genera nada; repite con FORZAR=1 si es lo que quieres)')
            return 2

    def anotar():
        m = dict(manifest)
        for j in jobs:
            if os.path.exists(os.path.join(out, j['id'] + '.png')):
                m[j['id']] = _huella(j['prompt'])
        json.dump(m, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

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
    anotar()
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

    # 1) registros al final del bloque Object.assign(SEED_COMMAND_IMAGES, { ... })
    oa = src.index('Object.assign(SEED_COMMAND_IMAGES, {')
    oa_end = src.index('\n});', oa)
    ya = set(re.findall(r"'(\/[^']+)':", src[oa:oa_end]))
    nuevos = [(c, r) for c, r in nuevas if c not in ya]
    if nuevos:
        lineas = ''.join("    '%s': '%s',\n" % (c, r) for c, r in nuevos)
        src = src[:oa_end] + '\n' + lineas.rstrip('\n') + src[oa_end:]
        print('  registrados %d codigos en SEED_COMMAND_IMAGES' % len(nuevos))
    else:
        print('  SEED_COMMAND_IMAGES: nada nuevo que registrar')

    # 2) release de la carpeta (el array esta a columna 0)
    ancla_rel = "];\nfunction isGeneratedCardImage"
    assert src.count(ancla_rel) == 1, 'ancla de GENERATED_IMAGE_RELEASES no unica'
    bloque = src[src.index('const GENERATED_IMAGE_RELEASES = ['):src.index(ancla_rel)]
    if ("category: '%s'" % carpeta) in bloque:
        print('  release de %s ya existia' % carpeta)
    else:
        entrada = "    { category: '%s', prefix: 'assets/%s/', key: 'trickvault-%s-images-version', version: '2026-10-06-gpt-image-2-low' },\n" % (carpeta, sub, carpeta)
        src = src.replace(ancla_rel, entrada + ancla_rel)
        print('  release anadida para %s (prefix assets/%s/)' % (carpeta, sub))
    open(APP, 'w', encoding='utf-8', newline='').write(src)
    return 0


def sujetos(carpeta, sujeto, palabra=None, palabra_codes=(), sin_pista=()):
    """Escribe los dos ficheros de una carpeta con EL MISMO sujeto:
    _sujetos_<carpeta>.json (sustituye [OBJETO]) y _ejemplos_<carpeta>.json
    (pista para las tarjetas cuyo prompt no lleva [OBJETO]).

    - `sujeto`: el objeto unico de la carpeta.
    - `palabra` + `palabra_codes`: para los codigos cuyo [OBJETO] es EL TEXTO a
      rotular (lettering, typography), se usa la misma palabra en todos.
    - `sin_pista`: codigos que son ESCENAS AUTOSUFICIENTES (galaxy, dragon,
      blackhole...). No llevan [OBJETO] ni pista: su prompt ya lo describe todo y
      meterles un objeto los estropearia.
    - `_excepciones_<carpeta>.json` (id -> sujeto): tarjetas cuyo prompt exige una
      categoria concreta (un animal, una celula, un plato) y no admiten el objeto.
    """
    f_exc = os.path.join(TOOLS, '_excepciones_%s.json' % carpeta)
    exc = json.load(open(f_exc, encoding='utf-8')) if os.path.exists(f_exc) else {}
    pend = pendientes(carpeta)
    con, sin, usadas = {}, {}, {'objeto': 0, 'palabra': 0, 'excepcion': 0, 'escena': 0}
    for t in pend:
        if '[OBJETO]' not in PROMPTS[t['code']]:
            if t['code'] in sin_pista:
                usadas['escena'] += 1          # escena autosuficiente: sin pista
                continue
            sin[t['id']] = 'Example: %s.' % sujeto.rstrip('.')
            continue
        if t['id'] in exc:
            con[t['id']] = exc[t['id']]; usadas['excepcion'] += 1
        elif palabra and t['code'] in palabra_codes:
            con[t['id']] = palabra; usadas['palabra'] += 1
        else:
            con[t['id']] = sujeto; usadas['objeto'] += 1
    json.dump(con, open(os.path.join(TOOLS, '_sujetos_%s.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(sin, open(os.path.join(TOOLS, '_ejemplos_%s.json' % carpeta), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('objeto unico : %s  -> %d tarjetas' % (sujeto, usadas['objeto']))
    if palabra:
        print('palabra unica: %s  -> %d tarjetas (%s)' % (palabra, usadas['palabra'], ', '.join(sorted(palabra_codes))))
    if exc:
        print('excepciones  : %d tarjetas' % usadas['excepcion'])
        for i, s in sorted(exc.items()):
            print('    %-14s %s' % (i, s))
    if usadas['escena']:
        print('escenas sin pista (autosuficientes): %d tarjetas (%s)'
              % (usadas['escena'], ', '.join(sorted(sin_pista))))
    print('pistas de ejemplo: %d tarjetas' % len(sin))
    return 0


def borrar(carpeta):
    """Borra los PNG generados de una carpeta (para rehacerla entera)."""
    out = os.path.join(TOOLS, '%s_gen' % carpeta)
    if not os.path.isdir(out):
        print('no existe %s: nada que borrar' % out)
        return 0
    fs = [f for f in os.listdir(out) if f.endswith('.png')]
    for f in fs:
        os.remove(os.path.join(out, f))
    print('borrados %d PNG de %s' % (len(fs), out))
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
    elif modo == 'rehacer':
        sys.exit(generar(carpeta, forzar_ids=set(sys.argv[3:])))
    elif modo == 'aplicar':
        sys.exit(aplicar(carpeta))
    elif modo == 'borrar':
        sys.exit(borrar(carpeta))
    elif modo == 'validar':
        sys.exit(validar())
    elif modo == 'sujetos':
        resto = sys.argv[4:]
        palabra, codes, sinp = None, set(), set()
        if '--palabra' in resto:
            palabra = resto[resto.index('--palabra') + 1]
        if '--codes' in resto:
            codes = set(resto[resto.index('--codes') + 1].split(','))
        if '--sin-pista' in resto:
            sinp = set(resto[resto.index('--sin-pista') + 1].split(','))
        sys.exit(sujetos(carpeta, sys.argv[3], palabra, codes, sinp))
