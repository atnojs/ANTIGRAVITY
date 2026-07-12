/* ============================================================
   BÓVEDA PRIVADA — cripto en cliente (zero-knowledge) + UI
   ------------------------------------------------------------
   Arquitectura de claves:
     DEK  = clave aleatoria AES-256-GCM que cifra TODO (blobs + índice)
     KEK  = clave derivada de una contraseña (PBKDF2-SHA256)
     La DEK se "envuelve" (cifra) con la KEK de la contraseña PRINCIPAL
     y también con la KEK de la contraseña de RESPALDO. Cualquiera de
     las dos contraseñas recupera la DEK -> recuperación garantizada.
     El servidor solo almacena datos cifrados + dekHash (SHA-256 de la
     DEK) para autorizar escrituras. Nunca ve contraseñas ni contenido.
   ============================================================ */
(function () {
  'use strict';

  const API = 'storage.php';
  const PBKDF2_ITERS = 250000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // Estado en memoria (se pierde al cerrar/recargar => hay que loguear de nuevo)
  const state = {
    dek: null,        // CryptoKey AES-GCM
    dekHashHex: '',   // token de autorización server-side
    index: { folders: [], files: [] },
    currentFolder: null, // id de carpeta actual o null (raíz)
    limitBytes: 0,
    idleTimer: null,
  };

  /* ---------- utilidades base64 / hex ---------- */
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function randBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  function uid(prefix) { return prefix + '_' + bufToHex(randBytes(8)); }

  /* ---------- primitivas cripto ---------- */
  async function deriveKEK(password, saltBuf) {
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
    );
  }

  async function wrapDEK(dek, kek) {
    const iv = randBytes(12);
    const rawDek = await crypto.subtle.exportKey('raw', dek);
    const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, rawDek);
    return { iv: bufToB64(iv), wrapped: bufToB64(wrapped) };
  }

  async function unwrapDEK(wrappedB64, ivB64, kek) {
    const raw = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
      kek,
      b64ToBuf(wrappedB64)
    );
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  async function dekHash(dek) {
    const raw = await crypto.subtle.exportKey('raw', dek);
    const h = await crypto.subtle.digest('SHA-256', raw);
    return bufToHex(h);
  }

  async function encryptBytes(dek, dataBuf) {
    const iv = randBytes(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, dataBuf);
    return { iv: bufToB64(iv), data: ct };
  }
  async function decryptBytes(dek, ctBuf, ivB64) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) }, dek, ctBuf);
  }

  async function encryptJSON(dek, obj) {
    const { iv, data } = await encryptBytes(dek, enc.encode(JSON.stringify(obj)));
    return { iv, data: bufToB64(data) };
  }
  async function decryptJSON(dek, encObj) {
    const plain = await decryptBytes(dek, b64ToBuf(encObj.data), encObj.iv);
    return JSON.parse(dec.decode(plain));
  }

  /* ---------- llamadas al servidor ---------- */
  async function apiGetMeta() {
    const r = await fetch(API + '?action=meta', { cache: 'no-store' });
    return r.json();
  }
  async function apiJSON(action, payload) {
    const r = await fetch(API + '?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action }, payload)),
    });
    return r.json();
  }
  async function apiPutBlob(id, ctBuf) {
    const fd = new FormData();
    fd.append('action', 'put_blob');
    fd.append('auth', state.dekHashHex);
    fd.append('id', id);
    fd.append('blob', new Blob([ctBuf], { type: 'application/octet-stream' }), id + '.bin');
    const r = await fetch(API + '?action=put_blob', { method: 'POST', body: fd });
    return r.json();
  }
  async function apiGetBlob(id) {
    const r = await fetch(API + '?action=blob&id=' + encodeURIComponent(id) + '&auth=' + encodeURIComponent(state.dekHashHex), { cache: 'no-store' });
    if (!r.ok) throw new Error('No se pudo descargar (HTTP ' + r.status + ').');
    return r.arrayBuffer();
  }

  // Guarda el índice cifrado + metadatos de la bóveda en el servidor
  async function persistIndex() {
    const meta = state.vaultMeta;
    meta.index = await encryptJSON(state.dek, state.index);
    const res = await apiJSON('save_meta', { auth: state.dekHashHex, meta });
    if (!res.success) throw new Error(res.error || 'No se pudo guardar.');
  }

  /* ---------- helpers UI ---------- */
  const $ = (id) => document.getElementById(id);
  function show(id) { $(id).classList.add('active'); }
  function hide(id) { $(id).classList.remove('active'); }

  function toast(msg, kind) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.className = 'toast'; }, 3600);
  }

  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function iconFor(type, name) {
    const t = (type || '') + ' ' + (name || '').toLowerCase();
    if (/image\//.test(type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return '🖼️';
    if (/video\//.test(type) || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) return '🎬';
    if (/audio\//.test(type) || /\.(mp3|wav|ogg|flac|m4a)$/.test(name)) return '🎵';
    if (/pdf/.test(t)) return '📕';
    if (/(zip|rar|7z|tar|gz)/.test(t)) return '🗜️';
    if (/(word|doc)/.test(t)) return '📘';
    if (/(sheet|excel|xls|csv)/.test(t)) return '📗';
    if (/(text|txt)/.test(t)) return '📄';
    return '📎';
  }

  /* ---------- bloqueo por inactividad (5 min) ---------- */
  function armIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(lock, 5 * 60 * 1000);
  }
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => { if (state.dek) armIdle(); }, { passive: true }));

  function lock() {
    state.dek = null;
    state.dekHashHex = '';
    state.index = { folders: [], files: [] };
    state.currentFolder = null;
    clearTimeout(state.idleTimer);
    $('btnLock').style.display = 'none';
    hide('view-vault');
    show('view-auth');
    renderAuth();
    toast('Bóveda bloqueada.', 'ok');
  }

  /* ============================================================
     FLUJO DE AUTENTICACIÓN
     ============================================================ */
  let vaultExists = false;

  async function renderAuth() {
    const meta = await apiGetMeta();
    state.limitBytes = (meta.limits && meta.limits.effective) || 0;
    vaultExists = !!meta.exists;
    if (vaultExists) state.vaultMeta = meta.meta;

    $('authArea').innerHTML = vaultExists ? loginHTML() : setupHTML();
    wireAuth();
  }

  function limitLabel() {
    return state.limitBytes ? fmtSize(state.limitBytes) : 'el máximo del servidor';
  }

  function setupHTML() {
    return `
      <div class="auth-card">
        <div class="lock-icon">🔐</div>
        <h2>Crear tu bóveda</h2>
        <p class="sub">Elige una contraseña maestra y una de respaldo. Cifrarán todos tus archivos.</p>
        <div class="field">
          <label>Contraseña principal</label>
          <input type="password" id="pwMain" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
        </div>
        <div class="field">
          <label>Repite la principal</label>
          <input type="password" id="pwMain2" autocomplete="new-password" placeholder="Vuelve a escribirla">
        </div>
        <div class="field">
          <label>Contraseña de respaldo</label>
          <input type="password" id="pwBackup" autocomplete="new-password" placeholder="Distinta a la principal">
        </div>
        <button class="btn primary" id="btnSetup">Crear bóveda</button>
        <div class="auth-msg" id="authMsg"></div>
        <div class="auth-note">
          🛈 <b>Importante:</b> no hay forma de recuperar el contenido si olvidas <b>las dos</b> contraseñas.
          Guárdalas en un lugar seguro. La de respaldo sirve por si olvidas la principal.
        </div>
      </div>`;
  }

  function loginHTML() {
    return `
      <div class="auth-card">
        <div class="lock-icon">🔒</div>
        <h2>Bóveda protegida</h2>
        <p class="sub">Introduce tu contraseña para desbloquear.</p>
        <div class="field">
          <label>Contraseña (principal o de respaldo)</label>
          <input type="password" id="pwLogin" autocomplete="current-password" placeholder="Tu contraseña">
        </div>
        <button class="btn primary" id="btnLogin">Desbloquear</button>
        <div class="auth-msg" id="authMsg"></div>
        <div class="auth-note">
          🛈 Sirve tanto la contraseña principal como la de respaldo.
        </div>
      </div>`;
  }

  function authMsg(text, kind) {
    const m = $('authMsg');
    if (!m) return;
    m.textContent = text;
    m.className = 'auth-msg show ' + (kind || 'err');
  }

  function wireAuth() {
    if (vaultExists) {
      const inp = $('pwLogin');
      $('btnLogin').addEventListener('click', doLogin);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      inp.focus();
    } else {
      $('btnSetup').addEventListener('click', doSetup);
      $('pwBackup').addEventListener('keydown', e => { if (e.key === 'Enter') doSetup(); });
      $('pwMain').focus();
    }
  }

  async function doSetup() {
    const p1 = $('pwMain').value, p2 = $('pwMain2').value, pb = $('pwBackup').value;
    if (p1.length < 8) return authMsg('La contraseña principal debe tener al menos 8 caracteres.');
    if (p1 !== p2) return authMsg('La contraseña principal y su repetición no coinciden.');
    if (pb.length < 8) return authMsg('La contraseña de respaldo debe tener al menos 8 caracteres.');
    if (pb === p1) return authMsg('La contraseña de respaldo debe ser distinta a la principal.');

    const btn = $('btnSetup');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creando...';
    try {
      // 1. Generar DEK aleatoria
      const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      // 2. Derivar KEK de cada contraseña con salt propio y envolver la DEK
      const saltMain = randBytes(16), saltBackup = randBytes(16);
      const kekMain = await deriveKEK(p1, saltMain);
      const kekBackup = await deriveKEK(pb, saltBackup);
      const wMain = await wrapDEK(dek, kekMain);
      const wBackup = await wrapDEK(dek, kekBackup);
      const hashHex = await dekHash(dek);

      state.dek = dek;
      state.dekHashHex = hashHex;
      state.index = { folders: [], files: [] };

      const meta = {
        version: 1,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERS },
        main: { salt: bufToB64(saltMain), iv: wMain.iv, wrapped: wMain.wrapped },
        backup: { salt: bufToB64(saltBackup), iv: wBackup.iv, wrapped: wBackup.wrapped },
        dekHash: hashHex,
        index: await encryptJSON(dek, state.index),
      };
      state.vaultMeta = meta;

      const res = await apiJSON('setup', { meta });
      if (!res.success) throw new Error(res.error || 'No se pudo crear la bóveda.');
      enterVault();
    } catch (e) {
      authMsg('Error al crear la bóveda: ' + e.message);
      btn.disabled = false; btn.textContent = 'Crear bóveda';
    }
  }

  async function doLogin() {
    const pw = $('pwLogin').value;
    if (!pw) return authMsg('Escribe tu contraseña.');
    const btn = $('btnLogin');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Comprobando...';
    const meta = state.vaultMeta;

    async function tryOne(slot) {
      try {
        const kek = await deriveKEK(pw, new Uint8Array(b64ToBuf(slot.salt)));
        return await unwrapDEK(slot.wrapped, slot.iv, kek);
      } catch (e) { return null; }
    }

    try {
      let dek = await tryOne(meta.main);
      if (!dek) dek = await tryOne(meta.backup);
      if (!dek) { authMsg('Contraseña incorrecta.'); btn.disabled = false; btn.textContent = 'Desbloquear'; return; }

      state.dek = dek;
      state.dekHashHex = await dekHash(dek);
      state.index = meta.index ? await decryptJSON(dek, meta.index) : { folders: [], files: [] };
      if (!state.index.folders) state.index.folders = [];
      if (!state.index.files) state.index.files = [];
      enterVault();
    } catch (e) {
      authMsg('No se pudo desbloquear: ' + e.message);
      btn.disabled = false; btn.textContent = 'Desbloquear';
    }
  }

  /* ============================================================
     VISTA DE LA BÓVEDA
     ============================================================ */
  function enterVault() {
    hide('view-auth');
    show('view-vault');
    $('btnLock').style.display = '';
    state.currentFolder = null;
    armIdle();
    renderVault();
  }

  function currentFiles() {
    return state.index.files.filter(f => (f.folderId || null) === state.currentFolder);
  }

  function renderVault() {
    // Breadcrumb
    const bc = $('breadcrumb');
    if (state.currentFolder) {
      const folder = state.index.folders.find(f => f.id === state.currentFolder);
      bc.innerHTML = `<span class="crumb" data-root="1">🏠 Inicio</span>
        <span class="sep-arrow">›</span>
        <span class="current">📁 ${escapeHtml(folder ? folder.name : '¿?')}</span>`;
      bc.querySelector('[data-root]').addEventListener('click', () => { state.currentFolder = null; renderVault(); });
    } else {
      bc.innerHTML = `<span class="current">🏠 Inicio</span>`;
    }

    // Stats
    const totalFiles = state.index.files.length;
    const totalSize = state.index.files.reduce((a, f) => a + (f.size || 0), 0);
    $('statFolders').textContent = state.index.folders.length;
    $('statFiles').textContent = totalFiles;
    $('statSize').textContent = fmtSize(totalSize);

    // Botón "nueva carpeta" solo en raíz (un nivel de carpetas)
    $('btnNewFolder').style.display = state.currentFolder ? 'none' : '';

    renderFolders();
    renderFiles();
  }

  function renderFolders() {
    const cont = $('folderGrid');
    if (state.currentFolder) { cont.innerHTML = ''; return; } // dentro de carpeta no mostramos subcarpetas
    if (!state.index.folders.length) { cont.innerHTML = ''; return; }
    cont.innerHTML = state.index.folders.map(f => {
      const count = state.index.files.filter(x => x.folderId === f.id).length;
      return `<div class="folder-card" data-id="${f.id}">
        <div class="fc-icon">📁</div>
        <div class="fc-info">
          <div class="fc-name">${escapeHtml(f.name)}</div>
          <div class="fc-count">${count} archivo${count === 1 ? '' : 's'}</div>
        </div>
        <button class="fc-menu" data-del="${f.id}" title="Borrar carpeta">🗑</button>
      </div>`;
    }).join('');
    cont.querySelectorAll('.folder-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-del]')) return;
        state.currentFolder = el.dataset.id; renderVault();
      });
    });
    cont.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', (e) => { e.stopPropagation(); askDeleteFolder(b.dataset.del); });
    });
  }

  function renderFiles() {
    const list = $('fileList');
    const files = currentFiles().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!files.length) {
      list.innerHTML = `<div class="empty-state"><div class="big">🗂️</div>
        ${state.currentFolder ? 'Esta carpeta está vacía.' : 'Aún no hay archivos aquí.'}<br>
        Arrastra archivos o pulsa <b>Subir archivo</b>.</div>`;
      return;
    }
    list.innerHTML = files.map(f => `
      <div class="file-row" data-id="${f.id}">
        <div class="fr-open" data-open="${f.id}">${thumbCell(f)}</div>
        <div class="fr-main fr-open" data-open="${f.id}">
          <div class="fr-name">${escapeHtml(f.name)}</div>
          <div class="fr-meta">${fmtSize(f.size || 0)} · ${fmtDate(f.createdAt)}</div>
        </div>
        <div class="fr-actions">
          <button class="icon-btn" data-dl="${f.id}" title="Descargar">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="icon-btn" data-rn="${f.id}" title="Renombrar">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-btn del" data-del="${f.id}" title="Borrar">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`).join('');
    list.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openViewer(b.dataset.open)));
    list.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => downloadFile(b.dataset.dl)));
    list.querySelectorAll('[data-rn]').forEach(b => b.addEventListener('click', () => askRename(b.dataset.rn)));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => askDeleteFile(b.dataset.del)));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Celda visual de un archivo: miniatura si la hay, si no un icono
  function thumbCell(f) {
    if (f.thumb) {
      const isVid = /^video\//.test(f.type || '');
      return `<div class="fr-thumb-wrap">
        <img class="fr-thumb${isVid ? ' vid' : ''}" src="${f.thumb}" alt="${escapeHtml(f.name)}" loading="lazy">
        ${isVid ? '<span class="play-badge">▶</span>' : ''}
      </div>`;
    }
    return `<div class="fr-icon">${iconFor(f.type, f.name)}</div>`;
  }

  /* ---------- generación de miniaturas (en cliente) ---------- */
  // Devuelve un data URL JPEG pequeño (máx ~160px) o null si no aplica/falla.
  function makeThumbFromImage(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          resolve(drawThumb(img, img.naturalWidth, img.naturalHeight));
        } catch (e) { resolve(null); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function makeThumbFromVideo(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      let done = false;
      const finish = (val) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(val); };
      video.muted = true;
      video.preload = 'metadata';
      video.addEventListener('loadeddata', () => {
        // Saltar a un fotograma representativo
        try { video.currentTime = Math.min(1, (video.duration || 2) / 2); } catch (e) { /* ignore */ }
      });
      video.addEventListener('seeked', () => {
        try { finish(drawThumb(video, video.videoWidth, video.videoHeight)); }
        catch (e) { finish(null); }
      });
      video.addEventListener('error', () => finish(null));
      setTimeout(() => finish(null), 8000); // salvavidas
      video.src = url;
    });
  }

  function drawThumb(source, w, h) {
    if (!w || !h) return null;
    const MAX = 160;
    const scale = Math.min(1, MAX / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d').drawImage(source, 0, 0, cw, ch);
    return canvas.toDataURL('image/jpeg', 0.7); // data URL compacto
  }

  async function buildThumb(file) {
    const type = file.type || '';
    if (/^image\//.test(type)) return makeThumbFromImage(file);
    if (/^video\//.test(type)) return makeThumbFromVideo(file);
    return null;
  }

  /* ---------- subir archivos ---------- */
  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    const bar = $('progressBar');
    const barSpan = bar.querySelector('span');
    bar.classList.add('show');

    let done = 0, failed = 0;
    for (const file of files) {
      if (state.limitBytes && file.size > state.limitBytes) {
        toast(`"${file.name}" supera el límite del servidor (${limitLabel()}).`, 'err');
        failed++; continue;
      }
      try {
        barSpan.style.width = Math.round((done / files.length) * 100) + '%';
        // Miniatura (imagen/vídeo) generada en el navegador antes de cifrar
        let thumb = null;
        try { thumb = await buildThumb(file); } catch (e) { thumb = null; }
        const buf = await file.arrayBuffer();
        const { iv, data } = await encryptBytes(state.dek, buf);
        const id = uid('blob');
        const up = await apiPutBlob(id, data);
        if (!up.success) throw new Error(up.error || 'Fallo al subir.');
        state.index.files.push({
          id, folderId: state.currentFolder, name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size, iv, createdAt: Date.now(),
          thumb: thumb || null,
        });
        await persistIndex();
        done++;
      } catch (e) {
        failed++;
        toast(`Error con "${file.name}": ${e.message}`, 'err');
      }
    }
    barSpan.style.width = '100%';
    setTimeout(() => { bar.classList.remove('show'); barSpan.style.width = '0%'; }, 500);
    renderVault();
    if (done) toast(`${done} archivo${done === 1 ? '' : 's'} cifrado${done === 1 ? '' : 's'} y guardado${done === 1 ? '' : 's'}.` + (failed ? ` (${failed} con error)` : ''), 'ok');
  }

  /* ---------- descargar ---------- */
  async function downloadFile(id) {
    const f = state.index.files.find(x => x.id === id);
    if (!f) return;
    toast('Descargando y descifrando...', null);
    try {
      const ct = await apiGetBlob(id);
      const plain = await decryptBytes(state.dek, ct, f.iv);
      const blob = new Blob([plain], { type: f.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Descarga lista.', 'ok');
    } catch (e) {
      toast('No se pudo descifrar el archivo: ' + e.message, 'err');
    }
  }

  /* ---------- visor grande (lightbox) ---------- */
  let viewerUrl = null;
  let viewerCurrentId = null;

  function closeViewer() {
    $('viewerBackdrop').classList.remove('show');
    $('viewerStage').innerHTML = '';
    if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    viewerCurrentId = null;
  }

  async function openViewer(id) {
    const f = state.index.files.find(x => x.id === id);
    if (!f) return;
    viewerCurrentId = id;
    $('viewerTitle').textContent = f.name;
    $('viewerStage').innerHTML = '<div class="v-loading"><span class="spinner"></span> Descifrando…</div>';
    $('viewerBackdrop').classList.add('show');
    const type = f.type || '';

    try {
      const ct = await apiGetBlob(id);
      const plain = await decryptBytes(state.dek, ct, f.iv);
      if (viewerCurrentId !== id) return; // se cerró/cambió mientras cargaba
      if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
      const blob = new Blob([plain], { type: type || 'application/octet-stream' });
      viewerUrl = URL.createObjectURL(blob);

      const stage = $('viewerStage');
      if (/^image\//.test(type)) {
        stage.innerHTML = `<img src="${viewerUrl}" alt="${escapeHtml(f.name)}">`;
        // Regenerar miniatura para imágenes antiguas que no la tienen
        if (!f.thumb) { regenThumbFromBlob(f, blob).catch(() => {}); }
      } else if (/^video\//.test(type)) {
        stage.innerHTML = `<video src="${viewerUrl}" controls autoplay playsinline></video>`;
      } else if (/^audio\//.test(type)) {
        stage.innerHTML = `<div class="v-generic"><div class="big">🎵</div><div>${escapeHtml(f.name)}</div><audio src="${viewerUrl}" controls autoplay style="margin-top:18px"></audio></div>`;
      } else if (/pdf/.test(type)) {
        stage.innerHTML = `<iframe src="${viewerUrl}" style="width:100%;height:100%;min-height:70vh;border:none;border-radius:10px;background:#fff"></iframe>`;
      } else {
        stage.innerHTML = `<div class="v-generic"><div class="big">${iconFor(type, f.name)}</div>
          <div>Este tipo de archivo no se puede previsualizar.</div>
          <button class="btn primary" id="vGenDl">📥 Descargar «${escapeHtml(f.name)}»</button></div>`;
        const b = document.getElementById('vGenDl');
        if (b) b.addEventListener('click', () => downloadFile(id));
      }
    } catch (e) {
      if (viewerCurrentId !== id) return;
      $('viewerStage').innerHTML = `<div class="v-generic"><div class="big">⚠️</div><div>No se pudo abrir: ${escapeHtml(e.message)}</div></div>`;
    }
  }

  // Genera miniatura a partir de un blob ya descifrado (imágenes antiguas)
  async function regenThumbFromBlob(f, blob) {
    const file = new File([blob], f.name, { type: f.type });
    const thumb = await buildThumb(file);
    if (thumb) {
      f.thumb = thumb;
      try { await persistIndex(); renderFiles(); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- modales genéricos ---------- */
  function openModal(html) {
    $('modalBox').innerHTML = html;
    $('modalBackdrop').classList.add('show');
    const inp = $('modalBox').querySelector('input');
    if (inp) inp.focus();
  }
  function closeModal() { $('modalBackdrop').classList.remove('show'); $('modalBox').innerHTML = ''; }

  function askNewFolder() {
    openModal(`
      <h3>Nueva carpeta</h3>
      <p>Ponle un nombre para organizar tus archivos.</p>
      <div class="field"><input type="text" id="mFolderName" placeholder="Ej: Documentos" maxlength="60"></div>
      <div class="modal-actions">
        <button class="btn ghost small" id="mCancel">Cancelar</button>
        <button class="btn primary small" id="mOk">Crear</button>
      </div>`);
    $('mCancel').addEventListener('click', closeModal);
    const submit = async () => {
      const name = $('mFolderName').value.trim();
      if (!name) return;
      state.index.folders.push({ id: uid('f'), name, createdAt: Date.now() });
      try { await persistIndex(); closeModal(); renderVault(); toast('Carpeta creada.', 'ok'); }
      catch (e) { toast('Error: ' + e.message, 'err'); }
    };
    $('mOk').addEventListener('click', submit);
    $('mFolderName').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  function askRename(id) {
    const f = state.index.files.find(x => x.id === id);
    if (!f) return;
    openModal(`
      <h3>Renombrar archivo</h3>
      <div class="field"><input type="text" id="mName" maxlength="120" value="${escapeHtml(f.name)}"></div>
      <div class="modal-actions">
        <button class="btn ghost small" id="mCancel">Cancelar</button>
        <button class="btn primary small" id="mOk">Guardar</button>
      </div>`);
    $('mCancel').addEventListener('click', closeModal);
    const submit = async () => {
      const name = $('mName').value.trim();
      if (!name) return;
      f.name = name;
      try { await persistIndex(); closeModal(); renderVault(); toast('Nombre actualizado.', 'ok'); }
      catch (e) { toast('Error: ' + e.message, 'err'); }
    };
    $('mOk').addEventListener('click', submit);
    $('mName').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  function askDeleteFile(id) {
    const f = state.index.files.find(x => x.id === id);
    if (!f) return;
    openModal(`
      <h3>Borrar archivo</h3>
      <p>¿Seguro que quieres borrar <b>${escapeHtml(f.name)}</b>? Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="btn ghost small" id="mCancel">Cancelar</button>
        <button class="btn danger small" id="mOk">Borrar</button>
      </div>`);
    $('mCancel').addEventListener('click', closeModal);
    $('mOk').addEventListener('click', async () => {
      try {
        await apiJSON('delete_blob', { auth: state.dekHashHex, id });
        state.index.files = state.index.files.filter(x => x.id !== id);
        await persistIndex();
        closeModal(); renderVault(); toast('Archivo borrado.', 'ok');
      } catch (e) { toast('Error: ' + e.message, 'err'); }
    });
  }

  function askDeleteFolder(id) {
    const folder = state.index.folders.find(f => f.id === id);
    if (!folder) return;
    const inside = state.index.files.filter(f => f.folderId === id);
    openModal(`
      <h3>Borrar carpeta</h3>
      <p>¿Borrar la carpeta <b>${escapeHtml(folder.name)}</b>${inside.length ? ` y sus <b>${inside.length}</b> archivo(s)` : ''}? No se puede deshacer.</p>
      <div class="modal-actions">
        <button class="btn ghost small" id="mCancel">Cancelar</button>
        <button class="btn danger small" id="mOk">Borrar</button>
      </div>`);
    $('mCancel').addEventListener('click', closeModal);
    $('mOk').addEventListener('click', async () => {
      const btn = $('mOk'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
      try {
        for (const f of inside) { await apiJSON('delete_blob', { auth: state.dekHashHex, id: f.id }); }
        state.index.files = state.index.files.filter(f => f.folderId !== id);
        state.index.folders = state.index.folders.filter(f => f.id !== id);
        await persistIndex();
        closeModal(); renderVault(); toast('Carpeta borrada.', 'ok');
      } catch (e) { toast('Error: ' + e.message, 'err'); btn.disabled = false; btn.textContent = 'Borrar'; }
    });
  }

  /* ---------- cableado inicial ---------- */
  function init() {
    // Tema claro/oscuro persistente
    const themeBtn = $('themeToggle');
    if (localStorage.getItem('bp_theme') === 'light') { document.body.classList.add('light'); themeBtn.textContent = '☀️'; }
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const light = document.body.classList.contains('light');
      themeBtn.textContent = light ? '☀️' : '🌙';
      localStorage.setItem('bp_theme', light ? 'light' : 'dark');
    });

    $('btnLock').addEventListener('click', lock);
    $('btnNewFolder').addEventListener('click', askNewFolder);
    $('btnUpload').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });
    $('modalBackdrop').addEventListener('click', e => { if (e.target === $('modalBackdrop')) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if ($('viewerBackdrop').classList.contains('show')) closeViewer();
        else closeModal();
      }
    });

    // Visor grande
    $('viewerClose').addEventListener('click', closeViewer);
    $('viewerBackdrop').addEventListener('click', e => { if (e.target === $('viewerBackdrop')) closeViewer(); });
    $('viewerDownload').addEventListener('click', () => { if (viewerCurrentId) downloadFile(viewerCurrentId); });

    // Dropzone
    const dz = $('dropzone');
    dz.addEventListener('click', () => $('fileInput').click());
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); });

    if (!window.crypto || !window.crypto.subtle) {
      $('authArea').innerHTML = '<div class="auth-card"><div class="lock-icon">⚠️</div><h2>Navegador no compatible</h2><p class="sub">Este navegador no soporta cifrado seguro (Web Crypto). Usa Chrome, Edge, Firefox o Safari actualizados sobre HTTPS.</p></div>';
      return;
    }
    renderAuth();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
