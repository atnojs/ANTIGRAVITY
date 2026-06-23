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

                const res = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64,
                        mimeType: file.type || 'image/jpeg',
                        prompt: "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page..."
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