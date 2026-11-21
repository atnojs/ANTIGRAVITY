import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Configuración solo para pruebas locales: añade la página test/index.html.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist-test',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        test: resolve(process.cwd(), 'test/index.html'),
        app: resolve(process.cwd(), 'test/app.html'),
      },
    },
  },
});
