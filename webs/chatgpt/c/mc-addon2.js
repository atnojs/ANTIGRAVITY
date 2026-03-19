// ===== Minicampus Addon v7 =====
// - Azul corporativo
// - Anillo compacto
// - Import/Export visibles
// - Progreso SOLO al pasar el quiz y pulsar "Siguiente módulo"
(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));

  const STORAGE_KEY = 'minicampusProgress';
  const LAST_KEY = 'minicampusLastSection';

  /* ---------- Compatibilidad con funciones antiguas ---------- */
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
    // Elementos esperados por el JS viejo (en oculto)
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

  /* ---------- Estado progreso ---------- */
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
    try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) data = Object.assign(data, JSON.parse(raw)); }catch{}
    return data;
  }
  function saveProgress(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function markCompleted(section){
    if(!section) return;
    const data = loadProgress();
    if(!data.moduleCompleted.includes(section)){ data.moduleCompleted.push(section); }
    data.last_section = section;
    saveProgress(data);
    localStorage.setItem(LAST_KEY, section);
    updateProgressUI();
  }

  /* ---------- UI Progreso ---------- */
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
      const accent = getComputedStyle($('.mc-progress-card') || document.documentElement).getPropertyValue('--mc-accent').trim() || '#2da8ff';
      ring.style.stroke = accent;
    }
    if(fill){ fill.style.width = pct + '%'; }

    // Compatibles con UI antigua
    const legacyBar = document.getElementById('finalProgress');
    const legacyText = document.getElementById('finalProgressText');
    if(legacyBar) legacyBar.style.width = pct + '%';
    if(legacyText) legacyText.textContent = pct + '% completado';
  }

  /* ---------- Importar / Exportar ---------- */
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
      }catch(e){ alert("No se pudo importar. Selecciona un .json válido."); }
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

  /* ---------- Quiz gating: desbloquear 'Siguiente módulo' ---------- */
  function isNextModuleButton(el){
    if(!el) return false;
    if(el.dataset.nextModule === '1' || el.dataset.action === 'next-module') return true;
    if(el.classList.contains('next-module') || el.id === 'nextModule') return true;
    const txt = (el.textContent || '').trim().toLowerCase();
    return txt === 'siguiente módulo' || txt === 'siguiente modulo';
  }

  function findNextBtn(scope){
    const root = scope || document;
    return root.querySelector('[data-action="next-module"], .next-module, #nextModule');
  }

  function setNextEnabled(sectionEl, enabled){
    const btn = findNextBtn(sectionEl);
    if(!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('is-disabled', !enabled);
  }

  // Heurística de validación genérica:
  // - Cada .quiz-question dentro de la sección debe estar resuelta.
  //   Patrones admitidos:
  //   a) input[type=radio|checkbox][data-correct="1"] -> deben estar seleccionados los correctos y no los incorrectos
  //   b) input[data-answer="texto"] -> debe coincidir ignorando mayúsculas/espacios
  function sectionQuizPassed(sectionEl){
    if(!sectionEl) return true; // si no hay quiz, sin bloqueo
    const questions = Array.from(sectionEl.querySelectorAll('.quiz-question,[data-question]'));
    if(questions.length === 0) return true;

    for(const q of questions){
      // tipo texto con data-answer
      const textIn = q.querySelector('input[type="text"][data-answer]');
      if(textIn){
        const want = (textIn.getAttribute('data-answer')||'').trim().toLowerCase();
        const got  = (textIn.value||'').trim().toLowerCase();
        if(want === '' || got !== want) return false;
        continue;
      }
      // opciones con data-correct
      const options = q.querySelectorAll('input[type="radio"][data-correct], input[type="checkbox"][data-correct]');
      if(options.length){
        for(const opt of options){
          const should = opt.getAttribute('data-correct') === '1' || opt.getAttribute('data-correct') === 'true';
          const checked = !!opt.checked;
          if(should !== checked) return false;
        }
        continue;
      }
      // opción por clase .is-selected y data-correct
      const correct = q.querySelector('[data-correct="1"].is-selected, [data-correct="true"].is-selected');
      if(!correct) return false;
    }
    return true;
  }

  function initQuizGating(){
    // Deshabilitar botones al inicio en secciones con quiz
    $$('.section[id]').forEach(sec => {
      const btn = findNextBtn(sec);
      if(!btn) return;
      const hasQuiz = sec.querySelector('.quiz-question,[data-question]');
      if(hasQuiz){ setNextEnabled(sec, false); }
    });

    // Comprobar cambios en inputs para habilitar
    document.addEventListener('input', ev => {
      const sec = ev.target.closest('.section[id]');
      if(!sec) return;
      const btn = findNextBtn(sec);
      if(!btn) return;
      if(sectionQuizPassed(sec)){ setNextEnabled(sec, true); }
    });
    document.addEventListener('click', ev => {
      const sec = ev.target.closest('.section[id]');
      if(!sec) return;
      const btn = findNextBtn(sec);
      if(!btn) return;
      if(sectionQuizPassed(sec)){ setNextEnabled(sec, true); }
    });

    // API manual por si tu quiz es custom:
    window.mcPassQuiz = function(sectionId){
      const sec = sectionId ? document.getElementById(sectionId) : $('.section[id]:not([hidden])');
      if(sec) setNextEnabled(sec, true);
    };
  }

  // Al pulsar "Siguiente módulo" solo marcamos completado si está habilitado
  function initNextButtonCompletion(){
    document.addEventListener('click', function(ev){
      const el = ev.target.closest('button, a');
      if(!el || !isNextModuleButton(el)) return;
      const sec = el.closest('.section[id]');
      if(el.disabled || el.classList.contains('is-disabled')){
        ev.preventDefault();
        return;
      }
      const current = sec ? sec.id : getActiveSection();
      if(current) markCompleted(current);
    });
  }

  /* ---------- Init ---------- */
  function init(){
    ensureLegacyCompat();
    initExportImport();
    initQuizGating();
    initNextButtonCompletion();
    updateProgressUI();
  }
  document.addEventListener("DOMContentLoaded", init);
})();