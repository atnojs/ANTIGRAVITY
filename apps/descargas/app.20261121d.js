/* ══════════════════════════════════════════════════════════════════════
   Descargas · lógica de cliente
   - Login contra auth.php (sesión PHP, cookie HttpOnly + SameSite=Strict)
   - Cola contra api.php (polling)
   - Historial con el HistoryManager canónico (history.php en servidor)
   ══════════════════════════════════════════════════════════════════════ */
'use strict';

const API  = 'api.php';
const AUTH = 'auth.php';
// Puerto local del worker: sirve para saber si esta pagina se abre en el mismo
// PC que descarga. Comparar IPs no es fiable (proxies, CGNAT...).
const PUERTO_LOCAL = 8125;

const MODES = {
  video: {
    qualities: ['best', '2160', '1440', '1080', '720', '480', '360'],
    formats: [['mp4', 'MP4'], ['mkv', 'MKV'], ['webm', 'WEBM']],
  },
  audio: {
    qualities: [],
    formats: [['mp3', 'MP3'], ['m4a', 'M4A']],
  },
};

const state = {
  // Por defecto, SOLO AUDIO en MP3: es lo que mas usa Antonio.
  mode: 'audio',
  quality: 'best',
  format: 'mp3',
  playlist: false,
  subirWeb: false,
  enCasa: false,
  compartido: '',
  fuente: 'youtube',
  enCasaIp: false,
  carpetaPc: '',
  jobs: [],
  busy: false,
  // Filtro por fecha de la cola: 'todo' | 'dia' (una fecha) | 'rango' (desde/hasta).
  // Las fechas se guardan como YYYY-MM-DD, que es lo que devuelve <input type="date">.
  fechaModo: 'todo',
  fechaDia: '',
  fechaDesde: '',
  fechaHasta: '',
  // Segundos desde el ultimo latido del PC que descarga (null = sin datos).
  // Lo usan el aviso de "PC desconectado" y la etiqueta de la cola.
  workerAgo: null,
  // Fase 1: previsualizacion del enlace pegado.
  probe: null,          // { url, id, estado: 'pendiente'|'listo'|'error', info, error }
  probeSeq: 0,          // cambia si el enlace cambia: invalida respuestas viejas
  // Fase 2: filtro de estado de la cola y si la cola esta en pausa.
  filtro: 'todo',
  pausada: false,
  // Fase 3: registro abierto por trabajo (para que el repintado no lo cierre).
  logsAbiertos: new Set(),
  // Fase 4: limite de velocidad (MB/s, '' = sin limite).
  limite: '',
  // Fase 4: estado previo de cada trabajo, para avisar cuando termina.
  previo: new Map(),
};

let probeTimer = null;
let listTimer = null;
let healthTimer = null;
let authLost = false;

/* ── Utilidades ─────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function humanBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const value = n / Math.pow(1024, i);
  return value.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

/** Fecha LOCAL de una marca ISO en formato YYYY-MM-DD (así se compara con los
 *  <input type="date">, que también hablan en hora local del navegador). */
function claveDia(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date (evita saltos de zona horaria). */
function fechaLarga(clave) {
  const trozos = String(clave || '').split('-');
  return trozos.length === 3 ? trozos[2] + '/' + trozos[1] + '/' + trozos[0] : String(clave || '');
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload || {}),
  });
  let data = null;
  try { data = await response.json(); } catch (e) { data = null; }
  if (!data) throw new Error('El servidor devolvió una respuesta ilegible.');
  if (response.status === 401) { authLost = true; }
  return { ok: response.ok && data.success !== false, status: response.status, data };
}

/* ── Utilidades nuevas: enlaces, duracion, portapapeles ─────────────── */

/** Deja el enlace limpio: quita parametros de seguimiento (utm_*, fbclid, si…). */
function normalizarUrl(url) {
  const limpio = String(url || '').trim();
  try {
    const u = new URL(limpio);
    const sobra = /^(utm_|fbclid$|gclid$|si$|pp$|feature$|ref$|ref_$|mc_|_ga$|igshid$|share$)/i;
    const quitar = [];
    u.searchParams.forEach((valor, clave) => { if (sobra.test(clave)) quitar.push(clave); });
    quitar.forEach((clave) => u.searchParams.delete(clave));
    return u.toString();
  } catch (e) {
    return limpio;
  }
}

/** Duracion en m:ss o h:mm:ss. */
function fmtDuracion(segundos) {
  const total = Math.round(Number(segundos) || 0);
  if (total <= 0) return '';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return m + ':' + String(s).padStart(2, '0');
}

/** Copia texto al portapapeles, con plan B si el navegador no deja. */
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    area.remove();
    return ok;
  }
}

/** Aviso del navegador al terminar (si el usuario ha dado permiso). */
function notificar(titulo, texto) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(titulo, { body: String(texto || '').slice(0, 140), tag: 'descargas' });
  } catch (e) { /* sin aviso */ }
}

/** Titulo de la pestaña con las descargas que hay en marcha. */
function actualizarTitulo() {
  const activas = (Array.isArray(state.jobs) ? state.jobs : []).filter((job) => job.status === 'running').length;
  document.title = (activas ? '(' + activas + ') ' : '') + 'Descargas · Antigravity';
}

/* ── Overlay ────────────────────────────────────────────────────────── */

function showOverlay(text) {
  $('loadingState').textContent = text || 'Enviando a la cola...';
  $('loadingOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideOverlay() {
  $('loadingOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function setBusy(busy, label) {
  state.busy = busy;
  const button = $('add-btn');
  button.disabled = busy;
  button.setAttribute('aria-disabled', busy ? 'true' : 'false');
  $('add-btn-text').textContent = busy ? (label || 'ENVIANDO...') : 'DESCARGAR';
}

function showFormError(message) {
  const box = $('form-error');
  box.textContent = message;
  box.hidden = !message;
}

/* ── Login ──────────────────────────────────────────────────────────── */

function showLogin() {
  $('auth-modal').hidden = false;
  $('app-main').hidden = true;
  if (listTimer) { clearInterval(listTimer); listTimer = null; }
  if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
  setTimeout(() => $('auth-password').focus(), 60);
}

async function checkAuth() {
  try {
    const response = await fetch(AUTH, { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    return Boolean(data && data.auth);
  } catch (e) {
    return false;
  }
}

async function doLogin(event) {
  event.preventDefault();
  const button = $('auth-login-btn');
  const errorBox = $('auth-error');
  const password = $('auth-password').value;
  errorBox.classList.remove('show');

  if (!password) {
    errorBox.textContent = 'Escribe la contraseña.';
    errorBox.classList.add('show');
    return;
  }

  button.disabled = true;
  button.textContent = 'Entrando...';
  try {
    const body = new URLSearchParams({ password });
    const response = await fetch(AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      credentials: 'same-origin',
      body: body.toString(),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data && data.auth) {
      $('auth-password').value = '';
      await enterApp();
      return;
    }
    errorBox.textContent = (data && data.error) || 'No se pudo entrar.';
    errorBox.classList.add('show');
  } catch (e) {
    errorBox.textContent = 'No hay conexión con el servidor.';
    errorBox.classList.add('show');
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
}

async function doLogout() {
  try {
    await fetch(AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      credentials: 'same-origin',
      body: 'action=logout',
    });
  } catch (e) { /* da igual: se cierra igualmente */ }
  showLogin();
}

/**
 * ¿Estoy abriendo la web desde el PC que descarga?
 * Se le pregunta al propio worker en su puerto local: si contesta, es que si.
 * Chrome permite llamar a http://127.0.0.1 desde una pagina https.
 */
async function detectarPcLocal() {
  try {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 1500);
    const respuesta = await fetch('http://127.0.0.1:' + PUERTO_LOCAL + '/pc', {
      signal: control.signal,
      cache: 'no-store',
    });
    clearTimeout(reloj);
    if (!respuesta.ok) return false;
    const datos = await respuesta.json();
    if (datos && datos.carpeta) state.carpetaPc = datos.carpeta;
    return Boolean(datos && datos.pc);
  } catch (e) {
    return false;
  }
}

/**
 * Donde se esta abriendo la app. Se puede fijar a mano porque la deteccion
 * automatica no siempre puede saberlo:
 *   - la sonda al puerto local es directa, pero Chrome pide permiso para que
 *     una pagina publica hable con 127.0.0.1;
 *   - comparar IPs falla con CGNAT, donde la IP publica cambia entre peticiones
 *     (es el caso de esta linea).
 * Lo que elija a mano se guarda en ESTE dispositivo.
 */
function leerModoManual() {
  try {
    const v = localStorage.getItem('descargas_en_casa');
    return v === '1' ? true : (v === '0' ? false : null);
  } catch (e) {
    return null;
  }
}

function guardarModoManual(valor) {
  try {
    if (valor === null) localStorage.removeItem('descargas_en_casa');
    else localStorage.setItem('descargas_en_casa', valor ? '1' : '0');
  } catch (e) { /* modo privado: se queda solo en memoria */ }
}

function decidirEnCasa() {
  const manual = leerModoManual();
  if (manual !== null) return manual;
  return state.enCasaSonda === true || state.enCasaIp === true;
}

/* ── Aviso flotante (para cosas puntuales: enlace compartido, subidas...) ── */

let temporizadorAviso = null;

function mostrarAviso(mensaje, tipo) {
  let capa = document.getElementById('aviso-flotante');
  if (!capa) {
    capa = document.createElement('div');
    capa.id = 'aviso-flotante';
    capa.setAttribute('role', 'status');
    document.body.appendChild(capa);
  }
  capa.textContent = mensaje;
  capa.className = 'aviso-flotante visible' + (tipo === 'error' ? ' error' : '');
  if (temporizadorAviso) clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { capa.className = 'aviso-flotante'; }, 6000);
}

/* ── Avisos por WhatsApp: configurar y probar ───────────────────────── */

async function cargarWhatsapp() {
  try {
    const r = await postJson(API + '?action=whatsapp_estado', {});
    if (!r.ok) return;
    const d = r.data;
    if ($('wa-phone')) $('wa-phone').value = d.phone_number_id || '';
    if ($('wa-destino')) $('wa-destino').value = d.destinatario || '';
    if ($('wa-plantilla')) $('wa-plantilla').value = d.plantilla || '';
    if ($('wa-activo')) $('wa-activo').checked = d.activo === true;
    if ($('wa-fin')) $('wa-fin').checked = d.avisar_fin === true;
    if ($('wa-errores')) $('wa-errores').checked = d.avisar_errores === true;
    if ($('wa-token')) $('wa-token').placeholder = d.token_guardado ? ('guardado (' + d.token_pista + ')') : 'pega aquí el token';
    const estado = $('wa-estado');
    if (estado) {
      estado.textContent = d.activo ? 'Activado' : 'Desactivado';
      estado.className = 'hint ' + (d.activo ? 'dir-ok' : '');
      if (d.ultimo_log) estado.title = d.ultimo_log;
    }
  } catch (e) { /* si falla, el panel se queda como esta */ }
}

async function guardarWhatsapp() {
  const estado = $('wa-estado');
  try {
    const r = await postJson(API + '?action=whatsapp_config', {
      phone_number_id: $('wa-phone') ? $('wa-phone').value : '',
      token: $('wa-token') ? $('wa-token').value : '',
      destinatario: $('wa-destino') ? $('wa-destino').value : '',
      plantilla: $('wa-plantilla') ? $('wa-plantilla').value : '',
      activo: $('wa-activo') ? $('wa-activo').checked : false,
      avisar_fin: $('wa-fin') ? $('wa-fin').checked : true,
      avisar_errores: $('wa-errores') ? $('wa-errores').checked : false,
    });
    if (estado) {
      estado.textContent = r.ok ? 'Guardado' : (r.data.error || 'No se pudo guardar');
      estado.className = 'hint ' + (r.ok ? 'dir-ok' : 'dir-mal');
    }
    if ($('wa-token')) $('wa-token').value = '';
    await cargarWhatsapp();
  } catch (e) {
    if (estado) { estado.textContent = 'No hay conexión con el servidor.'; estado.className = 'hint dir-mal'; }
  }
}

async function probarWhatsapp() {
  const estado = $('wa-estado');
  if (estado) { estado.textContent = 'Enviando prueba…'; estado.className = 'hint'; }
  try {
    const r = await postJson(API + '?action=whatsapp_test', {});
    if (estado) {
      estado.textContent = r.ok ? 'Prueba enviada: mira el móvil' : ('No se pudo: ' + (r.data.error || 'error desconocido'));
      estado.className = 'hint ' + (r.ok ? 'dir-ok' : 'dir-mal');
      if (r.data.error) estado.title = r.data.error;
    }
  } catch (e) {
    if (estado) { estado.textContent = 'No hay conexión con el servidor.'; estado.className = 'hint dir-mal'; }
  }
}
/* ── PWA: instalable y «Compartir enlace» del móvil ──────────────────── */

/**
 * El boton "Compartir" del movil llega a compartir.php y este redirige aqui con
 * ?compartido=<enlace>. Se guarda para encolarlo en cuanto la app este lista.
 */
function leerCompartido() {
  try {
    const params = new URLSearchParams(location.search);
    const enlace = params.get('compartido');
    if (enlace && /^https?:\/\//i.test(enlace)) {
      state.compartido = enlace;
    }
    if (enlace) {
      // Se limpia la barra para que al recargar no se vuelva a encolar.
      history.replaceState(null, '', location.pathname + location.hash);
    }
  } catch (e) { /* sin URLSearchParams no pasa nada */ }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const seguro = location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (!seguro) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* la app funciona igual sin PWA */ });
  });
}

/** Si venía un enlace compartido, se encola solo con los ajustes actuales. */
function procesarCompartido() {
  if (!state.compartido) return;
  const enlace = state.compartido;
  state.compartido = '';
  const campo = $('url');
  if (!campo) return;
  campo.value = enlace;
  mostrarAviso('Enlace compartido: ' + enlace);
  setTimeout(() => { addDownloads(); }, 400);
}
/* ── Arranque de la app ─────────────────────────────────────────────── */

async function enterApp() {
  $('auth-modal').hidden = true;
  $('app-main').hidden = false;

  await refreshQueue();
  await refreshHealth();
  state.enCasaSonda = await detectarPcLocal();
  state.enCasa = decidirEnCasa();
  procesarCompartido();
  vigilarCola();
  aplicarFuente(state.fuente || 'youtube');
  if (listTimer) clearInterval(listTimer);
  if (healthTimer) clearInterval(healthTimer);
  listTimer = setInterval(refreshQueue, 4000);
  healthTimer = setInterval(refreshHealth, 15000);
}

/* ── Estado del PC y el disco ───────────────────────────────────────── */

/** Segundos sin latido a partir de los cuales el PC se considera desconectado. */
const SEGUNDOS_PC_OFFLINE = 120;

/** Texto humano para "hace cuanto". */
function haceTiempo(segundos) {
  if (!Number.isFinite(segundos) || segundos < 0) return '';
  if (segundos < 90) return 'hace unos segundos';
  const minutos = Math.round(segundos / 60);
  if (minutos < 90) return 'hace ' + minutos + ' min';
  const horas = Math.round(minutos / 60);
  if (horas < 48) return 'hace ' + horas + ' h';
  const dias = Math.round(horas / 24);
  return 'hace ' + dias + (dias === 1 ? ' día' : ' días');
}

/** ¿El PC que descarga lleva demasiado tiempo sin dar senales? */
function pcDesconectado() {
  return Number.isFinite(state.workerAgo) && state.workerAgo > SEGUNDOS_PC_OFFLINE;
}

/**
 * Pinta el aviso del PC. El servidor ya sabia desde cuando el worker no late
 * (health.worker.seconds_ago), pero la app no lo ensenaba: si el worker estaba
 * parado, los trabajos se quedaban "En cola" para siempre sin explicacion.
 */
function actualizarEstadoWorker() {
  const caja = $('worker-estado');
  if (!caja) return;

  const ago = state.workerAgo;
  const hayCola = (Array.isArray(state.jobs) ? state.jobs : [])
    .some((job) => job.status === 'queued' || job.status === 'running');

  if (!Number.isFinite(ago)) {
    // Sin datos del PC: solo se avisa si hay algo esperando.
    caja.hidden = !hayCola;
    caja.classList.remove('online');
    caja.classList.add('offline');
    caja.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
      'Sin noticias del PC. Las descargas esperan a que se conecte.';
    return;
  }

  caja.hidden = false;
  if (ago > SEGUNDOS_PC_OFFLINE) {
    caja.classList.remove('online');
    caja.classList.add('offline');
    caja.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
      'PC desconectado (' + esc(haceTiempo(ago)) + '). Las descargas esperan a que vuelva.';
  } else {
    caja.classList.remove('offline');
    caja.classList.add('online');
    caja.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
      'PC conectado: las descargas empiezan en segundos.';
  }
}

async function refreshHealth() {
  // La barra de estado ya no esta: aqui solo se mantiene la deteccion de
  // 'estoy en casa o fuera' (decide si el fichero se queda en el PC o se sube)
  // y el estado del worker para avisar si esta desconectado.
  try {
    const response = await fetch(API + '?action=health', { cache: 'no-store' });
    const data = await response.json();
    if (!data || !data.success) return;
    if (data.deteccion) {
      state.enCasaIp = data.deteccion.coinciden === true;
      state.deteccion = data.deteccion;
    }
    if (data.worker && Number.isFinite(data.worker.seconds_ago)) {
      state.workerAgo = data.worker.seconds_ago;
      actualizarEstadoWorker();
    }
    state.enCasa = decidirEnCasa();
  } catch (e) { /* silencio: es solo informativo */ }
}

/* ── Cola ───────────────────────────────────────────────────────────── */

async function refreshQueue() {
  if (authLost) return;
  try {
    const result = await postJson(API + '?action=list', {});
    if (!result.ok) {
      if (authLost) { showLogin(); return; }
      return;
    }
    const antes = state.previo;
    state.jobs = Array.isArray(result.data.jobs) ? result.data.jobs : [];
    state.pausada = result.data.pausado === true;
    renderQueue();
    renderDir(result.data.dir);
    avisarCambios(antes);
    actualizarTitulo();
  } catch (e) {
    console.warn('No se pudo leer la cola:', e);
  }
}

/** Avisa al terminar o fallar una descarga que ya conocíamos. */
function avisarCambios(antes) {
  const ahora = new Map();
  const jobs = Array.isArray(state.jobs) ? state.jobs : [];
  jobs.forEach((job) => ahora.set(job.id, job.status));
  ahora.forEach((status, id) => {
    const previo = antes.get(id);
    if (!previo || previo === status) return;
    const job = jobs.find((j) => j.id === id) || {};
    if (status === 'done') notificar('Descarga lista', job.title || '');
    else if (status === 'error') notificar('No se pudo descargar', job.title || '');
  });
  state.previo = ahora;
}

/* ── La cola se queda con scroll a partir de la 6ª descarga ──────────── */

/**
 * Mide las 5 primeras fichas y fija ese alto como máximo. Si hay 5 o menos,
 * no hay scroll (no aparece la barra). Asi el panel derecho no crece sin fin.
 */
/** Observa la lista de la cola: cada vez que se repinta, recalcula el alto. */
function vigilarCola() {
  const lista = $('queue-list');
  if (!lista || typeof MutationObserver === 'undefined') return;
  let t = null;
  const observador = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(ajustarAltoCola, 60);
  });
  observador.observe(lista, { childList: true });
  ajustarAltoCola();
}
function ajustarAltoCola() {
  const lista = $('queue-list');
  if (!lista) return;
  lista.classList.remove('scroll');
  lista.style.maxHeight = '';
  const fichas = Array.from(lista.children);
  if (fichas.length <= 3) return;
  const primera = fichas[0];
  const tercera = fichas[2];
  // Alto exacto de las 3 primeras: la 4a queda dentro del scroll.
  const alto = (tercera.offsetTop + tercera.offsetHeight) - primera.offsetTop;
  if (alto > 0) {
    lista.style.maxHeight = alto + 'px';
    lista.classList.add('scroll');
  }
}
/* ── Filtro por fecha de la cola ────────────────────────────────────── */

/** Descargas que pasan el filtro de fecha activo. */
function jobsFiltrados() {
  const todos = Array.isArray(state.jobs) ? state.jobs : [];
  if (state.fechaModo === 'dia' && state.fechaDia) {
    return todos.filter((job) => claveDia(job.created_at) === state.fechaDia);
  }
  if (state.fechaModo === 'rango' && (state.fechaDesde || state.fechaHasta)) {
    return todos.filter((job) => {
      const clave = claveDia(job.created_at);
      if (!clave) return false;
      if (state.fechaDesde && clave < state.fechaDesde) return false;
      if (state.fechaHasta && clave > state.fechaHasta) return false;
      return true;
    });
  }
  return todos;
}

/** ¿Hay un filtro de fecha puesto de verdad? */
function filtrandoPorFecha() {
  if (state.fechaModo === 'dia') return Boolean(state.fechaDia);
  if (state.fechaModo === 'rango') return Boolean(state.fechaDesde || state.fechaHasta);
  return false;
}

/** Texto "Mostrando N de M descargas del …" bajo los controles. */
function pintarResumenFecha(total, mostrados) {
  const caja = $('fecha-resumen');
  if (!caja) return;
  if (!filtrandoPorFecha()) {
    caja.hidden = true;
    caja.textContent = '';
    return;
  }
  let texto = mostrados + ' de ' + total + (total === 1 ? ' descarga' : ' descargas');
  if (state.fechaModo === 'dia') {
    texto += ' del ' + fechaLarga(state.fechaDia);
  } else if (state.fechaDesde && state.fechaHasta) {
    texto += ' del ' + fechaLarga(state.fechaDesde) + ' al ' + fechaLarga(state.fechaHasta);
  } else if (state.fechaDesde) {
    texto += ' desde el ' + fechaLarga(state.fechaDesde);
  } else {
    texto += ' hasta el ' + fechaLarga(state.fechaHasta);
  }
  caja.textContent = texto;
  caja.hidden = false;
}

/** Muestra los campos que tocan según el modo y repinta la cola. */
function aplicarModoFecha() {
  const dia = $('fecha-dia');
  const desde = $('fecha-desde');
  const hasta = $('fecha-hasta');
  const sep = $('fecha-sep');
  const limpiar = $('fecha-limpiar');
  const grupos = $('fecha-modos');
  if (!dia || !desde || !hasta || !grupos) return;

  const modo = state.fechaModo;
  dia.hidden = modo !== 'dia';
  desde.hidden = modo !== 'rango';
  hasta.hidden = modo !== 'rango';
  if (sep) sep.hidden = modo !== 'rango';
  if (limpiar) limpiar.hidden = modo === 'todo';
  paintGroup(grupos, 'fecha', modo);
  renderQueue();
}

function bindFecha() {
  const grupos = $('fecha-modos');
  if (!grupos) return;

  grupos.addEventListener('click', (event) => {
    const boton = event.target.closest('[data-fecha]');
    if (!boton) return;
    state.fechaModo = boton.dataset.fecha;
    const dia = $('fecha-dia');
    if (state.fechaModo === 'dia' && !state.fechaDia) {
      state.fechaDia = claveDia(new Date().toISOString());
      if (dia) dia.value = state.fechaDia;
    }
    aplicarModoFecha();
  });

  const dia = $('fecha-dia');
  if (dia) dia.addEventListener('change', () => { state.fechaDia = dia.value; renderQueue(); });
  const desde = $('fecha-desde');
  if (desde) desde.addEventListener('change', () => { state.fechaDesde = desde.value; renderQueue(); });
  const hasta = $('fecha-hasta');
  if (hasta) hasta.addEventListener('change', () => { state.fechaHasta = hasta.value; renderQueue(); });

  const limpiar = $('fecha-limpiar');
  if (limpiar) {
    limpiar.addEventListener('click', () => {
      state.fechaDia = '';
      state.fechaDesde = '';
      state.fechaHasta = '';
      state.fechaModo = 'todo';
      if (dia) dia.value = '';
      if (desde) desde.value = '';
      if (hasta) hasta.value = '';
      aplicarModoFecha();
    });
  }

  aplicarModoFecha();
}

function renderQueue() {
  const list = $('queue-list');
  const todos = Array.isArray(state.jobs) ? state.jobs : [];
  const porFecha = jobsFiltrados();
  const visibles = ordenParaMostrar(trabajosPorFiltro(porFecha));
  const pcOff = pcDesconectado();

  pintarFiltros(porFecha);
  $('queue-count').textContent = String(visibles.length);
  pintarResumenFecha(todos.length, porFecha.length);

  const pausa = $('queue-pausado');
  if (pausa) pausa.hidden = !state.pausada;
  const bPausar = $('queue-pausar');
  if (bPausar) {
    bPausar.hidden = !todos.some((j) => j.status === 'queued' || j.status === 'running' || j.status === 'paused');
    bPausar.textContent = state.pausada ? 'Reanudar todo' : 'Pausar todo';
  }
  const bLimpiar = $('queue-limpiar');
  const terminadas = todos.filter((j) => j.status === 'done' || j.status === 'error' || j.status === 'cancelled').length;
  if (bLimpiar) {
    bLimpiar.hidden = terminadas === 0;
    bLimpiar.textContent = 'Limpiar terminadas (' + terminadas + ')';
  }
  const bNotif = $('queue-notif');
  if (bNotif) {
    bNotif.hidden = !(typeof Notification !== 'undefined' && Notification.permission === 'default');
  }

  if (!visibles.length) {
    let vacio = 'Todavía no has pedido ninguna descarga.';
    if (filtrandoPorFecha()) vacio = 'No hay descargas con esa fecha.';
    else if (state.filtro !== 'todo') vacio = 'No hay descargas en este filtro.';
    list.innerHTML = '<p class="empty">' + vacio + '</p>';
    list.setAttribute('aria-busy', 'false');
    actualizarEstadoWorker();
    return;
  }

  const anyRunning = visibles.some((job) => job.status === 'running' || job.status === 'queued');
  list.setAttribute('aria-busy', anyRunning ? 'true' : 'false');

  const idsCola = ordenParaMostrar(porFecha.filter((j) => j.status === 'queued')).map((j) => j.id);
  list.innerHTML = visibles.map((job) => tarjetaTrabajo(job, { pcOff: pcOff, idsCola: idsCola })).join('');
  actualizarEstadoWorker();
}

/** Un trabajo de la cola, con sus botones según el estado. */
function tarjetaTrabajo(job, { pcOff, idsCola }) {
  const status = String(job.status || 'queued');
  const labels = { queued: 'En cola', running: 'Descargando', paused: 'En pausa', done: 'Listo', error: 'Error', cancelled: 'Cancelado' };
  if (status === 'queued' && job.retry_at) { labels.queued = 'Reintentando'; }
  if (status === 'queued' && pcOff) { labels.queued = 'Esperando al PC'; }

  const percent = Math.max(0, Math.min(100, Number(job.percent) || 0));
  const indeterminate = status === 'running' && percent <= 0;
  const title = job.title || job.url || 'Descarga';
  const meta = [];
  if (job.mode === 'audio') meta.push('Audio ' + String(job.format || '').toUpperCase());
  else {
    meta.push(String(job.format || 'mp4').toUpperCase());
    if (job.quality && job.quality !== 'best') meta.push(job.quality + 'p');
  }
  if (job.fuente === 'instagram' || job.fuente === 'tiktok') meta.push(FUENTES[job.fuente].nombre);
  if (job.playlist) meta.push('lista completa');
  if (job.item_count > 1) meta.push('elemento ' + Math.max(1, job.item_index) + '/' + job.item_count);
  if (status === 'running') {
    if (job.speed) meta.push(job.speed);
    if (job.eta) meta.push('quedan ' + job.eta);
  }
  if (job.limit_rate) meta.push('límite ' + job.limit_rate + ' MB/s');
  if (status === 'paused') meta.push('se reanuda donde se quedó');
  meta.push(fmtDate(job.created_at));

  const size = (job.files || []).reduce((sum, file) => sum + (Number(file.bytes) || 0), 0);
  const id = esc(job.id);

  const files = (job.files || []).map((file) => {
    if (file.local) {
      const pidiendo = file.subir_pedido === true;
      return `<span class="file-chip local" title="${esc(file.ruta_local || '')}">
        <span>${esc(file.title || file.filename)}</span>
        <em>${humanBytes(file.bytes)}</em>
        <b>EN TU PC</b>
      </span>
      <button type="button" class="btn-sm" data-act="traer" data-item="${esc(file.id)}"${pidiendo ? ' disabled' : ''}>
        ${pidiendo ? 'SUBIENDO A LA WEB…' : 'TRAER A LA WEB'}
      </button>`;
    }
    return `<span class="file-chip estatico" title="${esc(file.filename || file.title || '')}">
      <span>${esc(file.title || file.filename)}</span>
      <em>${humanBytes(file.bytes)}</em>
    </span>`;
  }).join('');

  if (job.retry_at && status === 'queued') {
    const faltan = Math.round((new Date(job.retry_at).getTime() - Date.now()) / 1000);
    if (faltan > 0) meta.push('reintento automático en ' + faltan + ' s');
    else meta.push('reintentando…');
  }
  if (status === 'queued' && pcOff) meta.push('el PC está desconectado');

  const acciones = [];
  if (status === 'queued') {
    const pos = idsCola.indexOf(job.id);
    acciones.push(`<button type="button" class="btn-sm mover" data-act="move" data-dir="up" data-id="${id}" aria-label="Subir en la cola" title="Subir en la cola"${pos === 0 ? ' disabled' : ''}>↑</button>`);
    acciones.push(`<button type="button" class="btn-sm mover" data-act="move" data-dir="down" data-id="${id}" aria-label="Bajar en la cola" title="Bajar en la cola"${pos === idsCola.length - 1 ? ' disabled' : ''}>↓</button>`);
    acciones.push(`<button type="button" class="btn-sm" data-act="pause" data-id="${id}">Pausar</button>`);
    acciones.push(`<button type="button" class="btn-sm" data-act="cancel" data-id="${id}">Cancelar</button>`);
  } else if (status === 'running') {
    acciones.push(`<button type="button" class="btn-sm" data-act="pause" data-id="${id}">Pausar</button>`);
    acciones.push(`<button type="button" class="btn-sm" data-act="cancel" data-id="${id}">Cancelar</button>`);
  } else if (status === 'paused') {
    acciones.push(`<button type="button" class="btn-sm" data-act="resume" data-id="${id}">Reanudar</button>`);
    acciones.push(`<button type="button" class="btn-sm" data-act="cancel" data-id="${id}">Cancelar</button>`);
  } else {
    if (status === 'error' || status === 'cancelled') {
      acciones.push(`<button type="button" class="btn-sm" data-act="retry" data-id="${id}">Reintentar</button>`);
    }
    acciones.push(`<button type="button" class="btn-sm danger" data-act="delete" data-id="${id}">Borrar</button>`);
  }

  if (Array.isArray(job.files) && job.files.length) {
    acciones.push(`<button type="button" class="btn-sm ver" data-act="ver" data-id="${id}" title="Verlo o escucharlo">Ver</button>`);
    acciones.push(`<button type="button" class="btn-sm carpeta" data-act="carpeta" data-id="${id}" title="Abrir su carpeta en el PC">Carpeta</button>`);
  }

  return `
    <article class="job estado-${esc(status)}">
      <div class="job-head">
        <h3 class="job-title">${esc(title)}</h3>
        <span class="state ${esc(status)}">${labels[status] || esc(status)}</span>
        ${size > 0 ? `<span class="job-meta">${humanBytes(size)}</span>` : ''}
      </div>
      ${status === 'running' || status === 'queued' || status === 'paused' ? `
        <div class="bar${indeterminate ? ' indeterminate' : ''}${status === 'paused' ? ' en-pausa' : ''}">
          <i style="transform:scaleX(${((indeterminate ? 40 : percent) / 100).toFixed(4)})"></i>
        </div>` : ''}
      <p class="job-meta">${esc(meta.join(' · '))}</p>
      ${bloqueError(job)}
      ${files ? `<div class="files">${files}</div>` : ''}
      <div class="job-actions" style="margin-top:10px;">${acciones.join('')}</div>
    </article>`;
}

/** Explicacion del fallo + registro y boton de arreglo (Fase 3). */
function bloqueError(job) {
  if (!job.error) return '';
  const entero = String(job.error);
  const pista = job.error_pista || entero.split(' || ')[0];
  const detalle = entero.includes(' || ') ? entero.split(' || ').slice(1).join(' || ') : '';
  const clase = String(job.error_clase || '');
  let arreglo = '';
  if (clase === 'login') {
    arreglo = `<button type="button" class="btn-sm" data-act="cookies" data-id="${esc(job.id)}">Cómo dar las cookies</button>`;
  } else if (clase === 'actualizar') {
    arreglo = `<button type="button" class="btn-sm" data-act="update" data-id="${esc(job.id)}">Actualizar yt-dlp</button>`;
  }
  const abierto = state.logsAbiertos.has(job.id);
  const registro = [job.log_tail || '', detalle, job.comando ? 'Comando:\n' + job.comando : '']
    .filter(Boolean).join('\n\n');
  return `<div class="job-error">
    <p>${esc(pista)}</p>
    ${arreglo ? '<div class="job-error-acciones">' + arreglo + '</div>' : ''}
    ${registro ? `<button type="button" class="btn-sm log-toggle" data-act="log" data-id="${esc(job.id)}" aria-expanded="${abierto ? 'true' : 'false'}">${abierto ? 'Ocultar registro' : 'Ver registro'}</button>
      ${abierto ? `<pre class="job-log" id="log-${esc(job.id)}">${esc(registro)}</pre><button type="button" class="btn-sm" data-act="copiar" data-id="${esc(job.id)}">Copiar registro</button>` : ''}` : ''}
  </div>`;
}
/* ── Buscar en YouTube ──────────────────────────────────────────────── */

async function onQueueClick(event) {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const act = button.getAttribute('data-act');
  const id = act === 'traer' ? button.getAttribute('data-item') : button.getAttribute('data-id');
  const job = (Array.isArray(state.jobs) ? state.jobs : []).find((j) => j.id === id) || null;

  // Registro y copiar no hablan con el servidor: no hace falta bloquear nada.
  if (act === 'log') {
    if (state.logsAbiertos.has(id)) state.logsAbiertos.delete(id);
    else state.logsAbiertos.add(id);
    renderQueue();
    return;
  }
  if (act === 'copiar') {
    const texto = textoDeRegistro(job);
    const ok = await copiarTexto(texto);
    mostrarAviso(ok ? 'Registro copiado.' : 'No se pudo copiar el registro.', ok ? 'ok' : 'error');
    return;
  }
  if (act === 'cookies') {
    mostrarAviso('Para YouTube: exporta las cookies del navegador con Cookie-Editor a un cookies.txt y pon su ruta en "cookies_file" dentro de .private/descargas-worker.json; después reinicia el worker. Para Instagram, pasos en tools/descargador/instagram-LEEME.md.', 'info');
    return;
  }

  button.disabled = true;
  showFormError('');
  try {
    if (act === 'ver') {
      await verTrabajo(id);
      return;
    }
    if (act === 'carpeta') {
      await abrirCarpetaDelTrabajo(id);
      return;
    }
    if (act === 'update') {
      await actualizarYtdlp();
      await refreshQueue();
      return;
    }
    if (act === 'retry') {
      const result = await postJson(API + '?action=retry', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo reintentar.');
      await refreshQueue();
    } else if (act === 'cancel') {
      const result = await postJson(API + '?action=cancel', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo cancelar.');
    } else if (act === 'pause') {
      const result = await postJson(API + '?action=pause', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo pausar.');
    } else if (act === 'resume') {
      const result = await postJson(API + '?action=resume', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo reanudar.');
    } else if (act === 'move') {
      const result = await postJson(API + '?action=move', { job_id: id, dir: button.dataset.dir || 'up' });
      if (!result.ok) showFormError(result.data.error || 'No se pudo mover.');
    } else if (act === 'traer') {
      // «Traer a la web»: el fichero esta en el PC y se pide una copia en el
      // servidor para poder bajarlo desde el movil.
      const resultado = await postJson(API + '?action=subir_item', { item_id: id });
      if (!resultado.ok) showFormError(resultado.data.error || 'No se pudo pedir la subida.');
    } else if (act === 'delete') {
      if (!confirm('¿Borrar esta descarga y sus ficheros del servidor?')) { button.disabled = false; return; }
      const result = await postJson(API + '?action=delete', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo borrar.');
    }
    await refreshQueue();
  } catch (e) {
    showFormError('No hay conexión con el servidor.');
  } finally {
    button.disabled = false;
  }
}

/** Texto del registro de un trabajo, para verlo o copiarlo. */
function textoDeRegistro(job) {
  if (!job) return '';
  const entero = String(job.error || '');
  const detalle = entero.includes(' || ') ? entero.split(' || ').slice(1).join(' || ') : '';
  return [job.log_tail || '', detalle, job.comando ? 'Comando:\n' + job.comando : '']
    .filter(Boolean).join('\n\n');
}

/** Pide al PC que actualice yt-dlp y espera el resultado. */
async function actualizarYtdlp() {
  try {
    const r = await postJson(API + '?action=update_tool', { tool: 'ytdlp' });
    if (!r.ok) {
      showFormError((r.data && r.data.error) || 'No se pudo pedir la actualización.');
      return;
    }
    mostrarAviso('Pidiendo al PC que actualice yt-dlp…', 'info');
    for (let i = 0; i < 60; i++) {
      await new Promise((res) => setTimeout(res, 2000));
      const s = await postJson(API + '?action=tool_status', {});
      if (!s.ok) continue;
      const d = s.data || {};
      if (d.estado === 'hecha') {
        mostrarAviso((d.ok ? 'yt-dlp actualizado: ' : 'No se pudo actualizar: ') + (d.mensaje || 'sin detalle'), d.ok ? 'ok' : 'error');
        return;
      }
    }
    mostrarAviso('La actualización no ha contestado; míralo en el registro del trabajo.', 'error');
  } catch (e) {
    showFormError('No hay conexión con el servidor.');
  }
}

/* ── Ver / escuchar y abrir la carpeta en el PC ─────────────────────── */

/** Los ficheros de una descarga (vacío si el trabajo ya no está en la cola). */
function ficherosDelTrabajo(id) {
  const trabajo = (Array.isArray(state.jobs) ? state.jobs : []).find((job) => job.id === id);
  return trabajo && Array.isArray(trabajo.files) ? trabajo.files.filter((f) => f && f.id) : [];
}

/**
 * Pide al PC que abra algo (un fichero o su carpeta).
 *
 * Va por la API (mismo origen) y no por el puerto local del worker porque la
 * CSP del sitio bloquea las conexiones a http://127.0.0.1 desde la página. El
 * worker recoge la petición en su sondeo (cada 5 s) y abre lo que toque él, que
 * es quien ve el disco del PC.
 */
async function pedirAlPc(modo, jobId, itemId) {
  const resultado = await postJson(API + '?action=abrir', {
    modo,
    job_id: jobId,
    item_id: itemId || '',
  });
  if (!resultado.ok) {
    throw new Error((resultado.data && resultado.data.error) || 'No se pudo pedir al PC que lo abra.');
  }
  return resultado.data;
}

/**
 * Abre un fichero de la nube en una pestaña: el navegador lo reproduce.
 *
 * Ojo: la copia de la nube caduca a las 48 h, así que antes de abrirla se pide
 * el primer byte. Si ya no está, se cierra la pestaña en blanco y se avisa; de
 * paso, la pestaña se abre al instante (en blanco) y ya no la bloquea el
 * navegador cuando la comprobación tarda.
 */
async function abrirEnElNavegador(fichero) {
  const url = API + '?action=download&item=' + encodeURIComponent(fichero.id) + '&ver=1';
  const ventana = window.open('about:blank', '_blank');
  if (!ventana) {
    mostrarAviso('El navegador ha bloqueado la pestaña. Permite las ventanas emergentes para verlo.', 'error');
    return;
  }

  let disponible = true;
  try {
    const comprobacion = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    });
    disponible = comprobacion.ok;
  } catch (e) {
    disponible = true; // sin red no se descarta: que el navegador lo intente
  }

  if (!disponible) {
    try { ventana.close(); } catch (e) { /* ya cerrada */ }
    // La copia de la nube caducó: quien llama decide si puede abrirlo desde el PC.
    return false;
  }

  try {
    ventana.location.href = url;
    ventana.opener = null;
  } catch (e) { /* si la pestaña se cerró, se ignora */ }
  return true;
}

/**
 * Botón VER: ver o escuchar el fichero.
 *  - Si está en la nube (subido a la web), se abre en una pestaña y se reproduce
 *    en el navegador: sirve también desde el móvil.
 *  - Si solo está en el PC, se abre con el programa del PC (VLC, Reproductor…).
 */
async function verTrabajo(id) {
  const ficheros = ficherosDelTrabajo(id);
  if (!ficheros.length) {
    mostrarAviso('Esta descarga todavía no tiene ningún fichero.');
    return;
  }

  const enNube = ficheros.filter((f) => !f.local);
  const enPc = ficheros.filter((f) => f.local && f.ruta_local);

  // La pestaña se abre ANTES de esperar nada: si no, el bloqueador la corta.
  if (enNube.length) {
    const abierta = await abrirEnElNavegador(enNube[0]);
    if (abierta) return;

    // La copia de la nube caducó (48 h). El fichero sigue en el PC del usuario,
    // así que se le pide al worker que lo abra con su programa.
    try {
      await pedirAlPc('ver', id, enNube[0].id);
      mostrarAviso('La copia en la nube ya caducó (48 h). Te lo abro desde el PC…');
    } catch (e) {
      mostrarAviso('La copia en la nube ya no está (caduca a las 48 h) y el PC no está disponible.', 'error');
    }
    return;
  }

  // Solo está en el PC: se lo pedimos al worker, que lo abre con el programa
  // predeterminado (VLC, Reproductor…).
  if (!enPc.length) {
    mostrarAviso('Esta descarga no tiene un fichero que se pueda abrir.', 'error');
    return;
  }
  mostrarAviso('Abriendo en el PC…');
  try {
    await pedirAlPc('ver', id, enPc[0].id);
  } catch (e) {
    mostrarAviso(e.message, 'error');
  }
}

/**
 * Botón CARPETA: abre el Explorador del PC en la carpeta de descargas
 * (D:\Descargas Y, I y T), con el fichero seleccionado si se sabe cuál es.
 */
async function abrirCarpetaDelTrabajo(id) {
  const ficheros = ficherosDelTrabajo(id);
  const conRuta = ficheros.find((f) => f.local && f.ruta_local);

  try {
    await pedirAlPc('carpeta', id, conRuta ? conRuta.id : '');
    mostrarAviso('Abriendo la carpeta en el PC…');
  } catch (e) {
    mostrarAviso(e.message, 'error');
  }
}

/* ── Fase 1: mirar el enlace antes de descargarlo ───────────────────── */

/** ¿Este enlace ya esta en la cola? (comparando sin parametros de seguimiento) */
function duplicadoDe(url) {
  const buscada = normalizarUrl(url);
  const jobs = Array.isArray(state.jobs) ? state.jobs : [];
  return jobs.find((job) => normalizarUrl(job.url) === buscada) || null;
}

function pararSonda() {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

/** Pinta la tarjeta de previsualizacion según el estado de la sonda. */
function pintarProbe() {
  const caja = $('probe-box');
  if (!caja) return;
  // Las calidades apagadas de un enlace no valen para el siguiente: se recalcula
  // siempre (sin datos, se vuelven a encender todas).
  aplicarCalidadesDisponibles();
  const probe = state.probe;
  if (!probe) {
    caja.innerHTML = '';
    caja.classList.remove('is-on');
    return;
  }
  caja.classList.add('is-on');
  if (probe.estado === 'pendiente') {
    caja.innerHTML = '<p class="probe-loading"><span class="dot-spin" aria-hidden="true"></span> Comprobando el enlace en el PC…</p>';
    return;
  }
  if (probe.estado === 'error') {
    caja.innerHTML = '<p class="probe-error">No se pudo mirar el enlace: ' + esc(probe.error || 'el PC no contestó') +
      '. Puedes descargarlo de todas formas.</p>';
    return;
  }
  const info = probe.info || {};
  const trozos = [];
  if (info.channel) trozos.push(esc(info.channel));
  if (info.duration) trozos.push(fmtDuracion(info.duration));
  if (info.playlist && info.playlist_count) trozos.push('lista de ' + info.playlist_count);
  else if (info.playlist) trozos.push('es parte de una lista');
  if (Array.isArray(info.heights) && info.heights.length) trozos.push('llega a ' + info.heights[0] + 'p');
  if (info.live === 'is_live') trozos.push('en directo');
  const dup = duplicadoDe(probe.url);
  const aviso = dup
    ? '<p class="probe-aviso">' +
      (dup.status === 'done'
        ? 'Ya la descargaste el ' + fmtDate(dup.created_at) + '.'
        : 'Ya está en la cola (' + esc(dup.title || dup.url) + ').') +
      '</p>'
    : '';
  caja.innerHTML =
    '<div class="probe-card">' +
      (info.thumbnail
        ? '<img class="probe-thumb" src="' + esc(info.thumbnail) + '" alt="' + esc(info.title || 'Miniatura del vídeo') + '" loading="lazy" referrerpolicy="no-referrer">'
        : '') +
      '<div class="probe-copy">' +
        '<p class="probe-title">' + esc(info.title || 'Sin título') + '</p>' +
        (trozos.length ? '<p class="probe-meta">' + trozos.join(' · ') + '</p>' : '') +
        aviso +
      '</div>' +
    '</div>';
}

/** Mira el enlace del campo (solo si hay uno). */
function programarSonda() {
  const campo = $('url');
  if (!campo) return;
  const lineas = String(campo.value || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lineas.length > 1) {
    pararSonda();
    state.probe = null;
    pintarProbe();
    return;
  }
  if (!lineas.length || !/^https?:\/\//i.test(lineas[0])) {
    pararSonda();
    state.probe = null;
    pintarProbe();
    return;
  }
  const url = normalizarUrl(lineas[0]);
  if (state.probe && state.probe.url === url && state.probe.estado !== 'error') return;
  pedirSonda(url);
}

async function pedirSonda(url) {
  const secuencia = ++state.probeSeq;
  state.probe = { url, id: '', estado: 'pendiente', info: null, error: '' };
  pintarProbe();
  let id = '';
  try {
    const alta = await postJson(API + '?action=probe', { url });
    if (!alta.ok) throw new Error((alta.data && alta.data.error) || 'el servidor no aceptó el enlace');
    id = alta.data.id;
    if (secuencia !== state.probeSeq) return;
    state.probe.id = id;
  } catch (e) {
    if (secuencia !== state.probeSeq) return;
    state.probe = { url, estado: 'error', error: e.message };
    pintarProbe();
    return;
  }

  const empezado = Date.now();
  pararSonda();
  probeTimer = setInterval(async () => {
    if (secuencia !== state.probeSeq) { pararSonda(); return; }
    if (Date.now() - empezado > 25000) {
      pararSonda();
      state.probe = { url, id, estado: 'error', error: 'el PC no contestó a tiempo' };
      pintarProbe();
      return;
    }
    try {
      const r = await postJson(API + '?action=probe_status', { id });
      if (secuencia !== state.probeSeq) { pararSonda(); return; }
      const d = (r && r.data) || {};
      if (d.estado === 'listo') {
        pararSonda();
        state.probe = { url, id, estado: 'listo', info: d.info || {} };
        pintarProbe();
        aplicarCalidadesDisponibles();
      } else if (d.estado === 'error') {
        pararSonda();
        state.probe = { url, id, estado: 'error', error: d.error || 'el PC no pudo leerlo' };
        pintarProbe();
      }
    } catch (e) { /* se reintenta en el siguiente tic */ }
  }, 1200);
}

/** Apaga las calidades que este vídeo no tiene, según lo que ha visto el PC. */
function aplicarCalidadesDisponibles() {
  const info = state.probe && state.probe.estado === 'listo' ? state.probe.info : null;
  const alturas = info && Array.isArray(info.heights) ? info.heights : [];
  document.querySelectorAll('[data-quality]').forEach((boton) => {
    const valor = Number(boton.dataset.quality);
    const noExiste = alturas.length > 0 && Number.isFinite(valor) && valor > 0 && valor > alturas[0];
    boton.disabled = noExiste;
    boton.classList.toggle('is-off', noExiste);
    boton.title = noExiste ? 'Este vídeo no llega a ' + valor + 'p (máximo ' + alturas[0] + 'p)' : '';
  });
  if (state.mode === 'video' && alturas.length && Number(state.quality) > alturas[0]) {
    state.quality = 'best';
    const mejor = document.querySelector('[data-quality="best"]');
    if (mejor) paintGroup(mejor.parentElement, 'quality', 'best');
  }
}

/* ── Fase 2: filtros y orden de la cola ─────────────────────────────── */

const FILTROS = [
  { id: 'todo', label: 'Todo', cuenta: () => true },
  { id: 'activas', label: 'En marcha', cuenta: (job) => job.status === 'running' || job.status === 'paused' },
  { id: 'cola', label: 'En cola', cuenta: (job) => job.status === 'queued' },
  { id: 'listas', label: 'Listas', cuenta: (job) => job.status === 'done' },
  { id: 'fallos', label: 'Fallos', cuenta: (job) => job.status === 'error' || job.status === 'cancelled' },
];

function trabajosPorFiltro(jobs) {
  const filtro = FILTROS.find((f) => f.id === state.filtro) || FILTROS[0];
  return jobs.filter((job) => filtro.cuenta(job));
}

/** En marcha primero, luego la cola por orden y al final las terminadas. */
function ordenParaMostrar(jobs) {
  const grupo = (job) => (job.status === 'running' || job.status === 'paused' ? 0 : job.status === 'queued' ? 1 : 2);
  return jobs.slice().sort((a, b) => {
    const ga = grupo(a);
    const gb = grupo(b);
    if (ga !== gb) return ga - gb;
    if (ga < 2) {
      const oa = Number(a.orden || 0);
      const ob = Number(b.orden || 0);
      if (oa !== ob) return oa - ob;
    }
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

/** Chips de filtro con su cuenta. */
function pintarFiltros(jobs) {
  const caja = $('queue-filtros');
  if (!caja) return;
  FILTROS.forEach((filtro) => {
    const boton = caja.querySelector('[data-filtro="' + filtro.id + '"]');
    if (!boton) return;
    const total = jobs.filter((job) => filtro.cuenta(job)).length;
    boton.innerHTML = filtro.label + ' <b>' + total + '</b>';
    const activo = state.filtro === filtro.id;
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
  });
}

/* ── Enviar descargas ───────────────────────────────────────────────── */

async function addDownloads() {
  if (state.busy) return;
  showFormError('');

  const raw = $('url').value;
  const urls = raw.split(/\r?\n/).map((line) => normalizarUrl(line)).filter((line) => line !== '');

  if (!urls.length) {
    showFormError('Pega al menos un enlace.');
    $('url').focus();
    return;
  }
  const bad = urls.find((url) => !/^https?:\/\/\S+$/i.test(url));
  if (bad) {
    showFormError('Esto no parece un enlace: ' + bad);
    return;
  }
  if (urls.length > 20) {
    showFormError('Como mucho 20 enlaces de una vez.');
    return;
  }

  setBusy(true, urls.length > 1 ? 'ENVIANDO ' + urls.length + '...' : 'ENVIANDO...');
  showOverlay(urls.length > 1 ? 'Enviando ' + urls.length + ' enlaces a la cola...' : 'Enviando a la cola...');

  let sent = 0;
  const failures = [];
  try {
    for (const url of urls) {
      const result = await postJson(API + '?action=add', {
        url,
        mode: state.mode,
        quality: state.mode === 'audio' ? 'best' : state.quality,
        format: state.format,
        playlist: state.playlist,
        subir_web: state.subirWeb,
        en_casa: state.enCasa === true,
        fuente: state.fuente,
        // Fase 4: tope de velocidad; Fase 1: titulo ya conocido.
        limit_rate: state.limite || '',
        title: tituloConocido(url),
      });
      if (result.ok) sent++;
      else if (result.status === 401) { authLost = true; break; }
      else failures.push(result.data.error || ('No se pudo encolar ' + url));
    }
  } catch (e) {
    failures.push('No hay conexión con el servidor.');
  } finally {
    hideOverlay();
    setBusy(false);
  }

  if (authLost) { showLogin(); return; }

  if (sent > 0) {
    $('url').value = '';
    state.probe = null;
    pararSonda();
    pintarProbe();
    await refreshQueue();
    // Si el PC esta apagado/desconectado, que se sepa ya: antes se quedaba
    // "En cola" sin explicacion y parecia que la app se habia roto.
    if (pcDesconectado()) {
      mostrarAviso('Enlaces añadidos. El PC está desconectado: se bajarán solos en cuanto vuelva.');
    }
  }
  if (failures.length) {
    showFormError(failures.slice(0, 3).join(' · '));
  }
}

/** Titulo que ya sabemos del enlace (si la previsualizacion acerto). */
function tituloConocido(url) {
  if (!state.probe || state.probe.estado !== 'listo' || !state.probe.info) return '';
  return normalizarUrl(state.probe.url) === normalizarUrl(url) ? String(state.probe.info.title || '') : '';
}

/** Pide permiso para avisar al terminar (boton «Avisarme al terminar»). */
async function activarAvisos() {
  if (typeof Notification === 'undefined') {
    mostrarAviso('Este navegador no puede avisar al terminar.', 'error');
    return;
  }
  try {
    const permiso = await Notification.requestPermission();
    mostrarAviso(
      permiso === 'granted' ? 'Te avisaré cuando termine una descarga.' : 'No se han activado los avisos.',
      permiso === 'granted' ? 'ok' : 'info',
    );
  } catch (e) {
    mostrarAviso('No se han podido activar los avisos.', 'error');
  }
  renderQueue();
}

/* ── Historial (panel canónico) ─────────────────────────────────────── */

/* ── Carpeta de descarga en el PC ───────────────────────────────────── */

/**
 * Un solo boton: pide al worker que abra el explorador de Windows en el PC.
 * El navegador no puede dar una ruta real del disco, asi que el dialogo lo abre
 * el worker; aqui solo se pide y se espera la respuesta.
 */
async function elegirCarpetaEnPc() {
  const boton = $('dir-btn');
  const texto = $('dir-btn-text');
  if (!boton) return;
  boton.disabled = true;
  if (texto) texto.textContent = 'PIDIENDO AL PC…';
  try {
    const resultado = await postJson(API + '?action=elegir_carpeta', {});
    if (!resultado.ok) {
      showFormError(resultado.data.error || 'No se pudo pedir el cambio de carpeta.');
      boton.disabled = false;
      if (texto) texto.textContent = 'ELEGIR OTRA CARPETA';
      return;
    }
    const hint = $('dir-hint');
    if (hint) {
      hint.className = 'hint';
      hint.textContent = 'Se ha abierto el explorador en tu PC. Elige la carpeta y acepta.';
    }
    await refreshQueue();
  } catch (e) {
    showFormError('No hay conexión con el servidor.');
    boton.disabled = false;
    if (texto) texto.textContent = 'ELEGIR OTRA CARPETA';
  }
}

function renderDir(dir) {
  if (!dir) return;
  const actual = $('dir-actual');
  const hint = $('dir-hint');
  const boton = $('dir-btn');
  const texto = $('dir-btn-text');

  if (actual) {
    actual.textContent = dir.actual || 'sin datos todavía (¿está encendido el PC?)';
  }

  const esperando = dir.dialogo === true;
  if (boton) boton.disabled = esperando;
  if (texto) texto.textContent = esperando ? 'ESPERANDO EN EL PC…' : 'ELEGIR OTRA CARPETA';

  if (hint) {
    if (esperando) {
      hint.className = 'hint';
      hint.textContent = 'Se ha abierto el explorador en tu PC. Elige la carpeta y acepta.';
    } else if (dir.error) {
      hint.className = 'hint dir-mal';
      hint.textContent = dir.error;
    } else {
      hint.className = 'hint';
      hint.textContent = '';   // sin texto de ayuda fijo (lo quito Antonio)
    }
  }
}
/* ── Selectores ─────────────────────────────────────────────────────── */

function paintGroup(group, attribute, value) {
  group.querySelectorAll('.model-toggle').forEach((button) => {
    const active = button.dataset[attribute] === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

/**
 * Aviso bajo los selectores. Lo importante: a 1440p/2160p YouTube no da h264, asi
 * que el worker convierte el video con ffmpeg (tarda mas) para que sea un MP4 que
 * abran Corel y Filmora.
 */
function actualizarAvisoConversion() {
  const hint = $('format-hint');
  if (!hint) return;
  if (state.mode === 'audio') {
    hint.textContent = 'El audio se extrae del vídeo y se convierte con ffmpeg. MP3 es lo más compatible; M4A conserva mejor la calidad original.';
    return;
  }
  const calidadAlta = state.quality !== 'best' && Number(state.quality) > 1080;
  if (state.format === 'mp4' && calidadAlta) {
    hint.textContent = 'A ' + state.quality + 'p YouTube solo ofrece VP9/AV1: al terminar se convierte a H.264 para que Corel y Filmora lo abran bien (tarda un poco más).';
  } else if (state.format === 'mp4') {
    hint.textContent = 'MP4 (H.264 + AAC): lo que mejor abren Corel y Filmora.';
  } else {
    hint.textContent = String(state.format).toUpperCase() + ' guarda el formato original de YouTube (VP9/AV1): más pequeño, pero peor de abrir en editores.';
  }
}

/* ── De dónde se descarga: YouTube (por defecto), Instagram o TikTok ──── */

const FUENTES = {
  youtube: {
    nombre: 'YouTube',
    etiqueta: 'Enlace de YouTube (uno por línea si quieres varios)',
    placeholder: 'https://www.youtube.com/watch?v=...',
    ayuda: 'Pega el enlace del vídeo o búscalo aquí arriba con el buscador.',
    sitio: 'https://www.youtube.com',
    boton: 'Ir a YouTube ↗',
    buscar: true,
    calidad: true,
  },
  instagram: {
    nombre: 'Instagram',
    etiqueta: 'Enlace de Instagram (uno por línea si quieres varios)',
    placeholder: 'https://www.instagram.com/reel/...',
    ayuda: 'Pega el enlace del reel o del post. Los vídeos públicos se bajan directamente; los de cuentas privadas (o que exigen seguir la cuenta) necesitan sesión: el aviso te dice cómo.',
    sitio: 'https://www.instagram.com',
    boton: 'Ir a Instagram ↗',
    buscar: false,
    calidad: false,
  },
  tiktok: {
    nombre: 'TikTok',
    etiqueta: 'Enlace de TikTok (uno por línea si quieres varios)',
    placeholder: 'https://www.tiktok.com/@usuario/video/...',
    ayuda: 'Pega el enlace del vídeo (tiktok.com/@usuario/video/… o vm.tiktok.com/…). Se baja el archivo tal cual.',
    sitio: 'https://www.tiktok.com',
    boton: 'Ir a TikTok ↗',
    buscar: false,
    calidad: false,
  },
};

function actualizarVisibilidadCalidad() {
  const col = $('quality-col');
  if (!col) return;
  const fuente = FUENTES[state.fuente] || FUENTES.youtube;
  col.hidden = state.mode === 'audio' || !fuente.calidad;
}

function aplicarFuente(fuente) {
  if (!FUENTES[fuente]) fuente = 'youtube';
  state.fuente = fuente;
  const datos = FUENTES[fuente];

  const grupo = document.querySelector('[data-fuente]');
  if (grupo) paintGroup(grupo.parentElement, 'fuente', fuente);

  if ($('url-label')) $('url-label').textContent = datos.etiqueta;
  if ($('url')) $('url').placeholder = datos.placeholder;
  const enlace = $('fuente-ir');
  if (enlace) { enlace.href = datos.sitio; enlace.textContent = datos.boton; }
  actualizarVisibilidadCalidad();
}
function applyMode(mode) {
  state.mode = mode;
  const config = MODES[mode];

  paintGroup(document.querySelector('[data-mode="' + mode + '"]').parentElement, 'mode', mode);

  const qualityCol = $('quality-col');
  actualizarVisibilidadCalidad();
  if (mode === 'audio') {
    state.quality = 'best';
  } else {
    paintGroup(document.querySelector('[data-quality="' + state.quality + '"]').parentElement, 'quality', state.quality);
  }

  const formatGroup = $('format-group');
  formatGroup.innerHTML = config.formats.map(([id, label], index) =>
    `<button type="button" class="model-toggle${index === 0 ? ' active' : ''}" data-format="${id}" aria-pressed="${index === 0 ? 'true' : 'false'}">${label}</button>`
  ).join('');
  state.format = config.formats[0][0];

  actualizarAvisoConversion();
}

function bindSelectors() {
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => applyMode(button.dataset.mode));
  });

  document.querySelector('[data-quality]').parentElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quality]');
    if (!button) return;
    state.quality = button.dataset.quality;
    paintGroup(button.parentElement, 'quality', state.quality);
    actualizarAvisoConversion();
  });

  $('format-group').addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button) return;
    state.format = button.dataset.format;
    paintGroup(button.parentElement, 'format', state.format);
    actualizarAvisoConversion();
  });
}

/* ── Init ───────────────────────────────────────────────────────────── */

function bindUI() {
  $('auth-form').addEventListener('submit', doLogin);
  $('add-btn').addEventListener('click', addDownloads);
  $('url-limpiar').addEventListener('click', () => {
    $('url').value = '';
    $('url').focus();
    state.probe = null;
    pararSonda();
    pintarProbe();
    showFormError('');
  });
  $('queue-list').addEventListener('click', onQueueClick);
  document.querySelectorAll('[data-fuente]').forEach((boton) => {
    boton.addEventListener('click', () => aplicarFuente(boton.dataset.fuente));
  });
 document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !authLost && !$('app-main').hidden) refreshQueue();
  });
  bindSelectors();
  bindFecha();
  bindNovedades();
  applyMode('audio');
  aplicarCalidadesDisponibles();
}

/** Enlaces entre los controles nuevos: sonda, filtros, pausa, límite y atajos. */
function bindNovedades() {
  // Fase 1: mirar el enlace en cuanto se pega o se escribe (con un respiro).
  const campo = $('url');
  if (campo) {
    campo.addEventListener('input', () => {
      clearTimeout(window.__probeDebounce);
      window.__probeDebounce = setTimeout(programarSonda, 650);
    });
  }

  // Fase 2: filtros de estado (con sus contadores).
  const filtros = $('queue-filtros');
  if (filtros) {
    filtros.addEventListener('click', (event) => {
      const boton = event.target.closest('[data-filtro]');
      if (!boton) return;
      state.filtro = boton.dataset.filtro;
      renderQueue();
    });
  }

  const pausar = $('queue-pausar');
  if (pausar) {
    pausar.addEventListener('click', async () => {
      pausar.disabled = true;
      try {
        const accion = state.pausada ? 'resume_all' : 'pause_all';
        const r = await postJson(API + '?action=' + accion, {});
        if (!r.ok) showFormError((r.data && r.data.error) || 'No se pudo cambiar la pausa.');
        await refreshQueue();
      } catch (e) {
        showFormError('No hay conexión con el servidor.');
      } finally {
        pausar.disabled = false;
      }
    });
  }

  const limpiar = $('queue-limpiar');
  if (limpiar) {
    limpiar.addEventListener('click', async () => {
      const n = (Array.isArray(state.jobs) ? state.jobs : [])
        .filter((j) => j.status === 'done' || j.status === 'error' || j.status === 'cancelled').length;
      if (!n) return;
      if (!confirm('¿Quitar de la lista las ' + n + ' descargas terminadas? Se borrarán sus copias del servidor (los ficheros del PC no se tocan).')) return;
      limpiar.disabled = true;
      try {
        const r = await postJson(API + '?action=clear_finished', {});
        if (!r.ok) showFormError((r.data && r.data.error) || 'No se pudo limpiar.');
        else mostrarAviso('Lista limpia: ' + n + ' descarga(s) fuera.', 'ok');
        await refreshQueue();
      } catch (e) {
        showFormError('No hay conexión con el servidor.');
      } finally {
        limpiar.disabled = false;
      }
    });
  }

  const notif = $('queue-notif');
  if (notif) notif.addEventListener('click', activarAvisos);

  // Fase 4: límite de velocidad recordado entre visitas.
  const limite = $('limite');
  if (limite) {
    state.limite = leerLimite();
    limite.value = state.limite;
    limite.addEventListener('change', () => {
      state.limite = limite.value;
      try { localStorage.setItem('descargas-limite', state.limite); } catch (e) { /* sin almacen */ }
    });
  }

  // Fase 4: atajos. Ctrl+Enter descarga lo pegado; Esc limpia el campo.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if ($('app-main') && !$('app-main').hidden) addDownloads();
      return;
    }
    if (event.key === 'Escape' && campo && !$('app-main').hidden) {
      if (document.activeElement === campo || campo.value) {
        campo.value = '';
        state.probe = null;
        pararSonda();
        pintarProbe();
      }
    }
  });

  // Fase 4: pegar un enlace en cualquier parte de la página lo lleva al campo.
  document.addEventListener('paste', (event) => {
    const main = $('app-main');
    if (!main || main.hidden) return;
    const destino = event.target;
    if (destino && (destino.tagName === 'INPUT' || destino.tagName === 'TEXTAREA' || destino.isContentEditable)) return;
    const texto = event.clipboardData ? event.clipboardData.getData('text') : '';
    if (!texto || !/https?:\/\//i.test(texto) || !campo) return;
    event.preventDefault();
    campo.value = texto.trim();
    campo.focus();
    programarSonda();
  });
}

function leerLimite() {
  let valor = '';
  try { valor = localStorage.getItem('descargas-limite') || ''; } catch (e) { valor = ''; }
  return ['', '1', '2', '3', '5', '10'].includes(valor) ? valor : '';
}

window.addEventListener('resize', () => {
  clearTimeout(window.__colaTimer);
  window.__colaTimer = setTimeout(ajustarAltoCola, 200);
});

document.addEventListener('DOMContentLoaded', async () => {
  leerCompartido();
  registrarServiceWorker();
  bindUI();
  const authed = await checkAuth();
  if (authed) await enterApp();
  else showLogin();
});
