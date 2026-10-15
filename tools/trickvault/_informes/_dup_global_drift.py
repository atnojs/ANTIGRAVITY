# -*- coding: utf-8 -*-
"""Deriva de los ids POSICIONALES retirados (REMOVED_IMAGE_IDS) en la historia.

Los ids ig-dcek-NNN / cap-cmd-NNN son posiciones. Si una lista se reordena o
crece por delante, el id retirado pasa a apuntar a OTRA tarjeta: se apaga una
viva y la retirada vuelve a entrar (o al reves).

Solo lectura: recorre el historial de apps/trickvault/index.html con `git show`
y recalcula, revision a revision, que codigo ocupa cada posicion retirada.
"""
import re, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
REPO = r'E:\ANTIGRAVITY'
FICHERO = 'apps/trickvault/index.html'


def git(*args):
    return subprocess.run(['git'] + list(args), cwd=REPO, capture_output=True).stdout.decode('utf-8', 'replace')


def mapa_posiciones(src):
    """(ig_pos -> code, cap_pos -> code, set(removed), guards) de una revision."""
    def arr(nombre):
        try:
            i = src.index('const %s = [' % nombre)
        except ValueError:
            return []
        j = src.index('\n];', i)
        txt = src[i + len('const %s = ' % nombre):j + 3]
        return re.findall(r"\['([^']*)'\s*,", txt)

    ig = arr('INSTAGRAM_COMMANDS')
    ad = arr('ADDITIONAL_IMAGE_COMMANDS')
    allc = ig + [c for c in ad if c not in ig]
    cap = arr('CAPTURE_COMMANDS')
    try:
        k = src.index('const REMOVED_IMAGE_IDS = new Set([')
        rem = set(re.findall(r"'([^']+)'", src[k:src.index(']);', k)]))
    except ValueError:
        rem = set()
    guards = set(re.findall(r"command === '(/[^']+)'", src))
    return allc, cap, rem, guards


def code_de(rid, allc, cap):
    m = re.match(r'^ig-dcek-(\d+)$', rid)
    n = re.match(r'^cap-cmd-(\d+)$', rid)
    if m:
        i = int(m.group(1)) - 1
        return allc[i] if 0 <= i < len(allc) else None
    if n:
        i = int(n.group(1)) - 1
        return cap[i] if 0 <= i < len(cap) else None
    return None


revs = [l for l in git('log', '--format=%H', '--', FICHERO).split('\n') if l.strip()]
revs.reverse()                                                   # viejo -> nuevo
print('revisiones que tocan el fichero: %d' % len(revs))

serie = {}          # id retirado -> [(rev, code_at_position)] solo mientras esta retirado
informe = []        # cambio de codigo en una posicion retirada
for rev in revs:
    src = git('show', '%s:%s' % (rev, FICHERO))
    if not src:
        continue
    allc, cap, rem, guards = mapa_posiciones(src)
    for rid in sorted(rem):
        if not re.match(r'^(ig-dcek|cap-cmd)-\d+$', rid):
            continue
        code = code_de(rid, allc, cap)
        prev = serie.get(rid)
        if prev and prev[-1][1] != code:
            informe.append((rev, rid, prev[-1][1], code))
        serie.setdefault(rid, []).append((rev, code))

# estado final (HEAD / working tree)
head = git('show', 'HEAD:%s' % FICHERO)
allc_h, cap_h, rem_h, guards_h = mapa_posiciones(head)

print('\n=== CAMBIOS de codigo en una posicion retirada (deriva) ===')
if not informe:
    print('  ninguno: cada id retirado sigue apuntando al mismo codigo que el dia que se retiro')
for rev, rid, a, b in informe:
    fecha = git('show', '-s', '--format=%ad', '--date=short', rev).strip()
    asunto = git('show', '-s', '--format=%s', rev).strip()[:70]
    print('  %s %s  %-14s %s -> %s' % (fecha, rev[:8], rid, a, b))
    print('        %s' % asunto)

print('\n=== ESTADO ACTUAL de cada id retirado ===')
for rid in sorted(serie):
    m = re.match(r'^ig-dcek-(\d+)$', rid)
    n = re.match(r'^cap-cmd-(\d+)$', rid)
    if m:
        i = int(m.group(1)) - 1
        code = allc_h[i] if 0 <= i < len(allc_h) else None
        fila = 'ALL_IMAGE[%d]' % i
    else:
        i = int(n.group(1)) - 1
        code = cap_h[i] if 0 <= i < len(cap_h) else None
        fila = 'CAPTURE[%d]' % i
    origen = serie[rid][0][1]
    estado = 'ok' if code == origen else 'DERIVA (%s -> %s)' % (origen, code)
    print('  %-14s %-16s code=%-28s %s' % (rid, fila, code, estado))

print('\n=== GUARDS de flatMap en HEAD ===')
print('  codigos con guard command === X: %s' % sorted(guards_h))
for c in sorted(guards_h):
    print('    %-16s sigue en ALL_IMAGE_COMMANDS: %s' % (c, c in allc_h))
print('  /expressionsheet en ALL_IMAGE_COMMANDS: %s | en REMOVED_IMAGE_IDS: %s'
      % ('/expressionsheet' in allc_h, 'ig-dcek-083' in rem_h))
print('  /glassart        en ALL_IMAGE_COMMANDS: %s | en REMOVED_IMAGE_IDS: %s'
      % ('/glassart' in allc_h, 'tv-glassart-art' in rem_h))
print('  ids retirados hoy: %d  (ig/cap con posicion: %d)'
      % (len(rem_h), len([r for r in rem_h if re.match(r'^(ig-dcek|cap-cmd)-\d+$', r)])))
print('  ids retirados que NO existen en ninguna lista: %s'
      % sorted(r for r in rem_h if not re.match(r'^(ig-dcek|cap-cmd)-\d+$', r)))
