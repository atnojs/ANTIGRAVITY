// ===== Minicampus Addon =====
// Depende de: estructura existente con .section e <a data-section="...">
(function(){
  const $ = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));

  // 1) Enlazar botones Exportar/Importar si existen
  function exportProgress(){
    // Progreso principal del sitio
    const saved = localStorage.getItem('minicampusProgress');
    let payload = { moduleCompleted: [], quizScores: [] };
    if(saved){
      try{ payload = JSON.parse(saved) || payload }catch{}
    }
    const data = {
      schema: "minicampus-v1",
      exported_at: new Date().toISOString(),
      progress: payload,
      last_section: localStorage.getItem('minicampusLastSection') || 'intro'
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `minicampus_progreso_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function validateImport(obj){
    if(!obj || typeof obj!=="object") return false;
    if(obj.schema!=="minicampus-v1") return false;
    if(!obj.progress || typeof obj.progress!=="object") return false;
    if(!Array.isArray(obj.progress.moduleCompleted)) return false;
    if(!Array.isArray(obj.progress.quizScores)) return false;
    if(typeof obj.last_section!=="string") obj.last_section = "intro";
    return true;
  }

  function importProgress(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(!validateImport(data)) throw new Error("Archivo inválido");
        localStorage.setItem('minicampusProgress', JSON.stringify(data.progress));
        localStorage.setItem('minicampusLastSection', data.last_section);
        // Refrescar UI
        if(typeof loadProgress==="function") loadProgress();
        const link = document.querySelector(`.sidebar-menu a[data-section="${data.last_section}"]`) || document.querySelector('.sidebar-menu a[data-section="intro"]');
        if(link){ link.click(); }
        alert("Progreso importado correctamente.");
      }catch(e){
        alert("No se pudo importar. Selecciona un .json válido.");
      }
    };
    reader.onerror = ()=> alert("Error leyendo el archivo seleccionado.");
    reader.readAsText(file, "utf-8");
  }

  function initExportImport(){
    const btnExp = $("#mc-btn-export");
    const btnImp = $("#mc-btn-import");
    const inpImp = $("#mc-import-file");
    if(btnExp) btnExp.addEventListener("click", exportProgress);
    if(btnImp && inpImp){
      btnImp.addEventListener("click", ()=> inpImp.click());
      inpImp.addEventListener("change", ()=>{
        const f = inpImp.files && inpImp.files[0];
        if(f) importProgress(f);
        inpImp.value = "";
      });
    }
    // Guardar lastSection en cada clic de menú
    $$(".sidebar-menu a[data-section]").forEach(a=>{
      a.addEventListener("click", ()=> {
        localStorage.setItem('minicampusLastSection', a.getAttribute('data-section'));
      });
    });
  }

  // 2) Vista previa Markdown
  function escapeHTML(str){ return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function renderMD(md){
    md = escapeHTML(md);
    md = md.replace(/```([\s\S]*?)```/g, (_,c)=> `<pre><code>${c}</code></pre>`);
    md = md.replace(/^###\s+(.*)$/gm,"<h3>$1</h3>");
    md = md.replace(/^##\s+(.*)$/gm,"<h2>$1</h2>");
    md = md.replace(/^#\s+(.*)$/gm,"<h1>$1</h1>");
    const lines = md.split("\n"); let html="", inList=false;
    for(const raw of lines){
      const line = raw.trimEnd();
      if(/^<pre>/.test(line) || /^<\/pre>/.test(line) || /^<h[1-3]>/.test(line)){
        if(inList){ html+="</ul>"; inList=false; }
        html += line+"\n"; continue;
      }
      if(/^\-\s+/.test(line)){
        if(!inList){ html+="<ul>"; inList=true; }
        html += "<li>"+ line.replace(/^\-\s+/,"") +"</li>"; continue;
      }
      if(line===""){
        if(inList){ html+="</ul>"; inList=false; }
        html += "\n"; continue;
      }
      if(inList){ html+="</ul>"; inList=false; }
      if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line+"\n";
      else html += "<p>"+ line +"</p>\n";
    }
    if(inList) html+="</ul>";
    return html;
  }

  async function openPreview(path){
    const overlay = $("#mc-overlay");
    const title = $("#mc-title");
    const content = $("#mc-content");
    const dl = $("#mc-download");
    if(title) title.textContent = "Vista previa — " + (path.split("/").pop() || path);
    if(content) content.innerHTML = "<p class='mc-muted'>Cargando...</p>";
    if(dl){
      dl.onclick = ()=> {
        const a = document.createElement("a");
        a.href = path; a.download = path.split("/").pop();
        document.body.appendChild(a); a.click(); a.remove();
      };
    }
    try{
      const res = await fetch(path, {cache:"no-cache"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const md = await res.text();
      if(content) content.innerHTML = renderMD(md);
    }catch(e){
      if(content) content.innerHTML = "<p class='mc-muted'>No se pudo cargar la vista previa. Descarga el archivo para verlo. ("+e.message+")</p>";
    }
    if(overlay) overlay.classList.add("show");
  }

  function closePreview(){
    const overlay = $("#mc-overlay");
    if(overlay) overlay.classList.remove("show");
  }

  function initPreview(){
    $$(".mc-preview-btn[data-preview]").forEach(btn=>{
      btn.addEventListener("click", ()=> openPreview(btn.dataset.preview));
    });
    const close = $("#mc-close");
    if(close) close.addEventListener("click", closePreview);
    document.addEventListener("keydown", e=>{ if(e.key==="Escape") closePreview(); });
  }

  // 3) Init
  function init(){
    initExportImport();
    initPreview();
    // Si hay última sección guardada, ir a ella
    const last = localStorage.getItem('minicampusLastSection');
    const link = last && document.querySelector(`.sidebar-menu a[data-section="${last}"]`);
    if(link) link.click();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
