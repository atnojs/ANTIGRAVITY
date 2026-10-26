/**
 * lightbox-zoom.js — Zoom con la rueda del ratón para cualquier visor de imagen ampliada
 * ======================================================================================
 * Se engancha solo: la app no tiene que llamarlo. Detecta el visor (overlay fijo a
 * pantalla completa con una imagen dentro) y le añade:
 *
 *   · Rueda del ratón  → zoom continuo centrado en el cursor (1x – 8x)
 *   · Arrastrar        → desplazar la imagen ampliada
 *   · Doble clic       → volver a 1x
 *   · + / - / 0        → ampliar, alejar, restablecer
 *   · Pellizco táctil  → zoom con dos dedos
 *
 * Al cerrar el visor (Esc, botón de cerrar o clic fuera) el zoom se restablece solo.
 *
 * Uso:  <script src="lightbox-zoom.js" defer></script>
 * ======================================================================================
 */
(function () {
  'use strict';

  if (window.__antigravityLightboxZoom) { return; }
  window.__antigravityLightboxZoom = true;

  var MIN_SCALE = 1;
  var MAX_SCALE = 8;
  var WHEEL_SENSITIVITY = 0.0016;
  var HINT_MS = 3000;
  var DRAG_THRESHOLD = 5;

  var host = null;          // overlay del visor
  var img = null;           // imagen ampliada
  var imgSrc = '';          // src con el que se calculó la base
  var scale = 1;
  var tx = 0;
  var ty = 0;
  var baseCx = 0;           // centro del layout sin transformar (coords viewport)
  var baseCy = 0;
  var baseW = 0;
  var baseH = 0;
  var baseReady = false;

  var dragging = false;
  var moved = false;
  var startX = 0;
  var startY = 0;
  var startTx = 0;
  var startTy = 0;
  var swallowClick = false;

  var pinchDist = 0;
  var pinchCx = 0;
  var pinchCy = 0;

  var hintEl = null;
  var hintTimer = null;

  /* ------------------------------------------------------------------ utilidades */

  function isShown(el) {
    if (!el || !el.getBoundingClientRect) { return false; }
    var cs;
    try { cs = window.getComputedStyle(el); } catch (e) { return false; }
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) { return false; }
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /** Sube desde el elemento hasta encontrar el overlay del visor. */
  function findHost(el) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var n = el;
    while (n && n.nodeType === 1 && n !== document.documentElement) {
      var cs;
      try { cs = window.getComputedStyle(n); } catch (e) { return null; }
      if (cs.position === 'fixed') {
        var r = n.getBoundingClientRect();
        var big = r.width >= vw * 0.9 && r.height >= vh * 0.9;
        var mid = r.width >= vw * 0.6 && r.height >= vh * 0.6;
        if (big) { return n; }
        if (mid) {
          var name = ((n.id || '') + ' ' + (typeof n.className === 'string' ? n.className : '')).toLowerCase();
          if (/lightbox|viewer|visor|zoom|modal|overlay|ampliad|preview/.test(name)) { return n; }
        }
      }
      n = n.parentElement;
    }
    return null;
  }

  /** Busca un visor abierto sin depender de un evento (se usa al abrir). */
  function findOpenLightbox() {
    var sel = '#antigravity-lightbox,#lightbox-antigravity,#lightbox,' +
      '[id*="lightbox"],[id*="Lightbox"],[class*="lightbox"],' +
      '[id*="viewer"],[class*="viewer"],[id*="imageModal"],[class*="image-modal"]';
    var nodes;
    try { nodes = document.querySelectorAll(sel); } catch (e) { return null; }
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!isShown(n)) { continue; }
      var r = n.getBoundingClientRect();
      if (r.width >= vw * 0.6 && r.height >= vh * 0.6 && getImg(n)) { return n; }
    }
    return null;
  }

  /** La imagen más grande dentro del visor. */
  function getImg(h) {
    if (!h || !h.querySelectorAll) { return null; }
    var imgs = h.querySelectorAll('img');
    var best = null;
    var bestArea = 0;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var r = im.getBoundingClientRect();
      var area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = im; }
    }
    return bestArea > 4000 ? best : null;
  }

  /* ------------------------------------------------------------------ geometría */

  /** Centro y tamaño del layout sin transformar, deducidos del estado actual. */
  function recomputeBase() {
    if (!img) { return; }
    var r = img.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) { return; }
    baseW = r.width / scale;
    baseH = r.height / scale;
    baseCx = (r.left + r.width / 2) - tx;
    baseCy = (r.top + r.height / 2) - ty;
    baseReady = true;
  }

  function clampT() {
    var maxX = Math.max(0, (baseW * scale) / 2 - 60);
    var maxY = Math.max(0, (baseH * scale) / 2 - 60);
    if (tx > maxX) { tx = maxX; }
    if (tx < -maxX) { tx = -maxX; }
    if (ty > maxY) { ty = maxY; }
    if (ty < -maxY) { ty = -maxY; }
  }

  function apply() {
    if (!img) { return; }
    if (scale <= MIN_SCALE + 0.001) {
      scale = MIN_SCALE;
      tx = 0;
      ty = 0;
      img.style.transform = '';
      img.style.transformOrigin = '';
      img.style.willChange = '';
      img.style.cursor = '';
      return;
    }
    img.style.transformOrigin = '50% 50%';
    img.style.willChange = 'transform';
    img.style.cursor = dragging ? 'grabbing' : 'grab';
    img.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + scale.toFixed(4) + ')';
  }

  /** Zoom manteniendo fijo el punto (px, py) de la pantalla. */
  function zoomAt(next, px, py) {
    if (!img || !baseReady) { return; }
    next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    if (Math.abs(next - scale) < 0.0005) { return; }

    var ux = (px - baseCx - tx) / scale;
    var uy = (py - baseCy - ty) / scale;

    scale = next;
    tx = px - baseCx - scale * ux;
    ty = py - baseCy - scale * uy;
    clampT();
    apply();
  }

  function resetState() {
    scale = MIN_SCALE;
    tx = 0;
    ty = 0;
    dragging = false;
    moved = false;
    baseReady = false;
    if (img) {
      img.style.transform = '';
      img.style.transformOrigin = '';
      img.style.willChange = '';
      img.style.cursor = '';
    }
  }

  /* ------------------------------------------------------------------ aviso */

  function attachHint(h) {
    if (hintEl && hintEl.parentNode === h) { return; }
    if (!h) { return; }
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.id = 'lightbox-zoom-hint';
      hintEl.setAttribute('aria-hidden', 'true');
      hintEl.style.cssText = [
        'position:absolute',
        'left:50%',
        'bottom:22px',
        'transform:translateX(-50%)',
        'padding:8px 16px',
        'border-radius:999px',
        'background:rgba(6,16,24,0.82)',
        'border:1px solid rgba(0,208,208,0.55)',
        'box-shadow:0 0 18px rgba(0,208,208,0.35)',
        'color:#CCFFFF',
        "font-family:'Electrolize',system-ui,sans-serif",
        'font-size:12px',
        'letter-spacing:0.04em',
        'text-transform:uppercase',
        'white-space:nowrap',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity .25s ease',
        'z-index:2147483000'
      ].join(';');
      hintEl.textContent = 'Rueda: zoom · Arrastra: mover · Doble clic: 1x';
    }
    if (hintEl.parentNode !== h) { h.appendChild(hintEl); }
  }

  function showHint() {
    if (!hintEl) { return; }
    hintEl.style.opacity = '1';
    if (hintTimer) { clearTimeout(hintTimer); }
    hintTimer = setTimeout(function () {
      if (hintEl) { hintEl.style.opacity = '0'; }
    }, HINT_MS);
  }

  /* ------------------------------------------------------------------ enganche */

  /**
   * Fija el visor y la imagen actuales. Devuelve el overlay o null.
   * Se llama en cada evento, así que también detecta aperturas y cierres.
   */
  function ensureTarget(target) {
    var h = target ? findHost(target) : findOpenLightbox();
    if (!h) {
      if (host) { resetState(); host = null; img = null; imgSrc = ''; }
      return null;
    }
    var im = getImg(h);
    if (!im) { return null; }

    var changed = (h !== host) || (im !== img) || (im.src !== imgSrc);
    if (changed) {
      host = h;
      img = im;
      imgSrc = im.src;
      resetState();
      recomputeBase();
      attachHint(h);
      if (!baseReady && !im.dataset.lbzHooked) {
        im.dataset.lbzHooked = '1';
        im.addEventListener('load', function () {
          if (im === img) { recomputeBase(); }
        });
      }
    } else if (!baseReady) {
      recomputeBase();
    }
    return h;
  }

  /* ------------------------------------------------------------------ rueda */

  function onWheel(e) {
    var h = ensureTarget(e.target);
    if (!h) { return; }

    // No interceptar si la rueda es sobre un control del visor (barra de botones).
    if (e.target && e.target.closest && e.target.closest('button,a,input,select,textarea')) { return; }

    e.preventDefault();
    e.stopPropagation();

    if (!baseReady) { recomputeBase(); }
    if (!baseReady) { return; }

    var delta = e.deltaY;
    if (e.deltaMode === 1) { delta *= 16; }        // líneas
    else if (e.deltaMode === 2) { delta *= window.innerHeight; } // páginas

    var next = scale * Math.exp(-delta * WHEEL_SENSITIVITY);
    zoomAt(next, e.clientX, e.clientY);
    showHint();
  }

  /* ------------------------------------------------------------------ arrastre */

  function onPointerDown(e) {
    var h = ensureTarget(e.target);
    if (!h || !img) { return; }
    if (e.target && e.target.closest && e.target.closest('button,a,input,select,textarea')) { return; }
    if (scale <= MIN_SCALE + 0.001) { return; }
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startTx = tx;
    startTy = ty;
    try { img.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  }

  function onPointerMove(e) {
    if (!dragging || !img) { return; }
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) { moved = true; }
    if (!moved) { return; }
    tx = startTx + dx;
    ty = startTy + dy;
    clampT();
    apply();
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragging) { return; }
    dragging = false;
    if (img) { img.style.cursor = scale > MIN_SCALE ? 'grab' : ''; }
    if (moved) {
      swallowClick = true;
      setTimeout(function () { swallowClick = false; }, 0);
    }
    try { img.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
  }

  /* ------------------------------------------------------------------ clic */

  function onClickCapture(e) {
    // Un arrastre no debe cerrar el visor.
    if (swallowClick) {
      e.stopPropagation();
      e.preventDefault();
      swallowClick = false;
      return;
    }
    // Con la imagen ampliada, un clic sobre ella no la cierra (sí el fondo o ✕).
    if (scale > MIN_SCALE + 0.001 && img && (e.target === img)) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Al abrir: preparar el visor y enseñar el aviso.
    setTimeout(function () {
      var h = findOpenLightbox();
      if (h) {
        ensureTarget(h);
        recomputeBase();
        showHint();
      } else if (host) {
        resetState();
        host = null;
        img = null;
        imgSrc = '';
      }
    }, 0);
  }

  function onDblClick(e) {
    var h = ensureTarget(e.target);
    if (!h || !img) { return; }
    e.preventDefault();
    e.stopPropagation();
    resetState();
    recomputeBase();
    apply();
  }

  /* ------------------------------------------------------------------ teclado */

  function onKeyDown(e) {
    if (!host || !img) { return; }
    if (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]')) { return; }

    var cx = baseCx + tx;   // centro visible actual
    var cy = baseCy + ty;
    var step = 1.25;

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomAt(scale * step, cx, cy);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomAt(scale / step, cx, cy);
    } else if (e.key === '0') {
      e.preventDefault();
      resetState();
      recomputeBase();
    } else if (e.key === 'Escape') {
      resetState();
    }
  }

  /* ------------------------------------------------------------------ táctil */

  function touchMid(t1, t2) {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  }

  function touchDist(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    var h = ensureTarget(e.target);
    if (!h || !img) { return; }
    if (e.touches.length === 2) {
      if (!baseReady) { recomputeBase(); }
      pinchDist = touchDist(e.touches[0], e.touches[1]);
      var m = touchMid(e.touches[0], e.touches[1]);
      pinchCx = m.x;
      pinchCy = m.y;
    }
  }

  function onTouchMove(e) {
    if (!img || e.touches.length !== 2 || !pinchDist) { return; }
    var d = touchDist(e.touches[0], e.touches[1]);
    if (!d) { return; }
    e.preventDefault();
    zoomAt(scale * (d / pinchDist), pinchCx, pinchCy);
    pinchDist = d;
    showHint();
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) { pinchDist = 0; }
  }

  /* ------------------------------------------------------------------ resize */

  function onResize() {
    if (!img || !host) { return; }
    if (scale <= MIN_SCALE + 0.001) {
      recomputeBase();
    }
  }

  /* ------------------------------------------------------------------ registro */

  function bind() {
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('dblclick', onDblClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    window.addEventListener('resize', onResize);

    // Refuerzo: si la app abre el visor por teclado o por código, se detecta igual.
    if (window.MutationObserver) {
      var pending = null;
      var mo = new MutationObserver(function () {
        if (pending) { return; }
        pending = setTimeout(function () {
          pending = null;
          if (host && !isShown(host)) {
            resetState();
            host = null;
            img = null;
            imgSrc = '';
            return;
          }
          if (!host) {
            var h = findOpenLightbox();
            if (h) { ensureTarget(h); recomputeBase(); showHint(); }
          }
        }, 60);
      });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }

    window.__antigravityLightboxZoomReady = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // API mínima por si una app quiere reiniciar el zoom a mano.
  window.AntigravityLightboxZoom = {
    reset: function () { resetState(); recomputeBase(); },
    get scale() { return scale; }
  };
})();
