// === Ángulos de Cámara — FLUX + Historial servidor ===
// === Elementos del DOM ===
const dropZone = document.getElementById('drop-zone');
const dropZoneContent = document.getElementById('drop-zone-content');
const fileInput = document.getElementById('file-input');
const resultsContainer = document.getElementById('results-container');
const imageGrid = document.getElementById('image-grid');
const galleryStrip = document.getElementById('gallery-strip');
const uploadContainer = document.getElementById('upload-container');
const downloadAllBtn = document.getElementById('download-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const shotSelector = document.getElementById('shot-selector');
const generateBtn = document.getElementById('generate-btn');
const shotOptions = document.querySelectorAll('.shot-option');
const historyContainer = document.getElementById('history-container');
const historyStrip = document.getElementById('history-strip');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const showHistoryBtn = document.getElementById('show-history-btn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Selectores de calidad / formato / resolución (toggles)
const qualityBtns = document.querySelectorAll('.quality-btn');
const aspectRatioToggles = document.getElementById('aspect-ratio-toggles');
const resolutionToggles = document.getElementById('resolution-toggles');
const outputFormatToggles = document.getElementById('output-format-toggles');
const backgroundToggles = document.getElementById('background-toggles');

// Helper: obtener valor activo de un grupo toggle
function getToggleValue(container) {
  const active = container.querySelector('.toggle-btn.active');
  return active ? active.dataset.value : null;
}

// Helper: configurar listeners de toggle
function setupToggleGroup(container) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
}

// Inicializar toggles
setupToggleGroup(aspectRatioToggles);
setupToggleGroup(resolutionToggles);
setupToggleGroup(outputFormatToggles);
setupToggleGroup(backgroundToggles);

// === Lightbox ===
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

// === HistoryManager canónico (servidor) ===
const hm = new HistoryManager('angulos_de_camara');

// === Estado ===
let currentImageData = null;
let currentImageMimeType = null;
let currentQuality = 'pro';

// === Selector de modelo IA (patrón canónico: 3.1FLASH / 3 PRO / FLUX PRO / FLUX MAX) ===
let selectedModel = 'gemini-pro';
const modelToggles = document.querySelectorAll('.model-toggle');
modelToggles.forEach(btn => {
  btn.addEventListener('click', () => {
    modelToggles.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedModel = btn.dataset.model;
  });
});

// === Prompts por tipo de plano ===
const prompts = {
  'general': 'PLANO GENERAL: Toma completa del objeto exacto de la imagen proporcionada. Muestra TODO el objeto desde lejos, integrado en un entorno amplio y realista. La cámara está lejos del objeto, mostrando el contexto completo. Vista frontal directa a nivel de ojos. El objeto debe ser IDÉNTICO en forma, tamaño, colores, texturas y marcas. ENFATIZA: Esto es un PLANO GENERAL - la cámara está LEJOS, mostrando el objeto completo en su entorno.',

  'medium': 'PLANO MEDIO: Toma del objeto exacto de la imagen proporcionada desde la cintura hacia arriba (o equivalente). La cámara está MÁS CERCA que en plano general pero más lejos que en primer plano. Vista frontal directa a nivel de ojos. Mantén TODOS los detalles del objeto original. NO cambies el objeto, NO inventes elementos. El objeto debe ser una RÉPLICA EXACTA. ENFATIZA: Esto es un PLANO MEDIO - distancia intermedia, no es plano general ni primer plano.',

  'close-up': 'PRIMER PLANO: Enfoque extremadamente cercano en la parte más importante del objeto exacto de la imagen proporcionada. La cámara está MUY CERCA, llenando el encuadre con el objeto. Vista frontal directa. Mantén IDENTIDAD EXACTA del objeto. Fondo desenfocado (bokeh) para destacar el objeto. ENFATIZA: Esto es un PRIMER PLANO - la cámara está MUY CERCA, detalles extremos.',

  'side': 'PLANO LATERAL: Vista de PERFIL del objeto exacto de la imagen proporcionada. La cámara está a 90 GRADOS de la vista frontal original, mostrando el LADO del objeto. Mantén todos los detalles originales. El objeto debe verse exactamente igual pero desde un ÁNGULO DIFERENTE (lateral). ENFATIZA: Esto es una VISTA LATERAL - ángulo de 90 grados, PERFIL del objeto.',

  'top-down': 'PLANO CENITAL: Vista desde DIRECTAMENTE ARRIBA del objeto exacto de la imagen proporcionada. La cámara está a 90 GRADOS mirando hacia abajo, posición VERTICAL sobre el objeto. Sin perspectiva, sin inclinación. Objeto IDÉNTICO al original. ENFATIZA: Esto es una VISTA CENITAL - desde ARRIBA, ángulo de 90 grados hacia abajo.'
};

const shotTypes = {
  'general': 'Plano General',
  'medium': 'Plano Medio',
  'close-up': 'Primer Plano',
  'side': 'Plano Lateral',
  'top-down': 'Plano Cenital'
};

// === Fondo aleatorio ===
function getRandomBackground() {
  const backgrounds = [
    'a modern showroom with polished floors and large windows letting in natural light',
    'a winding mountain road with scenic views and clear skies',
    'an urban highway at dusk with city lights in the background',
    'a professional racing track with barriers and clear weather',
    'a luxury garage with high-tech equipment and spotlights',
    'a coastal road with ocean views and gentle waves',
    'a city street in a metropolitan area with skyscrapers',
    'an indoor workshop with tools, lifts, and industrial lighting',
    'a desert landscape with open roads and distant mountains',
    'a forested path with tall trees and soft sunlight filtering through'
  ];
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

// ===== PRE-PROMPT CANÓNICO FLUX =====
function composePrePrompt(userPrompt) {
  const PRE = [
    'Renderizado fotorrealista con calidad de catálogo premium.',
    'Luz diurna difusa suave, exposición equilibrada, balance de blancos neutro-cálido.',
    'Curva S suave cinematográfica: negros ricos, transición suave de altas luces, contraste suave de medios tonos.',
    'Gamma percibida alrededor de 1.03; solo micro-enfoque, sin halos.',
    'Profundidad de campo cinematográfica con bokeh natural.',
    'Sin texto, sin objetos adicionales, sin marcas de agua.',
    'Si se proporciona una imagen base, preserva estrictamente los logotipos y marcas existentes.',
    'Referencia de cámara: Phase One IQ4 150MP.',
    'IMPORTANTE: Todo el contenido generado debe estar en español.'
  ].join(' ');
  return [PRE, userPrompt || ''].map(s => String(s || '').trim()).filter(Boolean).join(' ');
}

// ===== POST-PROCESADO DE IMAGEN =====
async function postProcessDataURL(dataURL, opts = {}) {
  const cfg = Object.assign({
    gamma: 1.012, sCurve: 0.19, sat: 1.01,
    warmHi: 0.10, unsharpAmt: 0.18, unsharpRadius: 1.3
  }, opts);

  const img = await new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = rej; im.src = dataURL;
  });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);

  const id = x.getImageData(0, 0, w, h), d = id.data;
  const pow = (v, g) => Math.pow(Math.max(0, Math.min(1, v)), 1 / g);
  const sCurve = (v, k) => {
    const X = v - 0.5;
    return Math.max(0, Math.min(1, 0.5 + (X * (1 + k)) / (1 + k * Math.abs(X) * 2)));
  };
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const Y = 0.2627 * r + 0.678 * g + 0.0593 * b;
    r = sCurve(pow(r, cfg.gamma), cfg.sCurve);
    g = sCurve(pow(g, cfg.gamma), cfg.sCurve);
    b = sCurve(pow(b, cfg.gamma), cfg.sCurve);
    const mean = (r + g + b) / 3; const k = cfg.sat - 1;
    r = mean + (r - mean) * (1 + k);
    g = mean + (g - mean) * (1 + k);
    b = mean + (b - mean) * (1 + k);
    if (Y > 0.6) { const wamt = cfg.warmHi * (Y - 0.6) / 0.4; r += 0.8 * wamt; b -= 0.8 * wamt; }
    d[i] = clamp(r * 255); d[i + 1] = clamp(g * 255); d[i + 2] = clamp(b * 255);
  }
  x.putImageData(id, 0, 0);

  if (cfg.unsharpAmt > 0) {
    const bc = document.createElement('canvas'); bc.width = w; bc.height = h;
    const bx = bc.getContext('2d'); bx.filter = `blur(${cfg.unsharpRadius}px)`; bx.drawImage(c, 0, 0);
    const src = x.getImageData(0, 0, w, h), blr = bx.getImageData(0, 0, w, h);
    const sd = src.data, bd = blr.data;
    for (let i = 0; i < sd.length; i += 4) {
      sd[i] = clamp(sd[i] + (sd[i] - bd[i]) * cfg.unsharpAmt);
      sd[i + 1] = clamp(sd[i + 1] + (sd[i + 1] - bd[i + 1]) * cfg.unsharpAmt);
      sd[i + 2] = clamp(sd[i + 2] + (sd[i + 2] - bd[i + 2]) * cfg.unsharpAmt);
    }
    x.putImageData(src, 0, 0);
  }
  return c.toDataURL('image/jpeg', 0.95);
}

// ===== LIGHTBOX =====
function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
  lightbox.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  lightbox.classList.add('hidden');
  lightbox.setAttribute('aria-hidden', 'true');
}
lightbox.addEventListener('click', (e) => {
  if (e.target !== lightboxImg) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) closeLightbox();
});

// ===== LOADING OVERLAY =====
function showLoadingOverlay(subtext = '') {
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.setAttribute('aria-busy', 'true');
    document.body.style.overflow = 'hidden';
    const subEl = document.getElementById('secondary-status');
    if (subEl) subEl.textContent = subtext;
  }
}
function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.setAttribute('aria-busy', 'false');
    document.body.style.overflow = '';
    const subEl = document.getElementById('secondary-status');
    if (subEl) subEl.textContent = '';
  }
}

// ===== BOTONES DE PLANO (toggle selección) =====
let selectedShots = new Set(['general', 'medium', 'close-up', 'side', 'top-down']); // todos por defecto

shotOptions.forEach(btn => {
  // Marcar todos como seleccionados al inicio
  btn.classList.add('selected');
  btn.addEventListener('click', () => {
    const shot = btn.dataset.shot;
    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      selectedShots.delete(shot);
    } else {
      btn.classList.add('selected');
      selectedShots.add(shot);
    }
    // Si no hay ninguno seleccionado, deshabilitar generar
    generateBtn.disabled = (selectedShots.size === 0 || !currentImageData);
  });
});

// ===== SELECTORES DE CALIDAD =====
qualityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    qualityBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentQuality = btn.dataset.quality;
  });
});

// ===== EVENT LISTENERS =====
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result.split(',')[1];
    const mimeType = file.type;

    currentImageData = base64String;
    currentImageMimeType = mimeType;

    if (dropZoneContent) dropZoneContent.classList.add('hidden');
    dropZone.style.backgroundImage = `url('${e.target.result}')`;
    dropZone.classList.add('has-image');

    shotSelector.classList.remove('hidden');
    generateBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// ===== GENERAR IMÁGENES (FLUX) =====
generateBtn.addEventListener('click', async () => {
  if (!currentImageData) return;
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO...';
  await generateAllShots();
});

async function generateAllShots() {
  resultsContainer.classList.remove('hidden');
  const allShots = Object.keys(prompts).filter(s => selectedShots.has(s));
  const total = allShots.length;

  if (total === 0) {
    hideLoadingOverlay();
    generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
    generateBtn.disabled = false;
    return;
  }

  showLoadingOverlay(`Preparando ${total} plano${total > 1 ? 's' : ''}...`);

  const bgOption = getToggleValue(backgroundToggles) || 'different-realistic';
  let commonBg = '';
  if (bgOption === 'same-realistic') {
    commonBg = getRandomBackground();
  }

  for (let i = 0; i < total; i++) {
    const shotType = allShots[i];
    const title = shotTypes[shotType];
    const progressText = `Generando ${i + 1} de ${total}`;
    generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${progressText}`;
    const subEl = document.getElementById('secondary-status');
    if (subEl) subEl.textContent = `${shotTypes[shotType]} (${i + 1}/${total})`;

    // Buscar o crear tarjeta
    let card = Array.from(galleryStrip.children).find(child => {
      const h3 = child.querySelector('h3');
      return h3 && h3.textContent === title;
    });
    let cardId;
    if (card) {
      cardId = card.id;
      const imgContainer = card.querySelector('.image-container');
      const existingImg = imgContainer.querySelector('img');
      if (existingImg) existingImg.remove();
      const errorMsg = imgContainer.querySelector('.error-message');
      if (errorMsg) errorMsg.classList.add('hidden');
      const loader = imgContainer.querySelector('.loader');
      if (loader) loader.style.display = 'flex';
    } else {
      cardId = `card-${shotType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      createImageCard(cardId, title, shotType);
    }

    // Fondo
    let bgOverride = '';
    if (bgOption === 'solid') {
      bgOverride = ' Ignore any previous background. Place the object on a solid neutral background with good contrast, isolated, no environment.';
    } else if (bgOption === 'same-realistic') {
      bgOverride = ` Ignore any previous background. Place the object in ${commonBg}, photorealistic.`;
    } else {
      bgOverride = ` Ignore any previous background. Place the object in ${getRandomBackground()}, photorealistic.`;
    }

    await callFluxAPI(cardId, shotType, bgOverride);
  }

  hideLoadingOverlay();
  generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
  generateBtn.disabled = false;
}

function createImageCard(cardId, title, shotType) {
  const card = document.createElement('div');
  card.id = cardId;
  card.dataset.shot = shotType;
  card.className = 'new-image';
  card.innerHTML = `
    <h3>${title}</h3>
    <div class="image-container">
      <div class="loader"></div>
      <p class="error-message hidden"></p>
    </div>
  `;
  galleryStrip.insertBefore(card, galleryStrip.firstChild);
  addActionButtons(card.querySelector('.image-container'), shotType, cardId);
}

function addActionButtons(container, shotType, cardId) {
  // Botón descarga
  const dl = document.createElement('a');
  dl.className = 'download-btn image-action-btn';
  dl.title = 'Descargar';
  dl.innerHTML = '<i class="fa-solid fa-download"></i>';
  dl.style.display = 'none';

  // Botón regenerar
  const regen = document.createElement('button');
  regen.className = 'regen-btn image-action-btn';
  regen.title = 'Regenerar';
  regen.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
  regen.addEventListener('click', async () => {
    generateBtn.disabled = true;
    const bgOption = getToggleValue(backgroundToggles) || 'different-realistic';
    let bgOverride = '';
    if (bgOption === 'solid') bgOverride = ' Ignore background. Solid neutral background.';
    else if (bgOption === 'same-realistic') bgOverride = ` Place in ${getRandomBackground()}, photorealistic.`;
    else bgOverride = ` Place in ${getRandomBackground()}, photorealistic.`;

    await callFluxAPI(cardId, shotType, bgOverride);
    generateBtn.disabled = false;
  });

  // Botón eliminar
  const del = document.createElement('button');
  del.className = 'delete-btn image-action-btn';
  del.title = 'Eliminar';
  del.innerHTML = '<i class="fa-solid fa-trash"></i>';
  del.addEventListener('click', () => removeImageCard(cardId));

  container.appendChild(dl);
  container.appendChild(regen);
  container.appendChild(del);
}

function removeImageCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.style.opacity = '0';
  card.style.transform = 'scale(0.8)';
  card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  setTimeout(() => {
    card.remove();
    if (galleryStrip.children.length === 0) resultsContainer.classList.add('hidden');
  }, 300);
}

// ===== LLAMADA A FLUX (proxy canónico) =====
async function callFluxAPI(cardId, shotType, backgroundOverride) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const imgContainer = card.querySelector('.image-container');
  const loader = imgContainer.querySelector('.loader');
  const errorMsg = imgContainer.querySelector('.error-message');
  if (loader) loader.style.display = 'flex';
  if (errorMsg) errorMsg.classList.add('hidden');

  const basePrompt = prompts[shotType];
  const finalPrompt = composePrePrompt(basePrompt) + backgroundOverride;

  const aspectRatio = getToggleValue(aspectRatioToggles) || '2:3';
  const resolution = parseInt(getToggleValue(resolutionToggles)) || 1024;
  const outputFormat = getToggleValue(outputFormatToggles) || 'png';

  const payload = {
    action: 'generate',
    prompt: finalPrompt,
    model: selectedModel,
    quality: currentQuality,
    output_format: outputFormat,
    aspectRatio: aspectRatio,
    resolution: resolution,
    image: currentImageData
  };

  try {
    const response = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error del servidor FLUX');
    }

    // FLUX devuelve dataUrl directamente
    const dataUrl = result.dataUrl;
    const mimeType = result.mimeType || 'image/png';

    if (!dataUrl) {
      throw new Error('FLUX no devolvió una imagen.');
    }

    // Post-procesar
    const processed = await postProcessDataURL(dataUrl);

    // Mostrar en tarjeta
    if (loader) loader.style.display = 'none';

    const img = document.createElement('img');
    img.src = processed;
    img.alt = shotTypes[shotType] || `Imagen generada: ${shotType}`;
    img.addEventListener('click', () => openLightbox(processed));

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    img.dataset.filename = `${shotType.replace(/\s+/g, '_')}_${currentQuality}.${ext}`;
    img.dataset.base64 = processed.split(',')[1] || '';

    // Botón descarga
    const dlBtn = imgContainer.querySelector('.download-btn');
    if (dlBtn) {
      dlBtn.href = processed;
      dlBtn.download = img.dataset.filename;
      dlBtn.style.display = 'flex';
    }

    imgContainer.prepend(img);

    // Guardar en historial servidor
    await hm.save({
      type: 'image',
      data: {
        shotType: shotType,
        shotTypeLabel: shotTypes[shotType],
        quality: currentQuality,
        aspectRatio: aspectRatio,
        resolution: resolution
      },
      imageData: processed
    });

    // Recargar UI historial
    loadHistoryUI({ forceShow: false });
  } catch (error) {
    console.error('Error FLUX:', error);
    if (loader) loader.style.display = 'none';
    if (errorMsg) {
      errorMsg.textContent = error.message || 'Error inesperado.';
      errorMsg.classList.remove('hidden');
    }
    const dlBtn = imgContainer.querySelector('.download-btn');
    if (dlBtn) dlBtn.style.display = 'none';
  }
}

// ===== DESCARGAR TODO (ZIP) =====
async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  const urls = [
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
  ];
  for (const u of urls) {
    try {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = u; s.async = true; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      if (window.JSZip) return window.JSZip;
    } catch {}
  }
  throw new Error('JSZip no disponible');
}

function dataURLtoBase64(dataURL) {
  return dataURL.split(',')[1] || '';
}
function guessExt(mime) {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

async function handleZipDownload(ev) {
  ev?.stopImmediatePropagation?.();
  try {
    const JSZipLib = await ensureJSZip();
    const zip = new JSZipLib();
    const imgs = document.querySelectorAll('#gallery-strip img[data-base64]');
    if (!imgs.length) {
      alert('No hay imágenes generadas para descargar.');
      return;
    }
    let idx = 1;
    imgs.forEach(img => {
      const base64 = img.getAttribute('data-base64') || (img.src?.startsWith('data:') ? dataURLtoBase64(img.src) : null);
      if (!base64) return;
      zip.file(`angulo-${String(idx++).padStart(2, '0')}.jpg`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'angulos_de_camara.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  } catch (e) {
    alert('Error: La librería JSZip no se ha cargado correctamente.');
  }
}

(function wireZipButton() {
  const btn = document.getElementById('download-all-btn');
  if (!btn) return;
  btn.replaceWith(btn.cloneNode(true));
  const fresh = document.getElementById('download-all-btn');
  fresh.addEventListener('click', handleZipDownload, true);
})();

// ===== LIMPIAR TODO =====
clearAllBtn.addEventListener('click', () => {
  if (confirm('¿Estás seguro de que quieres eliminar todo y empezar de nuevo?')) {
    galleryStrip.innerHTML = '';
    resultsContainer.classList.add('hidden');
    dropZone.style.backgroundImage = 'none';
    dropZone.classList.remove('has-image');
    if (dropZoneContent) dropZoneContent.classList.remove('hidden');
    shotSelector.classList.add('hidden');
    currentImageData = null;
    currentImageMimeType = null;
    fileInput.value = null;
  }
});

// ===== HISTORIAL (HistoryManager canónico + UI) =====
async function loadHistoryUI(options = {}) {
  const { forceShow = false } = options;

  try {
    await hm.load();
  } catch (e) {
    console.warn('Error cargando historial:', e);
  }

  const history = hm.getAll();

  if (history.length === 0) {
    if (forceShow) {
      historyContainer.classList.remove('hidden');
      historyStrip.innerHTML = '<p class="history-empty">No hay imágenes guardadas en el historial.</p>';
    } else {
      historyContainer.classList.add('hidden');
      historyStrip.innerHTML = '';
    }
    return;
  }

  historyContainer.classList.remove('hidden');
  historyStrip.innerHTML = '';

  history.forEach(item => {
    const card = createHistoryCard(item);
    historyStrip.appendChild(card);
  });
}

function createHistoryCard(item) {
  const card = document.createElement('div');
  card.className = 'history-card';
  card.dataset.id = item.id;

  const data = item.data || {};
  const label = data.shotTypeLabel || 'Generación';
  const dateStr = new Date(item.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Construir URL de imagen
  let imageUrl = item.imageUrl || '';
  if (!imageUrl && data.dataUrl) imageUrl = data.dataUrl;
  if (!imageUrl && data.url) imageUrl = data.url;

  card.innerHTML = `
    <h3>${label}</h3>
    <div class="image-container">
      <img src="${imageUrl}" alt="${label}" data-filename="${label.replace(/\s+/g, '_')}.jpg">
      <div class="history-actions">
        <button class="action-btn btn-dl history-download" title="Descargar">
          <i class="fa-solid fa-download"></i>
        </button>
        <button class="action-btn btn-del history-delete" title="Eliminar">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="history-date">${dateStr}</div>
    </div>
  `;

  const img = card.querySelector('img');
  const dlBtn = card.querySelector('.history-download');
  const delBtn = card.querySelector('.history-delete');

  img.addEventListener('click', () => openLightbox(imageUrl));

  dlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = img.dataset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta imagen del historial?')) {
      try { await hm.delete(item.id); } catch (err) { console.warn('Error delete:', err); }
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8)';
      setTimeout(() => {
        card.remove();
        if (hm.getAll().length === 0) historyContainer.classList.add('hidden');
      }, 300);
    }
  });

  return card;
}

// Limpiar historial
clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('¿Estás seguro de que quieres eliminar TODO el historial del servidor?')) {
    try { await hm.clear(); } catch (e) { console.warn('Error clear:', e); }
    historyStrip.innerHTML = '';
    historyContainer.classList.add('hidden');
  }
});

// Mostrar historial
showHistoryBtn.addEventListener('click', async () => {
  await loadHistoryUI({ forceShow: true });
  historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ===== INICIO =====
document.addEventListener('DOMContentLoaded', async () => {
  hideLoadingOverlay();
  await loadHistoryUI({ forceShow: false });
});
