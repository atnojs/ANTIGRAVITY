/* ============================================================
   Flow Studio — Google Flow + modelos directos de imagen
   Imágenes (Flow, OpenAI, Gemini y Qwen) y vídeos (Veo) en la misma app.
   El catálogo, los ids y la compuerta de contraseña son los MISMOS de
   Unified Image Studio · Hoola (apps/_shared/model-gate.20261026b.js).
   ============================================================ */
(() => {
    'use strict';

    const API = 'flow_queue.php';
    const AI = 'proxy.php';
    const JOBS = 'api.php';
    const PENDING_KEY = 'flowStudioPending';
    const POLL_MS = 2500;
    // Los modelos directos se ejecutan dentro de la petición (el servidor llama
    // al proveedor y devuelve la imagen). Si el hosting corta antes, se sigue
    // consultando el trabajo por id sin reenviarlo.
    const DIRECT_POLL_MS = 2500;
    const DIRECT_TIMEOUT_MS = 210000;
    const HISTORY_ON_CANVAS = 8;
    // Referencias: como máximo 2. El navegador las reescala a 1280 px para que
    // la petición a la cola no se dispare y Flow reciba un JPEG ligero.
    const REF_MAX_FILES = 2;
    // Calidad de las referencias elegible en la app: 1280 sube rápido; 2048
    // conserva caras y textos (recomendación de la skill de Flow) pero tarda más.
    const REF_SIDES = { rapida: 1280, maxima: 2048 };
    const REF_MAX_SIDE = REF_SIDES.rapida;
    const REF_SIDE_KEY = 'flowStudioRefSide';
    const REF_MAX_BYTES = 8 * 1024 * 1024;
    const REF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    // Imagen que se edita: se reescala a 1600 px y se guarda con más calidad que
    // una referencia, porque es la base de la edición.
    const SOURCE_MAX_SIDE = 1600;
    const SOURCE_QUALITY = 0.92;
    // El escalado se hace en este navegador. 8192 px por lado evita que el
    // lienzo se coma la memoria del equipo (8× de una imagen de 1024 = 8192).
    const UPSCALE_MAX_SIDE = 8192;
    const RATIO_VALUES = { '1:1': 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4 };
    // Vídeo: la UI de Flow solo ofrece 16:9 y 9:16, y cada clip gasta puntos
    // de la cuenta de Google, así que el modo vídeo pide confirmación.
    const VIDEO_RATIOS = ['16:9', '9:16'];

    // Catálogo espejo del contrato canónico del servidor
    // (lib/canonical-image-model.php) más el motor Flow, que se ejecuta en el PC.
    // Los ids son los mismos del estudio: la compuerta compartida decide con
    // ellos qué modelos piden contraseña. Flow va primero: es el motor preferente.
    const MODELS = [
        { id: 'flow-nano-banana-2', group: 'FLOW · GOOGLE', label: 'NANO BANANA 2', provider: 'flow', display: 'Flow · Nano Banana 2', note: 'Nano Banana 2 en tu PC con Google Flow. Es el modelo inicial de un trabajo nuevo.' },
        { id: 'flow-nano-banana-pro', group: 'FLOW · GOOGLE', label: 'NANO BANANA PRO', provider: 'flow', display: 'Flow · Nano Banana Pro', note: 'Nano Banana Pro con Flow: más detalle, tarda algo más.' },
        { id: 'flow-nano-banana-2-lite', group: 'FLOW · GOOGLE', label: 'NANO BANANA 2 LITE', provider: 'flow', display: 'Flow · Nano Banana 2 Lite', note: 'Nano Banana 2 Lite con Flow: el más rápido.' },
        { id: 'openai-medium', group: 'OPENAI 2.5', label: 'MEDIUM', provider: 'openai', display: 'OpenAI 2.5 · Medium', note: 'Flare en calidad media: la opción más rápida de la gama 2.5.' },
        { id: 'openai-high', group: 'OPENAI 2.5', label: 'HIGH', provider: 'openai', display: 'OpenAI 2.5 · High', note: 'Flare en calidad alta: más detalle que MEDIUM.' },
        { id: 'openai-max-flare', group: 'OPENAI 2.5', label: 'MAX FLARE', provider: 'openai', display: 'OpenAI 2.5 · Max Flare', note: 'Calidad máxima del modelo flare.' },
        { id: 'openai-xhigh', group: 'OPENAI 2.5', label: 'XHIGH', provider: 'openai', display: 'OpenAI 2.5 · XHigh', note: 'Sunburst: precisión en edición y consistencia en rostros.' },
        { id: 'openai-max-sunburst', group: 'OPENAI 2.5', label: 'MAX SUNBURST', provider: 'openai', display: 'OpenAI 2.5 · Max Sunburst', note: 'Calidad máxima del modelo sunburst.' },
        { id: 'gemini-2', group: 'GEMINI', label: 'GEMINI 2', provider: 'gemini', display: 'Gemini 2', note: 'Gemini 2.5 Flash Image: el más ligero del grupo.' },
        { id: 'gemini-flash', group: 'GEMINI', label: '3.1 FLASH', provider: 'gemini', display: 'Gemini 3.1 Flash', note: 'Gemini 3.1 Flash: rápido y bueno con texto.' },
        { id: 'gemini-pro', group: 'GEMINI', label: '3 PRO', provider: 'gemini', display: 'Gemini 3 Pro', note: 'Gemini 3 Pro: máxima calidad del grupo para texto.' },
        { id: 'qwen-pro', group: 'QWEN', label: 'QWEN 3 PRO', provider: 'qwen', display: 'Qwen 3 Pro', note: 'Qwen Image 3 Pro: texto nítido y diseños densos.' },
        { id: 'openai-image-2-low', group: 'IMAGE 2', label: 'LOW', provider: 'openai', display: 'Image 2 · Low', note: 'gpt-image-2 en calidad baja: la opción más rápida y barata de los proveedores directos.' },
        { id: 'openai-image-2', group: 'IMAGE 2', label: 'MEDIUM', provider: 'openai', display: 'Image 2 · Medium', note: 'gpt-image-2 en calidad media.' },
        { id: 'openai-image-2-high', group: 'IMAGE 2', label: 'HIGH', provider: 'openai', display: 'Image 2 · High', note: 'gpt-image-2 en calidad alta: más detalle.' },
    ];
    const MODEL_BY_ID = new Map(MODELS.map((model) => [model.id, model]));
    const DEFAULT_MODEL = MODELS[0].id;
    // Los ids de vídeo son los de la compuerta; flow_queue.php los traduce al
    // nombre que espera el menú de Flow, así que el worker no cambia.
    const VIDEO_MODELS = [
        { id: 'veo-3.1-lite', label: 'Veo 3.1 Lite' },
        { id: 'veo-3.1-fast', label: 'Veo 3.1 Fast' },
        { id: 'veo-3.1-quality', label: 'Veo 3.1 Quality' },
        { id: 'omni-flash', label: 'Omni Flash' },
    ];
    const VIDEO_BY_ID = new Map(VIDEO_MODELS.map((model) => [model.id, model]));
    const DEFAULT_VIDEO = VIDEO_MODELS[0].id;
    const RESOLUTIONS = [512, 1024, 2048, 4096];

    const modelById = (id) => MODEL_BY_ID.get(id) || MODELS[0];
    const isFlowModel = (id) => modelById(id).provider === 'flow';
    const videoById = (id) => VIDEO_BY_ID.get(id) || VIDEO_MODELS[0];


    const $ = (sel) => document.querySelector(sel);

    const els = {
        prompt: $('#prompt'),
        charCount: $('#charCount'),
        modelChips: $('#modelChips'),
        modelNote: $('#modelNote'),
        resolutionSelect: $('#resolutionSelect'),
        resolutionControl: $('#resolutionControl'),
        ratioChips: $('#ratioChips'),
        countChips: $('#countChips'),
        btnGenerate: $('#btnGenerate'),
        btnLabel: $('#btnLabel'),
        btnIcon: $('#btnIcon'),
        queueNote: $('#queueNote'),
        grid: $('#grid'),
        emptyState: $('#emptyState'),
        studioCount: $('#studioCount'),
        btnClear: $('#btnClear'),
        workerStatus: $('#workerStatus'),
        btnHistory: $('#btnHistory'),
        btnAccess: $('#btnAccess'),
        historyPanel: $('#historyPanel'),
        btnHistoryClose: $('#btnHistoryClose'),
        historyList: $('#historyList'),
        lightbox: $('#lightbox'),
        lightboxImg: $('#lightboxImg'),
        lightboxCaption: $('#lightboxCaption'),
        lightboxClose: $('#lightboxClose'),
        accessModal: $('#accessModal'),
        accessForm: $('#accessForm'),
        accessPassword: $('#accessPassword'),
        accessError: $('#accessError'),
        accessSubmit: $('#accessSubmit'),
        accessCancel: $('#accessCancel'),
        accessClose: $('#accessClose'),
        accessTitle: $('#accessTitle'),
        accessDesc: $('#accessDesc'),
        accessLogout: $('#accessLogout'),
        loadingOverlay: $('#loadingOverlay'),
        loadingText: $('#loadingText'),
        loadingSub: $('#loadingSub'),
        btnHideOverlay: $('#btnHideOverlay'),
        btnImprove: $('#btnImprove'),
        btnImproveLabel: $('#btnImproveLabel'),
        btnVariants: $('#btnVariants'),
        refQualityChips: $('#refQualityChips'),
        improveHint: $('#improveHint'),
        improvePanel: $('#improvePanel'),
        improveList: $('#improveList'),
        btnImproveClose: $('#btnImproveClose'),
        btnRestorePrompt: $('#btnRestorePrompt'),
        refSlots: Array.from(document.querySelectorAll('.ref-slot')),
        refInput: $('#refInput'),
        refsNote: $('#refsNote'),
        refsLegendText: $('#refsLegendText'),
        refsLegendHint: $('#refsLegendHint'),
        modeGenerate: $('#modeGenerate'),
        modeEdit: $('#modeEdit'),
        modeVideo: $('#modeVideo'),
        videoModelChips: $('#videoModelChips'),
        videoModelControl: $('#videoModelControl'),
        imageModelControl: $('#imageModelControl'),
        composerTitle: $('#composerTitle'),
        composerSub: $('#composerSub'),
        countControl: $('#countControl'),
        sourceControl: $('#sourceControl'),
        sourceSlot: $('#sourceSlot'),
        sourcePick: $('#sourcePick'),
        sourceInput: $('#sourceInput'),
        sourceThumb: $('#sourceThumb'),
        sourceRemove: $('#sourceRemove'),
        sourceBadge: $('#sourceBadge'),
        sourceNote: $('#sourceNote'),
        sourceUpscale: $('#sourceUpscale'),
        sourceMask: $('#sourceMask'),
        btnMaskEdit: $('#btnMaskEdit'),
        btnMaskClear: $('#btnMaskClear'),
        maskNote: $('#maskNote'),
        maskDialog: $('#maskDialog'),
        maskImage: $('#maskImage'),
        maskCanvas: $('#maskCanvas'),
        maskStage: $('#maskStage'),
        maskSize: $('#maskSize'),
        maskSizeValue: $('#maskSizeValue'),
        maskSizeLabel: $('#maskSizeLabel'),
        maskHint: $('#maskHint'),
        maskToolCircle: $('#maskToolCircle'),
        maskToolBrush: $('#maskToolBrush'),
        maskUndo: $('#maskUndo'),
        maskResetBrush: $('#maskResetBrush'),
        maskZoomIn: $('#maskZoomIn'),
        maskZoomOut: $('#maskZoomOut'),
        maskZoomReset: $('#maskZoomReset'),
        maskZoomValue: $('#maskZoomValue'),
        brushCursor: $('#brushCursor'),
        maskApply: $('#maskApply'),
        maskCancel: $('#maskCancel'),
        maskClose: $('#maskClose'),
        emptyTitle: $('#emptyTitle'),
        emptyText: $('#emptyText'),
        emptyExamples: $('#emptyExamples'),
        modeSeries: $('#modeSeries'),
        seriesPanel: $('#seriesPanel'),
        seriesIdea: $('#seriesIdea'),
        seriesCountChips: $('#seriesCountChips'),
        btnStoryboard: $('#btnStoryboard'),
        btnStoryboardLabel: $('#btnStoryboardLabel'),
        seriesScenes: $('#seriesScenes'),
        seriesActions: $('#seriesActions'),
        seriesNote: $('#seriesNote'),
        btnSeriesGenerate: $('#btnSeriesGenerate'),
        btnSeriesExport: $('#btnSeriesExport'),
        btnSeriesClear: $('#btnSeriesClear'),
        countControl: $('#countControl'),
    };

    const state = {
        mode: 'generate',       // 'generate' | 'edit' | 'video' | 'series'
        model: DEFAULT_MODEL,
        videoModel: DEFAULT_VIDEO,
        ratio: '1:1',
        resolution: 1024,
        count: 1,
        busy: false,
        improveBusy: false,
        upscaleBusy: false,
        authBusy: false,
        auth: { checked: false, authed: false, configured: false, needsSetup: false, version: '', error: '' },
        originalPrompt: '',
        source: null,       // imagen que se edita: { dataUrl, name, width, height }
        mask: null,          // máscara circular de edición: { cx, cy, r } normalizada
        refs: [null, null],  // 0..2 referencias: { dataUrl, name }
        refSide: REF_MAX_SIDE, // 1280 (rápida) o 2048 (máxima)
        jobs: new Map(),   // id -> { id, prompt, ratio, model, status, url, error, el }
        pollTimer: null,
        pingTimer: null,
        workerOnline: null,
        upscaleMenu: null,
        // Modo Serie: guion de escenas y su storyboard (un solo proyecto de Flow).
        series: { scenes: [], count: 5, busy: false },
    };

    // Las referencias son EXCLUSIVAS de cada modo: un fotograma de vídeo no debe
    // aparecer al volver a Generar, ni una referencia de imagen en Vídeo. Se
    // guardan tres juegos y `state.refs` apunta siempre al del modo activo.
    const refsByMode = {
        generate: state.refs,
        edit: [null, null],
        video: [null, null],
        series: [null, null],
    };

    const SVG = {
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
        repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m13.5 6.5 3 3"/></svg>',
        upscale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 15v5h-5"/><path d="M4 4l6 6"/><path d="M20 20l-6-6"/></svg>',
        extend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h11"/><path d="m10 7 5 5-5 5"/><path d="M19 5v14"/></svg>',
    };

    // El icono del botón principal cambia según el modo (mismo <svg id="btnIcon">).
    const BTN_ICON = {
        generate: '<path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5"/><circle cx="12" cy="12" r="3.4"/>',
        edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m13.5 6.5 3 3"/>',
        video: '<rect x="3" y="5.5" width="18" height="13" rx="2.4"/><path d="M10.2 9.4v5.2l4.6-2.6z"/>',
        series: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M8.5 5v14M15.5 5v14M3 12h18"/>',
    };

    /* ------------------------------ utilidades ------------------------------ */

    function setNote(text, isError = false) {
        els.queueNote.textContent = text || '';
        els.queueNote.classList.toggle('is-error', Boolean(isError));
    }

    function setWorkerStatus(online) {
        state.workerOnline = online;
        const txt = els.workerStatus.querySelector('.txt');
        els.workerStatus.classList.toggle('is-online', online === true);
        els.workerStatus.classList.toggle('is-offline', online === false);
        txt.textContent = online === null ? 'Comprobando PC…'
            : online ? 'PC conectado' : 'PC dormido';
    }

    function updateCounter() {
        els.charCount.textContent = String(els.prompt.value.length);
    }

    function updateStudioCount() {
        const total = els.grid.querySelectorAll('.card').length;
        const videos = els.grid.querySelectorAll('.card[data-type="video"]').length;
        let label = '0 imágenes';
        if (total > 0) {
            if (videos === total) label = videos === 1 ? '1 vídeo' : `${videos} vídeos`;
            else if (videos === 0) label = total === 1 ? '1 imagen' : `${total} imágenes`;
            else label = `${total} elementos`;
        }
        els.studioCount.textContent = label;
        els.emptyState.style.display = total === 0 ? '' : 'none';
    }

    function chipGroup(container, key, attr, cast = (v) => v, onChange = null) {
        if (!container) return;
        container.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip');
            if (!chip || !container.contains(chip)) return;
            container.querySelectorAll('.chip').forEach((c) => {
                const active = c === chip;
                c.classList.toggle('is-active', active);
                c.setAttribute('aria-pressed', String(active));
            });
            state[key] = cast(chip.dataset[attr]);
            if (onChange) onChange(state[key]);
        });
    }

    /** Estado de la sesión de acceso (la que abre api.php con PW_ACCESS). */
    function setAccessButton() {
        if (!els.btnAccess) return;
        const authed = state.auth.authed;
        els.btnAccess.textContent = authed ? 'Sesión' : 'Acceso';
        els.btnAccess.classList.toggle('is-online', authed);
        els.btnAccess.setAttribute('aria-label', authed
            ? 'Sesión iniciada en el servidor. Pulsa para cerrarla.'
            : 'Iniciar sesión con la contraseña de acceso');
        els.btnAccess.title = authed ? 'Sesión iniciada' : 'Contraseña de acceso para los modelos directos';
    }

    /** Aviso del modelo: distingue Flow (gratis, en el PC) de los directos. */
    function setModelNote() {
        if (!els.modelNote) return;
        const model = modelById(state.model);
        const direct = model.provider !== 'flow';
        const gate = window.ModelGate;
        const locked = Boolean(gate && gate.isLocked && gate.isLocked(model.id) && gate.isUnlocked && !gate.isUnlocked());
        const parts = [];
        parts.push(direct
            ? `${model.display}: en el servidor, gasta saldo de la clave de API.`
            : `${model.display}: en tu PC, sin clave ni coste por imagen.`);
        if (locked) parts.push('Protegido: pide la contraseña de acceso.');
        if (direct && state.auth.checked && !state.auth.authed) {
            parts.push('Necesita sesión: pulsa «Acceso» o introduce la contraseña al generar.');
        }
        els.modelNote.textContent = parts.join(' ');
    }

    /** Habilita resolución y cantidad según el motor del modelo elegido. */
    function syncModelControls() {
        const flow = isFlowModel(state.model);
        const video = state.mode === 'video';
        const series = state.mode === 'series';
        if (els.resolutionControl) els.resolutionControl.hidden = video || flow;
        if (els.resolutionSelect) els.resolutionSelect.disabled = video || flow;
        if (els.countControl) els.countControl.hidden = video || series || state.mode === 'edit' || !flow;
        if (!flow && state.count !== 1) {
            state.count = 1;
            if (els.countChips) {
                els.countChips.querySelectorAll('.chip').forEach((chip) => {
                    const active = chip.dataset.count === '1';
                    chip.classList.toggle('is-active', active);
                    chip.setAttribute('aria-pressed', String(active));
                });
            }
        }
        // Con un modelo directo solo hay una imagen por trabajo, igual que en el
        // estudio: la cantidad 1–4 es exclusiva del motor Flow.
        if (!flow && state.mode !== 'video') {
            setModelNote();
        }
    }

    /** Marca un modelo del selector como si el usuario hubiera pulsado su chip. */
    function selectModel(id) {
        if (!els.modelChips) return;
        const chip = els.modelChips.querySelector(`.chip[data-model="${id}"]`);
        if (chip && !chip.classList.contains('is-active')) {
            chip.click();
        }
    }

    /* ------------------------------ acceso y sesión ------------------------------
       La contraseña es la de ACCESO del proyecto (PW_ACCESS). Se comprueba en
       api.php?action=login, el MISMO endpoint que usa la compuerta de modelos:
       al acertar, la sesión queda abierta y el servidor acepta los trabajos de
       los proveedores directos. Flow no necesita sesión. */

    let sessionWaiter = null;
    let accessReturnFocus = null;

    async function apiCall(action, { method = 'GET', body = null, query = null } = {}) {
        const headers = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };
        if (method === 'POST') headers['Content-Type'] = 'application/json';
        let url = `${JOBS}?action=${encodeURIComponent(action)}`;
        if (query && typeof query === 'object') {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url += `&${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
                }
            });
        }
        const resp = await fetch(url, {
            method,
            headers,
            credentials: 'same-origin',
            cache: 'no-store',
            body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
        });
        let data = null;
        try { data = await resp.json(); } catch { data = null; }
        // Solo un 401 con needsLogin es falta de sesión: un 401 del proveedor
        // (clave caducada, por ejemplo) debe llegar como error de generación.
        if (resp.status === 401 && data && data.needsLogin) {
            state.auth.authed = false;
            setAccessButton();
            throw new Error(data.error || 'Sesión no autorizada. Inicia sesión para usar los modelos directos.');
        }
        if (!resp.ok || !data || data.ok === false) {
            throw new Error((data && data.error) || ('HTTP ' + resp.status));
        }
        return data;
    }

    /** Consulta el estado de la sesión al arrancar y tras la compuerta. */
    async function probeAuth() {
        try {
            const data = await apiCall('state');
            state.auth.checked = true;
            state.auth.authed = Boolean(data.authenticated);
            state.auth.configured = Boolean(data.configured);
            state.auth.needsSetup = Boolean(data.needsSetup);
            state.auth.version = String(data.version || '');
            state.auth.error = '';
        } catch (err) {
            state.auth.checked = true;
            state.auth.authed = false;
            state.auth.error = err.message;
        }
        setAccessButton();
        renderAccess();
        setModelNote();
        return state.auth.authed;
    }

    function openAccess() {
        if (!els.accessModal) return;
        accessReturnFocus = document.activeElement;
        if (els.accessError) els.accessError.textContent = '';
        if (els.accessPassword) els.accessPassword.value = '';
        renderAccess();
        els.accessModal.classList.remove('hidden');
        document.body.classList.add('has-modal');
        if (!state.auth.authed && els.accessPassword) {
            setTimeout(() => { try { els.accessPassword.focus({ preventScroll: true }); } catch { /* sin foco */ } }, 40);
        } else if (els.accessClose) {
            try { els.accessClose.focus({ preventScroll: true }); } catch { /* sin foco */ }
        }
    }

    function closeAccess(cancelled = true) {
        if (!els.accessModal) return;
        els.accessModal.classList.add('hidden');
        document.body.classList.remove('has-modal');
        if (els.accessPassword) els.accessPassword.value = '';
        if (els.accessError) els.accessError.textContent = '';
        if (accessReturnFocus && typeof accessReturnFocus.focus === 'function') {
            try { accessReturnFocus.focus({ preventScroll: true }); } catch { /* sin foco */ }
        }
        accessReturnFocus = null;
        if (cancelled && sessionWaiter && !state.authBusy) {
            const waiter = sessionWaiter;
            sessionWaiter = null;
            waiter(false);
        }
    }

    function renderAccess() {
        if (!els.accessModal) return;
        const authed = state.auth.authed;
        const setup = state.auth.needsSetup;
        if (els.accessTitle) els.accessTitle.textContent = authed ? 'Sesión iniciada' : 'Acceso privado';
        if (els.accessDesc) {
            els.accessDesc.textContent = authed
                ? 'La sesión está abierta en esta pestaña: los modelos directos (OpenAI, Gemini y Qwen) funcionan. Flow no necesita sesión.'
                : setup
                    ? 'El servidor no tiene contraseña configurada (.htaccess raíz: PW_ACCESS). Los modelos directos no pueden generar hasta que se configure.'
                    : 'Escribe la contraseña de acceso del proyecto. Con sesión se usan los modelos directos (OpenAI, Gemini y Qwen); Flow funciona sin ella.';
        }
        if (els.accessForm) els.accessForm.hidden = authed;
        if (els.accessLogout) els.accessLogout.hidden = !authed;
        if (els.accessSubmit) els.accessSubmit.disabled = setup || state.authBusy;
        if (els.accessCancel) {
            els.accessCancel.textContent = authed ? 'Cerrar' : 'Seguir sin sesión';
        }
    }

    /** La contraseña de acceso es también la de la compuerta: al entrar por
        «Acceso» se desbloquean los modelos protegidos en esta pestaña. */
    function unlockModelGate() {
        try { sessionStorage.setItem('ag_model_gate_v1', '1'); } catch { /* sin storage */ }
        const gate = window.ModelGate;
        if (gate && typeof gate.refresh === 'function') gate.refresh();
    }

    /** Al cerrar sesión vuelven los candados: sin sesión no hay modelos caros. */
    function lockModelGate() {
        const gate = window.ModelGate;
        if (gate && typeof gate.lock === 'function') gate.lock();
    }

    async function submitAccess() {
        if (state.authBusy) return;
        const password = els.accessPassword ? els.accessPassword.value : '';
        if (!password) {
            if (els.accessError) els.accessError.textContent = 'Escribe la contraseña de acceso.';
            if (els.accessPassword) els.accessPassword.focus();
            return;
        }
        state.authBusy = true;
        if (els.accessError) els.accessError.textContent = '';
        if (els.accessSubmit) { els.accessSubmit.disabled = true; els.accessSubmit.textContent = 'Comprobando…'; }
        try {
            await apiCall('login', { method: 'POST', body: { password } });
            state.auth.authed = true;
            state.auth.checked = true;
            state.auth.error = '';
            unlockModelGate();
            closeAccess(false);
            setAccessButton();
            setModelNote();
            const waiter = sessionWaiter;
            sessionWaiter = null;
            if (waiter) waiter(true);
            setNote('Sesión iniciada: los modelos directos ya pueden generar.');
        } catch (err) {
            if (els.accessError) els.accessError.textContent = err.message;
            if (els.accessPassword) { els.accessPassword.value = ''; els.accessPassword.focus(); }
        } finally {
            state.authBusy = false;
            if (els.accessSubmit) { els.accessSubmit.disabled = false; els.accessSubmit.textContent = 'Entrar'; }
            renderAccess();
        }
    }

    async function logoutAccess() {
        if (state.authBusy) return;
        state.authBusy = true;
        if (els.accessLogout) els.accessLogout.disabled = true;
        try {
            await apiCall('logout', { method: 'POST', body: {} });
            state.auth.authed = false;
            lockModelGate();
            closeAccess(false);
            setAccessButton();
            setModelNote();
            setNote('Sesión cerrada. Flow sigue disponible sin sesión.');
        } catch (err) {
            setNote('No se pudo cerrar la sesión: ' + err.message, true);
        } finally {
            state.authBusy = false;
            if (els.accessLogout) els.accessLogout.disabled = false;
            // Aunque el servidor falle al cerrar, la compuerta se bloquea igual:
            // una sesión cerrada no puede dejar los modelos caros abiertos.
            lockModelGate();
            renderAccess();
        }
    }

    /** Resuelve true si hay sesión (abriendo el modal) o false si se cancela. */
    async function ensureSession() {
        if (state.auth.authed) return true;
        // Si la consulta inicial aún no ha terminado, se espera: puede haber
        // sesión abierta de otra app del proyecto (cookie compartida).
        if (!state.auth.checked) await probeAuth();
        if (state.auth.authed) return true;
        return new Promise((resolve) => {
            sessionWaiter = resolve;
            openAccess();
        });
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    /** Formato soportado por Flow más cercano al de la imagen que se edita. */
    function nearestRatio(width, height) {
        const aspect = (Number(width) || 1) / (Number(height) || 1);
        let best = '1:1';
        let bestDistance = Infinity;
        Object.keys(RATIO_VALUES).forEach((key) => {
            const distance = Math.abs(Math.log(aspect / RATIO_VALUES[key]));
            if (distance < bestDistance) {
                bestDistance = distance;
                best = key;
            }
        });
        return best;
    }

    function setRatioChip(value) {
        if (!els.ratioChips) return;
        els.ratioChips.querySelectorAll('.chip').forEach((chip) => {
            const active = chip.dataset.ratio === value;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', String(active));
        });
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch { ok = false; }
            area.remove();
            return ok;
        }
    }

    /** Inserta tarjetas arriba conservando su orden (cards[0] queda la primera). */
    function prependInOrder(cards) {
        for (let i = cards.length - 1; i >= 0; i--) {
            els.grid.prepend(cards[i]);
        }
    }

    /* ------------------------------ tarjetas ------------------------------ */

    function createCard(job, insert = true) {
        const card = document.createElement('article');
        card.className = 'card is-waiting';
        card.dataset.id = job.id;
        card.dataset.ratio = job.ratio;
        card.dataset.type = job.type === 'video' ? 'video' : 'image';

        const media = document.createElement('div');
        media.className = 'card-media';

        const wait = document.createElement('div');
        wait.className = 'card-wait';
        wait.innerHTML = '<span class="mini-spinner" aria-hidden="true"></span><span>En cola…</span>';
        media.appendChild(wait);

        const isVideo = job.type === 'video';
        const noun = isVideo ? 'vídeo' : 'imagen';
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        actions.hidden = true;
        actions.innerHTML = (isVideo ? `
            <button type="button" class="icon-btn" data-act="extend" aria-label="Continuar esta escena con el último fotograma">${SVG.extend}</button>` : `
            <button type="button" class="icon-btn" data-act="edit" aria-label="Editar esta imagen">${SVG.edit}</button>
            <button type="button" class="icon-btn" data-act="upscale" aria-label="Escalar esta imagen">${SVG.upscale}</button>`)
            + `
            <button type="button" class="icon-btn" data-act="download" aria-label="Descargar ${noun}">${SVG.download}</button>
            <button type="button" class="icon-btn" data-act="repeat" aria-label="Usar este prompt otra vez">${SVG.repeat}</button>
            <button type="button" class="icon-btn" data-act="copy" aria-label="Copiar el prompt">${SVG.copy}</button>
            <button type="button" class="icon-btn" data-act="delete" aria-label="Eliminar ${noun}">${SVG.trash}</button>`;
        media.appendChild(actions);

        const body = document.createElement('div');
        body.className = 'card-body';

        const p = document.createElement('p');
        p.className = 'card-prompt';
        p.textContent = job.prompt;
        p.title = 'Pulsa para ver el prompt completo';
        p.setAttribute('role', 'button');
        p.setAttribute('tabindex', '0');
        const togglePrompt = () => p.classList.toggle('is-open');
        p.addEventListener('click', togglePrompt);
        p.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                togglePrompt();
            }
        });

        const meta = document.createElement('div');
        meta.className = 'card-meta';
        const refUrls = Array.isArray(job.refs) ? job.refs.filter(Boolean) : [];
        const refCount = refUrls.length || (Number(job.refCount) || 0);
        const tags = [];
        if (isVideo) tags.push('Vídeo');
        else if (job.mode === 'edit') tags.push('Edición');
        if (job.mask) tags.push('Máscara');
        if (job.scene) tags.push('Escena ' + job.scene);
        if (job.extraMeta) tags.push(job.extraMeta);
        meta.innerHTML = `<span>${escapeHtml(job.ratio)}</span>${job.model ? `<span>${escapeHtml(job.model)}</span>` : ''}`
            + (refCount ? `<span>${refCount} ${isVideo ? (refCount > 1 ? 'fotogramas' : 'fotograma') : `referencia${refCount > 1 ? 's' : ''}`}</span>` : '')
            + tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');

        if (refUrls.length) {
            const strip = document.createElement('div');
            strip.className = 'card-refs';
            strip.title = isVideo ? 'Fotogramas usados para este vídeo' : 'Referencias usadas para esta imagen';
            refUrls.slice(0, REF_MAX_FILES).forEach((src) => {
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.alt = 'Referencia';
                strip.appendChild(thumb);
            });
            body.append(p, meta, strip);
        } else {
            body.append(p, meta);
        }

        // Storyboard (modo Serie): la narración va encima del prompt, como pie
        // de la escena en el lienzo.
        if (job.narration) {
            const cap = document.createElement('p');
            cap.className = 'card-narration';
            cap.textContent = job.narration;
            body.prepend(cap);
        }

        card.append(media, body);

        actions.addEventListener('click', async (event) => {
            const btn = event.target.closest('[data-act]');
            if (!btn) return;
            const record = state.jobs.get(job.id) || job;
            if (btn.dataset.act === 'extend') { await extendVideo(record); return; }
            if (btn.dataset.act === 'edit') await editFromCard(record);
            if (btn.dataset.act === 'upscale') {
                event.stopPropagation();
                toggleUpscaleMenu(record, btn);
            }
            if (btn.dataset.act === 'download') await downloadMedia(record);
            if (btn.dataset.act === 'repeat') {
                els.prompt.value = record.prompt;
                updateCounter();
                els.prompt.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setNote('Prompt cargado en el editor.');
            }
            if (btn.dataset.act === 'copy') {
                const ok = await copyText(record.prompt);
                setNote(ok ? 'Prompt copiado.' : 'No se pudo copiar el prompt.', !ok);
            }
            if (btn.dataset.act === 'delete') await deleteCard(record);
        });

        if (insert) {
            job.el = card;
            els.grid.prepend(card);
            updateStudioCount();
        }
        return card;
    }

    function markRunning(job) {
        const label = job.el && job.el.querySelector('.card-wait span:last-child');
        if (label) label.textContent = 'Generando…';
    }

    function markDone(job, data) {
        const card = job.el;
        if (!card) return;
        const media = card.querySelector('.card-media');
        if (!media) return;
        const wait = card.querySelector('.card-wait');
        if (wait) wait.remove();
        if (job.type === 'video') {
            let videoEl = media.querySelector('video');
            if (!videoEl) {
                videoEl = document.createElement('video');
                videoEl.controls = true;
                videoEl.playsInline = true;
                videoEl.preload = 'metadata';
                videoEl.className = 'card-video';
                videoEl.setAttribute('aria-label', `Vídeo generado: ${job.prompt || ''}`);
                media.insertBefore(videoEl, media.firstChild);
            }
            videoEl.src = data.url;
            const videoActions = card.querySelector('.card-actions');
            if (videoActions) videoActions.hidden = false;
            card.classList.remove('is-waiting');
            card.classList.add('is-done');
            job.url = data.url;
            job.status = 'done';
            return;
        }
        // Buscar SOLO dentro de .card-media: las miniaturas de referencia de la
        // tarjeta también son <img> y no deben recibir la imagen generada.
        let img = media.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            media.insertBefore(img, media.firstChild);
        }
        img.src = data.url;
        img.alt = job.prompt.slice(0, 140);
        img.addEventListener('click', () => openLightbox(data.url, job.prompt));
        const actions = card.querySelector('.card-actions');
        if (actions) actions.hidden = false;
        card.classList.remove('is-waiting');
        card.classList.add('is-done');
        job.url = data.url;
        job.status = 'done';
    }

    function markError(job, message) {
        const card = job.el;
        if (!card) return;
        const wait = card.querySelector('.card-wait');
        if (wait) wait.remove();
        const err = document.createElement('div');
        err.className = 'card-error';
        err.textContent = message || 'Flow no pudo generarla. Inténtalo otra vez.';
        card.querySelector('.card-media').appendChild(err);
        card.classList.remove('is-waiting');
        card.classList.add('is-error');
    }

    /** Quita del lienzo la tarjeta con ese id (trabajos y tarjetas del historial). */
    function removeCard(id) {
        const key = String(id);
        const job = state.jobs.get(key);
        const card = (job && job.el) || [...els.grid.querySelectorAll('.card')]
            .find((el) => el.dataset.id === key);
        if (card) card.remove();
        state.jobs.delete(key);
        updateStudioCount();
    }

    /** Elimina la imagen del lienzo y, si está guardada, también del historial. */
    async function deleteCard(job) {
        if (!job) return;
        const prompt = job.prompt || '';
        const noun = job.type === 'video' ? 'este vídeo' : 'esta imagen';
        const question = prompt
            ? `¿Eliminar ${noun}?\n\n"${prompt}"\n\nSe quita del lienzo (y del historial si estaba guardada). No se puede deshacer.`
            : `¿Eliminar ${noun}?\n\nSe quita del lienzo (y del historial si estaba guardada). No se puede deshacer.`;
        if (!window.confirm(question)) return;

        // Si la imagen acaba de terminar, espera a que termine su guardado en el
        // historial para poder borrar también esa entrada del servidor.
        if (job.historySave) {
            try { await job.historySave; } catch { /* el error ya se registra al guardar */ }
        }
        let historyId = job.historyId || '';
        if (!historyId && String(job.id).startsWith('h_')) historyId = String(job.id).slice(2);

        if (historyId && history) {
            try {
                await history.delete(historyId);
            } catch (err) {
                setNote('No se pudo eliminar del historial: ' + err.message, true);
                return;
            }
            if (els.historyPanel.classList.contains('is-open')) renderHistory();
        }
        removeCard(job.id);
        setNote(job.type === 'video' ? 'Vídeo eliminado.' : 'Imagen eliminada.');
    }

    /* ------------------------------ imágenes ------------------------------ */

    async function downloadMedia(job) {
        try {
            let href = job.url;
            let objectUrl = '';
            let ext = job.type === 'video' ? 'mp4' : 'jpg';
            if (href.startsWith('data:')) {
                const match = /^data:(?:image|video)\/([a-z0-9]+)[;,]/i.exec(href);
                if (match) ext = match[1].toLowerCase().replace('jpeg', 'jpg');
            } else {
                const resp = await fetch(href, { cache: 'force-cache' });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                ext = (blob.type.split('/')[1] || ext).replace('jpeg', 'jpg');
                objectUrl = URL.createObjectURL(blob);
                href = objectUrl;
            }
            const a = document.createElement('a');
            a.href = href;
            a.download = `flow-studio-${job.id.slice(0, 8)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            if (objectUrl) {
                setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
            }
            setNote(job.type === 'video' ? 'Vídeo descargado.' : 'Imagen descargada.');
        } catch (err) {
            setNote('No se pudo descargar: ' + err.message, true);
        }
    }

    function openLightbox(url, caption) {
        if (!url) return;
        els.lightboxImg.src = url;
        els.lightboxImg.alt = caption || 'Imagen generada';
        els.lightboxCaption.textContent = caption || '';
        els.lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        els.lightboxClose.focus();
    }

    function closeLightbox() {
        els.lightbox.classList.add('hidden');
        els.lightboxImg.removeAttribute('src');
        document.body.style.overflow = '';
    }

    function openHistory() {
        els.historyPanel.classList.add('is-open');
        els.historyPanel.setAttribute('aria-hidden', 'false');
        els.historyPanel.removeAttribute('inert');
        els.btnHistory.setAttribute('aria-expanded', 'true');
        renderHistory();
    }

    function closeHistory() {
        els.historyPanel.classList.remove('is-open');
        els.historyPanel.setAttribute('aria-hidden', 'true');
        els.historyPanel.setAttribute('inert', '');
        els.btnHistory.setAttribute('aria-expanded', 'false');
    }

    /* ------------------------------ historial ------------------------------ */

    let history = null;

    async function initHistory() {
        if (typeof HistoryManager !== 'function') return;
        history = new HistoryManager('flow_studio');
        try {
            await history.load();
        } catch (err) {
            els.historyList.innerHTML = '<p class="history-empty">No se pudo cargar el historial.</p>';
            return;
        }
        renderHistory();
    }

    function renderHistory() {
        const items = history ? history.getAll() : [];
        els.historyList.innerHTML = '';
        if (!items.length) {
            els.historyList.innerHTML = '<p class="history-empty">Todavía no hay imágenes guardadas.</p>';
            return;
        }
        items.forEach((item) => {
            const data = item.data || {};
            const url = item.imageUrl ? item.imageUrl.replace(/^\.\//, '') : '';
            const prompt = data.prompt || 'Sin prompt';
            // La fila ya no es un botón: la imagen no se amplía desde el historial.
            // La única acción es eliminarla del historial.
            const row = document.createElement('div');
            row.className = 'history-item';
            row.innerHTML = `
                <img src="${url}" alt="${escapeHtml(prompt)}" loading="lazy">
                <div class="history-info">
                    <p>${escapeHtml(prompt)}</p>
                    <time>${formatDate(item.createdAt)}</time>
                </div>
                <button type="button" class="history-delete" data-id="${escapeHtml(String(item.id))}"
                    aria-label="Eliminar del historial: ${escapeHtml(prompt)}" title="Eliminar del historial">${SVG.trash}</button>`;
            els.historyList.appendChild(row);
        });
    }

    /** Borra del servidor la imagen del historial y quita su tarjeta del lienzo. */
    async function deleteHistoryItem(id) {
        if (!history || !id) return;
        const item = history.getAll().find((entry) => String(entry.id) === String(id));
        const prompt = (item && item.data && item.data.prompt) || '';
        const question = prompt
            ? `¿Eliminar del historial esta imagen?\n\n"${prompt}"\n\nSe borra también del servidor y no se puede deshacer.`
            : '¿Eliminar esta imagen del historial?\n\nSe borra también del servidor y no se puede deshacer.';
        if (!window.confirm(question)) return;
        try {
            await history.delete(id);
        } catch (err) {
            setNote('No se pudo eliminar del historial: ' + err.message, true);
            return;
        }
        removeHistoryCardFromCanvas(id);
        renderHistory();
        setNote('Imagen eliminada del historial.');
    }

    function removeHistoryCardFromCanvas(id) {
        removeCard('h_' + id);
        [...state.jobs.values()].forEach((job) => {
            if (job.historyId === id) removeCard(job.id);
        });
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    /** Pinta en el lienzo las últimas imágenes guardadas, la más reciente primero. */
    function paintRecentHistory() {
        if (!history) return;
        const items = history.getAll().slice(0, HISTORY_ON_CANVAS);
        const cards = [];
        items.forEach((item) => {
            const data = item.data || {};
            const url = item.imageUrl ? item.imageUrl.replace(/^\.\//, '') : '';
            if (!url) return;
            const job = {
                id: 'h_' + item.id,
                historyId: item.id,
                prompt: data.prompt || 'Sin prompt',
                ratio: data.ratio || '1:1',
                model: item.model || '',
                mode: data.mode === 'edit' ? 'edit' : 'generate',
                status: 'done',
                url,
                error: '',
                fromHistory: true,
            };
            const card = createCard(job, false);
            job.el = card;
            markDone(job, { url });
            cards.push(card);
        });
        if (cards.length) {
            prependInOrder(cards);
            updateStudioCount();
        }
    }

    async function saveToHistory(job) {
        if (!history) return;
        try {
            const blob = await blobFromUrl(job.url);
            const dataUrl = await blobToDataUrl(blob);
            const entry = await history.save({
                type: 'image',
                model: job.model,
                data: {
                    prompt: job.prompt,
                    flowPrompt: job.flowPrompt || job.prompt,
                    ratio: job.ratio,
                    mode: job.mode || 'generate',
                },
                imageData: dataUrl,
            });
            job.historyId = entry.id;
            if (els.historyPanel.classList.contains('is-open')) renderHistory();
        } catch (err) {
            console.warn('[flow-studio] historial:', err.message);
        }
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error || new Error('lectura fallida'));
            reader.readAsDataURL(blob);
        });
    }

    /** Data URL -> Blob sin fetch: la CSP del sitio no permite connect-src data:. */
    function dataUrlToBlob(dataUrl) {
        const comma = dataUrl.indexOf(',');
        if (comma < 0) throw new Error('Imagen incrustada no válida.');
        const header = dataUrl.slice(0, comma);
        const mimeMatch = /data:([^;]+)/i.exec(header);
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeMatch ? mimeMatch[1] : 'image/jpeg' });
    }

    /** Igual que fetch(url).blob(), pero tolera las imágenes ya incrustadas. */
    async function blobFromUrl(url) {
        if (String(url).startsWith('data:')) {
            return dataUrlToBlob(url);
        }
        const resp = await fetch(url, { cache: 'force-cache' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
    }

    /**
     * Compone el resultado dentro de la máscara circular y deja intacto el resto.
     * Fuera del círculo se copian los píxeles del original tal cual: el límite de
     * la edición no depende de que el motor respete la máscara.
     */
    async function composeMaskedUrl(resultUrl, sourceUrl, mask) {
        if (!resultUrl || !sourceUrl || !mask) return resultUrl;
        const source = await loadImageSource(await blobFromUrl(sourceUrl));
        const result = await loadImageSource(await blobFromUrl(resultUrl));
        const width = source.width || 1;
        const height = source.height || 1;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            if (typeof source.close === 'function') source.close();
            if (typeof result.close === 'function') result.close();
            return resultUrl;
        }
        ctx.drawImage(source, 0, 0, width, height);

        if (mask.type === 'brush' && mask.dataUrl) {
            // Pincel: el resultado entra por la máscara (destination-in) y se
            // pega encima del original, así fuera de lo pintado no se toca nada.
            const maskImg = await loadImageSource(await blobFromUrl(mask.dataUrl));
            const layer = document.createElement('canvas');
            layer.width = width;
            layer.height = height;
            const lctx = layer.getContext('2d');
            lctx.drawImage(result, 0, 0, width, height);
            lctx.globalCompositeOperation = 'destination-in';
            lctx.drawImage(maskImg, 0, 0, width, height);
            ctx.drawImage(layer, 0, 0);
            layer.width = 0;
            layer.height = 0;
            if (typeof maskImg.close === 'function') maskImg.close();
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.arc(mask.cx * width, mask.cy * height, Math.max(1, mask.r * Math.min(width, height)), 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(result, 0, 0, width, height);
            ctx.restore();
        }
        if (typeof source.close === 'function') source.close();
        if (typeof result.close === 'function') result.close();
        return canvas.toDataURL('image/png');
    }

    /* ------------------------------ cola ------------------------------ */

    async function post(payload) {
        const resp = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        let data;
        try {
            data = await resp.json();
        } catch {
            throw new Error('Respuesta no válida del servidor (HTTP ' + resp.status + ')');
        }
        if (!resp.ok || data.ok === false) {
            throw new Error(data.error || ('HTTP ' + resp.status));
        }
        return data;
    }

    async function pingWorker() {
        try {
            const resp = await fetch(`${API}?action=ping`, { cache: 'no-store' });
            const data = await resp.json();
            if (data.ok) setWorkerStatus(Boolean(data.worker));
        } catch {
            setWorkerStatus(false);
        }
    }

    function pendingIds() {
        return Array.from(state.jobs.keys()).filter((id) => !id.startsWith('h_'));
    }

    function persistPending() {
        const list = Array.from(state.jobs.values())
            .filter((j) => !j.fromHistory && (j.status === 'queued' || j.status === 'running'))
            .map((j) => ({
                id: j.id,
                type: j.type === 'video' ? 'video' : 'image',
                prompt: j.prompt,
                ratio: j.ratio,
                model: j.model,
                mode: j.mode || 'generate',
                refCount: Array.isArray(j.refs) ? j.refs.length : 0,
            }));
        try {
            localStorage.setItem(PENDING_KEY, JSON.stringify(list));
        } catch { /* sin almacenamiento: da igual */ }
    }

    async function pollOnce() {
        const ids = pendingIds();
        if (!ids.length) return;
        let data;
        try {
            data = await post({ action: 'status', ids });
        } catch (err) {
            setNote('No se pudo consultar la cola: ' + err.message, true);
            return;
        }
        let done = 0;
        let running = 0;
        let pending = 0;
        let failed = 0;

        for (const id of ids) {
            const job = state.jobs.get(id);
            if (!job) continue;
            const info = data.jobs ? data.jobs[id] : null;
            if (!info) continue;
            if (info.status === 'done' && job.status !== 'done') {
                // Con máscara se compone antes de pintar y de guardar: la tarjeta
                // y el historial reciben ya el recorte sobre el original.
                let finalUrl = info.url;
                if (job.mask && job.source) {
                    try {
                        finalUrl = await composeMaskedUrl(info.url, job.source, job.mask);
                    } catch (err) {
                        console.warn('[flow-studio] no se pudo aplicar la máscara:', err.message);
                    }
                }
                markDone(job, { ...info, url: finalUrl });
                // Los vídeos se quedan en el lienzo y se descargan: un mp4 no
                // cabe en el historial de imágenes del servidor.
                job.historySave = job.type === 'video' ? Promise.resolve() : saveToHistory(job);
            } else if (info.status === 'error' && job.status !== 'error') {
                markError(job, info.error);
                job.status = 'error';
            } else if (info.status === 'running' && job.status !== 'running') {
                job.status = 'running';
                markRunning(job);
            }
            if (job.status === 'done') done++;
            else if (job.status === 'error') failed++;
            else if (job.status === 'running') running++;
            else pending++;
        }

        const total = ids.length;
        const ready = done + failed;
        const hasVideo = ids.some((id) => {
            const job = state.jobs.get(id);
            return job && job.type === 'video';
        });
        els.loadingText.textContent = ready >= total
            ? (failed ? 'Terminado con avisos' : (hasVideo ? 'Vídeo listo' : 'Imágenes listas'))
            : `Generando ${ready} de ${total}…`;
        els.loadingSub.textContent = running
            ? (hasVideo
                ? 'Veo está trabajando en tu PC. Un vídeo tarda varios minutos.'
                : 'Flow está trabajando en tu PC. Suele tardar entre 30 y 90 segundos por imagen.')
            : 'En cola: el worker de tu PC lo tomará en cuanto pueda.';

        if (state.workerOnline === false && pending > 0) {
            setNote('El PC está dormido: arranca el worker para que la cola avance.', true);
        } else if (total > 0) {
            setNote(`${ready} de ${total} listas · ${pending + running} en curso`);
        }
        persistPending();

        if (ready >= total) {
            stopPolling();
            state.busy = false;
            setBusy(false);
            hideOverlay();
            const plural = hasVideo ? 'vídeos' : 'imágenes';
            const doneAdj = hasVideo ? 'listos' : 'listas';
            const msg = failed
                ? `${done} ${plural} ${doneAdj}, ${failed} con error.`
                : (done === 1
                    ? (hasVideo ? 'Vídeo listo. Descárgalo: no se guarda en el historial.' : 'Imagen lista.')
                    : `${done} ${plural} ${doneAdj}.`);
            setNote(msg, failed > 0 && done === 0);
            localStorage.removeItem(PENDING_KEY);
        }
    }

    function startPolling() {
        stopPolling();
        state.pollTimer = setInterval(pollOnce, POLL_MS);
        pollOnce();
    }

    function stopPolling() {
        if (state.pollTimer) {
            clearInterval(state.pollTimer);
            state.pollTimer = null;
        }
    }

    /* ------------------------------ UI estados ------------------------------ */

    function setBusy(busy) {
        state.busy = busy;
        els.btnGenerate.disabled = busy;
        els.btnLabel.textContent = busy ? 'PROCESANDO…' : COPY[state.mode].action;
        els.btnIcon.classList.toggle('spin-icon', busy);
        [els.modeGenerate, els.modeEdit, els.modeVideo, els.modeSeries, els.sourcePick, els.sourceRemove, els.btnStoryboard, els.btnSeriesExport, els.btnVariants].forEach((el) => {
            if (el) el.disabled = busy;
        });
        updateSeriesUI();
    }

    function showOverlay() {
        els.loadingOverlay.classList.remove('hidden');
        const pendingVideo = [...state.jobs.values()].some((job) => job.type === 'video'
            && (job.status === 'queued' || job.status === 'running'));
        if (state.mode === 'edit') {
            els.loadingText.textContent = 'Editando tu imagen…';
            els.loadingSub.textContent = 'Flow aplica los cambios sobre la imagen que subiste. Suele tardar entre 30 y 90 segundos.';
        } else if (state.mode === 'video' || pendingVideo) {
            els.loadingText.textContent = 'Generando tu vídeo…';
            els.loadingSub.textContent = 'Veo está trabajando en tu PC. Un vídeo tarda varios minutos; puedes seguir en segundo plano.';
        } else {
            els.loadingText.textContent = 'IA generando obra maestra…';
            els.loadingSub.textContent = 'Flow está trabajando en tu PC. Puedes seguir en segundo plano.';
        }
    }

    function hideOverlay() {
        els.loadingOverlay.classList.add('hidden');
    }

    /* ------------------------------ mejorador IA ------------------------------ */

    /** Deja el panel de propuestas a la vista dentro del panel con scroll propio. */
    function revealImprovePanel() {
        setTimeout(() => {
            try {
                els.improvePanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } catch { /* sin soporte */ }
        }, 50);
    }

    function setImproveBusy(busy) {
        state.improveBusy = busy;
        els.btnImprove.disabled = busy;
        els.btnImproveLabel.textContent = busy ? 'Pensando…' : COPY[state.mode].improve;
    }

    function applyOption(option, index, button) {
        els.prompt.value = option.prompt;
        updateCounter();
        els.prompt.focus();
        const end = els.prompt.value.length;
        try { els.prompt.setSelectionRange(end, end); } catch { /* sin soporte */ }
        els.btnRestorePrompt.classList.remove('hidden');
        els.improveList.querySelectorAll('.btn-prompt-option').forEach((other) => {
            other.classList.toggle('is-active', other === button);
        });
        const editing = state.mode === 'edit';
        const noun = editing ? 'Instrucción' : 'Prompt';
        setNote(`${noun} ${index + 1} ${editing ? 'cargada' : 'cargado'} en el editor. Puedes ${editing ? 'editarla' : 'editarlo'} antes de generar.`);
    }

    function renderOptions(options, original) {
        els.improveList.innerHTML = '';
        els.improveList.classList.add('prompt-options');
        const editing = state.mode === 'edit';
        const noun = editing ? 'Instrucción' : 'Prompt';
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn-prompt-option';

            const number = document.createElement('span');
            number.className = 'po-num';
            number.textContent = String(index + 1);
            const label = document.createElement('span');
            label.className = 'po-label';
            label.textContent = `${noun} ${index + 1}`;
            button.append(number, label);

            const title = option.titulo || '';
            button.title = title ? `${title} — pulsa para editarlo en el prompt` : 'Pulsa para editarlo en el prompt';
            button.setAttribute('aria-label', title
                ? `${noun} ${index + 1}: ${title}. Pulsa para llevarla al editor.`
                : `${noun} ${index + 1}. Pulsa para llevarla al editor.`);
            button.addEventListener('click', () => applyOption(option, index, button));
            els.improveList.appendChild(button);
        });

        state.originalPrompt = original || '';
        els.btnRestorePrompt.classList.toggle('hidden', !state.originalPrompt);
        els.improveHint.textContent = `${options.length} ${editing ? 'instrucciones listas' : 'prompts listos'}`;
        revealImprovePanel();
    }

    async function improvePrompt() {
        const prompt = els.prompt.value.trim();
        if (!prompt) {
            setNote('Escribe una idea y luego pide propuestas.', true);
            els.prompt.focus();
            return;
        }
        if (state.improveBusy) return;

        if (!state.originalPrompt) state.originalPrompt = prompt;
        setImproveBusy(true);
        els.improvePanel.classList.remove('hidden');
        revealImprovePanel();
        els.improveHint.textContent = 'Pensando…';
        els.improveList.classList.remove('prompt-options');
        const editing = state.mode === 'edit';
        els.improveList.innerHTML = `<p class="improve-msg" style="color:#9aa3ad">${editing ? 'Buscando 4 formas de decirlo…' : 'Buscando 4 enfoques distintos…'}</p>`;

        try {
            const resp = await fetch(AI, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'improve', prompt, ratio: state.ratio, mode: state.mode }),
            });
            let data;
            try {
                data = await resp.json();
            } catch {
                throw new Error('El servidor no devolvió JSON (HTTP ' + resp.status + ')');
            }
            if (!resp.ok || !data.ok) throw new Error(data.error || ('HTTP ' + resp.status));
            if (!Array.isArray(data.options) || !data.options.length) {
                throw new Error('Sin propuestas. Prueba otra vez.');
            }
            renderOptions(data.options, prompt);
            setNote('Pulsa un prompt para llevarlo al editor.');
        } catch (err) {
            els.improveList.classList.remove('prompt-options');
            els.improveList.innerHTML = `<p class="improve-msg">${escapeHtml(err.message)}</p>`;
            els.improveHint.textContent = 'Error';
        } finally {
            setImproveBusy(false);
        }
    }

    /* ------------------------------ referencias ------------------------------ */

    let refTarget = 0;

    function setRefsNote(text, isError = false) {
        if (!els.refsNote) return;
        els.refsNote.textContent = text || '';
        els.refsNote.classList.toggle('is-error', Boolean(isError));
    }

    function refsCount() {
        return state.refs.filter(Boolean).length;
    }

    function refsPayload() {
        return state.refs.filter(Boolean).map((ref) => ref.dataUrl);
    }

    function updateRefsUI() {
        const video = state.mode === 'video';
        els.refSlots.forEach((slot, index) => {
            const ref = state.refs[index];
            const img = slot.querySelector('.ref-thumb');
            const remove = slot.querySelector('.ref-remove');
            const empty = slot.querySelector('.ref-empty');
            const label = slot.querySelector('.ref-label');
            const what = video
                ? (index === 0 ? 'fotograma inicial' : 'fotograma final')
                : `imagen de referencia ${index + 1}`;
            if (label) {
                label.textContent = video
                    ? (index === 0 ? 'Fotograma inicial' : 'Fotograma final')
                    : `Referencia ${index + 1}`;
            }
            slot.classList.toggle('has-image', Boolean(ref));
            if (img) {
                if (ref) {
                    img.src = ref.dataUrl;
                    img.hidden = false;
                } else {
                    img.removeAttribute('src');
                    img.hidden = true;
                }
            }
            if (remove) remove.hidden = !ref;
            if (empty) empty.hidden = Boolean(ref);
            const pick = slot.querySelector('.ref-pick');
            if (pick) {
                pick.setAttribute('aria-label', ref
                    ? `${what.charAt(0).toUpperCase() + what.slice(1)} cargado. Pulsa para cambiarlo.`
                    : `Añadir ${what}`);
            }
        });
        const count = refsCount();
        if (video) {
            if (count === 0) {
                setRefsNote('Opcional: sin fotogramas el vídeo se genera solo con el texto.');
            } else if (!state.refs[0]) {
                setRefsNote('El fotograma final necesita también el inicial.', true);
            } else if (count === 1) {
                setRefsNote('Se animará el fotograma inicial con el movimiento que describas.');
            } else {
                setRefsNote('Se interpolará del fotograma inicial al final.');
            }
            return;
        }
        if (state.mode === 'edit') {
            setRefsNote(count === 0
                ? 'Opcional: 1 referencia de estilo. La imagen que editas ya ocupa el primer hueco de Flow.'
                : 'Referencia lista. Se enviará junto a la imagen que editas.');
            return;
        }
        setRefsNote(count === 0
            ? 'Opcional: hasta 2 imágenes. Flow las usará como referencia de estilo, personaje u objeto.'
            : count === 1
                ? '1 referencia lista. Puedes añadir otra.'
                : '2 referencias listas (máximo).');
    }

    function loadImageSource(file) {
        if (typeof createImageBitmap === 'function') {
            return createImageBitmap(file);
        }
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
            img.src = url;
        });
    }

    /**
     * Reescala una imagen en el navegador y la devuelve como JPEG.
     * Devuelve también el tamaño final, que se usa para el formato y la ficha.
     */
    async function prepareImage(blob, maxSide, quality) {
        const type = (blob.type || '').toLowerCase();
        if (!REF_TYPES.includes(type)) {
            throw new Error('Formato no admitido. Usa PNG, JPG, WEBP o GIF.');
        }
        if (blob.size > REF_MAX_BYTES) {
            throw new Error('La imagen pesa más de 8 MB. Usa una más ligera.');
        }
        const source = await loadImageSource(blob);
        const width = source.width || 1;
        const height = source.height || 1;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // PNG/GIF con transparencia: sobre blanco, como lo vería Flow.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        if (typeof source.close === 'function') source.close();
        return {
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            width: canvas.width,
            height: canvas.height,
        };
    }

    /** Referencia ligera: 1280 px y JPEG q0.86 para no engordar la petición. */
    async function prepareRef(file) {
        const prepared = await prepareImage(file, state.refSide, state.refSide >= 2048 ? 0.92 : 0.86);
        return prepared.dataUrl;
    }

    /** Refleja en las píldoras la calidad de referencia activa. */
    function updateRefQualityUI() {
        if (!els.refQualityChips) return;
        [...els.refQualityChips.querySelectorAll('.chip')].forEach((chip) => {
            const active = Number(chip.dataset.refside) === state.refSide;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', String(active));
        });
    }

    function setRefSide(side, announce = true) {
        state.refSide = side >= 2048 ? 2048 : 1280;
        try { localStorage.setItem(REF_SIDE_KEY, String(state.refSide)); } catch { /* sin almacenamiento */ }
        updateRefQualityUI();
        if (announce) {
            setRefsNote(state.refSide >= 2048
                ? 'Referencias a 2048 px: caras y textos llegan mejor, pero la subida tarda más.'
                : 'Referencias a 1280 px: suben rápido. Si el detalle importa, cambia a «Máxima».');
        }
    }

    async function addRefFile(file, index) {        if (!file || index < 0 || index >= REF_MAX_FILES) return;
        // Se fija el modo AL ELEGIR el archivo: si la persona cambia de modo
        // mientras se prepara la imagen, la referencia cae en su propio juego y
        // no se cuela en el modo nuevo (el bug que motivó separar las referencias).
        const mode = state.mode;
        const target = refsByMode[mode];
        setRefsNote('Preparando la imagen…');
        try {
            const dataUrl = await prepareRef(file);
            target[index] = { dataUrl, name: file.name || '' };
            if (state.mode === mode) updateRefsUI();
        } catch (err) {
            if (state.mode === mode) setRefsNote(err.message, true);
        }
    }

    function openRefPicker(index) {
        if (!els.refInput) return;
        refTarget = index;
        els.refInput.value = '';
        els.refInput.click();
    }

    /* ------------------------------ modo ------------------------------ */

    const COPY = {
        generate: {
            title: 'Describe la imagen',
            sub: 'Elige motor: Google Flow en tu PC (gratis) o los modelos directos del servidor (OpenAI, Gemini y Qwen, de pago). Hasta 2 referencias.',
            placeholder: 'Ej.: Portaaviones nuclear navegando al atardecer, cazas aparcados en cubierta, estela de espuma, fotografía militar realista',
            refsLegend: 'Referencias',
            refsHint: 'opcional · hasta 2',
            emptyTitle: 'Tu lienzo está vacío',
            emptyText: 'Escribe un prompt a la izquierda, elige modelo y pulsa Generar. Con Flow la imagen se crea en tu PC; con los modelos directos, en el servidor.',
            improve: 'Mejorar con IA',
            improveHint: '4 prompts',
            action: 'GENERAR',
        },
        edit: {
            title: 'Edita o escala tu imagen',
            sub: 'Sube la imagen, describe los cambios y, si quieres, marca con un círculo la zona exacta que debe cambiar: el resto se conserva igual. También puedes escalar 2×, 4× u 8× sin pasar por ningún modelo.',
            placeholder: 'Ej.: Cambia el cielo por un atardecer cálido, enciende las luces de la casa y mantén la composición y el resto de detalles',
            refsLegend: 'Referencia de estilo',
            refsHint: 'opcional · 1',
            emptyTitle: 'Sube una imagen para editarla',
            emptyText: 'Pulsa «Editar» arriba, elige la imagen que quieres cambiar y describe qué debe cambiar. También puedes escalarla 2×, 4× u 8× sin gastar Flow.',
            improve: 'Mejorar instrucción',
            improveHint: '4 instrucciones',
            action: 'EDITAR IMAGEN',
        },
        video: {
            title: 'Describe el vídeo',
            sub: 'Se genera con Veo en tu PC, vía Google Flow. Elige modelo y formato; opcionalmente anima una imagen o interpola dos fotogramas.',
            placeholder: 'Ej.: Retrato de una anciana leyendo en una biblioteca, la cámara se acerca despacio, luz de ventana lateral, polvo suspendido en el aire, plano cinematográfico',
            refsLegend: 'Fotogramas de Flow',
            refsHint: 'opcional · inicial y final',
            emptyTitle: 'Tu lienzo está vacío',
            emptyText: 'Escribe un prompt a la izquierda y pulsa Generar vídeo. Veo tarda varios minutos y cada clip gasta puntos de tu cuenta de Flow.',
            improve: 'Mejorar con IA',
            improveHint: '4 prompts',
            action: 'GENERAR VÍDEO',
        },
        series: {
            title: 'Crea una serie',
            sub: 'Escribe la idea y la IA la reparte en escenas con narración y prompt visual. Al generar, todas las escenas van en un solo proyecto de Flow: la preparación se paga una vez y el storyboard sale mucho más rápido.',
            placeholder: '',
            refsLegend: 'Personaje y referencias',
            refsHint: 'opcional · hasta 2',
            emptyTitle: 'Tu storyboard está vacío',
            emptyText: 'En el modo Serie escribes la idea, la IA la convierte en escenas y tú generas todas las imágenes de una vez. Las escenas aparecen aquí con su narración.',
            improve: 'Mejorar idea',
            improveHint: '4 ideas',
            action: 'GENERAR ESCENAS',
        },
    };

    function updateComposerCopy() {
        const copy = COPY[state.mode];
        els.composerTitle.textContent = copy.title;
        els.composerSub.textContent = copy.sub;
        els.prompt.placeholder = copy.placeholder;
        els.refsLegendText.textContent = copy.refsLegend;
        els.refsLegendHint.textContent = copy.refsHint;
        els.emptyTitle.textContent = copy.emptyTitle;
        els.emptyText.textContent = copy.emptyText;
        els.emptyExamples.hidden = state.mode !== 'generate';
        els.btnLabel.textContent = copy.action;
        els.btnIcon.innerHTML = BTN_ICON[state.mode] || BTN_ICON.generate;
        els.btnImproveLabel.textContent = copy.improve;
        if (!state.improveBusy) {
            els.improveHint.textContent = copy.improveHint;
        }
    }

    function setMode(mode) {
        if (state.busy || state.improveBusy) return;
        const next = (mode === 'edit' || mode === 'video' || mode === 'series') ? mode : 'generate';
        state.mode = next;
        // Cada modo recupera sus propias referencias (no se mezclan).
        state.refs = refsByMode[next];
        const editing = next === 'edit';
        const video = next === 'video';
        const series = next === 'series';
        [[els.modeGenerate, 'generate'], [els.modeEdit, 'edit'], [els.modeVideo, 'video'], [els.modeSeries, 'series']].forEach(([el, key]) => {
            if (!el) return;
            el.classList.toggle('is-active', next === key);
            el.setAttribute('aria-pressed', String(next === key));
        });
        document.body.classList.toggle('is-editing', editing);
        document.body.classList.toggle('is-video', video);
        document.body.classList.toggle('is-series', series);
        if (els.seriesPanel) els.seriesPanel.classList.toggle('hidden', !series);
        if (els.btnVariants) els.btnVariants.hidden = next !== 'generate';
        els.sourceControl.hidden = !editing;
        if (els.imageModelControl) els.imageModelControl.hidden = video;
        if (els.videoModelControl) els.videoModelControl.hidden = !video;
        // La serie se genera con Flow: si había un modelo directo se cambia a
        // Flow (es el único motor que genera varias escenas en un proyecto).
        if (series && modelById(state.model).provider !== 'flow') {
            selectModel('flow-nano-banana-2');
        }
        syncModelControls();
        // Flow solo genera vídeo en 16:9 o 9:16: se ocultan los demás formatos.
        if (els.ratioChips) {
            els.ratioChips.classList.toggle('is-video', video);
            [...els.ratioChips.querySelectorAll('.chip')].forEach((chip) => {
                chip.hidden = video && !VIDEO_RATIOS.includes(chip.dataset.ratio);
            });
        }
        if (video && !VIDEO_RATIOS.includes(state.ratio)) {
            state.ratio = '16:9';
            setRatioChip('16:9');
        }
        if (els.refSlots[1]) {
            els.refSlots[1].hidden = editing;
        }
        if (editing && state.refs[1]) {
            state.refs[1] = null;
        }
        els.improvePanel.classList.add('hidden');
        updateComposerCopy();
        updateRefsUI();
        updateSourceUI();
        updateCounter();
        if (video) setNote('Vídeo con Flow, de menor a mayor capacidad. Lite gasta 10 puntos; en el resto, Flow marca el importe antes de generar.');
        else if (series) setNote(state.series.scenes.length
            ? 'Guion cargado: revisa las escenas y pulsa «Generar todas». Van en un solo proyecto de Flow.'
            : 'Escribe la idea y pulsa «Crear guion con IA». La serie se genera en tu PC con Flow.');
        else if (editing) setNote(state.source ? 'Describe los cambios o escala la imagen.' : 'Sube la imagen que quieres editar.');
        else setNote('Listo. Flow se genera gratis en tu PC; los modelos directos gastan saldo de la clave del servidor.');
    }

    /* ------------------------------ imagen a editar ------------------------------ */

    function setSourceNote(text, isError = false) {
        if (!els.sourceNote) return;
        els.sourceNote.textContent = text || '';
        els.sourceNote.classList.toggle('is-error', Boolean(isError));
    }

    function updateSourceUI() {
        const source = state.source;
        const has = Boolean(source);
        if (els.sourceSlot) {
            els.sourceSlot.classList.toggle('has-image', has);
        }
        if (els.sourceThumb) {
            if (has) {
                els.sourceThumb.src = source.dataUrl;
                els.sourceThumb.hidden = false;
            } else {
                els.sourceThumb.removeAttribute('src');
                els.sourceThumb.hidden = true;
            }
        }
        if (els.sourceRemove) {
            els.sourceRemove.hidden = !has;
        }
        if (els.sourceBadge) {
            if (has) {
                els.sourceBadge.textContent = `${source.width} × ${source.height} px`;
                els.sourceBadge.hidden = false;
            } else {
                els.sourceBadge.hidden = true;
            }
        }
        if (els.sourceUpscale) {
            els.sourceUpscale.hidden = !has;
        }
        if (els.sourcePick) {
            els.sourcePick.setAttribute('aria-label', has
                ? 'Cambiar la imagen que quieres editar'
                : 'Elegir la imagen que quieres editar o escalar');
        }
        if (!has) {
            setSourceNote('Obligatoria para editar. También puedes escalarla sin pasar por Flow.');
        }
        updateMaskUI();
    }

    async function addSource(file) {
        if (!file) return;
        setSourceNote('Preparando la imagen…');
        try {
            const prepared = await prepareImage(file, SOURCE_MAX_SIDE, SOURCE_QUALITY);
            state.source = { ...prepared, name: file.name || '' };
            state.mask = null;
            state.ratio = nearestRatio(prepared.width, prepared.height);
            setRatioChip(state.ratio);
            updateSourceUI();
            setSourceNote(`Imagen lista (${prepared.width} × ${prepared.height} px). Describe los cambios o escala sin pasar por Flow.`);
        } catch (err) {
            setSourceNote(err.message, true);
        }
    }

    function clearSource() {
        state.source = null;
        state.mask = null;
        updateSourceUI();
        setNote('Imagen quitada.');
    }

    async function editFromCard(job) {
        if (state.busy || !job || !job.url) return;
        try {
            const blob = await blobFromUrl(job.url);
            const prepared = await prepareImage(blob, SOURCE_MAX_SIDE, SOURCE_QUALITY);
            state.source = { ...prepared, name: 'imagen-de-la-tarjeta.jpg' };
            state.mask = null;
            state.ratio = nearestRatio(prepared.width, prepared.height);
            setRatioChip(state.ratio);
            setMode('edit');
            els.prompt.value = job.prompt || '';
            updateCounter();
            updateSourceUI();
            setSourceNote(`Imagen lista (${prepared.width} × ${prepared.height} px). Describe los cambios o escala sin pasar por Flow.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            els.prompt.focus();
            setNote('Imagen cargada para editar. Describe los cambios.');
        } catch (err) {
            setNote('No se pudo cargar la imagen para editar: ' + err.message, true);
        }
    }

    /* ------------------------------ máscara de edición ------------------------------
       Un círculo sobre la imagen que se edita. El resultado del modelo se recorta a
       ese círculo y el resto se copia del original, así que fuera del círculo la
       imagen queda píxel a píxel igual con cualquier motor (Flow o directo). */

    const maskDraft = {
        cx: 0.5, cy: 0.5, r: 0.175, dragging: false,
        tool: 'circle',        // 'circle' | 'brush'
        strokes: [],           // trazos del pincel: [[ [x,y], ... ], ...] normalizados
        current: null,         // trazo en curso
    };
    let maskReturnFocus = null;

    // Zoom y desplazamiento SOLO de la vista: la máscara sigue en coordenadas
    // normalizadas de la imagen, así que ampliar no cambia lo marcado.
    const maskView = { scale: 1, x: 0, y: 0 };
    const maskPan = { space: false, active: false, startX: 0, startY: 0, originX: 0, originY: 0 };
    const maskPointers = new Map();
    let maskGesture = null;

    const maskPercent = () => Math.round(((state.mask && state.mask.type !== 'brush' ? state.mask.r : maskDraft.r)) * 200);
    const maskClamp = (value, min, max) => Math.min(max, Math.max(min, value));
    /** Grosor del pincel en píxeles de pantalla a partir del deslizador (5-100 %). */
    const brushPx = (minSide) => Math.max(3, (Number(els.maskSize ? els.maskSize.value : 35) / 100) * minSide * 0.5);

    function maskDragLimits() {
        const img = els.maskImage;
        const w = img && img.clientWidth ? img.clientWidth : 1;
        const h = img && img.clientHeight ? img.clientHeight : 1;
        const radius = maskDraft.r * Math.min(w, h);
        return {
            rx: radius / Math.max(1, w),
            ry: radius / Math.max(1, h),
        };
    }

    /* ---------------------- zoom y desplazamiento de la vista ---------------------- */

    function clampMaskView() {
        const stage = els.maskStage;
        if (!stage) return;
        const w = stage.clientWidth || 1;
        const h = stage.clientHeight || 1;
        const minX = -(maskView.scale - 1) * w;
        const minY = -(maskView.scale - 1) * h;
        maskView.x = Math.min(0, Math.max(minX, maskView.x));
        maskView.y = Math.min(0, Math.max(minY, maskView.y));
    }

    function applyMaskView() {
        const transform = `translate(${maskView.x}px, ${maskView.y}px) scale(${maskView.scale})`;
        if (els.maskImage) els.maskImage.style.transform = transform;
        if (els.maskCanvas) els.maskCanvas.style.transform = transform;
        if (els.maskZoomValue) els.maskZoomValue.textContent = `${Math.round(maskView.scale * 100)} %`;
        updateBrushCursorSize();
    }

    function resetMaskView() {
        maskView.scale = 1;
        maskView.x = 0;
        maskView.y = 0;
        applyMaskView();
    }

    /** Zoom anclado al punto del cursor: lo que está bajo el ratón no se mueve. */
    function zoomMaskAt(clientX, clientY, factor) {
        const stage = els.maskStage;
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const next = Math.min(6, Math.max(1, maskView.scale * factor));
        if (Math.abs(next - maskView.scale) < 0.001) return;
        const k = next / maskView.scale;
        maskView.x = px - (px - maskView.x) * k;
        maskView.y = py - (py - maskView.y) * k;
        maskView.scale = next;
        clampMaskView();
        applyMaskView();
    }

    function zoomMaskBy(factor) {
        const stage = els.maskStage;
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        zoomMaskAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    }

    function onMaskWheel(event) {
        if (!els.maskDialog || !els.maskDialog.open) return;
        event.preventDefault();
        const factor = Math.min(2, Math.max(0.5, Math.exp(-event.deltaY * 0.0015)));
        zoomMaskAt(event.clientX, event.clientY, factor);
    }

    function startMaskPan(event) {
        maskPan.active = true;
        maskPan.startX = event.clientX;
        maskPan.startY = event.clientY;
        maskPan.originX = maskView.x;
        maskPan.originY = maskView.y;
        if (els.maskCanvas) {
            els.maskCanvas.classList.add('is-panning');
            try { els.maskCanvas.setPointerCapture(event.pointerId); } catch { /* sin captura */ }
        }
        hideBrushCursor();
        event.preventDefault();
    }

    function moveMaskPan(event) {
        if (!maskPan.active) return;
        maskView.x = maskPan.originX + (event.clientX - maskPan.startX);
        maskView.y = maskPan.originY + (event.clientY - maskPan.startY);
        clampMaskView();
        applyMaskView();
    }

    function endMaskPan() {
        maskPan.active = false;
        if (els.maskCanvas) els.maskCanvas.classList.remove('is-panning');
    }

    /** Dos dedos: pellizco para zoom y arrastre para mover. */
    function startMaskGesture() {
        const points = [...maskPointers.values()];
        if (points.length < 2) return;
        const stage = els.maskStage;
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const [a, b] = points;
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        maskGesture = {
            dist,
            scale0: maskView.scale,
            cx: (midX - maskView.x) / maskView.scale,
            cy: (midY - maskView.y) / maskView.scale,
        };
        // Un pellizco no pinta: se descarta el trazo que hubiera empezado.
        maskDraft.current = null;
        maskDraft.dragging = false;
        hideBrushCursor();
        drawMaskOverlay();
    }

    function updateMaskGesture() {
        const points = [...maskPointers.values()];
        const stage = els.maskStage;
        if (!maskGesture || !stage || points.length < 2) return;
        const rect = stage.getBoundingClientRect();
        const [a, b] = points;
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const midX = (a.x + b.x) / 2 - rect.left;
        const midY = (a.y + b.y) / 2 - rect.top;
        const next = Math.min(6, Math.max(1, maskGesture.scale0 * (dist / maskGesture.dist)));
        maskView.scale = next;
        maskView.x = midX - maskGesture.cx * next;
        maskView.y = midY - maskGesture.cy * next;
        clampMaskView();
        applyMaskView();
    }

    /* ------------------------------ cursor del pincel ------------------------------ */

    function updateBrushCursorSize() {
        const cursor = els.brushCursor;
        const img = els.maskImage;
        if (!cursor || !img) return;
        const base = brushPx(Math.min(img.clientWidth || 1, img.clientHeight || 1));
        const size = Math.max(6, base * maskView.scale);
        cursor.style.width = `${size}px`;
        cursor.style.height = `${size}px`;
    }

    function moveBrushCursor(event) {
        const cursor = els.brushCursor;
        const stage = els.maskStage;
        if (!cursor || !stage) return;
        if (maskDraft.tool !== 'brush' || maskPan.active || maskGesture) {
            cursor.hidden = true;
            return;
        }
        const rect = stage.getBoundingClientRect();
        cursor.hidden = false;
        cursor.style.left = `${event.clientX - rect.left}px`;
        cursor.style.top = `${event.clientY - rect.top}px`;
        updateBrushCursorSize();
    }

    function hideBrushCursor() {
        if (els.brushCursor) els.brushCursor.hidden = true;
    }

    function drawMaskOverlay() {
        const canvas = els.maskCanvas;
        const img = els.maskImage;
        if (!canvas || !img || !img.naturalWidth) return;
        const w = Math.round(img.clientWidth);
        const h = Math.round(img.clientHeight);
        if (!w || !h) return;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (maskDraft.tool === 'brush') {
            // La imagen se ve entera (hace falta para precisar) y lo pintado se
            // tiñe de cian: es lo único que se va a editar.
            const width = brushPx(Math.min(w, h));
            const strokes = maskDraft.current ? maskDraft.strokes.concat([maskDraft.current]) : maskDraft.strokes;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 208, 208, 0.36)';
            ctx.fillStyle = 'rgba(0, 208, 208, 0.36)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = width;
            strokes.forEach((stroke) => {
                if (!stroke.length) return;
                if (stroke.length === 1) {
                    ctx.beginPath();
                    ctx.arc(stroke[0][0] * w, stroke[0][1] * h, width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    return;
                }
                ctx.beginPath();
                stroke.forEach(([x, y], index) => {
                    if (index === 0) ctx.moveTo(x * w, y * h);
                    else ctx.lineTo(x * w, y * h);
                });
                ctx.stroke();
            });
            ctx.restore();
            return;
        }

        const radius = maskDraft.r * Math.min(w, h);
        const x = maskDraft.cx * w;
        const y = maskDraft.cy * h;
        // Oscurece todo menos el círculo (el agujero se abre con evenodd).
        ctx.fillStyle = 'rgba(0, 12, 18, 0.64)';
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        // Aro cian discontinuo.
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 208, 208, 0.95)';
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function updateMaskUI() {
        if (!els.sourceMask) return;
        const editing = state.mode === 'edit';
        els.sourceMask.hidden = !editing || !state.source;
        const brush = Boolean(state.mask && state.mask.type === 'brush');
        if (els.btnMaskEdit) {
            els.btnMaskEdit.textContent = state.mask ? (brush ? 'Ajustar máscara' : 'Ajustar círculo') : 'Crear máscara';
            els.btnMaskEdit.setAttribute('aria-pressed', String(Boolean(state.mask)));
        }
        if (els.btnMaskClear) els.btnMaskClear.hidden = !state.mask;
        if (els.maskNote) {
            els.maskNote.textContent = state.mask
                ? (brush
                    ? 'Máscara de pincel activa: solo cambiará la zona pintada; el resto se conserva igual.'
                    : `Máscara activa (${maskPercent()} %): solo cambiará el interior del círculo; fuera se conserva el original.`)
                : 'Sin máscara: se edita toda la imagen.';
            els.maskNote.classList.toggle('is-active', Boolean(state.mask));
        }
    }

    /** Sincroniza las píldoras Círculo/Pincel, el deslizador y las ayudas. */
    function updateMaskToolUI() {
        const brush = maskDraft.tool === 'brush';
        [[els.maskToolCircle, 'circle'], [els.maskToolBrush, 'brush']].forEach(([el, key]) => {
            if (!el) return;
            el.classList.toggle('is-active', maskDraft.tool === key);
            el.setAttribute('aria-pressed', String(maskDraft.tool === key));
        });
        if (els.maskUndo) els.maskUndo.hidden = !brush || !maskDraft.strokes.length;
        if (els.maskResetBrush) els.maskResetBrush.hidden = !brush || !maskDraft.strokes.length;
        if (els.maskCanvas) els.maskCanvas.classList.toggle('is-brush', brush);
        if (!brush) hideBrushCursor();
        else updateBrushCursorSize();
        if (els.maskSizeLabel) els.maskSizeLabel.textContent = brush ? 'Grosor del pincel' : 'Tamaño del círculo';
        if (els.maskHint) {
            els.maskHint.textContent = brush
                ? 'Pinta la zona que quieres cambiar. Rueda del ratón: zoom · Espacio + arrastrar: mover · el círculo del cursor marca el grosor.'
                : 'Arrastra el círculo para moverlo. Rueda del ratón: zoom · Espacio + arrastrar: mover · 0 vuelve al 100 %.';
        }
    }

    function setMaskTool(tool) {
        const next = tool === 'brush' ? 'brush' : 'circle';
        if (maskDraft.tool === next) return;
        maskDraft.tool = next;
        maskDraft.current = null;
        maskDraft.dragging = false;
        updateMaskToolUI();
        drawMaskOverlay();
    }

    function resetMaskDraft() {
        if (state.mask && state.mask.type === 'brush') {
            maskDraft.tool = 'brush';
            maskDraft.strokes = (state.mask.strokes || []).map((stroke) => stroke.slice());
            maskDraft.current = null;
            if (els.maskSize) els.maskSize.value = String(state.mask.percent || 35);
        } else {
            maskDraft.tool = 'circle';
            maskDraft.strokes = [];
            maskDraft.current = null;
            if (state.mask) {
                maskDraft.cx = state.mask.cx;
                maskDraft.cy = state.mask.cy;
                maskDraft.r = state.mask.r;
            } else {
                maskDraft.cx = 0.5;
                maskDraft.cy = 0.5;
                maskDraft.r = 0.175;
            }
            if (els.maskSize) els.maskSize.value = String(maskPercent());
        }
        if (els.maskSizeValue) els.maskSizeValue.textContent = `${Number(els.maskSize ? els.maskSize.value : 35)} %`;
        updateMaskToolUI();
    }

    function openMaskModal() {
        if (!els.maskDialog || !state.source) return;
        maskReturnFocus = document.activeElement;
        resetMaskDraft();
        // <dialog> nativo: capa superior, foco atrapado y sin que el visor con
        // zoom lo confunda con un lightbox (su posición calculada no es de pantalla completa).
        if (typeof els.maskDialog.showModal === 'function') els.maskDialog.showModal();
        else els.maskDialog.setAttribute('open', '');
        document.body.classList.add('has-modal');
        const ready = () => { resetMaskView(); updateMaskToolUI(); drawMaskOverlay(); };
        if (els.maskImage.getAttribute('src') !== state.source.dataUrl) {
            els.maskImage.src = state.source.dataUrl;
        }
        if (els.maskImage.complete && els.maskImage.naturalWidth) {
            setTimeout(ready, 40);
        } else {
            els.maskImage.addEventListener('load', () => setTimeout(ready, 40), { once: true });
        }
        setTimeout(ready, 260);
        setTimeout(() => { if (els.maskSize) els.maskSize.focus({ preventScroll: true }); }, 90);
    }

    function closeMaskModal() {
        if (!els.maskDialog) return;
        if (els.maskDialog.open && typeof els.maskDialog.close === 'function') els.maskDialog.close();
        else els.maskDialog.removeAttribute('open');
        document.body.classList.remove('has-modal');
        maskDraft.dragging = false;
        maskDraft.current = null;
        maskPointers.clear();
        maskGesture = null;
        maskPan.space = false;
        endMaskPan();
        hideBrushCursor();
        resetMaskView();
        if (maskReturnFocus && typeof maskReturnFocus.focus === 'function') {
            try { maskReturnFocus.focus({ preventScroll: true }); } catch { /* sin foco */ }
        }
        maskReturnFocus = null;
    }

    function applyMaskDraft() {
        if (maskDraft.tool === 'brush') {
            if (!maskDraft.strokes.length) {
                if (els.maskHint) els.maskHint.textContent = 'Pinta al menos una zona con el pincel antes de aplicar.';
                return;
            }
            const built = buildBrushMaskDataUrl();
            if (!built) {
                if (els.maskHint) els.maskHint.textContent = 'No se pudo preparar la máscara. Inténtalo otra vez.';
                return;
            }
            state.mask = {
                type: 'brush',
                strokes: maskDraft.strokes.map((stroke) => stroke.slice()),
                dataUrl: built.dataUrl,
                width: built.width,
                height: built.height,
                percent: Number(els.maskSize ? els.maskSize.value : 35),
            };
            closeMaskModal();
            updateMaskUI();
            setSourceNote('Máscara de pincel aplicada: solo se cambiará la zona pintada; el resto se conserva igual.');
            return;
        }
        state.mask = { type: 'circle', cx: maskDraft.cx, cy: maskDraft.cy, r: maskDraft.r };
        closeMaskModal();
        updateMaskUI();
        setSourceNote(`Máscara aplicada (${maskPercent()} %). Solo se cambiará el interior del círculo.`);
    }

    /**
     * Convierte los trazos del pincel en un PNG blanco (alfa) del tamaño de la
     * imagen original: es la máscara que se usa para componer el resultado.
     */
    function buildBrushMaskDataUrl() {
        const source = state.source;
        if (!source || !source.width || !source.height) return null;
        const w = source.width;
        const h = source.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const width = brushPx(Math.min(w, h));
        ctx.fillStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;
        maskDraft.strokes.forEach((stroke) => {
            if (!stroke.length) return;
            ctx.beginPath();
            stroke.forEach(([x, y], index) => {
                if (index === 0) ctx.moveTo(x * w, y * h);
                else ctx.lineTo(x * w, y * h);
            });
            if (stroke.length === 1) {
                ctx.arc(stroke[0][0] * w, stroke[0][1] * h, width / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.stroke();
            }
        });
        let dataUrl = '';
        try {
            dataUrl = canvas.toDataURL('image/png');
        } catch { /* sin canvas */ }
        canvas.width = 0;
        canvas.height = 0;
        if (!dataUrl || dataUrl.length < 100) return null;
        return { dataUrl, width: w, height: h };
    }

    function clearMask() {
        state.mask = null;
        updateMaskUI();
        setSourceNote('Máscara quitada: se editará toda la imagen.');
    }

    function maskPointFromEvent(event) {
        const canvas = els.maskCanvas;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return [
            maskClamp((event.clientX - rect.left) / rect.width, 0, 1),
            maskClamp((event.clientY - rect.top) / rect.height, 0, 1),
        ];
    }

    function maskPointerDown(event) {
        const canvas = els.maskCanvas;
        if (!canvas) return;
        maskPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        // Dos dedos: pellizco/arrastre de la vista (no pinta).
        if (maskPointers.size >= 2) {
            startMaskGesture();
            event.preventDefault();
            return;
        }
        // Espacio + arrastrar o botón central: mover la imagen ampliada.
        if (event.button === 1 || maskPan.space) {
            startMaskPan(event);
            return;
        }
        if (maskDraft.tool === 'brush') {
            const point = maskPointFromEvent(event);
            if (!point) return;
            maskDraft.current = [point];
            if (canvas.setPointerCapture) {
                try { canvas.setPointerCapture(event.pointerId); } catch { /* sin captura */ }
            }
            event.preventDefault();
            moveBrushCursor(event);
            drawMaskOverlay();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const limits = maskDragLimits();
        maskDraft.cx = maskClamp((event.clientX - rect.left) / rect.width, limits.rx, 1 - limits.rx);
        maskDraft.cy = maskClamp((event.clientY - rect.top) / rect.height, limits.ry, 1 - limits.ry);
        maskDraft.dragging = true;
        if (canvas.setPointerCapture) {
            try { canvas.setPointerCapture(event.pointerId); } catch { /* sin captura */ }
        }
        event.preventDefault();
        drawMaskOverlay();
    }

    function maskPointerMove(event) {
        if (maskPointers.has(event.pointerId)) {
            maskPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }
        if (maskGesture) {
            updateMaskGesture();
            return;
        }
        if (maskPan.active) {
            moveMaskPan(event);
            return;
        }
        if (maskDraft.tool === 'brush') {
            moveBrushCursor(event);
            if (!maskDraft.current) return;
            const point = maskPointFromEvent(event);
            if (!point) return;
            const last = maskDraft.current[maskDraft.current.length - 1];
            // Umbral: evita miles de puntos por trazo y mantiene el trazo suave.
            if (Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]) < 0.002) return;
            maskDraft.current.push(point);
            drawMaskOverlay();
            return;
        }
        if (!maskDraft.dragging) return;
        const rect = els.maskCanvas.getBoundingClientRect();
        const limits = maskDragLimits();
        maskDraft.cx = maskClamp((event.clientX - rect.left) / rect.width, limits.rx, 1 - limits.rx);
        maskDraft.cy = maskClamp((event.clientY - rect.top) / rect.height, limits.ry, 1 - limits.ry);
        drawMaskOverlay();
    }

    function maskPointerUp(event) {
        maskPointers.delete(event.pointerId);
        if (els.maskCanvas && els.maskCanvas.releasePointerCapture) {
            try { els.maskCanvas.releasePointerCapture(event.pointerId); } catch { /* sin captura */ }
        }
        if (maskGesture) {
            if (maskPointers.size < 2) maskGesture = null;
            return;
        }
        if (maskPan.active) {
            endMaskPan();
            return;
        }
        if (maskDraft.tool === 'brush') {
            if (maskDraft.current && maskDraft.current.length) {
                maskDraft.strokes.push(maskDraft.current);
            }
            maskDraft.current = null;
            updateMaskToolUI();
            drawMaskOverlay();
            return;
        }
        maskDraft.dragging = false;
    }

    function undoBrushStroke() {
        if (!maskDraft.strokes.length) return;
        maskDraft.strokes.pop();
        updateMaskToolUI();
        drawMaskOverlay();
    }

    function resetBrushStrokes() {
        maskDraft.strokes = [];
        maskDraft.current = null;
        updateMaskToolUI();
        drawMaskOverlay();
    }

    function setMaskSizeFromSlider() {
        const value = Number(els.maskSize.value);
        if (els.maskSizeValue) els.maskSizeValue.textContent = `${Math.round(value)} %`;
        if (maskDraft.tool === 'brush') {
            updateBrushCursorSize();
            drawMaskOverlay();
            return;
        }
        maskDraft.r = maskClamp(value / 200, 0.025, 0.5);
        const limits = maskDragLimits();
        maskDraft.cx = maskClamp(maskDraft.cx, limits.rx, 1 - limits.rx);
        maskDraft.cy = maskClamp(maskDraft.cy, limits.ry, 1 - limits.ry);
        drawMaskOverlay();
    }



    /* ------------------------------ escalado 2× · 4× · 8× ------------------------------ */

    function closeUpscaleMenu() {
        if (state.upscaleMenu) {
            state.upscaleMenu.remove();
            state.upscaleMenu = null;
        }
    }

    function toggleUpscaleMenu(job, anchor) {
        if (state.upscaleBusy || !job.el) return;
        closeUpscaleMenu();
        const media = job.el.querySelector('.card-media');
        if (!media) return;
        const menu = document.createElement('div');
        menu.className = 'upscale-menu';
        menu.setAttribute('role', 'group');
        menu.setAttribute('aria-label', 'Escalar imagen');
        const title = document.createElement('span');
        title.className = 'upscale-title';
        title.textContent = 'Escalar';
        menu.appendChild(title);
        [2, 4, 8].forEach((factor) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'upscale-opt';
            option.textContent = factor + '×';
            option.addEventListener('click', () => {
                closeUpscaleMenu();
                runUpscale(job, factor);
            });
            menu.appendChild(option);
        });
        const note = document.createElement('span');
        note.className = 'upscale-note';
        note.textContent = 'Máximo 8192 px por lado';
        menu.appendChild(note);
        media.appendChild(menu);
        state.upscaleMenu = menu;
        const first = menu.querySelector('.upscale-opt');
        if (first) first.focus();
        const onDocumentClick = (event) => {
            if (menu.contains(event.target) || (anchor && anchor.contains(event.target))) {
                return;
            }
            closeUpscaleMenu();
            document.removeEventListener('click', onDocumentClick, true);
        };
        setTimeout(() => document.addEventListener('click', onDocumentClick, true), 0);
    }

    /** Escala por pasos de 2× con suavizado alto: mejor que un salto único. */
    async function scaleCanvas(source, targetW, targetH) {
        let current = source;
        let width = source.width;
        let height = source.height;
        let canvas = null;
        while (width < targetW || height < targetH) {
            const nextW = Math.min(targetW, Math.round(width * 2));
            const nextH = Math.min(targetH, Math.round(height * 2));
            const next = document.createElement('canvas');
            next.width = nextW;
            next.height = nextH;
            const ctx = next.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, nextW, nextH);
            ctx.drawImage(current, 0, 0, nextW, nextH);
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
            }
            canvas = next;
            current = next;
            width = nextW;
            height = nextH;
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(source, 0, 0, targetW, targetH);
        }
        return canvas;
    }

    async function runUpscale(job, factor) {
        if (state.upscaleBusy || !job || !job.url) return;
        state.upscaleBusy = true;
        setNote(`Escalando ${factor}× en este navegador…`);
        try {
            const blob = await blobFromUrl(job.url);
            const bitmap = await loadImageSource(blob);
            const width = bitmap.width;
            const height = bitmap.height;
            const scale = Math.min(factor, UPSCALE_MAX_SIDE / Math.max(width, height));
            if (scale <= 1.001) {
                throw new Error(`La imagen ya mide ${width} × ${height} px; no se puede escalar más.`);
            }
            const targetW = Math.max(1, Math.round(width * scale));
            const targetH = Math.max(1, Math.round(height * scale));
            const canvas = await scaleCanvas(bitmap, targetW, targetH);
            if (typeof bitmap.close === 'function') bitmap.close();
            // Data URL, no blob: la CSP del sitio solo permite img-src data:.
            const outUrl = canvas.toDataURL('image/jpeg', 0.94);
            canvas.width = 0;
            canvas.height = 0;
            if (!outUrl || outUrl.length < 100) {
                throw new Error('El navegador no pudo generar la imagen escalada.');
            }
            const upJob = {
                id: 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                prompt: job.prompt || 'Imagen escalada',
                ratio: nearestRatio(targetW, targetH),
                model: `Escalado ${factor}×`,
                status: 'done',
                url: outUrl,
                error: '',
                extraMeta: `${targetW} × ${targetH}`,
                upscaled: true,
            };
            const card = createCard(upJob, false);
            upJob.el = card;
            markDone(upJob, { url: outUrl });
            els.grid.prepend(card);
            updateStudioCount();
            const clamped = scale < factor - 0.001;
            setNote(clamped
                ? `Escalado ${factor}× limitado a ${targetW} × ${targetH} px (máximo 8192). Descárgalo desde la tarjeta; no se guarda en el historial.`
                : `Escalado ${factor}× listo: ${targetW} × ${targetH} px. Descárgalo desde la tarjeta; no se guarda en el historial.`);
        } catch (err) {
            setNote('No se pudo escalar: ' + err.message, true);
        } finally {
            state.upscaleBusy = false;
        }
    }

    /* ------------------------------ generar ------------------------------ */

    /** Convierte el texto del usuario en una instrucción de edición inequívoca. */
    function editInstruction(text, hasReference) {
        const clean = text.trim().replace(/\s+/g, ' ');
        if (/^edita\b/i.test(clean)) {
            return hasReference
                ? `${clean} Usa la segunda imagen solo como referencia de estilo, no la combines.`
                : clean;
        }
        const suffix = hasReference
            ? '; si hay una segunda imagen, úsala solo como referencia de estilo, no la combines'
            : '';
        return `Edita la imagen adjunta manteniendo intacto todo lo que no se indique${suffix}: ${clean}`;
    }

    /* ------------------------------ variantes de plano ------------------------------
       Shot Explorer: cuatro encuadres de la misma escena. Se encolan juntos en
       una sola petición y el worker los genera en un único proyecto de Flow. */
    const SHOT_ANGLES = [
        { label: 'Plano general', text: 'plano general que sitúe la escena y el entorno' },
        { label: 'Plano medio', text: 'plano medio centrado en el sujeto y su acción' },
        { label: 'Primer plano', text: 'primer plano del rostro y del detalle principal' },
        { label: 'Contrapicado', text: 'plano contrapicado, cámara baja mirando hacia arriba' },
    ];

    async function generateVariants() {
        if (state.busy) return;
        if (state.mode !== 'generate') {
            setNote('Las variantes de plano se generan en el modo Generar.', true);
            return;
        }
        const prompt = els.prompt.value.trim();
        if (!prompt) {
            setNote('Escribe primero la escena para generar las variantes.', true);
            els.prompt.focus();
            return;
        }
        if (!isFlowModel(state.model)) selectModel('flow-nano-banana-2');
        const base = prompt.replace(/[\s.]+$/, '');
        const items = SHOT_ANGLES.map((shot) => ({
            prompt: `${base}. Encuadre: ${shot.text}. Mantén la misma escena, el mismo personaje, la misma luz y la misma paleta.`,
            label: shot.label,
        }));
        await enqueueFlowPrompts(items, refsPayload(), isFlowModel(state.model) ? state.model : 'flow-nano-banana-2');
    }

    async function generate() {
        if (state.mode === 'series') {
            await generateSeriesAll();
            return;
        }
        const prompt = els.prompt.value.trim();
        if (!prompt) {
            setNote(state.mode === 'edit' ? 'Describe primero qué quieres cambiar.' : 'Escribe primero qué quieres generar.', true);
            els.prompt.focus();
            return;
        }
        const editing = state.mode === 'edit';
        if (editing && !state.source) {
            setNote('Sube primero la imagen que quieres editar.', true);
            if (els.sourcePick) els.sourcePick.focus();
            return;
        }
        if (state.mode === 'video') {
            await generateVideo(prompt);
            return;
        }
        const refs = editing
            ? [state.source.dataUrl, ...state.refs.filter(Boolean).slice(0, 1).map((ref) => ref.dataUrl)]
            : refsPayload();
        const flowPrompt = editing ? editInstruction(prompt, refs.length > 1) : prompt;
        const model = modelById(state.model);
        const mask = editing ? state.mask : null;
        const sourceDataUrl = editing && state.source ? state.source.dataUrl : null;

        if (model.provider === 'flow') {
            await generateFlow({ prompt, flowPrompt, refs, editing, count: editing ? 1 : state.count, mask, sourceDataUrl });
            return;
        }

        // Los modelos directos gastan saldo de la clave del servidor: exigen
        // sesión, igual que en el estudio. La compuerta ya pide la contraseña
        // al elegir un modelo protegido; aquí se pide si aún no hay sesión.
        if (!(await ensureSession())) {
            setNote('Los modelos directos necesitan la contraseña de acceso. No se ha enviado nada.', true);
            return;
        }
        await generateDirect({ prompt, flowPrompt, refs, editing, model, mask, sourceDataUrl });
    }

    /** Genera con Google Flow: encola en el servidor y sigue el trabajo del PC. */
    async function generateFlow({ prompt, flowPrompt, refs, editing, count, mask, sourceDataUrl }) {
        setBusy(true);
        setNote(refs.length
            ? `Enviando ${refs.length} imagen${refs.length > 1 ? 'es' : ''} a la cola…`
            : 'Enviando a la cola…');

        try {
            const data = await post({
                action: 'request',
                prompt: flowPrompt,
                ratio: state.ratio,
                model: state.model,
                count,
                mode: editing ? 'edit' : 'generate',
                refs,
            });
            const base = {
                prompt,
                flowPrompt,
                ratio: state.ratio,
                model: modelById(state.model).display,
                refs: refs.slice(),
                mode: editing ? 'edit' : 'generate',
                mask: mask || null,
                source: sourceDataUrl || null,
            };
            const cards = [];
            data.ids.forEach((id) => {
                const job = { id, ...base, status: 'queued', url: '', error: '' };
                const card = createCard(job, false);
                job.el = card;
                state.jobs.set(id, job);
                cards.push(card);
            });
            prependInOrder(cards);
            updateStudioCount();
            persistPending();
            showOverlay();
            startPolling();
        } catch (err) {
            setBusy(false);
            setNote('No se pudo encolar: ' + err.message, true);
            hideOverlay();
        }
    }

    /* ------------------------------ modo serie ------------------------------ */

    /** Nota propia del panel de serie (no la de la cola de la app). */
    function setSeriesNote(text, isError = false) {
        if (!els.seriesNote) return;
        els.seriesNote.textContent = text || '';
        els.seriesNote.classList.toggle('is-error', Boolean(isError));
    }

    function setSeriesBusy(busy) {
        state.series.busy = busy;
        if (els.btnStoryboard) {
            els.btnStoryboard.disabled = busy;
            els.btnStoryboard.classList.toggle('is-busy', busy);
        }
        if (els.btnStoryboardLabel) {
            els.btnStoryboardLabel.textContent = busy ? 'Escribiendo guion…' : 'Crear guion con IA';
        }
    }

    /** Pinta las escenas editables del guion. */
    function renderSeriesScenes() {
        if (!els.seriesScenes) return;
        els.seriesScenes.innerHTML = '';
        state.series.scenes.forEach((scene) => {
            const art = document.createElement('article');
            art.className = 'scene';
            art.dataset.n = String(scene.n);
            art.innerHTML = `
                <header class="scene-head">
                    <span class="scene-num" aria-hidden="true">${String(scene.n).padStart(2, '0')}</span>
                    <input class="scene-title" type="text" maxlength="60" value="${escapeHtml(scene.titulo)}"
                        aria-label="Título de la escena ${scene.n}" spellcheck="true">
                    <span class="scene-dur">${scene.duracion} s</span>
                </header>
                <label class="scene-field">Narración
                    <textarea class="scene-narration" rows="2" maxlength="400" aria-label="Narración de la escena ${scene.n}">${escapeHtml(scene.narracion)}</textarea>
                </label>
                <label class="scene-field">Prompt de imagen
                    <textarea class="scene-prompt" rows="3" maxlength="1200" aria-label="Prompt de la escena ${scene.n}">${escapeHtml(scene.prompt)}</textarea>
                </label>
                <footer class="scene-actions">
                    <button type="button" class="chip scene-generate" data-scene="${scene.n}">Generar esta</button>
                    <button type="button" class="icon-btn scene-remove" data-scene="${scene.n}" aria-label="Quitar la escena ${scene.n}">${SVG.trash}</button>
                </footer>`;
            els.seriesScenes.appendChild(art);
        });
        updateSeriesUI();
    }

    function updateSeriesUI() {
        const has = state.series.scenes.length > 0;
        if (els.seriesActions) els.seriesActions.hidden = !has;
        if (els.btnSeriesGenerate) els.btnSeriesGenerate.disabled = !has || state.busy;
        if (els.btnSeriesExport) els.btnSeriesExport.disabled = !has;
        if (els.btnSeriesClear) els.btnSeriesClear.hidden = !has;
    }

    /** Vuelca lo editado en el DOM al estado (sin re-renderizar: no se pierde el foco). */
    function syncSceneInput(input) {
        const art = input.closest('.scene');
        if (!art) return;
        const scene = state.series.scenes.find((item) => item.n === Number(art.dataset.n));
        if (!scene) return;
        if (input.classList.contains('scene-title')) scene.titulo = input.value;
        else if (input.classList.contains('scene-narration')) scene.narracion = input.value;
        else if (input.classList.contains('scene-prompt')) scene.prompt = input.value;
    }

    /** Encola varias escenas en UNA petición: el worker las genera en un lote. */
    async function enqueueFlowPrompts(items, refs, modelId) {
        setBusy(true);
        showOverlay();
        els.loadingText.textContent = items.length > 1 ? 'IA generando la serie…' : 'IA generando la escena…';
        els.loadingSub.textContent = items.length > 1
            ? `${items.length} escenas en un solo proyecto de Flow. Es la vía rápida: una preparación para todas.`
            : 'Flow está trabajando en tu PC. Puedes seguir en segundo plano.';
        try {
            const data = await post({
                action: 'request',
                prompts: items.map((item) => item.prompt),
                ratio: state.ratio,
                model: modelId || state.model,
                count: 1,
                mode: 'generate',
                refs,
            });
            const model = modelById(modelId || state.model).display;
            const cards = [];
            data.ids.forEach((id, index) => {
                const item = items[index] || items[0];
                const job = {
                    id,
                    prompt: item.prompt,
                    flowPrompt: item.prompt,
                    ratio: state.ratio,
                    model,
                    refs: refs.slice(),
                    mode: 'generate',
                    narration: item.narration || '',
                    scene: item.scene || 0,
                    extraMeta: item.label || '',
                    status: 'queued',
                    url: '',
                    error: '',
                };
                const card = createCard(job, false);
                job.el = card;
                state.jobs.set(id, job);
                cards.push(card);
            });
            prependInOrder(cards);
            updateStudioCount();
            persistPending();
            startPolling();
            setNote(items.length > 1
                ? `Serie en cola: ${items.length} escenas. El PC las genera seguidas en un solo proyecto.`
                : 'Escena en cola.');
        } catch (err) {
            setBusy(false);
            hideOverlay();
            setSeriesNote('No se pudo encolar: ' + err.message, true);
        }
    }

    /** Genera todas las escenas del guion (o la que se pida). */
    async function generateSeriesAll() {
        if (!state.series.scenes.length) {
            // Sin guion todavía: el botón principal lo crea, que es lo que el
            // usuario espera al pulsar GENERAR ESCENAS la primera vez.
            await requestStoryboard();
            return;
        }
        const scenes = state.series.scenes.filter((scene) => scene.prompt.trim());
        if (!scenes.length) {
            setSeriesNote('Cada escena necesita un prompt. Crea el guion o escríbelo.', true);
            return;
        }
        if (modelById(state.model).provider !== 'flow') {
            selectModel('flow-nano-banana-2');
        }
        // Si las escenas ya están generadas, repetir gasta puntos de Flow:
        // se avisa antes de encolar otra tanda.
        const jobs = [...state.jobs.values()];
        const yaHechas = scenes.filter((scene) => jobs.some((job) => Number(job.scene) === scene.n && job.url)).length;
        if (yaHechas === scenes.length && scenes.length > 0) {
            const ok = window.confirm(`Las ${scenes.length} escenas ya tienen imagen. ¿Generarlas otra vez? Gastará puntos de Flow.`);
            if (!ok) return;
        }
        await enqueueFlowPrompts(
            scenes.map((scene) => ({ prompt: scene.prompt.trim(), narration: scene.narracion, scene: scene.n })),
            refsPayload(),
            isFlowModel(state.model) ? state.model : 'flow-nano-banana-2',
        );
    }

    async function generateSeriesScene(n) {
        const scene = state.series.scenes.find((item) => item.n === n);
        if (!scene || !scene.prompt.trim()) {
            setSeriesNote('Esa escena no tiene prompt.', true);
            return;
        }
        await enqueueFlowPrompts(
            [{ prompt: scene.prompt.trim(), narration: scene.narracion, scene: scene.n }],
            refsPayload(),
            isFlowModel(state.model) ? state.model : 'flow-nano-banana-2',
        );
    }

    /** Pide al modelo de texto un guion de N escenas a partir de la idea. */
    async function requestStoryboard() {
        const idea = els.seriesIdea ? els.seriesIdea.value.trim() : '';
        if (!idea) {
            setSeriesNote('Escribe primero la idea de la serie.', true);
            if (els.seriesIdea) els.seriesIdea.focus();
            return;
        }
        if (state.series.busy) return;
        setSeriesBusy(true);
        showOverlay();
        els.loadingText.textContent = 'Escribiendo el guion…';
        els.loadingSub.textContent = 'El modelo reparte la idea en escenas con narración y prompt visual.';
        try {
            const resp = await fetch(AI, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    action: 'storyboard',
                    idea,
                    scenes: Number(state.series.count) || 5,
                    ratio: state.ratio,
                    character: refsCount() > 0,
                }),
            });
            let data = null;
            try { data = await resp.json(); } catch { data = null; }
            if (!resp.ok || !data || data.ok === false) {
                throw new Error((data && data.error) || ('HTTP ' + resp.status));
            }
            const list = Array.isArray(data.scenes) ? data.scenes : [];
            if (!list.length) throw new Error('El guion llegó vacío. Inténtalo otra vez.');
            state.series.scenes = list.slice(0, 8).map((item, index) => ({
                n: index + 1,
                titulo: String(item.titulo || item.title || ('Escena ' + (index + 1))).slice(0, 60),
                narracion: String(item.narracion || item.narration || '').slice(0, 400),
                prompt: String(item.prompt || '').slice(0, 1200),
                duracion: Math.max(2, Math.min(12, Number(item.duracion) || 5)),
            }));
            renderSeriesScenes();
            setSeriesNote(`Guion listo: ${state.series.scenes.length} escenas. Revísalas y pulsa «Generar todas».`);
        } catch (err) {
            setSeriesNote('No se pudo crear el guion: ' + err.message, true);
        } finally {
            setSeriesBusy(false);
            hideOverlay();
        }
    }

    /** Descarga el guion y las imágenes del storyboard en JSON. */
    function exportSeriesJson() {
        if (!state.series.scenes.length) {
            setSeriesNote('Crea primero el guion.', true);
            return;
        }
        const jobs = [...state.jobs.values()];
        const payload = {
            app: 'Flow Studio · Hoola',
            tipo: 'storyboard',
            idea: els.seriesIdea ? els.seriesIdea.value.trim() : '',
            ratio: state.ratio,
            modelo: modelById(state.model).display,
            creado: new Date().toISOString(),
            escenas: state.series.scenes.map((scene) => {
                const job = jobs.find((item) => Number(item.scene) === scene.n && item.url);
                return {
                    n: scene.n,
                    titulo: scene.titulo,
                    narracion: scene.narracion,
                    prompt: scene.prompt,
                    duracion: scene.duracion,
                    imagen: job ? job.url : '',
                };
            }),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'serie-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        setSeriesNote(`Guion descargado: ${payload.escenas.length} escenas en JSON.`);
    }

    function clearSeries() {
        if (!state.series.scenes.length) return;
        if (!window.confirm('¿Vaciar las escenas del guion? Las imágenes ya generadas se quedan en el lienzo.')) return;
        state.series.scenes = [];
        renderSeriesScenes();
        setSeriesNote('Guion vacío. Escribe otra idea y crea uno nuevo.');
    }

    /** Genera con un proveedor directo (OpenAI, Gemini o Qwen) a través de api.php. */
    async function generateDirect({ prompt, flowPrompt, refs, editing, model, mask, sourceDataUrl }) {
        setBusy(true);
        showOverlay();
        if (els.loadingText) els.loadingText.textContent = 'IA generando imagen…';
        if (els.loadingSub) els.loadingSub.textContent = `Enviando la solicitud a ${model.display}. No cierres esta pestaña.`;
        setNote(`Generando con ${model.display}…`);

        try {
            const idempotencyKey = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
            const data = await apiCall('job.create', {
                method: 'POST',
                body: {
                    idempotencyKey,
                    kind: editing ? 'edit' : 'generate',
                    model: model.id,
                    prompt: flowPrompt,
                    aspectRatio: state.ratio,
                    resolution: state.resolution,
                    images: refs.slice(0, 8),
                    mask: null,
                    projectId: null,
                    docId: null,
                    docVersion: 0,
                },
            });
            let job = data.job;
            if (!job) throw new Error('El servidor no devolvió el trabajo.');
            if (job.status !== 'succeeded' && job.status !== 'failed') {
                job = await waitDirectJob(job.id);
            }
            if (job.status === 'failed') throw new Error(job.error || 'El proveedor no pudo completar la generación.');
            if (!job.image) throw new Error('El trabajo terminó sin imagen.');

            const url = job.image.startsWith('data:')
                ? job.image
                : `data:${job.mimeType || 'image/png'};base64,${job.image}`;
            // Con máscara, el resultado se recorta al círculo sobre el original.
            let finalUrl = url;
            if (mask && sourceDataUrl) {
                try {
                    finalUrl = await composeMaskedUrl(url, sourceDataUrl, mask);
                } catch (err) {
                    console.warn('[flow-studio] no se pudo aplicar la máscara:', err.message);
                }
            }
            const record = {
                id: job.id,
                prompt,
                flowPrompt,
                ratio: state.ratio,
                resolution: state.resolution,
                model: model.display,
                refs: refs.slice(),
                mode: editing ? 'edit' : 'generate',
                mask: Boolean(mask),
                status: 'running',
                url: '',
                error: '',
            };
            const card = createCard(record, false);
            record.el = card;
            prependInOrder([card]);
            updateStudioCount();
            markDone(record, { url: finalUrl });
            state.jobs.set(record.id, record);
            record.historySave = saveToHistory(record);
            setNote(`Imagen lista con ${model.display}.`);
        } catch (err) {
            setNote('No se pudo generar: ' + err.message, true);
        } finally {
            setBusy(false);
            hideOverlay();
            syncModelControls();
        }
    }

    /** Consulta un trabajo directo hasta que termina. No lo reenvía nunca. */
    async function waitDirectJob(id) {
        const started = Date.now();
        while (Date.now() - started < DIRECT_TIMEOUT_MS) {
            await new Promise((resolve) => setTimeout(resolve, DIRECT_POLL_MS));
            const data = await apiCall('job.get', { query: { id } });
            const job = data.job;
            if (!job) continue;
            if (job.status === 'succeeded' || job.status === 'failed') return job;
            if (els.loadingSub) els.loadingSub.textContent = 'El proveedor sigue trabajando. No cierres esta pestaña.';
        }
        throw new Error('El trabajo sigue pendiente en el servidor y no se ha reenviado. Vuelve a intentarlo en un momento.');
    }

    /** Encola un único vídeo con las opciones de Flow (modelo, formato y fotogramas). */
    async function generateVideo(prompt) {
        if (state.refs[1] && !state.refs[0]) {
            setNote('Para usar un fotograma final añade también el inicial.', true);
            return;
        }
        const frames = state.refs.filter(Boolean).map((ref) => ref.dataUrl);
        const video = videoById(state.videoModel);
        // Solo el coste de Lite está verificado en esta cuenta (10 puntos = 5
        // vídeos con los 50 diarios). Del resto, el importe lo marca Flow.
        const cost = video.id === 'veo-3.1-lite'
            ? 'Veo 3.1 Lite gasta 10 puntos de los 50 diarios: salen 5 vídeos al día.'
            : 'Flow indica el gasto exacto de este modelo antes de generar; todavía no está verificado en esta cuenta.';
        const confirmed = window.confirm(
            `¿Generar 1 vídeo en ${state.ratio} con ${video.label}?\n\n`
            + cost + '\n\nSe genera en tu PC y tarda varios minutos.',
        );
        if (!confirmed) return;

        setBusy(true);
        setNote(frames.length
            ? `Enviando el vídeo con ${frames.length} fotograma${frames.length > 1 ? 's' : ''} a la cola…`
            : 'Enviando el vídeo a la cola…');
        try {
            const data = await post({
                action: 'request',
                type: 'video',
                prompt,
                ratio: state.ratio,
                model: video.id,
                count: 1,
                mode: 'video',
                refs: frames,
            });
            const base = {
                prompt,
                flowPrompt: prompt,
                ratio: state.ratio,
                model: video.label,
                refs: frames.slice(),
                mode: 'video',
                type: 'video',
            };
            const cards = [];
            data.ids.forEach((id) => {
                const job = { id, ...base, status: 'queued', url: '', error: '' };
                const card = createCard(job, false);
                job.el = card;
                state.jobs.set(id, job);
                cards.push(card);
            });
            prependInOrder(cards);
            updateStudioCount();
            persistPending();
            showOverlay();
            startPolling();
        } catch (err) {
            setBusy(false);
            setNote('No se pudo encolar: ' + err.message, true);
            hideOverlay();
        }
    }

    /**
     * «Continuar escena»: toma el último fotograma del clip y lo deja como
     * fotograma inicial del vídeo siguiente (lo que hace Extender en Flow).
     */
    async function extendVideo(job) {
        const record = state.jobs.get(job.id) || job;
        const card = record.el;
        const video = card ? card.querySelector('video') : null;
        if (!video || !video.videoWidth) {
            setNote('El vídeo todavía no está listo para continuar.', true);
            return;
        }
        if (state.busy) return;
        try {
            if (video.readyState < 1) {
                await new Promise((resolve) => {
                    let settled = false;
                    const done = () => {
                        if (settled) return;
                        settled = true;
                        video.removeEventListener('loadedmetadata', done);
                        resolve();
                    };
                    video.addEventListener('loadedmetadata', done);
                    setTimeout(done, 4000);
                });
            }
            // duration - 0.12 s: el último fotograma visible, no el negro final.
            const target = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.12) : 0;
            await new Promise((resolve) => {
                let settled = false;
                const done = () => {
                    if (settled) return;
                    settled = true;
                    video.removeEventListener('seeked', done);
                    resolve();
                };
                video.addEventListener('seeked', done);
                try { video.currentTime = target; } catch { done(); }
                setTimeout(done, 3000);
            });
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            canvas.width = 0;
            canvas.height = 0;
            if (!dataUrl || dataUrl.length < 200) {
                throw new Error('el navegador no pudo leer el fotograma');
            }
            setMode('video');
            refsByMode.video[0] = { dataUrl, name: 'último fotograma' };
            state.refs = refsByMode.video;
            updateRefsUI();
            els.prompt.value = record.prompt || '';
            updateCounter();
            els.prompt.focus();
            setNote('Último fotograma cargado como inicio. Ajusta el prompt y pulsa GENERAR VÍDEO para continuar la escena.');
        } catch (err) {
            setNote('No se pudo tomar el último fotograma: ' + err.message, true);
        }
    }

    /* ------------------------------ eventos ------------------------------ */

    els.prompt.addEventListener('input', updateCounter);

    chipGroup(els.modelChips, 'model', 'model', (v) => v, () => syncModelControls());
    chipGroup(els.ratioChips, 'ratio', 'ratio');
    chipGroup(els.countChips, 'count', 'count', Number);
    if (els.videoModelChips) {
        chipGroup(els.videoModelChips, 'videoModel', 'vmodel', (v) => v, () => {
            const video = videoById(state.videoModel);
            setNote(`${video.label}: se encola en el PC. Los modelos protegidos piden contraseña al elegirlos.`);
        });
    }

    if (els.resolutionSelect) {
        els.resolutionSelect.addEventListener('change', () => {
            const value = Number(els.resolutionSelect.value);
            state.resolution = RESOLUTIONS.includes(value) ? value : 1024;
        });
    }

    // Acceso: misma contraseña (PW_ACCESS) que la compuerta de modelos.
    if (els.btnAccess) els.btnAccess.addEventListener('click', openAccess);
    if (els.accessForm) {
        els.accessForm.addEventListener('submit', (event) => {
            event.preventDefault();
            submitAccess();
        });
    }
    if (els.accessClose) els.accessClose.addEventListener('click', () => closeAccess(true));
    if (els.accessCancel) els.accessCancel.addEventListener('click', () => closeAccess(true));
    if (els.accessLogout) els.accessLogout.addEventListener('click', logoutAccess);
    if (els.accessModal) {
        els.accessModal.addEventListener('click', (event) => {
            if (event.target && event.target.getAttribute && event.target.getAttribute('data-access-close')) {
                closeAccess(true);
            }
        });
        // Foco contenido dentro del modal (WCAG 2.4.3): Tab no se escapa al fondo.
        els.accessModal.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            const focusables = [...els.accessModal.querySelectorAll('button, input, [href], select, textarea')]
                .filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }
    // La compuerta inicia sesión al acertar: se refresca el estado sin recargar.
    document.addEventListener('ag-model-gate:access', () => { void probeAuth(); });

    if (els.modeGenerate) els.modeGenerate.addEventListener('click', () => setMode('generate'));
    if (els.modeEdit) els.modeEdit.addEventListener('click', () => setMode('edit'));
    if (els.modeVideo) els.modeVideo.addEventListener('click', () => setMode('video'));
    if (els.modeSeries) els.modeSeries.addEventListener('click', () => setMode('series'));

    // --- Modo Serie ---------------------------------------------------------
    if (els.btnStoryboard) els.btnStoryboard.addEventListener('click', requestStoryboard);
    if (els.btnSeriesGenerate) els.btnSeriesGenerate.addEventListener('click', generateSeriesAll);
    if (els.btnSeriesExport) els.btnSeriesExport.addEventListener('click', exportSeriesJson);
    if (els.btnSeriesClear) els.btnSeriesClear.addEventListener('click', clearSeries);

    if (els.seriesCountChips) {
        els.seriesCountChips.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip[data-scenes]');
            if (!chip) return;
            state.series.count = Number(chip.dataset.scenes) || 5;
            [...els.seriesCountChips.querySelectorAll('.chip')].forEach((other) => {
                const active = other === chip;
                other.classList.toggle('is-active', active);
                other.setAttribute('aria-pressed', String(active));
            });
        });
    }

    if (els.seriesScenes) {
        els.seriesScenes.addEventListener('input', (event) => {
            const target = event.target;
            if (target && (target.classList.contains('scene-title')
                || target.classList.contains('scene-narration')
                || target.classList.contains('scene-prompt'))) {
                syncSceneInput(target);
            }
        });
        els.seriesScenes.addEventListener('click', (event) => {
            const generateBtn = event.target.closest('.scene-generate');
            if (generateBtn) {
                generateSeriesScene(Number(generateBtn.dataset.scene));
                return;
            }
            const removeBtn = event.target.closest('.scene-remove');
            if (removeBtn) {
                // Se quita del guion sin renumerar: los números identifican la
                // escena en el lienzo y en el JSON exportado.
                const n = Number(removeBtn.dataset.scene);
                state.series.scenes = state.series.scenes.filter((scene) => scene.n !== n);
                renderSeriesScenes();
                setSeriesNote('Escena quitada del guion. Las imágenes ya generadas siguen en el lienzo.');
            }
        });
    }

    if (els.seriesIdea) {
        els.seriesIdea.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (!state.series.busy) requestStoryboard();
            }
        });
    }

    els.btnGenerate.addEventListener('click', generate);
    els.btnImprove.addEventListener('click', improvePrompt);
    if (els.btnVariants) els.btnVariants.addEventListener('click', generateVariants);

    if (els.refQualityChips) {
        els.refQualityChips.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip[data-refside]');
            if (chip) setRefSide(Number(chip.dataset.refside));
        });
    }

    els.btnImproveClose.addEventListener('click', () => {
        els.improvePanel.classList.add('hidden');
    });

    els.btnRestorePrompt.addEventListener('click', () => {
        if (!state.originalPrompt) return;
        els.prompt.value = state.originalPrompt;
        updateCounter();
        setNote('Idea original recuperada.');
    });

    if (els.refInput && els.refSlots.length) {
        els.refInput.addEventListener('change', () => {
            const file = els.refInput.files && els.refInput.files[0];
            if (file) addRefFile(file, refTarget);
        });

        els.refSlots.forEach((slot, index) => {
            const pick = slot.querySelector('.ref-pick');
            const remove = slot.querySelector('.ref-remove');
            if (pick) pick.addEventListener('click', () => openRefPicker(index));
            ['dragenter', 'dragover'].forEach((type) => {
                slot.addEventListener(type, (event) => {
                    event.preventDefault();
                    slot.classList.add('is-drop');
                });
            });
            ['dragleave', 'dragend', 'drop'].forEach((type) => {
                slot.addEventListener(type, () => slot.classList.remove('is-drop'));
            });
            slot.addEventListener('drop', (event) => {
                event.preventDefault();
                const files = event.dataTransfer ? event.dataTransfer.files : null;
                if (files && files[0]) addRefFile(files[0], index);
            });
            if (remove) {
                remove.addEventListener('click', () => {
                    state.refs[index] = null;
                    updateRefsUI();
                });
            }
        });
    }

    if (els.sourcePick && els.sourceInput) {
        els.sourcePick.addEventListener('click', () => {
            if (els.sourcePick.disabled) return;
            els.sourceInput.value = '';
            els.sourceInput.click();
        });
        els.sourceInput.addEventListener('change', () => {
            const file = els.sourceInput.files && els.sourceInput.files[0];
            if (file) addSource(file);
        });
        const slot = els.sourceSlot;
        if (slot) {
            ['dragenter', 'dragover'].forEach((type) => {
                slot.addEventListener(type, (event) => {
                    event.preventDefault();
                    slot.classList.add('is-drop');
                });
            });
            ['dragleave', 'dragend', 'drop'].forEach((type) => {
                slot.addEventListener(type, () => slot.classList.remove('is-drop'));
            });
            slot.addEventListener('drop', (event) => {
                event.preventDefault();
                const files = event.dataTransfer ? event.dataTransfer.files : null;
                if (files && files[0]) addSource(files[0]);
            });
        }
        if (els.sourceRemove) {
            els.sourceRemove.addEventListener('click', (event) => {
                event.stopPropagation();
                clearSource();
            });
        }
    }

    if (els.sourceUpscale) {
        els.sourceUpscale.addEventListener('click', (event) => {
            const button = event.target.closest('[data-factor]');
            if (!button || !state.source) return;
            runUpscale(
                { url: state.source.dataUrl, prompt: els.prompt.value.trim() || 'Imagen escalada' },
                Number(button.dataset.factor),
            );
        });
    }

    // Máscara circular: abrir, ajustar con el deslizador, arrastrar y aplicar.
    if (els.btnMaskEdit) els.btnMaskEdit.addEventListener('click', openMaskModal);
    if (els.btnMaskClear) els.btnMaskClear.addEventListener('click', clearMask);
    if (els.maskApply) els.maskApply.addEventListener('click', applyMaskDraft);
    if (els.maskCancel) els.maskCancel.addEventListener('click', closeMaskModal);
    if (els.maskClose) els.maskClose.addEventListener('click', closeMaskModal);
    if (els.maskSize) els.maskSize.addEventListener('input', setMaskSizeFromSlider);
    if (els.maskToolCircle) els.maskToolCircle.addEventListener('click', () => setMaskTool('circle'));
    if (els.maskToolBrush) els.maskToolBrush.addEventListener('click', () => setMaskTool('brush'));
    if (els.maskUndo) els.maskUndo.addEventListener('click', undoBrushStroke);
    if (els.maskResetBrush) els.maskResetBrush.addEventListener('click', resetBrushStrokes);
    if (els.maskZoomIn) els.maskZoomIn.addEventListener('click', () => zoomMaskBy(1.25));
    if (els.maskZoomOut) els.maskZoomOut.addEventListener('click', () => zoomMaskBy(0.8));
    if (els.maskZoomReset) els.maskZoomReset.addEventListener('click', resetMaskView);
    if (els.maskStage) els.maskStage.addEventListener('wheel', onMaskWheel, { passive: false });
    if (els.maskCanvas) els.maskCanvas.addEventListener('pointerleave', hideBrushCursor);

    // Zoom y desplazamiento por teclado mientras el diálogo está abierto.
    document.addEventListener('keydown', (event) => {
        if (!els.maskDialog || !els.maskDialog.open) return;
        if (event.code === 'Space') {
            maskPan.space = true;
            if (els.maskCanvas) els.maskCanvas.classList.add('is-pan');
            event.preventDefault();
            return;
        }
        if (event.key === '+' || event.key === '=') {
            zoomMaskBy(1.25);
            event.preventDefault();
        } else if (event.key === '-') {
            zoomMaskBy(0.8);
            event.preventDefault();
        } else if (event.key === '0') {
            resetMaskView();
            event.preventDefault();
        }
    });
    document.addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
            maskPan.space = false;
            if (els.maskCanvas) els.maskCanvas.classList.remove('is-pan');
        }
    });
    if (els.maskCanvas) {
        els.maskCanvas.addEventListener('pointerdown', maskPointerDown);
        els.maskCanvas.addEventListener('pointermove', maskPointerMove);
        els.maskCanvas.addEventListener('pointerup', maskPointerUp);
        els.maskCanvas.addEventListener('pointercancel', maskPointerUp);
    }
    if (els.maskDialog) {
        // Clic en el fondo (el propio <dialog>) cierra; dentro de la tarjeta, no.
        els.maskDialog.addEventListener('click', (event) => {
            if (event.target === els.maskDialog) closeMaskModal();
        });
        // Escape del diálogo nativo: se cierra de forma controlada.
        els.maskDialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            closeMaskModal();
        });
    }
    window.addEventListener('resize', () => {
        if (els.maskDialog && els.maskDialog.open) drawMaskOverlay();
    });

    els.prompt.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!state.busy) generate();
        }
    });

    els.grid.addEventListener('click', (event) => {
        const example = event.target.closest('.example');
        if (example) {
            els.prompt.value = example.dataset.example;
            updateCounter();
            els.prompt.focus();
        }
    });

    els.btnClear.addEventListener('click', () => {
        state.jobs.clear();
        localStorage.removeItem(PENDING_KEY);
        stopPolling();
        setBusy(false);
        [...els.grid.querySelectorAll('.card')].forEach((c) => c.remove());
        updateStudioCount();
        setNote('Lienzo limpio. El historial se conserva.');
    });

    els.btnHistory.addEventListener('click', () => {
        const open = els.historyPanel.classList.contains('is-open');
        open ? closeHistory() : openHistory();
    });
    els.btnHistoryClose.addEventListener('click', closeHistory);

    els.historyList.addEventListener('click', (event) => {
        const btn = event.target.closest('.history-delete');
        if (!btn) return;
        deleteHistoryItem(btn.dataset.id);
    });

    els.lightbox.addEventListener('click', (event) => {
        if (event.target === els.lightbox || event.target === els.lightboxImg) closeLightbox();
    });
    els.lightboxClose.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (els.maskDialog && els.maskDialog.open) closeMaskModal();
            else if (els.accessModal && !els.accessModal.classList.contains('hidden')) closeAccess(true);
            else if (state.upscaleMenu) closeUpscaleMenu();
            else if (!els.lightbox.classList.contains('hidden')) closeLightbox();
            else if (els.historyPanel.classList.contains('is-open')) closeHistory();
        }
    });

    els.btnHideOverlay.addEventListener('click', hideOverlay);

    /* ------------------------------ arranque ------------------------------ */

    function restorePending() {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        } catch { list = []; }
        if (!Array.isArray(list) || !list.length) return;
        const cards = [];
        list.forEach((item) => {
            if (!item || !item.id) return;
            const job = {
                id: item.id,
                type: item.type === 'video' ? 'video' : 'image',
                prompt: item.prompt || '',
                ratio: item.ratio || '1:1',
                model: item.model || (item.type === 'video' ? 'Veo 3.1 Lite' : 'Flow · Nano Banana 2'),
                mode: item.mode === 'edit' ? 'edit' : (item.mode === 'video' ? 'video' : 'generate'),
                refCount: Number(item.refCount) || 0,
                status: 'queued',
                url: '',
                error: '',
            };
            const card = createCard(job, false);
            job.el = card;
            state.jobs.set(job.id, job);
            cards.push(card);
        });
        if (cards.length) {
            prependInOrder(cards);
            updateStudioCount();
            setBusy(true);
            showOverlay();
            startPolling();
        }
    }

    async function boot() {
        // La compuerta se comprueba antes que nada: si la sesión no es válida,
        // los modelos protegidos se bloquean en cuanto responde el servidor, sin
        // esperar a que terminen de cargar historial y proyectos.
        void probeAuth().then((authed) => { if (!authed) lockModelGate(); });
        try {
            const saved = Number(localStorage.getItem(REF_SIDE_KEY));
            if (saved === REF_SIDES.maxima) state.refSide = REF_SIDES.maxima;
        } catch { /* sin almacenamiento */ }
        updateRefQualityUI();
        updateCounter();
        updateStudioCount();
        updateRefsUI();
        updateRefQualityUI();
        updateSourceUI();
        updateMaskUI();
        updateComposerCopy();
        updateSeriesUI();
        setAccessButton();
        syncModelControls();
        await initHistory();
        paintRecentHistory();
        restorePending();
        pingWorker();
        state.pingTimer = setInterval(pingWorker, 30000);
        // El estado de la sesión se consulta sin bloquear el arranque: Flow
        // funciona aunque el servidor de modelos directos no responda.
        setNote('Listo. Flow se genera gratis en tu PC; los modelos directos necesitan la contraseña de acceso.');
    }

    boot();
})();
