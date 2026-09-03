(function () {
    'use strict';

    const STORAGE_KEY = 'codigosImagenData';
    const DEFAULT_PASSWORD_FALLBACK = '0';
    const PALETTES = [
        { color: '#6957d6', tint: '#e8e4ff' },
        { color: '#2d8d72', tint: '#d9f2e8' },
        { color: '#c36a3b', tint: '#ffe4d4' },
        { color: '#3474a8', tint: '#dcecff' },
        { color: '#a64c86', tint: '#f5dff0' }
    ];

    const els = {
        modelFolders: document.getElementById('model-folders'),
        promptGrid: document.getElementById('prompt-grid'),
        modelCount: document.getElementById('model-count'),
        promptCount: document.getElementById('prompt-count'),
        activeModelName: document.getElementById('active-model-name'),
        activeModelIcon: document.getElementById('active-model-icon'),
        activeModelKicker: document.getElementById('active-model-kicker'),
        resultSummary: document.getElementById('result-summary'),
        searchInput: document.getElementById('search-input'),
        clearSearch: document.getElementById('clear-search'),
        editButton: document.getElementById('edit-mode-button'),
        editLabel: document.getElementById('edit-mode-label'),
        saveStatusText: document.getElementById('save-status-text'),
        editHint: document.getElementById('edit-hint'),
        addModelButton: document.getElementById('add-model-button'),
        addPromptButton: document.getElementById('add-prompt-button'),
        toast: document.getElementById('toast'),
        passwordModal: document.getElementById('password-modal'),
        passwordForm: document.getElementById('password-form'),
        passwordInput: document.getElementById('admin-password'),
        passwordError: document.getElementById('password-error'),
        modelModal: document.getElementById('model-modal'),
        modelForm: document.getElementById('model-form'),
        modelId: document.getElementById('model-id'),
        modelName: document.getElementById('model-name'),
        modelIcon: document.getElementById('model-icon'),
        modelDescription: document.getElementById('model-description'),
        modelModalTitle: document.getElementById('model-modal-title'),
        promptModal: document.getElementById('prompt-modal'),
        promptForm: document.getElementById('prompt-form'),
        promptId: document.getElementById('prompt-id'),
        promptModelId: document.getElementById('prompt-model-id'),
        promptTitle: document.getElementById('prompt-title'),
        promptImageUrl: document.getElementById('prompt-image-url'),
        promptText: document.getElementById('prompt-text'),
        promptImageFile: document.getElementById('prompt-image-file'),
        imagePreviewWrap: document.getElementById('image-preview-wrap'),
        imagePreview: document.getElementById('image-preview'),
        removePreview: document.getElementById('remove-preview'),
        promptModalTitle: document.getElementById('prompt-modal-title'),
        promptModalEyebrow: document.getElementById('prompt-modal-eyebrow'),
        promptModalDescription: document.getElementById('prompt-modal-description'),
        imageViewer: document.getElementById('image-viewer'),
        viewerImage: document.getElementById('viewer-image'),
        viewerCaption: document.getElementById('viewer-caption')
    };

    let state = { models: [] };
    let activeModelId = '';
    let editMode = false;
    let adminPassword = '';
    let temporaryImageData = '';
    let dragged = null;
    let toastTimer = null;

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        bindEvents();
        await loadState();
        render();
    }

    function bindEvents() {
        els.editButton.addEventListener('click', handleEditToggle);
        els.addModelButton.addEventListener('click', function () { openModelModal(); });
        els.addPromptButton.addEventListener('click', function () {
            const model = getActiveModel();
            if (model) openPromptModal(null, model.id);
            else showToast('Primero crea una carpeta de modelo.', 'error');
        });
        els.searchInput.addEventListener('input', function () {
            els.clearSearch.hidden = !els.searchInput.value;
            renderPrompts();
        });
        els.clearSearch.addEventListener('click', function () {
            els.searchInput.value = '';
            els.clearSearch.hidden = true;
            renderPrompts();
            els.searchInput.focus();
        });
        els.passwordForm.addEventListener('submit', handlePasswordSubmit);
        els.modelForm.addEventListener('submit', handleModelSubmit);
        els.promptForm.addEventListener('submit', handlePromptSubmit);
        els.promptImageFile.addEventListener('change', handleImageSelection);
        els.removePreview.addEventListener('click', clearImagePreview);

        document.querySelectorAll('[data-close-modal]').forEach(function (button) {
            button.addEventListener('click', function () { closeModal(button.dataset.closeModal); });
        });
        document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
            backdrop.addEventListener('click', function (event) {
                if (event.target === backdrop) closeModal(backdrop.id);
            });
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                const openModal = document.querySelector('.modal-backdrop:not([hidden])');
                if (openModal) closeModal(openModal.id);
            }
        });
    }

    async function loadState() {
        let loaded = null;
        try {
            const response = await fetch('load_state.php?t=' + Date.now(), { cache: 'no-store' });
            if (!response.ok) throw new Error('No se pudo cargar el estado');
            loaded = await response.json();
        } catch (error) {
            try { loaded = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { loaded = null; }
        }

        state = normalizeState(loaded || createDefaultState());
        if (!state.models.length) state = createDefaultState();
        activeModelId = state.models[0] ? state.models[0].id : '';
    }

    function createDefaultState() {
        return {
            version: 1,
            models: [
                {
                    id: 'model-chatgpt', name: 'ChatGPT', icon: '✦', description: 'Versátil y preciso',
                    items: [
                        { id: 'prompt-chatgpt-1', title: 'Retrato editorial de estudio', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80', prompt: 'Crea un retrato editorial hiperrealista de la persona de referencia, conservando fielmente su identidad, rasgos faciales y proporciones. Iluminación de estudio suave y envolvente, fondo neutro cálido, piel natural, composición de revista, lente de 85 mm, profundidad de campo sutil, detalles de alta fidelidad, sin texto ni logotipos.' },
                        { id: 'prompt-chatgpt-2', title: 'Producto premium sobre pedestal', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', prompt: 'Fotografía de producto premium del objeto de referencia sobre un pedestal minimalista. Mantén la forma y los detalles del producto intactos. Luz lateral cinematográfica, sombras suaves, fondo degradado marfil y lavanda, composición publicitaria limpia, textura realista, acabado de catálogo de lujo, alta resolución, sin palabras ni marcas inventadas.' }
                    ]
                },
                {
                    id: 'model-gemini', name: 'Gemini', icon: '◇', description: 'Ideas rápidas y visuales',
                    items: [
                        { id: 'prompt-gemini-1', title: 'Escena cinematográfica', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80', prompt: 'Transforma la imagen de referencia en una escena cinematográfica coherente y detallada. Conserva al sujeto principal y crea una atmósfera visual clara: luz de última hora de la tarde, colores naturales, profundidad espacial, composición narrativa, textura fotográfica auténtica y un acabado de película contemporánea.' }
                    ]
                },
                {
                    id: 'model-flux', name: 'FLUX', icon: '◌', description: 'Realismo y detalle',
                    items: [
                        { id: 'prompt-flux-1', title: 'Moda urbana nocturna', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80', prompt: 'High-end editorial street fashion photograph, preserve the person identity from the reference image. Night city environment with wet pavement reflections, subtle neon accents, natural confident pose, realistic fabric texture, directional rim light, 35mm lens, cinematic contrast, authentic candid energy, no text, no logos.' }
                    ]
                },
                {
                    id: 'model-midjourney', name: 'Midjourney', icon: '✺', description: 'Dirección artística',
                    items: [
                        { id: 'prompt-midjourney-1', title: 'Ilustración editorial', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=80', prompt: 'Editorial illustration with a poetic, contemporary art direction. Combine bold organic shapes, tactile paper texture, refined color harmony and expressive lighting. The main subject must remain immediately recognizable, with a balanced composition, subtle grain and a premium art-book finish.' }
                    ]
                }
            ]
        };
    }

    function normalizeState(source) {
        const models = Array.isArray(source && source.models) ? source.models : [];
        return {
            version: 1,
            models: models.map(function (model, index) {
                return {
                    id: String(model.id || ('model-' + Date.now() + '-' + index)),
                    name: String(model.name || 'Modelo sin nombre'),
                    icon: String(model.icon || '✦').slice(0, 3),
                    description: String(model.description || ''),
                    items: Array.isArray(model.items) ? model.items.map(function (item, itemIndex) {
                        return {
                            id: String(item.id || ('prompt-' + Date.now() + '-' + itemIndex)),
                            title: String(item.title || item.name || 'Código sin título'),
                            image: String(item.image || item.websiteUrl || ''),
                            prompt: String(item.prompt || item.briefDescription || '')
                        };
                    }) : []
                };
            })
        };
    }

    function render() {
        renderStats();
        renderFolders();
        renderActiveModel();
        renderPrompts();
        document.body.classList.toggle('edit-mode', editMode);
        els.editLabel.textContent = editMode ? 'Salir de edición' : 'Editar biblioteca';
        els.saveStatusText.textContent = editMode ? 'Modo edición activo' : 'Solo lectura';
        els.addModelButton.hidden = !editMode;
        els.addPromptButton.hidden = !editMode;
        els.editHint.hidden = editMode;
    }

    function renderStats() {
        els.modelCount.textContent = state.models.length;
        els.promptCount.textContent = state.models.reduce(function (sum, model) { return sum + model.items.length; }, 0);
    }

    function renderFolders() {
        els.modelFolders.innerHTML = '';
        if (!state.models.length) {
            els.modelFolders.innerHTML = '<div class="empty-state"><div class="empty-symbol">＋</div><h3>Aún no hay modelos</h3><p>Activa el modo edición para crear tu primera carpeta.</p></div>';
            return;
        }
        state.models.forEach(function (model, index) {
            const palette = PALETTES[index % PALETTES.length];
            const folder = document.createElement('button');
            folder.type = 'button';
            folder.className = 'model-folder' + (model.id === activeModelId ? ' active' : '');
            folder.style.setProperty('--folder-color', palette.color);
            folder.style.setProperty('--folder-tint', palette.tint);
            folder.draggable = editMode;
            folder.innerHTML = '<div class="folder-top"><span class="folder-icon">' + escapeHtml(model.icon) + '</span><span class="folder-count">' + model.items.length + ' ' + (model.items.length === 1 ? 'código' : 'códigos') + '</span></div>' +
                '<span class="folder-name">' + escapeHtml(model.name) + '</span>' +
                '<span class="folder-description">' + escapeHtml(model.description || 'Carpeta de códigos') + '</span>' +
                '<span class="folder-bottom"><span></span><span class="folder-actions"><span class="icon-action edit-model" title="Editar modelo">✎</span><span class="icon-action danger delete-model" title="Eliminar modelo">×</span></span></span>';

            folder.addEventListener('click', function (event) {
                if (event.target.closest('.folder-actions')) return;
                activeModelId = model.id;
                els.searchInput.value = '';
                els.clearSearch.hidden = true;
                render();
            });
            if (editMode) {
                folder.querySelector('.edit-model').addEventListener('click', function (event) { event.stopPropagation(); openModelModal(model); });
                folder.querySelector('.delete-model').addEventListener('click', function (event) { event.stopPropagation(); deleteModel(model); });
                bindFolderDrag(folder, model);
            }
            els.modelFolders.appendChild(folder);
        });
    }

    function renderActiveModel() {
        const model = getActiveModel();
        if (!model) {
            els.activeModelName.textContent = 'Crea tu primera carpeta';
            els.activeModelIcon.textContent = '＋';
            els.activeModelKicker.textContent = '02 · Sin carpeta activa';
            return;
        }
        const index = state.models.indexOf(model);
        const palette = PALETTES[index % PALETTES.length];
        els.activeModelName.textContent = model.name;
        els.activeModelIcon.textContent = model.icon;
        els.activeModelIcon.style.color = palette.color;
        els.activeModelIcon.style.background = palette.tint;
        els.activeModelKicker.textContent = '02 · Carpeta activa · ' + model.items.length + ' ' + (model.items.length === 1 ? 'código' : 'códigos');
    }

    function renderPrompts() {
        els.promptGrid.innerHTML = '';
        const search = els.searchInput.value.trim().toLowerCase();
        let entries = [];
        if (search) {
            state.models.forEach(function (model) {
                model.items.forEach(function (item) {
                    const haystack = (item.title + ' ' + item.prompt + ' ' + model.name).toLowerCase();
                    if (haystack.includes(search)) entries.push({ model: model, item: item, showModel: true });
                });
            });
            els.resultSummary.textContent = entries.length + ' ' + (entries.length === 1 ? 'resultado' : 'resultados') + ' en toda la biblioteca';
        } else {
            const model = getActiveModel();
            entries = model ? model.items.map(function (item) { return { model: model, item: item, showModel: false }; }) : [];
            els.resultSummary.textContent = entries.length + ' ' + (entries.length === 1 ? 'código guardado' : 'códigos guardados');
        }

        if (!entries.length) {
            const model = getActiveModel();
            const title = search ? 'No hemos encontrado ese código' : (model ? 'Esta carpeta todavía está vacía' : 'Crea una carpeta para empezar');
            const copy = search ? 'Prueba con otro nombre, palabra o fragmento del prompt.' : (editMode ? 'Añade tu primer código y guarda la imagen que mejor represente su resultado.' : 'Activa el modo edición para añadir tu primer código.');
            els.promptGrid.innerHTML = '<div class="empty-state"><div class="empty-symbol">' + (search ? '⌕' : '＋') + '</div><h3>' + title + '</h3><p>' + copy + '</p></div>';
            return;
        }
        entries.forEach(function (entry) { els.promptGrid.appendChild(createPromptCard(entry.item, entry.model, entry.showModel)); });
    }

    function createPromptCard(item, model, showModel) {
        const card = document.createElement('article');
        card.className = 'prompt-card';
        card.draggable = editMode && !els.searchInput.value.trim();
        const imageMarkup = item.image ? '<img src="' + escapeAttribute(item.image) + '" alt="' + escapeAttribute(item.title) + '">' : '';
        card.innerHTML = '<div class="card-image' + (item.image ? '' : ' is-empty') + '">' + imageMarkup + (showModel ? '<span class="card-badge">' + escapeHtml(model.name) + '</span>' : '') + '</div>' +
            '<div class="card-body"><div class="card-title-row"><h3 class="card-title">' + escapeHtml(item.title) + '</h3></div>' +
            '<p class="card-text">' + escapeHtml(item.prompt || 'Sin texto todavía.') + '</p>' +
            '<div class="card-footer"><button class="button copy-button" type="button"><span>⧉</span> Copiar código</button>' +
            (editMode ? '<button class="card-action edit-card" type="button" title="Editar código" aria-label="Editar código">✎</button><button class="card-action danger delete-card" type="button" title="Eliminar código" aria-label="Eliminar código">×</button>' : '') + '</div></div>';

        const image = card.querySelector('.card-image');
        const imageElement = card.querySelector('img');
        if (imageElement) imageElement.addEventListener('error', function () { image.classList.add('is-empty'); imageElement.remove(); });
        image.addEventListener('click', function () { if (item.image && imageElement) openViewer(item); });
        card.querySelector('.copy-button').addEventListener('click', function () { copyPrompt(item.prompt, card.querySelector('.copy-button')); });
        if (editMode) {
            card.querySelector('.edit-card').addEventListener('click', function () { openPromptModal(item, model.id); });
            card.querySelector('.delete-card').addEventListener('click', function () { deletePrompt(item, model); });
            if (!els.searchInput.value.trim()) bindPromptDrag(card, item, model);
        }
        return card;
    }

    function bindFolderDrag(folder, model) {
        folder.addEventListener('dragstart', function (event) {
            dragged = { type: 'model', model: model };
            folder.classList.add('dragging');
            event.dataTransfer.effectAllowed = 'move';
        });
        folder.addEventListener('dragend', function () { dragged = null; folder.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(function (node) { node.classList.remove('drag-over'); }); saveState(); });
        folder.addEventListener('dragover', function (event) { if (dragged && dragged.type === 'model' && dragged.model !== model) { event.preventDefault(); folder.classList.add('drag-over'); } });
        folder.addEventListener('dragleave', function () { folder.classList.remove('drag-over'); });
        folder.addEventListener('drop', function (event) {
            event.preventDefault(); folder.classList.remove('drag-over');
            if (!dragged || dragged.type !== 'model' || dragged.model === model) return;
            moveArrayItem(state.models, dragged.model, model);
            render(); saveState();
        });
    }

    function bindPromptDrag(card, item, model) {
        card.addEventListener('dragstart', function (event) { dragged = { type: 'prompt', item: item, model: model }; card.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; });
        card.addEventListener('dragend', function () { dragged = null; card.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(function (node) { node.classList.remove('drag-over'); }); saveState(); });
        card.addEventListener('dragover', function (event) { if (dragged && dragged.type === 'prompt' && dragged.model === model && dragged.item !== item) { event.preventDefault(); card.classList.add('drag-over'); } });
        card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
        card.addEventListener('drop', function (event) { event.preventDefault(); event.stopPropagation(); card.classList.remove('drag-over'); if (!dragged || dragged.type !== 'prompt' || dragged.model !== model || dragged.item === item) return; moveArrayItem(model.items, dragged.item, item); render(); saveState(); });
    }

    function moveArrayItem(array, fromItem, toItem) {
        const fromIndex = array.indexOf(fromItem); const toIndex = array.indexOf(toItem);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        array.splice(fromIndex, 1); array.splice(toIndex, 0, fromItem);
    }

    function openModelModal(model) {
        els.modelForm.reset();
        els.modelId.value = model ? model.id : '';
        els.modelName.value = model ? model.name : '';
        els.modelIcon.value = model ? model.icon : '✦';
        els.modelDescription.value = model ? model.description : '';
        els.modelModalTitle.textContent = model ? 'Editar modelo' : 'Añadir modelo';
        openModal('model-modal');
        setTimeout(function () { els.modelName.focus(); }, 80);
    }

    function handleModelSubmit(event) {
        event.preventDefault();
        const name = els.modelName.value.trim();
        if (!name) return;
        const id = els.modelId.value;
        if (id) {
            const model = state.models.find(function (entry) { return entry.id === id; });
            if (model) { model.name = name; model.icon = (els.modelIcon.value.trim() || '✦').slice(0, 3); model.description = els.modelDescription.value.trim(); }
        } else {
            const model = { id: 'model-' + Date.now(), name: name, icon: (els.modelIcon.value.trim() || '✦').slice(0, 3), description: els.modelDescription.value.trim(), items: [] };
            state.models.push(model); activeModelId = model.id;
        }
        closeModal('model-modal'); render(); saveState(); showToast(id ? 'Modelo actualizado.' : 'Modelo creado.', 'success');
    }

    function deleteModel(model) {
        const promptLabel = model.items.length ? ' También se eliminarán sus ' + model.items.length + ' códigos.' : '';
        if (!window.confirm('¿Eliminar la carpeta “' + model.name + '”?' + promptLabel)) return;
        state.models = state.models.filter(function (entry) { return entry.id !== model.id; });
        if (activeModelId === model.id) activeModelId = state.models[0] ? state.models[0].id : '';
        render(); saveState(); showToast('Carpeta eliminada.', 'success');
    }

    function openPromptModal(item, modelId) {
        const model = state.models.find(function (entry) { return entry.id === modelId; });
        if (!model) return;
        els.promptForm.reset();
        temporaryImageData = '';
        els.promptId.value = item ? item.id : '';
        els.promptModelId.value = modelId;
        els.promptTitle.value = item ? item.title : '';
        els.promptImageUrl.value = item && item.image && !item.image.startsWith('data:') ? item.image : '';
        els.promptText.value = item ? item.prompt : '';
        els.promptImageFile.value = '';
        els.promptModalTitle.textContent = item ? 'Editar código' : 'Añadir código';
        els.promptModalEyebrow.textContent = model.name + ' · código de generación';
        els.promptModalDescription.textContent = item ? 'Actualiza la imagen o el texto de este código.' : 'Guarda una referencia visual y el texto exacto que quieres reutilizar.';
        if (item && item.image) showImagePreview(item.image); else clearImagePreview();
        openModal('prompt-modal');
        setTimeout(function () { els.promptTitle.focus(); }, 80);
    }

    function handleImageSelection() {
        const file = els.promptImageFile.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { showToast('La imagen no puede superar los 20 MB.', 'error'); els.promptImageFile.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function (event) { temporaryImageData = event.target.result; showImagePreview(temporaryImageData); };
        reader.readAsDataURL(file);
    }

    function showImagePreview(source) { els.imagePreview.src = source; els.imagePreviewWrap.hidden = false; }
    function clearImagePreview() { temporaryImageData = ''; els.imagePreview.src = ''; els.imagePreviewWrap.hidden = true; els.promptImageFile.value = ''; }

    async function handlePromptSubmit(event) {
        event.preventDefault();
        const model = state.models.find(function (entry) { return entry.id === els.promptModelId.value; });
        if (!model) return;
        const oldItem = els.promptId.value ? model.items.find(function (entry) { return entry.id === els.promptId.value; }) : null;
        let image = els.promptImageUrl.value.trim();
        if (temporaryImageData && els.promptImageFile.files[0]) {
            try {
                const formData = new FormData(); formData.append('image', els.promptImageFile.files[0]);
                const response = await fetch('upload.php', { method: 'POST', body: formData });
                const uploaded = await response.json();
                if (uploaded.success && uploaded.url) image = uploaded.url;
                else if (!image) image = temporaryImageData;
            } catch (_) { if (!image) image = temporaryImageData; }
        } else if (!image && oldItem && temporaryImageData) {
            image = temporaryImageData;
        } else if (!image && oldItem && !els.imagePreviewWrap.hidden) {
            image = oldItem.image;
        }

        const item = { id: els.promptId.value || 'prompt-' + Date.now(), title: els.promptTitle.value.trim(), image: image, prompt: els.promptText.value.trim() };
        const index = oldItem ? model.items.indexOf(oldItem) : -1;
        if (index >= 0) model.items[index] = item; else model.items.push(item);
        closeModal('prompt-modal'); render(); saveState(); showToast(oldItem ? 'Código actualizado.' : 'Código guardado.', 'success');
    }

    function deletePrompt(item, model) {
        if (!window.confirm('¿Eliminar el código “' + item.title + '”?')) return;
        model.items = model.items.filter(function (entry) { return entry.id !== item.id; });
        render(); saveState(); showToast('Código eliminado.', 'success');
    }

    async function copyPrompt(text, button) {
        try {
            await navigator.clipboard.writeText(text || '');
        } catch (_) {
            const helper = document.createElement('textarea'); helper.value = text || ''; helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.appendChild(helper); helper.select(); document.execCommand('copy'); helper.remove();
        }
        const original = button.innerHTML; button.innerHTML = '<span>✓</span> Copiado'; button.classList.add('copied');
        showToast('Código copiado al portapapeles.', 'success');
        setTimeout(function () { button.innerHTML = original; button.classList.remove('copied'); }, 1700);
    }

    function openViewer(item) { els.viewerImage.src = item.image; els.viewerImage.alt = item.title; els.viewerCaption.textContent = item.title; openModal('image-viewer'); }

    async function handleEditToggle() {
        if (editMode) { editMode = false; adminPassword = ''; render(); showToast('Modo edición cerrado.'); return; }
        els.passwordForm.reset(); els.passwordError.hidden = true; openModal('password-modal'); setTimeout(function () { els.passwordInput.focus(); }, 80);
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();
        const password = els.passwordInput.value;
        els.passwordError.hidden = true;
        try {
            const formData = new FormData(); formData.append('password', password);
            const response = await fetch('validar_password.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Contraseña incorrecta');
        } catch (error) {
            if (error instanceof TypeError && password === DEFAULT_PASSWORD_FALLBACK) {
                // Permite probar la app en un servidor estático local; en PHP manda la validación del servidor.
            } else {
                els.passwordError.textContent = error.message || 'Contraseña incorrecta.'; els.passwordError.hidden = false; els.passwordInput.select(); return;
            }
        }
        adminPassword = password; editMode = true; closeModal('password-modal'); render(); showToast('Modo edición activado.', 'success');
    }

    async function saveState() {
        const localPayload = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, localPayload);
        if (!adminPassword) return;
        document.body.classList.add('saving'); els.saveStatusText.textContent = 'Guardando cambios…';
        try {
            const response = await fetch('guardar_cambios.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword, state: state }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo guardar');
            document.body.classList.remove('saving'); document.body.classList.add('saved'); els.saveStatusText.textContent = 'Cambios guardados';
            setTimeout(function () { if (editMode) els.saveStatusText.textContent = 'Modo edición activo'; document.body.classList.remove('saved'); }, 1800);
        } catch (_) {
            document.body.classList.remove('saving'); els.saveStatusText.textContent = 'Guardado local'; showToast('Se guardó en este dispositivo; revisa la conexión al servidor.', 'error');
        }
    }

    function getActiveModel() { return state.models.find(function (model) { return model.id === activeModelId; }) || state.models[0] || null; }
    function openModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.hidden = false; document.body.classList.add('modal-open'); }
    function closeModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.hidden = true; if (!document.querySelector('.modal-backdrop:not([hidden])')) document.body.classList.remove('modal-open'); }

    function showToast(message, type) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.className = 'toast visible' + (type ? ' ' + type : ''); toastTimer = setTimeout(function () { els.toast.classList.remove('visible'); }, 2800); }
    function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; }); }
    function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
})();
