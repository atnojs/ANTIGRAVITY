/* ============================================================
   Flow Studio — cliente de la cola de Google Flow
   ============================================================ */
(() => {
    'use strict';

    const API = 'flow_queue.php';
    const PENDING_KEY = 'flowStudioPending';
    const POLL_MS = 2500;

    const $ = (sel) => document.querySelector(sel);

    const els = {
        prompt: $('#prompt'),
        charCount: $('#charCount'),
        modelChips: $('#modelChips'),
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
        historyPanel: $('#historyPanel'),
        btnHistoryClose: $('#btnHistoryClose'),
        historyList: $('#historyList'),
        lightbox: $('#lightbox'),
        lightboxImg: $('#lightboxImg'),
        lightboxCaption: $('#lightboxCaption'),
        lightboxClose: $('#lightboxClose'),
        loadingOverlay: $('#loadingOverlay'),
        loadingText: $('#loadingText'),
        loadingSub: $('#loadingSub'),
        btnHideOverlay: $('#btnHideOverlay'),
    };

    const state = {
        model: 'Nano Banana 2',
        ratio: '1:1',
        count: 1,
        busy: false,
        jobs: new Map(),   // id -> { id, prompt, ratio, model, status, url, error, el }
        pollTimer: null,
        pingTimer: null,
        workerOnline: null,
    };

    const SVG = {
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
        repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>',
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
        els.studioCount.textContent = total === 1 ? '1 imagen' : `${total} imágenes`;
        els.emptyState.style.display = total === 0 ? '' : 'none';
    }

    function chipGroup(container, key, attr, cast = (v) => v) {
        container.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip');
            if (!chip || !container.contains(chip)) return;
            container.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            state[key] = cast(chip.dataset[attr]);
        });
    }

    /* ------------------------------ tarjetas ------------------------------ */

    function createCard(job) {
        const card = document.createElement('article');
        card.className = 'card is-waiting';
        card.dataset.id = job.id;
        card.dataset.ratio = job.ratio;

        const media = document.createElement('div');
        media.className = 'card-media';

        const wait = document.createElement('div');
        wait.className = 'card-wait';
        wait.innerHTML = '<span class="mini-spinner" aria-hidden="true"></span><span>En cola…</span>';
        media.appendChild(wait);

        const actions = document.createElement('div');
        actions.className = 'card-actions';
        actions.hidden = true;
        actions.innerHTML = `
            <button type="button" class="icon-btn" data-act="download" aria-label="Descargar imagen">${SVG.download}</button>
            <button type="button" class="icon-btn" data-act="repeat" aria-label="Reutilizar prompt">${SVG.repeat}</button>
            <button type="button" class="icon-btn" data-act="expand" aria-label="Ampliar imagen">${SVG.expand}</button>`;
        media.appendChild(actions);

        const body = document.createElement('div');
        body.className = 'card-body';
        const p = document.createElement('p');
        p.className = 'card-prompt';
        p.textContent = job.prompt;
        const meta = document.createElement('div');
        meta.className = 'card-meta';
        meta.innerHTML = `<span>${job.ratio}</span><span>${job.model}</span>`;
        body.append(p, meta);

        card.append(media, body);

        actions.addEventListener('click', async (event) => {
            const btn = event.target.closest('[data-act]');
            if (!btn) return;
            const record = state.jobs.get(job.id);
            if (!record) return;
            if (btn.dataset.act === 'download') await downloadImage(record);
            if (btn.dataset.act === 'repeat') {
                els.prompt.value = record.prompt;
                updateCounter();
                els.prompt.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (btn.dataset.act === 'expand') openLightbox(record.url, record.prompt);
        });

        els.grid.appendChild(card);
        updateStudioCount();
        return card;
    }

    function markRunning(job, index) {
        const card = job.el;
        if (!card) return;
        const label = card.querySelector('.card-wait span:last-child');
        if (label) label.textContent = index ? `Generando (${index})…` : 'Generando…';
    }

    function markDone(job, data) {
        const card = job.el;
        if (!card) return;
        const media = card.querySelector('.card-media');
        const wait = card.querySelector('.card-wait');
        if (wait) wait.remove();
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = job.prompt.slice(0, 140);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('click', () => openLightbox(data.url, job.prompt));
        media.insertBefore(img, media.firstChild);
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

    /* ------------------------------ imágenes ------------------------------ */

    async function downloadImage(job) {
        try {
            const resp = await fetch(job.url, { cache: 'force-cache' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const blob = await resp.blob();
            const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flow-studio-${job.id.slice(0, 8)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            setNote('Imagen descargada.');
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
        els.btnHistory.setAttribute('aria-expanded', 'true');
        renderHistory();
    }

    function closeHistory() {
        els.historyPanel.classList.remove('is-open');
        els.historyPanel.setAttribute('aria-hidden', 'true');
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
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'history-item';
            row.style.textAlign = 'left';
            row.style.background = 'none';
            row.style.font = 'inherit';
            row.style.color = 'inherit';
            row.innerHTML = `
                <img src="${url}" alt="" loading="lazy">
                <div>
                    <p>${escapeHtml(data.prompt || 'Sin prompt')}</p>
                    <time>${formatDate(item.createdAt)}</time>
                </div>`;
            row.addEventListener('click', () => {
                if (!url) return;
                openLightbox(url, data.prompt || '');
                closeHistory();
            });
            els.historyList.appendChild(row);
        });
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    async function saveToHistory(job) {
        if (!history) return;
        try {
            const resp = await fetch(job.url, { cache: 'force-cache' });
            const blob = await resp.blob();
            const dataUrl = await blobToDataUrl(blob);
            await history.save({
                type: 'image',
                model: job.model,
                data: { prompt: job.prompt, ratio: job.ratio },
                imageData: dataUrl,
            });
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
        return Array.from(state.jobs.keys());
    }

    function persistPending() {
        const list = Array.from(state.jobs.values())
            .filter((j) => j.status === 'queued' || j.status === 'running')
            .map((j) => ({ id: j.id, prompt: j.prompt, ratio: j.ratio, model: j.model }));
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

        ids.forEach((id) => {
            const job = state.jobs.get(id);
            if (!job) return;
            const info = data.jobs ? data.jobs[id] : null;
            if (!info) return;
            if (info.status === 'done' && job.status !== 'done') {
                markDone(job, info);
                saveToHistory(job);
            } else if (info.status === 'error' && job.status !== 'error') {
                markError(job, info.error);
                job.status = 'error';
            } else if (info.status === 'running' && job.status !== 'running') {
                job.status = 'running';
                markRunning(job, 0);
            }
            if (job.status === 'done') done++;
            else if (job.status === 'error') failed++;
            else if (job.status === 'running') running++;
            else pending++;
        });

        const total = ids.length;
        const ready = done + failed;
        els.loadingText.textContent = ready >= total
            ? (failed ? 'Terminado con avisos' : 'Imágenes listas')
            : `Generando ${ready} de ${total}…`;
        els.loadingSub.textContent = running
            ? 'Flow está trabajando en tu PC. Suele tardar entre 30 y 90 segundos por imagen.'
            : 'En cola: el worker de tu PC las tomará en cuanto pueda.';

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
            const msg = failed
                ? `${done} imágenes listas, ${failed} con error.`
                : (done === 1 ? 'Imagen lista.' : `${done} imágenes listas.`);
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
        els.btnLabel.textContent = busy ? 'PROCESANDO…' : 'GENERAR';
        els.btnIcon.classList.toggle('spin-icon', busy);
    }

    function showOverlay() {
        els.loadingOverlay.classList.remove('hidden');
        els.loadingText.textContent = 'IA generando obra maestra…';
        els.loadingSub.textContent = 'Flow está trabajando en tu PC. Puedes seguir en segundo plano.';
    }

    function hideOverlay() {
        els.loadingOverlay.classList.add('hidden');
    }

    /* ------------------------------ generar ------------------------------ */

    async function generate() {
        const prompt = els.prompt.value.trim();
        if (!prompt) {
            setNote('Escribe primero qué quieres generar.', true);
            els.prompt.focus();
            return;
        }
        setBusy(true);
        setNote('Enviando a la cola…');

        try {
            const data = await post({
                action: 'request',
                prompt,
                ratio: state.ratio,
                model: state.model,
                count: state.count,
            });
            const base = { prompt, ratio: state.ratio, model: state.model };
            data.ids.forEach((id) => {
                const job = { id, ...base, status: 'queued', url: '', error: '' };
                job.el = createCard(job);
                state.jobs.set(id, job);
            });
            persistPending();
            showOverlay();
            startPolling();
        } catch (err) {
            setBusy(false);
            setNote('No se pudo encolar: ' + err.message, true);
            hideOverlay();
        }
    }

    /* ------------------------------ eventos ------------------------------ */

    els.prompt.addEventListener('input', updateCounter);

    chipGroup(els.modelChips, 'model', 'model');
    chipGroup(els.ratioChips, 'ratio', 'ratio');
    chipGroup(els.countChips, 'count', 'count', Number);

    els.btnGenerate.addEventListener('click', generate);

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

    els.lightbox.addEventListener('click', (event) => {
        if (event.target === els.lightbox || event.target === els.lightboxImg) closeLightbox();
    });
    els.lightboxClose.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (!els.lightbox.classList.contains('hidden')) closeLightbox();
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
        list.forEach((item) => {
            if (!item || !item.id) return;
            const job = {
                id: item.id,
                prompt: item.prompt || '',
                ratio: item.ratio || '1:1',
                model: item.model || 'Nano Banana 2',
                status: 'queued',
                url: '',
                error: '',
            };
            job.el = createCard(job);
            state.jobs.set(job.id, job);
        });
        if (state.jobs.size) {
            setBusy(true);
            showOverlay();
            startPolling();
        }
    }

    async function boot() {
        updateCounter();
        updateStudioCount();
        restorePending();
        pingWorker();
        state.pingTimer = setInterval(pingWorker, 30000);
        await initHistory();
        setNote('Listo. Tus imágenes se generan gratis con Flow en este PC.');
    }

    boot();
})();
