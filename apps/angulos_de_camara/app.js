// --- Elementos del DOM ---
const dropZone = document.getElementById('drop-zone');
const dropZoneContent = document.getElementById('drop-zone-content'); // Añadido
const fileInput = document.getElementById('file-input');
const resultsContainer = document.getElementById('results-container');
const imageGrid = document.getElementById('image-grid');
const galleryStrip = document.getElementById('gallery-strip');
const uploadContainer = document.getElementById('upload-container');
const downloadAllBtn = document.getElementById('download-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const shotSelector = document.getElementById('shot-selector');
const generateBtn = document.getElementById('generate-btn');
const shotOptions = document.querySelectorAll('.shot-option');
const historyContainer = document.getElementById('history-container');
const historyStrip = document.getElementById('history-strip');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const showHistoryBtn = document.getElementById('show-history-btn');
const loadingOverlay = document.getElementById('loadingOverlay');

// --- Historial Persistente con localStorage ---
const STORAGE_KEY = 'angulos_camara_history';
const MAX_HISTORY_ITEMS = 50; // Límite para no saturar localStorage

function normalizeHistoryItem(item) {
    if (!item || typeof item !== 'object') return null;

    const mimeType = item.mimeType || 'image/jpeg';
    const imageBase64 = typeof item.imageBase64 === 'string' ? item.imageBase64 : '';
    const src = item.src || (imageBase64 ? `data:${mimeType};base64,${imageBase64}` : '');

    if (!src) return null;

    return {
        id: item.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Number(item.timestamp) || Date.now(),
        shotType: item.shotType || 'general',
        shotTypeLabel: item.shotTypeLabel || shotTypes[item.shotType] || 'Generación',
        filename: item.filename || `imagen_${Date.now()}.jpg`,
        mimeType,
        imageBase64,
        src
    };
}

function getHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeHistoryItem).filter(Boolean);
        }
    } catch (e) {
        console.warn('Error cargando historial:', e);
    }
    return [];
}

function saveHistory(history) {
    if (!Array.isArray(history)) return;

    try {
        // Limitar el número de items y evitar guardar datos duplicados pesados
        const compact = history
            .map(normalizeHistoryItem)
            .filter(Boolean)
            .slice(0, MAX_HISTORY_ITEMS)
            .map(item => ({
                id: item.id,
                timestamp: item.timestamp,
                shotType: item.shotType,
                shotTypeLabel: item.shotTypeLabel,
                filename: item.filename,
                mimeType: item.mimeType,
                imageBase64: item.imageBase64
            }));

        // Si se excede cuota, recortar desde los más antiguos hasta que quepa
        while (compact.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
                return;
            } catch (e) {
                if (e.name !== 'QuotaExceededError') throw e;
                compact.pop();
            }
        }

        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Error guardando historial:', e);
    }
}

function addToHistory(imageData) {
    const history = getHistory();
    const newItem = {
        ...imageData,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: Date.now()
    };
    // Añadir al inicio (más reciente primero)
    history.unshift(newItem);
    saveHistory(history);
    return newItem;
}

function deleteFromHistory(id) {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
}

function clearAllHistory() {
    localStorage.removeItem(STORAGE_KEY);
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// --- Configuración ---
const prompts = {
    'general': 'PLANO GENERAL: Toma completa del objeto exacto de la imagen proporcionada. Muestra TODO el objeto desde lejos, integrado en un entorno amplio y realista. La cámara está lejos del objeto, mostrando el contexto completo. Vista frontal directa a nivel de ojos. El objeto debe ser IDÉNTICO en forma, tamaño, colores, texturas y marcas. ENFATIZA: Esto es un PLANO GENERAL - la cámara está LEJOS, mostrando el objeto completo en su entorno.',

    'medium': 'PLANO MEDIO: Toma del objeto exacto de la imagen proporcionada desde la cintura hacia arriba (o equivalente). La cámara está MÁS CERCA que en plano general pero más lejos que en primer plano. Vista frontal directa a nivel de ojos. Mantén TODOS los detalles del objeto original. NO cambies el objeto, NO inventes elementos. El objeto debe ser una RÉPLICA EXACTA. ENFATIZA: Esto es un PLANO MEDIO - distancia intermedia, no es plano general ni primer plano.',

    'close-up': 'PRIMER PLANO: Enfoque extremadamente cercano en la parte más importante del objeto exacto de la imagen proporcionada. La cámara está MUY CERCA, llenando el encuadre con el objeto. Vista frontal directa. Mantén IDENTIDAD EXACTA del objeto. Fondo desenfocado (bokeh) para destacar el objeto. ENFATIZA: Esto es un PRIMER PLANO - la cámara está MUY CERCA, detalles extremos.',

    'side': 'PLANO LATERAL: Vista de PERFIL del objeto exacto de la imagen proporcionada. La cámara está a 90 GRADOS de la vista frontal original, mostrando el LADO del objeto. Mantén todos los detalles originales. El objeto debe verse exactamente igual pero desde un ÁNGULO DIFERENTE (lateral). ENFATIZA: Esto es una VISTA LATERAL - ángulo de 90 grados, PERFIL del objeto.',

    'top-down': 'PLANO CENITAL: Vista desde DIRECTAMENTE ARRIBA del objeto exacto de la imagen proporcionada. La cámara está a 90 GRADOS mirando hacia abajo, posición VERTICAL sobre el objeto. Sin perspectiva, sin inclinación. Objeto IDÉNTICO al original. ENFATIZA: Esto es una VISTA CENITAL - desde ARRIBA, ángulo de 90 grados hacia abajo.'

};

const shotTypes = {
    'general': 'Plano General',
    'medium': 'Plano Medio',
    'close-up': 'Primer Plano',
    'side': 'Plano Lateral',
    'top-down': 'Plano Cenital'
};

// --- INYECCIONES OBLIGATORIAS ---
// 1) composePrePrompt
function composePrePrompt(userPrompt, ctx = {}) {
  const PRE = [
    "Renderizado fotorrealista con calidad de catálogo premium.",
    "Luz diurna difusa suave, exposición equilibrada, balance de blancos neutro-cálido.",
    "Curva S suave cinematográfica: negros ricos, transición suave de altas luces, contraste suave de medios tonos.",
    "Gamma percibida alrededor de 1.03; solo micro-enfoque, sin halos.",
    "Profundidad de campo cinematográfica con bokeh natural.",
    "Sin texto, sin objetos adicionales, sin marcas de agua.",
    "Si se proporciona una imagen base, preserva estrictamente los logotipos y marcas existentes.",
    "Referencia de cámara: Phase One IQ4 150MP.",
    "IMPORTANTE: Todo el contenido generado debe estar en español."
  ].join(" ");
  const INTEGRATION = ctx.integration === true
    ? "Composición fotorrealista de activos proporcionados: usa el escenario como placa de fondo; sintetiza el modelo con pose coherente y tonos de piel; transfiere la prenda al modelo con drapeado de tela físicamente plausible y oclusiones; adjunta accesorios con escala correcta, reflejos y sombras de contacto; iguala la iluminación y temperatura de color al escenario; unifica la gradación con el perfil cinematográfico."
    : "";
  return [PRE, INTEGRATION, userPrompt || ""].map(s => String(s||"").trim()).filter(Boolean).join(" ");
}

// 2) postProcessDataURL (obligatorio para previsualizar/guardar/descargar)
async function postProcessDataURL(dataURL, opts = {}) {
 const cfg = Object.assign({
  gamma: 1.012,
  sCurve: 0.19,
  sat: 1.01,
  warmHi: 0.10,
  unsharpAmt: 0.18,
  unsharpRadius: 1.3
}, opts);

  const img = await new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = rej; im.src = dataURL;
  });
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);

  const id = x.getImageData(0, 0, w, h), d = id.data;
  const pow = (v,g)=>Math.pow(Math.max(0,Math.min(1,v)),1/g);
  const sCurve = (v,k)=>{ const X=v-0.5; return Math.max(0,Math.min(1,0.5+(X*(1+k))/(1+k*Math.abs(X)*2))); };
  const clamp = v => v<0?0:v>255?255:v;

  for (let i=0;i<d.length;i+=4){
    let r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
    const Y = 0.2627*r + 0.678*g + 0.0593*b;
    r=sCurve(pow(r,cfg.gamma),cfg.sCurve);
    g=sCurve(pow(g,cfg.gamma),cfg.sCurve);
    b=sCurve(pow(b,cfg.gamma),cfg.sCurve);
    const mean=(r+g+b)/3; const k=cfg.sat-1;
    r=mean+(r-mean)*(1+k); g=mean+(g-mean)*(1+k); b=mean+(b-mean)*(1+k);
    if (Y>0.6){ const wamt=cfg.warmHi*(Y-0.6)/0.4; r+=0.8*wamt; b-=0.8*wamt; }
    d[i]=clamp(r*255); d[i+1]=clamp(g*255); d[i+2]=clamp(b*255);
  }
  x.putImageData(id,0,0);

  if (cfg.unsharpAmt>0){
    const bc=document.createElement('canvas'); bc.width=w; bc.height=h;
    const bx=bc.getContext('2d'); bx.filter=`blur(${cfg.unsharpRadius}px)`; bx.drawImage(c,0,0);
    const src=x.getImageData(0,0,w,h), blr=bx.getImageData(0,0,w,h);
    const sd=src.data, bd=blr.data;
    for (let i=0;i<sd.length;i+=4){
      sd[i]   = clamp(sd[i]   + (sd[i]   - bd[i])   * cfg.unsharpAmt);
      sd[i+1] = clamp(sd[i+1] + (sd[i+1] - bd[i+1]) * cfg.unsharpAmt);
      sd[i+2] = clamp(sd[i+2] + (sd[i+2] - bd[i+2]) * cfg.unsharpAmt);
    }
    x.putImageData(src,0,0);
  }
  return c.toDataURL('image/jpeg', 0.95);
}

// --- Estado de la Aplicación ---
let currentImageData = null;
let currentImageMimeType = null;

// --- Modal para imagen grande ---
let modal = document.getElementById('image-modal');
if (!modal) {
  modal = document.createElement('div');
  modal.id = 'image-modal';
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.zIndex = '1000';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  document.body.appendChild(modal);
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

function showLargeImage(src) {
  modal.innerHTML = `<img src="${src}" style="max-width:90%; max-height:90%; object-fit: contain;">`;
  modal.style.display = 'flex';
}

// --- Event Listeners para Carga de Archivos ---
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result.split(',')[1];
        const mimeType = file.type;
        
        currentImageData = base64String;
        currentImageMimeType = mimeType;
        
        if (dropZoneContent) {
            dropZoneContent.classList.add('hidden');
        }
        dropZone.style.backgroundImage = `url('${e.target.result}')`;
        dropZone.classList.add('has-image');

        shotSelector.classList.remove('hidden');
        shotOptions.forEach(option => option.style.display = 'none');
        
        generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// --- Event Listeners para Acciones ---

generateBtn.addEventListener('click', async () => {
    if (currentImageData) {
        const allShots = Object.keys(prompts);
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO...';
        await generateImages(currentImageData, currentImageMimeType, allShots);
    }
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres eliminar todo y empezar de nuevo?')) {
        galleryStrip.innerHTML = '';
        resultsContainer.classList.add('hidden');
        
        dropZone.style.backgroundImage = 'none';
        dropZone.classList.remove('has-image');
        if (dropZoneContent) {
            dropZoneContent.classList.remove('hidden');
        }
        
        shotSelector.classList.add('hidden');
        
        currentImageData = null;
        currentImageMimeType = null;
        
        fileInput.value = null; 
    }
});

// --- Lógica de Generación de Imágenes ---

async function generateImages(base64ImageData, mimeType, shotTypesToGenerate) {
    resultsContainer.classList.remove('hidden');
    imageGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    
    const total = shotTypesToGenerate.length;
    let current = 0;
    
    // Mostrar loading overlay
    showLoadingOverlay();

    const backgroundOption = document.getElementById('background-option').value;
    let backgroundOverride = '';
    let commonBg = '';

    if (backgroundOption === 'solid') {
        backgroundOverride = ' Ignore any previous background or environment descriptions. Place the object on a solid neutral background that provides good contrast with the object\'s colors, isolated, with no other elements or environment.';
    } else if (backgroundOption === 'same-realistic') {
        commonBg = getRandomBackground();
        backgroundOverride = ` Ignore any previous background or environment descriptions. Place the object in ${commonBg}, photorealistic.`;
    }

    for (const shotType of shotTypesToGenerate) {
        current++;
        if (total > 1) {
            const progressText = current === 1 ? `Generando ${current} imagen de ${total}` : `Generando ${current} imágenes de ${total}`;
            generateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${progressText}`;
        }

        const title = shotTypes[shotType];
        let card = Array.from(galleryStrip.children).find(child => {
            const h3 = child.querySelector('h3');
            return h3 && h3.textContent === title;
        });

        let cardId;
        if (card) {
            cardId = card.id;
            const imgContainer = card.querySelector('.image-container');
            
            // Limpia el contenido anterior (imagen o error) pero deja los botones
            const existingImg = imgContainer.querySelector('img');
            if (existingImg) existingImg.remove();
            
            const errorMessage = imgContainer.querySelector('.error-message');
            if (errorMessage) errorMessage.classList.add('hidden');
            
            const loader = imgContainer.querySelector('.loader');
            if(loader) loader.style.display = 'flex';
        } else {
            cardId = `card-${shotType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            createImageCard(cardId, title, shotType);
        }

        let thisBackgroundOverride = backgroundOverride;
        if (backgroundOption === 'different-realistic') {
            const randomBg = getRandomBackground();
            thisBackgroundOverride = ` Ignore any previous background or environment descriptions. Place the object in ${randomBg}, photorealistic.`;
        }

        await callImageAPI(base64ImageData, mimeType, shotType, cardId, thisBackgroundOverride);
    }
    
    // Ocultar loading overlay cuando termine
    hideLoadingOverlay();
    
    // Restaurar texto del botón
    generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
    generateBtn.disabled = false;
}

function createImageCard(cardId, title, shotType) {
    const card = document.createElement('div');
    card.id = cardId;
    card.dataset.shot = shotType;
    card.className = 'bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center aspect-square shadow-lg new-image';
    card.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-300 mb-2">${title}</h3>
        <div class="image-container w-full h-full bg-gray-700 rounded-md flex items-center justify-center relative">
             <div class="loader flex items-center justify-center"></div>
             <p class="error-message text-red-400 p-4 text-center hidden"></p>
        </div>
    `;
    
    galleryStrip.insertBefore(card, galleryStrip.firstChild);
    
    // Añadir botones de acción por defecto
    const imgContainer = card.querySelector('.image-container');
    addActionButtons(imgContainer, shotType, cardId);
}

function addActionButtons(container, shotType, cardId) {
    // Definir estilos comunes para evitar repetición
    const commonBtnStyles = {
        position: 'absolute',
        bottom: '12px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        webkitBackdropFilter: 'blur(6px)'
    };

    // Botón de Descarga (inicialmente oculto)
    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'download-btn image-action-btn';
    downloadBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
    downloadBtn.title = "Descargar esta imagen";
    Object.assign(downloadBtn.style, commonBtnStyles, {
        right: '104px',
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        textDecoration: 'none',
        display: 'none' // Oculto por defecto
    });
    downloadBtn.addEventListener('mouseenter', () => downloadBtn.style.backgroundColor = 'rgba(37, 99, 235, 0.9)');
    downloadBtn.addEventListener('mouseleave', () => downloadBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.8)');
    
    // Botón de Regenerar
    const regenBtn = document.createElement('button');
    regenBtn.className = 'regen-btn image-action-btn';
    regenBtn.title = "Regenerar esta imagen";
    regenBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35A7.95 7.95 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    regenBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
        await generateImages(currentImageData, currentImageMimeType, [shotType]);
        generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
        generateBtn.disabled = false;
    });
    Object.assign(regenBtn.style, commonBtnStyles, {
        right: '58px',
        backgroundColor: 'rgba(34,197,94,0.8)'
    });
    regenBtn.addEventListener('mouseenter', () => regenBtn.style.backgroundColor = 'rgba(22, 163, 74, 0.9)');
    regenBtn.addEventListener('mouseleave', () => regenBtn.style.backgroundColor = 'rgba(34,197,94,0.8)');

    // Botón de Eliminar
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn image-action-btn';
    deleteBtn.title = "Eliminar esta imagen";
    deleteBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
    deleteBtn.addEventListener('click', () => removeImageCard(cardId));
    Object.assign(deleteBtn.style, commonBtnStyles, {
        right: '12px',
        backgroundColor: 'rgba(239, 68, 68, 0.8)'
    });
    deleteBtn.addEventListener('mouseenter', () => deleteBtn.style.backgroundColor = 'rgba(220, 38, 38, 0.9)');
    deleteBtn.addEventListener('mouseleave', () => deleteBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.8)');
    
    container.appendChild(downloadBtn);
    container.appendChild(regenBtn);
    container.appendChild(deleteBtn);
}


function getRandomBackground() {
    const backgrounds = [
        'a modern showroom with polished floors and large windows letting in natural light',
        'a winding mountain road with scenic views and clear skies',
        'an urban highway at dusk with city lights in the background',
        'a professional racing track with barriers and clear weather',
        'a luxury garage with high-tech equipment and spotlights',
        'a coastal road with ocean views and gentle waves',
        'a city street in a metropolitan area with skyscrapers',
        'an indoor workshop with tools, lifts, and industrial lighting',
        'a desert landscape with open roads and distant mountains',
        'a forested path with tall trees and soft sunlight filtering through'
    ];
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

async function callImageAPI(base64ImageData, mimeType, shotType, cardId, backgroundOverride) {
    const prompt = prompts[shotType];
    const card = document.getElementById(cardId);
    
    const loader = card.querySelector('.loader');
    const errorMessage = card.querySelector('.error-message');
    if(loader) loader.style.display = 'flex';
    if(errorMessage) errorMessage.style.display = 'none';

    const imagesProvided = Array.isArray(base64ImageData) ? base64ImageData.filter(Boolean).length : 1;
    const integration = imagesProvided >= 4;
    let finalPrompt = composePrePrompt(prompt, { integration });
    finalPrompt += backgroundOverride;

    const payload = {
        prompt: finalPrompt,
        base64ImageData: base64ImageData,
        mimeType: mimeType,
        model: 'gemini-2.0-flash-exp-image-generation'
    };

    // generationConfig merge obligatorio
    payload.generationConfig = Object.assign(
      { responseModalities:["IMAGE"], temperature:0.5 },
      payload.generationConfig || {}
    );

    // imageConfig merge obligatorio + regla indoor cálido 99%
    const baseImageCfg = {
      gradingPreset: "filmic-soft",
      contrastProfile: "soft S-curve, rich blacks, smooth highlight roll-off",
      perceivedGamma: 1.03,
      whiteBalance: "daylight neutral-warm",
      subjectSaturationBoost: "slight",
      backgroundSaturation: "neutral",
      sharpening: "micro only, no halos"
    };
    const txt = (finalPrompt || "").toLowerCase();
    const isWarmIndoor = /(interior|pub|bar|tungsten|lámpara|lamp|sconce)/.test(txt);
    const imageCfg99 = Object.assign({}, baseImageCfg, isWarmIndoor ? {
      whiteBalance: "tungsten-warm",
      backgroundSaturation: "slightly reduced"
    } : {});
    Object.assign(imageCfg99, { toneMap: "filmic-soft-warm" });
    payload.imageConfig = Object.assign(imageCfg99, payload.imageConfig || {});

    try {
        const response = await fetch('proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw result;
        }
        
        const part = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const generatedBase64 = part?.inlineData?.data;
        const generatedMime = part?.inlineData?.mimeType || 'image/png';

        if (generatedBase64) {
            await displayGeneratedImage(cardId, generatedBase64, shotType, generatedMime);
        } else {
            if (result?.candidates?.[0]?.finishReason === 'SAFETY') {
                 throw new Error('La imagen no se pudo generar por motivos de seguridad.');
            } else {
                 throw new Error('La API no devolvió una imagen válida.');
            }
        }

    } catch (error) {
        console.error(`Error en la llamada para ${shotType}:`, error);
        
        let friendlyErrorMessage = "Ocurrió un error inesperado.";

        if (typeof error === 'object' && error !== null) {
            if (error.error && typeof error.error === 'string') {
                friendlyErrorMessage = error.error;
            } else if (error.error && typeof error.error === 'object' && error.error.message) {
                friendlyErrorMessage = `Error: ${error.error.message}`;
            } else if (error.message) {
                 friendlyErrorMessage = error.message;
            } else {
                friendlyErrorMessage = `Respuesta inesperada: ${JSON.stringify(error)}`;
            }
        } else if (typeof error === 'string') {
            friendlyErrorMessage = error;
        }

        displayError(cardId, friendlyErrorMessage);
        
        // Ocultar loading overlay en caso de error
        hideLoadingOverlay();
        
        // Restaurar texto del botón
        generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
        generateBtn.disabled = false;
    }
}

async function displayGeneratedImage(cardId, base64, shotType, mimeType) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const imgContainer = card.querySelector('.image-container');
    const loader = card.querySelector('.loader');
    const downloadBtn = card.querySelector('.download-btn');

    if(loader) loader.style.display = 'none';
    
    // Obligatorio: construir srcRaw con mime si está disponible y post-procesar
    const mime = mimeType || 'image/png';
    const srcRaw = `data:${mime};base64,${base64}`;
    const src = await postProcessDataURL(srcRaw);

    const img = document.createElement('img');
    img.src = src;
    img.className = 'w-full h-full object-cover rounded-md cursor-pointer';
    img.alt = shotTypes[shotType] || `Imagen generada: ${shotType}`;
    img.addEventListener('click', () => showLargeImage(src));

    const [hdr, b64pp] = src.split(',');
    const isJpeg = /^data:image\/jpeg;base64/i.test(hdr);
    const ext = isJpeg ? 'jpg' : (mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg'));

    img.dataset.filename = `${shotType.replace(/\s+/g, '_')}.${ext}`;
    img.dataset.base64 = b64pp || '';

    // Activar y configurar el botón de descarga
    if (downloadBtn) {
        downloadBtn.href = src;
        downloadBtn.download = `${shotType.replace(/\s+/g, '_')}.${ext}`;
        downloadBtn.style.display = 'flex';
    }
    
    imgContainer.prepend(img);

    // Guardar en historial
    try {
        addToHistory({
            imageBase64: b64pp || '',
            mimeType: mime,
            shotType: shotType,
            shotTypeLabel: shotTypes[shotType] || shotType,
            filename: `${shotType.replace(/\s+/g, '_')}.${ext}`
        });
        // Recargar historial
        loadHistoryUI({ forceShow: false, migrate: true });
    } catch (error) {
        console.error('Error guardando en historial:', error);
    }
}


function displayError(cardId, message) {
    const card = document.getElementById(cardId);
     if (!card) return;
    const loader = card.querySelector('.loader');
    const errorMessage = card.querySelector('.error-message');
    const downloadBtn = card.querySelector('.download-btn');

    if(loader) loader.style.display = 'none';
    if(errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    // Asegurarse de que el botón de descarga esté oculto si hay un error
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
}

function removeImageCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            card.remove();
            
            if (galleryStrip.children.length === 0) {
                resultsContainer.classList.add('hidden');
            }
        }, 300);
    }
}

// ===== Carga robusta de JSZip y descarga en ZIP =====
async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  const urls = [
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
  ];
  for (const u of urls) {
    try {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = u; s.async = true; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      if (window.JSZip) return window.JSZip;
    } catch {}
  }
  throw new Error("JSZip no disponible");
}

function dataURLtoBase64(dataURL) {
  return dataURL.split(",")[1] || "";
}

function guessExt(mime) {
  if (!mime) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "jpg";
}

async function handleZipDownload(ev) {
  ev?.stopImmediatePropagation?.();
  try {
    const JSZipLib = await ensureJSZip();
    const zip = new JSZipLib();

    const imgs = document.querySelectorAll(
      "#gallery-strip img[data-base64], #gallery-strip .image-container img[data-mime], " +
      "#image-grid img[data-base64], #image-grid .image-container img[data-mime]"
    );

    if (!imgs.length) {
      alert("No hay imágenes generadas para descargar.");
      return;
    }

    let idx = 1;
    imgs.forEach(img => {
      const base64 = img.getAttribute("data-base64") || (img.src?.startsWith("data:") ? dataURLtoBase64(img.src) : null);
      const mime = img.getAttribute("data-mime") || (img.src?.startsWith("data:") ? img.src.slice(5, img.src.indexOf(";")) : "image/jpeg");
      if (!base64) return;
      const ext = guessExt(mime);
      zip.file(`imagen-${String(idx++).padStart(2, "0")}.${ext}`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "imagenes.zip";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  } catch (e) {
    alert("Error: La librería JSZip no se ha cargado correctamente.");
  }
}

(function wireZipButton(){
  const btn = document.getElementById("download-all-btn");
  if (!btn) return;
  btn.replaceWith(btn.cloneNode(true));
  const fresh = document.getElementById("download-all-btn");
  fresh.addEventListener("click", handleZipDownload, true);
})();

// --- Funciones del Historial ---

function loadHistoryUI(options = {}) {
    const { forceShow = false, migrate = false } = options;
    const history = getHistory();

    if (migrate && history.length > 0) {
        saveHistory(history);
    }
    
    if (history.length === 0) {
        if (forceShow) {
            historyContainer.classList.remove('hidden');
            historyStrip.innerHTML = '<p class="history-empty">No hay imágenes guardadas en el historial.</p>';
        } else {
            historyContainer.classList.add('hidden');
            historyStrip.innerHTML = '';
        }
        return;
    }
    
    historyContainer.classList.remove('hidden');
    historyStrip.innerHTML = '';
    
    history.forEach(item => {
        const card = createHistoryCard(item);
        historyStrip.appendChild(card);
    });
}

function createHistoryCard(item) {
    const card = document.createElement('div');
    card.className = 'history-card new-image';
    card.dataset.id = item.id;
    
    const dateStr = formatDate(item.timestamp);
    
    card.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-300 mb-2">${item.shotTypeLabel}</h3>
        <div class="image-container w-full h-full bg-gray-700 rounded-md flex items-center justify-center relative">
            <img src="${item.src}" 
                 class="w-full h-full object-cover rounded-md cursor-zoom-in" 
                 alt="${item.shotTypeLabel}"
                 data-filename="${item.filename}"
                 data-base64="${item.imageBase64}">
            <div class="history-actions overlay-actions">
                <button class="action-btn btn-dl history-download" title="Descargar">
                    <i class="fa-solid fa-download"></i>
                </button>
                <button class="action-btn btn-del history-delete" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="history-date">${dateStr}</div>
        </div>
    `;
    
    // Event listeners
    const img = card.querySelector('img');
    const downloadBtn = card.querySelector('.history-download');
    const deleteBtn = card.querySelector('.history-delete');
    
    img.addEventListener('click', () => showLargeImage(item.src));
    
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = item.src;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta imagen del historial?')) {
            deleteFromHistory(item.id);
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
                card.remove();
                if (getHistory().length === 0) {
                    historyContainer.classList.add('hidden');
                }
            }, 300);
        }
    });
    
    return card;
}

// Event listener para limpiar historial completo
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
            clearAllHistory();
            historyStrip.innerHTML = '';
            historyContainer.classList.add('hidden');
        }
    });
}

if (showHistoryBtn) {
    showHistoryBtn.addEventListener('click', () => {
        loadHistoryUI({ forceShow: true, migrate: true });
        historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// --- Funciones SIMPLES de Loading Overlay ---
function showLoadingOverlay() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideLoadingOverlay() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Cargar historial al iniciar
document.addEventListener('DOMContentLoaded', () => {
    // FORZAR que el loading overlay esté OCULTO al cargar
    hideLoadingOverlay();
    
    loadHistoryUI({ forceShow: false, migrate: true });
});


