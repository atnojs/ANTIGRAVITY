document.addEventListener('DOMContentLoaded', () => {
    let appData = {};
    let isEditMode = false;
    let isDragging = false;

    const dom = {
        grid: document.getElementById('apps-grid'),
        editBtn: document.getElementById('edit-mode-btn'),
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        footerText: document.getElementById('footer-text'),
        modalsContainer: document.getElementById('edit-modals-container'),
    };

    // --- CARGA INICIAL DE DATOS ---
    async function loadState() {
        try {
            const response = await fetch('load.php?t=' + new Date().getTime());
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            appData = await response.json();
            render();
        } catch (error) {
            console.error('Error fatal al cargar los datos:', error);
            alert('No se pudo cargar el contenido de la página. Asegúrate de que los archivos PHP están en el servidor y no hay errores.');
        }
    }

    // --- RENDERIZADO DEL CONTENIDO ---
    function render() {
        dom.headerTitle.textContent = appData.headerTitle || '';
        dom.headerSubtitle.textContent = appData.headerSubtitle || '';
        dom.footerText.innerHTML = appData.footerText || '';

        dom.grid.innerHTML = '';
        if (appData.apps && Array.isArray(appData.apps)) {
            appData.apps.forEach(app => {
                const card = createAppCard(app);
                dom.grid.appendChild(card);
            });
        }
        
        if (isEditMode) {
            const addButton = createAddButton();
            dom.grid.appendChild(addButton);
        }
    }

    function createAppCard(app) {
        const card = document.createElement('a');
        card.className = 'app-card';
        card.href = app.url;
        card.target = '_blank';
        card.dataset.id = app.id;
        card.style.backgroundImage = `url('${app.backgroundImageUrl}')`;

        card.innerHTML = `
            <div class="app-card-overlay">
                <div class="app-icon">${app.icon}</div>
                <div>
                    <h3>${app.title}</h3>
                    <p>${app.description}</p>
                </div>
            </div>
        `;

        if (isEditMode) {
            card.href = 'javascript:void(0)';
            const editButtons = document.createElement('div');
            editButtons.className = 'edit-buttons';
            editButtons.innerHTML = `
                <button class="edit-app-btn" title="Editar App"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-app-btn" title="Eliminar App"><i class="fa-solid fa-trash"></i></button>
            `;
            card.appendChild(editButtons);

            const buttons = editButtons.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.draggable = false;
            });

            editButtons.querySelector('.edit-app-btn').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                openAppForm('Editar Aplicación', app);
            });
            editButtons.querySelector('.delete-app-btn').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                deleteApp(app.id);
            });

            card.draggable = true;
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        }
        return card;
    }

    function createAddButton() {
        const addButton = document.createElement('div');
        addButton.id = 'add-new-app-btn';
        addButton.innerHTML = `
            <div class="add-app-content">
                <i class="fa-solid fa-plus"></i>
                <p>Añadir Nueva App</p>
            </div>
        `;
        addButton.addEventListener('click', () => {
            openAppForm('Añadir Nueva Aplicación');
        });
        return addButton;
    }
    
    // --- LÓGICA DE EDICIÓN ---
    function toggleEditMode() {
        isEditMode = !isEditMode;
        dom.editBtn.classList.toggle('active', isEditMode);
        
        if (!isEditMode) {
            saveState();
        } else {
            initDragAndDrop();
        }
        if (isEditMode === false) {
            destroyDragAndDrop();
        }
        render();
    }

    dom.editBtn.addEventListener('click', () => {
        if (!isEditMode) {
            openPasswordModal();
        } else {
            toggleEditMode();
        }
    });

    async function saveState() {
        const dataToSave = {
            password: sessionStorage.getItem('editorPassword'),
            ...appData
        };

        try {
            const response = await fetch('save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to save');
        } catch (error) {
            console.error('Error al guardar los cambios:', error);
            alert('ERROR: No se pudieron guardar los cambios. Revisa la consola del navegador para más detalles.');
        }
    }
    
    // --- MODALES Y FORMULARIOS ---
    function openPasswordModal() {
        const modalHTML = `
            <div class="modal-overlay" id="password-modal">
                <div class="modal-content">
                    <h2>Modo Edición</h2>
                    <div class="form-group">
                        <label for="password-input">Contraseña</label>
                        <input type="password" id="password-input">
                    </div>
                    <div class="form-buttons">
                        <button class="btn-cancel" id="cancel-password">Cancelar</button>
                        <button class="btn-save" id="submit-password">Activar</button>
                    </div>
                </div>
            </div>
        `;
        dom.modalsContainer.innerHTML = modalHTML;
        
        const passwordInput = document.getElementById('password-input');
        passwordInput.focus();

        document.getElementById('submit-password').addEventListener('click', async () => {
            const password = passwordInput.value;
            try {
                const formData = new FormData();
                formData.append('password', password);

                const response = await fetch('password.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    sessionStorage.setItem('editorPassword', password);
                    closeModal();
                    toggleEditMode();
                } else {
                    alert('Contraseña incorrecta.');
                }
            } catch (error) {
                console.error('Error de validación de contraseña:', error);
                alert('Error al contactar el servidor para validar la contraseña.');
            }
        });
        
        document.getElementById('cancel-password').addEventListener('click', closeModal);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('submit-password').click();
            }
        });
    }

    function openAppForm(title, app = {}) {
        const isEditing = !!app.id;
        const currentBg = app.backgroundImageUrl || '';
        const modalHTML = `
            <div class="modal-overlay" id="app-form-modal">
                <div class="modal-content">
                    <h2>${title}</h2>
                    <input type="hidden" id="app-id" value="${app.id || ''}">
                    <div class="form-group">
                        <label for="app-title">Título</label>
                        <input type="text" id="app-title" value="${app.title || ''}">
                    </div>
                    <div class="form-group">
                        <label for="app-description">Descripción</label>
                        <textarea id="app-description" rows="2">${app.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="app-url">URL de la App</label>
                        <input type="text" id="app-url" value="${app.url || ''}">
                    </div>
                    <div class="form-group">
                        <label for="app-icon">Icono (Emoji o HTML de FontAwesome)</label>
                        <input type="text" id="app-icon" value="${app.icon || ''}">
                    </div>
                    <div class="form-group">
                        <label for="app-bg-image">URL de Imagen de Fondo</label>
                        <input type="text" id="app-bg-image" value="${currentBg}">
                        
                        <label for="app-bg-upload" style="margin-top: 10px; display: block;">O subir una imagen:</label>
                        <input type="file" id="app-bg-upload" accept="image/*">
                        <img id="bg-preview" src="${currentBg}" style="${currentBg ? 'display:block;' : ''}">
                    </div>
                    <div class="form-buttons">
                        <button class="btn-cancel" id="cancel-app-form">Cancelar</button>
                        <button class="btn-save" id="save-app-form">Guardar</button>
                    </div>
                </div>
            </div>
        `;
        dom.modalsContainer.innerHTML = modalHTML;

        const bgImageInput = document.getElementById('app-bg-image');
        const bgUploadInput = document.getElementById('app-bg-upload');
        const bgPreview = document.getElementById('bg-preview');

        bgUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Image = e.target.result;
                    bgImageInput.value = base64Image; 
                    bgPreview.src = base64Image;
                    bgPreview.style.display = 'block';
                };
                reader.readAsDataURL(file); 
            }
        });
        
        document.getElementById('save-app-form').addEventListener('click', () => {
            const updatedApp = {
                id: document.getElementById('app-id').value || `app_${Date.now()}`,
                title: document.getElementById('app-title').value,
                description: document.getElementById('app-description').value,
                url: document.getElementById('app-url').value,
                icon: document.getElementById('app-icon').value,
                backgroundImageUrl: document.getElementById('app-bg-image').value, 
            };

            if (isEditing) {
                const index = appData.apps.findIndex(a => a.id === updatedApp.id);
                appData.apps[index] = updatedApp;
            } else {
                appData.apps.push(updatedApp);
            }
            closeModal();
            render();
        });

        document.getElementById('cancel-app-form').addEventListener('click', closeModal);
    }
    
    function deleteApp(appId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta aplicación?')) {
            appData.apps = appData.apps.filter(app => app.id !== appId);
            render();
        }
    }
    
    function closeModal() {
        dom.modalsContainer.innerHTML = '';
    }

    // --- DRAG & DROP NATIVO ---
    const handleDragStart = (e) => {
        isDragging = true;
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
        e.target.classList.add('draggable-ghost');
    };

    const handleDragEnd = (e) => {
        isDragging = false;
        e.target.classList.remove('draggable-ghost');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        const dragging = dom.grid.querySelector('.draggable-ghost');
        if (!dragging) return;

        const target = e.target.closest('.app-card');
        if (target && target !== dragging && target.id !== 'add-new-app-btn') {
            const rect = target.getBoundingClientRect();
            const next = (e.clientY - rect.top) / rect.height > 0.5;
            dom.grid.insertBefore(dragging, next ? target.nextSibling : target);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const target = e.target.closest('#add-new-app-btn');
        if (target) {
            const dragging = dom.grid.querySelector('.draggable-ghost');
            if (dragging) {
                target.before(dragging);
            }
        }
        updateAppOrder();
        saveState();
    };

    const handleAutoScroll = (e) => {
        if (!isDragging) return;
        const viewportHeight = window.innerHeight;
        const scrollZone = 80;
        const scrollSpeed = 15;
        if (e.clientY < scrollZone) {
            window.scrollBy(0, -scrollSpeed);
        } else if (e.clientY > viewportHeight - scrollZone) {
            window.scrollBy(0, scrollSpeed);
        }
    };

    function updateAppOrder() {
        const cards = dom.grid.querySelectorAll('.app-card');
        const newOrder = Array.from(cards).map(card => card.dataset.id);
        appData.apps = newOrder.map(id => appData.apps.find(app => app.id === id)).filter(app => app);
    }

    function initDragAndDrop() {
        dom.grid.addEventListener('dragover', handleDragOver);
        dom.grid.addEventListener('drop', handleDrop);
        document.addEventListener('dragover', handleAutoScroll);
    }

    function destroyDragAndDrop() {
        dom.grid.removeEventListener('dragover', handleDragOver);
        dom.grid.removeEventListener('drop', handleDrop);
        document.removeEventListener('dragover', handleAutoScroll);
    }

    // --- INICIALIZACIÓN ---
    loadState();
});