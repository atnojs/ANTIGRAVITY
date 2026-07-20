/**
 * Galletas de Infografías — app.js v2
 * Explora galletas con prompts, escribe tu objeto y genera infografías con FLUX.
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════
  // CATÁLOGO DE GALLETAS (prompts en español)
  // ═══════════════════════════════════════════
  // CATÁLOGO SEMILLA (solo para primer inicio, luego se carga del servidor)
  const CATALOG_SEED = [
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
  // CATEGORÍAS (dinámicas, persistidas en localStorage + servidor)
  const CATEGORIES_SEED = {
    'todas':  { label: 'Todas', icon: '🍪' },
    'animales': { label: 'Animales', icon: '🐾' },
    'vehiculos': { label: 'Vehículos', icon: '🚗' },
    'ciencia':   { label: 'Ciencia y Tecnología', icon: '🔬' },
    'naturaleza': { label: 'Naturaleza', icon: '🌿' },
    'comida':   { label: 'Comida', icon: '🍔' }
  };

  let CATEGORIES = {};

  // ═══════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════
  let activeCategory = 'todas';
  let historyManager = null;
  let catalogHM = null;
  let catalog = [];
  let currentModalCookie = null;
  let generatedImageDataUrl = null;
  let pendingUploadCookieId = null;
  let editingCatalogId = null;  // ID de galleta del catálogo en edición (null = nueva)

  // Clave secreta para el catálogo (para no contaminar localStorage)
  const CATALOG_CACHE_KEY = 'gi_catalog_cache';

  // ═══════════════════════════════════════════
  // GESTIÓN DE IMÁGENES EN PREVIEWS (localStorage)
  // ═══════════════════════════════════════════
  const IMG_PREFIX = 'gi_img_';

  function getCookieImage(cookieId) {
    try { return localStorage.getItem(IMG_PREFIX + cookieId); } catch (e) { return null; }
  }

  function setCookieImage(cookieId, dataUrl) {
    try { localStorage.setItem(IMG_PREFIX + cookieId, dataUrl); } catch (e) {
      alert('No se pudo guardar la imagen. El almacenamiento local está lleno. Prueba con una imagen más pequeña.');
      return false;
    }
    return true;
  }

  function removeCookieImage(cookieId) {
    try { localStorage.removeItem(IMG_PREFIX + cookieId); } catch (e) {}
  }

  // Persistencia de imágenes en previews (localStorage) - prompts van en el catálogo

  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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
      await historyManager.load();
      historyManager.onChange(() => {});
    } catch (e) {
      console.warn('Historial no disponible (esperado en local sin PHP):', e.message);
    }

    // Cargar catálogo desde el servidor
    await loadCatalog();
    loadCategories();

    renderCategories();
    renderCookies();
    setupModal();
    setupCookieEditor();
    setupCategoryEditor();
    setupToggleGroups();
    setupPreviewImageUpload();
    window.__galletas_domready = true;
  }

  // ═══════════════════════════════════════════
  // UPLOAD DE IMÁGENES EN PREVIEWS
  // ═══════════════════════════════════════════
  function setupPreviewImageUpload() {
    const input = document.getElementById('preview-image-input');
    input.addEventListener('change', async function() {
      if (!this.files || !this.files[0] || !pendingUploadCookieId) return;
      const file = this.files[0];
      try {
        const dataUrl = await compressImage(file, 800, 0.75);
        if (setCookieImage(pendingUploadCookieId, dataUrl)) {
          // Actualizar TODAS las previews de esta cookie (por si hay varias)
          document.querySelectorAll('.cookie-preview[data-cookie-id="' + pendingUploadCookieId + '"]').forEach(preview => {
            updatePreviewImage(preview, dataUrl);
          });
        }
      } catch (err) {
        console.error('Error al procesar la imagen:', err);
        alert('Error al procesar la imagen. Prueba con otro archivo.');
      }
      pendingUploadCookieId = null;
      this.value = '';
    });
  }

  // ═══════════════════════════════════════════
  // GESTIÓN DEL CATÁLOGO (CRUD persistente)
  // ═══════════════════════════════════════════

  async function loadCatalog() {
    // Intentar cargar del servidor primero
    let serverData = null;
    try {
      catalogHM = new HistoryManager('galletas_catalog');
      await catalogHM.load();
      serverData = catalogHM.getAll();
    } catch (e) {
      console.warn('Catálogo servidor no disponible:', e.message);
    }

    // Si hay datos del servidor, usarlos
    if (serverData && serverData.length > 0) {
      catalog = serverData
        .filter(entry => entry && entry.data && entry.data.title)
        .map(entry => ({
          id: entry.id,
          category: entry.data.category || 'ciencia',
          title: entry.data.title || '',
          desc: entry.data.desc || '',
          prompt: entry.data.prompt || '',
          colors: Array.isArray(entry.data.colors) ? entry.data.colors : []
        }));
      // Cache local por si el servidor no responde después
      try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog)); } catch(e) {}
      return;
    }

    // Intentar cache local
    try {
      const cached = localStorage.getItem(CATALOG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          catalog = parsed;
          return;
        }
      }
    } catch (e) {}

    // Seed: sembrar catálogo inicial desde los datos hardcodeados
    catalog = CATALOG_SEED.map(c => ({...c}));
    await persistCatalog();
  }

  async function persistCatalog() {
    // Guardar en localStorage como caché
    try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog)); } catch(e) {}

    // Guardar en servidor
    if (!catalogHM) return;
    try {
      // Primero borramos las entradas antiguas que ya no existan
      const serverEntries = catalogHM.getAll();
      const currentIds = new Set(catalog.map(c => c.id));
      for (const entry of serverEntries) {
        if (!currentIds.has(entry.id)) {
          try { await catalogHM.delete(entry.id); } catch(e) {}
        }
      }
      // Guardar cada cookie
      for (const cookie of catalog) {
        await catalogHM.save({
          id: cookie.id,
          type: 'cookie',
          data: {
            category: cookie.category,
            title: cookie.title,
            desc: cookie.desc,
            prompt: cookie.prompt,
            colors: cookie.colors || []
          }
        });
      }
    } catch (e) {
      console.warn('No se pudo persistir el catálogo en el servidor:', e.message);
    }
  }

  function findCookieIndex(id) {
    return catalog.findIndex(c => c.id === id);
  }

  function generateCookieId(category) {
    const prefix = category.slice(0, 6);
    const suffix = Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5);
    return prefix + '-' + suffix;
  }

  // ═══════════════════════════════════════════
  // EDITOR DE GALLETA (CRUD modal)
  // ═══════════════════════════════════════════

  function setupCookieEditor() {
    const overlay = document.getElementById('cookie-editor-overlay');
    document.getElementById('btn-ce-save').addEventListener('click', saveCookie);
    document.getElementById('btn-ce-cancel').addEventListener('click', closeCookieEditor);
    document.getElementById('btn-editor-delete').addEventListener('click', deleteCookieFromCatalog);
    document.getElementById('btn-add-cookie').addEventListener('click', () => {
      askPassword().then(ok => { if (ok) openCookieEditor(null); });
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCookieEditor();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeCookieEditor();
      }
    });
  }

  function openCookieEditor(cookie) {
    const overlay = document.getElementById('cookie-editor-overlay');
    const titleEl = document.getElementById('cookie-editor-title');
    const deleteBtn = document.getElementById('btn-editor-delete');
    const catSelect = document.getElementById('ce-category');

    // Poblar selector de categorías dinámicamente
    catSelect.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      if (key === 'todas') return;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = (cat.icon || '') + ' ' + cat.label;
      catSelect.appendChild(opt);
    });

    if (cookie) {
      // Modo edición
      editingCatalogId = cookie.id;
      titleEl.textContent = '✏️ Editar Galleta';
      deleteBtn.classList.remove('hidden');
      document.getElementById('ce-category').value = cookie.category;
      document.getElementById('ce-title').value = cookie.title;
      document.getElementById('ce-desc').value = cookie.desc;
      document.getElementById('ce-prompt').value = cookie.prompt;
      document.getElementById('ce-colors').value = (cookie.colors || []).join(', ');
    } else {
      // Modo nueva
      editingCatalogId = null;
      titleEl.textContent = '🆕 Nueva Galleta';
      deleteBtn.classList.add('hidden');
      document.getElementById('ce-category').value = 'ciencia';
      document.getElementById('ce-title').value = '';
      document.getElementById('ce-desc').value = '';
      document.getElementById('ce-prompt').value = '';
      document.getElementById('ce-colors').value = '';
    }

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('ce-title').focus();
  }

  function closeCookieEditor() {
    document.getElementById('cookie-editor-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    editingCatalogId = null;
  }

  async function saveCookie() {
    const category = document.getElementById('ce-category').value.trim();
    const title = document.getElementById('ce-title').value.trim();
    const desc = document.getElementById('ce-desc').value.trim();
    const prompt = document.getElementById('ce-prompt').value.trim();
    const colorsRaw = document.getElementById('ce-colors').value.trim();

    if (!title) { alert('El título es obligatorio.'); return; }
    if (!desc) { alert('La descripción es obligatoria.'); return; }
    if (!prompt) { alert('El prompt es obligatorio.'); return; }
    if (!category) { alert('Selecciona una categoría.'); return; }

    const colors = colorsRaw
      ? colorsRaw.split(',').map(c => c.trim()).filter(c => /^#[0-9A-Fa-f]{3,8}$/.test(c))
      : [];

    if (editingCatalogId) {
      // Actualizar existente
      const idx = findCookieIndex(editingCatalogId);
      if (idx === -1) { alert('Error: galleta no encontrada.'); return; }
      catalog[idx].category = category;
      catalog[idx].title = title;
      catalog[idx].desc = desc;
      catalog[idx].prompt = prompt;
      catalog[idx].colors = colors;
    } else {
      // Nueva galleta
      const id = generateCookieId(category);
      catalog.push({ id, category, title, desc, prompt, colors });
    }

    await persistCatalog();
    closeCookieEditor();
    renderCategories();
    renderCookies();
  }

  async function deleteCookieFromCatalog() {
    if (!editingCatalogId) return;
    const cookie = catalog.find(c => c.id === editingCatalogId);
    if (!cookie) return;
    if (!confirm('¿Eliminar permanentemente la galleta "' + cookie.title + '"?\n\nEsta acción no se puede deshacer.')) return;

    catalog = catalog.filter(c => c.id !== editingCatalogId);
    removeCookieImage(editingCatalogId);
    await persistCatalog();
    closeCookieEditor();
    renderCategories();
    renderCookies();
  }

  // ═══════════════════════════════════════════
  // GESTIÓN DE CATEGORÍAS (CRUD)
  // ═══════════════════════════════════════════
  const CATS_CACHE_KEY = 'gi_categories_cache';

  function loadCategories() {
    try {
      const cached = localStorage.getItem(CATS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          CATEGORIES = parsed;
          if (!CATEGORIES['todas']) CATEGORIES['todas'] = { label: 'Todas', icon: '🍪' };
          return;
        }
      }
    } catch (e) {}
    CATEGORIES = JSON.parse(JSON.stringify(CATEGORIES_SEED));
    persistCategories();
  }

  function persistCategories() {
    try { localStorage.setItem(CATS_CACHE_KEY, JSON.stringify(CATEGORIES)); } catch(e) {}
  }

  function setupCategoryEditor() {
    document.getElementById('btn-manage-cats').addEventListener('click', () => {
      askPassword().then(ok => { if (ok) openCategoryEditor(); });
    });
    document.getElementById('btn-cecat-save').addEventListener('click', addCategory);
    document.getElementById('btn-cecat-cancel').addEventListener('click', closeCategoryEditor);
    const overlay = document.getElementById('category-editor-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCategoryEditor();
    });
  }

  function openCategoryEditor() {
    const overlay = document.getElementById('category-editor-overlay');
    const list = document.getElementById('category-editor-list');
    document.getElementById('cecat-key').value = '';
    document.getElementById('cecat-label').value = '';
    document.getElementById('cecat-icon').value = '';

    list.innerHTML = '';
    const entries = Object.entries(CATEGORIES).filter(([k]) => k !== 'todas');
    entries.forEach(([key, cat]) => {
      const row = document.createElement('div');
      row.className = 'cat-edit-row';
      row.innerHTML =
        '<span class="cat-icon">' + escapeHTML(cat.icon || '') + '</span>' +
        '<span class="cat-label">' + escapeHTML(cat.label || '') + '</span>' +
        '<span class="cat-key">(' + escapeHTML(key) + ')</span>' +
        '<button class="btn-cat-edit" title="Editar" data-key="' + escapeHTML(key) + '">✏️</button>' +
        '<button class="btn-cat-delete" title="Eliminar" data-key="' + escapeHTML(key) + '">🗑️</button>';
      list.appendChild(row);
    });

    list.querySelectorAll('.btn-cat-edit').forEach(btn => {
      btn.addEventListener('click', () => editCategoryRow(btn.dataset.key, btn.closest('.cat-edit-row')));
    });
    list.querySelectorAll('.btn-cat-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.key));
    });

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryEditor() {
    document.getElementById('category-editor-overlay').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function addCategory() {
    const key = document.getElementById('cecat-key').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const label = document.getElementById('cecat-label').value.trim();
    const icon = document.getElementById('cecat-icon').value.trim();

    if (!key) { alert('La clave es obligatoria (solo letras, números, guiones).'); return; }
    if (!label) { alert('La etiqueta es obligatoria.'); return; }
    if (key === 'todas') { alert('No se puede usar "todas" como clave (está reservada).'); return; }
    if (CATEGORIES[key]) { alert('Ya existe una categoría con la clave "' + key + '".'); return; }

    CATEGORIES[key] = { label: label, icon: icon || '📌' };
    persistCategories();
    openCategoryEditor();
    renderCategories();
  }

  function editCategoryRow(key, row) {
    const cat = CATEGORIES[key];
    if (!cat) return;
    row.innerHTML =
      '<input type="text" class="cat-edit-icon-input" value="' + escapeHTML(cat.icon || '') + '" placeholder="Icono" maxlength="4" style="width:50px;flex:none" />' +
      '<input type="text" class="cat-edit-label-input" value="' + escapeHTML(cat.label || '') + '" placeholder="Etiqueta" />' +
      '<span class="cat-key" style="flex:none">(' + escapeHTML(key) + ')</span>' +
      '<button class="btn-cat-save" title="Guardar">💾</button>' +
      '<button class="btn-cat-cancel" title="Cancelar">✖️</button>';

    row.querySelector('.btn-cat-save').addEventListener('click', () => {
      const newIcon = row.querySelector('.cat-edit-icon-input').value.trim();
      const newLabel = row.querySelector('.cat-edit-label-input').value.trim();
      if (!newLabel) { alert('La etiqueta no puede quedar vacía.'); return; }
      CATEGORIES[key] = { label: newLabel, icon: newIcon || '📌' };
      persistCategories();
      openCategoryEditor();
      renderCategories();
    });
    row.querySelector('.btn-cat-cancel').addEventListener('click', () => openCategoryEditor());
  }

  function deleteCategory(key) {
    if (key === 'todas') { alert('No se puede eliminar la categoría "Todas".'); return; }
    const cat = CATEGORIES[key];
    if (!cat) return;
    const cookieCount = catalog.filter(c => c.category === key).length;
    const msg = cookieCount > 0
      ? 'La categoría "' + cat.label + '" tiene ' + cookieCount + ' galleta(s). Al eliminarla, pasarán a la categoría "ciencia". ¿Continuar?'
      : '¿Eliminar la categoría "' + cat.label + '"?';
    if (!confirm(msg)) return;
    // Reasignar cookies a una categoría existente (preferiblemente ciencia)
    const fallbackCat = CATEGORIES['ciencia'] ? 'ciencia' : Object.keys(CATEGORIES).find(k => k !== 'todas' && k !== key) || 'ciencia';
    catalog.forEach(c => { if (c.category === key) c.category = fallbackCat; });
    persistCatalog();
    delete CATEGORIES[key];
    persistCategories();
    openCategoryEditor();
    renderCategories();
    renderCookies();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updatePreviewImage(preview, dataUrl) {
    // Quitar CSS preview y poner imagen
    preview.querySelector('.preview-inner')?.remove();
    let img = preview.querySelector('.cookie-preview-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'cookie-preview-img';
      img.alt = 'Preview de infografía';
      img.loading = 'lazy';
      // Insertar antes del overlay
      const overlay = preview.querySelector('.preview-upload-overlay');
      if (overlay) {
        preview.insertBefore(img, overlay);
      } else {
        preview.appendChild(img);
      }
    }
    img.src = dataUrl;
    preview.classList.add('has-image');
  }

  function triggerPreviewUpload(cookieId) {
    askPassword().then(ok => {
      if (ok) {
        pendingUploadCookieId = cookieId;
        document.getElementById('preview-image-input').click();
      }
    });
  }

  // ═══════════════════════════════════════════
  // AUTENTICACIÓN PARA SUBIR IMÁGENES
  // ═══════════════════════════════════════════
  const ADMIN_PASSWORD = '0';

  function askPassword() {
    return new Promise((resolve) => {
      const input = prompt('🔐 Contraseña para gestionar imágenes:');
      if (input === null) { resolve(false); return; }
      if (input === ADMIN_PASSWORD) {
        resolve(true);
      } else {
        alert('❌ Contraseña incorrecta.');
        resolve(false);
      }
    });
  }

  function handlePreviewRightClick(e, cookieId) {
    e.preventDefault();
    if (!getCookieImage(cookieId)) return;
    askPassword().then(ok => { if (ok) removeImage(cookieId); });
  }

  function removeImage(cookieId) {
    if (confirm('¿Quitar la imagen de esta galleta?')) {
      removeCookieImage(cookieId);
      renderCookies();
    }
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
    // AR: restaurar a 1:1
    setToggle('ar-toggles', '1:1');
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
        ? catalog.length
        : catalog.filter(c => c.category === key).length;
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
      ? catalog
      : catalog.filter(c => c.category === activeCategory);
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
    preview.setAttribute('data-cookie-id', cookie.id);

    // Comprobar si hay imagen guardada
    const savedImage = getCookieImage(cookie.id);
    if (savedImage) {
      preview.classList.add('has-image');
      const img = document.createElement('img');
      img.className = 'cookie-preview-img';
      img.src = savedImage;
      img.alt = 'Preview de: ' + cookie.title;
      img.loading = 'lazy';
      preview.appendChild(img);
    } else {
      preview.innerHTML = generatePreviewHTML(cookie);
    }

    // Overlay de upload (siempre visible)
    const uploadOverlay = document.createElement('div');
    uploadOverlay.className = 'preview-upload-overlay';
    uploadOverlay.title = 'Clic para subir imagen · Clic derecho para quitar';
    uploadOverlay.innerHTML = '<span class="preview-upload-icon">🖼️</span>';
    uploadOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerPreviewUpload(cookie.id);
    });
    uploadOverlay.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      handlePreviewRightClick(e, cookie.id);
    });
    preview.appendChild(uploadOverlay);

    // También permitir clic derecho en todo el preview
    preview.addEventListener('contextmenu', (e) => {
      if (getCookieImage(cookie.id)) {
        e.stopPropagation();
        handlePreviewRightClick(e, cookie.id);
      }
    });

    // CLIC EN PREVIEW: si hay imagen → lightbox; si no → abrir modal
    preview.addEventListener('click', (e) => {
      const saved = getCookieImage(cookie.id);
      if (saved) {
        e.stopPropagation();
        openLightbox(saved);
      } else {
        openModal(cookie);
      }
    });

    card.appendChild(preview);

    // Info de la galleta (pie)
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
    const promptLen = cookie.prompt.length;
    footer.innerHTML = '<span class=\"prompt-len\">📝 ' + promptLen + ' chars</span><span>🍪 Abrir</span>';

    // Botón editar galleta (CRUD)
    const editCookieBtn = document.createElement('button');
    editCookieBtn.className = 'btn-edit-cookie';
    editCookieBtn.title = 'Editar galleta (requiere contraseña)';
    editCookieBtn.innerHTML = '⚙️';
    editCookieBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      askPassword().then(ok => { if (ok) openCookieEditor(cookie); });
    });
    footer.appendChild(editCookieBtn);

    // Botón eliminar galleta (CRUD)
    const deleteCookieBtn = document.createElement('button');
    deleteCookieBtn.className = 'btn-delete-cookie';
    deleteCookieBtn.title = 'Eliminar galleta (requiere contraseña)';
    deleteCookieBtn.innerHTML = '🗑️';
    deleteCookieBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      askPassword().then(ok => {
        if (!ok) return;
        if (!confirm('¿Eliminar permanentemente la galleta "' + cookie.title + '"?\n\nEsta acción no se puede deshacer.')) return;
        catalog = catalog.filter(c => c.id !== cookie.id);
        removeCookieImage(cookie.id);
        persistCatalog().then(() => {
          renderCategories();
          renderCookies();
        });
      });
    });
    footer.appendChild(deleteCookieBtn);

    info.appendChild(footer);

    // CLIC EN INFO (pie de galleta): siempre abre el modal
    info.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(cookie);
    });
    info.style.cursor = 'pointer';

    card.appendChild(info);

    // Accesibilidad con teclado sobre la card completa
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
      if (e.key === 'Escape') {
        if (!overlay.classList.contains('hidden')) closeModal();
        else closeLightbox();
      }
    });

    // Botón Generar
    document.getElementById('btn-generate').addEventListener('click', generateInfographic);

    // Botón Traducir a Inglés
    document.getElementById('btn-translate').addEventListener('click', translatePrompt);

    // Botón Descargar
    document.getElementById('btn-download').addEventListener('click', downloadResult);

    // Lightbox
    const lb = document.getElementById('image-lightbox');
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLightbox();
    });

    // Editor de galleta (ya incluye el prompt, no hace falta editor separado)
  }

  // ═══════════════════════════════════════════
  // LIGHTBOX (imagen ampliada)
  // ═══════════════════════════════════════════
  function openLightbox(src) {
    const lb = document.getElementById('image-lightbox');
    document.getElementById('lightbox-image').src = src;
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('image-lightbox');
    lb.classList.add('hidden');
    document.getElementById('lightbox-image').src = '';
    if (!document.getElementById('cookie-modal').classList.contains('hidden')) return;
    document.body.style.overflow = '';
  }

  // ═══════════════════════════════════════════
  // APERTURA DEL MODAL

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
    const ar = getToggleValue('ar-toggles') || '1:1';
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
