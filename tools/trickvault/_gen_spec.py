#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera _spec_inyeccion.json para alta masiva en trickvault (2026-09-25).
Fuentes: ia.tendencia (99 codigos secretos ChatGPT), cris.baracaldo (COMANDOS A-Z),
ochrisprado (codigos imagen), Gemini image commands, stephanobrooke (prompts edicion)."""
import json

# ---- 20 comandos de IMAGEN (con plantilla) ----
IMAGEN = [
    # cmd, significado, carpeta, plantilla
    ('/35mmfilm', 'estética clásica de fotografía en película 35 mm', 'visuales',
     "Classic 35mm film photograph of [OBJETO], authentic analog film grain, soft vintage color palette, nostalgic timeless look, professional film camera aesthetic"),
    ('/holographic', 'efecto de material holográfico futurista', 'visuales',
     "Holographic effect of [OBJETO], iridescent rainbow light refraction, shimmering holographic material finish, futuristic prismatic surface, clean studio lighting"),
    ('/architecture', 'fotografía de arquitectura y construcciones', 'escenarios',
     "Striking architectural photography of [OBJETO], dramatic building design, strong perspective lines, professional architecture magazine quality, clean geometric composition"),
    ('/group', 'foto de grupo de personas', 'persona',
     "Natural group photo of [OBJETO], people posed together in a relaxed arrangement, balanced composition, warm friendly atmosphere, professional group portrait"),
    ('/candid', 'foto espontánea y natural', 'visuales',
     "Candid spontaneous photo of [OBJETO], unposed natural moment, authentic documentary style, soft natural light, real-life atmosphere"),
    ('/illustration', 'ilustración digital', 'visuales',
     "Digital illustration of [OBJETO], vibrant colors, clean modern linework, artistic stylized interpretation, high quality illustration aesthetic"),
    ('/cartoon', 'estilo cartoon dibujado', 'visuales',
     "Cartoon style image of [OBJETO], bold outlines, exaggerated playful features, animated character aesthetic, vibrant saturated colors"),
    ('/logo', 'diseño de logo o identidad de marca', 'producto',
     "Professional logo design for [OBJETO], clean memorable brand identity, modern minimalist icon, balanced typography, versatile vector branding"),
    ('/poster', 'póster para eventos o promociones', 'producto',
     "Eye-catching poster design for [OBJETO], bold typography, dynamic graphic layout, professional promotional design, strong visual impact"),
    ('/banner', 'banner para web o redes sociales', 'producto',
     "Web banner design for [OBJETO], modern clean layout, balanced composition, professional graphic design, brand-ready social media banner"),
    ('/flyer', 'flyer o folleto publicitario', 'producto',
     "Promotional flyer design for [OBJETO], clear information hierarchy, eye-catching graphics, professional print layout, modern marketing design"),
    ('/wallpaper', 'fondo de pantalla para móvil o escritorio', 'visuales',
     "Beautiful wallpaper design featuring [OBJETO], high resolution digital art, clean aesthetic composition, subtle depth, mobile and desktop ready"),
    ('/invitation', 'tarjeta de invitación para eventos', 'producto',
     "Elegant invitation card design for [OBJETO], refined typography, sophisticated premium layout, tasteful event stationery design"),
    ('/quitaobjeto', 'quita cualquier objeto o persona de la foto', 'persona',
     "Quita [OBJETO] de esta imagen por completo y reconstruye de forma realista el área detrás. Iguala el fondo, iluminación, sombras, texturas, reflejos, profundidad, perspectiva y detalles del entorno original."),
    ('/expandeimagen', 'expande la imagen más allá de sus bordes', 'persona',
     "Expande esta imagen más allá de sus bordes actuales a [RELACIÓN DE ASPECTO O TAMAÑO] manteniendo todo lo que ya está dentro sin cambios. Continúa de forma natural el fondo, entorno, piso, paredes, cielo, escenario, objetos, iluminación, texturas y patrones."),
    ('/cambiahora', 'recrea otra hora del día en la escena', 'persona',
     "Cambia esta escena de [HORA ACTUAL] a [AMANECER / HORA DORADA / ATARDECER / NOCHE]. Ajusta el cielo, dirección de la luz, temperatura de color, reflejos, sombras, ventanas y entorno para que todo coincida de forma convincente con la nueva hora."),
    ('/abreojos', 'corrige ojos cerrados o entrecerrados', 'persona',
     "Corrige los ojos cerrados o entrecerrados de la persona para que se vean naturalmente abiertos y consistentes con su rostro, expresión, dirección de mirada, iluminación y forma de ojos. Mantén el cambio sutil y realista, sin alterar su identidad ni expresión."),
    ('/plancharopa', 'arregla la ropa arrugada', 'persona',
     "Suaviza arrugas, pliegues y tela dispareja en la ropa que distraigan, manteniendo material, ajuste, costuras, textura y pliegues naturales realistas. Que el outfit se vea ordenado y presentable sin parecer pintado digitalmente."),
    ('/colorgrade', 'gradua el color como un profesional', 'persona',
     "Aplica un color grade profesional a esta imagen manteniendo los tonos de piel naturales y al sujeto sin cambios. Balancea luces y sombras, refina contraste y saturación, y dale a todo el encuadre un acabado cinematográfico consistente."),
    ('/mejora8k', 'sube la calidad de la imagen a 8K', 'persona',
     "Mejora esta imagen a 8K para que se vea más nítida, limpia, clara y profesional, conservando la composición y el contenido original. Mejora detalles finos, iluminación, exposición, precisión de color, contraste y claridad general."),
]

# ---- 81 comandos de TEXTO (sin plantilla, carpeta trucos) ----
TEXTO = [
    ('/human', 'escritura natural y humana'), ('/expert', 'respuestas a nivel de especialista'),
    ('/ceo', 'análisis con mentalidad de fundador'), ('/viral', 'ideas de contenido con alto engagement'),
    ('/seo', 'contenido optimizado para buscadores'), ('/critic', 'encuentra debilidades y errores'),
    ('/teacher', 'explica de forma clara y sencilla'), ('/elis', 'explica como a un niño de 5 años'),
    ('/brief', 'la respuesta más corta posible'), ('/strategy', 'planificación a largo plazo'),
    ('/copywriter', 'copy persuasivo para marketing'), ('/research', 'investigación profunda'),
    ('/promptengineer', 'mejora cualquier prompt'), ('/simplify', 'simplifica contenido complejo'),
    ('/detailed', 'explicación completa y detallada'), ('/stepbystep', 'explica paso a paso'),
    ('/examples', 'proporciona ejemplos prácticos'), ('/analyst', 'analiza datos o información'),
    ('/compare', 'compara varias opciones'), ('/decision', 'ayuda a tomar la mejor decisión'),
    ('/action', 'convierte ideas en pasos concretos'), ('/prioritize', 'ordena las tareas por importancia'),
    ('/focus', 'identifica la tarea más importante'), ('/time', 'plan de gestión del tiempo'),
    ('/study', 'estrategia de estudio eficaz'), ('/quiz', 'preguntas para poner a prueba tus conocimientos'),
    ('/interview', 'prepárate para entrevistas'), ('/mentor', 'responde como un mentor personal'),
    ('/coach', 'orientación práctica personal'), ('/consultant', 'recomendaciones profesionales'),
    ('/editor', 'mejora la claridad y la calidad'), ('/proofread', 'encuentra errores gramaticales y ortográficos'),
    ('/rewrite', 'reescribe con mejor redacción'), ('/professional', 'haz que la escritura sea profesional'),
    ('/casual', 'escritura conversacional'), ('/friendly', 'escritura cálida y amigable'),
    ('/persuasive', 'mensaje más convincente'), ('/concise', 'elimina las palabras innecesarias'),
    ('/polish', 'perfecciona la versión final'), ('/tone', 'ajusta el tono de la escritura'),
    ('/storyteller', 'convierte la información en una historia'), ('/hook', 'ganchos que llaman la atención'),
    ('/headline', 'titulares impactantes'), ('/caption', 'captions para redes sociales'),
    ('/linkedin', 'contenido para LinkedIn'), ('/reels', 'ideas para vídeos cortos'),
    ('/script', 'guion para vídeo o presentación'), ('/sales', 'mensajes enfocados en ventas'),
    ('/offer', 'una oferta irresistible'), ('/brand', 'mensajes para una marca'),
    ('/customer', 'piensa desde la perspectiva del cliente'), ('/audience', 'analiza al público objetivo'),
    ('/competitor', 'analiza a la competencia'), ('/market', 'analiza oportunidades de mercado'),
    ('/startup', 'piensa como un estratega de startups'), ('/pricing', 'estrategia de precios'),
    ('/funnel', 'embudo de marketing'), ('/growth', 'oportunidades de crecimiento'),
    ('/content', 'estrategia de contenido'), ('/unpopular', 'cuestiona el pensamiento convencional'),
    ('/devilsadvocate', 'defiende el punto de vista contrario'), ('/contrarian', 'perspectivas alternativas'),
    ('/assumptions', 'identifica suposiciones ocultas'), ('/risks', 'identifica posibles riesgos'),
    ('/factcheck', 'separa los hechos de las afirmaciones'), ('/verify', 'identifica qué necesita verificación'),
    ('/logic', 'comprueba el razonamiento y la lógica'), ('/rootcause', 'encuentra la causa raíz de un problema'),
    ('/debug', 'encuentra y soluciona problemas'), ('/solution', 'genera soluciones prácticas'),
    ('/alternative', 'sugiere alternativas mejores'), ('/optimize', 'mejora un enfoque existente'),
    ('/automate', 'formas de automatizar la tarea'), ('/template', 'plantilla reutilizable'),
    ('/checklist', 'lista de verificación práctica'), ('/framework', 'marco estructurado'),
    ('/matrix', 'matriz de decisión'), ('/table', 'convierte la información en una tabla'),
    ('/json', 'respuesta en formato JSON'), ('/reverse', 'trabaja hacia atrás desde el resultado deseado'),
    ('/ultimate', 'la respuesta más completa y potente'),
]

assert len(IMAGEN) == 20, len(IMAGEN)
assert len(TEXTO) == 81, len(TEXTO)
TOTAL = IMAGEN + TEXTO
cmds = [c for c, _, _, _ in IMAGEN] + [c for c, _ in TEXTO]
assert len(cmds) == len(set(cmds)), 'comandos duplicados'
assert len(TOTAL) == 101

def esc(s):
    return s.replace("'", "\\'")

# --- Bloque 1: array ADDITIONAL_IMAGE_COMMANDS ---
lineas_array = []
for cmd, sig, _folder, _tpl in IMAGEN:
    lineas_array.append("    ['%s', '%s']," % (esc(cmd), esc(sig)))
for cmd, sig in TEXTO:
    lineas_array.append("    ['%s', '%s']," % (esc(cmd), esc(sig)))
array_texto = "    // 352-464 (capturas WhatsApp 2026-09-25: ia.tendencia, ochrisprado, gemini, stephanobrooke, cris.baracaldo)\n" + "\n".join(lineas_array) + "\n"

# --- Bloque 2: CODE_FOLDER ---
folder_lines = []
batch = []
for cmd, sig, folder, _tpl in IMAGEN:
    batch.append("'%s': '%s'" % (esc(cmd), folder))
for cmd, sig in TEXTO:
    batch.append("'%s': 'trucos'" % esc(cmd))
# agrupar en líneas de ~14 pares
for i in range(0, len(batch), 14):
    chunk = batch[i:i+14]
    line = "    " + ", ".join(chunk) + ","
    folder_lines.append(line)
# quitar coma final de la ultima linea
folder_lines[-1] = folder_lines[-1].rstrip(',')
folder_texto = "    // 352-464 (capturas WhatsApp 2026-09-25)\n" + "\n".join(folder_lines) + "\n"

# --- Bloque 3: PROMPT_TEMPLATES (solo los 20 de imagen) ---
tpl_lines = []
for cmd, sig, folder, tpl in IMAGEN:
    tpl_esc = tpl.replace('"', '\\"')
    tpl_lines.append('    "%s": "%s",' % (esc(cmd), tpl_esc))
tpl_lines[-1] = tpl_lines[-1].rstrip(',')
tpl_texto = "    // 364-383 (capturas WhatsApp 2026-09-25)\n" + "\n".join(tpl_lines) + "\n"

spec = [
    {
        "ancla": "    ['/story', 'escribir una historia'],\n];",
        "texto": array_texto,
        "antes": True,
    },
    {
        "ancla": "'/brainstorm': 'trucos', '/story': 'trucos',\n};",
        "texto": folder_texto,
        "antes": True,
    },
    {
        "ancla": '    "/mercury": "Mercury aesthetic image of [OBJETO], liquid chrome metal, flowing reflective surfaces, futuristic elegant design, high-tech luxury look",\n};',
        "texto": tpl_texto,
        "antes": True,
    },
]

json.dump(spec, open('_spec_inyeccion.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('spec OK: %d comandos (%d imagen + %d texto), %d bloques' % (len(TOTAL), len(IMAGEN), len(TEXTO), len(spec)))

# Exportar también el spec de imágenes para el generador posterior
img_spec = []
base_id = 363
for i, (cmd, sig, folder, tpl) in enumerate(IMAGEN):
    img_spec.append({"cmd": cmd, "folder": folder, "id": base_id + 1 + i, "tpl": tpl})
json.dump(img_spec, open('_spec_imagenes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('spec imagenes: ids %d-%d' % (img_spec[0]['id'], img_spec[-1]['id']))
