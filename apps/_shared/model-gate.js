/*!
 * Antigravity · Model Gate v1.0.0
 * ---------------------------------------------------------------------------
 * Los modelos IMAGE 2 LOW  (openai-image-2-low)  e IMAGE 2 MEDIUM (openai-image-2)
 * siguen libres, tal y como estaban.
 * CUALQUIER otro modelo del selector (OPENAI 2.5, GEMINI, QWEN, IMAGE 2 HIGH)
 * exige introducir la contraseña antes de poder seleccionarse o usarse.
 *
 * Integración (una sola línea, justo antes de </body>):
 *   apps/<app>/index.html                  → <script src="../_shared/model-gate.js?v=1"></script>
 *   apps/imagenes_ia/<sub>/index.html      → <script src="../../_shared/model-gate.js?v=1"></script>
 *
 * API pública: window.ModelGate
 *   ModelGate.isLocked(model)     → true si ese modelo está protegido
 *   ModelGate.isUnlocked()        → true si ya se introdujo la contraseña en esta sesión
 *   ModelGate.lock()              → vuelve a bloquear en esta sesión
 *   ModelGate.unlock('05')        → desbloquea manualmente (devuelve true/false)
 *   ModelGate.request(model)      → Promise que se resuelve al desbloquear
 *
 * El desbloqueo dura la sesión del navegador (sessionStorage por origen), de modo
 * que al abrir una pestaña nueva hay que volver a introducir la contraseña.
 */
(function () {
    'use strict';

    if (window.__AG_MODEL_GATE__) { return; }
    window.__AG_MODEL_GATE__ = '1.0.0';

    /* ─────────────────────── Configuración ─────────────────────── */

    var VERSION = '1.0.0';

    /* Únicos modelos libres (no piden contraseña) */
    var FREE_MODELS = ['openai-image-2-low', 'openai-image-2'];

    /* Nombres legibles para los avisos */
    var LABELS = {
        'openai-image-2-high': 'IMAGE 2 HIGH',
        'openai-medium': 'OPENAI 2.5 MEDIUM',
        'openai-high': 'OPENAI 2.5 HIGH',
        'openai-max-flare': 'MAX FLARE',
        'openai-xhigh': 'XHIGH',
        'openai-max-sunburst': 'MAX SUNBURST',
        'gemini-2': 'GEMINI 2',
        'gemini-flash': 'GEMINI 3.1 FLASH',
        'gemini-pro': 'GEMINI 3 PRO',
        'qwen-pro': 'QWEN 3 PRO'
    };

    /* Contraseña (fuera de texto plano para que no salte en un vistazo/grep) */
    var PASS_CODE = String.fromCharCode(48, 53);

    var STORE_KEY = 'ag_model_gate_v1';
    var BYPASS = '__agModelGateBypass';

    /* ─────────────────────── Estado interno ─────────────────────── */

    var overlay = null;         /* contenedor del modal          */
    var inputEl = null;         /* campo de contraseña           */
    var errorEl = null;         /* mensaje de error              */
    var modelEl = null;         /* nombre del modelo pedido      */
    var toastEl = null;         /* aviso inferior                */
    var toastTimer = null;
    var waiters = [];           /* callbacks pendientes          */
    var pendingElement = null;  /* botón pulsado a reintentar    */
    var lastFocus = null;

    /* ─────────────────────── Utilidades ─────────────────────── */

    function isFree(model) {
        return FREE_MODELS.indexOf(String(model == null ? '' : model)) !== -1;
    }

    function isLocked(model) {
        return !!model && !isFree(model);
    }

    function isUnlocked() {
        try { return sessionStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; }
    }

    function rememberUnlock() {
        try { sessionStorage.setItem(STORE_KEY, '1'); } catch (e) { /* modo privado estricto */ }
    }

    function forgetUnlock() {
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignorado */ }
    }

    function nameOf(model) {
        return LABELS[model] || String(model || '').toUpperCase();
    }

    /* ─────────────────────── Estilos ─────────────────────── */

    var CSS = [
        /* Candado sobre los modelos protegidos */
        '.ag-model-locked{position:relative!important}',
        '.ag-model-locked::after{content:"\\1F512";position:absolute;top:.12rem;right:.3rem;',
        'font-size:.55rem;line-height:1;opacity:.9;pointer-events:none;',
        'filter:drop-shadow(0 0 3px rgba(0,208,208,.55))}',
        '.ag-model-locked:hover::after{opacity:1}',

        /* Foco visible por teclado en el selector de modelos (WCAG 2.4.7) */
        '[data-model]:focus-visible{outline:2px solid #26C626;outline-offset:2px}',

        /* Modal */
        '#ag-model-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;',
        'justify-content:center;padding:1rem;box-sizing:border-box;',
        'font-family:"Electrolize","Segoe UI",system-ui,-apple-system,sans-serif}',
        '#ag-model-gate[hidden]{display:none!important}',
        '#ag-model-gate *{box-sizing:border-box}',
        '#ag-model-gate .ag-gate__backdrop{position:absolute;inset:0;background:rgba(0,10,16,.8);',
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
        '#ag-model-gate .ag-gate__card{position:relative;width:min(94vw,430px);max-height:92vh;overflow:auto;',
        'padding:1.55rem 1.5rem 1.25rem;border-radius:18px;text-align:center;color:#E6FEFF;',
        'background:linear-gradient(160deg,rgba(5,28,36,.98),rgba(2,13,19,.99));',
        'border:1px solid rgba(0,208,208,.45);',
        'box-shadow:inset 0 0 0 1px rgba(38,198,38,.14),0 18px 60px rgba(0,0,0,.62),0 0 34px rgba(0,208,208,.22);',
        'animation:agGateIn .18s ease-out}',
        '@keyframes agGateIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}',
        '@media (prefers-reduced-motion:reduce){#ag-model-gate .ag-gate__card{animation:none}}',
        '#ag-model-gate .ag-gate__icon{font-size:1.9rem;line-height:1;margin-bottom:.5rem}',
        '#ag-model-gate .ag-gate__title{margin:0 0 .45rem;font-size:1.02rem;letter-spacing:.06em;',
        'text-transform:uppercase;color:#CCFFFF;text-shadow:0 0 10px rgba(0,208,208,.6)}',
        '#ag-model-gate .ag-gate__desc{margin:0 0 1rem;font-size:.83rem;line-height:1.5;color:#9FD8DE}',
        '#ag-model-gate .ag-gate__desc strong{color:#26C626;font-weight:600}',
        '#ag-model-gate .ag-gate__form{margin:0}',
        '#ag-model-gate .ag-gate__label{display:block;margin:0 0 .4rem;font-size:.72rem;letter-spacing:.1em;',
        'text-transform:uppercase;color:#7FC8CF;text-align:left}',
        '#ag-model-gate .ag-gate__input{width:100%;padding:.7rem .9rem;border-radius:10px;font-size:1rem;',
        'font-family:inherit;letter-spacing:.3em;color:#EAFEFF;background:rgba(0,0,0,.45);',
        'border:1px solid rgba(0,208,208,.4);outline:none;transition:border-color .2s,box-shadow .2s}',
        '#ag-model-gate .ag-gate__input:focus{border-color:#00D0D0;box-shadow:0 0 0 3px rgba(0,208,208,.22)}',
        '#ag-model-gate .ag-gate__error{min-height:1.05rem;margin:.45rem 0 0;font-size:.75rem;color:#FF8080;',
        'text-align:left}',
        '#ag-model-gate .ag-gate__actions{display:flex;gap:.6rem;margin-top:1rem}',
        '#ag-model-gate .ag-gate__btn{flex:1 1 0;padding:.68rem .8rem;border-radius:10px;cursor:pointer;',
        'font-family:inherit;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;',
        'border:1px solid transparent;transition:transform .15s,box-shadow .2s,background .2s}',
        '#ag-model-gate .ag-gate__btn:focus-visible{outline:2px solid #26C626;outline-offset:2px}',
        '#ag-model-gate .ag-gate__btn--primary{color:#00201F;font-weight:700;',
        'background:linear-gradient(135deg,#00D0D0,#26C626);box-shadow:0 0 18px rgba(0,208,208,.35)}',
        '#ag-model-gate .ag-gate__btn--primary:hover{transform:translateY(-1px);box-shadow:0 0 24px rgba(38,198,38,.45)}',
        '#ag-model-gate .ag-gate__btn--ghost{color:#9FD8DE;background:rgba(255,255,255,.04);',
        'border-color:rgba(0,208,208,.3)}',
        '#ag-model-gate .ag-gate__btn--ghost:hover{background:rgba(255,255,255,.09)}',
        '#ag-model-gate .ag-gate__note{margin:1rem 0 0;font-size:.68rem;line-height:1.45;color:#6FA9B0}',

        /* Aviso de desbloqueo */
        '#ag-model-gate-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);',
        'z-index:2147483001;padding:.6rem 1.1rem;border-radius:999px;font-size:.78rem;letter-spacing:.04em;',
        'color:#CCFFFF;background:rgba(3,24,31,.95);border:1px solid rgba(38,198,38,.55);',
        'box-shadow:0 0 22px rgba(38,198,38,.3);opacity:0;transition:opacity .25s ease;pointer-events:none;',
        'font-family:"Electrolize","Segoe UI",system-ui,sans-serif;max-width:92vw;text-align:center}',
        '#ag-model-gate-toast.ag-visible{opacity:1}'
    ].join('');

    function injectCss() {
        if (document.getElementById('ag-model-gate-css')) { return; }
        var style = document.createElement('style');
        style.id = 'ag-model-gate-css';
        style.appendChild(document.createTextNode(CSS));
        (document.head || document.documentElement).appendChild(style);
    }

    /* ─────────────────────── Modal ─────────────────────── */

    function buildModal() {
        if (overlay) { return; }

        overlay = document.createElement('div');
        overlay.id = 'ag-model-gate';
        overlay.setAttribute('hidden', '');
        overlay.innerHTML = [
            '<div class="ag-gate__backdrop" data-ag-gate-close="1"></div>',
            '<div class="ag-gate__card" role="dialog" aria-modal="true" ',
            'aria-labelledby="ag-gate-title" aria-describedby="ag-gate-desc">',
            '<div class="ag-gate__icon" aria-hidden="true">\uD83D\uDD12</div>',
            '<h2 class="ag-gate__title" id="ag-gate-title">Modelo protegido</h2>',
            '<p class="ag-gate__desc" id="ag-gate-desc">Para usar <strong id="ag-gate-model">este modelo</strong> ',
            'necesitas la contraseña. IMAGE 2 LOW y IMAGE 2 MEDIUM siguen disponibles sin contraseña.</p>',
            '<form class="ag-gate__form" id="ag-gate-form" novalidate>',
            '<label class="ag-gate__label" for="ag-gate-input">Contraseña</label>',
            '<input class="ag-gate__input" id="ag-gate-input" type="password" inputmode="numeric" ',
            'autocomplete="off" spellcheck="false" enterkeyhint="done" aria-describedby="ag-gate-error" />',
            '<p class="ag-gate__error" id="ag-gate-error" role="alert" aria-live="assertive"></p>',
            '<div class="ag-gate__actions">',
            '<button type="button" class="ag-gate__btn ag-gate__btn--ghost" id="ag-gate-cancel">Cancelar</button>',
            '<button type="submit" class="ag-gate__btn ag-gate__btn--primary" id="ag-gate-submit">Desbloquear</button>',
            '</div></form>',
            '<p class="ag-gate__note">El desbloqueo dura esta sesión del navegador.</p>',
            '</div>'
        ].join('');

        (document.body || document.documentElement).appendChild(overlay);

        inputEl = overlay.querySelector('#ag-gate-input');
        errorEl = overlay.querySelector('#ag-gate-error');
        modelEl = overlay.querySelector('#ag-gate-model');

        overlay.querySelector('#ag-gate-form').addEventListener('submit', function (ev) {
            ev.preventDefault();
            submitCode(inputEl.value);
        });

        overlay.querySelector('#ag-gate-cancel').addEventListener('click', function () { cancel(); });

        overlay.addEventListener('click', function (ev) {
            if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-ag-gate-close')) { cancel(); }
        });

        overlay.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' || ev.key === 'Esc') { ev.preventDefault(); cancel(); return; }
            if (ev.key !== 'Tab') { return; }
            var focusables = [inputEl, overlay.querySelector('#ag-gate-cancel'), overlay.querySelector('#ag-gate-submit')];
            var idx = focusables.indexOf(document.activeElement);
            var next = ev.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx === focusables.length - 1 ? 0 : idx + 1);
            ev.preventDefault();
            focusables[next].focus();
        });
    }

    function showModal(model) {
        buildModal();
        lastFocus = document.activeElement;
        modelEl.textContent = nameOf(model);
        inputEl.value = '';
        errorEl.textContent = '';
        overlay.removeAttribute('hidden');
        setTimeout(function () {
            try { inputEl.focus({ preventScroll: true }); } catch (e) { inputEl.focus(); }
        }, 30);
    }

    function hideModal() {
        if (!overlay) { return; }
        overlay.setAttribute('hidden', '');
        if (lastFocus && typeof lastFocus.focus === 'function') {
            try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignorado */ }
        }
        lastFocus = null;
    }

    /* Pide la contraseña. ok() se ejecuta al desbloquear, no() al cancelar. */
    function ask(model, ok, no) {
        waiters.push({ ok: ok, no: no });
        if (overlay && !overlay.hasAttribute('hidden')) { return; }   /* ya está abierto */
        showModal(model);
    }

    function submitCode(value) {
        if (String(value) === PASS_CODE) {
            rememberUnlock();
            errorEl.textContent = '';
            hideModal();
            toast('\u2705 Modelos avanzados desbloqueados');
            var queue = waiters;
            waiters = [];
            var element = pendingElement;
            pendingElement = null;
            queue.forEach(function (w) {
                try { if (w.ok) { w.ok(); } } catch (e) { console.error('[ModelGate]', e); }
            });
            if (element) { replayClick(element); }
            return;
        }
        errorEl.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
        inputEl.value = '';
        inputEl.focus();
        if (overlay) {
            overlay.querySelector('.ag-gate__card').animate(
                [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
                { duration: 180, iterations: 1 }
            );
        }
    }

    function cancel() {
        hideModal();
        var queue = waiters;
        waiters = [];
        pendingElement = null;
        queue.forEach(function (w) {
            try { if (w.no) { w.no(); } } catch (e) { console.error('[ModelGate]', e); }
        });
    }

    function toast(message) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'ag-model-gate-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            (document.body || document.documentElement).appendChild(toastEl);
        }
        toastEl.textContent = message;
        toastEl.classList.add('ag-visible');
        if (toastTimer) { clearTimeout(toastTimer); }
        toastTimer = setTimeout(function () { toastEl.classList.remove('ag-visible'); }, 3200);
    }

    /* ─────────────────────── Marcado de los botones ─────────────────────── */

    function decorate(el) {
        if (!el || el.nodeType !== 1 || !el.getAttribute) { return; }
        var model = el.getAttribute('data-model');
        if (!model) { return; }

        if (!isLocked(model)) {
            if (el.classList && el.classList.contains('ag-model-locked')) {
                el.classList.remove('ag-model-locked');
                el.removeAttribute('data-ag-locked');
                var tipFree = el.getAttribute('data-tooltip') || '';
                var cut = tipFree.indexOf(' \u00B7 \uD83D\uDD12');
                if (cut !== -1) { el.setAttribute('data-tooltip', tipFree.slice(0, cut)); }
            }
            return;
        }

        if (el.classList && !el.classList.contains('ag-model-locked')) {
            el.classList.add('ag-model-locked');
            el.setAttribute('data-ag-locked', nameOf(model));
            var tip = el.getAttribute('data-tooltip') || '';
            if (tip && tip.indexOf('\uD83D\uDD12') === -1) {
                el.setAttribute('data-tooltip', tip + ' \u00B7 \uD83D\uDD12 requiere contraseña');
            }
        }
    }

    function scan(root) {
        if (!root) { return; }
        if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute('data-model')) { decorate(root); }
        if (root.querySelectorAll) {
            var list = root.querySelectorAll('[data-model]');
            for (var i = 0; i < list.length; i++) { decorate(list[i]); }
        }
    }

    function watchDom() {
        scan(document);
        if (typeof MutationObserver !== 'function') { return; }
        var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes') { decorate(m.target); continue; }
                for (var j = 0; j < m.addedNodes.length; j++) {
                    if (m.addedNodes[j].nodeType === 1) { scan(m.addedNodes[j]); }
                }
            }
        });
        observer.observe(document.documentElement, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-model']
        });
    }

    /* ─────────────────────── Intercepción de clics ─────────────────────── */

    function replayClick(el) {
        window[BYPASS] = true;
        try { el.click(); } catch (e) { console.error('[ModelGate]', e); }
        setTimeout(function () { window[BYPASS] = false; }, 0);
    }

    function onCapture(ev) {
        if (window[BYPASS] || isUnlocked()) { return; }
        var target = ev.target;
        if (!target || !target.closest) { return; }
        var el = target.closest('[data-model]');
        if (!el) { return; }
        var model = el.getAttribute('data-model');
        if (!isLocked(model)) { return; }

        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) { ev.stopImmediatePropagation(); }

        pendingElement = el;
        ask(model, null, null);
    }

    /* ─────────────────────── Guardián de peticiones ─────────────────────── */

    function modelInBody(body) {
        try {
            if (!body) { return null; }
            if (typeof body === 'string') {
                var re = /"model"\s*:\s*"([^"]+)"/g;
                var match;
                while ((match = re.exec(body)) !== null) {
                    if (isLocked(match[1])) { return match[1]; }
                }
                return null;
            }
            if (typeof FormData !== 'undefined' && body instanceof FormData) {
                var fd = body.get('model');
                return (typeof fd === 'string' && isLocked(fd)) ? fd : null;
            }
            if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
                var usp = body.get('model');
                return (typeof usp === 'string' && isLocked(usp)) ? usp : null;
            }
        } catch (e) { /* nunca romper la app */ }
        return null;
    }

    function guardFetch() {
        if (typeof window.fetch !== 'function' || window.fetch.__agModelGate) { return; }
        var nativeFetch = window.fetch;

        function gatedFetch(input, init) {
            try {
                var url = (typeof input === 'string') ? input : ((input && input.url) || '');
                if (!/history/i.test(url)) {
                    var model = modelInBody(init && init.body);
                    if (model && !isUnlocked()) {
                        var self = this;
                        var args = arguments;
                        return new Promise(function (resolve, reject) {
                            ask(model, function () {
                                try { resolve(nativeFetch.apply(self, args)); } catch (err) { reject(err); }
                            }, function () {
                                reject(new Error('El modelo ' + nameOf(model) + ' está protegido: introduce la contraseña para usarlo.'));
                            });
                        });
                    }
                }
            } catch (e) { /* el guardián nunca debe romper la app */ }
            return nativeFetch.apply(this, arguments);
        }

        gatedFetch.__agModelGate = true;
        window.fetch = gatedFetch;
    }

    /* ─────────────────────── Arranque ─────────────────────── */

    function start() {
        injectCss();
        watchDom();
        window.addEventListener('click', onCapture, true);
        document.addEventListener('click', onCapture, true);
        guardFetch();
    }

    window.ModelGate = {
        version: VERSION,
        free: FREE_MODELS.slice(),
        isLocked: isLocked,
        isUnlocked: isUnlocked,
        lock: function () { forgetUnlock(); if (overlay) { overlay.setAttribute('hidden', ''); } return true; },
        unlock: function (code) {
            if (String(code) === PASS_CODE) { rememberUnlock(); return true; }
            return false;
        },
        request: function (model) {
            return new Promise(function (resolve, reject) { ask(model, resolve, reject); });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
