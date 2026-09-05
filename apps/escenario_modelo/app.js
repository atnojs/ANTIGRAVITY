// app.js — Composición de Escenario con FLUX vía proxy canónico Antigravity
// ========================================================================
// Usa el proxy canónico con acción 'generate' para FLUX.
// Historial gestionado por HistoryManager (clase, no estático).

// ===== PROMPT BUILDER PARA FLUX =====
function buildCompositionPrompt(compKey, compMeta, styleText, variant, compDesc) {
  const title = compMeta?.title || compKey;
  const desc = compDesc || compMeta?.description || '';
  const base = [
    `Professional advertising photography composition.`,
    `Style: ${styleText}.`,
    `Composition type: ${title}. ${desc}`,
    `Integrate the reference images: use the background scene, place the model naturally within it, dress the model with the clothing item, and add the accessory with correct scale, contact shadows, and occlusions.`,
    `Match lighting, color temperature, and perspective to the background scene.`,
    `Photorealistic rendering, catalog quality, soft diffused daylight.`,
    `No text, no watermarks, no logos overlaid.`,
  ];

  if (variant > 1) {
    base.push(`Variant ${variant}: Different camera angle, pose, or lighting variation from previous generations.`);
  }

  base.push(`4K, highly detailed, premium product photography.`);

  return base.join(' ');
}

// ===== POST-PROCESADO (conservado de la versión anterior) =====
async function postProcessDataURL(dataURL, opts = {}) {
  if (!dataURL || typeof dataURL !== 'string' || !dataURL.startsWith('data:image')) {
    console.warn('postProcessDataURL recibió datos inválidos', dataURL);
    return dataURL;
  }
  const cfg = Object.assign({
    gamma: 1.015, sCurve: 0.20, sat: 1.02, warmHi: 0.10,
    unsharpAmt: 0.22, unsharpRadius: 1.4
  }, opts);
  try {
    const img = await new Promise((res, rej) => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = (e) => rej(e); im.src = dataURL;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    const pow = (v, g) => Math.pow(Math.max(0, Math.min(1, v)), 1 / g);
    const sCurve = (v, k) => { const X = v - 0.5; return Math.max(0, Math.min(1, 0.5 + (X * (1 + k)) / (1 + k * Math.abs(X) * 2))); };
    const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const Y = 0.2627 * r + 0.678 * g + 0.0593 * b;
      r = sCurve(pow(r, cfg.gamma), cfg.sCurve);
      g = sCurve(pow(g, cfg.gamma), cfg.sCurve);
      b = sCurve(pow(b, cfg.gamma), cfg.sCurve);
      const mean = (r + g + b) / 3; const k = cfg.sat - 1;
      r = mean + (r - mean) * (1 + k); g = mean + (g - mean) * (1 + k); b = mean + (b - mean) * (1 + k);
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
  } catch (e) {
    console.error('Error en post-procesado:', e);
    return dataURL;
  }
}

// ===== ESTADO GLOBAL =====
let uploadedImages = { scenario: null, model: null, clothing: null, accessory: null };
let uploadedDataURLs = { scenario: null, model: null, clothing: null, accessory: null };
let selectedCompositions = [];
let currentBox = null;
let generatedImages = [];
let history; // instancia de HistoryManager

// ===== ELEMENTOS DEL DOM =====
const fileInput = document.getElementById('file-input');
const generateBtn = document.getElementById('generate-btn');
const styleSelect = document.getElementById('style-select');
const selectionInfo = document.getElementById('selection-info');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const downloadAllBtn = document.getElementById('download-all');
const newCompositionBtn = document.getElementById('new-composition');

const compSelectA = document.getElementById('comp-select-a');
const compSelectB = document.getElementById('comp-select-b');
const compSelectC = document.getElementById('comp-select-c');
const customPromptEl = document.getElementById('custom-prompt');
const improvePromptBtn = document.getElementById('improve-prompt-btn');
const improvePromptBtnText = document.getElementById('improve-prompt-btn-text');
const improvePromptStatus = document.getElementById('improve-prompt-status');
const promptVariantsEl = document.getElementById('prompt-variants');

// Toggle buttons (como outfit)
let selectedModel = 'gemini-flash';
let selectedAR = '1:1';
let selectedRes = 1024;
// Etiquetas legibles para metadatos (resultado / popup historial)
const MODEL_LABELS = { 'gemini-flash': '3.1FLASH', 'gemini-pro': '3 PRO', 'flux-pro': 'FLUX PRO', 'flux-max': 'FLUX MAX' };
const getModelLabel = (m) => MODEL_LABELS[m] || m;
let promptVariants = [];

// ===== DATOS DE COMPOSICIONES =====
const COMPOSITION_MAP = {
  artistic: { title: 'Composición Artística Publicitaria', description: 'Una imagen con composición artística e intención publicitaria.' },
  expositive: { title: 'Composición Expositiva', description: 'Una imagen más ordenada que permite identificar claramente los elementos.' },
  social: { title: 'Publicación para Redes Sociales', description: 'Formato vertical 9:16 optimizado para Instagram, TikTok, etc.' },
  product: { title: 'Bodegón de Producto (Flat Lay)', description: 'Enfoque en los productos sin distracciones del modelo.' },
  behind: { title: 'Estilo "Entre Bastidores"', description: 'Una toma cándida que muestra un momento natural durante la sesión.' },
  banner: { title: 'Banner Publicitario Horizontal', description: 'Formato panorámico con espacio para logo y eslogan.' },
  cinematic: { title: 'Composición Cinematográfica', description: 'Imagen con encuadre y estética de cine, usando iluminación dramática y narrativa visual.' },
  minimalist: { title: 'Composición Minimalista', description: 'Diseño limpio con pocos elementos que resaltan el producto o mensaje principal.' },
  luxury: { title: 'Composición de Lujo', description: 'Visuales premium con acabados brillantes y materiales de alta gama para transmitir exclusividad.' },
  editorial: { title: 'Estilo Editorial', description: 'Inspirado en revistas de moda y diseño, con tipografía integrada a la imagen.' },
  conceptual: { title: 'Composición Conceptual', description: 'Imágenes abstractas o metafóricas que transmiten una idea más que mostrar el producto.' },
  immersive: { title: 'Composición Inmersiva 3D', description: 'Diseños con perspectiva envolvente o simulación 3D para captar atención.' },
  retro: { title: 'Estilo Retro Vintage', description: 'Composición con estética de décadas pasadas, colores y tipografías clásicas.' },
  dynamic: { title: 'Composición Dinámica', description: 'Uso de movimiento, diagonales y superposición de elementos para energía y acción.' },
  testimonial: { title: 'Estilo Testimonial', description: 'Imagen con persona real usando el producto, transmitiendo confianza y autenticidad.' },
  futuristic: { title: 'Composición Futurista', description: 'Visuales vanguardistas con estética tecnológica, hologramas y luces de neón.' },
  abstract: { title: 'Composición Abstracta', description: 'Formas y colores no figurativos que crean impacto visual sin mostrar directamente el producto.' },
  collage: { title: 'Composición Collage', description: 'Superposición de fotos, texturas y recortes gráficos para un estilo artístico y llamativo.' },
  geometric: { title: 'Composición Geométrica', description: 'Uso de líneas y figuras geométricas para dar estructura y modernidad a la imagen.' },
  organic: { title: 'Composición Orgánica', description: 'Formas fluidas e irregulares que transmiten naturalidad y cercanía.' },
  contrast: { title: 'Composición de Contraste', description: 'Colores, luces y texturas opuestas para resaltar el mensaje o producto.' },
  storytelling: { title: 'Narrativa Visual', description: 'Imagen que cuenta una historia breve alrededor del producto o marca.' },
  urban: { title: 'Estilo Urbano', description: 'Fotografía en escenarios de ciudad, transmitiendo dinamismo y modernidad.' },
  natural: { title: 'Composición Naturalista', description: 'Producto integrado en entornos naturales con iluminación realista.' },
  macro: { title: 'Detalle Macro', description: 'Primerísimo plano que resalta texturas y detalles invisibles a simple vista.' },
  panoramic: { title: 'Composición Panorámica', description: 'Fotografía amplia que sitúa al producto en un contexto mayor.' },
  split: { title: 'Composición Dividida', description: 'Pantalla o cartel partido en dos secciones contrastadas que refuerzan el mensaje.' },
  typographic: { title: 'Composición Tipográfica', description: 'Texto como elemento visual central, integrado con imágenes de apoyo.' },
  surreal: { title: 'Composición Surrealista', description: 'Escenas oníricas y fuera de lo común que sorprenden al espectador.' },
  flatcolor: { title: 'Estilo Flat Color', description: 'Uso de colores planos y brillantes con mínima textura para resaltar simplicidad.' },
  gradient: { title: 'Composición con Degradados', description: 'Fondos y elementos con transiciones suaves de color para dar modernidad.' },
  handcrafted: { title: 'Estilo Artesanal', description: 'Elementos dibujados a mano, pinceladas o texturas craft que transmiten autenticidad.' },
  interactive: { title: 'Composición Interactiva', description: 'Diseños pensados para pantallas con elementos que sugieren movimiento o acción.' },
  monochrome: { title: 'Composición Monocromática', description: 'Uso de una sola gama de color para uniformidad y sofisticación.' },
  collaborative: { title: 'Estilo Colaborativo', description: 'Imágenes que muestran interacción entre varias personas usando el producto.' },
  seasonal: { title: 'Composición Estacional', description: 'Visuales adaptados a una estación del año o festividad específica.' }
};

const GROUPS = {
  A: ['expositive', 'product', 'behind', 'banner', 'testimonial', 'urban', 'natural', 'macro', 'panoramic', 'split', 'editorial', 'luxury'],
  B: ['cinematic', 'minimalist', 'dynamic', 'immersive', 'futuristic', 'retro', 'gradient', 'flatcolor', 'geometric', 'organic', 'monochrome', 'seasonal'],
  C: ['artistic', 'conceptual', 'abstract', 'collage', 'typographic', 'storytelling', 'surreal', 'interactive', 'contrast', 'handcrafted', 'social', 'collaborative']
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
  // Historial persistente (nuevo HistoryManager basado en clases)
  history = new HistoryManager('escenario_modelo');

  initDragAndDrop();
  initThreeSelects();
  attachSelectEvents();
  initToggleButtons();
  checkGenerateButtonState();
  initCustomSelects();
initCustomPromptUI();

  generateBtn.addEventListener('click', generateImages);
  downloadAllBtn.addEventListener('click', downloadAllImages);
  newCompositionBtn.addEventListener('click', resetComposition);

  const modal = document.getElementById('image-modal');
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal) modal.style.display = 'none';
      const lb = document.getElementById('antigravity-lightbox');
      if (lb) lb.style.display = 'none';
    }
  });

  // Contenedores de tags
  document.querySelectorAll('.select-group').forEach(group => {
    const container = document.createElement('div');
    container.className = 'cs-tags-container';
    group.appendChild(container);
  });

  const container = document.querySelector('.container');
  if (container) container.addEventListener('click', handleTagDeletion);
  updateAllTagsUI();

  // ─── Cargar historial ─────────────────────────────────────
  await loadAndRenderHistory();
  window._bindHistoryPopupEvents();
  restorePromptVariants();

  // Listener para cambios en el historial
  history.onChange(() => renderHistoryFromState());
  } catch (e) {
    console.error('Error en inicialización:', e);
  }
});

// ===== HISTORIAL =====
async function loadAndRenderHistory() {
  try {
    await history.load();
    renderHistoryFromState();
  } catch (e) {
    console.warn('Error cargando historial:', e);
  }
}

function renderHistoryFromState() {
  const grid = document.getElementById('history-grid');
  const title = document.getElementById('history-title');
  const clearBtn = document.getElementById('history-clear-btn');
  if (!grid) return;

  const items = (history.getAll() || []).filter((it) => it.type !== 'prompt_variants');

  if (!items || !items.length) {
    grid.innerHTML = '';
    if (title) title.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (title) title.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'block';

   grid.innerHTML = items.map(item => {
   const url = item.imageUrl || (item.data && item.data.url) || '';
   const histData = item.data || {};
   const createdAt = item.createdAt || '';
   const d = item.data || {};
   const dims = (d.width && d.height) ? `${d.width}×${d.height}px` : '';
   const resInfo = ((d.resolution ? d.resolution + 'px' : '') + (d.aspectRatio ? ' · ' + d.aspectRatio : '')).replace(/^ · /, '');
   return `<div class="history-item-wrap">
     <img src="${url}" alt="Imagen del historial" loading="lazy" onclick="window._openLightbox('${url}')" data-hist='${JSON.stringify(histData).replace(/"/g, "&quot;").replace(/'/g, "&#39;")}'>
     <div class="history-actions">
       <button type="button" class="history-action-btn history-download-btn" onclick="event.stopPropagation();window._downloadHistoryItem('${item.id}')" title="Descargar imagen" aria-label="Descargar imagen">
         <span class="history-action-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>
         <span class="history-action-label">Descargar</span>
       </button>
       <button type="button" class="history-action-btn history-delete-btn" onclick="event.stopPropagation();window._deleteHistoryItem('${item.id}')" title="Eliminar del historial" aria-label="Eliminar del historial">
         <span class="history-action-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
         <span class="history-action-label">Eliminar</span>
       </button>
     </div>
     <button class="history-info-btn" type="button" onclick="event.stopPropagation();window._toggleHistoryPopup(this)" aria-label="Ver detalles de generación" title="Ver detalles">ⓘ</button>
     <span class="history-date">${new Date(createdAt).toLocaleString()}</span>
   </div>`;
 }).join('');
 grid.querySelectorAll('img[data-hist]').forEach((im) => { try { im._histData = JSON.parse(im.getAttribute('data-hist')); } catch (err) { im._histData = {}; } });
}

window._downloadHistoryItem = function (id) {
  const items = (history && history.getAll) ? (history.getAll() || []) : [];
  const item = items.find((it) => it.id === id);
  if (!item) return;
  const url = item.imageUrl || (item.data && item.data.url) || '';
  if (!url) { alert('No se puede descargar esta imagen.'); return; }
  const a = document.createElement('a');
  a.href = url;
  a.download = 'composicion_' + (item.createdAt ? String(item.createdAt).slice(0, 10) : 'imagen') + '.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window._deleteHistoryItem = async function (id) {
  if (confirm('¿Eliminar del historial?')) {
    try {
      await history.delete(id);
    } catch (e) {
      console.warn('Error eliminando del historial:', e);
    }
  }
};

window._openLightbox = function (url) {
  let lb = document.getElementById('antigravity-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'antigravity-lightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    lb.onclick = function () { lb.style.display = 'none'; };
    const img = document.createElement('img');
    img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px';
    lb.appendChild(img);
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = url;
  lb.style.display = 'flex';
};
window._fmtStyle = (d) => {
  const STYLE_LABELS = { cinematic: 'Cinemático', 'high-key': 'High-Key', 'low-key': 'Low-Key', 'street-style': 'StreetStyle', minimalist: 'Minimalista Conceptual', surreal: 'Surrealista Onírico', grunge: 'GrungeRaw', vintage: 'Vintage', bw: 'Blanco y Negro', pastel: 'Pastel', cyberpunk: 'Ciberpunk', baroque: 'Barroco' };
  return (d && (d.styleLabel || STYLE_LABELS[d.style] || d.style)) || '—';
};
window._fmtComp = (d) => (d && (d.compositionLabel || ((d.composition === 'custom') ? 'Composición Personalizada' : (COMPOSITION_MAP[d.composition] && COMPOSITION_MAP[d.composition].title) || d.composition))) || '—';
window._fmtModel = (d) => (d && (d.modelLabel || getModelLabel(d.model))) || '—';
window._historyPopupEl = null;
window._historyPopupAnchor = null;
window._ensureHistoryPopup = function () {
  if (window._historyPopupEl) return window._historyPopupEl;
  const el = document.createElement('div');
  el.id = 'antigravity-history-popup';
  el.className = 'history-popup-global';
  document.body.appendChild(el);
  window._historyPopupEl = el;
  return el;
};
window._fillHistoryPopup = function (d) {
  const el = window._ensureHistoryPopup();
  const dims = (d && d.width && d.height) ? d.width + '×' + d.height + 'px' : '';
  const resInfo = ((d && d.resolution ? d.resolution + 'px' : '') + (d && d.aspectRatio ? ' · ' + d.aspectRatio : '')).replace(/^ · /, '');
  el.innerHTML =
    '<div class="history-popup-row"><span class="history-popup-label">Estilo fotográfico</span><span class="history-popup-value">' + window._fmtStyle(d) + '</span></div>' +
    '<div class="history-popup-row"><span class="history-popup-label">Composición</span><span class="history-popup-value">' + window._fmtComp(d) + '</span></div>' +
    '<div class="history-popup-row"><span class="history-popup-label">Modelo</span><span class="history-popup-value">' + window._fmtModel(d) + '</span></div>' +
    '<div class="history-popup-row"><span class="history-popup-label">Formato / Resolución</span><span class="history-popup-value">' + (resInfo || '—') + (dims ? ' (' + dims + ')' : '') + '</span></div>';
  return el;
};
window._positionHistoryPopup = function (anchorEl) {
  const el = window._fillHistoryPopup(anchorEl._histData);
  const r = anchorEl.getBoundingClientRect();
  el.style.display = 'block';
  const pw = el.offsetWidth;
  const ph = el.offsetHeight;
  let left = r.left + (r.width - pw) / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  let top = r.top - ph - 10;
  if (top < 8) top = r.bottom + 10;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
};
window._showHistoryPopup = function (anchorEl) {
  window._historyPopupAnchor = anchorEl;
  window._positionHistoryPopup(anchorEl);
};
window._hideHistoryPopup = function () {
  if (window._historyPopupEl) window._historyPopupEl.style.display = 'none';
  window._historyPopupAnchor = null;
};
window._toggleHistoryPopup = function (btn) {
  const wrap = btn.closest('.history-item-wrap');
  const img = wrap && wrap.querySelector('img');
  if (!img || !img._histData) return;
  if (window._historyPopupAnchor === btn && window._historyPopupEl && window._historyPopupEl.style.display === 'block') {
    window._hideHistoryPopup();
  } else {
    btn._histData = img._histData;
    window._showHistoryPopup(btn);
  }
};
window._bindHistoryPopupEvents = function () {
  const grid = document.getElementById('history-grid');
  if (!grid || grid.dataset.popupBound) return;
  grid.dataset.popupBound = '1';
  grid.addEventListener('mouseover', (e) => {
    const wrap = e.target.closest('.history-item-wrap');
    const img = wrap && wrap.querySelector('img');
    if (img && img._histData) {
      window._hideHistoryPopup();
      window._showHistoryPopup(img);
    }
  });
  grid.addEventListener('mouseout', (e) => {
    const wrap = e.target.closest('.history-item-wrap');
    if (!wrap || !wrap.contains(e.relatedTarget)) window._hideHistoryPopup();
  });
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('.history-item-wrap')) window._hideHistoryPopup();
});

document.getElementById('history-clear-btn').addEventListener('click', async function () {
  if (confirm('¿Eliminar todo el historial?')) {
    try {
      await history.clear();
    } catch (e) {
      console.warn('Error limpiando historial:', e);
    }
  }
});

// ===== DRAG & DROP =====
function initDragAndDrop() {
  const boxes = document.querySelectorAll('.upload-box');
  boxes.forEach(box => {
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag-over'); });
    box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
    box.addEventListener('drop', e => {
      e.preventDefault(); box.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleImageUpload(e.dataTransfer.files[0], box.id);
    });
    box.addEventListener('click', () => { currentBox = box.id; fileInput.click(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        currentBox = box.id;
        fileInput.click();
      }
    });
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0 && currentBox) {
      handleImageUpload(fileInput.files[0], currentBox);
      fileInput.value = '';
      currentBox = null;
    }
  });
}

function handleImageUpload(file, boxId) {
  if (!file.type.startsWith('image/')) { alert('Por favor, sube solo archivos de imagen.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const imageType = boxId.split('-')[0];
    uploadedImages[imageType] = file;
    uploadedDataURLs[imageType] = e.target.result;
    const previewElement = document.getElementById(`${imageType}-preview`);
    if (previewElement) {
      previewElement.src = e.target.result;
      previewElement.style.display = 'block';
    }
    checkGenerateButtonState();
  };
  reader.readAsDataURL(file);
}

// ===== SELECTORES DE COMPOSICIÓN =====
function initThreeSelects() {
  populateSelect(compSelectA, GROUPS.A);
  populateSelect(compSelectB, GROUPS.B);
  populateSelect(compSelectC, GROUPS.C);
  updateOptionChecks();
}

function populateSelect(selectEl, keys) {
  if (!selectEl) return;
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.dataset.label = COMPOSITION_MAP[k]?.title || k;
    opt.textContent = opt.dataset.label;
    selectEl.appendChild(opt);
  });
}

function attachSelectEvents() {
  const handleCompositionChange = () => {
    const selections = new Map();
    [compSelectA, compSelectB, compSelectC].forEach(sel => {
      if (sel.value) {
        if (selections.has(sel.value)) {
          sel.value = '';
        } else {
          selections.set(sel.value, sel.id);
        }
      }
    });
    selectedCompositions = Array.from(selections.keys());
    selectionInfo.textContent = `Seleccionados: ${selectedCompositions.length}/3`;
    updateOptionChecks();
    checkGenerateButtonState();
    updateAllTagsUI();
    refreshCustomSelects();
  };

  [styleSelect, compSelectA, compSelectB, compSelectC].forEach(sel => {
    if (!sel) return;
    sel.addEventListener('change', () => {
      if (sel.id === 'style-select') {
        checkGenerateButtonState();
        updateAllTagsUI();
      } else {
        handleCompositionChange();
      }
    });
  });
}

function updateOptionChecks() {
  [compSelectA, compSelectB, compSelectC].forEach(sel => {
    if (!sel) return;
    for (const opt of sel.options) {
      if (opt.value === '') continue;
      const baseLabel = opt.dataset.label || opt.textContent.replace(/^✓\s*/, '');
      opt.dataset.label = baseLabel;
      opt.textContent = selectedCompositions.includes(opt.value) ? `✓ ${baseLabel}` : baseLabel;
    }
  });
}

function checkGenerateButtonState() {
  const uploadedCount = Object.values(uploadedImages).filter(Boolean).length;
  const customText = customPromptEl ? customPromptEl.value.trim() : '';
  generateBtn.disabled = !(uploadedCount >= 1 && (styleSelect.value || selectedCompositions.length > 0 || customText !== ''));
}

// ===== TOGGLE BUTTONS (formato, resolución) y selector de modelo =====
function initToggleButtons() {
  document.getElementById('ar-selector').addEventListener('click', e => {
    const btn = e.target.closest('.aspect-ratio-button');
    if (!btn) return;
    document.querySelectorAll('#ar-selector .aspect-ratio-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAR = btn.dataset.ar;
  });
  document.getElementById('res-selector').addEventListener('click', e => {
    const btn = e.target.closest('.aspect-ratio-button');
    if (!btn) return;
    document.querySelectorAll('#res-selector .aspect-ratio-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRes = parseInt(btn.dataset.res);
  });
  document.querySelectorAll('.model-toggle').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.model-toggle').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      selectedModel = button.dataset.model;
    });
  });
}

// ===== PROMPT PERSONALIZADO + MEJORAR CON IA =====
function buildCustomPrompt(customText, styleText) {
  const base = [
    'Professional advertising photography composition.',
    'Style: ' + styleText + '.',
    customText,
    'Integrate the reference images: use the background scene, place the model naturally within it, dress the model with the clothing item, and add the accessory with correct scale, contact shadows, and occlusions.',
    'Match lighting, color temperature, and perspective to the background scene.',
    'Photorealistic rendering, catalog quality, soft diffused daylight.',
    'No text, no watermarks, no logos overlaid.',
    '4K, highly detailed, premium product photography.'
  ];
  return base.join(' ');
}

function initCustomPromptUI() {
  if (customPromptEl) customPromptEl.addEventListener('input', () => checkGenerateButtonState());
  if (improvePromptBtn) improvePromptBtn.addEventListener('click', improvePrompt);
}

function setImproveStatus(text) {
  if (improvePromptStatus) improvePromptStatus.textContent = text || '';
}

async function improvePrompt() {
  const base = customPromptEl.value.trim();
  if (!base) {
    setImproveStatus('Escribe primero tu composición en el campo de arriba.');
    if (customPromptEl) customPromptEl.focus();
    return;
  }
  improvePromptBtn.disabled = true;
  if (improvePromptBtnText) improvePromptBtnText.textContent = 'MEJORANDO...';
  setImproveStatus('Generando 4 variantes...');
  try {
    const response = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'openrouter',
        model: 'openai/gpt-4o-mini',
        prompt: 'Mejora este prompt base de fotografía publicitaria. Devuelve EXACTAMENTE 4 variantes mejoradas, todas en inglés, con enfoques distintos (1 fiel al original, 2 cinematográfica, 3 comercial/catálogo, 4 creativa). Conserva SIEMPRE los elementos esenciales del original: sujeto, acción, escenario, prendas, complementos, iluminación y estilo. Responde SOLO con un JSON válido: {"variants": ["...", "...", "...", "..."]}, sin texto adicional. Prompt base: ' + base
      })
    });
    const data = await response.json();
    if (!data.success || !data.text) throw new Error(data.error || 'Respuesta inválida del servidor.');
    const variants = parseVariants(data.text);
    if (!variants.length) throw new Error('No se pudieron extraer las variantes.');
    promptVariants = variants.slice(0, 4);
    renderPromptVariants();
    await persistPromptVariants(base);
    setImproveStatus('4 prompts listos. Pulsa uno para probarlo.');
  } catch (err) {
    console.error('Error mejorando prompt:', err);
    setImproveStatus('Error al mejorar el prompt. Inténtalo de nuevo.');
  } finally {
    improvePromptBtn.disabled = false;
    if (improvePromptBtnText) improvePromptBtnText.textContent = '✨ Mejorar Prompt';
  }
}

function parseVariants(text) {
  try {
    const match = String(text).match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) return arr.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
    }
  } catch (e) { /* fallback */ }
  return String(text)
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter((l) => l.length > 20)
    .slice(0, 4);
}

function renderPromptVariants() {
  if (!promptVariantsEl) return;
  if (!promptVariants.length) { promptVariantsEl.innerHTML = ''; return; }
  promptVariantsEl.innerHTML = promptVariants.map((v, i) =>
    '<button type="button" class="prompt-variant-btn" onclick="window._applyPromptVariant(' + i + ')" title="' + v.replace(/"/g, '&quot;') + '" aria-label="Usar variante ' + (i + 1) + '">' +
      '<span class="prompt-variant-num">' + (i + 1) + '</span>' +
      '<span class="prompt-variant-text">' + v.replace(/"/g, '&quot;') + '</span>' +
    '</button>'
  ).join('');
}

window._applyPromptVariant = function (i) {
  if (!promptVariants[i]) return;
  if (customPromptEl) {
    customPromptEl.value = promptVariants[i];
    customPromptEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
  checkGenerateButtonState();
  if (!generateBtn.disabled) generateImages();
};

async function persistPromptVariants(original) {
  try {
    await history.save({
      id: 'prompt_variants',
      type: 'prompt_variants',
      data: { original: original, variants: promptVariants },
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Error guardando variantes:', e);
  }
}

function restorePromptVariants() {
  if (!history || !history.getAll) return;
  const items = history.getAll() || [];
  const saved = items.find((it) => it.type === 'prompt_variants');
  if (!saved || !saved.data || !Array.isArray(saved.data.variants) || !saved.data.variants.length) return;
  promptVariants = saved.data.variants.slice(0, 4);
  if (customPromptEl && saved.data.original && !customPromptEl.value.trim()) {
    customPromptEl.value = saved.data.original;
  }
  renderPromptVariants();
}

// ===== GENERACIÓN DE IMÁGENES CON FLUX =====
async function generateImages() {
  if (generateBtn.disabled) return;

  const customText = customPromptEl.value.trim();
  const compsToRun = customText ? ['custom'] : selectedCompositions;
  const numVariants = 1;
  const totalImages = Math.min(compsToRun.length * numVariants, 4);
  let currentImage = 0;
  let successCount = 0;

  // Overlay de carga
  const overlay = document.getElementById('loading-overlay');
  const loadingTextOverlay = document.getElementById('loading-text');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const secondaryStatus = document.getElementById('secondary-status');

  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  if (loadingTextOverlay) loadingTextOverlay.textContent = 'IA generando lo solicitado...';
  if (progressPercent) progressPercent.style.display = 'none';
  if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.classList.add('indeterminate');
  }

  generateBtn.disabled = true;
  downloadAllBtn.disabled = true;
  resultsSection.classList.add('active');
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  try {
    for (const comp of compsToRun) {
      for (let v = 1; v <= numVariants; v++) {
        if (currentImage >= totalImages) break;
        currentImage++;
        if (secondaryStatus) secondaryStatus.textContent = `Generando imagen ${currentImage} de ${totalImages}...`;

        const compMeta = comp === 'custom' ? { title: 'Composición Personalizada', description: 'Composición personalizada escrita por el usuario.' } : COMPOSITION_MAP[comp];
    const styleName = styleSelect.options[styleSelect.selectedIndex]?.textContent || styleSelect.value || 'Cinemático';
    const prompt = comp === 'custom' ? buildCustomPrompt(customText, styleName) : buildCompositionPrompt(comp, compMeta, styleName, v, compMeta?.description);

        // Construir array de imágenes: [scenario, model, clothing, accessory]
        const orderedKeys = ['scenario', 'model', 'clothing', 'accessory'];
        const imageList = [];
        orderedKeys.forEach(key => {
          if (uploadedDataURLs[key]) imageList.push(uploadedDataURLs[key]);
        });

        if (imageList.length === 0) continue;

        // Body para el proxy canónico (JSON)
        const body = {
          action: 'generate',
          prompt: prompt,
          model: selectedModel,
          aspectRatio: selectedAR,
          resolution: selectedRes,
          output_format: 'png',
          seed: Date.now() + Math.floor(Math.random() * 100000),
        };

        if (imageList.length === 1) {
          body.image = imageList[0];
        } else {
          body.images = imageList;
        }

        try {
          const response = await fetch('proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const data = await response.json();

          if (data.success && data.dataUrl) {
            const processed = await postProcessDataURL(data.dataUrl);
            const imgKey = `${comp}_${v}`;
            generatedImages.unshift({ key: imgKey, data: processed });
            addResultCard(imgKey, processed, comp, { styleLabel: styleName, modelLabel: getModelLabel(selectedModel), ar: selectedAR, res: selectedRes });

            // Guardar en historial
            const histId = 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
            try {
              await history.save({
                id: histId,
                type: 'composition',
                data: {
        url: processed,
        prompt: prompt,
        composition: comp,
        variant: v,
        style: styleSelect.value,
        styleLabel: styleName,
        compositionLabel: (compMeta && compMeta.title) || comp,
        model: selectedModel,
        modelLabel: getModelLabel(selectedModel),
        resolution: selectedRes,
        aspectRatio: selectedAR,
        width: data.width || null,
        height: data.height || null,
        requestedResolution: data.requestedResolution || null,
        resolutionAdjusted: !!data.resolutionAdjusted
      },
                imageData: processed,
                createdAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn('Error guardando en historial:', e);
            }

            successCount++;
          } else {
            console.error(`Error FLUX para ${comp} v${v}:`, data.error || 'Respuesta inválida');
            if (secondaryStatus) secondaryStatus.textContent = `Error en imagen ${currentImage}. Continuando...`;
          }
        } catch (fetchErr) {
          console.error(`Error de conexión para ${comp} v${v}:`, fetchErr);
          if (secondaryStatus) secondaryStatus.textContent = `Error de conexión en imagen ${currentImage}.`;
        }

        checkDownloadAllState();
      }
    }
  } catch (error) {
    console.error('Error general en generación:', error);
    alert(`Ocurrió un error: ${error.message}`);
  } finally {
    // Ocultar overlay
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
    if (progressBar) progressBar.classList.remove('indeterminate');
    generateBtn.disabled = false;
    if (secondaryStatus && successCount > 0) {
      secondaryStatus.textContent = `Completado: ${successCount} imágenes generadas.`;
    }
  }
}

// ===== RESULTADOS =====
function addResultCard(compKey, imgData, comp, meta = {}) {
  const match = compKey.match(/^(.*)_(\d+)$/);
  const baseKey = match ? match[1] : compKey;
  const variantNum = match ? match[2] : '1';
  const variantText = parseInt(variantNum) > 1 ? ` (Variante ${variantNum})` : '';
  const card = document.createElement('div');
  card.className = 'result-card animate-in';
  card.dataset.key = compKey;

  const safeTitle = (COMPOSITION_MAP[baseKey]?.title || (baseKey === 'custom' ? 'Composición Personalizada' : baseKey)).replace(/"/g, '&quot;');
  const filename = `${baseKey.replace(/[^a-z0-9]/gi, '-')}_variant${variantNum}.png`;

  card.innerHTML = `
    <div class="image-container">
      <img src="${imgData}" class="result-image" alt="Resultado ${safeTitle}" onclick="openModal(this.src)" loading="lazy">
      <div class="image-toolbar">
        <button class="tool-btn download-btn-icon" onclick="event.stopPropagation();downloadSingleImage('${compKey}')" title="Descargar" aria-label="Descargar imagen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="tool-btn delete-btn-icon" onclick="event.stopPropagation();deleteImage(this)" title="Eliminar" aria-label="Eliminar imagen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
    <div class="result-info">
      <h3>${safeTitle}${variantText}</h3>
      <p>${COMPOSITION_MAP[baseKey]?.description || (baseKey === 'custom' ? 'Composición personalizada por el usuario.' : 'Composición generada.')}</p>
 <p class="result-meta">🎨 ${meta.styleLabel || '—'} · 🤖 ${meta.modelLabel || '—'}${meta.ar ? ' · ' + meta.ar + ' ' + meta.res + 'px' : ''}</p>
    </div>
  `;
  resultsGrid.insertBefore(card, resultsGrid.firstChild);
  setTimeout(() => card.classList.remove('animate-in'), 300);
}

function downloadSingleImage(compKey) {
  const img = generatedImages.find(g => g.key === compKey);
  if (!img) return;
  const a = document.createElement('a');
  a.href = img.data;
  a.download = `${compKey.replace(/[^a-z0-9]/gi, '-')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteImage(buttonEl) {
  const card = buttonEl.closest('.result-card');
  if (!card) return;
  const compKey = card.dataset.key;
  if (compKey) {
    generatedImages = generatedImages.filter(img => img.key !== compKey);
  }
  card.remove();
  checkDownloadAllState();
}

function openModal(src) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  if (modalImg && modal) {
    modalImg.src = src;
    modal.style.display = 'flex';
  }
}

async function downloadAllImages() {
  if (generatedImages.length === 0) {
    alert('No hay imágenes generadas para descargar.');
    return;
  }
  if (typeof JSZip === 'undefined') {
    alert('Error: La librería JSZip no está disponible. Recarga la página.');
    return;
  }

  const zip = new JSZip();
  let validCount = 0;

  for (const imgObj of generatedImages) {
    const { key, data } = imgObj;
    if (typeof data !== 'string' || !data.startsWith('data:image/')) continue;
    try {
      const base64Data = data.split(',')[1];
      const match = key.match(/^(.*)_(\\d+)$/);
      const baseKey = match ? match[1] : key;
      const variantNum = match ? match[2] : '1';
      const filename = `${baseKey.replace(/[^a-z0-9]/gi, '-')}_variant${variantNum}.png`;
      zip.file(filename, base64Data, { base64: true });
      validCount++;
    } catch (error) {
      console.error(`Error procesando la imagen ${key}:`, error);
    }
  }

  if (validCount === 0) {
    alert('No se encontraron imágenes válidas para descargar.');
    return;
  }

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `composiciones_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generando el ZIP:', error);
    alert(`Error al generar el archivo ZIP: ${error.message}`);
  }
}

function checkDownloadAllState() {
  downloadAllBtn.disabled = generatedImages.length === 0;
}

function resetComposition() {
  uploadedImages = { scenario: null, model: null, clothing: null, accessory: null };
  uploadedDataURLs = { scenario: null, model: null, clothing: null, accessory: null };
  document.querySelectorAll('.preview-image').forEach(p => { p.src = ''; p.style.display = 'none'; });
  [styleSelect, compSelectA, compSelectB, compSelectC].forEach(sel => { if (sel) sel.value = ''; });
  selectedCompositions = [];
  generatedImages = [];
  selectionInfo.textContent = 'Seleccionados: 0/3';
  updateOptionChecks();
  updateAllTagsUI();
  resultsSection.classList.remove('active');
  resultsGrid.innerHTML = '';
  downloadAllBtn.disabled = true;
  checkGenerateButtonState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== TAGS DE SELECCIÓN =====
function updateAllTagsUI() {
  [styleSelect, compSelectA, compSelectB, compSelectC].forEach(sel => {
    if (!sel) return;
    const group = sel.closest('.select-group, .selectors-grid');
    const container = group.querySelector('.cs-tags-container');
    if (!container) return;

    container.innerHTML = '';

    if (sel.value) {
      const selectedOption = sel.options[sel.selectedIndex];
      if (!selectedOption || selectedOption.value === '') return;
      const tag = document.createElement('div');
      tag.className = 'cs-tag';
      const tagName = selectedOption.textContent.replace(/^✓\s*/, '');
      tag.innerHTML = `
        <span>${tagName}</span>
        <button class="cs-tag-delete" data-select-id="${sel.id}" aria-label="Eliminar selección">&times;</button>
      `;
      container.appendChild(tag);
    }
  });
}

function handleTagDeletion(e) {
  if (!e.target.matches('.cs-tag-delete')) return;
  const selectId = e.target.dataset.selectId;
  const selectToClear = document.getElementById(selectId);
  if (selectToClear) {
    selectToClear.value = '';
    selectToClear.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// ===== SELECTORES PERSONALIZADOS =====
let csLayer;
function initCustomSelects() {
  csLayer = document.createElement('div');
  csLayer.id = 'cs-layer';
  csLayer.className = 'cs-layer';
  document.body.appendChild(csLayer);
  enhanceAllSelects();
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.cs-btn, .cs-popup')) closeAllLists();
  }, true);
}
function enhanceAllSelects() { document.querySelectorAll('select:not([data-cs-enhanced])').forEach(enhanceSelect); }
function enhanceSelect(sel) {
  if (sel.dataset.csEnhanced) return;
  sel.dataset.csEnhanced = 'true';
  sel.classList.add('visually-hidden');
  const wrap = document.createElement('div');
  wrap.className = 'cs';
  wrap.dataset.for = sel.id;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cs-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'cs-label';
  label.textContent = sel.options[sel.selectedIndex]?.textContent || 'Elige una opción';
  const svgIcon = `<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>`;
  btn.innerHTML = `<span class="cs-label">${label.textContent}</span>${svgIcon}`;
  const list = document.createElement('ul');
  list.className = 'cs-list';
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  wrap.cs = { list, sel, btn };
  sel.insertAdjacentElement('afterend', wrap);
  wrap.appendChild(btn);
  btn.addEventListener('click', () => {
    const isOpening = btn.getAttribute('aria-expanded') === 'false';
    closeAllLists();
    if (isOpening) toggleList(wrap, true);
  });
}
function refreshCustomSelects() {
  document.querySelectorAll('.cs').forEach(wrap => {
    if (!wrap.cs) return;
    const { sel, btn } = wrap.cs;
    const selectedOption = sel.options[sel.selectedIndex];
    const labelEl = btn.querySelector('.cs-label');
    if (labelEl) labelEl.textContent = selectedOption ? selectedOption.textContent.replace(/^✓\s*/, '') : 'Elige una opción';
  });
}
function rebuildList(wrap) {
  const { list, sel } = wrap.cs;
  list.innerHTML = '';
  Array.from(sel.options).forEach(opt => {
    const li = document.createElement('li');
    li.className = 'cs-option' + (opt.value === '' ? ' is-none' : '');
    li.setAttribute('role', 'option');
    li.dataset.value = opt.value;
    li.textContent = opt.textContent.replace(/^✓\s*/, '');
    if (sel.value === opt.value) {
      li.classList.add('selected');
      li.setAttribute('aria-selected', 'true');
    }
    list.appendChild(li);
  });
  list.removeEventListener('click', handleOptionClick);
  list.addEventListener('click', handleOptionClick);
}
function handleOptionClick(e) {
  const item = e.target.closest('.cs-option');
  if (!item) return;
  const list = e.currentTarget;
  const wrap = list.csWrap;
  const { sel } = wrap.cs;
  if (sel.value !== item.dataset.value) {
    sel.value = item.dataset.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  toggleList(wrap, false);
}
function toggleList(wrap, open) {
  const { btn, list } = wrap.cs;
  btn.setAttribute('aria-expanded', String(open));
  if (open) {
    rebuildList(wrap);
    list.classList.add('cs-popup');
    list.csWrap = wrap;
    csLayer.appendChild(list);
    positionList(btn, list);
    window.addEventListener('scroll', onRelayout, true);
    window.addEventListener('resize', onRelayout);
  } else {
    list.classList.remove('cs-popup');
    if (list.parentElement === csLayer) csLayer.removeChild(list);
    window.removeEventListener('scroll', onRelayout, true);
    window.removeEventListener('resize', onRelayout);
  }
  function onRelayout() { positionList(btn, list); }
}
function closeAllLists() { document.querySelectorAll('.cs').forEach(w => toggleList(w, false)); }
function positionList(btn, list) {
  const r = btn.getBoundingClientRect();
  const gap = 8;
  list.style.left = `${r.left}px`;
  list.style.top = `${r.bottom + gap}px`;
  list.style.minWidth = `${r.width}px`;
  const spaceBelow = window.innerHeight - (r.bottom + gap + 12);
  const spaceAbove = r.top - gap - 12;
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    list.style.top = 'auto';
    list.style.bottom = `${window.innerHeight - r.top + gap}px`;
    list.style.maxHeight = `${spaceAbove}px`;
  } else {
    list.style.bottom = 'auto';
    list.style.top = `${r.bottom + gap}px`;
    list.style.maxHeight = `${spaceBelow}px`;
  }
}
