document.addEventListener('DOMContentLoaded', () => {
    // --- HISTORIAL PERSISTENTE (HistoryManager canonico: servidor history.php) ---
    let historyInstance = null;
    const getHistory = () => {
        if (!historyInstance && typeof window.HistoryManager !== 'undefined') {
            historyInstance = new window.HistoryManager('dibujo_lineas_copia');
        }
        return historyInstance;
    };
    const PROXY_URL = 'proxy.php';
    const imageInput = document.getElementById('image-input');
    const startButton = document.getElementById('start-button');
    const processingSection = document.getElementById('processing-section');
    const previewGrid = document.getElementById('preview-grid');
    const previewSection = document.getElementById('preview-section');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const spinnerContainer = document.getElementById('spinner-container');
    const resultsGallery = document.getElementById('results-gallery');
    const galleryTitle = document.querySelector('.gallery-title');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadingStatus = document.getElementById('secondary-status');

    // ===== Selector de modelo (toggle 4 botones) =====
        // Por defecto: 3 PRO (gemini-pro) segun SKILL_MAESTRA
        let selectedModel = 'gemini-pro';
const MODEL_LABELS = { 'gemini-flash': '3.1 FLASH', 'gemini-pro': '3 PRO', 'flux-pro': 'FLUX PRO', 'flux-max': 'FLUX MAX' };
        const modelToggles = document.querySelectorAll('.model-toggle');
        modelToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                modelToggles.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedModel = btn.dataset.model;
            });
        });

    let imageQueue = [];

imageInput.addEventListener('change', (e) => {
    imageQueue = Array.from(e.target.files);
    if (imageQueue.length === 0) return;
    resultsGallery.innerHTML = '';
    galleryTitle.classList.add('hidden');
    updateQueueUI();
});

function updateQueueUI() {
    if (imageQueue.length === 0) {
        startButton.disabled = true;
        startButton.innerHTML = '🚀 Iniciar Procesamiento';
        previewSection.classList.add('hidden');
        previewGrid.innerHTML = '';
        imageInput.value = '';
        return;
    }
    startButton.disabled = false;
    startButton.innerHTML = `🚀 Iniciar Procesamiento (${imageQueue.length})`;
    previewSection.classList.remove('hidden');
    renderPreviews();
}

function renderPreviews() {
    previewGrid.innerHTML = '';
    imageQueue.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${ev.target.result}" alt="Vista previa ${index + 1}">` +
                `<button type="button" class="remove-preview" data-index="${index}" aria-label="Eliminar imagen ${index + 1}">✕</button>`;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

previewGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-preview');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= imageQueue.length) return;
    imageQueue.splice(idx, 1);
    updateQueueUI();
});

    // Función auxiliar para pausa entre peticiones
    const delay = ms => new Promise(res => setTimeout(res, ms));

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        processingSection.classList.remove('hidden');
        spinnerContainer.classList.remove('hidden');
        if (loadingOverlay) { loadingOverlay.classList.remove('hidden'); loadingOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
        if (loadingText) loadingText.textContent = 'IA generando lo solicitado...';
        galleryTitle.classList.remove('hidden');
        const total = imageQueue.length;
        if (loadingStatus) loadingStatus.textContent = `Preparando ${total} ${total === 1 ? 'imagen' : 'im\u00e1genes'}...`;

        for (let i = 0; i < total; i++) {
            const file = imageQueue[i];
            progressText.innerText = `Procesando ${i + 1} de ${total}...`;
            if (loadingStatus) loadingStatus.textContent = `Generando imagen ${i + 1} de ${total}...`;
            progressBar.style.width = `${((i + 1) / total) * 100}%`;

            try {
                // Pequeña pausa para no saturar la API
                await delay(1500);

                const base64 = await new Promise(r => {
                    const rd = new FileReader();
                    rd.onload = () => r(rd.result.split(',')[1]);
                    rd.readAsDataURL(file);
                });

                const res = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64,
                        mimeType: file.type || 'image/jpeg',
                        model: selectedModel,
                        prompt: "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page... (truncado)"
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error?.message || `Error HTTP ${res.status}`);
                }

                if (data.image) {
                    var imgDataUrl = "data:" + (data.mimeType || 'image/png') + ";base64," + data.image;
                    const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.innerHTML = `
                        <div class="gallery-model-badge">${MODEL_LABELS[selectedModel] || selectedModel}</div>
                        <img src="${imgDataUrl}" alt="Dibujo lineal">
                        <div class="gallery-item-actions">
                            <a href="${imgDataUrl}" download="dibujo_${safeName}.png" class="download-single-btn">💾 Descargar</a>
                        </div>
                    `;
                    resultsGallery.appendChild(item);
                    saveHistoryItemToDb({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                        url: imgDataUrl,
                        prompt: 'Dibujo lineal: ' + safeName,
                        model: selectedModel,
                        aspectRatio: '1:1',
                        size: '',
                        style: { type: 'line_art' },
                        createdAt: Date.now()
                    });
                } else if (data.text) {
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.style.borderColor = 'var(--acc2)';
                    item.innerHTML = `<div style="padding:1rem;color:var(--text);font-size:.8rem">${data.text.substring(0, 500)}</div>`;
                    resultsGallery.appendChild(item);
                }

            } catch (err) {
                // ERROR CONTROLADO: No detenemos el bucle, informamos y seguimos
                console.error("Error en archivo:", file.name, err);
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.borderColor = 'var(--danger)';
                item.innerHTML = `<div style="padding:1rem;color:var(--danger);font-size:.85rem">Error en ${file.name}: ${err.message}</div>`;
                resultsGallery.appendChild(item);
            }
        }
        spinnerContainer.classList.add('hidden');
        if (loadingStatus) loadingStatus.textContent = 'Finalizando resultados...';
        if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; document.body.style.overflow = ''; }
        progressText.innerText = 'Procesamiento Finalizado';
    startButton.disabled = false;
    startButton.innerHTML = `🚀 Iniciar Procesamiento (${imageQueue.length})`;
    galleryTitle.classList.remove('hidden');
        loadAndRenderHistory();
    });

    // ... (El resto del código de HistoryManager y funciones de UI se mantiene igual)

    // Anade un File a la cola de procesamiento y lo muestra en la vista previa
function addFileToQueue(file) {
    imageQueue.push(file);
    updateQueueUI();
}

    function saveHistoryItemToDb(item) {
        const history = getHistory();
        if (!history) return Promise.resolve();
        return history.save({
            id: item.id,
            type: 'image',
            model: item.model || 'desconocido',
            data: {
                prompt: item.prompt,
                aspectRatio: item.aspectRatio || '1:1',
                size: item.size || '',
                model: item.model || 'desconocido',
                style: item.style || {}
            },
            imageData: item.url,
            createdAt: new Date(item.createdAt || Date.now()).toISOString()
        }).catch(function(e) {
            console.error('Error guardando historial:', e);
        });
    }

    // === HISTORIAL: patrón canónico SKILL_MAESTRA ===
    async function loadAndRenderHistory() {
        const history = getHistory();
        if (!history) return;
        try {
            await history.load();
            renderHistoryFromState();
        } catch (e) {
            console.warn('Error cargando historial:', e);
        }
    }

    function renderHistoryFromState() {
        const history = getHistory();
        if (!history) return;
        const grid = document.getElementById('history-grid');
        const title = document.getElementById('history-title');
        const clearBtn = document.getElementById('history-clear-btn');
        if (!grid) return;

        const items = history.getAll();

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
            const createdAt = item.createdAt || '';

            return `<div class="history-item-wrap">
                <img src="${url}" alt="Historial" loading="lazy" onclick="window._openLightbox('${url}')">
                <button class="btn-square" onclick="event.stopPropagation();window._deleteHistoryItem('${item.id}')" aria-label="Eliminar">✕</button>
                <span class="history-date">${new Date(createdAt).toLocaleString()}</span>
            </div>`;
        }).join('');
    }

    window._deleteHistoryItem = async function (id) {
        if (confirm('¿Eliminar del historial?')) {
            const history = getHistory();
            if (!history) return;
            try {
                await history.delete(id);
                renderHistoryFromState();
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

    document.getElementById('history-clear-btn').addEventListener('click', async function () {
        if (confirm('¿Eliminar todo el historial?')) {
            const history = getHistory();
            if (!history) return;
            try {
                await history.clear();
                renderHistoryFromState();
            } catch (e) {
                console.warn('Error limpiando historial:', e);
            }
        }
    });

    // Cerrar lightbox con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const lb = document.getElementById('antigravity-lightbox');
            if (lb) lb.style.display = 'none';
        }
    });

    loadAndRenderHistory();
});
