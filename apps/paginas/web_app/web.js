// Estado global
let appData = null;
let currentUser = null;
let editMode = false;
let draggedElement = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    checkAuth();
    renderHeader();
    renderApps();
    renderTexts();
    setupEventListeners();
});

// Cargar datos del servidor
async function loadData() {
    try {
        const response = await fetch('load.php');
        if (!response.ok) throw new Error('Error al cargar datos');
        appData = await response.json();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar la aplicación', 'error');
        // Datos por defecto si falla
        appData = {
            apps: [],
            texts: {
                heroTitle: 'Tus Apps IA en un Solo Lugar',
                heroSubtitle: 'Accede a múltiples herramientas de inteligencia artificial',
                footerText: '© 2024 Web Apps IA'
            },
            plans: {
                free: { name: 'Gratuito', credits: 5, price: 0 },
                basic: { name: 'Básico', credits: 30, price: 9.99 },
                premium: { name: 'Premium', credits: 100, price: 24.99 }
            },
            users: []
        };
    }
}

// Guardar datos en el servidor
async function saveData() {
    try {
        const response = await fetch('save.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Cambios guardados correctamente', 'success');
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar los cambios', 'error');
    }
}

// Verificar autenticación
function checkAuth() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        // Verificar si necesita reset de créditos
        checkCreditsReset();
    }
}

// Verificar y resetear créditos diarios
function checkCreditsReset() {
    if (!currentUser) return;
    
    const today = new Date().toDateString();
    if (currentUser.lastReset !== today) {
        const user = appData.users.find(u => u.email === currentUser.email);
        if (user) {
            const plan = appData.plans[user.currentPlan];
            user.creditsToday = plan.credits;
            user.lastReset = today;
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            saveData();
        }
    }
}

// Renderizar header
function renderHeader() {
    const nav = document.getElementById('header-nav');
    
    if (currentUser) {
        nav.innerHTML = `
            <span class="credits-badge">
                <i class="fas fa-coins"></i> ${currentUser.creditsToday} créditos
            </span>
            <button onclick="openProfile()">
                <i class="fas fa-user-circle"></i> Perfil
            </button>
            <button onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Salir
            </button>
        `;
    } else {
        nav.innerHTML = `
            <a href="#" onclick="openAuthModal('login')">Entrar</a>
            <a href="#" onclick="openAuthModal('register')">Registrarse</a>
        `;
    }
}

// Renderizar apps
function renderApps() {
    const grid = document.getElementById('apps-grid');
    grid.innerHTML = '';
    
    const sortedApps = [...appData.apps].sort((a, b) => a.order - b.order);
    
    sortedApps.forEach(app => {
        const card = createAppCard(app);
        grid.appendChild(card);
    });
}

// Crear tarjeta de app
function createAppCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.dataset.appId = app.id;
    card.draggable = editMode;
    
    const icon = app.icon.startsWith('fa') 
        ? `<i class="${app.icon}"></i>` 
        : app.icon;
    
    card.innerHTML = `
        ${app.backgroundImage ? `<img src="${app.backgroundImage}" class="app-card-bg" alt="">` : ''}
        <div class="app-card-overlay"></div>
        <div class="app-card-content">
            <div class="app-card-icon">${icon}</div>
            <h3>${app.title}</h3>
            <p>${app.description}</p>
        </div>
        <div class="app-card-credits">
            <i class="fas fa-coins"></i> ${app.creditsPerRequest}
        </div>
        <div class="app-card-actions">
            <button onclick="editApp('${app.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteApp('${app.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="drag-handle">
            <i class="fas fa-grip-vertical"></i>
        </div>
    `;
    
    // Click en la tarjeta
    card.addEventListener('click', (e) => {
        if (editMode) return;
        if (e.target.closest('.app-card-actions')) return;
        handleAppClick(app);
    });
    
    // Drag & Drop
    if (editMode) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
    }
    
    return card;
}

// Manejar click en app
// Manejar click en app
function handleAppClick(app) {
    if (!currentUser) {
        showToast('Debes iniciar sesión para usar las apps', 'info');
        openAuthModal('login');
        return;
    }
    
    // Mostrar modal de confirmación
    document.getElementById('request-credits').textContent = app.creditsPerRequest;
    document.getElementById('request-available').textContent = currentUser.creditsToday;
    
    const modal = document.getElementById('request-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('request-confirm-btn').onclick = async () => {
        if (currentUser.creditsToday >= app.creditsPerRequest) {
            // Descontar créditos
            currentUser.creditsToday -= app.creditsPerRequest;
            const user = appData.users.find(u => u.email === currentUser.email);
            if (user) {
                user.creditsToday = currentUser.creditsToday;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // 🆕 REGISTRAR USO DE LA APP
            if (!appData.appUsage) appData.appUsage = {};
            if (!appData.appUsage[app.id]) {
                appData.appUsage[app.id] = {
                    totalRequests: 0,
                    totalCreditsUsed: 0,
                    lastUsed: null,
                    userRequests: {}
                };
            }
            
            appData.appUsage[app.id].totalRequests++;
            appData.appUsage[app.id].totalCreditsUsed += app.creditsPerRequest;
            appData.appUsage[app.id].lastUsed = new Date().toISOString();
            
            // Registrar uso por usuario
            if (!appData.appUsage[app.id].userRequests[currentUser.email]) {
                appData.appUsage[app.id].userRequests[currentUser.email] = 0;
            }
            appData.appUsage[app.id].userRequests[currentUser.email]++;
            
            await saveData();
            
            // Redirigir a la app
            window.open(app.url, '_blank');
            modal.classList.add('hidden');
            renderHeader();
            showToast(`Solicitud enviada. Créditos restantes: ${currentUser.creditsToday}`, 'success');
        } else {
            showToast('Créditos insuficientes. Mejora tu plan.', 'error');
            modal.classList.add('hidden');
            openPlansModal();
        }
    };
    
    document.getElementById('request-cancel-btn').onclick = () => {
        modal.classList.add('hidden');
    };
}

// Renderizar textos editables
function renderTexts() {
    document.getElementById('hero-title').textContent = appData.texts.heroTitle;
    document.getElementById('hero-subtitle').textContent = appData.texts.heroSubtitle;
    document.getElementById('footer-text').textContent = appData.texts.footerText;
}

// Setup event listeners
function setupEventListeners() {
    // Modo edición
    document.getElementById('edit-mode-btn').addEventListener('click', toggleEditMode);
    
    // Añadir app
    document.getElementById('add-app-btn').addEventListener('click', () => openAppModal());
    
    // Guardar todo
    document.getElementById('save-all-btn').addEventListener('click', saveData);
    
    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    // Click fuera del modal
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    // Formulario auth
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('auth-toggle-link').addEventListener('click', toggleAuthMode);
    
    // Formulario app
    document.getElementById('app-form').addEventListener('submit', handleAppSubmit);
    document.getElementById('app-cancel-btn').addEventListener('click', () => {
        document.getElementById('app-modal').classList.add('hidden');
    });
    
    // Upload de imagen
    document.getElementById('app-image-upload').addEventListener('change', handleImageUpload);
    
    // Textos editables
    if (editMode) {
        setupEditableTexts();
    }
}

// Toggle modo edición
async function toggleEditMode() {
    if (!editMode) {
        // Solicitar contraseña
        const password = prompt('Introduce la contraseña de administrador:');
        if (!password) return;
        
        try {
            const response = await fetch('password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const result = await response.json();
            
            if (!result.valid) {
                showToast('Contraseña incorrecta', 'error');
                return;
            }
        } catch (error) {
            showToast('Error al verificar contraseña', 'error');
            return;
        }
    }
    
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    document.getElementById('edit-mode-btn').classList.toggle('active', editMode);
    document.getElementById('add-app-btn').classList.toggle('hidden', !editMode);
    document.getElementById('save-all-btn').classList.toggle('hidden', !editMode);
    
    renderApps();
    
    if (editMode) {
        setupEditableTexts();
        showToast('Modo edición activado', 'info');
    } else {
        showToast('Modo edición desactivado', 'info');
    }
}

// Setup textos editables
function setupEditableTexts() {
    document.querySelectorAll('.editable-text').forEach(el => {
        el.contentEditable = editMode;
        
        if (editMode) {
            el.addEventListener('blur', (e) => {
                const id = e.target.id;
                const value = e.target.textContent.trim();
                
                if (id === 'hero-title') appData.texts.heroTitle = value;
                else if (id === 'hero-subtitle') appData.texts.heroSubtitle = value;
                else if (id === 'footer-text') appData.texts.footerText = value;
            });
        }
    });
}

// Drag & Drop handlers
function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientY);
    const draggable = document.querySelector('.dragging');
    
    if (afterElement == null) {
        e.currentTarget.parentElement.appendChild(draggable);
    } else {
        e.currentTarget.parentElement.insertBefore(draggable, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    updateAppsOrder();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.app-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateAppsOrder() {
    const cards = document.querySelectorAll('.app-card');
    cards.forEach((card, index) => {
        const appId = card.dataset.appId;
        const app = appData.apps.find(a => a.id === appId);
        if (app) app.order = index;
    });
}

// Modal de app
function openAppModal(appId = null) {
    const modal = document.getElementById('app-modal');
    const form = document.getElementById('app-form');
    
    if (appId) {
        const app = appData.apps.find(a => a.id === appId);
        document.getElementById('app-modal-title').textContent = 'Editar App';
        document.getElementById('app-id').value = app.id;
        document.getElementById('app-title').value = app.title;
        document.getElementById('app-description').value = app.description;
        document.getElementById('app-url').value = app.url;
        document.getElementById('app-icon').value = app.icon;
        document.getElementById('app-bg-url').value = app.backgroundImage || '';
        document.getElementById('app-credits').value = app.creditsPerRequest;
    } else {
        document.getElementById('app-modal-title').textContent = 'Añadir Nueva App';
        form.reset();
        document.getElementById('app-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

function editApp(appId) {
    openAppModal(appId);
}

function deleteApp(appId) {
    if (!confirm('¿Estás seguro de eliminar esta app?')) return;
    
    appData.apps = appData.apps.filter(a => a.id !== appId);
    renderApps();
    showToast('App eliminada', 'success');
}

// Handle app submit
function handleAppSubmit(e) {
    e.preventDefault();
    
    const appId = document.getElementById('app-id').value;
    const appData_new = {
        id: appId || Date.now().toString(),
        title: document.getElementById('app-title').value,
        description: document.getElementById('app-description').value,
        url: document.getElementById('app-url').value,
        icon: document.getElementById('app-icon').value,
        backgroundImage: document.getElementById('app-bg-url').value,
        creditsPerRequest: parseInt(document.getElementById('app-credits').value),
        order: appId ? appData.apps.find(a => a.id === appId).order : appData.apps.length
    };
    
    if (appId) {
        const index = appData.apps.findIndex(a => a.id === appId);
        appData.apps[index] = appData_new;
    } else {
        appData.apps.push(appData_new);
    }
    
    document.getElementById('app-modal').classList.add('hidden');
    renderApps();
    showToast(appId ? 'App actualizada' : 'App añadida', 'success');
}

// Handle image upload
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('upload.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('app-bg-url').value = result.url;
            showToast('Imagen subida correctamente', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast('Error al subir la imagen', 'error');
    }
}

// Auth modal
function openAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    
    if (mode === 'login') {
        title.textContent = 'Iniciar Sesión';
        submitBtn.textContent = 'Entrar';
        toggleText.textContent = '¿No tienes cuenta?';
        toggleLink.textContent = 'Regístrate';
        toggleLink.dataset.mode = 'register';
    } else {
        title.textContent = 'Registrarse';
        submitBtn.textContent = 'Crear Cuenta';
        toggleText.textContent = '¿Ya tienes cuenta?';
        toggleLink.textContent = 'Inicia sesión';
        toggleLink.dataset.mode = 'login';
    }
    
    modal.classList.remove('hidden');
}

function toggleAuthMode(e) {
    e.preventDefault();
    const mode = e.target.dataset.mode;
    openAuthModal(mode);
}

// Handle auth
function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const mode = document.getElementById('auth-submit-btn').textContent === 'Entrar' ? 'login' : 'register';
    
    if (mode === 'register') {
        // Verificar si el usuario ya existe
        if (appData.users.find(u => u.email === email)) {
            showToast('El email ya está registrado', 'error');
            return;
        }
        
        // Crear nuevo usuario
        const newUser = {
            id: Date.now().toString(),
            email,
            passwordHash: btoa(password), // En producción usar hash real
            currentPlan: 'free',
            creditsToday: appData.plans.free.credits,
            lastReset: new Date().toDateString(),
            registrationDate: new Date().toISOString()
        };
        
        appData.users.push(newUser);
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        saveData();
        
        showToast('Cuenta creada correctamente', 'success');
    } else {
        // Login
        const user = appData.users.find(u => u.email === email && u.passwordHash === btoa(password));
        
        if (!user) {
            showToast('Email o contraseña incorrectos', 'error');
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        checkCreditsReset();
        
        showToast('Sesión iniciada correctamente', 'success');
    }
    
    document.getElementById('auth-modal').classList.add('hidden');
    renderHeader();
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    renderHeader();
    showToast('Sesión cerrada', 'info');
}

// Profile modal
function openProfile() {
    const modal = document.getElementById('profile-modal');
    
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-plan').textContent = appData.plans[currentUser.currentPlan].name;
    document.getElementById('profile-credits').textContent = currentUser.creditsToday;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('profile-reset').textContent = tomorrow.toLocaleDateString();
    
    modal.classList.remove('hidden');
}

// Plans modal
function openPlansModal() {
    const modal = document.getElementById('plans-modal');
    const grid = document.getElementById('plans-grid');
    
    grid.innerHTML = '';
    
    Object.entries(appData.plans).forEach(([key, plan]) => {
        const card = document.createElement('div');
        card.className = 'plan-card';
        if (currentUser && currentUser.currentPlan === key) {
            card.classList.add('active');
        }
        
        card.innerHTML = `
            <h3>${plan.name}</h3>
            <div class="plan-price">
                ${plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                ${plan.price > 0 ? '<span>/mes</span>' : ''}
            </div>
            <div class="plan-credits">${plan.credits} solicitudes/día</div>
            <p>${plan.description || ''}</p>
            <button class="btn-primary" onclick="selectPlan('${key}')">
                ${currentUser && currentUser.currentPlan === key ? 'Plan Actual' : 'Seleccionar'}
            </button>
        `;
        
        grid.appendChild(card);
    });
    
    modal.classList.remove('hidden');
}

function selectPlan(planKey) {
    if (!currentUser) {
        showToast('Debes iniciar sesión primero', 'info');
        document.getElementById('plans-modal').classList.add('hidden');
        openAuthModal('login');
        return;
    }
    
    if (currentUser.currentPlan === planKey) {
        showToast('Ya tienes este plan activo', 'info');
        return;
    }
    
    // Simular proceso de pago
    if (appData.plans[planKey].price > 0) {
        if (!confirm(`¿Confirmar cambio al plan ${appData.plans[planKey].name} por $${appData.plans[planKey].price}/mes?`)) {
            return;
        }
    }
    
    // Actualizar plan
    const user = appData.users.find(u => u.email === currentUser.email);
    if (user) {
        user.currentPlan = planKey;
        user.creditsToday = appData.plans[planKey].credits;
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        saveData();
    }
    
    document.getElementById('plans-modal').classList.add('hidden');
    renderHeader();
    showToast(`Plan cambiado a ${appData.plans[planKey].name}`, 'success');
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Exponer funciones globales
window.openProfile = openProfile;
window.logout = logout;
window.openAuthModal = openAuthModal;
window.editApp = editApp;
window.deleteApp = deleteApp;
window.selectPlan = selectPlan;