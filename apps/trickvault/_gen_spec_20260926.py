#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera e inyecta el lote 465-602 de códigos (capturas WhatsApp 2026-09-26)
en trickvault/index.html: ADDITIONAL_IMAGE_COMMANDS + CODE_FOLDER + PROMPT_TEMPLATES.
Fuentes: iamasivaa, ochrisprado, smarts.ai/wizard_aitools, profegarcia.ai,
canalcarlosalbertob, ninodirector (nino.gpt)."""
import re, sys

# ---- (cmd, significado, carpeta, plantilla|None) ----
IMAGEN = [
    # iamasivaa
    ('/reveal', 'revela el sujeto o escena con un descubrimiento visual', 'camara',
     "Cinematic reveal shot of [OBJETO], dramatic uncovering motion, subject emerging into frame, suspenseful build-up, professional film direction"),
    ('/bullettime', 'efecto de tiempo bala con la cámara orbitando congelada', 'camara',
     "Bullet-time effect of [OBJETO], frozen mid-action moment with camera orbiting around, suspended motion droplets, Matrix-style cinematic photography"),
    ('/dronview', 'vista aérea de dron (escrito sin la e en la fuente)', 'camara',
     "Aerial drone view of [OBJETO], high-altitude sweeping perspective, smooth flying camera look, scenery below, cinematic travel footage"),
    # ochrisprado
    ('/aerial', 'vista aérea como desde un dron', 'camara',
     "Aerial photograph of [OBJETO], sweeping drone perspective from great height, expansive scenery below, cinematic sense of scale"),
    ('/lifestyle', 'escena de estilo de vida del día a día', 'persona',
     "Lifestyle photography of [OBJETO] in everyday use, authentic daily-life scene, natural candid atmosphere, warm realistic styling"),
    ('/bw', 'imagen en blanco y negro', 'visuales',
     "Black and white photograph of [OBJETO], rich monochrome tonal range, deep blacks and bright whites, timeless fine-art contrast"),
    ('/pet', 'foto realista de mascotas', 'persona',
     "Realistic pet photograph of [OBJETO], expressive animal portrait, soft natural light, sharp fur detail, heartwarming composition"),
    ('/instantphoto', 'aspecto de foto instantánea', 'visuales',
     "Instant photo aesthetic of [OBJETO], soft dreamy focus, washed vintage colors, white instant-film border, nostalgic snapshot feel"),
    # smarts.ai / wizard_aitools
    ('/legoify', 'recrea la escena como un mundo construido con LEGO', 'escenarios',
     "Recreate [OBJETO] as a detailed LEGO-built world, plastic brick textures, stud details, toy photography, playful miniature diorama"),
    ('/futureversion', 'transforma el mundo actual en una visión cinematográfica del futuro', 'escenarios',
     "Upgrade [OBJETO] into a cinematic vision of the future, futuristic architecture and technology, dramatic sci-fi atmosphere"),
    ('/postapocalypse', 'convierte la escena en un mundo post-apocalíptico cinematográfico', 'escenarios',
     "Turn [OBJETO] into a cinematic post-apocalyptic world, abandoned ruins, overgrown decay, dramatic desolation, movie-grade atmosphere"),
    ('/iceversion', 'congela la escena en un mundo de hielo y nieve', 'escenarios',
     "Freeze [OBJETO] into a world of ice and snow, frozen surfaces, frost textures, cold blue light, sparkling winter wonderland"),
    ('/candyversion', 'reconstruye la escena con dulces y texturas azucaradas', 'escenarios',
     "Rebuild [OBJETO] with candy, chocolate and sugary textures, glossy sweet surfaces, playful dessert world, colorful confectionery look"),
    ('/miniatureworld', 'convierte la escena en un modelo en miniatura detallado', 'escenarios',
     "Turn [OBJETO] into a detailed miniature model, tiny diorama with tilt-shift toy effect, meticulous small-scale craftsmanship"),
    ('/giantmode', 'hace que un objeto ordinario parezca enorme en un mundo realista', 'escenarios',
     "Make [OBJETO] look enormous inside a realistic world, giant object towering over tiny surroundings, forced perspective, epic scale"),
    ('/tinyhumans', 'convierte objetos normales en mundos gigantes para personajes diminutos', 'escenarios',
     "Transform [OBJETO] into a giant world for tiny human characters, miniature people exploring oversized everyday objects, playful scale photography"),
    # profegarcia.ai
    ('/3danimal', 'modelo 3D de un animal con estructuras internas y externas', 'visuales',
     "3D scientific model of [OBJETO], detailed animal anatomy with internal and external structures, clean educational render, labeled biology look"),
    ('/3dcycle', 'organiza etapas que se repiten en un ciclo 3D claro', 'visuales',
     "3D educational diagram of [OBJETO] as a clear repeating cycle, circular stages connected with arrows, clean classroom science visualization"),
    ('/3dcell', 'modelo 3D de una célula o bacteria con sus partes', 'visuales',
     "3D cell model of [OBJETO], detailed microbiology structure with organelles and parts, clean scientific render, classroom-ready biology visual"),
    ('/3dexploded', 'separa las partes de un objeto para ver cómo se conectan', 'visuales',
     "3D exploded model of [OBJETO], all parts separated in mid-air showing how they connect, clean educational assembly view"),
    ('/3dinside', 'revela el interior de un objeto con un corte visible', 'visuales',
     "3D cutaway model of [OBJETO] revealing its interior layers and core, visible cross-section, clean educational science render"),
    ('/3dcutaway', 'conserva el exterior y muestra el interior al mismo tiempo', 'visuales',
     "3D cutaway view of [OBJETO], outer surface preserved while the interior is exposed, side-by-side inside-outside educational model"),
    ('/3dlabeled', 'modelo 3D con nombres y flechas para estudiar cada parte', 'visuales',
     "3D labeled model of [OBJETO], every part tagged with names and arrows, clean study diagram, classroom science reference"),
    ('/3dprocess', 'proceso visual en 3D con entradas, transformación y resultado', 'visuales',
     "3D process diagram of [OBJETO], inputs transforming into outputs with flow arrows, clear stages, educational science visualization"),
    ('/3dplant', 'modelo botánico 3D con partes visibles y funciones básicas', 'visuales',
     "3D botanical model of [OBJETO], visible plant parts and basic functions, labeled stems roots and leaves, clean educational render"),
    # canalcarlosalbertob
    ('/transferbackground', 'transfiere o cambia el fondo de una imagen a otra', 'escenarios',
     "Transfer the background from [REFERENCIA] onto [OBJETO], seamless scene swap, matched lighting and perspective, realistic composite"),
    ('/balanced3Lightportrait', 'retrato con iluminación equilibrada de tres luces', 'persona',
     "Balanced three-light portrait of [OBJETO], key fill and rim lights perfectly balanced, studio photography lighting setup, professional headshot"),
    ('/removepeoplebg', 'elimina el fondo de una persona en la imagen', 'persona',
     "Remove the background around [OBJETO] completely, clean cutout of the person, perfectly isolated subject, smooth natural edges"),
    # ninodirector (nino.gpt) — producto
    ('/pourshot', 'el vertido congelado en el aire', 'producto',
     "High-speed pour shot of [OBJETO], liquid stream frozen mid-air, crisp frozen droplets, dynamic splash energy, commercial beverage photography"),
    ('/whiteback', 'fondo blanco puro de marketplace', 'producto',
     "Clean marketplace product photo of [OBJETO] on pure white background, even shadowless lighting, crisp catalog e-commerce look"),
    ('/inhandshot', 'el producto en la mano', 'producto',
     "Product-in-hand shot of [OBJETO], held naturally in a human hand, realistic scale and grip, warm lifestyle commercial photography"),
    ('/scalereference', 'al lado de algo que da la escala', 'producto',
     "Scale reference shot of [OBJETO] next to a familiar everyday object, clear size comparison, neutral background, documentary clarity"),
    ('/bundleshot', 'el paquete de varios como oferta', 'producto',
     "Bundle offer shot of [OBJETO], multiple items grouped as a value pack, attractive arrangement, promotional commercial styling"),
    ('/variantgrid', 'todas las variantes en cuadrícula', 'producto',
     "Variant grid of [OBJETO], all color and size versions arranged in a clean grid, consistent lighting, catalog comparison layout"),
    ('/levitationrig', 'la toma mostrando el rig de suspensión', 'producto',
     "Behind-the-scenes shot of the [OBJETO] levitation rig, visible stands and wires of the photo setup, studio production realism"),
    ('/liquidmotion', 'el líquido se mueve, el envase no', 'producto',
     "Liquid motion shot of [OBJETO], flowing moving liquid around a perfectly still package, silky long-exposure flow, premium beverage ad"),
    ('/unboxingsequence', 'la apertura del paquete cuadro a cuadro', 'producto',
     "Unboxing sequence of [OBJETO], step-by-step package opening frames, tactile cardboard and tissue details, storytelling product film"),
    ('/boxset', 'el kit completo con sus partes', 'producto',
     "Complete box set of [OBJETO], full kit with every part displayed, organized premium set arrangement, commercial product photography"),
    ('/sachetrow', 'todos los formatos alineados', 'producto',
     "Row of all [OBJETO] formats perfectly aligned, single-file lineup of sachets and packs, clean repetitive rhythm, catalog precision"),
    ('/materialswatch', 'muestrario de materiales', 'producto',
     "Material swatch board of [OBJETO], fabric and finish samples side by side, tactile texture close-ups, design studio presentation"),
    ('/refillsystem', 'explica el sistema de recarga', 'producto',
     "Refill system explainer of [OBJETO], reusable container with refill parts laid out, clear functional storytelling, eco product design"),
    ('/processsteps', 'el proceso en pasos numerados', 'producto',
     "Process steps of [OBJETO], numbered step-by-step making sequence, clean infographic flow, instructional clarity"),
    ('/handmadedetail', 'la marca de la mano encima', 'producto',
     "Handmade detail close-up of [OBJETO], visible craft marks and fingerprints, artisanal authenticity, tactile texture focus"),
    ('/sourcemap', 'de dónde viene cada ingrediente', 'producto',
     "Source map of [OBJETO], each ingredient traced to its origin, illustrated origin map with routes, clean provenance infographic"),
    ('/activesmap', 'cada activo y lo que hace', 'producto',
     "Active ingredients map of [OBJETO], each active component shown with its function, clean scientific infographic layout"),
    ('/splitproof', 'antes y después partidos al medio', 'producto',
     "Split before/after proof of [OBJETO], divided frame showing the transformation, matched lighting on both halves, credible comparison"),
    ('/versusgrid', 'tu producto contra la alternativa', 'producto',
     "Versus grid of [OBJETO] against the competing alternative, side-by-side feature comparison, clear winner framing, comparison chart"),
    ('/durabilitytest', 'lo somete a la prueba', 'producto',
     "Durability test of [OBJETO] under stress, water impact and scratch testing, action proof shot, rugged product credibility"),
    ('/weartimeline', 'el desgaste a lo largo del tiempo', 'producto',
     "Wear timeline of [OBJETO], aging stages shown left to right, gradual patina and wear progression, honest durability story"),
    ('/resultchart', 'el resultado como gráfico al lado', 'producto',
     "Result chart beside [OBJETO], outcome shown as a clean data graphic next to the product, measurable proof, marketing infographic"),
    ('/testimonialframe', 'la cita del cliente sobre la foto', 'producto',
     "Testimonial frame of [OBJETO] with the customer quote overlaid, real review callout typography, trustworthy social proof layout"),
    ('/claimproof', 'cada promesa con su evidencia', 'producto',
     "Claim-proof layout of [OBJETO], each product promise paired with its evidence, bold claim and supporting detail, persuasive ad structure"),
    ('/adcreative', 'lo vuelve creativo publicitario', 'producto',
     "Ad creative of [OBJETO], ready-to-publish advertising visual, bold hook and product hero, scroll-stopping social media ad design"),
    ('/hookframe', 'el primer cuadro que decide todo', 'producto',
     "Hook frame of [OBJETO], the decisive first frame of the video, intrigue and tension in one shot, scroll-stopping thumbnail"),
    ('/uglyad', 'anuncio feo a propósito, nativo', 'producto',
     "Deliberately ugly native ad of [OBJETO], raw low-fi aesthetic, authentic UGC feel, anti-design viral marketing look"),
    ('/pricecard', 'la oferta como tarjeta limpia', 'producto',
     "Clean price card of [OBJETO], the offer presented on a tidy price tag card, clear typography and value, promo graphic design"),
    ('/toypackaging', 'empaqueta tu producto como juguete', 'producto',
     "Toy packaging of [OBJETO], product boxed like a collectible toy, blister pack and cardboard backing, playful retail design"),
    ('/funkostyle', 'cabezón de vinilo en su caja', 'producto',
     "Funko-style vinyl figure of [OBJETO], oversized-head vinyl toy in its display box, collectible figure photography"),
    ('/minifig', 'figura de bloques con su set', 'producto',
     "Minifig block figure of [OBJETO] with its tiny building set, toy-brick character aesthetic, playful collectible scene"),
    ('/plushie', 'lo convierte en peluche', 'producto',
     "Plushie version of [OBJETO], soft stuffed toy conversion, fuzzy fabric texture and stitching, cuddly product render"),
    ('/keychain', 'llavero colgando de una mochila', 'producto',
     "Keychain of [OBJETO] hanging from a backpack, small charm in real use, tactile everyday accessory shot"),
    ('/gashapon', 'cápsula coleccionable y su máquina', 'producto',
     "Gashapon collectible of [OBJETO], tiny toy inside a capsule with its vending machine, Japanese capsule-toy aesthetic"),
    ('/bobblehead', 'cabeza que se mueve sobre su base', 'producto',
     "Bobblehead figure of [OBJETO], oversized wobbly head on a spring base, playful dashboard collectible, glossy finish"),
    ('/crochetdoll', 'muñeco tejido a crochet', 'producto',
     "Crochet doll of [OBJETO], hand-knitted amigurumi style, visible yarn stitches, cozy handmade toy photography"),
    ('/dioramabox', 'diorama dentro de una caja abierta', 'producto',
     "Diorama box of [OBJETO], miniature scene inside an open box, layered depth and tiny details, shadowbox art presentation"),
    ('/miniatureroom', 'habitación en miniatura de frente', 'producto',
     "Miniature room of [OBJETO], dollhouse-scale interior seen from the front, tiny furniture and warm lamps, detailed diorama"),
    ('/isometricroom', 'cuarto isométrico con todo adentro', 'producto',
     "Isometric room of [OBJETO], cutaway cube room at 45 degrees with everything inside, cozy 3D isometric illustration"),
    ('/ingredientexplosion', 'los ingredientes flotando alrededor', 'producto',
     "Ingredient explosion around [OBJETO], raw ingredients floating and bursting around the product, dynamic frozen motion, food-ad energy"),
    ('/ingredientbreakdown', 'desglosa la fórmula una por una', 'producto',
     "Ingredient breakdown of [OBJETO], every formula component displayed and named one by one, clean cosmetic science infographic"),
    ('/footweartechpack', 'ficha técnica del calzado rotulada', 'producto',
     "Footwear tech pack of [OBJETO], annotated sneaker design sheet with callouts, technical line drawing, design spec layout"),
    ('/timelineboard', 'tu marca entera en un tablero', 'producto',
     "Timeline board of the [OBJETO] brand, entire brand history pinned on one board, milestones and photos, creative planning wall"),
    ('/tradingcard', 'carta coleccionable con stats', 'producto',
     "Collectible trading card of [OBJETO], stats and rarity frame, holographic card game aesthetic, bold card typography"),
    ('/cerealbox', 'caja de cereal con tu mascota', 'producto',
     "Cereal box of [OBJETO] with its mascot, breakfast cereal packaging design, playful mascot and bowl graphic, retro grocery shelf"),
    ('/vinylsleeve', 'funda de vinilo con el disco físico', 'producto',
     "Vinyl sleeve of [OBJETO], record sleeve with the physical disc sliding out, cardboard texture and print, retro music packaging"),
    ('/arcadecabinet', 'máquina recreativa con tu marca', 'producto',
     "Arcade cabinet of [OBJETO], branded retro arcade machine, glowing marquee and pixel screen, nostalgic game-room scene"),
    ('/museumplaque', 'lo expone en museo con su ficha', 'producto',
     "Museum display of [OBJETO] with its wall plaque and info card, gallery pedestal and lighting, exhibition curation"),
    ('/spectable', 'tabla de especificaciones al lado', 'producto',
     "Spec table beside [OBJETO], technical specification table next to the product shot, clean data typography, catalog sheet"),
    ('/sizechart', 'tabla de tallas como gráfico', 'producto',
     "Size chart of [OBJETO] as a clear graphic, measurements and fits illustrated, e-commerce sizing infographic"),
    ('/dieline', 'el troquel del empaque desplegado', 'producto',
     "Dieline of the [OBJETO] packaging unfolded, flat box template with fold lines and panels, print production technical drawing"),
    ('/3dadcreative', 'lo vuelve anuncio en 3D listo para publicar', 'producto',
     "3D ad creative of [OBJETO], dimensional advertising render ready to publish, bold volume and depth, premium CGI commercial"),
    ('/brandworld', 'el universo visual de tu marca', 'producto',
     "Brand world of [OBJETO], the complete visual universe of the brand, cohesive style and motifs, brand guideline moodboard"),
    # ninodirector — cámara y luz
    ('/anglepack', 'los seis ángulos de catálogo', 'camara',
     "Six-angle catalog pack of [OBJETO], front side back top bottom and three-quarter views, consistent lighting, complete product coverage"),
    ('/gridboard', 'la misma toma en nueve variantes', 'camara',
     "Nine-variant grid board of [OBJETO], same shot repeated in nine variations, systematic comparison grid, contact-sheet layout"),
    ('/cameramove', 'describe el movimiento de cámara', 'camara',
     "Described camera movement around [OBJETO], smooth dolly or crane motion path, cinematic direction arrows, film production storyboard"),
    ('/keyframepair', 'primer y último cuadro del clip', 'camara',
     "Keyframe pair of [OBJETO], first and last frame of the clip side by side, clear motion start and end, video storyboard planning"),
    ('/spinturntable', 'el producto girando en el plato', 'camara',
     "Spin turntable shot of [OBJETO] rotating on a display platter, 360-degree product rotation, crisp motion highlights, premium showcase"),
    ('/shotsetup', 'el diagrama de luces de esa foto', 'camara',
     "Shot setup diagram of the [OBJETO] photo, camera and lights diagrammed around the scene, behind-the-scenes technical plan"),
    ('/gobopattern', 'recorta un patrón de luz encima', 'luz',
     "Gobo light pattern projected over [OBJETO], shaped cut-out light patterns, dramatic shadow play, theatrical studio lighting"),
    ('/colorgelset', 'ilumina el set con geles de color', 'luz',
     "Color gel lighting of [OBJETO], vibrant gelled studio lights, saturated reds blues and purples, bold editorial atmosphere"),
    ('/reflectionsetup', 'reflejo limpio debajo', 'luz',
     "Clean reflection setup of [OBJETO], mirror-like surface reflecting the product below, glossy acrylic floor, sleek commercial studio"),
    ('/lightingdiagram', 'esquema cenital de cada luz', 'luz',
     "Top-down lighting diagram of the [OBJETO] studio setup, every light marked with icons and labels, technical photography schematic"),
    # ninodirector — persona
    ('/handsinuse', 'solo manos usando el producto', 'persona',
     "Hands-only shot of [OBJETO] being used, close-up of hands interacting with the product, natural gesture, authentic usage moment"),
    ('/founderframe', 'el fundador con su producto', 'persona',
     "Founder portrait with [OBJETO], proud creator holding their product, authentic brand story moment, warm editorial lighting"),
    # ninodirector — visuales
    ('/3dmagazinecover', 'tu producto sale en 3D de la revista', 'visuales',
     "3D magazine cover of [OBJETO] popping out of the magazine, dimensional depth and shadows, playful editorial 3D effect"),
    ('/3danatomy', 'separa cada capa y la nombra', 'visuales',
     "3D anatomy of [OBJETO], every layer separated and named, exploded cross-section labels, technical educational render"),
    ('/3dsoftcutaway', 'lo corta por la mitad con luz suave', 'visuales',
     "Soft 3D cutaway of [OBJETO] sliced in half, gentle studio light revealing the inside, smooth CGI material detail"),
    ('/luxurylifestyle', 'lo hace ver diez veces más caro', 'visuales',
     "Luxury lifestyle shot of [OBJETO], ten-times-more-expensive look, marble gold and velvet styling, high-end editorial atmosphere"),
    ('/glasssculpture', 'figura de vidrio translúcida', 'visuales',
     "Glass sculpture of [OBJETO], translucent refractive glass figure, caustics and internal reflections, museum-grade studio light"),
    ('/voxelart', 'todo hecho con cubos 3D', 'visuales',
     "Voxel art of [OBJETO], everything built from 3D cubes, chunky pixel blocks, isometric voxel diorama"),
    ('/crossstitch', 'bordado en punto de cruz', 'visuales',
     "Cross-stitch embroidery of [OBJETO], X-stitch thread pattern on aida cloth, handmade sampler aesthetic, pixelated needlework"),
    ('/holographiccard', 'tarjeta que refleja arcoíris', 'visuales',
     "Holographic card of [OBJETO], rainbow-reflective foil surface, iridescent shimmer catching the light, premium card design"),
    ('/yearbook90s', 'retrato de anuario noventero', 'visuales',
     "90s yearbook portrait of [OBJETO], retro school photo styling, cheesy studio backdrop, nostalgic analog grain"),
    ('/tattooflash', 'lámina de tatuajes tradicionales', 'visuales',
     "Traditional tattoo flash sheet of [OBJETO], bold outlines and flat colors, classic American tattoo art, flash sheet layout"),
    ('/neonsign', 'tu frase como letrero de neón', 'visuales',
     "Neon sign of [OBJETO], glowing neon tube lettering, warm buzz and wall glow, night bar atmosphere"),
    ('/wantedposter', 'cartel de se busca envejecido', 'visuales',
     "Wanted poster of [OBJETO], aged old-west paper with sepia photo, rustic typography, weathered parchment texture"),
    ('/securitycam', 'cámara de seguridad con fecha', 'visuales',
     "Security camera still of [OBJETO], grainy CCTV frame with timestamp overlay, wide surveillance angle, noir ambience"),
    ('/layercut', 'corte que enseña las capas', 'visuales',
     "Layer cut of [OBJETO], horizontal slice exposing stacked internal layers, clean geological-style section, technical render"),
    ('/texturemacro', 'la textura a milímetros', 'visuales',
     "Texture macro of [OBJETO] at millimeter range, extreme surface detail and micro-texture, tactile material study"),
    ('/construction', 'cómo está construido, capa a capa', 'visuales',
     "Construction view of [OBJETO], built layer by layer, sequential assembly stages, engineering clarity, technical illustration"),
    ('/materialcallout', 'señala cada material en la foto', 'visuales',
     "Material callout photo of [OBJETO], each material pointed out with labels and lines, annotated product detail, spec-sheet style"),
    ('/microscopeview', 'la prueba vista al microscopio', 'visuales',
     "Microscope view of the [OBJETO] sample, scientific micro-detail, slide lighting and magnification, lab evidence aesthetic"),
    ('/grainpattern', 'patrón de veta de madera', 'visuales',
     "Wood grain pattern of [OBJETO], natural timber vein texture, warm organic surface, seamless material study"),
    ('/embossdetail', 'relieve estampado en seco', 'visuales',
     "Embossed detail of [OBJETO], dry-stamped relief impression, subtle depth and shadow, premium paper craftsmanship macro"),
    # ninodirector — escenarios
    ('/morningritual', 'dentro de la rutina de la mañana', 'escenarios',
     "Morning ritual scene with [OBJETO], cozy sunrise routine, warm kitchen light, authentic lifestyle moment"),
    ('/environmentmatch', 'en el entorno exacto de tu cliente', 'escenarios',
     "Environment match of [OBJETO] inside the exact customer habitat, real-world context styling, authentic lifestyle placement"),
    ('/seasonset', 'la misma escena en cuatro estaciones', 'escenarios',
     "Four-season set of [OBJETO], same scene rendered in spring summer autumn and winter, seasonal light and nature changes, campaign series"),
    ('/momentbefore', 'el instante justo antes de usarlo', 'escenarios',
     "Moment-before shot of [OBJETO], the instant right before use, anticipatory gesture and tension, cinematic storytelling frame"),
    ('/aftermath', 'lo que queda después de usarlo', 'escenarios',
     "Aftermath shot of [OBJETO], what remains after use, crumbs droplets and traces telling the story, atmospheric still life"),
    ('/companionobjects', 'con todo lo que lo acompaña', 'escenarios',
     "Companion objects composition of [OBJETO] with everything that goes with it, curated supporting props, harmonious styling"),
    ('/travelset', 'cómo viaja cuando sale de casa', 'escenarios',
     "Travel set of [OBJETO] packed for a trip, suitcase or bag context, on-the-go lifestyle, adventure-ready commercial styling"),
    ('/workdesk', 'instalado en el escritorio', 'escenarios',
     "Work desk scene of [OBJETO] installed on a real desk, organized workspace context, natural window light, productivity lifestyle"),
    ('/originstory', 'de dónde viene la marca', 'escenarios',
     "Origin story scene of [OBJETO], where the brand comes from, heritage setting and raw materials, nostalgic documentary mood"),
    ('/workshopscene', 'el lugar donde se fabrica', 'escenarios',
     "Workshop scene of [OBJETO] being made, real workshop tools and benches, artisan at work, industrial craft atmosphere"),
]

# ---- modificadores de texto (sin plantilla, carpeta trucos) ----
TEXTO = [
    ('/labels', 'añade etiquetas con los nombres de las partes'),
    ('/arrows', 'añade flechas señalando cada parte'),
    ('/classroom', 'estética didáctica de recurso para el aula'),
    ('/inputs', 'muestra las entradas del proceso'),
    ('/outputs', 'muestra las salidas o resultados del proceso'),
]

TOTAL = IMAGEN + TEXTO
cmds = [c for c, _, _, _ in IMAGEN] + [c for c, _ in TEXTO]
assert len(cmds) == len(set(cmds)), 'duplicados internos'
print('lote: %d codigos (%d con plantilla + %d modificadores)' % (len(TOTAL), len(IMAGEN), len(TEXTO)))

def esc(s):
    return s.replace("'", "\\'")

# --- Bloques de inyección (todos con coma final: van delante de una línea que continúa el objeto) ---
lineas_array = ["    ['%s', '%s']," % (esc(c), esc(s)) for c, s, _, _ in IMAGEN]
lineas_array += ["    ['%s', '%s']," % (esc(c), esc(s)) for c, s in TEXTO]
array_texto = ("    // 465-%d (capturas WhatsApp 2026-09-26: iamasivaa, ochrisprado, smarts.ai, profegarcia.ai, canalcarlosalbertob, ninodirector)\n"
               % (464 + len(TOTAL))) + "\n".join(lineas_array) + "\n"

pares = ["'%s': '%s'" % (esc(c), f) for c, _, f, _ in IMAGEN]
pares += ["'%s': 'trucos'" % esc(c) for c, _ in TEXTO]
folder_lines = []
for i in range(0, len(pares), 14):
    folder_lines.append("    " + ", ".join(pares[i:i+14]) + ",")
folder_texto = ("    // 465-%d (capturas WhatsApp 2026-09-26)\n" % (464 + len(TOTAL))) + "\n".join(folder_lines) + "\n"

tpl_lines = []
for c, _, _, t in IMAGEN:
    tpl_lines.append('    "%s": "%s",' % (esc(c), t.replace('"', '\\"')))
tpl_texto = ("    // 465-%d (capturas WhatsApp 2026-09-26)\n" % (464 + len(IMAGEN))) + "\n".join(tpl_lines) + "\n"

PATH = 'E:/ANTIGRAVITY/apps/trickvault/index.html'
src = open(PATH, encoding='utf-8').read()

# verificacion ANTES de inyectar: ningun comando colisiona (minusculas) con los ya existentes
pre = set(m.group(1).lower() for m in re.finditer(r"['\"](/[A-Za-z0-9_\-]+)['\"]", src))
assert len(cmds) == len({c.lower() for c in cmds}), 'colision case-insensitive dentro del lote'
repes = [c for c in cmds if c.lower() in pre]
assert not repes, 'ya existentes: %r' % repes

anclas = [
    ("    ['/story', 'escribir una historia'],\n];", array_texto),
    ("    '/brainstorm': 'trucos', '/story': 'trucos',\n};", folder_texto),
    ('    "/mercury": "Mercury aesthetic image of [OBJETO], liquid chrome metal, flowing reflective surfaces, futuristic elegant design, high-tech luxury look",\n};', tpl_texto),
]
for ancla, texto in anclas:
    assert src.count(ancla) == 1, 'ancla no unica: %r' % ancla[:60]
    src = src.replace(ancla, texto + ancla)

# verificacion: ningun comando colisiona (minusculas) con los ya existentes
assert len(cmds) == len({c.lower() for c in cmds}), 'colision case-insensitive dentro del lote'
open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('inyectado OK en', PATH)
