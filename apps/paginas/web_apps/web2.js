document.addEventListener('DOMContentLoaded', () => {
  /* ==========================
     CONFIG
  ========================== */
  // Backend Zoer para auth + stripe
  const API_BASE =
    window.ZOER_API_BASE ||
    'https://app20251105035219xtdbdgidke.online.zoer.ai/next_api';

  // Price IDs de Stripe (TEST). Sustituye cuando tengas los tuyos:
  const PRICES = {
    MONTHLY: window.STRIPE_PRICE_MONTHLY || 'price_test_monthly_9',
    YEARLY:  window.STRIPE_PRICE_YEARLY  || 'price_test_yearly_79'
  };

  /* ==========================
     ESTADO
  ========================== */
  let appData = {};
  let isEditMode = false;
  let isDragging = false;
  let auth = {
    token: localStorage.getItem('authToken') || '',
    user: JSON.parse(localStorage.getItem('authUser') || 'null')
  };

  const dom = {
    grid: document.getElementById('apps-grid'),
    editBtn: document.getElementById('edit-mode-btn'),
    headerTitle: document.getElementById('header-title'),
    headerSubtitle: document.getElementById('header-subtitle'),
    footerText: document.getElementById('footer-text'),
    modalsContainer: document.getElementById('edit-modals-container')
  };

  /* ==========================
     TOPBAR CON AUTH
  ========================== */
  mountTopbar();
  updateTopbar();

  function mountTopbar(){
    if (document.querySelector('.site-topbar')) return;
    const bar = document.createElement('div');
    bar.className = 'site-topbar';
    bar.innerHTML = `
      <div class="brand">
        <img src="https://atnojs.es/iconos/favicon1.ico" alt="">
        <span>Suite Creativa de IA</span>
      </div>
      <div class="flex-grow"></div>
      <div class="auth-actions" id="auth-actions">
        <button id="btn-login" class="btn">Iniciar sesión</button>
        <button id="btn-register" class="btn btn-primary">Registrarse</button>
      </div>
    `;
    const container = document.querySelector('.container') || document.body;
    container.prepend(bar);

    bar.querySelector('#btn-login').addEventListener('click', openLoginModal);
    bar.querySelector('#btn-register').addEventListener('click', openRegisterModal);
  }

  function updateTopbar(){
    const box = document.getElementById('auth-actions');
    if (!box) return;
    if (auth.token){
      box.innerHTML = `
        <span style="opacity:.8;margin-right:8px">Hola, ${auth.user?.name || 'usuario'}</span>
        <button id="btn-logout" class="btn btn-danger">Cerrar sesión</button>
      `;
      document.getElementById('btn-logout').addEventListener('click', logout);
    }else{
      box.innerHTML = `
        <button id="btn-login" class="btn">Iniciar sesión</button>
        <button id="btn-register" class="btn btn-primary">Registrarse</button>
      `;
      box.querySelector('#btn-login').addEventListener('click', openLoginModal);
      box.querySelector('#btn-register').addEventListener('click', openRegisterModal);
    }
  }

  /* ==========================
     AUTH (Zoer)
  ========================== */
  function openLoginModal(){
    const html = `
    <div class="modal-overlay" id="auth-modal">
      <div class="modal-content">
        <h2>Iniciar sesión</h2>
        <div class="form-group"><label>Email</label><input id="login-email" type="email" autocomplete="email"></div>
        <div class="form-group"><label>Contraseña</label><input id="login-password" type="password" autocomplete="current-password"></div>
        <div class="form-buttons">
          <button class="btn btn-cancel" id="auth-cancel">Cancelar</button>
          <button class="btn btn-save" id="auth-submit">Entrar</button>
        </div>
      </div>
    </div>`;
    dom.modalsContainer.innerHTML = html;
    document.getElementById('auth-cancel').onclick = closeModal;
    document.getElementById('auth-submit').onclick = doLogin;
  }

  function openRegisterModal(){
    const html = `
    <div class="modal-overlay" id="auth-modal">
      <div class="modal-content">
        <h2>Crear cuenta</h2>
        <div class="form-group"><label>Nombre</label><input id="reg-name" type="text" autocomplete="name"></div>
        <div class="form-group"><label>Email</label><input id="reg-email" type="email" autocomplete="email"></div>
        <div class="form-group"><label>Contraseña</label><input id="reg-password" type="password" autocomplete="new-password"></div>
        <div class="form-buttons">
          <button class="btn btn-cancel" id="auth-cancel">Cancelar</button>
          <button class="btn btn-save" id="auth-submit">Registrarme</button>
        </div>
      </div>
    </div>`;
    dom.modalsContainer.innerHTML = html;
    document.getElementById('auth-cancel').onclick = closeModal;
    document.getElementById('auth-submit').onclick = doRegister;
  }

  async function doRegister(){
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!API_BASE) return alert('API_BASE no configurado.');
    try{
      const r = await fetch(`${API_BASE}/auth/register`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,email,password})
      });
      if(!r.ok) throw new Error('Registro fallido');
      closeModal();
      // login directo
      const t = await fetch(`${API_BASE}/auth/login`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data = await t.json();
      if(!t.ok || !data?.token) throw new Error('Login tras registro falló');
      persistAuth(data.token);
      await loadProfile();
      updateTopbar();
    }catch(e){ alert('No se pudo registrar. Revisa email/contraseña.'); console.error(e) }
  }

  async function doLogin(){
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!API_BASE) return alert('API_BASE no configurado.');
    try{
      const r = await fetch(`${API_BASE}/auth/login`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data = await r.json();
      if(!r.ok || !data?.token) throw new Error('Login inválido');
      persistAuth(data.token);
      await loadProfile();
      closeModal();
      updateTopbar();
    }catch(e){ alert('No se pudo iniciar sesión.'); console.error(e) }
  }

  async function loadProfile(){
    try{
      const r = await fetch(`${API_BASE}/auth/profile`,{
        headers:{'Authorization':`Bearer ${auth.token}`}
      });
      if(r.ok){
        const me = await r.json();
        auth.user = me;
        localStorage.setItem('authUser', JSON.stringify(me));
      }
    }catch(e){ console.warn('profile',e)}
  }

  function persistAuth(token){
    auth.token = token;
    localStorage.setItem('authToken', token);
  }

  function logout(){
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    auth = {token:'', user:null};
    updateTopbar();
  }

  function closeModal(){ dom.modalsContainer.innerHTML = '' }

  async function ensureLoggedIn(){
    if (auth.token) return true;
    openLoginModal();
    return false;
  }

  /* ==========================
     SUSCRIPCIONES (Stripe Checkout)
  ========================== */
  // Enlaza si existen botones de planes en la página
  hookupPlanButtons();

  function hookupPlanButtons(){
    const btnMonthly = document.getElementById('subscribe-monthly');
    const btnYearly  = document.getElementById('subscribe-yearly');
    if (btnMonthly) btnMonthly.addEventListener('click', () => startCheckout(PRICES.MONTHLY));
    if (btnYearly)  btnYearly.addEventListener('click',  () => startCheckout(PRICES.YEARLY));
  }

  async function startCheckout(priceId){
    if (!await ensureLoggedIn()) return;
    if (!API_BASE) return alert('API_BASE no configurado.');
    try{
      const body = {
        priceId,
        successUrl: `${location.origin}${location.pathname}?checkout=success`,
        cancelUrl:  location.href
      };
      const r = await fetch(`${API_BASE}/billing/subscribe`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${auth.token}`
        },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok || !data?.url) throw new Error(data?.error || 'No se obtuvo URL de checkout');
      location.href = data.url; // redirige a Stripe
    }catch(e){
      console.error(e);
      alert('No se pudo iniciar el checkout. Revisa configuración de precios en el backend.');
    }
  }

  /* ==========================
     CARGA INICIAL DE TARJETAS
  ========================== */
  async function loadState(){
    try{
      const response = await fetch('load.php?t=' + Date.now());
      if(!response.ok) throw new Error(`Network not ok: ${response.statusText}`);
      appData = await response.json();
      render();
    }catch(error){
      console.error('Error fatal al cargar los datos:', error);
      alert('No se pudo cargar el contenido de la página. Asegúrate de que los archivos PHP están en el servidor y no hay errores.');
    }
  }

  function render(){
    dom.headerTitle.textContent   = appData.headerTitle   || '';
    dom.headerSubtitle.textContent= appData.headerSubtitle|| '';
    dom.footerText.innerHTML      = appData.footerText    || '';

    dom.grid.innerHTML = '';
    if (appData.apps && Array.isArray(appData.apps)){
      appData.apps.forEach(app => dom.grid.appendChild(createAppCard(app)));
    }
    if (isEditMode){ dom.grid.appendChild(createAddButton()); }
  }

  function createAppCard(app){
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = app.url;
    card.target = '_blank';
    card.dataset.id = app.id;
    card.style.backgroundImage = `url('${app.backgroundImageUrl}')`;
    card.innerHTML = `
      <div class="app-card-overlay">
        <div class="app-icon">${app.icon}</div>
        <div>
          <h3>${app.title}</h3>
          <p>${app.description}</p>
        </div>
      </div>
    `;

    if (isEditMode){
      card.href = 'javascript:void(0)';
      const edit = document.createElement('div');
      edit.className = 'edit-buttons';
      edit.innerHTML = `
        <button class="edit-app-btn" title="Editar App"><i class="fa-solid fa-pen"></i></button>
        <button class="delete-app-btn" title="Eliminar App"><i class="fa-solid fa-trash"></i></button>
      `;
      card.appendChild(edit);
      edit.querySelectorAll('button').forEach(b => b.draggable=false);
      edit.querySelector('.edit-app-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openAppForm('Editar Aplicación', app); });
      edit.querySelector('.delete-app-btn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); deleteApp(app.id); });

      card.draggable = true;
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    }
    return card;
  }

  function createAddButton(){
    const add = document.createElement('div');
    add.id = 'add-new-app-btn';
    add.innerHTML = `<div class="add-app-content"><i class="fa-solid fa-plus"></i><p>Añadir Nueva App</p></div>`;
    add.addEventListener('click', () => openAppForm('Añadir Nueva Aplicación'));
    return add;
  }

  /* ======= Editor original (sin cambios funcionales) ======= */
  function toggleEditMode(){
    isEditMode = !isEditMode;
    dom.editBtn.classList.toggle('active', isEditMode);
    if (!isEditMode){ saveState(); } else { initDragAndDrop(); }
    if (isEditMode === false){ destroyDragAndDrop(); }
    render();
  }
  dom.editBtn.addEventListener('click', () => { if (!isEditMode) openPasswordModal(); else toggleEditMode(); });

  async function saveState(){
    const dataToSave = { password: sessionStorage.getItem('editorPassword'), ...appData };
    try{
      const r = await fetch('save.php',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(dataToSave)});
      const result = await r.json();
      if(!result.success) throw new Error(result.error||'Failed to save');
    }catch(e){ console.error('Error al guardar:', e); alert('ERROR: No se pudieron guardar los cambios.');}
  }

  function openPasswordModal(){
    const html = `
    <div class="modal-overlay" id="password-modal">
      <div class="modal-content">
        <h2>Modo Edición</h2>
        <div class="form-group"><label>Contraseña</label><input type="password" id="password-input"></div>
        <div class="form-buttons">
          <button class="btn-cancel" id="cancel-password">Cancelar</button>
          <button class="btn-save" id="submit-password">Activar</button>
        </div>
      </div>
    </div>`;
    dom.modalsContainer.innerHTML = html;
    const pwd = document.getElementById('password-input'); pwd.focus();
    document.getElementById('submit-password').addEventListener('click', async () => {
      try{
        const fd = new FormData(); fd.append('password', pwd.value);
        const r = await fetch('password.php',{ method:'POST', body:fd });
        const ok = await r.json();
        if (ok.success){ sessionStorage.setItem('editorPassword', pwd.value); closeModal(); toggleEditMode(); }
        else alert('Contraseña incorrecta.');
      }catch(e){ console.error('validación contraseña', e); alert('Error al contactar el servidor.');}
    });
    document.getElementById('cancel-password').addEventListener('click', closeModal);
    pwd.addEventListener('keypress', e => { if (e.key==='Enter') document.getElementById('submit-password').click();});
  }

  function openAppForm(title, app={}){
    const isEditing = !!app.id;
    const currentBg = app.backgroundImageUrl || '';
    const html = `
    <div class="modal-overlay" id="app-form-modal">
      <div class="modal-content">
        <h2>${title}</h2>
        <input type="hidden" id="app-id" value="${app.id || ''}">
        <div class="form-group"><label>Título</label><input id="app-title" value="${app.title||''}"></div>
        <div class="form-group"><label>Descripción</label><textarea id="app-description" rows="2">${app.description||''}</textarea></div>
        <div class="form-group"><label>URL de la App</label><input id="app-url" value="${app.url||''}"></div>
        <div class="form-group"><label>Icono (Emoji o HTML de FA)</label><input id="app-icon" value="${app.icon||''}"></div>
        <div class="form-group">
          <label>URL de Imagen de Fondo</label><input id="app-bg-image" value="${currentBg}">
          <label style="margin-top:10px;display:block;">O subir una imagen:</label>
          <input type="file" id="app-bg-upload" accept="image/*">
          <img id="bg-preview" src="${currentBg}" style="${currentBg?'display:block;':''}">
        </div>
        <div class="form-buttons">
          <button class="btn-cancel" id="cancel-app-form">Cancelar</button>
          <button class="btn-save" id="save-app-form">Guardar</button>
        </div>
      </div>
    </div>`;
    dom.modalsContainer.innerHTML = html;

    const bgImageInput = document.getElementById('app-bg-image');
    const bgUploadInput = document.getElementById('app-bg-upload');
    const bgPreview = document.getElementById('bg-preview');
    bgUploadInput.addEventListener('change', (ev)=>{
      const f = ev.target.files?.[0]; if(!f) return;
      const rd = new FileReader();
      rd.onload = e => { const b64 = e.target.result; bgImageInput.value = b64; bgPreview.src = b64; bgPreview.style.display='block'; };
      rd.readAsDataURL(f);
    });

    document.getElementById('save-app-form').addEventListener('click', () => {
      const updated = {
        id: document.getElementById('app-id').value || `app_${Date.now()}`,
        title: document.getElementById('app-title').value,
        description: document.getElementById('app-description').value,
        url: document.getElementById('app-url').value,
        icon: document.getElementById('app-icon').value,
        backgroundImageUrl: document.getElementById('app-bg-image').value
      };
      if (isEditing){
        const i = appData.apps.findIndex(a => a.id === updated.id);
        appData.apps[i] = updated;
      }else{
        appData.apps.push(updated);
      }
      closeModal(); render();
    });
    document.getElementById('cancel-app-form').addEventListener('click', closeModal);
  }

  function deleteApp(id){
    if (confirm('¿Eliminar esta aplicación?')){
      appData.apps = appData.apps.filter(a => a.id !== id);
      render();
    }
  }

  function closeModal(){ dom.modalsContainer.innerHTML = '' }

  // Drag & drop
  const handleDragStart = e => { isDragging=true; e.dataTransfer.setData('text/plain', e.target.dataset.id); e.target.classList.add('draggable-ghost'); };
  const handleDragEnd   = e => { isDragging=false; e.target.classList.remove('draggable-ghost'); };
  const handleDragOver  = e => {
    e.preventDefault();
    const dragging = dom.grid.querySelector('.draggable-ghost'); if(!dragging) return;
    const target = e.target.closest('.app-card');
    if (target && target!==dragging && target.id!=='add-new-app-btn'){
      const rect=target.getBoundingClientRect(); const next=(e.clientY-rect.top)/rect.height>0.5;
      dom.grid.insertBefore(dragging, next?target.nextSibling:target);
    }
  };
  const handleDrop = e => { e.preventDefault(); const add= e.target.closest('#add-new-app-btn'); if(add){ const dr=dom.grid.querySelector('.draggable-ghost'); if(dr) add.before(dr); } updateAppOrder(); saveState(); };
  const handleAutoScroll = e => {
    if (!isDragging) return; const vh=window.innerHeight, z=80, sp=15;
    if (e.clientY<z) window.scrollBy(0,-sp); else if (e.clientY>vh-z) window.scrollBy(0,sp);
  };
  function updateAppOrder(){
    const cards = dom.grid.querySelectorAll('.app-card');
    const order = Array.from(cards).map(c=>c.dataset.id);
    appData.apps = order.map(id => appData.apps.find(a=>a.id===id)).filter(Boolean);
  }
  function initDragAndDrop(){ dom.grid.addEventListener('dragover',handleDragOver); dom.grid.addEventListener('drop',handleDrop); document.addEventListener('dragover',handleAutoScroll); }
  function destroyDragAndDrop(){ dom.grid.removeEventListener('dragover',handleDragOver); dom.grid.removeEventListener('drop',handleDrop); document.removeEventListener('dragover',handleAutoScroll); }

  // Init
  loadState();
  if (auth.token) loadProfile();
});
