# -*- coding: utf-8 -*-
"""Inyecta plantillas que faltaban en trickvault:
- 5 plantillas de imagen (modificadores 3D) -> PROMPT_TEMPLATES
- 120 plantillas de instruccion (comandos de texto) -> TEXT_COMMAND_TEMPLATES (nuevo mapa)
+ cableado: copiar prompt, prefill del formulario, etiquetas UI.
"""
import json, re

PATH = 'E:/ANTIGRAVITY/apps/trickvault/index.html'
src = open(PATH, encoding='utf-8').read()

IMG_TPLS = {
    '/labels': "Add clear labels with the names of every part to the [OBJETO] image, neat annotation tags, educational diagram style",
    '/arrows': "Add arrows pointing at each part of [OBJETO], clear directional markers, technical diagram annotation",
    '/classroom': "Educational classroom resource aesthetic of [OBJETO], clean didactic design, teacher-friendly layout, school poster style",
    '/inputs': "Show the inputs of the [OBJETO] process, labeled entry stages, clear process diagram start",
    '/outputs': "Show the outputs or results of the [OBJETO] process, labeled final stages, clear process diagram end",
}

TEXT_TPLS = {
    '/ideas': "Dame 10 ideas originales sobre [TEMA], cada una con una frase explicando por qué funcionaría.",
    '/studyplan': "Crea un plan de estudio de [DURACIÓN] para aprender [TEMA], con objetivos semanales, sesiones diarias y repaso espaciado.",
    '/language': "Diseña un plan para aprender [IDIOMA] desde [NIVEL], con rutina diaria, recursos y hitos semanales.",
    '/website': "Propón ideas, estructura y textos para una web de [NEGOCIO/TEMA], con secciones y llamadas a la acción.",
    '/appidea': "Desarrolla una idea de app para resolver [PROBLEMA]: funcionalidades clave, público objetivo y modelo de negocio.",
    '/podcast': "Dame ideas de episodios y un guion completo para un podcast sobre [TEMA].",
    '/youtube': "Genera ideas y un guion para un vídeo de YouTube sobre [TEMA], con gancho inicial y estructura.",
    '/instagram': "Escribe captions y hashtags para una publicación de Instagram sobre [TEMA].",
    '/marketing': "Crea una estrategia de marketing para [PRODUCTO/NEGOCIO]: canales, mensajes y plan de acción.",
    '/productivity': "Dame un sistema para ser más productivo con [TAREA], con hábitos, herramientas y horario.",
    '/health': "Aconseja sobre [TEMA DE SALUD] con información práctica y hábitos sostenibles.",
    '/cooking': "Receta paso a paso de [PLATO], con ingredientes, tiempos y trucos.",
    '/money': "Guíame para gestionar [SITUACIÓN FINANCIERA]: presupuesto, ahorro y prioridades.",
    '/books': "Recomiéndame libros sobre [TEMA], con una frase de por qué cada uno.",
    '/career': "Oriéntame profesionalmente: pasos concretos para avanzar en [SECTOR/PUESTO].",
    '/motivation': "Mensaje de motivación diario para [SITUACIÓN], práctico y sin frases vacías.",
    '/creative': "Ejercicios y técnicas para potenciar la creatividad en [CAMPO].",
    '/solve': "Guíame para resolver [PROBLEMA] paso a paso, con opciones y su mejor solución.",
    '/anything': "Explora [TEMA] en profundidad: contexto, puntos clave y ángulos poco obvios.",
    '/planner': "Crea un plan personalizado para [OBJETIVO], con pasos, plazos y recursos.",
    '/socialpost': "Crea el contenido para una publicación en [RED] sobre [TEMA], listo para publicar.",
    '/goals': "Ayúdame a definir y alcanzar [OBJETIVO]: metas medibles, hitos y revisión.",
    '/calendar': "Organiza mi agenda para [PERIODO/TAREA]: bloques de tiempo y prioridades.",
    '/learn': "Explícame [TEMA] de forma simple, con analogías y ejemplos.",
    '/fitness': "Plan de entreno y dieta para [OBJETIVO FÍSICO], con rutina semanal.",
    '/summarize': "Resume este contenido largo en [N] puntos clave: [TEXTO]",
    '/recipes': "Dame recetas con [INGREDIENTES], fáciles y con pasos claros.",
    '/translate': "Traduce al [IDIOMA]: [TEXTO]",
    '/itinerary': "Itinerario de viaje para [DESTINO] durante [N] días, con tiempos y transporte.",
    '/code': "Escribe o depura código para [TAREA], con explicación línea a línea.",
    '/business': "Ideas y estrategia de negocio para [SECTOR]: oportunidades, riesgos y primeros pasos.",
    '/resume': "Mejora mi currículum para [PUESTO]: estructura, logros y palabras clave.",
    '/invest': "Analiza una inversión en [ACTIVO]: riesgos, expectativas y alternativas.",
    '/email': "Escribe un correo profesional para [MOTIVO], claro y con tono adecuado.",
    '/meditate': "Guía de mindfulness para [MOMENTO/SITUACIÓN]: ejercicios de 5-10 minutos.",
    '/analyze': "Analiza [DATOS/INFORMACIÓN]: tendencias, patrones y conclusiones.",
    '/roleplay': "Haz un roleplay para practicar [SITUACIÓN]: simula la conversación conmigo.",
    '/brainstorm': "Lluvia de ideas para [TEMA]: 20 ideas sin filtro, luego agrúpalas.",
    '/human': "Reescribe [TEXTO] para que suene natural y humano, sin tics de IA.",
    '/expert': "Responde como especialista en [CAMPO] sobre [TEMA], con nivel profesional.",
    '/ceo': "Analiza [SITUACIÓN] con mentalidad de fundador: visión, decisiones y prioridades.",
    '/viral': "Ideas de contenido con alto engagement para [TEMA], con gancho y formato.",
    '/seo': "Optimiza [TEXTO/WEB] para buscadores: palabras clave, estructura y metadatos.",
    '/critic': "Encuentra las debilidades y errores de [TEXTO/IDEA], con propuestas de mejora.",
    '/teacher': "Explica [TEMA] de forma clara y sencilla, apta para quien empieza.",
    '/elis': "Explícame [TEMA] como a un niño de 5 años.",
    '/brief': "Responde a [PREGUNTA] con la respuesta más corta posible.",
    '/strategy': "Plan estratégico a largo plazo para [OBJETIVO]: fases, riesgos y métricas.",
    '/copywriter': "Copy persuasivo para [PRODUCTO]: titular, cuerpo y llamada a la acción.",
    '/research': "Investiga [TEMA] en profundidad: fuentes, hallazgos y conclusiones.",
    '/promptengineer': "Mejora este prompt para obtener mejores resultados: [PROMPT]",
    '/simplify': "Simplifica [TEXTO] a lo esencial, sin perder el significado.",
    '/detailed': "Explícame [TEMA] de forma completa y detallada, con matices.",
    '/stepbystep': "Explícame [TAREA] paso a paso, sin saltarte nada.",
    '/examples': "Dame ejemplos prácticos de [CONCEPTO], variados y aplicados.",
    '/analyst': "Analiza [INFORMACIÓN] y dame insights accionables.",
    '/compare': "Compara [OPCIONES]: pros, contras y cuál elegir según contexto.",
    '/decision': "Ayúdame a decidir sobre [DECISIÓN]: criterios, opciones y recomendación.",
    '/action': "Convierte [OBJETIVO] en pasos concretos, ordenados y con plazos.",
    '/prioritize': "Ordena estas tareas por importancia y urgencia: [LISTA]",
    '/focus': "Identifica la tarea más importante de [LISTA/SITUACIÓN] y por qué.",
    '/time': "Plan de gestión del tiempo para [TAREAS]: bloques, pausas y prioridades.",
    '/study': "Estrategia de estudio eficaz para [MATERIA]: técnicas y plan semanal.",
    '/quiz': "Hazme un quiz sobre [TEMA] con 10 preguntas y respuestas.",
    '/interview': "Prepárame para una entrevista de [PUESTO]: preguntas probables y respuestas.",
    '/mentor': "Responde como mentor personal sobre [SITUACIÓN], con experiencia y honestidad.",
    '/coach': "Orientación práctica para mejorar [ASPECTO]: plan y seguimiento.",
    '/consultant': "Recomendaciones profesionales para [PROBLEMA], como consultor externo.",
    '/editor': "Mejora la claridad y calidad de [TEXTO] manteniendo el estilo.",
    '/proofread': "Corrige errores gramaticales y ortográficos de [TEXTO].",
    '/rewrite': "Reescribe [TEXTO] con mejor redacción, mismo significado.",
    '/professional': "Reescribe [TEXTO] con tono profesional.",
    '/casual': "Reescribe [TEXTO] con tono conversacional.",
    '/friendly': "Reescribe [TEXTO] con tono cálido y amigable.",
    '/persuasive': "Reescribe [MENSAJE] para que sea más convincente.",
    '/concise': "Reescribe [TEXTO] eliminando lo innecesario.",
    '/polish': "Perfecciona [TEXTO] hasta la versión final, puliendo cada frase.",
    '/tone': "Ajusta el tono de [TEXTO] a [TONO] manteniendo el contenido.",
    '/storyteller': "Convierte [INFORMACIÓN] en una historia que enganche.",
    '/hook': "Crea 5 ganchos para [CONTENIDO] que detengan el scroll.",
    '/headline': "Crea 5 titulares impactantes para [TEMA].",
    '/caption': "Captions para [RED] sobre [TEMA], con emojis y llamada a la acción.",
    '/linkedin': "Contenido para LinkedIn sobre [TEMA], profesional y con historia.",
    '/reels': "Ideas de reels para [TEMA]: guion, plano y gancho en 3 segundos.",
    '/script': "Guion completo para [VÍDEO/PRESENTACIÓN], con escenas y narración.",
    '/sales': "Mensajes de venta para [PRODUCTO]: objeciones y cierre.",
    '/offer': "Diseña una oferta irresistible para [PRODUCTO]: paquete, bonos y urgencia.",
    '/brand': "Mensajes y tono de marca para [MARCA]: propuesta de valor y voz.",
    '/customer': "Piensa como el cliente de [PRODUCTO]: qué le importa y qué objeta.",
    '/audience': "Analiza el público objetivo de [PRODUCTO]: perfil, dolores y deseos.",
    '/competitor': "Analiza a [COMPETENCIA]: fortalezas, debilidades y cómo diferenciarte.",
    '/market': "Analiza las oportunidades de mercado para [PRODUCTO]: tamaño, tendencias y huecos.",
    '/startup': "Piensa como estratega de startups sobre [IDEA]: validación, MVP y crecimiento.",
    '/pricing': "Estrategia de precios para [PRODUCTO]: modelos, anclas y psicología.",
    '/funnel': "Diseña un embudo de marketing para [PRODUCTO]: etapas, mensajes y métricas.",
    '/growth': "Oportunidades de crecimiento para [NEGOCIO]: canales y experimentos.",
    '/content': "Estrategia de contenido para [MARCA]: pilares, formatos y calendario.",
    '/unpopular': "Cuestiona la idea convencional de [TEMA] con argumentos sólidos.",
    '/devilsadvocate': "Defiende el punto de vista contrario sobre [TEMA].",
    '/contrarian': "Dame perspectivas alternativas sobre [TEMA] que casi nadie considera.",
    '/assumptions': "Identifica las suposiciones ocultas en [PLAN/IDEA].",
    '/risks': "Identifica los riesgos de [PLAN/DECISIÓN] y cómo mitigarlos.",
    '/factcheck': "Separa hechos de opiniones en [TEXTO].",
    '/verify': "Señala qué afirmaciones de [TEXTO] necesitan verificación.",
    '/logic': "Comprueba el razonamiento de [ARGUMENTO] y señala sus fallos.",
    '/rootcause': "Encuentra la causa raíz de [PROBLEMA] con los 5 porqués.",
    '/debug': "Encuentra y soluciona los problemas de [CÓDIGO/SISTEMA].",
    '/solution': "Genera soluciones prácticas para [PROBLEMA], con pros y contras.",
    '/alternative': "Sugiere alternativas mejores a [OPCIÓN ACTUAL].",
    '/optimize': "Mejora [PROCESO/ENFOQUE] con cambios concretos y medibles.",
    '/automate': "Formas de automatizar [TAREA]: herramientas y pasos.",
    '/template': "Plantilla reutilizable para [DOCUMENTO/TAREA].",
    '/checklist': "Lista de verificación para [TAREA], ordenada por fases.",
    '/framework': "Estructura [TEMA] en un marco de trabajo claro, paso a paso.",
    '/matrix': "Matriz de decisión para [OPCIONES] con criterios ponderados.",
    '/table': "Convierte [INFORMACIÓN] en una tabla clara.",
    '/json': "Devuelve la respuesta en JSON válido sobre [DATOS].",
    '/reverse': "Trabaja hacia atrás desde [RESULTADO DESEADO] hasta el primer paso.",
    '/ultimate': "Respuesta completa y potente sobre [TEMA], sin límite de detalle.",
    '/story': "Escribe una historia sobre [TEMA] con personajes, conflicto y final.",
}
assert len(TEXT_TPLS) == 120, len(TEXT_TPLS)
assert len(IMG_TPLS) == 5, len(IMG_TPLS)

def line_tpl(m):
    return '\n    %s,\n};' % ',\n    '.join("'%s': '%s'" % (k, v.replace("'", "\\'")) for k, v in m.items())

# 1) plantillas de imagen dentro de PROMPT_TEMPLATES (antes de la llave final)
ancla_img = "\n    \"/mercury\": \"Mercury aesthetic image of [OBJETO], liquid chrome metal, flowing reflective surfaces, futuristic elegant design, high-tech luxury look\",\n};"
bloque_img = '\n    %s,\n};' % ',\n    '.join('"%s": "%s"' % (k, v) for k, v in IMG_TPLS.items())
assert ancla_img in src, 'ancla imagen no encontrada'
src = src.replace(ancla_img, bloque_img, 1)

# 2) mapa de comandos de texto + helpers, antes de IMAGE_COMMAND_PROMPTS
ancla_mapa = "const IMAGE_COMMAND_PROMPTS = new Map("
bloque_texto = (
    "const TEXT_COMMAND_TEMPLATES = {\n"
    + ',\n'.join("    '%s': '%s'" % (k, v.replace("'", "\\'")) for k, v in TEXT_TPLS.items())
    + "\n};\n\n"
    "function isTextCommandTrick(trick) { return TEXT_COMMAND_PROMPTS.has(getImageCommandKey(trick)); }\n\n"
    "const IMAGE_COMMAND_PROMPTS = new Map("
)
assert ancla_mapa in src, 'ancla mapa no encontrada'
src = src.replace(ancla_mapa, bloque_texto, 1)

# 3) TEXT_COMMAND_PROMPTS Map justo despues del Map de imagen
ancla_map2 = ");\n\nfunction getImageCommandKey(trick) {"
bloque_map2 = ");\n\nconst TEXT_COMMAND_PROMPTS = new Map(Object.entries(TEXT_COMMAND_TEMPLATES));\n\nfunction getImageCommandKey(trick) {"
assert ancla_map2 in src, 'ancla map2 no encontrada'
src = src.replace(ancla_map2, bloque_map2, 1)

# 4) getTrickCopyText: rama texto
ancla_copy = "    if (!IMAGE_COMMAND_PROMPTS.has(commandKey)) return base;"
bloque_copy = (
    "    if (!IMAGE_COMMAND_PROMPTS.has(commandKey)) {\n"
    "        const textTemplate = TEXT_COMMAND_PROMPTS.get(commandKey);\n"
    "        return textTemplate ? `${commandKey} ${textTemplate}` : base;\n"
    "    }"
)
assert ancla_copy in src, 'ancla copy no encontrada'
src = src.replace(ancla_copy, bloque_copy, 1)

# 5) prefill del formulario
ancla_form = "const fullPrompt = isEdit && isImageCommandTrick(trick) ? getTrickCopyText(trick) : '';"
bloque_form = "const fullPrompt = isEdit && (isImageCommandTrick(trick) || isTextCommandTrick(trick)) ? getTrickCopyText(trick) : '';"
assert ancla_form in src, 'ancla form no encontrada'
src = src.replace(ancla_form, bloque_form, 1)

# 6) etiquetas UI (boton copiar de la tarjeta + toast)
ancla_ui = "title={isImageCommandTrick(trick) ? 'Copiar prompt completo' : 'Copiar código'} aria-label={isImageCommandTrick(trick) ? 'Copiar prompt completo al portapapeles' : 'Copiar código al portapapeles'}"
bloque_ui = "title={(isImageCommandTrick(trick) || isTextCommandTrick(trick)) ? 'Copiar prompt completo' : 'Copiar código'} aria-label={(isImageCommandTrick(trick) || isTextCommandTrick(trick)) ? 'Copiar prompt completo al portapapeles' : 'Copiar código al portapapeles'}"
assert ancla_ui in src, 'ancla ui no encontrada'
src = src.replace(ancla_ui, bloque_ui, 1)

ancla_toast = "addToast(isImageCommandTrick(trick) ? '📋 Prompt completo copiado' : '📋 Código copiado al portapapeles');"
bloque_toast = "addToast((isImageCommandTrick(trick) || isTextCommandTrick(trick)) ? '📋 Prompt completo copiado' : '📋 Código copiado al portapapeles');"
assert ancla_toast in src, 'ancla toast no encontrada'
src = src.replace(ancla_toast, bloque_toast, 1)

open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('OK: 5 plantillas imagen + 120 plantillas texto + cableado inyectados')
