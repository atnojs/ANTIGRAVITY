export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
  check:'<path d="m6 12 4 4 8-9"/>',
  tasks:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
  note:'<path d="M14 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-8Z"/><path d="M14 3v7h7M7 14h10M7 17h6"/>',
  mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  inbox:'<path d="m4 4-2 12v4h20v-4L20 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  leaf:'<path d="M5 20c-4-11 3-16 15-16 0 12-5 19-15 16Zm0 0L15 10"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  refresh:'<path d="M20 7V2l-3 3a8 8 0 1 0 3 10M20 7h-5"/>',
};
export const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.note}</svg>`;
export const addDays=(date,n)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function dateInZone(date,timezone) { return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function timeInZone(date,timezone) { return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date); }
export const fromUTC = value => new Date(value.replace(' ','T')+'Z');
export const humanDate=(date,options={day:'numeric',month:'long'})=>new Intl.DateTimeFormat('es-ES',{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export const monday=date=>addDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
export function zonedISO(value, timezone) {
  const target=new Date(value+'Z').getTime();
  if(!Number.isFinite(target)) throw new Error('Completa la fecha y la hora.');
  let guess=target;
  for(let i=0;i<4;i++) {
    const d=new Date(guess);
    const shown=`${dateInZone(d,timezone)}T${timeInZone(d,timezone)}`;
    const delta=target-new Date(shown+'Z').getTime();
    if(!delta) return d.toISOString();
    guess+=delta;
  }
  throw new Error('Esa hora no existe por el cambio de horario. Elige otra.');
}
export const bytesLabel=bytes=>`${(Number(bytes)/1048576).toFixed(1)} MB`;
