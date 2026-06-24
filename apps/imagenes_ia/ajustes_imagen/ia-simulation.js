/**
 * IA Editing Simulation - Simulación del sistema de edición por IA
 * ==============================================================
 * Este script simula el flujo completo del sistema de edición por IA
 */

(function() {
    'use strict';

    // Estado de la simulación
    const state = {
        isProcessing: false,
        currentTool: null,
        originalImage: null,
        processedImage: null
    };

    // Herramientas de IA disponibles
    const AI_TOOLS = [
        {
            id: 'removeObject',
            label: 'Eliminar Objeto',
            icon: 'eraser',
            desc: 'Elimina objetos no deseados de la imagen'
        },
        {
            id: 'backgroundSwap',
            label: 'Cambiar Fondo',
            icon: 'image',
            desc: 'Reemplaza el fondo de la imagen'
        },
        {
            id: 'styleTransfer',
            label: 'Estilo Artístico',
            icon: 'palette',
            desc: 'Aplica un estilo artístico a la imagen'
        }
    ];

    // Inicializar la simulación
    function initSimulation() {
        console.log('[SIMULATION] Inicializando simulación del sistema de edición por IA');

        // Crear interfaz de simulación
        createSimulationInterface();

        // Registrar eventos
        registerEvents();

        console.log('[SIMULATION] Simulación lista');
    }

    // Crear interfaz de simulación
    function createSimulationInterface() {
        // Verificar si ya existe la interfaz
        if (document.getElementById('simulationPanel')) return;

        // Crear panel de simulación
        const panel = document.createElement('div');
        panel.id = 'simulationPanel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #38bdf8;
            border-radius: 8px;
            padding: 15px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <strong style="color: #38bdf8;">SIMULACIÓN IA</strong>
                <button id="closeSimulation" style="background: #ef4444; border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Imagen Original:</label>
                <div id="originalPreview" style="width: 100%; height: 100px; background: linear-gradient(45deg, #ff0000, #0000ff); border: 1px solid #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">
                    Sin imagen
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Imagen Procesada:</label>
                <div id="processedPreview" style="width: 100%; height: 100px; background: #333; border: 1px solid #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">
                    Sin procesar
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Herramienta:</label>
                <select id="toolSelector" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <option value="">Seleccionar herramienta...</option>
                    ${AI_TOOLS.map(tool => `<option value="${tool.id}">${tool.label}</option>`).join('')}
                </select>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="loadImageButton" style="width: 100%; padding: 8px; background: #10b981; border: none; color: white; border-radius: 4px; cursor: pointer; margin-bottom: 5px;">
                    Cargar Imagen de Prueba
                </button>
                <button id="processButton" style="width: 100%; padding: 8px; background: #3b82f6; border: none; color: white; border-radius: 4px; cursor: pointer;" ${state.isProcessing ? 'disabled' : ''}>
                    ${state.isProcessing ? 'Procesando...' : 'Procesar con IA'}
                </button>
            </div>

            <div id="statusMessage" style="font-size: 12px; color: #999; min-height: 20px;">
                Lista para procesar
            </div>
        `;

        document.body.appendChild(panel);

        // Evento para cerrar el panel
        document.getElementById('closeSimulation').addEventListener('click', function() {
            panel.remove();
        });
    }

    // Registrar eventos
    function registerEvents() {
        // Cargar imagen de prueba
        document.getElementById('loadImageButton').addEventListener('click', loadImage);

        // Procesar imagen
        document.getElementById('processButton').addEventListener('click', processImage);

        // Cambiar herramienta
        document.getElementById('toolSelector').addEventListener('change', function(e) {
            state.currentTool = AI_TOOLS.find(tool => tool.id === e.target.value) || null;
            updateStatus(state.currentTool ? `Herramienta seleccionada: ${state.currentTool.label}` : 'Selecciona una herramienta');
        });
    }

    // Cargar imagen de prueba
    function loadImage() {
        console.log('[SIMULATION] Cargando imagen de prueba');

        // Crear canvas temporal para la imagen
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        // Crear degradado de prueba
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#0000ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Añadir texto
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Imagen Original', canvas.width/2, canvas.height/2);

        // Guardar imagen
        state.originalImage = canvas.toDataURL();

        // Mostrar previsualización
        document.getElementById('originalPreview').innerHTML = `
            <img src="${state.originalImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        `;

        updateStatus('Imagen de prueba cargada');
        console.log('[SIMULATION] Imagen de prueba cargada');
    }

    // Procesar imagen con IA
    function processImage() {
        if (state.isProcessing) return;
        if (!state.originalImage) {
            updateStatus('Primero carga una imagen');
            return;
        }
        if (!state.currentTool) {
            updateStatus('Selecciona una herramienta de IA');
            return;
        }

        console.log(`[SIMULATION] Procesando imagen con ${state.currentTool.label}`);
        state.isProcessing = true;
        updateProcessButton();
        updateStatus(`Procesando con IA: ${state.currentTool.label}...`);

        // Simular proceso de IA (2 segundos)
        setTimeout(() => {
            // Crear imagen procesada
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');

            // Crear degradado diferente según la herramienta
            let gradient;
            switch(state.currentTool.id) {
                case 'removeObject':
                    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(0.5, '#ff00ff');
                    gradient.addColorStop(1, '#00ffff');
                    break;
                case 'backgroundSwap':
                    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#ffa500');
                    gradient.addColorStop(0.5, '#800080');
                    gradient.addColorStop(1, '#008080');
                    break;
                case 'styleTransfer':
                    gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2);
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.5, '#ff6b6b');
                    gradient.addColorStop(1, '#4ecdc4');
                    break;
                default:
                    gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    gradient.addColorStop(0, '#000000');
                    gradient.addColorStop(1, '#ffffff');
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Añadir texto indicando el proceso
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Procesado: ${state.currentTool.label}`, canvas.width/2, canvas.height/2);

            // Guardar imagen procesada
            state.processedImage = canvas.toDataURL();

            // Mostrar previsualización
            document.getElementById('processedPreview').innerHTML = `
                <img src="${state.processedImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            `;

            // Completar proceso
            state.isProcessing = false;
            updateProcessButton();
            updateStatus(`✅ ${state.currentTool.label} completado`);

            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('ai-tool-update', {
                detail: {
                    imageUrl: state.processedImage,
                    tool: state.currentTool.label
                }
            }));

            console.log(`[SIMULATION] Procesamiento completado: ${state.currentTool.label}`);
        }, 2000);
    }

    // Actualizar botón de proceso
    function updateProcessButton() {
        const button = document.getElementById('processButton');
        if (state.isProcessing) {
            button.innerHTML = 'Procesando...';
            button.disabled = true;
        } else {
            button.innerHTML = 'Procesar con IA';
            button.disabled = false;
        }
    }

    // Actualizar mensaje de estado
    function updateStatus(message) {
        document.getElementById('statusMessage').textContent = message;
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSimulation);
    } else {
        initSimulation();
    }

    // Exponer funciones globales para pruebas
    window.IASimulation = {
        getState: () => ({...state}),
        loadTestImage: loadImage,
        processTestImage: processImage
    };

    console.log('[SIMULATION] Sistema de simulación de IA cargado');
})();