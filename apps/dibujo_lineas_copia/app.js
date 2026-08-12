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

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        processingSection.classList.remove('hidden');
        spinnerContainer.classList.remove('hidden');
        if (loadingOverlay) { loadingOverlay.classList.remove('hidden'); loadingOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
        if (loadingText) loadingText.textContent = 'IA generando lo solicitado...';
        galleryTitle.classList.remove('hidden');
        resultsGallery.innerHTML = '';
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
        loadAndRenderHistory();
    });

    // ... (El resto del código de HistoryManager y funciones de UI se mantiene igual)

    // Anade un File a la cola de procesamiento y lo muestra en la vista previa
    function addFileToQueue(file) {
        imageQueue.push(file);
        startButton.disabled = false;
        startButton.innerHTML = `🚀 Iniciar Procesamiento (${imageQueue.length})`;
        previewSection.classList.remove('hidden');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${ev.target.result}">`;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
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
            alert('No se pudo guardar en el historial: ' + e.message);
        });
    }

    function loadAndRenderHistory() {
        const history = getHistory();
        if (!history) { return; }
        history.load().then(function(items) {
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
                const imageUrl = item.imageUrl || (item.data && item.data.url) || '';
                return '<div class="gallery-item">' +
                    '<img src="' + imageUrl + '" alt="Historial" style="cursor:pointer" onclick="window._useDibujoImage(\'' + item.id + '\')" title="Clic para usar en la app">' +
                    '<div class="gallery-item-actions">' +
                    '<button class="download-single-btn" onclick="window._openDibujoLightbox(\'' + item.id + '\')">🔍 Ampliar</button>' +
                    '<a href="' + imageUrl + '" download="dibujo_' + (item.id || 'historial') + '.png" class="download-single-btn">💾 Descargar</a>' +
                    '<button class="download-single-btn" style="background:rgba(239,68,68,0.8);margin-left:0.5rem;border:none;cursor:pointer" onclick="window._deleteDibujoItem(\'' + item.id + '\')">🗑️</button>' +
                    '</div></div>';
            }).join('');
        }).catch(function(e) {
            console.error('Error cargando historial:', e);
            var grid = document.getElementById('history-grid');
            if (grid) grid.innerHTML = '<div style="padding:1rem;color:var(--danger);font-size:.85rem">Error al cargar el historial: ' + e.message + '</div>';
        });
    }

    window._deleteDibujoItem = function(id) {
        if (confirm('¿Eliminar del historial?')) {
            const history = getHistory();
            if (!history) return;
            history.delete(id).then(function() { loadAndRenderHistory(); });
        }
    };

    // Carga la imagen del historial dentro de la app para volver a usarla (cola + vista previa)
    window._useDibujoImage = function(id) {
        const history = getHistory();
        if (!history) return;
        history.load().then(function(items) {
            const item = items.find(function(i) { return i.id === id; });
            if (!item) { alert('Entrada no encontrada en el historial.'); return; }
            const imageUrl = item.imageUrl || (item.data && item.data.url) || '';
            if (!imageUrl) { alert('Esta entrada no tiene imagen.'); return; }
            fetch(imageUrl).then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.blob();
            }).then(function(blob) {
                const ext = (blob.type && blob.type.split('/')[1]) || 'png';
                const file = new File([blob], 'historial_' + id + '.' + ext, { type: blob.type || 'image/png' });
                addFileToQueue(file);
                alert('Imagen cargada en la app. Pulsa "Iniciar Procesamiento" para usarla.');
            }).catch(function(e) {
                console.error('Error usando imagen del historial:', e);
                alert('No se pudo cargar la imagen en la app: ' + e.message);
            });
        });
    };

    window._openDibujoLightbox = function(id) {
        const history = getHistory();
        if (!history) return;
        history.load().then(function(items) {
            const item = items.find(function(i) { return i.id === id; });
            if (!item) return;
            const url = item.imageUrl || (item.data && item.data.url) || '';
            if (!url) return;
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
        });
    };

    document.getElementById('history-clear-btn').addEventListener('click', function() {
        if (confirm('¿Eliminar todo el historial?')) {
            const history = getHistory();
            if (!history) return;
            history.clear().then(function() { loadAndRenderHistory(); });
        }
    });

    loadAndRenderHistory();
});
