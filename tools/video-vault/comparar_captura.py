# -*- coding: utf-8 -*-
"""Compara los comandos de la captura 2026-10-11 (100 + 50) con el catálogo real
de apps/video-vault/index.html y dice cuáles faltan de verdad.

Normaliza el nombre (quita '/', espacios, guiones) para detectar equivalentes ya
existentes con otro nombre.

Uso: python tools/video-vault/comparar_captura.py
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

HTML = r'E:\ANTIGRAVITY\apps\video-vault\index.html'


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


# Los 100 comandos + los 50 bonus de la captura, tal cual aparecen en la imagen,
# en orden (bloque por bloque).
CAPTURA = [
    # CINEMATIC SHOTS (1-10)
    'establishingshot', 'droneshot', 'aerialshot', 'topshot', 'wideangle',
    'longshot', 'mediumshot', 'closeup', 'extremecloseup', 'overtheshoulder',
    # CAMERA MOVEMENTS (11-20)
    'panleft', 'panright', 'tiltup', 'tiltdown', 'zoomin',
    'zoomout', 'dollyin', 'dollyout', 'trackingshot', 'orbitshot',
    # ACTION & DYNAMICS (21-30)
    'slowmotion', 'timelapse', 'hyperlapse', 'fastmotion', 'freezeframe',
    'reverse', 'bullettime', 'matchcut', 'montage', 'whippan',
    # LIGHT & MOOD (31-40)
    'goldenhour', 'bluehour', 'backlight', 'lowlight', 'neonlight',
    'candlelight', 'moody', 'highcontrast', 'softlight', 'hardlight',
    # LANDSCAPES & NATURE (41-50)
    'mountainview', 'oceanview', 'forestwalk', 'waterfall', 'sunrise',
    'sunset', 'beachview', 'desertshot', 'rainyday', 'storm',
    # URBAN & CITY (51-60)
    'cityscape', 'nightcity', 'skyscraper', 'streetview', 'trafficshot',
    'timesquare', 'bridgeview', 'alleyshot', 'rooftopview', 'neonsign',
    # PEOPLE & ACTION (61-70)
    'walking', 'running', 'jumping', 'dancing', 'talking',
    'laughing', 'thinking', 'working', 'cooking', 'driving',
    # LIFESTYLE & DAILY (71-80)
    'morningroutine', 'coffeetime', 'workfromhome', 'studymode', 'readingbook',
    'gymworkout', 'yogapractice', 'meditation', 'shopping', 'travelvlog',
    # TECH & DIGITAL (81-90)
    'screenrecord', 'futuristicface', 'futuristicui', 'coding', 'hacking',
    'datastream', 'glitcheffect', 'cyberpunk', 'vrworld', 'avatar',
    # PRODUCT & BRAND (91-100)
    'productshot', 'unboxing', 'closeupproduct', 'handheldshot', 'flatlay',
    '360product', 'brandstory', 'logoreveal', 'packaging', 'commercial',
    # BONUS 1-50
    'cinematiclook', 'filmlook', 'vintage', 'retro', 'blackandwhite',
    'sepia', 'grainy', 'filmgrain', 'bokeh', 'split',
    'doubleexposure', 'silhouette', 'reflection', 'throughglass', 'throughwindow',
    'lensflare', 'sunflare', 'shadowplay', 'freezeframe', 'fireeffect',
    'smokeeffect', 'watereffect', 'sparks', 'explosion', 'particles',
    'snowfall', 'raindrops', 'underwater', 'animationstyle', '3danimation',
    'stopmotion', 'cartoonstyle', 'pixelart', 'minimalist', 'isometric',
    'origamistyle', 'claymation', 'papercraft', 'epicmusic', 'happyvibes',
    'sadbgm', 'tensionmusic', 'upbeat', 'voiceover', 'subtitles',
    'textoverlay', 'introseequence', 'outroseequence', 'foggy', 'slowmotion',
]


def catalogo():
    src = open(HTML, encoding='utf-8').read()
    i = src.index('const VIDEO_COMMANDS = [')
    j = src.index('// Mapa comando')
    bloque = src[i:j]
    out = []
    for m in re.finditer(r"\{ id: '([^']+)', cat: '([^']*)', name: '([^']*)', title: '([^']*)'", bloque):
        out.append({'id': m.group(1), 'cat': m.group(2), 'name': m.group(3), 'title': m.group(4)})
    return out


def main():
    cat = catalogo()
    print('tarjetas en el catálogo de la app:', len(cat))
    por_norm = {}
    for c in cat:
        por_norm.setdefault(norm(c['name']), []).append(c)

    vistas = set()
    faltan = []
    for cmd in CAPTURA:
        n = norm(cmd)
        if n in vistas:
            continue
        vistas.add(n)
        if n not in por_norm:
            faltan.append(cmd)

    print('comandos distintos en la captura:', len(vistas))
    print('faltan de verdad (%d): %s' % (len(faltan), ', '.join('/' + f for f in faltan)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
