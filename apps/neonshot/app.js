/* ==========================================================================
   NeonShot — lógica de la app
   - Captura de pantalla (getDisplayMedia), archivo, arrastrar o pegar
   - Selección de zona con tamaño/coordenadas en vivo (como Lightshot)
   - Anotaciones vectoriales con deshacer/rehacer
   - Exportación con formato y calidad configurables
   - Subida al servidor con hasta 20 reintentos y copia del enlace
   - Historial persistente server-side (history.php) + lightbox
   ========================================================================== */
(() => {
  'use strict';

  const APP_NAME = 'neonshot';
  const MAX_UPLOAD_RETRIES = 20; // igual que el bucle de subida de Lightshot

  // ------------------------------ Estado ------------------------------
  let baseCanvas = null;          // imagen original a resolución nativa
  let ops = [];                   // anotaciones confirmadas
  let redoStack = [];
  let selection = null;           // {x,y,w,h} en coordenadas de la imagen
  let currentTool = 'select';
  let currentColor = '#00D0D0';
  let currentWidth = 4;
  let currentFormat = 'image/png';
  let quality = 0.92;
  let stepCounter = 0;
  let drag = null;                // arrastre en curso
  let textDraft = null;           // texto pendiente de confirmar
  let busy = false;
  let history = null;
  let lastObjectUrl = null;

  // ------------------------------ DOM ------------------------------
  const $ = (id) => document.getElementById(id);
  const panelCaptura = $('capture-panel');
  const panelEditor = $('editor-panel');
  const panelResult = $('result-panel');
  const canvas = $('editor-canvas');
  const ctx = canvas.getContext('2d');
  const canvasWrap = $('canvas-wrap');
  const sizeBadge = $('size-badge');
  const textInput = $('text-input');
  const captureStatus = $('capture-status');
  const editorStatus = $('editor-status');
  const overlay = $('loadingOverlay');
  const loadingText = $('loadingText');
  const loadingSub = $('loadingSub');
  const historyGrid = $('history-grid');
  const historyTitle = $('history-title');
  const historyClearBtn = $('history-clear-btn');
  const lightbox = $('lightbox');
  const lightboxImg = $('lightbox-img');

  // ------------------------------ Utilidades ------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', Boolean(isError));
  }

  function showOverlay(main, sub) {
    loadingText.textContent = main;
    loadingSub.textContent = sub || '';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-busy', 'true');
    document.body.style.overflow = 'hidden';
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-busy', 'false');
    document.body.style.overflow = '';
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ------------------------------ Carga de imagen ------------------------------
  function loadFromCanvas(source) {
    baseCanvas = document.createElement('canvas');
    baseCanvas.width = source.width;
    baseCanvas.height = source.height;
    baseCanvas.getContext('2d').drawImage(source, 0, 0);

    canvas.width = source.width;
    canvas.height = source.height;
    canvas.style.aspectRatio = `${source.width} / ${source.height}`;

    ops = [];
    redoStack = [];
    stepCounter = 0;
    selection = { x: 0, y: 0, w: source.width, h: source.height };

    panelEditor.classList.remove('hidden');
    panelResult.classList.add('hidden');
    updateSelectionBadge();
    render();
    setStatus(captureStatus, '');
    setStatus(editorStatus, `Imagen cargada: ${source.width} × ${source.height} px.`);
    panelEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadFromImageElement(img) {
    loadFromCanvas(img);
  }

  /**
   * Decodifica un archivo de imagen sin usar blob: (la CSP del sitio solo permite
   * img-src 'self' data: https:, así que createObjectURL queda bloqueado en producción).
   */
  async function decodeImageFile(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        loadFromCanvas(bitmap);
        if (bitmap.close) bitmap.close();
        return;
      } catch (err) { /* se intenta el respaldo */ }
    }
    await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => { loadFromImageElement(img); resolve(); };
        img.onerror = () => reject(new Error('No se ha podido decodificar la imagen.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('No se ha podido leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  async function loadFromFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus(captureStatus, 'El archivo no es una imagen compatible.', true);
      return;
    }
    try {
      await decodeImageFile(file);
    } catch (err) {
      setStatus(captureStatus, 'No se ha podido leer la imagen: ' + err.message, true);
    }
  }

  async function captureScreen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatus(captureStatus, 'Tu navegador no permite capturar la pantalla. Usa «Abrir imagen» o pega con Ctrl+V.', true);
      return;
    }
    setStatus(captureStatus, 'Elige qué compartir en el diálogo del navegador…');
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false });
    } catch (err) {
      setStatus(captureStatus, 'Captura cancelada o denegada por el navegador.', true);
      return;
    }
    try {
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await sleep(220); // deja estabilizar el primer fotograma
      const shot = document.createElement('canvas');
      shot.width = video.videoWidth;
      shot.height = video.videoHeight;
      shot.getContext('2d').drawImage(video, 0, 0);
      track.stop();
      loadFromCanvas(shot);
      setStatus(captureStatus, '');
    } catch (err) {
      setStatus(captureStatus, 'No se ha podido tomar el fotograma: ' + err.message, true);
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  // ------------------------------ Render ------------------------------
  function drawOps(target, list, originX, originY, srcCanvas) {
    const inv = (p) => ({ x: p.x - originX, y: p.y - originY });

    list.forEach((op) => {
      target.save();
      target.lineJoin = 'round';
      target.lineCap = 'round';

      if (op.tool === 'blur') {
        const x = Math.min(op.a.x, op.b.x) - originX;
        const y = Math.min(op.a.y, op.b.y) - originY;
        const w = Math.abs(op.b.x - op.a.x);
        const h = Math.abs(op.b.y - op.a.y);
        if (w > 2 && h > 2) {
          const small = document.createElement('canvas');
          const factor = Math.max(6, Math.round(Math.min(w, h) / 8));
          small.width = Math.max(1, Math.round(w / factor));
          small.height = Math.max(1, Math.round(h / factor));
          const sctx = small.getContext('2d');
          sctx.imageSmoothingEnabled = true;
          sctx.drawImage(srcCanvas, op.a.x < op.b.x ? op.a.x : op.b.x, op.a.y < op.b.y ? op.a.y : op.b.y, w, h, 0, 0, small.width, small.height);
          target.imageSmoothingEnabled = false;
          target.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
        }
        target.restore();
        return;
      }

      target.strokeStyle = op.color;
      target.fillStyle = op.color;
      target.lineWidth = op.width;
      target.globalAlpha = op.tool === 'highlight' ? 0.35 : 1;

      if (op.tool === 'pencil' || op.tool === 'highlight') {
        if (op.points.length > 1) {
          target.beginPath();
          const p0 = inv(op.points[0]);
          target.moveTo(p0.x, p0.y);
          for (let i = 1; i < op.points.length; i++) {
            const p = inv(op.points[i]);
            target.lineTo(p.x, p.y);
          }
          target.stroke();
        }
      } else if (op.tool === 'line' || op.tool === 'arrow') {
        const a = inv(op.a);
        const b = inv(op.b);
        target.beginPath();
        target.moveTo(a.x, a.y);
        target.lineTo(b.x, b.y);
        target.stroke();
        if (op.tool === 'arrow') {
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const head = Math.max(10, op.width * 3.2);
          target.beginPath();
          target.moveTo(b.x, b.y);
          target.lineTo(b.x - head * Math.cos(angle - Math.PI / 7), b.y - head * Math.sin(angle - Math.PI / 7));
          target.lineTo(b.x - head * Math.cos(angle + Math.PI / 7), b.y - head * Math.sin(angle + Math.PI / 7));
          target.closePath();
          target.fill();
        }
      } else if (op.tool === 'rect') {
        const a = inv(op.a);
        const b = inv(op.b);
        target.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      } else if (op.tool === 'ellipse') {
        const a = inv(op.a);
        const b = inv(op.b);
        target.beginPath();
        target.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
        target.stroke();
      } else if (op.tool === 'step') {
        const p = inv({ x: op.x, y: op.y });
        const r = Math.max(12, op.width * 3.4);
        target.beginPath();
        target.arc(p.x, p.y, r, 0, Math.PI * 2);
        target.fill();
        target.fillStyle = '#0B1B22';
        target.font = `bold ${Math.round(r * 1.2)}px ${getComputedStyle(document.body).fontFamily}`;
        target.textAlign = 'center';
        target.textBaseline = 'middle';
        target.fillText(String(op.n), p.x, p.y + 1);
      } else if (op.tool === 'text') {
        const p = inv({ x: op.x, y: op.y });
        target.font = `${Math.round(op.width * 5 + 12)}px ${getComputedStyle(document.body).fontFamily}`;
        target.textAlign = 'left';
        target.textBaseline = 'top';
        target.lineWidth = Math.max(2, op.width / 2);
        target.strokeStyle = 'rgba(0,0,0,0.65)';
        target.strokeText(op.text, p.x, p.y);
        target.fillStyle = op.color;
        target.fillText(op.text, p.x, p.y);
      }
      target.restore();
    });
  }

  function render() {
    if (!baseCanvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);

    if (selection && (selection.w < canvas.width || selection.h < canvas.height)) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 8, 14, 0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.rect(selection.x, selection.y, selection.w, selection.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#00D0D0';
      ctx.lineWidth = Math.max(1.5, canvas.width / 800);
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();
    drawOps(ctx, ops, 0, 0, baseCanvas);
    if (drag && drag.preview) drawOps(ctx, [drag.preview], 0, 0, baseCanvas);
    ctx.restore();
  }

  function updateSelectionBadge() {
    if (!selection) {
      sizeBadge.textContent = 'Sin selección';
      return;
    }
    sizeBadge.textContent = `${Math.round(selection.w)} × ${Math.round(selection.h)} px · (${Math.round(selection.x)}, ${Math.round(selection.y)})`;
  }

  // ------------------------------ Interacción ------------------------------
  function pointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(canvas.width, (evt.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (evt.clientY - rect.top) * scaleY)),
    };
  }

  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    canvas.style.cursor = tool === 'select' ? 'crosshair' : (tool === 'text' || tool === 'step' ? 'copy' : 'crosshair');
    hideTextInput();
  }

  function hideTextInput() {
    textInput.classList.add('hidden');
    textInput.value = '';
    textDraft = null;
  }

  function showTextInput(x, y) {
    const rect = canvas.getBoundingClientRect();
    const wrapRect = canvasWrap.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    textInput.style.left = `${rect.left - wrapRect.left + x * scaleX}px`;
    textInput.style.top = `${rect.top - wrapRect.top + y * scaleY}px`;
    textInput.classList.remove('hidden');
    textInput.focus();
    textDraft = { x, y };
  }

  function commitText() {
    if (!textDraft) return;
    const value = textInput.value.trim();
    if (value) {
      pushOp({ tool: 'text', color: currentColor, width: currentWidth, x: textDraft.x, y: textDraft.y, text: value });
    }
    hideTextInput();
  }

  function pushOp(op) {
    ops.push(op);
    redoStack = [];
    render();
  }

  canvas.addEventListener('pointerdown', (evt) => {
    if (!baseCanvas) return;
    const p = pointerPos(evt);
    try { canvas.setPointerCapture(evt.pointerId); } catch (err) { /* punteros sintéticos o sin captura */ }

    if (currentTool === 'select') {
      drag = { kind: 'select', start: p };
      selection = { x: p.x, y: p.y, w: 0, h: 0 };
      updateSelectionBadge();
      render();
      return;
    }

    if (currentTool === 'step') {
      stepCounter += 1;
      pushOp({ tool: 'step', color: currentColor, width: currentWidth, x: p.x, y: p.y, n: stepCounter });
      return;
    }

    if (currentTool === 'text') {
      commitText();
      showTextInput(p.x, p.y);
      return;
    }

    if (currentTool === 'pencil' || currentTool === 'highlight') {
      drag = { kind: 'free', preview: { tool: currentTool, color: currentColor, width: currentWidth, points: [p] } };
    } else {
      drag = { kind: 'shape', preview: { tool: currentTool, color: currentColor, width: currentWidth, a: p, b: p } };
    }
    render();
  });

  canvas.addEventListener('pointermove', (evt) => {
    if (!drag || !baseCanvas) return;
    const p = pointerPos(evt);

    if (drag.kind === 'select') {
      selection = {
        x: Math.min(drag.start.x, p.x),
        y: Math.min(drag.start.y, p.y),
        w: Math.abs(p.x - drag.start.x),
        h: Math.abs(p.y - drag.start.y),
      };
      updateSelectionBadge();
      render();
      return;
    }

    if (drag.kind === 'free') {
      drag.preview.points.push(p);
    } else if (drag.kind === 'shape') {
      drag.preview.b = p;
    }
    render();
  });

  function endDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;

    if (d.kind === 'select') {
      if (selection && (selection.w < 4 || selection.h < 4)) {
        selection = { x: 0, y: 0, w: baseCanvas.width, h: baseCanvas.height };
      }
      updateSelectionBadge();
      render();
      setStatus(editorStatus, `Zona seleccionada: ${Math.round(selection.w)} × ${Math.round(selection.h)} px.`);
      return;
    }

    const preview = d.preview;
    if (preview.tool === 'pencil' || preview.tool === 'highlight') {
      if (preview.points.length > 1) pushOp(preview);
      else render();
      return;
    }
    if (Math.abs(preview.b.x - preview.a.x) > 2 || Math.abs(preview.b.y - preview.a.y) > 2) {
      pushOp(preview);
    } else {
      render();
    }
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', (evt) => { if (drag && evt.buttons === 0) endDrag(); });

  textInput.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter') { evt.preventDefault(); commitText(); }
    if (evt.key === 'Escape') { evt.preventDefault(); hideTextInput(); }
  });
  textInput.addEventListener('blur', commitText);
  canvasWrap.addEventListener('pointerdown', (evt) => {
    if (evt.target !== canvas && evt.target !== textInput) commitText();
  });

  // ------------------------------ Exportación ------------------------------
  function exportArea() {
    if (!baseCanvas) return null;
    const area = selection || { x: 0, y: 0, w: baseCanvas.width, h: baseCanvas.height };
    const x = Math.max(0, Math.min(baseCanvas.width - 1, Math.round(area.x)));
    const y = Math.max(0, Math.min(baseCanvas.height - 1, Math.round(area.y)));
    const w = Math.max(1, Math.min(baseCanvas.width - x, Math.round(area.w)));
    const h = Math.max(1, Math.min(baseCanvas.height - y, Math.round(area.h)));
    return { x, y, w, h };
  }

  function buildExportCanvas() {
    const area = exportArea();
    const out = document.createElement('canvas');
    out.width = area.w;
    out.height = area.h;
    const octx = out.getContext('2d');
    if (currentFormat === 'image/jpeg') {
      octx.fillStyle = '#0B1B22';
      octx.fillRect(0, 0, out.width, out.height);
    }
    octx.drawImage(baseCanvas, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);
    octx.save();
    octx.beginPath();
    octx.rect(0, 0, out.width, out.height);
    octx.clip();
    drawOps(octx, ops, area.x, area.y, baseCanvas);
    octx.restore();
    return out;
  }

  function canvasToBlob(target) {
    return new Promise((resolve) => target.toBlob((blob) => resolve(blob), currentFormat, quality));
  }

  function timestampName(ext) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `neonshot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
  }

  function extFor(format) {
    if (format === 'image/jpeg') return 'jpg';
    if (format === 'image/webp') return 'webp';
    return 'png';
  }

  async function downloadImage() {
    if (!baseCanvas || busy) return;
    busy = true;
    showOverlay('Preparando la descarga...', 'Aplicando anotaciones y recortando la selección.');
    try {
      const out = buildExportCanvas();
      const blob = await canvasToBlob(out);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = timestampName(extFor(currentFormat));
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus(editorStatus, `Descarga lista: ${out.width} × ${out.height} px · ${formatBytes(blob.size)}`);
    } catch (err) {
      setStatus(editorStatus, 'No se ha podido generar el archivo: ' + err.message, true);
    } finally {
      busy = false;
      hideOverlay();
    }
  }

  // ------------------------------ Subida ------------------------------
  async function uploadWithRetries(blob, filename) {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      loadingSub.textContent = `Subiendo captura… intento ${attempt} de ${MAX_UPLOAD_RETRIES}`;
      try {
        const fd = new FormData();
        fd.append('image', blob, filename);
        const res = await fetch('upload.php', { method: 'POST', body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok) {
          throw new Error((data && data.error) ? data.error : `El servidor respondió ${res.status}`);
        }
        return data;
      } catch (err) {
        lastError = err;
        if (attempt === MAX_UPLOAD_RETRIES) break;
        await sleep(Math.min(3000, 250 * attempt));
      }
    }
    throw lastError || new Error('No se ha podido subir la captura.');
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) { /* probamos el método clásico */ }
    try {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      tmp.setAttribute('readonly', '');
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      const ok = document.execCommand('copy');
      tmp.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  async function uploadImage() {
    if (!baseCanvas || busy) return;
    busy = true;
    const uploadBtn = $('btn-upload');
    uploadBtn.disabled = true;
    uploadBtn.setAttribute('aria-disabled', 'true');
    showOverlay('Procesando la captura...', 'Preparando la imagen para subirla.');
    try {
      const out = buildExportCanvas();
      const blob = await canvasToBlob(out);
      const filename = timestampName(extFor(currentFormat));
      const data = await uploadWithRetries(blob, filename);

      $('result-url').value = data.url;
      $('link-open').href = data.url;
      panelResult.classList.remove('hidden');
      $('upload-detail').textContent = `${out.width} × ${out.height} px · ${formatBytes(data.bytes || blob.size)} · ${extFor(currentFormat).toUpperCase()}`;

      const copied = await copyToClipboard(data.url);
      setStatus(editorStatus, copied ? 'Enlace copiado al portapapeles.' : 'Enlace generado. Pulsa COPIAR para copiarlo.');

      if (history) {
        try {
          await history.save({ type: 'image', data: { url: data.url, width: out.width, height: out.height, format: extFor(currentFormat) } });
        } catch (err) {
          setStatus(editorStatus, 'La captura se subió, pero no se pudo guardar en el historial: ' + err.message, true);
        }
      }
    } catch (err) {
      setStatus(editorStatus, 'No se ha podido subir la captura tras ' + MAX_UPLOAD_RETRIES + ' intentos: ' + err.message, true);
    } finally {
      hideOverlay();
      uploadBtn.disabled = false;
      uploadBtn.removeAttribute('aria-disabled');
      busy = false;
    }
  }

  // ------------------------------ Historial ------------------------------
  function renderHistoryFromState() {
    if (!historyGrid) return;
    const items = (history && history.getAll()) || [];
    if (!items.length) {
      historyGrid.innerHTML = '';
      if (historyTitle) historyTitle.style.display = 'none';
      if (historyClearBtn) historyClearBtn.style.display = 'none';
      return;
    }
    if (historyTitle) historyTitle.style.display = 'block';
    if (historyClearBtn) historyClearBtn.style.display = 'block';

    historyGrid.innerHTML = '';
    items.forEach((item) => {
      const url = (item.data && item.data.url) || item.imageUrl || '';
      const wrap = document.createElement('div');
      wrap.className = 'history-item-wrap';

      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Captura del historial';
      img.loading = 'lazy';
      img.addEventListener('click', () => window._openLightbox(url));

      const del = document.createElement('button');
      del.className = 'btn-square';
      del.type = 'button';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Eliminar del historial');
      del.addEventListener('click', (evt) => {
        evt.stopPropagation();
        window._deleteHistoryItem(item.id);
      });

      const date = document.createElement('span');
      date.className = 'history-date';
      date.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';

      wrap.append(img, del, date);
      historyGrid.appendChild(wrap);
    });
  }

  let lastFocused = null;

  window._openLightbox = (url) => {
    lastFocused = document.activeElement;
    lightboxImg.src = url;
    lightbox.classList.remove('hidden');
    lightboxImg.focus();
  };

  window._closeLightbox = () => {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  };

  window._deleteHistoryItem = async (id) => {
    if (!history) return;
    if (!confirm('¿Eliminar esta captura del historial?')) return;
    try {
      await history.delete(id);
      renderHistoryFromState();
    } catch (err) {
      setStatus(editorStatus, 'No se ha podido eliminar: ' + err.message, true);
    }
  };

  async function clearHistory() {
    if (!history) return;
    if (!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')) return;
    try {
      await history.clear();
      renderHistoryFromState();
      setStatus(editorStatus, 'Historial vaciado.');
    } catch (err) {
      setStatus(editorStatus, 'No se ha podido vaciar el historial: ' + err.message, true);
    }
  }

  async function checkServerHealth() {
    const line = document.createElement('p');
    line.className = 'hint';
    line.id = 'health-status';
    line.textContent = 'Comprobando servidor…';
    $('history-section').appendChild(line);
    try {
      // proxy.php espera POST con cuerpo JSON: { action: 'health' }
      const res = await fetch('proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health' }),
        cache: 'no-store',
      });
      const data = await res.json();
      line.textContent = data && data.success
        ? 'Servidor: OK'
        : 'Servidor: respuesta inesperada del proxy.';
    } catch (err) {
      line.textContent = 'Servidor: sin conexión (la subida e historial no funcionarán).';
      line.classList.add('is-error');
    }
  }

  // ------------------------------ Eventos ------------------------------
  function bindUi() {
    $('btn-capture').addEventListener('click', captureScreen);
    $('btn-paste').addEventListener('click', async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) {
            loadFromFile(new File([await item.getType(type)], 'portapapeles.png', { type }));
            return;
          }
        }
        setStatus(captureStatus, 'No hay ninguna imagen en el portapapeles.', true);
      } catch (err) {
        setStatus(captureStatus, 'Pega con Ctrl+V o concede permiso de lectura del portapapeles.', true);
      }
    });

    $('btn-open-file').addEventListener('click', () => $('file-input').click());

    $('file-input').addEventListener('change', (evt) => {
      const file = evt.target.files && evt.target.files[0];
      if (file) loadFromFile(file);
      evt.target.value = '';
    });

    const dropZone = $('drop-zone');
    dropZone.addEventListener('click', () => $('file-input').click());
    dropZone.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); $('file-input').click(); }
    });
    ['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (evt) => {
      evt.preventDefault();
      dropZone.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, (evt) => {
      evt.preventDefault();
      dropZone.classList.remove('is-over');
    }));
    dropZone.addEventListener('drop', (evt) => {
      const file = evt.dataTransfer.files && evt.dataTransfer.files[0];
      if (file) loadFromFile(file);
    });

    document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });

    document.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentColor = btn.dataset.color;
        document.querySelectorAll('.swatch').forEach((s) => {
          const active = s === btn;
          s.classList.toggle('is-active', active);
          s.setAttribute('aria-checked', String(active));
        });
      });
    });

    $('brush-size').addEventListener('input', (evt) => {
      currentWidth = Number(evt.target.value);
      $('brush-size-value').textContent = `${currentWidth} px`;
    });

    document.querySelectorAll('.pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFormat = btn.dataset.format;
        document.querySelectorAll('.pill').forEach((p) => {
          const active = p === btn;
          p.classList.toggle('is-active', active);
          p.setAttribute('aria-checked', String(active));
        });
      });
    });

    $('quality-range').addEventListener('input', (evt) => {
      quality = Number(evt.target.value) / 100;
      $('quality-value').textContent = `${evt.target.value} %`;
    });

    $('btn-undo').addEventListener('click', () => {
      if (!ops.length) return;
      redoStack.push(ops.pop());
      render();
    });
    $('btn-redo').addEventListener('click', () => {
      if (!redoStack.length) return;
      ops.push(redoStack.pop());
      render();
    });
    $('btn-clear-annotations').addEventListener('click', () => {
      if (!ops.length) return;
      ops = [];
      redoStack = [];
      stepCounter = 0;
      render();
    });
    $('btn-reset-selection').addEventListener('click', () => {
      if (!baseCanvas) return;
      selection = { x: 0, y: 0, w: baseCanvas.width, h: baseCanvas.height };
      updateSelectionBadge();
      setTool('select');
      render();
    });

    $('btn-download').addEventListener('click', downloadImage);
    $('btn-upload').addEventListener('click', uploadImage);
    $('btn-copy').addEventListener('click', async () => {
      const url = $('result-url').value;
      const ok = await copyToClipboard(url);
      setStatus(editorStatus, ok ? 'Enlace copiado al portapapeles.' : 'No se ha podido copiar; selecciona el texto y copia a mano.', !ok);
    });

    historyClearBtn.addEventListener('click', clearHistory);
    lightbox.addEventListener('click', window._closeLightbox);

    document.addEventListener('paste', (evt) => {
      const items = evt.clipboardData && evt.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          loadFromFile(item.getAsFile());
          evt.preventDefault();
          return;
        }
      }
    });

    document.addEventListener('keydown', (evt) => {
      const typing = evt.target === textInput;
      if (evt.key === 'Escape') {
        if (!lightbox.classList.contains('hidden')) { window._closeLightbox(); return; }
        if (typing) { hideTextInput(); return; }
        if (drag) { drag = null; render(); }
        return;
      }
      if (evt.key === 'Tab' && !lightbox.classList.contains('hidden')) {
        evt.preventDefault(); // el lightbox retiene el foco mientras está abierto
        lightboxImg.focus();
        return;
      }
      if (typing) return;
      const mod = evt.ctrlKey || evt.metaKey;
      if (mod && evt.key.toLowerCase() === 'z' && !evt.shiftKey) { evt.preventDefault(); $('btn-undo').click(); }
      else if (mod && (evt.key.toLowerCase() === 'y' || (evt.key.toLowerCase() === 'z' && evt.shiftKey))) { evt.preventDefault(); $('btn-redo').click(); }
      else if (mod && evt.key.toLowerCase() === 's') { evt.preventDefault(); downloadImage(); }
    });

    window.addEventListener('resize', () => { if (baseCanvas) render(); });
  }

  // ------------------------------ Arranque ------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    bindUi();
    setTool('select');
    checkServerHealth();

    try {
      history = new HistoryManager(APP_NAME);
      await history.load();
      renderHistoryFromState();
      history.onChange(() => renderHistoryFromState());
    } catch (err) {
      console.warn('Historial no disponible:', err);
      history = null;
    }
  });
})();
