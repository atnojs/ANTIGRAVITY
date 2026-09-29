/**
 * Lightbox + History Auto-Save — Módulo reutilizable Antigravity
 * =================================================================
 * Añade lightbox a cualquier app con solo incluir este script.
 * También hace auto-guardado de imágenes generadas al HistoryManager si existe.
 *
 * Uso: <script src="../_shared/lightbox.js"></script>
 * =================================================================
 */
(function () {
  'use strict';

  // ===== LIGHTBOX =====
  // CSS para lightbox: display flex solo cuando NO tiene clase hidden
  if (!document.getElementById('lightbox-antigravity-style')) {
    const style = document.createElement('style');
    style.id = 'lightbox-antigravity-style';
    style.textContent = '#lightbox-antigravity:not(.hidden) { display: flex; }';
    document.head.appendChild(style);
  }

  if (!document.getElementById('lightbox-antigravity')) {
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox-antigravity';
    lightbox.className = 'lightbox hidden';
    lightbox.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:90000;align-items:center;justify-content:center;cursor:zoom-out;';
    lightbox.innerHTML = `
      <div style="position:absolute;top:20px;right:20px;display:flex;gap:12px;z-index:10;">
        <button id="lb-download" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Descargar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button id="lb-close" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <img id="lb-img" src="" alt="Imagen ampliada" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;" />
    `;
    document.body.appendChild(lightbox);

    const lb = document.getElementById('lightbox-antigravity');
    const lbImg = document.getElementById('lb-img');
    const lbClose = document.getElementById('lb-close');
    const lbDownload = document.getElementById('lb-download');

    function openLightbox(src) {
      lbImg.src = src;
      lbDownload.onclick = function () {
        const a = document.createElement('a');
        a.href = src;
        a.download = 'imagen-generada.png';
        a.click();
      };
      lb.classList.remove('hidden');
    }
    function closeLightbox() { lb.classList.add('hidden'); }

    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lbImg) closeLightbox();
    });
    lbClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.classList.contains('hidden')) closeLightbox();
    });

    // Exponer globalmente
    window.AntigravityLightbox = { open: openLightbox, close: closeLightbox };

    // Auto-detectar imágenes generadas y hacerlas clicables
    function makeImagesZoomable() {
      const selectors = [
        '#results-image-grid img',
        '#historyGrid img',
        '#results-section img',
        '.results img',
        '.result-card img',
        '[class*="result"] img',
        '[class*="generated"] img',
        'img[src^="data:image"]'
      ];
      selectors.forEach(function (sel) {
        try {
          document.querySelectorAll(sel).forEach(function (img) {
            if (!img.dataset.lightboxEnabled) {
              img.style.cursor = 'zoom-in';
              img.addEventListener('click', function () { openLightbox(img.src); });
              img.dataset.lightboxEnabled = '1';
            }
          });
        } catch (e) { /* ignore invalid selectors */ }
      });
    }

    // Ejecutar al cargar y observar cambios
    makeImagesZoomable();
    if (window.MutationObserver) {
      new MutationObserver(function () { makeImagesZoomable(); }).observe(document.body, { childList: true, subtree: true });
    }
  }
})();
