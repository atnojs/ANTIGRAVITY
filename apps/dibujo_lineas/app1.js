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

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        processingSection.classList.remove('hidden');
        spinnerContainer.classList.remove('hidden');
        // Mostrar overlay premium
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
                        prompt: "Transform the given input image into a clean, crisp, black and white line-art drawing, specifically designed to be a high-quality coloring book page.\n\nStyle Conversion: Convert all visual elements from the input image (people, objects, backgrounds, text, etc.) into consistent, smooth, and distinct black outlines using clean, uniform lines.\n\nTonal Removal: Completely eliminate all colors, gradients, shading, textures, and gray fills. The resulting image must consist purely of black lines on a pure white background.\n\nClarity and Space: Simplify complex shapes when necessary to create distinct, clear areas of white space that invite and are easy to color. Ensure that the outlines of key objects are prominent.\n\nDetail & Context Preservation: Maintain the original composition, perspective, and key elements of the input image. If the input image contains text, render it as clear, simple, colorable outlines. If there are intricate details, reduce them to essential lines without losing the object's identity (e.g., ship rigging details or basic facial features).\n\nCleanliness: The final drawing must be sharp, without artifacts, smudges, or extraneous lines. Do not add additional background textures or decorative frames unless they were present in the original image or specifically requested.\n\nThe final output should appear ready to be printed and hand-colored."
                    })
                });

                const data = await res.json();

                if (!res.ok || data.error) {
                    throw new Error(data.error?.message || `Error HTTP ${res.status}`);
                }

                if (data.image) {
                    // GPT-4o devolvio una imagen
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
                    // Guardar en historial
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
                    // GPT-4o devolvio solo texto (no pudo generar imagen)
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.style.borderColor = 'var(--acc2)';
                    item.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;color:var(--text);text-align:center;font-size:.8rem;overflow:auto">
                            ${data.text.substring(0, 500)}
                        </div>
                    `;
                    resultsGallery.appendChild(item);
                } else {
                    throw new Error('Respuesta vacia del modelo');
                }

            } catch (err) {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.borderColor = 'var(--danger)';
                item.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;color:var(--danger);text-align:center;font-size:.85rem">
                        Error: ${err.message}
                    </div>
                `;
                resultsGallery.appendChild(item);
            }
        }
        spinnerContainer.classList.add('hidden');
        if (loadingOverlay) { loadingOverlay.classList.add('hidden'); loadingOverlay.style.display = 'none'; document.body.style.overflow = ''; }
        progressText.innerText = 'Procesamiento Finalizado';
        loadAndRenderHistory();
    });

    // ─── Historial ────────────────────────────────────────────
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

    // Cargar historial al iniciar
    HistoryManager.init().then(function() { loadAndRenderHistory(); });
});
