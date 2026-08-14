/**
 * AI Tools — FLUX-powered image editing (Tier 1)
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
  // STATE
  // ============================================================
  let currentTool = null;
  let isProcessing = false;
let selectedModel = 'gemini-pro'; //4 modelos skill_maestra: gemini-flash (3.1FLASH), gemini-pro (3 PRO), flux-pro (FLUX PRO), flux-max (FLUX MAX)
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
  // redondeando a múltiplos de 32 (requisito de FLUX).
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
  // Se usa cuando el usuario pide 4096 pero FLUX solo puede generar hasta 4MP nativos.
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

  async function callFluxAPI(imageBase64, prompt) {
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1] : imageBase64;
    const mimeType = imageBase64.startsWith('data:')
      ? imageBase64.split(';')[0].replace('data:', '') : 'image/jpeg';

    const dims = computeTargetDims(); // {width, height} finales pedidos por el usuario

    const payload = {
      image: base64Data,
      mimeType: mimeType,
      prompt: prompt,
model: selectedModel,
        quality: (selectedModel.indexOf('max') !== -1) ? 'max' : 'pro',
      width: dims.width,
      height: dims.height
    };

    const response = await fetch('proxy.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errMsg = 'Error HTTP ' + response.status;
      try {
        const errData = await response.json();
        errMsg = (errData.error && errData.error.message) || errData.error || errMsg;
      } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result.error) throw new Error((result.error && result.error.message) || result.error);
    if (result.image) {
      var dataUrl = 'data:' + (result.mimeType || 'image/png') + ';base64,' + result.image;
      // Si FLUX generó a menor resolución que la pedida (clamp 4MP p.ej. 4096),
      // escalamos client-side a las dimensiones finales solicitadas.
      return await upscaleDataUrl(dataUrl, dims.width, dims.height);
    }
    throw new Error('FLUX no devolvió imagen.');
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

      // Actualización: también actualizar el estado original de la imagen en la app.
      // Se pasa 'tool' para que la app registre la edición IA como acción manual
      // y el guardado la detecte como un cambio real (evita "sin cambios").
      window.dispatchEvent(new CustomEvent('ai-tool-update', {
        detail: { imageUrl: dataUrl, tool: toolLabel || 'IA FLUX' }
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
          return '<button class="ai-option-btn' + (i === 0 ? ' is-selected' : '') + '" data-value="' + opt.replace(/"/g, '&quot;') + '" style="text-align:left;padding:0.5rem 0.75rem;font-size:0.75rem;border-radius:0.5rem;border:1px solid ' + (i === 0 ? '#00D0D0' : '#334155') + ';background:' + (i === 0 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (i === 0 ? 'white' : '#cbd5e1') + ';cursor:pointer;transition:all 0.15s;">' + opt + '</button>';
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
    cancelBtn.style.cssText = 'padding:0.5rem 1rem;border-radius:0.5rem;background:#1e293b;color:#cbd5e1;font-size:0.875rem;border:none;cursor:pointer;';
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
            b.style.color = '#cbd5e1';
            b.style.borderColor = '#334155';
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
 var resultUrl = await callFluxAPI(image, finalPrompt);

      if (resultUrl) {
        // Update the image in the app
        var updated = updateAppImage(resultUrl, tool.label);

        // Also try to trigger React state update via event
        // Dispatch a custom event that the React app can listen to
        window.dispatchEvent(new CustomEvent('ai-image-updated', {
          detail: { imageUrl: resultUrl, tool: tool.label }
        }));

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
      '<div style="display:flex;align-items:center;gap:0.375rem;margin-bottom:0.5rem;">' +
        '<span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Modelo:</span>' +
'<button id="ai-quality-flash" class="ai-quality-btn" data-model="gemini-flash" title="google/gemini-3.1-flash-image rapido y economico" style="flex:1;padding:0.3rem 0.1rem;font-size:9px;font-weight:700;border-radius:0.375rem;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;transition:all 0.15s;text-transform:uppercase;white-space:nowrap;">3.1FLASH</button>' +
'<button id="ai-quality-pro" class="ai-quality-btn is-selected" data-model="gemini-pro" title="google/gemini-3-pro-image maxima calidad" style="flex:1;padding:0.3rem 0.1rem;font-size:9px;font-weight:700;border-radius:0.375rem;border:1px solid #00D0D0;background:rgba(0,208,208,0.3);color:white;cursor:pointer;transition:all 0.15s;text-transform:uppercase;white-space:nowrap;">3 PRO</button>' +
'<button id="ai-quality-fluxpro" class="ai-quality-btn" data-model="flux-pro" title="flux-2-pro calidad/velocidad (~$0.03)" style="flex:1;padding:0.3rem 0.1rem;font-size:9px;font-weight:700;border-radius:0.375rem;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;transition:all 0.15s;text-transform:uppercase;white-space:nowrap;">FLUX PRO</button>' +
'<button id="ai-quality-fluxmax" class="ai-quality-btn" data-model="flux-max" title="flux-2-max maxima fidelidad (~$0.07)" style="flex:1;padding:0.3rem 0.1rem;font-size:9px;font-weight:700;border-radius:0.375rem;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;transition:all 0.15s;text-transform:uppercase;white-space:nowrap;">FLUX MAX</button>' +
        '<button id="ai-quality-max" class="ai-quality-btn" data-quality="max" title="flux-2-max — máxima fidelidad (~$0.07)" style="flex:1;padding:0.3rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;transition:all 0.15s;text-transform:uppercase;">MAX</button>' +
      '</div>' +
      '<div style="margin-bottom:0.4rem;">' +
        '<span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:0.25rem;">Formato:</span>' +
        '<div style="display:flex;gap:0.3rem;">' +
          ['1:1', '16:9', '9:16', '4:3', '3:4'].map(function (ar, i) {
            return '<button class="ai-ar-btn' + (i === 0 ? ' is-selected' : '') + '" data-ar="' + ar + '" style="flex:1;padding:0.3rem 0.15rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid ' + (i === 0 ? '#00D0D0' : '#334155') + ';background:' + (i === 0 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (i === 0 ? 'white' : '#cbd5e1') + ';cursor:pointer;transition:all 0.15s;">' + ar + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:0.5rem;">' +
        '<span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:0.25rem;">Resolución:</span>' +
        '<div style="display:flex;gap:0.3rem;">' +
          [512, 1024, 2048, 4096].map(function (res, i) {
            return '<button class="ai-res-btn' + (res === 1024 ? ' is-selected' : '') + '" data-res="' + res + '" style="flex:1;padding:0.3rem 0.15rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid ' + (res === 1024 ? '#00D0D0' : '#334155') + ';background:' + (res === 1024 ? 'rgba(0,208,208,0.3)' : '#1e293b') + ';color:' + (res === 1024 ? 'white' : '#cbd5e1') + ';cursor:pointer;transition:all 0.15s;">' + res + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<button id="ai-apply-dims" title="Aplica el formato y la resolución elegidos recortando/redimensionando la imagen actual, SIN usar IA (gratis)" style="width:100%;margin-bottom:0.6rem;padding:0.4rem;font-size:10px;font-weight:700;border-radius:0.375rem;border:1px solid #26C626;background:rgba(38,198,38,0.18);color:#eaffff;cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.04em;">Aplicar formato/resolución (sin IA)</button>' +
      '<div id="ai-tools-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.375rem;"></div>';

    // Insertar SIEMPRE al INICIO del contenedor scrollable (primer hijo)
    scrollDiv.insertBefore(section, scrollDiv.firstChild);

    // Helper genérico: toggle exclusivo de un grupo de botones selector (pro/max, AR, res)
    function wireSelectorGroup(selector, onPick) {
      var btns = section.querySelectorAll(selector);
      btns.forEach(function (b) {
        b.onclick = function () {
          btns.forEach(function (x) {
            x.classList.remove('is-selected');
            x.style.background = '#1e293b';
            x.style.color = '#cbd5e1';
            x.style.borderColor = '#334155';
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

    // Selector de modelo (pro/max): actualiza selectedQuality y el estado visual
var qualityBtns = section.querySelectorAll('.ai-quality-btn');
qualityBtns.forEach(function (qb) {
 qb.onclick = function () {
 selectedModel = qb.getAttribute('data-model') || 'gemini-pro';
 window.selectedAIModel = selectedModel;
 qualityBtns.forEach(function (b) {
 b.classList.remove('is-selected');
 b.style.background = '#1e293b';
 b.style.color = '#cbd5e1';
 b.style.borderColor = '#334155';
 });
 qb.classList.add('is-selected');
 qb.style.background = 'rgba(0,208,208,0.3)';
 qb.style.color = 'white';
 qb.style.borderColor = '#00D0D0';
 };
});
window.selectedAIModel = selectedModel;
    qualityBtns.forEach(function (qb) {
      qb.onclick = function () {
        selectedQuality = qb.getAttribute('data-quality') || 'pro';
        qualityBtns.forEach(function (b) {
          b.classList.remove('is-selected');
          b.style.background = '#1e293b';
          b.style.color = '#cbd5e1';
          b.style.borderColor = '#334155';
        });
        qb.classList.add('is-selected');
        qb.style.background = 'rgba(0,208,208,0.3)';
        qb.style.color = 'white';
        qb.style.borderColor = '#00D0D0';
      };
    });

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
