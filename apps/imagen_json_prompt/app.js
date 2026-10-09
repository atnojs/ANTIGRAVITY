/* app.js — "Imagen → JSON → Prompt Universal"
 *
 * Flujo en cuatro pasos:
 *   1. imagen  →  2. .json (editable)  →  3. prompt universal  →  4. imagen final
 *
 * Contrato de la app: el prompt universal se redacta SOLO con el .json. El binario
 * de la imagen se envía al analizador (paso 2) y al generador de imagen (paso 4),
 * pero NUNCA al redactor del prompt. El proxy rechaza esa petición si detecta
 * cualquier campo de imagen, y aquí se avisa de ello en la interfaz.
 */
(function () {
  'use strict';

  const PROXY = 'proxy.php';
  const ANCHOR_HEAD = 'If the user attaches an image, you must apply only the style to it, ensuring the original image remains completely unchanged; in other words, you must recreate the user-provided image and apply solely the requested style.';
  const ANCHOR_TAIL = 'all visible text and labels must be written in Spanish with no English words.';
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const VISION_MAX_SIDE = 1408;

  const $ = (id) => document.getElementById(id);

  const els = {
    serviceChip: $('service-chip'),
    // Paso 1
    paso1: $('paso-1'),
    uploadChip: $('upload-chip'),
    uploadZone: $('upload-zone'),
    imageInput: $('image-input'),
    imagePreview: $('image-preview'),
    imagePreviewImg: $('image-preview-img'),
    previewName: $('preview-name'),
    previewSize: $('preview-size'),
    removeImageBtn: $('remove-image-btn'),
    analyzeBtn: $('analyze-btn'),
    resetBtn: $('reset-btn'),
    // Paso 2
    paso2: $('paso-2'),
    jsonChip: $('json-chip'),
    jsonText: $('json-text'),
    jsonState: $('json-state'),
    jsonSize: $('json-size'),
    jsonModel: $('json-model'),
    jsonFormatBtn: $('json-format-btn'),
    jsonCopyBtn: $('json-copy-btn'),
    jsonDownloadBtn: $('json-download-btn'),
    jsonReanalyzeBtn: $('json-reanalyze-btn'),
    // Paso 3 — imagen a la que se aplica el prompt
    paso3: $('paso-3'),
    targetChip: $('target-chip'),
    targetZone: $('target-zone'),
    targetInput: $('target-input'),
    targetPreview: $('target-preview'),
    targetPreviewImg: $('target-preview-img'),
    targetPreviewName: $('target-preview-name'),
    targetPreviewSize: $('target-preview-size'),
    targetRemoveBtn: $('target-remove-btn'),
    // Paso 4 — prompt universal
    paso4: $('paso-4'),
    promptChip: $('prompt-chip'),
    pillToggles: Array.from(document.querySelectorAll('.pill-toggle[data-lang]')),
    requestedStyle: $('requested-style'),
    promptBtn: $('prompt-btn'),
    anchorsBox: $('anchors-box'),
    promptTrace: $('prompt-trace'),
    promptStale: $('prompt-stale'),
    promptText: $('prompt-text'),
    backgroundCard: $('background-card'),
    bgSwatch: $('bg-swatch'),
    bgColor: $('bg-color'),
    bgTexture: $('bg-texture'),
    bgReason: $('bg-reason'),
    promptCopyBtn: $('prompt-copy-btn'),
    promptDownloadBtn: $('prompt-download-btn'),
    promptRegenBtn: $('prompt-regen-btn'),
    // Paso 5 — imagen final
    paso5: $('paso-5'),
    resultChip: $('result-chip'),
    modelToggles: Array.from(document.querySelectorAll('.model-toggle')),
    aspectButtons: Array.from(document.querySelectorAll('.aspect-ratio-button')),
    resolutionButtons: Array.from(document.querySelectorAll('.resolution-button')),
    generateBtn: $('generate-btn'),
    // Fondo opcional del paso final
    bgToggles: Array.from(document.querySelectorAll('.pill-toggle[data-bg]')),
    bgColorRow: $('bg-color-row'),
    bgColorInput: $('bg-color-input'),
    bgColorValue: $('bg-color-value'),
    bgImageRow: $('bg-image-row'),
    bgImageInput: $('bg-image-input'),
    bgImageBtn: $('bg-image-btn'),
    bgImagePreview: $('bg-image-preview'),
    bgImagePreviewImg: $('bg-image-preview-img'),
    bgImageName: $('bg-image-name'),
    bgImageSize: $('bg-image-size'),
    bgImageRemove: $('bg-image-remove'),
    resultPlaceholder: $('result-placeholder'),
    resultImage: $('result-image'),
    resultMeta: $('result-meta'),
    resultDownloadBtn: $('result-download-btn'),
    resultZoomBtn: $('result-zoom-btn'),
    errorMessage: $('error-message'),
    // Historial
    historySection: $('history-section'),
    historyTitle: $('history-title'),
    historyGrid: $('history-grid'),
    historyStatus: $('history-status'),
    historyClearBtn: $('history-clear-btn'),
    // Overlay, lightbox, tooltip, toast
    overlay: $('loading-overlay'),
    loadingText: $('loading-text'),
    secondaryStatus: $('secondary-status'),
    lightbox: $('lightbox'),
    lightboxImg: $('lightbox-img'),
    lightboxClose: $('lightbox-close'),
    tooltip: $('model-tooltip'),
    toast: $('toast'),
  };

  const state = {
    fileName: '',
    fileSize: 0,
    imageDataUrl: '',   // referencia original (paso 1): solo análisis y vista previa
    visionDataUrl: '',  // copia optimizada, para el analizador (paso 2)
    targetDataUrl: '',  // imagen a la que se aplica el prompt (paso 3): es la que edita el modelo
    targetFileName: '',
    targetFileSize: 0,
    targetWidth: 0,
    targetHeight: 0,
    imageWidth: 0,
    imageHeight: 0,
    jsonText: '',
    jsonModel: '',
    promptJsonHash: '',
    prompt: '',
    language: 'es',
    selectedModel: 'openai-image-2-low',
    aspectRatio: '1:1',
    resolution: 1024,
    backgroundMode: 'keep',   // keep | color | image
    backgroundColor: '#1B2A33',
    backgroundDataUrl: '',
    backgroundFileName: '',
    resultDataUrl: '',
    resultMeta: '',
    busy: false,
  };

  let history = null;
  let toastTimer = null;

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */

  function hashString(value) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16);
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + ' ' + units[index];
  }

  function safeFileName(base, extension) {
    const clean = (base || 'resultado')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'resultado';
    return clean + '.' + extension;
  }

  function downloadBlob(content, filename, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, base64] = String(dataUrl).split(',');
    const mime = (meta.match(/data:([^;]+)/) || [, 'image/png'])[1];
    const binary = atob(base64 || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function copyText(text, okMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.setAttribute('readonly', '');
        helper.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        document.body.removeChild(helper);
      }
      showToast(okMessage || 'Copiado al portapapeles.');
      return true;
    } catch (error) {
      showToast('No se pudo copiar automáticamente: selecciona el texto y cópialo a mano.');
      return false;
    }
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 3600);
  }

  function showError(message) {
    if (!els.errorMessage) return;
    els.errorMessage.textContent = message;
    els.errorMessage.classList.remove('hidden');
  }

  function clearError() {
    if (!els.errorMessage) return;
    els.errorMessage.textContent = '';
    els.errorMessage.classList.add('hidden');
  }

  function setBusy(busy, title, status) {
    state.busy = busy;
    els.overlay.classList.toggle('hidden', !busy);
    els.overlay.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (title) els.loadingText.textContent = title;
    if (status) els.secondaryStatus.textContent = status;
    document.documentElement.style.overflow = busy ? 'hidden' : '';
    els.generateBtn.disabled = busy || !canGenerate();
    els.analyzeBtn.disabled = busy || !state.imageDataUrl;
    els.promptBtn.disabled = busy || !canPrompt();
  }

  function lightboxOpen(src) {
    els.lightboxImg.src = src;
    els.lightbox.classList.remove('hidden');
  }
  function lightboxClose() {
    els.lightbox.classList.add('hidden');
    els.lightboxImg.removeAttribute('src');
  }

  /**
   * El servidor (nginx) corta a los ~56 s con una página HTML de error, no con JSON.
   * Distinguimos ese caso para no hablar de "respuesta ilegible" cuando en realidad
   * lo que ha pasado es que el análisis se ha pasado de tiempo.
   */
  function httpErrorText(status, ilegible) {
    if (status === 502 || status === 503 || status === 504) {
      return 'El servidor tardó demasiado en analizar la imagen (HTTP ' + status + '). Vuelve a intentarlo; si se repite, usa una imagen más pequeña.';
    }
    if (ilegible) {
      return 'El servidor devolvió una respuesta ilegible (HTTP ' + status + ').';
    }
    return 'Error HTTP ' + status;
  }

  function postProxy(payload) {
    return fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      let data = null;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error(httpErrorText(response.status, true));
      }
      if (!response.ok || !data || data.success === false) {
        const detail = data && data.detail ? ' — ' + data.detail : '';
        const message = (data && data.error) ? data.error : httpErrorText(response.status, false);
        throw new Error(message + detail);
      }
      return data;
    });
  }

  /* ------------------------------------------------------------------ *
   * Servicio
   * ------------------------------------------------------------------ */

  async function checkService() {
    try {
      const response = await fetch(PROXY, { method: 'GET', cache: 'no-store' });
      const data = await response.json();
      const openai = !!(data.configured && data.configured.openai);
      const openrouter = !!(data.configured && data.configured.openrouter);
      if (openai && openrouter) {
        els.serviceChip.textContent = 'Servicio listo · ' + (data.textModel || 'modelo de texto');
        els.serviceChip.className = 'status-chip ok';
      } else {
        const missing = [];
        if (!openrouter) missing.push('OpenRouter (R)');
        if (!openai) missing.push('OpenAI (OPENAI_API_KEY/O)');
        els.serviceChip.textContent = 'Faltan claves en el servidor: ' + missing.join(' y ');
        els.serviceChip.className = 'status-chip bad';
      }
    } catch (error) {
      els.serviceChip.textContent = 'No se pudo comprobar el servicio';
      els.serviceChip.className = 'status-chip bad';
    }
  }

  /* ------------------------------------------------------------------ *
   * Paso 1 — imagen
   * ------------------------------------------------------------------ */

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('La imagen no se pudo leer.'));
      image.src = src;
    });
  }

  /** Copia optimizada para el analizador: menos peso, misma información visual. */
  async function buildVisionCopy(dataUrl) {
    const image = await loadImageElement(dataUrl);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > VISION_MAX_SIDE ? VISION_MAX_SIDE / longest : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    clearError();
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showError('El archivo debe ser una imagen (PNG, JPG, WEBP o GIF).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError('La imagen supera 20 MB. Reduce su tamaño y vuelve a intentarlo.');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const vision = await buildVisionCopy(dataUrl);
      state.fileName = file.name || 'imagen';
      state.fileSize = file.size;
      state.imageDataUrl = dataUrl;
      state.visionDataUrl = vision.dataUrl;
      state.imageWidth = vision.width;
      state.imageHeight = vision.height;

      els.imagePreviewImg.src = dataUrl;
      els.previewName.textContent = state.fileName;
      els.previewSize.textContent = state.imageWidth + ' × ' + state.imageHeight + ' px · ' + formatBytes(file.size);
      els.imagePreview.classList.remove('hidden');
      els.uploadZone.classList.add('hidden');
      els.uploadChip.textContent = 'Imagen lista';
      els.uploadChip.className = 'status-chip ok';
      els.analyzeBtn.disabled = state.busy;
      els.removeImageBtn.classList.remove('hidden');
    } catch (error) {
      showError(error.message || 'No se pudo preparar la imagen.');
    }
  }

  function clearImage() {
    state.fileName = '';
    state.fileSize = 0;
    state.imageDataUrl = '';
    state.visionDataUrl = '';
    state.imageWidth = 0;
    state.imageHeight = 0;
    els.imageInput.value = '';
    els.imagePreview.classList.add('hidden');
    els.imagePreviewImg.removeAttribute('src');
    els.uploadZone.classList.remove('hidden');
    els.uploadChip.textContent = 'Sin imagen';
    els.uploadChip.className = 'status-chip';
    els.analyzeBtn.disabled = true;
  }

  /**
   * Imagen del paso 3: la que el modelo edita de verdad. El prompt universal se
   * aplica a ESTA imagen, nunca a la referencia del paso 1.
   */
  async function handleTargetFile(file) {
    clearError();
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showError('El archivo debe ser una imagen (PNG, JPG, WEBP o GIF).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError('La imagen supera 20 MB. Reduce su tamaño y vuelve a intentarlo.');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const image = await loadImageElement(dataUrl);
      state.targetDataUrl = dataUrl;
      state.targetFileName = file.name || 'imagen';
      state.targetFileSize = file.size;
      state.targetWidth = image.naturalWidth;
      state.targetHeight = image.naturalHeight;

      // El formato de salida se ajusta solo al de la imagen que se va a modificar.
      const ratio = closestAspectRatio(state.targetWidth, state.targetHeight);
      if (ratio && ratio !== state.aspectRatio) {
        selectAspectRatio(ratio);
        showToast('Formato ajustado a ' + ratio + ', el de tu imagen.');
      }

      els.targetPreviewImg.src = dataUrl;
      els.targetPreviewName.textContent = state.targetFileName;
      els.targetPreviewSize.textContent = state.targetWidth + ' × ' + state.targetHeight + ' px · ' + formatBytes(file.size);
      els.targetPreview.classList.remove('hidden');
      els.targetZone.classList.add('hidden');
      els.targetChip.textContent = 'Imagen lista';
      els.targetChip.className = 'status-chip ok';
      els.generateBtn.disabled = !canGenerate();
    } catch (error) {
      showError(error.message || 'No se pudo preparar la imagen.');
    }
  }

  function clearTargetImage() {
    state.targetDataUrl = '';
    state.targetFileName = '';
    state.targetFileSize = 0;
    state.targetWidth = 0;
    state.targetHeight = 0;
    els.targetInput.value = '';
    els.targetPreview.classList.add('hidden');
    els.targetPreviewImg.removeAttribute('src');
    els.targetZone.classList.remove('hidden');
    els.targetChip.textContent = 'Sin imagen';
    els.targetChip.className = 'status-chip';
    els.generateBtn.disabled = !canGenerate();
  }

  /* ------------------------------------------------------------------ *
   * Fondo opcional de la imagen final
   * ------------------------------------------------------------------ */

  function setBackgroundMode(mode) {
    state.backgroundMode = ['keep', 'color', 'image'].indexOf(mode) >= 0 ? mode : 'keep';
    if (!els.bgColorRow) return;
    els.bgColorRow.classList.toggle('hidden', state.backgroundMode !== 'color');
    els.bgImageRow.classList.toggle('hidden', state.backgroundMode !== 'image');
    els.generateBtn.disabled = !canGenerate();
  }

  /** Imagen de fondo: viaja como SEGUNDA referencia y el modelo la integra. */
  async function handleBackgroundFile(file) {
    clearError();
    if (!file) return;
    if (!els.bgImagePreview) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showError('El fondo debe ser una imagen (PNG, JPG, WEBP o GIF).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError('La imagen de fondo supera 20 MB. Reduce su tamaño y vuelve a intentarlo.');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const image = await loadImageElement(dataUrl);
      state.backgroundDataUrl = dataUrl;
      state.backgroundFileName = file.name || 'fondo';
      els.bgImagePreviewImg.src = dataUrl;
      els.bgImageName.textContent = state.backgroundFileName;
      els.bgImageSize.textContent = image.naturalWidth + ' × ' + image.naturalHeight + ' px · ' + formatBytes(file.size);
      els.bgImagePreview.classList.remove('hidden');
      els.generateBtn.disabled = !canGenerate();
    } catch (error) {
      showError(error.message || 'No se pudo preparar la imagen de fondo.');
    }
  }

  function clearBackgroundImage() {
    state.backgroundDataUrl = '';
    state.backgroundFileName = '';
    if (!els.bgImageInput) return;
    els.bgImageInput.value = '';
    els.bgImagePreview.classList.add('hidden');
    els.bgImagePreviewImg.removeAttribute('src');
    els.generateBtn.disabled = !canGenerate();
  }

  /* ------------------------------------------------------------------ *
   * Formato de salida (relación de aspecto)
   * ------------------------------------------------------------------ */

  /** Marca un formato en el selector; unica fuente de verdad para el clic y el automático. */
  function selectAspectRatio(ratio) {
    if (!els.aspectButtons.length || !ratio) return;
    els.aspectButtons.forEach((button) => {
      const activo = button.dataset.ratio === ratio;
      button.classList.toggle('active', activo);
      button.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
    state.aspectRatio = ratio;
  }

  /**
   * Formato del selector más parecido al de la imagen subida. Se compara en escala
   * logarítmica para no favorecer los formatos anchos (1.5 está más cerca de 4:3
   * que de 16:9, y 0.67 más cerca de 3:4 que de 9:16).
   */
  function closestAspectRatio(ancho, alto) {
    if (!ancho || !alto || !els.aspectButtons.length) return '';
    const objetivo = ancho / alto;
    let mejor = '';
    let mejorDistancia = Infinity;
    els.aspectButtons.forEach((button) => {
      const partes = String(button.dataset.ratio || '').split(':');
      const valor = Number(partes[0]) / Number(partes[1]);
      if (!isFinite(valor) || valor <= 0) return;
      const distancia = Math.abs(Math.log(valor / objetivo));
      if (distancia < mejorDistancia - 1e-9) {
        mejorDistancia = distancia;
        mejor = button.dataset.ratio;
      }
    });
    return mejor;
  }

  /* ------------------------------------------------------------------ *
   * Paso 2 — análisis a JSON
   * ------------------------------------------------------------------ */

  function lockStep(element, locked) {
    element.classList.toggle('locked', locked);
    element.setAttribute('aria-disabled', locked ? 'true' : 'false');
  }

  async function analyzeImage() {
    if (!state.visionDataUrl) {
      showError('Sube una imagen antes de analizarla.');
      return;
    }
    clearError();
    setBusy(true, 'Analizando la imagen...', 'Extrayendo el .json estructurado...');
    try {
      const data = await postProxy({ action: 'describe', image: state.visionDataUrl });
      state.jsonText = data.jsonText || JSON.stringify(data.json, null, 2);
      state.jsonModel = data.model || '';
      els.jsonText.value = state.jsonText;
      els.jsonText.disabled = false;
      els.jsonModel.textContent = 'Modelo: ' + (state.jsonModel || '—');
      els.jsonChip.textContent = 'JSON listo';
      els.jsonChip.className = 'status-chip ok';
      els.jsonState.textContent = 'JSON válido';
      els.jsonState.className = 'mini-chip ok';
      els.jsonSize.textContent = state.jsonText.length + ' caracteres';
      els.jsonFormatBtn.disabled = false;
      els.jsonCopyBtn.disabled = false;
      els.jsonDownloadBtn.disabled = false;
      els.jsonReanalyzeBtn.disabled = false;
      lockStep(els.paso2, false);
      els.paso2.classList.add('ready');
      // El paso 3 (imagen a editar) ya se puede rellenar: no depende del prompt.
      lockStep(els.paso3, false);
      els.paso3.classList.add('ready');
      updatePromptAvailability();
      renderAnchors('');
      els.paso2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      els.jsonChip.textContent = 'Error';
      els.jsonChip.className = 'status-chip bad';
      showError('No se pudo analizar la imagen: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  function updateJsonAvailability() {
    const value = els.jsonText.value.trim();
    let valid = false;
    try {
      const parsed = JSON.parse(value);
      valid = parsed && typeof parsed === 'object';
    } catch (error) {
      valid = false;
    }
    els.jsonSize.textContent = els.jsonText.value.length + ' caracteres';
    if (!value) {
      els.jsonState.textContent = 'Sin JSON';
      els.jsonState.className = 'mini-chip';
    } else if (valid) {
      els.jsonState.textContent = 'JSON válido';
      els.jsonState.className = 'mini-chip ok';
    } else {
      els.jsonState.textContent = 'JSON con errores de sintaxis';
      els.jsonState.className = 'mini-chip bad';
    }
    els.jsonFormatBtn.disabled = !valid;
    els.jsonCopyBtn.disabled = !value;
    els.jsonDownloadBtn.disabled = !value;
    updatePromptAvailability(valid);
    return valid;
  }

  function updatePromptAvailability(validOverride) {
    const valid = typeof validOverride === 'boolean' ? validOverride : (() => {
      try {
        return !!JSON.parse(els.jsonText.value.trim());
      } catch (error) {
        return false;
      }
    })();
    els.promptBtn.disabled = state.busy || !valid;
    const stale = valid && !!state.promptJsonHash && state.promptJsonHash !== hashString(els.jsonText.value.trim());
    els.promptStale.hidden = !stale;
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(els.jsonText.value);
      els.jsonText.value = JSON.stringify(parsed, null, 2);
      updateJsonAvailability();
      showToast('JSON formateado.');
    } catch (error) {
      showError('El JSON tiene errores de sintaxis y no se puede formatear.');
    }
  }

  /* ------------------------------------------------------------------ *
   * Paso 4 — prompt universal
   * ------------------------------------------------------------------ */

  function renderAnchors(prompt) {
    if (!els.anchorsBox) return;
    const headOk = !!prompt && prompt.indexOf(ANCHOR_HEAD) === 0;
    const tailOk = !!prompt && prompt.slice(-ANCHOR_TAIL.length) === ANCHOR_TAIL;
    const verdict = !prompt
      ? '<span class="mini-chip">Se verificará al generar</span>'
      : (headOk && tailOk
        ? '<span class="mini-chip ok">Verificado en el prompt entregado</span>'
        : '<span class="mini-chip bad">El prompt no respeta las anclas</span>');
    els.anchorsBox.innerHTML =
      '<p class="anchor-line"><span class="mini-chip ok">Cabecera obligatoria</span><br><code>' + escapeHtml(ANCHOR_HEAD) + '</code></p>' +
      '<p class="anchor-line"><span class="mini-chip ok">Cierre obligatorio</span><br><code>' + escapeHtml(ANCHOR_TAIL) + '</code></p>' +
      '<p class="anchor-line">' + verdict + '</p>';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function generatePrompt() {
    let parsed;
    try {
      parsed = JSON.parse(els.jsonText.value);
    } catch (error) {
      showError('Corrige el JSON antes de generar el prompt: tiene errores de sintaxis.');
      return;
    }
    clearError();
    setBusy(true, 'Redactando el prompt universal...', 'Entrada del redactor: tu .json · 0 imágenes');
    try {
      const data = await postProxy({
        action: 'prompt',
        json: parsed,
        lang: state.language,
        requestedStyle: els.requestedStyle.value.trim(),
      });
      state.prompt = data.prompt || '';
      state.promptJsonHash = hashString(els.jsonText.value.trim());
      els.promptText.value = state.prompt;
      els.promptText.disabled = false;
      els.promptChip.textContent = 'Prompt listo';
      els.promptChip.className = 'status-chip ok';
      els.promptCopyBtn.disabled = false;
      els.promptDownloadBtn.disabled = false;
      els.promptRegenBtn.disabled = false;
      els.promptStale.hidden = true;

      const trace = data.trace || {};
      els.promptTrace.textContent = 'Redactor: ' + (trace.images === 0 ? '0 imágenes' : trace.images + ' imágenes') +
        ' · ' + (trace.jsonChars || 0) + ' caracteres de JSON · ' + (trace.model || '—');

      const background = data.background || {};
      if (background.color_hex) {
        els.bgSwatch.style.background = background.color_hex;
        els.bgColor.textContent = 'Fondo recomendado ' + background.color_hex +
          (background.origen === 'calculado' ? ' (calculado por contraste)' : ' (propuesto por el modelo)');
        els.bgTexture.textContent = background.textura || '';
        els.bgReason.textContent = background.motivo_del_contraste || '';
        els.backgroundCard.classList.remove('hidden');
        // Sugerencia para el fondo opcional del paso final (el usuario decide).
        const sugerido = String(background.color_hex).toUpperCase();
        if (/^#[0-9A-F]{6}$/.test(sugerido) && els.bgColorInput) {
          state.backgroundColor = sugerido;
          els.bgColorInput.value = sugerido;
          els.bgColorValue.textContent = sugerido;
        }
      }

      renderAnchors(state.prompt);
      lockStep(els.paso4, false);
      els.paso4.classList.add('ready');
      lockStep(els.paso5, false);
      els.paso5.classList.add('ready');
      els.resultChip.textContent = 'Listo para generar';
      els.resultChip.className = 'status-chip partial';
      els.generateBtn.disabled = !canGenerate();
      els.paso4.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      els.promptChip.textContent = 'Error';
      els.promptChip.className = 'status-chip bad';
      showError('No se pudo generar el prompt: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ *
   * Paso 5 — imagen final: prompt + imagen del paso 3 → imagen
   * ------------------------------------------------------------------ */

  function canPrompt() {
    try {
      return !!JSON.parse(els.jsonText.value.trim());
    } catch (error) {
      return false;
    }
  }

  function canGenerate() {
    const fondoListo = state.backgroundMode !== 'image' || !!state.backgroundDataUrl;
    return !!state.prompt && !!state.targetDataUrl && fondoListo && !state.busy;
  }

  async function generateImage() {
    if (!canGenerate()) {
      const falta = !state.prompt ? 'el prompt universal (paso 4)'
        : (!state.targetDataUrl ? 'la imagen a la que aplicar el prompt (paso 3)' : 'la imagen de fondo');
      showError('Antes de generar necesitas ' + falta + '.');
      return;
    }
    clearError();
    setBusy(true, 'Generando la imagen final...', 'Aplicando el prompt universal sobre la imagen del paso 3...');
    try {
      const payload = {
        action: 'generate',
        prompt: state.prompt,
        image: state.targetDataUrl,
        model: state.selectedModel,
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        background: { mode: state.backgroundMode, color: state.backgroundColor },
      };
      // El fondo elegido viaja como SEGUNDA imagen; el proxy lo integra en el prompt.
      if (state.backgroundMode === 'image' && state.backgroundDataUrl) payload.images = [state.backgroundDataUrl];
      const data = await postProxy(payload);
      const dataUrl = data.dataUrl || data.imageUrl || '';
      if (!dataUrl) throw new Error('El proveedor no devolvió ninguna imagen.');

      state.resultDataUrl = dataUrl;
      state.resultMeta = (data.model || state.selectedModel) +
        ' · ' + (data.width || '?') + ' × ' + (data.height || '?') + ' px' +
        ' · ' + state.aspectRatio + ' · ' + state.resolution + ' px solicitados';
      els.resultImage.src = dataUrl;
      els.resultImage.classList.remove('hidden');
      els.resultPlaceholder.classList.add('hidden');
      els.resultMeta.textContent = state.resultMeta;
      els.resultDownloadBtn.disabled = false;
      els.resultZoomBtn.disabled = false;
      els.resultChip.textContent = 'Imagen generada';
      els.resultChip.className = 'status-chip ok';

      await saveHistory(dataUrl);
      els.paso5.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      els.resultChip.textContent = 'Error';
      els.resultChip.className = 'status-chip bad';
      showError('No se pudo generar la imagen: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ *
   * Historial (servidor, vía history.php)
   * ------------------------------------------------------------------ */

  function historyImageUrl(item) {
    if (!item) return '';
    if (item.imageUrl) return item.imageUrl;
    if (item.data && item.data.url) return item.data.url;
    return '';
  }

  function renderHistory() {
    if (!history) return;
    const items = history.getAll().filter((item) => historyImageUrl(item));
    els.historyGrid.replaceChildren();
    const hasItems = items.length > 0;
    els.historyTitle.style.display = hasItems ? 'block' : 'none';
    els.historyClearBtn.style.display = hasItems ? 'block' : 'none';
    els.historyStatus.textContent = hasItems ? '' : 'Tus resultados aparecerán aquí.';
    if (!hasItems) return;

    items.forEach((item) => {
      const url = historyImageUrl(item);
      const wrap = document.createElement('div');
      wrap.className = 'history-item-wrap';

      const image = document.createElement('img');
      image.src = url;
      image.alt = 'Imagen generada del historial';
      image.loading = 'lazy';
      image.addEventListener('click', () => lightboxOpen(url));
      wrap.appendChild(image);

      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'btn-square history-download';
      download.textContent = '↓';
      download.title = 'Descargar';
      download.setAttribute('aria-label', 'Descargar esta imagen del historial');
      download.addEventListener('click', async (event) => {
        event.stopPropagation();
        download.disabled = true;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          downloadBlob(blob, safeFileName('imagen_' + item.id, 'png'), blob.type || 'image/png');
        } catch (error) {
          els.historyStatus.textContent = 'No se pudo descargar la imagen.';
        } finally {
          download.disabled = false;
        }
      });
      actions.appendChild(download);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-square history-delete';
      remove.textContent = '✕';
      remove.title = 'Eliminar';
      remove.setAttribute('aria-label', 'Eliminar esta imagen del historial');
      remove.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!window.confirm('¿Eliminar esta imagen del historial?')) return;
        remove.disabled = true;
        try {
          await history.delete(item.id);
        } catch (error) {
          els.historyStatus.textContent = 'No se pudo eliminar la imagen.';
        }
      });
      actions.appendChild(remove);
      wrap.appendChild(actions);

      const date = document.createElement('span');
      date.className = 'history-date';
      date.textContent = new Date(item.createdAt || Date.now()).toLocaleString();
      wrap.appendChild(date);

      els.historyGrid.appendChild(wrap);
    });
  }

  async function saveHistory(dataUrl) {
    if (!history) return;
    const id = 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try {
      await history.save({
        id,
        type: 'image',
        model: state.selectedModel,
        data: {
          url: dataUrl,
          modelo: state.selectedModel,
          relacionAspecto: state.aspectRatio,
          resolucion: state.resolution,
          promptUniversal: state.prompt,
        },
        imageData: dataUrl,
        createdAt: new Date().toISOString(),
      });
      els.historyStatus.textContent = '';
    } catch (error) {
      els.historyStatus.textContent = 'La imagen se generó, pero no pudo guardarse en el historial.';
    }
  }

  async function initHistory() {
    if (typeof window.HistoryManager !== 'function') {
      els.historyStatus.textContent = 'El historial no está disponible en este momento.';
      return;
    }
    try {
      history = new window.HistoryManager('imagen_json_prompt');
      history.onChange(renderHistory);
      await history.load();
      renderHistory();
    } catch (error) {
      history = null;
      els.historyStatus.textContent = 'El historial no está disponible en este momento.';
    }
  }

  /* ------------------------------------------------------------------ *
   * Tooltip de modelos
   * ------------------------------------------------------------------ */

  function initModelTooltip() {
    const show = (button) => {
      const text = button.dataset.tooltip;
      if (!text) return;
      els.tooltip.textContent = text;
      els.tooltip.classList.add('visible');
      els.tooltip.setAttribute('aria-hidden', 'false');
      const rect = button.getBoundingClientRect();
      const box = els.tooltip.getBoundingClientRect();
      const above = rect.top > box.height + 18;
      els.tooltip.classList.toggle('tip-above', above);
      els.tooltip.classList.toggle('tip-below', !above);
      els.tooltip.style.left = Math.max(8, Math.min(
        window.innerWidth - box.width - 8,
        rect.left + rect.width / 2 - box.width / 2,
      )) + 'px';
      els.tooltip.style.top = (above ? rect.top - box.height - 12 : rect.bottom + 12) + 'px';
    };
    const hide = () => {
      els.tooltip.classList.remove('visible');
      els.tooltip.setAttribute('aria-hidden', 'true');
    };
    els.modelToggles.forEach((button) => {
      button.addEventListener('mouseenter', () => show(button));
      button.addEventListener('focus', () => show(button));
      button.addEventListener('mouseleave', hide);
      button.addEventListener('blur', hide);
      button.addEventListener('click', hide);
    });
    window.addEventListener('scroll', hide, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Controles
   * ------------------------------------------------------------------ */

  function initControls() {
    // Subida
    els.uploadZone.addEventListener('click', () => els.imageInput.click());
    els.uploadZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        els.imageInput.click();
      }
    });
    ['dragenter', 'dragover'].forEach((type) => {
      els.uploadZone.addEventListener(type, (event) => {
        event.preventDefault();
        els.uploadZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      els.uploadZone.addEventListener(type, (event) => {
        event.preventDefault();
        els.uploadZone.classList.remove('dragover');
      });
    });
    els.uploadZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (file) handleFile(file);
    });
    els.imageInput.addEventListener('change', () => {
      const file = els.imageInput.files ? els.imageInput.files[0] : null;
      if (file) handleFile(file);
    });
    els.removeImageBtn.addEventListener('click', clearImage);
    els.analyzeBtn.addEventListener('click', analyzeImage);
    els.resetBtn.addEventListener('click', resetAll);

    // Subida del paso 3 (imagen a la que se aplica el prompt)
    els.targetZone.addEventListener('click', () => els.targetInput.click());
    els.targetZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        els.targetInput.click();
      }
    });
    ['dragenter', 'dragover'].forEach((type) => {
      els.targetZone.addEventListener(type, (event) => {
        event.preventDefault();
        els.targetZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      els.targetZone.addEventListener(type, (event) => {
        event.preventDefault();
        els.targetZone.classList.remove('dragover');
      });
    });
    els.targetZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (file) handleTargetFile(file);
    });
    els.targetInput.addEventListener('change', () => {
      const file = els.targetInput.files ? els.targetInput.files[0] : null;
      if (file) handleTargetFile(file);
    });
    els.targetRemoveBtn.addEventListener('click', clearTargetImage);

    // JSON
    els.jsonText.addEventListener('input', () => updateJsonAvailability());
    els.jsonFormatBtn.addEventListener('click', formatJson);
    els.jsonCopyBtn.addEventListener('click', () => copyText(els.jsonText.value, 'JSON copiado.'));
    els.jsonDownloadBtn.addEventListener('click', () => {
      downloadBlob(els.jsonText.value, safeFileName('analisis_' + (state.fileName || 'imagen').replace(/\.[^.]+$/, ''), 'json'), 'application/json;charset=utf-8');
    });
    els.jsonReanalyzeBtn.addEventListener('click', analyzeImage);

    // Prompt
    els.pillToggles.forEach((button) => {
      button.addEventListener('click', () => {
        els.pillToggles.forEach((item) => {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        state.language = button.dataset.lang || 'es';
      });
    });

    // Fondo del paso final (por defecto: el de la imagen del usuario).
    // Con guarda: un HTML antiguo cacheado puede no traer estos controles y el
    // arranque entero no debe caerse por eso.
    if (els.bgToggles.length && els.bgImageBtn && els.bgImageInput && els.bgImageRemove && els.bgColorInput) {
      els.bgToggles.forEach((button) => {
        button.addEventListener('click', () => {
          els.bgToggles.forEach((item) => {
            item.classList.remove('active');
            item.setAttribute('aria-pressed', 'false');
          });
          button.classList.add('active');
          button.setAttribute('aria-pressed', 'true');
          setBackgroundMode(button.dataset.bg || 'keep');
        });
      });
      els.bgImageBtn.addEventListener('click', () => els.bgImageInput.click());
      els.bgImageInput.addEventListener('change', () => {
        const file = els.bgImageInput.files ? els.bgImageInput.files[0] : null;
        if (file) handleBackgroundFile(file);
      });
      els.bgImageRemove.addEventListener('click', clearBackgroundImage);
      els.bgColorInput.addEventListener('input', () => {
        state.backgroundColor = String(els.bgColorInput.value || '').toUpperCase();
        els.bgColorValue.textContent = state.backgroundColor || '—';
      });
    }

    els.promptBtn.addEventListener('click', generatePrompt);
    els.promptRegenBtn.addEventListener('click', generatePrompt);
    els.promptCopyBtn.addEventListener('click', () => copyText(els.promptText.value, 'Prompt universal copiado.'));
    els.promptDownloadBtn.addEventListener('click', () => {
      downloadBlob(els.promptText.value, safeFileName('prompt_universal_' + (state.fileName || 'imagen').replace(/\.[^.]+$/, ''), 'txt'), 'text/plain;charset=utf-8');
    });

    // Modelo, relación de aspecto y resolución
    els.modelToggles.forEach((button) => {
      button.addEventListener('click', () => {
        els.modelToggles.forEach((item) => {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        state.selectedModel = button.dataset.model || 'openai-image-2-low';
      });
    });
    els.aspectButtons.forEach((button) => {
      button.addEventListener('click', () => selectAspectRatio(button.dataset.ratio || '1:1'));
    });
    els.resolutionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        els.resolutionButtons.forEach((item) => {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        state.resolution = parseInt(button.dataset.resolution, 10) || 1024;
      });
    });
    els.generateBtn.addEventListener('click', generateImage);

    // Resultado
    els.resultImage.addEventListener('click', () => {
      if (state.resultDataUrl) lightboxOpen(state.resultDataUrl);
    });
    els.resultZoomBtn.addEventListener('click', () => {
      if (state.resultDataUrl) lightboxOpen(state.resultDataUrl);
    });
    els.resultDownloadBtn.addEventListener('click', () => {
      if (!state.resultDataUrl) return;
      downloadBlob(dataUrlToBlob(state.resultDataUrl), safeFileName('imagen_final_' + (state.fileName || 'imagen').replace(/\.[^.]+$/, ''), 'png'), 'image/png');
    });

    // Lightbox
    els.lightbox.addEventListener('click', (event) => {
      if (event.target === els.lightbox || event.target === els.lightboxImg) lightboxClose();
    });
    els.lightboxClose.addEventListener('click', lightboxClose);

    // Historial
    els.historyClearBtn.addEventListener('click', async () => {
      if (!history || !window.confirm('¿Eliminar todo el historial?')) return;
      try {
        await history.clear();
      } catch (error) {
        els.historyStatus.textContent = 'No se pudo limpiar el historial.';
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !els.lightbox.classList.contains('hidden')) lightboxClose();
    });
  }

  function resetAll() {
    clearImage();
    clearTargetImage();
    clearBackgroundImage();
    state.backgroundMode = 'keep';
    state.backgroundColor = '#1B2A33';
    if (els.bgColorInput) {
      els.bgColorInput.value = '#1B2A33';
      els.bgColorValue.textContent = '#1B2A33';
      els.bgColorRow.classList.add('hidden');
      els.bgImageRow.classList.add('hidden');
      els.bgToggles.forEach((item) => {
        const activo = item.dataset.bg === 'keep';
        item.classList.toggle('active', activo);
        item.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
    }
    lockStep(els.paso3, true);
    els.paso3.classList.remove('ready');
    clearError();
    state.jsonText = '';
    state.jsonModel = '';
    state.prompt = '';
    state.promptJsonHash = '';
    state.resultDataUrl = '';
    els.jsonText.value = '';
    els.jsonText.disabled = true;
    els.jsonChip.textContent = 'Pendiente';
    els.jsonChip.className = 'status-chip';
    els.jsonState.textContent = 'Sin analizar';
    els.jsonState.className = 'mini-chip';
    els.jsonSize.textContent = '0 caracteres';
    els.jsonModel.textContent = '—';
    [els.jsonFormatBtn, els.jsonCopyBtn, els.jsonDownloadBtn, els.jsonReanalyzeBtn].forEach((button) => { button.disabled = true; });
    lockStep(els.paso2, true);
    els.paso2.classList.remove('ready');

    els.promptText.value = '';
    els.promptText.disabled = true;
    els.promptChip.textContent = 'Pendiente';
    els.promptChip.className = 'status-chip';
    els.promptTrace.textContent = 'Sin generar';
    els.promptStale.hidden = true;
    els.backgroundCard.classList.add('hidden');
    [els.promptCopyBtn, els.promptDownloadBtn, els.promptRegenBtn].forEach((button) => { button.disabled = true; });
    lockStep(els.paso4, true);
    els.paso4.classList.remove('ready');
    renderAnchors('');

    els.resultImage.classList.add('hidden');
    els.resultImage.removeAttribute('src');
    els.resultPlaceholder.classList.remove('hidden');
    els.resultMeta.textContent = '—';
    els.resultDownloadBtn.disabled = true;
    els.resultZoomBtn.disabled = true;
    els.resultChip.textContent = 'Pendiente';
    els.resultChip.className = 'status-chip';
    lockStep(els.paso5, true);
    els.paso5.classList.remove('ready');
    els.generateBtn.disabled = true;
    els.paso1.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */

  function init() {
    initControls();
    initModelTooltip();
    renderAnchors('');
    updateJsonAvailability();
    setBusy(false);
    Promise.allSettled([initHistory(), checkService()]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
