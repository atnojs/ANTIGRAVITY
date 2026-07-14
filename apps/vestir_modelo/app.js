document.addEventListener('DOMContentLoaded', () => {
    // ===== SELECTORES DOM =====
    const $ = id => document.getElementById(id);
    const modelDropZone = $('model-drop-zone');
    const modelInput = $('model-input');
    const modelPreview = $('model-preview');
    const modelPrompt = $('model-prompt');
    const outfitDropZone = $('outfit-drop-zone');
    const outfitInput = $('outfit-input');
    const outfitPreview = $('outfit-preview');
    const outfitPrompt = $('outfit-prompt');
    const compositionSelector = $('composition-selector');
    const generateBtn = $('generate-btn');
    const surpriseBtn = $('surprise-btn');
    const loadingSection = $('loading-section');
    const progressPanel = $('progress-panel');
    const progressFill = $('progress-bar-fill');
    const progressPercent = $('progress-percent');
    const errorSection = $('error-section');
    const errorMessage = $('error-message');
    const customPromptArea = $('custom-prompt');
    const lightbox = $('lightbox');
    const lightboxImg = $('lightbox-img');
    const closeLightbox = $('close-lightbox');
    const historySection = $('history-section');
    const historyGrid = $('history-grid');
    const clearHistoryBtn = $('clear-history-btn');

    // ===== HISTORIAL (canónico: HistoryManager clase) =====
    const historyManager = new HistoryManager('vestir_modelo');

    // ===== ESTADO =====
    let modelFile = null;
    let outfitFile = null;
    let selectedCompositions = [];
    let isProcessing = false;
    const usedSurpriseStyles = new Set();
    let historyItems = [];
    let selectedQuality = 'pro';
    let selectedAR = '1:1';
    let selectedRes = 1024;

    // ===== CARGA DE HISTORIAL =====
    const loadHistory = async () => {
        try {
            await historyManager.load();
            historyItems = historyManager.getAll();
        } catch (e) {
            console.warn('Error cargando historial:', e);
            historyItems = [];
        }
        renderHistory();
    };

    const renderHistory = () => {
        if (historyItems.length === 0) {
            historySection.classList.remove('hidden');
            historyGrid.innerHTML = '<p class="text-sm text-gray-400 text-center col-span-2">Aún no hay imágenes en el historial.</p>';
            clearHistoryBtn.classList.add('hidden');
            return;
        }
        historySection.classList.remove('hidden');
        clearHistoryBtn.classList.remove('hidden');
        historyGrid.innerHTML = '';
        historyItems.forEach(item => {
            const data = item.data || {};
            const imageUrl = item.imageUrl || data.url || data.dataUrl || '';
            const title = data.prompt || '';
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}" loading="lazy">
                <div class="history-card-actions">
                    <button class="download-btn" data-url="${imageUrl}" title="Descargar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 8a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 11.586V8z"/><path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
                    </button>
                    <button class="delete-btn" data-id="${item.id}" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                </div>`;
            historyGrid.appendChild(card);
        });

        historyGrid.querySelectorAll('.history-card img').forEach(img => {
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                lightboxImg.dataset.zoom = 'fit';
                lightboxImg.style.objectFit = 'contain';
                lightboxImg.style.maxWidth = '95vw';
                lightboxImg.style.maxHeight = '95vh';
                lightbox.classList.remove('hidden');
            });
        });
        historyGrid.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = btn.dataset.url;
                link.download = 'vestir_modelo.png';
                link.click();
            });
        });
        historyGrid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                await historyManager.delete(btn.dataset.id);
                historyItems = historyManager.getAll();
                renderHistory();
            });
        });
    };

    clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('¿Borrar todo el historial?')) {
            await historyManager.clear();
            historyItems = [];
            renderHistory();
        }
    });

    // ===== SELECTORES =====
    document.querySelectorAll('.quality-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quality-toggle button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedQuality = btn.dataset.quality;
        });
    });
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

    // ===== ESTILOS =====
    const compositions = [
        { id: 'full-body', title: 'Estudio Profesional', description: 'Cuerpo completo en estudio.', prompt: 'Full body fashion photograph, clean white studio background, professional lighting, elegant pose. Show the ENTIRE person from head to toe.' },
        { id: 'urban-editorial', title: 'Editorial Urbano', description: 'Sesión en entorno de ciudad.', prompt: 'Fashion editorial in a modern urban street. Dynamic pose, cinematic style. Full body, no cropping.' },
        { id: 'neon-night', title: 'Neón y Noche', description: 'Ciudad de noche, luces de neón.', prompt: 'On a rooftop with neon-lit city skyline. Modern aesthetic, sophisticated atmosphere. Full body shot.' },
        { id: 'majestic-interior', title: 'Interior Majestuoso', description: 'Museo, biblioteca, hotel de lujo.', prompt: 'In a museum or luxury hotel interior. Dramatic lighting, opulence. Full body, no cropping.' },
        { id: 'park-walk', title: 'Paseo por el Parque', description: 'Estilo casual y espontáneo.', prompt: 'Street style walking through an urban park. Natural look, daylight. Full body shot.' },
        { id: 'beach-minimalism', title: 'Minimalismo en Playa', description: 'Amanecer/atardecer.', prompt: 'Minimalist fashion composition on a beach at sunset. Soft colors, diffused light. Full body.' },
        { id: 'industrial-contrast', title: 'Contraste Industrial', description: 'Fábrica, grafitis.', prompt: 'Avant-garde photoshoot in a factory with graffiti. Rough contrast and fashion. Full body.' },
        { id: 'cafe-atmosphere', title: 'Ambiente de Cafetería', description: 'Escena íntima.', prompt: 'Lifestyle scene in a cozy café. Warm lighting. Full body shot.' },
        { id: 'pub-atmosphere', title: 'Ambiente de Pub', description: 'Escena de copas.', prompt: 'Lifestyle scene in a pub. Cheerful lighting, young atmosphere. Full body.' },
    ];

    const fallbackSurpriseStyles = [
        'Brutalismo digital editorial', 'Fotografía cinética futurista', 'Neo-noir lluvioso con reflejos',
        'Bauhaus experimental de moda', 'Dreamcore analógico con grano', 'Editorial retrofuturista 70s',
        'Minimalismo zen con sombras duras', 'Color blocking avant-garde'
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
                const res = await fetch(`${url}${sep}ts=${Date.now()}-${Math.random().toString(36).slice(2)}`, { cache: 'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                const members = data?.query?.categorymembers || [];
                aggregated.push(...members.map(m => (m.title || '').trim()).filter(t => t.length > 3 && !/^category:/i.test(t) && !/^categor[ií]a:/i.test(t) && !/^list of /i.test(t)));
            } catch (err) { console.warn('Error estilos web:', err); }
        }
        return aggregated.length > 0 ? Array.from(new Set(aggregated)) : fallbackSurpriseStyles;
    };

    const buildSurpriseStyle = async () => {
        const existing = new Set(compositions.map(c => c.title.toLowerCase()));
        historyItems.filter(h => (h.data?.prompt || '').toLowerCase().startsWith('sorpresa:')).forEach(h => {
            const raw = (h.data?.prompt || '').replace(/^sorpresa:\s*/i, '').trim().toLowerCase();
            if (raw) usedSurpriseStyles.add(raw);
        });
        const web = await fetchStyleCandidatesFromWeb();
        const unique = web.filter(s => !existing.has(s.toLowerCase()) && !usedSurpriseStyles.has(s.toLowerCase()));
        if (unique.length === 0) throw new Error('No quedan estilos sorpresa nuevos.');
        const picked = unique[Math.floor(Math.random() * unique.length)];
        usedSurpriseStyles.add(picked.toLowerCase());
        return {
            id: `surprise-${Date.now()}`,
            title: `Sorpresa: ${picked}`,
            description: 'Estilo sorpresa desde referencias de la red.',
            prompt: `Editorial fashion photography with ${picked} visual style. Full body, show the ENTIRE person from head to toe.`
        };
    };

    const renderCompositionSelector = () => {
        compositionSelector.innerHTML = '';
        compositions.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'composition-card bg-gray-800 rounded-lg p-3 text-center';
            card.dataset.id = comp.id;
            card.innerHTML = `<h4 class="font-semibold text-white text-sm">${comp.title}</h4><p class="text-xs text-gray-400 mt-1">${comp.description}</p>`;
            if (selectedCompositions.includes(comp.id)) card.classList.add('selected');
            card.addEventListener('click', () => {
                const i = selectedCompositions.indexOf(comp.id);
                if (i > -1) selectedCompositions.splice(i, 1);
                else { if (selectedCompositions.length >= 2) selectedCompositions.shift(); selectedCompositions.push(comp.id); }
                renderCompositionSelector();
                updateButtons();
            });
            compositionSelector.appendChild(card);
        });
    };

    // ===== UTILIDADES =====
    const resizeImage = (file, maxSize = 1024) => new Promise(resolve => {
        const img = new Image(), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
            else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        };
        const reader = new FileReader();
        reader.onload = () => { img.src = reader.result; };
        reader.readAsDataURL(file);
    });

    const updateButtons = () => {
        const ok = Boolean(modelFile && outfitFile);
        generateBtn.disabled = isProcessing || !ok;
        surpriseBtn.disabled = isProcessing || !ok;
    };

    const showError = msg => { errorMessage.textContent = msg; errorSection.classList.remove('hidden'); loadingSection.classList.add('hidden'); };
    const hideError = () => { errorSection.classList.add('hidden'); };
    const showLoading = () => {
        loadingSection.classList.remove('hidden');
        progressPanel.classList.add('hidden');
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressPanel.setAttribute('aria-hidden', 'true');
        loadingSection.setAttribute('aria-busy', 'true');
    };
    const hideLoading = () => { loadingSection.classList.add('hidden'); loadingSection.setAttribute('aria-busy', 'false'); };
    const setProcessing = v => { isProcessing = v; updateButtons(); };

    // ===== LLAMADA AL PROXY CANÓNICO =====
    const callFlux = async (prompt, modelB64, outfitB64) => {
        const payload = {
            action: 'generate',
            quality: selectedQuality,
            aspectRatio: selectedAR,
            resolution: selectedRes,
            prompt,
            image: `data:image/jpeg;base64,${modelB64}`,
            images: [`data:image/jpeg;base64,${outfitB64}`]
        };

        let attempt = 0;
        const maxAttempts = 3;
        while (attempt < maxAttempts) {
            try {
                showLoading();
                const res = await fetch('proxy.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || data.detail || `Error HTTP ${res.status}`);
                const imageUrl = data.dataUrl || (data.image ? `data:${data.mimeType || 'image/png'};base64,${data.image}` : '');
                if (!imageUrl) throw new Error('No se recibió imagen.');
                return { imageUrl, data };
            } catch (err) {
                console.error(`Intento ${attempt + 1}:`, err);
                attempt++;
                if (attempt >= maxAttempts) throw err;
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }
        }
    };

    // ===== DROPZONES =====
    const setupDropZone = (dropZone, input, preview, promptEl, fileStore) => {
        dropZone.addEventListener('click', () => input.click());
        ['dragenter','dragover','dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false));
        ['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.add('dragover'), false));
        ['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'), false));
        const handleFile = async file => {
            if (!file || !file.type.startsWith('image/')) { showError('Sube una imagen válida.'); return; }
            hideError();
            const blob = await resizeImage(file);
            const reader = new FileReader();
            const base64 = await new Promise((res, rej) => { reader.onload = () => res(reader.result.split(',')[1]); reader.onerror = rej; reader.readAsDataURL(blob); });
            fileStore({ base64, mimeType: 'image/jpeg' });
            preview.src = `data:image/jpeg;base64,${base64}`;
            preview.classList.remove('hidden');
            promptEl.classList.add('hidden');
            updateButtons();
        };
        dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
        input.addEventListener('change', e => handleFile(e.target.files[0]));
    };
    setupDropZone(modelDropZone, modelInput, modelPreview, modelPrompt, data => modelFile = data);
    setupDropZone(outfitDropZone, outfitInput, outfitPreview, outfitPrompt, data => outfitFile = data);

    // ===== GENERAR =====
    generateBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) return;
        hideError();
        setProcessing(true);
        const customText = customPromptArea ? customPromptArea.value.trim() : '';
        let toGen = selectedCompositions.map(id => compositions.find(c => c.id === id));
        if (toGen.length === 0) {
            let p = 'Fashion photograph of a person wearing the garment from the reference image. Maintain the persons identity, pose and face, only change the clothing. Full body shot, show the ENTIRE person from head to toe without cropping. Natural pose, professional lighting, clean background.';
            if (customText) p = `Fashion photograph: ${customText}. Show the ENTIRE person from head to toe, full body, no cropping.`;
            toGen.push({ id: 'custom-' + Date.now(), title: customText ? 'Personalizada' : 'Directa', description: customText ? customText.slice(0, 40) + '...' : 'Prompt base', prompt: p });
        } else if (customText) {
            toGen = toGen.map(c => ({ ...c, prompt: c.prompt + '. ' + customText }));
        }
        try {
            for (const comp of toGen) {
                try {
                    const { imageUrl } = await callFlux(comp.prompt, modelFile.base64, outfitFile.base64);
                    await historyManager.save({
                        type: 'image',
                        data: { prompt: comp.title, description: comp.description },
                        imageData: imageUrl
                    });
                    historyItems = historyManager.getAll();
                    renderHistory();
                } catch (err) {
                    showError(`Error: ${err.message}`);
                }
            }
        } finally {
            hideLoading();
            setProcessing(false);
        }
    });

    // ===== SORPRESA =====
    surpriseBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) { showError('Sube las dos fotos primero.'); return; }
        hideError();
        setProcessing(true);
        try {
            const style = await buildSurpriseStyle();
            const { imageUrl } = await callFlux(style.prompt, modelFile.base64, outfitFile.base64);
            await historyManager.save({ type: 'image', data: { prompt: style.title, description: style.description }, imageData: imageUrl });
            historyItems = historyManager.getAll();
            renderHistory();
        } catch (err) {
            showError(`Error sorpresa: ${err.message}`);
        } finally {
            hideLoading();
            setProcessing(false);
        }
    });

    // ===== LIGHTBOX ZOOM =====
    lightboxImg.addEventListener('click', e => {
        e.stopPropagation();
        if (lightboxImg.dataset.zoom === 'fit') {
            lightboxImg.dataset.zoom = 'full';
            lightboxImg.style.objectFit = 'none';
            lightboxImg.style.maxWidth = 'none';
            lightboxImg.style.maxHeight = 'none';
            lightbox.style.overflow = 'auto';
        } else {
            lightboxImg.dataset.zoom = 'fit';
            lightboxImg.style.objectFit = 'contain';
            lightboxImg.style.maxWidth = '95vw';
            lightboxImg.style.maxHeight = '95vh';
            lightbox.style.overflow = 'hidden';
        }
    });
    const closeLb = () => { lightbox.classList.add('hidden'); lightboxImg.src = ''; };
    closeLightbox.addEventListener('click', closeLb);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

    // ===== INICIO =====
    renderCompositionSelector();
    loadHistory();
});
