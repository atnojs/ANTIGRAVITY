document.addEventListener('DOMContentLoaded', () => {
    // ===== SELECTORES DOM =====
    const modelDropZone = document.getElementById('model-drop-zone');
    const modelInput = document.getElementById('model-input');
    const modelPreview = document.getElementById('model-preview');
    const modelPrompt = document.getElementById('model-prompt');
    const outfitDropZone = document.getElementById('outfit-drop-zone');
    const outfitInput = document.getElementById('outfit-input');
    const outfitPreview = document.getElementById('outfit-preview');
    const outfitPrompt = document.getElementById('outfit-prompt');
    const compositionSelector = document.getElementById('composition-selector');
    const generateBtn = document.getElementById('generate-btn');
    const surpriseBtn = document.getElementById('surprise-btn');
    const loadingSection = document.getElementById('loading-section');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const customPromptArea = document.getElementById('custom-prompt');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.getElementById('close-lightbox');
    const historySection = document.getElementById('history-section');
    const historyGrid = document.getElementById('history-grid');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // ===== ESTADO =====
    let modelFile = null;
    let outfitFile = null;
    let selectedCompositions = [];
    let isProcessing = false;
    const usedSurpriseStyles = new Set();
    let history = [];

    // Formato (AR) y Resolución
    let selectedAR = '1:1';
    let selectedRes = 1024;

    // ===== HISTORY MANAGER (servidor persistente) =====
    HistoryManager.configure({ dbName: 'vestir_modelo_db', historyUrl: './history.php' });

    const loadHistory = async () => {
        try {
            await HistoryManager.init();
            const items = await HistoryManager.loadAll();
            history = items.map(item => ({
                id: item.id,
                image: item.url || item.imageUrl || '',
                title: item.prompt || '',
                compositions: item.style?.compositions || [],
                createdAt: item.createdAt || 0
            }));
            history.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } catch (e) {
            console.warn('Error cargando historial:', e);
            history = [];
        }
        renderHistory();
    };

    const saveHistoryItem = async (item) => {
        try {
            await HistoryManager.init();
            await HistoryManager.saveItem({
                id: item.id,
                url: item.image,
                prompt: item.title || '',
                createdAt: item.createdAt || Date.now(),
                style: { compositions: item.compositions || [] },
                aspectRatio: selectedAR,
                size: String(selectedRes)
            });
        } catch (e) {
            console.warn('Error guardando en servidor:', e);
        }
    };

    const deleteHistoryItem = async (id) => {
        try {
            await HistoryManager.init();
            await HistoryManager.deleteItem(id);
        } catch (e) {
            console.warn('Error eliminando del servidor:', e);
        }
    };

    const clearAllHistory = async () => {
        try {
            await HistoryManager.init();
            await HistoryManager.clearAll();
        } catch (e) {
            console.warn('Error limpiando servidor:', e);
        }
    };

    // ===== RENDER HISTORIAL =====
    function renderHistory() {
        if (history.length === 0) {
            historySection.classList.remove('hidden');
            historyGrid.innerHTML = '<p class="text-sm text-gray-400 text-center col-span-2">Aún no hay imágenes en el historial.</p>';
            clearHistoryBtn.classList.add('hidden');
            return;
        }
        historySection.classList.remove('hidden');
        clearHistoryBtn.classList.remove('hidden');
        historyGrid.innerHTML = '';

        history.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.title}" data-id="${item.id}" loading="lazy">
                <div class="history-card-actions">
                    <button class="download-btn" data-id="${item.id}" title="Descargar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 8a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 11.586V8z" /><path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
                    </button>
                    <button class="delete-btn" data-id="${item.id}" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
            `;
            historyGrid.appendChild(card);
        });

        // Click en miniatura → lightbox
        historyGrid.querySelectorAll('.history-card img').forEach(img => {
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                lightboxImg.dataset.zoom = 'fit';
                lightboxImg.style.objectFit = 'contain';
                lightboxImg.style.maxWidth = '98vw';
                lightboxImg.style.maxHeight = '98vh';
                lightboxImg.style.width = 'auto';
                lightboxImg.style.height = 'auto';
                lightbox.classList.remove('hidden');
            });
        });

        historyGrid.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = history.find(h => h.id === btn.dataset.id);
                if (!item) return;
                const link = document.createElement('a');
                link.href = item.image;
                link.download = `${item.title || 'imagen'}-${item.id}.png`;
                link.click();
            });
        });

        historyGrid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                await deleteHistoryItem(itemId);
                history = history.filter(h => h.id !== itemId);
                renderHistory();
            });
        });
    }

    // ===== LIMPIAR HISTORIAL =====
    clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
            await clearAllHistory();
            history = [];
            renderHistory();
        }
    });

    // ===== SELECTORES AR + RESOLUCIÓN =====
    document.querySelectorAll('.ar-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ar-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedAR = btn.dataset.ar;
        });
    });
    document.querySelectorAll('.res-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.res-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRes = parseInt(btn.dataset.res);
        });
    });

    // ===== ESTILOS / COMPOSICIONES =====
    const compositions = [
        { id: 'full-body', title: 'Estudio Profesional', description: 'Cuerpo completo en estudio.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Full body fashion photograph, clean white studio background, professional lighting, elegant pose. Show the ENTIRE person from head to toe, do NOT crop any part of the body." },
        { id: 'urban-editorial', title: 'Editorial Urbano', description: 'Sesión en entorno de ciudad.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Fashion editorial in a modern urban street. Dynamic pose, cinematic style. Show the ENTIRE person, full body, no cropping." },
        { id: 'neon-night', title: 'Neón y Noche', description: 'Ciudad de noche, luces de neón.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. On a rooftop with neon-lit city skyline. Modern aesthetic, sophisticated atmosphere. Full body, no cropping." },
        { id: 'majestic-interior', title: 'Interior Majestuoso', description: 'Museo, biblioteca, hotel de lujo.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. In a museum or luxury hotel interior. Dramatic lighting, opulence. Show the ENTIRE person, head to toe." },
        { id: 'park-walk', title: 'Paseo por el Parque', description: 'Estilo casual y espontáneo.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Street style walking through an urban park. Natural look, daylight. Full body, no cropping." },
        { id: 'beach-minimalism', title: 'Minimalismo en Playa', description: 'Amanecer/atardecer, colores suaves.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Minimalist fashion composition on a beach at sunset. Soft colors, diffused light. Full body shot, no cropping." },
        { id: 'industrial-contrast', title: 'Contraste Industrial', description: 'Fábrica, grafitis, vanguardista.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Avant-garde photoshoot in a factory with graffiti. Rough contrast and fashion. Show the ENTIRE person, full body." },
        { id: 'cafe-atmosphere', title: 'Ambiente de Cafetería', description: 'Escena íntima y cotidiana.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Lifestyle scene in a cozy café. Warm lighting. Full body, no cropping." },
        { id: 'pub-atmosphere', title: 'Ambiente de Pub', description: 'Escena tomando una copa.', prompt: "TRY-ON: The person of image 1 wearing the garments of image 2. Lifestyle scene in a pub. Cheerful lighting, young atmosphere. Full body, no cropping." },
    ];

    const fallbackSurpriseStyles = [
        'Brutalismo digital editorial',
        'Fotografía cinética futurista',
        'Neo-noir lluvioso con reflejos',
        'Bauhaus experimental de moda',
        'Dreamcore analógico con grano',
        'Editorial retrofuturista 70s',
        'Minimalismo zen con sombras duras',
        'Color blocking avant-garde'
    ];

    const fetchStyleCandidatesFromWeb = async () => {
        const sources = [
            'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Art_movements&cmlimit=200&format=json&origin=*',
            'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Photographic_styles&cmlimit=200&format=json&origin=*',
            'https://es.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Categor%C3%ADa:Movimientos_art%C3%ADsticos&cmlimit=200&format=json&origin=*'
        ];
        const aggregated = [];
        for (const url of sources) {
            try {
                const sep = url.includes('?') ? '&' : '?';
                const noCacheUrl = `${url}${sep}ts=${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const res = await fetch(noCacheUrl, { cache: 'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                const members = data?.query?.categorymembers || [];
                const cleaned = members
                    .map((m) => (m.title || '').trim())
                    .filter((title) => title.length > 3)
                    .filter((title) => !/^category:/i.test(title))
                    .filter((title) => !/^categor[ií]a:/i.test(title))
                    .filter((title) => !/^list of /i.test(title));
                if (cleaned.length > 0) aggregated.push(...cleaned);
            } catch (err) {
                console.warn('No se pudo leer estilos de la web:', err);
            }
        }
        if (aggregated.length === 0) return fallbackSurpriseStyles;
        return Array.from(new Set(aggregated));
    };

    const buildSurpriseStyle = async () => {
        const existingTitles = new Set(compositions.map((c) => c.title.toLowerCase()));
        history
            .filter((h) => typeof h.title === 'string' && h.title.toLowerCase().startsWith('sorpresa:'))
            .forEach((h) => {
                const raw = h.title.replace(/^sorpresa:\s*/i, '').trim().toLowerCase();
                if (raw) usedSurpriseStyles.add(raw);
            });
        const webCandidates = await fetchStyleCandidatesFromWeb();
        if (webCandidates.length === 0) {
            throw new Error('No se pudieron obtener estilos desde la web.');
        }
        const uniqueWeb = webCandidates.filter((style) => {
            const normalized = style.toLowerCase();
            return !existingTitles.has(normalized) && !usedSurpriseStyles.has(normalized);
        });
        if (uniqueWeb.length === 0) {
            throw new Error('No quedan estilos sorpresa nuevos.');
        }
        const picked = uniqueWeb[Math.floor(Math.random() * uniqueWeb.length)];
        usedSurpriseStyles.add(picked.toLowerCase());
        return {
            id: `surprise-${Date.now()}`,
            title: `Sorpresa: ${picked}`,
            description: 'Estilo sorpresa desde referencias de la red.',
            prompt: `TRY-ON: The person of image 1 wearing the garments of image 2. Editorial fashion photography with ${picked} visual style. Show the ENTIRE person from head to toe, full body, no cropping.`
        };
    };

    function renderCompositionSelector() {
        compositionSelector.innerHTML = '';
        compositions.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'composition-card bg-gray-800 rounded-lg p-3 text-center';
            card.dataset.id = comp.id;
            card.innerHTML = `
                <h4 class="font-semibold text-white text-sm">${comp.title}</h4>
                <p class="text-xs text-gray-400 mt-1">${comp.description}</p>
            `;
            if (selectedCompositions.includes(comp.id)) card.classList.add('selected');
            card.addEventListener('click', () => handleCompositionSelect(comp.id));
            compositionSelector.appendChild(card);
        });
    }

    function handleCompositionSelect(id) {
        const i = selectedCompositions.indexOf(id);
        if (i > -1) selectedCompositions.splice(i, 1);
        else {
            if (selectedCompositions.length >= 2) selectedCompositions.shift();
            selectedCompositions.push(id);
        }
        renderCompositionSelector();
        updateGenerateButtonState();
    }

    // ===== UTILIDADES =====
    const resizeImage = (file, maxSize = 1024) => new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
            } else {
                if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        };
        const reader = new FileReader();
        reader.onload = () => { img.src = reader.result; };
        reader.readAsDataURL(file);
    });

    const toBase64 = blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });

    const updateGenerateButtonState = () => {
        const hasImages = Boolean(modelFile && outfitFile);
        generateBtn.disabled = isProcessing || !hasImages;
        surpriseBtn.disabled = isProcessing || !hasImages;
    };

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorSection.classList.remove('hidden');
        loadingSection.classList.add('hidden');
    };
    const hideError = () => { errorSection.classList.add('hidden'); };
    const setProcessing = (value) => {
        isProcessing = value;
        updateGenerateButtonState();
    };

    // ===== DIMENSIONES Y AJUSTE AR =====
    const computeTargetDims = () => {
        const [wRatio, hRatio] = selectedAR.split(':').map(Number);
        const maxDim = selectedRes;
        let width, height;
        const ratio = wRatio / hRatio;
        if (ratio >= 1) { width = maxDim; height = Math.round(maxDim / ratio); }
        else { height = maxDim; width = Math.round(maxDim * ratio); }
        width = Math.max(256, Math.round(width / 32) * 32);
        height = Math.max(256, Math.round(height / 32) * 32);
        return { width, height };
    };

    // Ajusta al AR sin recortar (contain: modelo entero, bandas negras)
    const fitToTargetAR = async (dataUrl) => {
        const { width: tw, height: th } = computeTargetDims();
        const img = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = rej; im.src = dataUrl;
        });
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const targetRatio = tw / th;
        const srcRatio = srcW / srcH;
        let drawW, drawH, dx, dy;
        if (srcRatio > targetRatio) {
            drawH = th;
            drawW = Math.round(th * srcRatio);
            dx = Math.round((tw - drawW) / 2);
            dy = 0;
        } else {
            drawW = tw;
            drawH = Math.round(tw / srcRatio);
            dx = 0;
            dy = Math.round((th - drawH) / 2);
        }
        const c = document.createElement('canvas');
        c.width = tw;
        c.height = th;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, tw, th);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, srcW, srcH, dx, dy, drawW, drawH);
        return c.toDataURL('image/jpeg', 0.92);
    };

    // ===== LLAMADA API FLUX VTO =====
    const callFluxVto = async (prompt, modelImageData, outfitImageData) => {
        // Inyectar el AR en el prompt para que VTO lo intente respetar
        const arPrompt = `${prompt} IMPORTANT: The final image must be in ${selectedAR} aspect ratio. Show the ENTIRE person from head to toe without any cropping.`;
        const payload = {
            prompt: arPrompt,
            person: `data:image/jpeg;base64,${modelImageData.base64}`,
            garment: `data:image/jpeg;base64,${outfitImageData.base64}`
        };

        let attempt = 0;
        const maxAttempts = 3;
        const loadingText = document.querySelector('.loading-text');
        const defaultLoadingMsg = 'FLUX VTO Probando Prenda...';

        while (attempt < maxAttempts) {
            try {
                if (loadingText) loadingText.textContent = defaultLoadingMsg;
                const res = await fetch('proxy.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const text = await res.text();
                let data;
                try { data = JSON.parse(text); } catch {
                    console.error('Respuesta no JSON:', text);
                    throw new Error('Respuesta inválida del servidor.');
                }
                if (!res.ok || !data.success) {
                    throw new Error(data?.error?.message || `Error HTTP ${res.status}`);
                }
                let imageData = data.imageUrl;
                if (!imageData) throw new Error('No se encontró imagen en la respuesta.');
                // Entregar tal cual — el prompt guía el AR, sin post-procesado
                return imageData;
            } catch (err) {
                console.error(`Intento ${attempt + 1} fallido:`, err);
                attempt++;
                if (attempt >= maxAttempts) throw err;
                await new Promise(r => setTimeout(r, 3000 * attempt));
            }
        }
    };

    // ===== DROPZONES =====
    const setupDropZone = (dropZone, input, preview, promptEl, fileStore) => {
        dropZone.addEventListener('click', () => input.click());
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false)
        );
        ['dragenter', 'dragover'].forEach(ev =>
            dropZone.addEventListener(ev, () => dropZone.classList.add('dragover'), false)
        );
        ['dragleave', 'drop'].forEach(ev =>
            dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'), false)
        );
        const handleFile = async (file) => {
            if (file && file.type.startsWith('image/')) {
                hideError();
                const resizedBlob = await resizeImage(file);
                const base64 = await toBase64(resizedBlob);
                const mimeType = 'image/jpeg';
                fileStore({ base64, mimeType });
                preview.src = `data:${mimeType};base64,${base64}`;
                preview.classList.remove('hidden');
                promptEl.classList.add('hidden');
                updateGenerateButtonState();
            } else {
                showError('Sube una imagen válida (JPG, PNG, etc.).');
            }
        };
        dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
        input.addEventListener('change', e => handleFile(e.target.files[0]));
    };

    setupDropZone(modelDropZone, modelInput, modelPreview, modelPrompt, data => modelFile = data);
    setupDropZone(outfitDropZone, outfitInput, outfitPreview, outfitPrompt, data => outfitFile = data);

    // ===== AGREGAR AL HISTORIAL =====
    const addToHistory = async (src, styleMeta) => {
        const historyItem = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            image: src,
            title: styleMeta.title,
            description: styleMeta.description,
            compositions: [styleMeta.id],
            createdAt: Date.now()
        };
        await saveHistoryItem(historyItem);
        history.unshift(historyItem);
        renderHistory();
    };

    // ===== GENERAR (1 imagen por estilo) =====
    generateBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) return;
        hideError();
        setProcessing(true);
        loadingSection.classList.remove('hidden');

        const customPromptText = customPromptArea ? customPromptArea.value.trim() : '';
        let selectedToGenerate = selectedCompositions.map(id => compositions.find(c => c.id === id));

        if (selectedToGenerate.length === 0) {
            let dynPrompt = "TRY-ON: The person of image 1 wearing the garments of image 2. Realistic fashion photograph, natural pose, professional lighting, neutral background. Show the ENTIRE person from head to toe, no cropping.";
            if (customPromptText !== '') {
                dynPrompt = `TRY-ON: The person of image 1 wearing the garments of image 2. ${customPromptText}. Show the ENTIRE person, full body, no cropping.`;
            }
            selectedToGenerate.push({
                id: 'custom-' + Date.now(),
                title: customPromptText !== '' ? 'Generación Personalizada' : 'Generación Directa (Base)',
                description: customPromptText !== '' ? customPromptText.substring(0, 50) + '...' : 'Usando el prompt base automático.',
                prompt: dynPrompt
            });
        } else if (customPromptText !== '') {
            selectedToGenerate = selectedToGenerate.map(comp => ({
                ...comp,
                prompt: comp.prompt + ' Additional instructions: ' + customPromptText
            }));
        }

        try {
            for (const comp of selectedToGenerate) {
                try {
                    const src = await callFluxVto(comp.prompt, modelFile, outfitFile);
                    await addToHistory(src, comp);
                } catch (err) {
                    console.error(`Fallo generando ${comp.title}:`, err);
                    showError(`Error al generar "${comp.title}": ${err.message}`);
                }
            }
        } finally {
            loadingSection.classList.add('hidden');
            setProcessing(false);
        }
    });

    // ===== MODO SORPRESA =====
    surpriseBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) {
            showError('Primero sube la foto de la modelo y la prenda.');
            return;
        }
        hideError();
        setProcessing(true);
        loadingSection.classList.remove('hidden');
        try {
            const surpriseStyle = await buildSurpriseStyle();
            const src = await callFluxVto(surpriseStyle.prompt, modelFile, outfitFile);
            await addToHistory(src, surpriseStyle);
        } catch (err) {
            console.error('Fallo en modo sorpresa:', err);
            showError(`Error en modo sorpresa: ${err.message}`);
        } finally {
            loadingSection.classList.add('hidden');
            setProcessing(false);
        }
    });

    // ===== LIGHTBOX CON ZOOM TOGGLE =====
    lightboxImg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lightboxImg.dataset.zoom === 'fit') {
            // Cambiar a tamaño real (zoom máximo)
            lightboxImg.dataset.zoom = 'full';
            lightboxImg.style.objectFit = 'none';
            lightboxImg.style.maxWidth = 'none';
            lightboxImg.style.maxHeight = 'none';
            lightboxImg.style.width = 'auto';
            lightboxImg.style.height = 'auto';
            lightboxImg.style.cursor = 'zoom-out';
            lightbox.style.overflow = 'auto';
        } else {
            // Volver a fit
            lightboxImg.dataset.zoom = 'fit';
            lightboxImg.style.objectFit = 'contain';
            lightboxImg.style.maxWidth = '98vw';
            lightboxImg.style.maxHeight = '98vh';
            lightboxImg.style.width = 'auto';
            lightboxImg.style.height = 'auto';
            lightboxImg.style.cursor = 'zoom-in';
            lightbox.style.overflow = 'hidden';
        }
    });

    const closeLightboxHandler = () => {
        lightbox.classList.add('hidden');
        lightboxImg.src = '';
    };
    closeLightbox.addEventListener('click', closeLightboxHandler);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightboxHandler(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightboxHandler();
    });

    // ===== INICIALIZACIÓN =====
    renderCompositionSelector();
    loadHistory();
});
