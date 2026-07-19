/**
 * Galletas de Infografías — app.js v2
 * Explora galletas con prompts, escribe tu objeto y genera infografías con FLUX.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════
  // CATÁLOGO DE GALLETAS (prompts en español)
  // ═══════════════════════════════════════════
  const CATALOG = [
    // ── ANIMALES ──
    { id:'animales-01',category:'animales',title:'Los 5 Felinos Más Rápidos del Planeta',desc:'Comparativa visual de velocidad, hábitat y tamaño de los felinos más veloces del mundo.',prompt:'Crea una infografía vibrante comparando los 5 felinos más rápidos del planeta: guepardo, león, tigre, leopardo y puma. Incluye: velocidad máxima en km/h con medidores estilo velocímetro, rango de peso, iconos de mapa de hábitat y un podio de clasificación. Estilo: colorido, apto para niños, con iconos de siluetas de animales. Paleta de colores: naranja, dorado, marrón, crema. Diseño plano moderno con tarjetas redondeadas. SIN texto artificial en la imagen.',colors:['#F59E0B','#EA580C','#D97706','#FCD34D','#92400E']},
    { id:'animales-02',category:'animales',title:'Guía de Aves Migratorias',desc:'Rutas, distancias y temporadas de las principales aves migratorias del mundo.',prompt:'Diseña una infografía elegante sobre aves migratorias: charrán ártico, golondrina común, colibrí garganta de rubí y aguja colipinta. Muestra las rutas de migración en un mapamundi simplificado con líneas punteadas, distancia en kilómetros, línea de tiempo estacional y comparación de envergaduras. Estilo: sensación de acuarela suave, paleta azul cielo y blanco con acentos de plumas. SIN texto artificial en la imagen.',colors:['#38BDF8','#7DD3FC','#BAE6FD','#0284C7','#E0F2FE']},
    { id:'animales-03',category:'animales',title:'Anatomía del Perro: Guía Visual',desc:'Esqueleto, músculos y sentidos del mejor amigo del hombre explicados visualmente.',prompt:'Crea una infografía científica pero amigable de la anatomía del perro. Muestra: estructura ósea (huesos etiquetados), grupos musculares y aspectos sensoriales destacados (olfato 10.000 veces más potente que el humano, rango de audición, espectro de visión). Usa una silueta central de perro con líneas de anotación. Estilo: estética limpia de libro veterinario con paleta beige cálido, rojo suave y marrón oscuro. Educativo y accesible. SIN texto artificial en la imagen.',colors:['#D4A574','#8B5E3C','#C68E5B','#5C3A21','#F5DEB3']},
    { id:'animales-04',category:'animales',title:'Vida Marina: Capas del Océano',desc:'Desde la superficie hasta las fosas abisales, qué criaturas viven en cada capa oceánica.',prompt:'Diseña una infografía de las profundidades marinas mostrando las 5 capas oceánicas: Epipelágica (luz solar), Mesopelágica (crepúsculo), Batipelágica (medianoche), Abisopelágica (abismo) y Hadalpelágica (fosas). Para cada capa: rango de profundidad en metros, temperatura, porcentaje de luz y criaturas representativas (medusas, pez linterna, calamar gigante, etc.). Fondo en degradado vertical de azul claro a negro absoluto. Efectos de brillo bioluminiscente en las criaturas profundas. Estilo: documental de National Geographic. SIN texto artificial en la imagen.',colors:['#0EA5E9','#0369A1','#1E3A5F','#0F172A','#020617']},
    { id:'animales-05',category:'animales',title:'Abejas: La Colmena por Dentro',desc:'Estructura social, ciclo de vida y producción de miel de las abejas.',prompt:'Crea una infografía cálida y acogedora sobre las abejas melíferas y su colmena. Muestra: las tres castas (reina, obrera, zángano) con comparación de tamaños, diagrama de estructura hexagonal del panal, proceso de polinización en 4 pasos, y el dato "1 kg de miel = 4 millones de flores visitadas". Estilo: paleta amarillo dorado y ámbar cálido, patrón de cuadrícula hexagonal, ilustraciones amigables. Detalles de gotas de miel. SIN texto artificial en la imagen.',colors:['#FBBF24','#F59E0B','#D97706','#78350F','#FFFBEB']},
    // ── VEHÍCULOS ──
    { id:'vehiculos-01',category:'vehiculos',title:'Evolución del Automóvil: 1886-2026',desc:'Línea de tiempo con los hitos más importantes en la historia del coche.',prompt:'Diseña una infografía de línea de tiempo horizontal de la evolución del automóvil desde 1886 (Benz Patent-Motorwagen) hasta 2026 (vehículos eléctricos autónomos). Hitos clave: Ford Modelo T (1908), VW Escarabajo (1938), Toyota Corolla (1966), Tesla Model S (2012), Waymo autónomo (2020). Cada era con silueta del coche, velocidad máxima e innovación. Estilo: retro-futurista, paleta cromada y azul oscuro, fondo de líneas de velocidad. SIN texto artificial en la imagen.',colors:['#1E40AF','#3B82F6','#60A5FA','#DBEAFE','#93C5FD']},
    { id:'vehiculos-02',category:'vehiculos',title:'Comparativa: Coche Eléctrico vs Gasolina',desc:'Coste por km, emisiones, mantenimiento y autonomía comparados.',prompt:'Crea una infografía de comparación lado a lado: Coche Eléctrico vs Coche de Gasolina. Compara: coste por 100km (€), emisiones de CO2 al año (toneladas), coste anual de mantenimiento, tiempo de repostaje/recarga, nivel de ruido (dB) y autonomía media. Usa un diseño dividido con verde/azul para eléctrico y rojo/naranja para gasolina. Incluye diagramas de corte de batería vs motor. Estilo: informe de consumo moderno y limpio. SIN texto artificial en la imagen.',colors:['#10B981','#059669','#EF4444','#DC2626','#F8FAFC']},
    { id:'vehiculos-03',category:'vehiculos',title:'Boeing 747: El Jumbo por Dentro',desc:'Planos, capacidad, motores y curiosidades del avión comercial más icónico.',prompt:'Diseña una infografía técnica sobre el Boeing 747. Muestra: dimensiones exteriores (envergadura 64,4m, longitud 70,7m), sección transversal de cabina (First/Business/Economy), especificaciones de motores (empuje, consumo), mapa de alcance desde los principales centros y sección de "curiosidades" (6 millones de piezas, 274 km de cableado). Estilo: estética de plano de aviación, líneas blancas sobre fondo azul profundo, anotaciones técnicas. SIN texto artificial en la imagen.',colors:['#1E3A8A','#2563EB','#60A5FA','#F8FAFC','#BFDBFE']},
    { id:'vehiculos-04',category:'vehiculos',title:'Señales de Tráfico Esenciales',desc:'Guía visual rápida de las señales de tráfico más importantes clasificadas por tipo.',prompt:'Crea una infografía educativa y limpia de señales de tráfico esenciales organizadas por forma: triángulos (peligro - borde rojo), círculos (prohibición - anillo rojo + barra), rectángulos (información - azul) y octógono (STOP - rojo). Muestra 5-6 ejemplos por categoría con ilustraciones simples. Incluye un dato curioso sobre cómo las formas de las señales son reconocibles incluso cubiertas de nieve. Estilo: vectorial plano, alto contraste, estética oficial de seguridad vial. SIN texto artificial en la imagen.',colors:['#DC2626','#2563EB','#FBBF24','#FFFFFF','#1F2937']},
    { id:'vehiculos-05',category:'vehiculos',title:'Motos: Tipos y Para Qué Sirven',desc:'Guía visual de los distintos tipos de motocicletas y su uso ideal.',prompt:'Diseña una infografía guía de tipos de motocicleta con 6 categorías: Deportiva, Custom, Turismo, Aventura, Naked/Standard y Scooter. Para cada una: ilustración de silueta, rango de cilindrada (cc), caso de uso ideal (ciudad/circuito/viaje/todo terreno), altura del asiento y valoración de amigabilidad para principiantes (1-5 estrellas). Estilo: audaz, dinámico, fondo oscuro con líneas de acento neón (como un póster de taller). SIN texto artificial en la imagen.',colors:['#1F2937','#374151','#EF4444','#F59E0B','#10B981']},
    // ── CIENCIA Y TECNOLOGÍA ──
    { id:'ciencia-01',category:'ciencia',title:'Sistema Solar a Escala',desc:'Tamaños relativos y distancias de los planetas del Sistema Solar en una vista impresionante.',prompt:'Crea una infografía astronómica del Sistema Solar. Muestra los 8 planetas en comparación de tamaño relativo (Júpiter domina, Mercurio diminuto). Incluye: distancia al Sol en UA, período orbital en días/años terrestres, rango de temperatura, número de lunas y tipo (rocoso/gigante gaseoso). Añade el cinturón de asteroides entre Marte y Júpiter. Fondo espacial oscuro con campo de estrellas sutil. Estilo: póster científico inspirado en la NASA con datos precisos. SIN texto artificial en la imagen.',colors:['#0F172A','#1E1B4B','#312E81','#6366F1','#818CF8']},
    { id:'ciencia-02',category:'ciencia',title:'Cómo Funciona un Agujero Negro',desc:'Horizonte de sucesos, singularidad, disco de acreción y tipos de agujeros negros.',prompt:'Diseña una infografía de astrofísica explicando los agujeros negros. Diagrama mostrando: horizonte de sucesos, singularidad, disco de acreción, esfera de fotones y chorros relativistas. Vista en sección transversal con zonas etiquetadas. Barra lateral con tipos: masa estelar, intermedio, supermasivo y primordial. Incluye el dato curioso de la "espaguetificación". Estilo: estética espacial cinematográfica, púrpuras profundos y azules eléctricos, líneas orbitales brillantes. SIN texto artificial en la imagen.',colors:['#4C1D95','#7C3AED','#8B5CF6','#A78BFA','#EDE9FE']},
    { id:'ciencia-03',category:'ciencia',title:'IA: Tipos de Inteligencia Artificial',desc:'De los chatbots a la AGI, un mapa visual de los tipos de IA actuales y futuros.',prompt:'Crea una infografía futurista sobre los tipos de IA: IA Estrecha (motores de ajedrez, asistentes de voz), IA Generativa (ChatGPT, DALL-E), IA General (AGI — teórica) y Superinteligencia. Muestra una tabla comparativa de capacidades (razonamiento, creatividad, aprendizaje, adaptación). Línea de tiempo desde los años 50 (Turing) hasta el presente y futuro proyectado. Estilo: estética neón cyberpunk, fondo oscuro con trazas de circuitos, nodos brillantes cian y púrpura. SIN texto artificial en la imagen.',colors:['#06B6D4','#00D0D0','#8B5CF6','#A855F7','#0F172A']},
    { id:'ciencia-04',category:'ciencia',title:'El Cuerpo Humano en Cifras',desc:'Datos sorprendentes sobre el cuerpo humano presentados de forma visual y atractiva.',prompt:'Diseña una infografía fascinante sobre el cuerpo humano en cifras. Destaca: 206 huesos (37 billones de células), 100.000 km de vasos sanguíneos (2,5 veces la circunferencia terrestre), el cerebro usa el 20% de la energía corporal, el corazón late 100.000 veces al día, la piel es el órgano más grande (2m²). Usa una silueta humana central con burbujas de anotación. Estilo: ilustración médica combinada con visualización de datos moderna, paleta limpia blanca y roja. SIN texto artificial en la imagen.',colors:['#DC2626','#F87171','#FCA5A5','#F8FAFC','#1E293B']},
    { id:'ciencia-05',category:'ciencia',title:'Criptomonedas: Guía para Principiantes',desc:'Qué son, cómo funcionan, blockchain, minería y las principales criptomonedas.',prompt:'Crea una infografía amigable para principiantes sobre criptomonedas. Explica: qué es blockchain (diagrama de bloques encadenados), cómo funciona la minería (simplificado), las 5 principales criptomonedas por capitalización de mercado (Bitcoin, Ethereum, etc.) con logotipos y estadísticas clave, tipos de monedero (caliente vs frío) y un diagrama de flujo "blockchain en 4 pasos". Estilo: estética fintech moderna, azul oscuro con acento dorado/naranja, formas geométricas limpias. SIN texto artificial en la imagen.',colors:['#0F172A','#1E293B','#F7931A','#627EEA','#F8FAFC']},
    // ── NATURALEZA ──
    { id:'naturaleza-01',category:'naturaleza',title:'Tipos de Nubes: Guía de Identificación',desc:'Aprende a identificar las 10 nubes principales por su forma, altitud y lo que predicen.',prompt:'Diseña una infografía de identificación de nubes mostrando los 10 tipos principales organizados por altitud: Altas (Cirros, Cirrocúmulos, Cirrostratos), Medias (Altocúmulos, Altoestratos, Nimboestratos), Bajas (Estratos, Estratocúmulos, Cúmulos, Cumulonimbos). Para cada una: rango de altitud, apariencia (esponjosa/en capas/filamentosa) y qué clima predicen. Estilo: fondo de degradado de cielo en acuarela suave, aireado y ligero. SIN texto artificial en la imagen.',colors:['#93C5FD','#BFDBFE','#DBEAFE','#60A5FA','#F8FAFC']},
    { id:'naturaleza-02',category:'naturaleza',title:'Volcanes: Cómo Erupcionan',desc:'Tipos de volcanes, partes de un volcán y las erupciones más famosas de la historia.',prompt:'Crea una infografía impactante sobre volcanes. Muestra el corte transversal de un volcán con partes etiquetadas: cámara magmática, conducto, chimenea, cráter, nube de ceniza, colada de lava. Comparación de tipos: Escudo (Mauna Loa), Estratovolcán (Fuji), Cono de ceniza (Paricutín), Caldera (Yellowstone). Línea de tiempo de erupciones famosas: Vesubio 79 d.C., Krakatoa 1883, Monte Santa Helena 1980, Eyjafjallajökull 2010. Estilo: rojos intensos, naranjas y grises oscuros, efectos de lava brillante. SIN texto artificial en la imagen.',colors:['#DC2626','#EA580C','#F97316','#1F2937','#FEE2E2']},
    { id:'naturaleza-03',category:'naturaleza',title:'Ciclo del Agua: El Viaje de una Gota',desc:'Evaporación, condensación, precipitación y escorrentía explicados visualmente.',prompt:'Diseña una infografía circular mostrando el ciclo del agua: evaporación (sol calentando océanos/lagos), transpiración (plantas), condensación (formación de nubes), precipitación (lluvia/nieve), recolección (ríos/océanos/aguas subterráneas). Usa un flujo circular con flechas conectando cada etapa. Incluye el dato curioso: "La misma agua que bebieron los dinosaurios sigue circulando hoy". Estilo: fresco, limpio, paleta azul y verde, iconos inspirados en la naturaleza. SIN texto artificial en la imagen.',colors:['#0284C7','#38BDF8','#7DD3FC','#059669','#34D399']},
    { id:'naturaleza-04',category:'naturaleza',title:'Biomas del Mundo: Mapa Visual',desc:'Tundra, taiga, selva, desierto, sabana y más. Características de cada bioma.',prompt:'Crea una infografía de mapamundi mostrando los principales biomas: Tundra, Taiga/Bosque Boreal, Bosque Templado, Selva Tropical, Pradera/Sabana, Desierto, Mediterráneo y Casquete Polar. Para cada bioma: rango de temperatura, precipitación anual, flora y fauna representativas y porcentaje de la superficie terrestre. Usa una proyección de mapa codificada por colores. Estilo: póster educativo estilo National Geographic, colores naturales ricos. SIN texto artificial en la imagen.',colors:['#166534','#15803D','#CA8A04','#B45309','#0EA5E9']},
    { id:'naturaleza-05',category:'naturaleza',title:'Fotosíntesis: La Fábrica de las Plantas',desc:'Cómo las plantas convierten luz solar en energía, paso a paso y con diagramas.',prompt:'Diseña una infografía educativa explicando la fotosíntesis. Muestra la ecuación química (6CO₂ + 6H₂O + luz → C₆H₁₂O₆ + 6O₂). Diagrama de un cloroplasto con partes etiquetadas (tilacoide, grana, estroma). Reacciones dependientes e independientes de la luz. Flujo de entrada/salida: luz solar + H₂O + CO₂ entran → glucosa + O₂ salen. Incluye el dato "un árbol produce suficiente O₂ para 2 personas". Estilo: estética botánica verde fresca, diagramas científicos limpios. SIN texto artificial en la imagen.',colors:['#166534','#22C55E','#86EFAC','#FEF08A','#F8FAFC']},
    // ── COMIDA ──
    { id:'comida-01',category:'comida',title:'Rueda de los Alimentos: Nutrición Visual',desc:'Guía completa de grupos alimenticios, porciones diarias y nutrientes esenciales.',prompt:'Crea una colorida infografía de rueda nutricional. Muestra 6 grupos de alimentos en un diseño circular: Frutas, Verduras, Cereales, Proteínas, Lácteos y Grasas/Aceites. Para cada uno: raciones diarias recomendadas, nutrientes clave (vitaminas, minerales), visual de tamaño de porción (método de la mano) y beneficios para la salud. Añade el diagrama del "plato equilibrado" (50% verduras/frutas, 25% cereales, 25% proteínas). Estilo: colores cálidos de fotografía gastronómica, moderno. SIN texto artificial en la imagen.',colors:['#EF4444','#F59E0B','#22C55E','#3B82F6','#8B5CF6']},
    { id:'comida-02',category:'comida',title:'Café: Del Grano a la Taza',desc:'Tipos de grano, métodos de preparación y geografía del café mundial explicados.',prompt:'Diseña una infografía rica y cálida sobre el café del grano a la taza. Muestra: mapamundi del cinturón del café (más de 60 países productores), comparación Arábica vs Robusta (sabor, cafeína, forma), 6 métodos de preparación (espresso, pour-over, prensa francesa, cold brew, Aeropress, cafetera moka) con tamaño de molienda y tiempo, y niveles de tueste de claro a oscuro con notas de sabor. Estilo: estética de cafetería artesanal, marrones y cremas, elementos de pizarra. SIN texto artificial en la imagen.',colors:['#78350F','#92400E','#B45309','#D4A574','#FEF3C7']},
    { id:'comida-03',category:'comida',title:'Especias del Mundo: Origen y Usos',desc:'Mapa mundial de las especias más usadas, su origen geográfico y para qué platos sirven.',prompt:'Crea una guía de especias basada en mapamundi. Sitúa 15 especias principales en su origen geográfico: canela (Sri Lanka), vainilla (Madagascar), azafrán (Irán), pimienta negra (India), pimentón (Hungría), comino (Oriente Medio), etc. Para cada una: rueda de perfil de sabor (dulce/picante/terroso), platos comunes y beneficio para la salud. Usa una estética de mapa vintage con tonos terracota cálidos, dorado y rojo profundo. SIN texto artificial en la imagen.',colors:['#991B1B','#B45309','#D97706','#FCD34D','#FEF3C7']},
    { id:'comida-04',category:'comida',title:'Sushi: Guía Visual Completa',desc:'Tipos de sushi, ingredientes, cortes de pescado y etiqueta japonesa en una infografía.',prompt:'Diseña una elegante infografía de inspiración japonesa sobre los tipos de sushi: Nigiri, Maki, Uramaki, Temaki, Sashimi y Gunkan. Muestra diagramas de sección transversal con ingredientes etiquetados. Guía de corte de pescado (maguro/atún, sake/salmón, ebi/gamba). Consejos de etiqueta sobre salsa de soja, wasabi y jengibre. Lo que se debe y no se debe hacer con los palillos. Estilo: estética minimalista japonesa, rojo y negro con crema, líneas limpias y sutiles patrones de olas. SIN texto artificial en la imagen.',colors:['#DC2626','#1F2937','#F8FAFC','#FDE047','#FEF3C7']},
    { id:'comida-05',category:'comida',title:'Chocolate: Del Cacao a la Tableta',desc:'Proceso de fabricación, tipos de chocolate y datos curiosos sobre el oro marrón.',prompt:'Crea una deliciosa infografía sobre la producción de chocolate. Muestra el viaje: árbol de cacao → cosecha de vainas → fermentación → secado → tostado → molienda → conchado → atemperado → moldeado. Comparación de tipos de chocolate: negro (70%+), con leche, blanco y rubí (porcentajes, notas de sabor). Gráfico de barras de principales países productores (Costa de Marfil, Ghana, Indonesia). Incluye el dato "Los suizos comen 11 kg de chocolate por persona al año". Estilo: marrones ricos, acentos dorados, estética de caja de bombones premium. SIN texto artificial en la imagen.',colors:['#451A03','#78350F','#92400E','#D4A574','#FEF3C7']}
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
  let currentModalCookie = null;
  let generatedImageDataUrl = null;

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
    setupToggleGroups();
    window.__galletas_domready = true;
  }

  // ═══════════════════════════════════════════
  // TOGGLE GROUPS (AR, Resolución, Modelo)
  // ═══════════════════════════════════════════
  function setupToggleGroups() {
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function getToggleValue(groupId) {
    const active = document.querySelector('#' + groupId + ' .toggle-btn.active');
    return active ? active.dataset.value : '';
  }

  function resetToggleGroups() {
    // AR: restaurar a 4:3
    setToggle('ar-toggles', '4:3');
    // Res: restaurar a 1024
    setToggle('res-toggles', '1024');
    // Modelo: restaurar a pro
    setToggle('model-toggles', 'pro');
  }

  function setToggle(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.value === value);
    });
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
  function setupModal() {
    const overlay = document.getElementById('cookie-modal');
    const closeBtn = document.getElementById('modal-close');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeModal();
      }
    });

    // Botón Generar
    document.getElementById('btn-generate').addEventListener('click', generateInfographic);

    // Botón Traducir a Inglés
    document.getElementById('btn-translate').addEventListener('click', translatePrompt);

    // Botón Descargar
    document.getElementById('btn-download').addEventListener('click', downloadResult);
  }

  function openModal(cookie) {
    currentModalCookie = cookie;
    generatedImageDataUrl = null;

    // Limpiar zona de preview (sin CSS preview, esperando imagen generada)
    const resultImg = document.getElementById('result-image');
    resultImg.classList.add('result-image-hidden');
    resultImg.src = '';

    document.getElementById('modal-category').textContent =
      (CATEGORIES[cookie.category]?.icon || '') + ' ' + (CATEGORIES[cookie.category]?.label || cookie.category);
    document.getElementById('modal-title').textContent = cookie.title;
    document.getElementById('modal-desc').textContent = cookie.desc;
    document.getElementById('modal-prompt').value = cookie.prompt;

    // Resetear campo objeto
    document.getElementById('input-subject').value = '';

    // Resetear resultado
    const result = document.getElementById('result-section');
    result.classList.add('hidden');
    document.getElementById('btn-download').classList.add('hidden');

    // Resetear estado de traducción
    document.getElementById('btn-translate').textContent = '🌐 Traducir a Inglés';
    document.getElementById('btn-translate').classList.remove('translated');

    // Resetear toggles a defaults
    resetToggleGroups();

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
    generatedImageDataUrl = null;
  }

  // ═══════════════════════════════════════════
  // GENERAR INFOGRAFÍA CON FLUX
  // ═══════════════════════════════════════════
  async function generateInfographic() {
    if (!currentModalCookie) return;

    const subject = document.getElementById('input-subject').value.trim();
    if (!subject) {
      alert('Por favor, escribe el objeto o tema sobre el que quieres la infografía.');
      return;
    }

    const promptText = document.getElementById('modal-prompt').value;
    // Combinar prompt base con el objeto y forzar español
    const fullPrompt = promptText + ' El tema específico es: ' + subject + '. IMPORTANTE: Todos los textos, etiquetas, datos, leyendas y cualquier palabra visible en la infografía deben estar en español.';

    // Leer ajustes de los toggles
    const ar = getToggleValue('ar-toggles') || '4:3';
    const resolution = parseInt(getToggleValue('res-toggles')) || 1024;
    const quality = getToggleValue('model-toggles') || 'pro';

    // Mostrar loading overlay
    const loading = document.getElementById('loading-overlay');
    loading.classList.remove('hidden');
    loading.style.display = 'flex';
    document.getElementById('loading-text').textContent = 'IA generando lo solicitado...';
    document.getElementById('secondary-status').textContent = 'Creando infografía con FLUX (' + quality.toUpperCase() + ') a ' + resolution + 'px...';

    // Ocultar resultado anterior
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('btn-download').classList.add('hidden');

    try {
      const response = await fetch('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'flux',
          prompt: fullPrompt,
          aspectRatio: ar,
          resolution: resolution,
          quality: quality
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Error desconocido al generar la infografía');
      }

      // Mostrar resultado en la zona superior del modal
      generatedImageDataUrl = data.imageUrl;
      const resultImg = document.getElementById('result-image');
      resultImg.src = data.imageUrl;
      resultImg.classList.remove('result-image-hidden');
      document.getElementById('result-section').classList.remove('hidden');
      document.getElementById('btn-download').classList.remove('hidden');

      // Guardar en historial
      if (historyManager) {
        try {
          await historyManager.save({
            id: currentModalCookie.id + '_' + Date.now(),
            title: currentModalCookie.title,
            category: currentModalCookie.category,
            subject: subject,
            imageData: data.imageUrl,
            prompt: fullPrompt,
            visitedAt: new Date().toISOString()
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error al generar infografía:', err);
      alert('Error al generar la infografía: ' + err.message + '\n\nVerifica que la clave FLUX (F) esté configurada en el .htaccess raíz de Hostinger.');
    } finally {
      loading.classList.add('hidden');
      loading.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════
  // TRADUCIR PROMPT A INGLÉS
  // ═══════════════════════════════════════════
  async function translatePrompt() {
    if (!currentModalCookie) return;

    const promptText = document.getElementById('modal-prompt').value;
    const btn = document.getElementById('btn-translate');

    // Si ya está en inglés, restaurar al español original
    if (btn.classList.contains('translated')) {
      document.getElementById('modal-prompt').value = currentModalCookie.prompt;
      btn.textContent = '🌐 Traducir a Inglés';
      btn.classList.remove('translated');
      return;
    }

    btn.textContent = '🌐 Traduciendo...';
    btn.disabled = true;

    try {
      const response = await fetch('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'translate',
          text: promptText,
          target: 'en'
        })
      });

      const data = await response.json();

      if (data.success && data.translated) {
        document.getElementById('modal-prompt').value = data.translated;
        btn.textContent = '🇪🇸 Restaurar Español';
        btn.classList.add('translated');
      } else {
        throw new Error(data.error?.message || 'Error al traducir');
      }
    } catch (err) {
      console.error('Error al traducir:', err);
      // Fallback: traducción simple con aviso
      alert('No se pudo traducir automáticamente. Usa el prompt en español: FLUX también lo entiende perfectamente.');
    } finally {
      btn.disabled = false;
    }
  }

  // ═══════════════════════════════════════════
  // DESCARGAR RESULTADO
  // ═══════════════════════════════════════════
  function downloadResult() {
    if (!generatedImageDataUrl) return;
    const a = document.createElement('a');
    a.href = generatedImageDataUrl;
    a.download = 'infografia_' + (currentModalCookie?.id || 'generada') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
