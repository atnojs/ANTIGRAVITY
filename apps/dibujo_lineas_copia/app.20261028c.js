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
    // ===== Google Flow: cola pública de apps/flow_studio, servida por el worker del PC =====
    const FLOW_QUEUE_DIR = '../flow_studio/';
    const FLOW_QUEUE_URL = FLOW_QUEUE_DIR + 'flow_queue.php';
    const FLOW_POLL_MS = 2500;
    const FLOW_MAX_WAIT_MS = 15 * 60 * 1000;
    // Prompt canónico de dibujo lineal (lo usan tanto el proxy como Flow).
    const LINE_ART_PROMPT = "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page. Convert all visual elements (people, objects, backgrounds) into consistent, smooth, distinct black outlines using clean uniform lines. Completely eliminate all colors, gradients, shading, textures, and gray fills: the result must be purely black lines on pure white background. Simplify complex shapes to create clear areas of white space easy to color. Maintain the original composition, perspective, and key elements. The final drawing must be sharp, without artifacts or smudges, ready to be printed and hand-colored.";
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

    // ===== Selector de modelo =====
    // Modelo por defecto de esta app: FLOW · NANO BANANA 2, por petición expresa
    // de Antonio (2026-10-28): es gratis (se genera en el PC) y es el motor
    // preferente de la app. El resto de apps del proyecto mantiene
    // openai-image-2-low como modelo por defecto (POLITICA_modelos-imagen.md).
    // El grupo IMAGE 2 va de menor a mayor: LOW, MEDIUM, HIGH.
    const DEFAULT_MODEL = 'flow-nano-banana-2';
    let selectedModel = DEFAULT_MODEL;
    const MODEL_LABELS = {
        'gemini-2': 'GEMINI 2',
        'gemini-flash': '3.1 FLASH',
        'gemini-pro': '3 PRO',
        'openai-image-2-low': 'IMAGE 2 LOW',
        'openai-image-2': 'IMAGE 2',
        'openai-image-2-high': 'IMAGE 2 HIGH',
        'openai-medium': 'MEDIUM',
        'openai-high': 'HIGH',
        'openai-xhigh': 'XHIGH',
        'openai-max-flare': 'MAX FLARE',
        'openai-max-sunburst': 'MAX SUNBURST',
        'qwen-pro': 'QWEN 3 PRO',
        'flow-nano-banana-2': 'NANO BANANA 2',
        'flow-nano-banana-pro': 'NANO BANANA PRO',
        'flow-nano-banana-2-lite': 'NANO BANANA 2 LITE'
    };

    // ===== Modelos FLOW (Google Flow, gratis en el PC) =====
    // La cola antigua valida nombres literales, no los ids: se traduce aquí.
    const FLOW_MODELS = {
        'flow-nano-banana-2': 'Nano Banana 2',
        'flow-nano-banana-pro': 'Nano Banana Pro',
        'flow-nano-banana-2-lite': 'Nano Banana 2 Lite'
    };
    const isFlowModel = (model) => Object.prototype.hasOwnProperty.call(FLOW_MODELS, model);
    const flowStatusEl = document.getElementById('flow-status');
    const flowStatusTextEl = document.getElementById('flow-status-text');
    let flowWorkerOnline = null;

    function setFlowWorkerStatus(online, pending) {
        flowWorkerOnline = online;
        if (!flowStatusEl || !flowStatusTextEl) return;
        flowStatusEl.classList.remove('is-checking', 'is-online', 'is-offline');
        if (online === null) {
            flowStatusEl.classList.add('is-checking');
            flowStatusTextEl.textContent = 'Comprobando…';
            flowStatusEl.title = 'Comprobando la conexión con el PC de Flow…';
            return;
        }
        if (online) {
            const queue = Number(pending) || 0;
            flowStatusEl.classList.add('is-online');
            flowStatusTextEl.textContent = 'PC conectado';
            flowStatusEl.title = 'Flow conectado' + (queue > 0 ? ' · ' + queue + ' trabajo(s) en cola' : ' · cola vacía');
        } else {
            flowStatusEl.classList.add('is-offline');
            flowStatusTextEl.textContent = 'PC sin conexión';
            flowStatusEl.title = 'El PC de Flow no responde. Enciéndelo: el trabajo se queda en cola y se generará al conectar.';
        }
    }

    async function pingFlowWorker() {
        try {
            const res = await fetch(FLOW_QUEUE_URL + '?action=ping&_=' + Date.now(), { cache: 'no-store' });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data || data.ok !== true) throw new Error('ping');
            setFlowWorkerStatus(data.worker === true, Number(data.pending) || 0);
        } catch (e) {
            setFlowWorkerStatus(false);
        }
    }

    const modelToggles = document.querySelectorAll('.model-toggle');

    const setSelectedModel = (model) => {
        selectedModel = MODEL_LABELS[model] ? model : DEFAULT_MODEL;
        modelToggles.forEach((button) => {
            const isActive = button.dataset.model === selectedModel;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        if (typeof isFlowModel === 'function' && isFlowModel(selectedModel)) pingFlowWorker();
    };

    modelToggles.forEach((button) => {
        button.addEventListener('click', () => setSelectedModel(button.dataset.model));
    });
    setSelectedModel(DEFAULT_MODEL);
    // El estado del PC de Flow se refresca al arrancar, cada 30 s y al volver a la pestaña.
    pingFlowWorker();
    setInterval(pingFlowWorker, 30000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) pingFlowWorker();
    });

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
        modelToggles.forEach((button) => {
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

    // Llamada al proxy. Para el modelo lento (qwen-pro) se espera activamente: el
    // proxy guarda el resultado en caché y responde 'processing' mientras el
    // worker termina de generarlo.
    const SLOW_MODELS = ['qwen-pro'];
    const callProxyWithWait = async (body, maxAttempts = 36) => {
        const slowModel = body && SLOW_MODELS.indexOf(body.model) !== -1;
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
        // Se agotaron los reintentos sin resultado: mensaje claro en vez de "Generando...".
        throw new Error(lastError === 'Generando...' ? 'El modelo tardó demasiado. Vuelve a intentarlo.' : lastError);
    };

    // ===== Utilidades de resultado =====
    const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    async function renderGalleryResult(file, dataUrl, aspectRatio) {
        const ratio = aspectRatio || '1:1';
        const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = /^data:image\/jpe?g/i.test(dataUrl) ? 'jpg' : 'png';
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.aspectRatio = ratio;
        item.innerHTML = `
            <div class="gallery-model-badge">${escapeHtml(MODEL_LABELS[selectedModel] || selectedModel)}</div>
            <img src="${dataUrl}" alt="Dibujo lineal">
            <div class="gallery-item-actions">
                <a href="${dataUrl}" download="dibujo_${safeName}.${ext}" class="download-single-btn">💾 Descargar</a>
            </div>
        `;
        resultsGallery.appendChild(item);
        await saveHistoryItemToDb({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
            url: dataUrl,
            prompt: 'Dibujo lineal: ' + safeName,
            model: selectedModel,
            aspectRatio: ratio,
            size: '',
            style: { type: 'line_art' },
            createdAt: Date.now()
        });
    }

    function renderTextResult(text) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.style.borderColor = 'var(--acc2)';
        item.innerHTML = `<div style="padding:1rem;color:var(--text);font-size:.8rem">${escapeHtml(String(text).substring(0, 500))}</div>`;
        resultsGallery.appendChild(item);
    }

    // ===== Generación con Google Flow (cola del PC) =====
    // Prepara la foto de referencia: máximo 1280 px de lado y JPEG sobre blanco,
    // igual que la app de referencia, para no superar el tope de 6 MB de la cola.
    // Se lee con FileReader (data:) y no con URL.createObjectURL (blob:), porque la
    // CSP del sitio solo permite img-src 'self' data: https: y bloquea blob:.
    function prepareFlowReference(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            reader.onload = () => {
                const sourceUrl = String(reader.result || '');
                if (!sourceUrl) {
                    reject(new Error('No se pudo leer la imagen.'));
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const MAX_SIDE = 1280;
                    const naturalWidth = img.naturalWidth || img.width;
                    const naturalHeight = img.naturalHeight || img.height;
                    if (!naturalWidth || !naturalHeight) {
                        reject(new Error('No se pudo leer el tamaño de la imagen.'));
                        return;
                    }
                    const scale = Math.min(1, MAX_SIDE / Math.max(naturalWidth, naturalHeight));
                    const width = Math.max(1, Math.round(naturalWidth * scale));
                    const height = Math.max(1, Math.round(naturalHeight * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('El navegador no pudo preparar la imagen.'));
                        return;
                    }
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.86), width, height });
                };
                img.onerror = () => reject(new Error('No se pudo leer la imagen para enviarla a Flow.'));
                img.src = sourceUrl;
            };
            reader.readAsDataURL(file);
        });
    }

    const FLOW_RATIOS = [['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16]];
    function flowRatioFor(width, height) {
        const target = width / Math.max(1, height);
        let best = '1:1';
        let bestDiff = Infinity;
        FLOW_RATIOS.forEach(([label, value]) => {
            const diff = Math.abs(target - value);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = label;
            }
        });
        return best;
    }

    async function flowPost(payload) {
        const res = await fetch(FLOW_QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.ok !== true) {
            const message = data && data.error
                ? data.error
                : `La cola de Flow respondió con un error (HTTP ${res.status}).`;
            throw new Error(message);
        }
        return data;
    }

    async function flowImageToDataUrl(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Flow terminó la imagen, pero no se pudo descargar el resultado.');
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('No se pudo leer el resultado de Flow.'));
            reader.readAsDataURL(blob);
        });
    }

    async function generateWithFlow(file, index, total) {
        const prepared = await prepareFlowReference(file);
        const ratio = flowRatioFor(prepared.width, prepared.height);
        const position = `imagen ${index + 1} de ${total}`;
        if (loadingStatus) {
            loadingStatus.textContent = flowWorkerOnline === false
                ? `Flow sin conexión: la ${position} esperará en cola…`
                : `Flow: enviando la ${position}…`;
        }

        const requested = await flowPost({
            action: 'request',
            prompt: LINE_ART_PROMPT,
            ratio,
            model: FLOW_MODELS[selectedModel],
            count: 1,
            refs: [prepared.dataUrl]
        });
        const jobId = requested.ids && requested.ids[0];
        if (!jobId) throw new Error('La cola de Flow no devolvió ningún trabajo.');

        const deadline = Date.now() + FLOW_MAX_WAIT_MS;
        while (Date.now() < deadline) {
            await delay(FLOW_POLL_MS);
            const status = await flowPost({ action: 'status', ids: [jobId] });
            if (typeof status.worker === 'boolean') {
                setFlowWorkerStatus(status.worker, Number(status.pending) || 0);
            }
            const job = status.jobs ? status.jobs[jobId] : null;
            if (!job || job.status === 'missing') {
                throw new Error('Flow perdió el trabajo en la cola. Vuelve a intentarlo.');
            }
            if (job.status === 'done') {
                if (loadingStatus) loadingStatus.textContent = `Flow: descargando la ${position}…`;
                const dataUrl = await flowImageToDataUrl(FLOW_QUEUE_DIR + job.url);
                return { dataUrl, aspectRatio: job.ratio || ratio };
            }
            if (job.status === 'error') {
                throw new Error(job.error || 'Flow no pudo generar la imagen.');
            }
            if (loadingStatus) {
                loadingStatus.textContent = job.status === 'running'
                    ? `Flow: generando en el PC (${position})…`
                    : `Flow: en cola (${position})…`;
            }
        }
        throw new Error('Flow tardó demasiado. El trabajo puede seguir en cola; vuelve a intentarlo en unos minutos.');
    }

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

                if (isFlowModel(selectedModel)) {
                    // Flow: se encola en el PC y se espera el resultado (gratis, sin clave).
                    const flowResult = await generateWithFlow(file, i, total);
                    await renderGalleryResult(file, flowResult.dataUrl, flowResult.aspectRatio);
                } else {
                    const base64 = await new Promise(r => {
                        const rd = new FileReader();
                        rd.onload = () => r(rd.result.split(',')[1]);
                        rd.readAsDataURL(file);
                    });

                    const data = await callProxyWithWait({
                        image: base64,
                        mimeType: file.type || 'image/jpeg',
                        model: selectedModel,
                        prompt: LINE_ART_PROMPT
                    });

                    if (data.image) {
                        const resultDataUrl = "data:" + (data.mimeType || 'image/png') + ";base64," + data.image;
                        await renderGalleryResult(file, resultDataUrl, data.aspectRatio || '1:1');
                    } else if (data.text) {
                        renderTextResult(data.text);
                    }
                }

            } catch (err) {
                // ERROR CONTROLADO: No detenemos el bucle, informamos y seguimos
                console.error("Error en archivo:", file.name, err);
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.borderColor = 'var(--danger)';
                item.innerHTML = `<div style="padding:1rem;color:var(--danger);font-size:.85rem">Error en ${escapeHtml(file.name)}: ${escapeHtml((err && err.message) || 'Falló la generación.')}</div>`;
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
        await loadAndRenderHistory();
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
                <button class="btn-square btn-delete" onclick="event.stopPropagation();window._deleteHistoryItem('${item.id}')" aria-label="Eliminar">✕</button>
                <button class="btn-square btn-download" onclick="event.stopPropagation();window._downloadHistoryItem('${url}', '${item.id}')" aria-label="Descargar" title="Descargar">💾</button>
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

    window._downloadHistoryItem = function(url, id) {
        const link = document.createElement('a');
        link.download = `dibujo_lineal_${id}.png`;
        link.href = url;
        link.click();
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
