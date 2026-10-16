# -*- coding: utf-8 -*-
"""
Comprime a WebP y sube al store de la app la imagen generada de cada tarjeta de
«Retro y educativo», usando el flujo real de la app (auth.php -> image_store.php).
La imagen se guarda con el id de SU tarjeta: la que se generó con su prompt.
"""
import base64, http.cookiejar, io, json, os, sys, time, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image

BASE = 'https://atnojs.es/apps/trickvault/'
GEN = r'E:\ANTIGRAVITY\tools\trickvault\retroedu_gen'
MAX_SIDE = 1024
QUALITY = 82

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def post_form(url, fields, timeout=180):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(fields).encode(), method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with opener.open(req, timeout=timeout) as r:
        return r.status, r.read().decode('utf-8', 'replace')


def authenticate():
    st, body = post_form(BASE + 'auth.php', {'password': '0'})
    if st != 200 or '"success":true' not in body:
        raise RuntimeError(f'auth fallido: {st} {body[:200]}')
    print('  auth OK')


def to_webp(path):
    im = Image.open(path).convert('RGB')
    if max(im.size) > MAX_SIDE:
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue()


def upload(trick_id, raw, intento=1):
    data_url = 'data:image/webp;base64,' + base64.b64encode(raw).decode()
    st, body = post_form(BASE + 'image_store.php?action=save',
                         {'trickId': trick_id, 'imageData': data_url})
    if st == 200 and '"success":true' in body:
        return
    if st == 403 and intento <= 2:
        print('    sesion caducada, re-auth...')
        authenticate()
        return upload(trick_id, raw, intento + 1)
    raise RuntimeError(f'save fallido {trick_id} ({st}): {body[:200]}')


def main():
    jobs = json.load(open(r'E:\ANTIGRAVITY\tools\trickvault\_retroedu_jobs.json', encoding='utf-8'))
    # solo ficheros ya asentados (evita leer uno a medio escribir por el generador)
    def listo(j):
        p = os.path.join(GEN, j['id'] + '.png')
        return os.path.exists(p) and (time.time() - os.path.getmtime(p)) > 15
    pendientes = [j for j in jobs if listo(j)]
    print(f'tarjetas listas para subir: {len(pendientes)}/{len(jobs)}')
    faltan = [j['id'] for j in jobs if not listo(j)]
    if faltan:
        print('SIN GENERAR TODAVIA:', faltan)

    authenticate()
    ok, err = 0, []
    t0 = time.time()
    for i, j in enumerate(pendientes, 1):
        src = os.path.join(GEN, j['id'] + '.png')
        try:
            raw = to_webp(src)
            upload(j['id'], raw)
            ok += 1
            print(f'  {i}/{len(pendientes)} {j["id"]} {j["code"]:22s} subida {len(raw)//1024} KB')
        except Exception as e:
            err.append((j['id'], j['code'], repr(e)))
            print(f'  {i}/{len(pendientes)} {j["id"]} {j["code"]:22s} ERROR: {e}')
    print(f'\nSubidas: {ok}/{len(pendientes)}  errores: {len(err)}  tiempo: {time.time()-t0:.0f}s')
    if err:
        print('ERRORES:', err)
    return 0 if not err and not faltan else 1


if __name__ == '__main__':
    sys.exit(main())
