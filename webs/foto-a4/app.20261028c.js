/* ============================================================
   Foto A4 — compositor móvil de fotos sobre folio A4
   Lienzo a ancho completo, sin dependencias.
   ============================================================ */
(() => {
  'use strict';

  const PAGE = { w: 210, h: 297 };
  const PX_PER_MM = 96 / 25.4;
  const MIN_MM = 4;
  const MAX_HISTORY = 40;
  const PRINT_DPI = 300;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    page: $('#page'),
    layer: $('#layer-items'),
    handles: $('#handles'),
    sheet: $('#sheet'),
    stage: $('#stage'),
    stageScroll: $('#stage-scroll'),
    selBar: $('#sel-bar'),
    galleryList: $('#gallery-list'),
    galleryEmpty: $('#gallery-empty'),
    galleryCount: $('#gallery-count'),
    toast: $('#toast'),
    fileInput: $('#file-input'),
    projectInput: $('#project-input'),
    modalExport: $('#modal-export'),
    modalHelp: $('#modal-help'),
    undo: $('#btn-undo'),
    redo: $('#btn-redo')
  };

  /* ---------------- estado ---------------- */

  let items = [];
  let selectedId = null;
  let zoom = 0.5;

  /** imgId -> { el, blob, url, name, w, h } */
  const images = new Map();
  const history = { past: [], future: [] };

  let drag = null;
  let autosaveTimer = 0;
  const savedImgIds = new Set();
  let uidCounter = 0;

  const uid = (p) => p + Date.now().toString(36).slice(-4) + (++uidCounter).toString(36);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- utilidades ---------------- */

  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('err', !!isError);
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.hidden = true; }, 3600);
  }

  function getSel() {
    return items.find((i) => i.id === selectedId) || null;
  }

  /* ---------------- lienzo a ancho completo ---------------- */

  function applyZoom() {
    const w = PAGE.w * PX_PER_MM * zoom;
    const h = PAGE.h * PX_PER_MM * zoom;
    els.sheet.style.width = w + 'px';
    els.sheet.style.height = h + 'px';
    els.page.style.transform = 'scale(' + zoom + ')';
    els.page.style.setProperty('--z', String(zoom || 1));
  }

  function fitWidth() {
    const w = els.stageScroll.clientWidth;
    if (!w) return;
    zoom = w / (PAGE.w * PX_PER_MM);
    applyZoom();
  }

  /* ---------------- posicionamiento ---------------- */

  function layoutItem(it) {
    const node = els.layer.querySelector('[data-id="' + it.id + '"]');
    if (!node) return;
    node.style.left = it.x + 'mm';
    node.style.top = it.y + 'mm';
    node.style.width = it.w + 'mm';
    node.style.height = it.h + 'mm';
    node.style.transform = 'translate(-50%,-50%) rotate(' + it.rot + 'deg)';
    const img = node.firstElementChild;
    if (img) img.style.transform = 'scaleX(' + (it.fx ? -1 : 1) + ') scaleY(' + (it.fy ? -1 : 1) + ')';
  }

  function updateHandles() {
    const it = getSel();
    if (!it) { els.handles.hidden = true; return; }
    els.handles.hidden = false;
    els.handles.style.left = it.x + 'mm';
    els.handles.style.top = it.y + 'mm';
    els.handles.style.width = it.w + 'mm';
    els.handles.style.height = it.h + 'mm';
    els.handles.style.transform = 'translate(-50%,-50%) rotate(' + it.rot + 'deg)';
  }

  function renderItems() {
    const alive = new Set(items.map((i) => i.id));
    Array.from(els.layer.children).forEach((node) => {
      if (!alive.has(node.dataset.id)) node.remove();
    });

    items.forEach((it, index) => {
      let node = els.layer.querySelector('[data-id="' + it.id + '"]');
      if (!node) {
        node = document.createElement('div');
        node.className = 'item';
        node.dataset.id = it.id;
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        node.appendChild(img);
        els.layer.appendChild(node);
      }
      const rec = images.get(it.imgId);
      const img = node.firstElementChild;
      if (rec && img.getAttribute('src') !== rec.url) img.src = rec.url;
      node.style.zIndex = String(index + 1);
      node.classList.toggle('is-selected', it.id === selectedId);
      layoutItem(it);
    });

    updateHandles();
    renderSelBar();
  }

  /* ---------------- barra de selección ---------------- */

  function renderSelBar() {
    els.selBar.hidden = !getSel();
  }

  function updateHistoryButtons() {
    els.undo.disabled = history.past.length === 0;
    els.redo.disabled = history.future.length === 0;
  }

  /* ---------------- galería ---------------- */

  function dpiOf(it) {
    const rec = images.get(it.imgId);
    if (!rec || !it.w) return 0;
    return rec.w / (it.w / 25.4);
  }

  function renderGallery() {
    els.galleryCount.textContent = String(items.length);
    els.galleryEmpty.hidden = items.length > 0;

    const frag = document.createDocumentFragment();
    items.slice().reverse().forEach((it) => {
      const rec = images.get(it.imgId);
      if (!rec) return;
      const dpi = dpiOf(it);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb' + (it.id === selectedId ? ' is-selected' : '');
      btn.dataset.id = it.id;
      btn.setAttribute('aria-label', 'Seleccionar ' + rec.name);

      const img = document.createElement('img');
      img.src = rec.url;
      img.alt = '';
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'thumb-meta';
      const name = document.createElement('span');
      name.textContent = rec.name;
      const dot = document.createElement('span');
      dot.className = 'thumb-dot ' + (dpi < 150 ? 'low' : dpi < 290 ? 'warn' : '');
      dot.title = Math.round(dpi) + ' ppp al tamaño actual';

      meta.appendChild(name);
      meta.appendChild(dot);
      btn.appendChild(img);
      btn.appendChild(meta);
      frag.appendChild(btn);
    });

    els.galleryList.replaceChildren(frag);
  }

  /* ---------------- añadir imágenes ---------------- */

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f && f.type && f.type.startsWith('image/'));
    if (!files.length) {
      toast('Esos archivos no son imágenes compatibles.', true);
      return;
    }
    const before = snapshot();
    let added = 0;
    for (const file of files) {
      try {
        await addImage(file);
        added++;
      } catch (err) {
        toast('No se pudo abrir «' + (file.name || 'imagen') + '». Formato no compatible.', true);
      }
    }
    if (added) {
      renderItems();
      renderGallery();
      commit(before);
      fitWidth();
      toast(added === 1 ? 'Foto añadida' : added + ' fotos añadidas');
    }
  }

  async function addImage(file) {
    // El CSP del dominio solo permite imágenes `data:`, ni blob: ni http:.
    const url = await blobToDataURL(file);
    const el = new Image();
    el.decoding = 'async';
    await new Promise((resolve, reject) => {
      el.onload = resolve;
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    if (!el.naturalWidth || !el.naturalHeight) throw new Error('empty');

    const imgId = uid('img_');
    images.set(imgId, {
      el: el,
      blob: file,
      url: url,
      name: (file.name || 'foto').replace(/\.[a-z0-9]+$/i, '').slice(0, 42),
      w: el.naturalWidth,
      h: el.naturalHeight
    });

    const ratio = el.naturalWidth / el.naturalHeight;
    let w = PAGE.w * 0.6;
    let h = w / ratio;
    if (h > PAGE.h * 0.6) {
      h = PAGE.h * 0.6;
      w = h * ratio;
    }
    const cascade = ((items.length % 5) - 2) * 4;

    const item = {
      id: uid('it_'),
      imgId: imgId,
      x: PAGE.w / 2 + cascade,
      y: PAGE.h / 2 + cascade,
      w: w,
      h: h,
      rot: 0,
      fx: false,
      fy: false
    };

    items.push(item);
    selectedId = item.id;
  }

  /* ---------------- acciones ---------------- */

  function mirror(axis) {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    if (axis === 'h') it.fx = !it.fx;
    else it.fy = !it.fy;
    layoutItem(it);
    commit(before);
    toast(axis === 'h' ? 'Espejo horizontal' : 'Espejo vertical');
  }

  function rotate90() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    it.rot = ((it.rot + 90) % 360 + 360) % 360;
    if (it.rot > 180) it.rot -= 360;
    layoutItem(it);
    updateHandles();
    commit(before);
  }

  function layerMove(toFront) {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    const idx = items.indexOf(it);
    items.splice(idx, 1);
    if (toFront) items.push(it);
    else items.unshift(it);
    renderItems();
    renderGallery();
    commit(before);
    toast(toFront ? 'Al frente' : 'Al fondo');
  }

  function duplicateItem() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    const copy = Object.assign({}, it, { id: uid('it_'), x: it.x + 8, y: it.y + 8 });
    items.push(copy);
    selectedId = copy.id;
    renderItems();
    renderGallery();
    commit(before);
    toast('Foto duplicada');
  }

  function deleteItem() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    items = items.filter((i) => i.id !== it.id);
    selectedId = items.length ? items[items.length - 1].id : null;
    renderItems();
    renderGallery();
    commit(before);
    toast('Foto eliminada');
  }

  function clearAll() {
    if (!items.length) return;
    const before = snapshot();
    items = [];
    selectedId = null;
    renderItems();
    renderGallery();
    commit(before);
    toast('Lienzo vaciado');
  }

  function doAction(act) {
    if (act === 'mirror-h') mirror('h');
    else if (act === 'mirror-v') mirror('v');
    else if (act === 'rot90') rotate90();
    else if (act === 'front') layerMove(true);
    else if (act === 'back') layerMove(false);
    else if (act === 'duplicate') duplicateItem();
    else if (act === 'delete') deleteItem();
  }

  $$('#sel-bar [data-act]').forEach((btn) => {
    btn.addEventListener('click', () => doAction(btn.dataset.act));
  });

  /* ---------------- historial ---------------- */

  function snapshot() {
    return JSON.stringify({ items: items, selectedId: selectedId });
  }

  function commit(before) {
    const after = snapshot();
    if (after === before) {
      updateHistoryButtons();
      return false;
    }
    history.past.push(before);
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future.length = 0;
    updateHistoryButtons();
    queueAutosave();
    return true;
  }

  function undo() {
    if (!history.past.length) return;
    const current = snapshot();
    const prev = history.past.pop();
    history.future.push(current);
    applySnapshot(prev);
  }

  function applySnapshot(json) {
    const data = JSON.parse(json);
    items = data.items;
    selectedId = data.selectedId;
    renderItems();
    renderGallery();
    updateHistoryButtons();
    queueAutosave();
  }

  /* ---------------- puntero ---------------- */

  els.page.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const rotHandle = ev.target.closest && ev.target.closest('.h-rot');
    const handle = ev.target.closest && ev.target.closest('.handle');
    const itemNode = ev.target.closest && ev.target.closest('.item');
    const p = pointMM(ev);

    if (rotHandle) { startRotate(ev, p); return; }
    if (handle && handle.dataset.h) { startResize(ev, p, handle.dataset.h); return; }
    if (itemNode) {
      const id = itemNode.dataset.id;
      if (id !== selectedId) {
        selectedId = id;
        renderItems();
        renderGallery();
      }
      startMove(ev, p);
      return;
    }
    if (selectedId) {
      selectedId = null;
      renderItems();
      renderGallery();
    }
  });

  function pointMM(ev) {
    const r = els.page.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * PAGE.w,
      y: (ev.clientY - r.top) / r.height * PAGE.h
    };
  }

  function beginDrag(ev, data) {
    drag = Object.assign({ pointerId: ev.pointerId, before: snapshot() }, data);
    try { els.page.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
    ev.preventDefault();
  }

  function startMove(ev, p) {
    const it = getSel();
    if (!it) return;
    beginDrag(ev, { mode: 'move', it: it, start: { x: it.x, y: it.y }, p: p });
  }

  function startRotate(ev, p) {
    const it = getSel();
    if (!it) return;
    const angle = Math.atan2(p.y - it.y, p.x - it.x) * 180 / Math.PI;
    beginDrag(ev, { mode: 'rotate', it: it, a0: angle, rot0: it.rot });
  }

  function startResize(ev, p, dir) {
    const it = getSel();
    if (!it) return;
    const th = it.rot * Math.PI / 180;
    beginDrag(ev, {
      mode: 'resize', it: it, dir: dir,
      cos: Math.cos(th), sin: Math.sin(th),
      w0: it.w, h0: it.h, cx0: it.x, cy0: it.y, p: p
    });
  }

  function onPointerMove(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const it = drag.it;
    const p = pointMM(ev);

    if (drag.mode === 'move') {
      let x = drag.start.x + (p.x - drag.p.x);
      let y = drag.start.y + (p.y - drag.p.y);
      if (Math.abs(x - PAGE.w / 2) < 2) x = PAGE.w / 2;
      if (Math.abs(y - PAGE.h / 2) < 2) y = PAGE.h / 2;
      it.x = clamp(x, -60, PAGE.w + 60);
      it.y = clamp(y, -60, PAGE.h + 60);
      layoutItem(it);
      updateHandles();
      return;
    }

    if (drag.mode === 'rotate') {
      const a = Math.atan2(p.y - it.y, p.x - it.x) * 180 / Math.PI;
      let r = drag.rot0 + (a - drag.a0);
      const snap = Math.round(r / 90) * 90;
      if (Math.abs(r - snap) <= 6) r = snap;
      it.rot = Math.round((((r + 180) % 360) + 360) % 360 - 180);
      layoutItem(it);
      updateHandles();
      return;
    }

    if (drag.mode === 'resize') {
      const dx = p.x - drag.cx0;
      const dy = p.y - drag.cy0;
      const lx = dx * drag.cos + dy * drag.sin;
      const ly = -dx * drag.sin + dy * drag.cos;

      let w = drag.w0;
      let h = drag.h0;
      let offX = 0;
      let offY = 0;
      const dir = drag.dir;
      const hasE = dir.indexOf('e') >= 0;
      const hasW = dir.indexOf('w') >= 0;
      const hasN = dir.indexOf('n') >= 0;
      const hasS = dir.indexOf('s') >= 0;

      if (hasE) { w = Math.max(MIN_MM, lx + drag.w0 / 2); offX = (w - drag.w0) / 2; }
      else if (hasW) { w = Math.max(MIN_MM, drag.w0 / 2 - lx); offX = (drag.w0 - w) / 2; }
      if (hasS) { h = Math.max(MIN_MM, ly + drag.h0 / 2); offY = (h - drag.h0) / 2; }
      else if (hasN) { h = Math.max(MIN_MM, drag.h0 / 2 - ly); offY = (drag.h0 - h) / 2; }

      const isCorner = (hasE || hasW) && (hasN || hasS);
      if (isCorner) {
        const s = Math.max(w / drag.w0, h / drag.h0);
        w = Math.max(MIN_MM, drag.w0 * s);
        h = Math.max(MIN_MM, drag.h0 * s);
        offX = hasE ? (w - drag.w0) / 2 : (drag.w0 - w) / 2;
        offY = hasS ? (h - drag.h0) / 2 : (drag.h0 - h) / 2;
      }

      it.w = w;
      it.h = h;
      it.x = drag.cx0 + offX * drag.cos - offY * drag.sin;
      it.y = drag.cy0 + offX * drag.sin + offY * drag.cos;

      layoutItem(it);
      updateHandles();
    }
  }

  function onPointerUp(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const changed = commit(drag.before);
    drag = null;
    if (changed) renderGallery();
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  /* ---------------- teclado ---------------- */

  function isTyping(target) {
    return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
  }

  document.addEventListener('keydown', (ev) => {
    const modalOpen = $$('.modal').some((m) => !m.hidden);

    if (ev.key === 'Escape') {
      if (modalOpen) { $$('.modal').forEach((m) => { m.hidden = true; }); return; }
      if (selectedId) {
        selectedId = null;
        renderItems();
        renderGallery();
      }
      return;
    }

    if (modalOpen || isTyping(ev.target)) return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      undo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
      ev.preventDefault();
      redo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
      ev.preventDefault();
      duplicateItem();
      return;
    }

    const it = getSel();
    if (!it) return;

    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      deleteItem();
      return;
    }

    const step = ev.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (map[ev.key]) {
      ev.preventDefault();
      const before = snapshot();
      it.x += map[ev.key][0];
      it.y += map[ev.key][1];
      layoutItem(it);
      updateHandles();
      commit(before);
    }
  });

  /* ---------------- undo / redo ---------------- */

  // Pila de estados completa: se guarda el estado ANTERIOR y se aplica al deshacer.
  function undo() {
    if (!history.past.length) return;
    const current = snapshot();
    const prev = history.past.pop();
    history.future.push(current);
    applySnapshot(prev);
  }

  function redo() {
    if (!history.future.length) return;
    const current = snapshot();
    const next = history.future.pop();
    history.past.push(current);
    applySnapshot(next);
  }

  els.undo.addEventListener('click', undo);
  els.redo.addEventListener('click', redo);

  /* ---------------- selección en galería ---------------- */

  els.galleryList.addEventListener('click', (ev) => {
    const thumb = ev.target.closest('.thumb');
    if (!thumb) return;
    selectedId = thumb.dataset.id;
    renderItems();
    renderGallery();
  });

  /* ---------------- añadir / arrastrar / pegar ---------------- */

  $('#btn-add').addEventListener('click', () => els.fileInput.click());
  $('#btn-add-2').addEventListener('click', () => els.fileInput.click());
  $('#btn-clear').addEventListener('click', clearAll);

  els.fileInput.addEventListener('change', () => {
    if (els.fileInput.files && els.fileInput.files.length) addFiles(els.fileInput.files);
    els.fileInput.value = '';
  });

  let dragDepth = 0;
  els.stage.addEventListener('dragenter', (ev) => {
    ev.preventDefault();
    dragDepth++;
    els.stage.classList.add('is-dragover');
  });
  els.stage.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
  });
  els.stage.addEventListener('dragleave', (ev) => {
    ev.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) els.stage.classList.remove('is-dragover');
  });
  els.stage.addEventListener('drop', (ev) => {
    ev.preventDefault();
    dragDepth = 0;
    els.stage.classList.remove('is-dragover');
    if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) addFiles(ev.dataTransfer.files);
  });

  document.addEventListener('dragover', (ev) => ev.preventDefault());
  document.addEventListener('drop', (ev) => ev.preventDefault());

  document.addEventListener('paste', (ev) => {
    if (!ev.clipboardData || !ev.clipboardData.files || !ev.clipboardData.files.length) return;
    const files = Array.from(ev.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    ev.preventDefault();
    addFiles(files);
  });

  /* ---------------- modales ---------------- */

  function openModal(modal) {
    modal.hidden = false;
    const focusable = modal.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  $$('.modal').forEach((modal) => {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) modal.hidden = true;
      if (ev.target.closest('[data-close]')) modal.hidden = true;
    });
  });

  $('#btn-help').addEventListener('click', () => openModal(els.modalHelp));
  $('#btn-export').addEventListener('click', () => openModal(els.modalExport));

  /* ---------------- imprimir ---------------- */

  $('#btn-print').addEventListener('click', () => {
    if (!items.length) { toast('Añade al menos una foto antes de imprimir.', true); return; }
    if (selectedId) {
      selectedId = null;
      renderItems();
      renderGallery();
    }
    setTimeout(() => window.print(), 120);
  });

  /* ---------------- exportar ---------------- */

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function stamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function renderPage(dpi) {
    const ppm = dpi / 25.4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE.w * ppm);
    canvas.height = Math.round(PAGE.h * ppm);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    items.forEach((it) => {
      const rec = images.get(it.imgId);
      if (!rec) return;
      const w = it.w * ppm;
      const h = it.h * ppm;
      ctx.save();
      ctx.translate(it.x * ppm, it.y * ppm);
      ctx.rotate(it.rot * Math.PI / 180);
      ctx.scale(it.fx ? -1 : 1, it.fy ? -1 : 1);
      ctx.drawImage(rec.el, -w / 2, -h / 2, w, h);
      ctx.restore();
    });

    return canvas;
  }

  function canvasToBytes(canvas, quality) {
    const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function pdfFromCanvas(canvas) {
    const img = canvasToBytes(canvas, 0.95);
    const W = (PAGE.w * 72 / 25.4).toFixed(2);
    const H = (PAGE.h * 72 / 25.4).toFixed(2);
    const enc = new TextEncoder();
    const parts = [];
    let length = 0;
    const offsets = [];
    const put = (chunk) => {
      const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
      parts.push(bytes);
      length += bytes.length;
    };
    const obj = (num, head, stream) => {
      offsets[num] = length;
      put(num + ' 0 obj\n');
      put(head);
      if (stream) { put('\nstream\n'); put(stream); put('\nendstream'); }
      put('\nendobj\n');
    };

    put(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    obj(4, '<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>', img);

    const content = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
    obj(5, '<< /Length ' + content.length + ' >>', content);

    const xref = length;
    put('xref\n0 6\n');
    put('0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) put(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    put('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');

    return new Blob(parts, { type: 'application/pdf' });
  }

  function ensureItems() {
    if (!items.length) {
      toast('Añade al menos una foto antes de exportar.', true);
      return false;
    }
    return true;
  }

  els.modalExport.addEventListener('click', async (ev) => {
    const card = ev.target.closest('.export-card');
    if (!card) return;
    const id = card.id;

    if (id === 'btn-pdf') {
      if (!ensureItems()) return;
      toast('Generando PDF…');
      await new Promise((r) => setTimeout(r, 30));
      try {
        download(pdfFromCanvas(renderPage(PRINT_DPI)), 'foto-a4-' + stamp() + '.pdf');
        toast('PDF descargado');
      } catch (err) {
        toast('No se pudo generar el PDF.', true);
      }
      els.modalExport.hidden = true;
    } else if (id === 'btn-png') {
      if (!ensureItems()) return;
      toast('Generando PNG…');
      await new Promise((r) => setTimeout(r, 30));
      renderPage(PRINT_DPI).toBlob((blob) => {
        if (blob) download(blob, 'foto-a4-' + stamp() + '.png');
        toast(blob ? 'PNG descargado' : 'No se pudo generar el PNG.', !blob);
      }, 'image/png');
      els.modalExport.hidden = true;
    } else if (id === 'btn-save') {
      await saveProject();
      els.modalExport.hidden = true;
    } else if (id === 'btn-open') {
      els.projectInput.click();
    } else if (id === 'btn-new') {
      if (items.length && !window.confirm('¿Vaciar el folio y empezar una composición nueva?')) return;
      clearAll();
      history.past.length = 0;
      history.future.length = 0;
      updateHistoryButtons();
      els.modalExport.hidden = true;
    }
  });

  /* ---------------- proyecto ---------------- */

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(',');
    const meta = comma > 0 ? dataUrl.slice(0, comma) : '';
    const b64 = dataUrl.slice(comma + 1);
    const match = meta.match(/data:([^;]+)/);
    const mime = match ? match[1] : 'image/jpeg';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function saveProject() {
    if (!items.length) { toast('No hay nada que guardar.', true); return; }
    toast('Preparando proyecto…');
    const payload = { app: 'foto-a4', version: 1, page: PAGE, items: items, images: [] };
    for (const [id, rec] of images) {
      if (!items.some((i) => i.imgId === id)) continue;
      payload.images.push({ id: id, name: rec.name, data: await blobToDataURL(rec.blob) });
    }
    download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'foto-a4-proyecto-' + stamp() + '.json');
    toast('Proyecto descargado');
  }

  els.projectInput.addEventListener('change', async () => {
    const file = els.projectInput.files && els.projectInput.files[0];
    els.projectInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'foto-a4' || !Array.isArray(data.items)) throw new Error('bad');
      await loadProject(data);
      toast('Proyecto abierto');
    } catch (err) {
      toast('Ese archivo no es un proyecto de Foto A4 válido.', true);
    }
  });

  async function loadProject(data) {
    images.clear();
    items = [];
    for (const im of data.images || []) {
      try {
        const blob = dataUrlToBlob(im.data);
        const el = new Image();
        el.decoding = 'async';
        await new Promise((resolve, reject) => {
          el.onload = resolve;
          el.onerror = () => reject(new Error('decode'));
          el.src = im.data;
        });
        images.set(im.id, { el: el, blob: blob, url: im.data, name: im.name || 'foto', w: el.naturalWidth, h: el.naturalHeight });
      } catch (err) { /* imagen corrupta */ }
    }
    items = (data.items || []).filter((it) => images.has(it.imgId)).map((it) => ({
      id: it.id,
      imgId: it.imgId,
      x: Number(it.x) || PAGE.w / 2,
      y: Number(it.y) || PAGE.h / 2,
      w: Math.max(MIN_MM, Number(it.w) || 50),
      h: Math.max(MIN_MM, Number(it.h) || 50),
      rot: Number(it.rot) || 0,
      fx: !!it.fx,
      fy: !!it.fy
    }));
    selectedId = items.length ? items[items.length - 1].id : null;
    history.past.length = 0;
    history.future.length = 0;
    renderItems();
    renderGallery();
    updateHistoryButtons();
    queueAutosave();
  }

  /* ---------------- persistencia ---------------- */

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('foto-a4', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function idbSet(store, key, value) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  function idbGet(store, key) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function queueAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { saveAutosave(); }, 700);
  }

  async function saveAutosave() {
    if (!items.length) {
      try { await idbSet('state', 'current', { items: [], savedAt: Date.now() }); } catch (err) { /* sin persistencia */ }
      return;
    }
    try {
      const names = {};
      items.forEach((it) => {
        const rec = images.get(it.imgId);
        if (rec) names[it.imgId] = rec.name;
      });
      await idbSet('state', 'current', { items: items, selectedId: selectedId, page: PAGE, names: names, savedAt: Date.now() });
      for (const it of items) {
        if (savedImgIds.has(it.imgId)) continue;
        const rec = images.get(it.imgId);
        if (!rec) continue;
        await idbSet('blobs', it.imgId, rec.blob);
        savedImgIds.add(it.imgId);
      }
    } catch (err) { /* cuota llena o modo privado */ }
  }

  async function restoreAutosave() {
    let state;
    try { state = await idbGet('state', 'current'); } catch (err) { return false; }
    if (!state || !Array.isArray(state.items) || !state.items.length) return false;

    let restored = 0;
    for (const it of state.items) {
      try {
        const blob = await idbGet('blobs', it.imgId);
        if (!blob) continue;
        const url = await blobToDataURL(blob);
        const el = new Image();
        el.decoding = 'async';
        await new Promise((resolve, reject) => {
          el.onload = resolve;
          el.onerror = () => reject(new Error('decode'));
          el.src = url;
        });
        images.set(it.imgId, { el: el, blob: blob, url: url, name: (state.names && state.names[it.imgId]) || 'foto', w: el.naturalWidth, h: el.naturalHeight });
        restored++;
      } catch (err) { /* se omite */ }
    }

    if (!restored) return false;

    items = state.items.filter((it) => images.has(it.imgId));
    selectedId = items.length ? items[items.length - 1].id : null;
    items.forEach((it) => savedImgIds.add(it.imgId));
    renderItems();
    renderGallery();
    updateHistoryButtons();
    toast('Composición recuperada');
    return true;
  }

  /* ---------------- arranque ---------------- */

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitWidth, 120);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  function boot() {
    fitWidth();
    updateHistoryButtons();
    renderSelBar();
    restoreAutosave().finally(() => {
      renderItems();
      renderGallery();
      updateHistoryButtons();
    });
  }

  boot();
})();
