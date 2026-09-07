lucide.createIcons();

// ===== HISTORIAL PERSISTENTE =====
const historyManager = new HistoryManager('asistente_inmoviliario');

// ===== REFERENCIAS DOM =====
const imageUploader = document.getElementById('image-uploader');
const imagePreviewGrid = document.getElementById('image-preview-grid');
const dropZone = document.getElementById('drop-zone');
const generateBtn = document.getElementById('generate-btn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const secondaryStatus = document.getElementById('secondary-status');
const resultsSection = document.getElementById('results-section');
const resultsImageGrid = document.getElementById('results-image-grid');
const resultsText = document.getElementById('results-text');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxClose = document.getElementById('lightboxClose');
const historyTitle = document.getElementById('history-title');
const historyGrid = document.getElementById('history-grid');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('history-clear-btn');

let uploadedFiles = []; // Array de objetos { id, file, base64, action }

// ===== LIGHTBOX =====
function openLightbox(src) {
  lightboxImg.src = src;
  lightboxDownload.onclick = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'generado-asistente-inmobiliario.png';
    a.click();
  };
  lightbox.classList.remove('hidden');
}
function closeLightboxFn() { lightbox.classList.add('hidden'); }
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target === lightboxImg) closeLightboxFn();
});
lightboxClose.addEventListener('click', closeLightboxFn);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) closeLightboxFn();
});

// ===== LOADING OVERLAY =====
function showLoading(status) {
  loadingText.textContent = 'IA generando lo solicitado...';
  secondaryStatus.textContent = status || 'Procesando solicitud...';
  loadingOverlay.setAttribute('aria-busy', 'true');
  loadingOverlay.classList.remove('hidden');
  document.body.classList.add('loading-locked');
}
function hideLoading() {
  loadingOverlay.classList.add('hidden');
  loadingOverlay.setAttribute('aria-busy', 'false');
  document.body.classList.remove('loading-locked');
}
// ===== HISTORIAL =====
async function loadHistory() {
  try {
    await historyManager.load();
    renderHistory(historyManager.getAll());
  } catch (e) {
    console.warn('Error cargando historial:', e);
    historyGrid.innerHTML = '';
    historyTitle.style.display = 'none';
    clearHistoryBtn.style.display = 'none';
    historyEmpty.style.display = 'block';
  }
}

function renderHistory(items = historyManager.getAll()) {
  historyGrid.innerHTML = '';
  const validItems = (items || []).filter(item => item.imageUrl || item.url || item.data?.url || item.data?.dataUrl);
  if (validItems.length === 0) {
    historyTitle.style.display = 'none';
    clearHistoryBtn.style.display = 'none';
    historyEmpty.style.display = 'block';
    return;
  }
  historyTitle.style.display = 'block';
  clearHistoryBtn.style.display = 'block';
  historyEmpty.style.display = 'none';
  validItems.forEach(item => {
    const src = item.imageUrl || item.data?.url || item.data?.dataUrl || item.url || '';
    const card = document.createElement('div');
    card.className = 'history-item-wrap';
    card.innerHTML = `
      <img alt="Generación guardada" />
      <button class="btn-square btn-download" type="button" title="Descargar" aria-label="Descargar generación">
          <i data-lucide="download" aria-hidden="true"></i>
        </button>
      <button class="btn-square btn-delete" type="button" title="Eliminar" aria-label="Eliminar generación">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      <span class="history-date"></span>
    `;
    const image = card.querySelector('img');
    image.src = src;
    image.alt = `Generación guardada ${item.id || ''}`.trim();
    image.addEventListener('click', () => openLightbox(src));
    card.querySelector('.history-date').textContent = new Date(item.createdAt || Date.now()).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    card.querySelector('.btn-download').addEventListener('click', (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = src;
      a.download = `generado-${item.id}.png`;
      a.click();
    });
    card.querySelector('.btn-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await historyManager.delete(item.id);
      } catch (error) {
        alert('No se pudo eliminar la generación. Inténtalo de nuevo.');
      }
    });
    historyGrid.appendChild(card);
  });
  lucide.createIcons();
}

window._openLightbox = openLightbox;

historyManager.onChange((items) => renderHistory(items));

clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('¿Eliminar todo el historial de generaciones?')) {
    try {
      await historyManager.clear();
    } catch (error) {
      alert('No se pudo limpiar el historial. Inténtalo de nuevo.');
    }
  }
});

// Cargar historial al iniciar
loadHistory();

imageUploader.addEventListener('change', handleImageUpload);
dropZone.addEventListener('click', () => imageUploader.click());
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    imageUploader.click();
  }
});
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  handleImageUpload({ target: { files: event.dataTransfer.files } });
});

function handleImageUpload(event) {
    console.log('Evento change activado en image-uploader');
    const files = event.target.files;
    console.log('Archivos seleccionados:', files.length);
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            console.log('Omitiendo archivo no imagen:', file.name);
            continue;
        }
        
        const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const reader = new FileReader();
        
        reader.onload = e => {
            console.log('FileReader onload para archivo:', file.name);
            const base64 = e.target.result;
            const fileData = { id, file, base64, action: 'nada' };
            uploadedFiles.push(fileData);
            console.log('Archivo agregado a uploadedFiles:', fileData.id);
            createImagePreviewCard(fileData);
        };
        
        reader.onerror = e => {
            console.error('Error de FileReader para archivo:', file.name, e);
        };
        
        reader.readAsDataURL(file);
    }
}

function createImagePreviewCard(fileData) {
    console.log('Creando tarjeta de vista previa para:', fileData.id);
    const card = document.createElement('div');
    card.id = fileData.id;
    card.className = 'image-container';
    
    card.innerHTML = `
        <img src="${fileData.base64}" alt="Vista previa de ${fileData.file.name}">
        <div class="overlay-buttons">
            <button type="button" data-id="${fileData.id}" class="overlay-btn delete" title="Eliminar" aria-label="Eliminar imagen seleccionada">
                <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
        </div>
        <div class="image-options" role="radiogroup" aria-label="Acción para ${fileData.file.name}">
            <label class="image-option" for="radio-nada-${fileData.id}">
                <input id="radio-nada-${fileData.id}" type="radio" value="nada" name="action-${fileData.id}" checked>
                <span>Nada</span>
            </label>
            <label class="image-option" for="radio-staging-${fileData.id}">
                <input id="radio-staging-${fileData.id}" type="radio" value="staging" name="action-${fileData.id}">
                <span>Staging Virtual</span>
            </label>
            <label class="image-option" for="radio-vaciar-${fileData.id}">
                <input id="radio-vaciar-${fileData.id}" type="radio" value="vaciar" name="action-${fileData.id}">
                <span>Vaciar Espacio</span>
            </div>
    `;
    
    imagePreviewGrid.appendChild(card);
    console.log('Tarjeta agregada a image-preview-grid:', fileData.id);
    lucide.createIcons();

    card.querySelectorAll(`input[name="action-${fileData.id}"]`).forEach(radio => {
        radio.addEventListener('change', (event) => {
            console.log('Radio cambiado para:', fileData.id, 'Nueva acción:', event.target.value);
            const fileToUpdate = uploadedFiles.find(f => f.id === fileData.id);
            if (fileToUpdate) {
                fileToUpdate.action = event.target.value;
            }
        });
    });

    card.querySelector('.delete').addEventListener('click', (event) => {
        const idToRemove = event.currentTarget.getAttribute('data-id');
        console.log('Eliminando archivo:', idToRemove);
        uploadedFiles = uploadedFiles.filter(f => f.id !== idToRemove);
        document.getElementById(idToRemove).remove();
    });
}

generateBtn.addEventListener('click', handleGeneration);

async function handleGeneration() {
    console.log('Botón Generar clicado. Archivos subidos:', uploadedFiles.length);
    if (uploadedFiles.length === 0) {
        alert("Por favor, sube al menos una imagen.");
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'PROCESANDO...';
    showLoading('Procesando imágenes y redactando el anuncio...');
    resultsImageGrid.innerHTML = '';
    resultsText.textContent = '';
    resultsSection.classList.add('hidden');

    const audience = document.getElementById('target-audience').value;
    const length = document.getElementById('ad-length').value;
    const tone = document.getElementById('ad-tone').value;
    console.log('Parámetros del formulario:', { audience, length, tone });

    try {
        console.log('Iniciando procesamiento de imágenes...');
        const imagePromises = uploadedFiles.map(fileData => processImage(fileData));
        const textPromise = generateAdText(audience, length, tone);

        console.log('Esperando promesas...');
        const [images, text] = await Promise.all([
            Promise.all(imagePromises),
            textPromise
        ]);
        console.log('Procesamiento completado. Imágenes:', images.length, 'Texto generado:', text.substring(0, 100) + '...');

        displayResults(images, text);

        // Guardar en historial persistente
        for (const img of images) {
          if (img.dataUrl && img.dataUrl.startsWith('data:image')) {
            const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
            await historyManager.save({
              id: historyId,
              type: 'image',
              model: 'gemini-3.1-flash-image-preview',
              data: {
                url: img.dataUrl,
                prompt: `Staging/Vaciado de ${img.originalName}`,
                originalName: img.originalName
              },
              imageData: img.dataUrl,
              createdAt: new Date().toISOString()
            });
          }
        }
    } catch (error) {
        console.error("Error durante la generación:", error);
        alert("No se pudo completar el anuncio. Comprueba las imágenes e inténtalo de nuevo.");
    } finally {
        console.log('Rehabilitando botón y ocultando loader');
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generar Anuncio';
        hideLoading();
    }
}

async function apiCallWithRetry(payload, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await fetch('proxy.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error en el proxy: ${response.status} ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            attempt++;
            console.warn(`Attempt ${attempt} failed. Retrying in ${attempt * 2}s...`, error);
            if (attempt >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
    }
}

function getPromptForAction(action) {
    switch (action) {
        case 'staging':
            return "Una imagen fotorrealista de alta resolución. Realiza un 'staging' virtual en esta habitación. La habitación debe estar limpia, ordenada y amueblada con muebles modernos y minimalistas estilo IKEA. La estructura, ventanas, puertas y elementos arquitectónicos de la habitación deben conservarse. La iluminación debe ser brillante y natural.";
        case 'vaciar':
            return "Una imagen fotorrealista de alta resolución. Elimina todos los muebles, decoraciones y objetos personales de esta habitación. La habitación debe quedar completamente vacía y limpia, mostrando únicamente el suelo, las paredes, el techo, las ventanas y las puertas. La estructura original debe conservarse. La iluminación debe ser brillante y natural.";
        default:
            return null;
    }
}

async function processImage(fileData) {
    const { action, base64 } = fileData;
    
    if (action === 'nada') {
        return { originalName: fileData.file.name, dataUrl: base64 };
    }

    const prompt = getPromptForAction(action);
    if (!prompt) return { originalName: fileData.file.name, dataUrl: base64 };
    
    const payload = {
        endpoint: 'generateContent',
        model: 'gemini-3.1-flash-image-preview',
        data: {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: fileData.file.type, data: base64.split(',')[1] } }
                ]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            },
        }
    };
    
    const result = await apiCallWithRetry(payload);
    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    
    if (!base64Data) {
         console.error("No se recibió imagen generada para:", fileData.file.name);
         return { originalName: fileData.file.name, dataUrl: base64 }; // Devolver original si falla
    }
    
    return {
        originalName: fileData.file.name,
        dataUrl: `data:image/png;base64,${base64Data}`
    };
}

async function generateAdText(audience, length, tone) {
     const prompt = `Basándote en las siguientes imágenes de una propiedad, escribe un texto convincente para un anuncio inmobiliario.
        Analiza las imágenes para identificar características clave como el número de habitaciones, estilo, estado, luz natural, y posibles puntos de venta.
        Luego, redacta la descripción siguiendo estas directrices:
        - Público Objetivo: ${audience}
        - Extensión del Texto: ${length}
        - Tono: ${tone}
        
        Escribe únicamente el texto del anuncio, sin títulos adicionales ni introducciones.`;

    const imageParts = uploadedFiles.map(fileData => ({
        inlineData: {
            mimeType: fileData.file.type,
            data: fileData.base64.split(',')[1]
        }
    }));

    const payload = {
        endpoint: 'generateContent',
        model: 'gemini-3.1-flash-image-preview',
        data: {
            contents: [{
                parts: [{ text: prompt }, ...imageParts]
            }]
        }
    };
    
    const result = await apiCallWithRetry(payload);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || "No se pudo generar el texto del anuncio. Por favor, revisa las imágenes e inténtalo de nuevo.";
}

function displayResults(images, text) {
    images.forEach(img => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <img class="result-image" alt="" />
            <a class="result-download" aria-label="Descargar imagen generada" title="Descargar imagen">
                    <i data-lucide="download" aria-hidden="true"></i>
            </a>
        `;
        const image = resultCard.querySelector('.result-image');
        image.src = img.dataUrl;
        image.alt = `Imagen generada de ${img.originalName}`;
        image.addEventListener('click', () => openLightbox(img.dataUrl));
        const download = resultCard.querySelector('.result-download');
        download.href = img.dataUrl;
        download.download = `generado-${img.originalName}`;
        resultsImageGrid.appendChild(resultCard);
    });

    resultsText.textContent = text;
    resultsSection.classList.remove('hidden');
    lucide.createIcons();
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}


