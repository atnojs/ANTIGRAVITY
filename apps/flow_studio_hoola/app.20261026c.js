/* ============================================================
   Flow Studio — cliente de la cola de Google Flow
   ============================================================ */
(() => {
    'use strict';

    const API = 'flow_queue.php';
    const AI = 'proxy.php';
    const PENDING_KEY = 'flowStudioPending';
    const POLL_MS = 2500;
    const HISTORY_ON_CANVAS = 8;
    // Referencias: como máximo 2. El navegador las reescala a 1280 px para que
    // la petición a la cola no se dispare y Flow reciba un JPEG ligero.
    const REF_MAX_FILES = 2;
    const REF_MAX_SIDE = 1280;
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
        btnImprove: $('#btnImprove'),
        btnImproveLabel: $('#btnImproveLabel'),
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
        emptyTitle: $('#emptyTitle'),
        emptyText: $('#emptyText'),
        emptyExamples: $('#emptyExamples'),
    };

    const state = {
        mode: 'generate',       // 'generate' | 'edit'
        model: 'Nano Banana 2',
        ratio: '1:1',
        count: 1,
        busy: false,
        improveBusy: false,
        upscaleBusy: false,
        originalPrompt: '',
        source: null,       // imagen que se edita: { dataUrl, name, width, height }
        refs: [null, null],  // 0..2 referencias: { dataUrl, name }
        jobs: new Map(),   // id -> { id, prompt, ratio, model, status, url, error, el }
        pollTimer: null,
        pingTimer: null,
        workerOnline: null,
        upscaleMenu: null,
    };

    const SVG = {
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
        repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m13.5 6.5 3 3"/></svg>',
        upscale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 15v5h-5"/><path d="M4 4l6 6"/><path d="M20 20l-6-6"/></svg>',
    };

    // El icono del botón principal cambia según el modo (mismo <svg id="btnIcon">).
    const BTN_ICON = {
        generate: '<path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5"/><circle cx="12" cy="12" r="3.4"/>',
        edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m13.5 6.5 3 3"/>',
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
            chip.classList.toggle('is-active', chip.dataset.ratio === value);
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
            <button type="button" class="icon-btn" data-act="edit" aria-label="Editar esta imagen">${SVG.edit}</button>
            <button type="button" class="icon-btn" data-act="upscale" aria-label="Escalar esta imagen">${SVG.upscale}</button>
            <button type="button" class="icon-btn" data-act="download" aria-label="Descargar imagen">${SVG.download}</button>
            <button type="button" class="icon-btn" data-act="repeat" aria-label="Usar este prompt otra vez">${SVG.repeat}</button>
            <button type="button" class="icon-btn" data-act="copy" aria-label="Copiar el prompt">${SVG.copy}</button>
            <button type="button" class="icon-btn" data-act="delete" aria-label="Eliminar imagen">${SVG.trash}</button>`;
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
        if (job.mode === 'edit') tags.push('Edición');
        if (job.extraMeta) tags.push(job.extraMeta);
        meta.innerHTML = `<span>${escapeHtml(job.ratio)}</span>${job.model ? `<span>${escapeHtml(job.model)}</span>` : ''}`
            + (refCount ? `<span>${refCount} referencia${refCount > 1 ? 's' : ''}</span>` : '')
            + tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');

        if (refUrls.length) {
            const strip = document.createElement('div');
            strip.className = 'card-refs';
            strip.title = 'Referencias usadas para esta imagen';
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

        card.append(media, body);

        actions.addEventListener('click', async (event) => {
            const btn = event.target.closest('[data-act]');
            if (!btn) return;
            const record = state.jobs.get(job.id) || job;
            if (btn.dataset.act === 'edit') await editFromCard(record);
            if (btn.dataset.act === 'upscale') {
                event.stopPropagation();
                toggleUpscaleMenu(record, btn);
            }
            if (btn.dataset.act === 'download') await downloadImage(record);
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
        const question = prompt
            ? `¿Eliminar esta imagen?\n\n"${prompt}"\n\nSe borra también del historial y del servidor. No se puede deshacer.`
            : '¿Eliminar esta imagen?\n\nSe borra también del historial y del servidor. No se puede deshacer.';
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
        setNote('Imagen eliminada.');
    }

    /* ------------------------------ imágenes ------------------------------ */

    async function downloadImage(job) {
        try {
            let href = job.url;
            let objectUrl = '';
            let ext = 'jpg';
            if (href.startsWith('data:')) {
                const match = /^data:image\/([a-z0-9]+)[;,]/i.exec(href);
                if (match) ext = match[1].toLowerCase().replace('jpeg', 'jpg');
            } else {
                const resp = await fetch(href, { cache: 'force-cache' });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
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

        ids.forEach((id) => {
            const job = state.jobs.get(id);
            if (!job) return;
            const info = data.jobs ? data.jobs[id] : null;
            if (!info) return;
            if (info.status === 'done' && job.status !== 'done') {
                markDone(job, info);
                job.historySave = saveToHistory(job);
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
        els.btnLabel.textContent = busy ? 'PROCESANDO…' : COPY[state.mode].action;
        els.btnIcon.classList.toggle('spin-icon', busy);
        [els.modeGenerate, els.modeEdit, els.sourcePick, els.sourceRemove].forEach((el) => {
            if (el) el.disabled = busy;
        });
    }

    function showOverlay() {
        els.loadingOverlay.classList.remove('hidden');
        if (state.mode === 'edit') {
            els.loadingText.textContent = 'Editando tu imagen…';
            els.loadingSub.textContent = 'Flow aplica los cambios sobre la imagen que subiste. Suele tardar entre 30 y 90 segundos.';
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
                body: JSON.stringify({ action: 'improve', prompt, ratio: state.ratio, mode: editing ? 'edit' : 'generate' }),
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
        els.refSlots.forEach((slot, index) => {
            const ref = state.refs[index];
            const img = slot.querySelector('.ref-thumb');
            const remove = slot.querySelector('.ref-remove');
            const empty = slot.querySelector('.ref-empty');
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
                    ? `Referencia ${index + 1} cargada. Pulsa para cambiarla.`
                    : `Añadir imagen de referencia ${index + 1}`);
            }
        });
        const count = refsCount();
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
        const prepared = await prepareImage(file, REF_MAX_SIDE, 0.86);
        return prepared.dataUrl;
    }

    async function addRefFile(file, index) {
        if (!file || index < 0 || index >= REF_MAX_FILES) return;
        setRefsNote('Preparando la imagen…');
        try {
            const dataUrl = await prepareRef(file);
            state.refs[index] = { dataUrl, name: file.name || '' };
            updateRefsUI();
        } catch (err) {
            setRefsNote(err.message, true);
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
            sub: 'Añade hasta 2 imágenes de referencia. Se genera en tu PC con Google Flow, sin claves y sin coste por imagen.',
            placeholder: 'Ej.: Portaaviones nuclear navegando al atardecer, cazas aparcados en cubierta, estela de espuma, fotografía militar realista',
            refsLegend: 'Referencias',
            refsHint: 'opcional · hasta 2',
            emptyTitle: 'Tu lienzo está vacío',
            emptyText: 'Escribe un prompt a la izquierda y pulsa Generar. La imagen se crea con tu cuenta de Flow en el PC y aparece aquí en un par de minutos.',
            improve: 'Mejorar con IA',
            improveHint: '4 prompts',
            action: 'GENERAR',
        },
        edit: {
            title: 'Edita o escala tu imagen',
            sub: 'Sube la imagen, describe los cambios y añade una referencia si quieres. También puedes escalarla 2×, 4× u 8× sin pasar por Flow.',
            placeholder: 'Ej.: Cambia el cielo por un atardecer cálido, enciende las luces de la casa y mantén la composición y el resto de detalles',
            refsLegend: 'Referencia de estilo',
            refsHint: 'opcional · 1',
            emptyTitle: 'Sube una imagen para editarla',
            emptyText: 'Pulsa «Editar» arriba, elige la imagen que quieres cambiar y describe qué debe cambiar. También puedes escalarla 2×, 4× u 8× sin gastar Flow.',
            improve: 'Mejorar instrucción',
            improveHint: '4 instrucciones',
            action: 'EDITAR IMAGEN',
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
        els.emptyExamples.hidden = state.mode === 'edit';
        els.btnLabel.textContent = copy.action;
        els.btnIcon.innerHTML = BTN_ICON[state.mode === 'edit' ? 'edit' : 'generate'];
        els.btnImproveLabel.textContent = copy.improve;
        if (!state.improveBusy) {
            els.improveHint.textContent = copy.improveHint;
        }
    }

    function setMode(mode) {
        if (state.busy || state.improveBusy) return;
        state.mode = mode === 'edit' ? 'edit' : 'generate';
        const editing = state.mode === 'edit';
        if (els.modeGenerate) {
            els.modeGenerate.classList.toggle('is-active', !editing);
            els.modeGenerate.setAttribute('aria-pressed', String(!editing));
        }
        if (els.modeEdit) {
            els.modeEdit.classList.toggle('is-active', editing);
            els.modeEdit.setAttribute('aria-pressed', String(editing));
        }
        document.body.classList.toggle('is-editing', editing);
        els.sourceControl.hidden = !editing;
        els.countControl.hidden = editing;
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
        setNote(editing
            ? (state.source ? 'Describe los cambios o escala la imagen.' : 'Sube la imagen que quieres editar.')
            : 'Listo. Tus imágenes se generan gratis con Flow en este PC.');
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
    }

    async function addSource(file) {
        if (!file) return;
        setSourceNote('Preparando la imagen…');
        try {
            const prepared = await prepareImage(file, SOURCE_MAX_SIDE, SOURCE_QUALITY);
            state.source = { ...prepared, name: file.name || '' };
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
        updateSourceUI();
        setNote('Imagen quitada.');
    }

    async function editFromCard(job) {
        if (state.busy || !job || !job.url) return;
        try {
            const blob = await blobFromUrl(job.url);
            const prepared = await prepareImage(blob, SOURCE_MAX_SIDE, SOURCE_QUALITY);
            state.source = { ...prepared, name: 'imagen-de-la-tarjeta.jpg' };
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

    async function generate() {
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
        const refs = editing
            ? [state.source.dataUrl, ...state.refs.filter(Boolean).slice(0, 1).map((ref) => ref.dataUrl)]
            : refsPayload();
        const flowPrompt = editing ? editInstruction(prompt, refs.length > 1) : prompt;
        const count = editing ? 1 : state.count;
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
                model: state.model,
                refs: refs.slice(),
                mode: editing ? 'edit' : 'generate',
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

    /* ------------------------------ eventos ------------------------------ */

    els.prompt.addEventListener('input', updateCounter);

    chipGroup(els.modelChips, 'model', 'model');
    chipGroup(els.ratioChips, 'ratio', 'ratio');
    chipGroup(els.countChips, 'count', 'count', Number);

    if (els.modeGenerate && els.modeEdit) {
        els.modeGenerate.addEventListener('click', () => setMode('generate'));
        els.modeEdit.addEventListener('click', () => setMode('edit'));
    }

    els.btnGenerate.addEventListener('click', generate);
    els.btnImprove.addEventListener('click', improvePrompt);

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
            if (state.upscaleMenu) closeUpscaleMenu();
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
                prompt: item.prompt || '',
                ratio: item.ratio || '1:1',
                model: item.model || 'Nano Banana 2',
                mode: item.mode === 'edit' ? 'edit' : 'generate',
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
        updateCounter();
        updateStudioCount();
        updateRefsUI();
        updateSourceUI();
        updateComposerCopy();
        await initHistory();
        paintRecentHistory();
        restorePending();
        pingWorker();
        state.pingTimer = setInterval(pingWorker, 30000);
        setNote('Listo. Tus imágenes se generan gratis con Flow en este PC.');
    }

    boot();
})();
