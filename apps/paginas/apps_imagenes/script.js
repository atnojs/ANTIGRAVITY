document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM completamente cargado. Iniciando App Centro de Comandos IA...");

    // ESTADO DE LA APLICACIÓN Y VARIABLES
    let appData = {
        settings: { background: '', theme: 'dark', lastAppPricingFilter: '_all_' },
        aiAppsCategories: [],
        prompts: [],
        promptFolders: []
    };
    let isEditable = false;
    let currentPassword = "";
    let activePopups = {
        folderMenu: null
    };
    let closeMenuTimer = null;
    
    // ELEMENTOS DEL DOM
    const globalSearchInput = document.getElementById('globalSearchInput');
    const appPricingFilter = document.getElementById('appPricingFilter');
    const themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
    const scrollToFoldersBtn = document.getElementById('scrollToFoldersBtn');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const aiAppsCategoriesContainer = document.getElementById('aiAppsCategoriesContainer');
    const noAppCategoriesMessage = document.getElementById('noAppCategoriesMessage');
    const addAppCategoryBtn = document.getElementById('addAppCategoryBtn');
    const promptFoldersGridContainer = document.getElementById('promptFoldersGridContainer');
    const noPromptFoldersMessage = document.getElementById('noPromptFoldersMessage');
    const addPromptFolderBtn = document.getElementById('addPromptFolderBtn');
    const promptsListContainer = document.getElementById('promptsListContainer');
    const activePromptDisplayArea = document.getElementById('activePromptDisplayArea');
    const noPromptsMessage = document.getElementById('noPromptsMessage');
    const addPromptBtn = document.getElementById('addPromptBtn');
    const hiddenBgInput = document.getElementById('hiddenBgInput');
    const changeBgBtn = document.getElementById('changeBgBtn');
    const orderAppCategoriesBtn = document.getElementById('orderAppCategoriesBtn');
    const editModeToggleBtn = document.getElementById('edit-mode-toggle-btn');
    const adminPasswordModal = document.getElementById('adminPasswordModal');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const submitAdminPasswordBtn = document.getElementById('submitAdminPasswordBtn');
    const cancelAdminPasswordBtn = document.getElementById('cancelAdminPasswordBtn');
    const appCategoryOrderModal = document.getElementById('appCategoryOrderModal');
    const appCategoryOrderList = document.getElementById('appCategoryOrderList');
    const closeAppCategoryOrderModalBtn = document.getElementById('closeAppCategoryOrderModalBtn');
    const formModal = document.getElementById('formModal');
    const genericFormContainer = document.getElementById('genericFormContainer');
    const fullscreenImageViewer = document.getElementById('fullscreenImageViewer');
    const fullscreenImage = fullscreenImageViewer.querySelector('img');
    const closeFullscreenBtn = fullscreenImageViewer.querySelector('.close-fullscreen-btn');
    let tempPromptImageFiles = [];
    let currentEditingPromptImages = [];

    // INICIALIZACIÓN
    async function loadInitialData() {
        showLoadingMessage("Cargando datos...");
        try {
            const response = await fetch('/Paginas/pagina_apps_prompts_imagenes/load_state.php?t=' + Date.now());
            if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
            const loadedData = await response.json();
            if (loadedData && !loadedData.error) {
                appData.settings = { ...appData.settings, ...(loadedData.settings || {}) };
                appData.aiAppsCategories = normalizeAppCategoriesData(loadedData.aiAppsCategories || []);
                appData.prompts = normalizePromptsData(loadedData.prompts || []);
                appData.promptFolders = normalizePromptFoldersData(loadedData.promptFolders || []);
            } else {
                console.warn("No se cargaron datos o formato incorrecto. Usando defaults.");
                initializeDefaultData();
            }
        } catch (error) {
            console.error('Error crítico en loadInitialData:', error);
            showPersistentMessage(`Error crítico: ${error.message}. Usando defaults.`, "error");
            initializeDefaultData();
        }
        applyInitialSettings();
        updateEditModeUI();
        clearLoadingMessage();
    }

    function initializeDefaultData() {
        appData.settings = { background: '', theme: 'dark', lastAppPricingFilter: '_all_' };
        appData.aiAppsCategories = [];
        appData.prompts = [];
        appData.promptFolders = [];
    }

    function normalizeAppCategoriesData(categories) {
        return (categories || []).map(cat => ({
            id: cat.id || `catApp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: cat.title || "Categoría Sin Título",
            apps: (cat.apps || []).map(app => ({
                id: app.id || `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: app.name || "App Sin Nombre",
                websiteUrl: app.websiteUrl || "",
                logoUrl: app.logoUrl || "",
                briefDescription: app.briefDescription || "",
                detailedDescription: app.detailedDescription || "",
                tags: Array.isArray(app.tags) ? app.tags : (typeof app.tags === 'string' ? app.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                pricingModel: app.pricingModel || "Gratis",
                tutorialUrl: app.tutorialUrl || "",
                isPrivate: !!app.isPrivate,
                timestampAdded: app.timestampAdded || Date.now(),
                timestampUpdated: app.timestampUpdated || Date.now(),
            }))
        }));
    }

    function normalizePromptsData(prompts) {
        return (prompts || []).map(p => ({
            id: p.id || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: p.title || "Prompt Sin Título",
            descriptionHTML: p.descriptionHTML || "",
            exampleImageUrls: Array.isArray(p.exampleImageUrls) ? p.exampleImageUrls.filter(url => typeof url === 'string') : [],
            promptText: p.promptText || "",
            englishPromptText: p.englishPromptText || "",
            folderId: p.folderId || null,
            timestampAdded: p.timestampAdded || Date.now(),
            timestampUpdated: p.timestampUpdated || Date.now(),
        }));
    }

    function normalizePromptFoldersData(folders) {
        return (folders || []).map(f => ({
            id: f.id || `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: f.name || "Carpeta Sin Nombre",
            iconUrl: f.iconUrl || "",
            description: f.description || "",
            timestampAdded: f.timestampAdded || Date.now(),
            timestampUpdated: f.timestampUpdated || Date.now(),
        }));
    }
    
    function showLoadingMessage(message) { let loadingDiv = document.getElementById('loadingOverlay'); if (!loadingDiv) { loadingDiv = document.createElement('div'); loadingDiv.id = 'loadingOverlay'; Object.assign(loadingDiv.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '20000', fontSize: '2em', textAlign: 'center' }); document.body.appendChild(loadingDiv); } loadingDiv.textContent = message; loadingDiv.style.display = 'flex'; }
    function clearLoadingMessage() { const loadingDiv = document.getElementById('loadingOverlay'); if (loadingDiv) loadingDiv.style.display = 'none'; }
    function showPersistentMessage(message, type = "info") { if (type === "error") alert(`Error: ${message}`); else if (type === "success") alert(`Éxito: ${message}`); console.log(`${type.toUpperCase()}: ${message}`); }

    async function saveDataToBackend() { if (!isEditable) return false; showLoadingMessage("Guardando cambios..."); const formData = new FormData(); formData.append('password', currentPassword); const dataToSave = JSON.parse(JSON.stringify(appData)); dataToSave.aiAppsCategories.forEach(cat => cat.apps.forEach(app => { if (app.logoUrl && typeof app.logoUrl !== 'string') app.logoUrl = null; })); dataToSave.prompts.forEach(p => p.exampleImageUrls = p.exampleImageUrls.filter(url => typeof url === 'string')); dataToSave.promptFolders.forEach(f => { if (f.iconUrl && typeof f.iconUrl !== 'string') f.iconUrl = null; }); formData.append('jsonData', JSON.stringify(dataToSave)); appData.prompts.forEach(prompt => { (prompt.exampleImageUrls || []).forEach((item, index) => { if (item instanceof File) formData.append(`prompt_image_${prompt.id}_${index}`, item, item.name); }); }); appData.promptFolders.forEach(folder => { if (folder.iconUrl instanceof File) formData.append(`folder_icon_${folder.id}`, folder.iconUrl, folder.iconUrl.name); }); appData.aiAppsCategories.forEach(category => { category.apps.forEach(app => { if (app.logoUrl instanceof File) formData.append(`app_logo_${app.id}`, app.logoUrl, app.logoUrl.name); }); }); try { const response = await fetch('/Paginas/pagina_apps_prompts_imagenes/guardar_cambios.php', { method: 'POST', body: formData }); if (!response.ok) { const errorText = await response.text(); throw new Error(`Error del servidor: ${response.status}. ${errorText}`); } const result = await response.json(); if (result.success) { console.log('Datos guardados con éxito.', result); if (result.filePaths) { updateLocalDataWithNewFilePaths(result.filePaths); } return true; } else { throw new Error(result.error || 'Error desconocido al guardar.'); } } catch (error) { console.error('Error en saveDataToBackend:', error); showPersistentMessage(`Error guardando: ${error.message}`, "error"); return false; } finally { clearLoadingMessage(); } }
    function updateLocalDataWithNewFilePaths(filePaths) { (filePaths.prompts || []).forEach(fp => { const prompt = appData.prompts.find(p => p.id === fp.promptId); if (prompt) { const fileIndex = (prompt.exampleImageUrls || []).findIndex(item => item instanceof File && item.name === fp.originalName); if (fileIndex !== -1) { prompt.exampleImageUrls[fileIndex] = fp.newPath; } } }); (filePaths.folders || []).forEach(fp => { const folder = appData.promptFolders.find(f => f.id === fp.folderId); if (folder && folder.iconUrl instanceof File && folder.iconUrl.name === fp.originalName) { folder.iconUrl = fp.newPath; } }); (filePaths.apps || []).forEach(fp => { const app = appData.aiAppsCategories.flatMap(c => c.apps).find(a => a.id === fp.appId); if (app && app.logoUrl instanceof File && app.logoUrl.name === fp.originalName) { app.logoUrl = fp.newPath; } }); }

    // --- RENDERIZADO ---
    function renderAll() { renderFilteredApps(); renderPromptFolders(); renderPrompts(); updateFilterUIDefaults(); }
    function updateFilterUIDefaults() { if (appPricingFilter) appPricingFilter.value = appData.settings.lastAppPricingFilter || '_all_'; }
    function renderFilteredApps() { aiAppsCategoriesContainer.innerHTML = ''; const priceFilterValue = appPricingFilter.value; const searchTerm = globalSearchInput.value.toLowerCase().trim(); const sortVal = 'default'; let itemsToShow = []; let isPriceFilteredResult = false; if (priceFilterValue && priceFilterValue !== '_all_') { isPriceFilteredResult = true; appData.aiAppsCategories.forEach(category => { category.apps.forEach(app => { if (app.pricingModel === priceFilterValue) { itemsToShow.push({...app, originalCategoryId: category.id, originalCategoryTitle: category.title }); } }); }); if (searchTerm) { itemsToShow = itemsToShow.filter(app => app.name.toLowerCase().includes(searchTerm) || app.briefDescription.toLowerCase().includes(searchTerm) || (app.tags && app.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ); } sortItems(itemsToShow, 'apps', sortVal); } else { itemsToShow = JSON.parse(JSON.stringify(appData.aiAppsCategories)); if (searchTerm) { itemsToShow = itemsToShow.map(category => { const filteredApps = category.apps.filter(app => app.name.toLowerCase().includes(searchTerm) || app.briefDescription.toLowerCase().includes(searchTerm) || (app.tags && app.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ); return {...category, apps: filteredApps}; }).filter(category => category.apps.length > 0); } sortItems(itemsToShow, 'aiAppsCategories', sortVal); itemsToShow.forEach(category => sortItems(category.apps, 'apps', sortVal)); } if (itemsToShow.length === 0) { noAppCategoriesMessage.style.display = 'block'; noAppCategoriesMessage.textContent = "No hay apps que coincidan con los filtros actuales."; return; } noAppCategoriesMessage.style.display = 'none'; if (isPriceFilteredResult) { const appsGrid = document.createElement('div'); appsGrid.className = 'apps-grid'; itemsToShow.forEach((app, index) => { appsGrid.appendChild(createAppCardElement(app, app.originalCategoryId, index, itemsToShow.length)); }); aiAppsCategoriesContainer.appendChild(appsGrid); } else { itemsToShow.forEach(category => { renderSingleAppCategory(category, aiAppsCategoriesContainer); }); } attachGenericImageEventListeners(aiAppsCategoriesContainer); }
    function renderSingleAppCategory(category, container) {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category-container';
        categoryEl.dataset.categoryId = category.id;

        let categoryControlsHTML = '';
        if (isEditable) {
            categoryControlsHTML = `
                <div class="category-controls">
                    <button class="edit-app-category-btn" title="Editar Nombre Categoría"><i class="fas fa-edit"></i></button>
                    <button class="delete-app-category-btn" title="Eliminar Categoría"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
        }

        let addAppToCategoryBtnHTML = '';
        if (isEditable) {
            addAppToCategoryBtnHTML = `<button class="add-item-btn add-app-to-category-btn" style="display:block; width:fit-content; margin: 10px auto;">Añadir App Aquí</button>`;
        }

        categoryEl.innerHTML = `
            ${addAppToCategoryBtnHTML}
            ${categoryControlsHTML}
            <div class="apps-grid">
                ${category.apps.length === 0 ? '<p class="no-items-message">No hay apps en esta categoría.</p>' : ''}
            </div>
        `;

        const appsGrid = categoryEl.querySelector('.apps-grid');
        category.apps.forEach((app, appIndex) => {
            appsGrid.appendChild(createAppCardElement(app, category.id, appIndex, category.apps.length));
        });

        container.appendChild(categoryEl);

        if (isEditable) {
            categoryEl.querySelector('.edit-app-category-btn')?.addEventListener('click', () => {
                const newTitle = prompt("Nuevo nombre para la categoría (no se mostrará, es solo para organización):", category.title);
                if (newTitle && newTitle.trim() !== category.title) {
                    handleAppCategoryTitleChange(category.id, newTitle.trim());
                }
            });
            categoryEl.querySelector('.delete-app-category-btn')?.addEventListener('click', () => deleteAppCategory(category.id));
            categoryEl.querySelector('.add-app-to-category-btn')?.addEventListener('click', () => openAppForm(null, category.id));
        }
    }
    function createAppCardElement(app, categoryId, appIndex, totalAppsInCategory) { const card = document.createElement('div'); card.className = 'app-card'; card.dataset.appId = app.id; let editButtonsHTML = ''; let orderButtonsHTML = ''; let newBadgeHTML = ''; if (isEditable) { editButtonsHTML = ` <div class="item-edit-buttons"> <button class="edit-app-btn" title="Editar App"> <i class="fas fa-edit"></i> </button> <button class="delete-app-btn" title="Eliminar App"> <i class="fas fa-trash-alt"></i> </button> </div>`; orderButtonsHTML = ` <div class="item-order-buttons"> <button class="move-app-left-btn" title="Mover Izquierda/Arriba" ${appIndex === 0 ? 'disabled' : ''}> ← </button> <button class="move-app-right-btn" title="Mover Derecha/Abajo" ${appIndex === totalAppsInCategory - 1 ? 'disabled' : ''}> → </button> </div>`; } if ((Date.now() - (app.timestampAdded || 0)) < (7 * 24 * 60 * 60 * 1000)) { newBadgeHTML = '<span class="new-badge">NUEVO</span>'; } card.innerHTML = ` ${newBadgeHTML} ${editButtonsHTML} <div class="app-header"> <img src="${(app.logoUrl instanceof File) ? URL.createObjectURL(app.logoUrl) : (app.logoUrl || 'https://via.placeholder.com/50?text=App')}" alt="${app.name} logo" class="app-logo interactive-image-thumbnail"> <span class="app-name">${app.name}</span> </div> <p class="app-brief-description">${app.briefDescription}</p> <div class="app-tags-pricing"> <div class="app-tags"> ${(app.tags || []).map(t => `<span class="tag">${t}</span>`).join('')} </div> <span class="app-pricing"><span>${app.pricingModel}</span></span> </div> ${orderButtonsHTML} <div class="app-actions"> <button class="visit-site-btn" data-url="${app.websiteUrl}" ${!app.websiteUrl ? 'disabled' : ''}> Visitar </button> <button class="more-info-btn" ${!app.detailedDescription && !app.tutorialUrl && !(app.isPrivate && isEditable) ? 'disabled' : ''}> Más Info </button> </div>`; if (isEditable) { card.querySelector('.edit-app-btn')?.addEventListener('click', (e) => { e.stopPropagation(); openAppForm(app.id, categoryId); }); card.querySelector('.delete-app-btn')?.addEventListener('click', (e) => { e.stopPropagation(); deleteApp(app.id, categoryId); }); card.querySelector('.move-app-left-btn')?.addEventListener('click', (e) => { e.stopPropagation(); moveApp(app.id, categoryId, -1); }); card.querySelector('.move-app-right-btn')?.addEventListener('click', (e) => { e.stopPropagation(); moveApp(app.id, categoryId, 1); }); } card.querySelector('.visit-site-btn')?.addEventListener('click', (e) => { e.stopPropagation(); if (app.websiteUrl) { window.open(app.websiteUrl, '_blank'); } }); card.querySelector('.more-info-btn')?.addEventListener('click', (e) => { e.stopPropagation(); openAppDetailsPopup(app); }); return card; }
    function openAppDetailsPopup(app) { let tutorialButtonHTML = app.tutorialUrl ? `<button class="popup-tutorial-btn" data-url="${app.tutorialUrl}">Ver Tutorial</button>` : ''; let content = `<h3>${app.name}</h3> <div style="display:flex; gap:15px; margin-bottom:15px;"> <img src="${(app.logoUrl instanceof File) ? URL.createObjectURL(app.logoUrl) : (app.logoUrl || 'https://via.placeholder.com/80?text=App')}" alt="${app.name}" class="interactive-image-thumbnail" style="max-width:80px; height:80px; object-fit:contain; border-radius:8px;"> <div> <p><strong>Precio:</strong> ${app.pricingModel}</p> ${(app.tags || []).length > 0 ? `<p><strong>Tags:</strong> ${(app.tags || []).join(', ')}</p>` : ''} <p><strong>Desc. Breve:</strong> ${app.briefDescription}</p> </div> </div> <hr style="margin:15px 0; border-color: var(--border-color);"> <h4>Descripción Detallada:</h4>`; if (app.isPrivate && !isEditable) { content += `<p><i>Información detallada privada.</i></p>`; } else { const tempDiv = document.createElement('div'); tempDiv.innerHTML = app.detailedDescription; tempDiv.querySelectorAll('.resize-handle, .delete-image-btn').forEach(el => el.remove()); tempDiv.querySelectorAll('.resizable-img-container').forEach(c => { c.style.border = 'none'; }); tempDiv.querySelectorAll('img').forEach(img => img.classList.add('interactive-image-thumbnail')); content += `<div>${tempDiv.innerHTML || "N/A"}</div>`; } content += `<div class="form-buttons" style="margin-top:20px; justify-content:space-between;"> <div> ${app.websiteUrl ? `<button class="popup-visit-site-btn" data-url="${app.websiteUrl}">Visitar Sitio</button>` : ''} ${tutorialButtonHTML} </div> <button class="close-app-details-btn cancel-btn">Cerrar</button></div>`; genericFormContainer.innerHTML = content; formModal.style.display = 'flex'; genericFormContainer.querySelector('.close-app-details-btn')?.addEventListener('click', closeFormModal); genericFormContainer.querySelector('.popup-visit-site-btn')?.addEventListener('click', (e) => { window.open(e.currentTarget.dataset.url, '_blank'); }); genericFormContainer.querySelector('.popup-tutorial-btn')?.addEventListener('click', (e) => { window.open(e.currentTarget.dataset.url, '_blank'); }); attachGenericImageEventListeners(genericFormContainer); }
    function renderPromptFolders() { promptFoldersGridContainer.innerHTML = ''; const filteredAndSortedFolders = sortItems(appData.promptFolders.filter(folder => { const searchTerm = globalSearchInput.value.toLowerCase().trim(); if (!searchTerm) return true; return folder.name.toLowerCase().includes(searchTerm) || (folder.description || '').toLowerCase().includes(searchTerm); }), 'promptFolders', 'default'); if (filteredAndSortedFolders.length === 0) { noPromptFoldersMessage.textContent = globalSearchInput.value.trim() ? "No hay carpetas que coincidan con la búsqueda." : "No hay carpetas. ¡Crea una!"; noPromptFoldersMessage.style.display = 'block'; return; } noPromptFoldersMessage.style.display = 'none'; filteredAndSortedFolders.forEach((folder) => { const originalOverallIndex = appData.promptFolders.findIndex(f => f.id === folder.id); const folderEl = document.createElement('div'); folderEl.className = 'folder-item'; folderEl.dataset.folderId = folder.id; let orderButtonsHTML = '', editButtonsHTML = ''; if (isEditable) { orderButtonsHTML = `<div class="item-order-buttons"><button class="move-folder-left-btn" title="Mover Izquierda" ${originalOverallIndex === 0 ? 'disabled' : ''}>←</button><button class="move-folder-right-btn" title="Mover Derecha" ${originalOverallIndex === appData.promptFolders.length - 1 ? 'disabled' : ''}>→</button></div>`; editButtonsHTML = `<div class="item-edit-buttons"><button class="edit-folder-btn" title="Editar Carpeta"><i class="fas fa-edit"></i></button><button class="delete-folder-btn" title="Eliminar Carpeta"><i class="fas fa-trash-alt"></i></button></div>`; } folderEl.innerHTML = ` ${orderButtonsHTML} ${editButtonsHTML} <div class="folder-header"> <img src="${(folder.iconUrl instanceof File) ? URL.createObjectURL(folder.iconUrl) : (folder.iconUrl || 'https://via.placeholder.com/50/cccccc/888888?text=F')}" alt="${folder.name} Icon" class="folder-icon interactive-image-thumbnail"> <div class="folder-name">${folder.name}</div> </div> <p class="folder-description">${folder.description || "<em>Sin descripción</em>"}</p> `; promptFoldersGridContainer.appendChild(folderEl); folderEl.addEventListener('click', (e) => { if (e.target.closest('.item-edit-buttons, .item-order-buttons, .folder-icon')) { if (e.target.classList.contains('folder-icon')) { e.stopPropagation(); return; } return; } handleFolderClick(folder.id, folderEl); }); if (isEditable) { folderEl.querySelector('.edit-folder-btn')?.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openPromptFolderForm(folder.id); }); folderEl.querySelector('.delete-folder-btn')?.addEventListener('click', (e) => { e.stopPropagation(); deletePromptFolder(folder.id); }); folderEl.querySelector('.move-folder-left-btn')?.addEventListener('click', (e) => { e.stopPropagation(); movePromptFolder(folder.id, -1); }); folderEl.querySelector('.move-folder-right-btn')?.addEventListener('click', (e) => { e.stopPropagation(); movePromptFolder(folder.id, 1); }); } }); attachGenericImageEventListeners(promptFoldersGridContainer); }
    function renderPrompts() { const promptsSectionEl = document.getElementById('promptsSection'); const promptsSectionTitle = promptsSectionEl.querySelector('.section-title-wrapper'); if (isEditable) { if (promptsSectionTitle) promptsSectionTitle.style.display = 'block'; if (promptsListContainer) { promptsListContainer.style.display = 'grid'; promptsListContainer.classList.add('edit-mode-title-view'); } if (activePromptDisplayArea) activePromptDisplayArea.style.display = 'none'; const searchTerm = globalSearchInput.value.toLowerCase().trim(); const filteredAndSortedPrompts = sortItems(appData.prompts.filter(prompt => { if (!searchTerm) return true; return prompt.title.toLowerCase().includes(searchTerm) || (prompt.descriptionHTML || '').toLowerCase().includes(searchTerm) || prompt.promptText.toLowerCase().includes(searchTerm); }), 'prompts', 'default'); if (promptsListContainer) promptsListContainer.innerHTML = ''; if (filteredAndSortedPrompts.length === 0) { if (noPromptsMessage) { noPromptsMessage.style.display = 'block'; noPromptsMessage.textContent = searchTerm ? "No hay prompts que coincidan con la búsqueda." : "No hay prompts. ¡Añade uno!"; } } else { if (noPromptsMessage) noPromptsMessage.style.display = 'none'; filteredAndSortedPrompts.forEach((prompt) => { const originalIndex = appData.prompts.findIndex(p => p.id === prompt.id); const itemEl = document.createElement('div'); itemEl.className = 'prompt-title-item'; itemEl.dataset.promptId = prompt.id; itemEl.innerHTML = ` <span class="prompt-title-text">${prompt.title}</span> <div class="item-controls"> <button class="edit-prompt-btn" title="Editar"><i class="fas fa-edit"></i></button> <button class="move-prompt-up-btn" title="Subir" ${originalIndex === 0 ? 'disabled' : ''}>↑</button> <button class="move-prompt-down-btn" title="Bajar" ${originalIndex === appData.prompts.length - 1 ? 'disabled' : ''}>↓</button> <button class="delete-prompt-btn" title="Eliminar"><i class="fas fa-trash-alt"></i></button> </div>`; if (promptsListContainer) promptsListContainer.appendChild(itemEl); itemEl.querySelector('.edit-prompt-btn').addEventListener('click', (e) => { e.stopPropagation(); openPromptForm(prompt.id); }); itemEl.querySelector('.delete-prompt-btn').addEventListener('click', (e) => { e.stopPropagation(); deletePrompt(prompt.id); }); itemEl.querySelector('.move-prompt-up-btn').addEventListener('click', (e) => { e.stopPropagation(); movePrompt(prompt.id, -1); }); itemEl.querySelector('.move-prompt-down-btn').addEventListener('click', (e) => { e.stopPropagation(); movePrompt(prompt.id, 1); }); }); } if (promptsListContainer) attachGenericImageEventListeners(promptsListContainer); } else { if (promptsListContainer) promptsListContainer.style.display = 'none'; if (activePromptDisplayArea && activePromptDisplayArea.innerHTML.trim() !== '') { if (promptsSectionTitle) promptsSectionTitle.style.display = 'block'; if (activePromptDisplayArea) activePromptDisplayArea.style.display = 'block'; if (noPromptsMessage) noPromptsMessage.style.display = 'none'; } else { if (promptsSectionTitle) promptsSectionTitle.style.display = 'none'; if (activePromptDisplayArea) activePromptDisplayArea.style.display = 'none'; if (noPromptsMessage) noPromptsMessage.style.display = 'none'; } } }
    
    function closeActivePopups() {
        if (activePopups.folderMenu) {
            activePopups.folderMenu.remove();
            activePopups.folderMenu = null;
        }
        document.querySelectorAll('.prompt-link-description-popup').forEach(pop => pop.remove());
    }

    function movePromptInFolder(promptId, folderId, direction) {
        const siblingIndices = appData.prompts
            .map((p, index) => (p.folderId === folderId ? index : -1))
            .filter(index => index !== -1);
        
        const currentGlobalIndex = appData.prompts.findIndex(p => p.id === promptId);
        if (currentGlobalIndex === -1) return;

        const currentLocalIndex = siblingIndices.indexOf(currentGlobalIndex);
        if (currentLocalIndex === -1) return;

        const newLocalIndex = currentLocalIndex + direction;

        if (newLocalIndex < 0 || newLocalIndex >= siblingIndices.length) return;

        const sourceIndex = siblingIndices[currentLocalIndex];
        const targetIndex = siblingIndices[newLocalIndex];

        const temp = appData.prompts[sourceIndex];
        appData.prompts[sourceIndex] = appData.prompts[targetIndex];
        appData.prompts[targetIndex] = temp;
    }

    function handleFolderClick(folderId, folderElement) {
        closeActivePopups();

        const menu = document.body.appendChild(document.createElement('div'));
        menu.className = 'folder-prompts-menu';

        const ul = menu.appendChild(document.createElement('ul'));
        const promptsInFolder = appData.prompts.filter(p => p.folderId === folderId);

        if (promptsInFolder.length > 6) {
            ul.style.overflowY = 'auto';
            ul.style.maxHeight = (6.5 * 40) + 'px';
        }

        if (promptsInFolder.length > 0) {
            const sortedPromptsInFolder = promptsInFolder.sort((a, b) => appData.prompts.indexOf(a) - appData.prompts.indexOf(b));

            sortedPromptsInFolder.forEach((prompt, index) => {
                const li = ul.appendChild(document.createElement('li'));
                const promptLinkHTML = `<a href="#" class="prompt-title-link" data-prompt-id="${prompt.id}">${prompt.title}</a>`;
                
                let controlsHTML = '';
                if (isEditable) {
                    const isFirst = index === 0;
                    const isLast = index === sortedPromptsInFolder.length - 1;
                    controlsHTML = `
                        <div class="prompt-controls">
                            <button class="move-prompt-in-folder-btn" data-prompt-id="${prompt.id}" data-direction="-1" title="Subir" ${isFirst ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                            <button class="move-prompt-in-folder-btn" data-prompt-id="${prompt.id}" data-direction="1" title="Bajar" ${isLast ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            <button class="remove-prompt-from-folder-btn" data-prompt-id="${prompt.id}" title="Quitar de la carpeta"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    `;
                }
                li.innerHTML = promptLinkHTML + controlsHTML;
                
                const titleLink = li.querySelector('a.prompt-title-link');
                titleLink.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closeActivePopups(); if (isEditable) { openPromptForm(prompt.id); } else { showPromptInModal(prompt.id); } });
                titleLink.addEventListener('mouseenter', (e) => {
                    document.querySelectorAll('.prompt-link-description-popup').forEach(pop => pop.remove());
                    const tempDiv = document.createElement('div'); tempDiv.innerHTML = prompt.descriptionHTML || ''; const descriptionText = tempDiv.textContent || tempDiv.innerText || ''; if (descriptionText.trim() === '') return;
                    const descPopup = document.createElement('div'); descPopup.className = 'prompt-link-description-popup'; descPopup.textContent = descriptionText; document.body.appendChild(descPopup);
                    descPopup.style.visibility = 'hidden'; descPopup.style.display = 'block'; const linkRect = titleLink.getBoundingClientRect(); const menuRect = menu.getBoundingClientRect(); const popupWidth = descPopup.offsetWidth; const popupHeight = descPopup.offsetHeight; const margin = 10; let top, left;
                    if (menuRect.right + popupWidth + margin < window.innerWidth) { left = menuRect.right + margin; } else { left = menuRect.left - popupWidth - margin; }
                    if (linkRect.top + popupHeight + margin < window.innerHeight) { top = linkRect.top; } else { top = window.innerHeight - popupHeight - margin; }
                    if (top < margin) top = margin;
                    descPopup.style.left = `${left + window.scrollX}px`; descPopup.style.top = `${top + window.scrollY}px`; descPopup.style.visibility = 'visible';
                });
                titleLink.addEventListener('mouseleave', () => { const existingPopup = document.querySelector('.prompt-link-description-popup'); if (existingPopup) existingPopup.remove(); });
                
                if (isEditable) {
                    li.querySelectorAll('.move-prompt-in-folder-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); const pId = e.currentTarget.dataset.promptId; const dir = parseInt(e.currentTarget.dataset.direction, 10); movePromptInFolder(pId, folderId, dir); handleFolderClick(folderId, folderElement); }));
                    const removeBtn = li.querySelector('.remove-prompt-from-folder-btn'); if (removeBtn) { removeBtn.addEventListener('click', (e) => { e.stopPropagation(); if (confirm(`¿Seguro que quieres quitar el prompt "${prompt.title}" de esta carpeta?`)) { const pId = e.currentTarget.dataset.promptId; const promptToUpdate = appData.prompts.find(p => p.id === pId); if (promptToUpdate) { promptToUpdate.folderId = null; handleFolderClick(folderId, folderElement); } } }); }
                }
            });
        } else {
            ul.innerHTML = '<li><em style="color:var(--placeholder-text-color);">Esta carpeta está vacía</em></li>';
        }

        if (isEditable) {
            const doneButton = menu.appendChild(document.createElement('button'));
            doneButton.className = 'close-folder-menu-btn'; doneButton.textContent = 'Hecho';
            doneButton.addEventListener('click', (e) => { e.stopPropagation(); closeActivePopups(); });
        }

        activePopups.folderMenu = menu;
        
        menu.style.visibility = 'hidden';
        menu.style.display = 'flex';
        
        const menuHeight = menu.offsetHeight;
        const folderRect = folderElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const spaceBelow = windowHeight - folderRect.bottom;
        
        let topPosition;

        if (spaceBelow < menuHeight && folderRect.top > spaceBelow) {
            topPosition = folderRect.top - menuHeight + window.scrollY;
        } else {
            topPosition = folderRect.bottom + 5 + window.scrollY;
        }

        menu.style.left = `${folderRect.left + window.scrollX}px`;
        menu.style.top = `${topPosition}px`;
        menu.style.visibility = 'visible';
    }

    function showPromptInModal(promptId) {
        const prompt = appData.prompts.find(p => p.id === promptId);
        if (!prompt) return;
        const promptImagesHTML = (prompt.exampleImageUrls || []).filter(url => typeof url === 'string' && url).map((imgUrl, imgIdx) => `<img src="${imgUrl}" alt="Ejemplo ${imgIdx + 1}" class="interactive-image-thumbnail" style="max-width: 150px; height: auto; border-radius: 6px; cursor: pointer;">`).join('');
        const modalButtonsHTML = `<div class="form-buttons" style="justify-content: space-between; align-items: center; flex-wrap: wrap; margin-top: 20px; margin-bottom: 15px;"><div style="display: flex; gap: 10px; flex-wrap: wrap;"><button class="save-btn" id="modalCopySpanishPromptBtn">Copiar Prompt en ESPAÑOL</button>${prompt.englishPromptText ? `<button id="modalCopyEnglishPromptBtn" class="save-btn">Copiar Prompt en INGLÉS</button>` : ''}</div><button class="cancel-btn" id="modalClosePromptBtn">Cerrar</button></div>`;
        const contentHTML = `<div style="padding: 10px;"><h3>${prompt.title}</h3><hr style="margin: 15px 0; border-color: var(--border-color);"><div class="form-group"><label>Descripción:</label><div class="description-preview" style="display: block; min-height: 50px; max-height: 150px; background-color: var(--bg-color); padding: 10px; border-radius: 6px;">${prompt.descriptionHTML || '<em>Sin descripción.</em>'}</div></div>${promptImagesHTML ? `<div class="form-group"><label style="text-align: center; color: red; display: block; width: 100%; margin-bottom: 10px;">Imágenes de Ejemplo: Situa el ratón sobre ellas para Zoom. Clica sobre ellas para verla a tamaño completo.</label><div class="prompt-example-images-container">${promptImagesHTML}</div></div>` : ''}${modalButtonsHTML}<div class="form-group"><label>Prompt a copiar:</label><textarea readonly style="width: 100%; min-height: 150px; font-family: 'Courier New', monospace; background-color: var(--bg-color); color: var(--text-color); text-align: left; margin-top: 5px;">${prompt.promptText}</textarea></div></div>`;
        genericFormContainer.innerHTML = contentHTML;
        formModal.style.display = 'flex';
        genericFormContainer.querySelector('#modalCopySpanishPromptBtn').addEventListener('click', () => { copyToClipboard(prompt.promptText, "Prompt en español copiado."); });
        const copyEnglishBtn = genericFormContainer.querySelector('#modalCopyEnglishPromptBtn');
        if (copyEnglishBtn) { copyEnglishBtn.addEventListener('click', () => { if (prompt.englishPromptText) { copyToClipboard(prompt.englishPromptText, "Prompt en inglés copiado."); } }); }
        genericFormContainer.querySelector('#modalClosePromptBtn').addEventListener('click', closeFormModal);
        attachGenericImageEventListeners(genericFormContainer);
    }
    
    // --- MANEJO DE EVENTOS Y DATOS (CRUD, etc.) ---
    function closeFormModal() { if (formModal) formModal.style.display = 'none'; if (genericFormContainer) genericFormContainer.innerHTML = ''; }
    function handleAppCategoryTitleChange(categoryId, newTitle) { const category = appData.aiAppsCategories.find(c => c.id === categoryId); if (category && newTitle && category.title !== newTitle) { category.title = newTitle; category.timestampUpdated = Date.now(); renderFilteredApps(); } }
    function handleAddAppCategory() { if (!isEditable) return; const title = prompt("Nombre para la nueva categoría de Apps:", "Nueva Categoría"); if (title && title.trim()) { const newCategory = { id: `catApp_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, title: title.trim(), apps: [], timestampAdded: Date.now(), timestampUpdated: Date.now() }; appData.aiAppsCategories.push(newCategory); renderFilteredApps(); } }
    function deleteAppCategory(categoryId) { if (!isEditable) return; const category = appData.aiAppsCategories.find(c => c.id === categoryId); if (!category) return; if (confirm(`¿Eliminar la categoría "${category.title}" y todas sus apps? Este cambio se guardará al salir del modo edición.`)) { appData.aiAppsCategories = appData.aiAppsCategories.filter(c => c.id !== categoryId); renderFilteredApps(); } }
    function moveApp(appId, categoryId, direction) { const category = appData.aiAppsCategories.find(c => c.id === categoryId); if (!category) return; const appIndex = category.apps.findIndex(a => a.id === appId); if (appIndex === -1) return; const newIndex = appIndex + direction; if (newIndex < 0 || newIndex >= category.apps.length) return; const [movedApp] = category.apps.splice(appIndex, 1); category.apps.splice(newIndex, 0, movedApp); renderFilteredApps(); }
    function deleteApp(appId, categoryId) { if (!isEditable) return; const category = appData.aiAppsCategories.find(c => c.id === categoryId); if (!category || !category.apps) return; const app = category.apps.find(a => a.id === appId); if (!app) return; if (confirm(`¿Eliminar la app "${app.name}"? Este cambio se guardará al salir del modo edición.`)) { category.apps = category.apps.filter(a => a.id !== appId); renderFilteredApps(); } }
    function saveAppHandler() { const editingAppId = document.getElementById('editingAppId').value; const targetCategoryId = document.getElementById('targetAppCategoryId').value; const category = appData.aiAppsCategories.find(c => c.id === targetCategoryId); if (!category) { alert("Categoría no encontrada."); return; } const logoFile = document.getElementById('appLogoFileInput').files[0]; let logoValue = document.getElementById('appLogoUrlInput').value.trim(); if (logoFile) { logoValue = logoFile; } else if (editingAppId) { const existingApp = category.apps.find(a => a.id === editingAppId); if (!logoValue && existingApp && typeof existingApp.logoUrl === 'string') { logoValue = existingApp.logoUrl; } } const appDataObj = { id: editingAppId || `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: document.getElementById('appNameInput').value.trim(), websiteUrl: document.getElementById('appWebsiteUrlInput').value.trim(), logoUrl: logoValue, briefDescription: document.getElementById('appBriefDescriptionInput').value.trim(), detailedDescription: document.getElementById('appDetailedDescriptionInput').value.trim(), tags: document.getElementById('appTagsInput').value.split(',').map(t => t.trim()).filter(Boolean), pricingModel: document.getElementById('appPricingModelSelect').value, tutorialUrl: document.getElementById('appTutorialUrlInput').value.trim(), isPrivate: document.getElementById('appIsPrivateCheckbox').checked, timestampUpdated: Date.now(), timestampAdded: editingAppId ? (category.apps.find(a=>a.id===editingAppId)?.timestampAdded || Date.now()) : Date.now() }; if (!appDataObj.name) { alert("Nombre de App requerido."); return; } if (editingAppId) { const appIndex = category.apps.findIndex(a => a.id === editingAppId); if (appIndex > -1) category.apps[appIndex] = appDataObj; } else { category.apps.push(appDataObj); } closeFormModal(); renderFilteredApps(); }
    function savePromptHandler() { const editingPromptId = document.getElementById('editingPromptId').value; let existingPrompt = editingPromptId ? appData.prompts.find(p => p.id === editingPromptId) : null; let finalImageItems = [...currentEditingPromptImages]; tempPromptImageFiles.forEach(item => { if (finalImageItems.length < 3) finalImageItems.push(item.file); }); const selectedFolderId = document.getElementById('promptFolderSelect').value; const promptDataObj = { id: editingPromptId || `prompt_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, title: document.getElementById('promptTitleInput').value.trim(), descriptionHTML: document.getElementById('promptDescriptionHTMLInput').value.trim(), exampleImageUrls: finalImageItems, promptText: document.getElementById('promptTextInput').value.trim(), englishPromptText: document.getElementById('promptTextEnInput').value.trim(), folderId: selectedFolderId || null, timestampUpdated: Date.now(), timestampAdded: editingPromptId ? (existingPrompt?.timestampAdded || Date.now()) : Date.now() }; if (!promptDataObj.title || !promptDataObj.promptText) { alert("Título y Texto del Prompt son obligatorios."); return; } if (editingPromptId) { const promptIndex = appData.prompts.findIndex(p => p.id === editingPromptId); if (promptIndex > -1) appData.prompts[promptIndex] = promptDataObj; } else { appData.prompts.push(promptDataObj); } closeFormModal(); renderPrompts(); renderPromptFolders(); }
    function deletePrompt(promptId) { if (!isEditable) return; const prompt = appData.prompts.find(p => p.id === promptId); if (!prompt) return; if (confirm(`¿Eliminar prompt "${prompt.title}"? Este cambio se guardará al salir.`)) { appData.prompts = appData.prompts.filter(p => p.id !== promptId); renderPrompts(); renderPromptFolders(); } }
    function movePrompt(promptId, direction) { const index = appData.prompts.findIndex(p => p.id === promptId); if (index === -1) return; const newIndex = index + direction; if (newIndex < 0 || newIndex >= appData.prompts.length) return; const [movedPrompt] = appData.prompts.splice(index, 1); appData.prompts.splice(newIndex, 0, movedPrompt); renderPrompts(); }
    function savePromptFolderHandler(iconMarkedForDelete = false) { const editingFolderId = document.getElementById('editingFolderId').value; const iconFile = document.getElementById('folderIconFileInput').files[0]; const iconUrl = document.getElementById('folderIconUrlInput').value.trim(); let existingFolder = editingFolderId ? appData.promptFolders.find(f => f.id === editingFolderId) : null; let finalIconValue = ""; if (iconFile) { finalIconValue = iconFile; } else if (iconUrl) { finalIconValue = iconUrl; } else if (existingFolder && !iconMarkedForDelete) { finalIconValue = existingFolder.iconUrl; } const folderDataObj = { id: editingFolderId || `folder_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, name: document.getElementById('folderNameInput').value.trim(), iconUrl: finalIconValue, description: document.getElementById('folderDescriptionInput').value.trim(), timestampUpdated: Date.now(), timestampAdded: editingFolderId ? (existingFolder?.timestampAdded || Date.now()) : Date.now() }; if (!folderDataObj.name) { alert("Nombre de carpeta requerido."); return; } if (editingFolderId) { const idx = appData.promptFolders.findIndex(f => f.id === editingFolderId); if (idx > -1) appData.promptFolders[idx] = folderDataObj; } else { appData.promptFolders.push(folderDataObj); } closeFormModal(); renderPromptFolders(); }
    function deletePromptFolder(folderId) { if (!isEditable) return; const folder = appData.promptFolders.find(f => f.id === folderId); if (!folder) return; if (confirm(`¿Eliminar carpeta "${folder.name}"? Los prompts se desvincularán. El cambio se guardará al salir.`)) { appData.promptFolders = appData.promptFolders.filter(f => f.id !== folderId); appData.prompts.forEach(p => { if (p.folderId === folderId) p.folderId = null; }); renderPromptFolders(); renderPrompts(); } }
    function movePromptFolder(folderId, direction) { const index = appData.promptFolders.findIndex(f => f.id === folderId); if (index === -1) return; const newIndex = index + direction; if (newIndex < 0 || newIndex >= appData.promptFolders.length) return; const [movedFolder] = appData.promptFolders.splice(index, 1); appData.promptFolders.splice(newIndex, 0, movedFolder); renderPromptFolders(); }
    function openAppForm(appId = null, categoryId = null) { if (!isEditable) return; const appToEdit = appId ? appData.aiAppsCategories.flatMap(c => c.apps).find(a => a.id === appId) : null; let targetCategoryId = categoryId; if (appToEdit && !targetCategoryId) { const catContainingApp = appData.aiAppsCategories.find(c => c.apps.some(a => a.id === appId)); if (catContainingApp) targetCategoryId = catContainingApp.id; } if (!targetCategoryId) { const categories = appData.aiAppsCategories; if (categories.length > 0) targetCategoryId = categories[0].id; else { alert("No hay categorías de Apps. Crea una primero."); return; } } const formTitle = appToEdit ? `Editar App: ${appToEdit.name}` : "Añadir Nueva App"; genericFormContainer.innerHTML = ` <h3>${formTitle}</h3> <input type="hidden" id="editingAppId" value="${appId || ''}"> <input type="hidden" id="targetAppCategoryId" value="${targetCategoryId}"> <div class="form-group"><label for="appNameInput">Nombre:</label><input type="text" id="appNameInput" value="${appToEdit?.name || ''}"></div> <div class="form-group"><label for="appWebsiteUrlInput">URL Sitio Web:</label><input type="url" id="appWebsiteUrlInput" value="${appToEdit?.websiteUrl || ''}"></div> <div class="form-group"><label for="appLogoUrlInput">URL Logo (o subir):</label> <input type="url" id="appLogoUrlInput" value="${(appToEdit?.logoUrl && typeof appToEdit.logoUrl === 'string') ? appToEdit.logoUrl : ''}" placeholder="http://..."> <input type="file" id="appLogoFileInput" accept="image/*" style="margin-top: 5px;"> <div id="appLogoPreviewContainer" style="margin-top:5px;"> ${((appToEdit?.logoUrl) ? (typeof appToEdit.logoUrl === 'string' ? `<img src="${appToEdit.logoUrl}" style="max-width:50px; max-height:50px;">` : `<img src="${URL.createObjectURL(appToEdit.logoUrl)}" style="max-width:50px; max-height:50px;">`) : '')} </div> </div> <div class="form-group"><label for="appBriefDescriptionInput">Desc. Breve:</label><textarea id="appBriefDescriptionInput" rows="2">${appToEdit?.briefDescription || ''}</textarea></div> <div class="form-group"> <label for="appDetailedDescriptionInput">Desc. Detallada (HTML):</label> <textarea id="appDetailedDescriptionInput" rows="5">${appToEdit?.detailedDescription || ''}</textarea> </div> <div class="form-group"><label for="appTagsInput">Tags (coma):</label><input type="text" id="appTagsInput" value="${(appToEdit?.tags || []).join(', ')}"></div> <div class="form-group"><label for="appPricingModelSelect">Precio:</label> <select id="appPricingModelSelect"> ${['Gratis', 'Freemium', 'Por Créditos', 'De Pago', 'Prueba Gratuita'].map(p => `<option value="${p}" ${appToEdit?.pricingModel === p ? 'selected' : ''}>${p}</option>`).join('')} </select> </div> <div class="form-group"><label for="appTutorialUrlInput">URL Tutorial:</label><input type="url" id="appTutorialUrlInput" value="${appToEdit?.tutorialUrl || ''}"></div> <div class="form-group"><label><input type="checkbox" id="appIsPrivateCheckbox" ${appToEdit?.isPrivate ? 'checked' : ''}> Info detallada privada</label></div> <div class="form-buttons"><button id="saveAppBtn" class="save-btn">GUARDAR</button><button id="cancelFormBtn" type="button" class="cancel-btn">CANCELAR</button></div> `; document.getElementById('saveAppBtn').onclick = saveAppHandler; document.getElementById('cancelFormBtn').onclick = closeFormModal; formModal.style.display = 'flex'; }
    function openPromptForm(promptId = null) { if (!isEditable) return; const promptToEdit = promptId ? appData.prompts.find(p => p.id === promptId) : null; const formTitle = promptToEdit ? `Editar Prompt: ${promptToEdit.title}` : "Añadir Nuevo Prompt"; tempPromptImageFiles = []; currentEditingPromptImages = promptToEdit ? [...(promptToEdit.exampleImageUrls || []).filter(url => typeof url === 'string')] : []; genericFormContainer.innerHTML = ` <h3>${formTitle}</h3> <input type="hidden" id="editingPromptId" value="${promptId || ''}"> <div class="form-group"><label for="promptTitleInput">Título:</label><input type="text" id="promptTitleInput" value="${promptToEdit?.title || ''}"></div> <div class="form-group"><label for="promptDescriptionHTMLInput">Descripción (HTML):</label><textarea id="promptDescriptionHTMLInput" rows="4">${promptToEdit?.descriptionHTML || ''}</textarea></div> <div class="form-group"><label for="promptFolderSelect">Carpeta:</label> <select id="promptFolderSelect"> <option value="">(Sin carpeta)</option> ${appData.promptFolders.map(folder => `<option value="${folder.id}" ${promptToEdit?.folderId === folder.id ? 'selected' : ''}>${folder.name}</option>`).join('')} </select> </div> <div class="form-group"><label for="promptExampleImageFilesInput">Imágenes Ejemplo (hasta 3):</label> <input type="file" id="promptExampleImageFilesInput" multiple accept="image/*" style="margin-bottom:10px;"> <div id="promptImagePreviewContainer" class="image-preview-container"></div> </div> <div class="form-group"><label for="promptTextInput">Texto del Prompt (Español):</label><textarea id="promptTextInput" rows="6">${promptToEdit?.promptText || ''}</textarea></div> <div class="form-group"> <label for="promptTextEnInput">Texto del Prompt (Inglés):</label> <textarea id="promptTextEnInput" rows="4">${promptToEdit?.englishPromptText || ''}</textarea> </div> <div class="form-buttons"><button id="savePromptBtn" class="save-btn">Guardar</button><button id="cancelFormBtn" type="button" class="cancel-btn">Cancelar</button></div> `; renderPromptFormImagePreviews(); document.getElementById('promptExampleImageFilesInput').addEventListener('change', handlePromptFormImageSelection); document.getElementById('savePromptBtn').onclick = savePromptHandler; document.getElementById('cancelFormBtn').onclick = closeFormModal; formModal.style.display = 'flex'; }
    function handlePromptFormImageSelection(event) { const files = Array.from(event.target.files); files.forEach(file => { if ((currentEditingPromptImages.length + tempPromptImageFiles.length) < 3) { const reader = new FileReader(); reader.onload = (e) => { tempPromptImageFiles.push({ file: file, previewUrl: e.target.result, id: `temp_${Date.now()}_${Math.random()}` }); renderPromptFormImagePreviews(); }; reader.readAsDataURL(file); } else { alert("Solo puedes tener hasta 3 imágenes en total."); } }); event.target.value = ""; }
    function renderPromptFormImagePreviews() { const container = document.getElementById('promptImagePreviewContainer'); if (!container) return; container.innerHTML = ''; currentEditingPromptImages.forEach((url, index) => { const prevWrapper = document.createElement('div'); prevWrapper.className = 'img-preview-wrapper'; prevWrapper.innerHTML = `<img src="${url}" alt="Imagen existente ${index + 1}"> <button class="delete-prompt-image-btn" data-type="existing" data-index="${index}" title="Eliminar esta imagen existente">×</button>`; container.appendChild(prevWrapper); }); tempPromptImageFiles.forEach((item, index) => { const prevWrapper = document.createElement('div'); prevWrapper.className = 'img-preview-wrapper'; prevWrapper.innerHTML = `<img src="${item.previewUrl}" alt="Nueva imagen ${index + 1}"> <button class="delete-prompt-image-btn" data-type="temp" data-id="${item.id}" title="Eliminar esta nueva imagen">×</button>`; container.appendChild(prevWrapper); }); container.querySelectorAll('.delete-prompt-image-btn').forEach(btn => { btn.onclick = (e) => { const type = e.currentTarget.dataset.type; if (type === 'existing') { const index = parseInt(e.currentTarget.dataset.index); currentEditingPromptImages.splice(index, 1); } else if (type === 'temp') { const id = e.currentTarget.dataset.id; tempPromptImageFiles = tempPromptImageFiles.filter(f => f.id !== id); } renderPromptFormImagePreviews(); }; }); }
    function openPromptFolderForm(folderId = null) { if (!isEditable) return; const folderToEdit = folderId ? appData.promptFolders.find(f => f.id === folderId) : null; const formTitle = folderToEdit ? `Editar Carpeta: ${folderToEdit.name}` : "Añadir Carpeta"; genericFormContainer.innerHTML = ` <h3>${formTitle}</h3> <input type="hidden" id="editingFolderId" value="${folderId || ''}"> <div class="form-group"><label for="folderNameInput">Nombre:</label><input type="text" id="folderNameInput" value="${folderToEdit?.name || ''}"></div> <div class="form-group"><label for="folderIconFileInput">Icono (URL o subir):</label> <input type="url" id="folderIconUrlInput" value="${(folderToEdit?.iconUrl && typeof folderToEdit.iconUrl === 'string') ? folderToEdit.iconUrl : ''}" placeholder="http://..." style="margin-bottom:5px;"> <input type="file" id="folderIconFileInput" accept="image/*" style="margin-bottom:5px;"> <div id="folderIconPreviewContainer" class="image-preview-container" style="min-height:30px; justify-content:start; align-items:center;"> ${((folderToEdit?.iconUrl) ? (typeof folderToEdit.iconUrl === 'string' ? `<div class="img-preview-wrapper" style="border:1px solid var(--border-color); padding:5px; display:inline-block;"><img src="${folderToEdit.iconUrl}" alt="Icono" style="max-width:50px; max-height:50px; vertical-align:middle;"><button type="button" class="delete-prompt-image-btn" id="deleteExistingFolderIconBtn" title="Eliminar icono" style="position:relative; top:auto; right:auto; margin-left:5px;">×</button></div>` : `<div class="img-preview-wrapper"><img src="${URL.createObjectURL(folderToEdit.iconUrl)}" alt="Icono" style="max-width:50px; max-height:50px;"><button type="button" class="delete-prompt-image-btn" id="deleteNewFolderIconBtn">x</button></div>`) : '')} </div> </div> <div class="form-group"><label for="folderDescriptionInput">Descripción:</label><textarea id="folderDescriptionInput" rows="3">${folderToEdit?.description || ''}</textarea></div> <div class="form-buttons"><button id="saveFolderBtn" class="save-btn">Guardar</button><button id="cancelFormBtn" type="button" class="cancel-btn">Cancelar</button></div> `; const iconUrlInput = document.getElementById('folderIconUrlInput'); const iconFileInput = document.getElementById('folderIconFileInput'); const iconPreviewContainer = document.getElementById('folderIconPreviewContainer'); let iconToDelete = false; function updateIconPreview(src = null) { iconPreviewContainer.innerHTML = ''; if (src) { iconPreviewContainer.innerHTML = `<div class="img-preview-wrapper" style="border:1px solid var(--border-color); padding:5px; display:inline-block;"><img src="${src}" alt="Icono" style="max-width:50px; max-height:50px; vertical-align:middle;"><button type="button" class="delete-prompt-image-btn" id="deleteNewFolderIconBtn" title="Quitar nuevo icono" style="position:relative; top:auto; right:auto; margin-left:5px;">×</button></div>`; iconPreviewContainer.querySelector('#deleteNewFolderIconBtn').onclick = () => { iconFileInput.value = ''; iconUrlInput.value = ''; updateIconPreview(); }; } } iconFileInput.onchange = (e) => { const file = e.target.files[0]; if (file) { iconUrlInput.value = ''; iconToDelete = false; const reader = new FileReader(); reader.onload = (ev) => updateIconPreview(ev.target.result); reader.readAsDataURL(file); } else { updateIconPreview(); } }; iconUrlInput.oninput = () => { const url = iconUrlInput.value.trim(); if (url) { iconFileInput.value = ''; iconToDelete = false; updateIconPreview(url); } else { updateIconPreview(); } }; const deleteExistingBtn = document.getElementById('deleteExistingFolderIconBtn'); if (deleteExistingBtn) { deleteExistingBtn.onclick = () => { if (confirm("¿Eliminar el icono actual?")) { iconUrlInput.value = ''; iconFileInput.value = ''; iconToDelete = true; updateIconPreview(); iconPreviewContainer.innerHTML = '<p style="font-size:0.9em; color:grey;">Icono actual marcado para eliminar.</p>'; } }; } document.getElementById('saveFolderBtn').onclick = () => savePromptFolderHandler(iconToDelete); document.getElementById('cancelFormBtn').onclick = closeFormModal; formModal.style.display = 'flex'; }
    function sortItems(items, itemType, sortValue) { items.sort((a, b) => { let valA, valB; const nameField = (itemType === 'aiAppsCategories' || itemType === 'prompts') ? 'title' : 'name'; switch (sortValue) { case 'newest': return (b.timestampUpdated || b.timestampAdded || 0) - (a.timestampUpdated || a.timestampAdded || 0); case 'oldest': return (a.timestampUpdated || a.timestampAdded || 0) - (b.timestampUpdated || b.timestampAdded || 0); case 'nameAsc': valA = (a[nameField] || '').toLowerCase(); valB = (b[nameField] || '').toLowerCase(); return valA.localeCompare(valB); case 'nameDesc': valA = (a[nameField] || '').toLowerCase(); valB = (b[nameField] || '').toLowerCase(); return valB.localeCompare(valA); default: return 0; } }); return items; }
    function applyFiltersAndSort() { appData.settings.lastAppPricingFilter = appPricingFilter.value; renderAll(); }
    
    // --- MODO EDICIÓN, TEMA & UTILIDADES ---
    window.checkPassword = async (password) => { const formData = new FormData(); formData.append('password', password); try { const r = await fetch('/Paginas/pagina_apps_prompts_imagenes/validar_password.php', { method: 'POST', body: formData }); if (!r.ok) { console.error("Server err pass val:", r.status); const errTxt = await r.text(); console.error("Server err detail:", errTxt); alert(`Error del servidor (${r.status}). Revisa la consola.`); return false; } const ct = r.headers.get("content-type"); if (ct && ct.includes("application/json")) { const res = await r.json(); return res && typeof res.success === 'boolean' ? res.success : (console.error("Respuesta JSON inesperada:", res), alert("Respuesta JSON inesperada. Validación fallida."), false); } else { const errTxt = await r.text(); console.error("Respuesta no JSON:", errTxt); alert("Respuesta inesperada del servidor. Revisa la consola y el script PHP."); return false; } } catch (e) { console.error("Error de red/parse en validación de contraseña:", e); alert("Error de red/parse. Revisa la conexión y el script PHP."); return false; } };
    function toggleEditMode() { if (isEditable) { saveDataToBackend().then(success => { if (success) { showPersistentMessage("Cambios guardados correctamente.", "success"); } else { showPersistentMessage("Error: No se pudieron guardar los cambios. Los cambios no guardados permanecerán en la sesión actual. Revisa la consola para más detalles.", "error"); } isEditable = false; currentPassword = ""; updateEditModeUI(); }); } else { adminPasswordModal.style.display = 'flex'; adminPasswordInput.value = ''; adminPasswordInput.focus(); } }
    async function handlePasswordSubmit() { const pass = adminPasswordInput.value; if (!pass) return; showLoadingMessage("Verificando contraseña..."); try { const isValid = await window.checkPassword(pass); if (isValid) { isEditable = true; currentPassword = pass; adminPasswordModal.style.display = 'none'; updateEditModeUI(); } else { alert('Contraseña incorrecta.'); adminPasswordInput.value = ''; adminPasswordInput.focus(); } } catch (error) { alert("Error al verificar la contraseña."); console.error("Error en handlePasswordSubmit:", error); } finally { clearLoadingMessage(); } }
    function updateEditModeUI() { document.body.classList.toggle('edit-mode', isEditable); editModeToggleBtn.textContent = isEditable ? 'Guardar y Salir del Modo Edición' : 'Activar Modo Edición'; editModeToggleBtn.classList.toggle('active', isEditable); [addAppCategoryBtn, addPromptBtn, addPromptFolderBtn, changeBgBtn, orderAppCategoriesBtn].forEach(btn => { if (btn) btn.style.display = isEditable ? 'block' : 'none'; }); renderAll(); }
    function applyInitialSettings() { if (appData.settings.theme === 'light') { document.body.classList.remove('dark-theme'); themeSwitcherBtn.textContent = 'Tema Oscuro'; } else { document.body.classList.add('dark-theme'); themeSwitcherBtn.textContent = 'Tema Claro'; appData.settings.theme = 'dark';} if (appData.settings.background) document.body.style.backgroundImage = appData.settings.background; }
    function toggleTheme() { const isDark = document.body.classList.toggle('dark-theme'); appData.settings.theme = isDark ? 'dark' : 'light'; themeSwitcherBtn.textContent = isDark ? 'Tema Claro' : 'Tema Oscuro'; }
    function handleBackgroundChange(event) { if (!isEditable) return; const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { document.body.style.backgroundImage = `url(${e.target.result})`; appData.settings.background = `url(${e.target.result})`; }; reader.readAsDataURL(file); hiddenBgInput.value = ''; }
    function openAppCategoryOrderModal() { if (!isEditable) return; appCategoryOrderList.innerHTML = ''; appData.aiAppsCategories.forEach((category, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="category-name">${category.title}</span><span class="order-buttons"><button title="Mover arriba" ${index === 0 ? 'disabled' : ''} data-direction="-1" data-cat-id="${category.id}">↑</button><button title="Mover abajo" ${index === appData.aiAppsCategories.length - 1 ? 'disabled' : ''} data-direction="1" data-cat-id="${category.id}">↓</button></span>`; appCategoryOrderList.appendChild(li); }); appCategoryOrderModal.style.display = 'flex'; }
    function handleAppCategoryOrderChange(event) { if (!event.target.matches('#appCategoryOrderList button')) return; const categoryId = event.target.dataset.catId; const direction = parseInt(event.target.dataset.direction); const index = appData.aiAppsCategories.findIndex(cat => cat.id === categoryId); if (index === -1) return; const newIndex = index + direction; if (newIndex < 0 || newIndex >= appData.aiAppsCategories.length) return; const [movedCategory] = appData.aiAppsCategories.splice(index, 1); appData.aiAppsCategories.splice(newIndex, 0, movedCategory); openAppCategoryOrderModal(); }
    function closeAndSaveAppCategoryOrder() { appCategoryOrderModal.style.display = 'none'; renderFilteredApps(); }
    function openFullscreenImage(src) { fullscreenImage.src = src; fullscreenImageViewer.style.display = 'flex'; }
    function closeFullscreenImage() { fullscreenImageViewer.style.display = 'none'; fullscreenImage.src = ''; }
    function attachGenericImageEventListeners(containerElement) { containerElement.querySelectorAll('.interactive-image-thumbnail').forEach(img => { img.removeEventListener('click', handleImageClickForFullscreen); img.addEventListener('click', handleImageClickForFullscreen); }); }
    function handleImageClickForFullscreen(event) { if (event.currentTarget.src && !event.currentTarget.src.includes('via.placeholder.com')) { openFullscreenImage(event.currentTarget.src); } }
    function copyToClipboard(text, message = "Copiado.") { navigator.clipboard.writeText(text).then(() => showPersistentMessage(message, "success")).catch(err => { console.error('Error copiando:', err); showPersistentMessage('Error al copiar.', "error");}); }
    
    // --- EVENT LISTENERS GLOBALES ---
    editModeToggleBtn.addEventListener('click', toggleEditMode);
    submitAdminPasswordBtn.addEventListener('click', handlePasswordSubmit);
    adminPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasswordSubmit(); } });
    cancelAdminPasswordBtn.addEventListener('click', () => adminPasswordModal.style.display = 'none');
    themeSwitcherBtn.addEventListener('click', toggleTheme);
    scrollToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'instant' }); });
    scrollToFoldersBtn.addEventListener('click', () => { const foldersSection = document.getElementById('promptFoldersSection'); if (foldersSection) { foldersSection.scrollIntoView({ behavior: 'instant' }); } });
    changeBgBtn.addEventListener('click', () => { if(isEditable) hiddenBgInput.click() });
    hiddenBgInput.addEventListener('change', handleBackgroundChange);
    orderAppCategoriesBtn.addEventListener('click', openAppCategoryOrderModal);
    appCategoryOrderList.addEventListener('click', handleAppCategoryOrderChange);
    closeAppCategoryOrderModalBtn.addEventListener('click', closeAndSaveAppCategoryOrder);
    addAppCategoryBtn.addEventListener('click', handleAddAppCategory);
    addPromptBtn.addEventListener('click', () => openPromptForm());
    addPromptFolderBtn.addEventListener('click', () => openPromptFolderForm());
    globalSearchInput.addEventListener('input', applyFiltersAndSort);
    appPricingFilter.addEventListener('change', applyFiltersAndSort);
    closeFullscreenBtn.addEventListener('click', closeFullscreenImage);
    fullscreenImageViewer.addEventListener('click', (e) => { if (e.target === fullscreenImageViewer) closeFullscreenImage(); });
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") { if (fullscreenImageViewer.style.display === 'flex') closeFullscreenImage(); else if (formModal.style.display === 'flex') closeFormModal(); else if (adminPasswordModal.style.display === 'flex') adminPasswordModal.style.display = 'none'; else if (appCategoryOrderModal.style.display === 'flex') appCategoryOrderModal.style.display = 'none'; else closeActivePopups(); } });
    document.addEventListener('click', (e) => { 
        if (activePopups.folderMenu && !activePopups.folderMenu.contains(e.target) && !e.target.closest('.folder-item')) {
             closeActivePopups();
        }
    });

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            scrollToTopBtn.style.display = 'block';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });

    // ARRANQUE
    loadInitialData();
});