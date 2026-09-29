import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    // SEGURIDAD (2026-09-29): aquí había un `define` que incrustaba
    // process.env.GEMINI_API_KEY en el bundle del navegador. Todo lo que entra en el
    // bundle es público (el repo se despliega en la raíz pública de Hostinger): la clave
    // vive SOLO en el .htaccess raíz del servidor (SetEnv A) y la resuelve proxy.php
    // desde el entorno. El frontend nunca debe verla.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});