document.addEventListener('DOMContentLoaded', () => {
    
    // 1. INICIAR FONDO 3D (THREE.JS)
    init3DBackground();

    let appData = {};
    let isEditMode = false;
    let isDragging = false;

    const dom = {
        grid: document.getElementById('apps-grid'),
        editBtn: document.getElementById('edit-mode-btn'),
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        footerText: document.getElementById('footer-text'),
        modalsContainer: document.getElementById('edit-modals-container'),
    };

    // --- CARGA DATOS ---
    async function loadState() {
        try {
            const response = await fetch('load.php?t=' + Date.now());
            if (!response.ok) throw new Error('Error red');
            appData = await response.json();
            render();
        } catch (error) {
            // Fallback a JSON local si falla PHP
            try {
                const r2 = await fetch('apps_data.json');
                appData = await r2.json();
                render();
            } catch(e) { console.error("Error carga total"); }
        }
    }

    // --- RENDERIZADO ---
    function render() {
        dom.headerTitle.textContent = appData.headerTitle || '';
        dom.headerSubtitle.textContent = appData.headerSubtitle || '';
        dom.footerText.innerHTML = appData.footerText || '';
        dom.grid.innerHTML = '';

        if (appData.apps && Array.isArray(appData.apps)) {
            appData.apps.forEach(app => dom.grid.appendChild(createAppCard(app)));
        }
        
        if (isEditMode) dom.grid.appendChild(createAddButton());

        // 3D TILT AGRESIVO
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".app-card"), {
                max: 25,            // INCLINACIÓN FUERTE (antes era muy baja)
                speed: 400,         // Velocidad
                glare: true,        // Brillo
                "max-glare": 0.5,   // Intensidad brillo
                scale: 1.1,         // Zoom al pasar ratón
                perspective: 1000,  // Profundidad
                gyroscope: true
            });
        }
    }

    function createAppCard(app) {
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

        if (isEditMode) {
            card.href = 'javascript:void(0)';
            if(card.vanillaTilt) card.vanillaTilt.destroy();
            const editButtons = document.createElement('div');
            editButtons.className = 'edit-buttons';
            editButtons.innerHTML = `<button class="edit-app-btn"><i class="fa-solid fa-pen"></i></button><button class="delete-app-btn"><i class="fa-solid fa-trash"></i></button>`;
            card.appendChild(editButtons);
            
            editButtons.querySelector('.edit-app-btn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAppForm('Editar', app); });
            editButtons.querySelector('.delete-app-btn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); deleteApp(app.id); });
            
            card.draggable = true;
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
        }
        return card;
    }

    function createAddButton() {
        const btn = document.createElement('div');
        btn.id = 'add-new-app-btn';
        btn.innerHTML = `<div class="add-app-content"><i class="fa-solid fa-plus"></i><p>Añadir App</p></div>`;
        btn.addEventListener('click', () => openAppForm('Nueva App'));
        return btn;
    }

    // --- FUNCIONALIDADES CORE ---
    dom.editBtn.addEventListener('click', () => {
        if (!isEditMode) openPasswordModal();
        else { isEditMode = false; dom.editBtn.classList.remove('active'); saveState(); destroyDragAndDrop(); render(); }
    });

    async function saveState() {
        const data = { password: sessionStorage.getItem('editorPassword'), ...appData };
        try { await fetch('save.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); } catch(e){}
    }

    // --- MODALES ---
    function openPasswordModal() {
        dom.modalsContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content"><h2>Seguridad</h2><div class="form-group"><input type="password" id="p-in" placeholder="Contraseña"></div><div class="form-buttons"><button class="btn-cancel" id="c-p">Cancelar</button><button class="btn-save" id="s-p">Entrar</button></div></div></div>`;
        document.getElementById('p-in').focus();
        document.getElementById('s-p').onclick = async () => {
            const p = document.getElementById('p-in').value;
            try {
                const r = await fetch('password.php', { method:'POST', body:(() => {const f=new FormData();f.append('password',p);return f;})() });
                const j = await r.json();
                if(j.success) { sessionStorage.setItem('editorPassword', p); dom.modalsContainer.innerHTML=''; isEditMode=true; dom.editBtn.classList.add('active'); initDragAndDrop(); render(); }
                else alert('Incorrecto');
            } catch(e){alert('Error');}
        };
        document.getElementById('c-p').onclick = () => dom.modalsContainer.innerHTML='';
    }

    function openAppForm(title, app={}) {
        const isEdit = !!app.id;
        dom.modalsContainer.innerHTML = `
        <div class="modal-overlay"><div class="modal-content"><h2>${title}</h2>
            <input type="hidden" id="aid" value="${app.id||''}">
            <div class="form-group"><label>Título</label><input id="ati" value="${app.title||''}"></div>
            <div class="form-group"><label>Desc</label><textarea id="ade">${app.description||''}</textarea></div>
            <div class="form-group"><label>URL</label><input id="aur" value="${app.url||''}"></div>
            <div class="form-group"><label>Icono</label><input id="aic" value="${(app.icon||'').replace(/"/g,'&quot;')}"></div>
            <div class="form-group"><label>Fondo</label><input id="abg" value="${app.backgroundImageUrl||''}">
            <input type="file" id="auf" style="margin-top:10px"></div>
            <div class="form-buttons"><button class="btn-cancel" id="aca">Cancelar</button><button class="btn-save" id="asa">Guardar</button></div>
        </div></div>`;
        const img = document.getElementById('abg');
        document.getElementById('auf').onchange = e => { if(e.target.files[0]) { const r=new FileReader();r.onload=v=>img.value=v.target.result;r.readAsDataURL(e.target.files[0]); }};
        document.getElementById('asa').onclick = () => {
            const n = { id: document.getElementById('aid').value||`app_${Date.now()}`, title: document.getElementById('ati').value, description: document.getElementById('ade').value, url: document.getElementById('aur').value, icon: document.getElementById('aic').value, backgroundImageUrl: img.value };
            if(isEdit) appData.apps[appData.apps.findIndex(x=>x.id===n.id)] = n; else { if(!appData.apps)appData.apps=[]; appData.apps.push(n); }
            dom.modalsContainer.innerHTML=''; render();
        };
        document.getElementById('aca').onclick = () => dom.modalsContainer.innerHTML='';
    }

    function deleteApp(id) { if(confirm('Borrar?')) { appData.apps=appData.apps.filter(x=>x.id!==id); render(); } }
    
    // Drag & Drop simple
    const handleDragStart = e => { isDragging=true; e.dataTransfer.setData('text',e.target.dataset.id); };
    const handleDragEnd = () => isDragging=false;
    const handleDragOver = e => e.preventDefault(); 
    const handleDrop = e => { e.preventDefault(); saveState(); };
    function initDragAndDrop() { dom.grid.addEventListener('dragover',handleDragOver); dom.grid.addEventListener('drop',handleDrop); }
    function destroyDragAndDrop() { dom.grid.removeEventListener('dragover',handleDragOver); dom.grid.removeEventListener('drop',handleDrop); }

    // --- FONDO 3D POTENTE ---
    function init3DBackground() {
        const c = document.getElementById('canvas-container');
        if(!c || typeof THREE === 'undefined') return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({alpha:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        c.innerHTML=''; c.appendChild(renderer.domElement);

        const geo = new THREE.BufferGeometry();
        const count = 800; // CANTIDAD ALTA
        const pos = new Float32Array(count*3);
        for(let i=0;i<count*3;i++) pos[i] = (Math.random()-0.5)*35;
        geo.setAttribute('position', new THREE.BufferAttribute(pos,3));

        // PUNTOS GRANDES
        const mat = new THREE.PointsMaterial({size:0.2, color:0x00f3ff});
        const mesh = new THREE.Points(geo, mat);
        // LINEAS VISIBLES
        const lineMat = new THREE.LineBasicMaterial({color:0xff00ff, opacity:0.4, transparent:true});
        const lines = new THREE.LineSegments(geo, lineMat);

        scene.add(mesh); scene.add(lines);
        camera.position.z = 6;

        let mx=0, my=0;
        document.addEventListener('mousemove', e => { mx=e.clientX/window.innerWidth-0.5; my=e.clientY/window.innerHeight-0.5; });

        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            mesh.rotation.y = t*0.1 + mx; // ROTACION MAS RAPIDA
            mesh.rotation.x = my*0.5;
            lines.rotation.copy(mesh.rotation);
            renderer.render(scene, camera);
        }
        animate();
        window.addEventListener('resize', ()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
    }
    
    loadState();
});