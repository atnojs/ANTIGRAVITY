# -*- coding: utf-8 -*-
"""Comprime a WebP y sube al store las imagenes generadas de una carpeta.
Uso: _carpeta_upload.py <folder_id>"""
import base64, http.cookiejar, io, json, os, sys, time, urllib.parse, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image

BASE = 'https://atnojs.es/apps/trickvault/'
FOLDER = sys.argv[1] if len(sys.argv) > 1 else 'xl-negocioredes'
GEN = rf'E:\ANTIGRAVITY\tools\trickvault\{FOLDER}_gen'
MAX_SIDE, QUALITY = 1024, 82

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
    if st == 403 and intento <= 3:
        authenticate()
        return upload(trick_id, raw, intento + 1)
    raise RuntimeError(f'save fallido {trick_id} ({st}): {body[:200]}')


def main():
    jobs = json.load(open(rf'E:\ANTIGRAVITY\tools\trickvault\_{FOLDER}_jobs.json', encoding='utf-8'))

    def listo(j):
        p = os.path.join(GEN, j['id'] + '.png')
        return os.path.exists(p) and (time.time() - os.path.getmtime(p)) > 15

    pend = [j for j in jobs if listo(j)]
    faltan = [j['id'] for j in jobs if not listo(j)]
    print(f'listas para subir: {len(pend)}/{len(jobs)}', flush=True)
    if faltan:
        print('SIN GENERAR:', faltan, flush=True)

    authenticate()
    ok, err = 0, []
    for i, j in enumerate(pend, 1):
        try:
            raw = to_webp(os.path.join(GEN, j['id'] + '.png'))
            upload(j['id'], raw)
            ok += 1
            print(f'  {i}/{len(pend)} {j["id"]} {j["code"]:20s} subida {len(raw)//1024} KB', flush=True)
        except Exception as e:
            err.append((j['id'], j['code'], repr(e)))
            print(f'  {i}/{len(pend)} {j["id"]} {j["code"]:20s} ERROR: {e}', flush=True)
    print(f'\nSubidas: {ok}/{len(pend)}  errores: {len(err)}', flush=True)
    for e in err:
        print('  ', e, flush=True)
    return 0 if not err else 1


if __name__ == '__main__':
    sys.exit(main())
