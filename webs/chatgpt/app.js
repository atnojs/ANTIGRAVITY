/* =====================================
   Router + progreso en localStorage
   ===================================== */
const ROUTES = ["basico","pro","plantillas"];
const visited = new Set(JSON.parse(localStorage.getItem("visited_routes") || "[]"));

function showRoute(route){
  ROUTES.forEach(r=>{
    const view = document.querySelector(`#view-${r}`);
    if(view) view.hidden = r !== route;
  });
  visited.add(route);
  localStorage.setItem("visited_routes", JSON.stringify([...visited]));
  localStorage.setItem("last_route", route);
  updateProgress();
}

function updateProgress(){
  const pct = Math.round((visited.size / ROUTES.length) * 100);
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if(fill) fill.style.width = `${pct}%`;
  if(label) label.textContent = `Progreso: ${pct}%`;
}

function initNav(){
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> showRoute(btn.dataset.route));
  });
}

/* =====================================
   Exportar e Importar progreso (.json)
   ===================================== */
// Exporta estado mínimo a JSON descargable
function exportProgress(){
  const data = {
    schema: "minicampus-progress-v1",
    exported_at: new Date().toISOString(),
    visited_routes: JSON.parse(localStorage.getItem("visited_routes") || "[]"),
    last_route: localStorage.getItem("last_route") || null
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `minicampus_progreso_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Valida forma básica del JSON importado
function validateProgressJson(obj){
  if(!obj || typeof obj !== "object") return false;
  if(obj.schema !== "minicampus-progress-v1") return false;
  if(!Array.isArray(obj.visited_routes)) return false;
  if(obj.last_route && !ROUTES.includes(obj.last_route)) return false;
  // Filtra valores desconocidos en visited_routes
  obj.visited_routes = obj.visited_routes.filter(r => ROUTES.includes(r));
  return true;
}

// Lee archivo, valida y restaura localStorage + UI
function importProgressFromFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!validateProgressJson(data)) throw new Error("Archivo inválido");
      // Persistir
      localStorage.setItem("visited_routes", JSON.stringify(data.visited_routes || []));
      localStorage.setItem("last_route", data.last_route || "basico");

      // Refrescar estructuras en memoria
      visited.clear();
      (data.visited_routes || []).forEach(v => visited.add(v));

      // Restaurar ruta y barra
      const route = data.last_route && ROUTES.includes(data.last_route) ? data.last_route : "basico";
      showRoute(route);

      // Confirmación visual simple
      alert("Progreso importado correctamente.");
    }catch(e){
      alert("No se pudo importar el progreso. Asegúrate de seleccionar un .json válido.");
    }
  };
  reader.onerror = () => alert("Error leyendo el archivo seleccionado.");
  reader.readAsText(file, "utf-8");
}

function initExportImport(){
  const exportBtn = document.getElementById("btn-export");
  if(exportBtn) exportBtn.addEventListener("click", exportProgress);

  const importBtn = document.getElementById("btn-import");
  const importInput = document.getElementById("import-file");

  if(importBtn && importInput){
    // Abrir selector de archivo
    importBtn.addEventListener("click", ()=> importInput.click());
    // Al seleccionar archivo .json, importar
    importInput.addEventListener("change", ()=>{
      const file = importInput.files && importInput.files[0];
      if(file) importProgressFromFile(file);
      // Limpia el input para permitir reimportar el mismo archivo si se desea
      importInput.value = "";
    });
  }
}

/* =====================================
   Vista previa Markdown (simple y seguro)
   ===================================== */
function renderBasicMarkdown(md){
  // Escapar HTML
  md = md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Bloques de código ``` ```
  md = md.replace(/```([\s\S]*?)```/g, (_,code)=> `<pre><code>${code}</code></pre>`);

  // Encabezados
  md = md.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  // Listas "- "
  const lines = md.split("\n");
  let html = "", inList = false;
  for(const raw of lines){
    const line = raw.trimEnd();

    if(/^<pre>/.test(line) || /^<\/pre>/.test(line) || /^<h[1-3]>/.test(line)){
      if(inList){ html += "</ul>"; inList = false; }
      html += line + "\n";
      continue;
    }
    if(/^\-\s+/.test(line)){
      if(!inList){ html += "<ul>"; inList = true; }
      html += "<li>" + line.replace(/^\-\s+/, "") + "</li>";
      continue;
    }
    if(line === ""){
      if(inList){ html += "</ul>"; inList = false; }
      html += "\n";
      continue;
    }
    if(inList){ html += "</ul>"; inList = false; }
    if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line + "\n";
    else html += "<p>" + line + "</p>\n";
  }
  if(inList) html += "</ul>";
  return html;
}

// Modal simple
function openModal(){ document.getElementById("preview-modal").classList.remove("hidden"); }
function closeModal(){ document.getElementById("preview-modal").classList.add("hidden"); }

async function openPreview(mdPath){
  const title = document.getElementById("preview-title");
  const content = document.getElementById("preview-content");
  const btnDownload = document.getElementById("preview-download");

  title.textContent = `Vista previa — ${mdPath.split("/").pop()}`;
  content.innerHTML = "<p class='muted'>Cargando...</p>";
  btnDownload.onclick = ()=>{
    const link = document.createElement("a");
    link.href = mdPath;
    link.download = mdPath.split("/").pop();
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  try{
    const res = await fetch(mdPath, {cache:"no-cache"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    content.innerHTML = renderBasicMarkdown(md);
  }catch(e){
    content.innerHTML = `<p class="muted">No se pudo cargar la vista previa. Descarga el archivo para verlo. (${e.message})</p>`;
  }

  openModal();
}

function initPreview(){
  document.querySelectorAll("[data-preview]").forEach(btn=>{
    btn.addEventListener("click", ()=> openPreview(btn.dataset.preview));
  });
  document.getElementById("preview-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeModal(); });
}

/* =====================================
   Init
   ===================================== */
function init(){
  initNav();
  initPreview();
  initExportImport();

  const last = localStorage.getItem("last_route") || "basico";
  showRoute(ROUTES.includes(last) ? last : "basico");
}

document.addEventListener("DOMContentLoaded", init);
