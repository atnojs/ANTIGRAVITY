(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Modelo por defecto de esta app (grupo IMAGE 2, de menor a mayor: LOW, MEDIUM, HIGH)
  const DEFAULT_MODEL = 'openai-image-2-low';
  const MODEL_LABELS = {
    'gemini-2':'GEMINI 2',
    'gemini-flash':'3.1 FLASH',
    'gemini-pro':'3 PRO',
    'openai-image-2-low':'IMAGE 2 LOW',
    'openai-image-2':'IMAGE 2 MEDIUM',
    'openai-image-2-high':'IMAGE 2 HIGH',
    'openai-medium':'MEDIUM',
    'openai-high':'HIGH',
    'openai-max-flare':'MAX FLARE',
    'openai-xhigh':'XHIGH',
    'openai-max-sunburst':'MAX SUNBURST',
    'qwen-pro':'QWEN 3 PRO'
  };
  const modelLabel = (id) => MODEL_LABELS[id] || String(id || '');
  const state = { referenceDataUrl:'', referenceName:'', analysis:null, resultDataUrl:'', selectedModel:DEFAULT_MODEL, history:null };
  const MAX_FILE = 20 * 1024 * 1024;

  // Helper genérico para grupos de pills (ar-option / res-option).
  // Usamos data-value en lugar de [class$="-option"] porque los botones
  // activos también tienen la clase "active" y dejan de coincidir con ese
  // selector, permitiendo que se acumulen varias selecciones.
  const setupPillGroup = (containerId, onChangeCallback) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn || !container.contains(btn)) return;
      container.querySelectorAll('button[data-value]').forEach(b => {
        const selected = b === btn;
        b.classList.toggle('active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      if (onChangeCallback) onChangeCallback(btn.dataset.value);
    });
  };
  const getPillValue = (containerId) => {
    return document.querySelector(`#${containerId} button[data-value].active`)?.dataset.value || '';
  };

  document.addEventListener('DOMContentLoaded', init);
  async function init(){
    bind();
    setupPillGroup('aspect-toggles');
    setupPillGroup('resolution-toggles');
    if(window.infografiaDesktop){
      $('desktop-badge').hidden=false;
      $('watch-status').textContent='Vigilando la carpeta Descargas. La última imagen descargada aparecerá automáticamente.';
      window.infografiaDesktop.onDownloadedImage((file)=>loadDesktopFile(file));
      await window.infografiaDesktop.startWatcher();
    }
    state.history=new HistoryManager('infografia_referencia');
    state.history.onChange(renderHistory);
    try{await state.history.load();}catch(e){showHistoryError(e.message)}
  }
  function bind(){
    $('google-btn').addEventListener('click',()=>window.infografiaDesktop?window.infografiaDesktop.openGoogle():window.open('https://www.google.com/search?tbm=isch&q=infograf%C3%ADa','_blank','noopener'));
    $('download-check-btn').addEventListener('click',async()=>{if(!window.infografiaDesktop)return $('reference-file').click();const file=await window.infografiaDesktop.getLatestDownload();if(file)loadDesktopFile(file);else setStatus('No encontré una imagen reciente. Usa el botón de subida.','error')});
    $('reference-file').addEventListener('change',(e)=>e.target.files[0]&&loadFile(e.target.files[0]));
    $('analyze-btn').addEventListener('click',analyze);
    $('download-json-btn').addEventListener('click',downloadJson);
    $('generate-btn').addEventListener('click',generate);
    $('regenerate-btn').addEventListener('click',generate);
    $('download-result-btn').addEventListener('click',()=>downloadDataUrl(state.resultDataUrl,'infografia-generada.png'));
    $('result-image-button').addEventListener('click',()=>openLightbox(state.resultDataUrl));
    document.querySelectorAll('.model-toggle').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.model-toggle').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');state.selectedModel=b.dataset.model}));

    const modelTooltip = document.getElementById('model-tooltip');
    if (modelTooltip) {
        const TOOLTIP_GAP = 10;
        const hideModelTooltip = () => {
            modelTooltip.classList.remove('visible', 'tip-above', 'tip-below');
            modelTooltip.setAttribute('aria-hidden', 'true');
            modelTooltip.textContent = '';
        };
        const showModelTooltip = (button) => {
            const text = (button.dataset.tooltip || '').trim();
            if (!text) { hideModelTooltip(); return; }
            modelTooltip.textContent = text;
            modelTooltip.classList.remove('tip-above', 'tip-below');
            modelTooltip.classList.add('visible');
            modelTooltip.setAttribute('aria-hidden', 'false');
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
    $('history-clear-btn').addEventListener('click',async()=>{if(confirm('¿Eliminar todo el historial?'))try{await state.history.clear()}catch(e){showHistoryError(e.message)}});
    $('lightbox').addEventListener('click',(e)=>{if(e.target===$('lightbox')||e.target.tagName==='BUTTON')$('lightbox').hidden=true});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')$('lightbox').hidden=true});
  }
  async function loadDesktopFile(file){if(!file)return;const response=await fetch(file.dataUrl);const blob=await response.blob();await loadFile(new File([blob],file.name,{type:blob.type}))}
  async function loadFile(file){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))return setStatus('Formato no válido. Usa PNG, JPG o WEBP.','error');
    if(file.size>MAX_FILE)return setStatus('La imagen supera 20 MB.','error');
    state.referenceDataUrl=await readAsDataUrl(file);state.referenceName=file.name;state.analysis=null;
    $('reference-image').src=state.referenceDataUrl;$('reference-image').hidden=false;$('reference-preview').classList.remove('empty');$('reference-preview').querySelector('.empty-copy').hidden=true;
    $('analyze-btn').disabled=false;$('download-json-btn').disabled=true;$('json-output').textContent='{}';
    setStatus(`Referencia cargada: ${file.name}`,'success');
  }
  async function analyze(){
    if(!state.referenceDataUrl)return;
    setBusy(true,'Analizando texto, paleta y composición...');
    try{
      const local=await localImageFacts(state.referenceDataUrl);
      const payload=await api({action:'analyze_infographic',image:state.referenceDataUrl,localFacts:local});
      state.analysis={...payload.analysis,archivo:state.referenceName,medidas:local.dimensions,paleta_local:local.palette};
      $('json-output').textContent=JSON.stringify(state.analysis,null,2);$('json-details').open=true;$('download-json-btn').disabled=false;
      setStatus('JSON creado. Ya puedes introducir tus datos y generar.','success');
    }catch(e){setStatus(e.message,'error')}finally{setBusy(false)}
  }
  async function generate(){
    if(!state.referenceDataUrl)return setStatus('Primero carga una referencia.','error');
    if(!state.analysis)return setStatus('Primero analiza la referencia para definir su estilo.','error');
    const free=$('free-prompt').value.trim(),title=$('title').value.trim(),subtitle=$('subtitle').value.trim(),sections=$('sections').value.trim();
    setBusy(true,'IA generando lo solicitado...');
    try{
      const aspectVal = getPillValue('aspect-toggles');
      const aspect = aspectVal === 'auto' ? ratioFromDimensions(state.analysis.medidas) : aspectVal;
      const content={free,title,subtitle,sections,audience:$('audience').value,language:$('language').value};
      const prompt=buildPrompt({...content,analysis:state.analysis});
      const result=await api({action:'generate',model:state.selectedModel,prompt,image:state.referenceDataUrl,aspectRatio:aspect || '1:1',resolution:Number(getPillValue('resolution-toggles')) || 1024,output_format:'png',content});
      state.resultDataUrl=result.dataUrl;$('result-image').src=state.resultDataUrl;$('result-section').hidden=false;
      try{await state.history.save({id:'h_'+Date.now().toString(36),type:'image',model:result.model,data:{prompt,reference:state.referenceName,analysis:state.analysis,aspectRatio:aspect},imageData:state.resultDataUrl,createdAt:new Date().toISOString()})}catch(e){showHistoryError(e.message)}
      $('result-section').scrollIntoView({behavior:'smooth'});setStatus(`Infografía lista en ${result.width} × ${result.height} (${modelLabel(result.model || state.selectedModel)}).`,'success');
    }catch(e){setStatus(e.message,'error')}finally{setBusy(false)}
  }
  function buildPrompt(v){return `Crea una infografía final en ${v.language==='es'?'español':'el idioma solicitado'}. Usa la imagen de entrada ÚNICAMENTE como referencia de estilo y composición. Conserva su jerarquía visual, distribución, densidad, paleta, tipo de ilustración, conectores y proporciones; reemplaza por completo el contenido temático. No copies marcas de agua, logotipos ni textos de la referencia. JSON de estilo y composición: ${JSON.stringify(v.analysis)}. Datos proporcionados por el usuario: descripción libre: ${v.free||'[VACÍO]'}; título: ${v.title||'[VACÍO]'}; subtítulo: ${v.subtitle||'[VACÍO]'}; secciones y datos: ${v.sections||'[VACÍO]'}. Si algún campo está vacío, complétalo automáticamente de forma coherente con el resto de la información y con el tema que se pueda inferir; si todos están vacíos, elige un tema educativo claro y desarrolla título, subtítulo y secciones suficientes para una infografía completa. Público: ${v.audience}. Todo texto debe ser legible, correcto y sin contenido inventado. Produce una sola infografía terminada.`}
  async function api(body){const r=await fetch('proxy.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let p;try{p=await r.json()}catch{throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${r.status}).`)}if(!r.ok||!p.success)throw new Error(p.error+(p.detail?`: ${typeof p.detail==='string'?p.detail:'detalle del proveedor'}`:''));return p}
  async function localImageFacts(dataUrl){const img=await loadImage(dataUrl),canvas=document.createElement('canvas'),size=96;canvas.width=size;canvas.height=size;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,size,size);const d=c.getImageData(0,0,size,size).data,bins=new Map();for(let i=0;i<d.length;i+=16){if(d[i+3]<180)continue;const rgb=[d[i],d[i+1],d[i+2]].map(x=>Math.round(x/32)*32);const key=rgb.join(',');bins.set(key,(bins.get(key)||0)+1)}const palette=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k])=>'#'+k.split(',').map(x=>Math.min(255,+x).toString(16).padStart(2,'0')).join(''));return{dimensions:{width:img.naturalWidth,height:img.naturalHeight,aspectRatio:(img.naturalWidth/img.naturalHeight).toFixed(3)},palette}}
  function ratioFromDimensions(d){const r=d.width/d.height;if(r>2.0)return'21:9';if(r>1.55)return'16:9';if(r<.68)return'9:16';if(r<.84)return'9:16';return'1:1'}
  // Acciones de cada tarjeta del historial: descargar, usar como referencia y eliminar.
  function historyItemUrl(item){return item.imageData||item.imageUrl||(item.data&&item.data.url)||''}
  function historyFileName(id,type){const ext=/^image\/jpe?g$/i.test(type||'')?'jpg':/^image\/webp$/i.test(type||'')?'webp':'png';const safe=String(id||'historial').replace(/[^a-zA-Z0-9_-]/g,'')||'historial';return `infografia-historial-${safe}.${ext}`}
  async function fetchHistoryBlob(url){if(!url)throw new Error('La imagen del historial no tiene URL.');const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error(`No se pudo leer la imagen (HTTP ${response.status}).`);const blob=await response.blob();if(!/^image\//.test(blob.type||''))throw new Error('El archivo del historial no es una imagen válida.');return blob}
  async function imageFileFromBlob(blob,name){
    if(/^image\/(png|jpeg|webp)$/i.test(blob.type||''))return new File([blob],name,{type:blob.type});
    const objectUrl=URL.createObjectURL(blob);
    try{
      const img=await loadImage(objectUrl),canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      canvas.getContext('2d').drawImage(img,0,0);
      const png=await new Promise((resolve,reject)=>canvas.toBlob(out=>out?resolve(out):reject(new Error('No se pudo convertir la imagen.')),'image/png'));
      return new File([png],name.replace(/\.[^.]+$/,'')+'.png',{type:'image/png'});
    }finally{URL.revokeObjectURL(objectUrl)}
  }
  async function downloadHistoryItem(url,id){
    try{
      const blob=await fetchHistoryBlob(url),objectUrl=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=objectUrl;a.download=historyFileName(id,blob.type);
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);
      setStatus('Imagen del historial descargada.','success');
    }catch(e){showHistoryError(e.message)}
  }
  async function useHistoryAsReference(url,id){
    try{
      const blob=await fetchHistoryBlob(url),file=await imageFileFromBlob(blob,historyFileName(id,blob.type));
      await loadFile(file);
      document.getElementById('reference-title')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){setStatus(`No se pudo usar como referencia: ${e.message}`,'error')}
  }
  function renderHistory(items){
    const grid=$('history-grid'),has=items&&items.length;
    $('history-title').style.display=has?'block':'none';
    $('history-clear-btn').style.display=has?'block':'none';
    if(!has){grid.innerHTML='';return}
    grid.innerHTML=items.map(item=>{const url=historyItemUrl(item),id=escapeAttr(item.id);return `<div class="history-item-wrap">
      <img src="${escapeAttr(url)}" alt="Infografía del historial" loading="lazy" data-open="${escapeAttr(url)}">
      <div class="history-actions">
        <button type="button" class="history-action-btn history-download-btn" data-download-hist="${escapeAttr(url)}" data-hist-id="${id}" aria-label="Descargar imagen" title="Descargar imagen">
          <span class="history-action-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>
          <span class="history-action-label">Descargar</span>
        </button>
        <button type="button" class="history-action-btn history-reference-btn" data-use-hist="${escapeAttr(url)}" data-hist-id="${id}" aria-label="Usar como imagen de referencia" title="Usar como imagen de referencia">
          <span class="history-action-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>
          <span class="history-action-label">Referencia</span>
        </button>
        <button type="button" class="history-action-btn history-delete-btn" data-delete="${id}" aria-label="Eliminar del historial" title="Eliminar del historial">
          <span class="history-action-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
          <span class="history-action-label">Eliminar</span>
        </button>
      </div>
      <span class="history-date">${new Date(item.createdAt).toLocaleString()}</span>
    </div>`}).join('');
    grid.querySelectorAll('[data-open]').forEach(x=>x.addEventListener('click',()=>openLightbox(x.dataset.open)));
    grid.querySelectorAll('[data-download-hist]').forEach(x=>x.addEventListener('click',(e)=>{e.stopPropagation();downloadHistoryItem(x.dataset.downloadHist,x.dataset.histId)}));
    grid.querySelectorAll('[data-use-hist]').forEach(x=>x.addEventListener('click',(e)=>{e.stopPropagation();useHistoryAsReference(x.dataset.useHist,x.dataset.histId)}));
    grid.querySelectorAll('[data-delete]').forEach(x=>x.addEventListener('click',async(e)=>{e.stopPropagation();if(confirm('¿Eliminar del historial?'))try{await state.history.delete(x.dataset.delete)}catch(err){showHistoryError(err.message)}}));
  }
  function openLightbox(url){$('lightbox').querySelector('img').src=url;$('lightbox').hidden=false}
  function downloadJson(){const blob=new Blob([JSON.stringify(state.analysis,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);downloadDataUrl(url,'referencia-infografia.json');setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function downloadDataUrl(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click()}
  function setBusy(on,text='Procesando solicitud...'){$('loading-overlay').classList.toggle('hidden',!on);$('secondary-status').textContent=text;document.body.style.overflow=on?'hidden':'';$('generate-btn').disabled=on;$('analyze-btn').disabled=on||!state.referenceDataUrl}
  function setStatus(text,type=''){$('status-message').textContent=text;$('status-message').style.color=type==='error'?'#ffb0b0':type==='success'?'#8aff9a':''}
  function showHistoryError(text){$('history-error').textContent=`Historial: ${text}`}
  function readAsDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('No se pudo leer el archivo.'));r.readAsDataURL(file)})}
  function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('La imagen no se pudo abrir.'));i.src=src})}
  function escapeAttr(s){return String(s||'').replace(/[&\"<>]/g,c=>({'&':'&amp;','\"':'&quot;','<':'&lt;','>':'&gt;'}[c]))}
})();
