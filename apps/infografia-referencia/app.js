(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { referenceDataUrl:'', referenceName:'', analysis:null, resultDataUrl:'', selectedModel:'flux-pro', history:null };
  const MAX_FILE = 20 * 1024 * 1024;

  // Helpers para grupos de toggle (estilo Hoola)
  const setupToggleGroup = (containerId, onChangeCallback) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onChangeCallback) onChangeCallback(btn.dataset.value);
    });
  };
  const getToggleValue = (containerId) => {
    return document.querySelector(`#${containerId} .toggle-btn.active`)?.dataset.value || '';
  };

  document.addEventListener('DOMContentLoaded', init);
  async function init(){
    bind();
    setupToggleGroup('aspect-toggles');
    setupToggleGroup('resolution-toggles');
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
    document.querySelectorAll('.model-toggle').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.model-toggle').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.selectedModel=b.dataset.model}));
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
    $('analyze-btn').disabled=false;$('download-json-btn').disabled=true;$('generate-btn').disabled=true;$('json-output').textContent='{}';
    setStatus(`Referencia cargada: ${file.name}`,'success');
  }
  async function analyze(){
    if(!state.referenceDataUrl)return;
    setBusy(true,'Analizando texto, paleta y composición...');
    try{
      const local=await localImageFacts(state.referenceDataUrl);
      const payload=await api({action:'analyze_infographic',image:state.referenceDataUrl,localFacts:local});
      state.analysis={...payload.analysis,archivo:state.referenceName,medidas:local.dimensions,paleta_local:local.palette};
      $('json-output').textContent=JSON.stringify(state.analysis,null,2);$('json-details').open=true;$('download-json-btn').disabled=false;$('generate-btn').disabled=false;
      setStatus('JSON creado. Ya puedes introducir tus datos y generar.','success');
    }catch(e){setStatus(e.message,'error')}finally{setBusy(false)}
  }
  async function generate(){
    if(!state.analysis||!state.referenceDataUrl)return setStatus('Primero analiza una referencia.','error');
    const free=$('free-prompt').value.trim(),title=$('title').value.trim(),subtitle=$('subtitle').value.trim(),sections=$('sections').value.trim();
    if(!free&&!title&&!sections)return setStatus('Introduce una descripción, un título o secciones.','error');
    setBusy(true,'Generando la nueva infografía con FLUX...');
    try{
      const aspectVal = getToggleValue('aspect-toggles');
      const aspect = aspectVal === 'auto' ? ratioFromDimensions(state.analysis.medidas) : aspectVal;
      const prompt=buildPrompt({free,title,subtitle,sections,audience:$('audience').value,language:$('language').value,analysis:state.analysis});
      const result=await api({action:'generate',quality:state.selectedModel==='flux-max'?'max':'pro',prompt,image:state.referenceDataUrl,aspectRatio:aspect,resolution:Number(getToggleValue('resolution-toggles')),output_format:'png'});
      state.resultDataUrl=result.dataUrl;$('result-image').src=state.resultDataUrl;$('result-section').hidden=false;
      try{await state.history.save({id:'h_'+Date.now().toString(36),type:'image',model:result.model,data:{prompt,reference:state.referenceName,analysis:state.analysis,aspectRatio:aspect},imageData:state.resultDataUrl,createdAt:new Date().toISOString()})}catch(e){showHistoryError(e.message)}
      $('result-section').scrollIntoView({behavior:'smooth'});setStatus(`Infografía lista en ${result.width} × ${result.height}.`,'success');
    }catch(e){setStatus(e.message,'error')}finally{setBusy(false)}
  }
  function buildPrompt(v){return `Crea una infografía final en ${v.language==='es'?'español':'el idioma solicitado'}. Usa la imagen de entrada ÚNICAMENTE como referencia de estilo y composición. Conserva su jerarquía visual, distribución, densidad, paleta, tipo de ilustración, conectores y proporciones; reemplaza por completo el contenido temático. No copies marcas de agua, logotipos ni textos de la referencia. JSON de estilo y composición: ${JSON.stringify(v.analysis)}. Contenido libre del usuario: ${v.free||'Sin descripción adicional'}. Título exacto: ${v.title||'Derívalo del contenido'}. Subtítulo exacto: ${v.subtitle||'Sin subtítulo obligatorio'}. Secciones exactas (una por línea, separadas por |): ${v.sections||'Organiza el contenido libre en secciones claras'}. Público: ${v.audience}. Todo texto debe ser legible, correcto y sin contenido inventado. Produce una sola infografía terminada.`}
  async function api(body){const r=await fetch('proxy.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let p;try{p=await r.json()}catch{throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${r.status}).`)}if(!r.ok||!p.success)throw new Error(p.error+(p.detail?`: ${typeof p.detail==='string'?p.detail:'detalle del proveedor'}`:''));return p}
  async function localImageFacts(dataUrl){const img=await loadImage(dataUrl),canvas=document.createElement('canvas'),size=96;canvas.width=size;canvas.height=size;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,size,size);const d=c.getImageData(0,0,size,size).data,bins=new Map();for(let i=0;i<d.length;i+=16){if(d[i+3]<180)continue;const rgb=[d[i],d[i+1],d[i+2]].map(x=>Math.round(x/32)*32);const key=rgb.join(',');bins.set(key,(bins.get(key)||0)+1)}const palette=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k])=>'#'+k.split(',').map(x=>Math.min(255,+x).toString(16).padStart(2,'0')).join(''));return{dimensions:{width:img.naturalWidth,height:img.naturalHeight,aspectRatio:(img.naturalWidth/img.naturalHeight).toFixed(3)},palette}}
  function ratioFromDimensions(d){const r=d.width/d.height;if(r>1.55)return'16:9';if(r<.68)return'9:16';if(r>1.18)return'4:3';if(r<.84)return'3:4';return'1:1'}
  function renderHistory(items){const grid=$('history-grid'),has=items&&items.length;$('history-title').style.display=has?'block':'none';$('history-clear-btn').style.display=has?'block':'none';grid.innerHTML=has?items.map(item=>{const url=item.imageUrl||(item.data&&item.data.url)||'';return `<div class="history-item-wrap"><img src="${escapeAttr(url)}" alt="Infografía del historial" loading="lazy" data-open="${escapeAttr(url)}"><button class="btn-square" data-delete="${escapeAttr(item.id)}" aria-label="Eliminar">✕</button><span class="history-date">${new Date(item.createdAt).toLocaleString()}</span></div>`}).join(''):'';grid.querySelectorAll('[data-open]').forEach(x=>x.addEventListener('click',()=>openLightbox(x.dataset.open)));grid.querySelectorAll('[data-delete]').forEach(x=>x.addEventListener('click',async()=>{if(confirm('¿Eliminar del historial?'))try{await state.history.delete(x.dataset.delete)}catch(e){showHistoryError(e.message)}}))}
  function openLightbox(url){$('lightbox').querySelector('img').src=url;$('lightbox').hidden=false}
  function downloadJson(){const blob=new Blob([JSON.stringify(state.analysis,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);downloadDataUrl(url,'referencia-infografia.json');setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function downloadDataUrl(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click()}
  function setBusy(on,text='Procesando solicitud...'){$('ai-overlay').hidden=!on;$('secondary-status').textContent=text;document.body.style.overflow=on?'hidden':'';$('generate-btn').disabled=on||!state.analysis;$('analyze-btn').disabled=on||!state.referenceDataUrl}
  function setStatus(text,type=''){$('status-message').textContent=text;$('status-message').style.color=type==='error'?'#ffb0b0':type==='success'?'#8aff9a':''}
  function showHistoryError(text){$('history-error').textContent=`Historial: ${text}`}
  function readAsDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('No se pudo leer el archivo.'));r.readAsDataURL(file)})}
  function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('La imagen no se pudo abrir.'));i.src=src})}
  function escapeAttr(s){return String(s||'').replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))}
})();
