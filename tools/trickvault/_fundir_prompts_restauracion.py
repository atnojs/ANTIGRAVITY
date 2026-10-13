# -*- coding: utf-8 -*-
"""Funde los 9 prompts del reel en 3 (uno por faena) dentro de PROMPT_TEMPLATES."""

APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
ANCLA = '    // ── Reel de Instagram (2026-10-13, gabu_lopez): restauración de fotos antiguas.'

P = ('If the user attaches an image, you must apply only the style to it, ensuring the original '
     'image remains completely unchanged; in other words, you must recreate the user-provided image '
     'and apply solely the requested style.')
FIN = 'all visible text and labels must be written in Spanish with no English words'

NUEVO = '''    // ── Reel de Instagram (2026-10-13, gabu_lopez): restauración de fotos antiguas.
    //    Los 9 códigos del reel, fundidos de tres en tres en UNA tarjeta por faena
    //    (reparar / colorear / imprimir): el usuario copia una tarjeta y no tiene
    //    que elegir ni combinar códigos. Las tres se aplican a la foto que adjunta
    //    el usuario, así que ninguna lleva [OBJETO] (el sujeto solo es para el ejemplo).
    "/restaurarfotoantigua": "%(p)s Archival restoration of the old damaged photograph: repair every crack, tear, crease, scratch, stain, dust speck and mould spot, rebuild the missing edges and corners, recover the eyes, the hair and the fine facial features that are still readable in the original, keep the original framing, the original pose and the original clothing exactly as they are; the people must remain exactly who they are, same face, same bone structure, same eyes, same nose, same mouth, same period hairstyle, same expression and same age, so clean only the actual damage and never beautify, never modernise, never slim and never smooth the features, no cosmetic retouch, no teeth whitening and no plastic skin, keep the real skin texture and the marks of time on the face; keep the original contrast, the original tonality, the original paper texture, the visible age marks, the vignetting and the slight softness of the era, do not crop, do not reframe, do not oversharpen and do not convert to modern colour, honest film grain, gentle sepia or neutral tonality, no invented faces and no invented objects, museum-quality conservation retouch, the result must still look like the very same old photograph only cleaner and must be instantly recognisable as the same person by their own family, %(fin)s",
    "/colorizarfotoantigua": "%(p)s Colourisation of the black and white or sepia old photograph: believable natural skin tones with subtle undertones, realistic hair colour, softly coloured background and props, period-correct clothing and fabric colours researched for the decade the image belongs to, correct period textile dyes, correct uniform and workwear colours, correct paint and furniture tones of the time, muted realistic palette with gentle desaturated tones, colour applied with restraint as if the original emulsion had always been in colour, subtle colour variation across the frame, slightly faded and uneven colour as the original tinted print would have aged, keeping the original grain, the original lighting and the original softness, no oversaturation, no strong colour casts, no neon and no modern colour grading, no anachronistic colours and no modern materials, %(fin)s",
    "/prepararparaimprimir": "%(p)s Print-ready high-resolution restoration of the old photograph: rebuild the image at 4K detail, resolved micro-texture in the skin, the fabric weave, the hair strands and the background objects, recover the fine micro-detail of the eyes, the eyelashes, the eyebrows, the lips, the buttons and the jewellery, crisp clean edges without halos, no blur, no ringing artifacts, no pixelation, no jpeg blocking, no mush and no plastic smoothing, natural texture kept and damage repaired; correct print resolution with a generous clean white border, full tonal range with deep blacks and clean highlights, no clipping, sharpened for paper output, neutral colour balance for pigment printing, the picture framed and ready to be printed and hung on a wall, %(fin)s",
''' % {'p': P, 'fin': FIN}

src = open(APP, encoding='utf-8').read()
i = src.index(ANCLA)
j = src.index('\n};', i)          # cierra PROMPT_TEMPLATES
print('bloque a sustituir: %d caracteres' % (j - i))
src = src[:i] + NUEVO.rstrip('\n') + src[j:]
open(APP, 'w', encoding='utf-8', newline='').write(src)
print('hecho')
