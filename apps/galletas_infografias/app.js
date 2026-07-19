/**
 * Galletas de Infografías — app.js
 * Catálogo de "galletas" con prompts para generar infografías.
 * Incluye: navegación por categorías, previews CSS, modal de detalle,
 * copiado de prompts e historial de visitas.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════
  // CATÁLOGO DE GALLETAS
  // ═══════════════════════════════════════════
  const CATALOG = [
    // ── ANIMALES ──
    { id:'animales-01',category:'animales',title:'Los 5 Felinos Más Rápidos del Planeta',desc:'Comparativa visual de velocidad, hábitat y tamaño de los felinos más veloces del mundo.',prompt:'Create a vibrant infographic comparing the top 5 fastest felines on Earth: Cheetah, Lion, Tiger, Leopard, and Cougar. Include: top speed in km/h with speedometer-style gauges, weight range, habitat map icons, and a ranking podium. Style: colorful, kid-friendly, with animal silhouette icons. Color palette: orange, gold, brown, cream. Modern flat design with rounded cards. NO text artifacts.',colors:['#F59E0B','#EA580C','#D97706','#FCD34D','#92400E']},
    { id:'animales-02',category:'animales',title:'Guía de Aves Migratorias',desc:'Rutas, distancias y temporadas de las principales aves migratorias del mundo.',prompt:'Design an elegant infographic about migratory birds: Arctic Tern, Barn Swallow, Ruby-throated Hummingbird, and Bar-tailed Godwit. Show migration routes on a simplified world map with dashed lines, distance in kilometers, seasonal timeline, and wingspan comparison. Style: soft watercolor feel, sky blue and white palette with feather motif accents. Clean typography. NO text artifacts.',colors:['#38BDF8','#7DD3FC','#BAE6FD','#0284C7','#E0F2FE']},
    { id:'animales-03',category:'animales',title:'Anatomía del Perro: Guía Visual',desc:'Esqueleto, músculos y sentidos del mejor amigo del hombre explicados visualmente.',prompt:'Create a scientific yet friendly infographic of dog anatomy. Show: skeletal structure (labeled bones), muscle groups, and sensory highlights (smell 10,000x stronger than humans, hearing range, vision spectrum). Use a central dog silhouette with callout lines. Style: clean veterinary textbook aesthetic with warm beige, soft red, and dark brown palette. Educational and accessible. NO text artifacts.',colors:['#D4A574','#8B5E3C','#C68E5B','#5C3A21','#F5DEB3']},
    { id:'animales-04',category:'animales',title:'Vida Marina: Capas del Océano',desc:'Desde la superficie hasta las fosas abisales, qué criaturas viven en cada capa oceánica.',prompt:'Design a deep-sea infographic showing the 5 ocean layers: Epipelagic (sunlight), Mesopelagic (twilight), Bathypelagic (midnight), Abyssopelagic (abyss), Hadalpelagic (trenches). For each layer: depth range in meters, temperature, light level percentage, and representative creatures (jellyfish, anglerfish, giant squid, etc.). Vertical gradient background from light blue to pitch black. Bioluminescent glow effects on deep creatures. Style: National Geographic documentary aesthetic. NO text artifacts.',colors:['#0EA5E9','#0369A1','#1E3A5F','#0F172A','#020617']},
    { id:'animales-05',category:'animales',title:'Abejas: La Colmena por Dentro',desc:'Estructura social, ciclo de vida y producción de miel de las abejas explicado paso a paso.',prompt:'Create a warm, inviting infographic about honeybees and their hive. Show: the three castes (queen, worker, drone) with size comparison, hexagonal honeycomb structure diagram, pollination process in 4 steps, and "1 kg of honey = 4 million flowers visited" fact. Style: golden yellow and warm amber palette, hexagonal grid pattern, friendly illustration style. Honey drip accents. NO text artifacts.',colors:['#FBBF24','#F59E0B','#D97706','#78350F','#FFFBEB']},
    // ── VEHÍCULOS ──
    { id:'vehiculos-01',category:'vehiculos',title:'Evolución del Automóvil: 1886-2026',desc:'Línea de tiempo con los hitos más importantes en la historia del coche.',prompt:'Design a horizontal timeline infographic of automotive evolution from 1886 (Benz Patent-Motorwagen) to 2026 (autonomous EVs). Key milestones: Ford Model T (1908), VW Beetle (1938), Toyota Corolla (1966), Tesla Model S (2012), Waymo autonomous (2020). Each era with car silhouette, top speed, and innovation. Style: retro-futuristic, chrome and dark blue palette, speed lines background. NO text artifacts.',colors:['#1E40AF','#3B82F6','#60A5FA','#DBEAFE','#93C5FD']},
    { id:'vehiculos-02',category:'vehiculos',title:'Comparativa: Coche Eléctrico vs Gasolina',desc:'Coste por km, emisiones, mantenimiento y autonomía comparados en una infografía clara.',prompt:'Create a side-by-side comparison infographic: Electric Car vs Gasoline Car. Compare: cost per 100km (€), CO2 emissions per year (tons), annual maintenance cost, refuel/recharge time, noise level (dB), and average range. Use a split design with green/blue for electric and red/orange for gasoline. Include battery vs engine cutaway diagrams. Style: clean, modern consumer report aesthetic. NO text artifacts.',colors:['#10B981','#059669','#EF4444','#DC2626','#F8FAFC']},
    { id:'vehiculos-03',category:'vehiculos',title:'Boeing 747: El Jumbo por Dentro',desc:'Planos, capacidad, motores y curiosidades del avión comercial más icónico.',prompt:'Design a technical infographic about the Boeing 747. Show: exterior dimensions (wingspan 64.4m, length 70.7m), cross-section cabin layout (First/Business/Economy), engine specs (thrust, fuel consumption), range map from major hubs, and "fun facts" section (6 million parts, 274 km of wiring). Style: aviation blueprint aesthetic, white lines on deep blue background, technical annotations. NO text artifacts.',colors:['#1E3A8A','#2563EB','#60A5FA','#F8FAFC','#BFDBFE']},
    { id:'vehiculos-04',category:'vehiculos',title:'Señales de Tráfico Esenciales',desc:'Guía visual rápida de las señales de tráfico más importantes clasificadas por tipo.',prompt:'Create a clean, educational infographic of essential traffic signs organized by shape: triangles (warning - red border), circles (prohibition - red ring + slash), rectangles (information - blue), and octagon (STOP - red). Show 5-6 examples per category with simple illustrations. Include a "Did you know?" fact about sign shapes being recognizable even when covered in snow. Style: flat vector, high contrast, official road safety aesthetic. NO text artifacts.',colors:['#DC2626','#2563EB','#FBBF24','#FFFFFF','#1F2937']},
    { id:'vehiculos-05',category:'vehiculos',title:'Motos: Tipos y Para Qué Sirven',desc:'Guía visual de los distintos tipos de motocicletas y su uso ideal.',prompt:'Design a motorcycle type guide infographic with 6 categories: Sport, Cruiser, Touring, Adventure, Naked/Standard, and Scooter. For each: silhouette illustration, engine size range (cc), ideal use case (city/track/touring/off-road), seat height, and beginner-friendliness rating (1-5 stars). Style: bold, dynamic, dark background with neon accent lines (like a garage poster). NO text artifacts.',colors:['#1F2937','#374151','#EF4444','#F59E0B','#10B981']},
    // ── CIENCIA Y TECNOLOGÍA ──
    { id:'ciencia-01',category:'ciencia',title:'Sistema Solar a Escala',desc:'Tamaños relativos y distancias de los planetas del Sistema Solar en una vista impresionante.',prompt:'Create an astronomical infographic of the Solar System. Show all 8 planets in relative size comparison (Jupiter dominates, Mercury tiny). Include: distance from Sun in AU, orbital period in Earth days/years, temperature range, number of moons, and type (rocky/gas giant). Add asteroid belt between Mars and Jupiter. Use a dark space background with subtle starfield. Style: NASA-inspired scientific poster with precise data. NO text artifacts.',colors:['#0F172A','#1E1B4B','#312E81','#6366F1','#818CF8']},
    { id:'ciencia-02',category:'ciencia',title:'Cómo Funciona un Agujero Negro',desc:'Horizonte de sucesos, singularidad, disco de acreción y tipos de agujeros negros.',prompt:'Design an astrophysics infographic explaining black holes. Diagram showing: event horizon, singularity, accretion disk, photon sphere, and relativistic jets. Cross-section view with labeled zones. Sidebar with types: stellar-mass, intermediate, supermassive, and primordial. Include "spaghettification" fun fact. Style: cinematic space aesthetic, deep purples and electric blues, glowing orbital lines. NO text artifacts.',colors:['#4C1D95','#7C3AED','#8B5CF6','#A78BFA','#EDE9FE']},
    { id:'ciencia-03',category:'ciencia',title:'IA: Tipos de Inteligencia Artificial',desc:'De los chatbots a la AGI, un mapa visual de los tipos de IA actuales y futuros.',prompt:'Create a futuristic infographic on AI types: Narrow AI (chess engines, voice assistants), Generative AI (ChatGPT, DALL-E), General AI (AGI — theoretical), and Superintelligence. Show capabilities comparison chart (reasoning, creativity, learning, adaptation). Timeline from 1950s (Turing) to present and projected future. Style: cyberpunk neon aesthetic, dark background with circuit traces, glowing cyan and purple nodes. NO text artifacts.',colors:['#06B6D4','#00D0D0','#8B5CF6','#A855F7','#0F172A']},
    { id:'ciencia-04',category:'ciencia',title:'El Cuerpo Humano en Cifras',desc:'Datos sorprendentes sobre el cuerpo humano presentados de forma visual y atractiva.',prompt:'Design a fascinating infographic about the human body in numbers. Highlight: 206 bones (37 trillion cells), 100,000 km of blood vessels (2.5x Earth circumference), brain uses 20% of body energy, heart beats 100,000 times/day, skin is the largest organ (2m²). Use a central human silhouette with callout bubbles. Style: medical illustration meets modern data visualization, clean white and red palette. NO text artifacts.',colors:['#DC2626','#F87171','#FCA5A5','#F8FAFC','#1E293B']},
    { id:'ciencia-05',category:'ciencia',title:'Criptomonedas: Guía para Principiantes',desc:'Qué son, cómo funcionan, blockchain, minería y las principales criptomonedas.',prompt:'Create a beginner-friendly cryptocurrency infographic. Explain: what is blockchain (linked blocks diagram), how mining works (simplified), top 5 cryptocurrencies by market cap (Bitcoin, Ethereum, etc.) with logos and key stats, wallet types (hot vs cold), and a "blockchain in 4 steps" flowchart. Style: modern fintech aesthetic, dark blue with gold/orange accent, clean geometric shapes. NO text artifacts.',colors:['#0F172A','#1E293B','#F7931A','#627EEA','#F8FAFC']},
    // ── NATURALEZA ──
    { id:'naturaleza-01',category:'naturaleza',title:'Tipos de Nubes: Guía de Identificación',desc:'Aprende a identificar las 10 nubes principales por su forma, altitud y lo que predicen.',prompt:'Design a cloud identification infographic showing the 10 main cloud types organized by altitude: High (Cirrus, Cirrocumulus, Cirrostratus), Middle (Altocumulus, Altostratus, Nimbostratus), Low (Stratus, Stratocumulus, Cumulus, Cumulonimbus). For each: altitude range, appearance (fluffy/layered/wispy), and what weather they predict. Style: soft watercolor sky gradient background, airy and light. NO text artifacts.',colors:['#93C5FD','#BFDBFE','#DBEAFE','#60A5FA','#F8FAFC']},
    { id:'naturaleza-02',category:'naturaleza',title:'Volcanes: Cómo Erupcionan',desc:'Tipos de volcanes, partes de un volcán y las erupciones más famosas de la historia.',prompt:'Create a dramatic infographic about volcanoes. Show volcano cross-section with labeled parts: magma chamber, conduit, vent, crater, ash cloud, lava flow. Types comparison: Shield (Mauna Loa), Stratovolcano (Fuji), Cinder Cone (Paricutín), Caldera (Yellowstone). Timeline of famous eruptions: Vesuvius 79 AD, Krakatoa 1883, Mount St. Helens 1980, Eyjafjallajökull 2010. Style: intense reds, oranges, and dark grays, glowing lava effects. NO text artifacts.',colors:['#DC2626','#EA580C','#F97316','#1F2937','#FEE2E2']},
    { id:'naturaleza-03',category:'naturaleza',title:'Ciclo del Agua: El Viaje de una Gota',desc:'Evaporación, condensación, precipitación y escorrentía explicados visualmente.',prompt:'Design a circular infographic showing the water cycle: evaporation (sun heating oceans/lakes), transpiration (plants), condensation (cloud formation), precipitation (rain/snow), collection (rivers/oceans/groundwater). Use a circular flow with arrows connecting each stage. Include fun fact: "The same water dinosaurs drank is still cycling today." Style: fresh, clean, blue and green palette, nature-inspired icons. NO text artifacts.',colors:['#0284C7','#38BDF8','#7DD3FC','#059669','#34D399']},
    { id:'naturaleza-04',category:'naturaleza',title:'Biomas del Mundo: Mapa Visual',desc:'Tundra, taiga, selva, desierto, sabana y más. Características de cada bioma.',prompt:'Create a world map infographic showing major biomes: Tundra, Taiga/Boreal Forest, Temperate Forest, Tropical Rainforest, Grassland/Savanna, Desert, Mediterranean, and Ice Cap. For each biome: temperature range, annual precipitation, representative flora and fauna, and % of Earth surface. Use a color-coded map projection. Style: National Geographic educational poster, rich natural colors. NO text artifacts.',colors:['#166534','#15803D','#CA8A04','#B45309','#0EA5E9']},
    { id:'naturaleza-05',category:'naturaleza',title:'Fotosíntesis: La Fábrica de las Plantas',desc:'Cómo las plantas convierten luz solar en energía, paso a paso y con diagramas.',prompt:'Design an educational infographic explaining photosynthesis. Show the chemical equation (6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂). Diagram of a chloroplast with labeled parts (thylakoid, granum, stroma). Light-dependent vs light-independent reactions. Input/output flow: sunlight + H₂O + CO₂ in → glucose + O₂ out. Include "one tree produces enough O₂ for 2 people" fact. Style: fresh green botanical aesthetic, clean scientific diagrams. NO text artifacts.',colors:['#166534','#22C55E','#86EFAC','#FEF08A','#F8FAFC']},
    // ── COMIDA ──
    { id:'comida-01',category:'comida',title:'Rueda de los Alimentos: Nutrición Visual',desc:'Guía completa de grupos alimenticios, porciones diarias y nutrientes esenciales.',prompt:'Create a colorful nutrition wheel infographic. Show 6 food groups in a circular layout: Fruits, Vegetables, Grains, Proteins, Dairy, and Fats/Oils. For each: recommended daily servings, key nutrients (vitamins, minerals), portion size visual (hand method), and health benefits. Add "balanced plate" diagram (50% veggies/fruits, 25% grains, 25% proteins). Style: warm, appetizing food photography colors, modern USDA-inspired but friendlier. NO text artifacts.',colors:['#EF4444','#F59E0B','#22C55E','#3B82F6','#8B5CF6']},
    { id:'comida-02',category:'comida',title:'Café: Del Grano a la Taza',desc:'Tipos de grano, métodos de preparación y geografía del café mundial explicados.',prompt:'Design a rich, warm infographic about coffee from bean to cup. Show: coffee belt world map (60+ producing countries), Arabica vs Robusta comparison (taste, caffeine, shape), 6 brewing methods (espresso, pour-over, French press, cold brew, Aeropress, moka pot) with grind size and brew time, and roast levels from light to dark with flavor notes. Style: artisan coffee shop aesthetic, browns and creams, chalkboard elements. NO text artifacts.',colors:['#78350F','#92400E','#B45309','#D4A574','#FEF3C7']},
    { id:'comida-03',category:'comida',title:'Especias del Mundo: Origen y Usos',desc:'Mapa mundial de las especias más usadas, su origen geográfico y para qué platos sirven.',prompt:'Create a world-map-based spice guide infographic. Plot 15 major spices on their geographic origin: cinnamon (Sri Lanka), vanilla (Madagascar), saffron (Iran), black pepper (India), paprika (Hungary), cumin (Middle East), etc. For each: flavor profile wheel (sweet/spicy/earthy), common dishes, and health benefit. Use a vintage map aesthetic with warm terracotta, gold, and deep red tones. NO text artifacts.',colors:['#991B1B','#B45309','#D97706','#FCD34D','#FEF3C7']},
    { id:'comida-04',category:'comida',title:'Sushi: Guía Visual Completa',desc:'Tipos de sushi, ingredientes, cortes de pescado y etiqueta japonesa en una infografía.',prompt:'Design an elegant Japanese-inspired infographic about sushi types: Nigiri, Maki, Uramaki, Temaki, Sashimi, and Gunkan. Show cross-section diagrams with ingredients labeled. Fish cutting guide (maguro/tuna, sake/salmon, ebi/shrimp). Soy sauce, wasabi, and ginger etiquette tips. Chopstick do\'s and don\'ts. Style: minimalist Japanese aesthetic, red and black with cream, clean lines and subtle wave patterns. NO text artifacts.',colors:['#DC2626','#1F2937','#F8FAFC','#FDE047','#FEF3C7']},
    { id:'comida-05',category:'comida',title:'Chocolate: Del Cacao a la Tableta',desc:'Proceso de fabricación, tipos de chocolate y datos curiosos sobre el oro marrón.',prompt:'Create a delicious infographic about chocolate production. Show the journey: cacao tree → pod harvest → fermentation → drying → roasting → grinding → conching → tempering → molding. Chocolate types comparison: dark (70%+), milk, white, and ruby (percentages, taste notes). Top producing countries bar chart (Ivory Coast, Ghana, Indonesia). Include "Swiss eat 11 kg chocolate per person/year" fact. Style: rich browns, gold foil accents, premium chocolate box aesthetic. NO text artifacts.',colors:['#451A03','#78350F','#92400E','#D4A574','#FEF3C7']}
  ];

  // ═══════════════════════════════════════════
  // CATEGORÍAS
  // ═══════════════════════════════════════════
  const CATEGORIES = {
    'todas':  { label: 'Todas', icon: '🍪' },
    'animales': { label: 'Animales', icon: '🐾' },
    'vehiculos': { label: 'Vehículos', icon: '🚗' },
    'ciencia':   { label: 'Ciencia y Tecnología', icon: '🔬' },
    'naturaleza': { label: 'Naturaleza', icon: '🌿' },
    'comida':   { label: 'Comida', icon: '🍔' }
  };

  // ═══════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════
  let activeCategory = 'todas';
  let historyManager = null;

  // ═══════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initApp();
      window.__galletas_loaded = true;
    } catch (e) {
      console.error('Error al iniciar Galletas de Infografías:', e);
    }
  });

  async function initApp() {
    try {
      historyManager = new HistoryManager('galletas_infografias');
      await historyManager.init();
      historyManager.onChange(() => {});
    } catch (e) {
      console.warn('Historial no disponible (esperado en local sin PHP):', e.message);
    }
    renderCategories();
    renderCookies();
    setupModal();
    window.__galletas_domready = true;
  }

  // ═══════════════════════════════════════════
  // RENDERIZAR CATEGORÍAS
  // ═══════════════════════════════════════════
  function renderCategories() {
    const container = document.getElementById('category-chips');
    container.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const count = key === 'todas'
        ? CATALOG.length
        : CATALOG.filter(c => c.category === key).length;
      const chip = document.createElement('button');
      chip.className = 'chip' + (key === activeCategory ? ' active' : '');
      chip.setAttribute('data-category', key);
      chip.innerHTML = cat.icon + ' ' + cat.label + ' <span class="chip-count">' + count + '</span>';
      chip.addEventListener('click', () => {
        activeCategory = key;
        renderCategories();
        renderCookies();
      });
      container.appendChild(chip);
    });
  }

  // ═══════════════════════════════════════════
  // RENDERIZAR GALLETAS
  // ═══════════════════════════════════════════
  function renderCookies() {
    const grid = document.getElementById('cookies-grid');
    const empty = document.getElementById('empty-state');
    const filtered = activeCategory === 'todas'
      ? CATALOG
      : CATALOG.filter(c => c.category === activeCategory);
    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = '';
    filtered.forEach(cookie => {
      const card = createCookieCard(cookie);
      grid.appendChild(card);
    });
  }

  function createCookieCard(cookie) {
    const card = document.createElement('article');
    card.className = 'cookie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Abrir galleta: ' + cookie.title);
    const preview = document.createElement('div');
    preview.className = 'cookie-preview';
    preview.innerHTML = generatePreviewHTML(cookie);
    card.appendChild(preview);
    const info = document.createElement('div');
    info.className = 'cookie-info';
    const catTag = document.createElement('span');
    catTag.className = 'cookie-category-tag';
    catTag.textContent = (CATEGORIES[cookie.category]?.icon || '') + ' ' + (CATEGORIES[cookie.category]?.label || cookie.category);
    info.appendChild(catTag);
    const title = document.createElement('h3');
    title.className = 'cookie-title';
    title.textContent = cookie.title;
    info.appendChild(title);
    const desc = document.createElement('p');
    desc.className = 'cookie-desc';
    desc.textContent = cookie.desc;
    info.appendChild(desc);
    const footer = document.createElement('div');
    footer.className = 'cookie-footer';
    footer.innerHTML = '<span class="prompt-len">📝 ' + cookie.prompt.length + ' chars</span><span>🍪 Abrir</span>';
    info.appendChild(footer);
    card.appendChild(info);
    card.addEventListener('click', () => openModal(cookie));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(cookie);
      }
    });
    return card;
  }

  // ═══════════════════════════════════════════
  // GENERAR PREVIEW CSS (mini-infografía)
  // ═══════════════════════════════════════════
  function generatePreviewHTML(cookie) {
    const cols = cookie.colors || ['#00D0D0', '#26C626', '#174F7A', '#99CCCC', '#0E5368'];
    const c1 = cols[0], c2 = cols[1], c3 = cols[2], c4 = cols[3], c5 = cols[4];
    const hash = cookie.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const layout = hash % 5;
    switch (layout) {
      case 0:
        return '<div class="preview-inner"><div class="preview-title-bar" style="background:'+c1+'"></div><div class="preview-block"><div class="preview-col"><div class="preview-bar wide" style="background:'+c2+'"></div><div class="preview-bar w70" style="background:'+c3+'"></div><div class="preview-bar w85" style="background:'+c4+'"></div><div class="preview-bar w50" style="background:'+c5+'"></div></div><div class="preview-col"><div class="preview-bar w50" style="background:'+c5+'"></div><div class="preview-bar w60" style="background:'+c4+'"></div><div class="preview-bar w40" style="background:'+c3+'"></div><div class="preview-bar w70" style="background:'+c2+'"></div></div></div><div class="preview-chart"><div class="preview-chart-bar" style="height:60%;background:'+c1+'"></div><div class="preview-chart-bar" style="height:85%;background:'+c2+'"></div><div class="preview-chart-bar" style="height:45%;background:'+c3+'"></div><div class="preview-chart-bar" style="height:70%;background:'+c4+'"></div><div class="preview-chart-bar" style="height:90%;background:'+c5+'"></div></div></div>';
      case 1:
        return '<div class="preview-inner"><div class="preview-title-bar" style="background:'+c1+';width:55%"></div><div style="display:flex;gap:12px;align-items:center;flex:1"><div class="preview-donut" style="border-color:'+c1+';border-right-color:'+c2+';border-bottom-color:'+c3+'"></div><div style="flex:1;display:flex;flex-direction:column;gap:5px"><div style="display:flex;align-items:center;gap:6px"><div class="preview-dot" style="background:'+c1+'"></div><div class="preview-bar w60" style="background:'+c2+'"></div></div><div style="display:flex;align-items:center;gap:6px"><div class="preview-dot" style="background:'+c3+'"></div><div class="preview-bar w40" style="background:'+c4+'"></div></div><div style="display:flex;align-items:center;gap:6px"><div class="preview-dot" style="background:'+c5+'"></div><div class="preview-bar w50" style="background:'+c1+'"></div></div></div></div><div class="preview-chart"><div class="preview-chart-bar" style="height:50%;background:'+c1+'"></div><div class="preview-chart-bar" style="height:80%;background:'+c2+'"></div><div class="preview-chart-bar" style="height:65%;background:'+c3+'"></div></div></div>';
      case 2:
        return '<div class="preview-inner"><div class="preview-title-bar" style="background:'+c1+'"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;flex:1"><div style="background:'+c2+';border-radius:6px;opacity:0.5;display:flex;align-items:center;justify-content:center"><div class="preview-bar w50" style="background:'+c1+';opacity:0.7"></div></div><div style="background:'+c3+';border-radius:6px;opacity:0.5;display:flex;align-items:center;justify-content:center"><div class="preview-circle" style="border-color:'+c4+'"></div></div><div style="background:'+c4+';border-radius:6px;opacity:0.5;display:flex;align-items:center;justify-content:center"><div class="preview-bar w70" style="background:'+c5+';opacity:0.7"></div></div><div style="background:'+c5+';border-radius:6px;opacity:0.5;display:flex;align-items:center;justify-content:center"><div class="preview-bar w40" style="background:'+c1+';opacity:0.7"></div></div></div><div class="preview-title-bar" style="background:'+c2+';width:45%"></div></div>';
      case 3:
        return '<div class="preview-inner"><div class="preview-title-bar" style="background:'+c1+';width:60%"></div><div style="display:flex;align-items:center;gap:4px;flex:1;padding:0 4px"><div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div class="preview-circle" style="border-color:'+c1+';background:'+c1+';opacity:0.4;width:20px;height:20px"></div><div class="preview-bar w70" style="background:'+c2+'"></div></div><div style="flex:1;height:1px;background:'+c3+';opacity:0.4"></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div class="preview-circle" style="border-color:'+c2+';background:'+c2+';opacity:0.4;width:20px;height:20px"></div><div class="preview-bar w40" style="background:'+c4+'"></div></div><div style="flex:1;height:1px;background:'+c3+';opacity:0.4"></div><div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div class="preview-circle" style="border-color:'+c5+';background:'+c5+';opacity:0.4;width:20px;height:20px"></div><div class="preview-bar w85" style="background:'+c1+'"></div></div></div><div class="preview-chart"><div class="preview-chart-bar" style="height:55%;background:'+c1+'"></div><div class="preview-chart-bar" style="height:75%;background:'+c2+'"></div><div class="preview-chart-bar" style="height:40%;background:'+c3+'"></div><div class="preview-chart-bar" style="height:90%;background:'+c4+'"></div><div class="preview-chart-bar" style="height:60%;background:'+c5+'"></div></div></div>';
      default:
        return '<div class="preview-inner"><div class="preview-title-bar" style="background:'+c1+';width:65%"></div><div style="display:flex;gap:4px;flex:1"><div style="flex:1;display:flex;flex-direction:column;gap:3px"><div style="height:10px;background:'+c2+';border-radius:3px;opacity:0.7"></div><div class="preview-bar wide" style="background:'+c1+';opacity:0.5"></div><div class="preview-bar w70" style="background:'+c3+';opacity:0.5"></div><div class="preview-bar w85" style="background:'+c4+';opacity:0.5"></div><div class="preview-bar w50" style="background:'+c5+';opacity:0.5"></div></div><div style="flex:1;display:flex;flex-direction:column;gap:3px"><div style="height:10px;background:'+c4+';border-radius:3px;opacity:0.7"></div><div class="preview-bar w50" style="background:'+c5+';opacity:0.5"></div><div class="preview-bar w85" style="background:'+c2+';opacity:0.5"></div><div class="preview-bar w60" style="background:'+c3+';opacity:0.5"></div><div class="preview-bar w70" style="background:'+c1+';opacity:0.5"></div></div></div><div class="preview-chart"><div class="preview-chart-bar" style="height:45%;background:'+c1+'"></div><div class="preview-chart-bar" style="height:70%;background:'+c2+'"></div><div class="preview-chart-bar" style="height:55%;background:'+c3+'"></div><div class="preview-chart-bar" style="height:80%;background:'+c4+'"></div><div class="preview-chart-bar" style="height:65%;background:'+c5+'"></div></div></div>';
    }
  }

  // ═══════════════════════════════════════════
  // MODAL
  // ═══════════════════════════════════════════
  let currentModalCookie = null;

  function setupModal() {
    const overlay = document.getElementById('cookie-modal');
    const closeBtn = document.getElementById('modal-close');
    const copyBtn = document.getElementById('btn-copy-prompt');
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    copyBtn.addEventListener('click', copyPrompt);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  function openModal(cookie) {
    currentModalCookie = cookie;
    document.getElementById('modal-preview').innerHTML = generatePreviewHTML(cookie);
    document.getElementById('modal-category').textContent =
      (CATEGORIES[cookie.category]?.icon || '') + ' ' + (CATEGORIES[cookie.category]?.label || cookie.category);
    document.getElementById('modal-title').textContent = cookie.title;
    document.getElementById('modal-desc').textContent = cookie.desc;
    document.getElementById('modal-prompt').value = cookie.prompt;
    document.getElementById('copy-feedback').classList.add('hidden');
    const overlay = document.getElementById('cookie-modal');
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    saveVisit(cookie);
  }

  function closeModal() {
    const overlay = document.getElementById('cookie-modal');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentModalCookie = null;
  }

  async function copyPrompt() {
    if (!currentModalCookie) return;
    const prompt = currentModalCookie.prompt;
    try {
      await navigator.clipboard.writeText(prompt);
      const feedback = document.getElementById('copy-feedback');
      feedback.classList.remove('hidden');
      setTimeout(() => feedback.classList.add('hidden'), 2000);
    } catch (e) {
      const textarea = document.getElementById('modal-prompt');
      textarea.select();
      document.execCommand('copy');
      const feedback = document.getElementById('copy-feedback');
      feedback.classList.remove('hidden');
      setTimeout(() => feedback.classList.add('hidden'), 2000);
    }
  }

  // ═══════════════════════════════════════════
  // HISTORIAL (guardar visitas)
  // ═══════════════════════════════════════════
  async function saveVisit(cookie) {
    if (!historyManager) return;
    try {
      await historyManager.save({
        id: cookie.id,
        title: cookie.title,
        category: cookie.category,
        visitedAt: new Date().toISOString()
      });
    } catch (e) {}
  }

})();