/**
 * lightbox.js — visor ampliado Hoola para resultados generados
 * ============================================================
 * Abre en grande las imágenes de resultado (bandeja de resultado y vista
 * previa de IA) y las muestra en el visor `#antigravity-lightbox`.
 * El zoom con rueda, el arrastre y el pellizco los añade el módulo
 * canónico `lightbox-zoom.js`, que se engancha solo al detectar el visor.
 *
 * Uso:  <script src="assets/js/lightbox.js" defer></script>
 * ============================================================
 */
(function () {
  'use strict';

  if (window.__uisHoolaLightbox) { return; }
  window.__uisHoolaLightbox = true;

  var overlay = null;
  var image = null;
  var caption = null;
  var closeBtn = null;
  var opener = null;

  function isOpen() {
    return !!(overlay && !overlay.classList.contains('hidden'));
  }

  /** Zoom activo según el módulo de rueda (1 = sin ampliar). */
  function currentZoom() {
    try {
      return window.AntigravityLightboxZoom ? window.AntigravityLightboxZoom.scale : 1;
    } catch (err) {
      return 1;
    }
  }

  function open(src, alt) {
    if (!overlay || !image || !src) { return; }
    opener = document.activeElement;
    image.src = src;
    image.alt = alt || 'Imagen ampliada';
    if (caption) { caption.textContent = alt || ''; }
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    if (closeBtn) { closeBtn.focus(); }
  }

  function close() {
    if (!overlay) { return; }
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    if (image) { image.src = ''; }
    if (caption) { caption.textContent = ''; }
    if (opener && typeof opener.focus === 'function') {
      try { opener.focus(); } catch (err) { /* noop */ }
    }
    opener = null;
  }

  function bind() {
    overlay = document.getElementById('antigravity-lightbox');
    image = document.getElementById('lightbox-img');
    caption = document.getElementById('lightboxCaption');
    closeBtn = document.getElementById('lightboxClose');
    if (!overlay || !image) { return; }

    if (closeBtn) {
      closeBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        close();
      });
    }

    overlay.addEventListener('click', function (event) {
      if (event.target === closeBtn || (closeBtn && closeBtn.contains(event.target))) { return; }
      // Con zoom aplicado, el módulo de rueda gestiona el clic; a 1x cerramos.
      if (event.target === image && currentZoom() > 1.001) { return; }
      close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        event.stopPropagation();
        close();
      }
    }, true);

    // Delegación: cualquier imagen de resultado se puede abrir en grande.
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest || target.closest('.lightbox')) { return; }
      var media = target.closest('#resultPreview, #aiPreviewImg');
      if (!media) { return; }
      var src = media.currentSrc || media.src;
      if (!src) { return; }
      event.preventDefault();
      open(src, media.alt || 'Resultado generado');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.HoolaLightbox = { open: open, close: close };
})();
