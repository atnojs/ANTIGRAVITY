/**
 * ============================================
 * 🎨 ESTILO JSON — JavaScript
 * 1) Subes una imagen de estilo -> la IA (visión) crea su JSON automáticamente.
 * 2) Subes la imagen del sujeto.
 * 3) Pulsas "Generar" -> FLUX aplica el estilo (JSON) al sujeto.
 * El JSON de estilo queda guardado (persistente) para reutilizarlo con más sujetos.
 * ============================================
 */

const CONFIG = {
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    PROXY_URL: 'proxy.php',
    MAX_INPUT_SIDE: 2048, // Clamp de entrada (4MP) para no romper FLUX
    JSON_STORAGE_KEY: 'estilo_json_estilo_guardado'
};

// --- HISTORIAL PERSISTENTE (IndexedDB + servidor) ---
const DB_NAME = 'estilo_json_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
let db = null;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };
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
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const items = req.result || [];
                items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                resolve(items);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error cargando historial:', e); return []; }
}

async function saveItemToStorage(item) {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error guardando item:', e); }
}

async function deleteItemFromStorage(id) {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error eliminando item:', e); }
}

async function clearStorage() {
    try {
        if (!db) await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error limpiando historial:', e); }
}

// --- ESTADO ---
const state = {
    styleImage: null,     // { data(b64 puro), mimeType, preview(dataURL) }
    subjectImage: null,   // idem
    estiloJson: null,     // objeto JSON del estilo (persistente)
    history: [],
    selectedRes: 1024,
    selectedModel: 'pro',
    isAnalyzing: false,
    isGenerating: false,
    isEnhancing: false,
    promptOptions: [],
    currentLightboxImage: null
};

const el = {};
function cacheEls() {
    [
        'styleInput', 'styleSlot', 'styleEmpty', 'stylePreview', 'styleRemove', 'styleStatus',
        'subjectInput', 'subjectSlot', 'subjectEmpty', 'subjectPreview', 'subjectRemove', 'subjectStatus',
        'jsonBox', 'btnCopyJson', 'btnClearJson', 'btnReanalyze',
        'promptInput', 'btnEnhance', 'btnClearPrompt', 'promptButtons',
        'resSelector', 'resNote', 'modelSelector',
        'btnGenerate', 'errorMessage', 'loadingOverlay', 'loadingText',
        'historyGrid', 'historyEmpty', 'historyCount', 'btnClearHistory',
        'lightbox', 'lightboxBackdrop', 'lightboxImg', 'lightboxDownload', 'lightboxClose'
    ].forEach(id => { el[id] = document.getElementById(id); });
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
    cacheEls();
    try { await openDatabase(); state.history = await loadHistoryFromStorage(); }
    catch (e) { console.warn('Error init historial:', e); state.history = []; }

    // Recuperar JSON de estilo guardado (persistente entre sesiones)
    try {
        const saved = localStorage.getItem(CONFIG.JSON_STORAGE_KEY);
        if (saved) {
            state.estiloJson = JSON.parse(saved);
            renderJson();
        }
    } catch (e) { console.warn('No se pudo recuperar JSON guardado:', e); }

    setupUploads();
    setupJsonControls();
    setupResSelector();
    setupModelSelector();
    setupPromptEnhancement();
    el.btnGenerate.addEventListener('click', handleGenerate);
    el.btnClearHistory.addEventListener('click', handleClearHistory);
    setupLightbox();
    renderHistory();
    updateStatuses();
    console.log('✅ Estilo JSON inicializado');
}

// ═══════════════════════════════════════════════
// SUBIDA DE IMÁGENES
// ═══════════════════════════════════════════════
function setupUploads() {
    // Estilo — el clic se escucha en TODO el slot (el div interno tiene pointer-events:none)
    el.styleSlot.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-slot')) return; // el botón quitar gestiona su propio clic
        el.styleInput.click();
    });
    el.styleInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleStyleFile(e.target.files[0]);
    });
    el.styleRemove.addEventListener('click', (e) => { e.stopPropagation(); removeStyle(); });
    setupDrop(el.styleSlot, (file) => handleStyleFile(file));

    // Sujeto
    el.subjectSlot.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-slot')) return;
        el.subjectInput.click();
    });
    el.subjectInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleSubjectFile(e.target.files[0]);
    });
    el.subjectRemove.addEventListener('click', (e) => { e.stopPropagation(); removeSubject(); });
    setupDrop(el.subjectSlot, (file) => handleSubjectFile(file));
}

function setupDrop(slot, cb) {
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('dragover'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('dragover');
        if (e.dataTransfer.files.length) cb(e.dataTransfer.files[0]);
    });
}

async function handleStyleFile(file) {
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) { showError('Formato no válido. Usa JPG, PNG o WebP'); return; }
    try {
        const r = await resizeImage(file, CONFIG.MAX_INPUT_SIDE);
        state.styleImage = { data: r.dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: r.dataUrl };
        el.stylePreview.src = r.dataUrl;
        el.stylePreview.classList.remove('hidden');
        el.styleEmpty.classList.add('hidden');
        el.styleRemove.classList.remove('hidden');
        el.btnReanalyze.classList.remove('hidden');
        hideError();
        // Analizar estilo automáticamente
        await analizarEstilo();
    } catch (err) { showError('Error al procesar la imagen de estilo'); console.error(err); }
}

async function handleSubjectFile(file) {
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) { showError('Formato no válido. Usa JPG, PNG o WebP'); return; }
    try {
        const r = await resizeImage(file, CONFIG.MAX_INPUT_SIDE);
        // El resultado hereda el aspect ratio (AR) del sujeto a modificar
        state.subjectImage = { data: r.dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: r.dataUrl, width: r.width, height: r.height };
        el.subjectPreview.src = r.dataUrl;
        el.subjectPreview.classList.remove('hidden');
        el.subjectEmpty.classList.add('hidden');
        el.subjectRemove.classList.remove('hidden');
        hideError();
        updateStatuses();
    } catch (err) { showError('Error al procesar la imagen del sujeto'); console.error(err); }
}

function removeStyle() {
    state.styleImage = null;
    el.stylePreview.src = '';
    el.stylePreview.classList.add('hidden');
    el.styleEmpty.classList.remove('hidden');
    el.styleRemove.classList.add('hidden');
    el.btnReanalyze.classList.add('hidden');
    el.styleInput.value = '';
    updateStatuses();
}

function removeSubject() {
    state.subjectImage = null;
    el.subjectPreview.src = '';
    el.subjectPreview.classList.add('hidden');
    el.subjectEmpty.classList.remove('hidden');
    el.subjectRemove.classList.add('hidden');
    el.subjectInput.value = '';
    updateStatuses();
}

// ═══════════════════════════════════════════════
// PASO 1: ANALIZAR ESTILO -> JSON (automático)
// ═══════════════════════════════════════════════
async function analizarEstilo() {
    if (!state.styleImage) { showError('Sube primero una imagen de estilo'); return; }
    setAnalyzing(true);
    hideError();
    try {
        const res = await fetch(CONFIG.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'analizarEstilo',
                image: state.styleImage.data,
                mimeType: state.styleImage.mimeType
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.error);
        if (!data.estilo) throw new Error('No se recibió el JSON de estilo');

        state.estiloJson = data.estilo;
        try { localStorage.setItem(CONFIG.JSON_STORAGE_KEY, JSON.stringify(data.estilo)); } catch (e) {}
        renderJson();
        updateStatuses();
    } catch (err) {
        showError('No se pudo analizar el estilo: ' + (err.message || err));
        console.error(err);
    } finally {
        setAnalyzing(false);
    }
}

function renderJson() {
    if (!state.estiloJson) {
        el.jsonBox.value = '';
        el.btnCopyJson.disabled = true;
        el.btnClearJson.disabled = true;
        return;
    }
    el.jsonBox.value = JSON.stringify(state.estiloJson, null, 2);
    el.btnCopyJson.disabled = false;
    el.btnClearJson.disabled = false;
}

function setupJsonControls() {
    el.btnCopyJson.addEventListener('click', () => {
        if (!state.estiloJson) return;
        navigator.clipboard.writeText(JSON.stringify(state.estiloJson, null, 2))
            .then(() => flashBtn(el.btnCopyJson, 'Copiado'))
            .catch(() => {});
    });
    el.btnClearJson.addEventListener('click', () => {
        state.estiloJson = null;
        try { localStorage.removeItem(CONFIG.JSON_STORAGE_KEY); } catch (e) {}
        renderJson();
        updateStatuses();
    });
    el.btnReanalyze.addEventListener('click', () => { if (!state.isAnalyzing) analizarEstilo(); });
}

function flashBtn(btn, txt) {
    const orig = btn.textContent;
    btn.textContent = txt;
    setTimeout(() => { btn.textContent = orig; }, 1200);
}

// ═══════════════════════════════════════════════
// MEJORAR PROMPT (DeepSeek)
// ═══════════════════════════════════════════════
function setupPromptEnhancement() {
    el.btnEnhance.addEventListener('click', handleEnhancePrompt);
    el.btnClearPrompt.addEventListener('click', () => {
        el.promptInput.value = '';
        hidePromptButtons();
    });
    el.promptButtons.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.index, 10);
            if (state.promptOptions[i]) {
                el.promptButtons.querySelectorAll('.prompt-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                el.promptInput.value = state.promptOptions[i];
            }
        });
    });
}

async function handleEnhancePrompt() {
    setEnhancing(true);
    hideError();
    try {
        const res = await fetch(CONFIG.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'mejorarPrompt',
                prompt: el.promptInput.value.trim(),
                estilo: state.estiloJson || null
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.error);
        if (data.options && data.options.length) {
            state.promptOptions = data.options.slice(0, 4);
            showPromptButtons();
        } else {
            showError('No se pudieron generar opciones');
        }
    } catch (err) {
        showError(err.message || 'Error al mejorar el prompt');
        console.error(err);
    } finally {
        setEnhancing(false);
    }
}

function showPromptButtons() {
    el.promptButtons.classList.remove('hidden');
    el.promptButtons.querySelectorAll('.prompt-btn').forEach(b => b.classList.remove('selected'));
}
function hidePromptButtons() {
    el.promptButtons.classList.add('hidden');
    state.promptOptions = [];
}
function setEnhancing(v) {
    state.isEnhancing = v;
    el.btnEnhance.disabled = v;
    el.btnEnhance.innerHTML = v
        ? `<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Mejorando...`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21"/><path d="M17 3v4"/><path d="M21 5h-4"/></svg> Mejorar Prompt`;
}

// ═══════════════════════════════════════════════
// SELECTORES
// ═══════════════════════════════════════════════
// AR: sin selector — el resultado hereda el aspect ratio de la imagen del sujeto.
// Devuelve el AR "an:ah" de la imagen del sujeto (simplificado), o '1:1' si no hay.
function subjectAspectRatio() {
    if (!state.subjectImage || !state.subjectImage.width || !state.subjectImage.height) return '1:1';
    let w = state.subjectImage.width, h = state.subjectImage.height;
    const g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(w, h) || 1;
    return (w / g) + ':' + (h / g);
}
function setupResSelector() {
    const btns = el.resSelector.querySelectorAll('.ar-option');
    btns.forEach(b => b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.selectedRes = parseInt(b.dataset.res, 10);
        updateResNote();
    }));
    updateResNote();
}
function updateResNote() {
    if (!el.resNote) return;
    el.resNote.textContent = state.selectedRes >= 4096
        ? 'FLUX genera hasta ~2048 px nativos; 4096 se reescala en tu equipo.'
        : '';
}
function setupModelSelector() {
    const btns = el.modelSelector.querySelectorAll('.model-option');
    btns.forEach(b => b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.selectedModel = b.dataset.model;
    }));
}

// ═══════════════════════════════════════════════
// PASO 3: GENERAR (FLUX aplica el estilo al sujeto)
// ═══════════════════════════════════════════════
async function handleGenerate() {
    if (!state.estiloJson) { showError('Falta el JSON de estilo. Sube una imagen de estilo (paso 1).'); return; }
    if (!state.subjectImage) { showError('Sube la imagen del sujeto (paso 2).'); return; }
    if (state.isGenerating) return;

    setGenerating(true);
    hideError();
    try {
        // El AR del resultado = AR real de la imagen del sujeto (sin selector)
        const subjectAR = subjectAspectRatio();
        const res = await fetch(CONFIG.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'aplicarEstilo',
                subject: state.subjectImage.data,
                estilo: state.estiloJson,
                prompt: el.promptInput.value.trim(),
                aspectRatio: subjectAR,
                calidad: state.selectedModel,
                targetPx: state.selectedRes
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.error);
        if (!data.imageUrl) throw new Error('FLUX no devolvió imagen');

        // Escalado en cliente si el usuario pidió 4096 y FLUX generó menos
        let finalUrl = data.imageUrl;
        if (state.selectedRes >= 4096) {
            try { finalUrl = await upscaleDataUrl(data.imageUrl, state.selectedRes, subjectAR); }
            catch (e) { console.warn('Upscale falló, se usa la nativa:', e); }
        }

        await addToHistory({
            id: 'sj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            url: finalUrl,
            prompt: el.promptInput.value.trim(),
            estilo: state.estiloJson,
            aspectRatio: subjectAR,
            modelo: data.modelo || '',
            coste: data.coste || 0,
            createdAt: Date.now()
        });
        // El JSON sigue disponible: NO se borra (reutilizable con otros sujetos)
    } catch (err) {
        showError('No se pudo generar: ' + (err.message || err));
        console.error(err);
    } finally {
        setGenerating(false);
    }
}

// ═══════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════
async function addToHistory(item) {
    state.history.unshift(item);
    await saveItemToStorage(item);
    if (window.HistoryManager) {
        try {
            HistoryManager.configure({ dbName: DB_NAME, historyUrl: './history.php' });
            HistoryManager.syncToServer({
                id: item.id, url: item.url, prompt: item.prompt || '',
                aspectRatio: item.aspectRatio || '1:1', createdAt: item.createdAt
            });
        } catch (e) { console.warn('sync servidor:', e); }
    }
    renderHistory();
}

function renderHistory() {
    const grid = el.historyGrid;
    grid.querySelectorAll('.history-card').forEach(c => c.remove());
    el.historyCount.textContent = state.history.length;

    if (!state.history.length) {
        el.historyEmpty.classList.remove('hidden');
        return;
    }
    el.historyEmpty.classList.add('hidden');

    state.history.forEach(item => {
        const url = item.url || item.imageUrl || '';
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <img src="${url}" alt="Resultado" loading="lazy">
            <div class="card-overlay">
                <button class="card-action-btn download" title="Descargar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </button>
                <button class="card-action-btn delete" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>`;
        card.querySelector('img').addEventListener('click', () => openLightbox(url));
        card.querySelector('.download').addEventListener('click', (e) => { e.stopPropagation(); downloadImage(url); });
        card.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteFromHistory(item.id); });
        grid.appendChild(card);
    });
}

async function deleteFromHistory(id) {
    state.history = state.history.filter(i => i.id !== id);
    await deleteItemFromStorage(id);
    if (window.HistoryManager) {
        try { HistoryManager.configure({ dbName: DB_NAME, historyUrl: './history.php' }); HistoryManager.deleteFromServer(id); }
        catch (e) {}
    }
    renderHistory();
}

async function handleClearHistory() {
    if (!state.history.length) return;
    if (!confirm('¿Vaciar todo el historial de resultados?')) return;
    state.history = [];
    await clearStorage();
    if (window.HistoryManager) {
        try { HistoryManager.configure({ dbName: DB_NAME, historyUrl: './history.php' }); HistoryManager.clearServerHistory(); }
        catch (e) {}
    }
    renderHistory();
}

function downloadImage(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estilo_' + Date.now() + '.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// ═══════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════
function setupLightbox() {
    el.lightboxBackdrop.addEventListener('click', closeLightbox);
    el.lightboxClose.addEventListener('click', closeLightbox);
    el.lightboxDownload.addEventListener('click', () => { if (state.currentLightboxImage) downloadImage(state.currentLightboxImage); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}
function openLightbox(url) {
    state.currentLightboxImage = url;
    el.lightboxImg.src = url;
    el.lightbox.classList.remove('hidden');
}
function closeLightbox() {
    el.lightbox.classList.add('hidden');
    el.lightboxImg.src = '';
    state.currentLightboxImage = null;
}

// ═══════════════════════════════════════════════
// ESTADOS / UI
// ═══════════════════════════════════════════════
function updateStatuses() {
    // Estilo
    if (state.estiloJson) {
        el.styleStatus.textContent = 'Estilo listo ✓';
        el.styleStatus.className = 'badge info';
    } else if (state.styleImage) {
        el.styleStatus.textContent = 'Analizando...';
        el.styleStatus.className = 'badge required';
    } else {
        el.styleStatus.textContent = 'Sube una imagen';
        el.styleStatus.className = 'badge required';
    }
    // Sujeto
    if (state.subjectImage) {
        el.subjectStatus.textContent = 'Sujeto listo ✓';
        el.subjectStatus.className = 'badge info';
    } else {
        el.subjectStatus.textContent = 'Sube el sujeto';
        el.subjectStatus.className = 'badge optional';
    }
    // Botón generar
    el.btnGenerate.disabled = !(state.estiloJson && state.subjectImage) || state.isGenerating || state.isAnalyzing;
}

function setAnalyzing(v) {
    state.isAnalyzing = v;
    if (v) { showLoading('Analizando el estilo (creando JSON)...'); }
    else { hideLoading(); }
    updateStatuses();
}
function setGenerating(v) {
    state.isGenerating = v;
    if (v) { showLoading('IA generando imagen con el estilo...'); }
    else { hideLoading(); }
    updateStatuses();
}
function showLoading(txt) {
    el.loadingText.textContent = txt || 'Procesando...';
    el.loadingOverlay.classList.remove('hidden');
}
function hideLoading() { el.loadingOverlay.classList.add('hidden'); }

function showError(msg) {
    el.errorMessage.textContent = msg;
    el.errorMessage.classList.remove('hidden');
}
function hideError() { el.errorMessage.classList.add('hidden'); }

// ═══════════════════════════════════════════════
// UTILIDADES DE IMAGEN
// ═══════════════════════════════════════════════
function resizeImage(file, maxSide) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (Math.max(width, height) > maxSide) {
                    if (width >= height) { height = Math.round(height * maxSide / width); width = maxSide; }
                    else { width = Math.round(width * maxSide / height); height = maxSide; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: width, height: height });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function upscaleDataUrl(dataUrl, targetSide, aspectRatio) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const parts = (aspectRatio || '1:1').split(':').map(Number);
            const aw = parts[0] || 1, ah = parts[1] || 1;
            let w, h;
            if (aw >= ah) { w = targetSide; h = Math.round(targetSide * ah / aw); }
            else { h = targetSide; w = Math.round(targetSide * aw / ah); }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// Arranque
document.addEventListener('DOMContentLoaded', init);
