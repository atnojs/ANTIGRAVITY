/*!
 * password-eye.js — visor de contraseña para las apps y webs de Antigravity
 * Versión: 20261025b
 *
 * Añade un botón de ojo a cada campo <input type="password"> para poder ver
 * lo escrito y volver a ocultarlo. No cambia la estructura del formulario:
 * el botón flota sobre el borde derecho del campo, así que no altera el
 * layout de la página.
 *
 * Comportamiento:
 *  - Detecta los campos que ya existen y los que crea el JS/React después.
 *  - Un clic en el ojo alterna password <-> text conservando el valor.
 *  - Teclado: botón accesible por Tab + Enter/Espacio; con el campo enfocado,
 *    el atajo Alt+Shift+P también alterna.
 *  - aria-label / aria-pressed describen el estado (Mostrar/Ocultar contraseña).
 *  - Se oculta solo cuando el campo no es visible (modal cerrado, tapado,
 *    fuera de pantalla...), sin dejar huecos ni botones fantasma.
 *
 * Uso: <script src="/apps/_shared/password-eye.js?v=20261025b" defer></script>
 * API pública (para diagnósticos): window.AGPasswordEye
 *   .version  -> versión cargada
 *   .refresh()-> fuerza una resincronización
 *   .count()  -> nº de campos gestionados
 */
(function () {
  'use strict';

  var VERSION = '20261025b';
  var ATTR = 'data-agp-eye';
  var PAD_ATTR = 'data-agp-pad';
  var STYLE_ID = 'agp-eye-style';

  if (window.__AGP_EYE__ === VERSION) { return; }
  window.__AGP_EYE__ = VERSION;

  var doc = document;
  var recs = new Map();          // input -> { input, btn, onKeydown }
  var mounted = false;
  var pending = 0;
  var lastSync = 0;

  var SVG_EYE =
    '<svg class="agp-eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var SVG_EYE_OFF =
    '<svg class="agp-eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  var CSS = [
    '.agp-eye{',
    'position:fixed!important;z-index:2147483647!important;display:inline-flex!important;',
    'align-items:center!important;justify-content:center!important;box-sizing:border-box!important;',
    'margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;',
    'background:transparent!important;color:var(--agp-color,rgba(150,160,168,.95))!important;',
    'cursor:pointer!important;opacity:.82;-webkit-tap-highlight-color:transparent!important;',
    'font:inherit!important;line-height:1!important;appearance:none!important;outline:none;',
    'transition:opacity .15s ease,background-color .15s ease,color .15s ease;',
    '}',
    '.agp-eye::after{content:"";position:absolute;inset:-6px;border-radius:50%;}',
    '.agp-eye:hover{opacity:1!important;background-color:rgba(0,208,208,.16)!important;color:var(--agp-accent,#00D0D0)!important;}',
    '.agp-eye:focus-visible{opacity:1!important;outline:2px solid var(--agp-accent,#00D0D0)!important;',
    'outline-offset:2px!important;background-color:rgba(0,208,208,.2)!important;color:var(--agp-accent,#00D0D0)!important;}',
    '.agp-eye[aria-pressed="true"]{opacity:1!important;color:var(--agp-accent,#00D0D0)!important;}',
    '.agp-eye svg{display:block;width:72%;height:72%;pointer-events:none;}',
    '.agp-eye .agp-eye-hide{display:none;}',
    '.agp-eye[aria-pressed="true"] .agp-eye-show{display:none;}',
    '.agp-eye[aria-pressed="true"] .agp-eye-hide{display:block;}',
    /* Botón puente para modales con trampa de foco: invisible, pero con el
       foco del teclado y el nombre accesible del ojo. */
    '.agp-eye-proxy{position:absolute!important;width:1px!important;height:1px!important;',
    'padding:0!important;margin:-1px!important;overflow:hidden!important;border:0!important;',
    'clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;',
    'opacity:0!important;pointer-events:none!important;}',
    '.agp-eye.agp-eye--focus{opacity:1!important;outline:2px solid var(--agp-accent,#00D0D0)!important;',
    'outline-offset:2px!important;background-color:rgba(0,208,208,.2)!important;',
    'color:var(--agp-accent,#00D0D0)!important;}',
    '@media (prefers-reduced-motion:reduce){.agp-eye{transition:none!important;}}',
    '@media print{.agp-eye{display:none!important;}}'
  ].join('');

  /* ── utilidades ─────────────────────────────────────────────────── */

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function parseColor(value) {
    if (!value) return null;
    var m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i.exec(value);
    if (!m) return null;
    return {
      r: parseFloat(m[1]),
      g: parseFloat(m[2]),
      b: parseFloat(m[3]),
      a: m[4] === undefined ? 1 : parseFloat(m[4])
    };
  }

  function channelLum(c) {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function lum(rgb) {
    return 0.2126 * channelLum(rgb.r) + 0.7152 * channelLum(rgb.g) + 0.0722 * channelLum(rgb.b);
  }

  function contrast(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // Fondo efectivo del campo: compone las capas de color hasta la primera opaca.
  function effectiveBackground(el) {
    var layers = [];
    var node = el;
    var depth = 0;
    while (node && node.nodeType === 1 && depth < 16) {
      var cs = null;
      try { cs = window.getComputedStyle(node); } catch (e) { break; }
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0.01) {
        layers.push(c);
        if (c.a >= 0.99) break;
      }
      node = node.parentElement;
      depth++;
    }
    var base = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  }

  // Composite: "top" (más cercano al campo) sobre "bottom".
  function blend(top, bottom) {
    var a = top.a;
    return {
      r: top.r * a + bottom.r * (1 - a),
      g: top.g * a + bottom.g * (1 - a),
      b: top.b * a + bottom.b * (1 - a),
      a: 1
    };
  }

  function paletteFor(input) {
    var cs = window.getComputedStyle(input);
    var bg = effectiveBackground(input);
    var light = lum(bg) > 0.55;
    var accent = light ? '#007a78' : '#00D0D0';
    var text = parseColor(cs.color);
    var base;
    if (text && text.a > 0.4 && contrast(text, bg) >= 2.4) {
      base = 'rgba(' + Math.round(text.r) + ',' + Math.round(text.g) + ',' + Math.round(text.b) + ',' +
        Math.max(0.75, Math.min(1, text.a)).toFixed(2) + ')';
    } else {
      base = light ? 'rgba(18,73,75,.92)' : 'rgba(199,233,233,.92)';
    }
    return { base: base, accent: accent };
  }

  // ¿El antecesor crea bloque contenedor para position:fixed?
  function createsContainingBlock(cs) {
    if (cs.transform && cs.transform !== 'none') return true;
    if (cs.filter && cs.filter !== 'none') return true;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') return true;
    if (cs.perspective && cs.perspective !== 'none') return true;
    if (cs.contain && /paint|layout|strict|content/.test(cs.contain)) return true;
    if (cs.willChange && /transform|filter|perspective/.test(cs.willChange)) return true;
    return false;
  }

  // El botón va pegado al campo (orden de tabulación correcto) salvo que un
  // antecesor con transform/filter/backdrop-filter rompa position:fixed;
  // en ese caso se monta en <body> (o en el <dialog> abierto) para que
  // siempre quede en coordenadas de viewport y por encima del modal.
  function chooseHost(input) {
    var el = input.parentElement;
    var dialog = null;
    var blocked = false;
    var guard = 0;
    while (el && el !== doc.body && el !== doc.documentElement && guard < 400) {
      guard++;
      var tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'dialog' && el.open) dialog = el;
      var cs = null;
      try { cs = window.getComputedStyle(el); } catch (e) { break; }
      if (cs && createsContainingBlock(cs)) { blocked = true; }
      el = el.parentElement;
    }
    if (dialog) return { node: dialog, mode: 'append' };
    if (blocked) return { node: doc.body, mode: 'append' };
    return { node: null, mode: 'after' };
  }

  /* ── construcción del botón ─────────────────────────────────────── */

  function addStyle() {
    if (doc.getElementById(STYLE_ID)) return;
    try {
      if (typeof CSSStyleSheet === 'function' &&
          'replaceSync' in CSSStyleSheet.prototype &&
          'adoptedStyleSheets' in doc) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.concat([sheet]);
        return;
      }
    } catch (e) { /* seguimos con <style> */ }
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.appendChild(doc.createTextNode(CSS));
    (doc.head || doc.documentElement).appendChild(style);
  }

  function reserveSpace(input) {
    if (input.getAttribute(PAD_ATTR)) return;
    var cs = window.getComputedStyle(input);
    var pr = parseFloat(cs.paddingRight) || 0;
    if (pr >= 30) { input.setAttribute(PAD_ATTR, 'ok'); return; }
    var before = input.getBoundingClientRect().width;
    var prevBox = input.style.boxSizing;
    var prevPad = input.style.paddingRight;
    if (cs.boxSizing !== 'border-box') input.style.boxSizing = 'border-box';
    input.style.paddingRight = '30px';
    var after = input.getBoundingClientRect().width;
    // Si el campo cambia de tamaño, el ajuste rompería el layout: se revierte.
    if (Math.abs(after - before) > 2) {
      input.style.boxSizing = prevBox;
      input.style.paddingRight = prevPad;
      input.setAttribute(PAD_ATTR, 'no');
    } else {
      input.setAttribute(PAD_ATTR, 'ok');
    }
  }

  function attach(input) {
    var rec = recs.get(input);
    if (rec) return rec;

    // El montaje se decide antes de crear el control: si el campo vive en un
    // modal con un ancestro que rompe position:fixed (transform, filter,
    // backdrop-filter...), el botón visible va a <body> y el teclado se
    // resuelve con un botón puente invisible dentro del modal, para que entre
    // en su trampa de foco y en el orden de tabulación.
    var host = chooseHost(input);
    var needsProxy = host.mode === 'append' && host.node === doc.body;

    var btn;
    if (needsProxy) {
      // Solo visual: sin foco ni semántica propia (la semántica es el puente).
      btn = doc.createElement('span');
      btn.setAttribute('aria-hidden', 'true');
    } else {
      btn = doc.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Mostrar contraseña');
      btn.setAttribute('aria-keyshortcuts', 'Alt+Shift+P');
      btn.setAttribute('tabindex', '0');
    }
    btn.className = 'agp-eye';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('title', 'Mostrar contraseña (Alt+Shift+P)');
    btn.innerHTML = SVG_EYE + SVG_EYE_OFF;
    btn.style.visibility = 'hidden';
    btn.style.left = '-9999px';
    btn.style.top = '-9999px';

    var onKeydown = function (ev) {
      if (ev.altKey && ev.shiftKey && (ev.key === 'P' || ev.key === 'p' || ev.code === 'KeyP')) {
        ev.preventDefault();
        toggle(input, false);
      }
    };

    var block = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
    btn.addEventListener('pointerdown', block, false);
    btn.addEventListener('mousedown', block, false);
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggle(input, ev.detail === 0 && !needsProxy);
    }, false);

    input.addEventListener('keydown', onKeydown, false);
    try { input.setAttribute(ATTR, '1'); } catch (e) {}

    var shortcuts = input.getAttribute('aria-keyshortcuts');
    if (!shortcuts || shortcuts.indexOf('Alt+Shift+P') === -1) {
      input.setAttribute('aria-keyshortcuts', shortcuts ? shortcuts + ' Alt+Shift+P' : 'Alt+Shift+P');
    }

    var proxy = null;
    if (host.mode === 'after' && input.parentNode) {
      // Sin contenedor problemático: el botón visible va detrás del campo.
      input.insertAdjacentElement('afterend', btn);
    } else if (!needsProxy && host.node) {
      // <dialog> abierto: dentro del propio diálogo (top layer).
      host.node.appendChild(btn);
    } else {
      doc.body.appendChild(btn);
      proxy = doc.createElement('button');
      proxy.type = 'button';
      proxy.className = 'agp-eye-proxy';
      proxy.setAttribute('tabindex', '0');
      proxy.setAttribute('aria-label', 'Mostrar contraseña');
      proxy.setAttribute('aria-pressed', 'false');
      proxy.setAttribute('aria-keyshortcuts', 'Alt+Shift+P');
      proxy.setAttribute('title', 'Mostrar contraseña (Alt+Shift+P)');
      proxy.addEventListener('focus', function () { btn.classList.add('agp-eye--focus'); }, false);
      proxy.addEventListener('blur', function () { btn.classList.remove('agp-eye--focus'); }, false);
      proxy.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        toggle(input, true);
      }, false);
      if (input.parentNode) input.insertAdjacentElement('afterend', proxy);
      else doc.body.appendChild(proxy);
    }

    rec = { input: input, btn: btn, proxy: proxy, onKeydown: onKeydown, palette: null, padded: false };
    recs.set(input, rec);
    return rec;
  }

  function detach(rec) {
    try { rec.input.removeEventListener('keydown', rec.onKeydown, false); } catch (e) {}
    try { if (rec.btn.parentNode) rec.btn.parentNode.removeChild(rec.btn); } catch (e) {}
    try { if (rec.proxy && rec.proxy.parentNode) rec.proxy.parentNode.removeChild(rec.proxy); } catch (e) {}
    recs.delete(rec.input);
  }

  /* ── visibilidad y posición ─────────────────────────────────────── */

  function render(rec) {
    var hidden = function () {
      if (rec.btn.style.visibility !== 'hidden') rec.btn.style.visibility = 'hidden';
    };
    var input = rec.input;
    if (!input.isConnected) { hidden(); return false; }

    var cs;
    try { cs = window.getComputedStyle(input); } catch (e) { hidden(); return false; }
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) {
      hidden();
      return false;
    }

    var rect = input.getBoundingClientRect();
    if (rect.width < 56 || rect.height < 14) { hidden(); return false; }
    if (rect.bottom < 4 || rect.top > (window.innerHeight || 0) - 4 ||
        rect.right < 4 || rect.left > (window.innerWidth || 0) - 4) {
      hidden();
      return false;
    }

    // Comprobación de tapado: si otro elemento cubre el campo, no pintamos ojo.
    var probeY = rect.top + rect.height / 2;
    var probes = [
      rect.left + Math.min(Math.max(3, rect.width * 0.08), 10),
      rect.left + Math.min(rect.width * 0.35, 60)
    ];
    var onTop = false;
    for (var i = 0; i < probes.length; i++) {
      var hit = null;
      try { hit = doc.elementFromPoint(probes[i], probeY); } catch (e) { hit = null; }
      if (hit === input) { onTop = true; break; }
    }
    if (!onTop) { hidden(); return false; }

    // Recorte por antecesores con overflow (modales con scroll, etc.) y
    // opacidad acumulada (cajas "ocultas" con opacity:0 siguen ocupando sitio).
    var clip = { left: 0, top: 0, right: window.innerWidth || 0, bottom: window.innerHeight || 0 };
    var effOpacity = 1;
    var node = input.parentElement;
    var guard = 0;
    while (node && node !== doc.body && node !== doc.documentElement && guard < 400) {
      guard++;
      var acs = null;
      try { acs = window.getComputedStyle(node); } catch (e) { break; }
      if (acs) {
        var aop = parseFloat(acs.opacity);
        if (!isNaN(aop)) effOpacity *= aop;
        var ox = acs.overflowX, oy = acs.overflowY;
        if (ox && ox !== 'visible') {
          var ar = node.getBoundingClientRect();
          clip.left = Math.max(clip.left, ar.left);
          clip.right = Math.min(clip.right, ar.right);
        }
        if (oy && oy !== 'visible') {
          var br = node.getBoundingClientRect();
          clip.top = Math.max(clip.top, br.top);
          clip.bottom = Math.min(clip.bottom, br.bottom);
        }
      }
      node = node.parentElement;
    }
    if (effOpacity < 0.05) { hidden(); return false; }

    var visLeft = Math.max(rect.left, clip.left);
    var visRight = Math.min(rect.right, clip.right);
    var visTop = Math.max(rect.top, clip.top);
    var visBottom = Math.min(rect.bottom, clip.bottom);
    if (visRight - visLeft < 42 || visBottom - visTop < 14) { hidden(); return false; }

    // El hueco para el ojo se reserva la primera vez que el campo es visible,
    // midiendo ya en su sitio para no alterar el layout si no cabe.
    if (!rec.padded) {
      rec.padded = true;
      reserveSpace(input);
      rect = input.getBoundingClientRect();
      visLeft = Math.max(rect.left, clip.left);
      visRight = Math.min(rect.right, clip.right);
      visTop = Math.max(rect.top, clip.top);
      visBottom = Math.min(rect.bottom, clip.bottom);
      if (visRight - visLeft < 42 || visBottom - visTop < 14) { hidden(); return false; }
    }

    var size = Math.round(clamp(rect.height - 8, 18, 26));
    var inset = Math.round(clamp((rect.height - size) / 2, 3, 8));
    var left = visRight - size - inset;
    var top = visTop + (visBottom - visTop - size) / 2;
    if (left < visLeft + 2) { hidden(); return false; }

    // Estado del botón según el tipo real del campo (visible y puente accesible).
    var shown = input.type === 'text';
    var label = shown ? 'Ocultar contraseña' : 'Mostrar contraseña';
    if (rec.btn.getAttribute('aria-pressed') !== String(shown)) {
      rec.btn.setAttribute('aria-pressed', String(shown));
      rec.btn.setAttribute('title', label + ' (Alt+Shift+P)');
      if (!rec.proxy) {
        rec.btn.setAttribute('aria-label', label);
      }
    }
    if (rec.proxy && rec.proxy.getAttribute('aria-pressed') !== String(shown)) {
      rec.proxy.setAttribute('aria-pressed', String(shown));
      rec.proxy.setAttribute('aria-label', label);
      rec.proxy.setAttribute('title', label + ' (Alt+Shift+P)');
    }

    var palette = paletteFor(input);
    if (!rec.palette || rec.palette.base !== palette.base || rec.palette.accent !== palette.accent) {
      rec.palette = palette;
      rec.btn.style.setProperty('--agp-color', palette.base);
      rec.btn.style.setProperty('--agp-accent', palette.accent);
    }

    if (rec.btn.style.width !== size + 'px') {
      rec.btn.style.width = size + 'px';
      rec.btn.style.height = size + 'px';
    }
    rec.btn.style.left = Math.round(left) + 'px';
    rec.btn.style.top = Math.round(top) + 'px';
    if (rec.btn.style.visibility !== 'visible') rec.btn.style.visibility = 'visible';
    return true;
  }

  /* ── interacción ────────────────────────────────────────────────── */

  function toggle(input, viaKeyboard) {
    if (!input || typeof input.type !== 'string') return;
    var next = input.type === 'password' ? 'text' : 'password';
    try { input.type = next; } catch (e) { return; }
    var rec = recs.get(input);
    if (rec) { render(rec); }
    if (viaKeyboard) {
      try {
        input.focus({ preventScroll: true });
        var end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (e) {}
    }
    if (!rec && input.isConnected) {
      try { attach(input); sync(); } catch (e) {}
    }
  }

  /* ── sincronización ─────────────────────────────────────────────── */

  function sync() {
    if (!mounted) return;
    lastSync = Date.now();
    var nodes = doc.querySelectorAll('input[type="password"], input[' + ATTR + ']');
    var seen = new Set();
    for (var i = 0; i < nodes.length; i++) {
      var input = nodes[i];
      if (!input || !input.isConnected) continue;
      seen.add(input);
      var rec = attach(input);
      render(rec);
    }
    recs.forEach(function (rec, input) {
      if (!seen.has(input)) detach(rec);
    });
  }

  function schedule() {
    if (pending) return;
    pending = window.setTimeout(function () {
      pending = 0;
      var now = Date.now();
      // Evita ráfagas en apps que mutan el DOM muy a menudo.
      if (now - lastSync < 45) {
        window.setTimeout(sync, 60);
      } else {
        sync();
      }
    }, 40);
  }

  /* ── arranque ───────────────────────────────────────────────────── */

  function init() {
    if (mounted) return;
    mounted = true;
    try { addStyle(); } catch (e) {}
    try { doc.documentElement.setAttribute('data-agp-eye', VERSION); } catch (e) {}
    try { sync(); } catch (e) {}
    try {
      var opts = { passive: true };
      window.addEventListener('resize', schedule, opts);
      window.addEventListener('scroll', schedule, true);
      window.addEventListener('pageshow', schedule, false);
      window.addEventListener('load', schedule, false);
      doc.addEventListener('transitionend', schedule, true);
      doc.addEventListener('animationend', schedule, true);
      doc.addEventListener('focusin', schedule, true);
      doc.addEventListener('focusout', schedule, true);
      doc.addEventListener('visibilitychange', schedule, false);
      if (window.MutationObserver) {
        var mo = new MutationObserver(schedule);
        mo.observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['type', 'hidden', 'style', 'class', 'open', 'disabled']
        });
      }
      // Repasos cortos para animaciones de apertura de modales y fuentes.
      [250, 700, 1500, 3000].forEach(function (ms) {
        window.setTimeout(function () { if (mounted) schedule(); }, ms);
      });
      // Red de seguridad: cambios de visibilidad no observables por atributos.
      window.setInterval(function () {
        if (!doc.hidden) sync();
      }, 500);
      window.AGPasswordEye = {
        version: VERSION,
        refresh: sync,
        toggle: toggle,
        count: function () { return recs.size; }
      };
    } catch (e) {}
  }

  function ready(fn) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(init);
})();
