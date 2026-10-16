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

function pintarDondeEstoy() {
  const capa = document.getElementById('donde-estoy');
  if (!capa) return;
  if (state.enCasa) {
    capa.textContent = 'Estás en el PC: los ficheros se quedan en tu carpeta';
    capa.className = 'donde-estoy en-casa';
  } else {
    capa.textContent = 'Desde fuera: los ficheros se suben a la web (48 h)';
    capa.className = 'donde-estoy fuera';
  }
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
  state.enCasa = (await detectarPcLocal()) || state.enCasaIp;
  pintarDondeEstoy();
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

    if (data.deteccion) { state.enCasaIp = data.deteccion.coinciden === true; }
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
    const percent = Math.max(0, Math.min(100, Number(job.percent) || 0));
    const indeterminate = status === 'running' && percent <= 0;
    const title = job.title || job.url || 'Descarga';
    const meta = [];
    if (job.mode === 'audio') meta.push('Audio ' + String(job.format || '').toUpperCase());
    else {
      meta.push(String(job.format || 'mp4').toUpperCase());
      if (job.quality && job.quality !== 'best') meta.push(job.quality + 'p');
    }
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
        return `<span class="file-chip local" title="${esc(file.ruta_local || '')}">
          <span>${esc(file.title || file.filename)}</span>
          <em>${humanBytes(file.bytes)}</em>
          <b>EN TU PC</b>
        </span>`;
      }
      return `<a class="file-chip" href="${API}?action=download&amp;item=${encodeURIComponent(file.id)}" download>
        <span>${esc(file.title || file.filename)}</span>
        <em>${humanBytes(file.bytes)}</em>
      </a>`;
    }).join('');

    const actions = [];
    if (status === 'queued' || status === 'running') {
      actions.push(`<button type="button" class="btn-sm" data-act="cancel" data-id="${esc(job.id)}">Cancelar</button>`);
    } else {
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

async function onQueueClick(event) {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const id = button.getAttribute('data-id');
  const act = button.getAttribute('data-act');
  button.disabled = true;

  try {
    if (act === 'cancel') {
      const result = await postJson(API + '?action=cancel', { job_id: id });
      if (!result.ok) showFormError(result.data.error || 'No se pudo cancelar.');
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

let unidadesPintadas = '';

function renderDir(dir) {
  if (!dir) return;
  const actual = $('dir-actual');
  const select = $('dir-unidad');
  const hint = $('dir-hint');

  if (actual) {
    actual.textContent = dir.actual || 'sin datos todavía (¿está encendido el PC?)';
  }

  const unidades = Array.isArray(dir.unidades) ? dir.unidades : [];
  const firma = unidades.join(',');
  if (select && firma !== unidadesPintadas) {
    const previo = select.value;
    select.innerHTML = '<option value="">Unidad…</option>' +
      unidades.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('');
    select.value = previo;
    unidadesPintadas = firma;
  }

  if (hint) {
    if (dir.pendiente) {
      hint.className = 'hint';
      hint.textContent = 'Pidiendo al PC cambiar a ' + dir.pendiente + '…';
    } else if (dir.error) {
      hint.className = 'hint dir-mal';
      hint.textContent = 'No se pudo cambiar la carpeta: ' + dir.error;
    } else {
      hint.className = 'hint';
      hint.textContent = 'Elige una unidad para bajar directo a un USB. El PC crea la carpeta si no existe.';
    }
  }
}

async function cambiarCarpeta() {
  const ruta = ($('dir-ruta').value || '').trim();
  if (!ruta) {
    showFormError('Escribe la carpeta de destino, por ejemplo D:\\Vídeos o F:\\');
    return;
  }
  const boton = $('dir-btn');
  boton.disabled = true;
  try {
    const resultado = await postJson(API + '?action=set_dir', { ruta });
    if (!resultado.ok) {
      showFormError(resultado.data.error || 'No se pudo pedir el cambio de carpeta.');
    } else {
      showFormError('');
      $('dir-ruta').value = '';
      await refreshQueue();
    }
  } catch (e) {
    showFormError('No hay conexión con el servidor.');
  } finally {
    boton.disabled = false;
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

function applyMode(mode) {
  state.mode = mode;
  const config = MODES[mode];

  paintGroup(document.querySelector('[data-mode="' + mode + '"]').parentElement, 'mode', mode);

  const qualityCol = $('quality-col');
  qualityCol.hidden = mode === 'audio';
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

  $('format-hint').textContent = mode === 'audio'
    ? 'El audio se extrae del vídeo y se convierte con ffmpeg. MP3 es lo más compatible; M4A conserva mejor la calidad original.'
    : 'MP4 (h264 + AAC) es lo que mejor abren Corel y Filmora. Si pides 1440p o 2160p, YouTube solo los ofrece en VP9/AV1 y el fichero dejará de ser MP4.';
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
  });

  $('format-group').addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button) return;
    state.format = button.dataset.format;
    paintGroup(button.parentElement, 'format', state.format);
  });
}

/* ── Init ───────────────────────────────────────────────────────────── */

function bindUI() {
  $('auth-form').addEventListener('submit', doLogin);
  $('add-btn').addEventListener('click', addDownloads);
  $('queue-list').addEventListener('click', onQueueClick);
  $('history-grid').addEventListener('click', onHistoryClick);
  $('logout-btn').addEventListener('click', doLogout);
  $('playlist').addEventListener('change', (event) => { state.playlist = event.target.checked; });
  $('subir-web').addEventListener('change', (event) => { state.subirWeb = event.target.checked; });
  $('dir-btn').addEventListener('click', cambiarCarpeta);
  $('dir-unidad').addEventListener('change', (event) => {
    const unidad = event.target.value;
    if (unidad) {
      $('dir-ruta').value = unidad.replace(/\\+$/, '') + '\\Descargas';
    }
  });
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
  bindUI();
  const authed = await checkAuth();
  if (authed) await enterApp();
  else showLogin();
});
