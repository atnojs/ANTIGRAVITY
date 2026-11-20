import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` deja rutas relativas para poder servir la carpeta desde
// cualquier subdirectorio (por ejemplo /webs/filee-clone/).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
