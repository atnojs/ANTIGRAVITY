/**
 * ═══════════════════════════════════════════════════════════════════
 * 🧬 PROTOCOLO GEMINI v13.0 - CON HISTORIAL PERSISTENTE INDEXEDDB
 * ═══════════════════════════════════════════════════════════════════
 * Modelo: gemini-3.1-flash-image-preview
 * Incluye: Historial IndexedDB, Lightbox, Botones de acción
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
    const DB_NAME = 'clonador_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'history';
    const PROXY_URL = 'proxy.php';
    const MODEL = 'gemini-3.1-flash-image-preview';

    // --- ESTADO ---
    let identityImage = null;
    let styleImage = null;
    let styleAspectRatio = '1:1'; // Aspect ratio de la imagen de referencia
    let history = [];
    let historyDb = null;

    // --- ELEMENTOS ---
    const dropIdentity = document.getElementById('drop-area-identity');
    const dropStyle = document.getElementById('drop-area-style');
    const fileIdentity = document.getElementById('file-identity');
    const fileStyle = document.getElementById('file-style');

    const previewIdentity = document.getElementById('preview-identity');
    const previewStyle = document.getElementById('preview-style');
    const removeIdentity = document.getElementById('remove-identity');
    const removeStyle = document.getElementById('remove-style');

    const generateBtn = document.getElementById('generate-btn');
    const resultsGrid = document.getElementById('results-grid');
    const loadingOverlay = document.getElementById('loading-overlay');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.querySelector('.close-lightbox');
    const downloadBtnLb = document.getElementById('download-btn-lb');

    // ═══════════════════════════════════════════════════════════════
    // INDEXEDDB - HISTORIAL PERSISTENTE (Patrón de imagenes_ia/editar)
    // ═══════════════════════════════════════════════════════════════
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
            return new Promise((resolve, reject) => {
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
        } catch (e) { console.warn('Error cargando historial:', e); return []; }
    };

    const saveHistoryItemToDb = async (item) => {
        try {
            if (!historyDb) await openHistoryDb();
            return new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) { console.warn('Error guardando item:', e); }
    };

    const deleteHistoryItemFromDb = async (id) => {
        try {
            if (!historyDb) await openHistoryDb();
            return new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) { console.warn('Error eliminando item:', e); }
    };

    const clearHistoryFromDb = async () => {
        try {
            if (!historyDb) await openHistoryDb();
            return new Promise((resolve, reject) => {
                const tx = historyDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (e) { console.warn('Error limpiando historial:', e); }
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER HISTORIAL
    // ═══════════════════════════════════════════════════════════════
    function renderHistory() {
        if (history.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="icon-pulse"><i data-lucide="user-plus"></i></div>
                    <h3>Listo para el proceso</h3>
                    <p>Sube tu selfie y una referencia de estilo para empezar.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        resultsGrid.innerHTML = '';
        history.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'result-card glass-hover';
            card.innerHTML = `
                <img src="${item.image}" alt="Resultado ${index + 1}">
                <div class="card-actions">
                    <button class="card-action-btn download" title="Descargar">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="card-action-btn delete" title="Eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;

            // Eventos
            const img = card.querySelector('img');
            img.onclick = () => openLightbox(item.image);

            const downloadBtn = card.querySelector('.download');
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                downloadImage(item.image, `clon_${item.id}.png`);
            };

            const deleteBtn = card.querySelector('.delete');
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                await deleteFromHistory(item.id);
            };

            resultsGrid.appendChild(card);
        });

        lucide.createIcons();
    }

    async function addToHistory(imageSrc) {
        const newItem = {
            id: Math.random().toString(36).substring(7),
            image: imageSrc,
            createdAt: Date.now()
        };
        await saveHistoryItemToDb(newItem);
        history.unshift(newItem);
        renderHistory();
    }

    async function deleteFromHistory(id) {
        await deleteHistoryItemFromDb(id);
        history = history.filter(item => item.id !== id);
        renderHistory();
    }

    async function clearAllHistory() {
        if (confirm('¿Eliminar todo el historial?')) {
            await clearHistoryFromDb();
            history = [];
            renderHistory();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LIGHTBOX
    // ═══════════════════════════════════════════════════════════════
    let currentLightboxImage = null;

    function openLightbox(src) {
        currentLightboxImage = src;
        lightboxImg.src = src;
        lightbox.classList.remove('hidden');
        lightbox.style.display = 'flex';
    }

    function closeLightbox() {
        lightbox.classList.add('hidden');
        lightbox.style.display = 'none';
        currentLightboxImage = null;
    }

    closeLightboxBtn.onclick = closeLightbox;

    // Cerrar lightbox al hacer clic en cualquier parte (excepto controles)
    lightbox.onclick = (e) => {
        // No cerrar si se hace clic en los controles de descarga
        if (e.target.closest('.lightbox-controls')) return;
        closeLightbox();
    };

    // También cerrar al hacer clic en la imagen (cursor zoom-out)
    lightboxImg.onclick = closeLightbox;

    downloadBtnLb.onclick = () => {
        if (currentLightboxImage) {
            downloadImage(currentLightboxImage, 'clon_gemini.png');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // DESCARGA
    // ═══════════════════════════════════════════════════════════════
    function downloadImage(src, filename) {
        const link = document.createElement('a');
        link.href = src;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ═══════════════════════════════════════════════════════════════
    // SETUP INPUTS DE IMAGEN
    // ═══════════════════════════════════════════════════════════════
    setupUpload(dropIdentity, fileIdentity, previewIdentity, (data, img) => {
        identityImage = data;
        previewIdentity.src = data;
        previewIdentity.style.display = 'block';
        dropIdentity.querySelector('.drop-placeholder').style.display = 'none';
        removeIdentity.style.display = 'flex';
        checkStatus();
    });

    setupUpload(dropStyle, fileStyle, previewStyle, (data, img) => {
        styleImage = data;
        previewStyle.src = data;
        previewStyle.style.display = 'block';
        dropStyle.querySelector('.drop-placeholder').style.display = 'none';
        removeStyle.style.display = 'flex';

        // Calcular aspect ratio de la imagen de referencia
        styleAspectRatio = calculateAspectRatio(img.width, img.height);
        console.log('Aspect ratio de referencia:', styleAspectRatio);
        checkStatus();
    });

    function setupUpload(dropArea, input, preview, onDone) {
        dropArea.onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) processFile(file, onDone);
        };
        dropArea.ondragover = (e) => { e.preventDefault(); dropArea.classList.add('hover'); };
        dropArea.ondragleave = () => dropArea.classList.remove('hover');
        dropArea.ondrop = (e) => {
            e.preventDefault();
            dropArea.classList.remove('hover');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file, onDone);
        };
    }

    function processFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            // Cargar imagen para obtener dimensiones
            const img = new Image();
            img.onload = () => callback(data, img);
            img.src = data;
        };
        reader.readAsDataURL(file);
    }

    // Calcular aspect ratio más cercano soportado
    function calculateAspectRatio(width, height) {
        const ratio = width / height;
        // Gemini soporta: 1:1, 16:9, 9:16, 4:3, 3:4
        if (ratio > 1.5) return '16:9';
        if (ratio < 0.67) return '9:16';
        if (ratio > 1.2) return '4:3';
        if (ratio < 0.85) return '3:4';
        return '1:1';
    }

    removeIdentity.onclick = (e) => {
        e.stopPropagation();
        identityImage = null;
        previewIdentity.style.display = 'none';
        dropIdentity.querySelector('.drop-placeholder').style.display = 'flex';
        removeIdentity.style.display = 'none';
        checkStatus();
    };

    removeStyle.onclick = (e) => {
        e.stopPropagation();
        styleImage = null;
        styleAspectRatio = '1:1';
        previewStyle.style.display = 'none';
        dropStyle.querySelector('.drop-placeholder').style.display = 'flex';
        removeStyle.style.display = 'none';
        checkStatus();
    };

    function checkStatus() {
        generateBtn.disabled = !(identityImage && styleImage);
    }

    // ═══════════════════════════════════════════════════════════════
    // ENGINE LOGIC - GENERACIÓN
    // ═══════════════════════════════════════════════════════════════
    generateBtn.onclick = async () => {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';

        try {
            const finalImage = await transformImage(identityImage, styleImage);
            await addToHistory(finalImage);

        } catch (error) {
            console.error('Error:', error);
            alert('Fallo: ' + error.message);
        } finally {
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // TRANSFORMACIÓN API
    // ═══════════════════════════════════════════════════════════════
    async function transformImage(img1, img2) {
        // Las imágenes se envían en orden: [0]=Identity(Face), [1]=Style(Reference)
        const prompt = `CRITICAL TASK: FACE SWAP ONLY. Do NOT replace the person's body or clothing.
        
        INPUTS:
        - Image 1 (First): SOURCE FACE. Use ONLY the face. IGNORE the hair, clothes, scarf, and background.
        - Image 2 (Second): MASTER REFERENCE. This image must be preserved EXACTLY (same body, same hair, same clothes, same dragon/background).
        
        INSTRUCTIONS:
        1. Generate an image that looks IDENTICAL to Image 2 (Reference).
        2. ONLY change the facial features of the person to match Image 1 (Identity).
        3. STRICTLY PRESERVE the hair style, hair color, and clothing of the person in Image 2. 
        4. DO NOT transfer the clothing (coat/scarf) or hair from Image 1.
        5. Seamlessly blend the new face into the lighting and skin tone of Image 2.`;

        const b64_1 = img1.split(',')[1];
        const b64_2 = img2.split(',')[1];

        const res = await fetch(PROXY_URL, {
            method: 'POST',
            body: JSON.stringify({
                model: MODEL,
                contents: [{
                    parts: [
                        { inline_data: { data: b64_1, mime_type: 'image/png' } },
                        { inline_data: { data: b64_2, mime_type: 'image/png' } },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    imageConfig: {
                        aspectRatio: styleAspectRatio
                    }
                }
            })
        });

        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (data.promptFeedback?.blockReason) {
            throw new Error('Bloqueado: ' + data.promptFeedback.blockReason);
        }

        const partsResponse = data.candidates?.[0]?.content?.parts || [];
        for (const part of partsResponse) {
            const imgData = part.inlineData?.data || part.inline_data?.data;
            const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png';
            if (imgData) {
                return `data:${mimeType};base64,${imgData}`;
            }
        }
        throw new Error('No se generó imagen.');
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS GLOBALES
    // ═══════════════════════════════════════════════════════════════
    clearHistoryBtn.onclick = clearAllHistory;

    // Cerrar lightbox con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentLightboxImage) {
            closeLightbox();
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // INICIALIZACIÓN - CARGAR HISTORIAL
    // ═══════════════════════════════════════════════════════════════
    async function init() {
        try {
            await openHistoryDb();
            history = await loadHistoryFromDb();
            renderHistory();
        } catch (e) {
            console.warn('Error inicializando:', e);
        }
    }

    init();
});

