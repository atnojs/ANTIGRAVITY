'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const els = {
    source: $('source-prompt'),
    sourceCounter: $('source-counter'),
    adapted: $('adapted-prompt'),
    adaptedState: $('adapted-state'),
    adaptedBlock: document.querySelector('.adapted-block'),
    adaptBtn: $('adapt-btn'),
    copyPromptBtn: $('copy-prompt-btn'),
    downloadJsonBtn: $('download-json-btn'),
    adaptError: $('adapt-error'),
    styleImageInput: $('style-image-input'),
    styleUploadZone: $('style-upload-zone'),
    styleImagePreviewCard: $('style-image-preview-card'),
    styleImagePreview: $('style-image-preview'),
    styleImageName: $('style-image-name'),
    styleImageInfo: $('style-image-info'),
    removeStyleImageBtn: $('remove-style-image-btn'),
    imageInput: $('image-input'),
    uploadZone: $('upload-zone'),
    imagePreviewCard: $('image-preview-card'),
    imagePreview: $('image-preview'),
    imageName: $('image-name'),
    imageInfo: $('image-info'),
    removeImageBtn: $('remove-image-btn'),
    generateBtn: $('generate-btn'),
    generationError: $('generation-error'),
    format: $('output-format'),
    resultSection: $('result-section'),
    resultPlaceholder: $('result-placeholder'),
    resultImage: $('result-image'),
    resultMeta: $('result-meta'),
    resultActions: $('result-actions'),
    expandResultBtn: $('expand-result-btn'),
    downloadResultBtn: $('download-result-btn'),
    loadingOverlay: $('loading-overlay'),
    secondaryStatus: $('secondary-status'),
    serviceStatus: $('service-status'),
    historyGrid: $('history-grid'),
    historyTitle: $('history-title'),
    historyStatus: $('history-status'),
    historyClearBtn: $('history-clear-btn'),
    lightbox: $('lightbox'),
    lightboxImage: $('lightbox-image'),
    lightboxClose: $('lightbox-close'),
    toast: $('toast')
  };

  const state = {
    sourceUsed: '',
    sourceSignatureUsed: '',
    styleImageData: '',
    styleImageFile: null,
    styleImageWidth: 0,
    styleImageHeight: 0,
    adaptedFormat: 'text',
    imageData: '',
    imageFile: null,
    imageWidth: 0,
    imageHeight: 0,
    selectedModel: 'gemini-pro',
    aspectRatio: '1:1',
    resolution: 1024,
    isAdapted: false,
    isBusy: false,
    resultData: '',
    resultMime: 'image/png',
    toastTimer: null
  };

  let history = null;

  function setMessage(element, message = '') {
    element.textContent = message;
    element.hidden = !message;
  }

  function errorMessage(payload, fallback) {
    if (typeof payload?.error === 'string') return payload.error;
    if (typeof payload?.error?.message === 'string') return payload.error.message;
    if (typeof payload?.detail === 'string') return payload.detail;
    return fallback;
  }

  async function fetchJson(url, options = {}, timeout = 150000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(errorMessage(data, `El servidor respondió con HTTP ${response.status}.`));
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La operación tardó demasiado. Inténtalo de nuevo.');
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function showLoading(status) {
    els.secondaryStatus.textContent = status;
    els.loadingOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    state.isBusy = true;
    updateGenerateState();
  }

  function hideLoading() {
    els.loadingOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    state.isBusy = false;
    updateGenerateState();
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { els.toast.hidden = true; }, 2800);
  }

  function updateGenerateState() {
    const ready = state.isAdapted && els.adapted.value.trim() && state.imageData && !state.isBusy;
    els.generateBtn.disabled = !ready;
    els.adaptBtn.disabled = state.isBusy || (!els.source.value.trim() && !state.styleImageData);
  }

  function currentSourceSignature() {
    const file = state.styleImageFile;
    return JSON.stringify({
      text: els.source.value.trim(),
      image: file ? [file.name, file.size, file.lastModified] : null
    });
  }

  function markAdaptationStale() {
    els.sourceCounter.textContent = `${els.source.value.length} / 12000`;
    if (state.sourceSignatureUsed && currentSourceSignature() !== state.sourceSignatureUsed) {
      state.isAdapted = false;
      els.adaptedState.textContent = 'La entrada original ha cambiado · vuelve a adaptar';
      els.adaptedBlock.classList.remove('ready');
    }
    updateGenerateState();
  }

  async function adaptPrompt() {
    const source = els.source.value.trim();
    const hasStyleImage = Boolean(state.styleImageData);
    if (!source && !hasStyleImage) {
      setMessage(els.adaptError, 'Escribe un prompt o sube una imagen de estilo.');
      els.styleUploadZone.focus();
      return;
    }
    setMessage(els.adaptError);
    showLoading(hasStyleImage
      ? 'GPT-5.6 Sol está reconstruyendo el diseño completo en JSON…'
      : 'Extrayendo el estilo y bloqueando toda la composición base…');
    try {
      const data = await fetchJson('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adapt',
          prompt: source,
          styleImage: state.styleImageData
        })
      }, 130000);
      const adapted = String(data.adaptedPrompt || data.text || '').trim();
      if (!data.success || !adapted) throw new Error('La IA no devolvió un prompt adaptado.');
      state.sourceUsed = source || `[Imagen de estilo: ${state.styleImageFile?.name || 'referencia visual'}]`;
      state.sourceSignatureUsed = currentSourceSignature();
      state.adaptedFormat = data.format === 'json' ? 'json' : 'text';
      state.isAdapted = true;
      els.adapted.disabled = false;
      els.adapted.value = adapted;
      els.adaptedState.textContent = state.adaptedFormat === 'json'
        ? 'JSON de estilo listo · puedes editarlo antes de generar'
        : 'Listo · puedes editarlo antes de generar';
      els.adaptedBlock.classList.add('ready');
      els.copyPromptBtn.disabled = false;
      els.downloadJsonBtn.hidden = state.adaptedFormat !== 'json';
      els.downloadJsonBtn.disabled = state.adaptedFormat !== 'json';
      showToast(state.adaptedFormat === 'json' ? 'JSON completo extraído correctamente.' : 'Prompt adaptado correctamente.');
    } catch (error) {
      state.isAdapted = false;
      setMessage(els.adaptError, error.message || 'No se pudo adaptar el prompt.');
    } finally {
      hideLoading();
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }

  function imageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('El archivo no contiene una imagen válida.'));
      image.src = dataUrl;
    });
  }

  function readableBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function validateImageFile(file) {
    if (!file) return 'No se ha seleccionado ninguna imagen.';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Usa una imagen PNG, JPG o WebP.';
    if (file.size > 20 * 1024 * 1024) return 'La imagen supera el máximo de 20 MB.';
    return '';
  }

  async function loadStyleImageFile(file) {
    setMessage(els.adaptError);
    const validationError = validateImageFile(file);
    if (validationError) {
      setMessage(els.adaptError, validationError);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const size = await imageDimensions(dataUrl);
      state.styleImageFile = file;
      state.styleImageData = dataUrl;
      state.styleImageWidth = size.width;
      state.styleImageHeight = size.height;
      els.styleImagePreview.src = dataUrl;
      els.styleImageName.textContent = file.name;
      els.styleImageInfo.textContent = `${size.width} × ${size.height} px · ${readableBytes(file.size)}`;
      els.styleUploadZone.hidden = true;
      els.styleImagePreviewCard.hidden = false;
      markAdaptationStale();
      await adaptPrompt();
    } catch (error) {
      setMessage(els.adaptError, error.message || 'No se pudo analizar la imagen de estilo.');
    }
  }

  function clearStyleImage() {
    state.styleImageData = '';
    state.styleImageFile = null;
    state.styleImageWidth = 0;
    state.styleImageHeight = 0;
    els.styleImageInput.value = '';
    els.styleImagePreview.removeAttribute('src');
    els.styleImagePreviewCard.hidden = true;
    els.styleUploadZone.hidden = false;
    markAdaptationStale();
  }

  async function loadImageFile(file) {
    setMessage(els.generationError);
    const validationError = validateImageFile(file);
    if (validationError) {
      setMessage(els.generationError, validationError);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const size = await imageDimensions(dataUrl);
      state.imageFile = file;
      state.imageData = dataUrl;
      state.imageWidth = size.width;
      state.imageHeight = size.height;
      els.imagePreview.src = dataUrl;
      els.imageName.textContent = file.name;
      els.imageInfo.textContent = `${size.width} × ${size.height} px · ${readableBytes(file.size)}`;
      els.uploadZone.hidden = true;
      els.imagePreviewCard.hidden = false;
      updateGenerateState();
    } catch (error) {
      setMessage(els.generationError, error.message || 'No se pudo cargar la imagen.');
    }
  }

  function clearImage() {
    state.imageData = '';
    state.imageFile = null;
    state.imageWidth = 0;
    state.imageHeight = 0;
    els.imageInput.value = '';
    els.imagePreview.removeAttribute('src');
    els.imagePreviewCard.hidden = true;
    els.uploadZone.hidden = false;
    updateGenerateState();
  }

  function selectExclusive(containerSelector, buttonSelector, button, stateKey, dataKey, transform = (value) => value) {
    document.querySelectorAll(`${containerSelector} ${buttonSelector}`).forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      if (item.hasAttribute('role')) item.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    state[stateKey] = transform(button.dataset[dataKey]);
  }

  function actualDataUrl(data) {
    if (typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image/')) return data.dataUrl;
    if (data.image && data.mimeType) return `data:${data.mimeType};base64,${data.image}`;
    return '';
  }

  function formatResultMeta(data) {
    const model = {
      'google/gemini-3.1-flash-image': '3.1FLASH',
      'google/gemini-3-pro-image': '3 PRO',
      'flux-2-pro': 'FLUX PRO',
      'flux-2-max': 'FLUX MAX'
    }[data.model] || state.selectedModel;
    let dimensions = '';
    if (data.width && data.height) dimensions = `${data.width} × ${data.height} px`;
    else if (data.effectiveResolution) dimensions = `${data.effectiveResolution}px · ${data.aspectRatio || state.aspectRatio}`;
    const adjusted = data.resolutionAdjusted ? ' · ajustada al límite del modelo' : '';
    return `${model}${dimensions ? ` · ${dimensions}` : ''}${adjusted}`;
  }

  async function saveHistory(dataUrl, response) {
    if (!history) return;
    try {
      await history.save({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'image',
        model: response.model || state.selectedModel,
        data: {
          originalPrompt: state.sourceUsed,
          prompt: els.adapted.value.trim(),
          model: response.model || state.selectedModel,
          provider: response.provider || '',
          aspectRatio: response.aspectRatio || state.aspectRatio,
          resolution: response.effectiveResolution || state.resolution,
          mimeType: response.mimeType || 'image/png'
        },
        imageData: dataUrl,
        createdAt: new Date().toISOString()
      });
      els.historyStatus.textContent = '';
    } catch (error) {
      els.historyStatus.textContent = 'La imagen se generó, pero no pudo guardarse en el historial.';
    }
  }

  async function generateImage() {
    if (els.generateBtn.disabled) return;
    setMessage(els.generationError);
    showLoading(`Editando con ${state.selectedModel.replaceAll('-', ' ')}…`);
    try {
      const data = await fetchJson('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt: els.adapted.value.trim(),
          image: state.imageData,
          model: state.selectedModel,
          aspectRatio: state.aspectRatio,
          resolution: state.resolution,
          output_format: els.format.value
        })
      }, 165000);
      const dataUrl = actualDataUrl(data);
      if (!data.success || !dataUrl) throw new Error('El modelo no devolvió una imagen válida.');
      state.resultData = dataUrl;
      state.resultMime = data.mimeType || dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';
      els.resultImage.src = dataUrl;
      els.resultImage.hidden = false;
      els.resultPlaceholder.hidden = true;
      els.resultActions.hidden = false;
      els.resultMeta.textContent = formatResultMeta(data);
      els.resultSection.hidden = false;
      await saveHistory(dataUrl, data);
      els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setMessage(els.generationError, error.message || 'No se pudo generar la imagen.');
    } finally {
      hideLoading();
    }
  }

  function extensionForMime(mime) {
    if (mime.includes('jpeg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    return 'png';
  }

  function downloadDataUrl(dataUrl, mime = 'image/png', prefix = 'imagen_estilizada') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${prefix}_${Date.now()}.${extensionForMime(mime)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadStyleJson() {
    try {
      const parsed = JSON.parse(els.adapted.value);
      const content = JSON.stringify(parsed, null, 2);
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `estilo_extraido_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      showToast('JSON descargado.');
    } catch {
      showToast('El contenido editado ya no es un JSON válido.');
    }
  }

  async function downloadHistoryImage(item, url) {
    const storedMime = item.data?.mimeType || url.match(/^data:([^;]+)/)?.[1] || 'image/png';
    if (url.startsWith('data:image/')) {
      downloadDataUrl(url, storedMime, 'imagen_historial');
      return;
    }
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo descargar la imagen.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    downloadDataUrl(objectUrl, blob.type || storedMime, 'imagen_historial');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  function openLightbox(url) {
    if (!url) return;
    els.lightboxImage.src = url;
    els.lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    els.lightboxClose.focus();
  }

  function closeLightbox() {
    els.lightbox.hidden = true;
    els.lightboxImage.removeAttribute('src');
    if (els.loadingOverlay.classList.contains('hidden')) document.body.style.overflow = '';
  }

  function historyImageUrl(item) {
    return item.imageUrl || item.data?.url || item.data?.dataUrl || '';
  }

  function renderHistory() {
    if (!history) return;
    const items = history.getAll().filter((item) => historyImageUrl(item));
    els.historyGrid.replaceChildren();
    const hasItems = items.length > 0;
    els.historyTitle.style.display = hasItems ? 'block' : 'none';
    els.historyClearBtn.style.display = hasItems ? 'block' : 'none';
    if (!hasItems && !els.historyStatus.textContent) els.historyStatus.textContent = 'Tus resultados aparecerán aquí.';
    if (hasItems) els.historyStatus.textContent = '';

    items.forEach((item) => {
      const url = historyImageUrl(item);
      const wrap = document.createElement('article');
      wrap.className = 'history-item-wrap';
      const image = document.createElement('img');
      image.src = url;
      image.alt = 'Resultado guardado en el historial';
      image.loading = 'lazy';
      image.addEventListener('click', () => openLightbox(url));
      const actions = document.createElement('div');
      actions.className = 'history-item-actions';
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'btn-square history-download';
      download.textContent = '↓';
      download.setAttribute('aria-label', 'Descargar imagen del historial');
      download.setAttribute('title', 'Descargar');
      download.addEventListener('click', async () => {
        download.disabled = true;
        try {
          await downloadHistoryImage(item, url);
          showToast('Descarga iniciada.');
        } catch {
          showToast('No se pudo descargar la imagen.');
        } finally {
          download.disabled = false;
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-square history-delete';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Eliminar del historial');
      remove.setAttribute('title', 'Eliminar');
      remove.addEventListener('click', async () => {
        if (!window.confirm('¿Eliminar esta imagen del historial?')) return;
        try { await history.delete(item.id); } catch { els.historyStatus.textContent = 'No se pudo eliminar la imagen.'; }
      });
      actions.append(download, remove);
      const date = document.createElement('span');
      date.className = 'history-date';
      date.textContent = new Date(item.createdAt || Date.now()).toLocaleString('es-ES');
      wrap.append(image, actions, date);
      els.historyGrid.appendChild(wrap);
    });
  }

  async function initHistory() {
    try {
      history = new HistoryManager('estilizador_prompt');
      history.onChange(renderHistory);
      await history.load();
      renderHistory();
    } catch (error) {
      els.historyStatus.textContent = 'El historial no está disponible en este momento.';
    }
  }

  async function checkService() {
    try {
      const data = await fetchJson('proxy.php', {}, 12000);
      const flux = Boolean(data.configured?.flux);
      const openrouter = Boolean(data.configured?.openrouter);
      els.serviceStatus.classList.toggle('online', flux && openrouter);
      els.serviceStatus.classList.toggle('partial', flux !== openrouter);
      els.serviceStatus.textContent = flux && openrouter
        ? '4 modelos disponibles'
        : flux || openrouter
          ? 'Servicio parcialmente configurado'
          : 'Faltan claves del servidor';
    } catch {
      els.serviceStatus.textContent = 'Servicio no disponible';
    }
  }

  els.source.addEventListener('input', markAdaptationStale);
  els.adapted.addEventListener('input', updateGenerateState);
  els.adaptBtn.addEventListener('click', adaptPrompt);
  els.downloadJsonBtn.addEventListener('click', downloadStyleJson);
  els.copyPromptBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.adapted.value);
      showToast('Prompt copiado.');
    } catch {
      els.adapted.select();
      document.execCommand('copy');
      showToast('Prompt copiado.');
    }
  });

  els.styleImageInput.addEventListener('change', () => loadStyleImageFile(els.styleImageInput.files?.[0]));
  els.styleUploadZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.styleImageInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((type) => els.styleUploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    els.styleUploadZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => els.styleUploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    els.styleUploadZone.classList.remove('dragover');
  }));
  els.styleUploadZone.addEventListener('drop', (event) => loadStyleImageFile(event.dataTransfer?.files?.[0]));
  els.removeStyleImageBtn.addEventListener('click', clearStyleImage);
  els.styleImagePreview.addEventListener('click', () => openLightbox(state.styleImageData));

  els.imageInput.addEventListener('change', () => loadImageFile(els.imageInput.files?.[0]));
  els.uploadZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.imageInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((type) => els.uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    els.uploadZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => els.uploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    els.uploadZone.classList.remove('dragover');
  }));
  els.uploadZone.addEventListener('drop', (event) => loadImageFile(event.dataTransfer?.files?.[0]));
  els.removeImageBtn.addEventListener('click', clearImage);
  els.imagePreview.addEventListener('click', () => openLightbox(state.imageData));

  $('ar-selector').addEventListener('click', (event) => {
    const button = event.target.closest('.aspect-ratio-button');
    if (button) selectExclusive('#ar-selector', '.aspect-ratio-button', button, 'aspectRatio', 'ar');
  });
  $('resolution-selector').addEventListener('click', (event) => {
    const button = event.target.closest('.resolution-button');
    if (button) selectExclusive('#resolution-selector', '.resolution-button', button, 'resolution', 'resolution', Number);
  });
  document.querySelector('.model-toggle-group').addEventListener('click', (event) => {
    const button = event.target.closest('.model-toggle');
    if (button) selectExclusive('.model-toggle-group', '.model-toggle', button, 'selectedModel', 'model');
  });

  els.generateBtn.addEventListener('click', generateImage);
  els.resultImage.addEventListener('click', () => openLightbox(state.resultData));
  els.expandResultBtn.addEventListener('click', () => openLightbox(state.resultData));
  els.downloadResultBtn.addEventListener('click', () => downloadDataUrl(state.resultData, state.resultMime));
  els.lightboxClose.addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', (event) => { if (event.target === els.lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !els.lightbox.hidden) closeLightbox(); });

  els.historyClearBtn.addEventListener('click', async () => {
    if (!history || !window.confirm('¿Eliminar todo el historial?')) return;
    try { await history.clear(); } catch { els.historyStatus.textContent = 'No se pudo limpiar el historial.'; }
  });

  markAdaptationStale();
  await Promise.allSettled([initHistory(), checkService()]);
});
