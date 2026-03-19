/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎨 GALERÍA DE PROMPTS + GENERADOR DE IMÁGENES CON GEMINI
 * ═══════════════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════════════════════════════
    // ESTADO DE LA APLICACIÓN
    // ═══════════════════════════════════════════════════════════════
    let appData = { background: '', panels: [], tools: [] };
    let isEditable = false;
    let draggedItem = null;
    let draggedPanel = null;
    let dragSourceArray = null;
    let dragSourcePanelId = null; // ID del panel de origen para mover entre carpetas
    let activePanel = null;

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURACIÓN - Usando proxy PHP
    // ═══════════════════════════════════════════════════════════════
    const PROXY_URL = 'proxy.php'; // Proxy PHP para Gemini
    const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'; // Modelo con generación de imagen fiel

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
    const genLoading = document.getElementById('gen-loading');
    const genUploadArea = document.getElementById('gen-upload-area');

    // Historial de imágenes generadas
    const historySection = document.getElementById('generated-history');
    const historyGrid = document.getElementById('history-grid');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    let generatedImages = []; // Array para mantener imágenes generadas

    let genBaseImage = null; // Base64 de la imagen subida

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
                genPreview.src = ev.target.result;
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

        // Renderizar botones de categorías
        appData.panels.forEach(panel => {
            panelsContainer.appendChild(createCategoryButton(panel));
        });

        // Boton "Sin Categoría" (Drop Zone)
        if (isEditable) {
            const noCatBtn = document.createElement('div');
            noCatBtn.className = `category-btn no-category-drop ${activePanel === null ? 'active' : ''}`;
            noCatBtn.innerHTML = `
                <span class="category-title"><i class="fa fa-inbox"></i> Sin categoría</span>
                <span class="category-count">${appData.tools.length}</span>
            `;

            noCatBtn.onclick = () => {
                activePanel = null;
                render();
            };

            noCatBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedItem) {
                    noCatBtn.classList.add('drag-over');
                }
            });

            noCatBtn.addEventListener('dragleave', () => {
                noCatBtn.classList.remove('drag-over');
            });

            noCatBtn.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                noCatBtn.classList.remove('drag-over');

                if (draggedItem) {
                    // Mover a "Sin categoría" (appData.tools)
                    if (dragSourceArray) {
                        const index = dragSourceArray.indexOf(draggedItem);
                        if (index > -1) dragSourceArray.splice(index, 1);
                    }
                    appData.tools.push(draggedItem);

                    console.log('Drop en Sin categoría:', { draggedItem, dragSourcePanelId });

                    saveState();
                    render();
                }
            });

            panelsContainer.appendChild(noCatBtn);
        }

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

    function createCategoryButton(panel) {
        // ... (existing button creation code) ...
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

        // Drag para reordenar categorías Y recibir items
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
                e.stopPropagation(); // Importante para evitar conflictos

                // Caso 1: Arrastrando una imagen hacia esta categoría
                if (draggedItem && panel.id !== dragSourcePanelId) {
                    btn.classList.add('drag-over-category'); // Clase visual específica
                    e.dataTransfer.dropEffect = 'move';
                }
                // Caso 2: Reordenando categorías
                else if (draggedPanel && draggedPanel !== panel) {
                    btn.classList.add('drag-over');
                }
            });

            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
                btn.classList.remove('drag-over-category');
            });

            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.classList.remove('drag-over');
                btn.classList.remove('drag-over-category');

                // CASO A: Soltar una IMAGEN en la categoría
                if (draggedItem) {
                    // Solo mover si es distinto panel
                    // (Aunque si es el mismo, no pasa nada, pero evitamos recarga)
                    if (dragSourcePanelId !== panel.id) {
                        // 1. Quitar del origen
                        if (dragSourceArray) {
                            const idx = dragSourceArray.indexOf(draggedItem);
                            if (idx > -1) dragSourceArray.splice(idx, 1);
                        }
                        // 2. Añadir destino
                        panel.tools.push(draggedItem);

                        console.log('Drop en categoría:', panel.title, { draggedItem, draggedPanel, dragSourcePanelId, panelId: panel.id });

                        saveState();
                        render();
                    }
                    return;
                }

                // CASO B: Reordenar CATEGORÍAS
                if (draggedPanel) {
                    const fromIndex = appData.panels.indexOf(draggedPanel);
                    const toIndex = appData.panels.indexOf(panel);
                    if (fromIndex !== toIndex) {
                        appData.panels.splice(fromIndex, 1);
                        appData.panels.splice(toIndex, 0, draggedPanel);
                        render();
                    }
                }
            });

            // ... (rest of listeners: edit, add, del) ...
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
                dragSourcePanelId = panelId; // Guardar panel de origen
                wrapper.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.stopPropagation();
            });
            wrapper.addEventListener('dragend', () => {
                wrapper.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedItem = null;
                dragSourceArray = null;
                dragSourcePanelId = null;
                saveState();
            });
            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Permitir drop si es una imagen (aunque venga de otro sitio)
                if (draggedItem) {
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

                if (!draggedItem) return; // Si no es un item, salir

                // Lógica de movimiento
                const fromIndex = dragSourceArray.indexOf(draggedItem);

                // Si es el mismo array, reordenar
                if (dragSourceArray === sourceArray) {
                    const toIndex = sourceArray.indexOf(app);
                    if (fromIndex !== toIndex) {
                        sourceArray.splice(fromIndex, 1);
                        sourceArray.splice(toIndex, 0, draggedItem);
                        render();
                    }
                }
                // Si es DIFERENTE array (mover entre carpetas soltando en una carta)
                else {
                    // Quitar del origen
                    if (fromIndex > -1) dragSourceArray.splice(fromIndex, 1);

                    // Añadir al destino (en la posición de la carta donde se soltó)
                    const toIndex = sourceArray.indexOf(app);
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
            // Mostrar modal de contraseña
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

    function openGenerator(prompt = '') {
        genPromptInput.value = prompt;
        genBaseImage = null;
        genPreview.style.display = 'none';
        genUploadArea.style.display = 'flex';
        genFileInput.value = '';
        resetResults();
        generatorModal.style.display = 'flex';
    }

    function resetResults() {
        genResults.innerHTML = `
            <div class="gen-result-placeholder">
                <i class="fa fa-image"></i>
                <span>Imagen 1</span>
            </div>
            <div class="gen-result-placeholder">
                <i class="fa fa-image"></i>
                <span>Imagen 2</span>
            </div>
        `;
        genLoading.style.display = 'none';
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

        // Mostrar loading
        genResults.innerHTML = '';
        genLoading.style.display = 'flex';
        genSubmitBtn.disabled = true;

        try {
            // Generar 2 imágenes
            const results = await Promise.all([
                generateWithGemini(prompt, genBaseImage),
                generateWithGemini(prompt + " (variación alternativa)", genBaseImage)
            ]);

            genLoading.style.display = 'none';
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
            genLoading.style.display = 'none';
            genResults.innerHTML = `
                <div class="gen-result-placeholder" style="grid-column: 1/-1; color: #f87171;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>Error al generar: ${error.message}</span>
                </div>
            `;
        } finally {
            genSubmitBtn.disabled = false;
        }
    };

    async function generateWithGemini(prompt, baseImage) {
        // Extraer base64 sin el prefijo data:image/...;base64,
        const base64Data = baseImage.split(',')[1];
        const mimeType = baseImage.match(/data:(.*?);/)?.[1] || 'image/jpeg';

        // Usar el proxy PHP
        const requestBody = {
            model: GEMINI_MODEL,
            prompt: `INSTRUCCIONES CRÍTICAS OBLIGATORIAS:

1. IDENTIDAD FACIAL: La cara del sujeto en el resultado DEBE ser IDÉNTICA a la cara de la imagen de referencia. Preserva TODOS los rasgos faciales exactos: ojos, nariz, boca, forma de cara, arrugas, expresión. La similitud facial es LA PRIORIDAD MÁXIMA.

2. CUERPO COMPLETO: Mantén el cuerpo EXACTAMENTE como aparece, incluyendo cualquier elemento de movilidad (silla de ruedas, bastón, andador, etc.). NO elimines ni modifiques estos elementos bajo ninguna circunstancia.

3. NÚMERO DE PERSONAS: Genera ÚNICAMENTE el mismo número de personas que aparecen en la imagen original. NO añadas personas extra.

4. APLICACIÓN DE ESTILO: Aplica el siguiente estilo visual SOLO al escenario/ambiente/vestimenta, NUNCA modifiques los rasgos faciales del sujeto.

ESTILO A APLICAR: ${prompt}`,
            base64ImageData: base64Data,
            mimeType: mimeType
        };

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el proxy');
        }

        const data = await response.json();

        // Buscar la imagen en la respuesta
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                return `data:${mime};base64,${part.inlineData.data}`;
            }
        }

        throw new Error('No se recibió imagen en la respuesta');
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
    // ILLUSION LAB (DOBLE EXPOSICIÓN)
    // ═══════════════════════════════════════════════════════════════

    const illusionModal = document.getElementById('illusion-modal');
    const openIllusionBtn = document.getElementById('open-illusion-btn');
    const closeIllusionBtn = document.getElementById('close-illusion-btn');
    const illusionShapeInput = document.getElementById('illusion-shape-input');
    const illusionShapePreview = document.getElementById('illusion-shape-preview');
    const illusionShapeArea = document.getElementById('illusion-shape-area');

    const illusionContentList = document.getElementById('illusion-content-list');
    const illusionAddBtn = document.getElementById('illusion-add-btn');
    const illusionContentInput = document.getElementById('illusion-content-input');
    const illusionGenerateBtn = document.getElementById('illusion-generate-btn');
    const illusionResults = document.getElementById('illusion-results');
    const illusionLoading = document.getElementById('illusion-loading');

    let illusionData = {
        shapeImage: null,
        contentImages: [] // { id, data, weight }
    };

    // ABRIR/CERRAR MODAL
    if (openIllusionBtn) {
        openIllusionBtn.onclick = () => {
            illusionModal.style.display = 'flex';
        };
    }
    closeIllusionBtn.onclick = () => illusionModal.style.display = 'none';

    // 1. IMAGEN SILUETA (SHAPE)
    illusionShapeInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                illusionData.shapeImage = ev.target.result;
                illusionShapePreview.src = ev.target.result;
                illusionShapePreview.style.display = 'block';
                illusionShapeArea.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // 2. IMÁGENES CONTENIDO (CONTENT)
    illusionAddBtn.onclick = () => illusionContentInput.click();

    illusionContentInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const newImg = {
                    id: Date.now(),
                    data: ev.target.result,
                    weight: 50 // Por defecto 50%
                };
                illusionData.contentImages.push(newImg);
                renderIllusionList();
                // Limpiar input para permitir subir la misma imagen
                illusionContentInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    });

    function renderIllusionList() {
        illusionContentList.innerHTML = '';
        illusionData.contentImages.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'illusion-item';
            row.innerHTML = `
                <img src="${item.data}">
                <div class="illusion-controls">
                    <label>
                        <span>Presencia</span>
                        <span id="val-${item.id}">${item.weight}%</span>
                    </label>
                    <input type="range" class="illusion-slider" 
                           min="0" max="100" value="${item.weight}" 
                           data-id="${item.id}">
                </div>
                <button class="btn-remove-item" data-id="${item.id}">
                    <i class="fa fa-times"></i>
                </button>
            `;

            // Eventos Slider
            const slider = row.querySelector('.illusion-slider');
            slider.oninput = (e) => {
                item.weight = e.target.value;
                row.querySelector(`#val-${item.id}`).textContent = e.target.value + '%';
            };

            // Evento Eliminar
            row.querySelector('.btn-remove-item').onclick = () => {
                illusionData.contentImages = illusionData.contentImages.filter(i => i.id !== item.id);
                renderIllusionList();
            };

            illusionContentList.appendChild(row);
        });
    }

    // 4. CAMBIAR SILUETA AL CLICKAR
    illusionShapePreview.onclick = () => {
        illusionShapeInput.click();
    };
    illusionShapePreview.style.cursor = 'pointer';
    illusionShapePreview.title = 'Click para cambiar imagen';

    // FUNCIÓN DE AYUDA: CREAR MOSAICO (COLLAGE)
    async function createCompositeImage(shapeBase64, contentImagesArray) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Standard size for composite: 1024x512 (Left: Shape, Right: Content Grid)
            canvas.width = 1024;
            canvas.height = 512;

            // White background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 1. Load Shape Image
            const shapeImg = new Image();
            shapeImg.onload = () => {
                // Draw Shape on Left Half (512x512), centered
                const shapeRatio = shapeImg.width / shapeImg.height;
                let dw = 512, dh = 512;
                if (shapeRatio > 1) { dh = 512 / shapeRatio; }
                else { dw = 512 * shapeRatio; }

                const dx = (512 - dw) / 2;
                const dy = (512 - dh) / 2;

                ctx.drawImage(shapeImg, dx, dy, dw, dh);

                // 2. Load Content Images (Right Half Grid)
                if (contentImagesArray.length === 0) {
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                    return;
                }

                let loadedCount = 0;
                const limit = Math.min(contentImagesArray.length, 4);

                contentImagesArray.slice(0, 4).forEach((item, idx) => {
                    const cImg = new Image();
                    cImg.onload = () => {
                        // Grid 2x2 on the right side (starts at x=512)
                        // Cells: 256x256
                        let cx = 512 + (idx % 2) * 256;
                        let cy = Math.floor(idx / 2) * 256;

                        // Draw 'cover' style (simple stretch for now to ensure visibility)
                        ctx.drawImage(cImg, cx, cy, 256, 256);

                        loadedCount++;
                        if (loadedCount === limit) {
                            resolve(canvas.toDataURL('image/jpeg', 0.95));
                        }
                    };
                    cImg.src = item.data;
                });
            };
            shapeImg.src = shapeBase64;
        });
    }

    // 3. GENERACIÓN
    illusionGenerateBtn.onclick = async () => {
        if (!illusionData.shapeImage) {
            alert('Por favor sube una imagen contenedora (Silueta).');
            return;
        }
        if (illusionData.contentImages.length === 0) {
            alert('Añade al menos una imagen de contenido.');
            return;
        }

        illusionLoading.style.display = 'flex';
        illusionResults.innerHTML = '';

        try {
            // 1. Crear el Collage para enviarlo (Estrategia Mosaico)
            const compositeBase64 = await createCompositeImage(illusionData.shapeImage, illusionData.contentImages);

            // 2. Construir Prompt Especializado (REFORZADO)
            let promptText = `
                [SYSTEM ROLE]
                You are an advanced image processing engine specialized in "Double Exposure" and "Clipping Mask" techniques.

                [INPUT LAYOUT ANALYSIS]
                The input image is a side-by-side composite:
                - **LEFT SIDE**: This is the MASK / CONTAINER SILHOUETTE (black/white or solid shape).
                - **RIGHT SIDE**: This is the FILL MATERIAL (textures, scenes, patterns).

                [CRITICAL EXECUTION ORDER]
                1. **IDENTIFY** the shape/silhouette from the LEFT side.
                2. **CROP** the content from the RIGHT side.
                3. **FUSE** them by placing the RIGHT content *INSIDE* the LEFT shape.
                4. **DISCARD** the original grid layout. The final output must be a SINGLE image of the shaped object.

                [CONSTRAINT: STRICT MASKING]
                - The final image must have the EXACT outline of the shape provided on the left.
                - Do NOT generate a square background image with the shape inside. The shape ITSELF is the viewport.
                - The content images should blend seamlessly ONLY within the boundaries of the silhouette.
                - White background outside the silhouette.
                
                [BLENDING STYLE]
            `;

            illusionData.contentImages.forEach((img, idx) => {
                const priority = img.weight > 80 ? 'DOMINANT' : (img.weight > 40 ? 'BALANCED' : 'SUBTLE/GHOSTLY');
                promptText += `- Fill Layer ${idx + 1}: ${img.weight}% opacity/presence (${priority}).\n`;
            });

            promptText += `
                [STYLE SPECIFICATIONS]
                - Palette: Cold tones (blues, greys, whites).
                - Atmosphere: Dreamlike, introspection, soft fog, smooth transitions.
                - Technique: No hard edges between content and shape. Soft blending. 
                - Background: Minimalist white/clean background.
                - Quality: 8k, editorial, highly detailed post-processing.
            `;

            // PAYLOAD: JSON para proxy.php
            // Enviamos el 'compositeBase64' como la imagen principal
            const base64Data = compositeBase64.split(',')[1];
            // Usamos jpeg porque createCompositeImage devuelve jpeg

            const requestBody = {
                model: GEMINI_MODEL,
                prompt: promptText,
                base64ImageData: base64Data,
                mimeType: 'image/jpeg'
            };




            // GENERAR 2 IMÁGENES EN PARALELO
            const promises = [
                fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }),
                fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...requestBody, prompt: promptText + " (Variation)" })
                })
            ];

            const responses = await Promise.all(promises);
            const resultsData = await Promise.all(responses.map(r => r.json()));

            illusionLoading.style.display = 'none';

            let anySuccess = false;

            resultsData.forEach(data => {
                if (data.error) {
                    console.error('Error en una generación:', data.error);
                } else if (data.candidates && data.candidates.length > 0) {
                    // Extraer imagen del objeto complejo de Gemini
                    const parts = data.candidates[0].content?.parts || [];
                    let base64 = null;
                    for (const part of parts) {
                        if (part.inlineData?.data) {
                            const mime = part.inlineData.mimeType || 'image/png';
                            base64 = `data:${mime};base64,${part.inlineData.data}`;
                            break;
                        }
                    }

                    if (base64) {
                        anySuccess = true;
                        const imgDiv = document.createElement('div');
                        imgDiv.className = 'gen-result-item';
                        imgDiv.innerHTML = `
                            <img src="${base64}" onclick="openViewer('${base64}')">
                            <button class="btn-save-gen" onclick="saveGenerated('${base64}')"><i class="fa fa-save"></i></button>
                        `;
                        illusionResults.appendChild(imgDiv);

                        // Guardar en historial
                        generatedImages.unshift({ id: Date.now() + Math.random(), data: base64 });
                    }
                }
            });

            if (anySuccess) {
                renderHistory();
                // Feedback visual sutil opcional, pero sin alert
            } else {
                alert('No se pudo generar ninguna imagen. Verifica la consola.');
            }

        } catch (error) {
            console.error(error);
            illusionLoading.style.display = 'none';
            alert('Error al generar la ilusión.');
        }
    };

    // Funciones auxiliares globales para usar en el HTML inyectado
    window.saveGenerated = (base64) => {
        const link = document.createElement('a');
        link.href = base64;
        link.download = `illusion_${Date.now()}.jpg`;
        link.click();
    };

    window.openViewer = (src) => {
        document.getElementById('full-image').src = src;
        document.getElementById('image-viewer').style.display = 'flex';
    };

    // ═══════════════════════════════════════════════════════════════
    // INICIAR APLICACIÓN
    // ═══════════════════════════════════════════════════════════════

    loadState();
});

