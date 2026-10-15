# -*- coding: utf-8 -*-
"""Sube el ?v= de los codigos regenerados y la version de release de cada carpeta."""
import subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
PY = r'E:\ANTIGRAVITY\tools\trickvault\_marcar_cache.py'
CODIGOS = {
    'xl-pintura': ['/adcreative', '/charcoal', '/claimproof', '/colorpencil', '/comicpanel',
                   '/etching', '/flatvector', '/fresco', '/gouache', '/hookframe', '/impasto',
                   '/inkwash', '/lineart', '/mangapanel', '/markerrender', '/oilpainting',
                   '/pastelchalk', '/pricecard', '/resultchart', '/scratchboard', '/speedpaint',
                   '/stippling', '/sumie', '/testimonialframe', '/uglyad', '/watercolor',
                   '/weartimeline', '/webtoon'],
    'xl-juegos': ['/32x', '/autumn', '/blackfriday', '/bonsai', '/christmas', '/easter',
                  '/floral', '/gta', '/halloween', '/herbarium', '/loadingscreen', '/moss',
                  '/newyear', '/playstation', '/pressedflowers', '/pubg', '/pvp', '/summer',
                  '/terrarium', '/toybox', '/valentine', '/winter', '/zelda'],
    'xl-verdentro': ['/annotated', '/bluecopy', '/blueprint', '/dieline', '/footweartechpack',
                     '/ghostshell', '/handwritten', '/infographic', '/layerpeel', '/moodboard',
                     '/napkinsketch', '/pencilsketch', '/revealparts', '/sidecut', '/skeletalview',
                     '/wireframe2'],
    'xl-letras3d': ['/blisterpack', '/boxdiorama', '/capsuletoy', '/headswing', '/keychain',
                    '/yarnfigure', '/dioramabox', '/menushot'],
    'xl-casaviajes': ['/interior', '/cityscape', '/festival', '/workspace', '/forest', '/beach',
                      '/mountains', '/nightcity'],
    'xl-estilos': ['/cinematiccolor', '/detective', '/disposablecamera', '/hdreal', '/luxury',
                   '/mercury', '/minimalist', '/negativespace', '/partycam', '/pastelcolor',
                   '/vintage', '/vintagecolor'],
    'xl-hechomano': ['/splashshot', '/flatlay'],
    'xl-carteles': ['/pixelart'],
}
for carpeta, codes in CODIGOS.items():
    print('==== %s ====' % carpeta)
    subprocess.call([sys.executable, PY, carpeta] + codes)
