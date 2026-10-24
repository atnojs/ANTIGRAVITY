/**
 * AI Tools — edición de imágenes con OpenAI y Gemini (Tier 1)
 * Injects AI functionality into the Ajustes Imagen app via DOM.
 * No JSX, no Babel, no dependencies on React internals.
 * v1.0 — 2026-06-07
 */
(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  const AI_TOOLS = [
    {
      id: 'removeObject', label: 'Eliminar Objeto', icon: 'eraser',
      desc: 'Describe qué objeto o persona quieres eliminar y la IA lo hará rellenando el fondo.',
      needsInput: true, inputType: 'text',
      placeholder: 'ej: la persona de la derecha, el coche rojo del fondo...',
      promptTemplate: "Remove the following from this image: {input}. Fill the area naturally and seamlessly with the surrounding background. Match lighting, texture, and perspective perfectly. Make it look like it was never there."
    },
    {
      id: 'backgroundSwap', label: 'Cambiar Fondo', icon: 'image',
      desc: 'Describe el nuevo fondo y la IA reemplazará el actual manteniendo el sujeto.',
      needsInput: true, inputType: 'text',
      placeholder: 'ej: playa al atardecer, ciudad futurista, bosque nevado...',
      promptTemplate: "Replace the entire background of this image with: {input}. Keep the main subject(s) perfectly intact with clean edges. Match the lighting, shadows, and color balance to the new background so it looks 100% realistic."
    },
    {
      id: 'styleTransfer', label: 'Estilo Artístico', icon: 'palette',
      desc: 'Transforma la imagen al estilo artístico que elijas.',
      needsInput: true, inputType: 'select',
      options: [
        'Óleo / Pintura al óleo impresionista','Acuarela suave y luminosa','Cómic / Manga japonés',
        'Van Gogh (pinceladas gruesas)','Pixel Art retro 16-bit','Boceto a lápiz / Carboncillo',
        'Cyberpunk neón futurista','Arte Digital 3D (tipo Pixar)','Arte Pop estilo Warhol','Acrílico moderno'
      ],
      promptTemplate: "Transform this entire image into the artistic style of: {input}. Preserve the original composition, subjects, and layout, but completely re-render all elements with the characteristic techniques, textures, and color palette of that style. Make it look like an authentic piece in that style."
    },
    {
      id: 'enhanceFace', label: 'Mejorar Retrato', icon: 'user',
      desc: 'Realza rostros automáticamente: suaviza piel, ilumina ojos, mejora detalles.',
      needsInput: false,
      prompt: "Enhance this portrait naturally and subtly. Smooth skin slightly (keep texture and pores visible), brighten eyes, enhance facial features gently. Do NOT make it look artificial or over-processed. Keep the person recognizable. Maintain original lighting and tones."
    },
    {
      id: 'skyReplace', label: 'Cambiar Cielo', icon: 'cloud-sun',
      desc: 'Reemplaza el cielo automáticamente según lo que describas.',
      needsInput: true, inputType: 'select',
      options: [
        'Atardecer dramático con nubes naranjas y rosas','Noche estrellada con Vía Láctea',
        'Cielo azul intenso con nubes blancas','Amanecer dorado con niebla suave',
        'Tormenta eléctrica dramática','Cielo del norte (aurora boreal)'
      ],
      promptTemplate: "Replace ONLY the sky in this image with: {input}. Keep EVERYTHING else (buildings, people, ground, objects) completely unchanged and perfectly intact. Match the lighting on the non-sky elements to the new sky's color and brightness. Make edges between sky and ground seamless and natural."
    },
    {
      id: 'colorGrade', label: 'Color Cinema', icon: 'film',
      desc: 'Aplica grading cinematográfico profesional a tu imagen.',
      needsInput: true, inputType: 'select',
      options: [
        'Cine Hollywood (tonos cálidos, sombras azules)','Look nórdico (frío, desaturado, minimalista)',
        'Ciencia ficción (verde/azul neón)','Western (tonos tierra, cálido, polvoriento)',
        'Blanco y negro con alto contraste','Pastel / Ensueño (suave, rosado, etéreo)',
        'Documental naturalista','Horror gótico (sombras profundas, frío)'
      ],
      promptTemplate: "Apply professional cinematic color grading to this image in the style of: {input}. Adjust the color palette, shadows, midtones, and highlights to match that cinematic look. Keep all details and subjects perfectly preserved. Make it look like a frame from a high-budget film."
    },
    {
      id: 'addObject', label: 'Añadir Objeto', icon: 'plus-circle',
      desc: 'Describe qué objeto quieres añadir y dónde. La IA lo integrará.',
      needsInput: true, inputType: 'text',
      placeholder: 'ej: un gato negro durmiendo en el sofá de la derecha...',
      promptTemplate: "Add the following to this image: {input}. Integrate it seamlessly with matching perspective, scale, lighting, and shadows. Make it look like it was always there. Do NOT modify anything else in the image."
    },
    {
      id: 'upscale', label: 'Mejorar Calidad', icon: 'zap',
      desc: 'Aumenta resolución y nitidez con IA. Mejora detalles y texturas.',
      needsInput: false,
      prompt: "Upscale and enhance this image to higher quality. Increase sharpness and clarity, reduce noise and artifacts, enhance fine details and textures. Make it look crisp and high-resolution while preserving all content exactly."
    },
    {
      id: 'weather', label: 'Efecto Climático', icon: 'cloud-rain',
      desc: 'Añade nieve, lluvia, niebla o rayos de sol a tu imagen.',
      needsInput: true, inputType: 'select',
      options: [
        'Lluvia suave con charcos reflectantes','Nieve cayendo con paisaje invernal',
        'Niebla densa y misteriosa','Rayos de sol dorados filtrándose',
        'Tormenta de arena en desierto','Hojas de otoño cayendo'
      ],
      promptTemplate: "Add this weather/atmospheric effect to the image: {input}. Integrate it naturally with the existing scene — match the lighting, mood, and environment. Make it look real and atmospheric, not like a cheap filter. Preserve the main subject clearly."
    },
    {
      id: 'relight', label: 'Cambiar Luz', icon: 'sun',
      desc: 'Cambia la iluminación de la escena: atardecer, noche, estudio...',
      needsInput: true, inputType: 'select',
      options: [
        'Luz dorada de atardecer (golden hour)','Noche con luz de luna plateada',
        'Luz de estudio profesional (producto)','Neón urbano nocturno',
        'Amanecer brumoso y suave','Luz de vela cálida e íntima'
      ],
      promptTemplate: "Completely relight this image as if it were lit by: {input}. Change all lighting, shadows, highlights, and color temperature to match. Preserve all objects and subjects. Make the lighting transformation look natural and cinematic."
    }
  ];

  // ============================================================
  // SELECTOR DE MODELOS (canónico hoola, adaptado al panel estrecho)
  // ============================================================
  // Catálogo, orden e identificadores canónicos de apps/dibujo_lineas_copia.
  // En este panel (barra lateral de 320 px) cada proveedor ocupa UNA FILA y
  // sus botones fluyen en filas horizontales (flex-wrap), nunca en columnas.
  var MODEL_PROVIDERS = [
    {
      title: 'OPENAI 2.5', hint: 'De menor a mayor calidad', models: [
        { id: 'openai-medium', model: 'openai-medium', label: 'MEDIUM', tip: 'Fondo transparente, Muy rápido' },
        { id: 'openai-high', model: 'openai-high', label: 'HIGH', tip: 'Fondo transparente' },
        { id: 'openai-maxflare', model: 'openai-max-flare', label: 'MAX FLARE', tip: 'Más barato que Sunburst' },
        { id: 'openai-xhigh', model: 'openai-xhigh', label: 'XHIGH', tip: 'Precisión en edición, Consistencia (Rostros y Cara).' },
        { id: 'openai-maxsunburst', model: 'openai-max-sunburst', label: 'MAX SUNBURST', tip: 'Precisión en edición, Consistencia (Rostros y Cara).' }
      ]
    },
    {
      title: 'GEMINI', models: [
        { id: 'gemini-2', model: 'gemini-2', label: 'GEMINI 2', tip: 'Gemini 2 (gemini-2.5-flash-image) · el más ligero y económico del grupo' },
        { id: 'gemini-flash', model: 'gemini-flash', label: '3.1 FLASH', tip: 'Texto en imágenes, Rápido.' },
        { id: 'gemini-pro', model: 'gemini-pro', label: '3 PRO', tip: 'Máxima calidad, Perfecto para texto' }
      ]
    },
    {
      title: 'QWEN', models: [
        { id: 'qwen-pro', model: 'qwen-pro', label: 'QWEN 3 PRO', tip: 'Texto nítido 10px y 12 idiomas, Layouts densos, El más barato, Seed reproducible' }
      ]
    },
    {
      title: 'IMAGE 2', models: [
        { id: 'openai-image-2-low', model: 'openai-image-2-low', label: 'LOW', tip: 'OpenAI image 2 (gpt-image-2) en calidad baja. La opción más rápida y económica; menos detalle.' },
        { id: 'openai-image-2', model: 'openai-image-2', label: 'MEDIUM', tip: 'OpenAI image 2 (gpt-image-2) en calidad media. Edita la referencia manteniendo su identidad.' },
        { id: 'openai-image-2-high', model: 'openai-image-2-high', label: 'HIGH', tip: 'OpenAI image 2 (gpt-image-2) en calidad alta. Más detalle y coste superior a MEDIUM.' }
      ]
    }
  ];

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // HTML del selector: una fila por proveedor; dentro, los botones en filas.
  function buildModelSelectorHTML() {
    var filas = MODEL_PROVIDERS.map(function (provider) {
      var botones = provider.models.map(function (m) {
        var activo = m.model === 'openai-image-2-low';
        return '<button id="ai-quality-' + m.id + '" class="ai-quality-btn model-toggle' + (activo ? ' active' : '') + '"' +
          ' data-model="' + m.model + '" type="button" aria-pressed="' + (activo ? 'true' : 'false') + '"' +
          ' aria-describedby="model-tooltip" data-tooltip="' + escapeAttr(m.tip) + '">' + m.label + '</button>';
      }).join('');
      return '<div class="model-provider-row">' +
        '<div class="model-provider-head">' +
        '<span class="model-provider-title">' + provider.title + '</span>' +
        (provider.hint ? '<span class="model-quality-hint">' + provider.hint + '</span>' : '') +
        '</div>' +
        '<div class="model-toggle-group">' + botones + '</div>' +
        '</div>';
    }).join('');
    return '<div class="model-selector" style="margin-bottom:0.5rem;">' +
      '<span class="model-selector-label">Modelo IA</span>' +
      '<div class="model-provider-layout" role="group" aria-label="Seleccionar modelo">' + filas + '</div>' +
      '</div>';
  }

  // ============================================================
  // STATE
  // ============================================================
  let currentTool = null;
  let isProcessing = false;
  let selectedModel = 'openai-image-2-low';
  let selectedAR = '1:1';      // aspect ratio elegido: '1:1','16:9','9:16','4:3','3:4'
  let selectedRes = 1024;      // resolución (lado mayor px): 512, 1024, 2048, 4096

  // Relaciones de aspecto disponibles (w:h)
  const AR_RATIOS = {
    '1:1':  [1, 1],
    '16:9': [16, 9],
    '9:16': [9, 16],
    '4:3':  [4, 3],
    '3:4':  [3, 4]
  };

  // Calcula {width,height} objetivo (lado mayor = selectedRes) según AR seleccionado,
  // redondeando a múltiplos de 32 para mantener dimensiones compatibles.
  function computeTargetDims() {
    var r = AR_RATIOS[selectedAR] || [1, 1];
    var rw = r[0], rh = r[1];
    var longest = selectedRes;
    var w, h;
    if (rw >= rh) { w = longest; h = Math.round(longest * rh / rw); }
    else { h = longest; w = Math.round(longest * rw / rh); }
    w = Math.max(256, Math.round(w / 32) * 32);
    h = Math.max(256, Math.round(h / 32) * 32);
    return { width: w, height: h };
  }

  // Aplica el formato (AR) + resolución elegidos de forma LOCAL (sin IA, gratis):
  // recorta la imagen actual al centro según el AR y la redimensiona a la resolución.
  // Devuelve una data URL, o null si no hay imagen.
  function applyLocalDimsToImage() {
    return new Promise(function (resolve) {
      var src = getOriginalImage();
      if (!src) { resolve(null); return; }
      var dims = computeTargetDims();
      var targetW = dims.width, targetH = dims.height;
      var img = new Image();
      img.onload = function () {
        var sw = img.width, sh = img.height;
        var targetRatio = targetW / targetH;
        var srcRatio = sw / sh;
        // Center-crop de la imagen fuente para que cuadre con el AR objetivo
        var cropW, cropH, cropX, cropY;
        if (srcRatio > targetRatio) {
          // fuente más ancha: recortar los lados
          cropH = sh;
          cropW = Math.round(sh * targetRatio);
          cropX = Math.round((sw - cropW) / 2);
          cropY = 0;
        } else {
          // fuente más alta: recortar arriba/abajo
          cropW = sw;
          cropH = Math.round(sw / targetRatio);
          cropX = 0;
          cropY = Math.round((sh - cropH) / 2);
        }
        var canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function getOriginalImage() {
    // Try to get the image from the canvas
    const canvas = document.querySelector('canvas');
    if (canvas && canvas.width > 0) {
      return canvas.toDataURL('image/jpeg', 0.92);
    }
    // Try to get from an img element in the main area
    const img = document.querySelector('main img[src^="data:"]');
    if (img) return img.src;
    return null;
  }

  function showStatus(msg, duration = 3000) {
    // Use the app's status area if visible, or create a toast
    const statusDiv = document.querySelector('.text-\\[10px\\].font-mono');
    if (statusDiv) {
      statusDiv.textContent = msg;
      if (duration) setTimeout(() => { statusDiv.textContent = ''; }, duration);
    }
  }

  // Reescala una data URL a las dimensiones objetivo usando canvas (upscale client-side).
  // Se usa cuando el proveedor devuelve una imagen menor que la resolución solicitada.
  function upscaleDataUrl(dataUrl, targetW, targetH) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        if (img.width >= targetW && img.height >= targetH) { resolve(dataUrl); return; }
        var canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  async function callImageModel(imageBase64, prompt) {
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1] : imageBase64;
    const mimeType = imageBase64.startsWith('data:')
      ? imageBase64.split(';')[0].replace('data:', '') : 'image/jpeg';

    const dims = computeTargetDims(); // {width, height} finales pedidos por el usuario

    const payload = {
      image: base64Data,
      mimeType: mimeType,
      model: selectedModel,
      prompt: prompt,
      width: dims.width,
      height: dims.height
    };

    // Para qwen-pro (más lento que el timeout de nginx, ~55s) se espera
    // activamente: el proxy guarda el resultado en caché y responde
    // 'processing' mientras el worker termina de generarlo (patrón canónico).
    const slowModel = selectedModel === 'qwen-pro';
    const maxAttempts = slowModel ? 36 : 1;
    let lastError = 'Sin respuesta del modelo.';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch('proxy.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 202) {
          lastError = 'Generando...';
        } else if (!response.ok) {
          let errMsg = 'Error HTTP ' + response.status;
          try {
            const errData = await response.json();
            errMsg = (errData.error && errData.error.message) || errData.error || errMsg;
          } catch (e) { /* ignore */ }
          lastError = errMsg;
          if (!slowModel || response.status < 500) throw new Error(errMsg);
        } else {
          const result = await response.json();
          if (result.status === 'processing') {
            lastError = 'Generando...';
          } else if (result.error) {
            throw new Error((result.error && result.error.message) || result.error);
          } else if (result.image) {
            var dataUrl = 'data:' + (result.mimeType || 'image/png') + ';base64,' + result.image;
            // Si el proveedor generó a menor resolución que la pedida,
            // escalamos client-side a las dimensiones finales solicitadas.
            return await upscaleDataUrl(dataUrl, dims.width, dims.height);
          } else {
            lastError = 'El proveedor no devolvió imagen.';
            if (!slowModel) throw new Error(lastError);
          }
        }
      } catch (e) {
        if (!slowModel) throw e;
        lastError = (e && e.message) || lastError;
      }
      if (attempt < maxAttempts - 1) await new Promise(function (r) { setTimeout(r, 5000); });
    }
    throw new Error(lastError);
  }

  function updateAppImage(dataUrl, toolLabel) {
    // Try to dispatch an event that the React app listens to, or directly modify the DOM
    // Strategy: find the canvas and draw the new image onto it
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Try to trigger React re-render by simulating events
      // If there's an img tag, update its src too
      const displayedImg = document.querySelector('main img[src^="data:"]');
      if (displayedImg) {
        displayedImg.src = dataUrl;
      }

      // Actualizar únicamente la imagen de trabajo. La app conserva la base
      // subida y solo guarda el resultado cuando el usuario pulsa el botón.
      window.dispatchEvent(new CustomEvent('ai-tool-update', {
        detail: { imageUrl: dataUrl, tool: toolLabel || 'IA de imagen', saveToHistory: false }
      }));
    };
    img.src = dataUrl;
    return true;
  }

  // ============================================================
  // MODAL
  // ============================================================
  function createModal(tool) {
    removeModal(); // Remove any existing modal

    const overlay = document.createElement('div');
    overlay.id = 'ai-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);padding:1rem;';

    const card = document.createElement('div');
    card.className = 'glass-modal';
    card.style.cssText = 'width:100%;max-width:28rem;border-radius:1rem;overflow:hidden;border:1px solid rgba(0,208,208,0.3);';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:1rem 1.5rem;border-bottom:1px solid rgba(51,65,85,0.5);background:linear-gradient(135deg,rgba(0,176,176,0.3),rgba(15,23,42,0.9));';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;">' +
      '<i data-lucide="' + tool.icon + '" style="width:1.25rem;height:1.25rem;color:#00D0D0;"></i>' +
      '<h2 style="font-size:1.125rem;font-weight:700;color:white;">' + tool.label + '</h2></div>' +
      '<p style="font-size:0.75rem;color:#94a3b8;margin-top:0.25rem;">' + tool.desc + '</p>';

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding:1.5rem;background:#0f172a;';

    let inputHtml = '';
    if (tool.inputType === 'select' && tool.options) {
      inputHtml = '<label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:0.5rem;">Selecciona una opción:</label>' +
        '<div style="display:flex;flex-direction:column;gap:0.375rem;max-height:15rem;overflow-y:auto;">' +
        tool.options.map(function (opt, i) {
          return '<button class="ai-option-btn' + (i === 0 ? ' is-selected' : '') + '" data-value="' + opt.replace(/"/g, '&quot;') + '" style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;border-radius:0.5rem;border:1px solid ' + (i === 0 ? '#00D0D0' : 'rgba(0,208,208,0.5)') + ';background:' + (i === 0 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (i === 0 ? '#061018' : '#eaffff') + ';cursor:pointer;transition:all 0.15s;">' + opt + '</button>';
        }).join('') + '</div>';
    } else if (tool.inputType === 'text') {
      inputHtml = '<label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:0.5rem;">Describe lo que quieres:</label>' +
        '<textarea id="ai-input-textarea" placeholder="' + (tool.placeholder || 'Escribe aquí...') + '" style="width:100%;padding:0.625rem 0.75rem;background:#1e293b;border:1px solid #475569;border-radius:0.5rem;color:white;font-size:0.875rem;resize:none;outline:none;box-sizing:border-box;" rows="3"></textarea>';
    }
    body.innerHTML = inputHtml;

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:1rem 1.5rem;border-top:1px solid rgba(51,65,85,0.5);display:flex;justify-content:space-between;align-items:center;background:#0f172a;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = 'padding:0.5rem 1rem;border-radius:0.5rem;background:#1e293b;color:#eaffff;font-size:0.875rem;border:none;cursor:pointer;';
    cancelBtn.onclick = removeModal;

    const execBtn = document.createElement('button');
    execBtn.id = 'ai-exec-btn';
    execBtn.textContent = 'Ejecutar IA';
    execBtn.style.cssText = 'padding:0.625rem 1.25rem;border-radius:0.5rem;background:#00b0b0;color:white;font-size:0.875rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:0.5rem;';
    execBtn.onclick = function () {
      if (isProcessing) return;

      let userInput = '';
      if (tool.inputType === 'select') {
        const selected = body.querySelector('.ai-option-btn.is-selected');
        if (selected) userInput = selected.getAttribute('data-value') || selected.textContent;
        if (!userInput && tool.options) userInput = tool.options[0]; // default to first
      } else {
        const textarea = document.getElementById('ai-input-textarea');
        if (textarea) userInput = textarea.value.trim();
      }

      if (!userInput && tool.needsInput) {
        showStatus('Escribe o selecciona una opción primero.', 2000);
        return;
      }

      executeTool(tool, userInput);
    };

    // Hover effect
    execBtn.onmouseenter = function () { this.style.background = '#008f8f'; };
    execBtn.onmouseleave = function () { this.style.background = '#00b0b0'; };

    footer.appendChild(cancelBtn);
    footer.appendChild(execBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Focus textarea if present
    setTimeout(function () {
      const ta = document.getElementById('ai-input-textarea');
      if (ta) ta.focus();

      // Add click handlers to option buttons
      var optionBtns = body.querySelectorAll('.ai-option-btn');
      optionBtns.forEach(function (btn) {
        btn.onclick = function () {
          optionBtns.forEach(function (b) {
            b.classList.remove('is-selected');
            b.style.background = '#1e293b';
            b.style.color = '#eaffff';
            b.style.borderColor = 'rgba(0,208,208,0.5)';
          });
          btn.classList.add('is-selected');
          btn.style.background = 'rgba(0,208,208,0.3)';
          btn.style.color = 'white';
          btn.style.borderColor = '#00D0D0';
        };
      });
    }, 100);

    // Close on overlay click (but not on card click)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) removeModal();
    });

    // Close on Escape
    var escHandler = function (e) {
      if (e.key === 'Escape') { removeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    // Initialize Lucide icons in the modal
    if (window.lucide) {
      setTimeout(function () { window.lucide.createIcons(); }, 150);
    }
  }

  function removeModal() {
    var modal = document.getElementById('ai-modal-overlay');
    if (modal) {
      modal.remove();
      currentTool = null;
    }
  }

  // ============================================================
  // EXECUTION
  // ============================================================
  async function executeTool(tool, userInput) {
    if (isProcessing) return;

    var image = getOriginalImage();
    if (!image) {
      showStatus('No se encontró una imagen para editar. Sube una imagen primero.', 3000);
      return;
    }

    isProcessing = true;
    var execBtn = document.getElementById('ai-exec-btn');
    if (execBtn) {
      execBtn.disabled = true;
      execBtn.innerHTML = '<span style="display:inline-block;width:1rem;height:1rem;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Procesando...';
    }

    // Add keyframe for spinner if not present
    if (!document.getElementById('ai-spinner-style')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'ai-spinner-style';
      styleEl.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(styleEl);
    }

    var startTime = Date.now();

    try {
      // Build prompt
      var finalPrompt = '';
      if (tool.promptTemplate) {
        finalPrompt = tool.promptTemplate.replace('{input}', userInput);
      } else if (tool.prompt) {
        finalPrompt = tool.prompt;
      }
      finalPrompt += '\n\nIMPORTANT: Preserve image quality and resolution. Make the edit look natural and seamless. Do not add watermarks or text.';

      showStatus('IA: ' + tool.label + ' — generando... (puede tardar 5-15s)', 15000);
      console.log('[AI Tool: ' + tool.label + '] Prompt:', finalPrompt.substring(0, 100) + '...');

 window.selectedAIModel = selectedModel;
 var resultUrl = await callImageModel(image, finalPrompt);

      if (resultUrl) {
        // Update the image in the app
        var updated = updateAppImage(resultUrl, tool.label);

        var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        showStatus('✅ ' + tool.label + ' completado en ' + elapsed + 's', 4000);
        removeModal();
      }
    } catch (err) {
      console.error('[AI Tool Error: ' + tool.label + ']', err);
      showStatus('❌ Error: ' + err.message, 5000);
    } finally {
      isProcessing = false;
      if (execBtn) {
        execBtn.disabled = false;
        execBtn.textContent = 'Ejecutar IA';
      }
    }
  }

  // ============================================================
  // UI INJECTION — Add AI tools section to sidebar
  // ============================================================
  function injectAIToolsUI() {
    // Find the left sidebar
    var sidebar = document.querySelector('aside.w-80');
    if (!sidebar) {
      // Retry after a short delay
      setTimeout(injectAIToolsUI, 500);
      return;
    }

    // Find the scrollable div inside the sidebar
    var scrollDiv = sidebar.querySelector('.overflow-y-auto, .custom-scrollbar');
    if (!scrollDiv) {
      scrollDiv = sidebar.querySelector('div');
    }
    if (!scrollDiv) return;

    // Check if already injected
    if (document.getElementById('ai-tools-section')) return;

    // Create the AI tools section
    var section = document.createElement('div');
    section.id = 'ai-tools-section';
    section.style.cssText = 'margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(0,208,208,0.3);';

    section.innerHTML =
      '<h4 style="font-size:11px;font-weight:600;color:#00D0D0;text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:0.375rem;margin-bottom:0.5rem;">' +
'<i data-lucide="wand-2" style="width:0.75rem;height:0.75rem;"></i> IA 10 Herramientas</h4>' +
      buildModelSelectorHTML() +
      '<div style="margin-bottom:0.4rem;">' +
        '<span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:0.25rem;">Formato:</span>' +
        '<div style="display:flex;gap:0.3rem;">' +
          ['1:1', '16:9', '9:16', '4:3', '3:4'].map(function (ar, i) {
            return '<button class="ai-ar-btn' + (i === 0 ? ' is-selected' : '') + '" data-ar="' + ar + '" style="flex:1;padding:0.3rem 0.15rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid ' + (i === 0 ? '#00D0D0' : 'rgba(0,208,208,0.5)') + ';background:' + (i === 0 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (i === 0 ? '#061018' : '#eaffff') + ';cursor:pointer;transition:all 0.15s;">' + ar + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:0.5rem;">' +
        '<span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:0.25rem;">Resolución:</span>' +
        '<div style="display:flex;gap:0.3rem;">' +
          [512, 1024, 2048, 4096].map(function (res, i) {
            return '<button class="ai-res-btn' + (res === 1024 ? ' is-selected' : '') + '" data-res="' + res + '" style="flex:1;padding:0.3rem 0.15rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid ' + (res === 1024 ? '#00D0D0' : 'rgba(0,208,208,0.5)') + ';background:' + (res === 1024 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (res === 1024 ? '#061018' : '#eaffff') + ';cursor:pointer;transition:all 0.15s;">' + res + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<button id="ai-apply-dims" title="Aplica el formato y la resolución elegidos recortando/redimensionando la imagen actual, SIN usar IA (gratis)" style="width:100%;margin-bottom:0.6rem;padding:0.4rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid #26C626;background:rgba(38,198,38,0.18);color:#eaffff;cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.04em;">Aplicar formato/resolución (sin IA)</button>' +
      // Tono de color: 100% local (canvas), sin IA y sin coste.
      '<div class="ai-tone-block">' +
        '<span class="ai-tone-label">Tono de color <span class="ai-tone-note">sin IA</span></span>' +
        '<div class="ai-tone-row" role="group" aria-label="Tono de color de la imagen">' +
          '<button id="ai-temp-cold" class="ai-tone-btn ai-tone-cold" type="button" data-tone="cold" aria-pressed="false" title="Pasa la imagen actual a colores fríos (azules)">' +
            '<i data-lucide="snowflake" aria-hidden="true"></i><span>Colores fríos</span>' +
          '</button>' +
          '<button id="ai-temp-warm" class="ai-tone-btn ai-tone-warm" type="button" data-tone="warm" aria-pressed="false" title="Pasa la imagen actual a colores cálidos (naranjas)">' +
            '<i data-lucide="flame" aria-hidden="true"></i><span>Colores cálidos</span>' +
          '</button>' +
        '</div>' +
        '<span id="ai-tone-status" class="ai-tone-status" role="status" aria-live="polite"></span>' +
      '</div>' +
      '<div id="ai-tools-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.375rem;"></div>';

    // Insertar SIEMPRE al INICIO del contenedor scrollable (primer hijo)
    scrollDiv.insertBefore(section, scrollDiv.firstChild);

    // Helper genérico: toggle exclusivo de un grupo de botones selector (modelo, AR, res)
    function wireSelectorGroup(selector, onPick) {
      var btns = section.querySelectorAll(selector);
      btns.forEach(function (b) {
        b.onclick = function () {
          btns.forEach(function (x) {
            x.classList.remove('is-selected');
            x.style.background = '#1e293b';
            x.style.color = '#eaffff';
            x.style.borderColor = 'rgba(0,208,208,0.5)';
          });
          b.classList.add('is-selected');
          b.style.background = 'rgba(0,208,208,0.3)';
          b.style.color = 'white';
          b.style.borderColor = '#00D0D0';
          onPick(b);
        };
      });
    }

    wireSelectorGroup('.ai-ar-btn', function (b) { selectedAR = b.getAttribute('data-ar') || '1:1'; });
    wireSelectorGroup('.ai-res-btn', function (b) { selectedRes = parseInt(b.getAttribute('data-res'), 10) || 1024; });

    // Botón "Aplicar formato/resolución (sin IA)": recorta+redimensiona la imagen
    // actual localmente (canvas, gratis) y la mete en la app como cambio real.
    var applyBtn = section.querySelector('#ai-apply-dims');
    if (applyBtn) {
      applyBtn.onclick = async function () {
        if (isProcessing) return;
        var src = getOriginalImage();
        if (!src) { showStatus('Primero sube una imagen.', 2500); return; }
        isProcessing = true;
        var prevText = applyBtn.textContent;
        applyBtn.textContent = 'Aplicando…';
        applyBtn.disabled = true;
        try {
          var dims = computeTargetDims();
          var out = await applyLocalDimsToImage();
          if (out) {
            updateAppImage(out, 'Formato ' + selectedAR + ' · ' + dims.width + '×' + dims.height + 'px');
            showStatus('✅ Formato ' + selectedAR + ' aplicado (' + dims.width + '×' + dims.height + 'px)', 4000);
          } else {
            showStatus('No se pudo aplicar el formato.', 3000);
          }
        } catch (e) {
          showStatus('Error al aplicar formato: ' + e.message, 4000);
        } finally {
          isProcessing = false;
          applyBtn.textContent = prevText;
          applyBtn.disabled = false;
        }
      };
    }

    // Selector de modelo: un único estado activo entre los cuatro modelos canónicos.
    var qualityBtns = section.querySelectorAll('.ai-quality-btn');
    qualityBtns.forEach(function (qb) {
      qb.onclick = function () {
        selectedModel = qb.getAttribute('data-model') || 'openai-image-2-low';
        window.selectedAIModel = selectedModel;
        qualityBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        qb.classList.add('active');
        qb.setAttribute('aria-pressed', 'true');
      };
      qb.setAttribute('aria-pressed', qb.classList.contains('active') ? 'true' : 'false');
    });
    window.selectedAIModel = selectedModel;

    // ============================================================
    // TONO DE COLOR (frío / cálido) — 100 % local con canvas, sin IA
    // ============================================================
    // Aplica un grading de balance de blancos + split toning a la imagen de
    // trabajo. Es instantáneo y gratis. El botón activo se puede volver a
    // pulsar para recuperar el tono original (no se acumula el efecto).
    var TONE_GAINS = {
      warm: [1.10, 1.015, 0.88],
      cold: [0.90, 0.985, 1.13]
    };
    var TONE_LABELS = { warm: 'Colores cálidos', cold: 'Colores fríos' };
    var toneState = null;   // { mode, sig, baseUrl, resultUrl }
    var toneBusy = false;
    var toneBtns = section.querySelectorAll('.ai-tone-btn');

    function toneStatus(msg) {
      var el = section.querySelector('#ai-tone-status');
      if (el) el.textContent = msg || '';
    }

    function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

    // Firma visual: muestreo 1:1 de píxeles (sin reescalado, que introduciría
    // diferencias de remuestreo entre una fuente <canvas> y una <img>).
    // Sirve para saber si la imagen de trabajo sigue siendo la que dejó el
    // tono (y no otra herramienta, un recorte o una subida posterior).
    function sampleHash(data, w, h) {
      var hsh = 2166136261;
      var stepX = Math.max(1, Math.floor(w / 256));
      var stepY = Math.max(1, Math.floor(h / 256));
      for (var y = 0; y < h; y += stepY) {
        for (var x = 0; x < w; x += stepX) {
          var i = (y * w + x) * 4;
          hsh ^= data[i]; hsh = Math.imul(hsh, 16777619);
          hsh ^= data[i + 1]; hsh = Math.imul(hsh, 16777619);
          hsh ^= data[i + 2]; hsh = Math.imul(hsh, 16777619);
        }
      }
      return (hsh >>> 0).toString(16) + ':' + w + 'x' + h;
    }

    function canvasImageData() {
      var canvas = document.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return null;
      try {
        var cx = canvas.getContext('2d', { willReadFrequently: true });
        return cx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) { return null; }
    }

    // El lienzo existe siempre (300x150 vacío al arrancar). Se considera que
    // hay imagen cuando una parte apreciable de los píxeles es opaca.
    function canvasHasImage(imgData) {
      var d = imgData.data;
      var paso = Math.max(4, Math.floor(d.length / 4096)) * 4;
      var total = 0, opacos = 0;
      for (var i = 3; i < d.length; i += paso) {
        total++;
        if (d[i] > 8) opacos++;
      }
      return total > 0 && (opacos / total) > 0.01;
    }

    // Balance de blancos (ganancias normalizadas para conservar la luminancia)
    // + split toning suave + micro ajuste de saturación.
    function gradeToneData(imgData, mode) {
      var gains = TONE_GAINS[mode] || TONE_GAINS.cold;
      var lumGain = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
      var gr = gains[0] / lumGain;
      var gg = gains[1] / lumGain;
      var gb = gains[2] / lumGain;
      var warm = mode === 'warm';
      var hiAmt = 8, shAmt = 6, sat = warm ? 1.03 : 0.98;
      var d = imgData.data;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var l01 = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        var hi = l01 * 2 - 1; if (hi < 0) { hi = 0; }
        var sh = 1 - l01 * 2; if (sh < 0) { sh = 0; }
        var r2 = r * gr, g2 = g * gg, b2 = b * gb;
        if (warm) {
          r2 += hi * hiAmt; g2 += hi * hiAmt * 0.25; b2 -= sh * shAmt;
        } else {
          b2 += hi * hiAmt; g2 += hi * hiAmt * 0.12; r2 -= sh * shAmt;
        }
        var m = (r2 + g2 + b2) / 3;
        r2 = m + (r2 - m) * sat;
        g2 = m + (g2 - m) * sat;
        b2 = m + (b2 - m) * sat;
        d[i] = clamp255(r2);
        d[i + 1] = clamp255(g2);
        d[i + 2] = clamp255(b2);
      }
      return imgData;
    }

    // Devuelve { url, sig } de la imagen ya graduada.
    function gradeToDataUrl(baseUrl, mode) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          try {
            var c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            var cx = c.getContext('2d', { willReadFrequently: true });
            cx.drawImage(img, 0, 0);
            var data = cx.getImageData(0, 0, c.width, c.height);
            gradeToneData(data, mode);
            var sig = sampleHash(data.data, data.width, data.height);
            cx.putImageData(data, 0, 0);
            resolve({ url: c.toDataURL('image/png'), sig: sig });
          } catch (e) { reject(e); }
        };
        img.onerror = function () { reject(new Error('No se pudo leer la imagen actual.')); };
        img.src = baseUrl;
      });
    }

    function setToneActive(mode) {
      toneBtns.forEach(function (b) {
        var on = !!mode && b.getAttribute('data-tone') === mode;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function setToneBusy(busy) {
      toneBusy = busy;
      toneBtns.forEach(function (b) {
        b.disabled = busy;
        b.classList.toggle('is-busy', busy);
      });
      var block = section.querySelector('.ai-tone-block');
      if (block) block.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    function resetToneState() {
      toneState = null;
      setToneActive(null);
      toneStatus('');
    }

    async function applyTone(mode) {
      if (toneBusy) return;
      if (isProcessing) { toneStatus('Espera a que termine la IA.'); return; }
      var canvas = document.querySelector('canvas');
      var imgData = canvasImageData();
      if (!canvas || !imgData || !canvasHasImage(imgData)) {
        toneStatus('Primero sube una imagen.');
        showStatus('Primero sube una imagen.', 2500);
        return;
      }
      setToneBusy(true);
      try {
        // Deja pintar el estado "aplicando" antes del bucle de píxeles.
        await new Promise(function (r) { requestAnimationFrame(function () { r(); }); });
        var currentSig = sampleHash(imgData.data, imgData.width, imgData.height);
        var mismoEstado = !!(toneState && toneState.sig === currentSig);

        if (mismoEstado && toneState.mode === mode) {
          // Segundo clic en el mismo tono → volver a la imagen original.
          var baseRestore = toneState.baseUrl;
          var baseRestoreSig = toneState.baseSig;
          updateAppImage(baseRestore, 'Tono original');
          // Estado "tono original": conocemos la base, así un clic posterior
          // aplica el tono directamente sin apilar efectos.
          toneState = { mode: null, sig: baseRestoreSig, baseSig: baseRestoreSig, baseUrl: baseRestore, resultUrl: baseRestore };
          setToneActive(null);
          toneStatus('Tono original restaurado.');
          showStatus('Tono original restaurado.', 3000);
          return;
        }

        toneStatus('Aplicando ' + TONE_LABELS[mode].toLowerCase() + '…');
        var baseUrl = mismoEstado ? toneState.baseUrl : canvas.toDataURL('image/png');
        var baseSig = mismoEstado ? toneState.baseSig : currentSig;
        var graded = await gradeToDataUrl(baseUrl, mode);
        toneState = { mode: mode, sig: graded.sig, baseSig: baseSig, baseUrl: baseUrl, resultUrl: graded.url };
        setToneActive(mode);
        updateAppImage(graded.url, TONE_LABELS[mode]);
        toneStatus(TONE_LABELS[mode] + ' aplicados · pulsa otra vez para quitarlos.');
        showStatus('✅ ' + TONE_LABELS[mode] + ' aplicados', 3000);
      } catch (e) {
        console.error('[Tono] Error:', e);
        toneStatus('No se pudo aplicar el tono: ' + ((e && e.message) || 'error'));
      } finally {
        setToneBusy(false);
      }
    }

    toneBtns.forEach(function (b) {
      b.onclick = function () { applyTone(b.getAttribute('data-tone') || 'cold'); };
    });
    toneStatus('');

    // Cualquier edición que no venga de estos dos botones invalida el tono
    // guardado: la próxima pulsación parte de la imagen actual.
    window.addEventListener('ai-tool-update', function (ev) {
      var url = ev && ev.detail && ev.detail.imageUrl;
      if (!url) return;
      if (toneState && (url === toneState.resultUrl || url === toneState.baseUrl)) return;
      if (toneBusy) return;
      resetToneState();
    });
    document.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t && t.tagName === 'INPUT' && t.type === 'file') resetToneState();
    }, true);

    // ===== Tooltip de modelos (popup hover, kit canónico) =====
    var modelTooltip = document.getElementById('model-tooltip');
    if (modelTooltip && !window.__modelTooltipInit) {
      window.__modelTooltipInit = true;
      var TOOLTIP_GAP = 10;
      var hideModelTooltip = function () {
        modelTooltip.classList.remove('visible', 'tip-above', 'tip-below');
        modelTooltip.setAttribute('aria-hidden', 'true');
        modelTooltip.textContent = '';
      };
      var showModelTooltip = function (button) {
        var text = (button.getAttribute('data-tooltip') || '').trim();
        if (!text) { hideModelTooltip(); return; }
        modelTooltip.textContent = text;
        modelTooltip.classList.remove('tip-above', 'tip-below');
        modelTooltip.classList.add('visible');
        modelTooltip.setAttribute('aria-hidden', 'false');
        var rect = button.getBoundingClientRect();
        var tw = modelTooltip.offsetWidth;
        var th = modelTooltip.offsetHeight;
        var left = rect.left + rect.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        var top = rect.top - th - TOOLTIP_GAP;
        if (top < 8) {
          top = rect.bottom + TOOLTIP_GAP;
          modelTooltip.classList.add('tip-below');
        } else {
          modelTooltip.classList.add('tip-above');
        }
        modelTooltip.style.left = left + 'px';
        modelTooltip.style.top = top + 'px';
      };
      var tooltipButtons = section.querySelectorAll('.model-toggle');
      tooltipButtons.forEach(function (button) {
        button.addEventListener('mouseenter', function () { showModelTooltip(button); });
        button.addEventListener('mouseleave', hideModelTooltip);
        button.addEventListener('focus', function () { showModelTooltip(button); });
        button.addEventListener('blur', hideModelTooltip);
      });
      window.addEventListener('scroll', hideModelTooltip, true);
      window.addEventListener('resize', hideModelTooltip);
    }
        // Add tool buttons
    var grid = document.getElementById('ai-tools-grid');
    if (!grid) return;

    AI_TOOLS.forEach(function (tool) {
      var btn = document.createElement('button');
      btn.textContent = tool.label;
      btn.title = tool.desc;
      btn.style.cssText = 'padding:0.375rem;font-size:10px;border-radius:0.375rem;border:1px solid rgba(0,208,208,0.3);background:rgba(0,176,176,0.2);color:#ccffff;cursor:pointer;transition:all 0.15s;display:flex;justify-content:center;align-items:center;gap:0.25rem;';

      // Hover effects
      btn.onmouseenter = function () {
        this.style.background = 'rgba(0,208,208,0.5)';
        this.style.borderColor = '#00D0D0';
        this.style.color = 'white';
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 0 15px rgba(0,208,208,0.4)';
        this.style.zIndex = '10';
      };
      btn.onmouseleave = function () {
        this.style.background = 'rgba(0,176,176,0.2)';
        this.style.borderColor = 'rgba(0,208,208,0.3)';
        this.style.color = '#ccffff';
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
        this.style.zIndex = '';
      };

      btn.onclick = function () {
        var image = getOriginalImage();
        if (!image) {
          showStatus('Primero sube una imagen.', 2000);
          return;
        }
        if (tool.needsInput) {
          currentTool = tool;
          createModal(tool);
        } else {
          executeTool(tool, '');
        }
      };

      // Icon placeholder
      btn.innerHTML = '<i data-lucide="' + tool.icon + '" style="width:0.75rem;height:0.75rem;"></i> ' + tool.label;
      grid.appendChild(btn);
    });

    // Initialize Lucide icons
    if (window.lucide) {
      setTimeout(function () { window.lucide.createIcons(); }, 200);
    }
  }

  // ============================================================
  // INIT — Wait for React app to mount, then inject
  // ============================================================
  function init() {
    // Try to inject immediately
    injectAIToolsUI();

    // Also use MutationObserver to detect when the sidebar appears
    var observer = new MutationObserver(function () {
      if (!document.getElementById('ai-tools-section')) {
        injectAIToolsUI();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Stop observing after 20 seconds
    setTimeout(function () {
      observer.disconnect();
    }, 20000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 1000); // Wait 1s for React to mount
    });
  } else {
    setTimeout(init, 1000);
  }

})();
