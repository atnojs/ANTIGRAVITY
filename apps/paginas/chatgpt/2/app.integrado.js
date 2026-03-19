
// === Integración Básico/Pro + Plantillas + Progreso sidebar ===
(function(){
  const $ = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));
  const STORAGE = 'mc-campus';
  const PROGRESS = 'progress';
  const AUDIENCE = 'audience';

  // Config audiencias: mapea data-section de tu sidebar
  const BASIC = ['intro','module1','module3','module4','module7'];
  const PRO   = ['module2','module5','module6'];

  // Plantillas disponibles en /descargables
  const TEMPLATES = [
    {file:'instrucciones_base.md', title:'Instrucciones base'},
    {file:'dataset_guis.md', title:'Dataset & GUIs'},
    {file:'estructura_gpt_pliegos.md', title:'Estructura GPT pliegos'},
    {file:'arquitecto_gpt.md', title:'Arquitecto GPT'},
    {file:'asistente_codigo_gpt.md', title:'Asistente de código GPT'},
  ];

  function loadState(){
    try{ return JSON.parse(localStorage.getItem(STORAGE)) || {}; }catch{ return {}; }
  }
  function saveState(st){ localStorage.setItem(STORAGE, JSON.stringify(st)); }

  function getAudience(){
    const st = loadState();
    return st[AUDIENCE] || 'basic';
  }
  function setAudience(aud){
    const st = loadState();
    st[AUDIENCE] = aud;
    saveState(st);
    applyAudience();
    updateProgressUI();
  }

  function modulesFor(aud){
    return aud==='pro' ? PRO : BASIC;
  }

  function applyAudience(){
    const aud = getAudience();
    // Toggle buttons
    $('#btnBasic')?.classList.toggle('active', aud==='basic');
    $('#btnPro')?.classList.toggle('active', aud==='pro');
    // Show/hide modules
    const allowed = new Set(modulesFor(aud));
    $$('.sidebar-menu a[data-section]').forEach(a=>{
      const sec = a.getAttribute('data-section');
      if(['games','glossary','timeline','simulator','plantillas'].includes(sec)) { a.style.display=''; return; }
      a.style.display = allowed.has(sec) ? '' : 'none';
    });
    // Show corresponding main sections
    $$('.section[id]').forEach(sec=>{
      const id = sec.id;
      if(id==='plantillas'){ sec.style.display='none'; return; }
      if(['games','glossary','timeline','simulator','progress'].includes(id)){ sec.style.display=''; return; }
      sec.style.display = modulesFor(aud).includes(id) ? '' : 'none';
    });
    // Focus first module
    const first = modulesFor(aud)[0];
    if(first){
      const link = document.querySelector(`.sidebar-menu a[data-section="${first}"]`);
      if(link) link.click();
      location.hash = '#'+first;
    }
  }

  // Progress
  function getProgress(){
    const st = loadState();
    const aud = getAudience();
    const p = (st[PROGRESS] && st[PROGRESS][aud]) || { completed: [] };
    return {aud, ...p};
  }
  function setProgress(p){
    const st = loadState();
    st[PROGRESS] = st[PROGRESS] || {};
    st[PROGRESS][p.aud] = { completed: p.completed };
    saveState(st);
  }
  function markCompleted(section){
    const p = getProgress();
    if(!p.completed.includes(section)){ p.completed.push(section); setProgress(p); }
    updateProgressUI();
  }
  function resetProgress(){
    const st = loadState();
    const aud = getAudience();
    if(st[PROGRESS]) st[PROGRESS][aud] = { completed: [] };
    saveState(st);
    updateProgressUI();
  }
  function calcPct(){
    const p = getProgress();
    const total = modulesFor(p.aud).length || 1;
    const done = p.completed.filter(x=> modulesFor(p.aud).includes(x)).length;
    const pct = Math.round(done*100/total);
    return {pct, done, total};
  }
  function updateProgressUI(){
    const {pct, done, total} = calcPct();
    $('#sp-fill')?.style && ($('#sp-fill').style.width = pct+'%');
    const cnt = $('#sp-count'); if(cnt) cnt.textContent = `${done}/${total}`;
  }

  // Export/Import
  function exportProgress(){
    const st = loadState();
    const data = {
      schema:'minicampus-v1',
      exported_at:new Date().toISOString(),
      audience: getAudience(),
      state: st
    };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='minicampus_progreso.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importProgressFromFile(file, onDone){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(!data || data.schema!=='minicampus-v1' || !data.state) throw new Error('bad');
        localStorage.setItem(STORAGE, JSON.stringify(data.state));
        if(data.audience) setAudience(data.audience); else applyAudience();
        updateProgressUI();
        onDone && onDone(true);
      }catch(e){ onDone && onDone(false); }
    };
    reader.readAsText(file, 'utf-8');
  }

  // Quiz gating
  function sectionQuizPassed(sectionEl){
    if(!sectionEl) return true;
    const qs = Array.from(sectionEl.querySelectorAll('.quiz-question,[data-question],.question'));
    if(qs.length===0) return true;
    for(const q of qs){
      const textIn = q.querySelector('input[type="text"][data-answer]');
      if(textIn){
        const want = (textIn.getAttribute('data-answer')||'').trim().toLowerCase();
        const got  = (textIn.value||'').trim().toLowerCase();
        if(!want || got!==want) return false;
        continue;
      }
      const opts = q.querySelectorAll('input[type="radio"][data-correct], input[type="checkbox"][data-correct]');
      if(opts.length){
        for(const opt of opts){
          const should = (opt.getAttribute('data-correct')==='1' || opt.getAttribute('data-correct')==='true');
          const checked = !!opt.checked;
          if(should !== checked) return false;
        }
        continue;
      }
      const correct = q.querySelector('[data-correct="1"].is-selected, [data-correct="true"].is-selected');
      if(!correct) return false;
    }
    return true;
  }
  function initNextButtons(){
    // Hide by default; show only when quiz passed
    document.addEventListener('input', e=>{
      const sec = e.target.closest('.section[id]'); if(!sec) return;
      const btn = sec.querySelector('[data-action="next-module"], .next-module, #nextModule');
      if(!btn) return;
      if(sectionQuizPassed(sec)){ btn.classList.add('ready'); btn.removeAttribute('disabled'); btn.style.display='inline-block'; }
    });
    document.addEventListener('click', e=>{
      const sec = e.target.closest('.section[id]'); if(!sec) return;
      const btn = sec.querySelector('[data-action="next-module"], .next-module, #nextModule');
      if(!btn) return;
      if(sectionQuizPassed(sec)){ btn.classList.add('ready'); btn.removeAttribute('disabled'); btn.style.display='inline-block'; }
    });
    // Completion when clicking next
    document.addEventListener('click', e=>{
      const el = e.target.closest('button, a'); if(!el) return;
      const isNext = el.matches('[data-action="next-module"], .next-module, #nextModule');
      if(!isNext) return;
      const sec = el.closest('.section[id]'); if(!sec) return;
      if(!sectionQuizPassed(sec)){ e.preventDefault(); return; }
      markCompleted(sec.id);
    });
  }

  // Templates
  function renderTemplates(){
    const list = $('#tpl-list'); if(!list) return;
    list.innerHTML = '';
    TEMPLATES.forEach(t=>{
      const card = document.createElement('div');
      card.className = 'tpl-card';
      card.innerHTML = `<div class="title">${t.title}</div>
        <div class="actions">
          <button class="btn outline" data-preview="${t.file}">Vista previa</button>
          <button class="btn" data-download="${t.file}">Descargar</button>
        </div>`;
      list.appendChild(card);
    });
    list.addEventListener('click', e=>{
      const p = e.target.closest('[data-preview]'); const d = e.target.closest('[data-download]');
      if(p){ openPreview(p.getAttribute('data-preview')); }
      if(d){
        const a = document.createElement('a');
        a.href = 'descargables/'+d.getAttribute('data-download');
        a.download = d.getAttribute('data-download'); document.body.appendChild(a); a.click(); a.remove();
      }
    });
    $('#tpl-close')?.addEventListener('click', ()=> $('#tpl-preview').style.display='none');
    $('#tpl-download')?.addEventListener('click', ()=>{
      const path = $('#tpl-download').getAttribute('data-file'); if(!path) return;
      const a = document.createElement('a'); a.href = 'descargables/'+path; a.download = path; document.body.appendChild(a); a.click(); a.remove();
    });
  }
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
  async function openPreview(file){
    const box = $('#tpl-preview'); const body = $('#tpl-body'); const title = $('#tpl-title');
    const dl = $('#tpl-download');
    if(!box || !body || !title || !dl) return;
    title.textContent = file;
    body.innerHTML = '<p class="mc-muted">Cargando...</p>';
    dl.setAttribute('data-file', file);
    box.style.display = 'block';
    try{
      const res = await fetch('descargables/'+file, {cache:'no-cache'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const md = await res.text();
      body.innerHTML = renderMD(md);
    }catch(e){
      body.innerHTML = '<p>No se pudo cargar la vista previa.</p>';
    }
  }

  // Onboarding modal
  function showOnboarding(){
    const el = $('#onboarding'); if(!el) return;
    el.style.display = 'grid';
    $('#ob-import')?.addEventListener('click', ()=> $('#ob-file').click());
    $('#ob-file')?.addEventListener('change', ()=>{
      const f = $('#ob-file').files && $('#ob-file').files[0];
      if(f) importProgressFromFile(f, ok=>{ if(ok){ el.style.display='none'; } });
    });
    $('#ob-basic')?.addEventListener('click', ()=>{
      setAudience('basic'); el.style.display='none';
    });
  }

  function init(){
    // Audience toggle
    $('#btnBasic')?.addEventListener('click', ()=> setAudience('basic'));
    $('#btnPro')?.addEventListener('click',   ()=> setAudience('pro'));

    // Progress import/export
    $('#sp-export')?.addEventListener('click', exportProgress);
    $('#sp-import')?.addEventListener('click', ()=> $('#sp-import-file').click());
    $('#sp-import-file')?.addEventListener('change', ()=>{
      const f = $('#sp-import-file').files && $('#sp-import-file').files[0];
      if(f) importProgressFromFile(f);
    });

    // Templates
    renderTemplates();

    // Next buttons & gating
    initNextButtons();

    // First time audience + onboarding
    if(!loadState()[AUDIENCE]){
      showOnboarding();
      setAudience('basic');
    }else{
      applyAudience();
    }

    updateProgressUI();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/* ===== v2 patches ===== */

function relocateProgressWidget(){
  const sidebar = document.querySelector('.sidebar');
  const menu = document.querySelector('.sidebar-menu');
  const our = document.getElementById('sidebarProgress');
  if(!sidebar || !menu || !our) return;
  Array.from(sidebar.children).forEach(el => {
    if(el === our) return;
    const txt = (el.textContent || '').toLowerCase();
    if(txt.includes('progreso general') || txt.includes('logros')){
      el.remove();
    }
  });
  if(our.previousElementSibling !== menu){
    menu.insertAdjacentElement('afterend', our);
  }
}

function paintCompletedTicks(){
  const st = loadState(); const aud = getAudience();
  const completed = ((st[PROGRESS]||{})[aud]||{completed:[]}).completed || [];
  document.querySelectorAll('.sidebar-menu a[data-section]').forEach(a=>{
    const id = a.getAttribute('data-section');
    if(completed.includes(id)) a.classList.add('done');
    else a.classList.remove('done');
  });
}

function isNextElement(el){
  if(!el) return false;
  if(el.matches('[data-action="next-module"], .next-module, #nextModule')) return true;
  const text = (el.textContent || '').trim().toLowerCase();
  return text === 'siguiente módulo' || text === 'siguiente modulo';
}
function ensureNextButtonsHidden(){
  document.querySelectorAll('button, a').forEach(el=>{
    if(isNextElement(el)){
      el.classList.remove('ready');
      el.setAttribute('disabled','disabled');
      if(el.tagName.toLowerCase()==='a') el.classList.add('next-module');
      el.style.display = 'none';
    }
  });
}

function initNextButtons_v2(){
  ensureNextButtonsHidden();
  function maybeEnable(sec){
    if(!sec) return;
    const btn = sec.querySelector('[data-action="next-module"], .next-module, #nextModule') ||
                Array.from(sec.querySelectorAll('button, a')).find(isNextElement);
    if(!btn) return;
    if(sectionQuizPassed(sec)){
      btn.classList.add('ready'); btn.removeAttribute('disabled'); btn.style.display = 'inline-block';
    }
  }
  document.addEventListener('input', e=> maybeEnable(e.target.closest('.section[id]')));
  document.addEventListener('click', e=> {
    const sec = e.target.closest('.section[id]');
    maybeEnable(sec);
    const el = e.target.closest('button, a'); if(!el || !isNextElement(el)) return;
    if(el.classList.contains('ready') && !el.disabled){
      const current = sec ? sec.id : null;
      if(current) markCompleted(current);
    }else{
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
}

(function(){
  const _init = init;
  init = function(){
    _init();
    relocateProgressWidget();
    paintCompletedTicks();
    initNextButtons_v2();
    updateProgressUI();
  };
})();

(function(){
  const _setProgress = setProgress;
  setProgress = function(p){ _setProgress(p); paintCompletedTicks(); };
  const _resetProgress = resetProgress;
  resetProgress = function(){ _resetProgress(); paintCompletedTicks(); };
  const _markCompleted = markCompleted;
  markCompleted = function(section){ _markCompleted(section); paintCompletedTicks(); };
})();
