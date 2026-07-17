/* =========================================================
   Creador de Memes IA — app.js
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
    textColor: "#ffffff",
    fontSize: 48,
    enhancedPrompt: "",
    generatedImage: null,  // Image element with the FLUX result
    memeDataUrl: null      // Final canvas data URL
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

  initToggleGroup("ar-selector", function (btn) {
    state.aspectRatio = btn.getAttribute("data-ar");
  });
  initToggleGroup("res-selector", function (btn) {
    state.resolution = parseInt(btn.getAttribute("data-res"), 10);
  });
  initToggleGroup("quality-selector", function (btn) {
    state.quality = btn.getAttribute("data-quality");
  });

  // Color chips
  document.querySelector(".color-options").addEventListener("click", function (e) {
    var chip = e.target.closest(".color-chip");
    if (!chip) return;
    document.querySelectorAll(".color-chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    state.textColor = chip.getAttribute("data-color");
    if (state.generatedImage) drawMemeOnCanvas();
  });

  // Size buttons
  document.querySelector(".size-options").addEventListener("click", function (e) {
    var btn = e.target.closest(".size-btn");
    if (!btn) return;
    document.querySelectorAll(".size-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.fontSize = parseInt(btn.getAttribute("data-size"), 10);
    if (state.generatedImage) drawMemeOnCanvas();
  });

  // Text inputs re-render canvas on change
  $("top-text").addEventListener("input", function () { if (state.generatedImage) drawMemeOnCanvas(); });
  $("bottom-text").addEventListener("input", function () { if (state.generatedImage) drawMemeOnCanvas(); });

  // ===== PROMPT ENHANCEMENT (Copiloto Method) =====
  $("enhance-prompt-btn").addEventListener("click", function () {
    var idea = $("meme-idea").value.trim();
    if (!idea) { showToast("Escribe primero la idea del meme.", false); return; }

    var btn = $("enhance-prompt-btn");
    var status = $("enhance-status");
    btn.disabled = true;
    status.textContent = "Mejorando prompt...";

    // Copiloto methodology: convert a rough idea into a detailed FLUX prompt
    var systemPrompt = [
      "Eres un experto en crear prompts para generación de imágenes con FLUX AI.",
      "Tu trabajo es convertir una idea vaga de un meme en un prompt detallado y profesional para FLUX.",
      "",
      "REGLAS OBLIGATORIAS:",
      "1. Describe la escena completa: sujeto, acción, entorno, iluminación, estilo visual.",
      "2. El prompt debe ser en español, descriptivo y específico.",
      "3. Especifica que la imagen debe tener espacio para texto de meme (zonas superior e inferior con fondo liso o degradado oscuro donde se pueda leer texto blanco).",
      "4. Añade al final del prompt: 'meme format, viral style, high contrast, bold composition, dramatic lighting'.",
      "5. El estilo debe ser fotorrealista o semi-fotorrealista, nunca cartoon o dibujo.",
      "6. NO describas el texto del meme en el prompt de imagen. Solo describe la escena/imagen base.",
      "7. Entrega ÚNICAMENTE el prompt final en español, sin comillas, sin introducción, sin comentarios.",
      "8. Longitud máxima: 300 palabras."
    ].join("\n");

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "openrouter",
        system: systemPrompt,
        prompt: "Convierte esta idea en un prompt para FLUX que genere la imagen base de un meme:\n\n\"" + idea + "\"\n\nEntrega solo el prompt final.",
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 600
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
        var err = (data && data.error) ? data.error : "Error desconocido";
        showToast("Error al mejorar prompt: " + err, false);
        status.textContent = "❌ Error";
      }
    })
    .catch(function (err) {
      btn.disabled = false;
      showToast("Fallo de conexión: " + err.message, false);
      status.textContent = "❌ Error de conexión";
    });
  });

  // ===== GENERATE MEME =====
  $("generate-btn").addEventListener("click", function () {
    var prompt = $("final-prompt").value.trim() || $("meme-idea").value.trim();
    if (!prompt) {
      // Try to use enhanced prompt or raw idea
      var rawIdea = $("meme-idea").value.trim();
      if (!rawIdea) { showToast("Escribe la idea del meme y mejora el prompt primero.", false); return; }
      // Use raw idea if no enhanced prompt
      prompt = "Meme image: " + rawIdea + ". Photorealistic, high contrast, dramatic lighting, meme format with space for text overlay, bold composition.";
    }

    var btn = $("generate-btn");
    var btnText = $("generate-btn-text");
    var spinner = $("generate-spinner");
    btn.disabled = true;
    btnText.textContent = "GENERANDO...";
    spinner.classList.remove("hidden");

    showOverlay("Generando imagen base con FLUX...");

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        prompt: prompt,
        quality: state.quality,
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        output_format: "jpeg"
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false;
      btnText.textContent = "GENERAR MEME";
      spinner.classList.add("hidden");
      hideOverlay();

      if (data && data.success && data.dataUrl) {
        // Load the generated image
        var img = new Image();
        img.onload = function () {
          state.generatedImage = img;
          drawMemeOnCanvas();
          $("result-section").classList.remove("hidden");
          // Scroll to result
          $("result-section").scrollIntoView({ behavior: "smooth", block: "center" });
          // Save to history
          saveToHistory(data.dataUrl, prompt);
        };
        img.onerror = function () {
          showToast("Error al cargar la imagen generada.", false);
        };
        img.src = data.dataUrl;
      } else {
        var err = (data && data.error) ? data.error : "Error desconocido";
        showToast("Error al generar: " + err, false);
      }
    })
    .catch(function (err) {
      btn.disabled = false;
      btnText.textContent = "GENERAR MEME";
      spinner.classList.remove("hidden");
      hideOverlay();
      showToast("Fallo de conexión: " + err.message, false);
    });
  });

  // ===== CANVAS MEME =====
  function drawMemeOnCanvas() {
    if (!state.generatedImage) return;

    var canvas = $("meme-canvas");
    var img = state.generatedImage;
    var topText = $("top-text").value.trim().toUpperCase();
    var bottomText = $("bottom-text").value.trim().toUpperCase();

    // Set canvas size to match image aspect ratio, max width 600
    var maxWidth = 600;
    var scale = Math.min(maxWidth / img.naturalWidth, 1);
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    var ctx = canvas.getContext("2d");
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Text settings
    var fontSize = state.fontSize * scale;
    ctx.font = "900 " + fontSize + "px Impact, 'Arial Black', sans-serif";
    ctx.fillStyle = state.textColor;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(3, fontSize * 0.08);
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;

    // Top text
    if (topText) {
      var topY = fontSize * 1.1;
      ctx.strokeText(topText, canvas.width / 2, topY);
      ctx.fillText(topText, canvas.width / 2, topY);
    }

    // Bottom text
    if (bottomText) {
      var bottomY = canvas.height - fontSize * 0.4;
      ctx.strokeText(bottomText, canvas.width / 2, bottomY);
      ctx.fillText(bottomText, canvas.width / 2, bottomY);
    }

    // Store meme data URL
    state.memeDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  }

  // ===== DOWNLOAD =====
  $("download-btn").addEventListener("click", function () {
    if (!state.memeDataUrl) { showToast("Genera un meme primero.", false); return; }
    var a = document.createElement("a");
    a.href = state.memeDataUrl;
    a.download = "meme_" + Date.now() + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        quality: state.quality
      },
      imageData: memeDataUrl
    }).then(function () {
      loadHistory();
    }).catch(function (err) {
      console.error("Error guardando historial:", err);
    });
  }

  function loadHistory() {
    history.load().then(function (items) {
      renderHistory(items);
      if (items.length > 0) {
        $("history-section").classList.remove("hidden");
      }
    }).catch(function () {});
  }

  function renderHistory(items) {
    var container = $("history-container");
    if (!container) return;
    container.innerHTML = "";

    if (!items || items.length === 0) {
      $("history-section").classList.add("hidden");
      return;
    }
    $("history-section").classList.remove("hidden");

    items.forEach(function (item) {
      var imageUrl = item.imageUrl || (item.data && item.data.dataUrl) || "";
      if (!imageUrl && item.imageFile) {
        imageUrl = "./history_data/" + encodeURIComponent(item.imageFile + ".jpg");
      }

      var wrapper = document.createElement("div");
      wrapper.className = "history-item-wrapper";

      var img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Meme generado";
      img.loading = "lazy";
      img.addEventListener("click", function () {
        // Load this meme back
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

      var actions = document.createElement("div");
      actions.className = "history-item-actions";

      // Download button
      var downBtn = document.createElement("button");
      downBtn.className = "btn-square btn-sq-green";
      downBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';
      downBtn.title = "Descargar";
      downBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = document.createElement("a");
        a.href = imageUrl;
        a.download = "meme_" + item.id + ".jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      // Delete button
      var delBtn = document.createElement("button");
      delBtn.className = "btn-square btn-sq-red";
      delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
      delBtn.title = "Eliminar";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        history.delete(item.id).then(function () { loadHistory(); }).catch(function () {});
      });

      actions.appendChild(downBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(img);
      wrapper.appendChild(actions);
      container.appendChild(wrapper);
    });
  }

  $("history-clear-btn").addEventListener("click", function () {
    if (!confirm("¿Seguro que quieres borrar todo el historial de memes?")) return;
    history.clear().then(function () {
      $("history-section").classList.add("hidden");
      loadHistory();
    }).catch(function (err) {
      showToast("Error al limpiar historial.", false);
    });
  });

  // ===== INIT =====
  document.addEventListener("DOMContentLoaded", function () {
    window.__creador_memes_loaded = true;
    try {
      loadHistory();
      window.__creador_memes_domready = true;
    } catch (e) {
      console.error("Error inicializando creador_memes:", e);
    }
  });

})();