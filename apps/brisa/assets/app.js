import {escapeHTML as h,icon,addDays,dateInZone,timeInZone,fromUTC,humanDate,monday,zonedISO,bytesLabel} from './ui.js';
import {VoiceCapture} from './voice.js';

const $=s=>document.querySelector(s);
const app=$('#app'), dialog=$('#editor');
let state={events:[],tasks:[],notes:[],audios:[],config:{timezone:'Atlantic/Canary'}}, csrf='', view='today', selected='', calendarMode='day', taskFilter='pending', noteFilter='inbox', search='', quickDraft='', voice, voiceState={}, processing=false, toastTimer;
const today=()=>dateInZone(new Date(),state.config.timezone);
const pending=()=>state.tasks.filter(t=>t.status==='pending');
const inbox=()=>state.notes.filter(n=>n.status==='inbox');
const dateOf=e=>dateInZone(fromUTC(e.start_at),state.config.timezone);
const labelDate=d=>!d?'Sin fecha':d===today()?'Hoy':d===addDays(today(),1)?'Mañana':humanDate(d,{day:'numeric',month:'short'});
function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5500);}
async function api(action,data,form=false) {
  const options=data===undefined?{}:{method:'POST',headers:{'X-CSRF-Token':csrf,...(!form?{'Content-Type':'application/json'}:{})},body:form?data:JSON.stringify(data)};
  const response=await fetch(`api.php?action=${action}`,{...options,cache:'no-store',credentials:'same-origin'});
  let result;try{result=await response.json();}catch{throw new Error('El servidor no respondió correctamente. Vuelve a intentarlo.');}
  if(!response.ok){if(response.status===401){await refresh();}const e=new Error(result.error || 'No se pudo guardar.');e.code=response.status;throw e;}
  return result;
}
async function refresh(render=true) {
  const result=await api('state');csrf=result.csrf;
  if(!result.authenticated){loginScreen(result.setup_required);return;}
  state=result;selected ||= today();
  if(!$('.shell')){shell();initVoice();}
  if(render)renderView();
  updateSidebar();
}
function logo(){return '<span class="brand">brisa<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span></span>';}
function shell() {
  app.removeAttribute('aria-busy');
  app.innerHTML=`<div class="shell"><aside class="sidebar"><a href="#" class="brand-link" data-action="nav" data-view="today" aria-label="Brisa, inicio">${logo()}</a><p class="sidebar-caption">TU ESPACIO PERSONAL</p><nav aria-label="Principal">${[['today','sun','Mi día'],['calendar','calendar','Calendario'],['tasks','tasks','Tareas'],['notes','note','Notas']].map(([v,i,l])=>`<button class="nav-item" data-action="nav" data-view="${v}">${icon(i)}<span>${l}</span><span class="nav-count" id="count-${v}"></span></button>`).join('')}</nav><div class="sidebar-bottom"><div id="mini-calendar"></div><div class="quiet-card">${icon('leaf')}<p>Menos en la cabeza.<br><strong>Más en el presente.</strong></p></div><button class="nav-item settings-button" data-action="settings">${icon('settings')}<span>Mi espacio</span></button><div class="private-label">${icon('lock')} Personal y privado</div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">Mi espacio <span>/</span> <b id="breadcrumb">Mi día</b></div><div class="top-actions"><button class="icon-button" data-action="search" title="Buscar notas" aria-label="Buscar notas">${icon('search')}</button><span class="connection"><i></i> Guardado en servidor</span><button class="avatar" data-action="settings" aria-label="Abrir mi espacio">YO</button></div></header><div id="content"></div><footer class="page-footer"><span>Un lugar para cada cosa. Un momento para ti.</span><span>BRISA · AGENDA PERSONAL</span></footer></main><button class="floating-voice" data-action="record">${icon('mic')}<span>Grabar nota</span><kbd>V</kbd></button><div id="pending-uploads"></div><nav class="mobile-nav" aria-label="Navegación móvil">${[['today','sun','Mi día'],['calendar','calendar','Calendario'],['tasks','tasks','Tareas'],['notes','note','Notas']].map(([v,i,l])=>`<button data-action="nav" data-view="${v}">${icon(i)}<span>${l}</span></button>`).join('')}</nav></div>`;
}
function updateSidebar() {
  if(!$('.shell'))return;
  document.querySelectorAll('[data-action="nav"]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#count-tasks').textContent=pending().length || '';$('#count-notes').textContent=inbox().length || '';
  const month=selected.slice(0,7)+'-01';const first=monday(month);
  $('#mini-calendar').innerHTML=`<div class="mini-heading"><strong>${humanDate(month,{month:'long',year:'numeric'})}</strong><div><button class="icon-button small" data-action="month-prev" aria-label="Mes anterior">${icon('chevron','reverse')}</button><button class="icon-button small" data-action="month-next" aria-label="Mes siguiente">${icon('chevron')}</button></div></div><div class="mini-grid">${['L','M','X','J','V','S','D'].map(d=>`<span>${d}</span>`).join('')}${Array.from({length:42},(_,i)=>{const d=addDays(first,i);return `<button class="${d===selected?'selected':''} ${d===today()?'is-today':''} ${d.slice(0,7)!==month.slice(0,7)?'muted':''}" data-action="select-date" data-date="${d}" aria-label="${humanDate(d)}">${Number(d.slice(-2))}${state.events.some(e=>dateOf(e)===d)?'<i></i>':''}</button>`;}).join('')}</div>`;
}
function renderView() {
  if(!$('#content'))return;
  const names={today:'Mi día',calendar:'Calendario',tasks:'Tareas',notes:'Notas'};
  $('#breadcrumb').textContent=names[view];
  const oldScroll=$('.timeline-scroll')?.scrollTop;
  const stats=`<div class="summary"><span><i class="dot sage"></i><b>${state.events.filter(e=>dateOf(e)===selected).length}</b> citas</span><span><i class="dot clay"></i><b>${pending().filter(t=>t.planned_date===selected || t.due_date===selected).length}</b> tareas para hoy</span><span><i class="dot lavender"></i><b>${inbox().length}</b> notas por ordenar</span></div>`;
  const headings={today:[selected===today()?'Hoy, con un poco de calma.':humanDate(selected,{weekday:'long',day:'numeric',month:'long'}),'Tu tiempo, tus pendientes y tus ideas. Todo en su lugar.'],calendar:['Haz espacio para lo importante.','Tus compromisos, con el tiempo que necesitan.'],tasks:['Una cosa cada vez.','Organiza tus pendientes y avanza a tu ritmo.'],notes:['Que no se te escape una idea.','Escribe, habla y deja aquí lo que tienes en la cabeza.']};
  $('#content').innerHTML=`<section class="page-heading"><div><div class="eyebrow">${humanDate(selected,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><h1>${headings[view][0]}</h1><p>${headings[view][1]}</p></div><button class="button primary new-button" data-action="new" data-type="${view==='tasks'?'task':view==='notes'?'note':'event'}">${icon('plus')} ${view==='tasks'?'Nueva tarea':view==='notes'?'Nueva nota':'Nueva cita'}</button></section>${view==='today'?stats:''}${view==='today'?`<div class="dashboard"><section class="panel calendar-panel">${calendarPanel()}</section><div class="right-column"><section class="panel task-panel">${taskPanel(true)}</section><section class="panel notes-panel">${notesPanel(true)}</section></div></div>`:view==='calendar'?`<section class="panel calendar-panel full-calendar">${calendarPanel()}</section>`:view==='tasks'?`<section class="panel full-panel">${taskPanel(false)}</section>`:`<section class="notes-page">${notesPanel(false)}</section>`}`;
  const scroller=$('.timeline-scroll');if(scroller)scroller.scrollTop=oldScroll ?? 7.5*64;
  if(view==='notes' && search){const input=$('#note-search');if(input){input.value=search;filterNoteCards();}}
  updateSidebar();
}
function calendarPanel() {
  const week=calendarMode==='week';const dates=week?Array.from({length:7},(_,i)=>addDays(monday(selected),i)):[selected];
  return `<div class="panel-heading"><div><h2>${icon('calendar')} Tu agenda</h2><span class="section-caption">${week?`${humanDate(dates[0])} — ${humanDate(dates[6])}`:humanDate(selected,{weekday:'long',day:'numeric',month:'long'})}</span></div><div class="segmented"><button data-action="calendar-mode" data-mode="day" class="${!week?'active':''}">Día</button><button data-action="calendar-mode" data-mode="week" class="${week?'active':''}">Semana</button></div></div><div class="calendar-toolbar"><div><button class="icon-button small" data-action="date-prev" aria-label="Anterior">${icon('chevron','reverse')}</button><button class="today-button" data-action="date-today">Hoy</button><button class="icon-button small" data-action="date-next" aria-label="Siguiente">${icon('chevron')}</button></div><span>${state.config.timezone.replace('_',' ')}</span><button class="text-button" data-action="new" data-type="event">${icon('plus')} Cita</button></div><div class="timeline-scroll ${week?'week-scroll':''}"><div class="timeline-inner ${week?'week':''}">${week?`<div class="week-head"><span></span>${dates.map(d=>`<button data-action="select-date" data-date="${d}" class="${d===today()?'current':''}"><small>${humanDate(d,{weekday:'short'})}</small><b>${Number(d.slice(-2))}</b></button>`).join('')}</div>`:''}<div class="timeline"><div class="time-labels">${Array.from({length:24},(_,i)=>`<span style="top:${i*64}px">${String(i).padStart(2,'0')}:00</span>`).join('')}</div><div class="day-columns" style="--days:${dates.length}">${dates.map(d=>dayColumn(d)).join('')}</div></div></div></div><div class="calendar-legend"><span><i class="dot sage"></i>Personal</span><span><i class="dot clay"></i>Trabajo</span><span><i class="dot lavender"></i>Otros</span><span class="legend-tip">Solo las citas reservan tiempo</span></div>`;
}
function dayColumn(date) {
  const zone=state.config.timezone;
  const events=state.events.filter(e=>dateInZone(fromUTC(e.start_at),zone)<=date && dateInZone(new Date(fromUTC(e.end_at)-1),zone)>=date).map(e=>{
    const start=dateInZone(fromUTC(e.start_at),zone)<date?0:minutes(timeInZone(fromUTC(e.start_at),zone));
    const end=dateInZone(fromUTC(e.end_at),zone)>date?1440:minutes(timeInZone(fromUTC(e.end_at),zone));
    return {...e,start,end};
  }).sort((a,b)=>a.start-b.start || b.end-a.end);
  let group=[],groupEnd=-1;const groups=[];
  for(const e of events){if(e.start>=groupEnd && group.length){groups.push(group);group=[];groupEnd=-1;}group.push(e);groupEnd=Math.max(groupEnd,e.end);}if(group.length)groups.push(group);
  for(const group of groups){const lanes=[];for(const e of group){let lane=lanes.findIndex(end=>end<=e.start);if(lane<0)lane=lanes.length;lanes[lane]=e.end;e.lane=lane;}for(const e of group)e.lanes=lanes.length;}
  const nowMinutes=minutes(timeInZone(new Date(),zone));
  return `<div class="day-column" data-date="${date}">${Array.from({length:24},(_,i)=>`<button class="hour-slot" style="top:${i*64}px" data-action="slot" data-date="${date}" data-hour="${i}" aria-label="Crear cita el ${humanDate(date)} a las ${i}:00"></button>`).join('')}${events.map(e=>`<button class="event-block ${h(e.color)}" style="top:${e.start/60*64}px;height:${Math.max(28,(e.end-e.start)/60*64-3)}px;left:calc(${e.lane/e.lanes*100}% + 5px);width:calc(${100/e.lanes}% - 10px)" data-action="edit" data-type="event" data-id="${e.id}" title="${h(e.title)} · ${timeInZone(fromUTC(e.start_at),zone)} — ${timeInZone(fromUTC(e.end_at),zone)}"><span class="event-time">${timeInZone(fromUTC(e.start_at),zone)} — ${timeInZone(fromUTC(e.end_at),zone)}</span><strong>${h(e.title)}</strong>${e.location?`<span class="event-location">${icon('pin')}${h(e.location)}</span>`:''}</button>`).join('')}${date===today()?`<div class="now-line" style="top:${nowMinutes/60*64}px"><span></span></div>`:''}</div>`;
}
function minutes(value){const [h,m]=value.split(':').map(Number);return h*60+m;}
function taskPanel(compact) {
  const done=state.tasks.filter(t=>t.status==='completed');
  let tasks=taskFilter==='completed'?done:pending();
  if(taskFilter==='today')tasks=tasks.filter(t=>t.planned_date===selected || t.due_date===selected);
  const header=`<div class="panel-heading"><div><h2>${icon('tasks')} ${compact?'Por hacer':'Mis tareas'} <span class="count-badge">${pending().length}</span></h2>${!compact?'<span class="section-caption">Mover una tarea no cambia su fecha límite.</span>':''}</div><button class="icon-button small" data-action="new" data-type="task" aria-label="Nueva tarea">${icon('plus')}</button></div><div class="filter-tabs">${[['pending','Pendientes'],['today','Para hoy'],['completed','Completadas']].map(([k,l])=>`<button class="${taskFilter===k?'active':''}" data-action="task-filter" data-filter="${k}">${l}${k==='completed'&&done.length?` <span>${done.length}</span>`:''}</button>`).join('')}</div>`;
  if(compact)return header+`<div class="task-list">${tasks.slice(0,5).map(taskRow).join('') || emptyState('tasks','Todo despejado','Añade una tarea y dale su momento.')}</div><button class="panel-bottom-link" data-action="nav" data-view="tasks">Ver todas las tareas ${icon('arrow')}</button>`;
  if(taskFilter==='completed')return header+`<div class="task-list completed-list">${tasks.map(taskRow).join('') || emptyState('check','Cada paso cuenta','Las tareas completadas aparecerán aquí.')}</div>`;
  const groups=[['today','Hoy y pendientes anteriores',tasks.filter(t=>t.planned_date && t.planned_date<=today()),today()],['next','Próximamente',tasks.filter(t=>t.planned_date && t.planned_date>today()),addDays(today(),1)],['later','Sin planificar',tasks.filter(t=>!t.planned_date),'']];
  return header+`<div class="task-board">${groups.map(([key,label,items,date])=>`<section class="task-lane" data-drop-date="${date}"><div class="lane-heading"><span class="dot ${key==='today'?'clay':key==='next'?'sage':'lavender'}"></span><h3>${label}</h3><span>${items.length}</span></div><div class="task-list">${items.map(taskRow).join('')||'<p class="lane-empty">Arrastra una tarea aquí<br>o utiliza «Mover».</p>'}</div><button class="text-button lane-add" data-action="new" data-type="task" data-date="${date}">${icon('plus')} Añadir tarea</button></section>`).join('')}</div>`;
}
function taskRow(t) {
  const done=t.status==='completed',overdue=t.due_date && t.due_date<today()&&!done;
  return `<article class="task-row ${done?'done':''}" draggable="${!done}" data-task-id="${t.id}"><button class="task-check ${done?'checked':''}" data-action="toggle" data-id="${t.id}" aria-label="${done?'Reabrir':'Completar'} ${h(t.title)}">${done?icon('check'):''}</button><div class="task-copy"><button class="task-title" data-action="edit" data-type="task" data-id="${t.id}">${h(t.title)}</button><div class="task-meta"><span class="priority p${t.priority}"><i></i>${['','Alta','Media','Baja'][t.priority]}</span>${t.due_date?`<span class="${overdue?'overdue':''}">${icon('calendar')}${overdue?'Venció ':''}${labelDate(t.due_date)}</span>`:''}${!done?`<button class="move-task" data-action="move" data-id="${t.id}" title="Cambiar día planificado">${icon('arrow')} ${t.planned_date?labelDate(t.planned_date):'Mover'}</button>`:''}</div></div><button class="icon-button small task-more" data-action="edit" data-type="task" data-id="${t.id}" aria-label="Editar ${h(t.title)}">${icon('more')}</button></article>`;
}
function notesPanel(compact) {
  const notes=state.notes.filter(n=>noteFilter==='all'||n.status===noteFilter);
  const composer=`<form id="quick-note" class="quick-note"><label class="sr-only" for="quick-text">Escribe una nota rápida</label><textarea id="quick-text" placeholder="Una idea, algo que recordar…" rows="${compact?2:3}" maxlength="20000">${h(quickDraft)}</textarea><div><span>${icon('note')} Dale un lugar a esa idea</span><button type="submit" class="icon-button" aria-label="Guardar nota">${icon('arrow')}</button></div></form>`;
  return `<div class="panel-heading"><div><h2>${icon('inbox')} ${compact?'Bandeja de notas':'Tu bandeja de entrada'} <span class="count-badge">${inbox().length}</span></h2>${!compact?'<span class="section-caption">Captura primero. Organiza después.</span>':''}</div>${compact?`<button class="icon-button small" data-action="nav" data-view="notes" aria-label="Ver todas las notas">${icon('arrow')}</button>`:''}</div>${!compact?`<div class="notes-tools"><div class="filter-tabs">${[['inbox','Bandeja'],['archived','Archivadas'],['converted','Convertidas'],['all','Todas']].map(([k,l])=>`<button class="${noteFilter===k?'active':''}" data-action="note-filter" data-filter="${k}">${l}</button>`).join('')}</div><label class="search-box">${icon('search')}<input id="note-search" type="search" placeholder="Buscar en tus notas…" value="${h(search)}" aria-label="Buscar en tus notas"></label></div>`:''}<div class="${compact?'notes-body':'notes-grid'}">${composer}${(compact?inbox().slice(0,2):notes).map(n=>noteCard(n,compact)).join('')}${!compact&&!notes.length?emptyState('note','Espacio para tus ideas','Escribe una nota o pulsa el botón de voz.'):''}</div>${!compact?'<p id="search-empty" class="empty-search" hidden>No hay notas que coincidan con tu búsqueda.</p>':''}`;
}
function noteCard(n,compact) {
  const audio=state.audios.find(a=>a.note_id===n.id);let suggestion;try{suggestion=JSON.parse(n.suggestion);}catch{}
  return `<article class="note-card ${audio?'voice-note':''}" data-note-id="${n.id}"><div class="note-top"><span>${icon(audio?'mic':'note')}${audio?'Nota de voz':'Nota escrita'}</span><small>${humanDate(dateInZone(fromUTC(n.created_at),state.config.timezone),{day:'numeric',month:'short'})}</small></div><button class="note-open" data-action="edit" data-type="note" data-id="${n.id}">${n.title&&n.title!=='Nota de voz'?`<h3>${h(n.title)}</h3>`:''}<p>${h(n.content || (audio?.status==='failed'?'No se pudo transcribir. El audio está guardado.':audio?.status==='transcribed'?'Transcripción disponible.':'Tu audio está guardado. Esperando transcripción.'))}</p></button>${audio?`<div class="audio-status ${audio.status==='failed'?'error':''}">${icon(audio.status==='transcribed'?'check':'clock')}${audio.status==='transcribed'?'Transcrito':audio.status==='processing'?'Transcribiendo…':audio.status==='failed'?'Revisar transcripción':state.config.transcription_ready?'En cola de transcripción':'Transcripción pendiente de configuración'}<span>${Math.round(audio.duration_ms/1000)} s</span></div>${audio.available&&!compact?`<audio controls preload="none" src="api.php?action=audio&id=${audio.id}" aria-label="Reproducir nota de voz"></audio>`:''}`:''}${n.status==='inbox'&&suggestion&&suggestion.type!=='note'?`<button class="suggestion" data-action="convert" data-type="${suggestion.type}" data-id="${n.id}">${icon('spark')} Parece una ${suggestion.type==='task'?'tarea':'cita'} <span>Revisar ${icon('arrow')}</span></button>`:''}${!compact?`<div class="note-actions"><button class="text-button" data-action="edit" data-type="note" data-id="${n.id}">${icon('edit')} Editar</button>${n.status!=='converted'?`<button class="text-button" data-action="archive" data-id="${n.id}">${icon('inbox')} ${n.status==='archived'?'Recuperar':'Archivar'}</button>`:`<span class="converted-label">${icon('check')} ${n.converted_type==='task'?'Tarea creada':'Cita creada'}</span>`}</div>`:''}</article>`;
}
function emptyState(i,title,text){return `<div class="empty-state">${icon(i)}<strong>${title}</strong><p>${text}</p></div>`;}
function filterNoteCards(){const q=search.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();let visible=0;document.querySelectorAll('[data-note-id]').forEach(el=>{const n=state.notes.find(n=>n.id===el.dataset.noteId);const match=(n.title+' '+n.content).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().includes(q);el.hidden=!match;if(match)visible++;});$('#search-empty').hidden=!q || visible>0;}
function field(label,name,value='',type='text',required=false){return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${h(value)}" ${required?'required':''} ${type==='text'?'maxlength="200"':''}></label>`;}
function openEditor(type,id=null,defaults={}) {
  const table={task:'tasks',event:'events',note:'notes'}[type];const item=id?state[table].find(x=>x.id===id):null;
  const data={...defaults,...item};const conversion=defaults.note_id?state.notes.find(n=>n.id===defaults.note_id):null;
  let fields=field(type==='note'?'Título (opcional)':'Título','title',data.title||'', 'text',type!=='note');
  if(type==='task')fields+=`<div class="field-grid">${field('Planificada para','planned_date',data.planned_date??selected,'date')}${field('Fecha límite','due_date',data.due_date||'','date')}</div><label class="field"><span>Prioridad</span><select name="priority">${[[1,'Alta'],[2,'Media'],[3,'Baja']].map(([v,l])=>`<option value="${v}" ${Number(data.priority||2)===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  if(type==='event') {
    const localValue=utc=>`${dateInZone(fromUTC(utc),state.config.timezone)}T${timeInZone(fromUTC(utc),state.config.timezone)}`;
    fields+=`<div class="field-grid">${field('Empieza','start_local',item?localValue(item.start_at):data.start_local||selected+'T09:00','datetime-local',true)}${field('Termina','end_local',item?localValue(item.end_at):data.end_local||selected+'T10:00','datetime-local',true)}</div><p class="field-hint">Horas de ${h(state.config.timezone)}. Solo esta cita bloqueará el calendario.</p>${field('Lugar (opcional)','location',data.location||'')}<label class="field"><span>Tipo de cita</span><select name="color">${[['sage','Personal'],['clay','Trabajo'],['lavender','Otros']].map(([v,l])=>`<option value="${v}" ${data.color===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="checkbox-field"><input type="checkbox" name="allow_overlap"> Permitir que coincida con otra cita</label>`;
  }
  fields+=`<label class="field"><span>${type==='note'?'Tu nota':'Detalles (opcional)'}</span><textarea name="${type==='note'?'content':'description'}" rows="${type==='note'?7:3}" maxlength="${type==='note'?100000:20000}" ${type==='note'&&!id?'required':''}>${h(type==='note'?data.content||'':data.description||'')}</textarea></label>`;
  let extras='';
  if(type==='note'&&item){const a=state.audios.find(a=>a.note_id===id);extras=`${a?`<div class="editor-audio">${a.available?`<audio controls preload="metadata" src="api.php?action=audio&id=${a.id}"></audio>`:'<p>El archivo se eliminó según la retención configurada. El texto se conserva.</p>'}${a.error?`<p class="inline-error">${h(a.error)}</p>`:''}${a.status==='transcribed'?`<button type="button" class="text-button" data-action="original" data-id="${a.id}">Ver transcripción original</button>`:`<button type="button" class="button secondary" data-action="retry" data-id="${a.id}">${icon('refresh')} Reintentar transcripción</button>`}</div>`:''}${item.status!=='converted'?`<div class="convert-options"><span>Dar el siguiente paso</span><button type="button" class="button secondary" data-action="convert" data-type="task" data-id="${id}">${icon('tasks')} Crear tarea</button><button type="button" class="button secondary" data-action="convert" data-type="event" data-id="${id}">${icon('calendar')} Crear cita</button></div>`:''}`;}
  showDialog(`<div class="dialog-heading"><div><div class="eyebrow">${conversion?'ORDENAR UNA IDEA':'TU ESPACIO PERSONAL'}</div><h2 id="dialog-title">${conversion?'Convertir en':item?'Editar':'Nueva'} ${{task:'tarea',event:'cita',note:'nota'}[type]}</h2></div><button class="icon-button" data-action="close" aria-label="Cerrar">${icon('close')}</button></div>${conversion?'<p class="dialog-description">Revisa los datos antes de confirmar. Conservaremos la nota original.</p>':''}<form id="item-form" data-type="${type}" data-id="${id||''}" data-version="${item?.version||''}" data-note-id="${conversion?.id||''}" data-note-version="${conversion?.version||''}">${fields}${extras}<p class="form-error" role="alert"></p><div class="dialog-footer">${item?`<button type="button" class="text-button danger" data-action="delete" data-type="${type}" data-id="${id}">${icon('trash')} Eliminar</button>`:'<span></span>'}<div><button type="button" class="button secondary" data-action="close">Cancelar</button><button type="submit" class="button primary">${conversion?'Confirmar y crear':'Guardar '+{task:'tarea',event:'cita',note:'nota'}[type]}</button></div></div></form>`);
}
function showDialog(html){dialog.innerHTML=html;if(!dialog.open)dialog.showModal();}
function conversionEditor(type,id) {
  const n=state.notes.find(n=>n.id===id);let s;try{s=JSON.parse(n.suggestion);}catch{}s ||= {};
  const content=dialog.querySelector('[name="content"]')?.value ?? n.content;
  if(content!==n.content){toast('Guarda primero los cambios de la nota para actualizar la propuesta.');return;}
  openEditor(type,null,{note_id:id,title:n.title&&n.title!=='Nota de voz'?n.title:content.split(/[.!?\n]/)[0].slice(0,150),description:content,planned_date:s.date||selected,due_date:type==='task'?s.date||'':'',start_local:s.date&&s.time?`${s.date}T${s.time}`:'',end_local:''});
  if(type==='event') {dialog.querySelector('[name="end_local"]').value='';if(!s.date||!s.time)dialog.querySelector('[name="start_local"]').value='';}
}
function settings() {
  const c=state.config,percent=Math.min(100,Math.round(c.storage_used/c.storage_quota*100));
  showDialog(`<div class="dialog-heading"><div><div class="eyebrow">BRISA</div><h2 id="dialog-title">Tu espacio, a tu manera.</h2></div><button class="icon-button" data-action="close" aria-label="Cerrar">${icon('close')}</button></div><div class="settings-section"><h3>${icon('lock')} Tu agenda privada</h3><p>${c.local?'Estás probando la aplicación en este ordenador. Los cambios se guardan en su base de datos local.':'Tus citas, tareas y notas se guardan en tu servidor.'}</p><div class="setting-line"><span>Zona horaria</span><b>${h(c.timezone)}</b></div></div><div class="settings-section"><h3>${icon('mic')} Notas de voz</h3><p>${c.transcription_ready?'La transcripción está conectada. Al detener una grabación, se enviará a OpenAI para convertirla en texto.':'Puedes grabar y escuchar tus notas. Para convertirlas en texto falta configurar la clave de OpenAI en el servidor.'}</p><div class="status-pill ${c.transcription_ready?'connected':''}"><i></i>${c.transcription_ready?'Transcripción disponible':'Transcripción sin configurar'}</div><p class="small-muted">Máximo 3 minutos y 10 MB por nota. ${c.retention_days?`Los audios transcritos se eliminan a los ${c.retention_days} días mediante la tarea programada. El texto permanece.`:'Los audios se conservan hasta que los elimines.'}</p></div><div class="settings-section"><h3>${icon('inbox')} Almacenamiento</h3><div class="storage-bar"><span style="width:${percent}%"></span></div><div class="setting-line"><span>${bytesLabel(c.storage_used)} de ${bytesLabel(c.storage_quota)}</span><b>${percent}%</b></div></div><div class="settings-section"><h3>${icon('download')} Tus datos son tuyos</h3><p>Exporta citas, tareas, notas y transcripciones en JSON. Los archivos de audio se respaldan desde el servidor.</p><a class="button secondary" href="api.php?action=export" download>${icon('download')} Exportar mis datos</a></div><div class="dialog-footer"><span></span><button class="button ${c.local?'secondary':'primary'}" data-action="${c.local?'close':'logout'}">${c.local?'Cerrar':'Cerrar sesión'}</button></div>`);
}
function loginScreen(setup=false) {
  app.removeAttribute('aria-busy');app.innerHTML=`<main class="login-screen"><div class="login-card">${logo()}<div class="login-symbol">${icon('leaf')}</div><div class="eyebrow">UN MOMENTO PARA TI</div><h1>Tu día empieza<br>con un poco de calma.</h1><p>${setup?'Tu agenda está instalada. Falta configurar la contraseña de acceso y el almacenamiento privado en el servidor.':'Entra en tu espacio personal.'}</p>${setup?'<p class="small-muted">Consulta la guía de instalación incluida en el proyecto.</p>':'<form id="login-form"><label class="field"><span>Tu contraseña</span><input type="password" name="password" required autocomplete="current-password" autofocus></label><p class="form-error" role="alert"></p><button class="button primary" type="submit">Entrar en mi agenda</button></form>'}<div class="private-label">${icon('lock')} Solo para ti</div></div></main>`;
}
function initVoice() {
  if(voice)return;
  voice=new VoiceCapture({onState:updateVoice,onError:toast,onSaved:async()=>{toast('Nota de voz guardada.');await refresh();void processQueue();},upload:async item=>{const form=new FormData();const ext=item.blob.type.includes('mp4')?'m4a':'webm';form.append('audio',item.blob,`nota.${ext}`);form.append('capture_key',item.id);form.append('duration_ms',item.duration_ms);form.append('captured_at',item.captured_at);await api('upload',form,true);}});
  void voice.restore();
}
function updateVoice(s) {
  voiceState=s;const root=$('#recorder');root.hidden=!s.recording;
  if(s.recording)root.innerHTML=`<div class="recording-card"><div class="recording-dot"></div><div><strong>Te escucho…</strong><span>Tu idea tiene un lugar aquí.</span></div><div class="waveform" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><time>${String(Math.floor(s.seconds/60)).padStart(2,'0')}:${String(s.seconds%60).padStart(2,'0')}</time><button class="button primary" data-action="stop-record">${icon('stop')} Guardar</button><button class="icon-button" data-action="cancel-record" aria-label="Descartar grabación">${icon('close')}</button></div>`;
  const button=$('.floating-voice');if(button){button.disabled=s.busy;button.classList.toggle('is-recording',s.recording);button.innerHTML=`${icon(s.recording?'stop':'mic')}<span>${s.busy?'Abriendo micrófono…':s.recording?'Detener grabación':'Grabar nota'}</span><kbd>V</kbd>`;}
  const pending=$('#pending-uploads');if(pending)pending.innerHTML=s.pending?`<button class="upload-retry" data-action="upload-retry">${icon('refresh')} ${s.pending} audio pendiente de subir · Reintentar</button>`:'';
}
async function processQueue() {
  if(processing || !state.config.transcription_ready || !state.audios.some(a=>['pending','processing'].includes(a.status)))return;
  processing=true;
  try{const result=await api('process',{});if(result.status!=='idle')await refresh(!dialog.open && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName));}catch(e){toast(e.message);}finally{processing=false;}
}
async function moveTask(id,date) {const t=state.tasks.find(t=>t.id===id);await api('save',{...t,type:'task',planned_date:date});await refresh();toast(date?`Tarea planificada para ${labelDate(date).toLowerCase()}.`:'Tarea sin fecha planificada.');}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b || b.disabled)return;
  e.preventDefault();const a=b.dataset.action,id=b.dataset.id;
  try {
    if(a==='nav'){view=b.dataset.view;if(view==='today'){selected=today();calendarMode='day';}if(view==='calendar')calendarMode='week';renderView();window.scrollTo(0,0);}
    else if(a==='calendar-mode'){calendarMode=b.dataset.mode;renderView();}
    else if(a==='date-prev'||a==='date-next'){selected=addDays(selected,(a==='date-prev'?-1:1)*(calendarMode==='week'?7:1));renderView();}
    else if(a==='date-today'){selected=today();renderView();}
    else if(a==='month-prev'||a==='month-next'){const d=new Date(selected.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+(a==='month-prev'?-1:1));selected=d.toISOString().slice(0,10);renderView();}
    else if(a==='select-date'){selected=b.dataset.date;if(view!=='calendar'&&view!=='today')view='calendar';calendarMode='day';renderView();}
    else if(a==='task-filter'){taskFilter=b.dataset.filter;renderView();}
    else if(a==='note-filter'){noteFilter=b.dataset.filter;renderView();}
    else if(a==='search'){view='notes';noteFilter='all';renderView();$('#note-search').focus();}
    else if(a==='new')openEditor(b.dataset.type,null,b.dataset.date!==undefined?{planned_date:b.dataset.date}:{});
    else if(a==='edit')openEditor(b.dataset.type,id);
    else if(a==='slot'){const hour=Number(b.dataset.hour);openEditor('event',null,{start_local:b.dataset.date+`T${String(hour).padStart(2,'0')}:00`,end_local:(hour===23?addDays(b.dataset.date,1):b.dataset.date)+`T${String((hour+1)%24).padStart(2,'0')}:00`});}
    else if(a==='close')dialog.close();
    else if(a==='toggle'){b.disabled=true;const t=state.tasks.find(t=>t.id===id);await api('toggle',{id,version:t.version,completed:t.status!=='completed'});await refresh();toast(t.status==='completed'?'Tarea reabierta.':'Un pendiente menos. Bien hecho.');}
    else if(a==='move'){const t=state.tasks.find(t=>t.id===id);showDialog(`<div class="dialog-heading"><h2 id="dialog-title">Dale otro momento.</h2><button class="icon-button" data-action="close" aria-label="Cerrar">${icon('close')}</button></div><p class="dialog-description">${h(t.title)}<br>La fecha límite no cambiará.</p><form id="move-form" data-id="${id}">${field('Día planificado','date',t.planned_date||today(),'date')}<div class="move-shortcuts"><button type="button" class="button secondary" data-action="move-to" data-id="${id}" data-date="${today()}">Hoy</button><button type="button" class="button secondary" data-action="move-to" data-id="${id}" data-date="${addDays(today(),1)}">Mañana</button><button type="button" class="button secondary" data-action="move-to" data-id="${id}" data-date="">Sin fecha</button></div><p class="form-error"></p><div class="dialog-footer"><span></span><button class="button primary">Mover tarea</button></div></form>`);}
    else if(a==='move-to'){await moveTask(id,b.dataset.date);dialog.close();}
    else if(a==='archive'){const n=state.notes.find(n=>n.id===id);await api('archive',{id,version:n.version,archived:n.status!=='archived'});await refresh();toast(n.status==='archived'?'Nota recuperada.':'Nota archivada.');}
    else if(a==='convert')conversionEditor(b.dataset.type,id);
    else if(a==='delete'){const type=b.dataset.type;showDialog(`<div class="dialog-heading"><h2 id="dialog-title">¿Eliminar ${type==='note'?'esta nota':type==='task'?'esta tarea':'esta cita'}?</h2></div><p class="dialog-description">${type==='note'?'También se eliminarán los audios de esta nota. Las tareas o citas derivadas se conservarán.':'Se eliminará de tu agenda.'} Esta acción no se puede deshacer.</p><div class="dialog-footer"><span></span><div><button class="button secondary" data-action="close">Cancelar</button><button class="button danger-fill" data-action="confirm-delete" data-type="${type}" data-id="${id}">Eliminar</button></div></div>`);}
    else if(a==='confirm-delete'){b.disabled=true;await api('delete',{id,type:b.dataset.type});dialog.close();await refresh();toast('Elemento eliminado.');}
    else if(a==='record'){if(voice.recording)voice.stop();else await voice.start();}
    else if(a==='stop-record')voice.stop();
    else if(a==='cancel-record')voice.stop(true);
    else if(a==='upload-retry')await voice.flush();
    else if(a==='retry'){if(!state.config.transcription_ready){toast('Configura OPENAI_API_KEY en el servidor para activar la transcripción. El audio ya está guardado.');return;}await api('retry',{id});dialog.close();await refresh();void processQueue();}
    else if(a==='original'){const result=await api('transcript&id='+id);const p=document.createElement('p');p.className='original-transcript';p.textContent=result.text||'Sin transcripción.';b.replaceWith(p);}
    else if(a==='settings')settings();
    else if(a==='logout'){if(voice?.recording||voice?.queue.length){toast('Guarda tus grabaciones pendientes antes de cerrar sesión.');return;}await api('logout',{});dialog.close();voice=null;await refresh();}
  }catch(error){toast(error.message);b.disabled=false;}
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!['item-form','quick-note','move-form','login-form'].includes(form.id))return;e.preventDefault();
  const button=form.querySelector('[type="submit"]')||form.querySelector('.dialog-footer .primary');if(button)button.disabled=true;
  const errorNode=form.querySelector('.form-error');if(errorNode)errorNode.textContent='';
  try {
    const data=Object.fromEntries(new FormData(form));
    if(form.id==='login-form'){await api('login',data);await refresh();return;}
    if(form.id==='move-form'){await moveTask(form.dataset.id,data.date);dialog.close();return;}
    if(form.id==='quick-note'){const content=$('#quick-text').value.trim();if(!content)return;await api('save',{type:'note',content,title:''});quickDraft='';await refresh();toast('Idea guardada. Puedes seguir con tu día.');return;}
    data.type=form.dataset.type;if(form.dataset.id){data.id=form.dataset.id;data.version=Number(form.dataset.version);}
    if(data.type==='event'){data.start_at=zonedISO(data.start_local,state.config.timezone);data.end_at=zonedISO(data.end_local,state.config.timezone);data.allow_overlap=!!data.allow_overlap;}
    if(form.dataset.noteId){data.note_id=form.dataset.noteId;data.note_version=Number(form.dataset.noteVersion);await api('convert',data);}else await api('save',data);
    dialog.close();await refresh();toast(form.dataset.noteId?'Nota organizada. Conservamos el original.':'Guardado. Todo en su lugar.');
  }catch(error){if(errorNode)errorNode.textContent=error.message;else toast(error.message);}finally{if(button)button.disabled=false;}
});
document.addEventListener('input',e=>{if(e.target.id==='quick-text')quickDraft=e.target.value;if(e.target.id==='note-search'){search=e.target.value;filterNoteCards();}});
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='v'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('.floating-voice')?.click();}});
document.addEventListener('dragstart',e=>{const row=e.target.closest('[data-task-id]');if(row)e.dataTransfer.setData('text/plain',row.dataset.taskId);});
document.addEventListener('dragover',e=>{const lane=e.target.closest('[data-drop-date]');if(lane){e.preventDefault();lane.classList.add('drag-over');}});
document.addEventListener('dragleave',e=>{const lane=e.target.closest('[data-drop-date]');if(lane&&!lane.contains(e.relatedTarget))lane.classList.remove('drag-over');});
document.addEventListener('drop',async e=>{const lane=e.target.closest('[data-drop-date]');if(lane){e.preventDefault();lane.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');if(state.tasks.some(t=>t.id===id))try{await moveTask(id,lane.dataset.dropDate);}catch(error){toast(error.message);}}});
window.addEventListener('online',()=>voice?.flush());
const safeRefresh=()=>!dialog.open && !voice?.recording && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && ![...document.querySelectorAll('audio')].some(a=>!a.paused);
window.addEventListener('focus',()=>{if($('.shell')&&safeRefresh())void refresh().catch(()=>{});});
setInterval(()=>{if(document.visibilityState==='visible'&&$('.shell')&&safeRefresh())void refresh().catch(()=>{});},30000);
window.addEventListener('beforeunload',e=>{if(voice?.recording || voice?.queue.length || quickDraft){e.preventDefault();e.returnValue='';}});
setInterval(()=>{if(document.visibilityState==='visible'&&$('.shell')){if(state.audios.some(a=>['pending','processing'].includes(a.status))){void processQueue();if(!processing&&!dialog.open&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))void refresh().catch(()=>{});}}},10000);
refresh().catch(error=>{app.innerHTML=`<div class="boot">${logo()}<h1>No hemos podido abrir tu agenda.</h1><p>${h(error.message)}</p><button class="button primary" id="reload">Volver a intentar</button></div>`;$('#reload').onclick=()=>location.reload();});
