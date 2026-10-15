# -*- coding: utf-8 -*-
"""
Arregla catalogo.json (la capa publicada).

El 8-oct se publicó con la numeración de entonces; después entraron códigos
nuevos en medio del catálogo y todos los ids siguientes se desplazaron. Como la
capa va por ID, cada entrada acabó apuntando a OTRA tarjeta: la tarjeta N se
quedaba con el código de la N+1 y conservaba su imagen -> se veía la foto del
vecino.

Aquí se REENCAJA todo por CÓDIGO (que no cambia nunca):
  - tarjetas  -> al id que ese código tiene hoy
  - nuevas    -> se tiran las que son copias viejas de tarjetas del catálogo
  - orden     -> los ids se traducen por su código
"""
import importlib.util, json, os, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
APP = r'E:\ANTIGRAVITY\apps\trickvault\catalogo.json'
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

ig, ad = cl._lit('INSTAGRAM_COMMANDS'), cl._lit('ADDITIONAL_IMAGE_COMMANDS')
ex, cap = cl._lit('EXCEL_COMMANDS'), cl._lit('CAPTURE_COMMANDS')
allc = list(ig) + [t for t in ad if t[0] not in [c for c, _ in ig]]
ID = {}
for n, (code, _d) in enumerate(allc):
    cid = 'ig-dcek-%03d' % (n + 1)
    if code == '/glassart' or cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid)
for n, (code, _d) in enumerate(ex):
    ID.setdefault(code, 'xl-cmd-%03d' % (n + 1))
for n, (code, _d) in enumerate(cap):
    cid = 'cap-cmd-%03d' % (n + 1)
    if cid in cl.REMOVED:
        continue
    ID.setdefault(code, cid)

capa = json.load(open(APP, encoding='utf-8'))
tarjetas = capa['tarjetas']
nuevas = capa.get('nuevas') or []
orden = capa.get('orden') or {}


def codigo_de_entrada(e):
    """El código de una entrada de la capa: por codeSnippet, por el prompt o por el título."""
    if e.get('codeSnippet'):
        return e['codeSnippet'].strip()
    p = str(e.get('customPrompt') or '')
    m = p.lstrip().split(' ')[0] if p.lstrip().startswith('/') else None
    if m:
        return m.strip()
    t = str(e.get('title') or '')
    if t.startswith('/') and ' — ' in t:
        return t.split(' — ')[0].strip()
    return ''


# viejo id -> codigo, con lo que dice la propia capa
viejo_a_codigo = {}
for k, v in tarjetas.items():
    c = codigo_de_entrada(v)
    if c:
        viejo_a_codigo[k] = c
for n in nuevas:
    if n.get('id') and n.get('codeSnippet'):
        viejo_a_codigo[n['id']] = n['codeSnippet'].strip()

print('--- REENCAJE DE tarjetas ---')
nuevo_tarjetas, cambios, tiradas = {}, 0, []
for k, v in tarjetas.items():
    c = codigo_de_entrada(v)
    if c and c not in ID:
        tiradas.append((k, c, 'ese código ya no existe'))
        continue
    destino = ID[c] if c else k
    if destino != k:
        cambios += 1
    if destino in nuevo_tarjetas:
        # dos entradas al mismo id: se fusionan (la segunda completa la primera)
        nuevo_tarjetas[destino] = {**nuevo_tarjetas[destino], **v}
    else:
        nuevo_tarjetas[destino] = v
    if destino != k:
        print('   %-16s -> %-16s  (%s)' % (k, destino, c))
for k, c, por in tiradas:
    print('   %-16s DESCARTADA  (%s: %s)' % (k, por, c))
print('   reencajadas: %d   descartadas: %d' % (cambios, len(tiradas)))

print()
print('--- REENCAJE DE nuevas ---')
nuevas_ok = []
for n in nuevas:
    c = (n.get('codeSnippet') or '').strip()
    if c and c in ID:
        print('   %-16s DESCARTADA  (es una copia vieja de %s, que ya existe en el catálogo)'
              % (n.get('id'), c))
        continue
    nuevas_ok.append(n)
    print('   %-16s se mantiene (tarjeta propia)' % n.get('id'))
capa['nuevas'] = nuevas_ok

print()
print('--- REENCAJE DE orden ---')
nuevo_orden = {}
for carpeta, ids in orden.items():
    vistos, lista = set(), []
    for i in ids:
        j = ID.get(viejo_a_codigo.get(i, ''), i)
        if j not in vistos:
            vistos.add(j)
            lista.append(j)
        if j != i:
            print('   %-14s %-16s -> %s' % (carpeta, i, j))
    nuevo_orden[carpeta] = lista
capa['orden'] = nuevo_orden
capa['tarjetas'] = nuevo_tarjetas

shutil.copy(APP, APP + '.bak_pre_reencaje')
json.dump(capa, open(APP, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print()
print('escrito %s  (copia en .bak_pre_reencaje)' % APP)
print('  tarjetas: %d -> %d   nuevas: %d -> %d' % (len(tarjetas), len(nuevo_tarjetas), len(nuevas), len(nuevas_ok)))
