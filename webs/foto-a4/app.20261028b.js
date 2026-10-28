/* ============================================================
   Foto A4 — compositor de fotos sobre folio A4
   Sin dependencias. Lienzo DOM en milímetros + export canvas.
   ============================================================ */
(() => {
  'use strict';

  const PAGE = { w: 210, h: 297 };
  const PX_PER_MM = 96 / 25.4;
  const MIN_MM = 4;
  const MAX_HISTORY = 60;
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
    galleryList: $('#gallery-list'),
    galleryEmpty: $('#gallery-empty'),
    galleryCount: $('#gallery-count'),
    inspectorEmpty: $('#inspector-empty'),
    inspectorBody: $('#inspector-body'),
    inName: $('#in-name'),
    inW: $('#in-w'),
    inH: $('#in-h'),
    inX: $('#in-x'),
    inY: $('#in-y'),
    inRot: $('#in-rot'),
    inDpi: $('#in-dpi'),
    zoomLabel: $('#zoom-label'),
    statusMsg: $('#status-msg'),
    bridgeDot: $('#bridge-dot'),
    bridgeLabel: $('#bridge-label'),
    toast: $('#toast'),
    fileInput: $('#file-input'),
    projectInput: $('#project-input'),
    modalPrint: $('#modal-print'),
    modalExport: $('#modal-export'),
    modalHelp: $('#modal-help'),
    printerSelect: $('#printer-select'),
    paperSelect: $('#paper-select'),
    qualitySelect: $('#quality-select'),
    copiesInput: $('#copies-input'),
    printerState: $('#printer-state'),
    bridgeOn: $('#bridge-on'),
    bridgeOff: $('#bridge-off')
  };

  /* ---------------- estado ---------------- */

  let items = [];
  let selectedId = null;
  let zoom = 0;
  let userZoom = false;

  /** id -> { el, blob, url, name, w, h } */
  const images = new Map();

  const history = { past: [], future: [] };

  const bridge = { base: null, printers: [], caps: null, printer: null };

  let drag = null;
  let autosaveTimer = 0;
  let savedImgIds = new Set();
  let uidCounter = 0;

  const uid = (p) => p + (Date.now().toString(36)).slice(-4) + (++uidCounter).toString(36);

  /* ---------------- utilidades ---------------- */

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('err', !!isError);
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.hidden = true; }, 4200);
  }

  function setStatus(msg) {
    els.statusMsg.textContent = msg || '';
  }

  function getSel() {
    return items.find((i) => i.id === selectedId) || null;
  }

  /* ---------------- zoom ---------------- */

  function applyZoom() {
    const w = PAGE.w * PX_PER_MM * zoom;
    const h = PAGE.h * PX_PER_MM * zoom;
    els.sheet.style.width = w + 'px';
    els.sheet.style.height = h + 'px';
    els.page.style.transform = 'scale(' + zoom + ')';
    els.page.style.setProperty('--z', String(zoom || 1));
    els.zoomLabel.textContent = Math.round(zoom * 100) + ' %';
  }

  function fitZoom() {
    const availW = els.stageScroll.clientWidth - 44;
    const availH = els.stageScroll.clientHeight - 44;
    if (availW <= 20 || availH <= 20) return;
    zoom = clamp(Math.min(availW / (PAGE.w * PX_PER_MM), availH / (PAGE.h * PX_PER_MM)), 0.15, 1.5);
    applyZoom();
  }

  function setZoom(z) {
    zoom = clamp(z, 0.15, 2.5);
    userZoom = true;
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
    if (img) {
      img.style.transform = 'scaleX(' + (it.fx ? -1 : 1) + ') scaleY(' + (it.fy ? -1 : 1) + ')';
    }
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
  }

  /* ---------------- medidas ---------------- */

  function dpiOf(it) {
    const rec = images.get(it.imgId);
    if (!rec || !it.w) return 0;
    return rec.w / (it.w / 25.4);
  }

  function dpiClass(dpi) {
    if (dpi >= 290) return 'ok';
    if (dpi >= 150) return 'warn';
    return 'low';
  }

  function pointMM(ev) {
    const r = els.page.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * PAGE.w,
      y: (ev.clientY - r.top) / r.height * PAGE.h
    };
  }

  /* ---------------- historial ---------------- */

  function snapshot() {
    return JSON.stringify({ items: items, selectedId: selectedId });
  }

  function commit(before) {
    const after = snapshot();
    if (after === before) return false;
    history.past.push(before);
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future.length = 0;
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

  function redo() {
    if (!history.future.length) return;
    const current = snapshot();
    const next = history.future.pop();
    history.past.push(current);
    applySnapshot(next);
  }

  function applySnapshot(json) {
    const data = JSON.parse(json);
    items = data.items;
    selectedId = data.selectedId;
    renderItems();
    renderInspector();
    renderGallery();
    queueAutosave();
  }

  /* ---------------- galería ---------------- */

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

  /* ---------------- inspector ---------------- */

  function renderInspector() {
    const it = getSel();
    els.inspectorEmpty.hidden = !!it;
    els.inspectorBody.hidden = !it;
    if (!it) return;

    const rec = images.get(it.imgId);
    els.inName.textContent = rec ? rec.name : '—';
    els.inName.title = rec ? rec.name : '';
    if (document.activeElement !== els.inW) els.inW.value = round1(it.w);
    if (document.activeElement !== els.inH) els.inH.value = round1(it.h);
    if (document.activeElement !== els.inX) els.inX.value = round1(it.x);
    if (document.activeElement !== els.inY) els.inY.value = round1(it.y);
    if (document.activeElement !== els.inRot) els.inRot.value = round1(it.rot);

    const dpi = dpiOf(it);
    els.inDpi.textContent = Math.round(dpi) + ' ppp';
    els.inDpi.className = 'dpi ' + dpiClass(dpi);
  }

  function syncInspectorNumbers() {
    const it = getSel();
    if (!it) return;
    if (document.activeElement !== els.inW) els.inW.value = round1(it.w);
    if (document.activeElement !== els.inH) els.inH.value = round1(it.h);
    if (document.activeElement !== els.inX) els.inX.value = round1(it.x);
    if (document.activeElement !== els.inY) els.inY.value = round1(it.y);
    if (document.activeElement !== els.inRot) els.inRot.value = round1(it.rot);
    const dpi = dpiOf(it);
    els.inDpi.textContent = Math.round(dpi) + ' ppp';
    els.inDpi.className = 'dpi ' + dpiClass(dpi);
  }

  /* ---------------- añadir imágenes ---------------- */

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f && f.type && f.type.startsWith('image/'));
    if (!files.length) {
      toast('Esos archivos no son imágenes compatibles.', true);
      return;
    }
    setStatus('Leyendo ' + files.length + (files.length === 1 ? ' foto…' : ' fotos…'));
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
      renderInspector();
      commit(before);
      setStatus(added === 1 ? 'Foto añadida' : added + ' fotos añadidas');
    } else {
      setStatus('');
    }
  }

  async function addImage(file) {
    // El CSP del dominio solo permite imágenes `data:` (ni blob: ni http:),
    // así que la fuente de la imagen se guarda como data URL.
    const url = await blobToDataURL(file);
    const el = new Image();
    el.decoding = 'async';
    try {
      await new Promise((resolve, reject) => {
        el.onload = resolve;
        el.onerror = () => reject(new Error('decode'));
        el.src = url;
      });
    } catch (err) {
      throw err;
    }
    if (!el.naturalWidth || !el.naturalHeight) {
      throw new Error('empty');
    }

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
    let w = PAGE.w * 0.55;
    let h = w / ratio;
    if (h > PAGE.h * 0.55) {
      h = PAGE.h * 0.55;
      w = h * ratio;
    }

    const cascade = ((items.length % 5) - 2) * 5;

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

  /* ---------------- acciones sobre la imagen ---------------- */

  function fitOrCover(mode) {
    const it = getSel();
    if (!it) return;
    const rec = images.get(it.imgId);
    if (!rec) return;
    const ratio = rec.w / rec.h;
    const before = snapshot();

    let w;
    if (mode === 'cover') {
      w = Math.max(PAGE.w, PAGE.h * ratio);
    } else {
      w = Math.min(PAGE.w, PAGE.h * ratio);
    }
    const h = w / ratio;

    it.w = w;
    it.h = h;
    it.x = PAGE.w / 2;
    it.y = PAGE.h / 2;
    renderItems();
    renderInspector();
    renderGallery();
    commit(before);
    setStatus(mode === 'cover' ? 'Foto ampliada para cubrir el folio' : 'Foto ajustada al folio');
  }

  function mirror(axis) {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    if (axis === 'h') it.fx = !it.fx;
    else it.fy = !it.fy;
    layoutItem(it);
    commit(before);
    setStatus(axis === 'h' ? 'Espejo horizontal' : 'Espejo vertical');
  }

  function centerItem() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    it.x = PAGE.w / 2;
    it.y = PAGE.h / 2;
    layoutItem(it);
    updateHandles();
    syncInspectorNumbers();
    commit(before);
  }

  function rotate90() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    it.rot = ((it.rot + 90) % 360 + 360) % 360;
    if (it.rot > 180) it.rot -= 360;
    layoutItem(it);
    updateHandles();
    syncInspectorNumbers();
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
  }

  function duplicateItem() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    const copy = Object.assign({}, it, { id: uid('it_'), x: it.x + 8, y: it.y + 8 });
    items.push(copy);
    selectedId = copy.id;
    renderItems();
    renderInspector();
    renderGallery();
    commit(before);
    setStatus('Foto duplicada');
  }

  function deleteItem() {
    const it = getSel();
    if (!it) return;
    const before = snapshot();
    items = items.filter((i) => i.id !== it.id);
    selectedId = items.length ? items[items.length - 1].id : null;
    renderItems();
    renderInspector();
    renderGallery();
    commit(before);
    setStatus('Foto eliminada');
  }

  function clearAll() {
    if (!items.length) return;
    const before = snapshot();
    items = [];
    selectedId = null;
    renderItems();
    renderInspector();
    renderGallery();
    commit(before);
    setStatus('Lienzo vaciado');
  }

  /* ---------------- puntero: mover, escalar, rotar ---------------- */

  els.page.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const rotHandle = ev.target.closest && ev.target.closest('.h-rot');
    const handle = ev.target.closest && ev.target.closest('.handle');
    const itemNode = ev.target.closest && ev.target.closest('.item');
    const p = pointMM(ev);

    if (rotHandle) {
      startRotate(ev, p);
      return;
    }
    if (handle && handle.dataset.h) {
      startResize(ev, p, handle.dataset.h);
      return;
    }
    if (itemNode) {
      const id = itemNode.dataset.id;
      if (id !== selectedId) {
        selectedId = id;
        renderItems();
        renderInspector();
        renderGallery();
      }
      startMove(ev, p);
      return;
    }
    if (selectedId) {
      selectedId = null;
      renderItems();
      renderInspector();
      renderGallery();
    }
  });

  function beginDrag(ev, data) {
    drag = Object.assign({ pointerId: ev.pointerId, before: snapshot() }, data);
    try { els.page.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
    document.body.classList.add('is-dragging');
    els.page.focus({ preventScroll: true });
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
      mode: 'resize',
      it: it,
      dir: dir,
      cos: Math.cos(th),
      sin: Math.sin(th),
      w0: it.w,
      h0: it.h,
      cx0: it.x,
      cy0: it.y,
      p: p
    });
  }

  function onPointerMove(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const it = drag.it;
    const p = pointMM(ev);

    if (drag.mode === 'move') {
      let x = drag.start.x + (p.x - drag.p.x);
      let y = drag.start.y + (p.y - drag.p.y);
      if (!ev.altKey) {
        if (Math.abs(x - PAGE.w / 2) < 2) x = PAGE.w / 2;
        if (Math.abs(y - PAGE.h / 2) < 2) y = PAGE.h / 2;
      }
      it.x = clamp(x, -60, PAGE.w + 60);
      it.y = clamp(y, -60, PAGE.h + 60);
      layoutItem(it);
      updateHandles();
      syncInspectorNumbers();
      return;
    }

    if (drag.mode === 'rotate') {
      let a = Math.atan2(p.y - it.y, p.x - it.x) * 180 / Math.PI;
      let r = drag.rot0 + (a - drag.a0);
      if (ev.shiftKey) {
        r = Math.round(r / 15) * 15;
      } else {
        const snap = Math.round(r / 90) * 90;
        if (Math.abs(r - snap) <= 5) r = snap;
      }
      it.rot = Math.round((((r + 180) % 360) + 360) % 360 - 180);
      layoutItem(it);
      updateHandles();
      syncInspectorNumbers();
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

      if (hasE) {
        w = Math.max(MIN_MM, lx + drag.w0 / 2);
        offX = (w - drag.w0) / 2;
      } else if (hasW) {
        w = Math.max(MIN_MM, drag.w0 / 2 - lx);
        offX = (drag.w0 - w) / 2;
      }
      if (hasS) {
        h = Math.max(MIN_MM, ly + drag.h0 / 2);
        offY = (h - drag.h0) / 2;
      } else if (hasN) {
        h = Math.max(MIN_MM, drag.h0 / 2 - ly);
        offY = (drag.h0 - h) / 2;
      }

      const isCorner = (hasE || hasW) && (hasN || hasS);
      const keepRatio = isCorner && !ev.shiftKey;
      if (keepRatio) {
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
      syncInspectorNumbers();
    }
  }

  function onPointerUp(ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const changed = commit(drag.before);
    drag = null;
    document.body.classList.remove('is-dragging');
    if (changed) {
      renderGallery();
      renderInspector();
    }
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
      if (modalOpen) {
        $$('.modal').forEach((m) => { m.hidden = true; });
        els.page.focus({ preventScroll: true });
        return;
      }
      if (selectedId) {
        selectedId = null;
        renderItems();
        renderInspector();
        renderGallery();
      }
      return;
    }

    if (modalOpen || isTyping(ev.target)) return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (ev.shiftKey) redo(); else undo();
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
      syncInspectorNumbers();
      commit(before);
    }
  });

  /* ---------------- inspector: campos y botones ---------------- */

  function bindNumber(input, apply) {
    input.addEventListener('change', () => {
      const it = getSel();
      if (!it) return;
      const value = parseFloat(String(input.value).replace(',', '.'));
      if (!isFinite(value)) { renderInspector(); return; }
      const before = snapshot();
      apply(it, value);
      layoutItem(it);
      updateHandles();
      renderInspector();
      renderGallery();
      commit(before);
    });
  }

  bindNumber(els.inW, (it, v) => { const n = Math.max(MIN_MM, v); const s = n / it.w; it.w = n; it.h = it.h * s; });
  bindNumber(els.inH, (it, v) => { const n = Math.max(MIN_MM, v); const s = n / it.h; it.h = n; it.w = it.w * s; });
  bindNumber(els.inX, (it, v) => { it.x = v; });
  bindNumber(els.inY, (it, v) => { it.y = v; });
  bindNumber(els.inRot, (it, v) => { it.rot = v; });

  $$('[data-act]', els.inspectorBody).forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'mirror-h') mirror('h');
      else if (act === 'mirror-v') mirror('v');
      else if (act === 'fit') fitOrCover('fit');
      else if (act === 'cover') fitOrCover('cover');
      else if (act === 'center') centerItem();
      else if (act === 'rot90') rotate90();
      else if (act === 'front') layerMove(true);
      else if (act === 'back') layerMove(false);
      else if (act === 'duplicate') duplicateItem();
      else if (act === 'delete') deleteItem();
    });
  });

  /* ---------------- galería: selección ---------------- */

  els.galleryList.addEventListener('click', (ev) => {
    const thumb = ev.target.closest('.thumb');
    if (!thumb) return;
    selectedId = thumb.dataset.id;
    renderItems();
    renderInspector();
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

  /* ---------------- zoom UI ---------------- */

  $('#zoom-in').addEventListener('click', () => setZoom(zoom + 0.1));
  $('#zoom-out').addEventListener('click', () => setZoom(zoom - 0.1));
  $('#zoom-fit').addEventListener('click', () => { userZoom = false; fitZoom(); });

  const guides = $('#toggle-guides');
  guides.addEventListener('change', () => els.page.classList.toggle('show-guides', guides.checked));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!userZoom) fitZoom(); }, 120);
  });

  /* ---------------- modales ---------------- */

  function openModal(modal) {
    modal.hidden = false;
    const focusable = modal.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeModal(modal) {
    modal.hidden = true;
  }

  $$('.modal').forEach((modal) => {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeModal(modal);
      const closer = ev.target.closest('[data-close]');
      if (closer) closeModal(modal);
    });
  });

  $('#btn-help').addEventListener('click', () => openModal(els.modalHelp));
  $('#btn-export').addEventListener('click', () => openModal(els.modalExport));

  els.modalPrint.addEventListener('click', (ev) => {
    const tab = ev.target.closest('.tab');
    if (!tab) return;
    $$('.tab', els.modalPrint).forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $$('.tab-panel', els.modalPrint).forEach((p) => {
      p.hidden = p.id !== tab.getAttribute('aria-controls');
    });
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
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.split(',')[1];
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
      if (stream) {
        put('\nstream\n');
        put(stream);
        put('\nendstream');
      }
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
      closeModal(els.modalExport);
    } else if (id === 'btn-png') {
      if (!ensureItems()) return;
      toast('Generando PNG…');
      await new Promise((r) => setTimeout(r, 30));
      renderPage(PRINT_DPI).toBlob((blob) => {
        if (blob) download(blob, 'foto-a4-' + stamp() + '.png');
        toast(blob ? 'PNG descargado' : 'No se pudo generar el PNG.', !blob);
      }, 'image/png');
      closeModal(els.modalExport);
    } else if (id === 'btn-save') {
      await saveProject();
      closeModal(els.modalExport);
    } else if (id === 'btn-open') {
      els.projectInput.click();
    } else if (id === 'btn-new') {
      if (items.length && !window.confirm('¿Vaciar el folio y empezar una composición nueva?')) return;
      clearAll();
      history.past.length = 0;
      history.future.length = 0;
      closeModal(els.modalExport);
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
    const payload = {
      app: 'foto-a4',
      version: 1,
      page: PAGE,
      items: items,
      images: []
    };
    for (const [id, rec] of images) {
      if (!items.some((i) => i.imgId === id)) continue;
      payload.images.push({
        id: id,
        name: rec.name,
        data: await blobToDataURL(rec.blob)
      });
    }
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    download(blob, 'foto-a4-proyecto-' + stamp() + '.json');
    toast('Proyecto descargado');
  }

  els.projectInput.addEventListener('change', async () => {
    const file = els.projectInput.files && els.projectInput.files[0];
    els.projectInput.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
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
        const url = im.data;
        const el = new Image();
        el.decoding = 'async';
        await new Promise((resolve, reject) => {
          el.onload = resolve;
          el.onerror = () => reject(new Error('decode'));
          el.src = url;
        });
        images.set(im.id, { el: el, blob: blob, url: url, name: im.name || 'foto', w: el.naturalWidth, h: el.naturalHeight });
      } catch (err) {
        /* imagen corrupta: se omite */
      }
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
    renderInspector();
    renderGallery();
    queueAutosave();
  }

  /* ---------------- persistencia automática ---------------- */

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
      try {
        await idbSet('state', 'current', { items: [], savedAt: Date.now() });
      } catch (err) { /* sin persistencia */ }
      return;
    }
    try {
      const names = {};
      items.forEach((it) => {
        const rec = images.get(it.imgId);
        if (rec) names[it.imgId] = rec.name;
      });
      const state = { items: items, selectedId: selectedId, page: PAGE, names: names, savedAt: Date.now() };
      await idbSet('state', 'current', state);
      for (const it of items) {
        if (savedImgIds.has(it.imgId)) continue;
        const rec = images.get(it.imgId);
        if (!rec) continue;
        await idbSet('blobs', it.imgId, rec.blob);
        savedImgIds.add(it.imgId);
      }
    } catch (err) {
      /* cuota llena o modo privado: la app sigue funcionando */
    }
  }

  async function restoreAutosave() {
    let state;
    try {
      state = await idbGet('state', 'current');
    } catch (err) {
      return false;
    }
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
      } catch (err) {
        /* se omite */
      }
    }

    if (!restored) return false;

    items = state.items.filter((it) => images.has(it.imgId));
    selectedId = items.length ? items[items.length - 1].id : null;
    items.forEach((it) => savedImgIds.add(it.imgId));
    renderItems();
    renderInspector();
    renderGallery();
    setStatus('Composición recuperada');
    return true;
  }

  /* ---------------- puente de impresión ---------------- */

  async function pingBridge(base) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1800);
    try {
      const res = await fetch(base + '/api/health', { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      return !!(data && data.ok);
    } catch (err) {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function isLocalHost() {
    const host = location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
  }

  async function detectBridge(auto) {
    // El puente solo se busca cuando la app se sirve en local: el CSP del
    // dominio publicado bloquea las conexiones a 127.0.0.1.
    const bases = [];
    if (isLocalHost()) {
      if (location.protocol.startsWith('http')) bases.push(location.origin);
      bases.push('http://127.0.0.1:8787');
    }

    for (const base of bases) {
      if (base === location.origin && !isLocalHost()) continue;
      if (await pingBridge(base)) {
        bridge.base = base;
        setBridgeUi(true);
        return true;
      }
    }
    setBridgeUi(false);
    return false;
  }

  function setBridgeUi(online) {
    els.bridgeDot.className = 'dot ' + (online ? 'ok' : 'off');
    els.bridgeLabel.textContent = online ? 'Impresora preparada' : 'Versión web · sin puente local';
    if (online) {
      els.bridgeOff.hidden = true;
      els.bridgeOn.hidden = false;
    } else {
      els.bridgeOff.hidden = false;
      els.bridgeOn.hidden = true;
    }
  }

  async function bridgeJson(path, options) {
    const res = await fetch(bridge.base + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error del puente de impresión');
    return data;
  }

  async function loadPrinters() {
    const data = await bridgeJson('/api/printers');
    bridge.printers = data.printers || [];
    const current = bridge.printers.find((p) => p.default) || bridge.printers[0];
    els.printerSelect.replaceChildren();
    bridge.printers.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name + (p.default ? ' · predeterminada' : '');
      els.printerSelect.appendChild(opt);
    });
    if (current) {
      els.printerSelect.value = current.name;
      await loadCaps(current.name);
    }
  }

  async function loadCaps(printer) {
    bridge.printer = printer;
    els.paperSelect.replaceChildren();
    els.qualitySelect.replaceChildren();
    els.printerState.textContent = 'Consultando…';
    try {
      const caps = await bridgeJson('/api/capabilities?printer=' + encodeURIComponent(printer));
      bridge.caps = caps;
      (caps.papers || []).forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name + (p.width && p.height ? ' · ' + Math.round(p.width / 100 * 25.4) + ' × ' + Math.round(p.height / 100 * 25.4) + ' mm' : '');
        els.paperSelect.appendChild(opt);
      });
      const a4 = (caps.papers || []).find((p) => /a4/i.test(p.name));
      if (a4) els.paperSelect.value = a4.name;

      const kindLabel = { Draft: 'Borrador', Low: 'Baja', Medium: 'Media', High: 'Alta' };
      (caps.resolutions || []).forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.id.indexOf('kind:') === 0 ? (kindLabel[r.id.slice(5)] || r.label) : r.label;
        els.qualitySelect.appendChild(opt);
      });
      const high = (caps.resolutions || []).find((r) => /600/.test(r.label) || r.id === 'kind:High');
      if (high) els.qualitySelect.value = high.id;

      els.copiesInput.max = String(caps.maxCopies || 99);
      els.printerState.textContent = caps.color ? 'Lista · color' : 'Lista';
    } catch (err) {
      els.printerState.textContent = 'Sin respuesta';
      toast('La impresora no respondió: ' + err.message, true);
    }
  }

  els.printerSelect.addEventListener('change', () => loadCaps(els.printerSelect.value));

  $('#btn-prefs').addEventListener('click', async () => {
    if (!bridge.base) return;
    try {
      await bridgeJson('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer: els.printerSelect.value })
      });
      toast('Abriendo las preferencias del driver…');
    } catch (err) {
      toast('No se pudieron abrir las preferencias: ' + err.message, true);
    }
  });

  $('#btn-print').addEventListener('click', async () => {
    if (!items.length) { toast('Añade al menos una foto antes de imprimir.', true); return; }
    openModal(els.modalPrint);
    if (!bridge.base) {
      const ok = await detectBridge(true);
      if (!ok) return;
    }
    try {
      await loadPrinters();
    } catch (err) {
      toast('No se pudo consultar la impresora: ' + err.message, true);
    }
  });

  $('#btn-direct-print').addEventListener('click', async () => {
    if (!bridge.base) { toast('El puente local no está disponible.', true); return; }
    const btn = $('#btn-direct-print');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Enviando…';
    try {
      const canvas = renderPage(PRINT_DPI);
      const data = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      const result = await bridgeJson('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: els.printerSelect.value,
          paper: els.paperSelect.value,
          resolution: els.qualitySelect.value,
          copies: clamp(parseInt(els.copiesInput.value, 10) || 1, 1, 99),
          name: 'foto-a4-' + stamp(),
          format: 'jpeg',
          data: data
        })
      });
      toast('Trabajo enviado a la impresora' + (result.job ? ' (' + result.job + ')' : ''));
      closeModal(els.modalPrint);
    } catch (err) {
      toast('No se pudo imprimir: ' + err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  $('#btn-window-print').addEventListener('click', () => {
    closeModal(els.modalPrint);
    setTimeout(() => {
      window.print();
    }, 180);
  });

  /* ---------------- arranque ---------------- */

  function boot() {
    els.page.classList.toggle('show-guides', guides.checked);
    fitZoom();
    applyZoom();
    setBridgeUi(false);
    restoreAutosave().finally(() => {
      renderItems();
      renderInspector();
      renderGallery();
    });
    if (isLocalHost()) detectBridge(false).then((ok) => {
      if (ok) {
        els.bridgeLabel.textContent = 'Impresora local conectada';
      }
    });
  }

  boot();
})();
