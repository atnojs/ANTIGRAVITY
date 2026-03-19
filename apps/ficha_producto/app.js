(() => {
  const { useState, useMemo, useCallback } = React;

  // ========= INYECCIONES OBLIGATORIAS =========
  function composePrePrompt(userPrompt, ctx = {}) {
    const PRE = [
      "Photorealistic rendering with premium catalog quality.",
      "Soft diffused daylight, balanced exposure, neutral-warm white balance.",
      "Filmic soft S-curve: rich blacks, smooth highlight roll-off, gentle midtone contrast.",
      "Perceived gamma around 1.03; micro-sharpening only, no halos.",
      "Cinematic depth of field with natural bokeh.",
      "No text, no extra objects, no watermarks.",
      "If a base image is provided, strictly preserve existing logos and brand marks.",
      "Camera reference: Phase One IQ4 150MP."
    ].join(" ");
    const INTEGRATION = ctx.integration === true
      ? "Photorealistic compositing of provided assets: use scenario as background plate; synthesize the model with coherent pose and skin tones; transfer garment onto the model with physically plausible cloth drape and occlusions; attach accessory with correct scale, reflections and contact shadows; match lighting and color temperature to the scenario; unify grade with the filmic profile."
      : "";
    return [PRE, INTEGRATION, userPrompt || ""].map(s => String(s||"").trim()).filter(Boolean).join(" ");
  }

  async function postProcessDataURL(dataURL, opts = {}) {
    const cfg = Object.assign({
      gamma: 1.012,
      sCurve: 0.19,
      sat: 1.01,
      warmHi: 0.10,
      unsharpAmt: 0.18,
      unsharpRadius: 1.3
    }, opts);

    const img = await new Promise((res, rej) => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = rej; im.src = dataURL;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);

    const id = x.getImageData(0, 0, w, h), d = id.data;
    const pow = (v,g)=>Math.pow(Math.max(0,Math.min(1,v)),1/g);
    const sCurve = (v,k)=>{ const X=v-0.5; return Math.max(0,Math.min(1,0.5+(X*(1+k))/(1+k*Math.abs(X)*2))); };
    const clamp = v => v<0?0:v>255?255:v;

    for (let i=0;i<d.length;i+=4){
      let r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
      const Y = 0.2627*r + 0.678*g + 0.0593*b;
      r=sCurve(pow(r,cfg.gamma),cfg.sCurve);
      g=sCurve(pow(g,cfg.gamma),cfg.sCurve);
      b=sCurve(pow(b,cfg.gamma),cfg.sCurve);
      const mean=(r+g+b)/3; const k=cfg.sat-1;
      r=mean+(r-mean)*(1+k); g=mean+(g-mean)*(1+k); b=mean+(b-mean)*(1+k);
      if (Y>0.6){ const wamt=cfg.warmHi*(Y-0.6)/0.4; r+=0.8*wamt; b-=0.8*wamt; }
      d[i]=clamp(r*255); d[i+1]=clamp(g*255); d[i+2]=clamp(b*255);
    }
    x.putImageData(id,0,0);

    if (cfg.unsharpAmt>0){
      const bc=document.createElement('canvas'); bc.width=w; bc.height=h;
      const bx=bc.getContext('2d'); bx.filter=`blur(${cfg.unsharpRadius}px)`; bx.drawImage(c,0,0);
      const src=x.getImageData(0,0,w,h), blr=bx.getImageData(0,0,w,h);
      const sd=src.data, bd=blr.data;
      for (let i=0;i<sd.length;i+=4){
        sd[i]   = clamp(sd[i]   + (sd[i]   - bd[i])   * cfg.unsharpAmt);
        sd[i+1] = clamp(sd[i+1] + (sd[i+1] - bd[i+1]) * cfg.unsharpAmt);
        sd[i+2] = clamp(sd[i+2] + (sd[i+2] - bd[i+2]) * cfg.unsharpAmt);
      }
      x.putImageData(src,0,0);
    }
    return c.toDataURL('image/jpeg', 0.95);
  }

  // ======= Helpers de integración y config =======
  const baseImageCfg = {
    gradingPreset: "filmic-soft",
    contrastProfile: "soft S-curve, rich blacks, smooth highlight roll-off",
    perceivedGamma: 1.03,
    whiteBalance: "daylight neutral-warm",
    subjectSaturationBoost: "slight",
    backgroundSaturation: "neutral",
    sharpening: "micro only, no halos"
  };

  function __buildImageConfigFromPrompt(finalPrompt) {
    const txt = (finalPrompt || "").toLowerCase();
    const isWarmIndoor = /(interior|pub|bar|tungsten|lámpara|lamp|sconce)/.test(txt);
    const imageCfg99 = Object.assign({}, baseImageCfg, isWarmIndoor ? {
      whiteBalance: "tungsten-warm",
      backgroundSaturation: "slightly reduced"
    } : {});
    Object.assign(imageCfg99, { toneMap: "filmic-soft-warm" });
    return imageCfg99;
  }

  function __extendPayloadWithConfigs(payload, finalPrompt) {
    payload.generationConfig = Object.assign(
      { responseModalities: ["IMAGE"], temperature: 0.5 },
      payload.generationConfig || {}
    );
    const imageCfg = __buildImageConfigFromPrompt(finalPrompt);
    payload.imageConfig = Object.assign(imageCfg, payload.imageConfig || {});
  }

  function __detectIntegrationFromImage(imageInline) {
    try {
      if (!imageInline) return false;
      let partsLen = 0;
      if (Array.isArray(imageInline)) partsLen = imageInline.length;
      else if (Array.isArray(imageInline?.parts)) partsLen = imageInline.parts.length;
      return partsLen === 4;
    } catch { return false; }
  }

  function __normalizeImageForApi(imageInline) {
    // Intenta reordenar a [scenario, model, clothing, accessory] si vienen etiquetados
    try {
      if (!imageInline) return imageInline;
      if (Array.isArray(imageInline) && imageInline.length === 4) return imageInline;
      if (imageInline && typeof imageInline === 'object') {
        const keys = ["scenario","model","clothing","accessory"];
        if (keys.every(k => k in imageInline)) {
          return [imageInline.scenario, imageInline.model, imageInline.clothing, imageInline.accessory];
        }
      }
      return imageInline;
    } catch { return imageInline; }
  }

  // ========= Utils =========
  const fileToBase64Part = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => {
        const base64 = String(r.result).split(",")[1];
        resolve({ data: base64, mimeType: file.type });
      };
      r.onerror = reject;
    });

  // ========= Historial Persistente con localStorage =========
  const HISTORY_KEY = 'ficha_producto_history';
  const MAX_HISTORY_ITEMS = 50;

  // Verificar si localStorage está disponible
  function isLocalStorageAvailable() {
    // Versión SIMPLE
    try {
      return typeof localStorage !== 'undefined';
    } catch (e) {
      return false;
    }
  }

  function getHistory() {
    // Versión SIMPLE y ROBUSTA
    try {
      // 1. Verificar localStorage
      if (typeof localStorage === 'undefined') {
        return [];
      }
      
      // 2. Obtener datos
      const saved = localStorage.getItem(HISTORY_KEY);
      if (!saved) {
        return [];
      }
      
      // 3. Parsear SIMPLE
      const parsed = JSON.parse(saved);
      
      // 4. Verificar que sea array
      if (!Array.isArray(parsed)) {
        console.warn('Historial no es array, limpiando...');
        localStorage.removeItem(HISTORY_KEY);
        return [];
      }
      
      // 5. Filtrar items corruptos o sin datos esenciales
      const validItems = parsed.filter(item => {
        // Un item válido debe ser un objeto
        if (!item || typeof item !== 'object') return false;
        
        // Debe tener al menos nombre o código fuente
        const hasName = item.name && typeof item.name === 'string';
        const hasSourceCode = item.sourceCode && typeof item.sourceCode === 'string';
        
        return hasName || hasSourceCode;
      });
      
      // 6. Si hay items inválidos, guardar solo los válidos
      if (validItems.length !== parsed.length) {
        console.log(`Filtrados ${parsed.length - validItems.length} items inválidos del historial`);
        if (validItems.length > 0) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validItems));
        } else {
          localStorage.removeItem(HISTORY_KEY);
        }
      }
      
      return validItems;
      
    } catch (error) {
      // Si hay error, limpiar y empezar de nuevo
      console.warn('Error cargando historial, limpiando...', error);
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch (e) {}
      return [];
    }
  }

  function saveHistory(history) {
    // Versión SIMPLE y ROBUSTA con gestión de quota
    try {
      if (!Array.isArray(history)) {
        console.warn('Historial no es array, no guardando');
        return;
      }
      
      // Limitar a 20 items máximo inicialmente
      let toSave = history.slice(0, 20);
      
      // Intentar guardar, si falla por quota, eliminar items más antiguos
      while (toSave.length > 0) {
        try {
          const jsonString = JSON.stringify(toSave);
          console.log(`Guardando ${toSave.length} items, tamaño: ${Math.round(jsonString.length / 1024)}KB`);
          localStorage.setItem(HISTORY_KEY, jsonString);
          console.log('Historial guardado exitosamente');
          return;
        } catch (error) {
          if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.log('Quota excedida, eliminando item más antiguo');
            toSave.pop(); // Eliminar el más antiguo
          } else {
            console.warn('Error guardando historial:', error);
            throw error;
          }
        }
      }
      
      // Si llegamos aquí, no se pudo guardar nada
      console.log('No se pudo guardar ningún item, limpiando historial');
      localStorage.removeItem(HISTORY_KEY);
      
    } catch (error) {
      console.warn('Error guardando historial:', error);
    }
  }

  function addToHistory(item) {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage no disponible, no se puede añadir al historial');
      return null;
    }
    
    const history = getHistory();
    const newItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: Date.now()
    };
    console.log('Añadiendo al historial:', newItem);
    history.unshift(newItem);
    saveHistory(history);
    return newItem;
  }

  function deleteFromHistory(id) {
    if (!isLocalStorageAvailable()) return;
    
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  }

  function clearAllHistory() {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(HISTORY_KEY);
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Función para comprimir datos del historial
  const compressHistoryData = (productResult) => {
    try {
      // Crear una versión optimizada para almacenamiento
      const compressed = {
        name: productResult.productData.name,
        price: productResult.productData.price,
        description: productResult.productData.description,
        preserveLogo: productResult.productData.preserveLogo,
        generatedImagesCount: productResult.productData.generatedImages.length,
        // Guardar miniaturas pequeñas (primeras 5000 caracteres) para preview
        imageThumbnails: productResult.productData.generatedImages.map((img, index) => {
          const previewSrc = img.previewSrc || '';
          if (previewSrc && previewSrc.length > 100) {
            // Tomar una versión reducida para thumbnail
            return previewSrc.substring(0, 5000) + (previewSrc.length > 5000 ? '...' : '');
          }
          return '';
        }),
        // Guardar información básica de las imágenes
        imagesInfo: productResult.productData.generatedImages.map((img, index) => ({
          index,
          hasHistory: img.history && img.history.length > 0,
          hasPreview: !!img.previewSrc
        })),
        timestamp: Date.now()
      };
      return compressed;
    } catch (error) {
      console.error('Error comprimiendo datos:', error);
      return null;
    }
  };

  // Función para extraer código fuente de una página generada
  const extractSourceCode = (productData, htmlContent) => {
    try {
      // Extraer CSS del estilo compartido
      const cssContent = sharedHtmlStyle;
      
      // Extraer JS del HTML (buscar entre tags <script>)
      const jsMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
      const jsContent = jsMatch ? jsMatch[1].trim() : '';
      
      // Extraer HTML body (sin head ni scripts)
      const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
      const htmlBody = bodyMatch ? bodyMatch[1].trim() : '';
      
      // Extraer título del head
      const titleMatch = htmlContent.match(/<title>([\s\S]*?)<\/title>/);
      const pageTitle = titleMatch ? titleMatch[1].trim() : productData.name;
      
      return {
        html: htmlContent,
        css: cssContent,
        js: jsContent,
        htmlBody: htmlBody,
        pageTitle: pageTitle,
        productData: {
          name: productData.name,
          price: productData.price,
          description: productData.description,
          preserveLogo: productData.preserveLogo || true,
          generatedImagesCount: productData.generatedImages.length
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error extrayendo código fuente:', error);
      return null;
    }
  };

  // Función para guardar código fuente en el historial
  const saveSourceCodeToHistory = (productResult) => {
    try {
      // Versión SIMPLE - solo guardar lo esencial
      const htmlContent = createProductPageHtml(productResult.productData);
      const sourceCode = extractSourceCode(productResult.productData, htmlContent);
      
      if (!sourceCode) {
        return null;
      }
      
      // Crear item SIMPLE
      const historyItem = {
        id: 'item_' + Date.now(),
        name: productResult.productData.name,
        price: productResult.productData.price,
        description: productResult.productData.description,
        preserveLogo: productResult.productData.preserveLogo || true,
        sourceCode: sourceCode,
        timestamp: Date.now(),
        imagesCount: productResult.productData.generatedImages.length
      };
      
      // Guardar
      addToHistory(historyItem);
      return historyItem;
      
    } catch (error) {
      console.warn('Error guardando en historial:', error);
      return null;
    }
  };

  // Función para restaurar desde el historial CON código fuente
  const restoreFromHistory = async (historyItem) => {
    try {
      if (!historyItem.sourceCode) {
        throw new Error('Este item del historial no tiene código fuente guardado.');
      }
      
      // Crear datos básicos del producto
      const productData = {
        name: historyItem.name || 'Producto restaurado',
        price: historyItem.price || '0',
        description: historyItem.description || '',
        preserveLogo: historyItem.preserveLogo || true,
        generatedImages: [],
        sourceCode: historyItem.sourceCode
      };
      
      // Crear datos restaurados
      const restoredData = {
        productData: productData,
        zipBlob: null,
        originalImage: null,
        preserveLogo: historyItem.preserveLogo || true,
        fromHistory: true,
        hasSourceCode: true
      };
      
      // Si hay código fuente, generar ZIP con él
      if (historyItem.sourceCode) {
        try {
          const zipBlob = await createZip(productData, historyItem.sourceCode);
          restoredData.zipBlob = zipBlob;
        } catch (zipError) {
          console.warn('No se pudo generar ZIP con código fuente:', zipError);
        }
      }
      
      return restoredData;
    } catch (error) {
      console.error('Error restaurando desde historial:', error);
      throw error;
    }
  };

  const base64ToBlob = (base64, mimeType) => {
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mimeType });
    } catch {
      return null;
    }
  };

  const dataURLToBlob = (dataURL) => {
    const [hdr, b64] = String(dataURL).split(',');
    const mime = (/^data:([^;]+);base64/.exec(hdr)||[])[1] || 'image/jpeg';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  // Normaliza imágenes para el iframe: acepta {data, mimeType} con o sin prefijo data:
  const toDataUrl = (img) => {
    const mime = (img.mimeType || "image/png").trim();
    const d = String(img.data || "").trim();
    if (d.startsWith("data:")) return d;
    return `data:${mime};base64,${d}`;
  };

  // ========= Helpers de postprocesado para previews =========
  async function __ensureProcessedPreview(obj) {
    const mime = obj.image?.mimeType || "image/png";
    const data = obj.image?.data || "";
    const srcRaw = data.startsWith("data:") ? data : `data:${mime};base64,${data}`;
    obj.previewSrc = await postProcessDataURL(srcRaw);
    if (Array.isArray(obj.history)) {
      obj.historyPreviewSrcs = [];
      for (const h of obj.history) {
        const hm = h?.mimeType || "image/png";
        const hd = h?.data || "";
        const hRaw = hd.startsWith("data:") ? hd : `data:${hm};base64,${hd}`;
        obj.historyPreviewSrcs.push(await postProcessDataURL(hRaw));
      }
    } else {
      obj.historyPreviewSrcs = [obj.previewSrc];
    }
  }
  async function __ensureProcessedPreviews(arr) {
    for (const o of arr) await __ensureProcessedPreview(o);
  }

  // ========= API proxy.php =========
  const api = {
    async describe(imageInline, referenceDesc) {
      let prompt =
        "Escribe una descripción de producto para e-commerce, en español, basada en la imagen. La descripción debe ser atractiva y concisa (máx 1000 caracteres). Responde únicamente con la descripción del producto, sin añadir texto introductorio.";
      if (referenceDesc && referenceDesc.trim() !== "") {
        prompt += `\n\nUtiliza la siguiente descripción como inspiración y referencia para mejorar el resultado: "${referenceDesc}"`;
      }

      const __imageNorm = __normalizeImageForApi(imageInline);
      const finalPrompt = composePrePrompt(prompt, { integration: __detectIntegrationFromImage(__imageNorm) });
      const __payload = { task: "describe", image: __imageNorm, prompt: finalPrompt };
      __extendPayloadWithConfigs(__payload, finalPrompt);
      const res = await fetch("./proxy.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(__payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error describiendo");
      return data.description;
    },

    async generateImages(imageInline, onProgress) {
      const prompts = [
        "A photorealistic studio product photo of a [PRODUCT]. Captured with a Phase One IQ4 150MP medium format camera using a 90mm lens, aperture f/4 for crisp focus and shallow depth of field. The product is centered on a clean, bright, minimalist background with soft diffused lighting from both sides. Highlight material textures and edges naturally, no harsh reflections, no text, no watermark, no extra objects. Professional catalog composition, high-end advertising aesthetic, balanced exposure, subtle contrast, and refined color accuracy. **IMPORTANT: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, or alter any logos or branding.**",
        
        "A photorealistic lifestyle photo featuring a [PRODUCT] in a realistic everyday urban environment—such as a café table, street bench, local shop, or outdoor market. Captured with a Phase One IQ4 150MP, 80mm lens, aperture f/2.8 for natural bokeh and soft depth of field. Natural daylight with gentle fill light, warm tone balance, realistic textures, and authentic atmosphere. Include subtle human presence or context elements that show real use or display of the product. No text, no artificial lighting artifacts, no watermark. Professional-grade realism and composition suitable for premium social media advertising. **IMPORTANT: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, or alter any logos or branding.**",
        
        "A photorealistic lifestyle photo of a [PRODUCT] displayed or being used naturally inside a public indoor space—such as a café, boutique, art studio, or concept store. Captured with a Phase One IQ4 150MP medium format camera, 80mm lens at f/2.8 for shallow depth of field and cinematic focus. Soft directional lighting through large windows or diffused studio lights, highlighting textures and realistic reflections. Professional interior ambiance with warm tones, subtle shadows, and balanced exposure. Include authentic human presence or contextual elements (tables, shelves, decor) that enhance realism without distraction. No text, no logo, no watermark, no artificial look. High-end advertising composition optimized for premium lifestyle campaigns and social media visuals. **IMPORTANT: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, or alter any logos or branding.**",
        
        "A photorealistic close-up of a [PRODUCT], highlighting its texture, materials, and key design features. Captured with a Phase One IQ4 150MP medium format camera using a 120mm macro lens at f/2.8 for shallow depth of field. Focus precisely on the most distinctive area of the product, keeping the rest softly blurred to emphasize depth and realism. Controlled studio lighting with soft diffused highlights to reveal surface detail and material quality. Maintain perfect framing within the original composition—no cropping or elements extending beyond frame limits. No text, no watermark, no artificial reflections. Professional macro-style image optimized for high-end product advertising and social media presentation. **IMPORTANT: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, or alter any logos or branding.**",
        
        "A photorealistic studio image of a [PRODUCT] placed on a modern geometric pedestal or platform, as if displayed in a contemporary art museum. Captured with a Phase One IQ4 150MP medium format camera, 90mm lens, aperture f/5.6 for full sharpness and balanced depth of field. Use a solid-color background that complements the product's tones—neutral, soft, or slightly gradient—to create an elegant, sophisticated atmosphere. Lighting should be diffused yet directional, emphasizing clean lines, subtle reflections, and a premium exhibition look. The product must appear as a collector's piece, central and perfectly composed, with no clutter or additional props. No text, no watermark, no overexposed highlights. High-end composition suitable for luxury advertising and fine art presentation. **IMPORTANT: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, or alter any logos or branding.**",
      ];
      
      const images = [];
      const failedPrompts = [];
      
      for (let i = 0; i < prompts.length; i++) {
        if (onProgress) onProgress(`Generando imagen ${i + 1} de ${prompts.length}.`);
        try {
          const finalPrompt = composePrePrompt(prompts[i], { integration: __detectIntegrationFromImage(__normalizeImageForApi(imageInline)) });
          const __imageNorm = __normalizeImageForApi(imageInline);
          const __payload = { task: "generateImages", image: __imageNorm, prompts: [finalPrompt] };
          __extendPayloadWithConfigs(__payload, finalPrompt);
          const res = await fetch("./proxy.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(__payload),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Error generando imagen ${i + 1}`);
          }
          if (data.images && data.images.length > 0) {
            images.push(data.images[0]);
          } else {
            failedPrompts.push(i + 1);
          }
        } catch (error) {
          console.error(`Error generando imagen ${i + 1}:`, error);
          failedPrompts.push(i + 1);
        }
      }
      
      if (images.length === 0) {
        throw new Error("No se pudo generar ninguna imagen. Por favor, inténtalo de nuevo con otra imagen.");
      }
      
      if (failedPrompts.length > 0) {
        console.warn(`No se pudieron generar las imágenes: ${failedPrompts.join(", ")}`);
      }
      
      return images;
    },

    async editImage(currentImage, customPrompt) {
      const logoPreservationInstructions = " **CRITICAL: Preserve any existing logos, brand marks, text, or branding elements exactly as they appear in the original image. Do not modify, remove, alter, or obscure any logos or branding under any circumstances. The logo/branding must remain perfectly visible and unchanged.**";
      const enhancedPrompt = customPrompt + logoPreservationInstructions;

      const finalPrompt = composePrePrompt(enhancedPrompt, { integration: __detectIntegrationFromImage(__normalizeImageForApi(currentImage)) });
      const __payload = {
        task: "generateImages",
        image: __normalizeImageForApi(currentImage),
        prompts: [finalPrompt],
      };
      __extendPayloadWithConfigs(__payload, finalPrompt);
      
      const res = await fetch("./proxy.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(__payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error editando imagen");
      if (data.images && data.images.length > 0) {
        return data.images[0];
      } else {
        throw new Error("La API no devolvió una imagen editada.");
      }
    },
    
    async improvePrompt(userPrompt) {
      let improvedPrompt = userPrompt;
      if (!improvedPrompt.includes("fotográfica") && !improvedPrompt.includes("foto")) {
        improvedPrompt = "Imagen fotográfica " + improvedPrompt;
      }
      if (!improvedPrompt.includes("calidad") && !improvedPrompt.includes("alta")) {
        improvedPrompt += ", alta calidad";
      }
      if (!improvedPrompt.includes("luz") && !improvedPrompt.includes("iluminación")) {
        improvedPrompt += ", iluminación profesional";
      }
      if (!improvedPrompt.includes("detallado") && !improvedPrompt.includes("detalles")) {
        improvedPrompt += ", muy detallado";
      }
      if (!improvedPrompt.includes("realista") && !improvedPrompt.includes("estilo")) {
        improvedPrompt += ", estilo realista";
      }
      if (!improvedPrompt.includes("cámara") && !improvedPrompt.includes("lente")) {
        improvedPrompt += ", capturado con cámara profesional";
      }
      if (improvedPrompt.includes("cambia") || improvedPrompt.includes("cambiar")) {
        improvedPrompt = improvedPrompt.replace(/cambia|cambiar/g, "modifica");
      }
      if (improvedPrompt.includes("fondo")) {
        improvedPrompt += ", fondo bien definido";
      }
      if (!improvedPrompt.includes("producto") && !improvedPrompt.includes("objeto")) {
        improvedPrompt += ", producto como elemento principal";
      }
      if (!improvedPrompt.includes("logo") && !improvedPrompt.includes("marca") && !improvedPrompt.includes("branding")) {
        improvedPrompt += ". **MUY IMPORTANTE: Preservar todos los logos, marcas, texto o elementos de branding exactamente como aparecen en la imagen original. No modificar, eliminar ni alterar ningún logo o branding bajo ninguna circunstancia.**";
      }
      improvedPrompt = improvedPrompt
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .trim();
      if (!improvedPrompt.endsWith('.') && !improvedPrompt.endsWith(',')) {
        improvedPrompt += '.';
      }
      improvedPrompt = improvedPrompt.charAt(0).toUpperCase() + improvedPrompt.slice(1);
      return improvedPrompt;
    }
  };

  // ========= Plantilla HTML para ZIP =========
  const sharedHtmlStyle = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Dancing+Script:wght@700&display=swap');

body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background:#fff;color:#212529}
.container{max-width:960px;margin:2rem auto;padding:0 1rem;}
.product-grid{display:grid;grid-template-columns:1fr;gap:2rem}
@media(min-width:768px){.product-grid{grid-template-columns:1fr 1fr}}
.gallery{display:flex;flex-direction:column}
.main-image-container{margin-bottom:1rem;border:1px solid #dee2e6;border-radius:4px;overflow:hidden}
.main-image{width:100%;display:block;aspect-ratio:1/1;object-fit:cover}
.thumbnail-container{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem}
.thumbnail{width:100%;cursor:pointer;border:2px solid transparent;border-radius:4px;transition:border-color .2s;aspect-ratio:1/1;object-fit:cover}
.thumbnail.active,.thumbnail:hover{border-color:#0d6efd}
.product-info{display:flex;flex-direction:column}

/* Título con Brush Script MT y múltiples fallbacks */
.product-title-modern{
  font-family:'Brush Script MT', cursive;
  font-size:3.5rem;
  font-weight:700;
  margin:0 0 1.5rem;
  line-height:1.1;
  position:relative;
  display:inline-block;
  text-align:center;
  width:100%;
  color:#667eea;
  text-shadow:0 2px 10px rgba(102, 126, 234, 0.2);
  letter-spacing:0.02em;
  transform:rotate(-2deg);
  transition:transform 0.3s ease;
}

/* Fallback para Dancing Script (Google Fonts) si Brush Script MT no está disponible */
@font-face {
  font-family: 'Brush Script MT Fallback';
  src: local('Dancing Script'), local('Dancing Script Bold');
  font-weight: 700;
  font-style: normal;
}

/* Aplicar fallback si Brush Script MT no carga */
.product-title-modern:not(:has(.brush-script-loaded)) {
  font-family: 'Dancing Script', 'Brush Script MT Fallback', cursive;
}

/* Gradiente para navegadores que soportan background-clip */
@supports (-webkit-background-clip: text) or (background-clip: text){
  .product-title-modern{
    background:linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
    text-fill-color:transparent;
    color:transparent;
    text-shadow:none;
  }
}

/* Línea decorativa animada */
.product-title-modern::after{
  content:'';
  position:absolute;
  bottom:-8px;
  left:50%;
  transform:translateX(-50%);
  width:80%;
  height:4px;
  background:linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius:2px;
  animation:shimmer 3s ease-in-out infinite;
}

@keyframes shimmer{
  0%,100%{opacity:0.7;transform:translateX(-50%) scaleX(0.8);}
  50%{opacity:1;transform:translateX(-50%) scaleX(1);}
}

/* Efecto hover */
.product-title-modern:hover{
  transform:rotate(-2deg) translateY(-3px);
  transition:transform 0.3s ease;
}

/* Variante elegante sin gradiente (fallback) */
@supports not (-webkit-background-clip: text) or not (background-clip: text){
  .product-title-modern{
    background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
    text-fill-color:transparent;
    color:#667eea;
    position:relative;
  }
  
  .product-title-modern::before{
    content:attr(data-text);
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
    text-fill-color:transparent;
    z-index:1;
  }
}

.product-price{font-size:1.5rem;color:#198754;margin-bottom:1.5rem;font-weight:600}
.product-description{line-height:1.6}
h2{border-bottom:1px solid #dee2e6;padding-bottom:.5rem;margin-top:2rem;font-size:1.25rem;font-weight:600}

/* Responsive */
@media(max-width:768px){
  .product-title-modern{font-size:3rem;}
}
@media(max-width:480px){
  .product-title-modern{font-size:2.5rem;}
}
`;


  const createBaseHtml = (data, imageSources) => `
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.name}</title>
<style>${sharedHtmlStyle}</style>
</head>
<body>
  <div class="container">
    <div class="product-grid">
      <div class="gallery">
        <div class="main-image-container">
          <img id="mainImage" src="${imageSources[0]}" alt="Imagen principal de ${data.name}" class="main-image">
        </div>
        <div class="thumbnail-container">
          ${imageSources
            .map(
              (src, i) =>
                `<img src="${src}" alt="Miniatura ${i + 1}" class="thumbnail ${
                  i === 0 ? "active" : ""
                }" onclick="changeImage(this)">`
            )
            .join("")}
        </div>
      </div>
      <div class="product-info">
        <h1 class="product-title-modern" data-text="${data.name}">${data.name}</h1>
        <p class="product-price">${data.price} €</p>
        <h2>Descripción</h2>
        <p class="product-description">${data.description.replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const title = document.querySelector('.product-title-modern');
      const computedFont = window.getComputedStyle(title).fontFamily;
      if (computedFont.includes('Brush Script MT')) {
        title.classList.add('brush-script-loaded');
      }
    });
    function changeImage(clickedThumbnail){
      document.getElementById('mainImage').src = clickedThumbnail.src;
      document.querySelectorAll('.thumbnail').forEach(t=>t.classList.remove('active'));
      clickedThumbnail.classList.add('active');
    }
  <\/script>
</body>
</html>`;

  // Para el .ZIP: rutas relativas a /images
  const createProductPageHtml = (data) => {
    const imageFiles = data.generatedImages.map((imgObj, i) => {
      return `images/producto-${i + 1}.jpg`;
    });
    
    // Si hay código fuente editado, usarlo
    if (data.sourceCode?.html) {
      // Combinar el HTML editado con las rutas de imágenes correctas
      let html = data.sourceCode.html;
      
      // Reemplazar rutas de imágenes si es necesario
      imageFiles.forEach((imagePath, index) => {
        const regex = new RegExp(`images/producto-${index + 1}\\.jpg`, 'g');
        html = html.replace(regex, imagePath);
      });
      
      return html;
    }
    
    // De lo contrario, generar HTML normal
    return `<!DOCTYPE html>${createBaseHtml(data, imageFiles)}`;
  };

  // ZIP con imágenes postprocesadas obligatorias
  const createZip = async (productData, sourceCode = null) => {
    const zip = new JSZip();
    
    // Usar código fuente editado si está disponible, de lo contrario generar nuevo
    const htmlContent = sourceCode?.html 
      ? createProductPageHtml({ ...productData, sourceCode })
      : createProductPageHtml(productData);
    
    zip.file("index.html", htmlContent);
    
    // Si hay CSS y JS separados, agregarlos como archivos individuales
    if (sourceCode?.css) {
      zip.file("styles.css", sourceCode.css);
    }
    if (sourceCode?.js) {
      zip.file("script.js", sourceCode.js);
    }
    
    const folder = zip.folder("images");
    for (let i = 0; i < productData.generatedImages.length; i++) {
      const imgObj = productData.generatedImages[i];
      const mime = imgObj.image?.mimeType || "image/png";
      const data = imgObj.image?.data || "";
      const srcRaw = data.startsWith("data:") ? data : `data:${mime};base64,${data}`;
      const processed = await postProcessDataURL(srcRaw);
      const blob = dataURLToBlob(processed);
      if (blob) folder.file(`producto-${i + 1}.jpg`, blob);
    }
    return zip.generateAsync({ type: "blob" });
  };

  // ========= UI =========
  const HeaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.384,10.428A1.99,1.99,0,0,0,22,8.5,2,2,0,0,0,20,6.5H16.5V2H7.5V6.5H4a2,2,0,0,0-2,2,1.99,1.99,0,0,0,.616,1.928A2.012,2.012,0,0,0,2,12.5v7a2,2,0,0,0,2,2H20a2,2,0,0,0,2-2v-7a2.012,2.012,0,0,0-.616-2.072ZM8.5,3h7V6.5h-7ZM20,19.5H4v-7h16Z" />
      <path d="M12,14.5a2,2,0,1,0,2,2A2,2,0,0,0,12,14.5Z" />
    </svg>
  );

  const Loader = ({ message }) => (
    <div className="loading-overlay">
      <div className="spinner-triple">
        <div className="ring ring-1"></div>
        <div className="ring ring-2"></div>
        <div className="ring ring-3"></div>
      </div>
      <p className="loading-text">{message}</p>
    </div>
  );

  const ZoomModal = ({ src, onClose }) => {
    const modalRef = React.useRef(null);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    
    React.useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);
    
    const handleBackdropClick = (e) => {
      if (e.target === modalRef.current || e.target.closest('.lightbox-controls')) {
        onClose();
      }
    };
    
    const handleImageLoad = () => {
      setImageLoaded(true);
    };
    
    React.useEffect(() => {
      // Reset loaded state when src changes
      setImageLoaded(false);
    }, [src]);
    
    if (!src) return null;
    
    return (
      <div 
        ref={modalRef}
        className="fixed inset-0 z-[100] flex items-center justify-center cursor-zoom-out lightbox"
        onClick={handleBackdropClick}
        style={{
          background: 'radial-gradient(circle at center, rgba(4, 24, 71, 0.95) 0%, rgba(12, 20, 69, 0.98) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Efecto de vidrio esmerilado */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 mix-blend-overlay"></div>
          
          {/* Efecto de partículas sutiles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/3 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl"></div>
          </div>
          
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="spinner-triple">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
            </div>
          )}
          <img 
            src={src} 
            id="lightbox-img"
            className={`max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-cyan-500/30 relative z-10 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            alt="Zoomed product"
            style={{
              boxShadow: '0 0 60px rgba(46, 232, 255, 0.3), 0 0 100px rgba(168, 85, 247, 0.2)'
            }}
            onLoad={handleImageLoad}
          />
          <div className="lightbox-controls absolute top-4 right-4 flex gap-2 z-20">
            <button 
              className="text-white hover:text-cyan-300 focus:outline-none bg-gradient-to-br from-cyan-900/80 to-purple-900/80 rounded-full p-3 transition-all hover:from-cyan-700/90 hover:to-purple-700/90 hover:scale-110 border border-cyan-500/30 hover:border-cyan-300/50"
              onClick={onClose}
              aria-label="Cerrar zoom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProductForm = ({ onGenerate, disabled }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [referenceDesc, setReferenceDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [preserveLogo, setPreserveLogo] = useState(true);

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setError("La imagen es demasiado grande. Máximo 4MB.");
      return;
    }
    setError("");
    setImageFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !price || !imageFile) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    setError("");
    onGenerate(name, price, imageFile, referenceDesc, preserveLogo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300">Nombre del Producto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Precio (€)</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Descripción de Referencia (Opcional)</label>
        <textarea
          value={referenceDesc}
          onChange={(e) => setReferenceDesc(e.target.value)}
          rows="3"
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Ej: Zapatillas de running ligeras, con buena amortiguación."
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Imagen Casera del Producto</label>
        <div className="mt-2 flex justify-center rounded-md border-2 border-dashed border-gray-600 px-6 pt-5 pb-6">
          <div className="space-y-1 text-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Previsualización" className="mx-auto h-24 w-24 rounded-md object-cover" />
            ) : (
              <svg
                className="mx-auto h-12 w-12 text-gray-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <div className="flex text-sm text-gray-400 justify-center">
              <label htmlFor="product-image" className="relative cursor-pointer rounded-md font-medium text-indigo-400 hover:text-indigo-300">
                <span>Sube un archivo</span>
                <input
                  id="product-image"
                  name="product-image"
                  type="file"
                  className="sr-only"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  required
                />
              </label>
              <p className="pl-1">o arrástralo aquí</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, WEBP hasta 4MB</p>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="preserve-logo"
          name="preserve-logo"
          type="checkbox"
          checked={preserveLogo}
          onChange={(e) => setPreserveLogo(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="preserve-logo" className="ml-2 block text-sm text-gray-300">
          <span className="font-semibold">Preservar logos y branding</span> - Mantener todos los logos, marcas y texto exactamente como aparecen en la imagen original
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Generar Ficha de Producto
      </button>
    </form>
  );
};

  const EditImageModal = ({ isOpen, onClose, onEdit, onImprovePrompt, isLoading }) => {
    const [prompt, setPrompt] = useState("");
    const [error, setError] = useState("");
    const [isImproving, setIsImproving] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!prompt.trim()) {
        setError("Por favor, introduce un prompt para editar la imagen.");
        return;
      }
      setError("");
      onEdit(prompt);
    };

    const handleImprovePrompt = async () => {
      if (!prompt.trim()) {
        setError("Por favor, introduce un prompt antes de mejorarlo.");
        return;
      }
      setError("");
      setIsImproving(true);
      try {
        const improvedPrompt = await onImprovePrompt(prompt);
        setPrompt(improvedPrompt);
      } catch (e) {
        console.error("Error mejorando prompt:", e);
        setError("No se pudo mejorar el prompt. Por favor, inténtalo de nuevo.");
      } finally {
        setIsImproving(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <h3 className="modal-title">Editar Imagen</h3>
          <form onSubmit={handleSubmit}>
            <div className="modal-field">
              <label className="modal-label">
                Describe cómo quieres editar la imagen
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows="4"
                className="modal-textarea"
                placeholder="Ej: Cambia el fondo a un color azul brillante, haz que el producto parezca más brillante..."
              ></textarea>
            </div>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-buttons">
              <button
                type="button"
                onClick={handleImprovePrompt}
                disabled={isImproving || !prompt.trim()}
                className="modal-button modal-button-improve"
              >
                {isImproving ? "✨ Mejorando..." : "✨ Mejorar con IA"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="modal-button modal-button-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="modal-button modal-button-submit"
              >
                {isLoading ? "Editando..." : "Editar Imagen"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Vista previa que usa imágenes postprocesadas
  const ProductPreview = ({ productData, onReset, onDeleteImage, onEditImage, onUndoImage, onCompareImage }) => {
    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [isComparing, setIsComparing] = useState(false);
    const [compareIndex, setCompareIndex] = useState(0);
    const [zoomedImage, setZoomedImage] = useState(null);
    
    const getCurrentImage = () => {
      const imgObj = productData.generatedImages[mainImageIndex];
      if (!imgObj) return '';
      
      if (isComparing) {
        return imgObj.historyPreviewSrcs?.[compareIndex] || imgObj.previewSrc || imgObj.processedPreviewSrc || imgObj.thumbnail || '';
      }
      return imgObj.previewSrc || imgObj.processedPreviewSrc || imgObj.thumbnail || '';
    };
    
    const imageUrls = productData.generatedImages.map(imgObj => 
      imgObj.previewSrc || imgObj.processedPreviewSrc || imgObj.thumbnail || ''
    );
    
    const handleThumbnailClick = (index) => {
      setMainImageIndex(index);
      setIsComparing(false);
    };

    const handleDeleteImage = () => {
      onDeleteImage(mainImageIndex);
      if (mainImageIndex > 0 && mainImageIndex >= productData.generatedImages.length - 1) {
        setMainImageIndex(mainImageIndex - 1);
      }
      setIsComparing(false);
    };

    const handleEditImage = () => {
      onEditImage(mainImageIndex);
    };

    const handleUndoImage = () => {
      onUndoImage(mainImageIndex);
      setIsComparing(false);
    };

    const handleCompareImage = () => {
      const history = productData.generatedImages[mainImageIndex].historyPreviewSrcs || [];
      if (history.length > 1) {
        if (isComparing) {
          setCompareIndex((prev) => (prev > 0 ? prev - 1 : history.length - 1));
        } else {
          setCompareIndex(history.length - 2);
          setIsComparing(true);
        }
      }
    };

    // Nueva función para descargar la imagen actual
    const handleDownloadSingle = () => {
      const link = document.createElement('a');
      link.href = getCurrentImage();
      link.download = `imagen-producto-${mainImageIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const currentImage = productData.generatedImages[mainImageIndex];
    const hasHistory = currentImage ? (currentImage.historyPreviewSrcs?.length || 0) > 1 : false;
    const currentVersionLabel = isComparing && currentImage?.historyPreviewSrcs
      ? `Versión ${compareIndex + 1} de ${currentImage.historyPreviewSrcs.length}` 
      : `Versión actual`;

    // Verificar si hay imágenes
    const hasImages = productData.generatedImages && productData.generatedImages.length > 0;
    const currentImageSrc = getCurrentImage();
    
    return (
      <div className="bg-white text-gray-900 rounded-lg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden relative min-h-[300px] flex items-center justify-center">
                {hasImages && currentImageSrc ? (
                  <>
                    <img 
                      src={currentImageSrc} 
                      alt={`Imagen ${mainImageIndex + 1} de ${productData.name}`}
                      className="w-full h-auto aspect-square object-cover cursor-zoom-in"
                      onClick={() => setZoomedImage(currentImageSrc)}
                      title="Haz clic para ampliar"
                    />
                    {hasHistory && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                        {currentVersionLabel}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No hay imágenes disponibles para este producto</p>
                    <p className="text-sm mt-2">Las imágenes originales no se guardan en el historial para ahorrar espacio.</p>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-1">
                    {/* Botón de descarga añadido */}
                    <button
                     onClick={handleDownloadSingle}
                     className={`p-1.5 ${currentImageSrc ? 'bg-green-600 bg-opacity-80 hover:bg-opacity-100' : 'bg-gray-400 cursor-not-allowed'} text-white rounded focus:outline-none transition-all`}
                     title={currentImageSrc ? "Descargar imagen actual" : "No hay imagen para descargar"}
                     aria-label={currentImageSrc ? "Descargar imagen actual" : "No hay imagen para descargar"}
                     disabled={!currentImageSrc}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                   </button>
                   {hasHistory && (
                     <>
                        <button
                         onClick={handleCompareImage}
                         className={`p-1.5 bg-purple-600 bg-opacity-80 text-white rounded hover:bg-opacity-100 focus:outline-none transition-all`}
                         title={isComparing ? "Ver versión anterior" : "Comparar con versiones anteriores"}
                         aria-label={isComparing ? "Ver versión anterior" : "Comparar con versiones anteriores"}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                           <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                         </svg>
                       </button>
                        <button
                         onClick={handleUndoImage}
                         className="p-1.5 bg-orange-600 bg-opacity-80 text-white rounded hover:bg-opacity-100 focus:outline-none transition-all"
                         title="Deshacer última edición"
                         aria-label="Deshacer última edición"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                           <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                         </svg>
                       </button>
                     </>
                   )}
                    <button
                     onClick={handleEditImage}
                     className={`p-1.5 ${hasImages ? 'bg-blue-600 bg-opacity-80 hover:bg-opacity-100' : 'bg-gray-400 cursor-not-allowed'} text-white rounded focus:outline-none transition-all`}
                     title={hasImages ? "Editar imagen" : "No hay imágenes para editar"}
                     aria-label={hasImages ? "Editar imagen" : "No hay imágenes para editar"}
                     disabled={!hasImages}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                       <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                     </svg>
                   </button>
                    <button
                     onClick={handleDeleteImage}
                     className={`p-1.5 ${hasImages ? 'bg-red-600 bg-opacity-80 hover:bg-opacity-100' : 'bg-gray-400 cursor-not-allowed'} text-white rounded focus:outline-none transition-all`}
                     title={hasImages ? "Eliminar imagen" : "No hay imágenes para eliminar"}
                     aria-label={hasImages ? "Eliminar imagen" : "No hay imágenes para eliminar"}
                     disabled={!hasImages}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                     </svg>
                   </button>
                </div>
              </div>
              {hasImages ? (
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map((url, index) => (
                    url ? (
                      <img
                        key={index}
                        src={url}
                        alt={`Miniatura ${index + 1}`}
                        className={`w-full h-auto aspect-square object-cover cursor-pointer border-2 rounded ${
                          index === mainImageIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                        }`}
                        onClick={() => handleThumbnailClick(index)}
                      />
                    ) : (
                      <div
                        key={index}
                        className={`w-full h-auto aspect-square bg-gray-100 flex items-center justify-center border-2 rounded ${
                          index === mainImageIndex ? 'border-blue-500' : 'border-transparent'
                        }`}
                      >
                        <span className="text-gray-400 text-xs">Sin imagen</span>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-gray-500 text-sm">No hay miniaturas disponibles</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="mb-6">
                <h1 className="product-title-brush">{productData.name}</h1>
              </div>
              <p className="text-2xl text-green-600 font-semibold mb-6">{productData.price} €</p>
              <div>
                <h2 className="text-xl font-semibold border-b border-gray-300 pb-2 mb-4">Descripción</h2>
                <p className="leading-relaxed whitespace-pre-line">{productData.description}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modal de Zoom */}
        <ZoomModal src={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    );
  };

  const PreviewDisplay = ({ productData, zipBlob, onReset, onDeleteImage, onEditImage, onUndoImage, onCompareImage, onEditCode }) => {
    const handleDownload = () => {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ficha-producto.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Previsualización y Descarga</h2>
          <button
            onClick={onReset}
            className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            Crear Otro
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleDownload}
            className="w-full md:w-auto inline-flex justify-center items-center gap-2 py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Descargar Archivo .ZIP
          </button>
          
          {onEditCode && (
            <button
              onClick={onEditCode}
              className="w-full md:w-auto inline-flex justify-center items-center gap-2 py-3 px-6 border border-cyan-600 rounded-md shadow-sm text-base font-medium text-cyan-300 bg-cyan-900/30 hover:bg-cyan-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
              title="Editar código HTML/CSS/JS de esta ficha"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editar Código
            </button>
          )}
        </div>
        
        <ProductPreview 
          productData={productData} 
          onReset={onReset} 
          onDeleteImage={onDeleteImage}
          onEditImage={onEditImage}
          onUndoImage={onUndoImage}
          onCompareImage={onCompareImage}
        />
      </div>
    );
  };

  const App = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState(null);
    const [generatedData, setGeneratedData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState(null);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Cargar historial al montar - VERSIÓN SUPER SIMPLE
    React.useEffect(() => {
      // Cargar historial inmediatamente
      const savedHistory = getHistory();
      setHistory(savedHistory);
      
      // También cargar después de un breve delay por si acaso
      const timeoutId = setTimeout(() => {
        const refreshedHistory = getHistory();
        if (refreshedHistory.length > 0 && history.length === 0) {
          setHistory(refreshedHistory);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, []);

    // Guardar historial cuando cambia
    React.useEffect(() => {
      console.log('useEffect del historial cambiado. history:', history);
      console.log('history length:', history.length);
      saveHistory(history);
    }, [history]);

    // Debug: mostrar estado del historial
    console.log('App render - history items:', history.length);

    const handleGenerate = useCallback(async (name, price, imageFile, referenceDesc, preserveLogo = true) => {
  setIsLoading(true);
  setError(null);
  setGeneratedData(null);

  try {
    setLoadingMessage("Convirtiendo imagen.");
    const inline = await fileToBase64Part(imageFile);

    setLoadingMessage("Generando descripción.");
    const description = await api.describe(inline, referenceDesc);

    setLoadingMessage("Generando imágenes de producto.");
    const images = await api.generateImages(inline, setLoadingMessage);

    if (images.length === 0) {
      throw new Error("No se pudieron generar imágenes. Inténtalo de nuevo.");
    }

    // Crear estructura con historial para cada imagen
    const imagesWithHistory = images.map(img => ({ image: img, history: [img], preserveLogo: preserveLogo }));

    // Postprocesado filmic obligatorio
    setLoadingMessage("Aplicando acabado filmic.");
    await __ensureProcessedPreviews(imagesWithHistory);

    const productData = {
      name,
      price,
      description,
      generatedImages: imagesWithHistory,
      preserveLogo: preserveLogo
    };

    setLoadingMessage("Empaquetando ZIP.");
    const zipBlob = await createZip(productData);

    const productResult = {
      productData,
      zipBlob,
      originalImage: inline,
      preserveLogo: preserveLogo
    };

    // Guardar en historial - ahora con código fuente completo
    console.log('handleGenerate iniciado, guardando código fuente en historial');
    console.log('isLocalStorageAvailable:', isLocalStorageAvailable());
    
    // Guardar el código fuente completo en el historial
    const historyItem = saveSourceCodeToHistory(productResult);
    
    console.log('Guardando código fuente en historial. historyItem:', historyItem);
    setGeneratedData(productResult);
    
    if (historyItem) {
      setHistory(prev => [historyItem, ...prev]);
      console.log('Historial actualizado con nuevo item (con código fuente):', historyItem);
      // Mostrar el historial automáticamente cuando se añade un nuevo producto
      setShowHistory(true);
    } else {
      console.log('No se pudo guardar código fuente en historial');
      // Fallback: guardar versión básica
      const fallbackItem = addToHistory({
        name: name,
        price: price,
        description: description,
        preserveLogo: preserveLogo,
        timestamp: Date.now(),
        hasSourceCode: false,
        imagesCount: productData.generatedImages.length
      });
      if (fallbackItem) {
        setHistory(prev => [fallbackItem, ...prev]);
      }
    }
  } catch (e) {
    setError(e.message || "Error desconocido");
  } finally {
    setIsLoading(false);
  }
}, []);

    const handleReset = () => {
      setGeneratedData(null);
      setError(null);
    };

    const handleDeleteImage = useCallback((index) => {
      if (!generatedData) return;
      
      const newImages = [...generatedData.productData.generatedImages];
      newImages.splice(index, 1);
      
      if (newImages.length === 0) {
        setError("No puedes eliminar todas las imágenes. Debe quedar al menos una.");
        return;
      }
      
      const newProductData = { ...generatedData.productData, generatedImages: newImages };
      
      createZip(newProductData).then(zipBlob => {
        setGeneratedData({
          ...generatedData,
          productData: newProductData,
          zipBlob
        });
      });
    }, [generatedData]);

    const handleEditImage = useCallback((index) => {
      if (!generatedData) return;
      setEditingImageIndex(index);
      setIsEditModalOpen(true);
    }, [generatedData]);

    const handleEditSubmit = useCallback(async (prompt) => {
      if (!generatedData || editingImageIndex === null) return;
      
      setIsLoading(true);
      setLoadingMessage("Editando imagen...");
      
      try {
        const currentImage = generatedData.productData.generatedImages[editingImageIndex].image;
        const editedImage = await api.editImage(currentImage, prompt);
        
        const newImages = [...generatedData.productData.generatedImages];
        newImages[editingImageIndex] = { image: editedImage, history: [...newImages[editingImageIndex].history, editedImage] };
        await __ensureProcessedPreview(newImages[editingImageIndex]);
        
        const newProductData = { ...generatedData.productData, generatedImages: newImages };
        const zipBlob = await createZip(newProductData);
        
        setGeneratedData({
          ...generatedData,
          productData: newProductData,
          zipBlob
        });
        
        setIsEditModalOpen(false);
        setEditingImageIndex(null);
      } catch (e) {
        setError(e.message || "Error editando imagen");
      } finally {
        setIsLoading(false);
      }
    }, [generatedData, editingImageIndex]);

    const handleImprovePrompt = useCallback(async (prompt) => {
      return await api.improvePrompt(prompt);
    }, []);

    const handleUndoImage = useCallback((index) => {
      if (!generatedData) return;
      
      const newImages = [...generatedData.productData.generatedImages];
      const imageHistory = newImages[index].history;
      
      if (imageHistory.length > 1) {
        imageHistory.pop();
        newImages[index].image = imageHistory[imageHistory.length - 1];
        __ensureProcessedPreview(newImages[index]).then(() => {
          const newProductData = { ...generatedData.productData, generatedImages: newImages };
          createZip(newProductData).then(zipBlob => {
            setGeneratedData({
              ...generatedData,
              productData: newProductData,
              zipBlob
            });
          });
        });
      }
    }, [generatedData]);

    const handleCompareImage = useCallback((index) => {}, []);

    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [editingHistoryItem, setEditingHistoryItem] = useState(null);
    const [editedSourceCode, setEditedSourceCode] = useState({ html: '', css: '', js: '' });

    const handleHistoryItemClick = async (id, e) => {
      // Si se hace clic en el botón de editar código, no restaurar
      if (e && e.target.closest('.edit-code-btn')) {
        return;
      }
      
      console.log('handleHistoryItemClick called with id:', id);
      console.log('History items:', history);
      console.log('history length:', history.length);
      const item = history.find(h => h.id === id);
      console.log('Found item:', item);
      console.log('Item structure:', JSON.stringify(item, null, 2));
      
      if (item) {
        // Mostrar confirmación para restaurar
        const userConfirmed = confirm(
          `¿Restaurar producto "${item.name}"?\n\n` +
          `Precio: ${item.price} €\n` +
          `Imágenes: ${item.imagesCount || item.productData?.generatedImages?.length || 0}\n\n` +
          `Se restaurará la información del producto para que puedas verla y descargarla nuevamente.`
        );
        
        if (userConfirmed) {
          setIsLoading(true);
          setLoadingMessage(`Restaurando "${item.name}"...`);
          
          try {
            // Intentar restaurar desde el historial
            console.log('Calling restoreFromHistory with item:', item);
            const restoredData = await restoreFromHistory(item);
            console.log('Restored data:', restoredData);
            console.log('Restored productData:', restoredData?.productData);
            console.log('Restored generatedImages:', restoredData?.productData?.generatedImages);
            
            if (restoredData) {
              setGeneratedData(restoredData);
              setError(null);
              // Ocultar el historial después de restaurar
              setShowHistory(false);
              alert(`✅ Producto "${item.name}" restaurado correctamente.\n\nPuedes ver la información del producto y descargar la ficha editada.`);
            }
          } catch (error) {
            console.error('Error restaurando desde historial:', error);
            setError(`No se pudo restaurar el producto: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    const handleEditCode = (item) => {
      console.log('Opening code editor for:', item);
      setEditingHistoryItem(item);
      
      // Extraer el código fuente si está disponible
      if (item.sourceCode) {
        setEditedSourceCode(item.sourceCode);
      } else if (item.htmlContent) {
        // Intentar extraer código de htmlContent si existe
        const extracted = extractSourceCode(item.productData || {
          name: item.name,
          price: item.price,
          description: item.description,
          preserveLogo: item.preserveLogo || true,
          generatedImages: item.productData?.generatedImages || []
        }, item.htmlContent);
        setEditedSourceCode(extracted);
      } else {
        // Inicializar con código vacío
        setEditedSourceCode({ html: '', css: '', js: '' });
      }
      
      setIsCodeEditorOpen(true);
    };

    const handleSaveEditedCode = () => {
      if (!editingHistoryItem) return;
      
      // Actualizar el historial con el código editado
      const updatedHistory = history.map(item => {
        if (item.id === editingHistoryItem.id) {
          const updatedItem = {
            ...item,
            sourceCode: editedSourceCode,
            timestamp: Date.now() // Actualizar timestamp para indicar modificación
          };
          
          // Actualizar productData con el nuevo sourceCode si existe
          if (item.productData) {
            updatedItem.productData = {
              ...item.productData,
              sourceCode: editedSourceCode
            };
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Guardar en localStorage
      saveHistory(updatedHistory);
      setHistory(updatedHistory);
      
      // Cerrar editor
      setIsCodeEditorOpen(false);
      setEditingHistoryItem(null);
      
      alert('✅ Código guardado correctamente. Puedes descargar la versión editada desde el historial.');
    };

    const handleEditCodeFromPreview = () => {
      if (!generatedData) return;
      
      // Crear un item temporal para editar el código actual
      const tempItem = {
        id: 'preview-' + Date.now(),
        name: generatedData.productData.name,
        price: generatedData.productData.price,
        description: generatedData.productData.description,
        productData: generatedData.productData,
        timestamp: Date.now(),
        sourceCode: generatedData.productData.sourceCode || extractSourceCode(createProductPageHtml(generatedData.productData))
      };
      
      setEditingHistoryItem(tempItem);
      setEditedSourceCode(tempItem.sourceCode);
      setIsCodeEditorOpen(true);
    };

    const handleDeleteFromHistory = (e, id) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este producto del historial?')) {
        deleteFromHistory(id);
        setHistory(prev => prev.filter(h => h.id !== id));
      }
    };

    const handleClearHistory = () => {
      console.log('handleClearHistory called');
      console.log('isLocalStorageAvailable:', isLocalStorageAvailable());
      if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
        console.log('Limpiando historial');
        clearAllHistory();
        setHistory([]);
      }
    };

    const handleDebugHistory = () => {
      console.log('=== DEBUG HISTORIAL ===');
      console.log('Estado history:', history);
      console.log('Estado history length:', history.length);
      console.log('isLocalStorageAvailable:', isLocalStorageAvailable());
      
      let localStorageData = null;
      let parseError = null;
      
      if (isLocalStorageAvailable()) {
        const saved = localStorage.getItem(HISTORY_KEY);
        console.log('localStorage.getItem(HISTORY_KEY):', saved ? `[${saved.length} chars]` : 'null');
        if (saved) {
          try {
            localStorageData = JSON.parse(saved);
            console.log('Historial parseado:', localStorageData);
            console.log('Historial parseado length:', localStorageData.length);
          } catch (e) {
            parseError = e;
            console.error('Error parseando historial:', e);
            console.error('Datos corruptos (primeros 500 chars):', saved.substring(0, 500));
          }
        }
      }
      
      // Mostrar alerta con información
      let alertMessage = `Historial debug:\n\n` +
        `Estado React: ${history.length} items\n` +
        `localStorage: ${isLocalStorageAvailable() ? 'Disponible' : 'No disponible'}\n` +
        `Clave: ${HISTORY_KEY}\n`;
      
      if (parseError) {
        alertMessage += `\n❌ ERROR parseando: ${parseError.message}\n`;
        alertMessage += `\n¿Quieres intentar reparar el historial?`;
        
        if (confirm(alertMessage)) {
          handleRepairHistory();
        }
      } else if (localStorageData) {
        alertMessage += `Items en localStorage: ${localStorageData.length}\n`;
        alertMessage += `\nEstado sincronizado: ${history.length === localStorageData.length ? '✅ Sí' : '❌ No'}`;
        alert(alertMessage);
      } else {
        alertMessage += `Items en localStorage: No hay datos`;
        alert(alertMessage);
      }
    };

    const handleRepairHistory = () => {
      if (!isLocalStorageAvailable()) {
        alert('localStorage no disponible, no se puede reparar');
        return;
      }
      
      try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (!saved) {
          alert('No hay datos en localStorage para reparar');
          return;
        }
        
        // Intentar diferentes estrategias de reparación
        let repairedData = [];
        
        try {
          // Intento 1: Parsear normalmente
          repairedData = JSON.parse(saved);
          if (!Array.isArray(repairedData)) {
            throw new Error('No es un array');
          }
        } catch (e1) {
          console.log('Intento 1 falló, intentando estrategia 2...', e1);
          
          try {
            // Intento 2: Limpiar caracteres inválidos
            const cleaned = saved
              .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
              .replace(/,\s*]/g, ']') // Remover comas antes de cerrar array
              .replace(/,\s*}/g, '}') // Remover comas antes de cerrar objeto
              .replace(/\[\s*,/g, '[') // Remover comas después de abrir array
              .replace(/{\s*,/g, '{'); // Remover comas después de abrir objeto
            
            repairedData = JSON.parse(cleaned);
            if (!Array.isArray(repairedData)) {
              throw new Error('No es un array después de limpiar');
            }
          } catch (e2) {
            console.log('Intento 2 falló, intentando estrategia 3...', e2);
            
            try {
              // Intento 3: Extraer arrays manualmente
              const arrayMatch = saved.match(/\[[\s\S]*\]/);
              if (arrayMatch) {
                repairedData = JSON.parse(arrayMatch[0]);
                if (!Array.isArray(repairedData)) {
                  throw new Error('No es un array después de extraer');
                }
              } else {
                throw new Error('No se encontró array en los datos');
              }
            } catch (e3) {
              console.log('Intento 3 falló, datos irreparables', e3);
              alert('No se pudo reparar el historial. Se creará uno nuevo vacío.');
              repairedData = [];
            }
          }
        }
        
        // Filtrar items inválidos
        const validItems = repairedData.filter(item => 
          item && 
          typeof item === 'object' && 
          (item.name || item.id)
        );
        
        // Guardar historial reparado
        localStorage.setItem(HISTORY_KEY, JSON.stringify(validItems));
        setHistory(validItems);
        
        alert(`✅ Historial reparado\n\n` +
          `Items originales: ${repairedData.length}\n` +
          `Items válidos: ${validItems.length}\n` +
          `Items descartados: ${repairedData.length - validItems.length}`);
        
      } catch (error) {
        console.error('Error reparando historial:', error);
        alert(`❌ Error reparando historial: ${error.message}`);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl">
          {isLoading && <Loader message={loadingMessage} />}

            {/* Botón para mostrar/ocultar historial */}
            {history.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {showHistory ? 'Ocultar Historial' : 'Ver Historial'} ({history.length})
                </button>
              </div>
            )}
              {history.length === 0 && (
                <div className="mb-6 text-center text-gray-400">
                  No hay productos en el historial. Los productos generados aparecerán aquí.
                  <div className="text-xs mt-2 text-yellow-500">
                    Debug: history.length = {history.length}
                  </div>
                </div>
              )}

           <header className="text-center mb-8">
             <div className="flex justify-center items-center gap-4">
               <HeaderIcon />
               <h1 className="text-3xl font-bold text-white">Generador de Ficha de Producto AI</h1>
             </div>
             <p className="text-gray-400 mt-2">
               Transforma una foto casera en una ficha de producto profesional lista para descargar.
             </p>
             
             {/* Botón de debug global - SIEMPRE visible */}
             <div className="mt-4 flex justify-center">
               <button
                 onClick={handleDebugHistory}
                 className="text-sm text-gray-400 hover:text-yellow-300 flex items-center gap-1 border border-gray-700 px-3 py-1 rounded"
                 title="Debug del sistema de historial"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
                 Debug Historial
               </button>
             </div>
           </header>

          <main>
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* ===== SECCIÓN DE HISTORIAL - MEJORADA ===== */}
            {/* Los botones de debug SIEMPRE están visibles si hay algo en localStorage */}
            {(history.length > 0 || (isLocalStorageAvailable() && localStorage.getItem(HISTORY_KEY))) ? (
              <>
                {/* Título y botones - SIEMPRE visibles si hay datos */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    Historial de Generaciones ({history.length > 0 ? history.length : '?'})
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDebugHistory}
                      className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      title="Debug del historial"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Debug
                    </button>
                    <button
                      onClick={() => {
                        const savedHistory = getHistory();
                        setHistory(savedHistory);
                        alert(`✅ Historial recargado\n\nItems: ${savedHistory.length}`);
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      title="Recargar historial desde localStorage"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Recargar
                    </button>
                    <button
                      onClick={handleClearHistory}
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Contenido del historial - solo si hay items cargados */}
                {history.length > 0 ? (
                  <>
                    <div 
                      id="history-section" 
                      className={`mb-8 transition-all duration-300 ease-in-out ${showHistory ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                    >
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {history.map((item, index) => (
                          <div
                            key={item.id}
                            onClick={() => handleHistoryItemClick(item.id)}
                            className={`history-item bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition-all border border-gray-600 hover:border-gray-500 ${index === 0 ? 'ring-1 ring-cyan-500/30' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="history-thumbnail w-16 h-16 rounded overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
                                {item.imageThumbnails?.[0] || item.productData?.imageThumbnails?.[0] ? (
                                  <img 
                                    src={item.imageThumbnails?.[0] || item.productData?.imageThumbnails?.[0]} 
                                    alt={`Miniatura ${item.name}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.parentElement.innerHTML = `
                                        <div class="text-cyan-300 text-xs text-center p-2">
                                          <span class="text-lg">${index === 0 ? '🆕' : '📷'}</span><br/>
                                          <span class="text-[10px]">${index === 0 ? 'Nuevo' : 'Producto'}</span>
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="text-cyan-300 text-xs text-center p-2">
                                    <span className="text-lg">${index === 0 ? '🆕' : '📷'}</span><br/>
                                    <span className="text-[10px]">${index === 0 ? 'Nuevo' : 'Producto'}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                                    <p className="text-xs text-cyan-300 mt-1 font-medium">{item.price} €</p>
                                  </div>
                                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                    #{history.length - index}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.description?.substring(0, 120) || ''}</p>
                                <div className="flex justify-between items-center mt-3">
                                  <p className="text-xs text-gray-500">{formatDate(item.timestamp)}</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCode(item);
                                      }}
                                      className="edit-code-btn text-xs text-cyan-400 hover:text-cyan-300 py-1 px-2 rounded bg-cyan-900/30 hover:bg-cyan-900/50 transition-colors flex items-center gap-1"
                                      title="Editar código HTML/CSS/JS"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                      Editar Código
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteFromHistory(e, item.id)}
                                      className="text-xs text-red-400 hover:text-red-300 py-1 px-2 rounded bg-red-900/30 hover:bg-red-900/50 transition-colors flex items-center gap-1"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                    <div className="text-yellow-300 text-center">
                      <p className="font-medium">⚠️ Historial detectado en almacenamiento</p>
                      <p className="text-sm mt-1">Pero no se pudo cargar en la interfaz.</p>
                      <button
                        onClick={() => {
                          const savedHistory = getHistory();
                          setHistory(savedHistory);
                        }}
                        className="mt-3 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded text-sm font-medium"
                      >
                        Haz clic aquí para forzar la carga
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {!generatedData ? (
              <ProductForm onGenerate={handleGenerate} disabled={isLoading} />
            ) : (
              <PreviewDisplay
                productData={generatedData.productData}
                zipBlob={generatedData.zipBlob}
                onReset={handleReset}
                onDeleteImage={handleDeleteImage}
                onEditImage={handleEditImage}
                onUndoImage={handleUndoImage}
                onCompareImage={handleCompareImage}
                onEditCode={handleEditCodeFromPreview}
              />
            )}
          </main>
        </div>
        
        <EditImageModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEdit={handleEditSubmit}
          onImprovePrompt={handleImprovePrompt}
          isLoading={isLoading}
        />

        <CodeEditorModal
          isOpen={isCodeEditorOpen}
          onClose={() => setIsCodeEditorOpen(false)}
          onSave={handleSaveEditedCode}
          sourceCode={editedSourceCode}
          onSourceCodeChange={setEditedSourceCode}
          productName={editingHistoryItem?.name}
        />
      </div>
    );
  };

  const CodeEditorModal = ({ isOpen, onClose, onSave, sourceCode, onSourceCodeChange, productName }) => {
    const [activeTab, setActiveTab] = useState('html');
    
    if (!isOpen) return null;

    const getActiveCode = () => {
      switch (activeTab) {
        case 'html': return sourceCode.html;
        case 'css': return sourceCode.css;
        case 'js': return sourceCode.js;
        default: return '';
      }
    };

    const handleCodeChange = (e) => {
      const newCode = e.target.value;
      onSourceCodeChange({
        ...sourceCode,
        [activeTab]: newCode
      });
    };

    return ReactDOM.createPortal(
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-700">
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white">Editor de Código</h2>
              <p className="text-gray-400 text-sm mt-1">
                Editando: <span className="text-cyan-300">{productName || 'Producto'}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Cerrar editor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Pestañas */}
            <div className="flex border-b border-gray-800 bg-gray-800/50">
              {['html', 'css', 'js'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab 
                    ? 'text-cyan-300 border-b-2 border-cyan-400 bg-gray-900' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0 relative">
              <textarea
                value={getActiveCode()}
                onChange={handleCodeChange}
                className="w-full h-full bg-gray-950 text-gray-100 font-mono text-sm p-6 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                spellCheck="false"
                placeholder={`Escribe tu código ${activeTab.toUpperCase()} aquí...`}
                style={{ tabSize: 2 }}
              />
              <div className="absolute top-4 right-4 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
                {getActiveCode().length} caracteres
              </div>
            </div>

            {/* Información y acciones */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  <p>💡 Puedes editar el código HTML, CSS y JavaScript directamente.</p>
                  <p className="mt-1">Los cambios se guardarán en el historial y estarán disponibles para descargar.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onSave}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
})();