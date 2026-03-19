document.addEventListener('DOMContentLoaded', () => {
    // ===== STATE =====
    // Inicializamos con estructura completa para evitar errores de "undefined"
    let appData = { 
        background: '', 
        panels: [], 
        tools: [] 
    };
    let isEditable = false;
    let currentPassword = '';
    let isDragging = false;

    // ===== DOM ELEMENTS =====
    const themeSwitcher = document.getElementById('themeSwitcher');
    const panelsContainer = document.getElementById('panels-container');
    const tilesGrid = document.getElementById('tiles-grid');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const addItemBtn = document.getElementById('add-item-btn');
    const addPanelBtn = document.getElementById('add-panel-btn');
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');

    // Password Modal
    const passwordModal = document.getElementById('password-modal');
    const passwordInput = document.getElementById('admin-password-input');
    const submitPasswordBtn = document.getElementById('submit-password-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    // Item Form Modal
    const formModal = document.getElementById('form-modal');
    const formTitle = document.getElementById('form-title');
    const editingIdInput = document.getElementById('editing-id');
    const editingPanelIdInput = document.getElementById('editing-panel-id');
    const formTitleInput = document.getElementById('form-title-input');
    const formUrlInput = document.getElementById('form-url-input');
    const formDescInput = document.getElementById('form-desc-input');
    const formIconInput = document.getElementById('form-icon-input');
    const formSaveBtn = document.getElementById('form-save-btn');
    const formCancelBtn = document.getElementById('form-cancel-btn');

    // Panel Form Modal
    const panelFormModal = document.getElementById('panel-form-modal');
    const panelFormTitle = document.getElementById('panel-form-title');
    const editingPanelIdFormInput = document.getElementById('editing-panel-id-form');
    const panelFormTitleInput = document.getElementById('panel-form-title-input');
    const panelFormSaveBtn = document.getElementById('panel-form-save-btn');
    const panelFormCancelBtn = document.getElementById('panel-form-cancel-btn');


    // ===== THEME LOGIC =====
    function applyInitialTheme() {
        const theme = localStorage.getItem('theme') || 'dark';
        document.body.classList.toggle('dark-theme', theme === 'dark');
        themeSwitcher.textContent = theme === 'dark' ? 'Tema Claro' : 'Tema Oscuro';
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--card-bg-color-rgb', '19,26,47');
        } else {
            document.documentElement.style.setProperty('--card-bg-color-rgb', '255,255,255');
        }
    }
    themeSwitcher.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyInitialTheme();
    });

    // ===== BACKEND INTERACTION (FIXED) =====
    async function loadState() {
        try {
            const response = await fetch('load_state.php?t=' + Date.now());
            const data = await response.json();
            
            const loadedTools = data?.columns?.[0]?.tools || [];
            const panels = [];
            const standaloneTools = [];

            // Reconstruir paneles y herramientas sueltas
            loadedTools.forEach(item => {
                if (item.isPanelHeader) {
                    panels.push({
                        id: item.id,
                        title: item.name,
                        isOpen: false, // Siempre cerrados al inicio
                        tools: item.tools || []
                    });
                } else {
                    standaloneTools.push(item);
                }
            });

            // CORRECCIÓN IMPORTANTE: Preservar background y estructura
            appData = { 
                background: data.background || '', 
                panels: panels, 
                tools: standaloneTools 
            };

        } catch (e) {
            console.error("Error al cargar el estado:", e);
            // Fallback seguro
            appData = { background: '', panels: [], tools: [] };
        }
        render();
    }

    async function saveState() {
        // Permitimos guardar si estamos editando
        if (!isEditable) return;

        try {
            const unifiedTools = [];

            // 1. Añadir Paneles (como items especiales que contienen sus herramientas)
            (appData.panels || []).forEach(panel => {
                unifiedTools.push({
                    id: panel.id,
                    name: panel.title,
                    isPanelHeader: true,
                    // Guardamos una copia limpia de las herramientas del panel
                    tools: panel.tools || []
                });
            });

            // 2. Añadir Herramientas sueltas
            unifiedTools.push(...(appData.tools || []));

            // Construir payload compatible con el backend
            const payload = {
                password: '0', // La contraseña hardcodeada según tu script PHP
                background: appData.background || '', 
                columns: [{
                    title: "Panel",
                    tools: unifiedTools
                }]
            };

            console.log("Guardando cambios...", payload); // Debug

            const response = await fetch('guardar_cambios.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            
            const result = await response.json();
            if (!result.success) {
                console.error('Error del servidor:', result);
                alert(`Error al guardar: ${result.error || 'Desconocido'}`);
            } else {
                console.log("Guardado exitoso:", result);
            }
        } catch (e) {
            console.error("Error crítico en saveState:", e);
            alert("Error de conexión al guardar los cambios.");
        }
    }

    // ===== RENDER FUNCTION =====
    function render() {
        panelsContainer.innerHTML = '';
        tilesGrid.innerHTML = '';
        
        // Render panels
        (appData.panels || []).forEach(panel => {
            const panelEl = createPanelElement(panel);
            panelsContainer.appendChild(panelEl);
        });

        // Render standalone tools
        (appData.tools || []).forEach(app => {
            const cardWrapper = createTileCardElement(app, appData.tools);
            tilesGrid.appendChild(cardWrapper);
        });

        attach3DTilt('.tile-wrap .tile-card');
        document.body.classList.toggle('edit-mode', isEditable);
        editModeBtn.textContent = isEditable ? 'Finalizar Edición' : 'Editar';
        editModeBtn.classList.toggle('active', isEditable);
    }

    function createPanelElement(panel) {
        const panelEl = document.createElement('div');
        panelEl.className = `panel ${panel.isOpen ? '' : 'closed'}`;
        panelEl.dataset.id = panel.id;

        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('h2');
        title.className = 'panel-title';
        title.textContent = panel.title;

        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'panel-toggle-icon fa-solid fa-chevron-down';
        
        header.appendChild(title);

        if (isEditable) {
            const buttons = document.createElement('div');
            buttons.className = 'panel-edit-buttons';
            buttons.innerHTML = `
                <button title="Añadir Enlace"><i class="fa-solid fa-plus"></i></button>
                <button title="Editar Panel"><i class="fa-solid fa-pencil"></i></button>
                <button title="Eliminar Panel"><i class="fa-solid fa-trash"></i></button>
            `;
            // Detener propagación para no abrir/cerrar el panel al hacer clic en botones
            const btnAdd = buttons.querySelector('[title="Añadir Enlace"]');
            const btnEdit = buttons.querySelector('[title="Editar Panel"]');
            const btnDel = buttons.querySelector('[title="Eliminar Panel"]');
            
            btnAdd.addEventListener('click', (e) => { e.stopPropagation(); openFormForAdd(panel.id); });
            btnEdit.addEventListener('click', (e) => { e.stopPropagation(); openPanelFormForEdit(panel); });
            btnDel.addEventListener('click', (e) => { e.stopPropagation(); deletePanel(panel.id); });
            
            header.appendChild(buttons);
        }

        header.appendChild(toggleIcon);
        
        header.addEventListener('click', () => {
            panel.isOpen = !panel.isOpen;
            panelEl.classList.toggle('closed');
        });

        const content = document.createElement('div');
        content.className = 'panel-content tiles-grid';
        
        (panel.tools || []).forEach(app => {
            const cardWrapper = createTileCardElement(app, panel.tools);
            content.appendChild(cardWrapper);
        });

        panelEl.appendChild(header);
        panelEl.appendChild(content);
        return panelEl;
    }

    function createTileCardElement(app, sourceArray) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tile-wrap';

        const card = document.createElement('a');
        card.className = 'tile-card';
        // En modo edición desactivamos el link real
        card.href = isEditable ? 'javascript:void(0)' : app.websiteUrl;
        if (!isEditable) {
            card.target = '_blank';
            card.rel = 'noopener';
        }
        card.dataset.id = app.id;

        card.innerHTML = `
            <div class="tile-head">
                <div class="tile-icon">${app.iconHtml || '<i class="fa-solid fa-globe"></i>'}</div>
                <div class="tile-title">${app.name}</div>
            </div>
            <div class="tile-desc">${app.briefDescription}</div>
        `;

        if (isEditable) {
            wrapper.draggable = true;
            
            const editButtons = document.createElement('div');
            editButtons.className = 'item-edit-buttons';
            editButtons.innerHTML = `
                <button class="edit-btn" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                <button class="delete-btn" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            `;
            card.appendChild(editButtons);
            
            editButtons.querySelector('.edit-btn').addEventListener('click', (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                openFormForEdit(app, sourceArray); 
            });
            editButtons.querySelector('.delete-btn').addEventListener('click', (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                deleteItem(app.id, sourceArray); 
            });

            // Eventos Drag & Drop
            wrapper.addEventListener('dragstart', e => { 
                e.stopPropagation(); 
                isDragging = true; 
                e.dataTransfer.setData('text/plain', app.id); 
                // Delay para estilo visual
                setTimeout(() => wrapper.querySelector('.tile-card').classList.add('dragging'), 0); 
            });
            
            wrapper.addEventListener('dragend', e => { 
                e.stopPropagation(); 
                isDragging = false; 
                document.querySelectorAll('.dragging, .drop-target').forEach(el => el.classList.remove('dragging', 'drop-target')); 
            });
            
            wrapper.addEventListener('dragover', e => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (document.querySelector('.dragging')) {
                    wrapper.querySelector('.tile-card').classList.add('drop-target');
                }
            });
            
            wrapper.addEventListener('dragleave', e => { 
                e.stopPropagation(); 
                wrapper.querySelector('.tile-card').classList.remove('drop-target'); 
            });
            
            wrapper.addEventListener('drop', e => {
                e.preventDefault(); 
                e.stopPropagation();
                wrapper.querySelector('.tile-card').classList.remove('drop-target');
                
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId === app.id) return;
                
                // Buscar índices en el array origen (sourceArray)
                const fromIndex = sourceArray.findIndex(t => t.id === draggedId);
                const toIndex = sourceArray.findIndex(t => t.id === app.id);
                
                if (fromIndex > -1 && toIndex > -1) {
                    const [movedItem] = sourceArray.splice(fromIndex, 1);
                    sourceArray.splice(toIndex, 0, movedItem);
                    render(); 
                    saveState();
                }
            });
        }
        wrapper.appendChild(card);
        return wrapper;
    }

    // ===== EDIT MODE & PASSWORD =====
    function setEditMode(enabled) { isEditable = enabled; render(); }
    editModeBtn.addEventListener('click', () => {
        if (isEditable) { setEditMode(false); }
        else { passwordInput.value = ''; passwordModal.style.display = 'flex'; passwordInput.focus(); }
    });
    submitPasswordBtn.addEventListener('click', async () => {
        const pass = passwordInput.value;
        if (!pass) return;
        const fd = new FormData(); fd.append('password', pass);
        try {
            const r = await fetch('validar_password.php', { method: 'POST', body: fd });
            const res = await r.json();
            if (res.success) { currentPassword = pass; passwordModal.style.display = 'none'; setEditMode(true); }
            else { alert('Contraseña incorrecta.'); }
        } catch (e) { alert('Error de validación.'); }
    });
    passwordInput.addEventListener('keypress', e => e.key === 'Enter' && submitPasswordBtn.click());
    cancelPasswordBtn.addEventListener('click', () => passwordModal.style.display = 'none');

    // ===== ITEM FORM LOGIC (FIXED) =====
    function openFormForAdd(panelId = null) {
        formTitle.textContent = 'Añadir Enlace';
        editingIdInput.value = '';
        editingPanelIdInput.value = panelId || '';
        formTitleInput.value = '';
        formUrlInput.value = ''; 
        formDescInput.value = ''; 
        formIconInput.value = '<i class="fa-solid fa-globe"></i>';
        formModal.style.display = 'flex';
        formTitleInput.focus();
    }
    
    function openFormForEdit(app, sourceArray) {
        // Encontrar a qué panel pertenece para el input hidden, o vacío si es root
        let panelId = '';
        const parentPanel = appData.panels.find(p => p.tools === sourceArray);
        if (parentPanel) panelId = parentPanel.id;

        formTitle.textContent = 'Editar Enlace'; 
        editingIdInput.value = app.id;
        editingPanelIdInput.value = panelId;
        
        formTitleInput.value = app.name;
        formUrlInput.value = app.websiteUrl; 
        formDescInput.value = app.briefDescription; 
        formIconInput.value = app.iconHtml;
        formModal.style.display = 'flex';
    }

    formSaveBtn.addEventListener('click', () => {
        const id = editingIdInput.value || `tool_${Date.now()}`;
        const panelId = editingPanelIdInput.value; // Puede ser string vacío
        
        const newData = { 
            id, 
            name: formTitleInput.value.trim(), 
            websiteUrl: formUrlInput.value.trim(), 
            briefDescription: formDescInput.value.trim(), 
            iconHtml: formIconInput.value.trim(), 
            tags: [], 
            timestampAdded: Date.now() 
        };

        if (!newData.name || !newData.websiteUrl) { 
            alert('El título y la URL son obligatorios.'); 
            return; 
        }
        
        let targetArray;
        if (panelId) {
            const panel = appData.panels.find(p => p.id === panelId);
            if(panel) {
                targetArray = panel.tools;
            } else {
                console.error("Panel ID no encontrado:", panelId);
                // Si falla, podrías decidir meterlo en tools generales o abortar
                alert("Error: El panel destino no existe.");
                return;
            }
        } else {
            targetArray = appData.tools;
        }

        const existingIndex = targetArray.findIndex(t => t.id === id);
        if (existingIndex > -1) { 
            targetArray[existingIndex] = { ...targetArray[existingIndex], ...newData }; 
        } else { 
            targetArray.push(newData); 
        }
        
        formModal.style.display = 'none'; 
        render(); 
        saveState();
    });
    
    formCancelBtn.addEventListener('click', () => formModal.style.display = 'none');
    addItemBtn.addEventListener('click', () => openFormForAdd(null));

    // ===== PANEL FORM LOGIC =====
    function openPanelFormForAdd() {
        panelFormTitle.textContent = 'Añadir Panel';
        editingPanelIdFormInput.value = '';
        panelFormTitleInput.value = '';
        panelFormModal.style.display = 'flex';
        panelFormTitleInput.focus();
    }
    
    function openPanelFormForEdit(panel) {
        panelFormTitle.textContent = 'Editar Panel';
        editingPanelIdFormInput.value = panel.id;
        panelFormTitleInput.value = panel.title;
        panelFormModal.style.display = 'flex';
    }
    
    panelFormSaveBtn.addEventListener('click', () => {
        const id = editingPanelIdFormInput.value || `panel_${Date.now()}`;
        const title = panelFormTitleInput.value.trim();
        if (!title) { alert('El título del panel es obligatorio.'); return; }
        
        const existingPanel = appData.panels.find(p => p.id === id);
        if (existingPanel) {
            existingPanel.title = title;
        } else {
            appData.panels.push({ id, title, isOpen: true, tools: [] }); // isOpen true al crear para verlo
        }
        panelFormModal.style.display = 'none';
        render();
        saveState();
    });
    
    panelFormCancelBtn.addEventListener('click', () => panelFormModal.style.display = 'none');
    addPanelBtn.addEventListener('click', openPanelFormForAdd);


    // ===== DELETE LOGIC =====
    function deleteItem(id, sourceArray) {
        if (confirm('¿Estás seguro de que quieres eliminar este enlace?')) {
            const index = sourceArray.findIndex(t => t.id === id);
            if (index > -1) {
                sourceArray.splice(index, 1);
                render(); 
                saveState();
            }
        }
    }
    
    function deletePanel(panelId) {
        if (confirm('¿Seguro que quieres eliminar este panel? Los enlaces dentro se moverán a la lista principal.')) {
            const panelIndex = appData.panels.findIndex(p => p.id === panelId);
            if (panelIndex > -1) {
                const [panel] = appData.panels.splice(panelIndex, 1);
                // Mover herramientas del panel a la lista principal (al principio)
                appData.tools.unshift(...(panel.tools || [])); 
                render();
                saveState();
            }
        }
    }

    // ===== 3D TILT EFFECT =====
    function attach3DTilt(selector) {
        // Solo aplicar si no es móvil para rendimiento
        if (window.innerWidth < 768) return; 

        document.querySelectorAll(selector).forEach(card => {
            const parent = card.parentElement; // .tile-wrap
            const max = 12;
            const reset = () => { card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`; };
            
            parent.addEventListener('mousemove', (e) => {
                if (isDragging) return;
                const rect = parent.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rotY = (px - .5) * (max * 2);
                const rotX = -(py - .5) * (max * 2);
                card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(10px)`;
            });
            parent.addEventListener('mouseleave', reset);
        });
    }

    // ===== AUTO-SCROLL ON DRAG =====
    document.addEventListener('dragover', (e) => {
        if (!isDragging) return;
        const scrollZone = 80, scrollSpeed = 15;
        if (e.clientY < scrollZone) { window.scrollBy(0, -scrollSpeed); }
        else if (e.clientY > window.innerHeight - scrollZone) { window.scrollBy(0, scrollSpeed); }
    });

    // ===== GOOGLE SEARCH & LENS =====
    const lensBtn = document.getElementById('lens-btn');
    if (lensBtn) {
        lensBtn.addEventListener('click', () => window.open('https://lens.google.com/upload?hl=es', '_blank', 'noopener'));
    }
    
    const voiceBtn = document.getElementById('voice-btn');
    const recog = window.webkitSpeechRecognition ? new webkitSpeechRecognition() : null;
    if (recog && voiceBtn) {
        recog.lang = 'es-ES';
        recog.onresult = e => { document.querySelector('input[name="q"]').value = e.results[0][0].transcript; };
        voiceBtn.addEventListener('click', () => recog.start());
    } else if (voiceBtn) { 
        voiceBtn.style.display = 'none'; 
    }

    // ===== BACKGROUND ANIMATION =====
    let particles = [];
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    function createParticles() {
        const count = Math.round((canvas.width * canvas.height) / 38000);
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: 0.8 + Math.random() * 2.2,
            dx: (-0.3 + Math.random() * 0.6), dy: (-0.2 + Math.random() * 0.4),
            h: Math.floor(Math.random() * 360)
        }));
    }
    function animateFx() {
        requestAnimationFrame(animateFx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            ctx.beginPath();
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
            g.addColorStop(0, `hsla(${p.h},70%,60%,.6)`); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2); ctx.fill();
        });
    }

    // ===== INITIALIZATION =====
    applyInitialTheme();
    loadState();
    resizeCanvas();
    createParticles();
    animateFx();
    window.addEventListener('resize', resizeCanvas);
});