/* =========================================================
   Generador de Imágenes IA — lógica frontend
   Llama a proxy.php (genera/edita) y history.php (historial)
   ========================================================= */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // Overlay universal (SKILL_MAESTRA)
  function showOverlay(statusMsg) {
    var t = $("loading-text"), s = $("secondary-status"), o = $("loading-overlay");
    if (t) t.textContent = "IA generando lo solicitado...";
    if (s) s.textContent = statusMsg || "Procesando solicitud...";
    if (o) o.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function hideOverlay() {
    var o = $("loading-overlay");
    if (o) o.classList.add("hidden");
    document.body.style.overflow = "";
  }

  var state = {
    mode: "crear",      // "crear" | "editar"
    selectedModel: "openai-medium",
    imagenBase64: "",   // data URL de la imagen a editar
    ultimaImagen: ""    // última imagen generada (para "editar esta")
  };

  // Etiquetas del catálogo canónico 2.5 (spec §5)
  var MODEL_LABELS = {
    "openai-medium": "MEDIUM",
    "openai-high": "HIGH",
    "openai-xhigh": "XHIGH",
    "openai-max-flare": "MAX FLARE",
    "openai-max-sunburst": "MAX SUNBURST",
    "gemini-flash": "3.1 FLASH",
    "gemini-pro": "3 PRO",
    "qwen-pro": "QWEN 3 PRO"
  };

  // Llamada al proxy. Para qwen-pro (más lento que el timeout de nginx,
  // ~55s) se espera activamente: el proxy guarda el resultado en qwen_cache/
  // y responde 'processing' mientras el worker termina de generarlo.
  var delay = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };
  var callProxyWithWait = async function (payload, maxAttempts) {
    maxAttempts = maxAttempts || 36;
    var slowModel = payload && payload.model === "qwen-pro";
    var lastError = "Sin respuesta del modelo.";
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        var res = await fetch("proxy.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        var j = await res.json().catch(function () { return null; });
        if (res.ok && j && (j.imageUrl || (j.success && j.image))) return { ok: true, j: j };
        if (j && j.status === "processing") {
          lastError = "Generando...";
        } else if (j && j.error) {
          lastError = (j.error.message) ? j.error.message : "Error desconocido";
          if (!slowModel || res.status < 500) return { ok: false, j: j };
        } else {
          lastError = "Error HTTP " + res.status;
          if (!slowModel) return { ok: false, j: { error: { message: lastError } } };
        }
      } catch (err) {
        if (!slowModel) return { ok: false, j: { error: { message: "Fallo de conexión: " + err.message } } };
        lastError = (err && err.message) || lastError;
      }
      if (attempt < maxAttempts - 1) await delay(5000);
    }
    return { ok: false, j: { error: { message: lastError } } };
  };

  // ---------- Tema claro/oscuro ----------
  function initTheme() {
    var saved = localStorage.getItem("gen_theme");
    if (saved === "light") document.body.classList.add("light");
    $("themeToggle").addEventListener("click", function () {
      document.body.classList.toggle("light");
      localStorage.setItem("gen_theme", document.body.classList.contains("light") ? "light" : "dark");
    });
  }

  // ---------- Modo crear / editar ----------
  function setMode(mode) {
    state.mode = mode;
    $("tabCrear").classList.toggle("active", mode === "crear");
    $("tabEditar").classList.toggle("active", mode === "editar");
    $("editWrap").classList.toggle("is-hidden", mode !== "editar");
    if (mode === "editar") {
      $("promptLabel").textContent = "¿Qué cambio quieres hacer?";
      $("prompt").placeholder = "Ej: ponle un sombrero rojo, hazlo de noche…";
      $("btnGenerate").textContent = "Editar imagen";
    } else {
      $("promptLabel").textContent = "Describe la imagen que quieres";
      $("prompt").placeholder = "Ej: un faro en un acantilado al atardecer, estilo acuarela";
      $("btnGenerate").textContent = "Generar imagen";
    }
  }

  // ---------- Selección de modelo ----------
  function initModelSelector() {
    var buttons = document.querySelectorAll("#model-selector .model-toggle");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        buttons.forEach(function (other) { other.classList.remove("active"); other.setAttribute("aria-pressed", "false"); });
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
        var next = button.getAttribute("data-model") || "openai-medium";
        state.selectedModel = MODEL_LABELS[next] ? next : "openai-medium";
      });
    });
  }

  // ---------- Carga de imagen a editar ----------
  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function initDropZone() {
    var dz = $("dropZone");
    var fi = $("fileInput");

    dz.addEventListener("click", function () { fi.click(); });
    fi.addEventListener("change", function () {
      if (fi.files && fi.files[0]) loadImageFile(fi.files[0]);
    });
    ["dragover", "dragenter"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("dragover"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("dragover"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) loadImageFile(e.dataTransfer.files[0]);
    });
  }

  function loadImageFile(file) {
    fileToDataURL(file).then(function (dataUrl) {
      state.imagenBase64 = dataUrl;
      var dz = $("dropZone");
      dz.innerHTML = '<img src="' + dataUrl + '" alt="imagen a editar">';
    });
  }

  // ---------- Errores ----------
  function showError(msg) {
    var e = $("errorBox");
    e.textContent = "⚠️ " + msg;
    e.classList.remove("is-hidden");
  }
  function clearError() { $("errorBox").classList.add("is-hidden"); }

  // ---------- Generar / editar ----------
  function generar() {
    clearError();
    var prompt = $("prompt").value.trim();
    if (!prompt) { showError("Escribe una descripción primero."); return; }
    if (state.mode === "editar" && !state.imagenBase64) {
      showError("Elige una imagen para editar."); return;
    }

    $("resultEmpty").classList.add("is-hidden");
    $("resultShow").classList.add("is-hidden");
    $("resultLoader").classList.remove("is-hidden");
    $("loaderText").textContent = state.mode === "editar" ? "Editando con IA…" : "Generando con IA…";
    showOverlay(state.mode === "editar" ? "Editando imagen con OpenAI/Gemini..." : "Generando imagen con OpenAI/Gemini...");
    $("btnGenerate").disabled = true;

    var payload = { prompt: prompt, model: state.selectedModel };
    if (state.mode === "editar") payload.imagen = state.imagenBase64;

    callProxyWithWait(payload)
      .then(function (res) {
        $("btnGenerate").disabled = false;
        hideOverlay();
        $("resultLoader").classList.add("is-hidden");
        if (!res.ok || !res.j || res.j.error) {
          var m = (res.j && res.j.error && res.j.error.message) ? res.j.error.message : "Error desconocido";
          $("resultEmpty").classList.remove("is-hidden");
          showError(m);
          return;
        }
        mostrarResultado(res.j, prompt);
      })
      .catch(function (err) {
        $("btnGenerate").disabled = false;
        hideOverlay();
        $("resultLoader").classList.add("is-hidden");
        $("resultEmpty").classList.remove("is-hidden");
        showError("Fallo de conexión: " + err.message);
      });
  }

  function mostrarResultado(data, prompt) {
    var img = data.imageUrl;
    state.ultimaImagen = img;
    $("resultImg").src = img;
    $("btnDownload").href = img;
    $("resultMeta").innerHTML = "Modelo: <b>" + (data.model || data.modelo || state.selectedModel) + "</b> · Proveedor: <b>" + (data.provider || "IA") + "</b>";
    $("resultShow").classList.remove("is-hidden");

    // Guardar en historial persistente
    var id = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    fetch("history.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id,
        imageData: img,
        prompt: prompt,
        modelo: data.model || data.modelo || state.selectedModel,
        editada: state.mode === "editar",
        createdAt: Date.now()
      })
    }).then(function () { cargarHistorial(); }).catch(function () {});
  }

  // ---------- "Editar esta" ----------
  function editarUltima() {
    if (!state.ultimaImagen) return;
    setMode("editar");
    state.imagenBase64 = state.ultimaImagen;
    $("dropZone").innerHTML = '<img src="' + state.ultimaImagen + '" alt="imagen a editar">';
    $("prompt").value = "";
    $("prompt").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Historial ----------
  function cargarHistorial() {
    fetch("history.php")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) return;
        var items = data.items || [];
        renderGallery(items);
        $("stat-total").textContent = items.length;
        $("histCount").textContent = items.length;
        var total = data.costeTotal || 0;
        $("stat-gasto").textContent = "$" + Number(total).toFixed(2);
      })
      .catch(function () {});
  }

  function renderGallery(items) {
    var g = $("gallery");
    var empty = $("galleryEmpty");
    g.innerHTML = "";
    if (!items.length) { empty.classList.remove("is-hidden"); return; }
    empty.classList.add("is-hidden");

    items.forEach(function (it) {
      var card = document.createElement("div");
      card.className = "gallery-item";

      var img = document.createElement("img");
      img.src = it.imageUrl;
      img.alt = it.prompt || "imagen";
      img.loading = "lazy";
      img.addEventListener("click", function () { openLightbox(it.imageUrl); });

      var info = document.createElement("div");
      info.className = "g-info";
      var p = document.createElement("div");
      p.className = "g-prompt";
      p.textContent = it.prompt || "(sin descripción)";
      var meta = document.createElement("div");
      meta.className = "g-meta";
      var etiqueta = (it.editada ? "editada · " : "") + (it.calidad || "");
      meta.textContent = etiqueta;
      info.appendChild(p);
      info.appendChild(meta);

      var actions = document.createElement("div");
      actions.className = "g-actions";

      // Editar esta imagen del historial
      var edit = document.createElement("div");
      edit.className = "g-btn";
      edit.textContent = "🖌️";
      edit.title = "Editar esta imagen";
      edit.addEventListener("click", function (e) {
        e.stopPropagation();
        editarDelHistorial(it.imageUrl);
      });

      // Descargar
      var down = document.createElement("div");
      down.className = "g-btn";
      down.textContent = "⬇️";
      down.title = "Descargar";
      down.addEventListener("click", function (e) {
        e.stopPropagation();
        descargarImagen(it.imageUrl, it.id);
      });

      // Eliminar
      var del = document.createElement("div");
      del.className = "g-btn g-del";
      del.textContent = "✕";
      del.title = "Eliminar";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        borrarItem(it.id);
      });

      actions.appendChild(edit);
      actions.appendChild(down);
      actions.appendChild(del);

      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(actions);
      g.appendChild(card);
    });
  }

  // Editar una imagen concreta del historial (la carga en el modo editar)
  function editarDelHistorial(imageUrl) {
    setMode("editar");
    state.imagenBase64 = imageUrl;
    $("dropZone").innerHTML = '<img src="' + imageUrl + '" alt="imagen a editar">';
    $("prompt").value = "";
    $("prompt").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Descargar una imagen del historial
  function descargarImagen(imageUrl, id) {
    var a = document.createElement("a");
    a.href = imageUrl;
    a.download = (id || "imagen-ia") + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function borrarItem(id) {
    fetch("history.php", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    }).then(function () { cargarHistorial(); }).catch(function () {});
  }

  function vaciarTodo() {
    if (!confirm("¿Seguro que quieres borrar TODO el historial? No se puede deshacer.")) return;
    fetch("history.php", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearAll: true })
    }).then(function () { cargarHistorial(); }).catch(function () {});
  }

  // ---------- Lightbox ----------
  function openLightbox(src) {
    $("lbImg").src = src;
    $("lightbox").classList.add("open");
  }
  function closeLightbox() {
    $("lightbox").classList.remove("open");
    $("lbImg").src = "";
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initModelSelector();

    const modelTooltip = document.getElementById('model-tooltip');
    if (modelTooltip) {
      const TOOLTIP_GAP = 10;
      const hideModelTooltip = () => {
        modelTooltip.classList.remove('visible','tip-above','tip-below');
        modelTooltip.setAttribute('aria-hidden','true');
        modelTooltip.textContent = '';
      };
      const showModelTooltip = (button) => {
        const text = (button.dataset.tooltip || '').trim();
        if (!text) { hideModelTooltip(); return; }
        modelTooltip.textContent = text;
        modelTooltip.classList.remove('tip-above','tip-below');
        modelTooltip.classList.add('visible');
        modelTooltip.setAttribute('aria-hidden','false');
        const rect = button.getBoundingClientRect();
        const tw = modelTooltip.offsetWidth;
        const th = modelTooltip.offsetHeight;
        let left = rect.left + rect.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        let top = rect.top - th - TOOLTIP_GAP;
        if (top < 8) {
          top = rect.bottom + TOOLTIP_GAP;
          modelTooltip.classList.add('tip-below');
        } else {
          modelTooltip.classList.add('tip-above');
        }
        modelTooltip.style.left = left + 'px';
        modelTooltip.style.top = top + 'px';
      };
      document.querySelectorAll('.model-toggle').forEach((button) => {
        button.addEventListener('mouseenter', () => showModelTooltip(button));
        button.addEventListener('mouseleave', hideModelTooltip);
        button.addEventListener('focus', () => showModelTooltip(button));
        button.addEventListener('blur', hideModelTooltip);
      });
      window.addEventListener('scroll', hideModelTooltip, true);
      window.addEventListener('resize', hideModelTooltip);
    }
    initDropZone();

    $("tabCrear").addEventListener("click", function () { setMode("crear"); });
    $("tabEditar").addEventListener("click", function () { setMode("editar"); });
    $("btnGenerate").addEventListener("click", generar);
    $("btnEditThis").addEventListener("click", editarUltima);
    $("btnClearAll").addEventListener("click", vaciarTodo);
    $("brandHome").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    $("lbClose").addEventListener("click", closeLightbox);
    $("lightbox").addEventListener("click", function (e) {
      if (e.target === $("lightbox")) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });

    cargarHistorial();
  });
})();
