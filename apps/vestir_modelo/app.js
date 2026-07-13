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

    // Calidad FLUX: pro | max
    let selectedQuality = 'pro';

    // Formato (AR)
    let selectedAR = '1:1';

    // Resolución
    let selectedRes = 1024;

    // ===== DB HISTORIAL (IndexedDB local + HistoryManager servidor) =====
    const DB_NAME = 'vestir_modelo_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'history';
    let historyDb = null;

    const openHistoryDb = () => new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { historyDb = request.result; resolve(historyDb); };
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });

    const loadHistoryFromDb = async () => {
        try {
            if (!historyDb) await openHistoryDb();
            return await new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => {
                    const items = req.result || [];
                    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    resolve(items);
                };
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('Error cargando historial:', e);
            return [];
        }
    };

    const saveHistoryItemToDb = async (item) => {
        try {
            if (!historyDb) await openHistoryDb();
            return await new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('Error guardando item:', e);
        }
    };

    const deleteHistoryItemFromDb = async (id) => {
        try {
            if (!historyDb) await openHistoryDb();
            return await new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('Error eliminando item:', e);
        }
    };

    const clearHistoryFromDb = async () => {
        try {
            if (!historyDb) await openHistoryDb();
            return await new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('Error limpiando historial:', e);
        }
    };

    // Sincronizar con servidor (HistoryManager)
    const syncToServer = async (item) => {
        try {
            if (window.HistoryManager) {
                await HistoryManager.init();
                await HistoryManager.saveItem({
                    id: item.id,
                    url: item.image,
                    prompt: item.title || '',
                    createdAt: item.createdAt || Date.now(),
                    style: { compositions: item.compositions || [] },
                    aspectRatio: selectedAR,
                    size: String(selectedRes),
                    geminiSize: '1K'
                });
            }
        } catch (e) {
            console.warn('Error sync servidor:', e);
        }
    };

    async function loadHistory() {
        history = await loadHistoryFromDb();
        // Intentar cargar del servidor también
        try {
            if (window.HistoryManager) {
                HistoryManager.configure({ dbName: DB_NAME });
                await HistoryManager.init();
                const serverItems = await HistoryManager.loadFromServer();
                if (serverItems && serverItems.length > 0) {
                    const localIds = new Set(history.map(h => h.id));
                    for (const s of serverItems) {
                        if (!localIds.has(s.id)) {
                            const item = {
                                id: s.id,
                                image: s.imageUrl || s.url || '',
                                title: s.prompt || '',
                                compositions: s.style?.compositions || [],
                                createdAt: s.createdAt || 0
                            };
                            history.push(item);
                        }
                    }
                    history.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                }
            }
        } catch (e) {
            console.warn('Error cargando historial servidor:', e);
        }
        renderHistory();
    }

    // Renderizar historial
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
                <img src="${item.image}" alt="${item.title}" data-id="${item.id}">
                <div class="history-card-actions">
                    <button class="download-btn" data-id="${item.id}" title="Descargar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 8a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 11.586V8z" /><path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
                    </button>
                    <button class="edit-btn" data-id="${item.id}" title="Re-editar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <button class="delete-btn" data-id="${item.id}" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
            `;
            historyGrid.appendChild(card);
        });

        historyGrid.querySelectorAll('.history-card img').forEach(img => {
            img.addEventListener('click', (e) => {
                lightboxImg.src = e.target.src;
                lightbox.classList.remove('hidden');
            });
        });

        historyGrid.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                const item = history.find(h => h.id === itemId);
                if (!item) return;
                const link = document.createElement('a');
                link.href = item.image;
                link.download = `${item.title || 'imagen'}-${item.id}.png`;
                link.click();
            });
        });

        historyGrid.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                const item = history.find(h => h.id === itemId);
                if (!item) return;
                if (item.compositions && item.compositions.length > 0) {
                    selectedCompositions = [item.compositions[0]];
                    renderCompositionSelector();
                }
                updateGenerateButtonState();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        historyGrid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.id;
                await deleteHistoryItemFromDb(itemId);
                history = history.filter(h => h.id !== itemId);
                renderHistory();
            });
        });
    }

    clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
            await clearHistoryFromDb();
            history = [];
            renderHistory();
        }
    });

    // ===== CALIDAD FLUX (PRO/MAX) =====
    document.querySelectorAll('.quality-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quality-toggle button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedQuality = btn.dataset.quality;
        });
    });

    // ===== FORMATO (AR) =====
    document.querySelectorAll('.ar-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ar-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedAR = btn.dataset.ar;
        });
    });

    // ===== RESOLUCIÓN =====
    document.querySelectorAll('.res-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.res-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRes = parseInt(btn.dataset.res);
        });
    });

    // ===== COMPUTE TARGET DIMS (múltiplos de 32) =====
    const computeTargetDims = () => {
        const [wRatio, hRatio] = selectedAR.split(':').map(Number);
        const maxDim = selectedRes;

        let width, height;
        const ratio = wRatio / hRatio;

        if (ratio >= 1) {
            width = maxDim;
            height = Math.round(maxDim / ratio);
        } else {
            height = maxDim;
            width = Math.round(maxDim * ratio);
        }

        // Redondear a múltiplos de 32
        width = Math.round(width / 32) * 32;
        height = Math.round(height / 32) * 32;
        width = Math.max(256, width);
        height = Math.max(256, height);

        return { width, height };
    };

    // ===== UPSCALE CLIENTE (para 4096) =====
    const upscaleDataUrl = async (dataUrl, targetW, targetH) => {
        if (!targetW || !targetH) return dataUrl;
        const img = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = rej; im.src = dataUrl;
        });
        if (img.naturalWidth >= targetW && img.naturalHeight >= targetH) return dataUrl;
        const c = document.createElement('canvas');
        c.width = targetW; c.height = targetH;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return c.toDataURL('image/png', 0.92);
    };

    // ===== ESTILOS / COMPOSICIONES =====
    const compositions = [
        { id: 'full-body', title: 'Estudio Profesional', description: 'Cuerpo completo en estudio.', prompt: "Genera una imagen de una fotografía de moda de cuerpo completo: la modelo de la imagen de referencia lleva la prenda descrita de forma estilizada. Fondo de estudio blanco y limpio, iluminación profesional, pose elegante." },
        { id: 'urban-editorial', title: 'Editorial Urbano', description: 'Sesión en entorno de ciudad.', prompt: "Genera una imagen de una fotografía editorial de moda: la modelo lleva la prenda descrita en una calle urbana moderna. Pose dinámica, estilo cinematográfico." },
        { id: 'neon-night', title: 'Neón y Noche', description: 'Ciudad de noche, luces de neón.', prompt: "Genera una imagen de una fotografía de moda: la modelo lleva la prenda descrita en una azotea con ciudad iluminada por neón. Estética moderna, ambiente sofisticado." },
        { id: 'majestic-interior', title: 'Interior Majestuoso', description: 'Museo, biblioteca, hotel de lujo.', prompt: "Genera una imagen de una sesión de moda: la modelo lleva la prenda descrita en un museo o hotel de lujo. Iluminación dramática, opulencia." },
        { id: 'park-walk', title: 'Paseo por el Parque', description: 'Estilo casual y espontáneo.', prompt: "Genera una imagen de una fotografía de street style: la modelo lleva la prenda descrita paseando por un parque urbano. Look natural, luz del día." },
        { id: 'beach-minimalism', title: 'Minimalismo en Playa', description: 'Amanecer/atardecer, colores suaves.', prompt: "Genera una imagen de una composición de moda minimalista: la modelo lleva la prenda descrita en una playa al atardecer. Colores suaves, luz difusa." },
        { id: 'industrial-contrast', title: 'Contraste Industrial', description: 'Fábrica, grafitis, vanguardista.', prompt: "Genera una imagen de una sesión de fotos vanguardista: la modelo lleva la prenda descrita en una fábrica con grafitis. Contraste rudo y moda." },
        { id: 'cafe-atmosphere', title: 'Ambiente de Cafetería', description: 'Escena íntima y cotidiana.', prompt: "Genera una imagen de una escena de lifestyle: la modelo lleva la prenda descrita en una cafetería. Iluminación acogedora." },
        { id: 'pub-atmosphere', title: 'Ambiente de Pub', description: 'Escena tomando una copa.', prompt: "Genera una imagen de una escena de lifestyle: la modelo lleva la prenda descrita en un pub. Iluminación alegre, ambiente joven." },
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
            throw new Error('No se pudieron obtener estilos desde la web. Revisa la conexión e inténtalo de nuevo.');
        }

        const uniqueWeb = webCandidates.filter((style) => {
            const normalized = style.toLowerCase();
            return !existingTitles.has(normalized) && !usedSurpriseStyles.has(normalized);
        });

        if (uniqueWeb.length === 0) {
            throw new Error('No quedan estilos sorpresa nuevos en este momento. Vuelve a intentarlo en unos minutos.');
        }

        const picked = uniqueWeb[Math.floor(Math.random() * uniqueWeb.length)];
        usedSurpriseStyles.add(picked.toLowerCase());

        return {
            id: `surprise-${Date.now()}`,
            title: `Sorpresa: ${picked}`,
            description: 'Estilo sorpresa elegido automáticamente desde referencias de la red.',
            prompt: `Genera una fotografía editorial de moda donde la modelo lleve la prenda descrita. El estilo visual debe ser ${picked}. Evita replicar estilos comunes de estudio, urbano, neón, interior lujoso, parque, playa, industrial, cafetería o pub. Busca una dirección creativa inesperada y profesional.`
        };
    };

    // Render selector de composiciones
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

    // ===== LLAMADA API FLUX =====
    const callFluxApi = async (prompt, modelImageData) => {
        const { width, height } = computeTargetDims();
        const payload = {
            prompt,
            image: `data:image/jpeg;base64,${modelImageData.base64}`,
            quality: selectedQuality,
            width,
            height
        };

        let attempt = 0;
        const maxAttempts = 3;
        const loadingText = document.querySelector('.loading-text');
        const defaultLoadingMsg = 'FLUX Generando Obra Maestra...';

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
                try {
                    data = JSON.parse(text);
                } catch {
                    console.error('Respuesta no JSON del servidor:', text);
                    throw new Error('Respuesta inválida del servidor.');
                }

                if (!res.ok || !data.success) {
                    const msg = data?.error?.message || `Error HTTP ${res.status}`;
                    throw new Error(msg);
                }

                let imageData = data.imageUrl;
                if (!imageData) throw new Error('No se encontró imagen en la respuesta.');

                // Upscale si es 4096
                if (selectedRes === 4096) {
                    const { width: tw, height: th } = computeTargetDims();
                    imageData = await upscaleDataUrl(imageData, tw, th);
                }

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
    const addGeneratedImageToHistory = async (src, styleMeta) => {
        const historyItem = {
            id: Math.random().toString(36).slice(2),
            image: src,
            title: styleMeta.title,
            description: styleMeta.description,
            compositions: [styleMeta.id],
            createdAt: Date.now()
        };
        await saveHistoryItemToDb(historyItem);
        history.unshift(historyItem);
        renderHistory();
        // Sync al servidor
        syncToServer(historyItem);
    };

    // ===== GENERAR (2 imágenes por estilo) =====
    generateBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) return;

        hideError();
        setProcessing(true);
        loadingSection.classList.remove('hidden');

        const customPromptText = customPromptArea ? customPromptArea.value.trim() : '';

        let selectedToGenerate = selectedCompositions.map(id => compositions.find(c => c.id === id));

        if (selectedToGenerate.length === 0) {
            let dynPrompt = "Genera una fotografía realista donde la persona de la imagen de referencia lleve puesta exactamente la prenda de ropa descrita. Mantén la pose y el aspecto físico de la persona, cambiando únicamente la ropa. Ambiente neutro y profesional.";
            if (customPromptText !== '') {
                dynPrompt += " Sigue estas instrucciones adicionales del usuario para el entorno o la pose: " + customPromptText;
            }

            selectedToGenerate.push({
                id: 'custom-generation-' + Date.now(),
                title: customPromptText !== '' ? 'Generación Personalizada' : 'Generación Directa (Base)',
                description: customPromptText !== '' ? customPromptText.substring(0, 50) + '...' : 'Usando el prompt base automático.',
                prompt: dynPrompt
            });
        } else {
            if (customPromptText !== '') {
                selectedToGenerate = selectedToGenerate.map(comp => ({
                    ...comp,
                    prompt: comp.prompt + " IMPORTANTE: ADEMÁS de este estilo, aplica también estas instrucciones del usuario: " + customPromptText
                }));
            }
        }

        try {
            for (const comp of selectedToGenerate) {
                for (let copy = 1; copy <= 2; copy++) {
                    try {
                        const src = await callFluxApi(comp.prompt, modelFile);
                        await addGeneratedImageToHistory(src, comp);
                    } catch (err) {
                        console.error(`Fallo generando ${comp.title} #${copy}:`, err);
                        showError(`Error al generar "${comp.title}" #${copy}: ${err.message}`);
                    }
                }
            }
        } finally {
            loadingSection.classList.add('hidden');
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'FLUX Generando Obra Maestra...';
            setProcessing(false);
        }
    });

    // ===== MODO SORPRESA =====
    surpriseBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile) {
            showError('Primero sube la foto de la modelo y la prenda para usar el modo sorpresa.');
            return;
        }

        hideError();
        setProcessing(true);
        loadingSection.classList.remove('hidden');

        try {
            const surpriseStyle = await buildSurpriseStyle();
            for (let copy = 1; copy <= 2; copy++) {
                try {
                    const src = await callFluxApi(surpriseStyle.prompt, modelFile);
                    await addGeneratedImageToHistory(src, surpriseStyle);
                } catch (err) {
                    console.error(`Fallo en modo sorpresa #${copy}:`, err);
                    showError(`Error en modo sorpresa #${copy}: ${err.message}`);
                }
            }
        } catch (err) {
            console.error('Fallo preparando modo sorpresa:', err);
            showError(`No se pudo preparar el estilo sorpresa: ${err.message}`);
        } finally {
            loadingSection.classList.add('hidden');
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'FLUX Generando Obra Maestra...';
            setProcessing(false);
        }
    });

    // ===== LIGHTBOX =====
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
