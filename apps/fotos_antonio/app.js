/**
 * app.js - Lógica del chat VIA
 */
document.addEventListener('DOMContentLoaded', () => {
    HistoryManager.configure({ dbName: 'fotos_antonio_db' });
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('messages-container');
    const newChatBtn = document.getElementById('btn-new-chat');
    const loader = document.getElementById('loading-overlay');
    const convList = document.getElementById('conversations-list');

    let currentConversationId = null;

    // Ajuste automático de altura del textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Cargar conversaciones iniciales
    loadConversations();

    // Enviar mensaje
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Limpiar input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Ocultar pantalla de bienvenida
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) welcomeScreen.remove();

        // Mostrar mensaje usuario
        appendMessage('user', message);

        // Mostrar loader
        setLoading(true);

        try {
            const response = await fetch('api.php?action=chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    conversacion_id: currentConversationId
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            currentConversationId = data.conversacion_id;

            // Mostrar respuesta del asistente
            appendMessage('assistant', data.respuesta, data.imagen_url);

            // Guardar imagen en historial persistente
            if (data.imagen_url) {
                HistoryManager.saveItem({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
                    url: data.imagen_url,
                    prompt: message,
                    aspectRatio: '1:1',
                    size: '',
                    geminiSize: '1K',
                    style: {},
                    createdAt: Date.now()
                }).then(function() { loadAndRenderHistory(); })
                  .catch(function(e) { console.warn('Error guardando historial:', e); });
            }

            // Refrescar lista de chats si es nuevo
            loadConversations();

        } catch (error) {
            console.error(error);
            appendMessage('assistant', "Lo siento, mi conexión con la red neuronal se ha interrumpido. ¿Podemos reintentarlo?");
        } finally {
            setLoading(false);
        }
    });

    // Nuevo chat
    newChatBtn.addEventListener('click', () => {
        currentConversationId = null;
        messagesContainer.innerHTML = `
            <div class="welcome-screen">
                <h1 class="gradient-text">Nuevo Proyecto Visual</h1>
                <p>Estoy listo. ¿Qué detalles técnicos tenemos para la nueva sesión de Antonio?</p>
            </div>
        `;
    });

    function appendMessage(rol, contenido, imagenUrl = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${rol}`;

        let html = `<div>${contenido}</div>`;
        if (imagenUrl) {
            html += `<img src="${imagenUrl}" alt="Imagen generada" onclick="openFullImage('${imagenUrl}')">`;
        }

        msgDiv.innerHTML = html;
        messagesContainer.appendChild(msgDiv);

        // Scroll al fondo
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function loadConversations() {
        try {
            const res = await fetch('api.php?action=get_conversations');
            const conversations = await res.json();

            convList.innerHTML = '';
            conversations.forEach(c => {
                const item = document.createElement('div');
                item.className = `conv-item ${currentConversationId == c.id ? 'active' : ''}`;
                item.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem;">${c.titulo}</div>
                    <div style="font-size: 0.7rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${c.primer_mensaje || 'No hay mensajes'}
                    </div>
                `;
                item.onclick = () => loadMessages(c.id);
                convList.appendChild(item);
            });
        } catch (err) {
            console.error("Error cargando conversaciones", err);
        }
    }

    async function loadMessages(id) {
        currentConversationId = id;
        loadConversations(); // Para actualizar estado active

        setLoading(true);
        try {
            const res = await fetch(`api.php?action=get_messages&id=${id}`);
            const messages = await res.json();

            messagesContainer.innerHTML = '';
            messages.forEach(m => {
                appendMessage(m.rol, m.contenido, m.imagen_url);
            });
        } catch (err) {
            console.error("Error cargando mensajes", err);
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            loader.classList.remove('hidden');
            loader.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            loader.classList.add('hidden');
            loader.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    window.openFullImage = (url) => {
        window.open(url, '_blank');
    };

    // ─── Historial ────────────────────────────────────────────
    function loadAndRenderHistory() {
        HistoryManager.loadAll().then(function(items) {
            var grid = document.getElementById('history-grid');
            var title = document.getElementById('history-title');
            var clearBtn = document.getElementById('history-clear-btn');
            if (!grid) return;
            if (!items || !items.length) {
                grid.innerHTML = '';
                if (title) title.style.display = 'none';
                if (clearBtn) clearBtn.style.display = 'none';
                return;
            }
            if (title) title.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'inline-block';
            grid.innerHTML = items.map(function(item) {
                return '<div style="position:relative;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;width:120px;flex-shrink:0">' +
                    '<img src="' + item.url + '" style="width:100%;height:80px;display:block;object-fit:cover;cursor:pointer" onclick="window._openLightbox(\'' + item.url + '\')" alt="Historial">' +
                    '<button style="position:absolute;top:4px;right:4px;background:rgba(239,68,68,0.8);color:white;border:none;border-radius:4px;padding:2px 5px;cursor:pointer;font-size:10px" ' +
                    'onclick="event.stopPropagation();window._deleteHistoryItem(\'' + item.id + '\')">🗑️</button>' +
                    '</div>';
            }).join('');
        });
    }

    window._deleteHistoryItem = function(id) {
        if (confirm('¿Eliminar del historial?')) {
            HistoryManager.deleteItem(id).then(function() { loadAndRenderHistory(); });
        }
    };
    window._openLightbox = function(url) {
        var lb = document.getElementById('antigravity-lightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'antigravity-lightbox';
            lb.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
            lb.onclick = function() { lb.style.display = 'none'; };
            var img = document.createElement('img');
            img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px';
            lb.appendChild(img);
            document.body.appendChild(lb);
        }
        lb.querySelector('img').src = url;
        lb.style.display = 'flex';
    };

    document.getElementById('history-clear-btn').addEventListener('click', function() {
        if (confirm('¿Eliminar todo el historial?')) {
            HistoryManager.clearAll().then(function() { loadAndRenderHistory(); });
        }
    });

    HistoryManager.init().then(function() { loadAndRenderHistory(); });
});
