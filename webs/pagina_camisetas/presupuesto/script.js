document.addEventListener('DOMContentLoaded', function() {
  // --- HEADER ---
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // --- DOM ---
  const previewContainer = document.getElementById('preview-container');
  const mockupImg = document.getElementById('mockup-img');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const productHiddenInput = document.getElementById('product-hidden-input');
  const addTextBtn = document.getElementById('add-text-btn');
  const addImageBtn = document.getElementById('add-image-btn');
  const textControlsContainer = document.getElementById('text-controls-container');
  const imageControlsContainer = document.getElementById('image-controls-container');
  const layersPanel = document.getElementById('layers-panel');
  const pedidoForm = document.getElementById('pedido-form');
  const hiddenInputsContainer = document.getElementById('hidden-inputs-container');
  const presupuestoItemsContainer = document.getElementById('presupuesto-items-container');
  const res = document.getElementById('resultado'), descMsg = document.getElementById('descuento');
  const adjuntoInput = document.getElementById('adjunto');
  const adjuntoNombre = document.getElementById('adjunto-nombre');
  const adjuntoPreview = document.getElementById('adjunto-preview');
  const toggleText = document.getElementById('toggle-text');
  const toggleImage = document.getElementById('toggle-image');
  const zoomMockupBtn = document.getElementById('zoom-mockup-btn');
  const imageModal = document.getElementById('image-modal');
  const modalContentWrapper = document.getElementById('modal-content-wrapper');
  const modalPreviewContent = document.getElementById('modal-preview-content');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const sizeSelectorContainer = document.getElementById('size-selector-container');

  // --- SELECT PERSONALIZADO DE PRODUCTO ---
  const customProductSelect = document.getElementById('custom-product-select');
  const productSelectButton = document.getElementById('product-select-button');
  const productSelectValue = document.getElementById('product-select-value');
  const productOptionsContainer = document.getElementById('product-select-options');
  const productOptions = [ "Camiseta Hombre Cuello Redondo", "Camiseta Mujer Cuello Redondo", "Camiseta Hombre Cuello Pico", "Camiseta Mujer Cuello Pico", "Polo Hombre", "Polo Mujer", "Sudadera Hombre", "Sudadera Mujer", "Taza", "Gorra", "Plato" ];
  const productsWithSizes = [ "Camiseta Hombre Cuello Redondo", "Camiseta Mujer Cuello Redondo", "Camiseta Hombre Cuello Pico", "Camiseta Mujer Cuello Pico", "Polo Hombre", "Polo Mujer", "Sudadera Hombre", "Sudadera Mujer" ];

  // --- SELECT PERSONALIZADO DE TALLA ---
  const customSizeSelect = document.getElementById('custom-size-select');
  const sizeSelectButton = document.getElementById('size-select-button');
  const sizeSelectValue = document.getElementById('size-select-value');
  const sizeHiddenInput = document.getElementById('size-hidden-input');
  const sizeOptionsContainer = document.getElementById('size-select-options');
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  function setupCustomSelect(container, button, valueEl, optionsContainer, optionsArray, hiddenInput, callback) {
    optionsArray.forEach(optionText => {
      const optionDiv = document.createElement('div');
      optionDiv.textContent = optionText; optionDiv.dataset.value = optionText; optionDiv.className = 'custom-select-option px-3 py-2 cursor-pointer';
      optionsContainer.appendChild(optionDiv);
      optionDiv.addEventListener('click', () => {
        valueEl.textContent = optionText; hiddenInput.value = optionText;
        optionsContainer.classList.add('hidden','opacity-0','-translate-y-2');
        if (callback) callback(optionText);
      });
    });
    button.addEventListener('click',(e)=>{ e.stopPropagation(); const h=optionsContainer.classList.contains('hidden');
      if(h){ optionsContainer.classList.remove('hidden'); setTimeout(()=>optionsContainer.classList.remove('opacity-0','-translate-y-2'),10);}
      else{ optionsContainer.classList.add('opacity-0','-translate-y-2'); setTimeout(()=>optionsContainer.classList.add('hidden'),200); }
    });
    document.addEventListener('click',(e)=>{ if(!container.contains(e.target)){ optionsContainer.classList.add('opacity-0','-translate-y-2'); setTimeout(()=>optionsContainer.classList.add('hidden'),200); } });
  }

  function onProductChange(productName) {
    toggleSizeSelector(productName);
    updateMockup();
  }

  setupCustomSelect(customProductSelect, productSelectButton, productSelectValue, productOptionsContainer, productOptions, productHiddenInput, onProductChange);
  setupCustomSelect(customSizeSelect, sizeSelectButton, sizeSelectValue, sizeOptionsContainer, sizeOptions, sizeHiddenInput, null);

  function toggleSizeSelector(productName) {
    if (productsWithSizes.includes(productName)) {
      sizeSelectorContainer.classList.remove('hidden');
    } else {
      sizeSelectorContainer.classList.add('hidden');
    }
  }

  // --- ESTADO ---
  let elements = [];
  let activeElementId = null;
  const MAX_TEXTS = 4, MAX_IMAGES = 4;
  let currentProduct = 'Camiseta Hombre', currentFile = 'blanca.webp';
  let isShiftPressed = false;
  let directlyAttachedFiles = []; // State variable for direct attachments
  const PX_TO_CM = 2.54 / 96;

  const MOCKUP_BASES = {
    'Camiseta Hombre Cuello Redondo': '/Paginas/pagina_camisetas/mockups/camisetas/camisetas_hombre/cuello_redondo/',
    'Camiseta Mujer Cuello Redondo': null,
    'Camiseta Hombre Cuello Pico': '/Paginas/pagina_camisetas/mockups/camisetas/camisetas_hombre/cuello_pico/',
    'Camiseta Mujer Cuello Pico': null,
    'Polo Hombre': '/Paginas/pagina_camisetas/mockups/polos/polos_hombre/',
    'Polo Mujer': null,
    'Sudadera Hombre': '/Paginas/pagina_camisetas/mockups/sudaderas/',
    'Sudadera Mujer': null,
    'Taza': '/Paginas/pagina_camisetas/mockups/tazas/',
    'Gorra': '/Paginas/pagina_camisetas/mockups/gorras/',
    'Plato': null
  };

  const fontCategories = {
    'Clásicas': [{ name: 'Roboto', value: "'Roboto', sans-serif" }, { name: 'Montserrat', value: "'Montserrat', sans-serif" },{ name: 'Poppins', value: "'Poppins', sans-serif" }, { name: 'Playfair Display', value: "'Playfair Display', serif" },{ name: 'Arial', value: "'Arial', sans-serif" }, { name: 'Times New Roman', value: "'Times New Roman', serif" },{ name: 'Georgia', value: "'Georgia', serif" }, { name: 'Helvetica', value: "'Helvetica', sans-serif" },{ name: 'Verdana', value: "'Verdana', sans-serif" },],
    'Manuscrita': [{ name: 'Pacifico', value: "'Pacifico', cursive" }, { name: 'Lobster', value: "'Lobster', cursive" },{ name: 'Dancing Script', value: "'Dancing Script', cursive" }, { name: 'Caveat', value: "'Caveat', cursive" },{ name: 'Sacramento', value: "'Sacramento', cursive" }, { name: 'Kaushan Script', value: "'Kaushan Script', cursive" },{ name: 'Great Vibes', value: "'Great Vibes', cursive" }, { name: 'Satisfy', value: "'Satisfy', cursive" },{ name: 'Cookie', value: "'Cookie', cursive" }, { name: 'Allura', value: "'Allura', cursive" },],
    'Impacto (Negritas)': [{ name: 'Anton', value: "'Anton', sans-serif" }, { name: 'Oswald', value: "'Oswald', sans-serif" },{ name: 'Bebas Neue', value: "'Bebas Neue', sans-serif" }, { name: 'Black Ops One', value: "'Black Ops One', cursive" },{ name: 'Archivo Black', value: "'Archivo Black', sans-serif" }, { name: 'Russo One', value: "'Russo One', sans-serif" },{ name: 'Alfa Slab One', value: "'Alfa Slab One', cursive" }, { name: 'Bungee Inline', value: "'Bungee Inline', cursive" },],
    'Elegante': [{ name: 'Cinzel', value: "'Cinzel', serif" }, { name: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },{ name: 'Josefin Sans', value: "'Josefin Sans', sans-serif" }, { name: 'Didot', value: "'Didot', serif" },{ name: 'Bodoni MT', value: "'Bodoni MT', serif" }, { name: 'Lora', value: "'Lora', serif" },{ name: 'Merriweather', value: "'Merriweather', serif" }, { name: 'EB Garamond', value: "'EB Garamond', serif" },],
    'Urbano (Graffiti)': [{ name: 'Permanent Marker', value: "'Permanent Marker', cursive" }, { name: 'Rock Salt', value: "'Rock Salt', cursive" },{ name: 'Bangers', value: "'Bangers', cursive" }, { name: 'Fredoka One', value: "'Fredoka One', cursive" },{ name: 'Kalam', value: "'Kalam', cursive" }, { name: 'Shadows Into Light', value: "'Shadows Into Light', cursive" },{ name: 'Indie Flower', value: "'Indie Flower', cursive" }, { name: 'Amatic SC', value: "'Amatic SC', cursive" },],
    'Moderno (Neón)': [{ name: 'Monoton', value: "'Monoton', cursive" }, { name: 'Bungee', value: "'Bungee', cursive" },{ name: 'Audiowide', value: "'Audiowide', cursive" }, { name: 'Orbitron', value: "'Orbitron', sans-serif" },{ name: 'Press Start 2P', value: "'Press Start 2P', cursive" }, { name: 'Electrolize', value: "'Electrolize', sans-serif" },{ name: 'Righteous', value: "'Righteous', cursive" }, { name: 'Exo 2', value: "'Exo 2', sans-serif" },],
    'Decorativa': [{ name: 'Nosifer', value: "'Nosifer', cursive" }, { name: 'Eater', value: "'Eater', cursive" },{ name: 'Creepster', value: "'Creepster', cursive" }, { name: 'Fascinate', value: "'Fascinate', cursive" },{ name: 'Bungee Shade', value: "'Bungee Shade', cursive" }, { name: 'Fredericka the Great', value: "'Fredericka the Great', cursive" },{ name: 'Lakki Reddy', value: "'Lakki Reddy', cursive" }, { name: 'Modak', value: "'Modak', cursive" },]
  };

  // --- HELPERS ---
  const clamp = (v,min,max)=>Math.min(Math.max(v,min),max);

  // === AÑADIR ELEMENTOS ===
  function addNewText() {
    if (elements.filter(e => e.type === 'text').length >= MAX_TEXTS) return;
    const id = Date.now();
    const newTextObject = {
      id, type:'text', text:'Tu texto', color:'#FF0000', font:"'Roboto', sans-serif", fontName:'Roboto',
      x:50, y:80 + (elements.length*40), w:160, h:80, zIndex:elements.length, aspectRatio:160/80,
      skewX:0, skewY:0
    };
    newTextObject.initialState = JSON.parse(JSON.stringify(newTextObject));
    elements.push(newTextObject);
    createDesignBox(newTextObject); createTextControls(newTextObject); updateLayersPanel();
    setActiveElement(id); updatePreview(id); toggleTextAddButton();
  }

  function addNewImage(file, fileName) {
    if (elements.filter(e => e.type === 'image').length >= MAX_IMAGES) return;
    const id = Date.now(); const img = new Image(); img.src = URL.createObjectURL(file);
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const initialWidth = 160, initialHeight = initialWidth / aspectRatio;
      const newImageObject = {
        id, type:'image', fileName, src:img.src, file: file,
        x:50, y:80 + (elements.length*40), w:initialWidth, h:initialHeight,
        zIndex:elements.length, aspectRatio, skewX:0, skewY:0
      };
      newImageObject.initialState = JSON.parse(JSON.stringify(newImageObject));
      elements.push(newImageObject);
      createDesignBox(newImageObject); createImageControls(newImageObject); updateLayersPanel();
      setActiveElement(id); toggleImageAddButton();
      updateBudgetDimensions(newImageObject);
    };
  }

  function removeElement(idToRemove){
    const element = elements.find(e=>e.id===idToRemove);
    elements = elements.filter(e=>e.id!==idToRemove);
    document.querySelector(`.design-box[data-id="${idToRemove}"]`)?.remove();
    if (element?.type==='text') document.querySelector(`.text-controls-group[data-id="${idToRemove}"]`)?.remove();
    if (element?.type==='image') document.querySelector(`.image-controls-group[data-id="${idToRemove}"]`)?.remove();
    document.querySelector(`.presupuesto-item[data-id="${idToRemove}"]`)?.remove();
    if (activeElementId===idToRemove){ const last=elements[elements.length-1]; setActiveElement(last?last.id:null); }
    updateLayersPanel(); toggleTextAddButton(); toggleImageAddButton(); calc();
  }

  function resetElement(id){
    const element = elements.find(e=>e.id===id); if(!element || !element.initialState) return;
    const initialStateCopy = {...element.initialState}; delete initialStateCopy.id; delete initialStateCopy.type; delete initialStateCopy.initialState;
    Object.assign(element, initialStateCopy); element.skewX=0; element.skewY=0;
    const box = document.querySelector(`.design-box[data-id="${id}"]`);
    if (box){ box.style.left=`${element.x}px`; box.style.top=`${element.y}px`; box.style.width=`${element.w}px`; box.style.height=`${element.h}px`;
      const t = box.querySelector('.transform-target'); if (t) t.style.transform='skew(0deg,0deg)'; }
    if (element.type==='text'){ 
      const g=document.querySelector(`.text-controls-group[data-id="${id}"]`);
      if(g){
        g.querySelector('.text-input').value=element.text;
        const colorButton = g.querySelector('.color-picker-button');
        if (colorButton) colorButton.style.backgroundColor = element.color;
        g.querySelector('.font-selector-button span').textContent=element.fontName;
      } 
    }
    updatePreview(id);
    updateBudgetDimensions(element);
  }

  // === UI DE CAJA ===
  function createDesignBox(element){
    const designBox = document.createElement('div');
    designBox.className = 'design-box cursor-move';
    designBox.dataset.id = element.id;
    designBox.style.left = `${element.x}px`;
    designBox.style.top = `${element.y}px`;
    designBox.style.width = `${element.w}px`;
    designBox.style.height = `${element.h}px`;
    designBox.style.zIndex = element.zIndex;
    designBox.innerHTML = `
      <div class="design-preview w-full h-full flex items-center justify-center p-2">
        <div class="transform-target w-full h-full flex items-center justify-center">
          ${element.type === 'text' ? `<p class="preview-text font-extrabold text-center"></p>` : `<img class="preview-image" src="${element.src}" alt="Imagen personalizada">`}
        </div>
      </div>
      <span class="resize-handle handle-nw" data-dir="nw"></span><span class="resize-handle handle-ne" data-dir="ne"></span>
      <span class="resize-handle handle-sw" data-dir="sw"></span><span class="resize-handle handle-se" data-dir="se"></span>
      <span class="resize-handle handle-n" data-dir="n"></span><span class="resize-handle handle-s" data-dir="s"></span>
      <span class="resize-handle handle-w" data-dir="w"></span><span class="resize-handle handle-e" data-dir="e"></span>`;
    previewContainer.appendChild(designBox);
    if (element.type==='text') updatePreview(element.id);
  }

  function createFontSelectorHTML(textObj){
    let categoriesHTML = '';
    for (const category in fontCategories) {
        let optionsHTML = '';
        fontCategories[category].forEach(font => {
            optionsHTML += `<div class="font-option custom-select-option px-4 py-2" data-font-name="${font.name}" data-font-value="${font.value}">
                              <span style="font-family: ${font.value}; font-size: 1.1rem;">${font.name}</span>
                            </div>`;
        });
        categoriesHTML += `<div class="font-category relative custom-select-option px-4 py-2 flex justify-between items-center">
                               <span>${category}</span>
                               <i class="ri-arrow-right-s-line"></i>
                               <div class="font-submenu custom-select-options hidden absolute left-full top-0 w-56 z-20">${optionsHTML}</div>
                           </div>`;
    }
    return `<div class="font-selector-container relative" data-id="${textObj.id}">
              <button type="button" class="font-selector-button custom-select-button w-full flex items-center justify-between text-left px-3 py-2">
                <span class="truncate">${textObj.fontName}</span>
                <i class="ri-arrow-down-s-line text-gray-400"></i>
              </button>
              <div class="font-dropdown custom-select-options hidden absolute z-10 w-full mt-1">${categoriesHTML}</div>
            </div>`;
}
function createTextControls(textObj){
    const g = document.createElement('div');
    g.className='text-controls-group p-4 rounded-lg space-y-3 bg-gray-900/50'; g.dataset.id=textObj.id;
    const fontSelectorHTML = createFontSelectorHTML(textObj);
    const textIndex = elements.filter(e=>e.type==='text').indexOf(textObj) + 1;
    g.innerHTML = `
      <div class="flex justify-between items-center">
        <label class="text-lg font-bold text-darkText">Texto ${textIndex}</label>
        <div class="flex items-center space-x-3">
          <button type="button" class="reset-element-btn text-cyan-400 hover:text-cyan-500 font-semibold" data-id="${textObj.id}">Resetear Texto</button>
          <button type="button" class="remove-element-btn text-red-500 hover:text-red-600 font-semibold" data-id="${textObj.id}">Eliminar Texto</button>
        </div>
      </div>
      <textarea rows="2" class="text-input w-full px-3 py-2" data-id="${textObj.id}">${textObj.text}</textarea>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Tipografía</label>
          ${fontSelectorHTML}
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Color</label>
          <div class="color-picker-container relative" data-id="${textObj.id}">
            <button type="button" class="color-picker-button w-full h-10 p-1 border border-gray-600 rounded-md cursor-pointer" style="background-color: ${textObj.color};"></button>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Ancho actual</label>
          <div class="text-dimensions-display bg-gray-800 px-3 py-2 rounded-md text-gray-300" data-dimension="width">${Math.round(textObj.w)} px</div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Alto actual</label>
          <div class="text-dimensions-display bg-gray-800 px-3 py-2 rounded-md text-gray-300" data-dimension="height">${Math.round(textObj.h)} px</div>
        </div>
      </div>`;
    textControlsContainer.appendChild(g);
    createPresupuestoItem(textObj);
  }

  function createImageControls(imageObj){
    const g = document.createElement('div');
    g.className='image-controls-group p-4 rounded-lg space-y-3 bg-gray-900/50'; g.dataset.id=imageObj.id;
    const imageIndex = elements.filter(e=>e.type==='image').indexOf(imageObj) + 1;
    g.innerHTML = `
      <div class="flex justify-between items-center">
        <label class="text-lg font-bold text-darkText">Imagen ${imageIndex}</label>
        <div class="flex items-center space-x-3">
          <button type="button" class="reset-element-btn text-cyan-400 hover:text-cyan-500 font-semibold" data-id="${imageObj.id}">Resetear Imagen</button>
          <button type="button" class="remove-element-btn text-red-500 hover:text-red-600 font-semibold" data-id="${imageObj.id}">Eliminar Imagen</button>
        </div>
      </div>
      <div class="text-sm text-gray-400 truncate">${imageObj.fileName}</div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Ancho actual</label>
          <div class="image-dimensions-display bg-gray-800 px-3 py-2 rounded-md text-gray-300" data-dimension="width">${Math.round(imageObj.w)} px</div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Alto actual</label>
          <div class="image-dimensions-display bg-gray-800 px-3 py-2 rounded-md text-gray-300" data-dimension="height">${Math.round(imageObj.h)} px</div>
        </div>
      </div>
      <label for="image-input-${imageObj.id}" class="w-full text-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-button cursor-pointer block text-darkText transition-colors">Cambiar imagen</label>
      <input type="file" id="image-input-${imageObj.id}" class="hidden" accept="image/*">`;
    imageControlsContainer.appendChild(g);
    createPresupuestoItem(imageObj);
  }

  function updateLayersPanel(){
    layersPanel.innerHTML=''; const sorted=[...elements].sort((a,b)=>b.zIndex-a.zIndex);
    sorted.forEach((el,idx)=>{
      const item=document.createElement('div'); item.className='layer-item'; item.dataset.id=el.id;
      item.innerHTML=`
        <span class="text-sm dark:text-darkText">${el.type==='text' ? `Texto ${elements.filter(e=>e.type==='text').indexOf(el)+1}` : `Imagen ${elements.filter(e=>e.type==='image').indexOf(el)+1}`}</span>
        <div class="flex space-x-2">
          <button type="button" class="move-layer-up bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded-md text-sm ${idx===0?'opacity-50 cursor-not-allowed':''}" data-id="${el.id}"><i class="ri-arrow-up-s-line"></i></button>
          <button type="button" class="move-layer-down bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded-md text-sm ${idx===sorted.length-1?'opacity-50 cursor-not-allowed':''}" data-id="${el.id}"><i class="ri-arrow-down-s-line"></i></button>
        </div>`;
      layersPanel.appendChild(item);
    });
  }

  function moveLayer(id, dir){
    const sorted=[...elements].sort((a,b)=>a.zIndex-b.zIndex);
    const i=sorted.findIndex(e=>e.id===id); let j=-1;
    if (dir==='up' && i<sorted.length-1) j=i+1; else if(dir==='down' && i>0) j=i-1;
    if (j!==-1){ const a=sorted[i], b=sorted[j]; [a.zIndex,b.zIndex]=[b.zIndex,a.zIndex]; }
    elements.forEach(e=>{ const box=document.querySelector(`.design-box[data-id="${e.id}"]`); if(box) box.style.zIndex=e.zIndex; });
    updateLayersPanel();
  }

  function setActiveElement(id){
    activeElementId=id;
    document.querySelectorAll('.design-box').forEach(b=>b.classList.toggle('active', b.dataset.id==id));
    document.querySelectorAll('.text-controls-group, .image-controls-group').forEach(g=>g.classList.toggle('active', g.dataset.id==id));
  }

  function updatePreview(id){
    const el=elements.find(e=>e.id===id); if(!el) return;
    const box=document.querySelector(`.design-box[data-id="${id}"]`); if(!box) return;
    const t=box.querySelector('.transform-target'); if (t) t.style.transform = `skew(${el.skewX||0}deg, ${el.skewY||0}deg)`;
    if (el.type==='text'){
      const txt=box.querySelector('.preview-text'); if(!txt) return;
      txt.textContent = el.text; txt.style.color=el.color; txt.style.fontFamily=el.font;
      fitAsync(txt, box.querySelector('.design-preview'));
    } else {
      const img=box.querySelector('.preview-image'); if(img) img.src = el.src;
    }
  }

  function fitAsync(previewText, container){ requestAnimationFrame(()=>fitPreviewText(previewText, container)); }
  function fitPreviewText(previewText, designPreview){
    if (!previewText || !designPreview || !previewText.textContent){ if(previewText) previewText.style.fontSize=''; return; }
    let low=1, high=200;
    const fits = ()=> (previewText.scrollWidth<=designPreview.clientWidth && previewText.scrollHeight<=designPreview.clientHeight);
    previewText.style.fontSize=`${low}px`; if(!fits()){ previewText.style.fontSize='0px'; return; }
    while(low<=high){ const mid=(low+high>>1); previewText.style.fontSize=mid+'px'; if(fits()) low=mid+1; else high=mid-1; }
    previewText.style.fontSize=Math.max(1,high)+'px';
  }

  function toggleTextAddButton(){ const c=elements.filter(e=>e.type==='text').length; addTextBtn.disabled=c>=MAX_TEXTS; addTextBtn.classList.toggle('opacity-50',c>=MAX_TEXTS); addTextBtn.classList.toggle('cursor-not-allowed',c>=MAX_TEXTS); }
  function toggleImageAddButton(){ const c=elements.filter(e=>e.type==='image').length; addImageBtn.disabled=c>=MAX_IMAGES; addImageBtn.classList.toggle('opacity-50',c>=MAX_IMAGES); addImageBtn.classList.toggle('cursor-not-allowed',c>=MAX_IMAGES); }

  function updateMockup(){
    const sw = document.querySelector('.color-swatch.selected'); if(!sw) return;
    currentFile = sw.dataset.file;
    currentProduct = productHiddenInput.value;
    const base = MOCKUP_BASES[currentProduct];
    if (base){
        mockupImg.src = base + currentFile;
        mockupImg.style.display = 'block';
    } else {
        mockupImg.src = '';
        mockupImg.style.display = 'none';
    }
  }

  // === CUSTOM COLOR PICKER ===
  function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
      r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
      r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6];
    }
    return { r: +r, g: +g, b: +b };
  }

  function rgbToHsv({r, g, b}) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max == 0 ? 0 : d / max;
    if (max == min) { h = 0; } 
    else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, v };
  }

  function hsvToRgb({h, s, v}) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function rgbToHex({r, g, b}) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  function createColorPicker(element, onColorChange) {
    const picker = document.createElement('div');
    picker.className = 'custom-color-picker';
    picker.innerHTML = `
      <div class="sv-panel"><div class="sv-handle"></div></div>
      <div class="hue-slider"><div class="hue-handle"></div></div>`;
    
    const svPanel = picker.querySelector('.sv-panel');
    const svHandle = picker.querySelector('.sv-handle');
    const hueSlider = picker.querySelector('.hue-slider');
    const hueHandle = picker.querySelector('.hue-handle');
    
    let hsv = rgbToHsv(hexToRgb(element.color));

    function updateColorUI() {
      const rgb = hsvToRgb(hsv);
      const hex = rgbToHex(rgb);
      const pureHueRgb = hsvToRgb({ h: hsv.h, s: 1, v: 1 });
      svPanel.style.backgroundImage = `linear-gradient(to right, white, ${rgbToHex(pureHueRgb)})`;
      
      const svX = hsv.s * svPanel.offsetWidth;
      const svY = (1 - hsv.v) * svPanel.offsetHeight;
      svHandle.style.left = `${svX}px`;
      svHandle.style.top = `${svY}px`;
      
      const hueX = hsv.h * hueSlider.offsetWidth;
      hueHandle.style.left = `${hueX}px`;

      onColorChange(hex);
    }

    function handleSV(e) {
      e.preventDefault();
      const rect = svPanel.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const y = clamp(e.clientY - rect.top, 0, rect.height);
      hsv.s = x / rect.width;
      hsv.v = 1 - (y / rect.height);
      updateColorUI();
    }
    
    function handleHue(e) {
      e.preventDefault();
      const rect = hueSlider.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      hsv.h = x / rect.width;
      updateColorUI();
    }
    
    function stopDrag() {
      document.removeEventListener('pointermove', handleSV);
      document.removeEventListener('pointermove', handleHue);
    }

    svPanel.addEventListener('pointerdown', e => {
      handleSV(e);
      document.addEventListener('pointermove', handleSV);
      document.addEventListener('pointerup', stopDrag, { once: true });
    });
    
    hueSlider.addEventListener('pointerdown', e => {
      handleHue(e);
      document.addEventListener('pointermove', handleHue);
      document.addEventListener('pointerup', stopDrag, { once: true });
    });
    
    updateColorUI();
    return picker;
  }
  
  function closeAllColorPickers() {
    document.querySelectorAll('.custom-color-picker').forEach(p => p.remove());
  }
  
  function toggleColorPicker(container, element) {
    const existingPicker = container.querySelector('.custom-color-picker');
    closeAllColorPickers();
    if (existingPicker) return;
    
    const picker = createColorPicker(element, (newColor) => {
      element.color = newColor;
      container.querySelector('.color-picker-button').style.backgroundColor = newColor;
      updatePreview(element.id);
    });
    container.appendChild(picker);
  }

  // === FUNCIONES PRESUPUESTO ===
  function updateBudgetDimensions(element) {
    if (!element) return;
    const budgetItem = document.querySelector(`.presupuesto-item[data-id="${element.id}"]`);
    if (budgetItem) {
      const anchoInput = budgetItem.querySelector('.presupuesto-ancho');
      const altoInput = budgetItem.querySelector('.presupuesto-alto');
      const anchoCm = (element.w * PX_TO_CM).toFixed(1);
      const altoCm = (element.h * PX_TO_CM).toFixed(1);
      if (anchoInput) anchoInput.value = anchoCm;
      if (altoInput) altoInput.value = altoCm;
      calc();
    }
  }

  function createPresupuestoItem(element){
    const itemDiv = document.createElement('div');
    itemDiv.className = 'presupuesto-item border border-gray-600 rounded-lg p-3 bg-gray-900/30';
    itemDiv.dataset.id = element.id;
    const index = elements.filter(e=>e.type===element.type).indexOf(element) + 1;
    const label = element.type === 'text' ? `Texto ${index}` : `Imagen ${index}`;
    itemDiv.innerHTML = `
      <div class="mb-2 font-semibold text-cyan-400">${label}</div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="block text-xs text-gray-500 mb-1">Ancho (cm)</label><input type="number" min="1" step="0.1" class="presupuesto-ancho w-full px-2 py-1 text-sm" data-id="${element.id}" placeholder="0"></div>
        <div><label class="block text-xs text-gray-500 mb-1">Alto (cm)</label><input type="number" min="1" step="0.1" class="presupuesto-alto w-full px-2 py-1 text-sm" data-id="${element.id}" placeholder="0"></div>
        <div><label class="block text-xs text-gray-500 mb-1">Cantidad</label><input type="number" min="1" class="presupuesto-cantidad w-full px-2 py-1 text-sm" data-id="${element.id}" placeholder="0"></div>
      </div>
      <div class="text-right mt-2 text-sm font-bold text-gray-300"><span class="presupuesto-subtotal">0,00 €</span></div>`;
    presupuestoItemsContainer.appendChild(itemDiv);
    itemDiv.querySelectorAll('input').forEach(input => input.addEventListener('input', calc));
  }

  // === PRECIO ===
  function calc(){
    let total=0, hasAnyValue=false, totalCantidad=0;
    document.querySelectorAll('.presupuesto-item').forEach(item => {
      const ancho = parseFloat(item.querySelector('.presupuesto-ancho').value) || 0;
      const alto = parseFloat(item.querySelector('.presupuesto-alto').value) || 0;
      const cantidad = parseInt(item.querySelector('.presupuesto-cantidad').value) || 0;
      if (ancho>0 && alto>0 && cantidad>0){
        hasAnyValue=true; const subtotal=(ancho*alto*0.00067+0.28)*cantidad;
        item.querySelector('.presupuesto-subtotal').textContent = subtotal.toFixed(2).replace('.', ',') + ' €';
        total+=subtotal; totalCantidad+=cantidad;
      } else { item.querySelector('.presupuesto-subtotal').textContent = '0,00 €'; }
    });
    if (!hasAnyValue){ res.textContent = '0,00 €'; descMsg.classList.add('hidden'); return; }
    if (totalCantidad>=50){ const desc=total*0.10; total-=desc; descMsg.textContent=`Descuento 10% por ${totalCantidad} uds.`; descMsg.classList.remove('hidden'); }
    else { descMsg.classList.add('hidden'); }
    res.textContent = total.toFixed(2).replace('.', ',') + ' €';
  }

  // === INTERACCIÓN ===
  let interactionMode=null, startX=0, startY=0, startL=0, startT=0, startW=0, startH=0, resizeDir=null, startSkewX=0, startSkewY=0;
  function onPointerDown(e){
    const targetBox=e.target.closest('.design-box'); if(!targetBox){ setActiveElement(null); return; }
    e.preventDefault(); e.stopPropagation(); const id=parseInt(targetBox.dataset.id); setActiveElement(id);
    const handle=e.target.closest('.resize-handle');
    startL=parseFloat(targetBox.style.left); startT=parseFloat(targetBox.style.top);
    startW=parseFloat(targetBox.style.width); startH=parseFloat(targetBox.style.height);
    startX=e.clientX; startY=e.clientY; resizeDir=handle?handle.dataset.dir:null;
    interactionMode=handle?'resize':'drag';
    if (handle&&!(resizeDir?.length===2)) interactionMode='skew';
    const el=elements.find(e=>e.id===id); if(el){ startSkewX=el.skewX||0; startSkewY=el.skewY||0; }
    document.addEventListener('pointermove', onPointerMove); document.addEventListener('pointerup', onPointerUp, { once:true });
  }
  function onPointerMove(e){
    if (!interactionMode || !activeElementId) return; e.preventDefault();
    const activeBox=document.querySelector('.design-box.active'); if(!activeBox) return;
    const dx=e.clientX-startX, dy=e.clientY-startY; const pr=previewContainer.getBoundingClientRect();
    let newL=startL, newT=startT, newW=startW, newH=startH;
    const el=elements.find(e=>e.id===activeElementId); if(!el) return;
    if (interactionMode==='skew'){
      const isN=resizeDir==='n', isS=resizeDir==='s', isE=resizeDir==='e', isW=resizeDir==='w';
      const clampDeg=v=>Math.max(-60,Math.min(60,v));
      const baseX=Math.max(40,startW), baseY=Math.max(40,startH); let sx=startSkewX, sy=startSkewY;
      if(isN||isS){ const kx=dx/baseX*55, ky=dy/baseY*15*(isN?-1:1); sx=clampDeg(startSkewX+(isN?-kx:kx)); sy=clampDeg(startSkewY+ky); }
      if(isE||isW){ const ky=dy/baseY*55, kx=dx/baseX*15*(isW?-1:1); sy=clampDeg(startSkewY+(isE?ky:-ky)); sx=clampDeg(startSkewX+kx); }
      el.skewX=sx; el.skewY=sy; const t=activeBox.querySelector('.transform-target'); if(t)t.style.transform=`skew(${sx}deg,${sy}deg)`;
      if (el.type==='text') fitAsync(activeBox.querySelector('.preview-text'),activeBox.querySelector('.design-preview')); return;
    }
    if(interactionMode==='drag'){ newL=startL+dx; newT=startT+dy; }
    if(interactionMode==='resize'&&resizeDir){
      const ar=el.aspectRatio, isCorner=resizeDir.length===2;
      if (isCorner&&isShiftPressed){
        const chX=(resizeDir.includes('w')?-dx:dx), chY=(resizeDir.includes('n')?-dy:dy);
        if(Math.abs(chX)>Math.abs(chY)){ newW=startW+chX; newH=newW/ar; } else{ newH=startH+chY; newW=newH*ar; }
        if(resizeDir.includes('w'))newL=startL+(startW-newW); if(resizeDir.includes('n'))newT=startT+(startH-newH);
      } else {
        if(resizeDir.includes('e'))newW=startW+dx; if(resizeDir.includes('s'))newH=startH+dy;
        if(resizeDir.includes('w')){newW=startW-dx; newL=startL+dx;} if(resizeDir.includes('n')){newH=startH-dy; newT=startT+dy;}
      }
      const minSize=30; if(newW<minSize){if(resizeDir.includes('w'))newL=startL+startW-minSize; newW=minSize;} if(newH<minSize){if(resizeDir.includes('n'))newT=startT+startH-minSize; newH=minSize;}
      if(isCorner&&isShiftPressed&& (newW<minSize||newH<minSize)){ if(newW<newH*ar){newW=minSize;newH=newW/ar;}else{newH=minSize;newW=newH*ar;} if(resizeDir.includes('w'))newL=startL+(startW-newW); if(resizeDir.includes('n'))newT=startT+(startH-newH); }
    }
    newL=clamp(newL,0,pr.width-newW); newT=clamp(newT,0,pr.height-newH);
    activeBox.style.left=`${newL}px`; activeBox.style.top=`${newT}px`; activeBox.style.width=`${newW}px`; activeBox.style.height=`${newH}px`;
    Object.assign(el,{x:newL,y:newT,w:newW,h:newH});
    if(el.type==='text'){ const tg=document.querySelector(`.text-controls-group[data-id="${activeElementId}"]`); if(tg){tg.querySelector('[data-dimension="width"]').textContent=`${Math.round(newW)} px`; tg.querySelector('[data-dimension="height"]').textContent=`${Math.round(newH)} px`;} fitAsync(activeBox.querySelector('.preview-text'),activeBox.querySelector('.design-preview')); }
    else if (el.type==='image'){ const ig=document.querySelector(`.image-controls-group[data-id="${activeElementId}"]`); if(ig){ig.querySelector('[data-dimension="width"]').textContent=`${Math.round(newW)} px`; ig.querySelector('[data-dimension="height"]').textContent=`${Math.round(newH)} px`;} }
    updateBudgetDimensions(el);
  }
  function onPointerUp(){ interactionMode=null; document.removeEventListener('pointermove', onPointerMove); }
  document.addEventListener('keydown',(e)=>{if(e.key==='Shift')isShiftPressed=true;}); document.addEventListener('keyup',(e)=>{if(e.key==='Shift')isShiftPressed=false;});

  // === FORM SUBMISSION & FILE HANDLING (CORRECTED) ===
  function syncAttachments() {
    // This function now only updates the UI preview for directly attached files
    adjuntoPreview.innerHTML = '';
    directlyAttachedFiles.forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const wrap = document.createElement('div');
        wrap.className = 'relative inline-block';
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'w-24 h-24 object-cover rounded-md border border-gray-600';
        img.alt = file.name;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = '&times;';
        btn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-lg hover:bg-red-600 cursor-pointer';
        btn.title = 'Eliminar imagen';
        btn.addEventListener('click', () => {
          directlyAttachedFiles.splice(index, 1);
          syncAttachments();
        });
        wrap.appendChild(img);
        wrap.appendChild(btn);
        adjuntoPreview.appendChild(wrap);
      };
      reader.readAsDataURL(file);
    });
    adjuntoNombre.textContent = directlyAttachedFiles.length > 0 ? `${directlyAttachedFiles.length} archivo(s) seleccionado(s).` : '';
  }

  function handleFileChange(e) {
    const newFiles = Array.from(e.target.files);
    // Se ha eliminado la restricción de subida de archivos.
    directlyAttachedFiles.push(...newFiles);
    syncAttachments();
    e.target.value = ''; // Limpia el input
  }

  function handleFormSubmit(event) {
    event.preventDefault(); 

    const submitButton = pedidoForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="ri-loader-4-line animate-spin mr-2"></i> Enviando...`;

    hiddenInputsContainer.innerHTML = ''; // Clear previous hidden inputs

    function createHiddenInput(name, value) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        hiddenInputsContainer.appendChild(input);
    }

    const sw = document.querySelector('.color-swatch.selected');
    createHiddenInput('Color_Producto', sw ? sw.dataset.label : 'No seleccionado');
    createHiddenInput('PRESUPUESTO_TOTAL', res.textContent);
    if (!descMsg.classList.contains('hidden')) {
        createHiddenInput('Descuento_Aplicado', descMsg.textContent);
    }

    createHiddenInput('---_Detalles_del_Diseño', '---');

    elements.forEach((el) => {
        const i = elements.filter(e => e.type === el.type).indexOf(el) + 1;
        const budgetItem = document.querySelector(`.presupuesto-item[data-id="${el.id}"]`);
        const ancho = budgetItem.querySelector('.presupuesto-ancho').value || 'N/A';
        const alto = budgetItem.querySelector('.presupuesto-alto').value || 'N/A';
        const cantidad = budgetItem.querySelector('.presupuesto-cantidad').value || 'N/A';
        const prefix = el.type === 'text' ? `Texto_${i}` : `Imagen_${i}`;

        if (el.type === 'text') {
            createHiddenInput(`${prefix}_Contenido`, el.text);
            createHiddenInput(`${prefix}_Tipografia`, el.fontName);
            createHiddenInput(`${prefix}_Color`, el.color);
        } else { // image
            const uniqueFileName = `diseno-imagen-${el.id}-${el.fileName}`;
            createHiddenInput(`${prefix}_Archivo`, `(Ver adjunto: ${uniqueFileName})`);
        }
        createHiddenInput(`${prefix}_Cantidad`, cantidad);
        createHiddenInput(`${prefix}_Dimensiones_cm`, `${ancho} x ${alto}`);
    });
    
    const allFiles = [...directlyAttachedFiles];
    const designerImages = elements.filter(el => el.type === 'image' && el.file);

    designerImages.forEach(el => {
        const uniqueFileName = `diseno-imagen-${el.id}-${el.fileName}`;
        const renamedFile = new File([el.file], uniqueFileName, { type: el.file.type });
        allFiles.push(renamedFile);
    });

    if (allFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        allFiles.forEach(file => dataTransfer.items.add(file));
        adjuntoInput.files = dataTransfer.files;
    } else {
        adjuntoInput.files = new DataTransfer().files;
    }

    pedidoForm.submit();
  }

  function handleImageChange(e, id){
    const file=e.target.files?.[0]; if(!file || !file.type.startsWith('image/')) return;
    const el=elements.find(e=>e.id===id); if(!el || el.type!=='image') return;
    const img=new Image(); img.src=URL.createObjectURL(file);
    img.onload=()=>{ el.src=img.src; el.fileName=file.name; el.aspectRatio=img.width/img.height; el.file = file;
      document.querySelector(`.image-controls-group[data-id="${id}"] .truncate`).textContent=file.name;
      updatePreview(id);
    };
  }
  
  function setupInitialState(){ updateMockup(); toggleSizeSelector(productHiddenInput.value); }

  // === EVENTOS ===
  addTextBtn.addEventListener('click', addNewText);
  addImageBtn.addEventListener('click', ()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(e)=>{ const file=e.target.files?.[0]; if(file&&file.type.startsWith('image/'))addNewImage(file,file.name);}; input.click(); });
  previewContainer.addEventListener('pointerdown', onPointerDown);
  adjuntoInput.addEventListener('change', handleFileChange);
  pedidoForm.addEventListener('submit', handleFormSubmit);
  colorSwatches.forEach(s=>{ s.addEventListener('click',()=>{ colorSwatches.forEach(x=>x.classList.remove('selected')); s.classList.add('selected'); updateMockup(); }); });
  toggleText.addEventListener('change',()=>{ const show=toggleText.checked; textControlsContainer.classList.toggle('hidden',!show); addTextBtn.classList.toggle('hidden',!show); if(show&&elements.filter(e=>e.type==='text').length===0)addNewText();});
  toggleImage.addEventListener('change',()=>{ const show=toggleImage.checked; imageControlsContainer.classList.toggle('hidden',!show); addImageBtn.classList.toggle('hidden',!show); if(show&&elements.filter(e=>e.type==='image').length===0)addImageBtn.click();});
  textControlsContainer.addEventListener('input',(e)=>{ const g=e.target.closest('.text-controls-group'); if(!g)return; const id=parseInt(g.dataset.id), el=elements.find(e=>e.id===id); if(!el)return; if(e.target.matches('.text-input'))el.text=e.target.value; updatePreview(id);});
  document.body.addEventListener('click',(e)=>{
    const fb=e.target.closest('.font-selector-button'); if(fb){const dd=fb.nextElementSibling; document.querySelectorAll('.font-dropdown').forEach(d=>{if(d!==dd)d.classList.add('hidden');}); dd.classList.toggle('hidden'); return;}
    const fo=e.target.closest('.font-option'); if(fo){const c=fo.closest('.font-selector-container'), id=parseInt(c.dataset.id), el=elements.find(x=>x.id===id); if(el){el.fontName=fo.dataset.fontName; el.font=fo.dataset.fontValue; updatePreview(id); c.querySelector('.font-selector-button span').textContent=el.fontName; c.querySelector('.font-dropdown').classList.add('hidden');} return;}
    if(!e.target.closest('.font-selector-container'))document.querySelectorAll('.font-dropdown').forEach(d=>d.classList.add('hidden'));

    const cpb = e.target.closest('.color-picker-button');
    if (cpb) {
      e.stopPropagation();
      const container = cpb.parentElement;
      const id = parseInt(container.dataset.id);
      const el = elements.find(e => e.id === id);
      if (el) toggleColorPicker(container, el);
      return;
    }
    if (!e.target.closest('.custom-color-picker')) closeAllColorPickers();

    const rm=e.target.closest('.remove-element-btn'); if(rm){const id=parseInt(rm.dataset.id); if(confirm('¿Seguro que quieres eliminar este elemento?'))removeElement(id);}
    const rs=e.target.closest('.reset-element-btn'); if(rs){const id=parseInt(rs.dataset.id); resetElement(id);}
    const layer=e.target.closest('.layer-item'); if(layer&&!e.target.closest('button')){const id=parseInt(layer.dataset.id); setActiveElement(id);}
  });
  imageControlsContainer.addEventListener('change',(e)=>{ const input=e.target.closest('input[type="file"]'); if(input)handleImageChange(e, parseInt(input.closest('.image-controls-group').dataset.id)); });
  layersPanel.addEventListener('click',(e)=>{ const up=e.target.closest('.move-layer-up'), dn=e.target.closest('.move-layer-down'); if(up)moveLayer(parseInt(up.dataset.id),'up'); else if(dn)moveLayer(parseInt(dn.dataset.id),'down');});
  zoomMockupBtn.addEventListener('click',()=>{
    const oC=document.getElementById('preview-container'), oW=oC.offsetWidth, oH=oC.offsetHeight;
    const maxW=window.innerWidth*0.9, maxH=window.innerHeight*0.9, scale=Math.min(maxW/oW,maxH/oH);
    modalPreviewContent.innerHTML=''; modalPreviewContent.style.width=oW+'px'; modalPreviewContent.style.height=oH+'px';
    modalPreviewContent.style.transformOrigin='top left'; modalPreviewContent.style.transform=`scale(${scale})`;
    modalContentWrapper.style.width=(oW*scale)+'px'; modalContentWrapper.style.height=(oH*scale)+'px';
    const oS=window.getComputedStyle(oC); modalPreviewContent.style.background=oS.background; modalPreviewContent.style.borderRadius=oS.borderRadius;
    const mI=document.getElementById('mockup-img'), cM=mI.cloneNode(true); cM.id=''; modalPreviewContent.appendChild(cM);
    oC.querySelectorAll('.design-box').forEach(b=>{ const cB=b.cloneNode(true); cB.classList.remove('active','cursor-move'); cB.querySelectorAll('.resize-handle').forEach(h=>h.remove()); modalPreviewContent.appendChild(cB);});
    imageModal.classList.remove('hidden');
  });
  closeModalBtn.addEventListener('click',()=>imageModal.classList.add('hidden'));
  imageModal.addEventListener('click',(e)=>{ if(e.target===imageModal)imageModal.classList.add('hidden'); });

  setupInitialState();
});