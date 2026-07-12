document.addEventListener('DOMContentLoaded', () => {
    // ─── HistoryManager ──────────────────────────────────────
    HistoryManager.configure({ dbName: 'color_app_db' });

    const colorModeBtn = document.getElementById('color-mode-btn');
    const imageModeBtn = document.getElementById('image-mode-btn');
    const colorInputContainer = document.getElementById('color-input-container');
    const imageInputContainer = document.getElementById('image-input-container');
    const generatorForm = document.getElementById('generator-form');
    const colorInput = document.getElementById('color-input');
    const imageUpload = document.getElementById('image-upload');
    const imageUploadLabel = document.querySelector('.image-upload-label');
    const fileNameSpan = document.getElementById('file-name');
    const generateBtn = document.getElementById('generate-btn');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results-container');
    const textOptionContainer = document.getElementById('text-option-container');
    const withTextBtn = document.getElementById('with-text-btn');
    const noTextBtn = document.getElementById('no-text-btn');
    const customTextBtn = document.getElementById('custom-text-btn');
    const customTextWrapper = document.getElementById('custom-text-wrapper');
    const customTextInput = document.getElementById('custom-text-input');

    let currentMode = 'color';
    let uploadedFile = null;
    let textChoice = null; // null, true (con), false (sin), 'custom'

    // ─── Estado de los selectores de salida ──────────────────
    let selectedQuality = 'pro'; // 'pro' | 'max'
    let selectedAR = '1:1';
    let selectedRes = 1024;

    // ─── Selectores: Calidad PRO/MAX ─────────────────────────
    const qualityBtns = document.querySelectorAll('.quality-option');
    qualityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedQuality = btn.dataset.quality;
            qualityBtns.forEach(b => {
                const on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
    });

    // ─── Selectores: Formato (AR) ────────────────────────────
    const arBtns = document.querySelectorAll('.ar-option');
    arBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedAR = btn.dataset.ar;
            arBtns.forEach(b => {
                const on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
    });

    // ─── Selectores: Resolución ──────────────────────────────
    const resBtns = document.querySelectorAll('.res-option');
    resBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRes = parseInt(btn.dataset.res, 10);
            resBtns.forEach(b => {
                const on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
    });

    function setInputMode(mode) {
        currentMode = mode;
        textChoice = null;
        updateGenerateButtonState();

        // Mostrar botones de texto
        withTextBtn.classList.remove('active');
        noTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        textOptionContainer.classList.remove('hidden');
        customTextWrapper.classList.add('hidden');
        customTextInput.value = '';

        if (mode === 'color') {
            colorModeBtn.classList.add('active');
            imageModeBtn.classList.remove('active');
            colorModeBtn.setAttribute('aria-pressed', 'true');
            imageModeBtn.setAttribute('aria-pressed', 'false');
            colorInputContainer.classList.remove('hidden');
            imageInputContainer.classList.add('hidden');
            colorInput.required = true;
            imageUpload.required = false;
        } else {
            colorModeBtn.classList.remove('active');
            imageModeBtn.classList.add('active');
            colorModeBtn.setAttribute('aria-pressed', 'false');
            imageModeBtn.setAttribute('aria-pressed', 'true');
            colorInputContainer.classList.add('hidden');
            imageInputContainer.classList.remove('hidden');
            colorInput.required = false;
            imageUpload.required = true;
        }
    }

    function updateGenerateButtonState() {
        const hasInput = currentMode === 'color' ? colorInput.value : uploadedFile;
        let isTextOk = textChoice !== null;

        if (textChoice === 'custom') {
            isTextOk = customTextInput.value.trim().length > 0;
        }

        generateBtn.disabled = !(hasInput && isTextOk);
    }

    colorModeBtn.addEventListener('click', () => setInputMode('color'));
    imageModeBtn.addEventListener('click', () => setInputMode('image'));

    colorInput.addEventListener('input', () => updateGenerateButtonState());
    customTextInput.addEventListener('input', () => updateGenerateButtonState());

    imageUpload.addEventListener('change', (e) => {
        uploadedFile = e.target.files[0];
        if (uploadedFile) {
            imageUpload.required = true;

            const reader = new FileReader();
            reader.onload = function (event) {
                const imageUrl = event.target.result;

                imageUploadLabel.style.backgroundImage = `url('${imageUrl}')`;
                imageUploadLabel.style.backgroundSize = 'contain';
                imageUploadLabel.style.backgroundPosition = 'center';
                imageUploadLabel.style.backgroundRepeat = 'no-repeat';
                imageUploadLabel.classList.add('has-image');

                const img = new Image();
                img.onload = function () {
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    imageUploadLabel.style.aspectRatio = width / height;
                };
                img.src = imageUrl;
            }
            reader.readAsDataURL(uploadedFile);

            // Mostrar opción de texto cuando hay imagen
            textOptionContainer.classList.remove('hidden');
            updateGenerateButtonState();

        } else {
            imageUpload.required = true;
            imageUploadLabel.style.backgroundImage = 'none';
            imageUploadLabel.style.aspectRatio = 'auto';
            imageUploadLabel.classList.remove('has-image');
            textOptionContainer.classList.add('hidden');
            updateGenerateButtonState();
            const spanElement = imageUploadLabel.querySelector('span:first-of-type');
            if (spanElement) {
                spanElement.style.display = 'block';
            }
        }
    });

    withTextBtn.addEventListener('click', () => {
        textChoice = true;
        withTextBtn.classList.add('active');
        noTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        customTextWrapper.classList.add('hidden');
        updateGenerateButtonState();
    });

    noTextBtn.addEventListener('click', () => {
        textChoice = false;
        noTextBtn.classList.add('active');
        withTextBtn.classList.remove('active');
        customTextBtn.classList.remove('active');
        customTextWrapper.classList.add('hidden');
        updateGenerateButtonState();
    });

    customTextBtn.addEventListener('click', () => {
        textChoice = 'custom';
        customTextBtn.classList.add('active');
        withTextBtn.classList.remove('active');
        noTextBtn.classList.remove('active');
        customTextWrapper.classList.remove('hidden');
        customTextInput.focus();
        updateGenerateButtonState();
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUploadLabel.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    imageUploadLabel.addEventListener('dragenter', () => imageUploadLabel.classList.add('dragover'));
    imageUploadLabel.addEventListener('dragleave', () => imageUploadLabel.classList.remove('dragleave'));
    imageUploadLabel.addEventListener('drop', (e) => {
        imageUploadLabel.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            imageUpload.files = files;
            const changeEvent = new Event('change');
            imageUpload.dispatchEvent(changeEvent);
        }
    });

    // ─── Dimensiones a partir de formato + resolución ────────
    function round32(n) {
        return Math.max(256, Math.round(n / 32) * 32);
    }

    function computeTargetDims(ar, res) {
        const map = { '1:1': [1, 1], '16:9': [16, 9], '9:16': [9, 16], '4:3': [4, 3], '3:4': [3, 4] };
        const [aw, ah] = map[ar] || [1, 1];
        let w, h;
        if (aw >= ah) { w = res; h = res * ah / aw; }
        else { h = res; w = res * aw / ah; }
        return { width: round32(w), height: round32(h) };
    }

    // Upscale en cliente (para 4096, que FLUX no genera nativo por el límite 4MP)
    function upscaleDataUrl(dataUrl, targetW, targetH) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (img.naturalWidth >= targetW && img.naturalHeight >= targetH) {
                    resolve(dataUrl);
                    return;
                }
                const c = document.createElement('canvas');
                c.width = targetW;
                c.height = targetH;
                const ctx = c.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetW, targetH);
                resolve(c.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }

    // Extraer color dominante (promedio) de una imagen subida
    function extractDominantColor(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const size = 48;
                    const c = document.createElement('canvas');
                    c.width = size; c.height = size;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, size, size);
                    const d = ctx.getImageData(0, 0, size, size).data;
                    let r = 0, g = 0, b = 0, n = 0;
                    for (let i = 0; i < d.length; i += 4) {
                        if (d[i + 3] < 125) continue; // saltar transparente
                        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
                    }
                    if (n === 0) { resolve('#808080'); return; }
                    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
                    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                    resolve(hex);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1) Determinar el color base
        let baseColor;
        if (currentMode === 'color') {
            baseColor = colorInput.value.trim();
            if (!baseColor) return;
        } else {
            if (!uploadedFile) return;
            try {
                baseColor = await extractDominantColor(uploadedFile);
            } catch (err) {
                console.error('Error extrayendo color de la imagen:', err);
                alert('Hubo un error al procesar la imagen.');
                return;
            }
        }

        // 2) Payload de texto para los conceptos
        let tc = 'without';
        if (textChoice === true) tc = 'with';
        else if (textChoice === 'custom') tc = 'custom';

        setLoading(true, 'Interpretando concepto...');
        resultsContainer.innerHTML = '';

        try {
            // 3) DeepSeek: obtener las propuestas (paletas + tipografías + prompts)
            const concepts = await fetchConcepts({
                baseColor,
                textChoice: tc,
                customText: customTextInput.value.trim(),
                count: 3
            });

            if (!concepts || !concepts.length) {
                resultsContainer.innerHTML = `<p class="error-message">No se pudieron generar propuestas. Inténtalo de nuevo.</p>`;
                return;
            }

            // 4) Dimensiones objetivo (formato + resolución)
            const target = computeTargetDims(selectedAR, selectedRes);

            // 5) Para cada concepto, generar la imagen con FLUX (secuencial)
            let anyOk = false;
            for (let i = 0; i < concepts.length; i++) {
                const concept = concepts[i];
                setLoading(true, `Generando imagen ${i + 1} de ${concepts.length}...`);
                try {
                    const flux = await fetchFluxImage({
                        prompt: buildFluxPrompt(concept),
                        calidad: selectedQuality,
                        width: target.width,
                        height: target.height
                    });

                    let imageUrl = flux.imageUrl;
                    // Upscale en cliente si se pidió más resolución de la que FLUX generó
                    if (imageUrl && (flux.width < target.width || flux.height < target.height)) {
                        imageUrl = await upscaleDataUrl(imageUrl, target.width, target.height);
                    }

                    renderConceptCard(concept, imageUrl);
                    saveConceptToHistory(concept, imageUrl, baseColor);
                    anyOk = true;
                } catch (imgErr) {
                    console.error('Error generando imagen del concepto:', imgErr);
                    renderConceptCard(concept, null, imgErr.message);
                }
            }

            if (!anyOk) {
                const note = document.createElement('p');
                note.className = 'error-message';
                note.textContent = 'Se generaron las paletas pero falló la creación de imágenes. Revisa la clave de FLUX e inténtalo de nuevo.';
                resultsContainer.appendChild(note);
            }
        } catch (error) {
            console.error('Error en la generación:', error);
            resultsContainer.innerHTML = `<p class="error-message">${error.message || 'Hubo un error al generar. Inténtalo de nuevo.'}</p>`;
        } finally {
            setLoading(false);
        }
    });

    // ─── Llamadas a los proxies ──────────────────────────────
    async function fetchConcepts(payload) {
        const response = await fetch('concept.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || 'Error al generar las propuestas.');
        }
        return data.concepts || [];
    }

    async function fetchFluxImage(payload) {
        const response = await fetch('proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || 'Error al generar la imagen.');
        }
        return data;
    }

    // Construye el prompt final para FLUX a partir del concepto de DeepSeek
    function buildFluxPrompt(concept) {
        let p = concept.imagePrompt || '';
        const palette = Array.isArray(concept.palette) ? concept.palette.join(', ') : '';
        if (palette && !/#/.test(p)) {
            p += ` Color palette: ${palette}.`;
        }
        if (!/glassmorph|neon|premium/i.test(p)) {
            p += ' Premium advertising visual, neon glassmorphism aesthetic, high detail.';
        }
        return p.trim();
    }

    function setLoading(isLoading, message) {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (isLoading) {
            generateBtn.disabled = true;
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            }
            if (loadingText) loadingText.textContent = message || 'IA Generando Obra Maestra...';
            document.body.style.overflow = 'hidden';
            resultsContainer.classList.remove('hidden');
        } else {
            generateBtn.disabled = false;
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }
            document.body.style.overflow = '';
            resultsContainer.classList.remove('hidden');
        }
    }

    function getTextColorForBg(hexColor) {
        if (!hexColor || hexColor === 'transparent') return '#000000';
        const h = hexColor.replace('#', '');
        if (h.length < 6) return '#FFFFFF';
        const r = parseInt(h.substr(0, 2), 16);
        const g = parseInt(h.substr(2, 2), 16);
        const b = parseInt(h.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    // ─── Render de una tarjeta de propuesta ──────────────────
    function renderConceptCard(concept, imageUrl, errorMsg) {
        const title = concept.title || 'Diseño Generado';
        const harmony = concept.harmony ? ` · ${concept.harmony}` : '';
        const palette = Array.isArray(concept.palette) ? concept.palette : [];
        const fontName = concept.font?.name || 'Desconocida';
        const fontUrl = concept.font?.url || 'https://fonts.google.com/';

        const colorBlocks = palette.map(hex => {
            const bg = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hex) ? hex : 'transparent';
            const fg = getTextColorForBg(bg);
            return `<div class="color-code" style="background-color: ${bg}; color: ${fg};">${hex}</div>`;
        }).join('');

        const imageBlock = imageUrl
            ? `<div class="image-container">
                    <img src="${imageUrl}" alt="${title}">
                    <button class="download-card-btn" title="Descargar Imagen">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                    </button>
               </div>`
            : `<div class="image-container"><div class="image-error">⚠️ ${errorMsg || 'No se pudo generar la imagen'}</div></div>`;

        const cardHTML = `
            <article class="result-card">
                ${imageBlock}
                <div class="result-info">
                    <h3>${title}${harmony}</h3>
                    <div class="info-section">
                        <h4>Códigos de Color</h4>
                        <div class="color-codes">${colorBlocks}</div>
                    </div>
                    <div class="info-section">
                        <h4>Tipografía</h4>
                        <p class="typography-info">
                            ${fontName} - <a href="${fontUrl}" target="_blank" rel="noopener noreferrer">Descargar</a>
                        </p>
                    </div>
                </div>
            </article>
        `;
        resultsContainer.insertAdjacentHTML('beforeend', cardHTML);

        // Eventos de visor + descarga (solo si hay imagen)
        if (imageUrl) {
            const lastCard = resultsContainer.lastElementChild;
            const img = lastCard.querySelector('img');
            if (img) img.addEventListener('click', () => openViewer(imageUrl, title));
            const downloadBtn = lastCard.querySelector('.download-card-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    downloadImage(imageUrl, `diseno_${title.toLowerCase().replace(/\s+/g, '_')}.jpg`);
                });
            }
        }
    }

    function openViewer(url, title = 'imagen') {
        let viewer = document.getElementById('image-viewer');
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'image-viewer';
            viewer.className = 'image-viewer zoom-out';
            viewer.innerHTML = `
                <span class="close-viewer">&times;</span>
                <div class="viewer-content">
                    <img src="" alt="Vista ampliada">
                    <button class="download-viewer-btn" title="Descargar Imagen">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                        Descargar
                    </button>
                </div>
            `;
            document.body.appendChild(viewer);
            viewer.querySelector('.close-viewer').addEventListener('click', () => viewer.classList.remove('active'));
            viewer.addEventListener('click', (e) => {
                if (e.target === viewer) viewer.classList.remove('active');
            });
        }

        const viewerImg = viewer.querySelector('img');
        viewerImg.src = url;

        const downloadBtn = viewer.querySelector('.download-viewer-btn');
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

        newDownloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadImage(url, `diseno_${title.toLowerCase().replace(/\s+/g, '_')}.jpg`);
        });

        viewer.classList.add('active');
    }

    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ─── Persistencia con HistoryManager ────────────────────────
    function saveConceptToHistory(concept, imageUrl, baseColor) {
        if (!imageUrl) return;
        HistoryManager.saveItem({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
            url: imageUrl,
            prompt: (concept.title || 'Paleta') + (baseColor ? ' · ' + baseColor : ''),
            aspectRatio: selectedAR,
            size: selectedRes + 'px',
            quality: selectedQuality,
            palette: Array.isArray(concept.palette) ? concept.palette : [],
            font: concept.font || null,
            style: { mode: currentMode },
            createdAt: Date.now()
        });
        loadAndRenderHistory();
    }

    function deleteHistoryItem(id) {
        if (confirm('¿Eliminar esta imagen del historial?')) {
            HistoryManager.deleteItem(id).then(function () { loadAndRenderHistory(); });
        }
    }

    function clearAllHistory() {
        if (confirm('¿Eliminar todo el historial?')) {
            HistoryManager.clearAll().then(function () { loadAndRenderHistory(); });
        }
    }

    function loadAndRenderHistory() {
        HistoryManager.loadAll().then(function (items) {
            var grid = document.getElementById('history-grid');
            var title = document.getElementById('history-title');
            if (!grid) return;
            if (!items || !items.length) {
                grid.innerHTML = '';
                if (title) title.style.display = 'none';
                return;
            }
            if (title) title.style.display = 'block';
            grid.innerHTML = items.map(function (item) {
                return '<article class="result-card" style="position:relative">' +
                    '<div class="image-container">' +
                    '<img src="' + item.url + '" alt="Historial" onclick="document.getElementById(\'image-viewer\')?.' +
                    'classList.add(\'active\');var v=document.querySelector(\'#image-viewer img\');if(v)v.src=this.src">' +
                    '<button class="download-card-btn" title="Eliminar" style="right:10px;left:auto;background:rgba(239,68,68,0.8)" ' +
                    'onclick="event.stopPropagation();window._deleteHistoryItem && window._deleteHistoryItem(\'' + item.id + '\')">' +
                    '<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'white\' width=\'16\' height=\'16\'>' +
                    '<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.75h-.75A2.25 2.25 0 0 0 3 6.75v.5c0 .414.336.75.75.75H4v6.75A2.75 2.75 0 0 0 6.75 17h6.5A2.75 2.75 0 0 0 16 14.75V8h.25A.75.75 0 0 0 17 7.25v-.5A2.25 2.25 0 0 0 14.75 4.5H14v-.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM12.5 4.5v-.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.75h5Z" clip-rule="evenodd"/></svg>' +
                    '</button></div>' +
                    '<div class="result-info"><p style="color:#99CCCC;font-size:0.8rem;margin:0">' +
                    new Date(item.createdAt).toLocaleString() + '</p></div></article>';
            }).join('');

            // Botón limpiar todo
            var clearBtn = document.getElementById('history-clear-btn');
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'history-clear-btn';
                clearBtn.textContent = 'Limpiar Historial';
                clearBtn.style.cssText = 'margin-top:1rem;padding:0.5rem 1rem;background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#ef4444;border-radius:8px;cursor:pointer;font-size:0.8rem';
                clearBtn.onclick = clearAllHistory;
                var historyContainer = document.getElementById('history-container');
                if (historyContainer) historyContainer.appendChild(clearBtn);
            }
        });
    }

    // Exponer función de borrado para onclick inline
    window._deleteHistoryItem = deleteHistoryItem;

    // Cargar historial al iniciar
    HistoryManager.init().then(function () { loadAndRenderHistory(); });

    setInputMode('image');
});
