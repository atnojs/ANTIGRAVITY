/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎨 GALERÍA DE PROMPTS + GENERADOR DE IMÁGENES CON GEMINI
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DE FIREBASE
    // ═══════════════════════════════════════════════════════════════
    const firebaseConfig = {
        apiKey: "AIzaSyAlTZgodkiHACqJSRcDqymTdvaegBdLZMk",
        authDomain: "nanobanana-cbb2d.firebaseapp.com",
        projectId: "nanobanana-cbb2d",
        storageBucket: "nanobanana-cbb2d.firebasestorage.app",
        messagingSenderId: "490656740654",
        appId: "1:490656740654:web:104f76973c1254d5b876bf",
        measurementId: "G-8XK035PGTV"
    };
    
    // Inicializar Firebase (API tradicional)
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    
    // ═══════════════════════════════════════════════════════════════
    // ESTADO DE AUTENTICACIÓN
    // ═══════════════════════════════════════════════════════════════
    let currentUser = null;
    let isAuthReady = false;
    
    // ═══════════════════════════════════════════════════════════════
    // ESTADO DE LA APLICACIÓN
    // ═══════════════════════════════════════════════════════════════
    let appData = { background: '', panels: [], tools: [] };
    let isEditable = false;
    let draggedItem = null;
    let draggedPanel = null;
    let dragSourceArray = null;
    let activePanel = null;

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN - Usando proxy PHP
    // ═══════════════════════════════════════════════════════════════
    const PROXY_URL = 'proxy.php'; // Proxy PHP para Gemini
    const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'; // Nano Banana Pro - Modelo para generación de imágenes

    // ═══════════════════════════════════════════════════════════════
    // ELEMENTOS DEL DOM - Autenticación
    // ═══════════════════════════════════════════════════════════════
    const authModal = document.getElementById('auth-modal');
    const userAuthBtn = document.getElementById('user-auth-btn');
    const userAuthText = document.getElementById('user-auth-text');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authLoginBtn = document.getElementById('auth-login-btn');
    const authGoogleBtn = document.getElementById('auth-google-btn');
    const authLogoutBtn = document.getElementById('auth-logout-btn');
    const authError = document.getElementById('auth-error');
    const authLoginForm = document.getElementById('auth-login-form');
    const authUserInfo = document.getElementById('auth-user-info');
    const authUserPhoto = document.getElementById('auth-user-photo');
    const authUserInitial = document.getElementById('auth-user-initial');
    const authUserName = document.getElementById('auth-user-name');
    const authUserEmail = document.getElementById('auth-user-email');
    const authRegisterBtn = document.getElementById('auth-register-btn');
    const appContainer = document.getElementById('app-container');

    // ═══════════════════════════════════════════════════════════════
    // ELEMENTOS DEL DOM
    // ═══════════════════════════════════════════════════════════════
    const panelsContainer = document.getElementById('panels-container');
    const tilesGrid = document.getElementById('tiles-grid');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const fileInput = document.getElementById('form-file-input');
    const uploadPreview = document.getElementById('upload-preview');
    const formModal = document.getElementById('form-modal');

    // Generador
    const generatorModal = document.getElementById('generator-modal');
    const openGeneratorBtn = document.getElementById('open-generator-btn');
    const closeGeneratorBtn = document.getElementById('close-generator-btn');
    const genFileInput = document.getElementById('gen-file-input');
    const genPreview = document.getElementById('gen-preview');
    const genPromptInput = document.getElementById('gen-prompt-input');
    const genSubmitBtn = document.getElementById('gen-submit-btn');
    const genResults = document.getElementById('gen-results');
    const genLoading = document.getElementById('loading-overlay');
    const genUploadArea = document.getElementById('gen-upload-area');

    // Historial de imágenes generadas
    const historySection = document.getElementById('generated-history');
    const historyGrid = document.getElementById('history-grid');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    let generatedImages = []; // Array para mantener imágenes generadas

    let genBaseImage = null; // Base64 de la imagen subida
    let genContentImage = null; // Imagen de contenido única para Illusion Diffusion
    let genContainerOpacity = 50; // Opacidad del contenedor (0-100)
    let genContentOpacity = 50; // Opacidad del contenido (0-100)

    // ═══════════════════════════════════════════════════════════════
    // FUNCIONES DE AUTENTICACIÓN FIREBASE
    // ═══════════════════════════════════════════════════════════════

    function showAuthError(message) {
        authError.textContent = message;
        authError.classList.add('show');
        setTimeout(() => authError.classList.remove('show'), 5000);
    }

    function clearAuthError() {
        authError.textContent = '';
        authError.classList.remove('show');
    }

    function updateAuthUI(user) {
        currentUser = user;

        if (user) {
            // Usuario logueado - Mostrar app y ocultar modal
            appContainer.classList.remove('hidden');
            authModal.style.display = 'none';
            
            userAuthBtn.classList.add('logged-in');
            userAuthText.textContent = user.displayName || user.email || 'Usuario';

            // Mostrar info del usuario en el modal (cuando se abra)
            authLoginForm.classList.add('hidden');
            authUserInfo.classList.remove('hidden');

            // Actualizar avatar y nombre
            if (user.photoURL) {
                authUserPhoto.src = user.photoURL;
                authUserPhoto.style.display = 'block';
                authUserInitial.style.display = 'none';
            } else {
                authUserPhoto.style.display = 'none';
                authUserInitial.style.display = 'flex';
                authUserInitial.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            }

            authUserName.textContent = user.displayName || 'Usuario';
            authUserEmail.textContent = user.email || '';
        } else {
            // Usuario no logueado - Ocultar app y mostrar modal
            appContainer.classList.add('hidden');
            authModal.style.display = 'flex';
            
            userAuthBtn.classList.remove('logged-in');
            userAuthText.textContent = 'Acceder';

            // Mostrar formulario de login y ocultar info de usuario
            authLoginForm.classList.remove('hidden');
            authUserInfo.classList.add('hidden');
            
            // Limpiar campos
            authEmail.value = '';
            authPassword.value = '';
            clearAuthError();
            authUserInfo.classList.add('hidden');

            // Limpiar campos
            authEmail.value = '';
            authPassword.value = '';

            // Si estaba en modo edición, desactivarlo
            if (isEditable) {
                isEditable = false;
                render();
            }
        }
    }

    async function loginWithEmail() {
        const email = authEmail.value.trim();
        const password = authPassword.value;

        if (!email || !password) {
            showAuthError('Por favor, introduce email y contraseña');
            return;
        }

        clearAuthError();
        authLoginBtn.disabled = true;
        authLoginBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Entrando...';

        try {
            await auth.signInWithEmailAndPassword(email, password);
            authModal.style.display = 'none';
        } catch (error) {
            console.error('Error de login:', error);
            let errorMsg = 'Error al iniciar sesión';
            const errorCode = error.code || '';
            if (errorCode.includes('user-not-found')) {
                errorMsg = 'Usuario no encontrado';
            } else if (errorCode.includes('wrong-password')) {
                errorMsg = 'Contraseña incorrecta';
            } else if (errorCode.includes('invalid-email')) {
                errorMsg = 'Email inválido';
            } else if (errorCode.includes('too-many-requests')) {
                errorMsg = 'Demasiados intentos. Intenta más tarde';
            } else if (errorCode.includes('invalid-credential')) {
                errorMsg = 'Credenciales inválidas';
            }
            showAuthError(errorMsg);
        } finally {
            authLoginBtn.disabled = false;
            authLoginBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }

    async function registerWithEmail() {
        const email = authEmail.value.trim();
        const password = authPassword.value;

        if (!email || !password) {
            showAuthError('Por favor, introduce email y contraseña');
            return;
        }

        if (password.length < 6) {
            showAuthError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        clearAuthError();
        authRegisterBtn.disabled = true;
        authRegisterBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creando cuenta...';

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            // El usuario se creará y onAuthStateChanged se encargará de mostrar la app
        } catch (error) {
            console.error('Error de registro:', error);
            let errorMsg = 'Error al crear la cuenta';
            const errorCode = error.code || '';
            if (errorCode.includes('email-already-in-use')) {
                errorMsg = 'Este email ya está registrado';
            } else if (errorCode.includes('invalid-email')) {
                errorMsg = 'Email inválido';
            } else if (errorCode.includes('weak-password')) {
                errorMsg = 'Contraseña débil. Usa al menos 6 caracteres';
            }
            showAuthError(errorMsg);
        } finally {
            authRegisterBtn.disabled = false;
            authRegisterBtn.innerHTML = '<i class="fa fa-user-plus"></i> Crear Cuenta';
        }
    }

    async function loginWithGoogle() {
        clearAuthError();
        authGoogleBtn.disabled = true;
        authGoogleBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Conectando...';

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            // Forzar a mostrar el selector de cuentas siempre
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            await auth.signInWithPopup(provider);
            // onAuthStateChanged se encargará de mostrar la app
        } catch (error) {
            console.error('Error de login con Google:', error);
            let errorMsg = 'Error al iniciar sesión con Google';
            const errorCode = error.code || '';
            if (errorCode.includes('popup-closed-by-user')) {
                errorMsg = 'Ventana cerrada. Intenta de nuevo';
            } else if (errorCode.includes('popup-blocked')) {
                errorMsg = 'El navegador bloqueó la ventana emergente';
            } else if (errorCode.includes('unauthorized-domain')) {
                errorMsg = 'Dominio no autorizado en Firebase. Añade este dominio en la consola de Firebase.';
            }
            showAuthError(errorMsg);
        } finally {
            authGoogleBtn.disabled = false;
            authGoogleBtn.innerHTML = '<i class="fa fa-google"></i> Continuar con Google';
        }
    }

    async function logout() {
        try {
            await auth.signOut();
            // No ocultar el modal aquí, onAuthStateChanged se encargará de mostrarlo
            // porque currentUser será null y updateAuthUI mostrará el modal
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showAuthError('Error al cerrar sesión');
        }
    }

    // Observador de estado de autenticación
    auth.onAuthStateChanged((user) => {
        isAuthReady = true;
        updateAuthUI(user);
        console.log('Estado de auth:', user ? `Logueado: ${user.email}` : 'No logueado');
    });

    // Event listeners de autenticación
    userAuthBtn.onclick = () => {
        clearAuthError();
        authModal.style.display = 'flex';
    };

    authLoginBtn.onclick = loginWithEmail;
    authRegisterBtn.onclick = registerWithEmail;
    authGoogleBtn.onclick = loginWithGoogle;
    authLogoutBtn.onclick = logout;

    authEmail.onkeypress = (e) => { if (e.key === 'Enter') loginWithEmail(); };
    authPassword.onkeypress = (e) => { if (e.key === 'Enter') loginWithEmail(); };

    // No permitir cerrar el modal haciendo clic fuera (autenticación obligatoria)
    authModal.onclick = (e) => {
        // Solo cerrar si el usuario está logueado (mostrando info de usuario)
        if (e.target === authModal && currentUser) {
            authModal.style.display = 'none';
            clearAuthError();
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════════

    // Preview de imagen al seleccionar archivo (formulario añadir)
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadPreview.src = ev.target.result;
                uploadPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            uploadPreview.style.display = 'none';
        }
    });

    // Preview de imagen en el generador
    genFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                genBaseImage = ev.target.result;
                genPreview.src = genBaseImage;
                genPreview.style.display = 'block';
                genUploadArea.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // CARGAR Y GUARDAR ESTADO
    // ═══════════════════════════════════════════════════════════════

    async function loadState() {
        try {
            // Intentar cargar desde PHP primero
            const response = await fetch('load_state.php?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                parseLoadedData(data);
            } else {
                throw new Error('PHP not available');
            }
        } catch (e) {
            // Fallback a localStorage
            console.log('Usando localStorage como fallback');
            const saved = localStorage.getItem('promptGalleryData');
            if (saved) {
                parseLoadedData(JSON.parse(saved));
            } else {
                // Datos de ejemplo
                appData = {
                    background: '',
                    panels: [
                        { id: 'p_1', title: 'Retratos', isOpen: true, tools: [] },
                        { id: 'p_2', title: 'Navidad', isOpen: true, tools: [] }
                    ],
                    tools: []
                };
            }
        }
        render();
    }

    function parseLoadedData(data) {
        const loadedTools = data?.columns?.[0]?.tools || [];
        const panels = [];
        const standaloneTools = [];

        loadedTools.forEach(item => {
            if (item.isPanelHeader) {
                panels.push({ id: item.id, title: item.name, isOpen: true, tools: item.tools || [] });
            } else {
                standaloneTools.push(item);
            }
        });

        appData = { background: data.background || '', panels, tools: standaloneTools };
    }

    async function saveState() {
        const unifiedTools = [];
        appData.panels.forEach(panel => {
            unifiedTools.push({ id: panel.id, name: panel.title, isPanelHeader: true, tools: panel.tools });
        });
        unifiedTools.push(...appData.tools);

        const payload = {
            password: '0', // Requerido por guardar_cambios.php
            background: appData.background,
            columns: [{ title: "Galeria", tools: unifiedTools }]
        };

        // Guardar en localStorage siempre (sin password)
        const localPayload = { background: payload.background, columns: payload.columns };
        localStorage.setItem('promptGalleryData', JSON.stringify(localPayload));

        // Intentar guardar en PHP
        try {
            const response = await fetch('guardar_cambios.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) {
                console.warn('Error al guardar en PHP:', result.error);
            }
        } catch (e) {
            console.log('PHP no disponible, guardado en localStorage');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERIZADO
    // ═══════════════════════════════════════════════════════════════

    function render() {
        panelsContainer.innerHTML = '';
        tilesGrid.innerHTML = '';

        // Botón especial "Sin Categoría" (Inicio)
        panelsContainer.appendChild(createUncategorizedButton());

        // Renderizar botones de categorías
        appData.panels.forEach(panel => {
            panelsContainer.appendChild(createCategoryButton(panel));
        });

        // Mostrar imágenes de la categoría activa o las sueltas
        if (activePanel) {
            const panel = appData.panels.find(p => p.id === activePanel);
            if (panel) {
                panel.tools.forEach(app => {
                    tilesGrid.appendChild(createCard(app, panel.tools, panel.id));
                });
            }
        } else {
            appData.tools.forEach(app => {
                tilesGrid.appendChild(createCard(app, appData.tools, null));
            });
        }

        document.body.classList.toggle('edit-mode', isEditable);
        editModeBtn.textContent = isEditable ? 'Finalizar Edición' : 'Editar Galería';
    }

    // ═══════════════════════════════════════════════════════════════
    // BOTONES DE CATEGORÍA
    // ═══════════════════════════════════════════════════════════════

    function createUncategorizedButton() {
        const btn = document.createElement('div');
        btn.className = `category-btn ${activePanel === null ? 'active' : ''} special-cat-btn`;

        btn.innerHTML = `
            <span class="category-title"><i class="fa fa-home"></i> Sin Categoría</span>
            <span class="category-count">${appData.tools.length}</span>
        `;

        // Click para ir a inicio
        btn.onclick = () => {
            activePanel = null;
            render();
        };

        // Drag & Drop para recibir imágenes
        if (isEditable) {
            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Solo aceptar si arrastramos una imagen (draggedItem) y NO viene ya de "tools" (activePanel !== null)
                // O incluso si viene de tools, no pasa nada, pero lo lógico es mover entre categorías.
                if (draggedItem) {
                    btn.classList.add('drag-over');
                }
            });

            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
            });

            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over');

                if (!draggedItem) return;

                // Si la imagen viene de una categoría específica (dragSourceArray != appData.tools)
                if (dragSourceArray && dragSourceArray !== appData.tools) {
                    // Quitar del origen
                    const idx = dragSourceArray.indexOf(draggedItem);
                    if (idx > -1) {
                        dragSourceArray.splice(idx, 1);
                        // Añadir a "sin categoría"
                        appData.tools.push(draggedItem);

                        // Si estábamos viendo la categoría origen, re-renderizar para actualizar
                        render();
                        saveState();
                    }
                }
            });
        }

        return btn;
    }

    function createCategoryButton(panel) {
        const btn = document.createElement('div');
        btn.className = `category-btn ${activePanel === panel.id ? 'active' : ''}`;
        btn.draggable = isEditable;

        btn.innerHTML = `
            <span class="category-title">${panel.title}</span>
            <span class="category-count">${panel.tools.length}</span>
            <div class="category-edit-buttons">
                <button class="edit-cat-btn"><i class="fa fa-pencil"></i></button>
                <button class="add-img-cat"><i class="fa fa-plus"></i></button>
                <button class="del-cat-btn"><i class="fa fa-trash"></i></button>
            </div>
        `;

        // Click para mostrar imágenes de la categoría
        btn.onclick = (e) => {
            if (e.target.closest('.category-edit-buttons')) return;
            activePanel = activePanel === panel.id ? null : panel.id;
            render();
        };

        // Drag para reordenar categorías
        if (isEditable) {
            btn.addEventListener('dragstart', (e) => {
                draggedPanel = panel;
                btn.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            btn.addEventListener('dragend', () => {
                btn.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedPanel = null;
                saveState();
            });
            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedPanel && !draggedItem) {
                    btn.classList.add('drag-over');
                }
            });
            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
            });
            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over');
                if (!draggedPanel || draggedItem) return;
                const fromIndex = appData.panels.indexOf(draggedPanel);
                const toIndex = appData.panels.indexOf(panel);
                if (fromIndex !== toIndex) {
                    appData.panels.splice(fromIndex, 1);
                    appData.panels.splice(toIndex, 0, draggedPanel);
                    render();
                }
            });

            // Editar título
            btn.querySelector('.edit-cat-btn').onclick = (e) => {
                e.stopPropagation();
                const newTitle = prompt('Nuevo nombre de categoría:', panel.title);
                if (newTitle && newTitle.trim()) {
                    panel.title = newTitle.trim();
                    render();
                    saveState();
                }
            };

            // Añadir imagen a categoría
            btn.querySelector('.add-img-cat').onclick = (e) => {
                e.stopPropagation();
                openForm(null, panel.tools, panel.id);
            };

            // Eliminar categoría
            btn.querySelector('.del-cat-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm('¿Borrar categoría "' + panel.title + '"?')) {
                    appData.panels = appData.panels.filter(p => p.id !== panel.id);
                    if (activePanel === panel.id) activePanel = null;
                    render();
                    saveState();
                }
            };
        }

        return btn;
    }

    // ═══════════════════════════════════════════════════════════════
    // CARDS (IMÁGENES CON PROMPTS)
    // ═══════════════════════════════════════════════════════════════

    function createCard(app, sourceArray, panelId) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tile-wrap';
        wrapper.draggable = isEditable;

        // Escapar el prompt para usarlo en atributos
        const escapedPrompt = (app.briefDescription || '').replace(/"/g, '&quot;');

        wrapper.innerHTML = `
            <div class="tile-card">
                <div class="item-edit-buttons">
                    <button class="edit-btn"><i class="fa fa-pencil"></i></button>
                    <button class="del-btn"><i class="fa fa-trash"></i></button>
                </div>
                <div class="image-container">
                    <img src="${app.websiteUrl}" alt="${app.name}">
                </div>
                <div class="card-content">
                    <div class="tile-title">${app.name}</div>
                    <button class="use-prompt-btn" data-prompt="${escapedPrompt}">
                        <i class="fa fa-wand-magic-sparkles"></i> Usar para Generar
                    </button>
                </div>
            </div>
        `;

        // Eventos Drag para Imágenes
        if (isEditable) {
            wrapper.addEventListener('dragstart', (e) => {
                draggedItem = app;
                dragSourceArray = sourceArray;
                wrapper.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.stopPropagation();
            });
            wrapper.addEventListener('dragend', () => {
                wrapper.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedItem = null;
                dragSourceArray = null;
                saveState();
            });
            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && dragSourceArray === sourceArray) {
                    wrapper.classList.add('drag-over');
                }
            });
            wrapper.addEventListener('dragleave', () => {
                wrapper.classList.remove('drag-over');
            });
            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapper.classList.remove('drag-over');
                if (!draggedItem || dragSourceArray !== sourceArray) return;
                const fromIndex = sourceArray.indexOf(draggedItem);
                const toIndex = sourceArray.indexOf(app);
                if (fromIndex !== toIndex) {
                    sourceArray.splice(fromIndex, 1);
                    sourceArray.splice(toIndex, 0, draggedItem);
                    render();
                }
            });
        }

        // Click en imagen para visor
        wrapper.querySelector('.image-container').onclick = () => {
            if (isEditable) return;
            const viewer = document.getElementById('image-viewer');
            const fullImg = document.getElementById('full-image');
            fullImg.src = app.websiteUrl;
            viewer.style.display = "flex";
        };

        // Usar para generar
        wrapper.querySelector('.use-prompt-btn').onclick = (e) => {
            const promptText = e.currentTarget.getAttribute('data-prompt');
            openGenerator(promptText);
        };

        // Botones de edición
        if (isEditable) {
            wrapper.querySelector('.edit-btn').onclick = () => openForm(app, sourceArray, panelId);
            wrapper.querySelector('.del-btn').onclick = () => {
                if (confirm('¿Borrar imagen?')) {
                    sourceArray.splice(sourceArray.indexOf(app), 1);
                    render();
                    saveState();
                }
            };
        }

        return wrapper;
    }

    // ═══════════════════════════════════════════════════════════════
    // MODAL FORMULARIO AÑADIR/EDITAR
    // ═══════════════════════════════════════════════════════════════

    function openForm(app = null, sourceArray = null, panelId = null) {
        document.getElementById('editing-id').value = app ? app.id : '';
        document.getElementById('editing-panel-id').value = panelId || '';
        document.getElementById('form-title-input').value = app ? app.name : '';
        document.getElementById('form-url-input').value = app ? app.websiteUrl : '';
        document.getElementById('form-desc-input').value = app ? app.briefDescription : '';
        uploadPreview.style.display = 'none';
        uploadPreview.src = '#';
        fileInput.value = '';
        formModal.style.display = 'flex';
        document.getElementById('form-title-input').focus();
    }

    document.getElementById('form-save-btn').onclick = async () => {
        let imageUrl = document.getElementById('form-url-input').value;

        // Si hay archivo, intentar subir
        if (fileInput.files.length > 0) {
            try {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);
                const uploadRes = await fetch('upload.php', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadData.success) imageUrl = uploadData.url;
            } catch (e) {
                // Si falla PHP, usar base64
                imageUrl = uploadPreview.src;
            }
        }

        const id = document.getElementById('editing-id').value || 'img_' + Date.now();
        const panelId = document.getElementById('editing-panel-id').value;
        const newItem = {
            id,
            name: document.getElementById('form-title-input').value || 'Sin título',
            websiteUrl: imageUrl || 'https://via.placeholder.com/300',
            briefDescription: document.getElementById('form-desc-input').value
        };

        const target = panelId ? appData.panels.find(p => p.id === panelId).tools : appData.tools;
        const idx = target.findIndex(t => t.id === id);
        if (idx > -1) target[idx] = newItem; else target.push(newItem);

        formModal.style.display = 'none';
        render();
        saveState();
    };

    document.getElementById('form-cancel-btn').onclick = () => formModal.style.display = 'none';

    // ═══════════════════════════════════════════════════════════════
    // MODO EDICIÓN (Con contraseña)
    // ═══════════════════════════════════════════════════════════════

    const passwordModal = document.getElementById('password-modal');
    const passwordInput = document.getElementById('admin-password-input');

    editModeBtn.onclick = () => {
        if (isEditable) {
            // Salir del modo edición
            isEditable = false;
            render();
        } else {
            // Verificar autenticación de Firebase primero
            if (!currentUser) {
                // No está autenticado, mostrar modal de login
                clearAuthError();
                authModal.style.display = 'flex';
                return;
            }
            // Mostrar modal de contraseña para verificación adicional
            passwordModal.style.display = 'flex';
            setTimeout(() => passwordInput.focus(), 100);
        }
    };

    const handleLogin = async () => {
        const pass = passwordInput.value;

        try {
            // Intentar validar con PHP
            const fd = new FormData();
            fd.append('password', pass);
            const r = await fetch('validar_password.php', { method: 'POST', body: fd });
            const res = await r.json();

            if (res.success) {
                isEditable = true;
                passwordModal.style.display = 'none';
                passwordInput.value = '';
                render();
            } else {
                alert('Contraseña incorrecta');
            }
        } catch (e) {
            // Fallback: contraseña local (cambiar por la tuya)
            const LOCAL_PASSWORD = '0'; // ⚠️ Cambia esto por tu contraseña
            if (pass === LOCAL_PASSWORD) {
                isEditable = true;
                passwordModal.style.display = 'none';
                passwordInput.value = '';
                render();
            } else {
                alert('Contraseña incorrecta');
            }
        }
    };

    document.getElementById('submit-password-btn').onclick = handleLogin;
    passwordInput.onkeypress = (e) => { if (e.key === 'Enter') handleLogin(); };
    document.getElementById('cancel-password-btn').onclick = () => {
        passwordModal.style.display = 'none';
        passwordInput.value = '';
    };

    // ═══════════════════════════════════════════════════════════════
    // VISOR DE IMAGEN
    // ═══════════════════════════════════════════════════════════════

    document.getElementById('image-viewer').onclick = () => {
        document.getElementById('image-viewer').style.display = "none";
    };

    // ═══════════════════════════════════════════════════════════════
    // AÑADIR CATEGORÍA / IMAGEN
    // ═══════════════════════════════════════════════════════════════

    document.getElementById('add-panel-btn').onclick = () => {
        const name = prompt('Nombre de la categoría:');
        if (name) {
            appData.panels.push({ id: 'p_' + Date.now(), title: name, isOpen: true, tools: [] });
            render();
            saveState();
        }
    };

    document.getElementById('add-item-btn').onclick = () => {
        if (activePanel) {
            const panel = appData.panels.find(p => p.id === activePanel);
            openForm(null, panel.tools, activePanel);
        } else {
            openForm(null, appData.tools, null);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // GENERADOR DE IMÁGENES CON GEMINI
    // ═══════════════════════════════════════════════════════════════

    // Variable para detectar modo Illusion Diffusion
    let isIllusionMode = false;

    function openGenerator(prompt = '') {
        genPromptInput.value = prompt;
        genBaseImage = null;
        genPreview.style.display = 'none';
        genUploadArea.style.display = 'flex';
        genFileInput.value = '';

        // Detectar si es modo Illusion Diffusion basado en el prompt
        isIllusionMode = prompt.toLowerCase().includes('illusion') ||
            prompt.toLowerCase().includes('silhouette container') ||
            prompt.toLowerCase().includes('silueta');

        resetResults();
        generatorModal.style.display = 'flex';
    }

    function resetResults() {
        genContentImage = null;
        genContainerOpacity = 50;
        genContentOpacity = 50;
        genResults.innerHTML = '';

        if (isIllusionMode) {
            // Crear un único placeholder para subir imagen de contenido
            const placeholder = document.createElement('div');
            placeholder.className = 'gen-result-placeholder illusion-uploader';
            placeholder.style.cssText = 'grid-column: 1 / -1; min-height: 300px; flex-direction: column; gap: 15px;';
            setupIllusionPlaceholder(placeholder);
            genResults.appendChild(placeholder);
        } else {
            // Modo normal: mostrar 2 placeholders vacíos para resultados
            [0, 1].forEach(idx => {
                const placeholder = document.createElement('div');
                placeholder.className = 'gen-result-placeholder';
                placeholder.dataset.index = idx;
                setupResultPlaceholder(placeholder, idx);
                genResults.appendChild(placeholder);
            });
        }

        genLoading.classList.add('hidden');
    }

    // Placeholder para resultados (modo normal)
    function setupResultPlaceholder(el, idx) {
        el.innerHTML = `
            <i class="fa fa-image" style="font-size: 2rem; opacity: 0.5;"></i>
            <span style="opacity: 0.6;">Resultado ${idx + 1}</span>
        `;
        el.onclick = null;
    }

    // Placeholder para modo Illusion Diffusion
    function setupIllusionPlaceholder(el) {
        if (genContentImage) {
            // Mostrar preview de fusión + sliders
            el.innerHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: 20px; width: 100%; align-items: flex-start; justify-content: center;">
                    <!-- Preview de la fusión -->
                    <div style="flex: 1; min-width: 280px; max-width: 400px;">
                        <canvas id="illusion-canvas" style="width: 100%; border-radius: 12px; background: white;"></canvas>
                        <button class="remove-content-btn" style="margin-top: 10px; padding: 8px 16px; background: rgba(239,68,68,0.8); color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-left: auto; margin-right: auto;">
                            <i class="fa fa-times"></i> Quitar imagen
                        </button>
                    </div>
                    
                    <!-- Sliders de opacidad -->
                    <div style="flex: 1; min-width: 200px; max-width: 300px; display: flex; flex-direction: column; gap: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 12px;">
                        <h4 style="margin: 0; color: #fff; font-size: 0.9rem; text-align: center;">🎛️ Control de Transparencia</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-size: 0.8rem; color: #ccc; display: flex; justify-content: space-between;">
                                <span>Contenedor (silueta):</span>
                                <span id="val-container">${genContainerOpacity}%</span>
                            </label>
                            <input type="range" min="0" max="100" value="${genContainerOpacity}" id="slider-container" style="width: 100%; cursor: pointer; accent-color: #8b5cf6;">
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <label style="font-size: 0.8rem; color: #ccc; display: flex; justify-content: space-between;">
                                <span>Imagen interior:</span>
                                <span id="val-content">${genContentOpacity}%</span>
                            </label>
                            <input type="range" min="0" max="100" value="${genContentOpacity}" id="slider-content" style="width: 100%; cursor: pointer; accent-color: #06b6d4;">
                        </div>
                        
                        <p style="font-size: 0.7rem; color: #888; margin: 0; text-align: center;">
                            Ajusta los sliders para conseguir el efecto deseado
                        </p>
                    </div>
                </div>
            `;
            el.onclick = null;

            // Evento borrar
            el.querySelector('.remove-content-btn').onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                genContentImage = null;
                setupIllusionPlaceholder(el);
            };

            // Eventos sliders
            const sliderContainer = el.querySelector('#slider-container');
            const sliderContent = el.querySelector('#slider-content');
            const valContainer = el.querySelector('#val-container');
            const valContent = el.querySelector('#val-content');

            const updatePreview = () => {
                renderIllusionCanvas();
            };

            sliderContainer.oninput = (e) => {
                genContainerOpacity = parseInt(e.target.value);
                valContainer.textContent = genContainerOpacity + '%';
                updatePreview();
            };

            sliderContent.oninput = (e) => {
                genContentOpacity = parseInt(e.target.value);
                valContent.textContent = genContentOpacity + '%';
                updatePreview();
            };

            // Renderizar el canvas inicial
            setTimeout(() => renderIllusionCanvas(), 50);

        } else {
            // Mostrar estado vacío (upload)
            el.innerHTML = `
                <i class="fa fa-cloud-upload" style="font-size: 3rem; opacity: 0.7;"></i>
                <span style="font-size: 1.1rem;">Subir imagen de contenido</span>
                <span style="font-size: 0.8rem; opacity: 0.6;">Esta imagen aparecerá DENTRO de la silueta</span>
                <input type="file" accept="image/*" style="display:none">
            `;
            const input = el.querySelector('input');

            input.onclick = (e) => e.stopPropagation();
            el.onclick = () => input.click();

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        genContentImage = ev.target.result;
                        setupIllusionPlaceholder(el);
                    };
                    reader.readAsDataURL(file);
                }
            };
        }
    }

    // Renderizar la fusión Illusion Diffusion en un canvas
    function renderIllusionCanvas() {
        const canvas = document.getElementById('illusion-canvas');
        if (!canvas || !genBaseImage || !genContentImage) return;

        const ctx = canvas.getContext('2d');
        const containerImg = new Image();
        const contentImg = new Image();
        let loadedCount = 0;

        const onLoad = () => {
            loadedCount++;
            if (loadedCount < 2) return;

            // Usar dimensiones del contenedor
            const width = containerImg.naturalWidth;
            const height = containerImg.naturalHeight;
            canvas.width = width;
            canvas.height = height;

            // 1. Fondo blanco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // 2. Crear máscara de la silueta (basado en el contenedor)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');

            // Dibujar contenedor para análisis
            tempCtx.drawImage(containerImg, 0, 0, width, height);
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Crear máscara: píxeles oscuros = silueta, claros = fondo
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext('2d');
            const maskData = maskCtx.createImageData(width, height);

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;

                // Umbral: píxeles más oscuros que 240 se consideran parte de la silueta
                const isInSilhouette = brightness < 240;

                maskData.data[i] = 0;
                maskData.data[i + 1] = 0;
                maskData.data[i + 2] = 0;
                maskData.data[i + 3] = isInSilhouette ? 255 : 0;
            }
            maskCtx.putImageData(maskData, 0, 0);

            // 3. Dibujar imagen de contenido recortada por la máscara
            ctx.save();
            ctx.globalAlpha = genContentOpacity / 100;

            // Crear patrón de recorte usando la máscara
            const contentCanvas = document.createElement('canvas');
            contentCanvas.width = width;
            contentCanvas.height = height;
            const contentCtx = contentCanvas.getContext('2d');

            // Dibujar contenido escalado para cubrir todo el canvas
            const scaleX = width / contentImg.naturalWidth;
            const scaleY = height / contentImg.naturalHeight;
            const scale = Math.max(scaleX, scaleY);
            const scaledWidth = contentImg.naturalWidth * scale;
            const scaledHeight = contentImg.naturalHeight * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;

            contentCtx.drawImage(contentImg, offsetX, offsetY, scaledWidth, scaledHeight);

            // Aplicar máscara al contenido
            contentCtx.globalCompositeOperation = 'destination-in';
            contentCtx.drawImage(maskCanvas, 0, 0);

            ctx.drawImage(contentCanvas, 0, 0);
            ctx.restore();

            // 4. Superponer el contenedor con opacidad
            ctx.save();
            ctx.globalAlpha = genContainerOpacity / 100;

            // Dibujar contenedor sobre la silueta
            const containerCanvas = document.createElement('canvas');
            containerCanvas.width = width;
            containerCanvas.height = height;
            const containerCtx = containerCanvas.getContext('2d');
            containerCtx.drawImage(containerImg, 0, 0, width, height);
            containerCtx.globalCompositeOperation = 'destination-in';
            containerCtx.drawImage(maskCanvas, 0, 0);

            ctx.drawImage(containerCanvas, 0, 0);
            ctx.restore();
        };

        containerImg.onload = onLoad;
        contentImg.onload = onLoad;
        containerImg.src = genBaseImage;
        contentImg.src = genContentImage;
    }

    if (openGeneratorBtn) openGeneratorBtn.onclick = () => openGenerator();
    closeGeneratorBtn.onclick = () => {
        generatorModal.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Click fuera del modal para cerrar
    generatorModal.onclick = (e) => {
        if (e.target === generatorModal) {
            generatorModal.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // FUSIÓN DE CAPAS CON CANVAS (No IA)
    // ═══════════════════════════════════════════════════════════════



    // ═══════════════════════════════════════════════════════════════
    // LLAMADA A GEMINI API
    // ═══════════════════════════════════════════════════════════════

    genSubmitBtn.onclick = async () => {
        const prompt = genPromptInput.value.trim();

        if (!prompt) {
            alert('Por favor, introduce un prompt');
            return;
        }

        if (!genBaseImage) {
            alert('Por favor, sube una imagen base');
            return;
        }

        // Modo Illusion: generar fusión con Canvas (sin IA)
        if (isIllusionMode && genContentImage) {
            genSubmitBtn.disabled = true;
            genSubmitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> PROCESANDO...';

            try {
                // Obtener la imagen fusionada del canvas
                const canvas = document.getElementById('illusion-canvas');
                if (canvas) {
                    const imageData = canvas.toDataURL('image/png');

                    // Añadir al historial
                    addToHistory(imageData);

                    // Mostrar resultado
                    genResults.innerHTML = '';
                    const resultItem = document.createElement('div');
                    resultItem.className = 'gen-result-item';
                    resultItem.style.cssText = 'grid-column: 1 / -1; max-width: 500px; margin: 0 auto;';
                    resultItem.innerHTML = `
                        <img src="${imageData}" alt="Illusion Diffusion">
                        <button class="delete-btn">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="download-btn" data-src="${imageData}">
                            <i class="fa fa-download"></i>
                        </button>
                    `;

                    // Click en imagen para ver en grande
                    resultItem.querySelector('img').onclick = () => {
                        const viewer = document.getElementById('image-viewer');
                        const fullImg = document.getElementById('full-image');
                        fullImg.src = imageData;
                        viewer.style.display = 'flex';
                    };

                    // Botón descargar
                    resultItem.querySelector('.download-btn').onclick = (e) => {
                        e.stopPropagation();
                        downloadImage(imageData, `illusion_diffusion_${Date.now()}.png`);
                    };

                    // Botón eliminar
                    resultItem.querySelector('.delete-btn').onclick = (e) => {
                        e.stopPropagation();
                        resultItem.remove();
                    };

                    genResults.appendChild(resultItem);
                }
            } catch (error) {
                console.error('Error generando Illusion:', error);
                alert('Error al generar la imagen: ' + error.message);
            } finally {
                genSubmitBtn.disabled = false;
                genSubmitBtn.innerHTML = '<i class="fa fa-wand-magic-sparkles"></i> Generar';
            }
            return;
        }

        // Modo normal: llamar a Gemini API
        genResults.innerHTML = '';
        genLoading.classList.remove('hidden');
        genSubmitBtn.disabled = true;

        try {
            try {
                // Generar 2 imágenes con IA
                const results = await Promise.all([
                    generateWithGemini(prompt, genBaseImage, [], []),
                    generateWithGemini(prompt + " (variación creativa)", genBaseImage, [], [])
                ]);

                genLoading.classList.add('hidden');
                genResults.innerHTML = '';

                results.forEach((imageData, index) => {
                    if (imageData) {
                        // Añadir al historial persistente
                        addToHistory(imageData);

                        const resultItem = document.createElement('div');
                        resultItem.className = 'gen-result-item';
                        resultItem.innerHTML = `
                        <img src="${imageData}" alt="Generada ${index + 1}">
                        <button class="delete-btn" data-index="${index}">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button class="download-btn" data-src="${imageData}" data-index="${index + 1}">
                            <i class="fa fa-download"></i>
                        </button>
                    `;

                        // Click en imagen para ver en grande
                        resultItem.querySelector('img').onclick = () => {
                            const viewer = document.getElementById('image-viewer');
                            const fullImg = document.getElementById('full-image');
                            fullImg.src = imageData;
                            viewer.style.display = 'flex';
                        };

                        // Botón descargar
                        resultItem.querySelector('.download-btn').onclick = (e) => {
                            e.stopPropagation();
                            const src = e.currentTarget.getAttribute('data-src');
                            const idx = e.currentTarget.getAttribute('data-index');
                            downloadImage(src, `generada_${idx}_${Date.now()}.jpg`);
                        };

                        // Botón eliminar del modal
                        resultItem.querySelector('.delete-btn').onclick = (e) => {
                            e.stopPropagation();
                            resultItem.remove();
                        };

                        genResults.appendChild(resultItem);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'gen-result-placeholder';
                        placeholder.innerHTML = `<i class="fa fa-exclamation-triangle"></i><span>Error</span>`;
                        genResults.appendChild(placeholder);
                    }
                });

            } catch (error) {
                console.error('Error generando:', error);
                genLoading.classList.add('hidden');
                genResults.innerHTML = `
                <div class="gen-result-placeholder" style="grid-column: 1/-1; color: #f87171;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>Error al generar: ${error.message}</span>
                </div>
            `;
            }
        } catch (outerError) {
            console.error("Critical Error", outerError);
            genLoading.classList.add('hidden');
        } finally {
            genSubmitBtn.disabled = false;
        }
    };

    async function generateWithGemini(prompt, baseImage, contentImagesArray = [], strengthsArray = []) {
        let finalPrompt = prompt;
        const parts = [];

        // Lógica de Prompt para Illusion Diffusion (Si hay imágenes de contenido)
        if (contentImagesArray && contentImagesArray.length > 0) {

            // Construir descripción de inputs
            let inputDesc = "";
            contentImagesArray.forEach((_, idx) => {
                inputDesc += `- INPUT ${idx + 2} (Content Image ${idx + 1}): Opacity/Influence ${strengthsArray[idx] || 80}%.\n`;
            });

            finalPrompt = `DOUBLE EXPOSURE / ILLUSION DIFFUSION COMPOSITION

**CRITICAL: IMAGE ROLES - DO NOT INVENT OR MODIFY**
- IMAGE 1 is your SILHOUETTE SOURCE. Use EXACTLY the outline/shape of the subject in IMAGE 1. Do NOT create or invent a different silhouette.
- IMAGE 2${contentImagesArray.length > 1 ? ' and IMAGE 3' : ''}: OVERLAY content to blend on top.

STEP-BY-STEP PROCESS:
1. Look at IMAGE 1 - identify the main subject (person, object, etc.)
2. Extract the EXACT silhouette/outline of that subject from IMAGE 1 - do NOT invent a different shape
3. The silhouette boundary comes from IMAGE 1's actual content
4. Fill the inside with IMAGE 1's content but HEAVILY BLURRED
5. Place IMAGE 2${contentImagesArray.length > 1 ? ' and IMAGE 3' : ''} on top, blending naturally inside the silhouette

**NON-NEGOTIABLE RULES:**
- The silhouette shape MUST match IMAGE 1's subject exactly
- Do NOT create a generic or invented silhouette shape
- PURE WHITE background outside the silhouette - nothing visible
- **NEGATIVE SPACES MUST BE WHITE**: Any gaps or holes in the silhouette (space between arms and torso, between legs, etc.) must be PURE WHITE, not filled with content
- All content clipped at the silhouette edges - including internal gaps

STYLE:
- Dreamy, ethereal double exposure effect
- Clean, PURE WHITE exterior
- Cool color palette inside
- Professional editorial photography finish

USER STYLE: ${prompt}`;

            parts.push({ text: finalPrompt });

            // 1. Imagen Base (Contenedor)
            const base64Data = baseImage.split(',')[1];
            const mimeType = baseImage.match(/data:(.*?);/)?.[1] || 'image/jpeg';
            parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });

            // 2. Imágenes de Contenido (Loop)
            contentImagesArray.forEach(img => {
                const contentBase64 = img.split(',')[1];
                const contentMime = img.match(/data:(.*?);/)?.[1] || 'image/jpeg';
                parts.push({ inlineData: { mimeType: contentMime, data: contentBase64 } });
            });

        } else {
            // Lógica Standard (Solo base + prompt)
            parts.push({ text: prompt });

            const base64Data = baseImage.split(',')[1];
            const mimeType = baseImage.match(/data:(.*?);/)?.[1] || 'image/jpeg';
            parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
        }

        // Usar formato 'contents' universal para el proxy
        const requestBody = {
            model: GEMINI_MODEL,
            contents: [{ parts: parts }],
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT']
            }
        };

        console.log('Request a Gemini:', JSON.stringify(requestBody).substring(0, 500) + '...');

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Extraer mensaje de error de la estructura de Google API
            const errorMsg = errorData?.error?.message
                || errorData?.error?.status
                || errorData?.error
                || errorData?.details
                || `Error HTTP ${response.status}`;
            throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        }

        const data = await response.json();
        console.log('Respuesta de Gemini:', JSON.stringify(data).substring(0, 1000));

        // Buscar la imagen en la respuesta
        const responseParts = data.candidates?.[0]?.content?.parts || [];
        for (const part of responseParts) {
            if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                return `data:${mime};base64,${part.inlineData.data}`;
            }
        }

        // Si no hay imagen, mostrar lo que devolvió la API
        const textResponse = responseParts.find(p => p.text)?.text || 'Sin respuesta de texto';
        console.error('Sin imagen. Respuesta de texto:', textResponse);
        throw new Error(`No se recibió imagen. API respondió: ${textResponse.substring(0, 200)}`);
    }

    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ═══════════════════════════════════════════════════════════════
    // HISTORIAL DE IMÁGENES GENERADAS
    // ═══════════════════════════════════════════════════════════════

    function addToHistory(imageData) {
        const id = 'gen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        generatedImages.push({ id, data: imageData });
        renderHistory();
    }

    function renderHistory() {
        if (generatedImages.length === 0) {
            historySection.style.display = 'none';
            return;
        }

        historySection.style.display = 'block';
        historyGrid.innerHTML = '';

        generatedImages.forEach((img) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <img src="${img.data}" alt="Generada">
                <div class="history-item-buttons">
                    <button class="delete-btn" data-id="${img.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                    <button class="download-btn" data-src="${img.data}">
                        <i class="fa fa-download"></i>
                    </button>
                </div>
            `;

            // Click en imagen para ver en grande
            item.querySelector('img').onclick = () => {
                const viewer = document.getElementById('image-viewer');
                const fullImg = document.getElementById('full-image');
                fullImg.src = img.data;
                viewer.style.display = 'flex';
            };

            // Botón descargar
            item.querySelector('.download-btn').onclick = (e) => {
                e.stopPropagation();
                downloadImage(img.data, `generada_${Date.now()}.jpg`);
            };

            // Botón eliminar
            item.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                removeFromHistory(img.id);
            };

            historyGrid.appendChild(item);
        });
    }

    function removeFromHistory(id) {
        generatedImages = generatedImages.filter(img => img.id !== id);
        renderHistory();
    }

    // Limpiar todo el historial
    clearHistoryBtn.onclick = () => {
        if (confirm('¿Eliminar todas las imágenes generadas?')) {
            generatedImages = [];
            renderHistory();
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INICIAR APLICACIÓN
    // ═══════════════════════════════════════════════════════════════

    loadState();
});

