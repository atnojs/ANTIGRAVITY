(function () {
    'use strict';

    const STORAGE_KEY = 'codigosImagenData';
    const LOCAL_PASSWORD_FALLBACK = '0';
    const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80';
    let state = { models: [] };
    let activeModelId = '';
    let isEditable = false;
    let adminPassword = '';
    let temporaryImageData = '';
    let toastTimer = null;
    let root;
    let refs = {};

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        createInterface();
        bindEvents();
        await loadState();
        render();
    }

    function createInterface() {
        root = document.createElement('div');
        root.id = 'compact-app';
        root.innerHTML = `
            <header class="compact-header">
                <button class="compact-title" id="compact-title" type="button" aria-label="Volver a los modelos">GALERÍA DE CÓDIGOS POR MODELO</button>
            </header>
            <div class="compact-edit-toolbar" id="compact-edit-toolbar" hidden>
                <button class="toolbar-button" id="compact-add-model" type="button">＋ Añadir modelo</button>
                <button class="toolbar-button" id="compact-add-prompt" type="button">＋ Añadir código</button>
                <span class="toolbar-label">Modo edición</span>
            </div>
            <section class="models-view" id="compact-models-view"><div class="compact-grid" id="compact-model-grid"></div></section>
            <section class="prompts-view" id="compact-prompts-view" hidden><div class="compact-grid prompt-grid" id="compact-prompt-grid"></div></section>
            <button id="compact-edit-mode-btn" type="button" aria-label="Activar modo edición">Editar galería</button>
            <div class="modal-overlay" id="compact-password-modal" hidden>
                <section class="modal-card modal-small" role="dialog" aria-modal="true" aria-labelledby="compact-password-title">
                    <button class="modal-close" data-close="compact-password-modal" type="button" aria-label="Cerrar">×</button>
                    <div class="modal-symbol">⌑</div><h2 id="compact-password-title">Modo administrador</h2>
                    <p class="modal-copy">Introduce la contraseña para editar la galería.</p>
                    <form id="compact-password-form"><label for="compact-admin-password">Contraseña</label><input id="compact-admin-password" type="password" autocomplete="current-password" required><p class="form-error" id="compact-password-error" role="alert" hidden></p><div class="modal-buttons"><button class="modal-button cancel" data-close="compact-password-modal" type="button">Cancelar</button><button class="modal-button save" type="submit">Entrar</button></div></form>
                </section>
            </div>
            <div class="modal-overlay" id="compact-model-modal" hidden>
                <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="compact-model-title">
                    <button class="modal-close" data-close="compact-model-modal" type="button" aria-label="Cerrar">×</button>
                    <p class="modal-kicker">Carpeta de modelo</p><h2 id="compact-model-title">Añadir modelo</h2>
                    <form id="compact-model-form"><input id="compact-model-id" type="hidden"><label for="compact-model-name">Nombre del modelo</label><input id="compact-model-name" type="text" maxlength="40" placeholder="Ej. ChatGPT" required><label for="compact-model-icon">Icono</label><input id="compact-model-icon" type="text" maxlength="3" placeholder="✦"><label for="compact-model-description">Descripción <span>(opcional)</span></label><input id="compact-model-description" type="text" maxlength="80" placeholder="Código para este modelo"><div class="modal-buttons"><button class="modal-button cancel" data-close="compact-model-modal" type="button">Cancelar</button><button class="modal-button save" type="submit">Guardar</button></div></form>
                </section>
            </div>
            <div class="modal-overlay" id="compact-prompt-modal" hidden>
                <section class="modal-card modal-large" role="dialog" aria-modal="true" aria-labelledby="compact-prompt-title">
                    <button class="modal-close" data-close="compact-prompt-modal" type="button" aria-label="Cerrar">×</button>
                    <p class="modal-kicker" id="compact-prompt-kicker">Código de generación</p><h2 id="compact-prompt-title">Añadir código</h2>
                    <form id="compact-prompt-form"><input id="compact-prompt-id" type="hidden"><input id="compact-prompt-model-id" type="hidden"><label for="compact-prompt-name">Nombre del código</label><input id="compact-prompt-name" type="text" maxlength="70" placeholder="Ej. Retrato editorial" required><label for="compact-prompt-image-url">URL de la imagen <span>(opcional)</span></label><input id="compact-prompt-image-url" type="url" placeholder="https://…"><div class="upload-row"><label class="upload-button" for="compact-prompt-file">↑ Seleccionar imagen</label><input id="compact-prompt-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span id="compact-file-name">Ninguna imagen seleccionada</span></div><div class="image-preview" id="compact-preview-wrap" hidden><img id="compact-preview" src="" alt="Vista previa"><button id="compact-remove-preview" type="button">Quitar imagen</button></div><label for="compact-prompt-text">Código / prompt</label><textarea id="compact-prompt-text" rows="10" placeholder="Pega aquí el código completo…" required></textarea><div class="modal-buttons"><button class="modal-button cancel" data-close="compact-prompt-modal" type="button">Cancelar</button><button class="modal-button save" type="submit">Guardar</button></div></form>
                </section>
            </div>
            <div class="modal-overlay image-modal" id="compact-image-viewer" hidden><section class="viewer-card" role="dialog" aria-modal="true" aria-label="Imagen ampliada"><button class="modal-close" data-close="compact-image-viewer" type="button" aria-label="Cerrar">×</button><img id="compact-viewer-image" src="" alt=""><p id="compact-viewer-caption"></p></section></div>
            <div class="toast" id="compact-toast" role="status" aria-live="polite"></div>`;
        document.body.appendChild(root);
        refs = {
            title: root.querySelector('#compact-title'), modelsView: root.querySelector('#compact-models-view'), promptsView: root.querySelector('#compact-prompts-view'), modelGrid: root.querySelector('#compact-model-grid'), promptGrid: root.querySelector('#compact-prompt-grid'), editButton: root.querySelector('#compact-edit-mode-btn'), editToolbar: root.querySelector('#compact-edit-toolbar'), addModel: root.querySelector('#compact-add-model'), addPrompt: root.querySelector('#compact-add-prompt'), passwordModal: root.querySelector('#compact-password-modal'), passwordForm: root.querySelector('#compact-password-form'), passwordInput: root.querySelector('#compact-admin-password'), passwordError: root.querySelector('#compact-password-error'), modelModal: root.querySelector('#compact-model-modal'), modelForm: root.querySelector('#compact-model-form'), modelId: root.querySelector('#compact-model-id'), modelName: root.querySelector('#compact-model-name'), modelIcon: root.querySelector('#compact-model-icon'), modelDescription: root.querySelector('#compact-model-description'), modelTitle: root.querySelector('#compact-model-title'), promptModal: root.querySelector('#compact-prompt-modal'), promptForm: root.querySelector('#compact-prompt-form'), promptId: root.querySelector('#compact-prompt-id'), promptModelId: root.querySelector('#compact-prompt-model-id'), promptName: root.querySelector('#compact-prompt-name'), promptImageUrl: root.querySelector('#compact-prompt-image-url'), promptFile: root.querySelector('#compact-prompt-file'), fileName: root.querySelector('#compact-file-name'), promptText: root.querySelector('#compact-prompt-text'), previewWrap: root.querySelector('#compact-preview-wrap'), preview: root.querySelector('#compact-preview'), removePreview: root.querySelector('#compact-remove-preview'), promptTitle: root.querySelector('#compact-prompt-title'), promptKicker: root.querySelector('#compact-prompt-kicker'), imageViewer: root.querySelector('#compact-image-viewer'), viewerImage: root.querySelector('#compact-viewer-image'), viewerCaption: root.querySelector('#compact-viewer-caption'), toast: root.querySelector('#compact-toast')
        };
    }

    function bindEvents() {
        refs.title.addEventListener('click', function () { if (activeModelId) { activeModelId = ''; render(); } });
        refs.editButton.addEventListener('click', toggleEditMode);
        refs.addModel.addEventListener('click', function () { openModelModal(); });
        refs.addPrompt.addEventListener('click', function () { if (activeModelId) openPromptModal(null, activeModelId); else showToast('Entra primero en una carpeta de modelo.', 'error'); });
        refs.passwordForm.addEventListener('submit', checkPassword);
        refs.modelForm.addEventListener('submit', saveModel);
        refs.promptForm.addEventListener('submit', savePrompt);
        refs.promptFile.addEventListener('change', previewFile);
        refs.removePreview.addEventListener('click', clearPreview);
        root.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { closeModal(button.dataset.close); }); });
        root.querySelectorAll('.modal-overlay').forEach(function (overlay) { overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(overlay.id); }); });
        document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { const open = root.querySelector('.modal-overlay:not([hidden])'); if (open) closeModal(open.id); } });
    }

    async function loadState() {
        let saved = null;
        try { const response = await fetch('load_state.php?t=' + Date.now(), { cache: 'no-store' }); if (!response.ok) throw new Error(); saved = await response.json(); } catch (_) { try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (__) {} }
        state = normalizeState(saved || createDefaultState());
    }

    function createDefaultState() {
        const prompt = 'Crea una imagen de alta calidad a partir de la referencia, conservando con precisión la identidad y los elementos principales. Iluminación cinematográfica, composición limpia, detalles realistas, textura natural, sin texto ni logotipos.';
        return { version: 1, models: ['ChatGPT', 'Gemini', 'FLUX', 'Qwen', 'Grok'].map(function (name, index) { return { id: 'model-' + name.toLowerCase(), name: name, icon: ['✦', '◇', '◌', '◎', '✺'][index], description: '', items: [{ id: 'sample-' + index, title: 'Varios', image: SAMPLE_IMAGE, prompt: prompt }] }; }) };
    }

    function normalizeState(source) {
        return { version: 1, models: (Array.isArray(source && source.models) ? source.models : []).map(function (model, index) { return { id: String(model.id || 'model-' + Date.now() + '-' + index), name: String(model.name || 'Modelo sin nombre'), icon: String(model.icon || '✦').slice(0, 3), description: String(model.description || ''), items: Array.isArray(model.items) ? model.items.map(function (item, itemIndex) { return { id: String(item.id || 'prompt-' + Date.now() + '-' + itemIndex), title: String(item.title || item.name || 'Varios'), image: String(item.image || item.websiteUrl || ''), prompt: String(item.prompt || item.briefDescription || '') }; }) : [] }; }) };
    }

    function render() {
        const model = getActiveModel(); const inModel = Boolean(model);
        document.body.classList.toggle('compact-model-open', inModel); document.body.classList.toggle('compact-edit', isEditable);
        refs.modelsView.hidden = inModel; refs.promptsView.hidden = !inModel; refs.editToolbar.hidden = !isEditable; refs.title.textContent = inModel ? model.name.toUpperCase() : 'GALERÍA DE CÓDIGOS POR MODELO';
        renderModels(); renderPrompts();
    }

    function renderModels() {
        refs.modelGrid.innerHTML = '';
        if (!state.models.length) { refs.modelGrid.innerHTML = '<div class="empty-state"><strong>No hay modelos todavía</strong><span>Activa la edición para crear la primera carpeta.</span></div>'; return; }
        state.models.forEach(function (model) {
            const first = model.items[0]; const card = document.createElement('button'); card.type = 'button'; card.className = 'model-folder'; card.innerHTML = '<span class="folder-image' + (first && first.image ? '' : ' is-empty') + '">' + (first && first.image ? '<img src="' + escapeAttr(first.image) + '" alt="">' : '') + '</span><span class="folder-name">' + escapeHtml(model.name) + '</span><span class="folder-count">' + model.items.length + ' ' + (model.items.length === 1 ? 'código' : 'códigos') + '</span><span class="folder-actions"><span class="small-action edit-model" title="Editar modelo">✎</span><span class="small-action danger delete-model" title="Eliminar modelo">×</span></span>';
            card.addEventListener('click', function (event) { if (event.target.closest('.folder-actions')) return; activeModelId = model.id; render(); });
            if (isEditable) { card.querySelector('.edit-model').addEventListener('click', function (event) { event.stopPropagation(); openModelModal(model); }); card.querySelector('.delete-model').addEventListener('click', function (event) { event.stopPropagation(); deleteModel(model); }); }
            refs.modelGrid.appendChild(card);
        });
    }

    function renderPrompts() {
        refs.promptGrid.innerHTML = ''; const model = getActiveModel(); if (!model) return;
        if (!model.items.length) { refs.promptGrid.innerHTML = '<div class="empty-state"><strong>Esta carpeta está vacía</strong><span>Activa la edición para añadir un código.</span></div>'; return; }
        model.items.forEach(function (item) { refs.promptGrid.appendChild(createPromptCard(item, model)); });
    }

    function createPromptCard(item, model) {
        const card = document.createElement('article'); card.className = 'prompt-card';
        card.innerHTML = '<div class="card-image' + (item.image ? '' : ' is-empty') + '">' + (item.image ? '<img src="' + escapeAttr(item.image) + '" alt="' + escapeAttr(item.title) + '">' : '') + '</div><h3 class="card-title">' + escapeHtml(item.title) + '</h3><button class="copy-button" type="button">⧉ &nbsp; Copiar código</button>' + (isEditable ? '<div class="card-actions"><button class="card-action edit-card" type="button" title="Editar código">✎</button><button class="card-action danger delete-card" type="button" title="Eliminar código">×</button></div>' : '');
        const imageElement = card.querySelector('img'); const imageContainer = card.querySelector('.card-image');
        if (imageElement) imageElement.addEventListener('error', function () { imageContainer.classList.add('is-empty'); imageElement.remove(); });
        imageContainer.addEventListener('click', function () { if (item.image && imageElement && imageElement.isConnected) openViewer(item); });
        card.querySelector('.copy-button').addEventListener('click', function () { copyPrompt(item.prompt, card.querySelector('.copy-button')); });
        if (isEditable) { card.querySelector('.edit-card').addEventListener('click', function () { openPromptModal(item, model.id); }); card.querySelector('.delete-card').addEventListener('click', function () { deletePrompt(item, model); }); }
        return card;
    }

    function toggleEditMode() { if (isEditable) { isEditable = false; adminPassword = ''; render(); showToast('Edición cerrada.'); return; } refs.passwordForm.reset(); refs.passwordError.hidden = true; openModal('compact-password-modal'); setTimeout(function () { refs.passwordInput.focus(); }, 80); }
    async function checkPassword(event) {
        event.preventDefault(); const password = refs.passwordInput.value; refs.passwordError.hidden = true;
        try { const data = new FormData(); data.append('password', password); const response = await fetch('validar_password.php', { method: 'POST', body: data }); const result = await response.json(); if (!result.success) throw new Error(result.error || 'Contraseña incorrecta.'); }
        catch (error) { if (!(error instanceof TypeError && password === LOCAL_PASSWORD_FALLBACK)) { refs.passwordError.textContent = error.message || 'Contraseña incorrecta.'; refs.passwordError.hidden = false; return; } }
        adminPassword = password; isEditable = true; closeModal('compact-password-modal'); render(); showToast('Modo edición activado.');
    }

    function openModelModal(model) { refs.modelForm.reset(); refs.modelId.value = model ? model.id : ''; refs.modelName.value = model ? model.name : ''; refs.modelIcon.value = model ? model.icon : '✦'; refs.modelDescription.value = model ? model.description : ''; refs.modelTitle.textContent = model ? 'Editar modelo' : 'Añadir modelo'; openModal('compact-model-modal'); setTimeout(function () { refs.modelName.focus(); }, 80); }
    function saveModel(event) { event.preventDefault(); const name = refs.modelName.value.trim(); if (!name) return; const id = refs.modelId.value; if (id) { const model = state.models.find(function (entry) { return entry.id === id; }); if (model) { model.name = name; model.icon = (refs.modelIcon.value.trim() || '✦').slice(0, 3); model.description = refs.modelDescription.value.trim(); } } else { const model = { id: 'model-' + Date.now(), name: name, icon: (refs.modelIcon.value.trim() || '✦').slice(0, 3), description: refs.modelDescription.value.trim(), items: [] }; state.models.push(model); } closeModal('compact-model-modal'); render(); saveState(); showToast(id ? 'Modelo actualizado.' : 'Modelo creado.'); }
    function deleteModel(model) { if (!confirm('¿Eliminar la carpeta “' + model.name + '” y sus códigos?')) return; state.models = state.models.filter(function (entry) { return entry.id !== model.id; }); if (activeModelId === model.id) activeModelId = ''; render(); saveState(); showToast('Modelo eliminado.'); }

    function openPromptModal(item, modelId) { const model = state.models.find(function (entry) { return entry.id === modelId; }); if (!model) return; refs.promptForm.reset(); temporaryImageData = ''; refs.promptId.value = item ? item.id : ''; refs.promptModelId.value = modelId; refs.promptName.value = item ? item.title : ''; refs.promptImageUrl.value = item && item.image && !item.image.startsWith('data:') ? item.image : ''; refs.promptText.value = item ? item.prompt : ''; refs.fileName.textContent = 'Ninguna imagen seleccionada'; refs.promptTitle.textContent = item ? 'Editar código' : 'Añadir código'; refs.promptKicker.textContent = model.name + ' · código de generación'; if (item && item.image) showPreview(item.image); else clearPreview(); openModal('compact-prompt-modal'); setTimeout(function () { refs.promptName.focus(); }, 80); }
    function previewFile() { const file = refs.promptFile.files[0]; if (!file) return; if (file.size > 20 * 1024 * 1024) { showToast('La imagen no puede superar los 20 MB.', 'error'); refs.promptFile.value = ''; return; } refs.fileName.textContent = file.name; const reader = new FileReader(); reader.onload = function (event) { temporaryImageData = event.target.result; showPreview(temporaryImageData); }; reader.readAsDataURL(file); }
    function showPreview(source) { refs.preview.src = source; refs.previewWrap.hidden = false; }
    function clearPreview() { temporaryImageData = ''; refs.preview.src = ''; refs.previewWrap.hidden = true; refs.promptFile.value = ''; refs.fileName.textContent = 'Ninguna imagen seleccionada'; }
    async function savePrompt(event) { event.preventDefault(); const model = state.models.find(function (entry) { return entry.id === refs.promptModelId.value; }); if (!model) return; const oldItem = refs.promptId.value ? model.items.find(function (entry) { return entry.id === refs.promptId.value; }) : null; let image = refs.promptImageUrl.value.trim(); if (temporaryImageData && refs.promptFile.files[0]) { try { const data = new FormData(); data.append('image', refs.promptFile.files[0]); const response = await fetch('upload.php', { method: 'POST', body: data }); const uploaded = await response.json(); image = uploaded.success && uploaded.url ? uploaded.url : (image || temporaryImageData); } catch (_) { image = image || temporaryImageData; } } else if (!image && oldItem && !refs.previewWrap.hidden) image = oldItem.image; const item = { id: refs.promptId.value || 'prompt-' + Date.now(), title: refs.promptName.value.trim(), image: image, prompt: refs.promptText.value.trim() }; const index = oldItem ? model.items.indexOf(oldItem) : -1; if (index >= 0) model.items[index] = item; else model.items.push(item); closeModal('compact-prompt-modal'); render(); saveState(); showToast(oldItem ? 'Código actualizado.' : 'Código guardado.'); }
    function deletePrompt(item, model) { if (!confirm('¿Eliminar el código “' + item.title + '”?')) return; model.items = model.items.filter(function (entry) { return entry.id !== item.id; }); render(); saveState(); showToast('Código eliminado.'); }

    async function copyPrompt(text, button) { try { await navigator.clipboard.writeText(text || ''); } catch (_) { const helper = document.createElement('textarea'); helper.value = text || ''; helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.appendChild(helper); helper.select(); document.execCommand('copy'); helper.remove(); } const original = button.innerHTML; button.innerHTML = '✓ &nbsp; Copiado'; button.classList.add('copied'); showToast('Código copiado.'); setTimeout(function () { button.innerHTML = original; button.classList.remove('copied'); }, 1500); }
    function openViewer(item) { refs.viewerImage.src = item.image; refs.viewerImage.alt = item.title; refs.viewerCaption.textContent = item.title; openModal('compact-image-viewer'); }
    async function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); if (!adminPassword) return; try { const response = await fetch('guardar_cambios.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword, state: state }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(); } catch (_) { showToast('Guardado local; no se pudo sincronizar.', 'error'); } }
    function getActiveModel() { return state.models.find(function (model) { return model.id === activeModelId; }) || null; }
    function openModal(id) { document.getElementById(id).hidden = false; document.body.classList.add('modal-open'); }
    function closeModal(id) { document.getElementById(id).hidden = true; if (!root.querySelector('.modal-overlay:not([hidden])')) document.body.classList.remove('modal-open'); }
    function showToast(message, type) { clearTimeout(toastTimer); refs.toast.textContent = message; refs.toast.className = 'toast visible' + (type ? ' ' + type : ''); toastTimer = setTimeout(function () { refs.toast.classList.remove('visible'); }, 2500); }
    function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; }); }
    function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
})();
