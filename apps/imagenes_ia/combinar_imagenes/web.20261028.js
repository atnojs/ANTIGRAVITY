/**
 * ============================================
 * 🎨 COMBINAR IMÁGENES - JavaScript
 * Aplicación para fusionar imágenes con IA
 * ============================================
 */

const CONFIG = {
    MAX_IMAGES: 10,
    MIN_IMAGES: 2,
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    PROXY_URL: 'proxy.php',
    INITIAL_SLOTS: 4
};

// Catálogo canónico (2026-09-25): OpenAI 2.5 (5 calidades) + Gemini + QWEN 3 PRO. (lista cerrada)
const MODEL_LABELS = {
    'openai-medium': 'MEDIUM',
    'openai-high': 'HIGH',
    'openai-xhigh': 'XHIGH',
    'openai-max-flare': 'MAX FLARE',
    'openai-max-sunburst': 'MAX SUNBURST',
    'gemini-2': 'GEMINI 2',
    'gemini-flash': '3.1 FLASH',
    'gemini-pro': '3 PRO',
    'qwen-pro': 'QWEN 3 PRO',
    'openai-image-2-low': 'IMAGE 2 LOW',
    'openai-image-2': 'IMAGE 2 MEDIUM',
    'openai-image-2-high': 'IMAGE 2 HIGH',
    'flow-nano-banana-2': 'NANO BANANA 2',
    'flow-nano-banana-pro': 'NANO BANANA PRO',
    'flow-nano-banana-2-lite': 'NANO BANANA 2 LITE'
};

// ===== Google Flow (gratis en el PC): cola pública de apps/flow_studio =====
// La cola valida nombres literales, no los ids: se traduce aquí. El conector
// `flow-client.20261028.js` mantiene el latido y expone window.FlowClient.
const FLOW_MODELS = {
    'flow-nano-banana-2': 'Nano Banana 2',
    'flow-nano-banana-pro': 'Nano Banana Pro',
    'flow-nano-banana-2-lite': 'Nano Banana 2 Lite'
};
const isFlowModel = (model) => Object.prototype.hasOwnProperty.call(FLOW_MODELS, model);
// Flow solo admite 1:1, 4:3, 3:4, 16:9 y 9:16: el resto se aproxima al más cercano.
const FLOW_ASPECT_MAP = {
    '1:1': '1:1', '4:3': '4:3', '3:4': '3:4', '16:9': '16:9', '9:16': '9:16',
    '3:2': '4:3', '4:5': '3:4', '21:9': '16:9'
};
const flowRatioFor = (aspectRatio) => FLOW_ASPECT_MAP[aspectRatio] || '1:1';
// Flow viaja con 2 referencias como máximo (tope de la cola).
const FLOW_MAX_REFS = 2;


// --- HISTORIAL PERSISTENTE CON INDEXEDDB ---
const DB_NAME = 'combinar_imagenes_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';

let db = null;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function loadHistoryFromStorage() {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const items = request.result || [];
                // Ordenar por timestamp descendente (más recientes primero)
                items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn('Error cargando historial:', e);
        return [];
    }
}

async function saveItemToStorage(item) {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) { console.warn('Error guardando item:', e); }
}

async function deleteItemFromStorage(id) {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) { console.warn('Error eliminando item:', e); }
}

const state = {
    images: new Array(CONFIG.MAX_IMAGES).fill(null), // Array fijo con tamaño máximo, lleno de nulls inicialmente
    history: [],
    selectedAR: '1:1',
    selectedModel: 'openai-image-2-low',
    selectedRes: 1024, // Resolución (lado objetivo px): 512 / 1024 / 2048 / 4096
    isGenerating: false,
    isEnhancing: false,
    currentLightboxImage: null,
    promptOptions: []
};

const elements = {
    imagesGrid: document.getElementById('imagesGrid'),
    imageCounter: document.getElementById('imageCounter'),
    promptInput: document.getElementById('promptInput'),
    arSelector: document.getElementById('arSelector'),
    resSelector: document.getElementById('resSelector'),
    resNote: document.getElementById('resNote'),
    modelSelector: document.getElementById('modelSelector'),
    btnGenerate: document.getElementById('btnGenerate'),
    btnEnhance: document.getElementById('btnEnhance'),
    btnClearPrompt: document.getElementById('btnClearPrompt'),
    promptButtons: document.getElementById('promptButtons'),
    progressContainer: document.getElementById('loadingOverlay'),
    secondaryStatus: document.getElementById('secondaryStatus'),
    errorMessage: document.getElementById('errorMessage'),
    historySection: document.getElementById('historySection'),
    historyGrid: document.getElementById('historyGrid'),
    historyEmpty: document.getElementById('historyEmpty'),
    historyCount: document.getElementById('historyCount'),
    lightbox: document.getElementById('lightbox'),
    lightboxBackdrop: document.getElementById('lightboxBackdrop'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxDownload: document.getElementById('lightboxDownload'),
    lightboxClose: document.getElementById('lightboxClose')
};

// ═══════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════

async function init() {
    // Historial: el SERVIDOR es la fuente de verdad (history.php canónico →
    // history_store/, no versionado). IndexedDB se conserva solo como caché local.
    try {
        await openDatabase();
        const localItems = await loadHistoryFromStorage();

        if (typeof HistoryManager === 'function') {
            window.historyManager = new HistoryManager('combinar_imagenes');
            const serverItems = await window.historyManager.load();
            const vistos = new Set();
            const mezcla = [];
            const mapaLocal = new Map(localItems.map(item => [item.id, item]));

            for (const entrada of (serverItems || [])) {
                const local = mapaLocal.get(entrada.id);
                const url = entrada.imageUrl || entrada.data?.dataUrl || '';
                const mime = entrada.data?.mimeType || (url.match(/^data:([^;]+);/) || [])[1] || 'image/png';
                const base64 = local?.data || (url.includes(',') ? url.split(',')[1] : '');
                if (!base64) continue;
                vistos.add(entrada.id);
                mezcla.push({
                    id: entrada.id,
                    data: base64,
                    mimeType: mime,
                    prompt: entrada.data?.prompt || '',
                    aspectRatio: entrada.data?.aspectRatio || '',
                    hasBackground: !!entrada.data?.hasBackground,
                    timestamp: Date.parse(entrada.createdAt) || Date.now()
                });
            }
            for (const item of localItems) {
                if (!vistos.has(item.id)) mezcla.push(item);
            }
            mezcla.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            state.history = mezcla;
        } else {
            state.history = localItems;
        }
    } catch (e) {
        console.warn('Error inicializando historial:', e);
        state.history = [];
    }

    renderImageSlots();
    setupARSelector();
    setupResSelector();
    setupModelSelector();
    setupFlowStatus();
    // ===== Tooltip de modelos (popup hover) =====
    const modelTooltip = document.getElementById('model-tooltip');
        if (modelTooltip) {
            const TOOLTIP_GAP = 10;
            const hideModelTooltip = () => {
                modelTooltip.classList.remove('visible', 'tip-above', 'tip-below');
                modelTooltip.setAttribute('aria-hidden', 'true');
                modelTooltip.textContent = '';
            };
            const showModelTooltip = (button) => {
                const text = (button.dataset.tooltip || '').trim();
                if (!text) { hideModelTooltip(); return; }
                modelTooltip.textContent = text;
                modelTooltip.classList.remove('tip-above', 'tip-below');
                modelTooltip.classList.add('visible');
                modelTooltip.setAttribute('aria-hidden', 'false');
                const rect = button.getBoundingClientRect();
                const tw = modelTooltip.offsetWidth;
                const th = modelTooltip.offsetHeight;
                let left = rect.left + rect.width / 2 - tw / 2;
                left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
                let top = rect.top - th - TOOLTIP_GAP;
                if (top < 8) {
                    top = rect.bottom + TOOLTIP_GAP;
                    modelTooltip.classList.add('tip-below');
                } else {
                    modelTooltip.classList.add('tip-above');
                }
                modelTooltip.style.left = left + 'px';
                modelTooltip.style.top = top + 'px';
            };
            document.querySelectorAll('.model-toggle').forEach((button) => {
                button.addEventListener('mouseenter', () => showModelTooltip(button));
                button.addEventListener('mouseleave', hideModelTooltip);
                button.addEventListener('focus', () => showModelTooltip(button));
                button.addEventListener('blur', hideModelTooltip);
            });
            window.addEventListener('scroll', hideModelTooltip, true);
            window.addEventListener('resize', hideModelTooltip);
        }

    setupPromptEnhancement();
    elements.btnGenerate.addEventListener('click', handleGenerate);
    setupLightbox();
    renderHistory(); // Renderizar historial cargado
    console.log('✅ Combinar Imágenes inicializado');
}

// ═══════════════════════════════════════════════
// GESTIÓN DE SLOTS DE IMÁGENES
// ═══════════════════════════════════════════════

function renderImageSlots() {
    elements.imagesGrid.innerHTML = '';

    // Contamos cuantos slots llenos hay para saber hasta dónde mostrar, 
    // pero siempre respetando un mínimo de INITIAL_SLOTS
    let lastFilledIndex = -1;
    for (let i = 0; i < state.images.length; i++) {
        if (state.images[i] !== null) {
            lastFilledIndex = i;
        }
    }

    const slotsToShow = Math.min(
        Math.max(lastFilledIndex + 2, CONFIG.INITIAL_SLOTS), // Muestra hasta el último lleno + 1 (para subir nueva)
        CONFIG.MAX_IMAGES
    );

    for (let i = 0; i < slotsToShow; i++) {
        const slot = createImageSlot(i);
        elements.imagesGrid.appendChild(slot);
    }

    updateImageCounter();
}

function createImageSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'image-slot';
    slot.dataset.index = index;

    const isBackground = index === 0;
    if (isBackground) {
        slot.classList.add('background-slot');
    }

    const image = state.images[index];

    if (image) {
        slot.classList.add('filled');
        slot.innerHTML = `
            <div class="slot-preview">
                <img src="${image.preview}" alt="Imagen ${isBackground ? 'Fondo' : index}">
            </div>
            <div class="slot-actions">
                <button class="btn-remove" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                </button>
            </div>
            <span class="slot-label">${isBackground ? 'Fondo' : index}</span>
        `;

        slot.querySelector('.btn-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
        });

    } else {
        slot.innerHTML = `
            <svg class="slot-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
            </svg>
            <span class="slot-label">${isBackground ? 'Fondo' : index}</span>
        `;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = CONFIG.ALLOWED_TYPES.join(',');
        input.hidden = true;
        slot.appendChild(input);

        slot.addEventListener('click', () => input.click());

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageFile(e.target.files[0], index);
            }
        });

        // Drag & Drop
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('dragover');
        });

        slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleImageFile(e.dataTransfer.files[0], index);
            }
        });
    }

    return slot;
}

async function handleImageFile(file, index) {
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showError('Formato no válido. Usa: JPG, PNG o WebP');
        return;
    }

    try {
        const base64 = await fileToBase64(file);

        const imageData = {
            data: base64.split(',')[1],
            mimeType: file.type,
            preview: base64,
            isBackground: index === 0
        };

        // Asignación directa al índice correcto
        state.images[index] = imageData;

        // NO filtramos nulls para mantener posiciones fijas

        renderImageSlots();
        hideError();

    } catch (error) {
        showError('Error al procesar la imagen');
        console.error(error);
    }
}

function removeImage(index) {
    state.images[index] = null; // En lugar de splice, ponemos null para vaciar el slot
    renderImageSlots();
}

function updateImageCounter() {
    const filledCount = state.images.filter(img => img !== null).length;
    elements.imageCounter.textContent = `${filledCount}/${CONFIG.MAX_IMAGES}`;
}

// ═══════════════════════════════════════════════
// MEJORAR PROMPT CON IA (MULTIMODAL)
// ═══════════════════════════════════════════════

async function handleEnhancePrompt() {
    const prompt = elements.promptInput.value.trim();

    // Recopilar imágenes activas
    const activeImages = state.images
        .filter(img => img !== null)
        .map(img => ({
            data: img.data,
            mimeType: img.mimeType,
            isBackground: img.isBackground
        }));

    if (activeImages.length === 0 && !prompt) {
        showError('Sube imágenes o escribe un prompt');
        return;
    }

    setEnhancing(true);
    setProcessing(true, 'Mejorando prompt...');
    hideError();

    try {
        const hasBackground = activeImages.some(img => img.isBackground);

        const response = await fetch(CONFIG.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'enhancePrompt',
                prompt: prompt || "Describe y combina estas imágenes de forma creativa",
                hasBackground: hasBackground,
                images: activeImages // Enviamos las imágenes para contexto visual
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message || data.error);

        if (data.options && data.options.length > 0) {
            state.promptOptions = data.options.slice(0, 4);
            showPromptButtons();
        } else {
            showError('No se pudieron generar opciones');
        }

    } catch (error) {
        showError(error.message || 'Error al mejorar el prompt');
        console.error('Error:', error);
    } finally {
        setEnhancing(false);
        setProcessing(false);
    }
}

// ... (Resto de funciones: setupPromptEnhancement, showPromptButtons, hidePromptButtons, setEnhancing, handleGenerate, setProcessing, addToHistory, renderHistory, createHistoryCard, downloadImage, regenerateImage, deleteFromHistory, setupLightbox, openLightbox, closeLightbox, fileToBase64, showError, hideError - SIN CAMBIOS IMPORTANTES)

function setupARSelector() {
    const buttons = elements.arSelector.querySelectorAll('.ar-option');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedAR = btn.dataset.ar;
        });
    });
}

function setupModelSelector() {
    const toggleGroup = document.querySelector('.model-provider-layout');
    if (!toggleGroup) return;
    const buttons = toggleGroup.querySelectorAll('.model-toggle');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            state.selectedModel = btn.dataset.model;
            state.selectedModelLabel = MODEL_LABELS[state.selectedModel] || state.selectedModel;
            window.selectedModel = state.selectedModel;
            syncFlowUi();
        });
    });
    // Exponer valor inicial
    window.selectedModel = state.selectedModel;
    state.selectedModelLabel = MODEL_LABELS[state.selectedModel] || state.selectedModel;
    syncFlowUi();
}

// ═══════════════════════════════════════════════
// ESTADO DE LA CONEXIÓN CON EL PC DE FLOW
// El conector mantiene el latido siempre vivo (también en segundo plano y tras
// un corte); aquí solo se pinta el estado y se ofrece reintentar.
// ═══════════════════════════════════════════════

function flowClient() {
    return typeof window.FlowClient !== 'undefined' ? window.FlowClient : null;
}

function renderFlowStatus(flow) {
    const el = document.getElementById('flowStatus');
    const textEl = document.getElementById('flowStatusText');
    if (!el || !textEl) return;
    const status = (flow && flow.status) || 'checking';
    const pending = Number(flow && flow.pending) || 0;
    el.classList.remove('is-checking', 'is-online', 'is-offline');
    el.classList.add('is-' + status);
    if (status === 'online') {
        textEl.textContent = pending > 0 ? `Flow conectado · ${pending} en cola` : 'Flow conectado';
        el.title = 'El PC de Flow responde. Los modelos FLOW se generan ahí, sin gastar clave de API.';
    } else if (status === 'offline') {
        textEl.textContent = 'Flow sin conexión · Reintentar';
        el.title = 'El PC de Flow no responde. Enciéndelo o pulsa aquí para reintentar: el trabajo queda en cola y se genera al conectar.';
    } else {
        textEl.textContent = 'Conectando con Flow…';
        el.title = 'Comprobando la conexión con el PC de Flow…';
    }
}

function setupFlowStatus() {
    const client = flowClient();
    const el = document.getElementById('flowStatus');
    if (el) {
        el.addEventListener('click', () => {
            const c = flowClient();
            if (c) c.ping();
        });
    }
    if (!client) {
        renderFlowStatus({ status: 'offline' });
        return;
    }
    client.start();
    client.subscribe(renderFlowStatus);
}

// Refleja en la UI lo que Flow sí puede hacer: sin resolución propia y con
// solo dos referencias. Se llama al cambiar de modelo.
function syncFlowUi() {
    const flow = isFlowModel(state.selectedModel);
    const buttons = elements.resSelector ? elements.resSelector.querySelectorAll('.ar-option') : [];
    buttons.forEach(btn => {
        btn.disabled = flow;
        btn.classList.toggle('is-disabled', flow);
    });
    updateResNote();
}


function setupResSelector() {
    if (!elements.resSelector) return;
    const buttons = elements.resSelector.querySelectorAll('.ar-option');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedRes = parseInt(btn.dataset.res, 10);
            updateResNote();
        });
    });
    updateResNote();
}

// A 4096 la imagen se genera al máximo nativo y se reescala en el navegador.
// Con Flow no hay resolución que elegir: se avisa en el mismo sitio.
function updateResNote() {
    if (!elements.resNote) return;
    if (isFlowModel(state.selectedModel)) {
        elements.resNote.textContent = 'Flow: resolución nativa (~1K) y 2 referencias como máximo. Formato: 1:1, 4:3, 3:4, 16:9 o 9:16 (3:2→4:3, 4:5→3:4, 21:9→16:9).';
        return;
    }
    if (state.selectedRes >= 4096) {
        elements.resNote.textContent = 'La salida de 4096 px se reescala en tu equipo desde el máximo nativo del modelo.';
    } else {
        elements.resNote.textContent = '';
    }
}

function setupPromptEnhancement() {
    elements.btnEnhance.addEventListener('click', handleEnhancePrompt);
    elements.btnClearPrompt.addEventListener('click', () => {
        elements.promptInput.value = '';
        hidePromptButtons();
    });

    const promptBtns = elements.promptButtons.querySelectorAll('.prompt-btn');
    promptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (state.promptOptions[index]) {
                promptBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                elements.promptInput.value = state.promptOptions[index];
            }
        });
    });
}

function showPromptButtons() {
    elements.promptButtons.classList.remove('hidden');
    elements.promptButtons.querySelectorAll('.prompt-btn').forEach(b => b.classList.remove('selected'));
}

function hidePromptButtons() {
    elements.promptButtons.classList.add('hidden');
    state.promptOptions = [];
}

function setEnhancing(isEnhancing) {
    state.isEnhancing = isEnhancing;
    elements.btnEnhance.disabled = isEnhancing;
    elements.btnEnhance.innerHTML = isEnhancing
        ? `<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Mejorando...`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21"/><path d="M17 3v4"/><path d="M21 5h-4"/></svg> Mejorar Prompt`;
}

// Llamada al proxy con espera activa. Para qwen-pro (más lento que el timeout
// de nginx, ~55s) el proxy guarda el resultado en caché y responde
// 'processing' mientras el worker termina de generarlo: reintentamos hasta
// recoger la imagen (patrón canónico dibujo_lineas_copia).
async function proxyFetchWithWait(body, maxAttempts = 36) {
    const slowModel = body && body.model === 'qwen-pro';
    let lastError = 'Sin respuesta del modelo.';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const res = await fetch(CONFIG.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const json = await res.json().catch(() => null);
            if (res.ok && json && json.images && json.images.length > 0) return json;
            if (json && json.status === 'processing') {
                lastError = 'Generando...';
            } else if (json && json.error && json.error.message) {
                lastError = json.error.message;
                if (!slowModel || res.status < 500) throw new Error(lastError);
            } else {
                lastError = `Error HTTP ${res.status}`;
            }
        } catch (e) {
            if (!slowModel) throw e;
            lastError = (e && e.message) || lastError;
        }
        if (!slowModel) throw new Error(lastError);
        if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(lastError);
}

// ═══════════════════════════════════════════════
// GENERACIÓN CON GOOGLE FLOW (cola del PC, gratis)
// ═══════════════════════════════════════════════

// Reduce una imagen a data URL JPEG de 1280 px de lado como máximo: la cola
// rechaza referencias de más de 6 MB y las fotos de móvil lo superan.
function prepareFlowRef(sourceUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const MAX_SIDE = 1280;
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (!w || !h) { reject(new Error('No se pudo leer el tamaño de una imagen de referencia.')); return; }
            const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
            const width = Math.max(1, Math.round(w * scale));
            const height = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('El navegador no pudo preparar una imagen de referencia.')); return; }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = () => reject(new Error('No se pudo leer una imagen para enviarla a Flow.'));
        img.src = sourceUrl;
    });
}

// La cola corta el prompt a 1200 caracteres: se deja margen y se conservan las
// instrucciones de rol y de formato aunque el texto del usuario sea largo.
function buildFlowPrompt(prompt, ratio, refCount) {
    const intro = refCount > 1
        ? `Combine the ${refCount} attached reference images into ONE single, coherent, high-quality image. `
        : 'Use the attached reference image to create ONE single, coherent, high-quality image. ';
    const roles = refCount > 1
        ? 'The first reference is the scene/background; the remaining ones are the elements to include. '
        : '';
    const outro = `Keep subjects, identity, colours and style consistent with the references. Fill the ${ratio} format.`;
    const userText = String(prompt || '').replace(/\s+/g, ' ').trim();
    let text = `${intro}${roles}Instruction: ${userText}. ${outro}`;
    if (text.length > 1150) {
        const room = Math.max(0, 1150 - (intro + roles + `Instruction: . ` + outro).length);
        text = `${intro}${roles}Instruction: ${userText.slice(0, room)}. ${outro}`;
    }
    return text.slice(0, 1150);
}

async function generateWithFlow({ prompt, aspectRatio, backgroundImage, imagesToProcess }) {
    const client = flowClient();
    if (!client) throw new Error('El conector de Flow no se ha cargado. Recarga la página.');
    const ratio = flowRatioFor(aspectRatio);
    const setStatus = (text) => { if (elements.secondaryStatus) elements.secondaryStatus.textContent = text; };

    // Referencias: primero el fondo y después las imágenes a combinar (máx. 2).
    const candidates = [];
    if (backgroundImage) candidates.push(backgroundImage);
    imagesToProcess.forEach(img => candidates.push(img));
    const selected = candidates.slice(0, FLOW_MAX_REFS);
    if (!selected.length) throw new Error('Sube al menos una imagen para enviarla a Flow.');

    setStatus('Preparando las referencias para Flow…');
    const refs = [];
    for (const img of selected) {
        const url = String(img.data || '').indexOf('data:') === 0
            ? img.data
            : `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`;
        refs.push(await prepareFlowRef(url));
    }

    const flowPrompt = buildFlowPrompt(prompt, ratio, refs.length);

    // Si el PC está apagado el trabajo se queda en cola: se avisa y se espera,
    // porque la cola se procesa sola en cuanto el worker vuelve a conectarse.
    if (client.getStatus().worker === false) {
        setStatus('Flow sin conexión: el trabajo esperará en cola…');
        client.ping();
    } else {
        setStatus('Flow: enviando la solicitud…');
    }

    const requested = await client.request({
        prompt: flowPrompt,
        ratio,
        model: FLOW_MODELS[state.selectedModel],
        count: 1,
        refs
    });
    const jobId = requested && requested.ids && requested.ids[0];
    if (!jobId) throw new Error('La cola de Flow no devolvió ningún trabajo.');

    setStatus('Flow: en cola…');
    const job = await client.waitJob(jobId, {
        onProgress: (phase) => setStatus(phase === 'running' ? 'Flow: generando en el PC…' : 'Flow: en cola…')
    });
    setStatus('Flow: descargando el resultado…');
    const dataUrl = await client.imageToDataUrl(client.QUEUE_DIR + job.url);
    const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
    if (!match) throw new Error('Flow devolvió un resultado que no se pudo leer.');
    return { data: match[2], mimeType: match[1] || 'image/jpeg' };
}

async function handleGenerate() {
    // Filtrar imágenes reales (no null)
    const activeImages = state.images.filter(img => img !== null);

    if (activeImages.length < CONFIG.MIN_IMAGES) {
        showError(`Necesitas al menos ${CONFIG.MIN_IMAGES} imágenes para combinar`);
        return;
    }

    const prompt = elements.promptInput.value.trim();
    if (!prompt) {
        showError('Escribe instrucciones para la IA');
        return;
    }

    setProcessing(true, 'Generando imágenes...');
    hideError();

    try {
        let backgroundImage = null;
        const imagesToProcess = [];
        const hasBackground = state.images[0] !== null; // Si el slot 0 está lleno, asumimos que es fondo

        // Procesar imágenes respetando roles
        activeImages.forEach(img => {
            if (img.isBackground) {
                backgroundImage = { data: img.data, mimeType: img.mimeType };
            } else {
                imagesToProcess.push({ data: img.data, mimeType: img.mimeType });
            }
        });

        // Modelos de Google Flow: se generan en el PC del worker, no por proxy.php.
        if (isFlowModel(state.selectedModel)) {
            const flowResult = await generateWithFlow({
                prompt: prompt,
                aspectRatio: state.selectedAR,
                backgroundImage: backgroundImage,
                imagesToProcess: imagesToProcess
            });
            addToHistory({
                data: flowResult.data,
                mimeType: flowResult.mimeType,
                prompt: prompt,
                aspectRatio: state.selectedAR,
                hasBackground: !!backgroundImage,
                timestamp: Date.now()
            });
            return;
        }

        const requestData = {
            task: 'combineImages',
            images: imagesToProcess,
            backgroundImage: backgroundImage,
            prompt: prompt,
            aspectRatio: state.selectedAR,
            model: state.selectedModel,
            targetPx: state.selectedRes
        };

        const data = await proxyFetchWithWait(requestData);

        if (data.error) throw new Error(data.error.message || data.error);

        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                addToHistory({
                    data: img.data,
                    mimeType: img.mimeType || 'image/jpeg',
                    prompt: prompt,
                    aspectRatio: state.selectedAR,
                    hasBackground: !!backgroundImage,
                    timestamp: Date.now()
                });
            });
        }

    } catch (error) {
        showError(error.message || 'Error al generar las imágenes');
        console.error('Error de generación:', error);
    } finally {
        setProcessing(false);
    }
}

function setProcessing(isProcessing, statusText) {
    state.isGenerating = isProcessing;
    elements.btnGenerate.disabled = isProcessing;

    if (elements.secondaryStatus) {
        elements.secondaryStatus.textContent = statusText || 'Procesando solicitud...';
    }

    if (isProcessing) {
        elements.progressContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Bloquear scroll durante el proceso
    } else {
        elements.progressContainer.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function addToHistory(imageData) {
    imageData.id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    state.history.unshift(imageData);
    saveItemToStorage(imageData); // Caché local (IndexedDB)
    // Fuente de verdad: el servidor (history.php canónico, datos en history_store/).
    // Sin esto el historial se perdía al recargar desde otro navegador o tras un deploy.
    if (window.historyManager) {
        window.historyManager.save({
            id: imageData.id,
            type: 'image',
            model: state.selectedModel || '',
            data: {
                prompt: imageData.prompt || '',
                aspectRatio: imageData.aspectRatio || '',
                hasBackground: !!imageData.hasBackground,
                mimeType: imageData.mimeType || 'image/jpeg',
                model: state.selectedModel || ''
            },
            imageData: `data:${imageData.mimeType || 'image/jpeg'};base64,${imageData.data}`,
            createdAt: new Date(imageData.timestamp || Date.now()).toISOString()
        }).catch(err => console.warn('Error guardando el historial en el servidor:', err));
    }
    renderHistory();
}

function renderHistory() {
    elements.historyCount.textContent = state.history.length;

    const existingCards = elements.historyGrid.querySelectorAll('.history-card');
    existingCards.forEach(card => card.remove());

    if (state.history.length === 0) {
        elements.historyEmpty.classList.remove('hidden');
        return;
    }

    elements.historyEmpty.classList.add('hidden');

    state.history.forEach(item => {
        const card = createHistoryCard(item);
        elements.historyGrid.appendChild(card);
    });
}

function createHistoryCard(item) {
    const card = document.createElement('div');
    card.className = 'history-card glass-hover';
    card.dataset.id = item.id;
    const imageUrl = `data:${item.mimeType};base64,${item.data}`;
    card.innerHTML = `
        <img src="${imageUrl}" alt="Imagen generada">
        <div class="card-overlay custom-overlay">
            <div class="overlay-buttons">
                 <button class="custom-action-btn regenerate" title="Regenerar">
                    <div class="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    </div>
                    <span class="btn-label">Regenerar</span>
                </button>
                <button class="custom-action-btn download" title="Descargar">
                    <div class="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </div>
                    <span class="btn-label">Descargar</span>
                </button>
                <button class="custom-action-btn delete" title="Eliminar">
                    <div class="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </div>
                    <span class="btn-label">Eliminar</span>
                </button>
            </div>
        </div>
    `;

    // 🔧 FIX: permitir clic en botones del overlay sin disparar el zoom
    const overlay = card.querySelector('.card-overlay');
    if (overlay) {
        // Asegura que el overlay reciba eventos (si el CSS lo estaba bloqueando)
        overlay.style.pointerEvents = 'auto';

        // Click sobre el overlay (fuera de botones) mantiene el zoom
        overlay.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-action-btn')) {
                openLightbox(item);
            }
        });

        // Cursor del overlay
        overlay.style.cursor = 'zoom-in';
    }

    // Asegura interacción/cursor en los botones del overlay
    card.querySelectorAll('.custom-action-btn').forEach((btn) => {
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
    });

    card.querySelector('img').addEventListener('click', () => openLightbox(item));
    card.querySelector('.download').addEventListener('click', (e) => { e.stopPropagation(); downloadImage(item); });
    card.querySelector('.regenerate').addEventListener('click', (e) => { e.stopPropagation(); regenerateImage(item); });
    card.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteFromHistory(item.id); });
    return card;
}

function downloadImage(item) {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${item.data}`;
    link.download = `combinacion_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function regenerateImage(item) {
    elements.promptInput.value = item.prompt;
    const arButtons = elements.arSelector.querySelectorAll('.ar-option');
    arButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.ar === item.aspectRatio));
    state.selectedAR = item.aspectRatio;
    elements.promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => handleGenerate(), 500);
}

function deleteFromHistory(id) {
    const index = state.history.findIndex(item => item.id === id);
    if (index !== -1) {
        state.history.splice(index, 1);
        deleteItemFromStorage(id); // Caché local
        if (window.historyManager) {
            window.historyManager.delete(id).catch(err => console.warn('Error eliminando del historial del servidor:', err));
        }
        renderHistory();
    }
}

function setupLightbox() {
    elements.lightboxBackdrop.addEventListener('click', closeLightbox);
    elements.lightboxClose.addEventListener('click', closeLightbox);
    elements.lightboxImg.addEventListener('click', closeLightbox); // Click en imagen también cierra
    elements.lightboxDownload.addEventListener('click', () => {
        if (state.currentLightboxImage) downloadImage(state.currentLightboxImage);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.lightbox.classList.contains('hidden')) closeLightbox();
    });
}

function openLightbox(item) {
    state.currentLightboxImage = item;
    const imageUrl = `data:${item.mimeType};base64,${item.data}`;
    elements.lightboxImg.src = imageUrl;
    elements.lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    elements.lightbox.classList.add('hidden');
    state.currentLightboxImage = null;
    document.body.style.overflow = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

const style = document.createElement('style');
style.textContent = `.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', init);
