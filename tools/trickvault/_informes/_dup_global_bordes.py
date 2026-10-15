# -*- coding: utf-8 -*-
"""Chequeos de borde sobre el inventario ya extraido (_dup_global_datos.json).

Solo lectura. Busca duplicados que la comparacion literal no ve:
  · codigos que solo difieren en mayusculas/espacios  (/4K vs /4k)
  · significados (descripcion) repetidos con codigos distintos
  · titulos repetidos y parecidos
  · misma imagen de ejemplo bajo codigos distintos
  · la capa publicada (catalogo.json) frente al catalogo semilla
"""
import collections, json, os, re, sys, unicodedata

sys.stdout.reconfigure(encoding='utf-8')
INF = r'E:\ANTIGRAVITY\tools\trickvault\_informes'
datos = json.load(open(os.path.join(INF, '_dup_global_datos.json'), encoding='utf-8'))
tarjetas = datos['tarjetas']
seed_json = os.path.join(os.environ.get('TEMP', '.'), 'dup_global_seed.json')
seed = json.load(open(seed_json, encoding='utf-8')) if os.path.exists(seed_json) else {'filas': []}

print('=== 1) codigos que solo difieren en MAYUSCULAS/espacios ===')
por_clave = collections.defaultdict(list)
for c in tarjetas:
    k = re.sub(r'\s+', '', c['code']).lower()
    por_clave[k].append(c)
choque = {k: v for k, v in por_clave.items() if len(v) > 1}
for k, v in sorted(choque.items()):
    print('  %-18s -> %s' % (k, [(x['id'], x['code'], x['carpeta']) for x in v]))
print('  total: %d' % len(choque))

print('\n=== 2) significados (descripcion) repetidos con codigos distintos ===')
# la descripcion vive en el array; la recuperamos del propio index.html con el modulo
mod_src = open(r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_lote.py', encoding='utf-8').read()
mod_src = mod_src.replace(r"APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'",
                          'APP = %r' % datos['snapshot'])
ns = {'__name__': 'cl', '__file__': 'cl'}
exec(compile(mod_src, 'cl', 'exec'), ns)
descs = {}
for nombre in ('INSTAGRAM_COMMANDS', 'ADDITIONAL_IMAGE_COMMANDS', 'EXCEL_COMMANDS',
               'CAPTURE_COMMANDS', 'REEL_COMMANDS'):
    for code, d in ns['_lit'](nombre):
        descs.setdefault(code, d)
por_desc = collections.defaultdict(list)
for c in tarjetas:
    d = (descs.get(c['code']) or '').strip().lower()
    if d:
        por_desc[d].append(c)
n = 0
for d, v in sorted(por_desc.items()):
    if len(v) > 1:
        n += 1
        print('  %-46s %s' % (d[:46], [(x['id'], x['code'], x['carpeta']) for x in v]))
print('  total grupos: %d' % n)

print('\n=== 3) textos (xl-texto + resto) sin marcador [ALGO] ===')
sin_marca = [c for c in tarjetas if c['tipo'] == 'texto' and not re.search(r'\[[^\]]+\]', c['prompt'])]
print('  %d: %s' % (len(sin_marca), [(c['id'], c['code']) for c in sin_marca][:20]))

print('\n=== 4) misma imagen de ejemplo bajo codigos distintos (catalogo semilla) ===')
por_img = collections.defaultdict(set)
for c in tarjetas:
    if c['ejemplo']:
        por_img[c['ejemplo']].add(c['code'])
rep = {k: sorted(v) for k, v in por_img.items() if len(v) > 1}
print('  %d' % len(rep))
for k, v in sorted(rep.items())[:20]:
    print('   %-52s %s' % (k, v))

print('\n=== 5) la APP (Node, codigo real) frente a mi replica ===')
filas = [f for f in seed.get('filas', []) if f['code'].startswith('/')]
mia = set((c['id'], c['code'], c['carpeta']) for c in tarjetas)
suya = set((f['id'], f['code'], f['categoria']) for f in filas)
print('  SEED_TRICKS total: %d | con codigo: %d | mi replica: %d'
      % (seed.get('total', 0), len(filas), len(tarjetas)))
print('  solo en la app: %s' % sorted(suya - mia))
print('  solo en mi replica: %s' % sorted(mia - suya))
cod = collections.Counter(f['code'] for f in filas)
ids = collections.Counter(f['id'] for f in seed.get('filas', []))
print('  codigos repetidos en SEED_TRICKS: %s' % [k for k, v in cod.items() if v > 1])
print('  ids repetidos en SEED_TRICKS: %s' % [k for k, v in ids.items() if v > 1])
for k in [k for k, v in cod.items() if v > 1]:
    print('    %s -> %s' % (k, [(f['id'], f['categoria'], f['tieneCustom']) for f in filas if f['code'] == k]))

print('\n=== 6) capa publicada (apps/trickvault/catalogo.json) ===')
cat = json.load(open(r'E:\ANTIGRAVITY\apps\trickvault\catalogo.json', encoding='utf-8'))
ids_seed = set(c['id'] for c in tarjetas) | set(f['id'] for f in seed.get('filas', []))
extra = [i for i in cat['tarjetas'] if i not in ids_seed]
print('  tarjetas publicadas: %d | ids que NO son semilla: %s' % (len(cat['tarjetas']), extra))
print('  nuevas: %d' % len(cat['nuevas']))
codigos_seed = set(c['code'] for c in tarjetas)
for nva in cat['nuevas']:
    titulo = (nva.get('title') or '')
    code = (nva.get('codeSnippet') or '')
    candidato = titulo.split(' ')[0]
    print('    id=%s title=%r code=%r categoria=%s -> ¿mismo comando que el semilla %s?: %s'
          % (nva.get('id'), titulo, code, nva.get('category'), candidato,
             candidato in codigos_seed or candidato.lower() in code.lower()))
