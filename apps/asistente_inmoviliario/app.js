lucide.createIcons();

// ===== CONFIGURACIÓN DE HISTORIAL PERSISTENTE =====
const HISTORY_DB_NAME = 'asistente_inmoviliario_history';
HistoryManager.configure({ dbName: HISTORY_DB_NAME });
HistoryManager.init().catch(e => console.warn('HistoryManager init error:', e));

// ===== REFERENCIAS DOM =====
const imageUploader = document.getElementById('image-uploader');
const imagePreviewGrid = document.getElementById('image-preview-grid');
const generateBtn = document.getElementById('generate-btn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultsSection = document.getElementById('results-section');
const resultsImageGrid = document.getElementById('results-image-grid');
const resultsText = document.getElementById('results-text');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxClose = document.getElementById('lightboxClose');
const historyGrid = document.getElementById('historyGrid');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

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
function showLoading(text) {
  loadingOverlay.querySelector('.loading-text').textContent = text || 'IA Generando Obra Maestra...';
  loadingOverlay.classList.remove('hidden');
}
function hideLoading() { loadingOverlay.classList.add('hidden'); }

// ===== HISTORIAL =====
async function loadHistory() {
  try {
    const items = await HistoryManager.loadAll();
    renderHistory(items);
  } catch (e) {
    console.warn('Error cargando historial:', e);
    historyEmpty.style.display = 'block';
  }
}

function renderHistory(items) {
  historyGrid.innerHTML = '';
  if (!items || items.length === 0) {
    historyEmpty.style.display = 'block';
    return;
  }
  historyEmpty.style.display = 'none';
  items.forEach(item => {
    const src = item.url || item.imageUrl || '';
    if (!src) return;
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <img src="${src}" alt="Generación ${item.id}" onclick="window._openLightbox && window._openLightbox('${src}')" style="cursor:zoom-in" />
      <div class="history-actions">
        <button class="hist-download" title="Descargar">
          <i data-lucide="download" style="width:14px;height:14px"></i>
        </button>
        <button class="hist-delete" title="Eliminar">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i>
        </button>
      </div>
      <div class="history-info">${new Date(item.createdAt).toLocaleDateString('es-ES', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
    `;
    card.querySelector('.hist-download').addEventListener('click', (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = src;
      a.download = `generado-${item.id}.png`;
      a.click();
    });
    card.querySelector('.hist-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      await HistoryManager.deleteItem(item.id);
      const items = await HistoryManager.loadAll();
      renderHistory(items);
    });
    card.querySelector('img').addEventListener('click', () => openLightbox(src));
    historyGrid.appendChild(card);
  });
  lucide.createIcons();
}

window._openLightbox = openLightbox;

clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('¿Eliminar todo el historial de generaciones?')) {
    await HistoryManager.clearAll();
    historyGrid.innerHTML = '';
    historyEmpty.style.display = 'block';
  }
});

// Cargar historial al iniciar
loadHistory();

imageUploader.addEventListener('change', handleImageUpload);

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
    card.className = 'image-container'; // Usa la clase CSS de app.css
    card.style.aspectRatio = '1 / 1'; // Asegura la proporción de aspecto que coincide con CSS
    
    card.innerHTML = `
        <img src="${fileData.base64}" alt="Vista previa de ${fileData.file.name}" class="w-full h-full object-cover">
        <div class="overlay-buttons">
            <button data-id="${fileData.id}" class="overlay-btn delete" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
        <div class="space-y-2 p-2">
            <div class="flex items-center">
                <input id="radio-nada-${fileData.id}" type="radio" value="nada" name="action-${fileData.id}" class="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 focus:ring-sky-500" checked>
                <label for="radio-nada-${fileData.id}" class="ml-2 text-sm font-medium text-gray-900">Nada</label>
            </div>
            <div class="flex items-center">
                <input id="radio-staging-${fileData.id}" type="radio" value="staging" name="action-${fileData.id}" class="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 focus:ring-sky-500">
                <label for="radio-staging-${fileData.id}" class="ml-2 text-sm font-medium text-gray-900">Staging Virtual</label>
            </div>
            <div class="flex items-center">
                <input id="radio-vaciar-${fileData.id}" type="radio" value="vaciar" name="action-${fileData.id}" class="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 focus:ring-sky-500">
                <label for="radio-vaciar-${fileData.id}" class="ml-2 text-sm font-medium text-gray-900">Vaciar Espacio</label>
            </div>
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
    showLoading('IA Generando Anuncio Inmobiliario...');
    resultsImageGrid.innerHTML = '';
    resultsText.innerHTML = '';
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
            await HistoryManager.saveItem({
              id: historyId,
              url: img.dataUrl,
              prompt: `Staging/Vaciado de ${img.originalName}`,
              createdAt: Date.now()
            });
          }
        }
        // Recargar historial
        const items = await HistoryManager.loadAll();
        renderHistory(items);

    } catch (error) {
        console.error("Error durante la generación:", error);
        alert("Hubo un error al generar el anuncio: " + error.message + ". Revisa la consola para más detalles.");
    } finally {
        console.log('Rehabilitando botón y ocultando loader');
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generar Anuncio';
        hideLoading();
        resultsSection.classList.remove('hidden');
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
        resultCard.className = 'relative group';
        resultCard.innerHTML = `
            <img src="${img.dataUrl}" alt="Imagen generada de ${img.originalName}" class="w-full h-48 object-cover rounded-lg shadow-md" style="cursor:zoom-in" onclick="window._openLightbox('${img.dataUrl}')" />
            <a href="${img.dataUrl}" download="generado-${img.originalName}" class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100" style="pointer-events:none">
                <div class="bg-white text-gray-800 p-3 rounded-full shadow-lg" style="pointer-events:auto">
                    <i data-lucide="download" class="w-6 h-6"></i>
                </div>
            </a>
        `;
        resultsImageGrid.appendChild(resultCard);
    });

    resultsText.textContent = text;
    resultsSection.classList.remove('hidden');
    lucide.createIcons();
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}


