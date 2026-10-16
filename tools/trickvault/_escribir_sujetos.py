# -*- coding: utf-8 -*-
"""Reescribe el bloque SUJETOS_POR_CARPETA de _carpeta_gen.py con todos los sujetos."""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
GEN = r'E:\ANTIGRAVITY\tools\trickvault\_carpeta_gen.py'

X = {
 'xl-retroedu': {
    'ig-dcek-137': 'the water cycle', 'ig-dcek-139': 'a product launch plan',
    'ig-dcek-156': 'how photosynthesis works', 'ig-dcek-157': 'the French Revolution',
    'ig-dcek-158': 'global coffee consumption', 'ig-dcek-159': 'the anatomy of a honeybee',
    'ig-dcek-162': 'cats and dogs', 'ig-dcek-163': 'the branches of biology',
    'ig-dcek-164': "Maslow's hierarchy of needs", 'ig-dcek-165': 'Spanish verb tenses',
    'ig-dcek-166': 'the causes of the First World War', 'ig-dcek-167': 'how to give a good presentation',
    'ig-dcek-168': 'remote work versus office work', 'ig-dcek-169': 'an online sales funnel',
    'ig-dcek-170': 'why a bakery order arrived late', 'ig-dcek-171': 'task urgency and importance',
    'ig-dcek-172': 'a butterfly', 'ig-dcek-173': 'the human skeleton',
    'ig-dcek-174': 'the scientific method', 'ig-dcek-175': 'choosing a university degree',
    'ig-dcek-589': 'the solar system',
    'xl-cmd-222': 'a knight with a sword', 'xl-cmd-223': 'a household accounts spreadsheet',
    'xl-cmd-224': 'a 1950s seaside souvenir', 'xl-cmd-225': 'a vintage tea brand',
    'xl-cmd-226': 'a classic barber shop', 'xl-cmd-227': 'the space race',
    'xl-cmd-228': 'summer holidays', 'xl-cmd-229': 'a range of kitchen appliances',
    'xl-cmd-230': 'a mountain hiking club', 'xl-cmd-231': 'a space shooter',
    'xl-cmd-232': 'alien invaders from Mars', 'xl-cmd-233': 'a bicycle gear system',
    'xl-cmd-234': 'the human eye', 'xl-cmd-235': 'printed books', 'xl-cmd-236': 'the four seasons',
    'xl-cmd-237': 'the world of coffee', 'xl-cmd-238': 'a stag beetle',
    'xl-cmd-239': 'a wild red poppy', 'xl-cmd-240': 'the island of Mallorca',
    'xl-cmd-241': 'a pirate island in the Caribbean', 'xl-cmd-242': 'the history of the printing press',
    'xl-cmd-243': 'human memory', 'xl-cmd-244': 'the planets of the solar system',
    'xl-cmd-245': 'the history of space exploration', 'xl-cmd-246': 'mythical creatures',
 },
 'xl-negocioredes': {
    'ig-dcek-107': 'ORIGEN, a specialty coffee roaster', 'ig-dcek-108': 'ORIGEN, a specialty coffee shop',
    'ig-dcek-109': 'ORIGEN, a specialty coffee brand', 'ig-dcek-138': 'an online store launch plan',
    'ig-dcek-145': 'a video about making sourdough bread', 'ig-dcek-161': 'the launch of a mobile app',
    'ig-dcek-370': 'ORIGEN, a specialty coffee roaster', 'ig-dcek-373': 'the opening of a neighbourhood bakery',
    'xl-cmd-174': 'a new mobile app', 'xl-cmd-175': 'a limited sneaker drop',
    'xl-cmd-176': 'a specialty coffee subscription', 'xl-cmd-177': 'a summer clothing sale',
    'xl-cmd-178': 'a neighbourhood bakery', 'xl-cmd-179': 'coffee versus tea',
    'xl-cmd-180': 'a sustainable delivery startup', 'xl-cmd-181': 'an online store',
    'xl-cmd-182': 'monthly recurring revenue', 'xl-cmd-183': 'a small design studio',
    'xl-cmd-184': 'two pricing plans', 'xl-cmd-185': 'a subscription service',
    'xl-cmd-186': 'a travel app', 'xl-cmd-187': 'a specialty coffee roastery',
    'xl-cmd-188': 'a natural skincare brand', 'xl-cmd-189': 'a graphic designer',
    'xl-cmd-190': 'a small architecture studio', 'xl-cmd-191': 'a course graduate',
    'xl-cmd-192': 'a premium olive oil', 'xl-cmd-193': 'a craft lemonade',
    'xl-cmd-194': 'a single-origin Colombian coffee', 'xl-cmd-195': 'a green jasmine tea',
    'xl-cmd-196': 'a soy lavender candle', 'xl-cmd-197': 'a luxury face cream',
 },
 'xl-casaviajes': {
    'ig-dcek-151': 'a white coastal villa with a pool', 'ig-dcek-265': 'a lonely desert highway',
    'ig-dcek-268': 'a modern living room', 'ig-dcek-270': 'a rooftop terrace overlooking a city',
    'ig-dcek-275': 'a whitewashed Greek island village', 'ig-dcek-276': 'a summer street festival',
    'ig-dcek-277': 'a tidy home office desk', 'ig-dcek-296': 'a wooden cabin among pine trees',
    'ig-dcek-302': 'a beach house by turquoise water', 'ig-dcek-307': 'a mountain lodge',
    'ig-dcek-308': 'a penthouse terrace at night', 'ig-dcek-320': 'a waterfront villa',
    'ig-dcek-321': 'a countryside house', 'ig-dcek-365': 'a modern concrete museum',
    'xl-cmd-103': 'a minimalist autumn wardrobe', 'xl-cmd-104': 'a warm scandinavian living room',
    'xl-cmd-105': 'a small master bedroom', 'xl-cmd-106': 'a rental apartment room',
    'xl-cmd-107': 'a two-bedroom flat for sale', 'xl-cmd-108': 'a lakeside cultural centre',
    'xl-cmd-109': 'a restored art nouveau building', 'xl-cmd-110': 'a compact family kitchen',
    'xl-cmd-111': 'a rainy sunday bedroom', 'xl-cmd-112': 'a neighbourhood bakery',
    'xl-cmd-113': 'a busy tapas restaurant', 'xl-cmd-114': 'a small mediterranean courtyard',
    'xl-cmd-115': 'a countryside villa with a pool', 'xl-cmd-116': 'a modern family house',
    'xl-cmd-117': 'a curved lounge chair', 'xl-cmd-118': 'a warm minimal interior palette',
    'xl-cmd-119': 'the northern coast of Spain', 'xl-cmd-120': 'a summer holiday in Sicily',
    'xl-cmd-121': 'a route along the Pacific coast', 'xl-cmd-122': 'a harbour city at night',
    'xl-cmd-123': 'a neon-lit downtown alley', 'xl-cmd-124': 'a route through the American southwest',
    'xl-cmd-125': 'the Pyrenees at sunrise', 'xl-cmd-126': 'a Caribbean island',
    'xl-cmd-127': 'a cabin in the Dolomites', 'xl-cmd-128': 'a pine forest in the Basque country',
 },
 'xl-letras3d': {
    'ig-dcek-279': 'a retro film camera', 'ig-dcek-480': 'a dog', 'ig-dcek-481': 'the rock cycle',
    'ig-dcek-482': 'an animal cell', 'ig-dcek-483': 'a mechanical wristwatch', 'ig-dcek-484': 'a camera lens',
    'ig-dcek-485': 'a motorcycle helmet', 'ig-dcek-486': 'the human heart',
    'ig-dcek-487': 'how coffee beans become a cup of coffee', 'ig-dcek-488': 'a sunflower',
    'xl-cmd-049': 'a mobile app interface', 'xl-cmd-050': 'a cosmetic bottle',
    'xl-cmd-051': 'a jewellery box', 'xl-cmd-052': 'a backpack', 'xl-cmd-053': 'a poodle',
    'xl-cmd-054': 'a friendly robot', 'xl-cmd-055': 'a guitar', 'xl-cmd-056': 'a perfume bottle',
    'xl-cmd-057': 'a sneaker', 'xl-cmd-058': 'the word HOLA', 'xl-cmd-059': 'a coffee cup',
    'xl-cmd-060': 'a rabbit', 'xl-cmd-061': 'the word FIESTA', 'xl-cmd-062': 'the word LIBERTAD',
    'xl-cmd-063': 'the daily menu', 'xl-cmd-064': 'the name VIDRIERAS', 'xl-cmd-065': 'the word GRACIAS',
    'xl-cmd-066': 'the word IMPRENTA', 'xl-cmd-067': 'the slogan VIAJAR ES VIVIR',
    'xl-cmd-068': 'the sign BIENVENIDOS', 'xl-cmd-069': 'the phrase FELIZ CUMPLEAÑOS',
    'xl-cmd-070': 'the word VERANO', 'xl-cmd-071': 'the name MARTA', 'xl-cmd-072': 'the word SALUD',
    'xl-cmd-073': 'the phrase TE QUIERO', 'xl-cmd-074': 'the word FUERZA',
    'xl-cmd-075': 'the word DISCIPLINA', 'xl-cmd-076': 'a plate of mole poblano',
 },
}

lineas = ['# id -> sujeto que sustituye a [OBJETO]. Una entrada por tarjeta que lo lleva.',
          'SUJETOS_POR_CARPETA = {']
for folder, items in X.items():
    lineas.append(f"    '{folder}': {{")
    for k, v in items.items():
        lineas.append(f"        '{k}': {v!r},")
    lineas.append('    },')
lineas.append('}')
bloque = '\n'.join(lineas)

txt = open(GEN, encoding='utf-8').read()
m = re.search(r'# id -> sujeto que sustituye a \[OBJETO\].*?\nSUJETOS_POR_CARPETA = \{.*?\n\}\n', txt, re.S)
if not m:
    raise SystemExit('no se encontro el bloque SUJETOS_POR_CARPETA')
txt = txt[:m.start()] + bloque + '\n' + txt[m.end():]
open(GEN, 'w', encoding='utf-8', newline='').write(txt)
print('sujetos escritos:', {k: len(v) for k, v in X.items()})
print('total:', sum(len(v) for v in X.values()))
