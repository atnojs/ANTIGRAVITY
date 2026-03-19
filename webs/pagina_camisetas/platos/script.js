document.addEventListener('DOMContentLoaded', function () {
    // --- HEADER & DARK MODE FUNCTIONALITY ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenuButton) mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenuButton.innerHTML = mobileMenu.classList.contains('hidden') ? '<i class="ri-menu-line ri-lg"></i>' : '<i class="ri-close-line ri-lg"></i>';
    });

    // El tema oscuro es por defecto, pero dejamos el toggle por si se quiere implementar un tema claro
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeToggleButtonMobile = document.getElementById('theme-toggle-mobile');
    
    // Forzamos el tema 'oscuro' visualmente, ya que es el diseño base
    document.body.classList.add('dark'); // O una clase que los estilos CSS usen como base oscura

    const toggleTheme = () => {
        // Lógica de cambio de tema si se implementa un tema claro
        showStatus('El modo claro no está disponible en este diseño.', false, 2000);
    };

    if(themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
    if(themeToggleButtonMobile) themeToggleButtonMobile.addEventListener('click', toggleTheme);


    // --- GALLERY EDITOR FUNCTIONALITY ---
    const body = document.body,
        editModeButton = document.getElementById('edit-mode-button'),
        saveButton = document.getElementById('save-button'),
        addImageButton = document.getElementById('add-image-button'),
        editControls = document.getElementById('edit-controls'),
        statusMessage = document.getElementById('status-message'),
        mainContent = document.querySelector('main'),
        imageGrid = document.getElementById('image-grid'),
        hiddenFileInput = document.getElementById('hidden-file-input'),
        styleEditorModal = document.getElementById('style-editor-modal'),
        fontFamilySelect = document.getElementById('font-family-select'),
        fontSizeInput = document.getElementById('font-size-input'),
        fontColorInput = document.getElementById('font-color-input'),
        textAlignSelect = document.getElementById('text-align-select'),
        targetElementIdInput = document.getElementById('target-element-id'),
        applyStyleButton = document.getElementById('apply-style-btn'),
        cancelStyleButton = document.getElementById('cancel-style-btn');

    const VALIDATE_PASS_URL = 'validar_password.php',
        LOAD_CONTENT_URL = 'load_gallery.php',
        SAVE_CONTENT_URL = 'save_gallery.php';
    let isEditMode = false,
        currentTargetImageId = null,
        hasUnsavedChanges = false,
        savedSelectionRange = null;
    
    const availableFonts = {
        'Inter': "'Inter', sans-serif",
        'Rubik Doodle Shadow': "'Rubik Doodle Shadow', cursive",
        'Open Sans': "'Open Sans', sans-serif",
        'Roboto': "'Roboto', sans-serif",
        'Merriweather': "'Merriweather', serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Orbitron': "'Orbitron', sans-serif",
        'Lato': "'Lato', sans-serif",
        'Poppins': "'Poppins', sans-serif",
        'Nunito': "'Nunito', sans-serif",
        'Dancing Script': "'Dancing Script', cursive",
        'Pacifico': "'Pacifico', cursive",
        'Great Vibes': "'Great Vibes', cursive",
    };

    const PLACEHOLDER_ERROR_URL = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(239,68,68,0.5)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>';
    
    function showStatus(message, isError = false, duration = 4000) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'opacity-0');
        statusMessage.classList.add(isError ? 'bg-red-500' : 'bg-green-500');
        setTimeout(() => {
            statusMessage.classList.add('opacity-0');
            setTimeout(() => statusMessage.classList.add('hidden'), 300);
        }, duration);
    }
    async function checkPassword(input) {
        // return input === '1234'; 
        try {
            const res = await fetch(`${VALIDATE_PASS_URL}?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache'
                },
                body: new URLSearchParams({
                    'password': input
                })
            });
            if (!res.ok) throw new Error(res.status);
            return (await res.json()).success === true;
        } catch (e) {
            showStatus('Error al contactar servidor: ' + e.message, true);
            return false;
        }
    }

    function createAndAppendImageBlock(id, src = '', fit = 'contain', alt = 'Espacio para imagen', link = '', textContent = '') {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'image-item gallery-item flex flex-col gap-2 cursor-grab'; // Añadida clase gallery-item
        itemWrapper.dataset.id = id;

        const textWrapper = document.createElement('div');
        textWrapper.className = 'editable-text-wrapper relative text-center';

        const textElement = document.createElement('div');
        textElement.id = `${id}-text`;
        textElement.className = 'editable-text px-1 py-0.5 font-semibold text-gray-200'; // Color de texto actualizado
        textElement.innerHTML = textContent || 'Identificador';

        const styleButton = document.createElement('button');
        styleButton.className = 'edit-style-btn hidden absolute -top-1 -right-1 bg-amber-400 text-amber-900 w-6 h-6 rounded-full items-center justify-center text-sm shadow-md z-10 hover:scale-110 transition-transform';
        styleButton.dataset.targetElement = `${id}-text`;
        styleButton.title = 'Editar Estilo Texto';
        styleButton.innerHTML = '🎨';
        
        textWrapper.appendChild(textElement);
        textWrapper.appendChild(styleButton);
        
        const container = document.createElement('div');
        container.className = 'editable-image-container group relative aspect-square rounded-3xl overflow-hidden';
        
        const img = document.createElement('img');
        img.id = id;
        img.alt = alt;
        img.className = 'w-full h-full block object-cover rounded-2xl';
        img.style.objectFit = fit;
        img.dataset.imageLink = link;
        img.loading = 'lazy';
        
        img.onerror = () => {
            img.onerror = null;
            img.src = PLACEHOLDER_ERROR_URL;
        };
        img.src = src;
        
        const controls = document.createElement('div');
        controls.className = 'image-edit-controls absolute bottom-0 left-0 right-0 bg-black/70 p-1.5 flex-wrap gap-1 justify-center hidden opacity-0 group-hover:opacity-100 transition-opacity z-10';
        controls.innerHTML = `
            <button class="image-edit-button text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded" data-action="url" title="Cambiar URL">URL</button>
            <button class="image-edit-button text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded" data-action="upload" title="Subir desde PC">Subir PC</button>
            <button class="image-edit-button text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded" data-action="fit" title="Ajustar (Contain)">Ajustar</button>
            <button class="image-edit-button text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded" data-action="cover" title="Cubrir (Cover)">Cubrir</button>
            <button class="image-edit-button text-xs link-btn bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded ${link ? 'has-link' : ''}" data-action="link" title="Enlazar imagen">Enlace</button>
            <button class="image-edit-button text-xs delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded" data-action="delete" title="Eliminar">Eliminar</button>
        `;
        
        container.appendChild(img);
        container.appendChild(controls);

        itemWrapper.appendChild(textWrapper);
        itemWrapper.appendChild(container);

        return itemWrapper;
    }

    function applyImageLinks() {
        document.querySelectorAll('#image-grid .editable-image-container img[id]').forEach(img => {
            const url = img.dataset.imageLink;
            const src = img.getAttribute('src');
            const isPlaceholder = !src || src === PLACEHOLDER_ERROR_URL;
            const container = img.closest('.editable-image-container');
            let anchor = container.querySelector('a');

            if (url && !isPlaceholder && !isEditMode) {
                if (!anchor) {
                    anchor = document.createElement('a');
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    container.insertBefore(anchor, img);
                    anchor.appendChild(img);
                }
                anchor.href = url;
            } else if (anchor) {
                 container.insertBefore(img, anchor);
                 anchor.remove();
            }
            
            const linkBtn = container.querySelector('.link-btn');
            if(linkBtn) {
              linkBtn.classList.toggle('!bg-blue-500', !!url && !isPlaceholder);
            }
        });
    }

    function handleDeleteImage(id) {
        const item = document.querySelector(`.image-item[data-id="${id}"]`);
        if (item) {
            item.remove();
            hasUnsavedChanges = true;
            showStatus('Elemento eliminado. Guarda los cambios.');
        }
    }

    function handleImageAction(id, action) {
        const img = document.getElementById(id);
        if (!img) return;

        switch(action) {
            case 'url':
                const currentUrl = img.src === PLACEHOLDER_ERROR_URL ? '' : img.src;
                const newUrl = prompt('Introduce la nueva URL de la imagen:', currentUrl);
                if (newUrl !== null) {
                    img.src = newUrl.trim() || PLACEHOLDER_ERROR_URL;
                    hasUnsavedChanges = true;
                    showStatus('URL actualizada. Guarda los cambios.');
                }
                break;
            case 'upload':
                currentTargetImageId = id;
                hiddenFileInput.click();
                break;
            case 'fit':
                img.style.objectFit = 'contain';
                hasUnsavedChanges = true;
                showStatus('Ajuste "Contain" aplicado. Guarda los cambios.');
                break;
            case 'cover':
                img.style.objectFit = 'cover';
                hasUnsavedChanges = true;
                showStatus('Ajuste "Cover" aplicado. Guarda los cambios.');
                break;
            case 'link':
                const currentLink = img.dataset.imageLink || '';
                const newLink = prompt('Introduce la URL de destino (dejar vacío para quitar):', currentLink);
                if (newLink !== null) {
                    img.dataset.imageLink = newLink.trim();
                    hasUnsavedChanges = true;
                    showStatus(newLink.trim() ? 'Enlace actualizado.' : 'Enlace eliminado.');
                    applyImageLinks();
                }
                break;
            case 'delete':
                handleDeleteImage(id);
                break;
        }
    }

    function handleFileSelected(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            if (file) showStatus('El archivo debe ser una imagen.', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
            const result = ev.target.result;
            if (currentTargetImageId) {
                const img = document.getElementById(currentTargetImageId);
                if (img) {
                    img.src = result;
                    hasUnsavedChanges = true;
                    showStatus('Imagen subida. Guarda los cambios.');
                }
            }
            currentTargetImageId = null;
        };
        reader.onerror = () => {
            showStatus('Error al leer el archivo.', true);
            currentTargetImageId = null;
        };
        reader.readAsDataURL(file);
    }
    
    function openStyleEditor(id) {
        const el = document.getElementById(id);
        if (!el) { showStatus('Elemento no encontrado.', true); return; }

        savedSelectionRange = null;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            if (el.contains(range.commonAncestorContainer)) {
                savedSelectionRange = range.cloneRange();
            }
        }

        let styleSourceNode = el;
        if (savedSelectionRange) {
            const container = savedSelectionRange.commonAncestorContainer;
            styleSourceNode = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement);
        }

        targetElementIdInput.value = id;
        const cs = getComputedStyle(styleSourceNode);

        let currentFont = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const matchingFont = Object.entries(availableFonts).find(([name, value]) => value.includes(currentFont));
        fontFamilySelect.value = matchingFont ? matchingFont[1] : availableFonts['Inter'];

        fontSizeInput.value = cs.fontSize;
        fontColorInput.value = cs.color;
        textAlignSelect.value = cs.textAlign;
        styleEditorModal.classList.remove('hidden');
    }

    function applyStyles() {
        const id = targetElementIdInput.value;
        const el = document.getElementById(id);
        if (!el) {
            showStatus('Error al aplicar estilos.', true);
            styleEditorModal.classList.add('hidden');
            return;
        }

        // Case 1: A text selection exists. Apply styles inline.
        if (savedSelectionRange && !savedSelectionRange.collapsed) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedSelectionRange);
            }
            
            const span = document.createElement('span');
            span.style.fontFamily = fontFamilySelect.value;
            span.style.fontSize = fontSizeInput.value;
            span.style.color = fontColorInput.value;
            // NOTE: text-align is a block property and is intentionally not applied to the inline span.
            
            try {
                savedSelectionRange.surroundContents(span);
            } catch (e) {
                console.error("Could not apply style with surroundContents:", e);
                showStatus("No se pudo aplicar el estilo a una selección compleja.", true);
            }
        } else {
            // Case 2: No text selection. Apply styles to the whole block.
            el.style.fontFamily = fontFamilySelect.value;
            el.style.fontSize = fontSizeInput.value;
            el.style.color = fontColorInput.value;
            el.style.textAlign = textAlignSelect.value;
        }

        hasUnsavedChanges = true;
        showStatus('Estilo aplicado. Guarda los cambios.');
        styleEditorModal.classList.add('hidden');
        savedSelectionRange = null; // Clean up the stored range.
    }

    function addNewImagePlaceholder() {
        if (!isEditMode) return;
        const id = `image-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newItem = createAndAppendImageBlock(id, '', 'contain', 'Nuevo espacio', '', 'Modelo: C');
        const textEl = newItem.querySelector('.editable-text');
        if(textEl) {
            textEl.style.fontFamily = "'Poppins', sans-serif";
        }
        imageGrid.prepend(newItem);
        updateEditableStates();
        hasUnsavedChanges = true;
        showStatus('Nuevo espacio añadido. Guarda los cambios.');
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function enterEditMode() {
        if (isEditMode) return;
        const pwd = prompt('Contraseña para modo edición:');
        if (pwd === null) return;

        editModeButton.disabled = true;
        const ok = await checkPassword(pwd);
        editModeButton.disabled = false;

        if (ok) {
            isEditMode = true;
            body.classList.add('edit-mode');
            editControls.classList.remove('hidden');
            editControls.classList.add('flex');
            editModeButton.innerHTML = '<i class="ri-close-line ri-lg"></i>';
            applyImageLinks();
            updateEditableStates();
            showStatus('Modo edición activado.');
        } else {
            showStatus('Contraseña incorrecta.', true);
        }
    }

    function exitEditMode() {
        if (!isEditMode) return;
        if (hasUnsavedChanges && !confirm('Tienes cambios sin guardar. ¿Quieres salir de todas formas?')) {
            return;
        }
        isEditMode = false;
        body.classList.remove('edit-mode');
        editControls.classList.add('hidden');
        editControls.classList.remove('flex');
        editModeButton.innerHTML = '<i class="ri-pencil-line ri-lg"></i>';
        hasUnsavedChanges = false;
        applyImageLinks();
        updateEditableStates();
        showStatus('Modo edición desactivado.');
    }
    
    function updateEditableStates() {
        document.querySelectorAll('.editable-content, .editable-text').forEach(el => {
            el.contentEditable = isEditMode;
            if(isEditMode) {
                el.addEventListener('input', () => hasUnsavedChanges = true);
            }
        });
        document.querySelectorAll('.image-item').forEach(item => {
            item.draggable = isEditMode;
            item.classList.toggle('cursor-grab', isEditMode);
            const img = item.querySelector('img');
            if (img) {
                img.classList.toggle('cursor-pointer', !isEditMode);
            }
        });
    }

    async function saveContent() {
        if (!isEditMode) return;

        saveButton.disabled = true;
        saveButton.textContent = 'Guardando...';

        const data = {};
        const imageItems = Array.from(imageGrid.querySelectorAll('.image-item'));

        data['image-order'] = imageItems.map(item => item.querySelector('img[id]').id);

        imageItems.forEach(item => {
            const img = item.querySelector('img[id]');
            if (img) {
                const id = img.id;
                data[id] = img.getAttribute('src') || '';
                data[`${id}-fit`] = img.style.objectFit || 'cover';
                data[`${id}-link`] = img.dataset.imageLink || '';
                
                const textEl = item.querySelector(`#${id}-text`);
                if (textEl) {
                    data[`${id}-text`] = textEl.innerHTML;
                    data[`${id}-text-fontFamily`] = textEl.style.fontFamily || '';
                    data[`${id}-text-fontSize`] = textEl.style.fontSize || '';
                    data[`${id}-text-color`] = textEl.style.color || '';
                    data[`${id}-text-textAlign`] = textEl.style.textAlign || '';
                }
            }
        });
        
        document.querySelectorAll('.editable-content[id]').forEach(el => {
            data[el.id] = el.innerHTML;
            data[`${el.id}-fontFamily`] = el.style.fontFamily || '';
            data[`${el.id}-fontSize`] = el.style.fontSize || '';
            data[`${el.id}-color`] = el.style.color || '';
            data[`${el.id}-textAlign`] = el.style.textAlign || '';
        });

        try {
            const res = await fetch(SAVE_CONTENT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ content: data })
            });
            const r = await res.json();
            if (!res.ok) throw new Error(r.error || res.statusText);
            if (r.success) {
                hasUnsavedChanges = false;
                showStatus('¡Guardado con éxito!');
            } else {
                throw new Error(r.error || 'Error del servidor');
            }
        } catch (e) {
            showStatus('Error al guardar: ' + e.message, true);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Guardar Cambios';
        }
    }

    async function loadContent() {
        imageGrid.innerHTML = '';
        hasUnsavedChanges = false;
        try {
            const res = await fetch(`${LOAD_CONTENT_URL}?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(res.statusText);
            const txt = await res.text();
            if (!txt.trim() || txt === '{}') {
                return;
            }
            const d = JSON.parse(txt);
            
            const order = Array.isArray(d['image-order']) ? d['image-order'] : Object.keys(d).filter(k => !k.includes('-') && k.startsWith('image-'));

            order.forEach(id => {
                if (d[id] !== undefined) {
                    const newItem = createAndAppendImageBlock(id, d[id], d[`${id}-fit`], 'Imagen de galería', d[`${id}-link`], d[`${id}-text`]);
                    imageGrid.appendChild(newItem);

                    const textEl = newItem.querySelector(`#${id}-text`);
                    if (textEl) {
                        textEl.style.fontFamily = d[`${id}-text-fontFamily`] || '';
                        textEl.style.fontSize = d[`${id}-text-fontSize`] || '';
                        textEl.style.color = d[`${id}-text-color`] || '';
                        textEl.style.textAlign = d[`${id}-text-textAlign`] || '';
                    }
                }
            });

            document.querySelectorAll('.editable-content[id]').forEach(el => {
                if (d[el.id] !== undefined) {
                    el.innerHTML = d[el.id];
                    el.style.fontFamily = d[`${el.id}-fontFamily`] || '';
                    el.style.fontSize = d[`${el.id}-fontSize`] || '';
                    el.style.color = d[`${el.id}-color`] || '';
                    el.style.textAlign = d[`${el.id}-textAlign`] || '';
                }
            });

            applyImageLinks();
            updateEditableStates();
        } catch (e) {
            console.error("Error cargando contenido:", e);
            showStatus('Error al cargar la galería: ' + e.message, true);
        }
    }
    
    // --- INICIALIZACIÓN Y EVENTOS ---
    Object.keys(availableFonts).forEach(name => {
        const option = document.createElement('option');
        option.value = availableFonts[name];
        option.textContent = name;
        option.style.fontFamily = availableFonts[name];
        fontFamilySelect.appendChild(option);
    });
    loadContent();

    editModeButton.addEventListener('click', () => isEditMode ? exitEditMode() : enterEditMode());
    saveButton.addEventListener('click', saveContent);
    addImageButton.addEventListener('click', addNewImagePlaceholder);
    hiddenFileInput.addEventListener('change', handleFileSelected);
    applyStyleButton.addEventListener('click', applyStyles);
    cancelStyleButton.addEventListener('click', () => styleEditorModal.classList.add('hidden'));

    mainContent.addEventListener('click', e => {
        if (!isEditMode) return;

        const editBtn = e.target.closest('.image-edit-button');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.closest('.image-item')?.dataset.id;
            const action = editBtn.dataset.action;
            if(id && action) handleImageAction(id, action);
        }
        
        const styleBtn = e.target.closest('.edit-style-btn');
        if (styleBtn) {
            e.stopPropagation();
            openStyleEditor(styleBtn.dataset.targetElement);
        }
    });
    
    // --- DRAG AND DROP REORDERING ---
    let draggingElement = null;

    imageGrid.addEventListener('dragstart', e => {
        if (!isEditMode) return;
        const target = e.target.closest('.image-item');
        if (target) {
            draggingElement = target;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => draggingElement.classList.add('dragging'), 0);
        }
    });

    imageGrid.addEventListener('dragend', () => {
        if (draggingElement) {
            draggingElement.classList.remove('dragging');
            draggingElement = null;
        }
    });
    
    imageGrid.addEventListener('dragover', e => {
        e.preventDefault();
        if (!isEditMode || !draggingElement) return;
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.image-item');
        if (target && target !== draggingElement) {
            const rect = target.getBoundingClientRect();
            const isAfter = (e.clientX - rect.left) > rect.width / 2;
            
            if (isAfter) {
                target.parentNode.insertBefore(draggingElement, target.nextSibling);
            } else {
                target.parentNode.insertBefore(draggingElement, target);
            }
        }
    });
    
    imageGrid.addEventListener('drop', e => {
        e.preventDefault();
        if (draggingElement) {
            hasUnsavedChanges = true;
            showStatus('Orden de imágenes cambiado. Guarda los cambios.');
        }
    });


    window.addEventListener('beforeunload', e => {
        if (isEditMode && hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
        }
    });

    // --- LIGHTBOX FUNCTIONALITY ---
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxClose = document.getElementById('lightbox-close');

    function openLightbox(src) {
        if (!lightboxModal || !lightboxImage) return;
        lightboxImage.src = src;
        lightboxModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.add('hidden');
        lightboxImage.src = '';
        document.body.style.overflow = '';
    }

    if (imageGrid) {
        imageGrid.addEventListener('click', e => {
            if (isEditMode) return;
            if (e.target.closest('a')) return;

            const targetImg = e.target.closest('img');
            if (targetImg && targetImg.closest('.editable-image-container')) {
                const isPlaceholder = !targetImg.src || targetImg.src.includes('data:image/svg+xml');
                if (!isPlaceholder) {
                    e.preventDefault();
                    e.stopPropagation();
                    openLightbox(targetImg.src);
                }
            }
        });
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', e => {
            e.stopPropagation();
            closeLightbox();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && lightboxModal && !lightboxModal.classList.contains('hidden')) {
            closeLightbox();
        }
    });

});