document.addEventListener('DOMContentLoaded', () => {
  /* ==========================
     CONFIGURACIÓN
  ========================== */
  const PROXY = 'proxy_zoer.php?path=';
  const PRICES = {
    MONTHLY: 'price_1SQwU1Cs4jfaXJXSGpl61VFL',
    YEARLY:  'price_1SQwU1Cs4jfaXJXSGBfK3pRu'
  };

  /* ==========================
     ESTADO
  ========================== */
  let appData = {};
  let auth = {
    token: localStorage.getItem('zoer_token') || '',
    user: JSON.parse(localStorage.getItem('zoer_user') || 'null')
  };

  const dom = {
    grid: document.getElementById('apps-grid'),
    modalsContainer: document.getElementById('edit-modals-container'),
    authActions: document.getElementById('auth-actions'),
    userMenu: document.getElementById('user-menu'),
    userEmail: document.getElementById('user-email')
  };

  init();

  function init() {
    updateAuthUI();
    loadState();
    hookupButtons();
    if (auth.token) refreshProfile();
  }

  function hookupButtons() {
    document.getElementById('btn-open-login')?.addEventListener('click', openLoginModal);
    document.getElementById('btn-open-register')?.addEventListener('click', openRegisterModal);
    document.getElementById('btn-logout')?.addEventListener('click', logout);
    document.getElementById('subscribe-monthly')?.addEventListener('click', () => startStripeCheckout(PRICES.MONTHLY));
    document.getElementById('subscribe-yearly')?.addEventListener('click', () => startStripeCheckout(PRICES.YEARLY));
    document.getElementById('btn-portal')?.addEventListener('click', openStripePortal);
  }

  /* ==========================
     AUTENTICACIÓN (VIA PROXY)
  ========================== */
  function updateAuthUI() {
    if (auth.token && auth.user) {
      dom.authActions.style.display = 'none';
      dom.userMenu.style.display = 'flex';
      dom.userEmail.textContent = auth.user.email || 'Usuario';
      dom.grid.classList.remove('locked');
    } else {
      dom.authActions.style.display = 'flex';
      dom.userMenu.style.display = 'none';
      dom.grid.classList.add('locked');
    }
  }

  async function doRegister(name, email, password) {
    const btn = document.getElementById('do-register-btn');
    btn.innerText = "Registrando..."; btn.disabled = true;
    try {
      const res = await fetch(PROXY + 'auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await res.json(); // Lee la respuesta UNA SOLA VEZ

      if (!res.ok) {
        // *** CÓDIGO MEJORADO ***
        // Muestra el error real de Zoer, o un mensaje por defecto
        let errorMsg = data.error || data.message || 'Fallo en registro. Código: ' + res.status;
        throw new Error(errorMsg);
      }

      await doLogin(email, password); // Login automático tras registro
    } catch (e) {
      // Si res.json() falla (no es JSON), e.message será el error
      alert('Error: ' + e.message);
      btn.innerText = "Registrarme"; btn.disabled = false;
    }
  }

  async function doLogin(email, password) {
    const btn = document.getElementById('do-login-btn');
    if(btn) { btn.innerText = "Entrando..."; btn.disabled = true; }
    try {
      const res = await fetch(PROXY + 'auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json(); // Lee la respuesta UNA SOLA VEZ

      if (!res.ok) {
        // *** CÓDIGO MEJORADO ***
        let errorMsg = data.error || data.message || 'Credenciales incorrectas. Código: ' + res.status;
        throw new Error(errorMsg);
      }
      
      auth.token = data.token;
      auth.user = data.user || { email };
      localStorage.setItem('zoer_token', auth.token);
      localStorage.setItem('zoer_user', JSON.stringify(auth.user));

      closeModal();
      updateAuthUI();
      refreshProfile();
    } catch (e) {
      alert('Error: ' + e.message); 
      if(btn) { btn.innerText = "Entrar"; btn.disabled = false; }
    }
  }

  function logout() {
    localStorage.removeItem('zoer_token');
    localStorage.removeItem('zoer_user');
    auth = { token: '', user: null };
    updateAuthUI();
    window.location.reload();
  }

  async function refreshProfile() {
    try {
      const res = await fetch(PROXY + 'auth/profile', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const user = await res.json();
        auth.user = user;
        localStorage.setItem('zoer_user', JSON.stringify(user));
        updateAuthUI();
      } else if (res.status === 401) { logout(); }
    } catch (e) { console.error(e); }
  }

  /* ==========================
     PAGOS (VIA PROXY)
  ========================== */
  async function startStripeCheckout(priceId) {
    if (!auth.token) return openLoginModal();
    const btn = document.activeElement;
    const txt = btn.innerText;
    btn.innerText = "Cargando..."; btn.disabled = true;

    try {
      const res = await fetch(PROXY + 'billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify({
          priceId: priceId,
          successUrl: window.location.origin + window.location.pathname + '?payment=success',
          cancelUrl: window.location.href
        })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'No se pudo iniciar el pago');
    } catch (e) {
      alert('Error: ' + e.message);
      btn.innerText = txt; btn.disabled = false;
    }
  }

  async function openStripePortal() {
    const btn = document.getElementById('btn-portal');
    btn.innerText = "Abriendo...";
    try {
      const res = await fetch(PROXY + 'billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify({ returnUrl: window.location.href })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Aún no tienes suscripción.");
    } catch (e) { alert("Error abriendo portal."); }
    finally { btn.innerText = "Mi suscripción"; }
  }

  /* ==========================
     UI HELPERS
  ========================== */
  function openLoginModal() {
    dom.modalsContainer.innerHTML = `
      <div class="modal-overlay"><div class="modal-content">
        <h2>Iniciar sesión</h2>
        <div class="form-group"><label>Email</label><input id="login-email" type="email"></div>
        <div class="form-group"><label>Contraseña</label><input id="login-password" type="password"></div>
        <button class="btn-save" style="width:100%;margin-top:1rem" id="do-login-btn">Entrar</button>
        <p style="margin-top:1rem;text-align:center;font-size:0.9em;color:#aaa">¿Sin cuenta? <a href="#" id="switch-register">Regístrate</a></p>
        <button class="btn-cancel" style="position:absolute;top:1rem;right:1rem;background:none;font-size:1.5rem" id="close-m">×</button>
      </div></div>`;
    document.getElementById('close-m').onclick = closeModal;
    document.getElementById('do-login-btn').onclick = () => doLogin($$('login-email').value, $$('login-password').value);
    document.getElementById('switch-register').onclick = (e) => { e.preventDefault(); openRegisterModal(); };
  }
  function openRegisterModal() {
    dom.modalsContainer.innerHTML = `
      <div class="modal-overlay"><div class="modal-content">
        <h2>Crear cuenta</h2>
        <div class="form-group"><label>Nombre</label><input id="reg-name" type="text"></div>
        <div class="form-group"><label>Email</label><input id="reg-email" type="email"></div>
        <div class="form-group"><label>Contraseña</label><input id="reg-password" type="password"></div>
        <button class="btn-save" style="width:100%;margin-top:1rem" id="do-register-btn">Registrarme</button>
        <p style="margin-top:1rem;text-align:center;font-size:0.9em;color:#aaa">¿Ya tienes cuenta? <a href="#" id="switch-login">Inicia sesión</a></p>
        <button class="btn-cancel" style="position:absolute;top:1rem;right:1rem;background:none;font-size:1.5rem" id="close-m">×</button>
      </div></div>`;
    document.getElementById('close-m').onclick = closeModal;
    document.getElementById('do-register-btn').onclick = () => doRegister($$('reg-name').value, $$('reg-email').value, $$('reg-password').value);
    document.getElementById('switch-login').onclick = (e) => { e.preventDefault(); openLoginModal(); };
  }
  function closeModal() { dom.modalsContainer.innerHTML = ''; }
  function $$(id) { return document.getElementById(id); }

  // Carga inicial de apps (sin cambios)
  async function loadState() {
    try {
      const res = await fetch('load.php?t=' + Date.now());
      if (res.ok) { appData = await res.json(); renderGrid(); }
    } catch (e) { console.error(e); }
  }
  function renderGrid() {
    dom.grid.innerHTML = '';
    if (appData.apps) appData.apps.forEach(app => {
      const c = document.createElement('a'); c.className = 'app-card'; c.href = app.url; c.target = '_blank';
      c.style.backgroundImage = `url('${app.backgroundImageUrl}')`;
      c.innerHTML = `<div class="app-card-overlay"><div class="app-icon">${app.icon}</div><div><h3>${app.title}</h3><p>${app.description}</p></div></div>`;
      dom.grid.appendChild(c);
    });
  }
});