# -*- coding: utf-8 -*-
"""
Recupera las tarjetas cuyo ejemplo SI existe en el servidor (uploads/...) y lo
deja en el REPOSITORIO: apps/trickvault/assets/<sub>/<codigo>.jpg, y actualiza
SEED_COMMAND_IMAGES para que apunte a assets/.

Uso: _recuperar_copiar.py [--dry]
"""
import importlib.util, json, os, re, sys, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
ASSETS = r'E:\ANTIGRAVITY\apps\trickvault\assets'
T = r'E:\ANTIGRAVITY\tools\trickvault'
BASE = 'https://atnojs.es/apps/trickvault/'
WORK = os.path.join(T, '_recuperadas')
os.makedirs(WORK, exist_ok=True)
DRY = '--dry' in sys.argv

from PIL import Image

plan = json.load(open(os.path.join(T, '_plan_imagenes.json'), encoding='utf-8'))
tareas = [x for x in plan if x['estado'] == 'copiar']
print('tarjetas a recuperar: %d' % len(tareas))

src = open(APP, encoding='utf-8').read()
cambios, fallos = [], []
for x in tareas:
    code, cat, destino = x['code'], x['catalogo'], x['destino']
    dst = os.path.join(ASSETS, destino[len('assets/'):])
    tmp = os.path.join(WORK, code.lstrip('/') + os.path.splitext(cat)[1])
    if not (os.path.exists(tmp) and os.path.getsize(tmp) > 2000):
        try:
            urllib.request.urlretrieve(BASE + cat, tmp)
        except Exception as e:
            fallos.append((code, 'descarga: %s' % e)); continue
    try:
        im = Image.open(tmp).convert('RGB')
        if max(im.size) > 1024:
            im.thumbnail((1024, 1024), Image.LANCZOS)
        if not DRY:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst, 'JPEG', quality=85, optimize=True, progressive=True)
        cambios.append({'code': code, 'de': cat, 'a': destino, 'fichero': dst})
    except Exception as e:
        fallos.append((code, 'imagen: %s' % e))

print('  copiadas: %d   fallos: %d' % (len(cambios), len(fallos)))
for c, e in fallos:
    print('   FALLO %-24s %s' % (c, e))

# actualizar SEED_COMMAND_IMAGES: '/codigo': 'uploads/...'  ->  'assets/...'
tocados = 0
for ch in cambios:
    pat = re.compile(r"('%s':\s*')%s(')" % (re.escape(ch['code']), re.escape(ch['de'])))
    src, n = pat.subn(lambda m: m.group(1) + ch['a'] + m.group(2), src)
    if n != 1:
        print('   AVISO: %s aparece %d veces en SEED_COMMAND_IMAGES' % (ch['code'], n))
    else:
        tocados += 1
print('  entradas del catalogo actualizadas: %d/%d' % (tocados, len(cambios)))
if not DRY:
    open(APP, 'w', encoding='utf-8', newline='').write(src)
json.dump(cambios, open(os.path.join(T, '_recuperadas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('  guardado _recuperadas.json')
