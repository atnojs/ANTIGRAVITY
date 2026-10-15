# -*- coding: utf-8 -*-
"""Auditoria de duplicados de TODAS las tarjetas de apps/trickvault/index.html.

Solo lectura: analiza una COPIA congelada del index.html (snapshot con hash) para
que el informe no se mezcle con ediciones en curso.

Carga tools/trickvault/_carpeta_lote.py como modulo (redirigiendo APP al snapshot)
y reutiliza sus constantes: _lit, PROMPTS, TEXTOS, CODE_FOLDER, SEED_IMAGES,
tarjetas_de, REMOVED.

Salida: volcado JSON + fragmento markdown, por stdout y a _dup_global_datos.json.
"""
import hashlib, io, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
TOOLS = r'E:\ANTIGRAVITY\tools\trickvault'
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
INF = os.path.join(TOOLS, '_informes')

crudo = open(APP, 'rb').read()
SHA = hashlib.sha256(crudo).hexdigest()
SNAP = os.path.join(os.environ.get('TEMP', '.'), 'dup_global_index_%s.html' % SHA[:8])
if not os.path.exists(SNAP):
    open(SNAP, 'wb').write(crudo)

# --- cargar _carpeta_lote apuntando al snapshot -------------------------------
mod_src = open(os.path.join(TOOLS, '_carpeta_lote.py'), encoding='utf-8').read()
mod_src = mod_src.replace(r"APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'",
                          'APP = %r' % SNAP)
assert 'dup_global_index_' in mod_src, 'no se pudo redirigir APP'
ns = {'__name__': 'carpeta_lote_snap', '__file__': os.path.join(TOOLS, '_carpeta_lote.py')}
exec(compile(mod_src, 'carpeta_lote_snap', 'exec'), ns)

_lit, PROMPTS, TEXTOS = ns['_lit'], ns['PROMPTS'], ns['TEXTOS']
CODE_FOLDER, SEED_IMAGES, tarjetas_de, REMOVED = ns['CODE_FOLDER'], ns['SEED_IMAGES'], ns['tarjetas_de'], ns['REMOVED']
src, sin_comentarios = ns['src'], ns['_sin_comentarios']

# --- plantillas de texto (TEXT_COMMAND_TEMPLATES) -----------------------------
_i = src.index('const TEXT_COMMAND_TEMPLATES = {')
_j = src.index('\n};', _i)
bloque_txt = src[_i:_j] + '\n'
TEXT_PROMPTS = {}
# (?=\n) en lookahead: sin el, el \n consumido impide casar la linea siguiente.
for m in re.finditer(r"\n    '(/[^']+)': '(.*?)',?(?=\n)", bloque_txt):
    TEXT_PROMPTS[m.group(1)] = m.group(2)
faltan_txt = sorted(TEXTOS - set(TEXT_PROMPTS))
assert not faltan_txt, 'plantillas de texto sin parsear: %s' % faltan_txt

# --- arrays crudos (para contar posiciones y ver que se retira) ---------------
IG = _lit('INSTAGRAM_COMMANDS')
AD = _lit('ADDITIONAL_IMAGE_COMMANDS')
EX = _lit('EXCEL_COMMANDS')
CAP = _lit('CAPTURE_COMMANDS')
REEL = _lit('REEL_COMMANDS')
ALL_IMAGE = list(IG) + [t for t in AD if t[0] not in [c for c, _ in IG]]


def ejem(code):
    ruta = SEED_IMAGES.get(code) or ''
    return ruta.split('?')[0]          # el ?v=... es cache-busting, no otro ejemplo


# --- tarjetas vivas, carpeta por carpeta --------------------------------------
CARPETAS = sorted(set(CODE_FOLDER.values()))
tarjetas, ids_vistos = [], {}
for carpeta in CARPETAS:
    for t in tarjetas_de(carpeta):
        code = t['code']
        k = code.strip()
        if k in PROMPTS:
            prompt, tipo = PROMPTS[k], 'imagen'
        elif k in TEXT_PROMPTS:
            prompt, tipo = TEXT_PROMPTS[k], 'texto'
        else:
            prompt, tipo = '', 'sin-plantilla'
        tarjetas.append({'id': t['id'], 'code': code, 'carpeta': carpeta,
                         'tipo': tipo, 'prompt': prompt, 'ejemplo': ejem(code)})
        ids_vistos.setdefault(t['id'], []).append(code)

# --- duplicados exactos: mismo codigo + mismo prompt + mismo ejemplo ----------
grupos = {}
for c in tarjetas:
    grupos.setdefault((c['code'].strip(), c['prompt'], c['ejemplo']), []).append(c)
dup_exactos = {k: v for k, v in grupos.items() if len(v) > 1}

# (b) mismo codigo con prompts distintos
por_code = {}
for c in tarjetas:
    por_code.setdefault(c['code'].strip(), []).append(c)
code_multi_prompt = {k: v for k, v in por_code.items()
                     if len(set(x['prompt'] for x in v)) > 1}
code_repetido_mismo_prompt = {k: v for k, v in por_code.items()
                              if len(v) > 1 and k not in code_multi_prompt}

# (c) prompt identico con codigos distintos
por_prompt = {}
for c in tarjetas:
    if c['prompt']:
        por_prompt.setdefault(c['prompt'], {}).setdefault(c['code'].strip(), []).append(c)
prompt_multi_code = {p: v for p, v in por_prompt.items() if len(v) > 1}

# (d) ids retirados (REMOVED_IMAGE_IDS) y que posicion ocupan hoy en el array
retiradas = []
for rid in sorted(REMOVED):
    m = re.match(r'^ig-dcek-(\d+)$', rid)
    n = re.match(r'^cap-cmd-(\d+)$', rid)
    actual = ''
    fuente = ''
    if m:
        i = int(m.group(1)) - 1
        fuente = 'ALL_IMAGE_COMMANDS'
        if 0 <= i < len(ALL_IMAGE):
            actual = ALL_IMAGE[i][0]
    elif n:
        i = int(n.group(1)) - 1
        fuente = 'CAPTURE_COMMANDS'
        if 0 <= i < len(CAP):
            actual = CAP[i][0]
    retiradas.append({'id': rid, 'fuente': fuente, 'code_en_array': actual,
                      'guardado_en_flatmap': bool(m or n)})
retiradas_sin_posicion = [r for r in retiradas if r['fuente'] and not r['code_en_array']]

# --- variantes personales (RESTORED_VARIANTS) --------------------------------
_i = src.index('const RESTORED_VARIANTS = [')
_j = src.index('\n];', _i)
bloque_rv = sin_comentarios(src[_i:_j])[len('const RESTORED_VARIANTS = ['):]
variantes = []
for m in re.finditer(r'"id":\s*"([^"]+)"', bloque_rv):
    seg = bloque_rv[m.start():m.start() + 4000]
    code = re.search(r'"codeSnippet":\s*"([^"]*)"', seg)
    variantes.append({'id': m.group(1), 'code': code.group(1) if code else ''})

# --- controles ---------------------------------------------------------------
inter = sorted(set(PROMPTS) & set(TEXT_PROMPTS))
sin_plantilla = [c for c in tarjetas if c['tipo'] == 'sin-plantilla']
dup_ids = [i for i, v in ids_vistos.items() if len(v) > 1]

# claves repetidas en los bloques de plantillas (un dict las colapsa en silencio)
def claves_bloque(txt, patron):
    return re.findall(patron, txt)

_i = src.index('const PROMPT_TEMPLATES = {')
_j = src.index('\n};', _i)
claves_img = re.findall(r'\n    "(/[^"]+)":', src[_i:_j])
claves_txt = re.findall(r"\n    '(/[^']+)':", src[src.index('const TEXT_COMMAND_TEMPLATES = {'):src.index('\n};', src.index('const TEXT_COMMAND_TEMPLATES = {'))])
from collections import Counter as _C
rep_img = [k for k, n in _C(claves_img).items() if n > 1]
rep_txt = [k for k, n in _C(claves_txt).items() if n > 1]

# prompts identicos ignorando mayusculas, espacios y tildes
import unicodedata


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return re.sub(r'\s+', ' ', s).strip()


por_norm = {}
for c in tarjetas:
    if c['prompt']:
        por_norm.setdefault(norm(c['prompt']), {}).setdefault(c['code'].strip(), []).append(c)
norm_multi_code = {p: v for p, v in por_norm.items() if len(v) > 1}

# dos codigos distintos con EL MISMO ejemplo
por_ejem = {}
for c in tarjetas:
    if c['ejemplo']:
        por_ejem.setdefault(c['ejemplo'], []).append(c)
ejem_compartido = {k: v for k, v in por_ejem.items()
                   if len(set(x['code'].strip() for x in v)) > 1}

# assets/<carpeta>/<codigo>.jpg  y registro en SEED_COMMAND_IMAGES
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
for c in tarjetas:
    rel = 'assets/%s/%s.jpg' % (c['carpeta'], c['code'].lstrip('/'))
    c['jpg_esperado'] = rel
    c['jpg_existe'] = os.path.exists(os.path.join(ASSETS, c['carpeta'], c['code'].lstrip('/') + '.jpg'))
    c['registrado'] = bool(c['ejemplo'])
sin_ejemplo = [c for c in tarjetas if not c['registrado']]
sin_jpg = [c for c in tarjetas if c['registrado'] and not c['jpg_existe']]
registrado_sin_jpg_ni_upload = [c for c in sin_jpg if not c['ejemplo'].startswith('uploads/')]

datos = {
    'sha256': SHA, 'snapshot': SNAP, 'bytes': len(crudo),
    'totales': {
        'tarjetas_vivas': len(tarjetas),
        'carpetas': len(CARPETAS),
        'ig_array': len(IG), 'ad_array': len(AD), 'all_image': len(ALL_IMAGE),
        'ex_array': len(EX), 'cap_array': len(CAP), 'reel_array': len(REEL),
        'prompt_templates': len(PROMPTS), 'text_templates': len(TEXT_PROMPTS),
        'codigo_en_ambas_plantillas': len(inter),
        'ids_repetidos': len(dup_ids),
        'sin_plantilla': len(sin_plantilla),
    },
    'inter_plantillas': inter,
    'sin_plantilla': sin_plantilla,
    'claves_repetidas_img': rep_img,
    'claves_repetidas_txt': rep_txt,
    'norm_multi_code': [{'prompt': p[:160], 'codes': sorted(v.keys()),
                         'ids': [x['id'] for cs2 in v.values() for x in cs2]}
                        for p, v in norm_multi_code.items()],
    'ejem_compartido': [{'ejemplo': k, 'codes': sorted(set(x['code'] for x in v)),
                         'ids': [x['id'] for x in v],
                         'carpetas': sorted(set(x['carpeta'] for x in v))}
                        for k, v in ejem_compartido.items()],
    'sin_ejemplo': [{'id': c['id'], 'code': c['code'], 'carpeta': c['carpeta'], 'tipo': c['tipo']} for c in sin_ejemplo],
    'registrado_sin_jpg': [{'id': c['id'], 'code': c['code'], 'carpeta': c['carpeta'], 'ejemplo': c['ejemplo']}
                           for c in sin_jpg],
    'tarjetas': tarjetas,
    'por_carpeta': {},
    'dup_exactos': [], 'code_repetido': [], 'code_multi_prompt': [],
    'prompt_multi_code': [], 'retiradas': retiradas,
    'retiradas_sin_posicion': retiradas_sin_posicion, 'variantes': variantes,
    'ids_repetidos': dup_ids,
}

for carpeta in CARPETAS:
    cs = [c for c in tarjetas if c['carpeta'] == carpeta]
    d = [c for c in cs if (c['code'].strip(), c['prompt'], c['ejemplo']) in dup_exactos]
    datos['por_carpeta'][carpeta] = {
        'tarjetas': len(cs),
        'duplicados_exactos': len(d),
        'grupos_duplicados': len(set((c['code'].strip(), c['prompt'], c['ejemplo']) for c in d)),
        'texto': sum(1 for c in cs if c['tipo'] == 'texto'),
        'imagen': sum(1 for c in cs if c['tipo'] == 'imagen'),
    }

for (code, prompt, ejemplo), v in sorted(dup_exactos.items(), key=lambda kv: (-len(kv[1]), kv[0][0])):
    datos['dup_exactos'].append({
        'code': code, 'n': len(v), 'ejemplo': ejemplo,
        'prompt': prompt[:160] + ('…' if len(prompt) > 160 else ''),
        'tarjetas': [{'id': x['id'], 'carpeta': x['carpeta'], 'tipo': x['tipo']} for x in v],
    })
for code, v in sorted(code_repetido_mismo_prompt.items()):
    datos['code_repetido'].append({'code': code, 'n': len(v),
                                   'ids': [x['id'] for x in v], 'carpeta': v[0]['carpeta']})
for code, v in sorted(code_multi_prompt.items()):
    datos['code_multi_prompt'].append({'code': code, 'n': len(v),
                                       'ids': [x['id'] for x in v],
                                       'carpeta': v[0]['carpeta'],
                                       'prompts': sorted(set(x['prompt'][:80] for x in v))})
for p, v in sorted(prompt_multi_code.items(), key=lambda kv: -len(kv[1])):
    datos['prompt_multi_code'].append({
        'prompt': p[:160] + ('…' if len(p) > 160 else ''),
        'n_codes': len(v),
        'codes': sorted(v.keys())[:40],
        'ids': [x['id'] for cs2 in v.values() for x in cs2][:40],
        'carpetas': sorted(set(x['carpeta'] for cs2 in v.values() for x in cs2)),
    })

json.dump(datos, open(os.path.join(INF, '_dup_global_datos.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

# --- volcado legible ---------------------------------------------------------
print('sha256 %s  (%d bytes)  snapshot %s' % (SHA, len(crudo), SNAP))
print('tarjetas vivas %d | carpetas %d | ig %d + ad filtrado = %d | excel %d | cap %d | reel %d'
      % (len(tarjetas), len(CARPETAS), len(IG), len(ALL_IMAGE), len(EX), len(CAP), len(REEL)))
print('plantillas imagen %d | plantillas texto %d | codigos en ambas %d'
      % (len(PROMPTS), len(TEXT_PROMPTS), len(inter)))
print('sin plantilla (ni imagen ni texto): %d  %s'
      % (len(sin_plantilla), [(c['id'], c['code']) for c in sin_plantilla][:20]))
print('ids repetidos: %d %s' % (len(dup_ids), dup_ids[:20]))
print()
print('CARPETA                    tarjetas  texto  imagen  dup_exactos  grupos')
for carpeta in CARPETAS:
    d = datos['por_carpeta'][carpeta]
    print('%-26s %8d %6d %7d %12d %7d' % (carpeta, d['tarjetas'], d['texto'], d['imagen'],
                                          d['duplicados_exactos'], d['grupos_duplicados']))
print()
print('DUPLICADOS EXACTOS: %d grupos, %d tarjetas'
      % (len(datos['dup_exactos']), sum(g['n'] for g in datos['dup_exactos'])))
for g in datos['dup_exactos']:
    print('  %-22s x%d  ejemplo=%s  ids=%s' % (g['code'], g['n'], g['ejemplo'] or '(sin ejemplo)',
                                               ', '.join('%s[%s]' % (t['id'], t['carpeta']) for t in g['tarjetas'])))
print()
print('MISMO CODIGO, MISMO PROMPT (mismo grupo que arriba): %d' % len(datos['code_repetido']))
print('MISMO CODIGO, PROMPTS DISTINTOS: %d' % len(datos['code_multi_prompt']))
for g in datos['code_multi_prompt']:
    print('  %-22s x%d ids=%s prompts=%s' % (g['code'], g['n'], g['ids'], g['prompts']))
print()
print('PROMPT IDENTICO CON CODIGOS DISTINTOS: %d grupos' % len(prompt_multi_code))
for g in datos['prompt_multi_code'][:40]:
    print('  x%d %s -> %s' % (g['n_codes'], g['codes'], g['carpetas']))
print()
print('RETIRADAS de REMOVED_IMAGE_IDS: %d' % len(retiradas))
for r in retiradas:
    print('  %-14s %-22s code_en_array=%s' % (r['id'], r['fuente'], r['code_en_array'] or '(fuera de rango)'))
print('retiradas sin posicion en el array (fuente conocida): %s'
      % [r['id'] for r in retiradas_sin_posicion])
print('variantes personales: %s' % variantes)
print()
print('CLAVES REPETIDAS en PROMPT_TEMPLATES: %s | en TEXT_COMMAND_TEMPLATES: %s' % (rep_img, rep_txt))
print('prompts identicos ignorando mayus/espacios/tildes: %d grupos' % len(norm_multi_code))
for p, v in norm_multi_code.items():
    print('  %s  ->  %s' % (sorted(v.keys()), [x['id'] for cs2 in v.values() for x in cs2]))
print()
print('MISMO EJEMPLO EN CODIGOS DISTINTOS: %d casos' % len(ejem_compartido))
for k, v in sorted(ejem_compartido.items()):
    print('  %-52s %s %s' % (k, sorted(set(x['code'] for x in v)),
                             [(x['id'], x['carpeta']) for x in v]))
print()
print('tarjetas SIN ejemplo registrado (comandos de texto): %d' % len(sin_ejemplo))
print('  por carpeta: %s' % dict(sorted(_C(c['carpeta'] for c in sin_ejemplo).items())))
print('tarjetas con ejemplo registrado pero SIN fichero assets/...: %d' % len(sin_jpg))
for c in sin_jpg[:40]:
    print('   %-14s %-24s %s' % (c['id'], c['code'], c['ejemplo']))
print('  de esas, que no son uploads/: %d' % len(registrado_sin_jpg_ni_upload))
for c in registrado_sin_jpg_ni_upload[:40]:
    print('   %-14s %-24s %s' % (c['id'], c['code'], c['ejemplo']))
