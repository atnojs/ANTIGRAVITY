/* ============================================================
   AuraStudio — Premium AI Image Workspace
   app.js — Lógica completa en vanilla JS
   ============================================================ */

(function () {
  'use strict';

  // ===================== DATA =====================

  const VISUAL_STYLES = [
    { id: 'photorealistic', name: 'Fotorrealista', thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=240&h=240&q=80', description: 'Calidad DSLR con iluminación natural orgánica, maestría en resolución de 8k' },
    { id: 'cinematic', name: 'Cinematográfico', thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=240&h=240&q=80', description: 'Destellos anamórficos, atmósfera de niebla profunda, escala narrativa épica' },
    { id: '3d commercial', name: 'Comercial 3D', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=240&h=240&q=80', description: 'Renders pulidos de Octane, productos de plástico, arcilla y vidrio vibrantes' },
    { id: 'anime', name: 'Anime', thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=240&h=240&q=80', description: 'Fondos de acuarela de estudio, trazos digitales nítidos y futuristas' },
    { id: 'minimalist logo', name: 'Logotipo Minimalista', thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=240&h=240&q=80', description: 'Formas matemáticas limpias, marca vectorial, simplicidad de alta gama' },
    { id: 'cyberpunk', name: 'Cyberpunk', thumbnail: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=240&h=240&q=80', description: 'Corredores de tecnología cargados de neón, pantallas holográficas, calles mojadas' },
    { id: 'editorial fashion', name: 'Moda Editorial', thumbnail: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=240&h=240&q=80', description: 'Prendas estilizadas de alta costura, poses dramáticas y poses de moda' },
    { id: 'watercolor', name: 'Acuarela Artística', thumbnail: 'https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?auto=format&fit=crop&w=240&h=240&q=80', description: 'Manchas de acuarela fluida, bordes suaves, transparencias etéreas y lavados de color' },
    { id: 'oil-painting', name: 'Pintura al Óleo', thumbnail: 'https://images.unsplash.com/photo-1578926281977-8bce40a28f76?auto=format&fit=crop&w=240&h=240&q=80', description: 'Pinceladas texturizadas, empastes gruesos, claroscuro clásico, profundidad de galería' },
    { id: 'pixel-art', name: 'Pixel Art', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=240&h=240&q=80', description: 'Estética retro 8-bit/16-bit, cuadrícula visible, paletas limitadas, encanto nostálgico' },
    { id: 'pencil-sketch', name: 'Boceto a Lápiz', thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=240&h=240&q=80', description: 'Trazos de grafito expresivos, sombreado cruzado, textura de papel, estudio artístico' },
    { id: 'pop-art', name: 'Arte Pop', thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=240&h=240&q=80', description: 'Colores saturados, patrones de semitonos, estética cómic, estilo Warhol vibrante' },
    { id: 'steampunk', name: 'Steampunk', thumbnail: 'https://images.unsplash.com/photo-1599664146284-a074fe4cf7ea?auto=format&fit=crop&w=240&h=240&q=80', description: 'Latón pulido, engranajes victorianos, vapor y relojería, ciencia ficción retrospectiva' },
    { id: 'surrealism', name: 'Surrealismo', thumbnail: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=240&h=240&q=80', description: 'Paisajes oníricos imposibles, escalas distorsionadas, relojes derretidos, lógica de sueños' }
  ];

  const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1 Cuadrado', subLabel: 'Publicaciones estándar, avatares de perfil', displayRatio: '1:1', icon: 'fa-square' },
    { id: '16:9', label: '16:9 Cine (YouTube)', subLabel: 'Video de pantalla ancha, fondo de escritorio', displayRatio: '16:9', icon: 'fa-tv' },
    { id: '9:16', label: '9:16 Vertical (Reels)', subLabel: 'Tamaños de pantalla móvil, historias de IG', displayRatio: '9:16', icon: 'fa-mobile-screen' },
    { id: '4:5', label: '4:5 Retrato', subLabel: 'Feed estándar, diseño de alta altura', displayRatio: '4:5', icon: 'fa-image' }
  ];

  const INITIAL_GALLERY = [
    { id: 'init-1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', prompt: 'Escultura abstracta fluida en 3D, capas de vidrio coloridas con iluminación ambiental suave y formas de arcilla, presentación corporativa minimalista, renderizado visual prístino', style: 'Comercial 3D', aspectRatio: '1:1', seed: 4892019384, steps: 50, cfgScale: 7.5, sampler: 'DPM++ 2M SDE Karras', generationTime: '1.12s', description: 'Simulación física fluida que muestra dispersión cromática dentro de formas de vidrio en capas.', tags: ['Render 3D', 'Vibrante', 'Efecto Vidrio', 'Abstracto'], referenceImage: null, createdAt: '2026-05-27T18:00:00Z' },
    { id: 'init-2', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80', prompt: 'Personaje de anime futurista mirando hacia una avenida de Tokio empapada de neón, visor con pantalla holográfica, texturas de pintura dinámica de alto contraste, púrpuras y rosas profundos', style: 'Anime', aspectRatio: '9:16', seed: 2210495811, steps: 60, cfgScale: 8.0, sampler: 'DPM++ 2M SDE Karras', generationTime: '1.42s', description: 'Paisaje de anime que resalta carteles de neón refractados en prendas de vinilo mojadas.', tags: ['Cyberpunk', 'Vocaloid', 'Studio Ghibli', 'Fondo Móvil'], referenceImage: null, createdAt: '2026-05-27T18:30:00Z' },
    { id: 'init-3', url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80', prompt: 'Cresta brumosa cinematográfica con dramática retroiluminación cálida que se dispersa a través del bosque de pinos, plano panorámica extremo, profundidad atmosférica, filmado con Arri Alexa', style: 'Cinematográfico', aspectRatio: '16:9', seed: 9811029312, steps: 45, cfgScale: 7.0, sampler: 'Euler Ancestral', generationTime: '0.95s', description: 'Paisaje atmosférico con capas profundas de niebla que crean relaciones de profundidad cinematográficas.', tags: ['Paisaje', 'Brumoso', 'Cine', 'Amanecer'], referenceImage: null, createdAt: '2026-05-27T19:00:00Z' },
    { id: 'init-4', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', prompt: 'Look de alta costura vanguardista en modelo profesional, posado dramático lateral con sombras suaves, caída dinámica de tela de alto contraste, fotografía de moda editorial de lujo', style: 'Moda Editorial', aspectRatio: '4:5', seed: 3340129845, steps: 55, cfgScale: 7.5, sampler: 'DPM++ 2M SDE Karras', generationTime: '1.29s', description: 'Look de alta costura que destaca los pliegues de lino estructurales y posados dramáticos.', tags: ['Alta Costura', 'Vogue', 'Retrato Modelo', 'Modos Estudio'], referenceImage: null, createdAt: '2026-05-27T19:40:00Z' },
    { id: 'init-5', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80', prompt: 'Primer plano extremo macro del retrato del sistema de lentes de una cámara profesional, engranajes de latón brillantes, elementos internos que analizan puntos de luz microscópicos, realismo puro profunda 8k', style: 'Fotorrealista', aspectRatio: '1:1', seed: 7759283912, steps: 50, cfgScale: 6.5, sampler: 'Euler Ancestral', generationTime: '1.15s', description: 'Captura fotográfica macro de equipamiento de hardware premium altamente denso.', tags: ['Macro de Lente', 'Hasselblad', 'Realismo', 'Mecánico'], referenceImage: null, createdAt: '2026-05-27T20:10:00Z' },
    { id: 'init-6', url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1200&q=80', prompt: 'Imponentes megaestructuras cyberpunk que brillan con hologramas corporativos de neón, vista aérea panorámica, diseño denso de ciberciudad, iluminación clave dramática, fotorrealista octane 8k', style: 'Cyberpunk', aspectRatio: '16:9', seed: 6659102834, steps: 50, cfgScale: 7.8, sampler: 'DPM++ 2M SDE Karras', generationTime: '1.34s', description: 'Línea de horizonte corporativa del futuro envuelta por emisiones de neón y columnas de niebla densa.', tags: ['Ciberciudad', 'Neón', 'Metrópolis', 'Render de Octane'], referenceImage: null, createdAt: '2026-05-27T20:45:00Z' }
  ];

  const STYLE_IMAGE_POOL = {
    cyberpunk: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop'
    ],
    photorealistic: [
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop'
    ],
    cinematic: [
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop'
    ],
    '3d commercial': [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop'
    ],
    anime: [
      'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop'
    ],
    'minimalist logo': [
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'
    ],
    'editorial fashion': [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1481824429379-07aa5e5b0739?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop'
    ],
    watercolor: [
      'https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop'
    ],
    'oil-painting': [
      'https://images.unsplash.com/photo-1578926281977-8bce40a28f76?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518997554305-5eea2f04e384?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1531913764164-f85c3cc1dd10?q=80&w=1200&auto=format&fit=crop'
    ],
    'pixel-art': [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=1200&auto=format&fit=crop'
    ],
    'pencil-sketch': [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578926281977-8bce40a28f76?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?q=80&w=1200&auto=format&fit=crop'
    ],
    'pop-art': [
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop'
    ],
    steampunk: [
      'https://images.unsplash.com/photo-1599664146284-a074fe4cf7ea?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518997554305-5eea2f04e384?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop'
    ],
    surrealism: [
      'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop'
    ]
  };

  // ===================== STATE =====================

  const STORAGE_KEY = 'aurastudio_gallery';

  const state = {
    currentTab: 'generator',
    sidebarCollapsed: false,
    mobileSettingsOpen: false,
    settings: {
      prompt: '',
      styleId: 'photorealistic',
      aspectRatioId: '1:1',
      referenceImage: null,
      steps: 50,
      cfgScale: 7.5,
      sampler: 'DPM++ 2M SDE Karras'
    },
    images: [],
    isGenerating: false,
    isOptimizing: false,
    selectedImage: null,
    inpaintingImage: null,
    brushedPoints: [],
    isBrushing: false
  };

  // ===================== DOM REFS =====================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    sidebar: $('#sidebar'),
    mainContent: $('#main-content'),
    settingsPanel: $('#settings-panel'),
    headerBadge: $('#header-badge'),
    workspaceMain: $('#workspace-main'),

    // Prompt
    promptInput: $('#prompt-input'),
    styleBadge: $('#style-badge'),
    btnOptimize: $('#btn-optimize'),
    btnGenerate: $('#btn-generate'),

    // Settings panel
    aspectGrid: $('#aspect-grid'),
    aspectBadge: $('#aspect-badge'),
    cfgSlider: $('#cfg-slider'),
    cfgValue: $('#cfg-value'),
    stepsSlider: $('#steps-slider'),
    stepsValue: $('#steps-value'),
    samplerSelect: $('#sampler-select'),

    // Dropzone
    dropzone: $('#dropzone'),
    dropzoneEmpty: $('#dropzone-empty'),
    dropzonePreview: $('#dropzone-preview'),
    refPreviewImg: $('#ref-preview-img'),
    refFileInput: $('#ref-file-input'),
    btnClearRef: $('#btn-clear-ref'),

    // Tabs
    tabGenerator: $('#tab-generator'),
    tabGallery: $('#tab-gallery'),
    tabExplore: $('#tab-explore'),
    tabModels: $('#tab-models'),
    tabSettings: $('#tab-settings'),
    tabDocs: $('#tab-docs'),

    // Results
    generatorResultsArea: $('#generator-results-area'),
    galleryTabContent: $('#gallery-tab-content'),

    // Modals
    imageModal: $('#image-modal'),
    modalContent: $('#modal-content'),
    inpaintModal: $('#inpaint-modal'),
    inpaintContent: $('#inpaint-content'),

    // Mobile
    mobileNav: $('#mobile-nav'),
    mobileSheetOverlay: $('#mobile-sheet-overlay'),
    mobileSheetContent: $('#mobile-settings-content'),
    btnMobileSettings: $('#btn-mobile-settings'),

    // Sidebar
    toggleSidebar: $('#toggle-sidebar'),
    toggleIcon: $('#toggle-icon'),
    brandText: $('#brand-text'),
    sidebarUserInfo: $('#sidebar-user-info'),
    navLabelWork: $('#nav-label-work'),
    navLabelConf: $('#nav-label-conf'),

    // Settings tab
    settingCollapseSidebar: $('#setting-collapse-sidebar'),
  };

  // ===================== PERSISTENCIA (HistoryManager server-side + localStorage fallback) =====================

  function loadImages() {
    HistoryManager.configure({ dbName: 'aurastudio_db' });
    HistoryManager.init()
      .then(() => HistoryManager.loadAll())
      .then(items => {
        if (items && items.length > 0) {
          state.images = items.map(item => ({
            id: item.id,
            url: item.url,
            prompt: item.prompt || '',
            createdAt: item.createdAt || Date.now()
          }));
        } else {
          // Fallback a localStorage
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            state.images = saved ? JSON.parse(saved) : [...INITIAL_GALLERY];
            // Migrar datos existentes al servidor
            state.images.forEach(img => {
              HistoryManager.saveItem({
                id: img.id || 'as_' + Date.now(),
                url: img.url || '',
                prompt: img.prompt || '',
                createdAt: img.createdAt || Date.now()
              });
            });
          } catch (e) {
            state.images = [...INITIAL_GALLERY];
          }
        }
        updateAllViews();
      });
  }

  function saveImageToHistory(img) {
    HistoryManager.saveItem({
      id: img.id,
      url: img.url || '',
      prompt: img.prompt || '',
      createdAt: img.createdAt || Date.now()
    });
    // Mantener localStorage como backup
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.images));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  }

  // ===================== API CALLS =====================

  async function callProxy(action, data) {
    try {
      const res = await fetch('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Proxy error ' + res.status + ':', text.substring(0, 200));
        throw new Error('Servidor respondió con error ' + res.status);
      }

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await res.text();
        console.error('Proxy devolvió no-JSON:', text.substring(0, 200));
        throw new Error('El proxy no devolvió JSON. ¿PHP está ejecutándose?');
      }

      const json = await res.json();
      return json;
    } catch (e) {
      console.error('Error de conexión con proxy:', e.message);
      throw e;
    }
  }

  function getActiveStyleName() {
    const s = VISUAL_STYLES.find(st => st.id === state.settings.styleId);
    return s ? s.name : 'Fotorrealista';
  }

  // Optimize prompt
  async function optimizePrompt() {
    const prompt = state.settings.prompt.trim();
    if (!prompt) return;

    state.isOptimizing = true;
    updateOptimizeButton();

    try {
      const data = await callProxy('optimize', {
        prompt: prompt,
        style: getActiveStyleName(),
        model: 'gemini-3.1-flash-preview'
      });

      // Gemini returns candidates[0].content.parts[0].text
      let optimized = null;
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts;
        if (parts && parts[0] && parts[0].text) {
          optimized = parts[0].text.trim();
        }
      }

      if (optimized) {
        state.settings.prompt = optimized;
        dom.promptInput.value = optimized;
      } else if (data.error) {
        // Fallback offline
        state.settings.prompt = applyOfflineOptimize(prompt, getActiveStyleName());
        dom.promptInput.value = state.settings.prompt;
      }
    } catch (e) {
      console.error(e);
      // Offline fallback
      state.settings.prompt = applyOfflineOptimize(prompt, getActiveStyleName());
      dom.promptInput.value = state.settings.prompt;
    } finally {
      state.isOptimizing = false;
      updateOptimizeButton();
    }
  }

  function applyOfflineOptimize(prompt, style) {
    const fallbacks = {
      cyberpunk: ', cybernetic augmentations, neon-drenched background, rain-reflecting streets, dramatic synthwave lighting, highly detailed cyber-enhanced aesthetic, cinematic composition, Octane render 8k.',
      photorealistic: ', ultra-high resolution photography, shot on Hasselblad 100MP, award-winning lighting, extremely sharp details, natural volumetric shadows, photorealistic texture replication.',
      cinematic: ', sweeping cinematic horizon, premium anamorphic camera lens anamorphic flare, dramatic rim lighting, epic atmospheric mood, masterpiece cinematography.',
      anime: ', high-fidelity anime illustration, studio Ghibli aesthetic, vibrant hand-painted color washes, dramatic lighting, sharp line-art details.',
      editorial: ', haute couture editorial fashion shoot, dramatic posing, professional high-fashion lighting, Vogue portrait style, high-end production layout.',
      watercolor: ', fluid watercolor washes, soft bleeding edges, luminous transparency, ethereal pigment diffusion, artistic paper texture, delicate wet-on-wet technique.',
      'oil-painting': ', rich impasto brushstrokes, classical chiaroscuro lighting, gallery-quality oil on canvas, deep textural palette knife marks, old masters aesthetic.',
      'pixel-art': ', retro 8-bit pixel aesthetic, clean pixel grid, limited color palette, sprite art style, nostalgic video game visual, crisp blocky edges.',
      'pencil-sketch': ', expressive graphite strokes, fine cross-hatching, textured sketch paper, artistic study rendering, architectural draftsmanship, tonal charcoal shading.',
      'pop-art': ', vibrant saturated colors, bold ben-day halftone dots, comic book aesthetic, Warhol-style repetition, high-contrast pop culture imagery, screen print texture.',
      steampunk: ', polished brass and copper mechanical details, intricate victorian-era clockwork gears, industrial steam-powered machinery, retro-futuristic aesthetic, warm metallic glow.',
      surrealism: ', dreamlike impossible landscapes, distorted scales and proportions, melting objects, subconscious symbolism, Dalí-esque visual poetry, reality-bending compositions.'
    };
    const key = (style || '').toLowerCase();
    let suffix = ', altamente detallado, iluminación volumétrica, renderizado octane asombroso, definición ultra alta, galardonado, obra maestra.';
    for (const [k, v] of Object.entries(fallbacks)) {
      if (key.includes(k)) { suffix = v; break; }
    }
    return `[Optimizado] ${prompt}${suffix}`;
  }

  // Helper: genera una sola imagen via proxy y devuelve datos listos para guardar
  async function generateSingleImage(prompt, styleName) {
    const imgResult = await callProxy('generate-image', {
      prompt: prompt,
      style: styleName,
      aspectRatio: state.settings.aspectRatioId,
      referenceImage: state.settings.referenceImage
    });

    if (imgResult && imgResult.error) throw new Error(imgResult.error);

    let imageUrl = '';
    if (imgResult.image) {
      imageUrl = `data:${imgResult.mimeType || 'image/png'};base64,${imgResult.image}`;
    } else if (imgResult.imageUrl) {
      imageUrl = imgResult.imageUrl;
    } else {
      throw new Error('El modelo no devolvió datos de imagen.');
    }

    let description = imgResult.description || '';
    let tags = [styleName, 'IA Generada', 'Aura Gen-3', 'Ultra HD'];

    // Enriquecer con tags de Gemini
    try {
      const tagData = await callProxy('generate', {
        prompt: prompt,
        style: styleName,
        model: 'gemini-3.1-flash-preview'
      });
      if (tagData.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
          const parsed = JSON.parse(tagData.candidates[0].content.parts[0].text.trim());
          if (parsed.coolTags?.length) tags = parsed.coolTags;
          if (parsed.visualizationDescription && !description) description = parsed.visualizationDescription;
        } catch (e) { /* mantener defaults */ }
      }
    } catch (e) {
      console.warn('Enriquecimiento de tags falló:', e.message);
    }

    if (!description) {
      description = `Arte visual que captura "${prompt}" con estética ${styleName}.`;
    }

    return { imageUrl, description, tags };
  }

  // Generate image — genera 2 imágenes secuencialmente
  async function generateImage() {
    const prompt = state.settings.prompt.trim();
    if (!prompt) return;

    state.isGenerating = true;
    updateGenerateButton();
    renderGeneratorResults();

    const overlay = document.getElementById('generation-loading-overlay');
    const progressBar = document.getElementById('loading-progress-bar');
    const progressPercent = document.getElementById('loading-percentage-text');
    const progressStep = document.getElementById('loading-step-text');
    const loadingTitle = document.getElementById('loading-title');
    const loadingSubtitle = document.getElementById('loading-subtitle');

    if (overlay) {
      overlay.classList.remove('hidden');
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';
      if (progressStep) progressStep.textContent = 'Inicializando motor neural...';
      if (loadingTitle) loadingTitle.textContent = 'Forjando tu imaginación...';
      if (loadingSubtitle) loadingSubtitle.textContent = 'El motor de AuraStudio está modelando cada píxel de tu obra de arte.';
    }

    let currentProgress = 0;

    function updateProgress(percent, stepText) {
      currentProgress = percent;
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressStep && stepText) progressStep.textContent = stepText;
    }

    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 5) + 1;
        if (currentProgress > 90) currentProgress = 90;
        if (progressBar) progressBar.style.width = `${currentProgress}%`;
        if (progressPercent) progressPercent.textContent = `${currentProgress}%`;
      }
    }, 500);

    const styleName = getActiveStyleName();

    try {
      // === PRIMERA IMAGEN ===
      if (loadingTitle) loadingTitle.textContent = 'Esculpiendo 1ª obra maestra...';
      if (loadingSubtitle) loadingSubtitle.textContent = 'El motor Aura está componiendo la primera imagen a partir de tu prompt.';
      updateProgress(5, 'Inicializando motor neural...');

      const result1 = await generateSingleImage(prompt, styleName);

      const newImage1 = {
        id: 'gen-' + Date.now(),
        url: result1.imageUrl,
        prompt: prompt,
        style: styleName,
        aspectRatio: state.settings.aspectRatioId,
        seed: Math.floor(1000000000 + Math.random() * 9000000000),
        steps: state.settings.steps,
        cfgScale: state.settings.cfgScale,
        sampler: state.settings.sampler,
        generationTime: (0.9 + Math.random() * 0.8).toFixed(2) + 's',
        description: result1.description,
        tags: result1.tags,
        referenceImage: state.settings.referenceImage,
        createdAt: new Date().toISOString()
      };

      state.images.unshift(newImage1);
      saveImageToHistory(newImage1);

      // === SEGUNDA IMAGEN (variación) ===
      updateProgress(48, 'Primera obra completada. Iniciando variación...');
      if (loadingTitle) loadingTitle.textContent = 'Creando variación artística...';
      if (loadingSubtitle) loadingSubtitle.textContent = 'Generando una composición alternativa para expandir tu galería.';

      const variationPrompts = [
        prompt + ', variación alternativa con composición diferente y ángulo distinto',
        prompt + ', reinterpretación creativa con nueva perspectiva y encuadre único',
        prompt + ', versión alternativa con iluminación y atmósfera diferentes',
        prompt + ', segunda composición con arreglo espacial y enfoque distintos'
      ];
      const variationPrompt = variationPrompts[Math.floor(Math.random() * variationPrompts.length)];

      const result2 = await generateSingleImage(variationPrompt, styleName);

      // Pequeña pausa para que el id sea distinto
      await new Promise(r => setTimeout(r, 100));

      const newImage2 = {
        id: 'gen-' + Date.now(),
        url: result2.imageUrl,
        prompt: prompt,
        style: styleName,
        aspectRatio: state.settings.aspectRatioId,
        seed: Math.floor(1000000000 + Math.random() * 9000000000),
        steps: state.settings.steps,
        cfgScale: state.settings.cfgScale,
        sampler: state.settings.sampler,
        generationTime: (0.9 + Math.random() * 0.8).toFixed(2) + 's',
        description: result2.description,
        tags: result2.tags,
        referenceImage: state.settings.referenceImage,
        createdAt: new Date().toISOString()
      };

      state.images.unshift(newImage2);
      saveImageToHistory(newImage2);

      // Completar barra
      clearInterval(progressInterval);
      updateProgress(100, '¡2 obras maestras completadas!');
      if (loadingTitle) loadingTitle.textContent = '¡Galería expandida!';
      if (loadingSubtitle) loadingSubtitle.textContent = 'Dos nuevas obras de arte se han añadido a tu colección.';

    } catch (e) {
      clearInterval(progressInterval);
      console.error('Error generando imagen:', e);
      alert('Error al generar imagen: ' + e.message);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        if (overlay) overlay.classList.add('hidden');
        state.isGenerating = false;
        updateGenerateButton();
        renderGeneratorResults();
        renderGalleryTab();
      }, 700);
    }
  }

  // ===================== RENDER =====================

  function updateOptimizeButton() {
    const hasPrompt = state.settings.prompt.trim().length > 0;
    dom.btnOptimize.disabled = !hasPrompt || state.isOptimizing;
    if (state.isOptimizing) {
      dom.btnOptimize.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizando Prompt...';
    } else {
      dom.btnOptimize.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mejorar Redacción';
    }
  }

  function updateGenerateButton() {
    const hasPrompt = state.settings.prompt.trim().length > 0;
    dom.btnGenerate.disabled = !hasPrompt || state.isGenerating;

    if (state.isGenerating) {
      dom.btnGenerate.className = 'btn-generate';
      dom.btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Esculpiendo imaginación...';
    } else if (hasPrompt) {
      dom.btnGenerate.className = 'btn-generate active';
      dom.btnGenerate.innerHTML = '<i class="fa-solid fa-bolt"></i> Generar Imagen <i class="fa-solid fa-arrow-right"></i>';
    } else {
      dom.btnGenerate.className = 'btn-generate';
      dom.btnGenerate.innerHTML = '<i class="fa-solid fa-bolt"></i> Generar Imagen <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  // Styles carousel
  let carouselArrowsSetup = false;

  function renderStylesCarousel() {
    const container = $('#styles-carousel');
    if (!container) return;

    // Configurar flechas de navegación (solo la primera vez)
    if (!carouselArrowsSetup) {
      const wrapper = document.createElement('div');
      wrapper.className = 'carousel-wrapper';
      container.parentNode.insertBefore(wrapper, container);
      wrapper.appendChild(container);

      // Flecha izquierda
      const leftArrow = document.createElement('button');
      leftArrow.className = 'carousel-arrow carousel-arrow-left';
      leftArrow.setAttribute('aria-label', 'Ver estilos anteriores');
      leftArrow.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
      leftArrow.addEventListener('click', () => {
        container.scrollBy({ left: -280, behavior: 'smooth' });
      });

      // Flecha derecha
      const rightArrow = document.createElement('button');
      rightArrow.className = 'carousel-arrow carousel-arrow-right';
      rightArrow.setAttribute('aria-label', 'Ver más estilos');
      rightArrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      rightArrow.addEventListener('click', () => {
        container.scrollBy({ left: 280, behavior: 'smooth' });
      });

      wrapper.appendChild(leftArrow);
      wrapper.appendChild(rightArrow);
      carouselArrowsSetup = true;
    }

    container.innerHTML = VISUAL_STYLES.map(style => {
      const isSel = state.settings.styleId === style.id;
      return `
        <button class="style-card${isSel ? ' selected' : ''}" data-style-id="${style.id}" type="button">
          <div class="style-card-thumb">
            <img src="${style.thumbnail}" alt="${style.name}" referrerpolicy="no-referrer" loading="lazy">
            <div class="style-card-overlay"></div>
            ${isSel ? '<div class="style-card-check"><i class="fa-solid fa-wand-magic-sparkles" style="font-size:0.625rem;"></i></div>' : ''}
            <div class="style-card-name">${style.name}</div>
          </div>
          <p class="style-card-desc">${style.description}</p>
        </button>`;
    }).join('');

    // Bind clicks
    container.querySelectorAll('.style-card').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.styleId = btn.dataset.styleId;
        renderStylesCarousel();
        updateStyleBadge();
      });
    });
  }

  function updateStyleBadge() {
    const name = getActiveStyleName();
    dom.styleBadge.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Estilo: ${name}`;
  }

  // Aspect ratio grid
  function renderAspectGrid() {
    if (!dom.aspectGrid) return;
    dom.aspectGrid.innerHTML = ASPECT_RATIOS.map(opt => {
      const isSel = state.settings.aspectRatioId === opt.id;
      return `
        <button class="aspect-btn${isSel ? ' selected' : ''}" data-ratio="${opt.id}" type="button">
          <div class="aspect-btn-top">
            <div class="aspect-btn-icon"><i class="fa-solid ${opt.icon}"></i></div>
            <span class="aspect-btn-ratio">${opt.displayRatio}</span>
          </div>
          <span class="aspect-btn-name">${opt.label.split(' ')[0]}</span>
          <span class="aspect-btn-sub">${opt.subLabel}</span>
        </button>`;
    }).join('');

    dom.aspectGrid.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.aspectRatioId = btn.dataset.ratio;
        renderAspectGrid();
        updateAspectBadge();
      });
    });
  }

  function updateAspectBadge() {
    if (dom.aspectBadge) {
      dom.aspectBadge.textContent = 'Fijado: ' + state.settings.aspectRatioId;
    }
  }

  // Generate button UI
  function updateGenerateUI() {
    updateGenerateButton();
    updateOptimizeButton();
  }

  // Masonry gallery
  function renderMasonryGallery(images, container) {
    if (!container) return;

    if (!images || images.length === 0) {
      container.innerHTML = `
        <div class="empty-gallery">
          <div class="empty-gallery-icon"><i class="fa-solid fa-layer-group"></i></div>
          <div>
            <h3>No se han esculpido imágenes aún</h3>
            <p>Escribe tu prompt arriba y haz clic en Generar para darle vida a tu imaginación.</p>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="gallery-header">
        <div class="gallery-title-group">
          <div class="gallery-accent"></div>
          <h2 class="gallery-title">Galería de Obras Creadas</h2>
        </div>
        <span class="gallery-count">Diseño en Mosaico (${images.length} elementos)</span>
      </div>
      <div class="masonry-grid">
        ${images.map(img => renderImageCard(img)).join('')}
      </div>`;

    // Bind card events
    container.querySelectorAll('.image-card').forEach(card => {
      const imgId = card.dataset.imageId;
      const img = state.images.find(i => i.id === imgId);
      if (!img) return;

      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openImageModal(img);
      });

      card.querySelector('.btn-copy-prompt')?.addEventListener('click', (e) => {
        e.stopPropagation();
        copyPrompt(img);
      });

      card.querySelector('.btn-download')?.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadImage(img);
      });

      card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(img.id);
      });
    });
  }

  function renderImageCard(img) {
    const time = new Date(img.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="image-card" data-image-id="${img.id}">
        <img src="${img.url}" alt="${escHtml(img.prompt)}" referrerpolicy="no-referrer" loading="lazy">
        <div class="image-card-badges">
          <span class="badge">${escHtml(img.style)}</span>
          <span class="badge">${escHtml(img.aspectRatio)}</span>
        </div>
        <div class="image-card-bg-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="image-card-overlay">
          <div class="overlay-top">
            <div>
              <p class="overlay-seed">SEMILLA: ${img.seed}</p>
              <p class="overlay-sub">${escHtml(img.sampler)} &bull; ${img.steps} pasos</p>
            </div>
            <button class="btn-icon-sm btn-copy-prompt" title="Copiar texto del Prompt"><i class="fa-solid fa-copy"></i></button>
          </div>
          <div class="overlay-actions">
            <div class="overlay-btn-row single">
              <button class="btn-overlay download-btn btn-download"><i class="fa-solid fa-download"></i> Guardar JPG</button>
            </div>
            <div class="overlay-footer">
              <span><i class="fa-regular fa-calendar"></i> Esculpido: ${time}</span>
              <button class="btn-delete btn-delete" title="Deconstruir Escultura"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderGeneratorResults() {
    if (state.isGenerating) {
      dom.generatorResultsArea.innerHTML = '';
    } else {
      renderMasonryGallery(state.images, dom.generatorResultsArea);
    }
  }

  function renderGalleryTab() {
    if (state.currentTab === 'gallery') {
      renderMasonryGallery(state.images, dom.galleryTabContent);
    }
  }

  // ===================== MODALS =====================

  function openImageModal(img) {
    state.selectedImage = img;
    dom.modalContent.innerHTML = `
      <button class="modal-close" id="modal-close-btn"><i class="fa-solid fa-xmark"></i></button>
      <div class="modal-image-wrap">
        <img src="${img.url}" alt="Obra" referrerpolicy="no-referrer">
      </div>
      <div class="modal-info">
        <span class="modal-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> OBRA IA DE ALTA GAMA</span>
        <h3>Especificaciones del Modelo</h3>
        <div class="modal-prompt-box custom-scrollbar">"${escHtml(img.prompt)}"</div>
        <div class="modal-stats">
          <div><p class="modal-stat-label">SEMILLA</p><p class="modal-stat-value">${img.seed}</p></div>
          <div><p class="modal-stat-label">PASOS</p><p class="modal-stat-value">${img.steps} (HQ)</p></div>
          <div><p class="modal-stat-label">ESCALA CFG</p><p class="modal-stat-value">${img.cfgScale.toFixed(1)}</p></div>
          <div><p class="modal-stat-label">MUESTREADOR</p><p class="modal-stat-value">${img.sampler.split(' ')[0]}</p></div>
        </div>
        <div class="modal-tags">${(img.tags || []).map(t => `<span class="modal-tag">#${t}</span>`).join('')}</div>
        <button class="btn-download-modal" id="btn-download-modal">
          <i class="fa-solid fa-download"></i> Descargar Escultura
        </button>
        <p class="modal-date">Creado el: ${new Date(img.createdAt).toLocaleString()}</p>
      </div>`;

    dom.imageModal.classList.remove('hidden');

    // Zoom image toggle on click
    const imageWrap = dom.modalContent.querySelector('.modal-image-wrap');
    imageWrap?.addEventListener('click', (e) => {
      imageWrap.classList.toggle('zoomed');
    });

    // Bind close
    $('#modal-close-btn')?.addEventListener('click', closeImageModal);
    dom.imageModal.addEventListener('click', (e) => { if (e.target === dom.imageModal) closeImageModal(); });
    $('#btn-download-modal')?.addEventListener('click', () => downloadImage(img));
  }

  function closeImageModal() {
    const imageWrap = dom.modalContent.querySelector('.modal-image-wrap');
    imageWrap?.classList.remove('zoomed');
    dom.imageModal.classList.add('hidden');
    state.selectedImage = null;
  }

  // ===================== INPAINT =====================

  function openInpaint(img) {
    state.inpaintingImage = img;
    state.brushedPoints = [];

    dom.inpaintContent.innerHTML = `
      <button class="modal-close" id="inpaint-close-btn" style="position:absolute;top:1rem;right:1rem;"><i class="fa-solid fa-xmark"></i></button>
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
        <div style="padding:0.5rem;border-radius:0.5rem;background:rgba(124,58,237,0.20);color:var(--accent-purple);"><i class="fa-solid fa-paintbrush"></i></div>
        <div>
          <h3 style="font-size:1rem;font-weight:700;color:#fff;">Pincel Corrector Aura</h3>
          <p style="font-size:0.625rem;color:var(--text-muted);font-family:var(--font-mono);">Dibuja sobre el lienzo. El motor recalculará los píxeles seleccionados.</p>
        </div>
      </div>
      <div class="inpaint-canvas-wrap" id="inpaint-canvas">
        <img src="${img.url}" alt="Inpaint" draggable="false">
        <div class="inpaint-draw-area" id="inpaint-draw-area">
          <svg id="inpaint-svg"></svg>
        </div>
        <div class="inpaint-hint" id="inpaint-hint">
          <div>
            <p>Dibuja con tu ratón o dedo</p>
            <span>Haz clic y arrastra sobre la imagen para pintar una máscara de corrección.</span>
          </div>
        </div>
      </div>
      <div class="inpaint-footer">
        <button class="btn-inpaint" id="btn-clear-strokes">Limpiar Trazo</button>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn-inpaint" id="btn-cancel-inpaint">Cancelar</button>
          <button class="btn-inpaint-submit" id="btn-submit-inpaint" disabled>Recalcular Área Pintada</button>
        </div>
      </div>`;

    dom.inpaintModal.classList.remove('hidden');

    // Bind inpaint events
    $('#inpaint-close-btn')?.addEventListener('click', closeInpaint);
    $('#btn-cancel-inpaint')?.addEventListener('click', closeInpaint);
    $('#btn-clear-strokes')?.addEventListener('click', () => {
      state.brushedPoints = [];
      updateInpaintSvg();
      $('#inpaint-hint')?.classList.remove('hidden');
      $('#btn-submit-inpaint').disabled = true;
    });
    $('#btn-submit-inpaint')?.addEventListener('click', submitInpaint);

    const drawArea = $('#inpaint-draw-area');
    if (drawArea) {
      drawArea.addEventListener('mousedown', (e) => {
        state.isBrushing = true;
        addBrushPoint(e);
      });
      drawArea.addEventListener('mousemove', (e) => {
        if (state.isBrushing) addBrushPoint(e);
      });
      drawArea.addEventListener('mouseup', () => { state.isBrushing = false; });
      drawArea.addEventListener('mouseleave', () => { state.isBrushing = false; });
      // Touch
      drawArea.addEventListener('touchstart', (e) => {
        state.isBrushing = true;
        addBrushPoint(e.touches[0]);
      });
      drawArea.addEventListener('touchmove', (e) => {
        if (state.isBrushing) addBrushPoint(e.touches[0]);
      });
      drawArea.addEventListener('touchend', () => { state.isBrushing = false; });
    }
  }

  function addBrushPoint(e) {
    const drawArea = $('#inpaint-draw-area');
    if (!drawArea) return;
    const rect = drawArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    state.brushedPoints.push({ x, y });

    const hint = $('#inpaint-hint');
    if (hint) hint.classList.add('hidden');
    const submitBtn = $('#btn-submit-inpaint');
    if (submitBtn) submitBtn.disabled = false;

    updateInpaintSvg();
  }

  function updateInpaintSvg() {
    const svg = $('#inpaint-svg');
    if (!svg) return;
    svg.innerHTML = state.brushedPoints.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="16" fill="rgba(124,58,237,0.45)" class="inpaint-dot" />`
    ).join('');
  }

  function submitInpaint() {
    alert('¡Máscara de retoque aplicada!\nEl Motor Aura está repintando el área seleccionada...');
    closeInpaint();
  }

  function closeInpaint() {
    dom.inpaintModal.classList.add('hidden');
    state.inpaintingImage = null;
    state.brushedPoints = [];
    state.isBrushing = false;
  }

  // ===================== IMAGE ACTIONS =====================

  function copyPrompt(img) {
    navigator.clipboard.writeText(img.prompt).then(() => {
      // Brief visual feedback
    }).catch(() => {});
  }

  function fakeUpscale(img, card) {
    const btn = card.querySelector('.btn-upscale');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Escalando...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled = false;
      alert('¡Imagen escalada a 4K Ultra HD con éxito!\nLa resolución aumentó dinámicamente a 4096 x 4096 px.');
    }, 1800);
  }

  function triggerVariations(img) {
    state.settings.prompt = 'Variación de: ' + img.prompt;
    dom.promptInput.value = state.settings.prompt;
    const style = VISUAL_STYLES.find(s => s.name === img.style);
    if (style) state.settings.styleId = style.id;
    state.settings.aspectRatioId = img.aspectRatio;

    updateStyleBadge();
    updateAspectBadge();
    renderStylesCarousel();
    renderAspectGrid();
    updateGenerateUI();

    switchTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function downloadImage(img) {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `AuraStudio-${img.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function deleteImage(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta escultura permanentemente?')) return;
    state.images = state.images.filter(i => i.id !== id);
    HistoryManager.deleteItem(id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.images)); } catch(e) {}
    renderGeneratorResults();
    renderGalleryTab();
  }

  // ===================== TAB NAVIGATION =====================

  function switchTab(tabId) {
    state.currentTab = tabId;
    state.mobileSettingsOpen = false;
    dom.mobileSheetOverlay.classList.add('hidden');

    const allTabs = ['generator', 'gallery', 'docs'];
    const tabMap = {
      generator: dom.tabGenerator,
      gallery: dom.tabGallery,
      docs: dom.tabDocs
    };

    allTabs.forEach(id => {
      if (tabMap[id]) tabMap[id].classList.add('hidden');
    });
    if (tabMap[tabId]) tabMap[tabId].classList.remove('hidden');

    // Show/hide settings panel
    if (tabId === 'generator') {
      dom.settingsPanel.style.display = '';
      dom.mainContent.classList.add('settings-visible');
    } else {
      dom.settingsPanel.style.display = 'none';
      dom.mainContent.classList.remove('settings-visible');
    }

    // Header badge
    const badges = {
      generator: 'Entorno Aura',
      gallery: 'Historial',
      docs: 'Guías'
    };
    dom.headerBadge.textContent = badges[tabId] || 'Espacio de Trabajo';

    // Update nav items
    $$('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
    $$('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Mobile settings toggle visibility
    if (tabId === 'generator') {
      dom.btnMobileSettings.style.display = '';
    } else {
      dom.btnMobileSettings.style.display = 'none';
    }

    // Refresh gallery tab content
    if (tabId === 'gallery') {
      renderMasonryGallery(state.images, dom.galleryTabContent);
    }

    // Refresh generator
    if (tabId === 'generator') {
      renderGeneratorResults();
    }
  }

  // ===================== SIDEBAR =====================

  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    applySidebarState();
  }

  function applySidebarState() {
    if (state.sidebarCollapsed) {
      dom.sidebar.classList.remove('expanded');
      dom.sidebar.classList.add('collapsed');
      dom.mainContent.classList.remove('sidebar-expanded');
      dom.mainContent.classList.add('sidebar-collapsed');
      dom.toggleIcon.className = 'fa-solid fa-chevron-right';
      dom.brandText.style.display = 'none';
      dom.sidebarUserInfo.style.display = 'none';
      dom.navLabelWork.textContent = 'WORK';
      dom.navLabelConf.textContent = 'CONF';
    } else {
      dom.sidebar.classList.remove('collapsed');
      dom.sidebar.classList.add('expanded');
      dom.mainContent.classList.remove('sidebar-collapsed');
      dom.mainContent.classList.add('sidebar-expanded');
      dom.toggleIcon.className = 'fa-solid fa-chevron-left';
      dom.brandText.style.display = '';
      dom.sidebarUserInfo.style.display = '';
      dom.navLabelWork.textContent = 'Entorno de Trabajo';
      dom.navLabelConf.textContent = 'Configuración';
    }

    if (dom.settingCollapseSidebar) {
      dom.settingCollapseSidebar.checked = state.sidebarCollapsed;
    }
  }

  // ===================== MOBILE NAV =====================

  function buildMobileNav() {
    if (!dom.mobileNav) return;
    const items = [
      { id: 'generator', icon: 'fa-wand-magic-sparkles', label: 'Espacio' },
      { id: 'gallery', icon: 'fa-grid-2', label: 'Esculturas' },
      { id: 'docs', icon: 'fa-circle-question', label: 'Guías' }
    ];

    dom.mobileNav.innerHTML = items.map(item => `
      <button class="mobile-nav-btn${state.currentTab === item.id ? ' active' : ''}" data-tab="${item.id}">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.label}</span>
        <span class="mobile-nav-dot"></span>
      </button>
    `).join('');

    // Settings button removed

    // Bind clicks
    dom.mobileNav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // ===================== MOBILE SETTINGS SHEET =====================

  function buildMobileSettingsContent() {
    if (!dom.mobileSheetContent) return;
    // Clone aspect grid content
    const aspectHtml = ASPECT_RATIOS.map(opt => {
      const isSel = state.settings.aspectRatioId === opt.id;
      return `
        <button class="aspect-btn${isSel ? ' selected' : ''}" data-ratio-mobile="${opt.id}" type="button">
          <div class="aspect-btn-top">
            <div class="aspect-btn-icon"><i class="fa-solid ${opt.icon}"></i></div>
            <span class="aspect-btn-ratio">${opt.displayRatio}</span>
          </div>
          <span class="aspect-btn-name">${opt.label.split(' ')[0]}</span>
          <span class="aspect-btn-sub">${opt.subLabel}</span>
        </button>`;
    }).join('');

    dom.mobileSheetContent.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <label class="settings-label"><i class="fa-solid fa-maximize"></i> Relación de Aspecto</label>
        <div class="aspect-grid" id="aspect-grid-mobile">${aspectHtml}</div>
      </div>
      <div style="margin-bottom:1.5rem;">
        <label class="settings-label"><i class="fa-solid fa-upload"></i> Imagen de Referencia</label>
        <div class="dropzone" id="dropzone-mobile">
          <input type="file" accept="image/*" class="sr-only" id="ref-file-input-mobile">
          ${state.settings.referenceImage ? `
            <div class="dropzone-preview">
              <img src="${state.settings.referenceImage}" alt="Ref" style="width:100%;height:100%;object-fit:cover;">
              <div class="dropzone-preview-overlay" style="opacity:1;">
                <button class="btn-clear-ref" id="btn-clear-ref-mobile"><i class="fa-solid fa-xmark"></i> Quitar Referencia</button>
              </div>
            </div>` : `
            <div>
              <div class="dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
              <p class="dropzone-title">Arrastra o haz clic aquí</p>
              <p class="dropzone-sub">Aplica las instrucciones del prompt sobre los contornos estructurales de la imagen</p>
            </div>`}
        </div>
      </div>
      <div class="settings-divider">
        <label class="settings-label"><i class="fa-solid fa-sliders"></i> Ajustes Estéticos Avanzados</label>
        <div class="slider-group">
          <div class="slider-label"><span>Escala de Guía (CFG)</span><span class="slider-value pink">${state.settings.cfgScale.toFixed(1)}</span></div>
          <input type="range" min="1" max="20" step="0.5" value="${state.settings.cfgScale}" id="cfg-slider-mobile">
        </div>
        <div class="slider-group">
          <div class="slider-label"><span>Pasos de Refinamiento</span><span class="slider-value purple">${state.settings.steps}</span></div>
          <input type="range" min="10" max="100" step="5" value="${state.settings.steps}" id="steps-slider-mobile">
        </div>
        <div class="slider-group">
          <div class="slider-label"><span>Muestreador</span></div>
          <select class="styled-select" id="sampler-select-mobile">
            <option value="DPM++ 2M SDE Karras" ${state.settings.sampler === 'DPM++ 2M SDE Karras' ? 'selected' : ''}>DPM++ 2M SDE Karras (Premium)</option>
            <option value="Euler Ancestral (Karras)" ${state.settings.sampler === 'Euler Ancestral (Karras)' ? 'selected' : ''}>Euler Ancestral (Karras)</option>
            <option value="Heun (SD)" ${state.settings.sampler === 'Heun (SD)' ? 'selected' : ''}>Heun (SD)</option>
            <option value="DDIM" ${state.settings.sampler === 'DDIM' ? 'selected' : ''}>DDIM</option>
          </select>
        </div>
      </div>`;

    // Bind mobile aspect buttons
    dom.mobileSheetContent.querySelectorAll('[data-ratio-mobile]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.aspectRatioId = btn.dataset.ratioMobile;
        renderAspectGrid();
        updateAspectBadge();
        buildMobileSettingsContent();
      });
    });

    // Bind mobile sliders
    const cfgMobile = $('#cfg-slider-mobile');
    const stepsMobile = $('#steps-slider-mobile');
    const samplerMobile = $('#sampler-select-mobile');

    cfgMobile?.addEventListener('input', () => {
      state.settings.cfgScale = parseFloat(cfgMobile.value);
      dom.cfgSlider.value = cfgMobile.value;
      dom.cfgValue.textContent = parseFloat(cfgMobile.value).toFixed(1);
      buildMobileSettingsContent();
    });
    stepsMobile?.addEventListener('input', () => {
      state.settings.steps = parseInt(stepsMobile.value);
      dom.stepsSlider.value = stepsMobile.value;
      dom.stepsValue.textContent = stepsMobile.value;
      buildMobileSettingsContent();
    });
    samplerMobile?.addEventListener('change', () => {
      state.settings.sampler = samplerMobile.value;
      dom.samplerSelect.value = samplerMobile.value;
    });

    // Bind mobile dropzone
    setupDropzone('dropzone-mobile', 'ref-file-input-mobile', 'btn-clear-ref-mobile');
  }

  // ===================== DROPZONE =====================

  function setupDropzone(dropzoneId, fileInputId, clearBtnId) {
    const dz = document.getElementById(dropzoneId);
    const fi = document.getElementById(fileInputId);
    if (!dz || !fi) return;

    dz.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      fi.click();
    });

    fi.addEventListener('change', () => {
      if (fi.files && fi.files[0]) readRefImage(fi.files[0]);
    });

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('active'); });
    dz.addEventListener('dragleave', () => { dz.classList.remove('active'); });
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        readRefImage(e.dataTransfer.files[0]);
      }
    });

    const clearBtn = document.getElementById(clearBtnId);
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.settings.referenceImage = null;
      updateDropzoneUI();
      buildMobileSettingsContent();
      if (fi) fi.value = '';
    });
  }

  function readRefImage(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor sube un archivo de imagen válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      state.settings.referenceImage = e.target.result;
      updateDropzoneUI();
      buildMobileSettingsContent();
    };
    reader.readAsDataURL(file);
  }

  function updateDropzoneUI() {
    if (state.settings.referenceImage) {
      dom.dropzoneEmpty?.classList.add('hidden');
      dom.dropzonePreview?.classList.remove('hidden');
      if (dom.refPreviewImg) dom.refPreviewImg.src = state.settings.referenceImage;
      dom.dropzone.classList.add('has-image');
    } else {
      dom.dropzoneEmpty?.classList.remove('hidden');
      dom.dropzonePreview?.classList.add('hidden');
      dom.dropzone.classList.remove('has-image');
    }
  }

  // ===================== EVENT BINDINGS =====================

  function bindEvents() {
    // Tab navigation - sidebar
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Mobile settings toggle
    dom.btnMobileSettings?.addEventListener('click', () => {
      state.mobileSettingsOpen = true;
      buildMobileSettingsContent();
      dom.mobileSheetOverlay.classList.remove('hidden');
    });

    $('#close-mobile-settings')?.addEventListener('click', () => {
      state.mobileSettingsOpen = false;
      dom.mobileSheetOverlay.classList.add('hidden');
    });
    dom.mobileSheetOverlay?.addEventListener('click', (e) => {
      if (e.target === dom.mobileSheetOverlay) {
        state.mobileSettingsOpen = false;
        dom.mobileSheetOverlay.classList.add('hidden');
      }
    });

    // Sidebar toggle
    dom.toggleSidebar?.addEventListener('click', toggleSidebar);

    // Settings tab - sidebar collapse
    dom.settingCollapseSidebar?.addEventListener('change', () => {
      state.sidebarCollapsed = dom.settingCollapseSidebar.checked;
      applySidebarState();
    });

    // Prompt input
    dom.promptInput?.addEventListener('input', () => {
      state.settings.prompt = dom.promptInput.value;
      updateGenerateUI();
    });

    dom.promptInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (state.settings.prompt.trim() && !state.isGenerating) {
          generateImage();
        }
      }
    });

    // Optimize
    dom.btnOptimize?.addEventListener('click', optimizePrompt);

    // Generate
    dom.btnGenerate?.addEventListener('click', generateImage);

    // Settings panel sliders
    dom.cfgSlider?.addEventListener('input', () => {
      state.settings.cfgScale = parseFloat(dom.cfgSlider.value);
      dom.cfgValue.textContent = state.settings.cfgScale.toFixed(1);
    });

    dom.stepsSlider?.addEventListener('input', () => {
      state.settings.steps = parseInt(dom.stepsSlider.value);
      dom.stepsValue.textContent = dom.stepsSlider.value;
    });

    dom.samplerSelect?.addEventListener('change', () => {
      state.settings.sampler = dom.samplerSelect.value;
    });

    // Clear reference image
    dom.btnClearRef?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.settings.referenceImage = null;
      updateDropzoneUI();
      buildMobileSettingsContent();
      dom.refFileInput.value = '';
    });

    // Explore remix buttons
    $$('.btn-remix').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.prompt = btn.dataset.remix;
        dom.promptInput.value = btn.dataset.remix;
        if (btn.dataset.style) state.settings.styleId = btn.dataset.style;
        updateStyleBadge();
        renderStylesCarousel();
        updateGenerateUI();
        switchTab('generator');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.selectedImage) closeImageModal();
        if (state.inpaintingImage) closeInpaint();
        if (state.mobileSettingsOpen) {
          state.mobileSettingsOpen = false;
          dom.mobileSheetOverlay.classList.add('hidden');
        }
      }
    });
  }

  // ===================== INIT =====================

  function init() {
    loadImages();

    // Desktop sidebar starts expanded
    dom.mainContent.classList.add('sidebar-expanded', 'settings-visible');

    // Render dynamic components
    renderStylesCarousel();
    renderAspectGrid();
    updateStyleBadge();
    updateAspectBadge();
    renderGeneratorResults();
    updateGenerateUI();
    buildMobileNav();

    // Setup dropzone
    setupDropzone('dropzone', 'ref-file-input', 'btn-clear-ref');
    updateDropzoneUI();

    // Bind all events
    bindEvents();

    // Init settings tab checkbox
    if (dom.settingCollapseSidebar) {
      dom.settingCollapseSidebar.checked = state.sidebarCollapsed;
    }
  }

  // ===================== START =====================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
