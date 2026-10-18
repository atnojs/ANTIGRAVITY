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
};

let history = null;
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

function pintarDondeEstoy() {
  const capa = document.getElementById('donde-estoy');
  if (!capa) return;
  const d = state.deteccion;
  const manual = leerModoManual();
  capa.title = (d ? 'worker=' + d.worker + ' cliente=' + d.cliente + ' coinciden=' + d.coinciden : '')
    + ' sonda=' + state.enCasaSonda
    + ' manual=' + (manual === null ? 'auto' : manual)
    + '  ·  pulsa para cambiarlo';

  if (state.enCasa) {
    capa.textContent = (manual === true ? 'En casa (fijado)' : 'Estás en el PC')
      + ': se queda en tu carpeta';
    capa.className = 'donde-estoy en-casa';
  } else {
    capa.textContent = (manual === false ? 'Fuera (fijado)' : 'Desde fuera')
      + ': se suben a la web (48 h)';
    capa.className = 'donde-estoy fuera';
  }
}

/** Un toque: cambia entre "en casa" y "fuera" y lo recuerda en este dispositivo. */
function alternarDondeEstoy() {
  const actual = decidirEnCasa();
  guardarModoManual(!actual);
  state.enCasa = !actual;
  pintarDondeEstoy();
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

  if (window.HistoryManager) {
    history = new HistoryManager('descargas');
    history.onChange(() => renderHistory());
    try {
      await history.load();
    } catch (e) {
      console.warn('No se pudo cargar el historial:', e);
    }
    renderHistory();
  }

  await refreshQueue();
  await refreshHealth();
  state.enCasaSonda = await detectarPcLocal();
  state.enCasa = decidirEnCasa();
  pintarDondeEstoy();
  procesarCompartido();
  aplicarFuente(state.fuente || 'youtube');
  cargarWhatsapp();
  if (listTimer) clearInterval(listTimer);
  if (healthTimer) clearInterval(healthTimer);
  listTimer = setInterval(refreshQueue, 4000);
  healthTimer = setInterval(refreshHealth, 15000);
}

/* ── Estado del PC y el disco ───────────────────────────────────────── */

async function refreshHealth() {
  try {
    const response = await fetch(API + '?action=health', { cache: 'no-store' });
    const data = await response.json();
    if (!data || !data.success) return;

    const dot = $('worker-dot');
    const text = $('worker-text');
    const seconds = data.worker && typeof data.worker.seconds_ago === 'number' ? data.worker.seconds_ago : null;

    if (seconds === null) {
      dot.className = 'dot off';
      text.textContent = 'PC desconectado: arranca el worker para que baje algo';
    } else if (seconds < 90) {
      dot.className = 'dot on';
      text.textContent = 'PC conectado' + (data.worker.ytdlp ? ' · yt-dlp ' + data.worker.ytdlp : '');
    } else {
      dot.className = 'dot off';
      text.textContent = 'PC sin señales desde hace ' + Math.round(seconds / 60) + ' min';
    }

    if (data.deteccion) { state.enCasaIp = data.deteccion.coinciden === true; state.deteccion = data.deteccion; }
    const free = data.disk && data.disk.free_human ? data.disk.free_human : '';
    const pending = data.counts ? (data.counts.queued || 0) + (data.counts.running || 0) : 0;
    $('disk-text').textContent = (free ? 'Servidor: ' + free + ' libres' : '') +
      (pending ? ' · ' + pending + ' en curso' : '');
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
    state.jobs = result.data.jobs || [];
    renderQueue();
    renderDir(result.data.dir);
    if (result.data.disk_free) {
      const current = $('disk-text').textContent || '';
      if (!/libres/.test(current)) $('disk-text').textContent = 'Servidor: ' + result.data.disk_free + ' libres';
    }
  } catch (e) {
    console.warn('No se pudo leer la cola:', e);
  }
}

function renderQueue() {
  const list = $('queue-list');
  const jobs = state.jobs;
  $('queue-count').textContent = String(jobs.length);

  if (!jobs.length) {
    list.innerHTML = '<p class="empty">Todavía no has pedido ninguna descarga.</p>';
    list.setAttribute('aria-busy', 'false');
    return;
  }

  const anyRunning = jobs.some((job) => job.status === 'running' || job.status === 'queued');
  list.setAttribute('aria-busy', anyRunning ? 'true' : 'false');

  list.innerHTML = jobs.map((job) => {
    const status = String(job.status || 'queued');
    const labels = { queued: 'En cola', running: 'Descargando', done: 'Listo', error: 'Error', cancelled: 'Cancelado' };
    if (status === 'queued' && job.retry_at) { labels.queued = 'Reintentando'; }
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
    meta.push(fmtDate(job.created_at));

    const size = (job.files || []).reduce((sum, file) => sum + (Number(file.bytes) || 0), 0);

    const files = (job.files || []).map((file) => {
      // Un fichero que se ha quedado en el PC no se puede descargar desde la
      // web: se muestra como etiqueta con su ruta, no como enlace.
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
      return `<a class="file-chip" href="${API}?action=download&amp;item=${encodeURIComponent(file.id)}" download>
        <span>${esc(file.title || file.filename)}</span>
        <em>${humanBytes(file.bytes)}</em>
      </a>`;
    }).join('');

    // Reintento automatico: mientras dura la espera se dice cuanto falta.
    if (job.retry_at && status === 'queued') {
      const faltan = Math.round((new Date(job.retry_at).getTime() - Date.now()) / 1000);
      if (faltan > 0) meta.push(`reintento automatico en ${faltan} s`);
      else meta.push('reintentando…');
    }

    const actions = [];
    if (status === 'queued' || status === 'running') {
      actions.push(`<button type="button" class="btn-sm" data-act="cancel" data-id="${esc(job.id)}">Cancelar</button>`);
    } else {
      if (status === 'error' || status === 'cancelled') {
        actions.push(`<button type="button" class="btn-sm" data-act="retry" data-id="${esc(job.id)}">Reintentar</button>`);
      }
      actions.push(`<button type="button" class="btn-sm danger" data-act="delete" data-id="${esc(job.id)}">Borrar</button>`);
    }

    return `
      <article class="job">
        <div class="job-head">
          <h3 class="job-title">${esc(title)}</h3>
          <span class="state ${esc(status)}">${labels[status] || esc(status)}</span>
          ${size > 0 ? `<span class="job-meta">${humanBytes(size)}</span>` : ''}
        </div>
        ${status === 'running' || status === 'queued' ? `
          <div class="bar ${indeterminate ? 'indeterminate' : ''}">
            <i style="transform:scaleX(${((indeterminate ? 40 : percent) / 100).toFixed(4)})"></i>
          </div>` : ''}
        <p class="job-meta">${esc(meta.join(' · '))}</p>
        ${job.error ? `<p class="job-error">${esc(job.error)}</p>` : ''}
        ${files ? `<div class="files">${files}</div>` : ''}
        <div class="job-actions" style="margin-top:10px;">${actions.join('')}</div>
      </article>`;
  }).join('');
}

/* ── Buscar en YouTube ──────────────────────────────────────────────── */

function pintarResultados(resultados, error) {
  const caja = $('yt-results');
  if (!caja) return;
  if (error) {
    caja.hidden = false;
    caja.innerHTML = '<p class="yt-vacio">' + esc(error) + '</p>';
    return;
  }
  if (!resultados || !resultados.length) {
    caja.hidden = false;
    caja.innerHTML = '<p class="yt-vacio">Sin resultados.</p>';
    return;
  }
  caja.hidden = false;
  caja.innerHTML = resultados.map((r) => {
    const total = Number(r.duration) || 0;
    const duracion = total > 0 ? Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0') : '';
    const miniatura = r.thumbnail
      ? '<img src="' + esc(r.thumbnail) + '" alt="" loading="lazy" width="96" height="54">'
      : '<span class="yt-thumb"></span>';
    const meta = [esc(r.channel || ''), duracion].filter(Boolean).join(' · ');
    return '<article class="yt-card">' + miniatura +
      '<div class="yt-info">' +
        '<span class="yt-title">' + esc(r.title || '') + '</span>' +
        '<span class="yt-meta">' + meta + '</span>' +
        '<button type="button" class="btn-sm" data-act="bajar" data-url="' + esc(r.url || '') + '">DESCARGAR</button>' +
      '</div></article>';
  }).join('');
}

async function buscarEnYoutube() {
  const entrada = $('yt-q');
  const boton = $('yt-search');
  const consulta = (entrada && entrada.value ? entrada.value : '').trim();
  if (!consulta) {
    showFormError('Escribe qué quieres buscar.');
    return;
  }
  showFormError('');
  boton.disabled = true;
  boton.textContent = 'Buscando…';
  const caja = $('yt-results');
  if (caja) {
    caja.hidden = false;
    caja.innerHTML = '<p class="yt-vacio">Buscando en YouTube en tu PC…</p>';
  }
  try {
    const alta = await postJson(API + '?action=search', { q: consulta });
    if (!alta.ok) {
      pintarResultados(null, alta.data.error || 'No se pudo buscar.');
      return;
    }
    const id = alta.data.id;
    // La busqueda la hace el PC: se pregunta hasta que conteste (max ~25 s).
    for (let intento = 0; intento < 25; intento++) {
      await new Promise((r) => setTimeout(r, 1000));
      const estado = await postJson(API + '?action=search_status', { id });
      if (!estado.ok) {
        pintarResultados(null, estado.data.error || 'La búsqueda caducó.');
        return;
      }
      if (estado.data.estado === 'lista') {
        if (estado.data.error) pintarResultados(null, estado.data.error);
        else pintarResultados(estado.data.resultados, '');
        return;
      }
    }
    pintarResultados(null, 'El PC no contestó a la búsqueda. ¿Está encendido el worker?');
  } catch (e) {
    pintarResultados(null, 'No hay conexión con el servidor.');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Buscar';
  }
}

/** De un resultado: lo pone como enlace y pide la descarga con los ajustes actuales. */
function descargarResultado(url) {
  const entrada = $('url');
  if (!entrada || !url) return;
  const actuales = entrada.value.split('\n').map((l) => l.trim()).filter(Boolean);
  if (actuales.indexOf(url) === -1) actuales.push(url);
  entrada.value = actuales.join('\n');
  const caja = $('yt-results');
  if (caja) caja.hidden = true;
  addDownloads();
}
async function onQueueClick(event) {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const act = button.getAttribute('data-act');
  const id = act === 'traer' ? button.getAttribute('data-item') : button.getAttribute('data-id');
  button.disabled = true;

  try {
    if (act === 'retry') {
      const result = await postJson(API + '?action=retry', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo reintentar.');
      await refreshQueue();
    } else if (act === 'cancel') {
      const result = await postJson(API + '?action=cancel', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo cancelar.');
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

/* ── Enviar descargas ───────────────────────────────────────────────── */

async function addDownloads() {
  if (state.busy) return;
  showFormError('');

  const raw = $('url').value;
  const urls = raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');

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
    await refreshQueue();
  }
  if (failures.length) {
    showFormError(failures.slice(0, 3).join(' · '));
  } else if (sent > 0) {
    const strip = $('worker-text');
    if (strip && /desconectado|sin señales/.test(strip.textContent)) {
      showFormError('Enviado, pero el PC está desconectado: no bajará hasta que arranques el worker.');
    }
  }
}

/* ── Historial (panel canónico) ─────────────────────────────────────── */

function renderHistory() {
  const grid = $('history-grid');
  const title = $('history-title');
  const clearBtn = $('history-clear-btn');
  if (!grid || !history) return;

  const items = history.getAll() || [];
  if (!items.length) {
    grid.innerHTML = '<p class="empty">Aquí aparecerá lo que vayas descargando.</p>';
    if (title) title.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (title) title.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'block';

  grid.innerHTML = items.map((item) => {
    const data = item.data || {};
    const url = data.fileUrl || '';
    const name = data.title || data.url || 'Descarga';
    return `<div class="history-item">
      ${url ? `<a href="${esc(url)}" download>${esc(name)}</a>` : `<span>${esc(name)}</span>`}
      <span class="meta">${esc((data.format || '').toUpperCase())}${data.bytes ? ' · ' + humanBytes(data.bytes) : ''} · ${esc(fmtDate(item.createdAt))}</span>
      <button type="button" class="del" data-del="${esc(item.id)}" aria-label="Quitar del historial">✕</button>
    </div>`;
  }).join('');
}

async function onHistoryClick(event) {
  const button = event.target.closest('button[data-del]');
  if (!button || !history) return;
  if (!confirm('¿Quitar esta entrada del historial? El fichero del servidor no se borra.')) return;
  button.disabled = true;
  try {
    await history.delete(button.getAttribute('data-del'));
  } catch (e) {
    console.warn('No se pudo borrar del historial:', e);
  }
  renderHistory();
}

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
      if (texto) texto.textContent = 'ELEGIR CARPETA EN EL PC';
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
    if (texto) texto.textContent = 'ELEGIR CARPETA EN EL PC';
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
  if (texto) texto.textContent = esperando ? 'ESPERANDO EN EL PC…' : 'ELEGIR CARPETA EN EL PC';

  if (hint) {
    if (esperando) {
      hint.className = 'hint';
      hint.textContent = 'Se ha abierto el explorador en tu PC. Elige la carpeta y acepta.';
    } else if (dir.error) {
      hint.className = 'hint dir-mal';
      hint.textContent = dir.error;
    } else {
      hint.className = 'hint';
      hint.textContent = 'Se abre el explorador de Windows en tu PC para que elijas la carpeta (o un USB). Se crea si no existe.';
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
    ayuda: 'Pega el enlace del reel o del post. Instagram casi siempre pide sesión: si falla, el aviso te dice qué hacer.',
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
  if ($('fuente-ayuda')) $('fuente-ayuda').textContent = datos.ayuda;
  const enlace = $('fuente-ir');
  if (enlace) { enlace.href = datos.sitio; enlace.textContent = datos.boton; }

  // El buscador de la app solo funciona con YouTube.
  const caja = $('yt-search-box');
  if (caja) caja.hidden = !datos.buscar;
  if (!datos.buscar) {
    const resultados = $('yt-results');
    if (resultados) { resultados.hidden = true; resultados.innerHTML = ''; }
  }
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
  document.querySelectorAll('[data-fuente]').forEach((boton) => {
    boton.addEventListener('click', () => aplicarFuente(boton.dataset.fuente));
  });
  $('yt-search').addEventListener('click', buscarEnYoutube);
  $('wa-guardar').addEventListener('click', guardarWhatsapp);
  $('wa-probar').addEventListener('click', probarWhatsapp);
  $('yt-q').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); buscarEnYoutube(); }
  });
  $('yt-results').addEventListener('click', (event) => {
    const botonResultado = event.target.closest('button[data-act="bajar"]');
    if (botonResultado) descargarResultado(botonResultado.getAttribute('data-url'));
  });  $('queue-list').addEventListener('click', onQueueClick);
  $('history-grid').addEventListener('click', onHistoryClick);
  $('logout-btn').addEventListener('click', doLogout);
  $('playlist').addEventListener('change', (event) => { state.playlist = event.target.checked; });
  $('subir-web').addEventListener('change', (event) => { state.subirWeb = event.target.checked; });
  $('dir-btn').addEventListener('click', elegirCarpetaEnPc);
  $('donde-estoy').addEventListener('click', alternarDondeEstoy);
  $('url').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) addDownloads();
  });
  $('history-clear-btn').addEventListener('click', async () => {
    if (!history) return;
    if (!confirm('¿Vaciar todo el historial? Los ficheros del servidor no se borran.')) return;
    try { await history.clear(); } catch (e) { console.warn('No se pudo vaciar:', e); }
    renderHistory();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !authLost && !$('app-main').hidden) refreshQueue();
  });
  bindSelectors();
  applyMode('audio');
}

document.addEventListener('DOMContentLoaded', async () => {
  leerCompartido();
  registrarServiceWorker();
  bindUI();
  const authed = await checkAuth();
  if (authed) await enterApp();
  else showLogin();
});
