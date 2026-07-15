/* =========================================================
   Estudio de Imágenes IA — lógica de la app
   - Generar (text-to-image) y Editar (image-to-image)
   - Mejorar prompt con IA
   - Historial persistente (IndexedDB + history.php)
   - Contador de gasto
   Convenciones Antigravity: addEventListener (no onclick inline),
   FileReader.readAsDataURL (no blob URLs por CSP Hostinger).
   ========================================================= */
(function () {
  'use strict';

  // Overlay universal (SKILL_MAESTRA)
  function showOverlay(statusMsg) {
    var t = document.getElementById('loading-text');
    var s = document.getElementById('secondary-status');
    var o = document.getElementById('loading-overlay');
    if (t) t.textContent = 'IA generando lo solicitado...';
    if (s) s.textContent = statusMsg || 'Procesando solicitud...';
    if (o) o.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function hideOverlay() {
    var o = document.getElementById('loading-overlay');
    if (o) o.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ── Estado ────────────────────────────────────────────
  var state = {
    mode: 'generar',          // 'generar' | 'editar'
    inputImage: null,         // data URL de la imagen a editar
    lastResult: null,         // { url, prompt, calidad, action, cost, id }
    generating: false,
    costTotal: 0,
    count: 0
  };

  var COST_KEY = 'estudio_img_cost_total';
  var COUNT_KEY = 'estudio_img_count';
  var EUR = 0.92; // aprox USD->EUR para mostrar

  // ── Referencias DOM ───────────────────────────────────
  var el = {};
  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    ['brandHome','navStudio','navHistory','themeToggle',
     'view-studio','view-history',
     'modeGenerar','modeEditar','dropZone','fileInput','dropHint','previewImg',
     'promptLabel','promptBox','calidadSel','btnGenerar','btnGenerarText','btnMejorar',
     'costLast','costTotal','costTotalEur','countTotal',
     'resultArea','galleryGrid','historyCount','historyEmpty','btnClearHistory',
     'lightbox','lightboxClose','lightboxImg','lightboxDownload','lightboxEdit','toast'
    ].forEach(function (id) { el[id] = $(id); });
  }

  // ── Utilidades ────────────────────────────────────────
  function money(n) { return '$' + (Number(n) || 0).toFixed(4); }
  function moneyEur(n) { return '(~' + ((Number(n) || 0) * EUR).toFixed(3) + ' €)'; }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.remove('show'); }, 3200);
  }

  function newId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ── Vistas ────────────────────────────────────────────
  function showView(name) {
    el['view-studio'].classList.toggle('active', name === 'studio');
    el['view-history'].classList.toggle('active', name === 'history');
    if (name === 'history') renderGallery();
    window.scrollTo(0, 0);
  }

  // ── Modo generar / editar ─────────────────────────────
  function setMode(mode) {
    state.mode = mode;
    var esEditar = mode === 'editar';
    el.modeGenerar.classList.toggle('active', !esEditar);
    el.modeEditar.classList.toggle('active', esEditar);
    el.dropZone.style.display = esEditar ? 'block' : 'none';

    // Copia de UI dependiente del modo
    if (esEditar) {
      el.promptLabel.textContent = 'Describe el cambio que quieres';
      el.promptBox.placeholder = 'Ej: cambia el fondo a una playa al atardecer, mantén el sujeto igual';
      el.btnGenerarText.textContent = 'Editar imagen';
    } else {
      el.promptLabel.textContent = 'Describe la imagen que quieres';
      el.promptBox.placeholder = 'Ej: un faro solitario en un acantilado al atardecer, estilo acuarela';
      el.btnGenerarText.textContent = 'Generar imagen';
    }
    updateGenerateEnabled();
  }

  function updateGenerateEnabled() {
    var hasPrompt = el.promptBox.value.trim().length > 0;
    var ok = hasPrompt && !state.generating;
    if (state.mode === 'editar') ok = ok && !!state.inputImage;
    el.btnGenerar.disabled = !ok;
    el.btnMejorar.disabled = !hasPrompt || state.generating;
  }

  // ── Carga de imagen a editar (FileReader → data URL) ──
  function handleFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast('Formato no soportado. Usa PNG, JPG o WebP.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      state.inputImage = e.target.result; // data URL
      el.previewImg.onload = function () {
        el.previewImg.style.display = 'block';
        el.dropHint.style.display = 'none';
        el.dropZone.classList.add('has-image');
      };
      el.previewImg.src = state.inputImage;
      updateGenerateEnabled();
    };
    reader.onerror = function () { toast('No se pudo leer la imagen.'); };
    reader.readAsDataURL(file);
  }

  // ── Llamada al proxy ──────────────────────────────────
  function callProxy(payload) {
    return fetch('./proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg = (data && data.error && (data.error.message || data.error)) || ('HTTP ' + res.status);
          if (typeof msg === 'object') msg = JSON.stringify(msg);
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  // ── Mejorar prompt ────────────────────────────────────
  function mejorarPrompt() {
    var prompt = el.promptBox.value.trim();
    if (!prompt) return;
    el.btnMejorar.disabled = true;
    var original = el.btnMejorar.innerHTML;
    el.btnMejorar.innerHTML = 'Mejorando…';
    showOverlay('Mejorando prompt...');

    callProxy({ action: 'mejorar', prompt: prompt })
      .then(function (data) {
        if (data.prompt) {
          el.promptBox.value = data.prompt;
          addCost(data.cost || 0, false); // suma al total pero no cuenta como imagen
          refreshCostBar();
          toast('Prompt mejorado ✨');
        }
      })
      .catch(function (e) { toast('Error al mejorar: ' + e.message); })
      .finally(function () {
        el.btnMejorar.innerHTML = original;
        hideOverlay();
        updateGenerateEnabled();
      });
  }

  // ── Generar / Editar ──────────────────────────────────
  function generar() {
    var prompt = el.promptBox.value.trim();
    if (!prompt) return;
    if (state.mode === 'editar' && !state.inputImage) {
      toast('Sube primero una imagen para editar.');
      return;
    }

    var calidad = el.calidadSel.value;
    if (calidad === 'pro') {
      if (!confirm('El modelo "Pro" cuesta ~$0.13 por imagen. ¿Continuar?')) return;
    }

    state.generating = true;
    updateGenerateEnabled();
    renderLoading();
    showOverlay(state.mode === 'editar' ? 'Editando imagen...' : 'Generando imagen...');

    var payload = {
      action: state.mode,     // 'generar' | 'editar'
      prompt: prompt,
      calidad: calidad
    };
    if (state.mode === 'editar') payload.imageData = state.inputImage;

    callProxy(payload)
      .then(function (data) {
        if (!data.image) throw new Error('No se recibió imagen.');
        var item = {
          id: newId(),
          url: data.image,
          prompt: prompt,
          action: state.mode,
          calidad: calidad,
          cost: data.cost || 0,
          createdAt: Date.now()
        };
        state.lastResult = item;

        // Contadores de gasto
        addCost(item.cost, true);
        refreshCostBar();

        // Guardar en historial (IndexedDB + servidor)
        if (window.HistoryManager) {
          HistoryManager.saveItem(item).catch(function () {});
        }

        renderResult(item);
      })
      .catch(function (e) { renderError(e.message); })
      .finally(function () {
        state.generating = false;
        hideOverlay();
        updateGenerateEnabled();
      });
  }

  // ── Render: carga / error / resultado ─────────────────
  function renderLoading() {
    el.resultArea.innerHTML =
      '<div class="loading"><div class="spinner"></div>' +
      '<div>' + (state.mode === 'editar' ? 'Editando tu imagen…' : 'Generando tu imagen…') +
      '</div></div>';
  }

  function renderError(msg) {
    el.resultArea.innerHTML = '<div class="error-msg">⚠️ ' + escapeHtml(msg) + '</div>';
  }

  function renderResult(item) {
    el.resultArea.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'result-wrap';

    var img = document.createElement('img');
    img.className = 'result-img';
    img.alt = item.prompt;
    img.src = item.url;

    var actions = document.createElement('div');
    actions.className = 'result-actions';

    var bDl = document.createElement('button');
    bDl.className = 'btn btn-ghost';
    bDl.textContent = '⬇️ Descargar';
    bDl.addEventListener('click', function () { downloadImage(item.url, item.id); });

    var bEdit = document.createElement('button');
    bEdit.className = 'btn btn-ghost';
    bEdit.textContent = '🖌️ Editar esta';
    bEdit.addEventListener('click', function () { useForEdit(item.url); });

    var bBig = document.createElement('button');
    bBig.className = 'btn btn-ghost';
    bBig.textContent = '🔍 Ampliar';
    bBig.addEventListener('click', function () { openLightbox(item.url); });

    actions.appendChild(bDl);
    actions.appendChild(bEdit);
    actions.appendChild(bBig);
    wrap.appendChild(img);
    wrap.appendChild(actions);
    el.resultArea.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── Descargar imagen ──────────────────────────────────
  function downloadImage(url, id) {
    var a = document.createElement('a');
    a.href = url;
    a.download = (id || 'imagen') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Usar una imagen como entrada de edición ───────────
  function useForEdit(url) {
    state.inputImage = url;
    setMode('editar');
    el.previewImg.onload = function () {
      el.previewImg.style.display = 'block';
      el.dropHint.style.display = 'none';
      el.dropZone.classList.add('has-image');
    };
    el.previewImg.src = url;
    showView('studio');
    updateGenerateEnabled();
    el.promptBox.focus();
    toast('Imagen cargada para editar.');
  }

  // ── Contador de gasto ─────────────────────────────────
  function loadCost() {
    state.costTotal = parseFloat(localStorage.getItem(COST_KEY) || '0') || 0;
    state.count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0;
  }
  function addCost(c, isImage) {
    state.costTotal += (Number(c) || 0);
    if (isImage) state.count += 1;
    localStorage.setItem(COST_KEY, String(state.costTotal));
    localStorage.setItem(COUNT_KEY, String(state.count));
    if (state.lastResult) el.costLast.textContent = money(state.lastResult.cost);
  }
  function refreshCostBar() {
    el.costLast.textContent = money(state.lastResult ? state.lastResult.cost : 0);
    el.costTotal.textContent = money(state.costTotal);
    el.costTotalEur.textContent = moneyEur(state.costTotal);
    el.countTotal.textContent = String(state.count);
  }

  // ── Historial / galería ───────────────────────────────
  function renderGallery() {
    if (!window.HistoryManager) return;
    HistoryManager.loadAll().then(function (items) {
      el.historyCount.textContent = String(items.length);
      el.galleryGrid.innerHTML = '';
      if (!items.length) {
        el.historyEmpty.style.display = 'block';
        return;
      }
      el.historyEmpty.style.display = 'none';
      items.forEach(function (it) {
        el.galleryGrid.appendChild(buildCard(it));
      });
    });
  }

  function buildCard(it) {
    var url = it.url || it.imageUrl || '';
    var card = document.createElement('div');
    card.className = 'gallery-card';

    var badge = document.createElement('span');
    badge.className = 'g-badge' + (it.action === 'editar' ? ' editar' : '');
    badge.textContent = it.action === 'editar' ? 'Editada' : 'Generada';

    var del = document.createElement('button');
    del.className = 'g-del';
    del.textContent = '✕';
    del.title = 'Eliminar';
    del.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta imagen del historial?')) return;
      HistoryManager.deleteItem(it.id).then(renderGallery);
    });

    var img = document.createElement('img');
    img.alt = it.prompt || 'Imagen';
    img.loading = 'lazy';
    img.src = url;

    var info = document.createElement('div');
    info.className = 'g-info';
    var p = document.createElement('div');
    p.className = 'g-prompt';
    p.textContent = it.prompt || '(sin descripción)';
    var meta = document.createElement('div');
    meta.className = 'g-meta';
    var fecha = it.createdAt ? new Date(it.createdAt).toLocaleDateString('es-ES') : '';
    meta.innerHTML = '<span>' + fecha + '</span><span>' + money(it.cost || 0) + '</span>';
    info.appendChild(p);
    info.appendChild(meta);

    card.appendChild(badge);
    card.appendChild(del);
    card.appendChild(img);
    card.appendChild(info);

    card.addEventListener('click', function () { openLightbox(url, it); });
    return card;
  }

  // ── Lightbox ──────────────────────────────────────────
  function openLightbox(url, it) {
    el.lightboxImg.src = url;
    el.lightbox.classList.add('open');
    el.lightboxDownload.onclick = function () { downloadImage(url, it ? it.id : 'imagen'); };
    el.lightboxEdit.onclick = function () { closeLightbox(); useForEdit(url); };
  }
  function closeLightbox() { el.lightbox.classList.remove('open'); }

  // ── Tema claro / oscuro ───────────────────────────────
  function initTheme() {
    var saved = localStorage.getItem('estudio_img_theme');
    if (saved === 'light') { document.body.classList.add('light'); el.themeToggle.textContent = '☀️'; }
    el.themeToggle.addEventListener('click', function () {
      var isLight = document.body.classList.toggle('light');
      el.themeToggle.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem('estudio_img_theme', isLight ? 'light' : 'dark');
    });
  }

  // ── Wiring de eventos ─────────────────────────────────
  function wire() {
    el.brandHome.addEventListener('click', function () { showView('studio'); });
    el.navStudio.addEventListener('click', function () { showView('studio'); });
    el.navHistory.addEventListener('click', function () { showView('history'); });

    el.modeGenerar.addEventListener('click', function () { setMode('generar'); });
    el.modeEditar.addEventListener('click', function () { setMode('editar'); });

    el.dropZone.addEventListener('click', function () { el.fileInput.click(); });
    el.fileInput.addEventListener('change', function (e) { handleFile(e.target.files[0]); });
    el.dropZone.addEventListener('dragover', function (e) { e.preventDefault(); el.dropZone.classList.add('has-image'); });
    el.dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    el.promptBox.addEventListener('input', updateGenerateEnabled);
    el.btnGenerar.addEventListener('click', generar);
    el.btnMejorar.addEventListener('click', mejorarPrompt);

    el.btnClearHistory.addEventListener('click', function () {
      if (!confirm('¿Vaciar TODO el historial? Esta acción no se puede deshacer.')) return;
      HistoryManager.clearAll().then(function () {
        renderGallery();
        toast('Historial vaciado.');
      });
    });

    el.lightboxClose.addEventListener('click', closeLightbox);
    el.lightbox.addEventListener('click', function (e) {
      if (e.target === el.lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    cacheDom();
    initTheme();
    wire();
    setMode('generar');
    loadCost();
    refreshCostBar();
    updateGenerateEnabled();

    if (window.HistoryManager) {
      HistoryManager.configure({ dbName: 'estudio_imagenes_db', historyUrl: './history.php' });
      HistoryManager.init().catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
