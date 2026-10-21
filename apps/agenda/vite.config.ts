import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // Rutas relativas: el build se sirve desde /apps/agenda/ en Hostinger.
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // index.html de la raíz es el BUILD publicado (estático para Hostinger).
    // La plantilla de desarrollo vive en index.dev.html y es la entrada del build.
    build: {
      rollupOptions: {
        input: { 'index.dev': path.resolve(__dirname, 'index.dev.html') },
      },
    },
  };
});
