document.addEventListener('DOMContentLoaded', function() {
  // --- REFERENCIAS A ELEMENTOS ---
  const themeSwitcher = document.getElementById('themeSwitcher');
  // ... (el resto de tus referencias a elementos)

  // --- LÓGICA DEL TEMA (CORREGIDA) ---
  function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Si no hay tema guardado, o si está guardado como 'dark', aplica el tema oscuro.
    if (savedTheme === 'light') {
      document.body.classList.remove('dark-theme');
      themeSwitcher.textContent = 'Tema Oscuro';
    } else {
      document.body.classList.add('dark-theme');
      themeSwitcher.textContent = 'Tema Claro';
    }
  }

  themeSwitcher.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeSwitcher.textContent = isDark ? 'Tema Claro' : 'Tema Oscuro';
  });

  // Aplica el tema guardado (o el oscuro por defecto) al cargar la página.
  applyInitialTheme();

  // =========================================================================
  // AQUÍ COMIENZA EL RESTO DE TU CÓDIGO JAVASCRIPT (sin cambios)
  // =========================================================================

  let isEditable = false;
  let isDraggingTool = false; // Flag para el auto-scroll
  let activeResizeContainer = null;
  let initialWidth, initialX;
  let websiteData = { columns: [], background: '' };
  const NOMBRE_CATEGORIA_POR_DEFECTO = "Apps Recomendadas";
  const NOMBRE_CATEGORIA_PREFERIDAS = "Apps Preferidas";
  const columnsContainer = document.getElementById('columnsContainer');
  const columnControls = document.querySelector('.column-controls');
  const editModeBtn = document.getElementById('edit-mode-btn');
  const adminPasswordModal = document.getElementById('adminPasswordModal');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const submitAdminPasswordBtn = document.getElementById('submitAdminPasswordBtn');
  const cancelAdminPasswordBtn = document.getElementById('cancelAdminPasswordBtn');
  const categoryOrderModal = document.getElementById('categoryOrderModal');
  const categoryOrderList = document.getElementById('categoryOrderList');
  const closeCategoryOrderModalBtn = document.getElementById('closeCategoryOrderModalBtn');
  const orderCategoriesBtn = document.getElementById('orderCategoriesBtn');
  let linkFormContainer = document.getElementById('linkFormContainer');
  let linkFormTitle, toolNameInput, toolUrlInput, toolLogoUrlInput, toolBriefDescriptionInput,
    toolTagsInput, toolPricingModelSelect, toolTutorialUrlInput,
    toolPrivateCheckbox, toolRecommendedCheckbox, toolPreferredCheckbox,
    editingToolIdInput, editingCategoryIndexInput, saveLinkBtn, cancelLinkBtn,
    cardPreviewName, cardPreviewLogo, cardPreviewDescription, cardPreviewPricing;
  let _descriptionPreviewForm, _insertImageBtnForm, _uploadImageBtnForm,
    _imageUploadInputForm, _pasteAreaForm, _previewDescriptionBtnForm,
    _toolDetailedDescriptionInput;
  let categoriasSelectorBtn, categoriasDropdown, categoriasSeleccionadasContainer;
  let categoriasAdicionalesSeleccionadas = [];
  const filtersBar = document.getElementById('filters-bar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      filtersBar.classList.add('scrolled');
    } else {
      filtersBar.classList.remove('scrolled');
    }
  });

  function createOrUpdateLinkForm() {
    if (!linkFormContainer) {
      linkFormContainer = document.createElement('div');
      linkFormContainer.id = 'linkFormContainer';
      linkFormContainer.className = 'add-link-form-container';
      document.body.appendChild(linkFormContainer);
    }
    linkFormContainer.innerHTML = `
      <h3 id="linkFormTitle">Añadir Nueva Herramienta IA</h3>
      <input type="hidden" id="editingToolId" value=""><input type="hidden" id="editingCategoryIndex" value="-1">
      <div class="form-group"><label for="toolName">Nombre:</label><input type="text" id="toolName"></div>
      <div class="form-group"><label for="toolUrl">URL Sitio Web:</label><input type="url" id="toolUrl"></div>
      <div class="form-group"><label for="toolLogoUrl">URL Logo:</label><input type="url" id="toolLogoUrl"></div>
      <div class="form-group"><label for="toolBriefDescription">Desc. Breve:</label><textarea id="toolBriefDescription" rows="2"></textarea></div>
      <div class="form-group"><label for="toolDetailedDescription">Desc. Detallada (HTML):</label><textarea id="toolDetailedDescription" rows="5"></textarea>
        <div class="image-tools"><button id="insertImageBtnForm">URL Imagen</button><button id="uploadImageBtnForm">Subir Imagen</button><input type="file" id="imageUploadInputForm" class="image-upload-input" accept="image/*"><button id="previewDescriptionBtnForm">Vista Previa</button></div>
        <div class="paste-area" id="pasteAreaForm" tabindex="0">Pega imagen (Ctrl+V)</div><div id="descriptionPreviewForm" class="description-preview" style="display: none;"></div></div>
      <div class="form-group"><label for="toolTags">Tags (coma):</label><input type="text" id="toolTags"></div>
      <div class="form-group"><label for="toolPricingModel">Precio:</label><select id="toolPricingModel"><option>Freemium</option><option>Gratis</option><option>Por Créditos</option><option>Prueba Gratuita</option><option>De Pago</option></select></div>
      <div class="form-group"><label for="toolTutorialUrl">URL Tutorial:</label><input type="url" id="toolTutorialUrl"></div>
      <div class="checkbox-group"><input type="checkbox" id="toolPrivateCheckbox"><label for="toolPrivateCheckbox">Info detallada privada</label></div>
      <div class="checkbox-group">
        <input type="checkbox" id="toolRecommendedCheckbox">
        <label for="toolRecommendedCheckbox">Añadir también a "Apps Recomendadas"</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="toolPreferredCheckbox">
        <label for="toolPreferredCheckbox">Añadir también a "Apps Preferidas"</label>
      </div>
      <div class="form-group">
        <label>Otras categorías:</label>
        <div class="categorias-selector">
          <div class="categorias-selector-btn" id="categoriasSelectorBtn">
            <span>Seleccionar categorías adicionales</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="categorias-dropdown" id="categoriasDropdown"></div>
          <div class="categorias-seleccionadas" id="categoriasSeleccionadas"></div>
        </div>
      </div>
      <div class="card-preview-area"><h4>Previsualización:</h4><div class="ai-tool-card"><div class="tool-header"><img id="cardPreviewLogo" src="https://via.placeholder.com/50" class="tool-logo"><span id="cardPreviewName" class="tool-name">Nombre</span></div><p id="cardPreviewDescription" class="tool-brief-description">Desc. breve...</p><div class="tool-tags-pricing"><div id="cardPreviewTagsContainer" class="tool-tags"></div><span id="cardPreviewPricing" class="tool-pricing"><span>Precio</span></span></div><div class="tool-actions"><button disabled>Visitar</button><button disabled>Más Info</button></div></div></div>
      <div class="form-buttons"><button id="saveLinkBtn">GUARDAR</button><button id="cancelLinkBtn">CANCELAR</button></div>`;
    setupFormReferencesAndEvents();
    setupImageTools('Form');
    setupCategoriasSelector();
  }

  function setupFormReferencesAndEvents() {
    linkFormTitle = document.getElementById('linkFormTitle');
    toolNameInput = document.getElementById('toolName');
    toolUrlInput = document.getElementById('toolUrl');
    toolLogoUrlInput = document.getElementById('toolLogoUrl');
    toolBriefDescriptionInput = document.getElementById('toolBriefDescription');
    _toolDetailedDescriptionInput = document.getElementById('toolDetailedDescription');
    toolTagsInput = document.getElementById('toolTags');
    toolPricingModelSelect = document.getElementById('toolPricingModel');
    toolTutorialUrlInput = document.getElementById('toolTutorialUrl');
    toolPrivateCheckbox = document.getElementById('toolPrivateCheckbox');
    toolRecommendedCheckbox = document.getElementById('toolRecommendedCheckbox');
    toolPreferredCheckbox = document.getElementById('toolPreferredCheckbox');
    editingToolIdInput = document.getElementById('editingToolId');
    editingCategoryIndexInput = document.getElementById('editingCategoryIndex');
    saveLinkBtn = document.getElementById('saveLinkBtn');
    cancelLinkBtn = document.getElementById('cancelLinkBtn');
    cardPreviewName = document.getElementById('cardPreviewName');
    cardPreviewLogo = document.getElementById('cardPreviewLogo');
    cardPreviewDescription = document.getElementById('cardPreviewDescription');
    cardPreviewPricing = document.getElementById('cardPreviewPricing').firstElementChild;
    const cardPreviewTagsContainer = document.getElementById('cardPreviewTagsContainer');
    const updatePreview = () => {
      if (cardPreviewName) cardPreviewName.textContent = toolNameInput.value || "Nombre";
      if (cardPreviewLogo) cardPreviewLogo.src = toolLogoUrlInput.value || "https://via.placeholder.com/50";
      if (cardPreviewDescription) cardPreviewDescription.textContent = toolBriefDescriptionInput.value || "Desc. breve...";
      if (cardPreviewPricing && toolPricingModelSelect) cardPreviewPricing.textContent = toolPricingModelSelect.value;
      if (cardPreviewTagsContainer && toolTagsInput) {
        cardPreviewTagsContainer.innerHTML = toolTagsInput.value.split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
      }
    };
    [toolNameInput, toolLogoUrlInput, toolBriefDescriptionInput, toolTagsInput].forEach(i => i && i.addEventListener('input', updatePreview));
    if (toolPricingModelSelect) toolPricingModelSelect.addEventListener('change', updatePreview);

    saveLinkBtn.removeEventListener('click', saveToolHandler);
    saveLinkBtn.addEventListener('click', saveToolHandler);
    cancelLinkBtn.removeEventListener('click', closeLinkForm);
    cancelLinkBtn.addEventListener('click', closeLinkForm);
  }

  function setupCategoriasSelector() {
    categoriasSelectorBtn = document.getElementById('categoriasSelectorBtn');
    categoriasDropdown = document.getElementById('categoriasDropdown');
    categoriasSeleccionadasContainer = document.getElementById('categoriasSeleccionadas');

    categoriasSelectorBtn.addEventListener('click', function() {
      categoriasDropdown.classList.toggle('show');
      actualizarCategoriasDropdown();
    });

    document.addEventListener('click', function(e) {
      if (categoriasSelectorBtn && !categoriasSelectorBtn.contains(e.target) && !categoriasDropdown.contains(e.target)) {
        categoriasDropdown.classList.remove('show');
      }
    });
  }

  function actualizarCategoriasDropdown() {
    categoriasDropdown.innerHTML = '';
    const currentCategoryIndex = parseInt(editingCategoryIndexInput.value);
    const currentCategory = currentCategoryIndex >= 0 ? websiteData.columns[currentCategoryIndex].title : null;

    websiteData.columns.forEach(category => {
      if (category.title !== NOMBRE_CATEGORIA_POR_DEFECTO &&
        category.title !== NOMBRE_CATEGORIA_PREFERIDAS &&
        category.title !== currentCategory) {

        const option = document.createElement('div');
        option.className = 'categoria-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cat-${category.title.replace(/\s+/g, '-')}`;
        checkbox.value = category.title;

        const isSelected = categoriasAdicionalesSeleccionadas.includes(category.title);
        checkbox.checked = isSelected;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = category.title;

        option.appendChild(checkbox);
        option.appendChild(label);

        checkbox.addEventListener('change', function() {
          if (this.checked) {
            if (!categoriasAdicionalesSeleccionadas.includes(this.value)) {
              categoriasAdicionalesSeleccionadas.push(this.value);
            }
          } else {
            categoriasAdicionalesSeleccionadas = categoriasAdicionalesSeleccionadas.filter(cat => cat !== this.value);
          }
          actualizarCategoriasSeleccionadas();
        });

        categoriasDropdown.appendChild(option);
      }
    });
  }

  function actualizarCategoriasSeleccionadas() {
    categoriasSeleccionadasContainer.innerHTML = '';

    categoriasAdicionalesSeleccionadas.forEach(categoria => {
      const categoriaSpan = document.createElement('span');
      categoriaSpan.className = 'categoria-seleccionada';
      categoriaSpan.textContent = categoria;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-categoria';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function() {
        categoriasAdicionalesSeleccionadas = categoriasAdicionalesSeleccionadas.filter(cat => cat !== categoria);
        actualizarCategoriasSeleccionadas();
        actualizarCategoriasDropdown();
      });

      categoriaSpan.appendChild(removeBtn);
      categoriasSeleccionadasContainer.appendChild(categoriaSpan);
    });
  }

  function closeLinkForm() {
    if (linkFormContainer) linkFormContainer.style.display = 'none';
    if (_descriptionPreviewForm) _descriptionPreviewForm.style.display = 'none';
    if (_previewDescriptionBtnForm) _previewDescriptionBtnForm.textContent = 'Vista Previa';
    categoriasAdicionalesSeleccionadas = [];
  }

  function setupImageTools(suffix = '') {
    _descriptionPreviewForm = document.getElementById('descriptionPreview' + suffix);
    _insertImageBtnForm = document.getElementById('insertImageBtn' + suffix);
    _uploadImageBtnForm = document.getElementById('uploadImageBtn' + suffix);
    _imageUploadInputForm = document.getElementById('imageUploadInput' + suffix);
    _pasteAreaForm = document.getElementById('pasteArea' + suffix);
    _previewDescriptionBtnForm = document.getElementById('previewDescriptionBtn' + suffix);
    const setupListener = (element, event, handler, options = false) => {
      if (element) {
        element.removeEventListener(event, handler, options);
        element.addEventListener(event, handler, options);
      }
    };
    setupListener(_insertImageBtnForm, 'click', handleInsertImageViaButton);
    if (_uploadImageBtnForm && _imageUploadInputForm) {
      setupListener(_uploadImageBtnForm, 'click', () => _imageUploadInputForm.click());
      setupListener(_imageUploadInputForm, 'change', handleImageUploadViaInput);
    }
    if (_previewDescriptionBtnForm && _descriptionPreviewForm) {
      setupListener(_previewDescriptionBtnForm, 'click', () => toggleDescriptionPreview(_descriptionPreviewForm, _toolDetailedDescriptionInput, _previewDescriptionBtnForm));
    }
    if (_pasteAreaForm) {
      setupListener(_pasteAreaForm, 'click', () => _pasteAreaForm.focus());
      setupListener(_pasteAreaForm, 'paste', handlePasteIntoTextarea);
    }
    if (_toolDetailedDescriptionInput) {
      setupListener(_toolDetailedDescriptionInput, 'paste', handlePasteIntoTextarea);
    }
  }

  function handleInsertImageViaButton() {
    const imageUrl = prompt('Introduce la URL de la imagen:');
    if (imageUrl?.trim() && _toolDetailedDescriptionInput && _descriptionPreviewForm) {
      insertResizableImage(imageUrl, _toolDetailedDescriptionInput, _descriptionPreviewForm);
    }
  }

  function handleImageUploadViaInput(e) {
    if (e.target.files?.[0] && _toolDetailedDescriptionInput && _descriptionPreviewForm) {
      const reader = new FileReader();
      reader.onload = (event) => insertResizableImage(event.target.result, _toolDetailedDescriptionInput, _descriptionPreviewForm);
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function toggleDescriptionPreview(previewEl, detailedInputEl, previewBtnEl) {
    if (previewEl.style.display === 'none') {
      previewEl.innerHTML = detailedInputEl.value;
      previewEl.style.display = 'block';
      if (previewBtnEl) previewBtnEl.textContent = 'Ocultar Vista';
      processLegacyImages(previewEl);
      organizeImages(previewEl);
      if (isEditable) previewEl.querySelectorAll('.resizable-img-container').forEach(c => c.style.maxWidth = 'none');
    } else {
      previewEl.style.display = 'none';
      if (previewBtnEl) previewBtnEl.textContent = 'Vista Previa';
    }
  }

  function processLegacyImages(containerEl) {
    Array.from(containerEl.querySelectorAll('img:not(.resizable-img-container img)')).forEach(img => {
      const newC = document.createElement('div');
      newC.className = 'resizable-img-container';
      newC.style.width = (img.style.width || img.width || 300) + 'px';
      if (isEditable) newC.style.maxWidth = 'none';
      const newImg = img.cloneNode(true);
      Object.assign(newImg.style, {
        width: '', height: '', maxWidth: '', margin: '0', padding: '0'
      });
      newC.append(newImg, Object.assign(document.createElement('div'), { className: 'resize-handle' }), Object.assign(document.createElement('div'), { className: 'delete-image-btn', textContent: '×' }));
      img.parentNode.replaceChild(newC, img);
    });
    setupResizableImages(containerEl);
  }

  function organizeImages(containerEl) {
    const imgContainers = containerEl.querySelectorAll('.resizable-img-container');
    if (imgContainers.length > 1) {
      let flexCont = containerEl.querySelector('.images-container');
      if (!flexCont) {
        flexCont = Object.assign(document.createElement('div'), { className: 'images-container' });
        imgContainers.forEach(ic => {
          if (ic.parentNode === containerEl) flexCont.appendChild(ic);
        });
        if (flexCont.childNodes.length > 0) containerEl.appendChild(flexCont);
      } else {
        imgContainers.forEach(ic => {
          if (ic.parentNode !== flexCont && ic.parentNode === containerEl) flexCont.appendChild(ic);
        });
      }
    }
  }

  function insertResizableImage(imgUrl, textarea, preview) {
    const html = `<div class="resizable-img-container" style="width:300px;max-width:none;"><img src="${imgUrl}" alt="Imagen"><div class="resize-handle"></div><div class="delete-image-btn">×</div></div>`;
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + html + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + html.length;
    preview.innerHTML = textarea.value;
    if (preview.style.display === 'none') {
      preview.style.display = 'block';
      if (_previewDescriptionBtnForm) _previewDescriptionBtnForm.textContent = 'Ocultar Vista';
    }
    processLegacyImages(preview);
    organizeImages(preview);
    if (isEditable) preview.querySelectorAll('.resizable-img-container').forEach(c => c.style.maxWidth = 'none');
  }

  function setupResizableImages(containerEl) {
    containerEl.querySelectorAll('.resizable-img-container').forEach(rc => {
      if (isEditable) rc.style.maxWidth = 'none';
      const handle = rc.querySelector('.resize-handle'), delBtn = rc.querySelector('.delete-image-btn');
      const addSafeListener = (el, ev, fn, opt = false) => {
        if (el) {
          if (el._listener) el.removeEventListener(ev, el._listener, opt);
          el.addEventListener(ev, fn, opt);
          el._listener = fn;
        }
      };
      addSafeListener(handle, 'mousedown', startResize);
      addSafeListener(handle, 'touchstart', startResize, { passive: false });
      addSafeListener(delBtn, 'click', handleDeleteImage);
    });
  }

  function handleDeleteImage() {
    const container = this.closest('.resizable-img-container');
    if (confirm('¿Eliminar imagen?')) {
      container.remove();
      updateTextareaFromPreview(_toolDetailedDescriptionInput, _descriptionPreviewForm);
    }
  }

  function startResize(e) {
    e.preventDefault();
    activeResizeContainer = this.closest('.resizable-img-container');
    activeResizeContainer.style.maxWidth = 'none';
    initialWidth = activeResizeContainer.offsetWidth;
    initialX = (e.touches ? e.touches[0] : e).clientX;
    document.addEventListener('mousemove', resizeMove);
    document.addEventListener('touchmove', resizeMove, { passive: false });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);
  }

  function resizeMove(e) {
    if (!activeResizeContainer) return;
    e.preventDefault();
    activeResizeContainer.style.maxWidth = 'none';
    const newW = Math.max(50, initialWidth + ((e.touches ? e.touches[0] : e).clientX - initialX));
    activeResizeContainer.style.width = newW + 'px';
    updateTextareaFromPreview(_toolDetailedDescriptionInput, _descriptionPreviewForm);
  }

  function stopResize() {
    if (!activeResizeContainer) return;
    if (isEditable) activeResizeContainer.style.maxWidth = 'none';
    document.removeEventListener('mousemove', resizeMove);
    document.removeEventListener('touchmove', resizeMove);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchend', stopResize);
    updateTextareaFromPreview(_toolDetailedDescriptionInput, _descriptionPreviewForm);
    activeResizeContainer = null;
  }

  function updateTextareaFromPreview(textarea, preview) {
    if (preview && textarea) textarea.value = preview.innerHTML;
  }

  function handlePasteIntoTextarea(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile(), reader = new FileReader();
        reader.onload = (ev) => insertResizableImage(ev.target.result, _toolDetailedDescriptionInput, _descriptionPreviewForm);
        reader.readAsDataURL(blob);
        break;
      }
    }
  }

  function saveToolHandler() {
    if (!isEditable) { closeLinkForm(); return; }
    const toolData = {
      id: editingToolIdInput.value || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: toolNameInput.value.trim(),
      websiteUrl: toolUrlInput.value.trim(),
      logoUrl: toolLogoUrlInput.value.trim(),
      briefDescription: toolBriefDescriptionInput.value.trim(),
      detailedDescription: _toolDetailedDescriptionInput.value.trim(),
      tags: toolTagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      pricingModel: toolPricingModelSelect.value,
      tutorialUrl: toolTutorialUrlInput.value.trim(),
      isPrivate: toolPrivateCheckbox.checked,
      timestampAdded: editingToolIdInput.value ? (findToolById(editingToolIdInput.value)?.tool.timestampAdded || Date.now()) : Date.now(),
      timestampUpdated: Date.now()
    };
    if (!toolData.name) { alert("El nombre de la herramienta es requerido."); return; }
    if (toolData.websiteUrl && !/^https?:\/\//i.test(toolData.websiteUrl)) {
      toolData.websiteUrl = 'https://' + toolData.websiteUrl;
    }
    const primaryCategoryIndex = parseInt(editingCategoryIndexInput.value, 10);
    const primaryCategory = websiteData.columns[primaryCategoryIndex];
    if (!primaryCategory.tools) primaryCategory.tools = [];

    const removeFromCurrent = document.getElementById('removeFromCurrentCategory');
    if (removeFromCurrent && removeFromCurrent.checked) {
      const indexInPrimary = primaryCategory.tools.findIndex(t => t.id === toolData.id);
      if (indexInPrimary > -1) { primaryCategory.tools.splice(indexInPrimary, 1); }
    } else {
      const existingToolIndexInPrimary = primaryCategory.tools.findIndex(t => t.id === toolData.id);
      if (existingToolIndexInPrimary > -1) {
        primaryCategory.tools[existingToolIndexInPrimary] = toolData;
      } else {
        primaryCategory.tools.push(toolData);
      }
    }
    // Categorías especiales
    const toolRecommendedCheckbox = document.getElementById('toolRecommendedCheckbox');
    const toolPreferredCheckbox = document.getElementById('toolPreferredCheckbox');
    const recommendedCategory = websiteData.columns.find(c => c.title === NOMBRE_CATEGORIA_POR_DEFECTO);
    if (recommendedCategory) {
      if (!recommendedCategory.tools) recommendedCategory.tools = [];
      const indexInRecommended = recommendedCategory.tools.findIndex(t => t.id === toolData.id);
      if (toolRecommendedCheckbox.checked) {
        if (indexInRecommended === -1) {
          recommendedCategory.tools.push(toolData);
        } else {
          recommendedCategory.tools[indexInRecommended] = toolData;
        }
      } else if (indexInRecommended > -1) {
        recommendedCategory.tools.splice(indexInRecommended, 1);
      }
    }
    const preferredCategory = websiteData.columns.find(c => c.title === NOMBRE_CATEGORIA_PREFERIDAS);
    if (preferredCategory) {
      if (!preferredCategory.tools) preferredCategory.tools = [];
      const indexInPreferred = preferredCategory.tools.findIndex(t => t.id === toolData.id);
      if (toolPreferredCheckbox.checked) {
        if (indexInPreferred === -1) {
          preferredCategory.tools.push(toolData);
        } else {
          preferredCategory.tools[indexInPreferred] = toolData;
        }
      } else if (indexInPreferred > -1) {
        preferredCategory.tools.splice(indexInPreferred, 1);
      }
    }
    // Categorías adicionales
    categoriasAdicionalesSeleccionadas.forEach(categoriaNombre => {
      const categoria = websiteData.columns.find(c => c.title === categoriaNombre);
      if (categoria) {
        if (!categoria.tools) categoria.tools = [];
        const indexInCategoria = categoria.tools.findIndex(t => t.id === toolData.id);
        if (indexInCategoria === -1) {
          categoria.tools.push(toolData);
        } else {
          categoria.tools[indexInCategoria] = toolData;
        }
      }
    });
    if (editingToolIdInput.value) {
      websiteData.columns.forEach(categoria => {
        if (categoria.title !== NOMBRE_CATEGORIA_POR_DEFECTO &&
          categoria.title !== NOMBRE_CATEGORIA_PREFERIDAS &&
          categoria.title !== primaryCategory.title &&
          !categoriasAdicionalesSeleccionadas.includes(categoria.title)) {
          if (categoria.tools) {
            const indexInCategoria = categoria.tools.findIndex(t => t.id === toolData.id);
            if (indexInCategoria > -1) {
              categoria.tools.splice(indexInCategoria, 1);
            }
          }
        }
      });
    }
    closeLinkForm();
    renderAllContent(document.getElementById('categoryFilter').value);
    saveWebsiteState();
  }

  function findToolById(toolId) {
    for (const c of websiteData.columns) {
      if (c.tools) {
        const t = c.tools.find(x => x.id === toolId);
        if (t) return { tool: t, category: c };
      }
    }
    return null;
  }

  function renderAllContent(categoryToMakeSelected = null) {
    columnsContainer.innerHTML = '';
    const catFilter = document.getElementById('categoryFilter');
    let effectiveCategoryToSelect = categoryToMakeSelected;
    if (effectiveCategoryToSelect === null) {
      effectiveCategoryToSelect = catFilter.value || localStorage.getItem('lastCategoryFilter');
    }

    catFilter.innerHTML = `<option value="">¿Qué categoría quieres ver?</option><option value="_all_">Todas las Categorías</option>`;
    websiteData.columns.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.title;
      opt.textContent = c.title;
      catFilter.appendChild(opt);
    });
    if (effectiveCategoryToSelect && Array.from(catFilter.options).some(opt => opt.value === effectiveCategoryToSelect)) {
      catFilter.value = effectiveCategoryToSelect;
    } else {
      catFilter.value = "";
    }

    filterAndSortTools();
    setupEditModeUI();
  }

  function createCategoryElement(categoryData, categoryIndex) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.dataset.categoryIndex = categoryIndex;
    columnDiv.dataset.categoryTitle = categoryData.title;

    const titleContainer = document.createElement('div');
    titleContainer.className = 'category-title-container';
    const titleH2 = document.createElement('h2');
    titleH2.textContent = categoryData.title;
    titleContainer.appendChild(titleH2);
    columnDiv.appendChild(titleContainer);

    if (isEditable) {
      const categoryControlsDiv = document.createElement('div');
      categoryControlsDiv.className = 'category-controls';
      const addToolBtn = document.createElement('button');
      addToolBtn.className = 'add-link-btn';
      addToolBtn.textContent = '+ Añadir Herramienta IA';
      addToolBtn.onclick = () => openToolFormForAdd(categoryIndex);
      categoryControlsDiv.appendChild(addToolBtn);

      const removeCategoryBtn = document.createElement('button');
      removeCategoryBtn.className = 'remove-column-btn';
      removeCategoryBtn.textContent = 'Eliminar Categoría';
      removeCategoryBtn.onclick = () => removeCategory(categoryIndex);
      categoryControlsDiv.appendChild(removeCategoryBtn);

      columnDiv.appendChild(categoryControlsDiv);
    }
    const toolsGridDiv = document.createElement('div');
    toolsGridDiv.className = 'ai-tools-grid';
    columnDiv.appendChild(toolsGridDiv);

    return columnDiv;
  }

  function createToolCardElement(toolData, categoryIndex, toolIndex, totalToolsInCategory) {
    const card = document.createElement('div');
    card.className = 'ai-tool-card';
    card.dataset.toolId = toolData.id;
    card.dataset.name = toolData.name.toLowerCase();
    card.dataset.briefDescription = toolData.briefDescription.toLowerCase();
    card.dataset.tags = toolData.tags.join(',').toLowerCase();
    card.dataset.pricingModel = toolData.pricingModel;
    card.dataset.timestampAdded = toolData.timestampAdded;

    if (isEditable) {
      card.draggable = true;
      card.addEventListener('dragstart', e => {
        e.stopPropagation(); // Prevent category drag
        isDraggingTool = true; // Set the flag for auto-scroll
        e.dataTransfer.setData('application/json', JSON.stringify({ toolId: toolData.id, fromCategoryIndex: categoryIndex }));
        setTimeout(() => { card.classList.add('dragging'); }, 0);
      });
      card.addEventListener('dragend', e => {
        e.stopPropagation();
        isDraggingTool = false; // Unset the flag
        card.classList.remove('dragging');
        document.querySelectorAll('.ai-tool-card.drop-target').forEach(el => el.classList.remove('drop-target'));
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        const draggingEl = document.querySelector('.ai-tool-card.dragging');
        if (draggingEl && draggingEl !== card) {
          card.classList.add('drop-target');
        }
      });
      card.addEventListener('dragleave', e => {
        e.stopPropagation();
        card.classList.remove('drop-target');
      });
      card.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drop-target');
        try {
          const data = JSON.parse(e.dataTransfer.getData('application/json'));
          const { toolId, fromCategoryIndex } = data;

          if (!toolId || fromCategoryIndex !== categoryIndex) {
             // For now, only allow reordering within the same category.
             return;
          }
          if (toolId === toolData.id) return; // Dropping on itself

          const category = websiteData.columns[categoryIndex];
          if (!category || !category.tools) return;

          const fromToolIndex = category.tools.findIndex(t => t.id === toolId);
          const toToolIndex = category.tools.findIndex(t => t.id === toolData.id);

          if (fromToolIndex !== -1 && toToolIndex !== -1) {
            const [movedTool] = category.tools.splice(fromToolIndex, 1);
            category.tools.splice(toToolIndex, 0, movedTool);
            saveWebsiteState();
            filterAndSortTools();
          }
        } catch (err) {
          console.error("Drop error:", err);
        }
      });
    }

    if ((Date.now() - toolData.timestampAdded) < (7 * 24 * 60 * 60 * 1000)) {
      card.appendChild(Object.assign(document.createElement('span'), {
        className: 'new-badge',
        textContent: 'NUEVO'
      }));
    }

    let toolOrderButtonsHTML = '';
    if (isEditable) {
      toolOrderButtonsHTML = `
        <div class="tool-order-buttons">
            <button title="Mover herramienta izquierda/arriba" ${toolIndex === 0 ? 'disabled' : ''} onclick="moveTool(${categoryIndex}, '${toolData.id}', -1)">←</button>
            <button title="Mover herramienta derecha/abajo" ${toolIndex === totalToolsInCategory - 1 ? 'disabled' : ''} onclick="moveTool(${categoryIndex}, '${toolData.id}', 1)">→</button>
        </div>`;
    }
    const precioClass = toolData.pricingModel.toLowerCase().replace(/ /g, '').replace(/[áéíóú]/g, c => 'aeiou'['áéíóú'.indexOf(c)]);

    card.innerHTML = `
      <div class="tool-header">
        <img src="${toolData.logoUrl||'https://via.placeholder.com/50'}" alt="${toolData.name} logo" class="tool-logo">
        <span class="tool-name">${toolData.name}</span>
      </div>
      <p class="tool-brief-description">${toolData.briefDescription}</p>
      <div class="tool-tags-pricing">
        <div class="tool-tags">${toolData.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <span class="tool-pricing"><span class="${precioClass}">${toolData.pricingModel}</span></span>
      </div>
      ${toolOrderButtonsHTML}
      <div class="tool-actions">
        <button class="visit-site-btn" data-url="${toolData.websiteUrl}">Visitar</button>
        <button class="more-info-btn">Más Info</button>
      </div>`;

    card.querySelector('.visit-site-btn').onclick = (e) => {
      e.stopPropagation();
      const url = e.currentTarget.dataset.url;
      if (url) window.open(url, '_blank');
    };

    const moreInfoBtn = card.querySelector('.more-info-btn');
    if (toolData.isPrivate && !isEditable) {
      moreInfoBtn.textContent = "Info Restringida";
      moreInfoBtn.disabled = true;
    } else {
      moreInfoBtn.onclick = (e) => {
        e.stopPropagation();
        displayToolDetailsInPopup(toolData);
      };
    }

    if (isEditable) {
      const editBtns = document.createElement('div');
      editBtns.className = 'tool-edit-buttons';
      editBtns.innerHTML = `<button title="Editar"><i class="fas fa-edit"></i></button><button title="Eliminar"><i class="fas fa-trash-alt"></i></button>`;
      editBtns.querySelector('button[title="Editar"]').onclick = (e) => {
        e.stopPropagation();
        openToolFormForEdit(toolData, categoryIndex);
      };
      editBtns.querySelector('button[title="Eliminar"]').onclick = (e) => {
        e.stopPropagation();
        removeTool(toolData.id, categoryIndex);
      };
      card.appendChild(editBtns);
    }
    return card;
  }

  function displayToolDetailsInPopup(toolData) {
    document.querySelectorAll('.tooltip.popup').forEach(p => p.remove());
    const popup = document.createElement('div');
    popup.className = 'tooltip popup';
    let tutBtnHTML = toolData.tutorialUrl ? `<button id="popupGoToTutorialBtn" class="secondary">Tutorial</button>` : '';
    let finalDesc = toolData.detailedDescription;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalDesc;
    const imgsInPopup = tempDiv.querySelectorAll('.resizable-img-container');
    imgsInPopup.forEach(ic => {
      ic.querySelector('.resize-handle')?.remove();
      ic.querySelector('.delete-image-btn')?.remove();
      ic.style.border = 'none';
    });
    if (imgsInPopup.length > 1 && !tempDiv.querySelector('.images-container')) {
      const imgCont = document.createElement('div');
      imgCont.className = 'images-container';
      imgsInPopup.forEach(iC => imgCont.appendChild(iC.cloneNode(true)));
      let otherC = Array.from(tempDiv.childNodes).filter(n => !n.classList || !n.classList.contains('resizable-img-container'));
      tempDiv.innerHTML = '';
      otherC.forEach(n => tempDiv.appendChild(n));
      tempDiv.appendChild(imgCont);
    } else if (imgsInPopup.length === 1 && !tempDiv.querySelector('.images-container')) imgsInPopup[0].style.maxWidth = '100%';
    finalDesc = tempDiv.innerHTML;
    popup.innerHTML = `<div class="popup-description">${finalDesc}</div><div class="popup-buttons"><button id="popupGoToLinkBtn">Web</button>${tutBtnHTML}<button id="popupCloseBtn">Cerrar</button></div>`;
    document.body.appendChild(popup);
    popup.querySelector('#popupGoToLinkBtn').onclick = () => {
      if (toolData.websiteUrl) window.open(toolData.websiteUrl, '_blank');
      popup.remove();
    };
    if (toolData.tutorialUrl) popup.querySelector('#popupGoToTutorialBtn').onclick = () => {
      window.open(toolData.tutorialUrl, '_blank');
      popup.remove();
    };
    popup.querySelector('#popupCloseBtn').onclick = () => popup.remove();
  }

  function setupEditModeUI() {
    document.body.classList.toggle('edit-mode', isEditable);
    if (columnControls) columnControls.style.display = isEditable ? 'flex' : 'none';
    if (orderCategoriesBtn) orderCategoriesBtn.style.display = isEditable ? 'block' : 'none';
    editModeBtn.classList.toggle('active', isEditable);
    document.querySelectorAll('.column h2').forEach(t => isEditable ? t.setAttribute('contenteditable', 'true') : t.removeAttribute('contenteditable'));
    if (!isEditable && linkFormContainer && linkFormContainer.style.display === 'block') closeLinkForm();
  }

  function openCategoryOrderModal() {
    if (!isEditable) return;
    renderCategoryOrderModal();
    categoryOrderModal.style.display = 'flex';
  }

  function renderCategoryOrderModal() {
    categoryOrderList.innerHTML = '';
    websiteData.columns.forEach((category, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="category-name">${category.title}</span>
        <span class="order-buttons">
          <button title="Mover arriba" ${index === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); moveCategory(${index}, -1)">↑</button>
          <button title="Mover abajo" ${index === websiteData.columns.length - 1 ? 'disabled' : ''} onclick="event.stopPropagation(); moveCategory(${index}, 1)">↓</button>
        </span>`;
      categoryOrderList.appendChild(li);
    });
  }

  if (closeCategoryOrderModalBtn) {
    closeCategoryOrderModalBtn.addEventListener('click', () => {
      categoryOrderModal.style.display = 'none';
      renderAllContent(document.getElementById('categoryFilter').value);
    });
  }

  if (orderCategoriesBtn) {
    orderCategoriesBtn.addEventListener('click', openCategoryOrderModal);
  }

  function activateEditMode() {
    adminPasswordModal.style.display = 'flex';
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
  }

  submitAdminPasswordBtn.addEventListener('click', async () => {
    const pass = adminPasswordInput.value;
    if (!pass) { alert("Introduce contraseña."); return; }
    try {
      const isValid = await window.checkPassword(pass);
      if (isValid) {
        isEditable = true;
        editModeBtn.textContent = 'Desactivar';
        adminPasswordModal.style.display = 'none';
        renderAllContent(document.getElementById('categoryFilter').value);
      } else {
        alert('Contraseña incorrecta.');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
      }
    } catch (e) {
      alert('Error verificando.');
      console.error("Admin pass err:", e);
    }
  });

  adminPasswordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAdminPasswordBtn.click();
    }
  });

  cancelAdminPasswordBtn.addEventListener('click', () => {
    adminPasswordModal.style.display = 'none';
  });

  function deactivateEditMode() {
    isEditable = false;
    editModeBtn.textContent = 'ACTIVAR';
    renderAllContent(document.getElementById('categoryFilter').value);
  }

  editModeBtn.addEventListener('click', () => isEditable ? deactivateEditMode() : activateEditMode());

  window.addColumn = () => {
    if (!isEditable) return;
    const name = prompt("Nombre nueva categoría:", "Nueva");
    if (name?.trim()) {
      websiteData.columns.push({ title: name.trim(), tools: [] });
      renderAllContent(name.trim());
      saveWebsiteState();
    }
  };

  function removeCategory(idx) {
    if (!isEditable) return;
    const categoriaQueSeVaAEliminar = websiteData.columns[idx];
    if (!categoriaQueSeVaAEliminar) { console.error("Error: Se intentó eliminar una categoría que no existe en el índice:", idx); return; }
    if (confirm(`Eliminar "${categoriaQueSeVaAEliminar.title}"?`)) {
      const catVal = document.getElementById('categoryFilter').value;
      const tituloDeCategoriaEliminada = categoriaQueSeVaAEliminar.title;
      websiteData.columns.splice(idx, 1);
      renderAllContent(catVal === tituloDeCategoriaEliminada ? "" : catVal);
      saveWebsiteState();
    }
  }

  window.moveCategory = function(index, direction) {
    if (!isEditable) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= websiteData.columns.length) return;
    const categoryToMove = websiteData.columns.splice(index, 1)[0];
    websiteData.columns.splice(newIndex, 0, categoryToMove);
    saveWebsiteState();
    renderCategoryOrderModal();
  }

  window.moveTool = function(categoryIndex, toolId, direction) {
    if (!isEditable) return;
    const category = websiteData.columns[categoryIndex];
    if (!category || !category.tools) return;
    const toolIndex = category.tools.findIndex(t => t.id === toolId);
    if (toolIndex === -1) return;
    const newToolIndex = toolIndex + direction;
    if (newToolIndex < 0 || newToolIndex >= category.tools.length) return;
    const toolToMove = category.tools.splice(toolIndex, 1)[0];
    category.tools.splice(newToolIndex, 0, toolToMove);
    saveWebsiteState();
    filterAndSortTools();
  }

  function openToolFormForAdd(catIdx) {
    if (!isEditable) return;
    createOrUpdateLinkForm();
    linkFormTitle.textContent = `Añadir a "${websiteData.columns[catIdx].title}"`;
    editingToolIdInput.value = "";
    editingCategoryIndexInput.value = catIdx;
    toolNameInput.value = ""; toolUrlInput.value = ""; toolLogoUrlInput.value = "";
    toolBriefDescriptionInput.value = ""; _toolDetailedDescriptionInput.value = "";
    toolTagsInput.value = ""; toolPricingModelSelect.value = "Freemium";
    toolTutorialUrlInput.value = ""; toolPrivateCheckbox.checked = false;
    toolRecommendedCheckbox.checked = false; toolPreferredCheckbox.checked = false;
    categoriasAdicionalesSeleccionadas = [];
    actualizarCategoriasSeleccionadas();
    const tagsC = document.getElementById('cardPreviewTagsContainer');
    if (cardPreviewName) cardPreviewName.textContent = "Nombre";
    if (cardPreviewLogo) cardPreviewLogo.src = "https://via.placeholder.com/50";
    if (cardPreviewDescription) cardPreviewDescription.textContent = "Desc. breve...";
    if (cardPreviewPricing && toolPricingModelSelect) cardPreviewPricing.textContent = toolPricingModelSelect.value;
    if (tagsC) tagsC.innerHTML = '';
    if (_descriptionPreviewForm) { _descriptionPreviewForm.innerHTML = ""; _descriptionPreviewForm.style.display = 'none'; }
    if (_previewDescriptionBtnForm) _previewDescriptionBtnForm.textContent = 'Vista Previa';
    linkFormContainer.style.display = 'block';
    toolNameInput.focus();
  }

  function openToolFormForEdit(tool, catIdx) {
    if (!isEditable) return;
    createOrUpdateLinkForm();
    linkFormTitle.textContent = `Editar: ${tool.name}`;
    editingToolIdInput.value = tool.id;
    editingCategoryIndexInput.value = catIdx;
    toolNameInput.value = tool.name; toolUrlInput.value = tool.websiteUrl;
    toolLogoUrlInput.value = tool.logoUrl; toolBriefDescriptionInput.value = tool.briefDescription;
    _toolDetailedDescriptionInput.value = tool.detailedDescription;
    toolTagsInput.value = tool.tags.join(', ');
    toolPricingModelSelect.value = tool.pricingModel;
    toolTutorialUrlInput.value = tool.tutorialUrl || "";
    toolPrivateCheckbox.checked = tool.isPrivate || false;

    if (toolRecommendedCheckbox) {
      const recCat = websiteData.columns.find(c => c.title === NOMBRE_CATEGORIA_POR_DEFECTO);
      toolRecommendedCheckbox.checked = recCat?.tools?.some(t => t.id === tool.id) ?? false;
    }
    if (toolPreferredCheckbox) {
      const prefCat = websiteData.columns.find(c => c.title === NOMBRE_CATEGORIA_PREFERIDAS);
      toolPreferredCheckbox.checked = prefCat?.tools?.some(t => t.id === tool.id) ?? false;
    }
    categoriasAdicionalesSeleccionadas = [];
    websiteData.columns.forEach(cat => {
      if (cat.title !== NOMBRE_CATEGORIA_POR_DEFECTO && cat.title !== NOMBRE_CATEGORIA_PREFERIDAS &&
          cat.title !== websiteData.columns[catIdx].title && cat.tools?.some(t => t.id === tool.id)) {
        categoriasAdicionalesSeleccionadas.push(cat.title);
      }
    });
    actualizarCategoriasSeleccionadas();

    const currentCategoryName = websiteData.columns[catIdx].title;
    const currentCategory = websiteData.columns[catIdx];
    if (currentCategory?.tools.some(t => t.id === tool.id)) {
      let removeCurrentCatDiv = linkFormContainer.querySelector('#removeCurrentCategoryDiv');
      if (!removeCurrentCatDiv) {
         removeCurrentCatDiv = document.createElement('div');
         removeCurrentCatDiv.id = 'removeCurrentCategoryDiv';
         removeCurrentCatDiv.className = 'checkbox-group';
         const otrasCategoriasGroup = linkFormContainer.querySelector('.categorias-selector')?.parentNode;
         if (otrasCategoriasGroup) otrasCategoriasGroup.parentNode.insertBefore(removeCurrentCatDiv, otrasCategoriasGroup);
      }
      removeCurrentCatDiv.innerHTML = `<input type="checkbox" id="removeFromCurrentCategory"><label for="removeFromCurrentCategory">Eliminar de "${currentCategoryName}"</label>`;
    }

    const tagsC = document.getElementById('cardPreviewTagsContainer');
    if (cardPreviewName) cardPreviewName.textContent = tool.name;
    if (cardPreviewLogo) cardPreviewLogo.src = tool.logoUrl || "https://via.placeholder.com/50";
    if (cardPreviewDescription) cardPreviewDescription.textContent = tool.briefDescription;
    if (cardPreviewPricing) cardPreviewPricing.textContent = tool.pricingModel;
    if (tagsC) tagsC.innerHTML = tool.tags.map(t => `<span class="tag">${t}</span>`).join('');
    if (_descriptionPreviewForm) { _descriptionPreviewForm.innerHTML = ""; _descriptionPreviewForm.style.display = 'none'; }
    if (_previewDescriptionBtnForm) _previewDescriptionBtnForm.textContent = 'Vista Previa';
    linkFormContainer.style.display = 'block';
  }

  function removeTool(id, catIdx) {
    if (!isEditable) return;
    const cat = websiteData.columns[catIdx], tool = cat.tools.find(t => t.id === id);
    if (confirm(`Eliminar "${tool.name}"?`)) {
      cat.tools = cat.tools.filter(t => t.id !== id);
      renderAllContent(document.getElementById('categoryFilter').value);
      saveWebsiteState();
    }
  }

  async function saveWebsiteState() {
    if (!isEditable) return;
    console.log("Guardando...");
    try {
      const r = await fetch('Paginas/nueva_pagina_principal/guardar_cambios.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: '0',
          background: websiteData.background || document.body.style.backgroundImage,
          columns: websiteData.columns
        })
      });
      if (!r.ok) {
        console.error('Err server save:', r.status, await r.text());
        alert('Err guardando server.');
        return;
      }
      const res = await r.json();
      if (!res.success) console.error('Err server save:', res.error);
      else console.log('Guardado OK.');
    } catch (e) {
      console.error('Err red save:', e);
      alert('Err red guardando.');
    }
  }

  async function loadInitialData() {
    try {
      const response = await fetch('Paginas/nueva_pagina_principal/load_state.php?t=' + Date.now());
      if (!response.ok) throw new Error(`Fallo carga: ${response.status}`);
      const loadedData = await response.json();

      if (loadedData && loadedData.error) {
        console.error("PHP Error:", loadedData.error, loadedData.detalles || "");
        websiteData = { columns: [ { title: NOMBRE_CATEGORIA_POR_DEFECTO, tools: [] }, { title: NOMBRE_CATEGORIA_PREFERIDAS, tools: [] } ], background: '' };
      } else if (loadedData && loadedData.columns) {
        websiteData = loadedData;
        if (!websiteData.columns.some(c => c.title === NOMBRE_CATEGORIA_POR_DEFECTO)) { websiteData.columns.unshift({ title: NOMBRE_CATEGORIA_POR_DEFECTO, tools: [] }); }
        if (!websiteData.columns.some(c => c.title === NOMBRE_CATEGORIA_PREFERIDAS)) { websiteData.columns.push({ title: NOMBRE_CATEGORIA_PREFERIDAS, tools: [] }); }
        websiteData.columns.forEach(c => {
          c.tools = c.tools || [];
          c.tools.forEach(t => {
            Object.assign(t, {
              id: t.id || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: t.name || "Sin Nombre", websiteUrl: t.websiteUrl || "#", logoUrl: t.logoUrl || "", briefDescription: t.briefDescription || "",
              detailedDescription: t.description || t.detailedDescription || "",
              tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? t.tags.split(',').map(x => x.trim()).filter(Boolean) : []),
              pricingModel: t.pricingModel || "Gratis", tutorialUrl: t.tutorialUrl || "", isPrivate: t.private ?? t.isPrivate ?? false,
              timestampAdded: t.timestampAdded || Date.now(), timestampUpdated: t.timestampUpdated || t.timestampAdded
            });
            if (t.hasOwnProperty('description')) delete t.description;
            if (t.hasOwnProperty('private')) delete t.private;
          });
        });
        if (websiteData.background) document.body.style.backgroundImage = websiteData.background;
      } else {
        websiteData = { columns: [ { title: NOMBRE_CATEGORIA_POR_DEFECTO, tools: [] }, { title: NOMBRE_CATEGORIA_PREFERIDAS, tools: [] } ], background: '' };
      }
    } catch (error) {
      console.error('Error crítico carga:', error);
      websiteData = { columns: [ { title: NOMBRE_CATEGORIA_POR_DEFECTO, tools: [] }, { title: NOMBRE_CATEGORIA_PREFERIDAS, tools: [] } ], background: '' };
    }
    createOrUpdateLinkForm();
    let categoryToSelectInitially = "";
    if (websiteData.columns.some(c => c.title === NOMBRE_CATEGORIA_POR_DEFECTO)) {
      categoryToSelectInitially = NOMBRE_CATEGORIA_POR_DEFECTO;
    } else {
      const savedCat = localStorage.getItem('lastCategoryFilter');
      if (savedCat && (websiteData.columns.some(c => c.title === savedCat) || savedCat === "_all_" || savedCat === "")) {
        categoryToSelectInitially = savedCat;
      }
    }
    renderAllContent(categoryToSelectInitially);
  }

  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');

  const MIS_WEBS = [
    { name: 'Web de Apps con IA', url: 'https://atnojs.es/Paginas/web_apps/index.html' },  
    { name: 'Tutoriales de IA', url: 'https://atnojs.es/Paginas/carpetas_nuevas/index.html?' },
    { name: 'Generar Imágenes', url: 'https://atnojs.es/Paginas/apps_imagenes/index.html' },
    { name: 'Generador de Prompts', url: 'https://atnojs.es/Paginas/prompts/index.html' },
  ];
  const linksSelect = document.getElementById('linksSelect');
  if (linksSelect) {
    MIS_WEBS.forEach(site => {
      const opt = document.createElement('option');
      opt.value = site.url;
      opt.textContent = site.name;
      linksSelect.appendChild(opt);
    });
    linksSelect.addEventListener('change', e => {
      if (e.target.value) {
        window.open(e.target.value, '_blank');
        e.target.value = '';
      }
    });
  }

  function filterAndSortTools() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategoryTitle = categoryFilter.value;
    const pricingFilter = document.getElementById('pricingFilter');
    const selectedPricing = pricingFilter ? pricingFilter.value : '';
    const sortOrderSelect = document.getElementById('sortOrder');
    const sortOrder = sortOrderSelect ? sortOrderSelect.value : 'default';

    localStorage.setItem('lastCategoryFilter', selectedCategoryTitle);

    if (selectedCategoryTitle === "") {
      columnsContainer.innerHTML = '<p class="initial-load-message">Por favor, selecciona una categoría para ver las herramientas.</p>';
      return;
    }

    let hasVisibleContent = false;
    columnsContainer.innerHTML = '';
    websiteData.columns.forEach((category, catIndex) => {
      if ((selectedCategoryTitle !== "_all_") && (category.title !== selectedCategoryTitle)) return;

      const categoryElement = createCategoryElement(category, catIndex);
      const toolsGrid = categoryElement.querySelector('.ai-tools-grid');
      toolsGrid.innerHTML = '';
      let toolsToDisplay = (category.tools || []).filter(t =>
        (searchTerm ? [t.name, t.briefDescription, ...(t.tags || [])].join(' ').toLowerCase().includes(searchTerm) : true) &&
        (!selectedPricing || t.pricingModel === selectedPricing)
      );

      toolsToDisplay.sort((a, b) => {
        switch (sortOrder) {
          case 'newest': return b.timestampAdded - a.timestampAdded;
          case 'oldest': return a.timestampAdded - b.timestampAdded;
          case 'nameAsc': return a.name.localeCompare(b.name);
          case 'nameDesc': return b.name.localeCompare(a.name);
          default:
            const originalTools = websiteData.columns[catIndex].tools || [];
            return originalTools.indexOf(a) - originalTools.indexOf(b);
        }
      });

      if (toolsToDisplay.length > 0) {
        toolsToDisplay.forEach((tool, toolIdx) => {
          toolsGrid.appendChild(createToolCardElement(tool, catIndex, toolIdx, toolsToDisplay.length));
        });
        columnsContainer.appendChild(categoryElement);
        hasVisibleContent = true;
      } else if (category.title === selectedCategoryTitle || (selectedCategoryTitle === "_all_" && (!searchTerm && !selectedPricing))) {
        toolsGrid.innerHTML = `<p class="no-tools-message">${searchTerm || selectedPricing ? 'No hay herramientas que coincidan.' : 'No hay herramientas aquí aún.'}</p>`;
        columnsContainer.appendChild(categoryElement);
        hasVisibleContent = true;
      }
    });

    if (!hasVisibleContent && selectedCategoryTitle !== "") {
      columnsContainer.innerHTML = '<p class="initial-load-message">No se encontraron herramientas para los filtros actuales.</p>';
    }
    setupEditModeUI();
  }

  searchInput.addEventListener('input', filterAndSortTools);
  categoryFilter.addEventListener('change', filterAndSortTools);
  // Los listeners para los filtros eliminados se pueden quitar o dejar, pero no harán nada.
  const pricingFilterEl = document.getElementById('pricingFilter');
  if (pricingFilterEl) pricingFilterEl.addEventListener('change', filterAndSortTools);
  const sortOrderEl = document.getElementById('sortOrder');
  if (sortOrderEl) sortOrderEl.addEventListener('change', filterAndSortTools);


  document.getElementById('bgInput').addEventListener('change', function(e) {
    if (!isEditable) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.body.style.backgroundImage = `url(${ev.target.result})`;
      websiteData.background = `url(${ev.target.result})`;
      saveWebsiteState();
    };
    reader.readAsDataURL(file);
  });

  loadInitialData();

  document.addEventListener('click', function(e) {
    const popup = document.querySelector('.tooltip.popup');
    if (popup && !e.target.closest('.tooltip.popup') && !e.target.closest('.more-info-btn')) popup.remove();
    if (adminPasswordModal.style.display === 'flex' && !e.target.closest('.password-modal-content') && e.target !== adminPasswordModal && e.target !== editModeBtn && !editModeBtn.contains(e.target)) adminPasswordModal.style.display = 'none';
    if (categoryOrderModal.style.display === 'flex' && !e.target.closest('#categoryOrderModal .modal-content') && e.target !== categoryOrderModal && e.target !== orderCategoriesBtn && (orderCategoriesBtn && !orderCategoriesBtn.contains(e.target))) {
      categoryOrderModal.style.display = 'none';
    }
  });

  // Auto-scroll during drag
  document.addEventListener('dragover', function(e) {
     if (!isDraggingTool) return;

     const viewportHeight = window.innerHeight;
     const scrollZone = 80; // Pixels from edge to start scrolling
     const scrollSpeed = 15; // Pixels to scroll per frame

     if (e.clientY < scrollZone) {
         // Near the top
         window.scrollBy(0, -scrollSpeed);
     } else if (e.clientY > viewportHeight - scrollZone) {
         // Near the bottom
         window.scrollBy(0, scrollSpeed);
     }
 });

  window.checkPassword = async (pass) => {
    const fd = new FormData();
    fd.append('password', pass);
    try {
      const r = await fetch('validar_password.php', { method: 'POST', body: fd });
      if (!r.ok) {
        console.error("Err server pass val:", r.status, await r.text());
        alert(`Server Err (${r.status}).`); return false;
      }
      const res = await r.json();
      return res.success;
    } catch (e) {
      console.error("Net/parse err pass val:", e);
      alert("Err red/parse. Verifique script PHP.");
      return false;
    }
  };

  const canvas = document.getElementById('bgCanvas'), ctx = canvas.getContext('2d');
  let fxRAF = null, particles = [];
  function resizeCanvas(){ canvas.width = innerWidth; canvas.height = innerHeight; }
  function createParticles(){
    const count = Math.round((innerWidth*innerHeight)/38000);
    particles = Array.from({length:count}, ()=>({
      x: Math.random()*innerWidth, y: Math.random()*innerHeight,
      r: 0.8+Math.random()*2.2,
      dx: (-0.3+Math.random()*0.6), dy:(-0.2+Math.random()*0.4),
      h: Math.floor(Math.random()*360)
    }));
  }
  function animateFx(){
    fxRAF = requestAnimationFrame(animateFx);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p=>{
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0||p.x>innerWidth) p.dx*=-1;
      if(p.y<0||p.y>innerHeight) p.dy*=-1;
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
      g.addColorStop(0, `hsla(${p.h},70%,60%,.6)`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2); ctx.fill();
    });
  }
  resizeCanvas(); createParticles(); animateFx(); addEventListener('resize', resizeCanvas);
});