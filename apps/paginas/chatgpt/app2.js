/* ========= Router y progreso ========= */
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

/* ========= Exportar progreso (.json) ========= */
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

/* ========= Vista previa Markdown (parser seguro sin flags raros) ========= */
function renderBasicMarkdown(md){
  // Escapar HTML
  md = md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Bloques de código ``` ```
  md = md.replace(/```([\s\S]*?)```/g, (_,code)=> `<pre><code>${code}</code></pre>`);

  // Encabezados
  md = md.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  // Listas: líneas que empiezan por "- "
  const lines = md.split("\n");
  let html = "";
  let inList = false;

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

    // Párrafo normal
    if(inList){ html += "</ul>"; inList = false; }
    // Evita envolver si ya es un tag permitido
    if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line + "\n";
    else html += "<p>" + line + "</p>\n";
  }
  if(inList) html += "</ul>";

  return html;
}

/* ========= Modal simple ========= */
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
  document.addEventListener("keydown", e=>{
    if(e.key === "Escape") closeModal();
  });
}

/* ========= Init ========= */
function init(){
  initNav();
  initPreview();

  const last = localStorage.getItem("last_route") || "basico";
  showRoute(ROUTES.includes(last) ? last : "basico");

  const exportBtn = document.getElementById("btn-export");
  if(exportBtn) exportBtn.addEventListener("click", exportProgress);
}

document.addEventListener("DOMContentLoaded", init);
