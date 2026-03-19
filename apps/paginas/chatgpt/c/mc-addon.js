// ===== Minicampus Addon v6 =====
// - Botones Importar/Exportar visibles con color de marca
// - Anillo pequeño y coherente (usa --primary)
// - El progreso SOLO se actualiza al pulsar "Siguiente módulo"
(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));

  const STORAGE_KEY = 'minicampusProgress';
  const LAST_KEY = 'minicampusLastSection';

  /* =======================
     Compatibilidad con JS antiguo
     ======================= */
  function ensureLegacyCompat(){
    if(!window.resetProgress){
      window.resetProgress = function(){
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LAST_KEY);
        location.reload();
      };
    }
    if(!window.downloadCertificate){
      window.downloadCertificate = function(){
        alert('El certificado se habilitará al completar todos los módulos.');
      };
    }
    // Elementos esperados por el JS antiguo (ocultos)
    ['finalProgress','finalProgressText','completedModulesList','unlockedBadgesList','totalScore']
      .forEach(function(id){
        if(!document.getElementById(id)){
          const tag = (id==='finalProgress') ? 'div' : (id.endsWith('List') ? 'ul' : 'div');
          const el = document.createElement(tag);
          el.id = id;
          el.style.display = 'none';
          document.body.appendChild(el);
        }
      });
  }

  /* =======================
     Estado
     ======================= */
  function getSections(){
    return $$('.sidebar-menu a[data-section]').map(a => a.getAttribute('data-section')).filter(Boolean);
  }

  function getActiveSection(){
    const active = $('.sidebar-menu a.active[data-section]') || $('.sidebar-menu a[aria-current="true"][data-section]');
    if(active) return active.getAttribute('data-section');
    const visible = $$('.section[id]').find(el => el.offsetParent !== null);
    if(visible) return visible.id;
    if(location.hash && location.hash.length>1) return location.hash.slice(1);
    return null;
  }

  function loadProgress(){
    let data = { moduleCompleted: [], quizScores: [], last_section: null };
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) data = Object.assign(data, JSON.parse(raw));
    }catch{}
    return data;
  }

  function saveProgress(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function markCompleted(section){
    if(!section) return;
    const data = loadProgress();
    if(!data.moduleCompleted.includes(section)){
      data.moduleCompleted.push(section);
    }
    data.last_section = section;
    saveProgress(data);
    localStorage.setItem(LAST_KEY, section);
    updateProgressUI();
  }

  /* =======================
     UI Progreso
     ======================= */
  function updateProgressUI(){
    const data = loadProgress();
    const all = getSections();
    const total = all.length || 1;
    const completed = (data.moduleCompleted || []).filter(s => all.includes(s));
    const pct = Math.round((completed.length / total) * 100);

    const pctText = $('#mc-pct');
    const fill = $('#mc-bar-fill');
    const detail = $('#mc-progress-detail');
    const last = $('#mc-last-section');
    const ring = $('#mc-ring-fg');

    if(pctText) pctText.textContent = pct + '%';
    if(detail) detail.textContent = `${completed.length} de ${total} módulos`;
    if(last) last.textContent = 'Última sección: ' + (data.last_section || '—');

    if(ring){
      const r = parseFloat(ring.getAttribute('r')) || 54;
      const c = 2 * Math.PI * r;
      ring.style.strokeDasharray = `${c}`;
      ring.style.strokeDashoffset = `${c * (1 - pct/100)}`;
      const accent = getComputedStyle($('.mc-progress-card') || document.documentElement).getPropertyValue('--mc-accent').trim() || '#58a6ff';
      ring.style.stroke = accent;
    }
    if(fill){
      fill.style.width = pct + '%';
    }

    // Compat: actualiza IDs antiguos si existen
    const legacyBar = document.getElementById('finalProgress');
    const legacyText = document.getElementById('finalProgressText');
    if(legacyBar) legacyBar.style.width = pct + '%';
    if(legacyText) legacyText.textContent = pct + '% completado';
  }

  /* =======================
     Exportar / Importar
     ======================= */
  function exportProgress(){
    const payload = loadProgress();
    const data = {
      schema: "minicampus-v1",
      exported_at: new Date().toISOString(),
      progress: payload,
      last_section: payload.last_section || localStorage.getItem(LAST_KEY) || null
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
    if(obj.last_section && typeof obj.last_section!=="string") obj.last_section = null;
    return true;
  }

  function importProgressFromFile(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(!validateImport(data)) throw new Error("Archivo inválido");
        saveProgress(data.progress);
        if(data.last_section) localStorage.setItem(LAST_KEY, data.last_section);
        updateProgressUI();
        const link = document.querySelector(`.sidebar-menu a[data-section="${data.last_section}"]`);
        if(link) link.click();
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
        if(f) importProgressFromFile(f);
        inpImp.value = "";
      });
    }
  }

  /* =======================
     Vista previa Markdown (Plantillas)
     ======================= */
  function escapeHTML(str){ return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function renderMD(md){
    md = escapeHTML(md);
    md = md.replace(/```([\\s\\S]*?)```/g, (_,c)=> `<pre><code>${c}</code></pre>`);
    md = md.replace(/^###\\s+(.*)$/gm,"<h3>$1</h3>");
    md = md.replace(/^##\\s+(.*)$/gm,"<h2>$1</h2>");
    md = md.replace(/^#\\s+(.*)$/gm,"<h1>$1</h1>");
    const lines = md.split("\\n"); let html="", inList=false;
    for(const raw of lines){
      const line = raw.trimEnd();
      if(/^<pre>/.test(line) || /^<\\/pre>/.test(line) || /^<h[1-3]>/.test(line)){
        if(inList){ html+="</ul>"; inList=false; }
        html += line+"\\n"; continue;
      }
      if(/^\\-\\s+/.test(line)){
        if(!inList){ html+="<ul>"; inList=true; }
        html += "<li>"+ line.replace(/^\\-\\s+/,"") +"</li>"; continue;
      }
      if(line===""){
        if(inList){ html+="</ul>"; inList=false; }
        html += "\\n"; continue;
      }
      if(inList){ html+="</ul>"; inList=false; }
      if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line+"\\n";
      else html += "<p>"+ line +"</p>\\n";
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

  function closePreview(){ const overlay = $("#mc-overlay"); if(overlay) overlay.classList.remove("show"); }
  function initPreview(){
    $$('.mc-preview-btn[data-preview]').forEach(btn=>{
      btn.addEventListener("click", ()=> openPreview(btn.dataset.preview));
    });
    const close = $("#mc-close");
    if(close) close.addEventListener("click", closePreview);
    document.addEventListener("keydown", e=>{ if(e.key==="Escape") closePreview(); });
  }

  /* =======================
     Lógica de avance real: SOLO 'Siguiente módulo'
     ======================= */
  function isNextModuleButton(el){
    if(!el) return false;
    if(el.dataset.nextModule === '1' || el.dataset.action === 'next-module') return true;
    if(el.classList.contains('next-module') || el.id === 'nextModule') return true;
    const txt = (el.textContent || '').trim().toLowerCase();
    return txt === 'siguiente módulo' || txt === 'siguiente modulo';
  }

  function initNextModuleTracking(){
    document.addEventListener('click', function(ev){
      const el = ev.target.closest('button, a');
      if(!el) return;
      if(isNextModuleButton(el)){
        const current = getActiveSection();
        if(current) markCompleted(current);
      }
    });
  }

  /* =======================
     Init
     ======================= */
  function init(){
    ensureLegacyCompat();
    initExportImport();
    initPreview();
    initNextModuleTracking(); // sustituye a contar clics en sidebar

    updateProgressUI();
  }

  document.addEventListener("DOMContentLoaded", init);
})();