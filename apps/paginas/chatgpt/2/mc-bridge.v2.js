// === MC Bridge v2 JS ===
(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));

  const STORAGE = 'mc-campus';
  const KEYS = { PROGRESS:'progress', AUDIENCE:'audience' };
  const BASIC = ['intro','module1','module3','module4','module7'];
  const PRO   = ['module2','module5','module6'];
  const ALWAYS = ['games','glossary','timeline','simulator','plantillas'];

  function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE))||{}; }catch{ return {}; } }
  function saveState(st){ localStorage.setItem(STORAGE, JSON.stringify(st)); }
  function getAudience(){ return (loadState()[KEYS.AUDIENCE]) || 'basic'; }
  function setAudience(a){ const st=loadState(); st[KEYS.AUDIENCE]=a; saveState(st); applyAudience(); updateProgressUI(); }

  function modulesFor(a){ return a==='pro'? PRO : BASIC; }

  // Toggle robusto
  function ensureToggle(){
    const sidebar = $('.sidebar'); const menu = $('.sidebar-menu'); if(!sidebar || !menu) return;
    let box = $('.audience-toggle');
    if(!box){
      box = document.createElement('div'); box.className='audience-toggle'; sidebar.insertBefore(box, menu);
    }
    if(!$('#btnBasic')){
      const b = document.createElement('button'); b.id='btnBasic'; b.className='toggle-btn'; b.dataset.audience='basic'; b.textContent='Básico'; box.appendChild(b);
      b.addEventListener('click', ()=> setAudience('basic'));
    }
    if(!$('#btnPro')){
      const p = document.createElement('button'); p.id='btnPro'; p.className='toggle-btn'; p.dataset.audience='pro'; p.textContent='Pro'; box.appendChild(p);
      p.addEventListener('click', ()=> setAudience('pro'));
    }
  }

  function ensurePlantillasLink(){
    const menu = $('.sidebar-menu'); if(!menu) return;
    if(!menu.querySelector('a[data-section="plantillas"]')){
      const a = document.createElement('a'); a.href='#plantillas'; a.setAttribute('data-section','plantillas'); a.textContent='🧩 Plantillas';
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
    // Retira bloques heredados
    Array.from(sidebar.children).forEach(el=>{
      if(el===our || el.classList?.contains('audience-toggle') || el.classList?.contains('sidebar-menu')) return;
      const txt=(el.textContent||'').toLowerCase();
      if(txt.includes('progreso general') || txt.includes('logros')) el.remove();
    });
    if(our.previousElementSibling !== menu){ menu.insertAdjacentElement('afterend', our); }
    // Wire import/export
    $('#sp-export')?.addEventListener('click', exportProgress);
    $('#sp-import')?.addEventListener('click', ()=> $('#sp-import-file').click());
    $('#sp-import-file')?.addEventListener('change', ()=>{
      const f = $('#sp-import-file').files && $('#sp-import-file').files[0]; if(f) importProgressFromFile(f);
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
      if(id==='plantillas') sec.style.display='none';
    });
    // Focus primer módulo visible
    const first = modulesFor(aud)[0];
    const link = first && document.querySelector(`.sidebar-menu a[data-section="${first}"]`);
    if(link){ link.click(); location.hash = '#'+first; }
  }

  // ==== Progreso sidebar ====
  function getProgress(){ const st=loadState(); const aud=getAudience(); return (st[KEYS.PROGRESS]&&st[KEYS.PROGRESS][aud]) || {completed:[]}; }
  function setProgress(p){ const st=loadState(); st[KEYS.PROGRESS]=st[KEYS.PROGRESS]||{}; st[KEYS.PROGRESS][getAudience()]=p; saveState(st); }
  function markCompleted(section){ const p=getProgress(); if(!p.completed.includes(section)){ p.completed.push(section); setProgress(p);} updateProgressUI(); }
  function calcPct(){ const total=modulesFor(getAudience()).length||1; const done=getProgress().completed.filter(x=>modulesFor(getAudience()).includes(x)).length; return {pct:Math.round(done*100/total),done,total}; }
  function updateProgressUI(){ const {pct,done,total}=calcPct(); const f=$('#sp-fill'); if(f) f.style.width=pct+'%'; const c=$('#sp-count'); if(c) c.textContent=`${done}/${total}`; paintTicks(); }
  function paintTicks(){ const done=new Set(getProgress().completed); $$('.sidebar-menu a[data-section]').forEach(a=>{ const id=a.getAttribute('data-section'); a.classList.toggle('done', done.has(id)); }); }

  // ==== Import/Export ====
  function exportProgress(){ const data={schema:'minicampus-v1',exported_at:new Date().toISOString(),audience:getAudience(),state:loadState()}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='minicampus_progreso.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function importProgressFromFile(file){ const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d||d.schema!=='minicampus-v1'||!d.state) throw 0; localStorage.setItem(STORAGE, JSON.stringify(d.state)); if(d.audience) setAudience(d.audience); else applyAudience(); updateProgressUI(); alert('Progreso importado.'); }catch(e){ alert('JSON inválido.'); } }; r.readAsText(file,'utf-8'); }

  // ==== Gating 'Siguiente módulo' ====
  function isNextElement(el){ if(!el) return false; if(el.matches('[data-action="next-module"], .next-module, #nextModule')) return true; const t=(el.textContent||'').trim().toLowerCase(); return t==='siguiente módulo' || t==='siguiente modulo'; }
  function sectionQuizPassed(sec){
    if(!sec) return true;
    const qs=Array.from(sec.querySelectorAll('.quiz-question,[data-question],.question'));
    if(qs.length===0) return true;
    for(const q of qs){
      const txt=q.querySelector('input[type="text"][data-answer]');
      if(txt){ const want=(txt.getAttribute('data-answer')||'').trim().toLowerCase(); const got=(txt.value||'').trim().toLowerCase(); if(!want||got!==want) return false; continue; }
      const opts=q.querySelectorAll('input[type="radio"][data-correct], input[type="checkbox"][data-correct]');
      if(opts.length){ for(const o of opts){ const should=o.getAttribute('data-correct')==='1'||o.getAttribute('data-correct')==='true'; const checked=!!o.checked; if(should !== checked) return false; } continue; }
      const correct=q.querySelector('[data-correct="1"].is-selected, [data-correct="true"].is-selected'); if(!correct) return false;
    }
    return true;
  }
  function hideAllNext(){
    $$('button, a').forEach(el=>{
      if(isNextElement(el)){
        el.classList.remove('ready'); el.classList.add('next-locked'); el.setAttribute('disabled','disabled'); el.style.display='none';
        if(el.tagName.toLowerCase()==='a') el.classList.add('next-module');
      }
    });
  }
  function gateNext(){
    hideAllNext();
    const enableFor = (sec)=>{
      if(!sec) return;
      const btn = sec.querySelector('[data-action="next-module"], .next-module, #nextModule') ||
                  Array.from(sec.querySelectorAll('button, a')).find(isNextElement);
      if(!btn) return;
      if(sectionQuizPassed(sec)){
        btn.classList.add('ready'); btn.classList.remove('next-locked'); btn.removeAttribute('disabled'); btn.style.display='inline-block';
      }
    };
    document.addEventListener('input', e=> enableFor(e.target.closest('.section[id]')));
    document.addEventListener('click', e=> {
      const sec=e.target.closest('.section[id]'); enableFor(sec);
      const el=e.target.closest('button, a'); if(!el||!isNextElement(el)) return;
      if(!(el.classList.contains('ready') && !el.disabled)){ e.preventDefault(); e.stopPropagation(); return; }
      const current = sec ? sec.id : null; if(current) markCompleted(current);
    }, true);
    // Observer para botones que aparezcan dinámicamente
    const obs = new MutationObserver(()=> hideAllNext());
    obs.observe(document.body, {childList:true, subtree:true});
  }

  // ==== Onboarding ====
  function ensureOnboarding(){
    if($('#onboarding')) return;
    const wrap=document.createElement('div'); wrap.id='onboarding'; wrap.className='modal-overlay'; wrap.style.display='grid';
    wrap.innerHTML='<div class="modal-window"><h3>Bienvenido/a</h3><p>Importa tu progreso si ya tienes un .json o empieza por el modo Básico.</p><div class="modal-actions"><button id="ob-import" class="btn primary">Añadir .json</button><input id="ob-file" type="file" accept="application/json" hidden><button id="ob-basic" class="btn outline">Empezar en modo Básico</button></div></div>';
    document.body.appendChild(wrap);
    $('#ob-import').addEventListener('click', ()=> $('#ob-file').click());
    $('#ob-file').addEventListener('change', ()=>{ const f=$('#ob-file').files&&$('#ob-file').files[0]; if(f) importProgressFromFile(f); wrap.remove(); });
    $('#ob-basic').addEventListener('click', ()=>{ setAudience('basic'); wrap.remove(); });
  }

  function init(){
    ensureToggle();
    ensurePlantillasLink();
    relocateProgressWidget();
    applyAudience();
    updateProgressUI();
    gateNext();
    if(!loadState()[KEYS.AUDIENCE]) ensureOnboarding();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
