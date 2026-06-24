/**
 * Test Script - Verificación del sistema de edición por IA
 * ======================================================
 * Este script prueba la comunicación entre ai-tools.js y app-compiled.js
 */

(function() {
    'use strict';

    // Verificar que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTest);
    } else {
        initTest();
    }

    function initTest() {
        console.log('[TEST] Iniciando verificación del sistema de edición por IA');

        // 1. Verificar elementos del DOM
        const canvas = document.querySelector('canvas');
        const sidebar = document.querySelector('aside.w-80');

        console.log('[TEST] Canvas encontrado:', !!canvas);
        console.log('[TEST] Sidebar encontrado:', !!sidebar);

        // 2. Simular la carga de la imagen de prueba
        const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        // 3. Probar la función getOriginalImage si existe
        try {
            if (typeof getOriginalImage === 'function') {
                console.log('[TEST] Función getOriginalImage disponible');
            } else {
                console.log('[TEST] Función getOriginalImage NO disponible');
            }
        } catch (e) {
            console.log('[TEST] Error al verificar getOriginalImage:', e.message);
        }

        // 4. Probar eventos personalizados
        testCustomEvents();

        // 5. Probar conexión con proxy.php
        testProxyConnection();
    }

    function testCustomEvents() {
        console.log('[TEST] Probando eventos personalizados...');

        // Escuchar evento de actualización
        const handler = function(event) {
            console.log('[TEST] Evento ai-tool-update recibido:', event.detail);
        };

        window.addEventListener('ai-tool-update', handler);

        // Enviar evento de prueba
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ai-tool-update', {
                detail: {
                    imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    tool: 'test'
                }
            }));

            // Remover el handler
            window.removeEventListener('ai-tool-update', handler);
        }, 1000);
    }

    function testProxyConnection() {
        console.log('[TEST] Probando conexión con proxy.php...');

        // Verificar existencia del archivo
        fetch('proxy.php', { method: 'HEAD' })
            .then(response => {
                console.log('[TEST] proxy.php accesible:', response.ok);
                console.log('[TEST] Código HTTP:', response.status);
            })
            .catch(error => {
                console.log('[TEST] Error al acceder a proxy.php:', error.message);
            });
    }

    // Función auxiliar para simular getOriginalImage
    function getOriginalImage() {
        // Try to get the image from the canvas
        const canvas = document.querySelector('canvas');
        if (canvas && canvas.width > 0) {
            return canvas.toDataURL('image/jpeg', 0.92);
        }
        // Try to get from an img element in the main area
        const img = document.querySelector('main img[src^="data:"]');
        if (img) return img.src;
        return null;
    }

})();