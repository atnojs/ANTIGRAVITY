/* =========================================================
   Creador de Memes IA — app.js v4
   Sliders color/tamaño/interlineado, 20%-60%-20%, subir imagen
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // ===== OVERLAY =====
  function showOverlay(statusMsg) {
    var t = $("loading-text"), s = $("secondary-status"), o = $("loading-overlay");
    if (t) t.textContent = "IA generando lo solicitado...";
    if (s) s.textContent = statusMsg || "Procesando solicitud...";
    if (o) { o.classList.remove("hidden"); o.style.display = "flex"; }
    document.body.style.overflow = "hidden";
  }
  function hideOverlay() {
    var o = $("loading-overlay");
    if (o) { o.classList.add("hidden"); o.style.display = "none"; }
    document.body.style.overflow = "";
  }

  // ===== TOAST =====
  function showToast(msg, success) {
    var t = $("toast"), m = $("toast-message");
    m.textContent = msg;
    t.classList.remove("hidden", "success");
    if (success) t.classList.add("success");
    t.classList.add("show");
    clearTimeout(t._timeout);
    t._timeout = setTimeout(function () { t.classList.remove("show"); }, 3500);
  }

  // ===== STATE =====
  var state = {
    aspectRatio: "1:1",
    resolution: 1024,
    quality: "pro",
    textColor: "rgb(0,255,255)",   // default cyan (position 50 on slider)
    fontSize: 120,
    lineSpacing: 1.15,       // multiplier
    enhancedPrompt: "",
    generatedImage: null,
    cleanFluxImage: null,
    memeDataUrl: null
  };

  // ===== TOGGLE BUTTONS =====
  function initToggleGroup(groupId, onChange) {
    var group = $(groupId);
    if (!group) return;
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      var buttons = group.querySelectorAll(".toggle-btn");
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      onChange(btn);
    });
  }

  initToggleGroup("ar-selector", function (btn) { state.aspectRatio = btn.getAttribute("data-ar"); });
  initToggleGroup("res-selector", function (btn) { state.resolution = parseInt(btn.getAttribute("data-res"), 10); });
  initToggleGroup("quality-selector", function (btn) { state.quality = btn.getAttribute("data-quality"); });

  // ===== COLOR SLIDER (0=white → 50=red → 100=black through full spectrum) =====
  var colorSlider = $("color-slider");

  // Map slider position (0-100) to a color: white → colors → black
  function sliderToColor(val) {
    // Segments: 0=white, 10=red, 20=orange, 30=yellow, 40=green, 50=cyan, 60=blue, 70=purple, 80=magenta, 90=dark red, 100=black
    var stops = [
      { pos: 0,   r: 255, g: 255, b: 255 }, // white
      { pos: 10,  r: 255, g: 0,   b: 0   }, // red
      { pos: 20,  r: 255, g: 136, b: 0   }, // orange
      { pos: 30,  r: 255, g: 255, b: 0   }, // yellow
      { pos: 40,  r: 0,   g: 255, b: 0   }, // green
      { pos: 50,  r: 0,   g: 255, b: 255 }, // cyan
      { pos: 60,  r: 0,   g: 0,   b: 255 }, // blue
      { pos: 70,  r: 128, g: 0,   b: 255 }, // purple
      { pos: 80,  r: 255, g: 0,   b: 255 }, // magenta
      { pos: 90,  r: 128, g: 0,   b: 0   }, // dark red
      { pos: 100, r: 0,   g: 0,   b: 0   }  // black
    ];

    // Find two nearest stops
    var lower = stops[0], upper = stops[stops.length - 1];
    for (var i = 0; i < stops.length - 1; i++) {
      if (val >= stops[i].pos && val <= stops[i + 1].pos) {
        lower = stops[i]; upper = stops[i + 1]; break;
      }
    }
    var range = upper.pos - lower.pos;
    var t = range === 0 ? 0 : (val - lower.pos) / range;
    var r = Math.round(lower.r + (upper.r - lower.r) * t);
    var g = Math.round(lower.g + (upper.g - lower.g) * t);
    var b = Math.round(lower.b + (upper.b - lower.b) * t);
    return { r: r, g: g, b: b, hex: "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1) };
  }

  colorSlider.addEventListener("input", function () {
    var val = parseInt(colorSlider.value, 10);
    var color = sliderToColor(val);
    state.textColor = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
    // Update thumb color via CSS variable
    colorSlider.style.setProperty("--thumb-color", color.hex);
    if (state.generatedImage) drawMemeOnCanvas();
  });

  var sizeSlider = $("size-slider");
  var sizeVal = $("size-val");
  sizeSlider.addEventListener("input", function () {
    state.fontSize = parseInt(sizeSlider.value, 10);
    if (sizeVal) sizeVal.textContent = state.fontSize + "px";
    if (state.generatedImage) drawMemeOnCanvas();
  });

  var spacingSlider = $("spacing-slider");
  var spacingVal = $("spacing-val");
  spacingSlider.addEventListener("input", function () {
    state.lineSpacing = parseInt(spacingSlider.value, 10) / 100;
    if (spacingVal) spacingVal.textContent = Math.round(state.lineSpacing * 100) + "%";
    if (state.generatedImage) drawMemeOnCanvas();
  });

  // Text inputs re-render canvas on change
  $("top-text").addEventListener("input", function () { if (state.generatedImage) drawMemeOnCanvas(); });
  $("bottom-text").addEventListener("input", function () { if (state.generatedImage) drawMemeOnCanvas(); });

  // ===== FILE UPLOAD =====
  $("file-input").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (!file.type.match(/image\//)) { showToast("Selecciona un archivo de imagen.", false); return; }

    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      var img = new Image();
      img.onload = function () {
        state.generatedImage = img;
        state.cleanFluxImage = dataUrl;
        $("meme-idea").value = "(Imagen subida desde tu PC)";
        $("final-prompt").value = "";
        $("enhanced-prompt-area").classList.add("hidden");
        drawMemeOnCanvas();
        $("result-section").classList.remove("hidden");
        $("result-section").scrollIntoView({ behavior: "smooth", block: "center" });
        // Save uploaded image to history for reuse
        saveToHistory(dataUrl, "(Imagen subida)");
        showToast("¡Imagen cargada y guardada en historial!", true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    this.value = ""; // allow re-upload same file
  });

  // ===== IDEA ALEATORIA =====
  $("random-idea-btn").addEventListener("click", function () {
    var btn = $("random-idea-btn");
    var status = $("enhance-status");
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ Generando...";
    status.textContent = "Creando idea aleatoria...";

    var systemPrompt = [
      "Eres un asistente creativo especializado en generar ideas de memes virales en español.",
      "",
      "Tu tarea: inventar un meme COMPLETO incluyendo:",
      "1. Una idea/concepto visual para la imagen base (describe la escena que FLUX debe generar).",
      "2. El texto superior del meme (frase corta e impactante, máximo 10 palabras).",
      "3. El texto inferior del meme (frase corta que remata, máximo 10 palabras).",
      "",
      "REGLAS OBLIGATORIAS:",
      "- TODO debe estar en ESPAÑOL.",
      "- Los textos deben ser graciosos, actuales, con gancho viral.",
      "- La idea visual debe ser FOTORREALISTA, apta para generar con FLUX.",
      "- IMPORTANTE: La imagen NO debe contener NINGÚN texto, letra, palabra ni rótulo. La imagen debe estar completamente libre de texto.",
      "- El prompt de imagen NO debe incluir los textos del meme, solo describir la escena visual.",
      "- Incluye al final del prompt visual: 'no text, no words, no letters, no labels, no signs, clean image, meme format, viral style, high contrast, bold composition, dramatic lighting'.",
      "- NO uses personajes famosos ni marcas registradas.",
      "",
      "FORMATO DE RESPUESTA (respeta EXACTAMENTE este JSON):",
      "{",
      '  "idea": "descripción breve de la idea (1-2 frases)",',
      '  "prompt_imagen": "prompt detallado para FLUX (en español, 100-250 palabras)",',
      '  "texto_superior": "FRASE SUPERIOR EN MAYÚSCULAS",',
      '  "texto_inferior": "FRASE INFERIOR EN MAYÚSCULAS"',
      "}",
      "",
      "Responde ÚNICAMENTE con el JSON, sin markdown, sin explicaciones."
    ].join("\n");

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "openrouter",
        system: systemPrompt,
        prompt: "Genera una idea de meme viral completamente nueva y original. Sé creativo, sorprendente. Elige un tema actual o una situación cotidiana relatable. Todo en español.",
        model: "openai/gpt-4o-mini",
        temperature: 1.0,
        max_tokens: 800
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false;
      btn.textContent = originalText;
      if (data && data.success && data.text) {
        try {
          var raw = data.text.trim();
          raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          var parsed = JSON.parse(raw);
          $("meme-idea").value = parsed.idea || "";
          $("final-prompt").value = parsed.prompt_imagen || "";
          $("top-text").value = parsed.texto_superior || "";
          $("bottom-text").value = parsed.texto_inferior || "";
          $("enhanced-prompt-area").classList.remove("hidden");
          state.enhancedPrompt = parsed.prompt_imagen || "";
          status.textContent = "✅ ¡Idea generada!";
          setTimeout(function () { status.textContent = ""; }, 4000);
        } catch (e) {
          $("meme-idea").value = raw;
          $("final-prompt").value = raw;
          $("enhanced-prompt-area").classList.remove("hidden");
          state.enhancedPrompt = raw;
          $("top-text").value = ""; $("bottom-text").value = "";
          status.textContent = "✅ Idea generada (edita el prompt)";
          setTimeout(function () { status.textContent = ""; }, 4000);
        }
      } else {
        var errMsg = (data && data.error) ? data.error : "Error desconocido";
        showToast("Error al generar idea: " + errMsg, false);
        status.textContent = "❌ Error";
      }
    })
    .catch(function (err) {
      btn.disabled = false; btn.textContent = originalText;
      showToast("Fallo de conexión: " + err.message, false);
      status.textContent = "❌ Error";
    });
  });

  // ===== PROMPT ENHANCEMENT =====
  $("enhance-prompt-btn").addEventListener("click", function () {
    var idea = $("meme-idea").value.trim();
    if (!idea) { showToast("Escribe primero la idea del meme.", false); return; }
    var btn = $("enhance-prompt-btn"), status = $("enhance-status");
    btn.disabled = true; status.textContent = "Mejorando prompt...";

    var systemPrompt = [
      "Eres un experto en crear prompts para generación de imágenes con FLUX AI.",
      "Convierte la idea en un prompt detallado en ESPAÑOL.",
      "",
      "REGLAS:",
      "1. Describe la escena completa en español: sujeto, acción, entorno, iluminación, estilo.",
      "2. IMPORTANTE: La imagen NO debe contener NINGÚN texto, letra ni palabra. Imagen completamente limpia.",
      "3. Añade al final: 'no text, no words, no labels, clean image, meme format, viral style, high contrast, bold composition, dramatic lighting'.",
      "4. Estilo fotorrealista o semi-fotorrealista, NUNCA cartoon.",
      "5. Entrega ÚNICAMENTE el prompt final en español, sin comillas, sin introducción.",
      "6. Máximo 250 palabras."
    ].join("\n");

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "openrouter",
        system: systemPrompt,
        prompt: "Convierte esta idea en un prompt en español para FLUX:\\n\\n\"" + idea + "\"\\n\\nEntrega solo el prompt final.",
        model: "openai/gpt-4o-mini",
        temperature: 0.7, max_tokens: 600
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false;
      if (data && data.success && data.text) {
        state.enhancedPrompt = data.text.trim();
        $("final-prompt").value = state.enhancedPrompt;
        $("enhanced-prompt-area").classList.remove("hidden");
        status.textContent = "✅ Prompt mejorado";
        setTimeout(function () { status.textContent = ""; }, 3000);
      } else {
        showToast("Error al mejorar prompt: " + ((data && data.error) || "Error desconocido"), false);
        status.textContent = "❌ Error";
      }
    })
    .catch(function (err) {
      btn.disabled = false;
      showToast("Fallo de conexión: " + err.message, false);
      status.textContent = "❌ Error";
    });
  });

  // ===== GENERATE MEME =====
  $("generate-btn").addEventListener("click", function () {
    var prompt = $("final-prompt").value.trim() || $("meme-idea").value.trim();
    if (!prompt) { showToast("Escribe una idea o genera una aleatoria primero.", false); return; }

    var btn = $("generate-btn"), btnText = $("generate-btn-text"), spinner = $("generate-spinner");
    btn.disabled = true; btnText.textContent = "GENERANDO..."; spinner.classList.remove("hidden");
    showOverlay("Generando imagen base con FLUX...");

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate", prompt: prompt,
        quality: state.quality, aspectRatio: state.aspectRatio,
        resolution: state.resolution, output_format: "jpeg"
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false; btnText.textContent = "GENERAR MEME";
      spinner.classList.add("hidden"); hideOverlay();

      if (data && data.success && data.dataUrl) {
        state.cleanFluxImage = data.dataUrl;
        var img = new Image();
        img.onload = function () {
          state.generatedImage = img;
          drawMemeOnCanvas();
          $("result-section").classList.remove("hidden");
          $("result-section").scrollIntoView({ behavior: "smooth", block: "center" });
          saveToHistory(data.dataUrl, prompt);
        };
        img.onerror = function () { showToast("Error al cargar la imagen generada.", false); };
        img.src = data.dataUrl;
      } else {
        showToast("Error al generar: " + ((data && data.error) || "Error desconocido"), false);
      }
    })
    .catch(function (err) {
      btn.disabled = false; btnText.textContent = "GENERAR MEME";
      spinner.classList.add("hidden"); hideOverlay();
      showToast("Fallo de conexión: " + err.message, false);
    });
  });

  // ===== CANVAS MEME (20% top, 60% middle free, 20% bottom) =====
  function drawMemeOnCanvas() {
    if (!state.generatedImage) return;

    var canvas = $("meme-canvas");
    var img = state.generatedImage;
    var topTextRaw = $("top-text").value.trim().toUpperCase();
    var bottomTextRaw = $("bottom-text").value.trim().toUpperCase();

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Text color from state (set by slider)
    var textColor = state.textColor;

    // Zone boundaries: top 20%, bottom 20%
    var topZone = canvas.height * 0.20;
    var bottomZoneStart = canvas.height * 0.80;
    var paddingH = canvas.width * 0.04;

    function wrapText(ctx, text, maxWidth) {
      var words = text.split(" ");
      var lines = [];
      var currentLine = "";
      for (var i = 0; i < words.length; i++) {
        var testLine = currentLine ? currentLine + " " + words[i] : words[i];
        if (ctx.measureText(testLine).width > maxWidth && currentLine !== "") {
          lines.push(currentLine);
          currentLine = words[i];
        } else { currentLine = testLine; }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }

    // Fit text — priority: fill width, max 3 lines, zone height is soft limit
    function fitText(text, maxWidth, zoneHeight, baseSize) {
      var fs = baseSize;
      ctx.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
      var lines = wrapText(ctx, text, maxWidth);

      // If more than 3 lines, reduce font until exactly 3 lines (or fewer)
      while (lines.length > 3 && fs > 16) {
        fs -= 2;
        ctx.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
        lines = wrapText(ctx, text, maxWidth);
      }

      // If 3 lines overflow zone too much (>1.4x), reduce a bit more
      var totalH = lines.length * fs * state.lineSpacing;
      if (totalH > zoneHeight * 1.5 && fs > 18) {
        var targetFs = Math.floor(zoneHeight * 1.5 / (lines.length * state.lineSpacing));
        fs = Math.max(18, Math.min(fs, targetFs));
        ctx.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
        lines = wrapText(ctx, text, maxWidth);
      }

      // Ensure no single word wider than maxWidth
      var ok = false;
      while (!ok && fs > 12) {
        ok = true;
        ctx.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
        var ck = wrapText(ctx, text, maxWidth);
        for (var l = 0; l < ck.length; l++) {
          if (ctx.measureText(ck[l]).width > maxWidth) { ok = false; break; }
        }
        if (!ok) fs -= 1;
      }

      ctx.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
      return { lines: wrapText(ctx, text, maxWidth), fontSize: fs };
    }

    ctx.fillStyle = textColor;
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.85)";

    function drawTextLines(lines, fontSize, startY) {
      ctx.font = "900 " + fontSize + "px Impact, 'Arial Black', sans-serif";
      ctx.lineWidth = Math.max(2, fontSize * 0.08);
      ctx.shadowBlur = fontSize * 0.14;
      for (var i = 0; i < lines.length; i++) {
        var y = startY + i * (fontSize * state.lineSpacing);
        ctx.strokeText(lines[i], canvas.width / 2, y);
        ctx.fillText(lines[i], canvas.width / 2, y);
      }
    }

    // Top text — constrained to top 20%
    if (topTextRaw) {
      var topFit = fitText(topTextRaw, canvas.width - paddingH * 2, topZone, state.fontSize);
      var topTotalH = topFit.lines.length * topFit.fontSize * state.lineSpacing;
      var topCenteredY = (topZone - topTotalH) / 2;
      if (topCenteredY < paddingH * 0.3) topCenteredY = paddingH * 0.3;
      drawTextLines(topFit.lines, topFit.fontSize, topCenteredY);
    }

    // Bottom text — constrained to bottom 20%
    if (bottomTextRaw) {
      var botFit = fitText(bottomTextRaw, canvas.width - paddingH * 2, canvas.height - bottomZoneStart, state.fontSize);
      var botTotalH = botFit.lines.length * botFit.fontSize * state.lineSpacing;
      var botZoneH = canvas.height - bottomZoneStart;
      var botCenteredY = bottomZoneStart + (botZoneH - botTotalH) / 2;
      if (botCenteredY < bottomZoneStart) botCenteredY = bottomZoneStart + 2;
      drawTextLines(botFit.lines, botFit.fontSize, botCenteredY);
    }

    ctx.shadowBlur = 0;
    state.memeDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  }

  // ===== DOWNLOAD =====
  $("download-btn").addEventListener("click", function () {
    if (!state.memeDataUrl) { showToast("Genera un meme primero.", false); return; }
    var a = document.createElement("a");
    a.href = state.memeDataUrl;
    a.download = "meme_" + Date.now() + ".jpg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  // ===== HISTORY =====
  var history = new HistoryManager("creador_memes");

  function saveToHistory(dataUrl, prompt) {
    var canvas = $("meme-canvas");
    var memeDataUrl = canvas ? canvas.toDataURL("image/jpeg", 0.85) : dataUrl;
    history.save({
      type: "meme",
      data: {
        prompt: prompt,
        topText: $("top-text").value,
        bottomText: $("bottom-text").value,
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        quality: state.quality,
        cleanFluxImage: dataUrl
      },
      imageData: memeDataUrl
    }).then(function () { loadHistory(); })
    .catch(function (err) { console.error("Error guardando historial:", err); });
  }

  function loadHistory() {
    history.load().then(function (items) {
      renderHistory(items);
      if (items.length > 0) $("history-section").classList.remove("hidden");
    }).catch(function () {});
  }

  function reuseImage(item) {
    var cleanUrl = (item.data && item.data.cleanFluxImage) ? item.data.cleanFluxImage : (item.imageUrl || "");
    if (!cleanUrl) { showToast("No se puede recuperar la imagen base.", false); return; }
    var reuseImg = new Image();
    reuseImg.onload = function () {
      state.generatedImage = reuseImg;
      state.cleanFluxImage = cleanUrl;
      $("top-text").value = ""; $("bottom-text").value = "";
      drawMemeOnCanvas();
      $("result-section").classList.remove("hidden");
      $("result-section").scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Imagen cargada. Escribe el nuevo texto del meme.", true);
    };
    reuseImg.onerror = function () { showToast("Error al cargar la imagen base.", false); };
    reuseImg.src = cleanUrl;
  }

  function renderHistory(items) {
    var container = $("history-container");
    if (!container) return;
    container.innerHTML = "";
    if (!items || items.length === 0) { $("history-section").classList.add("hidden"); return; }
    $("history-section").classList.remove("hidden");

    items.forEach(function (item) {
      var imageUrl = item.imageUrl || (item.data && item.data.dataUrl) || "";
      if (!imageUrl && item.imageFile) {
        imageUrl = "./history_data/" + encodeURIComponent(item.imageFile + ".jpg");
      }
      var wrapper = document.createElement("div"); wrapper.className = "history-item-wrapper";
      var img = document.createElement("img");
      img.src = imageUrl; img.alt = "Meme generado"; img.loading = "lazy";
      img.addEventListener("click", function () {
        var memeImg = new Image();
        memeImg.onload = function () {
          state.generatedImage = memeImg;
          if (item.data) {
            $("top-text").value = item.data.topText || "";
            $("bottom-text").value = item.data.bottomText || "";
          }
          drawMemeOnCanvas();
          $("result-section").classList.remove("hidden");
          $("result-section").scrollIntoView({ behavior: "smooth", block: "center" });
        };
        memeImg.src = imageUrl;
      });

      var actions = document.createElement("div"); actions.className = "history-item-actions";

      var reuseBtn = document.createElement("button");
      reuseBtn.className = "btn-square btn-sq-blue";
      reuseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      reuseBtn.title = "Reutilizar imagen";
      reuseBtn.addEventListener("click", function (e) { e.stopPropagation(); reuseImage(item); });

      var downBtn = document.createElement("button");
      downBtn.className = "btn-square btn-sq-green";
      downBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';
      downBtn.title = "Descargar";
      downBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = document.createElement("a"); a.href = imageUrl;
        a.download = "meme_" + item.id + ".jpg";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });

      var delBtn = document.createElement("button");
      delBtn.className = "btn-square btn-sq-red";
      delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
      delBtn.title = "Eliminar";
      delBtn.addEventListener("click", function (e) { e.stopPropagation(); history.delete(item.id).then(function () { loadHistory(); }).catch(function () {}); });

      actions.appendChild(reuseBtn); actions.appendChild(downBtn); actions.appendChild(delBtn);
      wrapper.appendChild(img); wrapper.appendChild(actions);
      container.appendChild(wrapper);
    });
  }

  $("history-clear-btn").addEventListener("click", function () {
    if (!confirm("¿Seguro que quieres borrar todo el historial de memes?")) return;
    history.clear().then(function () { $("history-section").classList.add("hidden"); loadHistory(); })
    .catch(function () { showToast("Error al limpiar historial.", false); });
  });

  var refreshBtn = $("history-refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", function () { loadHistory(); showToast("Historial actualizado", true); });

  // ===== INIT =====
  document.addEventListener("DOMContentLoaded", function () {
    window.__creador_memes_loaded = true;

    // Init color slider thumb
    var initColor = sliderToColor(50);
    colorSlider.style.setProperty("--thumb-color", initColor.hex);
    state.textColor = "rgb(" + initColor.r + "," + initColor.g + "," + initColor.b + ")";

    try { loadHistory(); window.__creador_memes_domready = true; }
    catch (e) { console.error("Error inicializando creador_memes:", e); }
  });

})();