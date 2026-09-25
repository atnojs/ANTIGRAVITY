document.addEventListener('DOMContentLoaded', () => {
    HistoryManager.configure({ dbName: 'dibujo_lineas_db' });
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

    // ===== Selector de modelo (7 botones, MEDIUM activo por defecto) =====
    const DEFAULT_MODEL = 'openai-medium';
    let selectedModel = DEFAULT_MODEL;
    const MODEL_LABELS = {
        'gemini-flash': '3.1 FLASH',
        'gemini-pro': '3 PRO',
        'openai-medium': 'MEDIUM',
        'openai-high': 'HIGH',
        'openai-xhigh': 'XHIGH',
        'openai-max-flare': 'MAX FLARE',
        'openai-max-sunburst': 'MAX SUNBURST',
        'qwen-pro': 'QWEN 3 PRO'
    };
    const modelToggles = document.querySelectorAll('.model-toggle');
    const setSelectedModel = (model) => {
        selectedModel = MODEL_LABELS[model] ? model : DEFAULT_MODEL;
        modelToggles.forEach((button) => {
            const isActive = button.dataset.model === selectedModel;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    };
    modelToggles.forEach((button) => {
        button.addEventListener('click', () => setSelectedModel(button.dataset.model));
    });
    setSelectedModel(DEFAULT_MODEL);

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

    let imageQueue = [];

    imageInput.addEventListener('change', (e) => {
        imageQueue = Array.from(e.target.files);
        if (imageQueue.length === 0) return;
        startButton.disabled = false;
        startButton.innerHTML = `🚀 Iniciar Procesamiento (${imageQueue.length})`;
        previewSection.classList.remove('hidden');
        previewGrid.innerHTML = '';
        imageQueue.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${ev.target.result}">`;
                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });

    // Función auxiliar para pausa entre peticiones
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // Llamada al proxy. Para qwen-pro (más lento que el timeout de nginx,
    // ~55s) se espera activamente: el proxy guarda el resultado en caché y
    // responde 'processing' mientras el worker termina de generarlo.
    const callProxyWithWait = async (body, maxAttempts = 36) => {
        const slowModel = body && body.model === 'qwen-pro';
        let lastError = 'Sin respuesta del modelo.';
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const res = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const json = await res.json().catch(() => null);
                if (res.ok && json && (json.image || json.text)) return json;
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
            if (attempt < maxAttempts - 1) await delay(5000);
        }
        throw new Error(lastError);
    };

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        processingSection.classList.remove('hidden');
        spinnerContainer.classList.remove('hidden');
        if (loadingOverlay) { loadingOverlay.classList.remove('hidden'); loadingOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
        if (loadingText) loadingText.textContent = 'Convirtiendo a Dibujo Lineal...';
        galleryTitle.classList.remove('hidden');
        resultsGallery.innerHTML = '';
        const total = imageQueue.length;

        for (let i = 0; i < total; i++) {
            const file = imageQueue[i];
            progressText.innerText = `Procesando ${i + 1} de ${total}...`;
            progressBar.style.width = `${((i + 1) / total) * 100}%`;

            try {
                // Pequeña pausa para no saturar la API
                await delay(1500);

                const base64 = await new Promise(r => {
                    const rd = new FileReader();
                    rd.onload = () => r(rd.result.split(',')[1]);
                    rd.readAsDataURL(file);
                });

                const data = await callProxyWithWait({
                    image: base64,
                    mimeType: file.type || 'image/jpeg',
                    model: selectedModel,
                    prompt: "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page. Convert all visual elements (people, objects, backgrounds) into consistent, smooth, distinct black outlines using clean uniform lines. Completely eliminate all colors, gradients, shading, textures, and gray fills: the result must be purely black lines on pure white background. Simplify complex shapes to create clear areas of white space easy to color. Maintain the original composition, perspective, and key elements. The final drawing must be sharp, without artifacts or smudges, ready to be printed and hand-colored."
                });

                if (data.image) {
                    var imgDataUrl = "data:" + (data.mimeType || 'image/png') + ";base64," + data.image;
                    const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.innerHTML = `
                        <img src="${imgDataUrl}" alt="Dibujo lineal">
                        <div class="gallery-item-actions">
                            <a href="${imgDataUrl}" download="dibujo_${safeName}.png" class="download-single-btn">💾 Descargar</a>
                        </div>
                    `;
                    resultsGallery.appendChild(item);
                    HistoryManager.saveItem({
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                        url: imgDataUrl,
                        prompt: 'Dibujo lineal: ' + safeName,
                        aspectRatio: '1:1',
                        size: '',
                        geminiSize: '1K',
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
        if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; document.body.style.overflow = ''; }
        progressText.innerText = 'Procesamiento Finalizado';
        loadAndRenderHistory();
    });

    // ... (El resto del código de HistoryManager y funciones de UI se mantiene igual)
    function loadAndRenderHistory() {
        HistoryManager.loadAll().then(function(items) {
            var grid = document.getElementById('history-grid');
            var title = document.getElementById('history-title');
            var clearBtn = document.getElementById('history-clear-btn');
            if (!grid) return;
            if (!items || !items.length) {
                grid.innerHTML = '';
                if (title) title.style.display = 'none';
                if (clearBtn) clearBtn.style.display = 'none';
                return;
            }
            if (title) title.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'inline-block';
            grid.innerHTML = items.map(function(item) {
                return '<div class="gallery-item">' +
                    '<img src="' + item.url + '" alt="Historial" style="cursor:pointer" onclick="window._openDibujoLightbox(\'' + item.url + '\')">' +
                    '<div class="gallery-item-actions">' +
                    '<a href="' + item.url + '" download="dibujo_' + (item.id || 'historial') + '.png" class="download-single-btn">💾 Descargar</a>' +
                    '<button class="download-single-btn" style="background:rgba(239,68,68,0.8);margin-left:0.5rem;border:none;cursor:pointer" onclick="window._deleteDibujoItem(\'' + item.id + '\')">🗑️</button>' +
                    '</div></div>';
            }).join('');
        });
    }

    window._deleteDibujoItem = function(id) {
        if (confirm('¿Eliminar del historial?')) {
            HistoryManager.deleteItem(id).then(function() { loadAndRenderHistory(); });
        }
    };
    window._openDibujoLightbox = function(url) {
        var lb = document.getElementById('dibujo-lightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'dibujo-lightbox';
            lb.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
            lb.onclick = function() { lb.remove(); };
            var img = document.createElement('img');
            img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px';
            lb.appendChild(img);
            document.body.appendChild(lb);
        }
        lb.querySelector('img').src = url;
        lb.style.display = 'flex';
    };

    document.getElementById('history-clear-btn').addEventListener('click', function() {
        if (confirm('¿Eliminar todo el historial?')) {
            HistoryManager.clearAll().then(function() { loadAndRenderHistory(); });
        }
    });

    HistoryManager.init().then(function() { loadAndRenderHistory(); });
});