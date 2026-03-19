// === MC Bridge JS ===
// Fuerza: un solo progreso en sidebar, toggle Básico/Pro, gating 'Siguiente módulo', palomillas ✓
(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));

  const STORAGE = 'mc-campus';
  const KEYS = { PROGRESS:'progress', AUDIENCE:'audience' };

  // Edita aquí el reparto si lo deseas
  const BASIC = ['intro','module1','module3','module4','module7'];
  const PRO   = ['module2','module5','module6'];

  const ALWAYS = ['games','glossary','timeline','simulator','plantillas']; // visibles en ambas

  function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE))||{}; }catch{ return {}; } }
  function saveState(st){ localStorage.setItem(STORAGE, JSON.stringify(st)); }
  function getAudience(){ const st = loadState(); return st[KEYS.AUDIENCE] || 'basic'; }
  function setAudience(a){ const st = loadState(); st[KEYS.AUDIENCE]=a; saveState(st); applyAudience(); updateProgressUI(); }

  function modulesFor(a){ return a==='pro'? PRO : BASIC; }

  function ensureToggle(){
    const sidebar = $('.sidebar'); const menu = $('.sidebar-menu'); if(!sidebar || !menu) return;
    if($('.audience-toggle')) return;
    const box = document.createElement('div'); box.className='audience-toggle';
    box.innerHTML = '<button id="btnBasic" class="toggle-btn" data-audience="basic">Básico</button><button id="btnPro" class="toggle-btn" data-audience="pro">Pro</button>';
    sidebar.insertBefore(box, menu);
    $('#btnBasic').addEventListener('click', ()=> setAudience('basic'));
    $('#btnPro').addEventListener('click', ()=> setAudience('pro'));
  }

  function ensurePlantillasLink(){
    const menu = $('.sidebar-menu'); if(!menu) return;
    if(!menu.querySelector('a[data-section="plantillas"]')){
      const a = document.createElement('a'); a.href='#plantillas'; a.setAttribute('data-section','plantillas'); a.textContent='🧩 Plantillas';
      // insert near end
      menu.appendChild(a);
    }
  }

  function relocateProgressWidget(){
    const sidebar = $('.sidebar'); const menu = $('.sidebar-menu'); if(!sidebar||!menu) return;
    let our = $('#sidebarProgress');
    if(!our){
      our = document.createElement('div'); our.id='sidebarProgress';
      our.innerHTML = '<div class="sp-head"><span>Progreso</span><span id="sp-count">0/0</span></div><div class="sp-bar"><div class="sp-fill" id="sp-fill" style="width:0%"></div></div><div class="sp-actions"><button id="sp-export" class="btn outline">Exportar (.json)</button><input id="sp-import-file" type="file" accept="application/json" hidden><button id="sp-import" class="btn outline">Importar (.json)</button></div>';
      sidebar.appendChild(our);
    }
    // Eliminar bloques "Progreso General" y "Logros"
    Array.from(sidebar.children).forEach(el=>{
      if(el===our || el.classList?.contains('audience-toggle') || el.classList?.contains('sidebar-menu')) return;
      const txt = (el.textContent||'').toLowerCase();
      if(txt.includes('progreso general') || txt.includes('logros')) el.remove();
    });
    // Colocar justo debajo del menú
    if(our.previousElementSibling !== menu){
      menu.insertAdjacentElement('afterend', our);
    }
    // Wire import/export
    $('#sp-export')?.addEventListener('click', exportProgress);
    $('#sp-import')?.addEventListener('click', ()=> $('#sp-import-file').click());
    $('#sp-import-file')?.addEventListener('change', ()=>{
      const f = $('#sp-import-file').files && $('#sp-import-file').files[0];
      if(f) importProgressFromFile(f);
    });
  }

  function applyAudience(){
    const aud = getAudience();
    $('#btnBasic')?.classList.toggle('active', aud==='basic');
    $('#btnPro')?.classList.toggle('active', aud==='pro');
    const allowed = new Set(modulesFor(aud).concat(ALWAYS));
    $$('.sidebar-menu a[data-section]').forEach(a=>{
      const sec = a.getAttribute('data-section');
      a.style.display = allowed.has(sec) ? '' : 'none';
    });
    $$('.section[id]').forEach(sec=>{
      const id = sec.id;
      sec.style.display = allowed.has(id) ? '' : 'none';
      if(id==='plantillas') sec.style.display='none'; // solo al entrar
    });
    // Focus primer módulo de la audiencia
    const first = modulesFor(aud)[0];
    if(first){
      const link = document.querySelector(`.sidebar-menu a[data-section="${first}"]`);
      if(link) link.click();
      location.hash = '#'+first;
    }
  }

  // ==== Progreso ====
  function getProgress(){ const st = loadState(); const aud = getAudience(); return (st[KEYS.PROGRESS]&&st[KEYS.PROGRESS][aud]) || { completed: [] }; }
  function setProgress(p){ const st = loadState(); st[KEYS.PROGRESS]=st[KEYS.PROGRESS]||{}; st[KEYS.PROGRESS][getAudience()] = p; saveState(st); }
  function markCompleted(section){
    const p = getProgress();
    if(!p.completed.includes(section)){ p.completed.push(section); setProgress(p); }
    updateProgressUI();
  }
  function calcPct(){
    const total = modulesFor(getAudience()).length || 1;
    const done = getProgress().completed.filter(x=> modulesFor(getAudience()).includes(x)).length;
    return {pct: Math.round(done*100/total), done, total};
  }
  function updateProgressUI(){
    const {pct, done, total} = calcPct();
    const fill = $('#sp-fill'); if(fill) fill.style.width = pct+'%';
    const c = $('#sp-count'); if(c) c.textContent = `${done}/${total}`;
    paintTicks();
  }
  function paintTicks(){
    const doneSet = new Set(getProgress().completed);
    $$('.sidebar-menu a[data-section]').forEach(a=>{
      const id = a.getAttribute('data-section');
      if(doneSet.has(id)) a.classList.add('done'); else a.classList.remove('done');
    });
  }

  // ==== Import/Export ====
  function exportProgress(){
    const data = { schema:'minicampus-v1', exported_at:new Date().toISOString(), audience:getAudience(), state: loadState() };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='minicampus_progreso.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importProgressFromFile(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if(!data || data.schema!=='minicampus-v1' || !data.state) throw 0;
        localStorage.setItem(STORAGE, JSON.stringify(data.state));
        if(data.audience) setAudience(data.audience); else applyAudience();
        updateProgressUI();
        alert('Progreso importado correctamente.');
      }catch(e){ alert('Archivo .json inválido.'); }
    };
    reader.readAsText(file,'utf-8');
  }

  // ==== Gating 'Siguiente módulo' ====
  function isNextElement(el){
    if(!el) return false;
    if(el.matches('[data-action="next-module"], .next-module, #nextModule')) return true;
    const t = (el.textContent||'').trim().toLowerCase();
    return t==='siguiente módulo' || t==='siguiente modulo';
  }
  function sectionQuizPassed(sec){
    if(!sec) return true;
    const qs = Array.from(sec.querySelectorAll('.quiz-question,[data-question],.question'));
    if(qs.length===0) return true;
    for(const q of qs){
      const txt = q.querySelector('input[type="text"][data-answer]');
      if(txt){
        const want=(txt.getAttribute('data-answer')||'').trim().toLowerCase();
        const got=(txt.value||'').trim().toLowerCase();
        if(!want || got!==want) return false; continue;
      }
      const opts = q.querySelectorAll('input[type="radio"][data-correct], input[type="checkbox"][data-correct]');
      if(opts.length){
        for(const o of opts){
          const should = o.getAttribute('data-correct')==='1' || o.getAttribute('data-correct')==='true';
          const checked = !!o.checked;
          if(should !== checked) return false;
        }
        continue;
      }
      const correct = q.querySelector('[data-correct="1"].is-selected, [data-correct="true"].is-selected');
      if(!correct) return false;
    }
    return true;
  }
  function hideAllNext(){
    $$('button, a').forEach(el=>{
      if(isNextElement(el)){
        el.classList.remove('ready'); el.setAttribute('disabled','disabled'); el.style.display='none';
        if(el.tagName.toLowerCase()==='a') el.classList.add('next-module');
      }
    });
  }
  function gateNext(){
    hideAllNext();
    function maybeEnable(sec){
      if(!sec) return;
      const btn = sec.querySelector('[data-action="next-module"], .next-module, #nextModule') ||
                  Array.from(sec.querySelectorAll('button, a')).find(isNextElement);
      if(!btn) return;
      if(sectionQuizPassed(sec)){
        btn.classList.add('ready'); btn.removeAttribute('disabled'); btn.style.display='inline-block';
      }
    }
    document.addEventListener('input', e=> maybeEnable(e.target.closest('.section[id]')));
    document.addEventListener('click', e=> {
      const sec = e.target.closest('.section[id]');
      maybeEnable(sec);
      const el = e.target.closest('button, a'); if(!el || !isNextElement(el)) return;
      if(!(el.classList.contains('ready') && !el.disabled)){ e.preventDefault(); e.stopPropagation(); return; }
      const current = sec ? sec.id : null; if(current) markCompleted(current);
    }, true);
  }

  // ==== Onboarding popup ====
  function ensureOnboarding(){
    if($('#onboarding')) return;
    const wrap = document.createElement('div'); wrap.id='onboarding'; wrap.className='modal-overlay'; wrap.style.display='grid';
    wrap.innerHTML = '<div class="modal-window"><h3>Bienvenido/a</h3><p>Importa tu progreso si ya tienes un .json o empieza por el modo Básico.</p><div class="modal-actions"><button id="ob-import" class="btn primary">Añadir .json</button><input id="ob-file" type="file" accept="application/json" hidden><button id="ob-basic" class="btn outline">Empezar en modo Básico</button></div></div>';
    document.body.appendChild(wrap);
    $('#ob-import').addEventListener('click', ()=> $('#ob-file').click());
    $('#ob-file').addEventListener('change', ()=>{
      const f = $('#ob-file').files && $('#ob-file').files[0];
      if(f) importProgressFromFile(f);
      wrap.remove();
    });
    $('#ob-basic').addEventListener('click', ()=>{ setAudience('basic'); wrap.remove(); });
  }

  function initBridge(){
    ensureToggle();
    ensurePlantillasLink();
    relocateProgressWidget();
    applyAudience();
    updateProgressUI();
    gateNext();
    if(!loadState()[KEYS.AUDIENCE]) ensureOnboarding();
  }

  document.addEventListener('DOMContentLoaded', initBridge);
})();