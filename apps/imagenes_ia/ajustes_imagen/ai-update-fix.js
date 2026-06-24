/**
 * AI Image Update Fix - Corrección del problema de actualización de imagen
 * ======================================================================
 * Este script corrige el problema específico de actualización de imagen
 * después de la edición por IA
 */

(function() {
    'use strict';

    console.log('[AI FIX] Iniciando corrección del sistema de actualización de imágenes');

    // Esperar a que la aplicación esté completamente cargada
    function waitForApp() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // Verificar si los elementos clave de la aplicación existen
                const canvas = document.querySelector('canvas');
                const sidebar = document.querySelector('aside.w-80');

                if (canvas && sidebar) {
                    clearInterval(checkInterval);
                    console.log('[AI FIX] Aplicación detectada y lista');
                    resolve();
                }
            }, 500);

            // Timeout después de 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log('[AI FIX] Timeout esperando aplicación - continuando de todos modos');
                resolve();
            }, 10000);
        });
    }

    // Función para inyectar el listener de eventos en la aplicación principal
    function injectAppListener() {
        // Verificar si ya existe el listener
        if (window._aiUpdateListenerInjected) {
            console.log('[AI FIX] Listener ya inyectado');
            return;
        }

        // Crear script que se inyectará en el contexto de la aplicación
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                // Verificar si ya existe el listener
                if (window._aiUpdateListenerInjected) return;

                // Añadir listener para eventos de actualización de IA
                function handleAIUpdate(event) {
                    console.log('[APP] Evento de actualización de IA recibido:', event.detail);

                    // Intentar actualizar el estado de la aplicación React
                    try {
                        // Enviar mensaje al componente React si existe
                        if (window.dispatchEvent) {
                            window.dispatchEvent(new CustomEvent('ai-tool-update', {
                                detail: event.detail
                            }));
                        }

                        // También intentar actualizar directamente el DOM
                        const canvas = document.querySelector('canvas');
                        if (canvas && event.detail.imageUrl) {
                            const img = new Image();
                            img.onload = function() {
                                const ctx = canvas.getContext('2d');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0);

                                // Actualizar también cualquier imagen data-url en el main
                                const displayedImg = document.querySelector('main img[src^="data:"]');
                                if (displayedImg) {
                                    displayedImg.src = event.detail.imageUrl;
                                }

                                console.log('[APP] Imagen actualizada en canvas');
                            };
                            img.src = event.detail.imageUrl;
                        }
                    } catch (error) {
                        console.error('[APP] Error actualizando imagen:', error);
                    }
                }

                // Registrar el listener
                window.addEventListener('ai-image-updated', handleAIUpdate);
                window._aiUpdateListenerInjected = true;
                console.log('[APP] Listener de actualización de IA inyectado');
            })();
        `;

        // Inyectar el script en el documento
        document.head.appendChild(script);

        // Marcar como inyectado
        window._aiUpdateListenerInjected = true;
        console.log('[AI FIX] Script de listener inyectado');
    }

    // Función para mejorar la función de actualización de imagen en ai-tools.js
    function enhanceUpdateFunction() {
        // Verificar si existe la función updateAppImage en el contexto global
        if (typeof window.updateAppImage === 'function') {
            console.log('[AI FIX] Función updateAppImage ya existe');
            return;
        }

        // Crear una versión mejorada de la función
        window.updateAppImage = function(dataUrl) {
            console.log('[AI FIX] Actualizando imagen con URL:', dataUrl.substring(0, 100) + '...');

            try {
                // Estrategia 1: Encontrar el canvas principal y dibujar la nueva imagen
                const canvas = document.querySelector('canvas');
                if (!canvas) {
                    console.warn('[AI FIX] No se encontró el canvas principal');
                    return false;
                }

                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = function () {
                    console.log('[AI FIX] Imagen cargada, dimensiones:', img.width, 'x', img.height);

                    // Actualizar tamaño del canvas
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Limpiar y dibujar la nueva imagen
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    // Estrategia 2: Actualizar cualquier imagen visible
                    const displayedImgs = document.querySelectorAll('main img[src^="data:"], section img[src^="data:"], aside img[src^="data:"], [class*="image"] img[src^="data:"]');
                    displayedImgs.forEach((displayedImg, index) => {
                        console.log(`[AI FIX] Actualizando imagen visible #${index + 1}`);
                        displayedImg.src = dataUrl;
                    });

                    // Estrategia 3: Disparar evento personalizado para la aplicación React
                    console.log('[AI FIX] Disparando evento personalizado de actualización');
                    window.dispatchEvent(new CustomEvent('ai-image-updated', {
                        detail: { imageUrl: dataUrl, timestamp: Date.now() }
                    }));

                    // Estrategia 4: Intentar actualizar el estado de React directamente
                    try {
                        // Si hay una función global de actualización de la aplicación
                        if (typeof window.appUpdateImage === 'function') {
                            window.appUpdateImage(dataUrl);
                        }
                    } catch (e) {
                        console.warn('[AI FIX] No se pudo actualizar el estado de la aplicación directamente:', e);
                    }
                };

                img.onerror = function() {
                    console.error('[AI FIX] Error cargando la imagen desde data URL');
                };

                img.src = dataUrl;
                return true;
            } catch (error) {
                console.error('[AI FIX] Error en updateAppImage:', error);
                return false;
            }
        };

        console.log('[AI FIX] Función updateAppImage mejorada creada');
    }

    // Función para verificar y corregir la integración entre ai-tools.js y app-compiled.js
    function fixIntegration() {
        console.log('[AI FIX] Verificando integración entre componentes');

        // Verificar existencia de funciones críticas
        const aiToolsScript = document.querySelector('script[src*="ai-tools.js"]');
        const appScript = document.querySelector('script[src*="app-compiled.js"]');

        console.log('[AI FIX] ai-tools.js cargado:', !!aiToolsScript);
        console.log('[AI FIX] app-compiled.js cargado:', !!appScript);

        // Verificar funciones disponibles en el contexto global
        const functionsToCheck = [
            'getOriginalImage',
            'callGeminiAPI',
            'updateAppImage',
            'showStatus'
        ];

        functionsToCheck.forEach(funcName => {
            const exists = typeof window[funcName] === 'function';
            console.log(`[AI FIX] Función ${funcName}: ${exists ? '✓' : '✗'}`);
        });
    }

    // Función principal de corrección
    async function applyFix() {
        console.log('[AI FIX] Aplicando corrección al sistema de edición por IA');

        try {
            // Esperar a que la aplicación esté lista
            await waitForApp();

            // Inyectar listener en la aplicación
            injectAppListener();

            // Mejorar la función de actualización de imagen
            enhanceUpdateFunction();

            // Verificar integración
            fixIntegration();

            console.log('[AI FIX] Corrección aplicada exitosamente');
        } catch (error) {
            console.error('[AI FIX] Error aplicando corrección:', error);
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFix);
    } else {
        applyFix();
    }

    // También ejecutar después de un breve delay para asegurar carga completa
    setTimeout(applyFix, 2000);

    console.log('[AI FIX] Script de corrección cargado');
})();