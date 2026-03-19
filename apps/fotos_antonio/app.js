/**
 * app.js - Lógica del chat VIA
 */
document.addEventListener('DOMContentLoaded', () => {
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
        loader.style.display = isLoading ? 'flex' : 'none';
    }

    window.openFullImage = (url) => {
        window.open(url, '_blank');
    };
});
