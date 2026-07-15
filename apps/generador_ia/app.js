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
    calidad: "normal",
    imagenBase64: "",   // data URL de la imagen a editar
    ultimaImagen: ""    // última imagen generada (para "editar esta")
  };

  var PRECIO = { barato: "~2 cént.", normal: "~4 cént.", pro: "~13 cént." };

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

  // ---------- Selección de calidad ----------
  function initQuality() {
    var cards = document.querySelectorAll(".quality-card");
    cards.forEach(function (c) {
      c.addEventListener("click", function () {
        cards.forEach(function (x) { x.classList.remove("active"); });
        c.classList.add("active");
        state.calidad = c.getAttribute("data-cal");
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
    $("loaderText").textContent = state.mode === "editar" ? "Editando… espera unos segundos" : "Generando… espera unos segundos";
    showOverlay(state.mode === "editar" ? "Editando imagen..." : "Generando imagen...");
    $("btnGenerate").disabled = true;

    var payload = { prompt: prompt, calidad: state.calidad };
    if (state.mode === "editar") payload.imagen = state.imagenBase64;

    fetch("proxy.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
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
    var eur = (data.coste * 0.92).toFixed(3);
    $("resultMeta").innerHTML =
      "Calidad: <b>" + data.calidad + "</b> · Coste: <b>$" + Number(data.coste).toFixed(4) +
      "</b> (~" + eur + " €)";
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
        calidad: data.calidad,
        modelo: data.modelo,
        coste: data.coste,
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

      var del = document.createElement("div");
      del.className = "g-del";
      del.textContent = "✕";
      del.title = "Eliminar";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        borrarItem(it.id);
      });

      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(del);
      g.appendChild(card);
    });
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
    initQuality();
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
