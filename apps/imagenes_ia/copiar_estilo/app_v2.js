// --- CONSTANTES DE FORMATO ---
const AspectRatio = { SQUARE: '1:1', PORTRAIT: '3:4', WIDE: '16:9', TALL: '9:16', ULTRAWIDE: '21:9' };

// --- SELECTOR DE MODELO IA (barra segmentada canónica) ---
window.selectedModel = 'gemini-pro';
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.model-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.model-toggle').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.selectedModel = btn.dataset.model;
        });
    });
});

// --- HISTORIAL PERSISTENTE CON INDEXEDDB (Patrón editar/app.js) ---
const DB_NAME = 'copiar_estilo_db'; // Nombre único para esta app
const DB_VERSION = 1;
const STORE_NAME = 'history';

let historyDb = null;

// Abrir conexión a IndexedDB
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

// Cargar historial
const loadHistoryFromDb = async () => {
    try {
        if (!historyDb) await openHistoryDb();
        return new Promise((resolve, reject) => {
            const tx = historyDb.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const items = req.result || [];
                // Ordenar por fecha decreciente (más reciente primero)
                items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                resolve(items);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.warn('Error cargando historial:', e); return []; }
};

// Guardar item
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

// Eliminar item
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

// Limpiar todo
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

// Estado local del historial para renderizado
let history = [];

// --- ESTADO DE RESULTADOS DE ANÁLISIS ---
const analysisResults = {
    techDesc: null,
    creativePrompt: null
};
let analysisInProgress = false;

// --- ESTADO DE IMÁGENES GENERADAS EN LOS SLOTS CENTRALES ---
const slotImages = {
    tech: null,
    creative: null
};

// Auto-disparar el análisis cuando ambas imágenes están cargadas
async function onBothImagesLoaded() {
    const styleLoaded = document.getElementById('stylePreview')?.style?.display === 'block';
    const subjectLoaded = document.getElementById('subjectPreview')?.style?.display === 'block';
    if (!styleLoaded || !subjectLoaded) return;
    if (analysisInProgress) return;

    analysisInProgress = true;
    const loading = document.getElementById('loadingOverlay');
    const loadingText = loading?.querySelector('.loading-text-glow');
    const loadingBg = document.getElementById('loadingBgImage');
    const stylePreview = document.getElementById('stylePreview');

    if (loadingBg && stylePreview?.src) {
        loadingBg.style.backgroundImage = `url(${stylePreview.src})`;
    }
    if (loading) loading.style.display = 'flex';
    if (loadingText) loadingText.textContent = 'IA Analizando Imagen de Referencia...';
    startProgress('Analizando imagen de referencia...');

    try {
        const styleFile = document.getElementById('styleInput').files[0];
        if (!styleFile) { analysisInProgress = false; if (loading) loading.style.display = 'none'; resetProgress(); return; }
        const styleData = await fileToBase64(styleFile);

        const [techResult, creativeResult] = await Promise.allSettled([
            callAnalysisAPI(styleData, 'tech'),
            callAnalysisAPI(styleData, 'creative')
        ]);

        if (techResult.status === 'fulfilled' && techResult.value) {
            analysisResults.techDesc = techResult.value;
        }
        if (creativeResult.status === 'fulfilled' && creativeResult.value) {
            analysisResults.creativePrompt = creativeResult.value;
        }

    } catch (e) {
        console.error('Error en análisis automático:', e);
    } finally {
        completeProgress();
        setTimeout(() => {
            if (loading) loading.style.display = 'none';
            resetProgress();
        }, 600);
        analysisInProgress = false;
        renderAnalysisCards();
    }
}

// Helper que llama a Gemini 2.5 Flash para generar un JSON de análisis
async function callAnalysisAPI(styleData, type) {
    let promptText;
    if (type === 'tech') {
        promptText = `Actúa como un analista visual y director de fotografía profesional. Analiza esta imagen de referencia y genera un JSON con una descripción técnica EXTREMADAMENTE detallada. Usa EXACTAMENTE esta estructura (todo en español):

{
  "descripcion_tecnica": {
    "tipo_imagen": "tipo de imagen (retrato, paisaje, editorial, etc.)",
    "formato": {
      "orientacion": "vertical, horizontal o cuadrada",
      "relacion_aspecto_aproximada": "ej: 4:5, 1:1, 16:9",
      "encuadre": "primer plano, plano medio, plano general, etc.",
      "composicion": "descripción detallada de la composición visual"
    },
    "sujeto": {
      "genero_aparente": "hombre, mujer, niño, etc.",
      "edad_aparente": "bebé, niño, joven, adulto, adulto maduro, anciano",
      "cabello": "color, longitud, textura y peinado",
      "barba": "si aplica, describir tipo y longitud",
      "expresion": "seria, sonriente, pensativa, melancólica, etc.",
      "mirada": "dirección de la mirada y lenguaje ocular",
      "pose": "descripción detallada de la postura corporal completa"
    },
    "vestuario": {
      "prenda_principal": "tipo de prenda dominante",
      "color": "color o patrón de colores",
      "textura": "tipo de tejido y su apariencia visual",
      "estilo": "casual, formal, deportivo, elegante, etc."
    },
    "iluminacion": {
      "tipo": "natural, artificial, estudio, mixta",
      "direccion": "frontal, lateral, cenital, contraluz, etc.",
      "temperatura": "cálida, fría, neutra",
      "contraste": "alto, medio, suave",
      "sombras": "duras, suaves, inexistentes",
      "efecto_visual": "atmósfera creada por la iluminación"
    },
    "fondo": {
      "ubicacion": "interior, exterior, estudio",
      "elementos_visibles": ["lista de objetos o elementos del fondo"],
      "profundidad": "desenfocado, nítido, medio",
      "nivel_de_detalle": "alto, medio, bajo"
    },
    "color_y_estetica": {
      "paleta": ["color1", "color2", "color3"],
      "color_grading": "descripción del tratamiento de color",
      "ambiente": "atmósfera emocional y estética"
    },
    "camara": {
      "tipo_plano": "close-up, medium shot, full shot, etc.",
      "angulo": "frontal, picado, contrapicado, lateral",
      "altura": "a la altura del rostro, cintura, etc.",
      "distancia": "cercana, media, lejana",
      "profundidad_de_campo": "reducida, media, amplia",
      "enfoque": "qué elementos están enfocados"
    },
    "calidad_visual": {
      "nitidez": "alta, media, suave",
      "detalle_destacado": "qué texturas o detalles resaltan",
      "ruido": "grano visible, imagen limpia, etc.",
      "acabado": "fotográfico, cinematográfico, editorial, etc."
    },
    "lectura_visual": {
      "intencion": "qué mensaje transmite la imagen",
      "sensacion_general": "serenidad, tensión, alegría, nostalgia, etc."
    }
  }
}

Sé extremadamente detallado. Describe CADA aspecto como un director de fotografía profesional analizando una imagen de referencia para replicarla. Responde ÚNICAMENTE con JSON válido, sin markdown ni comentarios. Solo el objeto JSON puro.`;
    } else {
        promptText = `Actúa como un director creativo experto en generación de imágenes con IA (Midjourney, DALL-E, Stable Diffusion). Analiza esta imagen de referencia y genera un JSON con todos los elementos necesarios para recrear una imagen con el MISMO ESTILO. Usa EXACTAMENTE esta estructura (todo en español):

{
  "title": "título descriptivo corto de la imagen",
  "aspect_ratio": "relación de aspecto detectada",
  "style": "descripción del estilo visual general",
  "prompt": "PROMPT COMPLETO Y EXTREMADAMENTE DETALLADO listo para pegar en un generador de IA. Describe la escena, sujeto, iluminación, cámara, colores, ambiente y estilo con el MÁXIMO detalle posible. Mínimo 150 palabras. Debe servir para replicar el ESTILO de la imagen de referencia, no el contenido exacto.",
  "negative_prompt": "elementos a evitar en la generación",
  "camera": {
    "shot_type": "tipo de plano",
    "angle": "ángulo de cámara",
    "focus": "punto de enfoque",
    "depth_of_field": "profundidad de campo"
  },
  "lighting": {
    "type": "tipo de iluminación",
    "temperature": "temperatura de color",
    "mood": "atmósfera creada por la luz"
  },
  "color_palette": ["color1", "color2", "color3", "color4", "color5"],
  "environment": {
    "location": "ubicación de la escena",
    "background": "descripción del fondo"
  },
  "quality": {
    "detail_level": "nivel de detalle",
    "render_style": "estilo de renderizado",
    "finish": "acabado final"
  }
}

El campo "prompt" debe ser extremadamente detallado, de al menos 150 palabras. Céntrate en describir el ESTILO VISUAL (iluminación, paleta, atmósfera, tipo de plano, calidad) para poder aplicarlo a cualquier sujeto. Responde ÚNICAMENTE con JSON válido, sin markdown ni comentarios.`;
    }

    const payload = {
        model: "gemini-2.5-flash",
        contents: [{ parts: [
            { text: promptText },
            { inlineData: { mimeType: styleData.mimeType, data: styleData.data } }
        ]}],
        generationConfig: { responseModalities: ["TEXT"] }
    };

    const response = await fetch('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
            if (part.text) {
                let jsonText = part.text.trim();
                jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
                try {
                    const jsonContent = JSON.parse(jsonText);
                    return {
                        id: type + '_' + Date.now(),
                        type: type,
                        jsonContent: jsonContent,
                        createdAt: new Date().toLocaleString()
                    };
                } catch (parseErr) {
                    console.error('Error parseando JSON (' + type + '):', parseErr);
                    return {
                        id: type + '_' + Date.now(),
                        type: type,
                        jsonContent: { raw_text: jsonText },
                        createdAt: new Date().toLocaleString()
                    };
                }
            }
        }
    }
    console.error('Respuesta inesperada para ' + type + ':', data);
    return null;
}

const getClosestAspectRatio = (width, height) => {
    const ratio = width / height;
    const targets = [
        { id: AspectRatio.SQUARE, val: 1 },
        { id: AspectRatio.PORTRAIT, val: 3 / 4 },
        { id: AspectRatio.WIDE, val: 16 / 9 },
        { id: AspectRatio.TALL, val: 9 / 16 },
        { id: AspectRatio.ULTRAWIDE, val: 21 / 9 }
    ];
    return targets.reduce((prev, curr) => Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev).id;
};

// Variable para guardar el AR detectado de la referencia
let detectedAR = AspectRatio.SQUARE;

// Función auxiliar para convertir File a Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            const base64Data = result.split(',')[1];
            const mimeType = result.split(';')[0].split(':')[1];
            resolve({ data: base64Data, mimeType: mimeType });
        };
        reader.onerror = error => reject(error);
    });
}

// Lógica de previsualización mejorada
function setupPreview(inputId, imgId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.getElementById(imgId);
                img.src = e.target.result;
                img.style.display = 'block';

                // Si es la imagen de referencia (styleInput), detectamos su AR
                if (inputId === 'styleInput') {
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        detectedAR = getClosestAspectRatio(tempImg.width, tempImg.height);
                        console.log("Aspect Ratio detectado:", detectedAR);
                    };
                    tempImg.src = e.target.result;
                }

                // Ocultar iconos de subida
                if (img.parentElement) {
                    img.parentElement.querySelectorAll('.upload-icon, span').forEach(el => el.style.opacity = '0');
                }

                // Auto-disparar análisis si ambas imágenes están cargadas
                onBothImagesLoaded();
            }
            reader.readAsDataURL(file);
        }
    });
}

setupPreview('styleInput', 'stylePreview');
setupPreview('subjectInput', 'subjectPreview');

// =============================================
// GESTIÓN DEL HISTORIAL (Integración IndexedDB)
// =============================================
async function loadHistory() {
    // Cargar desde DB al iniciar
    history = await loadHistoryFromDb();
    // Enriquecer desde servidor (HistoryManager)
    HistoryManager.configure({ dbName: 'copiar_estilo_db' });
    HistoryManager.init()
        .then(() => HistoryManager.loadAll())
        .then(serverItems => {
            if (serverItems && serverItems.length > 0) {
                const existingIds = new Set(history.map(h => h.id));
                const newItems = serverItems
                    .filter(s => !existingIds.has(s.id))
                    .map(s => ({ id: s.id, src: s.url, sourceLabel: s.sourceLabel || '', createdAt: s.createdAt }));
                if (newItems.length > 0) {
                    history = [...newItems, ...history].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    renderHistory();
                }
            }
        });
    renderHistory();
}

async function addToHistory(imageData, sourceLabel = '') {
    const item = {
        id: Math.random().toString(36).substring(7), // ID estilo editar/app.js
        src: imageData,
        sourceLabel: sourceLabel,
        createdAt: Date.now()
    };

    // Guardar en DB + servidor
    await saveHistoryItemToDb(item);
    HistoryManager.saveItem({
        id: item.id,
        url: imageData,
        prompt: sourceLabel || 'Copiar Estilo',
        sourceLabel: sourceLabel,
        createdAt: item.createdAt
    });

    // Actualizar estado local y UI
    history.unshift(item);
    renderHistory();
}

async function removeFromHistory(id) {
    await deleteHistoryItemFromDb(id);
    HistoryManager.deleteItem(id);
    history = history.filter(item => item.id !== id);
    renderHistory();
}

async function clearHistory() {
    if (!confirm('¿Estás seguro de que quieres borrar todo el historial?')) return;
    await clearHistoryFromDb();
    HistoryManager.clearAll();
    history = [];
    renderHistory();
}

function downloadHistoryImage(id) {
    const item = history.find(h => h.id === id);
    if (!item) return;

    const link = document.createElement('a');
    link.href = item.src;
    link.download = `fusion-ai-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderHistory() {
    const grid = document.getElementById('historyGrid');
    const section = document.getElementById('historySection');

    if (!grid) return;

    if (history.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    // Usamos item.src y item.id para construir el HTML
    grid.innerHTML = history.map(item => {
        const labelHtml = item.sourceLabel ? `<span class="history-source-label">${item.sourceLabel}</span>` : '';
        return `
        <div class="history-card">
            <img src="${item.src}" alt="Historial" onclick="openLightbox('${item.src.replace(/'/g, "\\'")}')">
            ${labelHtml}
            <div class="history-actions">
                <button onclick="event.stopPropagation(); downloadHistoryImage('${item.id}')">📥</button>
                <button class="btn-delete" onclick="event.stopPropagation(); removeFromHistory('${item.id}')">🗑️</button>
            </div>
        </div>
    `}).join('');
}

// =============================================
// LIGHTBOX / ZOOM
// =============================================
function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
}

function downloadLightboxImage() {
    const lightboxImg = document.getElementById('lightbox-img');
    if (!lightboxImg.src) return;

    const link = document.createElement('a');
    link.href = lightboxImg.src;
    link.download = `fusion-ai-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target.closest('.lightbox-controls')) return;
            closeLightbox();
        });
    }

    // Cargar historial
    loadHistory();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// =============================================
// SISTEMA DE PROGRESO SIMULADO
// =============================================
let progressInterval = null;
let currentProgress = 0;

function startProgress(statusText = 'Generando imagen...') {
    currentProgress = 0;
    const pct = document.getElementById('progressPercentage');
    const bar = document.getElementById('progressBarFill');
    const status = document.getElementById('progressStatus');
    if (pct) pct.textContent = '0%';
    if (bar) bar.style.width = '0%';
    if (status) status.textContent = statusText;

    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (currentProgress < 90) {
            currentProgress += Math.random() * 3 + 0.5;
            if (currentProgress > 90) currentProgress = 90;
            const val = Math.floor(currentProgress);
            if (pct) pct.textContent = val + '%';
            if (bar) bar.style.width = val + '%';
        }
    }, 400);
}

function completeProgress() {
    if (progressInterval) clearInterval(progressInterval);
    currentProgress = 100;
    const pct = document.getElementById('progressPercentage');
    const bar = document.getElementById('progressBarFill');
    const status = document.getElementById('progressStatus');
    if (pct) pct.textContent = '100%';
    if (bar) bar.style.width = '100%';
    if (status) status.textContent = 'Completado';
}

function resetProgress() {
    if (progressInterval) clearInterval(progressInterval);
    currentProgress = 0;
    const pct = document.getElementById('progressPercentage');
    const bar = document.getElementById('progressBarFill');
    const status = document.getElementById('progressStatus');
    if (pct) pct.textContent = '0%';
    if (bar) bar.style.width = '0%';
    if (status) status.textContent = 'Iniciando...';
}

function exportImage(imgSrc) {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `fusion-ai-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =============================================
// ANÁLISIS DE IMAGEN DE REFERENCIA (AUTO-TRIGGER)
// =============================================

// --- RENDERIZADO DE TARJETAS JSON / IMÁGENES EN LOS SLOTS CENTRALES ---
function renderAnalysisCards() {
    const slotTech = document.getElementById('analysisCardTech');
    const slotCreative = document.getElementById('analysisCardCreative');
    if (!slotTech || !slotCreative) return;

    const hasTech = analysisResults.techDesc !== null;
    const hasCreative = analysisResults.creativePrompt !== null;

    // Slot Técnico
    if (slotImages.tech) {
        slotTech.innerHTML = buildSlotImageHTML(slotImages.tech, 'tech');
    } else if (hasTech) {
        const item = analysisResults.techDesc;
        slotTech.innerHTML = `
            <div class="analysis-card card-tech" id="card-${item.id}">
                <div class="analysis-card-header">
                    <span class="analysis-badge badge-tech">📋 DESCRIPCIÓN TÉCNICA</span>
                    <button class="btn-card-delete" onclick="deleteAnalysisCard('${item.id}')" title="Eliminar">✕</button>
                </div>
                <div class="analysis-card-actions-dual">
                    <button class="btn-copy" onclick="copyAnalysisJSON('${item.id}')">📋 Copiar JSON</button>
                    <button class="btn-generate" onclick="generateImageFromAnalysis('${item.id}')">🎨 Generar Imagen</button>
                </div>
            </div>`;
    } else {
        slotTech.innerHTML = '<span class="placeholder-text">Sube ambas imágenes para analizar la referencia...</span>';
    }

    // Slot Creativo
    if (slotImages.creative) {
        slotCreative.innerHTML = buildSlotImageHTML(slotImages.creative, 'creative');
    } else if (hasCreative) {
        const item = analysisResults.creativePrompt;
        slotCreative.innerHTML = `
            <div class="analysis-card card-creative" id="card-${item.id}">
                <div class="analysis-card-header">
                    <span class="analysis-badge badge-creative">🎨 COPIA DE ESTILO</span>
                    <button class="btn-card-delete" onclick="deleteAnalysisCard('${item.id}')" title="Eliminar">✕</button>
                </div>
                <div class="analysis-card-actions-dual">
                    <button class="btn-copy" onclick="copyAnalysisJSON('${item.id}')">📋 Copiar JSON</button>
                    <button class="btn-generate" onclick="generateImageFromAnalysis('${item.id}')">🎨 Generar Imagen</button>
                </div>
            </div>`;
    } else {
        slotCreative.innerHTML = '<span class="placeholder-text">Sube ambas imágenes para analizar la referencia...</span>';
    }
}

function buildSlotImageHTML(imgSrc, slotType) {
    const label = slotType === 'tech' ? '📋 Descripción Técnica' : '🎨 Copia de Estilo';
    return `
        <div class="slot-image-wrapper">
            <img src="${imgSrc}" alt="${label}" onclick="openLightbox('${imgSrc.replace(/'/g, "\\'")}')">
            <div class="slot-image-actions">
                <button onclick="event.stopPropagation(); exportSlotImage('${slotType}')">📥 Exportar</button>
                <button onclick="event.stopPropagation(); addSlotImageToHistory('${slotType}')">➕ Historial</button>
                <button onclick="event.stopPropagation(); clearSlotImage('${slotType}')">↩️ Volver</button>
            </div>
            <span class="slot-image-label">${label}</span>
        </div>
    `;
}

function exportSlotImage(slotType) {
    if (!slotImages[slotType]) return;
    exportImage(slotImages[slotType]);
}

async function addSlotImageToHistory(slotType) {
    if (!slotImages[slotType]) return;
    const label = slotType === 'tech' ? '📋 Descripción Técnica' : '🎨 Copia de Estilo';
    await addToHistory(slotImages[slotType], label);
}

function clearSlotImage(slotType) {
    slotImages[slotType] = null;
    renderAnalysisCards();
}

// --- COPIAR JSON AL PORTAPAPELES ---
async function copyAnalysisJSON(id) {
    let item = null;
    if (analysisResults.techDesc?.id === id) item = analysisResults.techDesc;
    if (analysisResults.creativePrompt?.id === id) item = analysisResults.creativePrompt;
    if (!item) return;

    const jsonStr = JSON.stringify(item.jsonContent, null, 2);
    try {
        await navigator.clipboard.writeText(jsonStr);
        const btn = document.querySelector(`#card-${id} .btn-copy`);
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✅ Copiado!';
            btn.classList.add('btn-copied');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('btn-copied'); }, 2000);
        }
    } catch (e) {
        alert('Error al copiar: ' + e.message);
    }
}

// --- ELIMINAR TARJETA DE ANÁLISIS ---
function deleteAnalysisCard(id) {
    if (analysisResults.techDesc?.id === id) analysisResults.techDesc = null;
    if (analysisResults.creativePrompt?.id === id) analysisResults.creativePrompt = null;
    renderAnalysisCards();
}

// --- CONSTRUIR PROMPT DE IMAGEN DESDE JSON TÉCNICO ---
function buildTechImagePrompt(json) {
    const d = json.descripcion_tecnica || json;
    let p = '';

    if (d.iluminacion) {
        const il = d.iluminacion;
        p += `Iluminación: ${il.tipo || ''}, dirección ${il.direccion || ''}, temperatura ${il.temperatura || ''}, contraste ${il.contraste || ''}, sombras ${il.sombras || ''}. Efecto visual: ${il.efecto_visual || ''}. `;
    }
    if (d.camara) {
        const ca = d.camara;
        p += `Cámara: ${ca.tipo_plano || ''}, ángulo ${ca.angulo || ''}, altura ${ca.altura || ''}, distancia ${ca.distancia || ''}, profundidad de campo ${ca.profundidad_de_campo || ''}, enfoque en ${ca.enfoque || ''}. `;
    }
    if (d.formato) {
        const fo = d.formato;
        p += `Encuadre: ${fo.encuadre || ''}. Composición: ${fo.composicion || ''}. `;
    }
    if (d.fondo) {
        const fd = d.fondo;
        const elem = Array.isArray(fd.elementos_visibles) ? fd.elementos_visibles.join(', ') : (fd.elementos_visibles || '');
        p += `Fondo: ${fd.ubicacion || ''}, ${fd.profundidad || ''}${elem ? ', elementos: ' + elem : ''}. `;
    }
    if (d.color_y_estetica) {
        const ce = d.color_y_estetica;
        const pal = Array.isArray(ce.paleta) ? ce.paleta.join(', ') : (ce.paleta || '');
        p += `Paleta de colores: ${pal}. Color grading: ${ce.color_grading || ''}. Ambiente: ${ce.ambiente || ''}. `;
    }
    if (d.calidad_visual) {
        const cv = d.calidad_visual;
        p += `Calidad: ${cv.acabado || ''}, nitidez ${cv.nitidez || ''}${cv.detalle_destacado ? ', detalle destacado: ' + cv.detalle_destacado : ''}. `;
    }
    if (d.lectura_visual) {
        const lv = d.lectura_visual;
        p += `Intención: ${lv.intencion || ''}. Sensación general: ${lv.sensacion_general || ''}.`;
    }

    return p;
}

// --- GENERAR IMAGEN APLICANDO EL JSON AL SUJETO ---
async function generateImageFromAnalysis(id) {
    const styleFile = document.getElementById('styleInput').files[0];
    const subjectFile = document.getElementById('subjectInput').files[0];
    if (!styleFile || !subjectFile) {
        alert("Por favor sube ambas imágenes (Referencia + Identidad).");
        return;
    }

    let item = analysisResults.techDesc?.id === id ? analysisResults.techDesc
             : analysisResults.creativePrompt?.id === id ? analysisResults.creativePrompt
             : null;
    if (!item) return;

    const btn = document.querySelector(`#card-${id} .btn-generate`);
    const loading = document.getElementById('loadingOverlay');
    const loadingText = loading?.querySelector('.loading-text-glow');
    const loadingBg = document.getElementById('loadingBgImage');
    const stylePreview = document.getElementById('stylePreview');

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando...'; }
    if (loadingBg && stylePreview?.src) {
        loadingBg.style.backgroundImage = `url(${stylePreview.src})`;
    }
    if (loading) loading.style.display = 'flex';
    if (loadingText) loadingText.textContent = 'IA Aplicando Estilo a la Imagen...';
    startProgress(item.type === 'tech' ? 'Sustituyendo sujeto en escena...' : 'Aplicando estilo fotográfico...');

    try {
        const styleData = await fileToBase64(styleFile);
        const subjectData = await fileToBase64(subjectFile);
        const json = item.jsonContent;
        let promptInstructions;

        if (item.type === 'tech') {
            const sceneDescription = buildTechImagePrompt(json);
            promptInstructions = `Eres un director de fotografía y editor de imagen de élite. Tu misión es crear una imagen fotográfica donde el SUJETO de la Imagen B (identidad, rostro, vestuario) aparece integrado en la ESCENA de la Imagen A.

ESCENA DE REFERENCIA (Imagen A) — REPLICA ESTA ESCENA EXACTAMENTE:
${sceneDescription}

IDENTIDAD A PRESERVAR (Imagen B):
- Usa el rostro, rasgos faciales, expresión natural, cabello y vestuario del sujeto de la Imagen B.
- Mantén la identidad facial reconocible del sujeto de la Imagen B.

INSTRUCCIONES DE COMPOSICIÓN:
1. El sujeto de la Imagen B debe ocupar la MISMA POSICIÓN, POSE y ENCUAADRE que el sujeto de la Imagen A.
2. El fondo, la iluminación, el ángulo de cámara y la atmósfera deben ser IDÉNTICOS a los de la Imagen A.
3. El resultado debe parecer que has sustituido al sujeto de la Imagen A por el sujeto de la Imagen B, manteniendo todo lo demás exactamente igual.
4. Fotografía realista, editorial, de alta calidad.`;
        } else {
            const paleta = Array.isArray(json.color_palette) ? json.color_palette.join(', ') : (json.color_palette || '');
            promptInstructions = `Eres un colorista y director de fotografía de élite especializado en grading y retoque. Tu trabajo es tomar la Imagen B como base absoluta y aplicarle UNICAMENTE los parámetros de estilo de la Imagen A.

REGLA DE ORO: La Imagen B es intocable en su composición. Solo cambias luz y color.

PARAMETROS DE ESTILO a aplicar (extraídos de la Imagen A):
- Paleta de colores dominante: ${paleta}
- Temperatura de luz: ${json.lighting?.temperature || ''}
- Tipo de iluminación: ${json.lighting?.type || ''}
- Atmósfera lumínica: ${json.lighting?.mood || ''}
- Color grading general: ${json.color_grading || json.style || ''}
- Acabado fotográfico: ${json.quality?.render_style || ''}, ${json.quality?.finish || ''}

INSTRUCCIONES ABSOLUTAS (OBLIGATORIO):
1. La Imagen B es la imagen BASE. Conserva SU fondo, SU entorno, SU escena, SU pose y SU composición exactamente igual. CERO cambios en el fondo.
2. La única modificación permitida es el TRATAMIENTO DE COLOR E ILUMINACIÓN: aplica la paleta de colores, temperatura de luz, atmósfera y acabado fotográfico descritos arriba.
3. Mantén intacta la ropa, accesorios, expresión y pose del sujeto de la Imagen B.
4. NO copies ningún elemento del fondo de la Imagen A. NO inventes nuevos fondos. NO cambies la escena. NO alteres la pose. NO añadas ni quites objetos.
5. El resultado visual debe ser: la Imagen B exacta, pero revelada con la paleta de colores y la atmósfera lumínica de la Imagen A. Como si un colorista de cine aplicara un LUT de grading sobre la Imagen B.`;
        }

        const payload = {
            model: window.selectedModel || 'gemini-pro',
            image: subjectData.data,
            mimeType: subjectData.mimeType,
            prompt: promptInstructions
        };

        const response = await fetch('proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.image) {
            const imgSrc = `data:${data.mimeType || 'image/png'};base64,${data.image}`;
            slotImages[item.type] = imgSrc;
            renderAnalysisCards();
        } else if (data.error) {
            alert("Error generando imagen: " + JSON.stringify(data.error));
        } else {
            alert("El modelo no devolvió una imagen. Prueba con otro modelo.");
        }

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        completeProgress();
        setTimeout(() => {
            if (loading) loading.style.display = 'none';
            resetProgress();
        }, 600);
        if (btn) { btn.disabled = false; btn.textContent = '🎨 Generar Imagen'; }
    }
}

