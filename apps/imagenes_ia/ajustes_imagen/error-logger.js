/**
 * Error Logger - Captura y muestra errores de la aplicación
 * ========================================================
 * Este script captura errores de JavaScript y los muestra en pantalla
 */

(function() {
    'use strict';

    // Crear panel de errores en la página
    function createErrorPanel() {
        // Verificar si ya existe el panel
        if (document.getElementById('errorPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'errorPanel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            max-height: 200px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #ff4444;
            border-radius: 8px;
            padding: 10px;
            color: white;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            overflow-y: auto;
            display: none;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>ERRORES DE LA APLICACIÓN</strong>
                <button id="closeErrorPanel" style="background: #ff4444; border: none; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer;">×</button>
            </div>
            <div id="errorList" style="max-height: 150px; overflow-y: auto;"></div>
        `;

        document.body.appendChild(panel);

        // Evento para cerrar el panel
        document.getElementById('closeErrorPanel').addEventListener('click', function() {
            panel.style.display = 'none';
        });

        console.log('[ERROR LOGGER] Panel de errores creado');
    }

    // Registrar error en el panel
    function logError(error, type = 'Error') {
        const panel = document.getElementById('errorPanel');
        if (!panel) return;

        const errorList = document.getElementById('errorList');
        const errorElement = document.createElement('div');
        errorElement.style.cssText = 'margin-bottom: 5px; padding: 5px; background: rgba(255, 68, 68, 0.1); border-left: 3px solid #ff4444;';

        const timestamp = new Date().toLocaleTimeString();
        let errorMessage = typeof error === 'string' ? error : (error.message || 'Error desconocido');

        errorElement.innerHTML = `
            <div><strong>[${timestamp}] ${type}:</strong></div>
            <div>${errorMessage}</div>
            ${error.filename ? `<div>Archivo: ${error.filename}:${error.lineno}:${error.colno}</div>` : ''}
        `;

        errorList.appendChild(errorElement);
        errorList.scrollTop = errorList.scrollHeight;

        // Mostrar el panel
        panel.style.display = 'block';

        console.error(`[ERROR LOGGER] ${type}:`, error);
    }

    // Capturar errores de JavaScript
    window.addEventListener('error', function(event) {
        logError({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        }, 'JavaScript Error');
    });

    // Capturar errores de promesas no manejadas
    window.addEventListener('unhandledrejection', function(event) {
        logError({
            message: event.reason || 'Promise rejected without reason'
        }, 'Unhandled Promise Rejection');
    });

    // Función para registrar errores manualmente
    window.logAppError = function(message, errorObject = null) {
        logError({
            message: message,
            ...(errorObject || {})
        }, 'App Error');
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createErrorPanel);
    } else {
        createErrorPanel();
    }

    console.log('[ERROR LOGGER] Sistema de registro de errores inicializado');
})();