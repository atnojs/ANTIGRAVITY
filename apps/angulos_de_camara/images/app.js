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

// --- Inyección de Estilos para Botones Hover ---
// Se inyectan los estilos CSS necesarios para que los botones de acción
// aparezcan solo al pasar el ratón sobre la imagen.
(function injectHoverStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .image-container .image-action-btn {
            opacity: 0;
            visibility: hidden;
            transform: translateY(10px);
            transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
        }
        .image-container:hover .image-action-btn {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();


// --- Configuración ---
const prompts = {
    'general': 'wide shot of the exact same product from the provided image that shows the full object integrated into a broad, realistic, and contextually appropriate environment, full scene, establishing shot, viewed straight from the front at eye level, maintain all details and branding. The object and background must coexist in a believable and natural way.',

    'medium': 'medium shot of the exact same product from the provided image, from the waist up or equivalent for the object, viewed straight from the front at eye level, maintain all details and branding. Place the object in a realistic and believable environment that is contextually appropriate. The composition and lighting should appear natural.',

    'close-up': 'extreme close-up shot of the exact same product from the provided image, tightly focusing on the main subjects face, viewed straight from the front, maintain all details and branding. The background should be realistic and contextually relevant, with a soft and natural blur (bokeh effect) to highlight the objects details.',

    'side': 'side view of the exact same product from the provided image, profile shot, rotated 90 degrees to show the full side profile perpendicular to the original front view, maintain all details and branding. Generate a detailed, realistic, and contextually appropriate background that complements the main subject',

    'top-down': 'Generate a **true top-down (bird’s-eye)** image of the **exact same product** from the reference. The camera must be positioned **directly above the object at a perfect 90-degree angle**, looking straight down. **No tilt or perspective allowed.** Keep all product details, proportions, and branding identical. Lighting must be **soft and even**, with minimal shadows. The background should vary **randomly** between a **realistic contextual surface** (e.g., table, floor, fabric, outdoor ground) or a **clean neutral backdrop** (white, light gray, or soft gradient), chosen naturally by the model to enhance realism. Maintain **photorealistic texture, sharp focus, and accurate scale**.'

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
    "Photorealistic rendering with premium catalog quality.",
    "Soft diffused daylight, balanced exposure, neutral-warm white balance.",
    "Filmic soft S-curve: rich blacks, smooth highlight roll-off, gentle midtone contrast.",
    "Perceived gamma around 1.03; micro-sharpening only, no halos.",
    "Cinematic depth of field with natural bokeh.",
    "No text, no extra objects, no watermarks.",
    "If a base image is provided, strictly preserve existing logos and brand marks.",
    "Camera reference: Phase One IQ4 150MP."
  ].join(" ");
  const INTEGRATION = ctx.integration === true
    ? "Photorealistic compositing of provided assets: use scenario as background plate; synthesize the model with coherent pose and skin tones; transfer garment onto the model with physically plausible cloth drape and occlusions; attach accessory with correct scale, reflections and contact shadows; match lighting and color temperature to the scenario; unify grade with the filmic profile."
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
        await generateImages(currentImageData, currentImageMimeType, allShots);
        generateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar Imágenes';
        generateBtn.disabled = false;
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
            imgContainer.innerHTML = '';
            const loader = document.createElement('div');
            loader.className = 'loader flex items-center justify-center';
            imgContainer.appendChild(loader);
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message text-red-400 p-4 text-center hidden';
            imgContainer.appendChild(errorMessage);
        } else {
            cardId = `card-${shotType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            createImageCard(cardId, title, shotType);
        }

        await callImageAPI(base64ImageData, mimeType, shotType, cardId);
    }
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
}

async function callImageAPI(base64ImageData, mimeType, shotType, cardId) {
    const prompt = prompts[shotType];
    const card = document.getElementById(cardId);
    
    const loader = card.querySelector('.loader');
    const errorMessage = card.querySelector('.error-message');
    if(loader) loader.style.display = 'flex';
    if(errorMessage) errorMessage.style.display = 'none';

    const imagesProvided = Array.isArray(base64ImageData) ? base64ImageData.filter(Boolean).length : 1;
    const integration = imagesProvided >= 4;
    const finalPrompt = composePrePrompt(prompt, { integration });

    const payload = {
        prompt: finalPrompt,
        base64ImageData: base64ImageData,
        mimeType: mimeType,
        model: 'gemini-3.1-flash-image-preview'
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
    }
}

async function displayGeneratedImage(cardId, base64, shotType, mimeType) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const imgContainer = card.querySelector('.image-container');
    const loader = card.querySelector('.loader');

    if(loader) loader.style.display = 'none';
    
    imgContainer.innerHTML = '';

    // Obligatorio: construir srcRaw con mime si está disponible y post-procesar
    const mime = mimeType || 'image/png';
    const srcRaw = `data:${mime};base64,${base64}`;
    const src = await postProcessDataURL(srcRaw);

    const img = document.createElement('img');
    img.src = src;
    img.className = 'w-full h-full object-cover rounded-md cursor-pointer';
    img.addEventListener('click', () => showLargeImage(src));

    const [hdr, b64pp] = src.split(',');
    const isJpeg = /^data:image\/jpeg;base64/i.test(hdr);
    const ext = isJpeg ? 'jpg' : (mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg'));

    img.dataset.filename = `${shotType.replace(/\s+/g, '_')}.${ext}`;
    img.dataset.base64 = b64pp || '';

    // --- Botones de Acción (Modificado) ---
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

    const downloadBtn = document.createElement('a');
    downloadBtn.href = src;
    downloadBtn.download = `${shotType.replace(/\s+/g, '_')}.${ext}`;
    downloadBtn.className = 'download-btn image-action-btn';
    downloadBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
    downloadBtn.title = "Descargar esta imagen";
    Object.assign(downloadBtn.style, commonBtnStyles, {
        right: '104px',
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        textDecoration: 'none'
    });
    downloadBtn.addEventListener('mouseenter', () => downloadBtn.style.backgroundColor = 'rgba(37, 99, 235, 0.9)');
    downloadBtn.addEventListener('mouseleave', () => downloadBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.8)');
    
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
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(downloadBtn);
    imgContainer.appendChild(regenBtn);
    imgContainer.appendChild(deleteBtn);
}


function displayError(cardId, message) {
    const card = document.getElementById(cardId);
     if (!card) return;
    const loader = card.querySelector('.loader');
    const errorMessage = card.querySelector('.error-message');

    if(loader) loader.style.display = 'none';
    if(errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
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

